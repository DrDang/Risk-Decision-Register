import {type ChangeEvent, type ReactNode, useEffect, useRef, useState} from 'react';

type View = 'risk' | 'decision' | 'snapshot' | 'settings';

type RiskStatus = 'Pending' | 'Active' | 'Monitoring' | 'Rejected' | 'Closed';
type RiskSeverity = 'High' | 'Medium' | 'Low';

type Risk = {
  id: string;
  title: string;
  statement: string;
  trigger: string;
  consequence: string;
  resultingIn: string;
  status: RiskStatus;
  severity: RiskSeverity;
  owner: string;
  likelihood: number;
  impact: number;
  residualRating: string;
  category: string;
  responseType: 'Mitigate' | 'Accept' | 'Transfer' | 'Avoid';
  project: string;
  lastUpdated: string;
  dueDate: string;
  mitigation: string;
  contingency: string;
  linkedDecision: string;
  attachments: number;
  comments: number;
  createdBy: string;
  internalOnly: boolean;
  history: {label: string; meta: string}[];
};

type DecisionStatus = 'Approved' | 'Implemented' | 'Proposed' | 'Deferred' | 'Rejected';

type Decision = {
  id: string;
  title: string;
  summary: string;
  status: DecisionStatus;
  deciders: string;
  date: string;
  linkedRisks: string[];
  context: string;
  decisionDrivers: string[];
  consideredOptions: string[];
  outcome: string;
  goodConsequences: string[];
  badConsequences: string[];
  moreInfo: string;
  approvalChain: string[];
};

type ScoreDefinition = {
  value: number;
  label: string;
  description: string;
};

type RiskScoringModel = {
  likelihood: ScoreDefinition[];
  impact: ScoreDefinition[];
};

type SelectOption = {
  value: string;
  label: string;
  description?: string;
};

type Project = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  risks: Risk[];
  decisions: Decision[];
  scoringModel: RiskScoringModel;
};

type AppSnapshot = {
  version: string;
  exportedAt: string;
  activeProjectId: string;
  projects: Project[];
};

const RISK_SCORING_STORAGE_KEY = 'risk-decision-register.scoring-model.v1';
const PROJECTS_STORAGE_KEY = 'risk-decision-register.projects.v1';
const ACTIVE_PROJECT_ID_KEY = 'risk-decision-register.active-project.v1';
const APP_SNAPSHOT_VERSION = '1';

function createBlankProject(overrides?: Partial<Project>): Project {
  return {
    id: overrides?.id ?? `proj-${Date.now()}`,
    name: overrides?.name ?? 'New Project',
    description:
      overrides?.description ?? 'Blank workspace ready for your first risk and decision records.',
    createdAt: overrides?.createdAt ?? new Date().toISOString().split('T')[0],
    risks: overrides?.risks ?? [],
    decisions: overrides?.decisions ?? [],
    scoringModel: overrides?.scoringModel ?? loadRiskScoringModel(),
  };
}

const defaultRiskScoringModel: RiskScoringModel = {
  likelihood: [
    {value: 1, label: 'Rare', description: 'Unlikely to occur except in exceptional circumstances.'},
    {value: 2, label: 'Unlikely', description: 'Could occur, but not expected during normal execution.'},
    {value: 3, label: 'Possible', description: 'Reasonably plausible and should be considered in planning.'},
    {value: 4, label: 'Likely', description: 'Expected to occur in many realistic scenarios.'},
    {value: 5, label: 'Almost Certain', description: 'Expected to occur frequently or is already emerging.'},
  ],
  impact: [
    {value: 1, label: 'Minimal', description: 'Minor effect with little operational disruption.'},
    {value: 2, label: 'Minor', description: 'Limited impact requiring small local adjustments.'},
    {value: 3, label: 'Moderate', description: 'Noticeable impact to delivery, cost, or performance.'},
    {value: 4, label: 'Major', description: 'Serious disruption requiring management attention and recovery effort.'},
    {value: 5, label: 'Severe', description: 'Critical impact to mission, compliance, or core service continuity.'},
  ],
};

const initialRisks: Risk[] = [];

const initialDecisions: Decision[] = [];

const initialProjects: Project[] = [
  createBlankProject({
    id: 'proj-alpha',
    createdAt: '2026-01-01',
    risks: initialRisks,
    decisions: initialDecisions,
  }),
];

type QuickEditFieldName =
  | 'owner'
  | 'dueDate'
  | 'status'
  | 'linkedDecision'
  | 'category'
  | 'responseType'
  | 'likelihood'
  | 'impact';

type HeatmapCell = {
  likelihood: number;
  impact: number;
};

function formatDisplayDate(value: string) {
  if (!value) {
    return 'Not set';
  }

  if (!value.includes('-')) {
    return value;
  }

  const parsed = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed);
}

function getSeverityFromAssessment(likelihood: number, impact: number): RiskSeverity {
  const severityMatrix: RiskSeverity[][] = [
    ['Low', 'Medium', 'High', 'High', 'High'],
    ['Low', 'Medium', 'Medium', 'High', 'High'],
    ['Low', 'Low', 'Medium', 'Medium', 'High'],
    ['Low', 'Low', 'Low', 'Medium', 'Medium'],
    ['Low', 'Low', 'Low', 'Low', 'Medium'],
  ];

  return severityMatrix[5 - likelihood]?.[impact - 1] ?? 'Low';
}

function getResidualRating(likelihood: number, impact: number) {
  const score = likelihood * impact;
  const severity = getSeverityFromAssessment(likelihood, impact);
  return {
    score,
    severity,
    label: `${severity} (${score})`,
  };
}

function normalizeRiskStatement(value: string) {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (!trimmed) {
    return 'IF condition is triggered, THEN the defined consequence occurs.';
  }

  const upper = trimmed.toUpperCase();
  if (upper.startsWith('IF ') && upper.includes(', THEN ')) {
    return trimmed;
  }

  return `IF ${trimmed.replace(/^IF\s+/i, '')}, THEN consequence to be defined.`;
}

function buildRiskStatement(trigger: string, consequence: string, _resultingIn?: string) {
  const cleanTrigger = trigger.trim().replace(/\s+/g, ' ');
  const cleanConsequence = consequence.trim().replace(/\s+/g, ' ');

  return `IF ${cleanTrigger || 'condition is triggered'}, THEN ${cleanConsequence || 'consequence occurs'}.`;
}

function renderStatementWithBoldKeywords(statement: string) {
  const parts = statement.split(/(IF|THEN)/g);

  return parts.map((part, index) => {
    const isKeyword = part === 'IF' || part === 'THEN';
    return isKeyword ? (
      <strong key={`${part}-${index}`} className="font-extrabold text-on-surface">
        {part}
      </strong>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    );
  });
}

function createHeatmapValues(risks: Risk[]) {
  const values = Array.from({length: 5}, () => Array(5).fill(0));

  risks.forEach((risk) => {
    const rowIndex = 5 - risk.likelihood;
    const columnIndex = risk.impact - 1;
    values[rowIndex][columnIndex] += 1;
  });

  return values;
}

function createHeatmapRiskMap(risks: Risk[]) {
  const values = Array.from({length: 5}, () => Array.from({length: 5}, () => [] as string[]));

  risks.forEach((risk) => {
    const rowIndex = 5 - risk.likelihood;
    const columnIndex = risk.impact - 1;
    values[rowIndex][columnIndex].push(risk.id);
  });

  return values;
}

function buildHeatmapClipboardText(riskMap: string[][][]) {
  const lines: string[] = ['Risk Distribution Heatmap'];

  for (let rowIndex = 0; rowIndex < riskMap.length; rowIndex += 1) {
    const likelihood = 5 - rowIndex;
    for (let cellIndex = 0; cellIndex < riskMap[rowIndex].length; cellIndex += 1) {
      const impact = cellIndex + 1;
      const ids = riskMap[rowIndex][cellIndex];
      lines.push(
        `Likelihood ${likelihood} / Impact ${impact}: ${ids.length ? ids.join(', ') : 'No risks'}`,
      );
    }
  }

  return lines.join('\n');
}

function roundRectFill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

async function renderHeatmapToPngBlob(
  riskMap: string[][][],
  values: number[][],
  viewMode: 'count' | 'ids',
): Promise<Blob> {
  const SCALE = 2;
  const CELL = 80;
  const GAP = 8;
  const ROW_LABEL_W = 28;
  const Y_AXIS_W = 26;
  const X_AXIS_H = 28;
  const AXIS_TITLE_H = 22;
  const PAD = 20;

  const gridW = 5 * CELL + 4 * GAP;
  const gridH = 5 * CELL + 4 * GAP;
  const totalW = PAD + Y_AXIS_W + ROW_LABEL_W + gridW + PAD;
  const totalH = PAD + gridH + X_AXIS_H + AXIS_TITLE_H + PAD;

  const canvas = document.createElement('canvas');
  canvas.width = totalW * SCALE;
  canvas.height = totalH * SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');
  ctx.scale(SCALE, SCALE);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, totalW, totalH);

  const colorGrid = [
    ['#059669', '#fde047', '#dc2626', '#dc2626', '#dc2626'],
    ['#059669', '#fde047', '#fde047', '#dc2626', '#dc2626'],
    ['#059669', '#059669', '#fde047', '#fde047', '#dc2626'],
    ['#059669', '#059669', '#059669', '#fde047', '#fde047'],
    ['#059669', '#059669', '#059669', '#059669', '#fde047'],
  ];

  const emptyBgGrid = [
    ['rgba(5,150,105,0.18)', 'rgba(253,224,71,0.28)', 'rgba(220,38,38,0.18)', 'rgba(220,38,38,0.18)', 'rgba(220,38,38,0.18)'],
    ['rgba(5,150,105,0.18)', 'rgba(253,224,71,0.28)', 'rgba(253,224,71,0.28)', 'rgba(220,38,38,0.18)', 'rgba(220,38,38,0.18)'],
    ['rgba(5,150,105,0.18)', 'rgba(5,150,105,0.18)', 'rgba(253,224,71,0.28)', 'rgba(253,224,71,0.28)', 'rgba(220,38,38,0.18)'],
    ['rgba(5,150,105,0.18)', 'rgba(5,150,105,0.18)', 'rgba(5,150,105,0.18)', 'rgba(253,224,71,0.28)', 'rgba(253,224,71,0.28)'],
    ['rgba(5,150,105,0.18)', 'rgba(5,150,105,0.18)', 'rgba(5,150,105,0.18)', 'rgba(5,150,105,0.18)', 'rgba(253,224,71,0.28)'],
  ];

  const emptyTextGrid = [
    ['rgba(6,95,70,0.55)', 'rgba(120,53,15,0.55)', 'rgba(127,29,29,0.55)', 'rgba(127,29,29,0.55)', 'rgba(127,29,29,0.55)'],
    ['rgba(6,95,70,0.55)', 'rgba(120,53,15,0.55)', 'rgba(120,53,15,0.55)', 'rgba(127,29,29,0.55)', 'rgba(127,29,29,0.55)'],
    ['rgba(6,95,70,0.55)', 'rgba(6,95,70,0.55)', 'rgba(120,53,15,0.55)', 'rgba(120,53,15,0.55)', 'rgba(127,29,29,0.55)'],
    ['rgba(6,95,70,0.55)', 'rgba(6,95,70,0.55)', 'rgba(6,95,70,0.55)', 'rgba(120,53,15,0.55)', 'rgba(120,53,15,0.55)'],
    ['rgba(6,95,70,0.55)', 'rgba(6,95,70,0.55)', 'rgba(6,95,70,0.55)', 'rgba(6,95,70,0.55)', 'rgba(120,53,15,0.55)'],
  ];

  const gridX = PAD + Y_AXIS_W + ROW_LABEL_W;
  const gridY = PAD;

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const x = gridX + col * (CELL + GAP);
      const y = gridY + row * (CELL + GAP);
      const value = values[row][col];
      const ids = riskMap[row][col];
      const hasRisks = value > 0;

      ctx.fillStyle = hasRisks ? colorGrid[row][col] : emptyBgGrid[row][col];
      roundRectFill(ctx, x, y, CELL, CELL, 8);

      const textColor = hasRisks
        ? colorGrid[row][col] === '#fde047'
          ? '#1e293b'
          : '#ffffff'
        : emptyTextGrid[row][col];
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (viewMode === 'ids' && ids.length > 0) {
        const MAX_SHOW = 5;
        const shown = ids.slice(0, MAX_SHOW);
        const allLines = ids.length > MAX_SHOW ? [...shown, `+${ids.length - MAX_SHOW}`] : shown;
        const fontSize =
          allLines.length >= 5 ? 9 : allLines.length >= 4 ? 10 : allLines.length >= 3 ? 11 : 12;
        ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
        const lineH = fontSize + 3;
        const totalTextH = allLines.length * lineH - 3;
        allLines.forEach((line, i) => {
          ctx.fillText(
            line,
            x + CELL / 2,
            y + CELL / 2 - totalTextH / 2 + i * lineH + fontSize / 2,
            CELL - 8,
          );
        });
      } else {
        ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText(String(value), x + CELL / 2, y + CELL / 2);
      }
    }

    const likelihood = 5 - row;
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      String(likelihood),
      PAD + Y_AXIS_W + ROW_LABEL_W / 2,
      gridY + row * (CELL + GAP) + CELL / 2,
    );
  }

  for (let col = 0; col < 5; col++) {
    ctx.fillStyle = col === 4 ? '#ef4444' : '#94a3b8';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      String(col + 1),
      gridX + col * (CELL + GAP) + CELL / 2,
      gridY + gridH + X_AXIS_H / 2,
    );
  }

  ctx.save();
  ctx.translate(PAD + Y_AXIS_W / 2, gridY + gridH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('LIKELIHOOD (1-5)', 0, 0);
  ctx.restore();

  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('IMPACT (1-5)', gridX + gridW / 2, gridY + gridH + X_AXIS_H + AXIS_TITLE_H / 2);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('PNG generation failed'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
}


function parseRiskSequence(id: string) {
  const match = id.trim().match(/^RSK-(\d+)$/i);
  return match ? Number(match[1]) : null;
}

function formatRiskSequence(sequence: number) {
  return `RSK-${String(sequence).padStart(4, '0')}`;
}

function parseDecisionSequence(id: string) {
  const match = id.trim().match(/^DEC-(\d+)$/i);
  return match ? Number(match[1]) : null;
}

function formatDecisionSequence(sequence: number) {
  return `DEC-${String(sequence).padStart(3, '0')}`;
}

function normalizeDecisionRecord(input: Partial<Decision> & Record<string, unknown>): Decision {
  const linkedRisks = Array.isArray(input.linkedRisks)
    ? input.linkedRisks.filter((item): item is string => typeof item === 'string')
    : [];
  const approvalChain = Array.isArray(input.approvalChain)
    ? input.approvalChain.filter((item): item is string => typeof item === 'string')
    : [];

  return {
    id: typeof input.id === 'string' ? input.id : formatDecisionSequence(1),
    title: typeof input.title === 'string' ? input.title : 'Untitled Decision',
    summary: typeof input.summary === 'string' ? input.summary : '',
    status:
      input.status === 'Approved' ||
      input.status === 'Implemented' ||
      input.status === 'Proposed' ||
      input.status === 'Deferred' ||
      input.status === 'Rejected'
        ? input.status
        : 'Proposed',
    deciders:
      typeof input.deciders === 'string'
        ? input.deciders
        : typeof input.authority === 'string'
          ? input.authority
          : '',
    date: typeof input.date === 'string' ? input.date : '',
    linkedRisks,
    context:
      typeof input.context === 'string'
        ? input.context
        : typeof input.rationale === 'string'
          ? input.rationale
          : '',
    decisionDrivers: Array.isArray(input.decisionDrivers)
      ? input.decisionDrivers.filter((item): item is string => typeof item === 'string')
      : [],
    consideredOptions: Array.isArray(input.consideredOptions)
      ? input.consideredOptions.filter((item): item is string => typeof item === 'string')
      : Array.isArray(input.alternatives)
        ? input.alternatives.filter((item): item is string => typeof item === 'string')
        : [],
    outcome: typeof input.outcome === 'string' ? input.outcome : '',
    goodConsequences: Array.isArray(input.goodConsequences)
      ? input.goodConsequences.filter((item): item is string => typeof item === 'string')
      : [],
    badConsequences: Array.isArray(input.badConsequences)
      ? input.badConsequences.filter((item): item is string => typeof item === 'string')
      : [],
    moreInfo: typeof input.moreInfo === 'string' ? input.moreInfo : '',
    approvalChain,
  };
}

function normalizeProjectRecord(input: Project): Project {
  return {
    ...input,
    risks: Array.isArray(input.risks) ? input.risks : [],
    decisions: Array.isArray(input.decisions)
      ? input.decisions.map((decision) =>
          normalizeDecisionRecord(decision as Partial<Decision> & Record<string, unknown>),
        )
      : [],
    scoringModel: input.scoringModel ?? defaultRiskScoringModel,
  };
}

function buildAppSnapshot(projects: Project[], activeProjectId: string): AppSnapshot {
  return {
    version: APP_SNAPSHOT_VERSION,
    exportedAt: new Date().toISOString(),
    activeProjectId,
    projects,
  };
}

function parseAppSnapshot(source: string): AppSnapshot {
  let parsed: unknown;

  try {
    parsed = JSON.parse(source);
  } catch {
    throw new Error('Snapshot is not valid JSON.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Snapshot must be a JSON object.');
  }

  const raw = parsed as Partial<AppSnapshot> & Record<string, unknown>;
  if (!Array.isArray(raw.projects) || raw.projects.length === 0) {
    throw new Error('Snapshot does not include any projects.');
  }

  const projects = raw.projects.map((project) => normalizeProjectRecord(project as Project));
  const activeProjectId =
    typeof raw.activeProjectId === 'string' && projects.some((project) => project.id === raw.activeProjectId)
      ? raw.activeProjectId
      : projects[0].id;

  return {
    version: typeof raw.version === 'string' ? raw.version : APP_SNAPSHOT_VERSION,
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : new Date().toISOString(),
    activeProjectId,
    projects,
  };
}

function getDecisionSelectOptions(decisions: Decision[]): SelectOption[] {
  return [
    {value: 'None', label: 'None'},
    ...decisions.map((decision) => ({
      value: decision.id,
      label: `${decision.id} - ${decision.title}`,
      description: decision.summary,
    })),
  ];
}

function getRiskSelectOptions(risks: Risk[]): SelectOption[] {
  return risks.map((risk) => ({
    value: risk.id,
    label: `${risk.id} - ${risk.title}`,
    description: risk.statement,
  }));
}

function getDecisionLabel(decisions: Decision[], decisionId: string) {
  if (decisionId === 'None') {
    return 'None';
  }

  const decision = decisions.find((item) => item.id === decisionId);
  return decision ? `${decision.id} - ${decision.title}` : decisionId;
}

function getRiskLabel(risks: Risk[], riskId: string) {
  const risk = risks.find((item) => item.id === riskId);
  return risk ? `${risk.id} - ${risk.title}` : riskId;
}

function sanitizeRiskId(value: string) {
  return value.toUpperCase().replace(/\s+/g, '');
}

function getDecisionPreview(decision: Decision) {
  return (
    decision.summary?.trim() ||
    decision.context?.trim() ||
    decision.outcome?.trim() ||
    'No additional detail yet.'
  );
}

function splitLines(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function loadRiskScoringModel() {
  if (typeof window === 'undefined') {
    return defaultRiskScoringModel;
  }

  try {
    const stored = window.localStorage.getItem(RISK_SCORING_STORAGE_KEY);
    if (!stored) {
      return defaultRiskScoringModel;
    }

    const parsed = JSON.parse(stored) as RiskScoringModel;
    if (!parsed?.likelihood || !parsed?.impact) {
      return defaultRiskScoringModel;
    }

    return {
      likelihood: parsed.likelihood.map((entry, index) => ({
        value: index + 1,
        label: entry.label ?? defaultRiskScoringModel.likelihood[index].label,
        description: entry.description ?? defaultRiskScoringModel.likelihood[index].description,
      })),
      impact: parsed.impact.map((entry, index) => ({
        value: index + 1,
        label: entry.label ?? defaultRiskScoringModel.impact[index].label,
        description: entry.description ?? defaultRiskScoringModel.impact[index].description,
      })),
    };
  } catch {
    return defaultRiskScoringModel;
  }
}

function loadProjects(): Project[] {
  if (typeof window === 'undefined') return initialProjects;
  try {
    const stored = window.localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (!stored) return initialProjects;
    const parsed = JSON.parse(stored) as Project[];
    if (!Array.isArray(parsed) || parsed.length === 0) return initialProjects;
    return parsed.map((p) => normalizeProjectRecord(p));
  } catch {
    return initialProjects;
  }
}

function loadActiveProjectId(projects: Project[]): string {
  if (typeof window === 'undefined') return projects[0].id;
  try {
    const stored = window.localStorage.getItem(ACTIVE_PROJECT_ID_KEY);
    if (stored && projects.some((p) => p.id === stored)) return stored;
  } catch {
    // fall through
  }
  return projects[0].id;
}

function getScoreDefinition(definitions: ScoreDefinition[], value: number) {
  return definitions.find((definition) => definition.value === value);
}

function toScoreSelectOptions(definitions: ScoreDefinition[]): SelectOption[] {
  return definitions.map((definition) => ({
    value: String(definition.value),
    label: `${definition.value} - ${definition.label}`,
    description: definition.description,
  }));
}

function normalizeOptions(options: string[] | SelectOption[]): SelectOption[] {
  return options.map((option) =>
    typeof option === 'string'
      ? {
          value: option,
          label: option,
        }
      : option,
  );
}

export default function App() {
  const [projects, setProjects] = useState<Project[]>(() => loadProjects());
  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    const loadedProjects = loadProjects();
    return loadActiveProjectId(loadedProjects);
  });
  const [view, setView] = useState<View>('risk');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createRiskOpen, setCreateRiskOpen] = useState(false);
  const [createDecisionOpen, setCreateDecisionOpen] = useState(false);

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? projects[0];
  const riskRecords = activeProject.risks;
  const decisions = activeProject.decisions;
  const [selectedRiskId, setSelectedRiskId] = useState<string>(() => riskRecords[0]?.id ?? '');
  const [selectedDecisionId, setSelectedDecisionId] = useState<string>(() => decisions[0]?.id ?? '');
  const riskScoringModel = activeProject.scoringModel;
  const usedRiskIds = riskRecords.map((risk) => risk.id.toUpperCase());
  const usedDecisionIds = decisions.map((d) => d.id.toUpperCase());
  const nextRiskSequence =
    riskRecords.reduce((highest, risk) => Math.max(highest, parseRiskSequence(risk.id) ?? 0), 0) +
    1;
  const nextDecisionSequence =
    decisions.reduce((highest, d) => Math.max(highest, parseDecisionSequence(d.id) ?? 0), 0) +
    1;

  const selectedRisk = riskRecords.find((risk) => risk.id === selectedRiskId) ?? riskRecords[0] ?? null;
  const selectedDecision = decisions.find((d) => d.id === selectedDecisionId) ?? decisions[0] ?? null;

  useEffect(() => {
    window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    window.localStorage.setItem(ACTIVE_PROJECT_ID_KEY, activeProjectId);
  }, [activeProjectId]);

  function updateActiveProject(updater: (project: Project) => Project) {
    setProjects((prev) => prev.map((p) => (p.id === activeProjectId ? updater(p) : p)));
  }

  function handleSwitchProject(projectId: string) {
    const next = projects.find((p) => p.id === projectId);
    if (!next) return;
    setActiveProjectId(projectId);
    setSelectedRiskId(next.risks[0]?.id ?? '');
    setSelectedDecisionId(next.decisions[0]?.id ?? '');
    setDrawerOpen(false);
    setCreateRiskOpen(false);
  }

  function handleCreateProject(name: string, description: string) {
    const newProject = createBlankProject({
      name: name.trim() || 'Untitled Project',
      description: description.trim(),
      scoringModel: defaultRiskScoringModel,
    });
    setProjects((prev) => [...prev, newProject]);
    setActiveProjectId(newProject.id);
    setSelectedRiskId('');
    setSelectedDecisionId('');
    setDrawerOpen(false);
    setCreateRiskOpen(false);
  }

  function handleDeleteProject(projectId: string) {
    setProjects((prev) => {
      const remainingProjects = prev.filter((project) => project.id !== projectId);

      if (remainingProjects.length === 0) {
        const replacementProject = createBlankProject({scoringModel: defaultRiskScoringModel});
        setActiveProjectId(replacementProject.id);
        setSelectedRiskId('');
        setSelectedDecisionId('');
        setDrawerOpen(false);
        setCreateRiskOpen(false);
        setCreateDecisionOpen(false);
        return [replacementProject];
      }

      if (activeProjectId === projectId) {
        const nextProject = remainingProjects[0];
        setActiveProjectId(nextProject.id);
        setSelectedRiskId(nextProject.risks[0]?.id ?? '');
        setSelectedDecisionId(nextProject.decisions[0]?.id ?? '');
        setDrawerOpen(false);
        setCreateRiskOpen(false);
        setCreateDecisionOpen(false);
      }

      return remainingProjects;
    });
  }

  function handleRiskSelect(riskId: string) {
    setSelectedRiskId(riskId);
    setDrawerOpen(true);
  }

  function handleSelectDecision(decisionId: string) {
    setSelectedDecisionId(decisionId);
    setView('decision');
  }

  function handleUpdateRisk(riskId: string, updates: Partial<Risk>, historyLabel: string) {
    updateActiveProject((project) => ({
      ...project,
      risks: project.risks.map((risk) => {
        if (risk.id !== riskId) return risk;

        const nextRisk = {...risk, ...updates};

        if (updates.trigger !== undefined || updates.consequence !== undefined) {
          nextRisk.statement = buildRiskStatement(nextRisk.trigger, nextRisk.consequence, nextRisk.resultingIn);
        }

        if (updates.statement !== undefined) {
          nextRisk.statement = normalizeRiskStatement(updates.statement);
        }

        if (updates.likelihood !== undefined || updates.impact !== undefined) {
          const residual = getResidualRating(nextRisk.likelihood, nextRisk.impact);
          nextRisk.severity = residual.severity;
          nextRisk.residualRating = residual.label;
        }

        return {
          ...nextRisk,
          lastUpdated: 'Just now',
          history: [{label: historyLabel, meta: 'Local edit • Just now'}, ...risk.history],
        };
      }),
    }));
  }

  function handleDeleteRisk(riskId: string) {
    updateActiveProject((project) => {
      const remainingRisks = project.risks.filter((risk) => risk.id !== riskId);
      if (remainingRisks.length > 0 && selectedRiskId === riskId) {
        setSelectedRiskId(remainingRisks[0].id);
      }
      if (remainingRisks.length === 0) {
        setDrawerOpen(false);
      }
      return {...project, risks: remainingRisks};
    });
  }

  function handleRenameRisk(riskId: string, nextRiskId: string) {
    const normalizedNextId = sanitizeRiskId(nextRiskId);
    if (!normalizedNextId || normalizedNextId === riskId) {
      return;
    }

    updateActiveProject((project) => ({
      ...project,
      risks: project.risks.map((risk) =>
        risk.id === riskId
          ? {
              ...risk,
              id: normalizedNextId,
              lastUpdated: 'Just now',
              history: [
                {label: `Risk ID updated (${riskId} -> ${normalizedNextId})`, meta: 'Local edit • Just now'},
                ...risk.history,
              ],
            }
          : risk,
      ),
      decisions: project.decisions.map((decision) => ({
        ...decision,
        linkedRisks: decision.linkedRisks.map((linkedRiskId) =>
          linkedRiskId === riskId ? normalizedNextId : linkedRiskId,
        ),
      })),
    }));

    if (selectedRiskId === riskId) {
      setSelectedRiskId(normalizedNextId);
    }
  }

  function handleCreateRisk(input: {
    id: string;
    title: string;
    owner: string;
    category: string;
    linkedDecision: string;
    likelihood: number;
    impact: number;
    trigger: string;
    consequence: string;
    responseType: Risk['responseType'];
    dueDate: string;
    status: RiskStatus;
  }) {
    const residual = getResidualRating(input.likelihood, input.impact);
    const nextRisk: Risk = {
      id: input.id.trim(),
      title: input.title.trim(),
      statement: buildRiskStatement(input.trigger, input.consequence),
      trigger: input.trigger.trim(),
      consequence: input.consequence.trim(),
      resultingIn: '',
      status: input.status,
      severity: residual.severity,
      owner: input.owner.trim(),
      likelihood: input.likelihood,
      impact: input.impact,
      residualRating: residual.label,
      category: input.category,
      responseType: input.responseType,
      project: activeProject.name,
      lastUpdated: 'Just now',
      dueDate: input.dueDate,
      mitigation:
        residual.severity === 'Low'
          ? 'Mitigation plans are not required for low risks. Contingency planning is not applicable at this risk level.'
          : 'Define the mitigation plan for this risk.',
      contingency: '',
      linkedDecision: input.linkedDecision,
      attachments: 0,
      comments: 0,
      createdBy: 'Local edit',
      internalOnly: false,
      history: [{label: 'Risk created', meta: 'Local edit • Just now'}],
    };

    updateActiveProject((project) => ({
      ...project,
      risks: [nextRisk, ...project.risks],
    }));
    setSelectedRiskId(nextRisk.id);
    setDrawerOpen(true);
    setCreateRiskOpen(false);
  }

  function handleCreateDecision(input: {
    id: string;
    title: string;
    status: DecisionStatus;
    deciders: string;
    date: string;
    context: string;
    decisionDrivers: string[];
    consideredOptions: string[];
    outcome: string;
  }) {
    const next: Decision = {
      id: input.id.trim(),
      title: input.title.trim(),
      summary: '',
      status: input.status,
      deciders: input.deciders.trim(),
      date: input.date.trim(),
      context: input.context.trim(),
      linkedRisks: [],
      decisionDrivers: input.decisionDrivers,
      consideredOptions: input.consideredOptions,
      outcome: input.outcome.trim(),
      goodConsequences: [],
      badConsequences: [],
      moreInfo: '',
      approvalChain: [],
    };
    updateActiveProject((project) => ({
      ...project,
      decisions: [next, ...project.decisions],
    }));
    setSelectedDecisionId(next.id);
    setCreateDecisionOpen(false);
  }

  function handleUpdateDecision(decisionId: string, updates: Partial<Decision>) {
    updateActiveProject((project) => ({
      ...project,
      decisions: project.decisions.map((d) =>
        d.id === decisionId ? {...d, ...updates} : d,
      ),
    }));
  }

  function handleDeleteDecision(decisionId: string) {
    updateActiveProject((project) => {
      const remaining = project.decisions.filter((d) => d.id !== decisionId);
      if (selectedDecisionId === decisionId) {
        setSelectedDecisionId(remaining[0]?.id ?? '');
      }
      return {...project, decisions: remaining};
    });
  }

  function handleExportSnapshot() {
    const snapshot = buildAppSnapshot(projects, activeProjectId);
    const json = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([json], {type: 'application/json'});
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `risk-decision-register-snapshot-${dateStamp}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  function handleImportSnapshot(source: string) {
    const snapshot = parseAppSnapshot(source);
    const nextActiveProject =
      snapshot.projects.find((project) => project.id === snapshot.activeProjectId) ?? snapshot.projects[0];

    setProjects(snapshot.projects);
    setActiveProjectId(nextActiveProject.id);
    setSelectedRiskId(nextActiveProject.risks[0]?.id ?? '');
    setSelectedDecisionId(nextActiveProject.decisions[0]?.id ?? '');
    setDrawerOpen(false);
    setCreateRiskOpen(false);
    setCreateDecisionOpen(false);

    return `Imported ${snapshot.projects.length} project${snapshot.projects.length === 1 ? '' : 's'} from snapshot.`;
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body">
      <div className="flex min-h-screen">
        <Sidebar
          view={view}
          onChangeView={setView}
          activeProject={activeProject}
          projects={projects}
          onDeleteProject={handleDeleteProject}
          onSwitchProject={handleSwitchProject}
          onCreateProject={handleCreateProject}
        />
        <div className="flex min-h-screen flex-1 pl-64">
          <main className={`flex min-h-screen flex-1 flex-col ${view === 'risk' && drawerOpen ? 'pr-[29rem]' : ''}`}>
            <TopNav
              view={view}
              projectName={activeProject.name}
              onPrimaryAction={() => {
                if (view === 'risk') setCreateRiskOpen(true);
                if (view === 'decision') setCreateDecisionOpen(true);
              }}
            />
            {view === 'risk' ? (
              <RiskRegisterPage
                risks={riskRecords}
                selectedRiskId={selectedRisk?.id ?? ''}
                selectedRisk={selectedRisk}
                onSelectRisk={handleRiskSelect}
                onShowDecision={handleSelectDecision}
                scoringModel={riskScoringModel}
                decisions={decisions}
              />
            ) : view === 'decision' ? (
              <DecisionRegisterPage
                decisions={decisions}
                selectedDecision={selectedDecision}
                risks={riskRecords}
                onSelectDecision={setSelectedDecisionId}
                onUpdateDecision={handleUpdateDecision}
                onDeleteDecision={handleDeleteDecision}
                onShowRisk={(riskId) => {
                  setSelectedRiskId(riskId);
                  setView('risk');
                  setDrawerOpen(true);
                }}
              />
            ) : view === 'snapshot' ? (
              <SnapshotPage
                activeProjectName={activeProject.name}
                projectCount={projects.length}
                onExportSnapshot={handleExportSnapshot}
                onImportSnapshot={handleImportSnapshot}
              />
            ) : (
              <SettingsPage
                scoringModel={riskScoringModel}
                onSaveScoringModel={(model) =>
                  updateActiveProject((p) => ({...p, scoringModel: model}))
                }
              />
            )}
          </main>
          {view === 'risk' && selectedRisk ? (
            <RiskDrawer
              open={drawerOpen}
              risk={selectedRisk}
              scoringModel={riskScoringModel}
              onClose={() => setDrawerOpen(false)}
              onDeleteRisk={handleDeleteRisk}
              onRenameRisk={handleRenameRisk}
              onUpdateRisk={handleUpdateRisk}
              existingIds={usedRiskIds}
              ownerOptions={Array.from(new Set<string>(riskRecords.map((risk) => risk.owner)))}
              categoryOptions={Array.from(new Set<string>(riskRecords.map((risk) => risk.category)))}
              linkedDecisionOptions={getDecisionSelectOptions(decisions)}
              decisions={decisions}
            />
          ) : null}
          {view === 'risk' ? (
            <CreateRiskModal
              open={createRiskOpen}
              existingIds={usedRiskIds}
              nextRiskId={formatRiskSequence(nextRiskSequence)}
              scoringModel={riskScoringModel}
              ownerOptions={Array.from(new Set<string>(riskRecords.map((risk) => risk.owner)))}
              categoryOptions={Array.from(new Set<string>(riskRecords.map((risk) => risk.category)))}
              linkedDecisionOptions={getDecisionSelectOptions(decisions)}
              onClose={() => setCreateRiskOpen(false)}
              onCreate={handleCreateRisk}
            />
          ) : null}
          {view === 'decision' ? (
            <CreateDecisionModal
              open={createDecisionOpen}
              existingIds={usedDecisionIds}
              nextDecisionId={formatDecisionSequence(nextDecisionSequence)}
              onClose={() => setCreateDecisionOpen(false)}
              onCreate={handleCreateDecision}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Sidebar({
  view,
  onChangeView,
  activeProject,
  projects,
  onDeleteProject,
  onSwitchProject,
  onCreateProject,
}: {
  view: View;
  onChangeView: (view: View) => void;
  activeProject: Project;
  projects: Project[];
  onDeleteProject: (projectId: string) => void;
  onSwitchProject: (projectId: string) => void;
  onCreateProject: (name: string, description: string) => void;
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [confirmDeleteProjectId, setConfirmDeleteProjectId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const navItems: {id: View; label: string; icon: string}[] = [
    {id: 'risk', label: 'Risk Register', icon: 'security'},
    {id: 'decision', label: 'Decision Register', icon: 'gavel'},
    {id: 'snapshot', label: 'Import / Export', icon: 'import_export'},
    {id: 'settings', label: 'Settings', icon: 'tune'},
  ];

  function handleOpenPanel() {
    setPanelOpen(true);
    setCreating(false);
    setConfirmDeleteProjectId(null);
    setNewName('');
    setNewDesc('');
  }

  function handleClosePanel() {
    setPanelOpen(false);
    setCreating(false);
    setConfirmDeleteProjectId(null);
  }

  function handleSubmitCreate() {
    if (!newName.trim()) return;
    onCreateProject(newName, newDesc);
    handleClosePanel();
  }

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-100 px-5 py-6 shadow-[inset_-1px_0_0_rgba(169,180,185,0.16)]">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dim text-on-primary shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined filled text-[22px]">assignment</span>
          </div>
          <div>
            <div className="font-headline text-lg font-extrabold tracking-tight text-slate-900">
              Governance Register
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
              Risk and Decision Workspace
            </div>
          </div>
        </div>

        <button
          className="mb-8 w-full rounded-2xl bg-white/75 p-4 text-left shadow-[0_8px_24px_rgba(42,52,57,0.05)] transition hover:bg-white hover:shadow-[0_8px_28px_rgba(42,52,57,0.09)]"
          onClick={handleOpenPanel}
          type="button"
        >
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Project</span>
            <span className="material-symbols-outlined text-[16px] text-slate-400">unfold_more</span>
          </div>
          <div className="truncate font-headline text-xl font-extrabold text-slate-900">
            {activeProject.name}
          </div>
          {activeProject.description ? (
            <div className="mt-1.5 line-clamp-2 text-xs text-slate-500">
              {activeProject.description}
            </div>
          ) : null}
          <div className="mt-2 flex items-center gap-3 text-[10px] font-semibold text-slate-400">
            <span>{activeProject.risks.length} risk{activeProject.risks.length !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span>{activeProject.decisions.length} decision{activeProject.decisions.length !== 1 ? 's' : ''}</span>
          </div>
        </button>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const active = view === item.id;
            return (
              <button
                key={item.id}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition-all ${
                  active
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10'
                    : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
                }`}
                onClick={() => onChangeView(item.id)}
                type="button"
              >
                <span className={`material-symbols-outlined text-[20px] ${active ? 'filled' : ''}`}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            );
          })}
        </nav>

      </aside>

      {panelOpen ? (
        <>
          {/* Dismiss backdrop */}
          <div
            className="fixed inset-0 z-[55]"
            onClick={handleClosePanel}
          />

          {/* Project switcher panel */}
          <div className="fixed left-64 top-0 z-[60] flex h-screen w-80 flex-col bg-white shadow-[4px_0_32px_rgba(0,0,0,0.12)]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="text-sm font-bold text-slate-900">Switch Project</div>
              <button
                className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                onClick={handleClosePanel}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Project list */}
            <div className="flex-1 overflow-y-auto p-3">
              {projects.map((project) => {
                const isActive = project.id === activeProject.id;
                return (
                  <div
                    key={project.id}
                    className={`flex items-start gap-3 rounded-xl p-3 transition ${
                      isActive
                        ? 'bg-primary/10 ring-1 ring-primary/20'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[14px] font-bold ${
                        isActive
                          ? 'bg-primary text-on-primary'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {project.name.charAt(0).toUpperCase()}
                    </div>
                    <button
                      className="min-w-0 flex-1 text-left"
                      onClick={() => {
                        onSwitchProject(project.id);
                        handleClosePanel();
                      }}
                      type="button"
                    >
                      <div className={`flex items-center gap-2 text-sm font-semibold ${isActive ? 'text-primary' : 'text-slate-900'}`}>
                        <span className="truncate">{project.name}</span>
                        {isActive ? (
                          <span className="material-symbols-outlined filled text-[14px]">check_circle</span>
                        ) : null}
                      </div>
                      {project.description ? (
                        <div className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                          {project.description}
                        </div>
                      ) : null}
                      <div className="mt-1 flex items-center gap-2 text-[10px] font-semibold text-slate-400">
                        <span>{project.risks.length} risk{project.risks.length !== 1 ? 's' : ''}</span>
                        <span>·</span>
                        <span>{project.decisions.length} decision{project.decisions.length !== 1 ? 's' : ''}</span>
                      </div>
                    </button>
                    <div className="shrink-0">
                      {confirmDeleteProjectId === project.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            className="rounded-full bg-error px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white transition hover:opacity-90"
                            onClick={() => {
                              onDeleteProject(project.id);
                              handleClosePanel();
                            }}
                            type="button"
                          >
                            Delete
                          </button>
                          <button
                            className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-200"
                            onClick={() => setConfirmDeleteProjectId(null)}
                            type="button"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          aria-label={`Delete ${project.name}`}
                          className="rounded-full p-1.5 text-slate-300 transition hover:bg-slate-100 hover:text-error"
                          onClick={() => setConfirmDeleteProjectId(project.id)}
                          title={`Delete ${project.name}`}
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Create new project section */}
            <div className="border-t border-slate-100">
              {creating ? (
                <div className="p-4">
                  <div className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                    New Project
                  </div>
                  <input
                    autoFocus
                    className="mb-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-on-surface outline-none transition focus:border-primary/40 focus:bg-white focus:shadow-[0_0_0_3px_rgba(79,94,126,0.08)] placeholder:text-slate-400"
                    maxLength={60}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSubmitCreate();
                      if (e.key === 'Escape') setCreating(false);
                    }}
                    placeholder="Project name"
                    type="text"
                    value={newName}
                  />
                  <textarea
                    className="mb-3 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-on-surface outline-none transition focus:border-primary/40 focus:bg-white focus:shadow-[0_0_0_3px_rgba(79,94,126,0.08)] placeholder:text-slate-400"
                    maxLength={200}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Short description (optional)"
                    rows={2}
                    value={newDesc}
                  />
                  <div className="flex gap-2">
                    <button
                      className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-40"
                      disabled={!newName.trim()}
                      onClick={handleSubmitCreate}
                      type="button"
                    >
                      Create project
                    </button>
                    <button
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                      onClick={() => setCreating(false)}
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3">
                  <button
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                    onClick={() => setCreating(true)}
                    type="button"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                      <span className="material-symbols-outlined text-[16px]">add</span>
                    </span>
                    New project
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}

function TopNav({
  view,
  onPrimaryAction,
  projectName,
}: {
  view: View;
  onPrimaryAction?: () => void;
  projectName: string;
}) {
  const showPrimaryAction = view === 'risk' || view === 'decision';
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/70 bg-slate-50/90 px-8 backdrop-blur-xl">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
            {view === 'risk'
              ? 'Operational View'
              : view === 'decision'
                ? 'Decision Review'
                : view === 'snapshot'
                  ? 'Shared Snapshot Workflow'
                  : 'Configuration'}
          </div>
          <div className="max-w-[340px] truncate font-headline text-lg font-extrabold text-slate-900">
            {projectName}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {showPrimaryAction ? (
            <button
              className="rounded-xl bg-gradient-to-br from-primary to-primary-dim px-4 py-2.5 text-sm font-bold text-on-primary shadow-lg shadow-primary/20 transition hover:opacity-90"
              onClick={onPrimaryAction}
              type="button"
            >
              {view === 'risk' ? 'Log New Risk' : 'Log New Decision'}
            </button>
          ) : null}
          <button
            className="rounded-full p-2 text-slate-500 transition hover:bg-white hover:text-slate-900"
            onClick={() => setHelpOpen(true)}
            type="button"
          >
            <span className="material-symbols-outlined">help</span>
          </button>
        </div>
      </header>

      {helpOpen ? (
        <div className="fixed inset-0 z-[70] bg-slate-950/30" onClick={() => setHelpOpen(false)}>
          <div className="flex min-h-full items-center justify-center px-6 py-6">
            <div
              className="w-full max-w-2xl rounded-[2rem] bg-white shadow-[0_28px_80px_rgba(42,52,57,0.18)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">How To Use</div>
                  <h2 className="mt-1 font-headline text-2xl font-extrabold text-on-surface">
                    Governance Register Guide
                  </h2>
                </div>
                <button
                  className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                  onClick={() => setHelpOpen(false)}
                  type="button"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="space-y-5 px-6 py-6 text-sm leading-relaxed text-on-surface-variant">
                <div>
                  <div className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Start Here</div>
                  <p>
                    Use `Import / Export` to load a shared snapshot before a review session, or begin with a blank project and create records directly in the app.
                  </p>
                </div>

                <div>
                  <div className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Risk Register</div>
                  <p>
                    Log risks from the main action button, review them in the table, and click a row to open the right-side drawer for scoring, ownership, response, and history updates.
                  </p>
                </div>

                <div>
                  <div className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Decision Register</div>
                  <p>
                    Record governance decisions, connect them to related risks, and maintain the decision rationale, options considered, and consequences in one place.
                  </p>
                </div>

                <div>
                  <div className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Snapshots</div>
                  <p>
                    Export a snapshot after team updates so others can import the same governed state later. This is the recommended collaboration path for restricted SharePoint environments.
                  </p>
                </div>

                <div>
                  <div className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Projects</div>
                  <p>
                    Use the project panel in the left rail to switch projects, create new ones, or delete old workspaces that are no longer needed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function CreateRiskModal({
  open,
  existingIds,
  nextRiskId,
  scoringModel,
  ownerOptions,
  categoryOptions,
  linkedDecisionOptions,
  onClose,
  onCreate,
}: {
  open: boolean;
  existingIds: string[];
  nextRiskId: string;
  scoringModel: RiskScoringModel;
  ownerOptions: string[];
  categoryOptions: string[];
  linkedDecisionOptions: SelectOption[];
  onClose: () => void;
  onCreate: (input: {
    id: string;
    title: string;
    owner: string;
    category: string;
    linkedDecision: string;
    likelihood: number;
    impact: number;
    trigger: string;
    consequence: string;
    responseType: Risk['responseType'];
    dueDate: string;
    status: RiskStatus;
  }) => void;
}) {
  const backdropPressStarted = useRef(false);
  const [form, setForm] = useState({
    id: nextRiskId,
    title: '',
    owner: ownerOptions[0] ?? '',
    category: categoryOptions[0] ?? 'Infrastructure',
    linkedDecision: 'None',
    likelihood: '3',
    impact: '3',
    trigger: '',
    consequence: '',
    responseType: 'Mitigate' as Risk['responseType'],
    dueDate: '',
    status: 'Pending' as RiskStatus,
  });

  function resetRiskDraft() {
    setForm({
      id: nextRiskId,
      title: '',
      owner: ownerOptions[0] ?? '',
      category: categoryOptions[0] ?? 'Infrastructure',
      linkedDecision: 'None',
      likelihood: '3',
      impact: '3',
      trigger: '',
      consequence: '',
      responseType: 'Mitigate',
      dueDate: '',
      status: 'Pending',
    });
  }

  useEffect(() => {
    if (
      !open &&
      !form.title &&
      !form.trigger &&
      !form.consequence &&
      !form.dueDate &&
      form.id !== nextRiskId
    ) {
      setForm((current) => ({...current, id: nextRiskId}));
    }
  }, [form.consequence, form.dueDate, form.id, form.title, form.trigger, nextRiskId, open]);

  if (!open) {
    return null;
  }

  const generatedStatement = buildRiskStatement(form.trigger, form.consequence);
  const scorePreview = Number(form.likelihood) * Number(form.impact);
  const severityPreview = getSeverityFromAssessment(Number(form.likelihood), Number(form.impact));
  const likelihoodDefinition = getScoreDefinition(scoringModel.likelihood, Number(form.likelihood));
  const impactDefinition = getScoreDefinition(scoringModel.impact, Number(form.impact));
  const missingFields = [
    !form.id.trim() ? 'Risk ID' : null,
    !form.title.trim() ? 'Risk title' : null,
    !form.owner.trim() ? 'Owner' : null,
    !form.trigger.trim() ? 'Trigger / Condition' : null,
    !form.consequence.trim() ? 'Consequence' : null,
  ].filter(Boolean) as string[];
  const duplicateId = existingIds.some((id) => id.toUpperCase() === form.id.trim().toUpperCase());
  const isValid = missingFields.length === 0 && !duplicateId;

  return (
    <div
      className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950/20"
      onClick={(event) => {
        if (backdropPressStarted.current && event.target === event.currentTarget) {
          onClose();
        }
        backdropPressStarted.current = false;
      }}
      onMouseDown={(event) => {
        backdropPressStarted.current = event.target === event.currentTarget;
      }}
      onMouseUp={() => {
        window.setTimeout(() => {
          backdropPressStarted.current = false;
        }, 0);
      }}
    >
      <div className="flex min-h-full items-start justify-center px-6 py-6 lg:items-center">
        <div
          className="flex max-h-[calc(100vh-3rem)] w-full max-w-3xl flex-col rounded-[2rem] bg-white shadow-[0_28px_80px_rgba(42,52,57,0.18)]"
          onClick={(event) => event.stopPropagation()}
          onMouseDown={() => {
            backdropPressStarted.current = false;
          }}
        >
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Create New Risk</div>
              <h2 className="mt-1 font-headline text-2xl font-extrabold text-on-surface">Add a risk to the register</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
                Capture the essentials first. Once the risk is created, the drawer opens so you can refine scoring, ownership, and mitigation details without losing the table context.
              </p>
            </div>
            <button
              className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              onClick={onClose}
              type="button"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="grid flex-1 gap-6 overflow-y-auto px-6 py-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Risk ID">
                  <input
                    className={`w-full rounded-2xl border bg-slate-50 px-4 py-3 text-sm text-on-surface outline-none transition focus:bg-white focus:shadow-[0_0_0_4px_rgba(79,94,126,0.08)] ${
                      duplicateId ? 'border-red-300 focus:border-red-300' : 'border-slate-200 focus:border-primary/25'
                    }`}
                    onChange={(event) => setForm((current) => ({...current, id: event.target.value.toUpperCase()}))}
                    value={form.id}
                  />
                </FormField>
                <FormField label="Risk title">
                  <input
                    autoFocus
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-on-surface outline-none transition focus:border-primary/25 focus:bg-white focus:shadow-[0_0_0_4px_rgba(79,94,126,0.08)]"
                    onChange={(event) => setForm((current) => ({...current, title: event.target.value}))}
                    placeholder="Name the risk"
                    value={form.title}
                  />
                </FormField>
                <FormField label="Owner">
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-on-surface outline-none transition focus:border-primary/25 focus:bg-white focus:shadow-[0_0_0_4px_rgba(79,94,126,0.08)]"
                    list="risk-owner-options"
                    onChange={(event) => setForm((current) => ({...current, owner: event.target.value}))}
                    placeholder="Select or type an owner"
                    value={form.owner}
                  />
                  <datalist id="risk-owner-options">
                    {ownerOptions.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                </FormField>
                <FormField label="Linked decision">
                  <select
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-on-surface outline-none transition focus:border-primary/25 focus:bg-white focus:shadow-[0_0_0_4px_rgba(79,94,126,0.08)]"
                    onChange={(event) => setForm((current) => ({...current, linkedDecision: event.target.value}))}
                    value={form.linkedDecision}
                  >
                    {linkedDecisionOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Likelihood">
                  <select
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-on-surface outline-none transition focus:border-primary/25 focus:bg-white focus:shadow-[0_0_0_4px_rgba(79,94,126,0.08)]"
                    onChange={(event) => setForm((current) => ({...current, likelihood: event.target.value}))}
                    value={form.likelihood}
                  >
                    {toScoreSelectOptions(scoringModel.likelihood).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {likelihoodDefinition ? (
                    <div className="mt-2 text-xs text-on-surface-variant">
                      Likelihood {likelihoodDefinition.value} - {likelihoodDefinition.label}: {likelihoodDefinition.description}
                    </div>
                  ) : null}
                </FormField>
                <FormField label="Impact">
                  <select
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-on-surface outline-none transition focus:border-primary/25 focus:bg-white focus:shadow-[0_0_0_4px_rgba(79,94,126,0.08)]"
                    onChange={(event) => setForm((current) => ({...current, impact: event.target.value}))}
                    value={form.impact}
                  >
                    {toScoreSelectOptions(scoringModel.impact).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {impactDefinition ? (
                    <div className="mt-2 text-xs text-on-surface-variant">
                      Impact {impactDefinition.value} - {impactDefinition.label}: {impactDefinition.description}
                    </div>
                  ) : null}
                </FormField>
                <FormField label="Response">
                  <select
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-on-surface outline-none transition focus:border-primary/25 focus:bg-white focus:shadow-[0_0_0_4px_rgba(79,94,126,0.08)]"
                    onChange={(event) =>
                      setForm((current) => ({...current, responseType: event.target.value as Risk['responseType']}))
                    }
                    value={form.responseType}
                  >
                    {['Mitigate', 'Accept', 'Transfer', 'Avoid'].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Initial status">
                  <select
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-on-surface outline-none transition focus:border-primary/25 focus:bg-white focus:shadow-[0_0_0_4px_rgba(79,94,126,0.08)]"
                    onChange={(event) => setForm((current) => ({...current, status: event.target.value as RiskStatus}))}
                    value={form.status}
                  >
                    {['Pending', 'Active', 'Monitoring', 'Rejected'].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Due date (optional)">
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-on-surface outline-none transition focus:border-primary/25 focus:bg-white focus:shadow-[0_0_0_4px_rgba(79,94,126,0.08)]"
                    onChange={(event) => setForm((current) => ({...current, dueDate: event.target.value}))}
                    type="date"
                    value={form.dueDate}
                  />
                </FormField>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Risk Statement Structure</div>
                <div className="mb-4 text-sm leading-relaxed text-on-surface-variant">
                  Enter the risk in this format:
                  {' '}
                  <span className="font-semibold text-on-surface">IF</span>
                  {' '}
                  trigger / condition,
                  {' '}
                  <span className="font-semibold text-on-surface">THEN</span>
                  {' '}
                  consequence.
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      <span className="text-on-surface">IF</span>
                      {' '}
                      Trigger / Condition
                    </div>
                    <textarea
                      className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-on-surface outline-none transition focus:border-primary/25 focus:shadow-[0_0_0_4px_rgba(79,94,126,0.08)]"
                      onChange={(event) => setForm((current) => ({...current, trigger: event.target.value}))}
                      placeholder="Describe the condition that could trigger this risk"
                      value={form.trigger}
                    />
                  </div>

                  <div>
                    <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      <span className="text-on-surface">THEN</span>
                      {' '}
                      Consequence
                    </div>
                    <textarea
                      className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-on-surface outline-none transition focus:border-primary/25 focus:shadow-[0_0_0_4px_rgba(79,94,126,0.08)]"
                      onChange={(event) => setForm((current) => ({...current, consequence: event.target.value}))}
                      placeholder="Describe the immediate consequence"
                      value={form.consequence}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 lg:sticky lg:top-0 lg:self-start">
              <div className="rounded-3xl bg-surface-container-low px-5 py-4">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Risk Preview</div>
                <p className="text-sm leading-relaxed text-on-surface">{renderStatementWithBoldKeywords(generatedStatement)}</p>
              </div>
              <div className="rounded-3xl bg-white px-5 py-4 ring-1 ring-slate-200">
                <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Initial Assessment</div>
                <div className="space-y-3">
                  <DrawerMeta label="Risk ID" value={form.id || 'Not set'} />
                  <DrawerMeta label="Status" value={form.status} />
                  <DrawerMeta label="Score" value={`${form.likelihood} x ${form.impact} = ${scorePreview}`} />
                  <DrawerMeta label="Severity" value={severityPreview} />
                  <DrawerMeta label="Linked Decision" value={form.linkedDecision} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-white px-6 py-5">
            <div className="text-sm text-on-surface-variant">
              {duplicateId
                ? 'Risk ID already exists. IDs are assigned once, never reused, and must stay unique.'
                : missingFields.length > 0
                  ? `Complete required fields before creating: ${missingFields.join(', ')}.`
                  : 'New risks open in the drawer immediately after creation.'}
            </div>
            <div className="flex gap-2">
              <button
                className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-on-surface transition hover:bg-slate-200"
                onClick={onClose}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-gradient-to-br from-primary to-primary-dim px-4 py-2.5 text-sm font-bold text-on-primary shadow-lg shadow-primary/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!isValid}
                onClick={() => {
                  onCreate({
                    id: form.id,
                    title: form.title,
                    owner: form.owner,
                    category: form.category,
                    linkedDecision: form.linkedDecision,
                    likelihood: Number(form.likelihood),
                    impact: Number(form.impact),
                    trigger: form.trigger,
                    consequence: form.consequence,
                    responseType: form.responseType,
                    dueDate: form.dueDate,
                    status: form.status,
                  });
                  resetRiskDraft();
                }}
                type="button"
              >
                Create Risk
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsPage({
  scoringModel,
  onSaveScoringModel,
}: {
  scoringModel: RiskScoringModel;
  onSaveScoringModel: (model: RiskScoringModel) => void;
}) {
  const [draftModel, setDraftModel] = useState(scoringModel);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraftModel(scoringModel);
  }, [scoringModel]);

  useEffect(() => {
    if (!saved) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setSaved(false), 1800);
    return () => window.clearTimeout(timeoutId);
  }, [saved]);

  function updateDefinition(section: 'likelihood' | 'impact', value: number, field: 'label' | 'description', nextValue: string) {
    setDraftModel((current) => ({
      ...current,
      [section]: current[section].map((entry) =>
        entry.value === value
          ? {
              ...entry,
              [field]: nextValue,
            }
          : entry,
      ),
    }));
  }

  const isDirty = JSON.stringify(draftModel) !== JSON.stringify(scoringModel);

  return (
    <div className="mx-auto w-full max-w-[1500px] px-8 py-8">
      <div className="mb-8 flex items-end justify-between gap-6">
        <div>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">Settings</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-on-surface-variant">
            Maintain the official scoring rubric here. Risk creation and risk scoring views read these definitions directly so teams apply Likelihood and Impact consistently.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved ? (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-800">
              Saved
            </span>
          ) : null}
          <button
            className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-on-surface transition hover:bg-slate-200"
            onClick={() => setDraftModel(scoringModel)}
            type="button"
          >
            Reset
          </button>
          <button
            className="rounded-xl bg-gradient-to-br from-primary to-primary-dim px-4 py-2.5 text-sm font-bold text-on-primary shadow-lg shadow-primary/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!isDirty}
            onClick={() => {
              onSaveScoringModel(draftModel);
              setSaved(true);
            }}
            type="button"
          >
            Save Scoring Model
          </button>
        </div>
      </div>

      <section className="rounded-[1.75rem] bg-white p-6 shadow-[0_14px_40px_rgba(42,52,57,0.06)]">
        <div className="mb-6 flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">rule_settings</span>
          <div>
            <h2 className="font-headline text-2xl font-extrabold text-on-surface">Risk Scoring Model</h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              This configuration is the source of truth for the 1-5 Likelihood and Impact definitions shown throughout the app.
            </p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <ScoringDefinitionEditor
            definitions={draftModel.likelihood}
            onChange={(value, field, nextValue) => updateDefinition('likelihood', value, field, nextValue)}
            title="Likelihood Definitions"
          />
          <ScoringDefinitionEditor
            definitions={draftModel.impact}
            onChange={(value, field, nextValue) => updateDefinition('impact', value, field, nextValue)}
            title="Impact Definitions"
          />
        </div>
      </section>
    </div>
  );
}

function SnapshotPage({
  activeProjectName,
  projectCount,
  onExportSnapshot,
  onImportSnapshot,
}: {
  activeProjectName: string;
  projectCount: number;
  onExportSnapshot: () => void;
  onImportSnapshot: (source: string) => string;
}) {
  const [snapshotStatus, setSnapshotStatus] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);
  const importFileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!snapshotStatus) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setSnapshotStatus(null), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [snapshotStatus]);

  async function handleSnapshotFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const contents = await file.text();
      const message = onImportSnapshot(contents);
      setSnapshotStatus({
        tone: 'success',
        message: `${message} Source file: ${file.name}.`,
      });
    } catch (error) {
      setSnapshotStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Snapshot import failed.',
      });
    } finally {
      event.target.value = '';
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] px-8 py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-3xl">
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
            Import / Export
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
            Load a shared register snapshot before review work begins, or export the current app state after updates so the next reviewer starts from the same governed baseline.
          </p>
        </div>
        <button
          className="rounded-xl bg-gradient-to-br from-primary to-primary-dim px-4 py-2.5 text-sm font-bold text-on-primary shadow-lg shadow-primary/20 transition hover:opacity-90"
          onClick={onExportSnapshot}
          type="button"
        >
          Export Snapshot
        </button>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-[1.5rem] bg-white px-5 py-4 shadow-[0_14px_40px_rgba(42,52,57,0.06)]">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Projects In App</div>
          <div className="mt-2 text-3xl font-extrabold text-on-surface">{projectCount}</div>
          <div className="mt-2 text-sm text-on-surface-variant">Full workspace state is included in every snapshot export.</div>
        </div>
        <div className="rounded-[1.5rem] bg-white px-5 py-4 shadow-[0_14px_40px_rgba(42,52,57,0.06)]">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Active Project</div>
          <div className="mt-2 text-xl font-extrabold text-on-surface">{activeProjectName}</div>
          <div className="mt-2 text-sm text-on-surface-variant">The current project selection is preserved in the exported snapshot.</div>
        </div>
        <div className="rounded-[1.5rem] bg-white px-5 py-4 shadow-[0_14px_40px_rgba(42,52,57,0.06)]">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Snapshot Format</div>
          <div className="mt-2 text-xl font-extrabold text-on-surface">Pretty JSON</div>
          <div className="mt-2 text-sm text-on-surface-variant">Readable, diff-friendly, and easy to store in SharePoint or revision control.</div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(360px,0.9fr)_minmax(0,1.4fr)]">
        <section className="rounded-[1.75rem] bg-white p-6 shadow-[0_14px_40px_rgba(42,52,57,0.06)]">
          <div className="mb-5 flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">upload_file</span>
            <div>
              <h2 className="font-headline text-2xl font-extrabold text-on-surface">Import Snapshot</h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Choose an exported snapshot file to replace the current local browser state with that shared revision.
              </p>
            </div>
          </div>

          <input
            accept=".json,application/json,text/plain"
            className="hidden"
            onChange={handleSnapshotFileChange}
            ref={importFileRef}
            type="file"
          />

          <button
            className="w-full rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-5 py-8 text-left transition hover:border-primary/50 hover:bg-primary/10"
            onClick={() => importFileRef.current?.click()}
            type="button"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
                <span className="material-symbols-outlined text-[24px]">file_open</span>
              </div>
              <div>
                <div className="text-base font-bold text-on-surface">Choose Snapshot File</div>
                <div className="mt-1 text-sm leading-relaxed text-on-surface-variant">
                  Supports the exported pretty JSON snapshot. Import runs immediately after file selection.
                </div>
              </div>
            </div>
          </button>

          {snapshotStatus ? (
            <div
              className={`mt-4 rounded-2xl px-4 py-3 text-sm font-medium ${
                snapshotStatus.tone === 'success'
                  ? 'bg-emerald-100 text-emerald-900'
                  : 'bg-rose-100 text-rose-900'
              }`}
            >
              {snapshotStatus.message}
            </div>
          ) : null}

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-relaxed text-on-surface-variant">
            Import replaces the current local snapshot in this browser. Export first if you want a rollback point before bringing in another teammate&apos;s revision.
          </div>

          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-relaxed text-emerald-900">
            Snapshots include each project&apos;s saved Likelihood and Impact scoring definitions, so imported projects retain the same scoring model that was configured before export.
          </div>

          <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-4 text-sm leading-relaxed text-on-surface-variant">
            Want example content for a demo or walkthrough? Download the bundled
            {' '}
            <a
              className="font-semibold text-primary underline decoration-primary/40 underline-offset-4"
              download
              href="demo-project-snapshot.json"
            >
              demo snapshot
            </a>
            {' '}
            and import it here.
          </div>
        </section>

        <section className="rounded-[1.75rem] bg-white p-6 shadow-[0_14px_40px_rgba(42,52,57,0.06)]">
          <div className="mb-5 flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">download</span>
            <div>
              <h2 className="font-headline text-2xl font-extrabold text-on-surface">Export Snapshot</h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Capture the full app state after a review session so the next person starts from the same register baseline.
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Included In Export</div>
              <div className="mt-3 space-y-2 text-sm text-on-surface-variant">
                <div>All projects, risks, and decisions</div>
                <div>Central scoring model definitions</div>
                <div>Current active project selection</div>
                <div>Version and export timestamp metadata</div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Recommended Workflow</div>
              <div className="mt-3 space-y-2 text-sm text-on-surface-variant">
                <div>Export after each team review or approved update session.</div>
                <div>Store snapshots in SharePoint or source control as the official record.</div>
                <div>Import the latest revision before making new edits.</div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm leading-relaxed text-on-surface-variant">
              Use the `Export Snapshot` button at the top of this page to download the current governed workspace state.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function RiskRegisterPage({
  risks,
  selectedRiskId,
  selectedRisk,
  onSelectRisk,
  onShowDecision,
  scoringModel,
  decisions,
}: {
  risks: Risk[];
  selectedRiskId: string;
  selectedRisk: Risk | null;
  onSelectRisk: (riskId: string) => void;
  onShowDecision: (decisionId: string) => void;
  scoringModel: RiskScoringModel;
  decisions: Decision[];
}) {
  const [selectedHeatmapCell, setSelectedHeatmapCell] = useState<HeatmapCell | null>(null);
  const [heatmapView, setHeatmapView] = useState<'count' | 'ids'>('count');
  const [heatmapExportState, setHeatmapExportState] = useState<'idle' | 'copied' | 'copy-failed'>('idle');
  const [heatmapCopyError, setHeatmapCopyError] = useState('');
  const [heatmapExternalOnly, setHeatmapExternalOnly] = useState(false);
  const [heatmapSettingsOpen, setHeatmapSettingsOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'All' | RiskStatus>('All');
  const [ownerFilter, setOwnerFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState<'All' | RiskSeverity>('All');

  const openRisks = risks
    .filter((risk) => risk.status !== 'Closed' && risk.status !== 'Rejected')
    .sort((left, right) => {
      const severityOrder = {High: 0, Medium: 1, Low: 2};
      return severityOrder[left.severity] - severityOrder[right.severity];
    });
  const filteredOpenRisks = openRisks.filter((risk) => {
    if (statusFilter !== 'All' && risk.status !== statusFilter) {
      return false;
    }

    if (ownerFilter !== 'All' && risk.owner !== ownerFilter) {
      return false;
    }

    if (severityFilter !== 'All' && risk.severity !== severityFilter) {
      return false;
    }

    return true;
  });
  const retiredRisks = risks.filter((risk) => risk.status === 'Closed' || risk.status === 'Rejected');
  const activeRisks = openRisks.length;
  const highCount = openRisks.filter((risk) => risk.severity === 'High').length;
  const mediumCount = openRisks.filter((risk) => risk.severity === 'Medium').length;
  const lowCount = openRisks.filter((risk) => risk.severity === 'Low').length;
  const monitoringCount = openRisks.filter((risk) => risk.status === 'Monitoring').length;
  const averageScore = activeRisks
    ? (openRisks.reduce((total, risk) => total + risk.likelihood * risk.impact, 0) / activeRisks).toFixed(1)
    : '0.0';
  const heatmapRisks = heatmapExternalOnly
    ? openRisks.filter((risk) => !risk.internalOnly)
    : openRisks;
  const heatmapValues = createHeatmapValues(heatmapRisks);
  const heatmapRiskMap = createHeatmapRiskMap(heatmapRisks);
  const heatmapMatches = selectedHeatmapCell
    ? heatmapRisks.filter(
        (risk) =>
          risk.likelihood === selectedHeatmapCell.likelihood &&
          risk.impact === selectedHeatmapCell.impact,
      )
    : [];

  useEffect(() => {
    if (!selectedHeatmapCell) {
      return;
    }

    const stillHasMatches = openRisks.some(
      (risk) =>
        risk.likelihood === selectedHeatmapCell.likelihood &&
        risk.impact === selectedHeatmapCell.impact,
    );

    if (!stillHasMatches) {
      setSelectedHeatmapCell(null);
    }
  }, [openRisks, selectedHeatmapCell]);

  useEffect(() => {
    if (heatmapExportState === 'idle') {
      setHeatmapCopyError('');
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setHeatmapExportState('idle'), 1800);
    return () => window.clearTimeout(timeoutId);
  }, [heatmapExportState]);

  const currentOwnerOptions = Array.from(new Set(openRisks.map((risk) => risk.owner))).sort();

  function handleDownloadCurrentRisks() {
    const headers = [
      'ID',
      'Title',
      'Status',
      'Likelihood',
      'Impact',
      'Severity',
      'Owner',
      'Last Updated',
      'Due Date',
      'Linked Decision',
      'Statement',
    ];
    const rows = filteredOpenRisks.map((risk) => [
      risk.id,
      risk.title,
      risk.status,
      String(risk.likelihood),
      String(risk.impact),
      risk.severity,
      risk.owner,
      risk.lastUpdated,
      risk.dueDate || '',
      risk.linkedDecision,
      risk.statement,
    ]);
    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(','),
      )
      .join('\n');
    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'risk-register-current-risks.csv';
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  async function handleCopyHeatmap() {
    if (!window.isSecureContext) {
      setHeatmapCopyError('Image copy requires a secure browser context such as localhost or HTTPS.');
      setHeatmapExportState('copy-failed');
      return;
    }

    if (!('ClipboardItem' in window) || !navigator.clipboard?.write) {
      setHeatmapCopyError('This browser does not support copying images to the clipboard.');
      setHeatmapExportState('copy-failed');
      return;
    }

    try {
      const blob = await renderHeatmapToPngBlob(heatmapRiskMap, heatmapValues, heatmapView);
      const clipboardSupportsPng =
        typeof ClipboardItem !== 'undefined' &&
        typeof ClipboardItem.supports === 'function' &&
        ClipboardItem.supports('image/png');

      if (!clipboardSupportsPng) {
        setHeatmapCopyError('This browser supports clipboard access, but not PNG image copy.');
        setHeatmapExportState('copy-failed');
        return;
      }

      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob,
        }),
      ]);
      setHeatmapExportState('copied');
    } catch (error) {
      if (error instanceof Error && error.message) {
        setHeatmapCopyError(`Image copy failed: ${error.message}`);
      } else {
        setHeatmapCopyError('The browser blocked image clipboard access for this page.');
      }
      setHeatmapExportState('copy-failed');
    }
  }

  async function handleDownloadHeatmapPng() {
    try {
      const blob = await renderHeatmapToPngBlob(heatmapRiskMap, heatmapValues, heatmapView);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'risk-heatmap.png';
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch {
      // silently ignore download errors
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] px-8 py-8">
      <div className="mb-8 flex items-end justify-between gap-6">
        <div>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
            Risk Register
          </h1>
        </div>
        <div className="flex gap-3">
          <button
            className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-on-surface shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
            type="button"
          >
            Export Register
          </button>
        </div>
      </div>

      <section className="mb-5">
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-3xl bg-white px-5 py-4 shadow-[0_12px_34px_rgba(42,52,57,0.05)]">
            <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Register Snapshot</div>
            <div className="grid grid-cols-2 gap-3">
              <SummaryMetricCard label="Active Risks" tone="text-on-surface" value={String(activeRisks)} />
              <SummaryMetricCard label="Retired Risks" tone="text-slate-500" value={String(retiredRisks.length)} />
              <SummaryMetricCard label="Monitoring" tone="text-sky-700" value={String(monitoringCount)} />
              <SummaryMetricCard label="Average Score" tone="text-amber-700" value={averageScore} />
            </div>
          </div>

          <div className="rounded-3xl bg-white px-5 py-4 shadow-[0_12px_34px_rgba(42,52,57,0.05)]">
            <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Severity Breakdown</div>
            <SeverityBreakdownChart
              bars={[
                {label: 'High', value: highCount, color: 'bg-error', textColor: 'text-error'},
                {label: 'Medium', value: mediumCount, color: 'bg-amber-400', textColor: 'text-amber-600'},
                {label: 'Low', value: lowCount, color: 'bg-emerald-500', textColor: 'text-emerald-600'},
              ]}
            />
          </div>

          <div className="relative rounded-3xl bg-white px-5 py-4 shadow-[0_12px_34px_rgba(42,52,57,0.05)]">
            <div className="mb-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                Risk Distribution Heatmap
              </div>
              {heatmapExportState !== 'idle' ? (
                <div
                  className={`mt-1 text-[11px] font-semibold ${
                    heatmapExportState === 'copied' ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {heatmapExportState === 'copied'
                    ? 'Heatmap image copied to clipboard'
                    : heatmapCopyError}
                </div>
              ) : null}
            </div>
            <div className="absolute bottom-4 left-4">
              <button
                aria-expanded={heatmapSettingsOpen}
                aria-label="Display and export settings"
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition ${
                  heatmapSettingsOpen || heatmapExternalOnly
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
                onClick={() => setHeatmapSettingsOpen((prev) => !prev)}
                title="Display and export settings"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">tune</span>
              </button>
              {heatmapSettingsOpen ? (
                  <div className="absolute bottom-full left-0 z-10 mb-2 w-56 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
                    <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Display</div>
                    <div className="mb-3 inline-flex w-full rounded-xl bg-slate-100 p-1">
                      <button
                        className={`flex-1 rounded-lg py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] transition ${
                          heatmapView === 'count' ? 'bg-white text-on-surface shadow-sm' : 'text-slate-500'
                        }`}
                        onClick={() => setHeatmapView('count')}
                        type="button"
                      >
                        Counts
                      </button>
                      <button
                        className={`flex-1 rounded-lg py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] transition ${
                          heatmapView === 'ids' ? 'bg-white text-on-surface shadow-sm' : 'text-slate-500'
                        }`}
                        onClick={() => setHeatmapView('ids')}
                        type="button"
                      >
                        Risk IDs
                      </button>
                    </div>
                    <label className="mb-3 flex cursor-pointer items-center justify-between rounded-xl bg-slate-50 px-3 py-2 transition hover:bg-slate-100">
                      <span className="text-[11px] font-semibold text-on-surface">Hide internal-only risks</span>
                      <input
                        checked={heatmapExternalOnly}
                        className="h-3.5 w-3.5 accent-primary"
                        onChange={(event) => setHeatmapExternalOnly(event.target.checked)}
                        type="checkbox"
                      />
                    </label>
                    <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Export</div>
                    <div className="flex flex-col gap-1.5">
                      <button
                        className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-left text-[11px] font-semibold text-on-surface transition hover:bg-slate-100"
                        onClick={() => { handleCopyHeatmap(); setHeatmapSettingsOpen(false); }}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px] text-slate-500">content_copy</span>
                        Copy image to clipboard
                      </button>
                      <button
                        className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-left text-[11px] font-semibold text-on-surface transition hover:bg-slate-100"
                        onClick={() => { handleDownloadHeatmapPng(); setHeatmapSettingsOpen(false); }}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px] text-slate-500">download</span>
                        Download as PNG
                      </button>
                    </div>
                  </div>
                ) : null}
            </div>
            <div className="rounded-2xl bg-white">
              <Heatmap
                selectedCell={selectedHeatmapCell}
                riskMap={heatmapRiskMap}
                values={heatmapValues}
                viewMode={heatmapView}
                onSelectCell={(cell) => {
                  setSelectedHeatmapCell((current) =>
                    current &&
                    current.likelihood === cell.likelihood &&
                    current.impact === cell.impact
                      ? null
                      : cell,
                  );
                }}
              />
            </div>
            {selectedHeatmapCell ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Risks In Selected Cell
                    </div>
                    <div className="mt-1 text-sm font-semibold text-on-surface">
                      Likelihood {selectedHeatmapCell.likelihood} / Impact {selectedHeatmapCell.impact}
                    </div>
                  </div>
                  <button
                    className="rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-100"
                    onClick={() => setSelectedHeatmapCell(null)}
                    type="button"
                  >
                    Clear
                  </button>
                </div>
                <div className="space-y-2">
                  {heatmapMatches.map((risk) => (
                    <button
                      key={risk.id}
                      className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-primary/25 hover:bg-primary/5"
                      onClick={() => onSelectRisk(risk.id)}
                      type="button"
                    >
                      <div>
                        <div className="text-sm font-bold text-on-surface">{risk.title}</div>
                        <div className="mt-1 text-xs text-on-surface-variant">
                          {risk.id} • {risk.owner} • {risk.severity}
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-[18px] text-primary">open_in_new</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.75rem] bg-white shadow-[0_14px_40px_rgba(42,52,57,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 px-6 py-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Current Risks</div>
            <div className="mt-1 text-sm text-on-surface-variant">
              {filteredOpenRisks.length} shown of {openRisks.length} open risks
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              onClick={handleDownloadCurrentRisks}
              type="button"
            >
              <span className="material-symbols-outlined">download</span>
            </button>
          </div>
        </div>

        {openRisks.length === 0 && retiredRisks.length === 0 ? (
          <div className="px-6 py-12">
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
              <div className="text-lg font-bold text-on-surface">No risks in this project yet</div>
              <div className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
                Start by logging a new risk, or go to `Import / Export` to load a shared project snapshot before you begin working.
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] border-collapse text-left">
                <thead className="bg-surface-container-low/70 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Risk</th>
                    <th className="px-6 py-4">
                      <div>Status</div>
                      <select
                        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-[11px] font-semibold normal-case tracking-normal text-on-surface outline-none focus:border-primary/25"
                        onChange={(event) => setStatusFilter(event.target.value as 'All' | RiskStatus)}
                        value={statusFilter}
                      >
                        {['All', 'Pending', 'Active', 'Monitoring'].map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </th>
                    <th className="px-6 py-4">LH/IM</th>
                    <th className="px-6 py-4">
                      <div>Severity</div>
                      <select
                        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-[11px] font-semibold normal-case tracking-normal text-on-surface outline-none focus:border-primary/25"
                        onChange={(event) => setSeverityFilter(event.target.value as 'All' | RiskSeverity)}
                        value={severityFilter}
                      >
                        {['All', 'High', 'Medium', 'Low'].map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </th>
                    <th className="px-6 py-4">
                      <div>Owner</div>
                      <select
                        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-[11px] font-semibold normal-case tracking-normal text-on-surface outline-none focus:border-primary/25"
                        onChange={(event) => setOwnerFilter(event.target.value)}
                        value={ownerFilter}
                      >
                        <option value="All">All</option>
                        {currentOwnerOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </th>
                    <th className="px-6 py-4">Last Updated</th>
                    <th className="px-6 py-4">Linked Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOpenRisks.map((risk, index) => {
                    const selected = risk.id === selectedRiskId;
                    return (
                      <tr
                        key={risk.id}
                        className={`cursor-pointer border-t border-slate-200/60 transition ${
                          selected
                            ? 'bg-primary/6 shadow-[inset_4px_0_0_0_rgba(79,94,126,1)]'
                            : index % 2 === 1
                              ? 'bg-slate-50/70 hover:bg-surface-container-low/80'
                              : 'hover:bg-surface-container-low/70'
                        }`}
                        onClick={() => onSelectRisk(risk.id)}
                      >
                        <td className="px-6 py-5 font-mono text-sm font-bold text-primary">{risk.id}</td>
                        <td className="px-6 py-5">
                          <div className="space-y-1">
                            <div className="text-sm font-bold text-on-surface">{risk.title}</div>
                            <div className="max-w-xl text-xs leading-relaxed text-on-surface-variant">{risk.statement}</div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <RiskStatusBadge status={risk.status} />
                        </td>
                        <td className="px-6 py-5 font-mono text-sm font-semibold text-on-surface">
                          <span
                            title={`Likelihood ${risk.likelihood} - ${getScoreDefinition(scoringModel.likelihood, risk.likelihood)?.label ?? ''}; Impact ${risk.impact} - ${getScoreDefinition(scoringModel.impact, risk.impact)?.label ?? ''}`}
                          >
                            {risk.likelihood}/{risk.impact}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <SeverityBadge severity={risk.severity} />
                        </td>
                        <td className="px-6 py-5 text-sm font-medium text-on-surface">{risk.owner}</td>
                        <td className="px-6 py-5 text-sm tabular-nums text-on-surface-variant">{risk.lastUpdated}</td>
                        <td className="px-6 py-5">
                          {risk.linkedDecision === 'None' ? (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                              None
                            </span>
                          ) : (
                            <button
                              className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold tracking-[0.04em] text-primary transition hover:bg-primary/15"
                              onClick={(event) => {
                                event.stopPropagation();
                                onShowDecision(risk.linkedDecision);
                              }}
                              type="button"
                            >
                              {getDecisionLabel(decisions, risk.linkedDecision)}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-200/70 px-6 py-4 text-sm text-on-surface-variant">
              Selected risk:{' '}
              <span className="font-semibold text-on-surface">{selectedRisk?.id ?? 'None selected'}</span>
            </div>
          </>
        )}
      </section>

      {retiredRisks.length ? (
        <section className="mt-8 overflow-hidden rounded-[1.75rem] bg-white/80 shadow-[0_14px_40px_rgba(42,52,57,0.04)] ring-1 ring-slate-200/70">
          <div className="border-b border-slate-200/70 px-6 py-4">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Retired Risks</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] border-collapse text-left">
              <thead className="bg-slate-100/80 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Risk</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">LH/IM</th>
                  <th className="px-6 py-4">Severity</th>
                  <th className="px-6 py-4">Owner</th>
                  <th className="px-6 py-4">Last Updated</th>
                  <th className="px-6 py-4">Linked Decision</th>
                </tr>
              </thead>
              <tbody>
                {retiredRisks.map((risk) => (
                  <tr
                    key={risk.id}
                    className="cursor-pointer border-t border-slate-200/60 bg-slate-50/70 text-slate-500 opacity-70 transition hover:opacity-100"
                    onClick={() => onSelectRisk(risk.id)}
                  >
                    <td className="px-6 py-5 font-mono text-sm font-bold text-slate-500">{risk.id}</td>
                    <td className="px-6 py-5">
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-slate-600">{risk.title}</div>
                        <div className="max-w-xl text-xs leading-relaxed text-slate-500">{risk.statement}</div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <RiskStatusBadge status={risk.status} />
                    </td>
                    <td className="px-6 py-5 font-mono text-sm font-semibold">{risk.likelihood}/{risk.impact}</td>
                    <td className="px-6 py-5">
                      <SeverityBadge severity={risk.severity} />
                    </td>
                    <td className="px-6 py-5 text-sm font-medium">{risk.owner}</td>
                    <td className="px-6 py-5 text-sm tabular-nums">{risk.lastUpdated}</td>
                    <td className="px-6 py-5">
                      {risk.linkedDecision === 'None' ? (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                          None
                        </span>
                      ) : (
                        <button
                          className="rounded-full bg-slate-200 px-3 py-1 text-[11px] font-bold tracking-[0.04em] text-slate-600 transition hover:bg-slate-300"
                          onClick={(event) => {
                            event.stopPropagation();
                            onShowDecision(risk.linkedDecision);
                          }}
                          type="button"
                        >
                          {getDecisionLabel(decisions, risk.linkedDecision)}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function DecisionRegisterPage({
  decisions,
  selectedDecision,
  risks,
  onSelectDecision,
  onUpdateDecision,
  onDeleteDecision,
  onShowRisk,
}: {
  decisions: Decision[];
  selectedDecision: Decision | null;
  risks: Risk[];
  onSelectDecision: (decisionId: string) => void;
  onUpdateDecision: (decisionId: string, updates: Partial<Decision>) => void;
  onDeleteDecision: (decisionId: string) => void;
  onShowRisk: (riskId: string) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<'All' | DecisionStatus>('All');
  const [deciderFilter, setDeciderFilter] = useState('All');
  const currentDecisions = decisions.filter((decision) => decision.status !== 'Rejected');
  const rejectedDecisions = decisions.filter((decision) => decision.status === 'Rejected');
  const filteredCurrentDecisions = currentDecisions.filter((decision) => {
    if (statusFilter !== 'All' && decision.status !== statusFilter) {
      return false;
    }

    if (deciderFilter !== 'All' && decision.deciders !== deciderFilter) {
      return false;
    }

    return true;
  });
  const deciderOptions = Array.from(new Set(currentDecisions.map((decision) => decision.deciders))).sort();

  function handleDownloadDecisions() {
    const headers = ['ID', 'Title', 'Status', 'Deciders', 'Date', 'Linked Risks', 'Summary'];
    const rows = filteredCurrentDecisions.map((decision) => [
      decision.id,
      decision.title,
      decision.status,
      decision.deciders,
      decision.date,
      decision.linkedRisks.map((riskId) => getRiskLabel(risks, riskId)).join(' | '),
      getDecisionPreview(decision),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'decision-register.csv';
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  function renderDecisionTable(items: Decision[], dimmed = false, filterable = false) {
    if (items.length === 0) {
      return (
        <div className="flex items-center justify-center p-16 text-sm text-slate-400">
          No decisions logged in this section yet.
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left">
          <thead className={`text-[11px] font-bold uppercase tracking-[0.18em] ${dimmed ? 'bg-slate-100/80 text-slate-400' : 'bg-surface-container-low/70 text-slate-500'}`}>
            <tr>
              <th className="whitespace-nowrap px-5 py-4">ID</th>
              <th className="px-5 py-4">Decision Title</th>
              <th className="whitespace-nowrap px-5 py-4">
                <div>Status</div>
                {filterable ? (
                  <select
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-[11px] font-semibold normal-case tracking-normal text-on-surface outline-none focus:border-primary/25"
                    onChange={(event) => setStatusFilter(event.target.value as 'All' | DecisionStatus)}
                    value={statusFilter}
                  >
                    {['All', 'Proposed', 'Approved', 'Implemented', 'Deferred'].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : null}
              </th>
              <th className="whitespace-nowrap px-5 py-4">
                <div>Deciders</div>
                {filterable ? (
                  <select
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-[11px] font-semibold normal-case tracking-normal text-on-surface outline-none focus:border-primary/25"
                    onChange={(event) => setDeciderFilter(event.target.value)}
                    value={deciderFilter}
                  >
                    <option value="All">All</option>
                    {deciderOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : null}
              </th>
              <th className="whitespace-nowrap px-5 py-4">Date</th>
            </tr>
          </thead>
          <tbody>
            {items.map((decision, index) => {
              const selected = selectedDecision != null && decision.id === selectedDecision.id;
              return (
                <tr
                  key={decision.id}
                  className={`cursor-pointer border-t border-slate-200/60 transition ${
                    selected
                      ? 'bg-primary/6 shadow-[inset_4px_0_0_0_rgba(79,94,126,1)]'
                      : dimmed
                        ? 'bg-slate-50/70 text-slate-500 opacity-70 hover:opacity-100'
                        : index % 2 === 1
                          ? 'bg-slate-50/70 hover:bg-surface-container-low/80'
                          : 'hover:bg-surface-container-low/70'
                  }`}
                  onClick={() => onSelectDecision(decision.id)}
                >
                  <td className={`whitespace-nowrap px-5 py-5 font-mono text-sm font-bold ${dimmed ? 'text-slate-500' : 'text-primary'}`}>{decision.id}</td>
                  <td className="px-5 py-5">
                    <div className="space-y-0.5">
                      <div className={`text-sm font-bold ${dimmed ? 'text-slate-600' : 'text-on-surface'}`}>{decision.title}</div>
                      <div className="line-clamp-1 text-xs text-on-surface-variant">{getDecisionPreview(decision)}</div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-5">
                    <DecisionStatusBadge status={decision.status} />
                  </td>
                  <td className="whitespace-nowrap px-5 py-5 text-sm font-medium text-on-surface-variant">{decision.deciders}</td>
                  <td className="whitespace-nowrap px-5 py-5 text-sm tabular-nums text-on-surface">{decision.date}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1450px] px-8 py-8">
      <div className="mb-8 flex items-end justify-between gap-6">
        <div>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
            Decision Register
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-on-surface-variant">
            Historical log of governance outcomes, linked risks, and the reasoning behind major choices.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-on-surface shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
            onClick={handleDownloadDecisions}
            type="button"
          >
            Export Register
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.45fr_1fr]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-[1.75rem] bg-white shadow-[0_14px_40px_rgba(42,52,57,0.06)]">
            <div className="border-b border-slate-200/70 px-5 py-4">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Current Decisions</div>
            </div>
            {renderDecisionTable(filteredCurrentDecisions, false, true)}
          </section>

          {rejectedDecisions.length ? (
            <section className="overflow-hidden rounded-[1.75rem] bg-white/80 shadow-[0_14px_40px_rgba(42,52,57,0.04)] ring-1 ring-slate-200/70">
              <div className="border-b border-slate-200/70 px-5 py-4">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Rejected Decisions</div>
              </div>
              {renderDecisionTable(rejectedDecisions, true)}
            </section>
          ) : null}
        </div>

        {selectedDecision ? (
          <DecisionDetailPanel
            decision={selectedDecision}
            risks={risks}
            onUpdate={(updates) => onUpdateDecision(selectedDecision.id, updates)}
            onDelete={() => onDeleteDecision(selectedDecision.id)}
            onShowRisk={onShowRisk}
          />
        ) : (
          <div className="flex items-center justify-center rounded-[1.75rem] bg-white p-12 shadow-[0_14px_40px_rgba(42,52,57,0.06)]">
            <div className="max-w-md text-center">
              <div className="text-lg font-bold text-on-surface">No decisions in this project yet</div>
              <div className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                Start by logging a new decision, or go to `Import / Export` to load a shared snapshot that already contains register data.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DecisionDetailPanel({
  decision,
  risks,
  onUpdate,
  onDelete,
  onShowRisk,
}: {
  decision: Decision;
  risks: Risk[];
  onUpdate: (updates: Partial<Decision>) => void;
  onDelete: () => void;
  onShowRisk: (riskId: string) => void;
}) {
  const [editingOutcome, setEditingOutcome] = useState(false);
  const [outcomeDraft, setOutcomeDraft] = useState(decision.outcome);
  const [editingContext, setEditingContext] = useState(false);
  const [contextDraft, setContextDraft] = useState(decision.context);
  const [editingMoreInfo, setEditingMoreInfo] = useState(false);
  const [moreInfoDraft, setMoreInfoDraft] = useState(decision.moreInfo);
  const [newDriver, setNewDriver] = useState('');
  const [newOption, setNewOption] = useState('');
  const [newGoodConsequence, setNewGoodConsequence] = useState('');
  const [newBadConsequence, setNewBadConsequence] = useState('');
  const [newLinkedRisk, setNewLinkedRisk] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [savedLabel, setSavedLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!savedLabel) return undefined;
    const t = window.setTimeout(() => setSavedLabel(null), 1800);
    return () => window.clearTimeout(t);
  }, [savedLabel]);

  function save(updates: Partial<Decision>, label: string) {
    onUpdate(updates);
    setSavedLabel(label);
  }

  return (
    <div className="space-y-5">
      {/* ADR header — status, date, deciders */}
      <section className="rounded-[1.75rem] bg-white p-6 shadow-[0_14px_40px_rgba(42,52,57,0.06)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[11px] font-bold text-primary">{decision.id}</div>
            <EditableText
              className="mt-1 font-headline text-xl font-extrabold leading-snug text-on-surface"
              value={decision.title}
              placeholder="Decision title"
              onSave={(v) => save({title: v}, 'Title updated')}
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {savedLabel ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-800">
                {savedLabel}
              </span>
            ) : null}
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Delete?</span>
                <button className="rounded-full bg-error px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition hover:opacity-90" onClick={onDelete} type="button">Confirm</button>
                <button className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-200" onClick={() => setConfirmDelete(false)} type="button">Cancel</button>
              </div>
            ) : (
              <button className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-error" onClick={() => setConfirmDelete(true)} title="Delete decision" type="button">
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Status</div>
            <select
              className="w-full bg-transparent text-sm font-semibold text-on-surface outline-none"
              value={decision.status}
              onChange={(e) => save({status: e.target.value as DecisionStatus}, 'Status updated')}
            >
              {(['Proposed', 'Approved', 'Implemented', 'Deferred', 'Rejected'] as DecisionStatus[]).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Deciders</div>
            <EditableText
              className="text-sm font-semibold text-on-surface"
              value={decision.deciders}
              placeholder="Who decided…"
              onSave={(v) => save({deciders: v}, 'Deciders updated')}
            />
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Date</div>
            <EditableText
              className="text-sm font-semibold text-on-surface"
              value={decision.date}
              placeholder="e.g. Apr 09, 2026"
              onSave={(v) => save({date: v}, 'Date updated')}
            />
          </div>
        </div>
      </section>

      {/* Context and Problem Statement */}
      <section className="rounded-[1.75rem] bg-white p-6 shadow-[0_14px_40px_rgba(42,52,57,0.06)]">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Context and Problem Statement</div>
        <DecisionEditTextarea
          field="context" value={decision.context} draft={contextDraft} setDraft={setContextDraft}
          editing={editingContext} setEditing={setEditingContext}
          onSave={save}
          placeholder="Describe the context and the problem being addressed…" label="Context"
        />
      </section>

      {/* Decision Drivers */}
      <section className="rounded-[1.75rem] bg-white p-6 shadow-[0_14px_40px_rgba(42,52,57,0.06)]">
        <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Decision Drivers</div>
        <EditableDecisionList
          items={decision.decisionDrivers}
          placeholder="Add a decision driver…"
          onAdd={(v) => save({decisionDrivers: [...decision.decisionDrivers, v]}, 'Driver added')}
          onRemove={(i) => save({decisionDrivers: decision.decisionDrivers.filter((_, j) => j !== i)}, 'Driver removed')}
        />
      </section>

      {/* Considered Options */}
      <section className="rounded-[1.75rem] bg-white p-6 shadow-[0_14px_40px_rgba(42,52,57,0.06)]">
        <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Considered Options</div>
        <EditableDecisionList
          numbered
          items={decision.consideredOptions}
          placeholder="Add an option…"
          onAdd={(v) => save({consideredOptions: [...decision.consideredOptions, v]}, 'Option added')}
          onRemove={(i) => save({consideredOptions: decision.consideredOptions.filter((_, j) => j !== i)}, 'Option removed')}
        />
      </section>

      {/* Decision Outcome */}
      <section className="rounded-[1.75rem] bg-white p-6 shadow-[0_14px_40px_rgba(42,52,57,0.06)]">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Decision Outcome</div>
        <DecisionEditTextarea
          field="outcome" value={decision.outcome} draft={outcomeDraft} setDraft={setOutcomeDraft}
          editing={editingOutcome} setEditing={setEditingOutcome}
          onSave={save}
          placeholder="Describe the chosen option and why others were rejected…" label="Outcome"
        />
      </section>

      {/* Consequences */}
      <section className="rounded-[1.75rem] bg-white p-6 shadow-[0_14px_40px_rgba(42,52,57,0.06)]">
        <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Consequences</div>
        <div className="mb-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-600">
            <span className="material-symbols-outlined text-[13px]">thumb_up</span> Good
          </div>
          <EditableDecisionList
            items={decision.goodConsequences}
            placeholder="Add a positive consequence…"
            onAdd={(v) => save({goodConsequences: [...decision.goodConsequences, v]}, 'Consequence added')}
            onRemove={(i) => save({goodConsequences: decision.goodConsequences.filter((_, j) => j !== i)}, 'Consequence removed')}
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-amber-600">
            <span className="material-symbols-outlined text-[13px]">thumb_down</span> Bad
          </div>
          <EditableDecisionList
            items={decision.badConsequences}
            placeholder="Add a negative consequence…"
            onAdd={(v) => save({badConsequences: [...decision.badConsequences, v]}, 'Consequence added')}
            onRemove={(i) => save({badConsequences: decision.badConsequences.filter((_, j) => j !== i)}, 'Consequence removed')}
          />
        </div>
      </section>

      {/* More Information */}
      <section className="rounded-[1.75rem] bg-white p-6 shadow-[0_14px_40px_rgba(42,52,57,0.06)]">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">More Information</div>
        <DecisionEditTextarea
          field="moreInfo" value={decision.moreInfo} draft={moreInfoDraft} setDraft={setMoreInfoDraft}
          editing={editingMoreInfo} setEditing={setEditingMoreInfo}
          onSave={save}
          placeholder="Links, references, follow-on decisions…" label="More information"
        />
      </section>

      {/* Linked Risks */}
      <section className="rounded-[1.75rem] bg-white p-6 shadow-[0_14px_40px_rgba(42,52,57,0.06)]">
        <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Linked Risks</div>
        <div className="space-y-1.5">
          {decision.linkedRisks.map((riskId) => (
            <div key={riskId} className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5">
              <button className="flex-1 text-left text-sm font-semibold text-on-surface transition hover:text-primary" onClick={() => onShowRisk(riskId)} type="button">
                {getRiskLabel(risks, riskId)}
              </button>
              <button className="shrink-0 rounded-full p-1 text-slate-300 transition hover:text-error" onClick={() => save({linkedRisks: decision.linkedRisks.filter((id) => id !== riskId)}, 'Linked risk removed')} type="button">
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
              <span className="material-symbols-outlined text-[16px] text-primary">open_in_new</span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <select className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-primary/40" value={newLinkedRisk} onChange={(e) => setNewLinkedRisk(e.target.value)}>
            <option value="">Link a risk…</option>
            {risks.filter((risk) => !decision.linkedRisks.includes(risk.id)).map((risk) => (
              <option key={risk.id} value={risk.id}>{getRiskLabel(risks, risk.id)}</option>
            ))}
          </select>
          <button className="rounded-xl bg-slate-100 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-200 disabled:opacity-40" disabled={!newLinkedRisk} onClick={() => { save({linkedRisks: [...decision.linkedRisks, newLinkedRisk]}, 'Linked risk added'); setNewLinkedRisk(''); }} type="button">Link</button>
        </div>
      </section>
    </div>
  );
}

function EditableText({
  value,
  placeholder,
  className,
  onSave,
}: {
  value: string;
  placeholder?: string;
  className?: string;
  onSave: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  if (editing) {
    return (
      <input
        autoFocus
        className={`w-full rounded-lg border border-primary/30 bg-primary/5 px-2 py-0.5 outline-none ${className ?? ''}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (draft.trim() && draft.trim() !== value) onSave(draft.trim());
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.currentTarget.blur(); }
          if (e.key === 'Escape') { setDraft(value); setEditing(false); }
        }}
      />
    );
  }

  return (
    <span
      className={`group cursor-text rounded-lg px-0.5 transition hover:bg-slate-100 ${className ?? ''}`}
      onClick={() => setEditing(true)}
      title="Click to edit"
    >
      {value || <span className="text-slate-400">{placeholder}</span>}
      <span className="ml-1 inline-block opacity-0 transition group-hover:opacity-60">
        <span className="material-symbols-outlined text-[13px] text-slate-400">edit</span>
      </span>
    </span>
  );
}

function DecisionEditTextarea({
  field,
  value,
  draft,
  setDraft,
  editing,
  setEditing,
  placeholder,
  label,
  onSave,
}: {
  field: keyof Decision;
  value: string;
  draft: string;
  setDraft: (value: string) => void;
  editing: boolean;
  setEditing: (value: boolean) => void;
  placeholder: string;
  label: string;
  onSave: (updates: Partial<Decision>, label: string) => void;
}) {
  useEffect(() => {
    if (editing) {
      setDraft(value);
    }
  }, [editing, value, setDraft]);

  return editing ? (
    <div>
      <textarea
        autoFocus
        className="min-h-28 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-on-surface outline-none transition focus:border-primary/40"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <div className="mt-2 flex gap-2">
        <button
          className="rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-on-primary transition hover:opacity-90"
          onClick={() => {
            onSave({[field]: draft} as Partial<Decision>, `${label} updated`);
            setEditing(false);
          }}
          type="button"
        >
          Save
        </button>
        <button
          className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-200"
          onClick={() => {
            setDraft(value);
            setEditing(false);
          }}
          type="button"
        >
          Cancel
        </button>
      </div>
    </div>
  ) : (
    <div className="group relative">
      <p className="text-sm leading-relaxed text-on-surface">
        {value || <span className="text-slate-400">{placeholder}</span>}
      </p>
      <button
        className="absolute right-0 top-0 rounded-full p-1 text-slate-300 opacity-0 transition hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100"
        onClick={() => setEditing(true)}
        type="button"
      >
        <span className="material-symbols-outlined text-[14px]">edit</span>
      </button>
    </div>
  );
}

function EditableDecisionList({
  items,
  placeholder,
  onAdd,
  onRemove,
  numbered = false,
}: {
  items: string[];
  placeholder: string;
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
  numbered?: boolean;
}) {
  const [draft, setDraft] = useState('');

  return (
    <div>
      <div className="space-y-1.5">
        {items.map((item, index) => (
          <div key={`${item}-${index}`} className="group flex items-start gap-2 rounded-xl px-3 py-2 transition hover:bg-slate-50">
            <span className="mt-0.5 shrink-0 text-xs font-bold text-slate-400">
              {numbered ? `${index + 1}.` : '•'}
            </span>
            <span className="flex-1 text-sm text-on-surface">{item}</span>
            <button
              className="mt-0.5 shrink-0 rounded-full p-0.5 text-slate-300 opacity-0 transition hover:text-error group-hover:opacity-100"
              onClick={() => onRemove(index)}
              type="button"
            >
              <span className="material-symbols-outlined text-[13px]">close</span>
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-primary/40"
          placeholder={placeholder}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && draft.trim()) {
              onAdd(draft.trim());
              setDraft('');
            }
          }}
        />
        <button
          className="rounded-xl bg-slate-100 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-200 disabled:opacity-40"
          disabled={!draft.trim()}
          onClick={() => {
            onAdd(draft.trim());
            setDraft('');
          }}
          type="button"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function CreateDecisionModal({
  open,
  existingIds,
  nextDecisionId,
  onClose,
  onCreate,
}: {
  open: boolean;
  existingIds: string[];
  nextDecisionId: string;
  onClose: () => void;
  onCreate: (input: {
    id: string;
    title: string;
    status: DecisionStatus;
    deciders: string;
    date: string;
    context: string;
    decisionDrivers: string[];
    consideredOptions: string[];
    outcome: string;
  }) => void;
}) {
  const backdropPressStarted = useRef(false);
  const [form, setForm] = useState({
    id: nextDecisionId,
    title: '',
    status: 'Proposed' as DecisionStatus,
    deciders: '',
    date: new Date().toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'}),
    context: '',
    decisionDrivers: '',
    consideredOptions: '',
    outcome: '',
  });

  function resetDecisionDraft() {
    setForm({
      id: nextDecisionId,
      title: '',
      status: 'Proposed',
      deciders: '',
      date: new Date().toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'}),
      context: '',
      decisionDrivers: '',
      consideredOptions: '',
      outcome: '',
    });
  }

  useEffect(() => {
    if (
      !open &&
      !form.title &&
      !form.deciders &&
      !form.context &&
      !form.decisionDrivers &&
      !form.consideredOptions &&
      !form.outcome &&
      form.id !== nextDecisionId
    ) {
      setForm((current) => ({...current, id: nextDecisionId}));
    }
  }, [
    form.consideredOptions,
    form.context,
    form.deciders,
    form.decisionDrivers,
    form.id,
    form.outcome,
    form.title,
    nextDecisionId,
    open,
  ]);

  if (!open) return null;

  const duplicateId = existingIds.some((id) => id.toUpperCase() === form.id.trim().toUpperCase());
  const missingFields = [
    !form.id.trim() ? 'Decision ID' : null,
    !form.title.trim() ? 'Title' : null,
    !form.deciders.trim() ? 'Deciders' : null,
  ].filter(Boolean) as string[];
  const isValid = missingFields.length === 0 && !duplicateId;

  function field(key: keyof typeof form, value: string) {
    setForm((f) => ({...f, [key]: value}));
  }

  return (
    <div
      className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950/20"
      onClick={(event) => {
        if (backdropPressStarted.current && event.target === event.currentTarget) {
          onClose();
        }
        backdropPressStarted.current = false;
      }}
      onMouseDown={(event) => {
        backdropPressStarted.current = event.target === event.currentTarget;
      }}
      onMouseUp={() => {
        window.setTimeout(() => {
          backdropPressStarted.current = false;
        }, 0);
      }}
    >
      <div className="flex min-h-full items-start justify-center px-6 py-6 lg:items-center">
        <div
          className="flex max-h-[calc(100vh-3rem)] w-full max-w-xl flex-col rounded-[2rem] bg-white shadow-[0_28px_80px_rgba(42,52,57,0.18)]"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={() => {
            backdropPressStarted.current = false;
          }}
        >
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Log New Decision</div>
              <h2 className="mt-1 font-headline text-2xl font-extrabold text-on-surface">Record a governance decision</h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Capture the core governance record here so the created decision already aligns with the detail view and downstream discussion.
              </p>
            </div>
            <button className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100" onClick={onClose} type="button">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Decision ID">
                <input
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-mono text-sm outline-none transition focus:border-primary/40"
                  value={form.id}
                  onChange={(e) => field('id', e.target.value)}
                />
                {duplicateId && <p className="mt-1 text-xs text-error">ID already exists.</p>}
              </FormField>
              <FormField label="Status">
                <select
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-primary/40"
                  value={form.status}
                  onChange={(e) => field('status', e.target.value)}
                >
              {(['Proposed', 'Approved', 'Implemented', 'Deferred', 'Rejected'] as DecisionStatus[]).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
              </FormField>
            </div>

            <FormField label="Title">
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-primary/40"
                placeholder="Short, descriptive title"
                value={form.title}
                onChange={(e) => field('title', e.target.value)}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Deciders">
                <input
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-primary/40"
                  placeholder="e.g. Risk Committee"
                  value={form.deciders}
                  onChange={(e) => field('deciders', e.target.value)}
                />
              </FormField>
              <FormField label="Date">
                <input
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-primary/40"
                  placeholder="e.g. Apr 11, 2026"
                  value={form.date}
                  onChange={(e) => field('date', e.target.value)}
                />
              </FormField>
            </div>

            <FormField label="Context and Problem Statement">
              <textarea
                className="min-h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm leading-relaxed outline-none transition focus:border-primary/40"
                placeholder="What is the context and what problem prompted this decision?"
                value={form.context}
                onChange={(e) => field('context', e.target.value)}
              />
            </FormField>

            <FormField label="Decision Drivers">
              <textarea
                className="min-h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm leading-relaxed outline-none transition focus:border-primary/40"
                placeholder="Enter one driver per line"
                value={form.decisionDrivers}
                onChange={(e) => field('decisionDrivers', e.target.value)}
              />
            </FormField>

            <FormField label="Considered Options">
              <textarea
                className="min-h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm leading-relaxed outline-none transition focus:border-primary/40"
                placeholder="Enter one option per line"
                value={form.consideredOptions}
                onChange={(e) => field('consideredOptions', e.target.value)}
              />
            </FormField>

            <FormField label="Decision Outcome (optional)">
              <textarea
                className="min-h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm leading-relaxed outline-none transition focus:border-primary/40"
                placeholder="Describe the decision taken and any immediate rationale"
                value={form.outcome}
                onChange={(e) => field('outcome', e.target.value)}
              />
            </FormField>
          </div>

          <div className="border-t border-slate-200 px-6 py-4">
            {missingFields.length > 0 && (
              <p className="mb-3 text-xs text-slate-500">Required: {missingFields.join(', ')}</p>
            )}
            <div className="flex justify-end gap-3">
              <button
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                onClick={onClose}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-gradient-to-br from-primary to-primary-dim px-5 py-2.5 text-sm font-bold text-on-primary shadow-md transition hover:opacity-90 disabled:opacity-40"
                disabled={!isValid}
                onClick={() => {
                  onCreate({
                    id: form.id,
                    title: form.title,
                    status: form.status,
                    deciders: form.deciders,
                    date: form.date,
                    context: form.context,
                    decisionDrivers: splitLines(form.decisionDrivers),
                    consideredOptions: splitLines(form.consideredOptions),
                    outcome: form.outcome,
                  });
                  resetDecisionDraft();
                }}
                type="button"
              >
                Log Decision
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RiskDrawer({
  open,
  risk,
  scoringModel,
  onClose,
  onDeleteRisk,
  onRenameRisk,
  onUpdateRisk,
  existingIds,
  ownerOptions,
  categoryOptions,
  linkedDecisionOptions,
  decisions,
}: {
  open: boolean;
  risk: Risk;
  scoringModel: RiskScoringModel;
  onClose: () => void;
  onDeleteRisk: (riskId: string) => void;
  onRenameRisk: (riskId: string, nextRiskId: string) => void;
  onUpdateRisk: (riskId: string, updates: Partial<Risk>, historyLabel: string) => void;
  existingIds: string[];
  ownerOptions: string[];
  categoryOptions: string[];
  linkedDecisionOptions: SelectOption[];
  decisions: Decision[];
}) {
  const [editingField, setEditingField] = useState<QuickEditFieldName | null>(null);
  const [savedFieldLabel, setSavedFieldLabel] = useState<string | null>(null);
  const [editingStatement, setEditingStatement] = useState(false);
  const [editingMitigation, setEditingMitigation] = useState(false);
  const [pendingScoreChange, setPendingScoreChange] = useState<{field: 'likelihood' | 'impact'; value: number} | null>(null);
  const [scoreChangeReason, setScoreChangeReason] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingRiskId, setEditingRiskId] = useState(false);
  const [riskIdDraft, setRiskIdDraft] = useState(risk.id);
  const [riskIdError, setRiskIdError] = useState('');
  const [draftNarrative, setDraftNarrative] = useState({
    trigger: risk.trigger,
    consequence: risk.consequence,
    mitigation: risk.mitigation,
    contingency: risk.contingency,
  });

  useEffect(() => {
    setEditingField(null);
    setEditingStatement(false);
    setEditingMitigation(false);
    setPendingScoreChange(null);
    setScoreChangeReason('');
    setConfirmDelete(false);
    setEditingRiskId(false);
    setRiskIdDraft(risk.id);
    setRiskIdError('');
    setDraftNarrative({
      trigger: risk.trigger,
      consequence: risk.consequence,
      mitigation: risk.mitigation,
      contingency: risk.contingency,
    });
  }, [risk.id, risk.trigger, risk.consequence, risk.mitigation, risk.contingency]);

  useEffect(() => {
    if (!savedFieldLabel) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setSavedFieldLabel(null);
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [savedFieldLabel]);

  if (!open) {
    return null;
  }

  function saveRiskId() {
    const nextId = sanitizeRiskId(riskIdDraft);
    const hasDuplicate = existingIds.some(
      (existingId) => existingId !== risk.id.toUpperCase() && existingId === nextId,
    );

    if (!nextId) {
      setRiskIdError('Risk ID is required.');
      return;
    }

    if (hasDuplicate) {
      setRiskIdError('Risk ID already exists.');
      return;
    }

    if (nextId === risk.id) {
      setEditingRiskId(false);
      setRiskIdError('');
      return;
    }

    onRenameRisk(risk.id, nextId);
    setEditingRiskId(false);
    setRiskIdError('');
    setSavedFieldLabel('Risk ID updated');
  }

  function saveQuickField(field: QuickEditFieldName, value: string) {
    setEditingField(null);

    const normalizedValue =
      field === 'likelihood' || field === 'impact' ? Number(value) : value;

    if (risk[field] === normalizedValue) {
      return;
    }

    if (field === 'likelihood' || field === 'impact') {
      setPendingScoreChange({field, value: normalizedValue as number});
      setScoreChangeReason('');
      return;
    }

    const fieldLabels: Record<QuickEditFieldName, string> = {
      owner: 'Owner updated',
      dueDate: 'Due date updated',
      status: 'Status updated',
      linkedDecision: 'Linked decision updated',
      category: 'Category updated',
      responseType: 'Response updated',
      likelihood: 'Likelihood updated',
      impact: 'Impact updated',
    };

    onUpdateRisk(risk.id, {[field]: normalizedValue} as Partial<Risk>, fieldLabels[field]);
    setSavedFieldLabel(fieldLabels[field]);
  }

  function confirmScoreChange() {
    if (!pendingScoreChange || !scoreChangeReason.trim()) {
      return;
    }

    const fieldLabel = pendingScoreChange.field === 'likelihood' ? 'Likelihood' : 'Impact';
    const definitions = pendingScoreChange.field === 'likelihood' ? scoringModel.likelihood : scoringModel.impact;
    const oldValue = risk[pendingScoreChange.field];
    const newValue = pendingScoreChange.value;
    const oldLabel = getScoreDefinition(definitions, oldValue)?.label ?? String(oldValue);
    const newLabel = getScoreDefinition(definitions, newValue)?.label ?? String(newValue);
    const changeDescription = `${fieldLabel} updated (${oldValue} ${oldLabel} → ${newValue} ${newLabel}): ${scoreChangeReason.trim()}`;

    onUpdateRisk(
      risk.id,
      {[pendingScoreChange.field]: pendingScoreChange.value} as Partial<Risk>,
      changeDescription,
    );
    setSavedFieldLabel(`${pendingScoreChange.field === 'likelihood' ? 'Likelihood' : 'Impact'} updated`);
    setPendingScoreChange(null);
    setScoreChangeReason('');
  }

  function resetNarrativeDraft() {
    setDraftNarrative({
      trigger: risk.trigger,
      consequence: risk.consequence,
      mitigation: risk.mitigation,
      contingency: risk.contingency,
    });
  }

  function saveStatementEdit() {
    onUpdateRisk(
      risk.id,
      {
        trigger: draftNarrative.trigger,
        consequence: draftNarrative.consequence,
        statement: buildRiskStatement(
          draftNarrative.trigger,
          draftNarrative.consequence,
        ),
      },
      'Risk statement updated',
    );
    setEditingStatement(false);
    setSavedFieldLabel('Risk statement saved');
  }

  function saveMitigationEdit() {
    onUpdateRisk(
      risk.id,
      {
        mitigation: draftNarrative.mitigation,
        contingency: draftNarrative.contingency,
      },
      'Mitigation plan updated',
    );
    setEditingMitigation(false);
    setSavedFieldLabel('Mitigation plan saved');
  }

  const mitigationRequired = risk.severity !== 'Low';
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/10" onClick={onClose}>
      <aside
        className="fixed inset-y-0 right-0 flex w-[28rem] flex-col border-l border-slate-200 bg-white shadow-[-20px_0_50px_rgba(42,52,57,0.12)]"
        onClick={(event) => event.stopPropagation()}
      >
      <div className="shrink-0 border-b border-slate-200 px-6 py-5">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
            {editingRiskId ? (
              <div className="mb-2">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Risk ID</div>
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    className="w-36 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm font-bold text-on-surface outline-none transition focus:border-primary/40"
                    onChange={(event) => {
                      setRiskIdDraft(sanitizeRiskId(event.target.value));
                      if (riskIdError) setRiskIdError('');
                    }}
                    value={riskIdDraft}
                  />
                  <button
                    className="rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-primary-dim"
                    onClick={saveRiskId}
                    type="button"
                  >
                    Save
                  </button>
                  <button
                    className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-200"
                    onClick={() => {
                      setEditingRiskId(false);
                      setRiskIdDraft(risk.id);
                      setRiskIdError('');
                    }}
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
                {riskIdError ? <div className="mt-1 text-xs text-error">{riskIdError}</div> : null}
              </div>
            ) : (
              <button
                className="group flex items-center gap-1 rounded-full px-0.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.22em] text-primary transition hover:text-primary-dim"
                onClick={() => setEditingRiskId(true)}
                type="button"
                title="Edit risk ID"
              >
                <span>{risk.id}</span>
                <span className="material-symbols-outlined text-[13px] opacity-0 transition group-hover:opacity-100">edit</span>
              </button>
            )}
            <h2 className="mt-1 font-headline text-2xl font-extrabold leading-tight text-on-surface">
              {risk.title}
            </h2>
          </div>
          <button
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            onClick={onClose}
            type="button"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <RiskStatusBadge status={risk.status} />
          <SeverityBadge severity={risk.severity} />
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600">
            Last updated {risk.lastUpdated}
          </span>
          {savedFieldLabel ? (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-800">
              {savedFieldLabel}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex-1 space-y-7 overflow-y-auto px-6 py-6">
        <div className="grid grid-cols-1 gap-3">
          <QuickEditOwner
            activeField={editingField}
            field="owner"
            label="Owner"
            options={ownerOptions}
            value={risk.owner}
            onBeginEdit={setEditingField}
            onSave={saveQuickField}
          />
          <QuickEditSelect
            activeField={editingField}
            field="status"
            label="Status"
            options={['Pending', 'Active', 'Monitoring', 'Rejected', 'Closed']}
            value={risk.status}
            onBeginEdit={setEditingField}
            onSave={saveQuickField}
          />
          <QuickEditSelect
            activeField={editingField}
            field="responseType"
            label="Response"
            options={['Mitigate', 'Accept', 'Transfer', 'Avoid']}
            value={risk.responseType}
            onBeginEdit={setEditingField}
            onSave={saveQuickField}
          />
          <label className="flex cursor-pointer items-center justify-between rounded-xl bg-slate-50 px-4 py-3 transition hover:bg-slate-100/90">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Visibility</div>
              <div className="mt-0.5 text-sm font-semibold text-on-surface">Internal only</div>
            </div>
            <input
              checked={risk.internalOnly ?? false}
              className="h-4 w-4 accent-primary"
              onChange={(event) => {
                onUpdateRisk(
                  risk.id,
                  {internalOnly: event.target.checked},
                  event.target.checked ? 'Marked as internal only' : 'Marked as external facing',
                );
              }}
              type="checkbox"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <DrawerAction destructive icon="delete" label="Delete" onClick={() => setConfirmDelete(true)} />
        </div>

        {pendingScoreChange ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="mb-2 text-sm font-bold text-amber-900">Rationale Required</div>
            <div className="mb-3 text-sm text-amber-900/80">
              Explain why the {pendingScoreChange.field} score is changing before saving this update.
            </div>
            <textarea
              className="min-h-24 w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm leading-relaxed text-on-surface outline-none transition focus:border-amber-300"
              onChange={(event) => setScoreChangeReason(event.target.value)}
              placeholder="Enter rationale for the score change"
              value={scoreChangeReason}
            />
            <div className="mt-3 flex gap-2">
              <button
                className="rounded-full bg-amber-600 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-amber-700"
                onClick={confirmScoreChange}
                type="button"
              >
                Save Rationale
              </button>
              <button
                className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-100"
                onClick={() => {
                  setPendingScoreChange(null);
                  setScoreChangeReason('');
                }}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {confirmDelete ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="mb-2 text-sm font-bold text-red-900">Delete Risk Record?</div>
            <div className="mb-3 text-sm leading-relaxed text-red-900/80">
              Deleting removes this risk from the register. Closing the risk is recommended instead so the team keeps the history and rationale for future reference.
            </div>
            <div className="flex gap-2">
              <button
                className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700 transition hover:bg-slate-200"
                onClick={() => {
                  onUpdateRisk(risk.id, {status: 'Closed'}, 'Risk closed instead of deleted');
                  setSavedFieldLabel('Risk closed');
                  setConfirmDelete(false);
                }}
                type="button"
              >
                Close Instead
              </button>
              <button
                className="rounded-full bg-red-600 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-red-700"
                onClick={() => {
                  onDeleteRisk(risk.id);
                  setConfirmDelete(false);
                }}
                type="button"
              >
                Confirm Delete
              </button>
              <button
                className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-100"
                onClick={() => setConfirmDelete(false)}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        <DrawerSection title="Assessment">
          <div className="rounded-2xl bg-surface-container-low p-4">
            <div className="grid grid-cols-2 gap-4">
              <QuickEditSelect
                activeField={editingField}
                field="likelihood"
                label="Likelihood"
                options={toScoreSelectOptions(scoringModel.likelihood)}
                value={String(risk.likelihood)}
                onBeginEdit={setEditingField}
                onSave={saveQuickField}
              />
              <QuickEditSelect
                activeField={editingField}
                field="impact"
                label="Impact"
                options={toScoreSelectOptions(scoringModel.impact)}
                value={String(risk.impact)}
                onBeginEdit={setEditingField}
                onSave={saveQuickField}
              />
              <DrawerMeta label="Residual rating" value={risk.residualRating} />
              <QuickEditSelect
                activeField={editingField}
                field="category"
                label="Category"
                options={categoryOptions}
                value={risk.category}
                onBeginEdit={setEditingField}
                onSave={saveQuickField}
              />
            </div>
          </div>
          <RiskStatementField
            consequenceLabel="Consequence"
            consequenceValue={draftNarrative.consequence}
            editable={editingStatement}
            generatedValue={buildRiskStatement(
              draftNarrative.trigger,
              draftNarrative.consequence,
            )}
            label="Risk Statement"
            onCancel={() => {
              setEditingStatement(false);
              resetNarrativeDraft();
            }}
            onConsequenceChange={(value) => setDraftNarrative((current) => ({...current, consequence: value}))}
            onEdit={() => setEditingStatement(true)}
            onSave={saveStatementEdit}
            onTriggerChange={(value) => setDraftNarrative((current) => ({...current, trigger: value}))}
            triggerLabel="Trigger / Condition"
            triggerValue={draftNarrative.trigger}
            value={risk.statement}
          />
        </DrawerSection>

        <DrawerSection title="Response">
          <MitigationPlanField
            editable={editingMitigation}
            isRequired={mitigationRequired}
            label="Mitigation Plan"
            onCancel={() => {
              setEditingMitigation(false);
              resetNarrativeDraft();
            }}
            onChange={(value) => setDraftNarrative((current) => ({...current, mitigation: value}))}
            onEdit={() => {
              if (mitigationRequired) {
                setEditingMitigation(true);
              }
            }}
            onSave={saveMitigationEdit}
            value={draftNarrative.mitigation}
            viewValue={risk.mitigation}
          />
          <div className="grid grid-cols-2 gap-4">
            <QuickEditDate
              activeField={editingField}
              field="dueDate"
              label="Due date"
              value={risk.dueDate}
              onBeginEdit={setEditingField}
              onSave={saveQuickField}
            />
          </div>
        </DrawerSection>

        <DrawerSection title="Context">
          <div className="grid grid-cols-2 gap-4">
            <QuickEditSelect
              activeField={editingField}
              field="linkedDecision"
              label="Linked decision"
              options={linkedDecisionOptions}
              value={risk.linkedDecision}
              onBeginEdit={setEditingField}
              onSave={saveQuickField}
            />
            <DrawerMeta label="Attachments" value={`${risk.attachments}`} />
            <DrawerMeta label="Comments" value={`${risk.comments}`} />
          </div>
        </DrawerSection>

        <DrawerSection title="History">
          <DrawerMeta label="Created by" value={risk.createdBy} />
          <div className="space-y-3">
            {risk.history.map((entry) => (
              <div key={`${entry.label}-${entry.meta}`} className="rounded-xl bg-slate-50 px-4 py-3">
                <div className="text-sm font-semibold text-on-surface">{entry.label}</div>
                <div className="mt-1 text-xs text-on-surface-variant">{entry.meta}</div>
              </div>
            ))}
          </div>
        </DrawerSection>
      </div>

      </aside>
    </div>
  );
}

function Heatmap({
  values,
  riskMap,
  selectedCell,
  viewMode,
  onSelectCell,
}: {
  values: number[][];
  riskMap: string[][][];
  selectedCell: HeatmapCell | null;
  viewMode: 'count' | 'ids';
  onSelectCell: (cell: HeatmapCell) => void;
}) {
  const colorGrid = [
    ['bg-emerald-600 text-white', 'bg-yellow-300 text-slate-900', 'bg-red-600 text-white', 'bg-red-600 text-white', 'bg-red-600 text-white'],
    ['bg-emerald-600 text-white', 'bg-yellow-300 text-slate-900', 'bg-yellow-300 text-slate-900', 'bg-red-600 text-white', 'bg-red-600 text-white'],
    ['bg-emerald-600 text-white', 'bg-emerald-600 text-white', 'bg-yellow-300 text-slate-900', 'bg-yellow-300 text-slate-900', 'bg-red-600 text-white'],
    ['bg-emerald-600 text-white', 'bg-emerald-600 text-white', 'bg-emerald-600 text-white', 'bg-yellow-300 text-slate-900', 'bg-yellow-300 text-slate-900'],
    ['bg-emerald-600 text-white', 'bg-emerald-600 text-white', 'bg-emerald-600 text-white', 'bg-emerald-600 text-white', 'bg-yellow-300 text-slate-900'],
  ];
  const emptyCellGrid = [
    ['bg-emerald-600/20 text-emerald-800/55', 'bg-yellow-300/30 text-amber-900/55', 'bg-red-600/22 text-red-900/55', 'bg-red-600/22 text-red-900/55', 'bg-red-600/22 text-red-900/55'],
    ['bg-emerald-600/20 text-emerald-800/55', 'bg-yellow-300/30 text-amber-900/55', 'bg-yellow-300/30 text-amber-900/55', 'bg-red-600/22 text-red-900/55', 'bg-red-600/22 text-red-900/55'],
    ['bg-emerald-600/20 text-emerald-800/55', 'bg-emerald-600/20 text-emerald-800/55', 'bg-yellow-300/30 text-amber-900/55', 'bg-yellow-300/30 text-amber-900/55', 'bg-red-600/22 text-red-900/55'],
    ['bg-emerald-600/20 text-emerald-800/55', 'bg-emerald-600/20 text-emerald-800/55', 'bg-emerald-600/20 text-emerald-800/55', 'bg-yellow-300/30 text-amber-900/55', 'bg-yellow-300/30 text-amber-900/55'],
    ['bg-emerald-600/20 text-emerald-800/55', 'bg-emerald-600/20 text-emerald-800/55', 'bg-emerald-600/20 text-emerald-800/55', 'bg-emerald-600/20 text-emerald-800/55', 'bg-yellow-300/30 text-amber-900/55'],
  ];
  return (
    <div className="flex gap-4">
      <div className="flex items-center py-1">
        <div className="text-center text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 [writing-mode:vertical-lr] rotate-180">
          Likelihood (1-5)
        </div>
      </div>
      <div className="flex-1">
        <div className="grid grid-cols-[24px_repeat(5,minmax(0,1fr))] gap-2">
          {['5', '4', '3', '2', '1'].map((label, rowIndex) => (
            <div key={label} className="contents">
              <div className="flex items-center justify-center text-xs font-bold text-slate-400">{label}</div>
              {values[rowIndex].map((value, cellIndex) => {
                const likelihood = 5 - rowIndex;
                const impact = cellIndex + 1;
                const ids = riskMap[rowIndex][cellIndex];
                const isHighestCorner = rowIndex === 0 && cellIndex === 4;
                const isSelected =
                  selectedCell?.likelihood === likelihood && selectedCell?.impact === impact;
                return (
                  <button
                    key={`${label}-${cellIndex}`}
                    className={`flex aspect-square flex-col items-center justify-center overflow-hidden rounded-lg p-1 text-center transition ${value > 0 ? colorGrid[rowIndex][cellIndex] : emptyCellGrid[rowIndex][cellIndex]} ${isHighestCorner ? 'ring-4 ring-red-600/20' : ''} ${isSelected ? 'ring-4 ring-primary/30' : ''} ${value > 0 ? 'cursor-pointer hover:scale-[1.02] shadow-sm' : 'cursor-default'}`}
                    onClick={() => {
                      if (value > 0) {
                        onSelectCell({likelihood, impact});
                      }
                    }}
                    title={ids.length ? ids.join(', ') : 'No risks'}
                    type="button"
                  >
                    {viewMode === 'ids' && ids.length ? (
                      <div className="flex w-full flex-col items-center gap-0">
                        {ids.slice(0, 3).map((id) => (
                          <span key={id} className="w-full truncate text-center text-[9px] font-bold leading-[1.3]">
                            {id}
                          </span>
                        ))}
                        {ids.length > 3 && (
                          <span className="text-[8px] font-bold leading-[1.3] opacity-70">
                            +{ids.length - 3}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm font-bold">{value}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-[24px_repeat(5,minmax(0,1fr))] gap-2 text-center text-xs font-bold text-slate-400">
          <div />
          <div>1</div>
          <div>2</div>
          <div>3</div>
          <div>4</div>
          <div className="text-error">5</div>
        </div>
        <div className="mt-2 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Impact (1-5)
        </div>
      </div>
    </div>
  );
}

function FilterChip({label, value}: {label: string; value: string}) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-surface-container-low px-3 py-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-on-surface">{value}</span>
    </div>
  );
}

function SummaryMetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-4">
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className={`mt-2 font-headline text-3xl font-extrabold ${tone}`}>{value}</div>
    </div>
  );
}

function SeverityBreakdownChart({
  bars,
}: {
  bars: {label: string; value: number; color: string; textColor: string}[];
}) {
  const maxValue = Math.max(...bars.map((bar) => bar.value), 1);

  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-4">
      <div className="flex h-44 items-end justify-between gap-3">
        {bars.map((bar) => (
          <div key={bar.label} className="flex min-w-0 flex-1 flex-col items-center gap-3">
            <div className={`text-sm font-bold ${bar.textColor}`}>{bar.value}</div>
            <div className="flex h-28 w-full items-end justify-center rounded-2xl bg-white px-3 py-3 ring-1 ring-slate-200/70">
              <div
                className={`w-full rounded-xl ${bar.color} transition-all`}
                style={{height: `${Math.max((bar.value / maxValue) * 100, bar.value > 0 ? 16 : 6)}%`}}
              />
            </div>
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{bar.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoringDefinitionEditor({
  title,
  definitions,
  onChange,
}: {
  title: string;
  definitions: ScoreDefinition[];
  onChange: (value: number, field: 'label' | 'description', nextValue: string) => void;
}) {
  return (
    <section className="rounded-3xl bg-slate-50 p-5">
      <div className="mb-4 text-sm font-bold text-on-surface">{title}</div>
      <div className="space-y-4">
        {definitions.map((definition) => (
          <div key={`${title}-${definition.value}`} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {definition.value}
              </div>
              <div className="text-sm font-semibold text-on-surface">Score {definition.value}</div>
            </div>
            <div className="space-y-3">
              <FormField label="Short label">
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-on-surface outline-none transition focus:border-primary/25 focus:bg-white focus:shadow-[0_0_0_4px_rgba(79,94,126,0.08)]"
                  onChange={(event) => onChange(definition.value, 'label', event.target.value)}
                  value={definition.label}
                />
              </FormField>
              <FormField label="Description">
                <textarea
                  className="min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-on-surface outline-none transition focus:border-primary/25 focus:bg-white focus:shadow-[0_0_0_4px_rgba(79,94,126,0.08)]"
                  onChange={(event) => onChange(definition.value, 'description', event.target.value)}
                  value={definition.description}
                />
              </FormField>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FormField({label, action, children}: {label: string; action?: ReactNode; children: ReactNode}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</div>
        {action}
      </div>
      {children}
    </label>
  );
}

function RiskStatusBadge({status}: {status: RiskStatus}) {
  const classes =
    status === 'Pending'
      ? 'bg-amber-100 text-amber-800'
      : status === 'Active'
      ? 'bg-emerald-100 text-emerald-800'
      : status === 'Monitoring'
        ? 'bg-sky-100 text-sky-800'
        : status === 'Rejected'
          ? 'bg-rose-100 text-rose-800'
        : 'bg-slate-200 text-slate-700';

  return <Badge className={classes}>{status}</Badge>;
}

function SeverityBadge({severity}: {severity: RiskSeverity}) {
  const classes =
    severity === 'High'
      ? 'bg-error-container text-on-error-container'
      : severity === 'Medium'
        ? 'bg-secondary-container text-on-secondary-container'
        : 'bg-emerald-100 text-emerald-800';

  return <Badge className={classes}>{severity}</Badge>;
}

function DecisionStatusBadge({status}: {status: DecisionStatus}) {
  const classes =
    status === 'Rejected'
      ? 'bg-rose-100 text-rose-800'
      : status === 'Approved'
      ? 'bg-primary-container text-on-primary-container'
      : status === 'Implemented'
        ? 'bg-secondary-container text-on-secondary-container'
        : status === 'Deferred'
          ? 'bg-amber-100 text-amber-800'
          : 'bg-slate-100 text-slate-700';

  return <Badge className={classes}>{status}</Badge>;
}

function Badge({children, className}: {children: ReactNode; className: string}) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${className}`}>
      {children}
    </span>
  );
}

function DrawerSection({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="h-[2px] w-4 bg-primary" />
          <h3 className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function DrawerMeta({label, value}: {label: string; value: string}) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-on-surface">{value}</div>
    </div>
  );
}

function DrawerText({label, value}: {label: string; value: string}) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <p className="text-sm leading-relaxed text-on-surface-variant">{value}</p>
    </div>
  );
}

function RiskStatementField({
  label,
  value,
  editable,
  triggerLabel,
  triggerValue,
  consequenceLabel,
  consequenceValue,
  generatedValue,
  onEdit,
  onTriggerChange,
  onConsequenceChange,
  onSave,
  onCancel,
}: {
  label: string;
  value: string;
  editable: boolean;
  triggerLabel: string;
  triggerValue: string;
  consequenceLabel: string;
  consequenceValue: string;
  generatedValue: string;
  onEdit: () => void;
  onTriggerChange: (value: string) => void;
  onConsequenceChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className={`rounded-2xl transition ${editable ? '' : 'cursor-pointer hover:bg-slate-50'}`}
      onClick={() => {
        if (!editable) {
          onEdit();
        }
      }}
      role={!editable ? 'button' : undefined}
      tabIndex={!editable ? 0 : undefined}
      onKeyDown={(event) => {
        if (!editable && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onEdit();
        }
      }}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</div>
        {!editable ? (
          <span className="material-symbols-outlined text-[14px] text-slate-400">edit</span>
        ) : null}
      </div>
      {editable ? (
        <div className="space-y-4">
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{triggerLabel}</div>
            <textarea
              className="min-h-20 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-on-surface outline-none transition focus:border-primary/25 focus:bg-white focus:shadow-[0_0_0_4px_rgba(79,94,126,0.08)]"
              onChange={(event) => onTriggerChange(event.target.value)}
              value={triggerValue}
            />
          </div>
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{consequenceLabel}</div>
            <textarea
              className="min-h-20 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-on-surface outline-none transition focus:border-primary/25 focus:bg-white focus:shadow-[0_0_0_4px_rgba(79,94,126,0.08)]"
              onChange={(event) => onConsequenceChange(event.target.value)}
              value={consequenceValue}
            />
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Generated Risk Statement
            </div>
            <p className="text-sm leading-relaxed text-on-surface">{renderStatementWithBoldKeywords(generatedValue)}</p>
          </div>
          <div className="flex gap-2">
            <button
              className="rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-primary-dim"
              onClick={onSave}
              type="button"
            >
              Save
            </button>
            <button
              className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-200"
              onClick={onCancel}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-on-surface-variant">{renderStatementWithBoldKeywords(value)}</p>
      )}
    </div>
  );
}

function MitigationPlanField({
  label,
  value,
  viewValue,
  editable,
  isRequired,
  onEdit,
  onChange,
  onSave,
  onCancel,
}: {
  label: string;
  value: string;
  viewValue: string;
  editable: boolean;
  isRequired: boolean;
  onEdit: () => void;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  if (!isRequired) {
    return (
      <div className="rounded-2xl bg-slate-50 px-4 py-4">
        <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</div>
        <p className="text-sm leading-relaxed text-on-surface-variant">
          Mitigation plans are not required for low risks. Contingency planning is not applicable at this risk level.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl transition ${editable ? '' : 'cursor-pointer hover:bg-slate-50'}`}
      onClick={() => {
        if (!editable) {
          onEdit();
        }
      }}
      role={!editable ? 'button' : undefined}
      tabIndex={!editable ? 0 : undefined}
      onKeyDown={(event) => {
        if (!editable && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onEdit();
        }
      }}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</div>
        {!editable ? (
          <span className="material-symbols-outlined text-[14px] text-slate-400">edit</span>
        ) : null}
      </div>
      {editable ? (
        <div className="space-y-3">
          <textarea
            className="min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-on-surface outline-none transition focus:border-primary/25 focus:bg-white focus:shadow-[0_0_0_4px_rgba(79,94,126,0.08)]"
            onChange={(event) => onChange(event.target.value)}
            value={value}
          />
          <div className="flex gap-2">
            <button
              className="rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-primary-dim"
              onClick={onSave}
              type="button"
            >
              Save
            </button>
            <button
              className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-200"
              onClick={onCancel}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className={`text-sm leading-relaxed ${viewValue.trim() ? 'text-on-surface-variant' : 'font-medium text-error'}`}>
          {viewValue.trim() ? viewValue : 'Mitigation plan not yet defined.'}
        </p>
      )}
    </div>
  );
}

function QuickEditSelect({
  field,
  label,
  value,
  options,
  labelAction,
  activeField,
  onBeginEdit,
  onSave,
}: {
  field: QuickEditFieldName;
  label: string;
  value: string;
  options: string[] | SelectOption[];
  labelAction?: ReactNode;
  activeField: QuickEditFieldName | null;
  onBeginEdit: (field: QuickEditFieldName | null) => void;
  onSave: (field: QuickEditFieldName, value: string) => void;
}) {
  const editing = activeField === field;
  const normalizedOptions = normalizeOptions(options);
  const selectedOption = normalizedOptions.find((option) => option.value === value);

  return (
    <div
      className="group rounded-xl bg-slate-50 px-4 py-3 transition hover:bg-slate-100/90"
      onClick={() => {
        if (!editing) {
          onBeginEdit(field);
        }
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && !editing) {
          event.preventDefault();
          onBeginEdit(field);
        }
      }}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</div>
        <div className="flex items-center gap-2">
          {labelAction}
          <span className="material-symbols-outlined text-[14px] text-slate-400 opacity-0 transition group-hover:opacity-100">
            edit
          </span>
        </div>
      </div>
      {editing ? (
        <div>
          <select
            autoFocus
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm font-semibold text-on-surface outline-none focus:border-primary/25"
            onBlur={() => onBeginEdit(null)}
            onChange={(event) => onSave(field, event.target.value)}
            value={value}
          >
            {normalizedOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {selectedOption?.description ? (
            <div className="mt-2 text-xs leading-relaxed text-on-surface-variant">{selectedOption.description}</div>
          ) : null}
        </div>
      ) : (
        <div>
          <div className="text-sm font-semibold text-on-surface">
            {field.includes('Date') ? formatDisplayDate(value) : selectedOption?.label ?? value}
          </div>
          {selectedOption?.description ? (
            <div className="mt-1 text-xs leading-relaxed text-on-surface-variant">{selectedOption.description}</div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function QuickEditOwner({
  field,
  label,
  value,
  options,
  activeField,
  onBeginEdit,
  onSave,
}: {
  field: QuickEditFieldName;
  label: string;
  value: string;
  options: string[];
  activeField: QuickEditFieldName | null;
  onBeginEdit: (field: QuickEditFieldName | null) => void;
  onSave: (field: QuickEditFieldName, value: string) => void;
}) {
  const editing = activeField === field;
  const [customValue, setCustomValue] = useState(value);

  useEffect(() => {
    setCustomValue(value);
  }, [value]);

  return (
    <div
      className="group rounded-xl bg-slate-50 px-4 py-3 transition hover:bg-slate-100/90"
      onClick={() => {
        if (!editing) {
          onBeginEdit(field);
        }
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && !editing) {
          event.preventDefault();
          onBeginEdit(field);
        }
      }}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</div>
        <span className="material-symbols-outlined text-[14px] text-slate-400 opacity-0 transition group-hover:opacity-100">
          edit
        </span>
      </div>
      {editing ? (
        <div className="space-y-2">
          <select
            autoFocus
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm font-semibold text-on-surface outline-none focus:border-primary/25"
            onChange={(event) => {
              const nextValue = event.target.value;
              if (nextValue === '__custom__') {
                setCustomValue('');
                return;
              }
              onSave(field, nextValue);
            }}
            value={options.includes(value) ? value : '__custom__'}
          >
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
            <option value="__custom__">Type new owner...</option>
          </select>
          <input
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-on-surface outline-none focus:border-primary/25"
            onBlur={() => {
              if (!customValue.trim()) {
                onBeginEdit(null);
                setCustomValue(value);
                return;
              }
              onSave(field, customValue.trim());
            }}
            onChange={(event) => setCustomValue(event.target.value)}
            placeholder="Enter new owner name"
            value={customValue}
          />
        </div>
      ) : (
        <div className="text-sm font-semibold text-on-surface">{value}</div>
      )}
    </div>
  );
}

function QuickEditDate({
  field,
  label,
  value,
  activeField,
  onBeginEdit,
  onSave,
}: {
  field: QuickEditFieldName;
  label: string;
  value: string;
  activeField: QuickEditFieldName | null;
  onBeginEdit: (field: QuickEditFieldName | null) => void;
  onSave: (field: QuickEditFieldName, value: string) => void;
}) {
  const editing = activeField === field;

  return (
    <div
      className="group rounded-xl bg-slate-50 px-4 py-3 transition hover:bg-slate-100/90"
      onClick={() => {
        if (!editing) {
          onBeginEdit(field);
        }
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && !editing) {
          event.preventDefault();
          onBeginEdit(field);
        }
      }}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</div>
        <span className="material-symbols-outlined text-[14px] text-slate-400 opacity-0 transition group-hover:opacity-100">
          edit_calendar
        </span>
      </div>
      {editing ? (
        <input
          autoFocus
          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm font-semibold text-on-surface outline-none focus:border-primary/25"
          onBlur={() => onBeginEdit(null)}
          onChange={(event) => onSave(field, event.target.value)}
          type="date"
          value={value}
        />
      ) : (
        <div className="text-sm font-semibold text-on-surface">{formatDisplayDate(value)}</div>
      )}
    </div>
  );
}

function DrawerAction({
  icon,
  label,
  primary = false,
  destructive = false,
  onClick,
}: {
  icon: string;
  label: string;
  primary?: boolean;
  destructive?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
        primary
          ? 'bg-slate-900 text-white hover:bg-slate-800'
          : destructive
            ? 'bg-red-50 text-red-700 hover:bg-red-100'
          : 'bg-slate-100 text-on-surface hover:bg-slate-200'
      }`}
      onClick={onClick}
      type="button"
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
      {label}
    </button>
  );
}
