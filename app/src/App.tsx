import {type ChangeEvent, type MouseEvent as ReactMouseEvent, type ReactNode, type RefObject, useEffect, useRef, useState} from 'react';

type View = 'risk' | 'decision' | 'analytics' | 'library' | 'snapshot' | 'settings';

type RiskStatus = 'Pending' | 'Active' | 'Monitoring' | 'Rejected' | 'Closed' | 'Converted to Issue';
type RiskSeverity = 'High' | 'Medium' | 'Low';
type SharedRiskRole = 'source' | 'linked';
type SharedRiskReviewStatus = 'current' | 'review_required' | 'reviewed_no_change' | 'updated_after_review';
type SharedRiskSubscriptionState = 'watching' | 'linked' | 'review_required' | 'not_applicable';
type HistoryEntry = {label: string; meta: string; at?: string};
type RiskComment = {id: string; body: string; author: string; createdAt: string; updatedAt: string};
type MitigationAction = {
  id: string;
  title: string;
  owner: string;
  dueDate: string;
  status: 'Not Started' | 'In Progress' | 'Done' | 'Blocked';
};

type Risk = {
  id: string;
  originKey: string;
  sharedRiskId?: string;
  sharedRiskRole?: SharedRiskRole;
  sharedParentVersionSeen?: number | null;
  sharedReviewStatus?: SharedRiskReviewStatus;
  sharedOverrideRationale?: string;
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
  residualLikelihood: number;
  residualImpact: number;
  residualRiskRating: string;
  responseType: 'Mitigate' | 'Accept' | 'Transfer' | 'Avoid';
  project: string;
  lastUpdated: string;
  dueDate: string;
  mitigation: string;
  mitigationActions: MitigationAction[];
  contingency: string;
  linkedDecision: string;
  attachments: number;
  comments: RiskComment[];
  legacyCommentCount: number;
  createdBy: string;
  internalOnly: boolean;
  history: HistoryEntry[];
};

type DecisionStatus = 'Approved' | 'Implemented' | 'Proposed' | 'Deferred' | 'Rejected';

type Decision = {
  id: string;
  sharedDecisionId?: string;
  title: string;
  summary: string;
  status: DecisionStatus;
  deciders: string;
  deciderRoles: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  statusUpdatedAt: string;
  approvedAt: string;
  statusLocked: boolean;
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
  scheduleMinMonths?: number | null;
  scheduleMaxMonths?: number | null;
  costMinAmount?: number | null;
  costMaxAmount?: number | null;
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

type SharedRisk = {
  id: string;
  referenceCode: string;
  title: string;
  statement: string;
  trigger: string;
  consequence: string;
  status: RiskStatus;
  owner: string;
  upstreamLikelihood: number;
  upstreamImpact: number;
  responseSummary: string;
  sourceImpactScore: number;
  sourceOriginRiskKey: string;
  sharedImpactProfile?: {
    basis: 'schedule' | 'cost';
    min: number;
    max: number | null;
    sourceScore: number;
  };
  versionNumber: number;
  createdAt: string;
  updatedAt: string;
  sharedAt: string;
  sourceProjectId: string;
  isArchived: boolean;
  lastChangeSummary: string[];
  history: HistoryEntry[];
};

type SharedRiskSubscription = {
  id: string;
  sharedRiskId: string;
  projectId: string;
  state: SharedRiskSubscriptionState;
  createdAt: string;
  updatedAt: string;
  lastSeenSharedRiskVersion: number;
  lastReviewedSharedRiskVersion: number | null;
  lastReviewedAt: string;
  reviewedByName: string;
  reviewComment: string;
  linkedLocalRiskId: string | null;
};

type SharedDecision = {
  id: string;
  title: string;
  context: string;
  decisionDrivers: string[];
  consideredOptions: string[];
  outcome: string;
  goodConsequences: string[];
  badConsequences: string[];
  moreInfo: string;
  updatedAt: string;
  sourceProjectId: string;
};

type Project = {
  id: string;
  projectKey: string;
  name: string;
  description: string;
  createdAt: string;
  risks: Risk[];
  decisions: Decision[];
  scoringModel: RiskScoringModel;
};

type RegistryMetadata = {
  documentId: string;
  name: string;
  revision: number;
  contentHash: string;
  parentRevision: number | null;
  parentContentHash: string | null;
  lastModifiedAt: string;
  lastModifiedBy: string;
};

type ReadOnlyExportContentMode = 'both' | 'risks' | 'decisions';

type AppSnapshot = {
  version: string;
  exportedAt: string;
  registry?: RegistryMetadata;
  activeProjectId: string;
  projects: Project[];
  readOnlyExport?: {
    contentMode: ReadOnlyExportContentMode;
  };
  sharedLibrary?: {
    risks: SharedRisk[];
    decisions: SharedDecision[];
    riskSubscriptions?: SharedRiskSubscription[];
  };
};

type RegistrySessionStatus =
  | 'no_registry_loaded'
  | 'master_loaded_clean'
  | 'master_loaded_dirty'
  | 'publish_in_progress'
  | 'recovery_draft_available';

type RegistrySession = {
  sourceLabel: string;
  sourceFileName: string;
  registryName: string;
  baseDocumentId: string | null;
  baseRevision: number | null;
  baseContentHash: string | null;
  loadedAt: string | null;
  lastPublishedAt: string | null;
  lastPublishedRevision: number | null;
  status: RegistrySessionStatus;
  lastError: string;
};

type RecoveryDraft = {
  snapshot: AppSnapshot;
  session: RegistrySession;
  savedAt: string;
};

const RISK_SCORING_STORAGE_KEY = 'risk-decision-register.scoring-model.v1';
const PROJECTS_STORAGE_KEY = 'risk-decision-register.projects.v1';
const ACTIVE_PROJECT_ID_KEY = 'risk-decision-register.active-project.v1';
const SHARED_RISKS_STORAGE_KEY = 'risk-decision-register.shared-risks.v1';
const SHARED_RISK_SUBSCRIPTIONS_STORAGE_KEY = 'risk-decision-register.shared-risk-subscriptions.v1';
const SHARED_DECISIONS_STORAGE_KEY = 'risk-decision-register.shared-decisions.v1';
const REGISTRY_DRAFT_STORAGE_KEY = 'risk-decision-register.registry-draft.v2';
const EDITOR_NAME_STORAGE_KEY = 'risk-decision-register.editor-name.v1';
const APP_SNAPSHOT_VERSION = '2';

function createRegistryDocumentId() {
  return `registry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeFileStem(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'governance-register'
  );
}

function hashStringFNV1a(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function stableSerialize(value: unknown): string {
  if (value === null) {
    return 'null';
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerialize(entry)).join(',')}]`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
      .join(',')}}`;
  }

  return JSON.stringify(String(value));
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildReadOnlyBoardHtml(snapshot: AppSnapshot) {
  const boardName = snapshot.registry?.name || 'Governance Register';
  const exportedAt = snapshot.exportedAt;
  const contentMode = snapshot.readOnlyExport?.contentMode ?? 'both';
  const safeSnapshotJson = JSON.stringify(snapshot)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/<\/script/gi, '<\\/script');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(boardName)} - Read Only</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #eef3f6;
        --surface: #ffffff;
        --surface-alt: #f8fafc;
        --border: #dbe4ea;
        --text: #243342;
        --text-muted: #5f6f81;
        --primary: #4f5e7e;
        --primary-soft: rgba(79, 94, 126, 0.12);
        --danger-soft: #ffe2e2;
        --danger-text: #a93232;
        --warning-soft: #fff1c2;
        --warning-text: #8a5d00;
        --success-soft: #dff3e7;
        --success-text: #16653a;
        --shadow: 0 20px 60px rgba(42, 52, 57, 0.08);
        --radius-xl: 28px;
        --radius-lg: 20px;
        --radius-md: 14px;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Inter, "Segoe UI", sans-serif;
        background: linear-gradient(180deg, #f6f9fb 0%, var(--bg) 100%);
        color: var(--text);
      }
      .app-shell {
        min-height: 100vh;
        padding: 28px;
      }
      .board {
        max-width: 1500px;
        margin: 0 auto;
        display: grid;
        gap: 20px;
      }
      .hero {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-xl);
        box-shadow: var(--shadow);
        padding: 28px;
      }
      .eyebrow {
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        color: var(--primary);
      }
      .hero h1 {
        margin: 10px 0 8px;
        font-size: clamp(30px, 4vw, 42px);
        line-height: 1.05;
      }
      .hero p {
        margin: 0;
        max-width: 860px;
        color: var(--text-muted);
        line-height: 1.6;
      }
      .meta-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
        gap: 14px;
        margin-top: 22px;
      }
      .meta-card {
        background: var(--surface-alt);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        padding: 16px 18px;
      }
      .meta-label {
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--text-muted);
      }
      .meta-value {
        margin-top: 8px;
        font-size: 15px;
        font-weight: 700;
      }
      .toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: center;
        justify-content: space-between;
      }
      .pill-row {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .pill,
      .tab {
        border: 0;
        border-radius: 999px;
        background: var(--surface);
        color: var(--text);
        padding: 11px 18px;
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        cursor: pointer;
        box-shadow: 0 4px 14px rgba(42, 52, 57, 0.06);
      }
      .pill.active,
      .tab.active {
        background: var(--primary);
        color: #fff;
      }
      .content-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.5fr) minmax(320px, 0.95fr);
        gap: 20px;
      }
      .panel {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-xl);
        box-shadow: var(--shadow);
        padding: 22px;
        min-height: 520px;
      }
      .panel-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 16px;
      }
      .panel-title h2 {
        margin: 0;
        font-size: 24px;
      }
      .panel-title p {
        margin: 6px 0 0;
        font-size: 14px;
        color: var(--text-muted);
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      thead th {
        text-align: left;
        padding: 12px 10px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--text-muted);
        border-bottom: 1px solid var(--border);
      }
      tbody td {
        padding: 14px 10px;
        border-bottom: 1px solid #edf2f5;
        vertical-align: top;
        font-size: 14px;
      }
      tbody tr {
        cursor: pointer;
        transition: background 150ms ease;
      }
      tbody tr:hover {
        background: #f8fbfd;
      }
      tbody tr.active {
        background: #eef4fb;
      }
      .muted {
        color: var(--text-muted);
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 10px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .chip.low, .chip.approved, .chip.implemented {
        background: var(--success-soft);
        color: var(--success-text);
      }
      .chip.medium, .chip.proposed, .chip.deferred, .chip.pending, .chip.monitoring {
        background: var(--warning-soft);
        color: var(--warning-text);
      }
      .chip.high, .chip.rejected, .chip.closed {
        background: var(--danger-soft);
        color: var(--danger-text);
      }
      .detail-stack {
        display: grid;
        gap: 14px;
      }
      .detail-header {
        padding: 18px;
        background: var(--surface-alt);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
      }
      .detail-header h3 {
        margin: 8px 0 0;
        font-size: 24px;
        line-height: 1.15;
      }
      .detail-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      .detail-card {
        padding: 14px 16px;
        background: var(--surface-alt);
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
      }
      .detail-card.wide {
        grid-column: 1 / -1;
      }
      .detail-card .label {
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--text-muted);
      }
      .detail-card .value {
        margin-top: 8px;
        font-size: 14px;
        line-height: 1.6;
        white-space: pre-wrap;
      }
      .empty {
        display: grid;
        place-items: center;
        min-height: 320px;
        text-align: center;
        color: var(--text-muted);
        padding: 32px;
      }
      .footer-note {
        font-size: 12px;
        color: var(--text-muted);
      }
      @media (max-width: 1100px) {
        .content-grid {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 720px) {
        .app-shell {
          padding: 16px;
        }
        .hero,
        .panel {
          padding: 18px;
        }
        .detail-grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <div class="app-shell">
      <div class="board">
        <section class="hero">
          <div class="eyebrow">Read-Only Governance Register</div>
          <h1>${escapeHtml(boardName)}</h1>
          <p>This exported board is view-only. It is intended for review, walkthroughs, and sharing with teammates who should be able to inspect current risks and decisions without editing the source register.</p>
          <div class="meta-grid">
            <div class="meta-card">
              <div class="meta-label">Exported</div>
              <div class="meta-value" id="meta-exportedAt"></div>
            </div>
            <div class="meta-card">
              <div class="meta-label">Board Revision</div>
              <div class="meta-value" id="meta-revision"></div>
            </div>
            <div class="meta-card">
              <div class="meta-label">Projects</div>
              <div class="meta-value" id="meta-projectCount"></div>
            </div>
          </div>
        </section>

        <section class="toolbar">
          <div class="pill-row" id="projectTabs"></div>
          <div class="pill-row" id="recordTabs">
            <button class="tab active" data-record-type="risks" type="button">Risks</button>
            <button class="tab" data-record-type="decisions" type="button">Decisions</button>
          </div>
        </section>

        <section class="content-grid">
          <div class="panel">
            <div class="panel-title">
              <div>
                <h2 id="tableTitle">Current Risks</h2>
                <p id="tableSubtitle"></p>
              </div>
              <div class="footer-note" id="tableCount"></div>
            </div>
            <div id="tableHost"></div>
          </div>
          <div class="panel">
            <div class="panel-title">
              <div>
                <h2 id="detailTitle">Details</h2>
                <p id="detailSubtitle">Select a record to inspect the current read-only details.</p>
              </div>
            </div>
            <div id="detailHost"></div>
          </div>
        </section>
      </div>
    </div>

    <script id="board-data" type="application/json">${safeSnapshotJson}</script>
    <script>
      const snapshot = JSON.parse(document.getElementById('board-data').textContent);
      const contentMode = snapshot.readOnlyExport?.contentMode || '${contentMode}';
      const availableRecordTypes = contentMode === 'both' ? ['risks', 'decisions'] : [contentMode];
      const state = {
        projectId: snapshot.activeProjectId || snapshot.projects[0]?.id || '',
        recordType: availableRecordTypes[0] || 'risks',
        selectedId: '',
      };

      const els = {
        projectTabs: document.getElementById('projectTabs'),
        recordTabs: document.getElementById('recordTabs'),
        tableHost: document.getElementById('tableHost'),
        detailHost: document.getElementById('detailHost'),
        tableTitle: document.getElementById('tableTitle'),
        tableSubtitle: document.getElementById('tableSubtitle'),
        tableCount: document.getElementById('tableCount'),
        detailTitle: document.getElementById('detailTitle'),
        detailSubtitle: document.getElementById('detailSubtitle'),
        metaExportedAt: document.getElementById('meta-exportedAt'),
        metaRevision: document.getElementById('meta-revision'),
        metaProjectCount: document.getElementById('meta-projectCount'),
      };

      function formatDateTime(value) {
        if (!value) return 'Not available';
        if (/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) {
          const [year, month, day] = value.split('-').map(Number);
          const dateOnly = new Date(year, month - 1, day);
          if (!Number.isNaN(dateOnly.getTime())) {
            return new Intl.DateTimeFormat(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            }).format(dateOnly);
          }
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return new Intl.DateTimeFormat(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }).format(date);
      }

      function escapeHtml(value) {
        return String(value ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      function statusChipClass(value) {
        const normalized = String(value || '').toLowerCase();
        if (['high', 'rejected', 'closed'].includes(normalized)) return 'chip high';
        if (['medium', 'proposed', 'deferred', 'pending', 'monitoring'].includes(normalized)) return 'chip medium';
        return 'chip low';
      }

      function formatScopedId(project, recordId) {
        const key = String(project?.projectKey || project?.name || 'PRJ')
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, '');
        return (key || 'PRJ') + '-' + recordId;
      }

      function getDecisionActivityLabel(decision) {
        const value = decision.approvedAt || decision.statusUpdatedAt || decision.updatedAt || decision.createdAt || decision.date;
        if (decision.approvedAt) return 'Approved ' + formatDateTime(value);
        if (decision.statusUpdatedAt) return 'Status updated ' + formatDateTime(value);
        if (decision.updatedAt) return 'Updated ' + formatDateTime(value);
        if (decision.createdAt) return 'Created ' + formatDateTime(value);
        return formatDateTime(value);
      }

      function getProject() {
        return snapshot.projects.find((project) => project.id === state.projectId) || snapshot.projects[0] || null;
      }

      function getRecords(project) {
        if (!project) return [];
        return state.recordType === 'risks' ? project.risks : project.decisions;
      }

      function ensureSelection(records) {
        if (!records.length) {
          state.selectedId = '';
          return;
        }
        const stillExists = records.some((record) => record.id === state.selectedId);
        if (!stillExists) {
          state.selectedId = records[0].id;
        }
      }

      function renderProjectTabs() {
        els.projectTabs.innerHTML = snapshot.projects
          .map((project) => \`<button class="pill \${project.id === state.projectId ? 'active' : ''}" data-project-id="\${escapeHtml(project.id)}" type="button">\${escapeHtml(project.name)}</button>\`)
          .join('');
      }

      function renderTable(project, records) {
        if (!project || !records.length) {
          els.tableHost.innerHTML = '<div class="empty">No records are available for this project in the current view.</div>';
          return;
        }

        if (state.recordType === 'risks') {
          els.tableHost.innerHTML = \`
            <table>
              <thead>
                <tr>
                  <th>Risk</th>
                  <th>Status</th>
                  <th>Owner</th>
                  <th>Score</th>
                  <th>Response</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                \${records.map((risk) => \`
                  <tr class="\${risk.id === state.selectedId ? 'active' : ''}" data-record-id="\${escapeHtml(risk.id)}">
                    <td>
                      <div style="font-weight: 700;">\${escapeHtml(risk.id)} · \${escapeHtml(risk.title)}</div>
                      <div class="muted" style="margin-top: 4px;">\${escapeHtml(risk.statement || 'No risk statement recorded.')}</div>
                    </td>
                    <td><span class="\${statusChipClass(risk.status)}">\${escapeHtml(risk.status)}</span></td>
                    <td>\${escapeHtml(risk.owner || 'Not assigned')}</td>
                    <td>\${escapeHtml(String(risk.likelihood))} × \${escapeHtml(String(risk.impact))} = \${escapeHtml(String(risk.likelihood * risk.impact))}</td>
                    <td>\${escapeHtml(risk.responseType || 'Not defined')}</td>
                    <td>\${escapeHtml(formatDateTime(risk.lastUpdated))}</td>
                  </tr>
                \`).join('')}
              </tbody>
            </table>
          \`;
          return;
        }

        els.tableHost.innerHTML = \`
          <table>
            <thead>
              <tr>
                <th>Decision</th>
                <th>Status</th>
                <th>Deciders</th>
                <th>Updated</th>
                <th>Linked Risks</th>
              </tr>
            </thead>
            <tbody>
              \${records.map((decision) => \`
                <tr class="\${decision.id === state.selectedId ? 'active' : ''}" data-record-id="\${escapeHtml(decision.id)}">
                  <td>
                    <div style="font-weight: 700;">\${escapeHtml(decision.id)} · \${escapeHtml(decision.title)}</div>
                    <div class="muted" style="margin-top: 4px;">\${escapeHtml(decision.outcome || decision.context || 'No decision outcome recorded.')}</div>
                  </td>
                  <td><span class="\${statusChipClass(decision.status)}">\${escapeHtml(decision.status)}</span></td>
                  <td>\${escapeHtml(decision.deciders || 'Not assigned')}\${decision.deciderRoles ? '<div class="muted" style="margin-top: 4px;">' + escapeHtml(decision.deciderRoles) + '</div>' : ''}</td>
                  <td>\${escapeHtml(getDecisionActivityLabel(decision))}</td>
                  <td>\${escapeHtml(String((decision.linkedRisks || []).length))}</td>
                </tr>
              \`).join('')}
            </tbody>
          </table>
        \`;
      }

      function renderRiskDetail(risk) {
        els.detailHost.innerHTML = \`
          <div class="detail-stack">
            <div class="detail-header">
              <div class="eyebrow">\${escapeHtml(formatScopedId(snapshot.projects.find((project) => project.id === state.projectId), risk.id))}</div>
              <h3>\${escapeHtml(risk.title)}</h3>
            </div>
            <div class="detail-grid">
              <div class="detail-card">
                <div class="label">Status</div>
                <div class="value"><span class="\${statusChipClass(risk.status)}">\${escapeHtml(risk.status)}</span></div>
              </div>
              <div class="detail-card">
                <div class="label">Severity</div>
                <div class="value"><span class="\${statusChipClass(risk.severity)}">\${escapeHtml(risk.severity)}</span></div>
              </div>
              <div class="detail-card">
                <div class="label">Owner</div>
                <div class="value">\${escapeHtml(risk.owner || 'Not assigned')}</div>
              </div>
              <div class="detail-card">
                <div class="label">Assessment</div>
                <div class="value">Likelihood \${escapeHtml(String(risk.likelihood))} · Impact \${escapeHtml(String(risk.impact))} · Score \${escapeHtml(String(risk.likelihood * risk.impact))}</div>
              </div>
              <div class="detail-card wide">
                <div class="label">Risk Statement</div>
                <div class="value">\${escapeHtml(risk.statement || 'No risk statement recorded.')}</div>
              </div>
              <div class="detail-card wide">
                <div class="label">Trigger / Condition</div>
                <div class="value">\${escapeHtml(risk.trigger || 'Not defined')}</div>
              </div>
              <div class="detail-card wide">
                <div class="label">Consequence</div>
                <div class="value">\${escapeHtml(risk.consequence || 'Not defined')}</div>
              </div>
              <div class="detail-card wide">
                <div class="label">Mitigation Plan</div>
                <div class="value">\${escapeHtml(risk.mitigation || 'Not defined')}</div>
              </div>
              <div class="detail-card">
                <div class="label">Response</div>
                <div class="value">\${escapeHtml(risk.responseType || 'Not defined')}</div>
              </div>
              <div class="detail-card">
                <div class="label">Due Date</div>
                <div class="value">\${escapeHtml(formatDateTime(risk.dueDate))}</div>
              </div>
              <div class="detail-card">
                <div class="label">Linked Decision</div>
                <div class="value">\${escapeHtml(risk.linkedDecision || 'None')}</div>
              </div>
              <div class="detail-card">
                <div class="label">Last Updated</div>
                <div class="value">\${escapeHtml(formatDateTime(risk.lastUpdated))}</div>
              </div>
            </div>
          </div>
        \`;
      }

      function renderDecisionDetail(decision) {
        els.detailHost.innerHTML = \`
          <div class="detail-stack">
            <div class="detail-header">
              <div class="eyebrow">\${escapeHtml(formatScopedId(snapshot.projects.find((project) => project.id === state.projectId), decision.id))}</div>
              <h3>\${escapeHtml(decision.title)}</h3>
            </div>
            <div class="detail-grid">
              <div class="detail-card">
                <div class="label">Status</div>
                <div class="value"><span class="\${statusChipClass(decision.status)}">\${escapeHtml(decision.status)}</span></div>
              </div>
              <div class="detail-card">
                <div class="label">Updated</div>
                <div class="value">\${escapeHtml(getDecisionActivityLabel(decision))}</div>
              </div>
              <div class="detail-card wide">
                <div class="label">Context</div>
                <div class="value">\${escapeHtml(decision.context || 'Not recorded')}</div>
              </div>
              <div class="detail-card wide">
                <div class="label">Decision Drivers</div>
                <div class="value">\${escapeHtml((decision.decisionDrivers || []).join('\\n') || 'Not recorded')}</div>
              </div>
              <div class="detail-card wide">
                <div class="label">Considered Options</div>
                <div class="value">\${escapeHtml((decision.consideredOptions || []).join('\\n') || 'Not recorded')}</div>
              </div>
              <div class="detail-card wide">
                <div class="label">Outcome</div>
                <div class="value">\${escapeHtml(decision.outcome || 'Not recorded')}</div>
              </div>
              <div class="detail-card">
                <div class="label">Deciders</div>
                <div class="value">\${escapeHtml(decision.deciders || 'Not assigned')}</div>
              </div>
              <div class="detail-card">
                <div class="label">Roles</div>
                <div class="value">\${escapeHtml(decision.deciderRoles || 'Not assigned')}</div>
              </div>
              <div class="detail-card">
                <div class="label">Decision Date</div>
                <div class="value">\${escapeHtml(formatDateTime(decision.date))}</div>
              </div>
              <div class="detail-card">
                <div class="label">Linked Risks</div>
                <div class="value">\${escapeHtml((decision.linkedRisks || []).join(', ') || 'None')}</div>
              </div>
            </div>
          </div>
        \`;
      }

      function renderDetail(records) {
        if (!records.length) {
          els.detailHost.innerHTML = '<div class="empty">Nothing to inspect yet in this view.</div>';
          return;
        }
        const selected = records.find((record) => record.id === state.selectedId) || records[0];
        if (!selected) {
          els.detailHost.innerHTML = '<div class="empty">Nothing to inspect yet in this view.</div>';
          return;
        }
        if (state.recordType === 'risks') {
          renderRiskDetail(selected);
        } else {
          renderDecisionDetail(selected);
        }
      }

      function render() {
        const project = getProject();
        const records = getRecords(project);
        ensureSelection(records);

        els.metaExportedAt.textContent = formatDateTime('${exportedAt}');
        els.metaRevision.textContent = snapshot.registry?.revision != null ? 'v' + snapshot.registry.revision : 'Not set';
        els.metaProjectCount.textContent = String(snapshot.projects.length);
        els.tableTitle.textContent = state.recordType === 'risks' ? 'Current Risks' : 'Current Decisions';
        els.tableSubtitle.textContent = project
          ? project.name + ' · ' + (state.recordType === 'risks' ? 'Read-only risk register' : 'Read-only decision register')
          : 'No project selected';
        els.tableCount.textContent = records.length + ' record' + (records.length === 1 ? '' : 's');
        els.recordTabs.style.display = availableRecordTypes.length > 1 ? 'flex' : 'none';

        document.querySelectorAll('[data-record-type]').forEach((button) => {
          const recordType = button.getAttribute('data-record-type');
          const enabled = availableRecordTypes.includes(recordType);
          button.classList.toggle('active', recordType === state.recordType);
          button.style.display = enabled ? '' : 'none';
        });

        renderProjectTabs();
        renderTable(project, records);
        renderDetail(records);
      }

      document.addEventListener('click', (event) => {
        const target = event.target.closest('[data-project-id], [data-record-type], [data-record-id]');
        if (!target) return;

        if (target.hasAttribute('data-project-id')) {
          state.projectId = target.getAttribute('data-project-id');
          state.selectedId = '';
          render();
          return;
        }

        if (target.hasAttribute('data-record-type')) {
          const nextRecordType = target.getAttribute('data-record-type');
          if (!availableRecordTypes.includes(nextRecordType)) {
            return;
          }
          state.recordType = nextRecordType;
          state.selectedId = '';
          render();
          return;
        }

        if (target.hasAttribute('data-record-id')) {
          state.selectedId = target.getAttribute('data-record-id');
          render();
        }
      });

      render();
    </script>
  </body>
</html>`;
}

function buildSnapshotHashPayload(snapshot: AppSnapshot) {
  return {
    version: snapshot.version,
    activeProjectId: snapshot.activeProjectId,
    projects: snapshot.projects,
    sharedLibrary: snapshot.sharedLibrary ?? {
      risks: [],
      decisions: [],
      riskSubscriptions: [],
    },
    registryIdentity: snapshot.registry
      ? {
          documentId: snapshot.registry.documentId,
          name: snapshot.registry.name,
        }
      : null,
  };
}

function computeSnapshotContentHash(snapshot: AppSnapshot) {
  return hashStringFNV1a(stableSerialize(buildSnapshotHashPayload(snapshot)));
}

function snapshotHasMeaningfulContent(snapshot: AppSnapshot) {
  const projectContent = snapshot.projects.some(
    (project) =>
      project.risks.length > 0 ||
      project.decisions.length > 0 ||
      project.name !== 'New Project' ||
      project.description !== 'Blank workspace ready for your first risk and decision records.',
  );
  const sharedRiskCount = snapshot.sharedLibrary?.risks.length ?? 0;
  const sharedDecisionCount = snapshot.sharedLibrary?.decisions.length ?? 0;
  const subscriptionCount = snapshot.sharedLibrary?.riskSubscriptions?.length ?? 0;

  return projectContent || sharedRiskCount > 0 || sharedDecisionCount > 0 || subscriptionCount > 0;
}

function normalizeRegistryMetadata(
  input: Partial<RegistryMetadata> & Record<string, unknown>,
): RegistryMetadata {
  return {
    documentId:
      typeof input.documentId === 'string' && input.documentId.trim()
        ? input.documentId
        : createRegistryDocumentId(),
    name: typeof input.name === 'string' && input.name.trim() ? input.name : 'Governance Register',
    revision: typeof input.revision === 'number' && input.revision > 0 ? input.revision : 1,
    contentHash: typeof input.contentHash === 'string' ? input.contentHash : '',
    parentRevision:
      typeof input.parentRevision === 'number' && input.parentRevision > 0 ? input.parentRevision : null,
    parentContentHash:
      typeof input.parentContentHash === 'string' && input.parentContentHash.trim()
        ? input.parentContentHash
        : null,
    lastModifiedAt:
      typeof input.lastModifiedAt === 'string' && input.lastModifiedAt ? input.lastModifiedAt : new Date().toISOString(),
    lastModifiedBy:
      typeof input.lastModifiedBy === 'string' && input.lastModifiedBy.trim()
        ? input.lastModifiedBy
        : 'Browser workspace',
  };
}

function loadRecoveryDraft() {
  if (typeof window === 'undefined') {
    return null as RecoveryDraft | null;
  }

  try {
    const stored = window.localStorage.getItem(REGISTRY_DRAFT_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as Partial<RecoveryDraft> & Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object' || typeof parsed.savedAt !== 'string' || !parsed.snapshot) {
      return null;
    }

    const snapshot = parseAppSnapshot(JSON.stringify(parsed.snapshot));
    const rawSession =
      parsed.session && typeof parsed.session === 'object'
        ? (parsed.session as Partial<RegistrySession> & Record<string, unknown>)
        : null;

    return {
      snapshot,
      savedAt: parsed.savedAt,
      session: {
        sourceLabel: typeof rawSession?.sourceLabel === 'string' ? rawSession.sourceLabel : 'Recovery draft',
        sourceFileName: typeof rawSession?.sourceFileName === 'string' ? rawSession.sourceFileName : '',
        registryName:
          typeof rawSession?.registryName === 'string'
            ? rawSession.registryName
            : snapshot.registry?.name ?? 'Governance Register',
        baseDocumentId:
          typeof rawSession?.baseDocumentId === 'string'
            ? rawSession.baseDocumentId
            : snapshot.registry?.documentId ?? null,
        baseRevision:
          typeof rawSession?.baseRevision === 'number'
            ? rawSession.baseRevision
            : snapshot.registry?.revision ?? null,
        baseContentHash:
          typeof rawSession?.baseContentHash === 'string'
            ? rawSession.baseContentHash
            : snapshot.registry?.contentHash ?? null,
        loadedAt: typeof rawSession?.loadedAt === 'string' ? rawSession.loadedAt : parsed.savedAt,
        lastPublishedAt: typeof rawSession?.lastPublishedAt === 'string' ? rawSession.lastPublishedAt : null,
        lastPublishedRevision:
          typeof rawSession?.lastPublishedRevision === 'number' ? rawSession.lastPublishedRevision : null,
        status:
          rawSession?.status === 'master_loaded_clean' ||
          rawSession?.status === 'master_loaded_dirty' ||
          rawSession?.status === 'publish_in_progress' ||
          rawSession?.status === 'recovery_draft_available'
            ? rawSession.status
            : 'recovery_draft_available',
        lastError: typeof rawSession?.lastError === 'string' ? rawSession.lastError : '',
      },
    };
  } catch {
    return null;
  }
}

function loadEditorName() {
  if (typeof window === 'undefined') {
    return '';
  }

  try {
    return window.localStorage.getItem(EDITOR_NAME_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function sanitizeProjectKey(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, '');
}

function deriveProjectKey(name: string, fallback = 'PRJ') {
  const words = name
    .trim()
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .filter((word) => !['project', 'program', 'workspace', 'board'].includes(word.toLowerCase()));
  const acronym = sanitizeProjectKey(words.slice(0, 4).map((word) => word[0]).join(''));
  if (acronym.length >= 2) {
    return acronym;
  }

  const compact = sanitizeProjectKey(name);
  if (compact.length >= 3) {
    return compact.slice(0, 6);
  }

  return sanitizeProjectKey(fallback).slice(0, 6) || 'PRJ';
}

function ensureUniqueProjectKeys(projects: Project[]) {
  const usedKeys = new Set<string>();
  return projects.map((project) => {
    const baseKey = sanitizeProjectKey(project.projectKey || deriveProjectKey(project.name, project.id)) || 'PRJ';
    let nextKey = baseKey;
    let duplicateIndex = 2;
    while (usedKeys.has(nextKey)) {
      nextKey = `${baseKey}${duplicateIndex}`;
      duplicateIndex += 1;
    }
    usedKeys.add(nextKey);
    return {...project, projectKey: nextKey};
  });
}

function formatProjectScopedId(projectKey: string, recordId: string) {
  const normalizedProjectKey = sanitizeProjectKey(projectKey) || 'PRJ';
  return `${normalizedProjectKey}-${recordId}`;
}

function formatDisplayDateTime(value: string) {
  if (!value) return 'Not available';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(date);
    }
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function getDecisionActivityAt(decision: Decision) {
  return decision.approvedAt || decision.statusUpdatedAt || decision.updatedAt || decision.createdAt || decision.date;
}

function getDecisionActivityLabel(decision: Decision) {
  if (decision.approvedAt) {
    return `Approved ${formatDisplayDateTime(decision.approvedAt)}`;
  }
  if (decision.statusUpdatedAt) {
    return `Status updated ${formatDisplayDateTime(decision.statusUpdatedAt)}`;
  }
  if (decision.updatedAt) {
    return `Updated ${formatDisplayDateTime(decision.updatedAt)}`;
  }
  if (decision.createdAt) {
    return `Created ${formatDisplayDateTime(decision.createdAt)}`;
  }
  return formatDisplayDateTime(decision.date);
}

function buildDecisionRecord(
  input: Partial<Decision> & Record<string, unknown>,
  defaults?: Partial<Decision>,
): Decision {
  const legacyDate = typeof input.date === 'string' && input.date ? input.date : defaults?.date ?? '';
  const createdAt = typeof input.createdAt === 'string' && input.createdAt ? input.createdAt : defaults?.createdAt ?? legacyDate;
  const updatedAt = typeof input.updatedAt === 'string' && input.updatedAt ? input.updatedAt : defaults?.updatedAt ?? '';
  const statusUpdatedAt =
    typeof input.statusUpdatedAt === 'string' && input.statusUpdatedAt
      ? input.statusUpdatedAt
      : defaults?.statusUpdatedAt ?? '';
  const approvedAt =
    typeof input.approvedAt === 'string'
      ? input.approvedAt
      : defaults?.approvedAt ??
        ((input.status === 'Approved' || defaults?.status === 'Approved') ? legacyDate : '');

  return {
    id: typeof input.id === 'string' ? input.id : defaults?.id ?? formatDecisionSequence(1),
    sharedDecisionId:
      typeof input.sharedDecisionId === 'string' ? input.sharedDecisionId : defaults?.sharedDecisionId,
    title: typeof input.title === 'string' ? input.title : defaults?.title ?? 'Untitled Decision',
    summary: typeof input.summary === 'string' ? input.summary : defaults?.summary ?? '',
    status:
      input.status === 'Approved' ||
      input.status === 'Implemented' ||
      input.status === 'Proposed' ||
      input.status === 'Deferred' ||
      input.status === 'Rejected'
        ? input.status
        : defaults?.status ?? 'Proposed',
    deciders:
      typeof input.deciders === 'string'
        ? input.deciders
        : typeof input.authority === 'string'
          ? input.authority
          : defaults?.deciders ?? '',
    deciderRoles:
      typeof input.deciderRoles === 'string'
        ? input.deciderRoles
        : typeof input.deciderRole === 'string'
          ? input.deciderRole
          : defaults?.deciderRoles ?? '',
    date: typeof input.date === 'string' ? input.date : defaults?.date ?? '',
    createdAt,
    updatedAt,
    statusUpdatedAt,
    approvedAt,
    statusLocked:
      typeof input.statusLocked === 'boolean'
        ? input.statusLocked
        : defaults?.statusLocked ?? ((input.status ?? defaults?.status) === 'Approved' && Boolean(approvedAt)),
    linkedRisks: Array.isArray(input.linkedRisks)
      ? input.linkedRisks.filter((item): item is string => typeof item === 'string')
      : defaults?.linkedRisks ?? [],
    context:
      typeof input.context === 'string'
        ? input.context
        : typeof input.rationale === 'string'
          ? input.rationale
          : defaults?.context ?? '',
    decisionDrivers: Array.isArray(input.decisionDrivers)
      ? input.decisionDrivers.filter((item): item is string => typeof item === 'string')
      : defaults?.decisionDrivers ?? [],
    consideredOptions: Array.isArray(input.consideredOptions)
      ? input.consideredOptions.filter((item): item is string => typeof item === 'string')
      : Array.isArray(input.alternatives)
        ? input.alternatives.filter((item): item is string => typeof item === 'string')
        : defaults?.consideredOptions ?? [],
    outcome: typeof input.outcome === 'string' ? input.outcome : defaults?.outcome ?? '',
    goodConsequences: Array.isArray(input.goodConsequences)
      ? input.goodConsequences.filter((item): item is string => typeof item === 'string')
      : defaults?.goodConsequences ?? [],
    badConsequences: Array.isArray(input.badConsequences)
      ? input.badConsequences.filter((item): item is string => typeof item === 'string')
      : defaults?.badConsequences ?? [],
    moreInfo: typeof input.moreInfo === 'string' ? input.moreInfo : defaults?.moreInfo ?? '',
    approvalChain: Array.isArray(input.approvalChain)
      ? input.approvalChain.filter((item): item is string => typeof item === 'string')
      : defaults?.approvalChain ?? [],
  };
}

function applyDecisionUpdates(current: Decision, updates: Partial<Decision>) {
  const nowIso = new Date().toISOString();
  const nextStatus = updates.status ?? current.status;
  const statusChanged = typeof updates.status === 'string' && updates.status !== current.status;
  const unlockingStatus = updates.statusLocked === false;
  const blockedStatusChange = current.statusLocked && statusChanged && !unlockingStatus;
  const approvedNow = statusChanged && nextStatus === 'Approved' && !current.approvedAt;

  return buildDecisionRecord(
    {
      ...current,
      ...updates,
      status: blockedStatusChange ? current.status : nextStatus,
      updatedAt: nowIso,
      statusUpdatedAt: blockedStatusChange ? current.statusUpdatedAt : statusChanged ? nowIso : current.statusUpdatedAt,
      approvedAt:
        blockedStatusChange
          ? current.approvedAt
          : approvedNow
            ? nowIso
            : typeof updates.approvedAt === 'string'
              ? updates.approvedAt
              : current.approvedAt,
      statusLocked:
        typeof updates.statusLocked === 'boolean'
          ? updates.statusLocked
          : approvedNow
            ? true
            : current.statusLocked,
    },
    current,
  );
}

function createBlankProject(overrides?: Partial<Project>): Project {
  return {
    id: overrides?.id ?? `proj-${Date.now()}`,
    projectKey: overrides?.projectKey ?? deriveProjectKey(overrides?.name ?? overrides?.id ?? 'Project'),
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
  | 'responseType'
  | 'likelihood'
  | 'impact'
  | 'residualLikelihood'
  | 'residualImpact';

type HeatmapCell = {
  likelihood: number;
  impact: number;
};

type BurndownTimeframe = '3m' | '6m' | '12m' | 'all';

type RiskBurndownPoint = {
  at: string;
  likelihood: number;
  impact: number;
  score: number;
  severity: RiskSeverity;
  label: string;
  rationale: string;
  source: 'initial' | 'likelihood' | 'impact' | 'current';
};

type SelectedBurndownPoint = {
  riskId: string;
  at: string;
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

function formatHistoryTimestamp(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed);
}

function createHistoryEntry(label: string, meta: string, at = new Date().toISOString()): HistoryEntry {
  return {label, meta, at};
}

function parseScoreChangeHistoryEntry(entry: HistoryEntry) {
  const match = entry.label.match(/^(Likelihood|Impact) updated \((\d+)[\s\S]*?→\s*(\d+)/i);
  if (!match) {
    return null;
  }

  const rationaleMatch = entry.label.match(/Rationale:\s*([\s\S]+)$/i);
  const field: RiskBurndownPoint['source'] = match[1].toLowerCase() === 'likelihood' ? 'likelihood' : 'impact';
  const previousValue = Number(match[2]);
  const nextValue = Number(match[3]);

  if (!Number.isFinite(previousValue) || !Number.isFinite(nextValue)) {
    return null;
  }

  return {
    field,
    previousValue,
    nextValue,
    rationale: rationaleMatch?.[1]?.trim() ?? '',
    at: entry.at ?? '',
  };
}

function buildRiskBurndownTimeline(risk: Risk): RiskBurndownPoint[] {
  const fallbackTimestamp = new Date().toISOString();
  const normalizedLastUpdated = normalizeBurndownTimestamp(risk.lastUpdated, fallbackTimestamp);
  const historyWithTimestamps = risk.history
    .filter((entry) => entry.at)
    .map((entry) => ({
      ...entry,
      at: normalizeBurndownTimestamp(entry.at, normalizedLastUpdated),
    }))
    .sort((left, right) => new Date(right.at ?? '').getTime() - new Date(left.at ?? '').getTime());
  const scoreChanges = historyWithTimestamps.reduce<
    {entry: {label: string; meta: string; at: string}; parsed: NonNullable<ReturnType<typeof parseScoreChangeHistoryEntry>>}[]
  >((items, entry) => {
    const parsed = parseScoreChangeHistoryEntry(entry);
    if (parsed) {
      items.push({
        entry: {
          label: entry.label,
          meta: entry.meta,
          at: entry.at ?? normalizedLastUpdated,
        },
        parsed,
      });
    }
    return items;
  }, []);

  let workingLikelihood = risk.likelihood;
  let workingImpact = risk.impact;
  const pointsDescending: RiskBurndownPoint[] = [];

  scoreChanges.forEach(({entry, parsed}) => {
    const afterChangeScore = workingLikelihood * workingImpact;
    pointsDescending.push({
      at: normalizeBurndownTimestamp(entry.at, normalizedLastUpdated),
      likelihood: workingLikelihood,
      impact: workingImpact,
      score: afterChangeScore,
      severity: getSeverityFromAssessment(workingLikelihood, workingImpact),
      label: `${parsed.field === 'likelihood' ? 'Likelihood' : 'Impact'} updated`,
      rationale: parsed.rationale,
      source: parsed.field,
    });

    if (parsed.field === 'likelihood') {
      workingLikelihood = parsed.previousValue;
    } else {
      workingImpact = parsed.previousValue;
    }
  });

  const oldestHistoryAt =
    [...historyWithTimestamps].sort((left, right) => new Date(left.at ?? '').getTime() - new Date(right.at ?? '').getTime())[0]?.at ??
    normalizedLastUpdated;

  const initialScore = workingLikelihood * workingImpact;
  const ascendingPoints: RiskBurndownPoint[] = [
    {
      at: oldestHistoryAt,
      likelihood: workingLikelihood,
      impact: workingImpact,
      score: initialScore,
      severity: getSeverityFromAssessment(workingLikelihood, workingImpact),
      label: 'Initial recorded score',
      rationale: '',
      source: 'initial',
    },
    ...pointsDescending.reverse(),
  ];

  const latestPoint = ascendingPoints[ascendingPoints.length - 1];
  if (latestPoint && latestPoint.at !== normalizedLastUpdated) {
    ascendingPoints.push({
      at: normalizedLastUpdated,
      likelihood: risk.likelihood,
      impact: risk.impact,
      score: risk.likelihood * risk.impact,
      severity: risk.severity,
      label: 'Current score',
      rationale: '',
      source: 'current',
    });
  }

  if (ascendingPoints.length === 1 && ascendingPoints[0].at !== normalizedLastUpdated) {
    ascendingPoints.push({
      at: normalizedLastUpdated,
      likelihood: risk.likelihood,
      impact: risk.impact,
      score: risk.likelihood * risk.impact,
      severity: risk.severity,
      label: 'Current score',
      rationale: '',
      source: 'current',
    });
  }

  return ascendingPoints.sort((left, right) => new Date(left.at).getTime() - new Date(right.at).getTime());
}

function getBurndownRangeStart(timeframe: BurndownTimeframe) {
  if (timeframe === 'all') {
    return null;
  }

  const months = timeframe === '3m' ? 3 : timeframe === '6m' ? 6 : 12;
  const boundary = new Date();
  boundary.setMonth(boundary.getMonth() - months);
  return boundary;
}

function filterBurndownPoints(points: RiskBurndownPoint[], timeframe: BurndownTimeframe) {
  const boundary = getBurndownRangeStart(timeframe);
  if (!boundary || points.length === 0) {
    return points;
  }

  const boundaryTime = boundary.getTime();
  const visiblePoints = points.filter((point) => new Date(point.at).getTime() >= boundaryTime);
  const previousPoint = [...points]
    .reverse()
    .find((point) => new Date(point.at).getTime() < boundaryTime);

  if (!previousPoint) {
    return visiblePoints;
  }

  return [
    {
      ...previousPoint,
      at: boundary.toISOString(),
      label: previousPoint.label === 'Current score' ? 'Score at timeframe boundary' : previousPoint.label,
      rationale: '',
      source: 'current' as const,
    },
    ...visiblePoints,
  ];
}

function getDefaultBurndownRiskIds(risks: Risk[]) {
  const activeRisks = risks.filter((risk) => !isRetiredRiskStatus(risk.status));
  const prioritized = [...activeRisks].sort((left, right) => {
    const scoreDifference = right.likelihood * right.impact - left.likelihood * left.impact;
    if (scoreDifference !== 0) {
      return scoreDifference;
    }

    return new Date(right.lastUpdated).getTime() - new Date(left.lastUpdated).getTime();
  });

  return prioritized.slice(0, 4).map((risk) => risk.id);
}

function formatBurndownDateLabel(value: string, rangeStart?: number, rangeEnd?: number) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const span = rangeStart != null && rangeEnd != null ? Math.max(rangeEnd - rangeStart, 0) : null;

  if (span != null && span <= 1000 * 60 * 60 * 36) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(parsed);
  }

  if (span != null && span <= 1000 * 60 * 60 * 24 * 370) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(parsed);
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

function normalizeBurndownTimestamp(value: string | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
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

function getRiskScoreLabel(likelihood: number, impact: number) {
  const rating = getResidualRating(likelihood, impact);
  return `${rating.score} · ${rating.severity}`;
}

function getRiskCommentCount(risk: Pick<Risk, 'comments' | 'legacyCommentCount'>) {
  return risk.comments.length + risk.legacyCommentCount;
}

function isRetiredRiskStatus(status: RiskStatus) {
  return status === 'Closed' || status === 'Rejected' || status === 'Converted to Issue';
}

function normalizeRiskComments(value: unknown): RiskComment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const record = entry as Partial<RiskComment>;
      const body = typeof record.body === 'string' ? record.body : '';
      if (!body.trim()) {
        return null;
      }

      const timestamp =
        normalizeLegacyTimestamp(record.updatedAt) ??
        normalizeLegacyTimestamp(record.createdAt) ??
        new Date().toISOString();

      return {
        id: typeof record.id === 'string' && record.id ? record.id : `comment-${index + 1}`,
        body,
        author: typeof record.author === 'string' && record.author ? record.author : 'Local edit',
        createdAt: normalizeLegacyTimestamp(record.createdAt) ?? timestamp,
        updatedAt: timestamp,
      };
    })
    .filter((entry): entry is RiskComment => Boolean(entry));
}

function normalizeMitigationActions(value: unknown): MitigationAction[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const record = entry as Partial<MitigationAction>;
      const title = typeof record.title === 'string' ? record.title : '';
      if (!title.trim()) {
        return null;
      }

      const status: MitigationAction['status'] =
        record.status === 'In Progress' || record.status === 'Done' || record.status === 'Blocked'
          ? record.status
          : 'Not Started';

      return {
        id: typeof record.id === 'string' && record.id ? record.id : `mitigation-action-${index + 1}`,
        title,
        owner: typeof record.owner === 'string' ? record.owner : '',
        dueDate: typeof record.dueDate === 'string' ? record.dueDate : '',
        status,
      };
    })
    .filter((entry): entry is MitigationAction => Boolean(entry));
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

function parseOptionalNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getRepresentativeRangeValue(min: number | null | undefined, max: number | null | undefined) {
  if (min != null && max != null) {
    return (min + max) / 2;
  }

  if (min != null) {
    return min;
  }

  if (max != null) {
    return max;
  }

  return null;
}

function rangeContainsValue(
  min: number | null | undefined,
  max: number | null | undefined,
  value: number | null,
) {
  if (value == null) {
    return false;
  }

  if (min != null && value < min) {
    return false;
  }

  if (max != null && value > max) {
    return false;
  }

  return true;
}

function formatImpactRange(min: number | null | undefined, max: number | null | undefined, unit: string, prefix = '') {
  if (min == null && max == null) {
    return '';
  }

  const formatValue = (value: number) => {
    if (prefix) {
      return `${prefix}${new Intl.NumberFormat('en-US', {maximumFractionDigits: 2}).format(value)}`;
    }

    return `${new Intl.NumberFormat('en-US', {maximumFractionDigits: 2}).format(value)} ${unit}`;
  };

  if (min != null && max != null) {
    return `${formatValue(min)} to ${formatValue(max)}`;
  }

  if (min != null) {
    return `${formatValue(min)}+`;
  }

  return `Up to ${formatValue(max ?? 0)}`;
}

function getImpactTranslationProfile(definition: ScoreDefinition) {
  if (definition.scheduleMinMonths != null || definition.scheduleMaxMonths != null) {
    return {
      basis: 'schedule' as const,
      min: definition.scheduleMinMonths ?? 0,
      max: definition.scheduleMaxMonths ?? null,
      sourceScore: definition.value,
    };
  }

  if (definition.costMinAmount != null || definition.costMaxAmount != null) {
    return {
      basis: 'cost' as const,
      min: definition.costMinAmount ?? 0,
      max: definition.costMaxAmount ?? null,
      sourceScore: definition.value,
    };
  }

  return null;
}

function mapSharedImpactProfileToLocalScore(definitions: ScoreDefinition[], profile: SharedRisk['sharedImpactProfile']) {
  if (!profile) {
    return null;
  }

  const representativeValue = getRepresentativeRangeValue(profile.min, profile.max);
  if (representativeValue == null) {
    return null;
  }

  const candidate = definitions.find((definition) => {
    const min = profile.basis === 'schedule' ? definition.scheduleMinMonths : definition.costMinAmount;
    const max = profile.basis === 'schedule' ? definition.scheduleMaxMonths : definition.costMaxAmount;
    return rangeContainsValue(min, max, representativeValue);
  });

  return candidate?.value ?? null;
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

async function renderSvgElementToPngBlob(svg: SVGSVGElement): Promise<Blob> {
  const serializer = new XMLSerializer();
  const exportSvg = svg.cloneNode(true) as SVGSVGElement;
  exportSvg.setAttribute('font-family', 'Inter, sans-serif');
  exportSvg.style.fontFamily = 'Inter, sans-serif';

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = `
    text, tspan {
      font-family: "Inter", sans-serif;
    }

    [data-export-font="headline"] {
      font-family: "Manrope", sans-serif;
    }
  `;
  defs.appendChild(style);
  exportSvg.insertBefore(defs, exportSvg.firstChild);

  const svgMarkup = serializer.serializeToString(exportSvg);
  const svgBlob = new Blob([svgMarkup], {type: 'image/svg+xml;charset=utf-8'});
  const svgUrl = window.URL.createObjectURL(svgBlob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error('SVG rendering failed'));
      nextImage.src = svgUrl;
    });

    const viewBox = svg.viewBox.baseVal;
    const width = viewBox && viewBox.width ? viewBox.width : svg.clientWidth || 980;
    const height = viewBox && viewBox.height ? viewBox.height : svg.clientHeight || 320;
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas context unavailable');
    }

    ctx.scale(scale, scale);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('PNG generation failed'));
          return;
        }
        resolve(blob);
      }, 'image/png');
    });
  } finally {
    window.URL.revokeObjectURL(svgUrl);
  }
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

function parseSharedRiskSequence(id: string) {
  const match = id.trim().match(/^SRK-(\d+)$/i);
  return match ? Number(match[1]) : null;
}

function formatSharedRiskSequence(sequence: number) {
  return `SRK-${String(sequence).padStart(3, '0')}`;
}

function parseSharedDecisionSequence(id: string) {
  const match = id.trim().match(/^SDC-(\d+)$/i);
  return match ? Number(match[1]) : null;
}

function formatSharedDecisionSequence(sequence: number) {
  return `SDC-${String(sequence).padStart(3, '0')}`;
}

function createOriginKey(prefix: 'risk' | 'decision') {
  return `${prefix}-origin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseSharedRiskSubscriptionSequence(id: string) {
  const match = id.trim().match(/^SRS-(\d+)$/i);
  return match ? Number(match[1]) : null;
}

function formatSharedRiskSubscriptionSequence(sequence: number) {
  return `SRS-${String(sequence).padStart(3, '0')}`;
}

function getSharedRiskChangeSummary(previous: SharedRisk, next: SharedRisk) {
  const changes: string[] = [];
  const track = <T,>(label: string, previousValue: T, nextValue: T) => {
    if (previousValue !== nextValue) {
      changes.push(label);
    }
  };

  track('title changed', previous.title, next.title);
  track('statement changed', previous.statement, next.statement);
  track('trigger changed', previous.trigger, next.trigger);
  track('consequence changed', previous.consequence, next.consequence);
  track('status changed', previous.status, next.status);
  track('owner changed', previous.owner, next.owner);
  if (previous.upstreamLikelihood !== next.upstreamLikelihood) {
    changes.push(`upstream likelihood changed from ${previous.upstreamLikelihood} to ${next.upstreamLikelihood}`);
  }
  if (previous.upstreamImpact !== next.upstreamImpact) {
    changes.push(`upstream impact changed from ${previous.upstreamImpact} to ${next.upstreamImpact}`);
  }
  track('response summary changed', previous.responseSummary, next.responseSummary);

  return changes;
}

type RecordNormalizationContext = {
  snapshotExportedAt?: string;
  projectCreatedAt?: string;
};

function normalizeLegacyTimestamp(value: string | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || /^just now$/i.test(trimmed)) {
    return null;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeHistoryMeta(value: string | undefined) {
  if (!value) {
    return 'Local edit';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return 'Local edit';
  }

  const withoutLegacyJustNow = trimmed.replace(/\s*[•·-]\s*just now$/i, '').trim();
  return withoutLegacyJustNow || 'Local edit';
}

function normalizeDateOnlyTimestamp(value: string | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(`${trimmed}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function buildNormalizedHistoryEntries(
  inputHistory: unknown,
  inferredLastUpdated: string,
  context: RecordNormalizationContext,
) {
  const normalizedEntries = Array.isArray(inputHistory)
    ? inputHistory
        .map((entry) =>
          entry && typeof entry === 'object'
            ? {
                label: typeof entry.label === 'string' ? entry.label : 'Updated',
                meta: normalizeHistoryMeta(typeof entry.meta === 'string' ? entry.meta : undefined),
                at: normalizeLegacyTimestamp(typeof entry.at === 'string' ? entry.at : undefined) ?? undefined,
              }
            : null,
        )
        .filter(Boolean) as HistoryEntry[]
    : [];

  if (normalizedEntries.length === 0) {
    return [];
  }

  const hasExplicitTimestamp = normalizedEntries.some((entry) => entry.at);
  if (hasExplicitTimestamp) {
    return normalizedEntries.map((entry) => ({
      ...entry,
      at: entry.at ?? inferredLastUpdated,
    }));
  }

  const oldestFallback =
    normalizeDateOnlyTimestamp(context.projectCreatedAt) ??
    normalizeLegacyTimestamp(context.snapshotExportedAt) ??
    inferredLastUpdated;
  const startTime = new Date(oldestFallback).getTime();
  const endTime = new Date(inferredLastUpdated).getTime();
  const safeStartTime = Number.isFinite(startTime) ? Math.min(startTime, endTime) : endTime;
  const safeEndTime = Number.isFinite(endTime) ? endTime : Date.now();
  const span = Math.max(safeEndTime - safeStartTime, 0);

  return normalizedEntries.map((entry, index) => {
    const factor = normalizedEntries.length === 1 ? 1 : (normalizedEntries.length - 1 - index) / (normalizedEntries.length - 1);
    return {
      ...entry,
      at: new Date(safeStartTime + span * factor).toISOString(),
    };
  });
}

function inferRiskLastUpdated(
  input: Partial<Risk> & Record<string, unknown>,
  context: RecordNormalizationContext,
) {
  const historyTimestamps = Array.isArray(input.history)
    ? input.history
        .map((entry) =>
          entry && typeof entry === 'object' && typeof entry.at === 'string'
            ? normalizeLegacyTimestamp(entry.at)
            : null,
        )
        .filter((value): value is string => Boolean(value))
    : [];

  return (
    normalizeLegacyTimestamp(typeof input.lastUpdated === 'string' ? input.lastUpdated : undefined) ??
    historyTimestamps.sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ??
    normalizeLegacyTimestamp(typeof input.updatedAt === 'string' ? input.updatedAt : undefined) ??
    normalizeLegacyTimestamp(typeof input.createdAt === 'string' ? input.createdAt : undefined) ??
    normalizeDateOnlyTimestamp(context.projectCreatedAt) ??
    normalizeLegacyTimestamp(context.snapshotExportedAt) ??
    new Date().toISOString()
  );
}

function normalizeRiskRecord(
  input: Partial<Risk> & Record<string, unknown>,
  context: RecordNormalizationContext = {},
): Risk {
  const likelihood = typeof input.likelihood === 'number' ? input.likelihood : 3;
  const impact = typeof input.impact === 'number' ? input.impact : 3;
  const residual = getResidualRating(likelihood, impact);
  const residualLikelihood = typeof input.residualLikelihood === 'number' ? input.residualLikelihood : likelihood;
  const residualImpact = typeof input.residualImpact === 'number' ? input.residualImpact : impact;
  const projectedResidual = getResidualRating(residualLikelihood, residualImpact);
  const trigger = typeof input.trigger === 'string' ? input.trigger : '';
  const consequence = typeof input.consequence === 'string' ? input.consequence : '';
  const inferredLastUpdated = inferRiskLastUpdated(input, context);
  const normalizedHistory = buildNormalizedHistoryEntries(input.history, inferredLastUpdated, context);
  const comments = normalizeRiskComments(input.comments);
  const legacyCommentCount =
    typeof input.legacyCommentCount === 'number'
      ? input.legacyCommentCount
      : typeof input.comments === 'number'
        ? input.comments
        : 0;

  return {
    id: typeof input.id === 'string' ? input.id : formatRiskSequence(1),
    originKey: typeof input.originKey === 'string' && input.originKey ? input.originKey : `legacy-risk-${typeof input.id === 'string' ? input.id : formatRiskSequence(1)}`,
    sharedRiskId: typeof input.sharedRiskId === 'string' ? input.sharedRiskId : undefined,
    sharedRiskRole:
      input.sharedRiskRole === 'source' || input.sharedRiskRole === 'linked' ? input.sharedRiskRole : undefined,
    sharedParentVersionSeen: typeof input.sharedParentVersionSeen === 'number' ? input.sharedParentVersionSeen : null,
    sharedReviewStatus:
      input.sharedReviewStatus === 'current' ||
      input.sharedReviewStatus === 'review_required' ||
      input.sharedReviewStatus === 'reviewed_no_change' ||
      input.sharedReviewStatus === 'updated_after_review'
        ? input.sharedReviewStatus
        : undefined,
    sharedOverrideRationale: typeof input.sharedOverrideRationale === 'string' ? input.sharedOverrideRationale : '',
    title: typeof input.title === 'string' ? input.title : 'Untitled Risk',
    statement:
      typeof input.statement === 'string' && input.statement.trim()
        ? normalizeRiskStatement(input.statement)
        : buildRiskStatement(trigger, consequence),
    trigger,
    consequence,
    resultingIn: typeof input.resultingIn === 'string' ? input.resultingIn : '',
    status:
      input.status === 'Pending' ||
      input.status === 'Active' ||
      input.status === 'Monitoring' ||
      input.status === 'Rejected' ||
      input.status === 'Closed' ||
      input.status === 'Converted to Issue'
        ? input.status
        : 'Pending',
    severity:
      input.severity === 'High' || input.severity === 'Medium' || input.severity === 'Low'
        ? input.severity
        : residual.severity,
    owner: typeof input.owner === 'string' ? input.owner : '',
    likelihood,
    impact,
    residualRating: typeof input.residualRating === 'string' ? input.residualRating : residual.label,
    residualLikelihood,
    residualImpact,
    residualRiskRating:
      typeof input.residualRiskRating === 'string' ? input.residualRiskRating : projectedResidual.label,
    responseType:
      input.responseType === 'Mitigate' ||
      input.responseType === 'Accept' ||
      input.responseType === 'Transfer' ||
      input.responseType === 'Avoid'
        ? input.responseType
        : 'Mitigate',
    project: typeof input.project === 'string' ? input.project : '',
    lastUpdated: inferredLastUpdated,
    dueDate: typeof input.dueDate === 'string' ? input.dueDate : '',
    mitigation: typeof input.mitigation === 'string' ? input.mitigation : '',
    mitigationActions: normalizeMitigationActions(input.mitigationActions),
    contingency: typeof input.contingency === 'string' ? input.contingency : '',
    linkedDecision: typeof input.linkedDecision === 'string' ? input.linkedDecision : 'None',
    attachments: typeof input.attachments === 'number' ? input.attachments : 0,
    comments,
    legacyCommentCount,
    createdBy: typeof input.createdBy === 'string' ? input.createdBy : 'Local edit',
    internalOnly: typeof input.internalOnly === 'boolean' ? input.internalOnly : false,
    history: normalizedHistory,
  };
}

function normalizeDecisionRecord(input: Partial<Decision> & Record<string, unknown>): Decision {
  return buildDecisionRecord(input);
}

function normalizeScoringModel(model: RiskScoringModel | undefined) {
  if (!model) {
    return defaultRiskScoringModel;
  }

  return {
    likelihood: defaultRiskScoringModel.likelihood.map((defaultEntry, index) => {
      const entry = model.likelihood?.[index];
      return {
        value: index + 1,
        label: entry?.label ?? defaultEntry.label,
        description: entry?.description ?? defaultEntry.description,
        scheduleMinMonths: parseOptionalNumber(entry?.scheduleMinMonths),
        scheduleMaxMonths: parseOptionalNumber(entry?.scheduleMaxMonths),
        costMinAmount: parseOptionalNumber(entry?.costMinAmount),
        costMaxAmount: parseOptionalNumber(entry?.costMaxAmount),
      };
    }),
    impact: defaultRiskScoringModel.impact.map((defaultEntry, index) => {
      const entry = model.impact?.[index];
      return {
        value: index + 1,
        label: entry?.label ?? defaultEntry.label,
        description: entry?.description ?? defaultEntry.description,
        scheduleMinMonths: parseOptionalNumber(entry?.scheduleMinMonths),
        scheduleMaxMonths: parseOptionalNumber(entry?.scheduleMaxMonths),
        costMinAmount: parseOptionalNumber(entry?.costMinAmount),
        costMaxAmount: parseOptionalNumber(entry?.costMaxAmount),
      };
    }),
  };
}

function normalizeSharedRiskRecord(input: Partial<SharedRisk> & Record<string, unknown>): SharedRisk {
  const trigger = typeof input.trigger === 'string' ? input.trigger : '';
  const consequence = typeof input.consequence === 'string' ? input.consequence : '';
  return {
    id: typeof input.id === 'string' ? input.id : formatSharedRiskSequence(1),
    referenceCode: typeof input.referenceCode === 'string' && input.referenceCode ? input.referenceCode : typeof input.id === 'string' ? input.id : formatSharedRiskSequence(1),
    title: typeof input.title === 'string' ? input.title : 'Untitled Shared Risk',
    statement:
      typeof input.statement === 'string' && input.statement.trim()
        ? normalizeRiskStatement(input.statement)
        : buildRiskStatement(trigger, consequence),
    trigger,
    consequence,
    status:
      input.status === 'Pending' ||
      input.status === 'Active' ||
      input.status === 'Monitoring' ||
      input.status === 'Rejected' ||
      input.status === 'Closed' ||
      input.status === 'Converted to Issue'
        ? input.status
        : 'Pending',
    owner: typeof input.owner === 'string' ? input.owner : '',
    upstreamLikelihood: typeof input.upstreamLikelihood === 'number' ? input.upstreamLikelihood : 3,
    upstreamImpact: typeof input.upstreamImpact === 'number' ? input.upstreamImpact : 3,
    responseSummary: typeof input.responseSummary === 'string' ? input.responseSummary : '',
    sourceImpactScore: typeof input.sourceImpactScore === 'number' ? input.sourceImpactScore : 3,
    sourceOriginRiskKey:
      typeof input.sourceOriginRiskKey === 'string' && input.sourceOriginRiskKey
        ? input.sourceOriginRiskKey
        : `legacy-risk-${typeof input.referenceCode === 'string' ? input.referenceCode : typeof input.id === 'string' ? input.id : '1'}`,
    sharedImpactProfile:
      input.sharedImpactProfile &&
      typeof input.sharedImpactProfile === 'object' &&
      (input.sharedImpactProfile.basis === 'schedule' || input.sharedImpactProfile.basis === 'cost') &&
      typeof input.sharedImpactProfile.sourceScore === 'number'
        ? {
            basis: input.sharedImpactProfile.basis,
            min: typeof input.sharedImpactProfile.min === 'number' ? input.sharedImpactProfile.min : 0,
            max: parseOptionalNumber(input.sharedImpactProfile.max),
            sourceScore: input.sharedImpactProfile.sourceScore,
          }
        : undefined,
    versionNumber: typeof input.versionNumber === 'number' && input.versionNumber > 0 ? input.versionNumber : 1,
    createdAt: typeof input.createdAt === 'string' ? input.createdAt : typeof input.updatedAt === 'string' ? input.updatedAt : new Date().toISOString(),
    updatedAt: typeof input.updatedAt === 'string' ? input.updatedAt : new Date().toISOString(),
    sharedAt: typeof input.sharedAt === 'string' ? input.sharedAt : typeof input.updatedAt === 'string' ? input.updatedAt : new Date().toISOString(),
    sourceProjectId: typeof input.sourceProjectId === 'string' ? input.sourceProjectId : '',
    isArchived: typeof input.isArchived === 'boolean' ? input.isArchived : false,
    lastChangeSummary: Array.isArray(input.lastChangeSummary)
      ? input.lastChangeSummary.filter((entry): entry is string => typeof entry === 'string')
      : [],
    history: Array.isArray(input.history)
      ? input.history
          .map((entry) =>
            entry && typeof entry === 'object'
              ? {
                  label: typeof entry.label === 'string' ? entry.label : 'Updated',
                  meta: normalizeHistoryMeta(typeof entry.meta === 'string' ? entry.meta : undefined),
                  at: typeof entry.at === 'string' ? entry.at : undefined,
                }
              : null,
          )
          .filter(Boolean) as HistoryEntry[]
      : [],
  };
}

function normalizeSharedRiskSubscriptionRecord(
  input: Partial<SharedRiskSubscription> & Record<string, unknown>,
): SharedRiskSubscription {
  return {
    id: typeof input.id === 'string' ? input.id : formatSharedRiskSubscriptionSequence(1),
    sharedRiskId: typeof input.sharedRiskId === 'string' ? input.sharedRiskId : '',
    projectId: typeof input.projectId === 'string' ? input.projectId : '',
    state:
      input.state === 'watching' ||
      input.state === 'linked' ||
      input.state === 'review_required' ||
      input.state === 'not_applicable'
        ? input.state
        : 'watching',
    createdAt: typeof input.createdAt === 'string' ? input.createdAt : new Date().toISOString(),
    updatedAt: typeof input.updatedAt === 'string' ? input.updatedAt : new Date().toISOString(),
    lastSeenSharedRiskVersion:
      typeof input.lastSeenSharedRiskVersion === 'number' && input.lastSeenSharedRiskVersion > 0
        ? input.lastSeenSharedRiskVersion
        : 1,
    lastReviewedSharedRiskVersion:
      typeof input.lastReviewedSharedRiskVersion === 'number' ? input.lastReviewedSharedRiskVersion : null,
    lastReviewedAt: typeof input.lastReviewedAt === 'string' ? input.lastReviewedAt : '',
    reviewedByName: typeof input.reviewedByName === 'string' ? input.reviewedByName : '',
    reviewComment: typeof input.reviewComment === 'string' ? input.reviewComment : '',
    linkedLocalRiskId: typeof input.linkedLocalRiskId === 'string' && input.linkedLocalRiskId ? input.linkedLocalRiskId : null,
  };
}

function normalizeSharedDecisionRecord(input: Partial<SharedDecision> & Record<string, unknown>): SharedDecision {
  return {
    id: typeof input.id === 'string' ? input.id : formatSharedDecisionSequence(1),
    title: typeof input.title === 'string' ? input.title : 'Untitled Shared Decision',
    context: typeof input.context === 'string' ? input.context : '',
    decisionDrivers: Array.isArray(input.decisionDrivers)
      ? input.decisionDrivers.filter((item): item is string => typeof item === 'string')
      : [],
    consideredOptions: Array.isArray(input.consideredOptions)
      ? input.consideredOptions.filter((item): item is string => typeof item === 'string')
      : [],
    outcome: typeof input.outcome === 'string' ? input.outcome : '',
    goodConsequences: Array.isArray(input.goodConsequences)
      ? input.goodConsequences.filter((item): item is string => typeof item === 'string')
      : [],
    badConsequences: Array.isArray(input.badConsequences)
      ? input.badConsequences.filter((item): item is string => typeof item === 'string')
      : [],
    moreInfo: typeof input.moreInfo === 'string' ? input.moreInfo : '',
    updatedAt: typeof input.updatedAt === 'string' ? input.updatedAt : new Date().toISOString(),
    sourceProjectId: typeof input.sourceProjectId === 'string' ? input.sourceProjectId : '',
  };
}

function normalizeProjectRecord(input: Project, context: RecordNormalizationContext = {}): Project {
  return {
    ...input,
    projectKey:
      typeof input.projectKey === 'string' && input.projectKey
        ? sanitizeProjectKey(input.projectKey)
        : deriveProjectKey(input.name, input.id),
    risks: Array.isArray(input.risks)
      ? input.risks.map((risk) =>
          normalizeRiskRecord(risk as Partial<Risk> & Record<string, unknown>, {
            ...context,
            projectCreatedAt: typeof input.createdAt === 'string' ? input.createdAt : context.projectCreatedAt,
          }),
        )
      : [],
    decisions: Array.isArray(input.decisions)
      ? input.decisions.map((decision) =>
          normalizeDecisionRecord(decision as Partial<Decision> & Record<string, unknown>),
        )
      : [],
    scoringModel: normalizeScoringModel(input.scoringModel),
  };
}

function reconcileSharedRiskState(
  projects: Project[],
  sharedRisks: SharedRisk[],
  subscriptions: SharedRiskSubscription[],
) {
  const sharedRiskMap = new Map(sharedRisks.map((risk) => [risk.id, risk]));
  const subscriptionMap = new Map<string, SharedRiskSubscription>();
  let nextSubscriptionSequence =
    subscriptions.reduce((highest, subscription) => Math.max(highest, parseSharedRiskSubscriptionSequence(subscription.id) ?? 0), 0) + 1;

  const putSubscription = (subscription: SharedRiskSubscription) => {
    subscriptionMap.set(`${subscription.sharedRiskId}::${subscription.projectId}`, subscription);
  };

  subscriptions.forEach((subscription) => putSubscription(subscription));

  const normalizedProjects = projects.map((project) => ({
    ...project,
    risks: project.risks.map((risk) => {
      if (!risk.sharedRiskId) {
        return risk;
      }

      const sharedRisk = sharedRiskMap.get(risk.sharedRiskId);
      if (!sharedRisk) {
        return {...risk, sharedRiskId: undefined, sharedRiskRole: undefined, sharedParentVersionSeen: null};
      }

      if (project.id === sharedRisk.sourceProjectId) {
        return {
          ...risk,
          sharedRiskRole: 'source' as const,
          sharedParentVersionSeen: sharedRisk.versionNumber,
          sharedReviewStatus: 'current' as const,
        };
      }

      const normalizedRisk = {
        ...risk,
        sharedRiskRole: 'linked' as const,
        sharedParentVersionSeen: risk.sharedParentVersionSeen ?? sharedRisk.versionNumber,
        sharedReviewStatus: risk.sharedReviewStatus ?? 'current',
      };

      const existingSubscription = subscriptionMap.get(`${sharedRisk.id}::${project.id}`);
      const linkedState: SharedRiskSubscriptionState =
        existingSubscription?.state === 'review_required' || existingSubscription?.state === 'not_applicable'
          ? existingSubscription.state
          : 'linked';
      putSubscription(
        normalizeSharedRiskSubscriptionRecord({
          id: existingSubscription?.id ?? formatSharedRiskSubscriptionSequence(nextSubscriptionSequence++),
          sharedRiskId: sharedRisk.id,
          projectId: project.id,
          state: linkedState,
          createdAt: existingSubscription?.createdAt ?? new Date().toISOString(),
          updatedAt: existingSubscription?.updatedAt ?? new Date().toISOString(),
          lastSeenSharedRiskVersion: existingSubscription?.lastSeenSharedRiskVersion ?? sharedRisk.versionNumber,
          lastReviewedSharedRiskVersion:
            existingSubscription?.lastReviewedSharedRiskVersion ?? normalizedRisk.sharedParentVersionSeen ?? sharedRisk.versionNumber,
          lastReviewedAt: existingSubscription?.lastReviewedAt ?? '',
          reviewedByName: existingSubscription?.reviewedByName ?? '',
          reviewComment: existingSubscription?.reviewComment ?? '',
          linkedLocalRiskId: normalizedRisk.id,
        }),
      );

      return normalizedRisk;
    }),
  }));

  const normalizedSharedRisks = sharedRisks.map((sharedRisk) => {
    const sourceProject = normalizedProjects.find((project) => project.id === sharedRisk.sourceProjectId);
    const sourceRisk =
      sourceProject?.risks.find(
        (risk) =>
          risk.sharedRiskId === sharedRisk.id &&
          (risk.originKey === sharedRisk.sourceOriginRiskKey || !sharedRisk.sourceOriginRiskKey),
      ) ?? sourceProject?.risks.find((risk) => risk.sharedRiskId === sharedRisk.id);

    return {
      ...sharedRisk,
      sourceOriginRiskKey: sourceRisk?.originKey ?? sharedRisk.sourceOriginRiskKey,
      referenceCode: sourceRisk?.id ?? sharedRisk.referenceCode,
      upstreamLikelihood: sourceRisk?.likelihood ?? sharedRisk.upstreamLikelihood,
      upstreamImpact: sourceRisk?.impact ?? sharedRisk.upstreamImpact,
      status: sourceRisk?.status ?? sharedRisk.status,
      owner: sourceRisk?.owner ?? sharedRisk.owner,
      responseSummary: sourceRisk?.mitigation ?? sharedRisk.responseSummary,
    };
  });

  return {
    projects: normalizedProjects,
    sharedRisks: normalizedSharedRisks,
    sharedRiskSubscriptions: Array.from(subscriptionMap.values()),
  };
}

function buildAppSnapshot(
  projects: Project[],
  activeProjectId: string,
  sharedRisks: SharedRisk[],
  sharedRiskSubscriptions: SharedRiskSubscription[],
  sharedDecisions: SharedDecision[],
  registryOverrides?: Partial<RegistryMetadata>,
): AppSnapshot {
  const registry = normalizeRegistryMetadata({
    documentId: registryOverrides?.documentId,
    name: registryOverrides?.name,
    revision: registryOverrides?.revision,
    parentRevision: registryOverrides?.parentRevision,
    parentContentHash: registryOverrides?.parentContentHash,
    lastModifiedAt: registryOverrides?.lastModifiedAt,
    lastModifiedBy: registryOverrides?.lastModifiedBy,
    contentHash: '',
  });

  const snapshot: AppSnapshot = {
    version: APP_SNAPSHOT_VERSION,
    exportedAt: new Date().toISOString(),
    registry,
    activeProjectId,
    projects,
    sharedLibrary: {
      risks: sharedRisks,
      riskSubscriptions: sharedRiskSubscriptions,
      decisions: sharedDecisions,
    },
  };

  snapshot.registry = {
    ...registry,
    contentHash: computeSnapshotContentHash(snapshot),
  };

  return snapshot;
}

function parseAppSnapshot(
  source: string,
): AppSnapshot & {sharedLibrary: {risks: SharedRisk[]; decisions: SharedDecision[]; riskSubscriptions: SharedRiskSubscription[]}} {
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

  const snapshotExportedAt = typeof raw.exportedAt === 'string' ? raw.exportedAt : undefined;
  const projects = ensureUniqueProjectKeys(
    raw.projects.map((project) =>
      normalizeProjectRecord(project as Project, {
        snapshotExportedAt,
        projectCreatedAt:
          project && typeof project === 'object' && typeof project.createdAt === 'string' ? project.createdAt : undefined,
      }),
    ),
  );
  const activeProjectId =
    typeof raw.activeProjectId === 'string' && projects.some((project) => project.id === raw.activeProjectId)
      ? raw.activeProjectId
      : projects[0].id;
  const sharedLibrary = {
    risks:
      raw.sharedLibrary && typeof raw.sharedLibrary === 'object' && Array.isArray(raw.sharedLibrary.risks)
        ? raw.sharedLibrary.risks.map((risk) =>
            normalizeSharedRiskRecord(risk as Partial<SharedRisk> & Record<string, unknown>),
          )
        : [],
    riskSubscriptions:
      raw.sharedLibrary && typeof raw.sharedLibrary === 'object' && Array.isArray(raw.sharedLibrary.riskSubscriptions)
        ? raw.sharedLibrary.riskSubscriptions.map((subscription) =>
            normalizeSharedRiskSubscriptionRecord(
              subscription as Partial<SharedRiskSubscription> & Record<string, unknown>,
            ),
          )
        : [],
    decisions:
      raw.sharedLibrary && typeof raw.sharedLibrary === 'object' && Array.isArray(raw.sharedLibrary.decisions)
        ? raw.sharedLibrary.decisions.map((decision) =>
            normalizeSharedDecisionRecord(decision as Partial<SharedDecision> & Record<string, unknown>),
          )
        : [],
  };
  const normalizedRegistry = raw.registry && typeof raw.registry === 'object'
    ? normalizeRegistryMetadata(raw.registry as Partial<RegistryMetadata> & Record<string, unknown>)
    : normalizeRegistryMetadata({});
  const normalizedSnapshotBase: AppSnapshot = {
    version: typeof raw.version === 'string' ? raw.version : APP_SNAPSHOT_VERSION,
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : new Date().toISOString(),
    registry: {
      ...normalizedRegistry,
      contentHash: '',
    },
    activeProjectId,
    projects,
    sharedLibrary,
  };
  const normalizedContentHash = computeSnapshotContentHash(normalizedSnapshotBase);

  return {
    version: typeof raw.version === 'string' ? raw.version : APP_SNAPSHOT_VERSION,
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : new Date().toISOString(),
    registry: {
      ...normalizedRegistry,
      contentHash: normalizedContentHash,
    },
    activeProjectId,
    projects,
    sharedLibrary,
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

function getLocalFileTimestamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours24 = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const meridiem = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  const hourToken = String(hours12).padStart(2, '0');

  return `${year}${month}${day}_${hourToken}${minutes}${seconds}${meridiem}`;
}

function getLocalFileDateStamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
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
        scheduleMinMonths: parseOptionalNumber(entry.scheduleMinMonths),
        scheduleMaxMonths: parseOptionalNumber(entry.scheduleMaxMonths),
        costMinAmount: parseOptionalNumber(entry.costMinAmount),
        costMaxAmount: parseOptionalNumber(entry.costMaxAmount),
      })),
      impact: parsed.impact.map((entry, index) => ({
        value: index + 1,
        label: entry.label ?? defaultRiskScoringModel.impact[index].label,
        description: entry.description ?? defaultRiskScoringModel.impact[index].description,
        scheduleMinMonths: parseOptionalNumber(entry.scheduleMinMonths),
        scheduleMaxMonths: parseOptionalNumber(entry.scheduleMaxMonths),
        costMinAmount: parseOptionalNumber(entry.costMinAmount),
        costMaxAmount: parseOptionalNumber(entry.costMaxAmount),
      })),
    };
  } catch {
    return defaultRiskScoringModel;
  }
}

function loadSharedRisks() {
  if (typeof window === 'undefined') return [] as SharedRisk[];
  try {
    const stored = window.localStorage.getItem(SHARED_RISKS_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as SharedRisk[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((risk) => normalizeSharedRiskRecord(risk as Partial<SharedRisk> & Record<string, unknown>));
  } catch {
    return [];
  }
}

function loadSharedRiskSubscriptions() {
  if (typeof window === 'undefined') return [] as SharedRiskSubscription[];
  try {
    const stored = window.localStorage.getItem(SHARED_RISK_SUBSCRIPTIONS_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as SharedRiskSubscription[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((subscription) =>
      normalizeSharedRiskSubscriptionRecord(subscription as Partial<SharedRiskSubscription> & Record<string, unknown>),
    );
  } catch {
    return [];
  }
}

function loadSharedDecisions() {
  if (typeof window === 'undefined') return [] as SharedDecision[];
  try {
    const stored = window.localStorage.getItem(SHARED_DECISIONS_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as SharedDecision[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((decision) =>
      normalizeSharedDecisionRecord(decision as Partial<SharedDecision> & Record<string, unknown>),
    );
  } catch {
    return [];
  }
}

function loadProjects(): Project[] {
  if (typeof window === 'undefined') return initialProjects;
  try {
    const stored = window.localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (!stored) return initialProjects;
    const parsed = JSON.parse(stored) as Project[];
    if (!Array.isArray(parsed) || parsed.length === 0) return initialProjects;
    return ensureUniqueProjectKeys(parsed.map((p) => normalizeProjectRecord(p)));
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

function scoringModelsMatch(left: RiskScoringModel, right: RiskScoringModel) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function toScoreSelectOptions(definitions: ScoreDefinition[]): SelectOption[] {
  return definitions.map((definition) => ({
    value: String(definition.value),
    label: `${definition.value} - ${definition.label}`,
    description: [
      definition.description,
      definition.scheduleMinMonths != null || definition.scheduleMaxMonths != null
        ? `Schedule Impact: ${formatImpactRange(definition.scheduleMinMonths, definition.scheduleMaxMonths, 'months')}`
        : '',
      definition.costMinAmount != null || definition.costMaxAmount != null
        ? `Cost Impact: ${formatImpactRange(definition.costMinAmount, definition.costMaxAmount, '', '$')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n'),
  }));
}

function renderSelectDescription(description: string) {
  return description.split('\n').filter(Boolean).map((line, index) => {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex > 0) {
      const label = line.slice(0, separatorIndex);
      const remainder = line.slice(separatorIndex + 1).trim();
      return (
        <div key={`${line}-${index}`}>
          <strong className="font-semibold text-on-surface">{label}:</strong>{' '}
          <span>{remainder}</span>
        </div>
      );
    }

    return <div key={`${line}-${index}`}>{line}</div>;
  });
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
  const initialProjectsState = initialProjects;
  const initialSharedRisksState: SharedRisk[] = [];
  const initialSharedRiskSubscriptionsState: SharedRiskSubscription[] = [];
  const initialReconciledState = reconcileSharedRiskState(
    initialProjectsState,
    initialSharedRisksState,
    initialSharedRiskSubscriptionsState,
  );

  const [projects, setProjects] = useState<Project[]>(() => initialReconciledState.projects);
  const [sharedRisks, setSharedRisks] = useState<SharedRisk[]>(() => initialReconciledState.sharedRisks);
  const [sharedRiskSubscriptions, setSharedRiskSubscriptions] = useState<SharedRiskSubscription[]>(
    () => initialReconciledState.sharedRiskSubscriptions,
  );
  const [sharedDecisions, setSharedDecisions] = useState<SharedDecision[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>(() => initialReconciledState.projects[0].id);
  const [view, setView] = useState<View>('snapshot');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sharedRiskDrawerOpen, setSharedRiskDrawerOpen] = useState(false);
  const [createRiskOpen, setCreateRiskOpen] = useState(false);
  const [createDecisionOpen, setCreateDecisionOpen] = useState(false);
  const [readOnlyExportOpen, setReadOnlyExportOpen] = useState(false);
  const [readOnlyExportProjectIds, setReadOnlyExportProjectIds] = useState<string[]>([]);
  const [readOnlyExportContentMode, setReadOnlyExportContentMode] = useState<ReadOnlyExportContentMode>('both');
  const [editorName, setEditorName] = useState<string>(() => loadEditorName());
  const [registrySession, setRegistrySession] = useState<RegistrySession>(() => ({
    sourceLabel: 'Local browser draft',
    sourceFileName: '',
    registryName: 'Governance Register',
    baseDocumentId: null,
    baseRevision: null,
    baseContentHash: null,
    loadedAt: null,
    lastPublishedAt: null,
    lastPublishedRevision: null,
    status: 'no_registry_loaded',
    lastError: '',
  }));
  const [recoveryDraft, setRecoveryDraft] = useState<RecoveryDraft | null>(() => loadRecoveryDraft());

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? projects[0];
  const riskRecords = activeProject.risks;
  const decisions = activeProject.decisions;
  const [selectedRiskId, setSelectedRiskId] = useState<string>(() => riskRecords[0]?.id ?? '');
  const [selectedSharedRiskId, setSelectedSharedRiskId] = useState<string>('');
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
  const nextSharedRiskSequence =
    sharedRisks.reduce((highest, risk) => Math.max(highest, parseSharedRiskSequence(risk.id) ?? 0), 0) + 1;
  const nextSharedRiskSubscriptionSequence =
    sharedRiskSubscriptions.reduce(
      (highest, subscription) => Math.max(highest, parseSharedRiskSubscriptionSequence(subscription.id) ?? 0),
      0,
    ) + 1;
  const nextSharedDecisionSequence =
    sharedDecisions.reduce((highest, decision) => Math.max(highest, parseSharedDecisionSequence(decision.id) ?? 0), 0) + 1;

  const selectedRisk = riskRecords.find((risk) => risk.id === selectedRiskId) ?? riskRecords[0] ?? null;
  const activeProjectSharedRiskSubscriptions = sharedRiskSubscriptions.filter(
    (subscription) => subscription.projectId === activeProject.id,
  );
  const selectedSharedRiskSubscription =
    activeProjectSharedRiskSubscriptions.find((subscription) => subscription.sharedRiskId === selectedSharedRiskId) ??
    activeProjectSharedRiskSubscriptions[0] ??
    null;
  const selectedSharedRisk =
    (selectedSharedRiskSubscription
      ? sharedRisks.find((sharedRisk) => sharedRisk.id === selectedSharedRiskSubscription.sharedRiskId)
      : null) ?? null;
  const selectedDecision = decisions.find((d) => d.id === selectedDecisionId) ?? decisions[0] ?? null;
  const boardLoaded = Boolean(registrySession.baseDocumentId);
  const workingSnapshot = buildAppSnapshot(
    projects,
    activeProjectId,
    sharedRisks,
    sharedRiskSubscriptions,
    sharedDecisions,
    {
      documentId: registrySession.baseDocumentId ?? recoveryDraft?.snapshot.registry?.documentId,
      name:
        registrySession.registryName ||
        recoveryDraft?.snapshot.registry?.name ||
        'Governance Register',
      revision: registrySession.baseRevision ?? recoveryDraft?.snapshot.registry?.revision ?? 1,
      parentRevision: recoveryDraft?.snapshot.registry?.parentRevision ?? null,
      parentContentHash: recoveryDraft?.snapshot.registry?.parentContentHash ?? null,
      lastModifiedAt: registrySession.lastPublishedAt ?? registrySession.loadedAt ?? new Date().toISOString(),
      lastModifiedBy: 'Browser workspace',
    },
  );
  const hasUnsavedChanges =
    Boolean(registrySession.baseContentHash) && workingSnapshot.registry?.contentHash !== registrySession.baseContentHash;
  const shouldWarnBeforeUnload = hasUnsavedChanges || createRiskOpen || createDecisionOpen;

  useEffect(() => {
    window.localStorage.removeItem(PROJECTS_STORAGE_KEY);
    window.localStorage.removeItem(ACTIVE_PROJECT_ID_KEY);
    window.localStorage.removeItem(SHARED_RISKS_STORAGE_KEY);
    window.localStorage.removeItem(SHARED_RISK_SUBSCRIPTIONS_STORAGE_KEY);
    window.localStorage.removeItem(SHARED_DECISIONS_STORAGE_KEY);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(EDITOR_NAME_STORAGE_KEY, editorName);
  }, [editorName]);

  useEffect(() => {
    setRegistrySession((current) => {
      const nextStatus =
        current.baseDocumentId
          ? hasUnsavedChanges
            ? 'master_loaded_dirty'
            : 'master_loaded_clean'
          : recoveryDraft
            ? 'recovery_draft_available'
            : 'no_registry_loaded';

      if (current.status === nextStatus) {
        return current;
      }

      return {
        ...current,
        status: nextStatus,
      };
    });
  }, [hasUnsavedChanges, recoveryDraft]);

  useEffect(() => {
    if (!boardLoaded && view !== 'snapshot') {
      setView('snapshot');
    }
  }, [boardLoaded, view]);

  useEffect(() => {
    const draftSnapshot = buildAppSnapshot(
      projects,
      activeProjectId,
      sharedRisks,
      sharedRiskSubscriptions,
      sharedDecisions,
      {
        documentId: registrySession.baseDocumentId ?? workingSnapshot.registry?.documentId,
        name: registrySession.registryName || workingSnapshot.registry?.name || 'Governance Register',
        revision: registrySession.baseRevision ?? workingSnapshot.registry?.revision ?? 1,
        parentRevision: registrySession.baseRevision,
        parentContentHash: registrySession.baseContentHash,
        lastModifiedAt: new Date().toISOString(),
        lastModifiedBy: 'Browser draft autosave',
      },
    );
    const shouldSaveDraft = Boolean(registrySession.baseDocumentId) || snapshotHasMeaningfulContent(draftSnapshot);
    if (!shouldSaveDraft) {
      window.localStorage.removeItem(REGISTRY_DRAFT_STORAGE_KEY);
      setRecoveryDraft(null);
      return;
    }
    const nextDraft: RecoveryDraft = {
      snapshot: draftSnapshot,
      session: {
        ...registrySession,
        status: hasUnsavedChanges ? 'master_loaded_dirty' : registrySession.status,
      },
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(REGISTRY_DRAFT_STORAGE_KEY, JSON.stringify(nextDraft));
    setRecoveryDraft(nextDraft);
  }, [
    activeProjectId,
    hasUnsavedChanges,
    projects,
    registrySession,
    sharedDecisions,
    sharedRiskSubscriptions,
    sharedRisks,
    workingSnapshot.registry?.documentId,
    workingSnapshot.registry?.name,
    workingSnapshot.registry?.revision,
  ]);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!shouldWarnBeforeUnload) {
        return;
      }

      event.preventDefault();
      event.returnValue = '';
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [shouldWarnBeforeUnload]);

  function applySnapshotToWorkspace(
    snapshot: AppSnapshot,
    sessionOverrides?: Partial<RegistrySession>,
  ) {
    const reconciled = reconcileSharedRiskState(
      snapshot.projects,
      snapshot.sharedLibrary?.risks ?? [],
      snapshot.sharedLibrary?.riskSubscriptions ?? [],
    );
    const nextActiveProject =
      reconciled.projects.find((project) => project.id === snapshot.activeProjectId) ?? reconciled.projects[0];

    setProjects(reconciled.projects);
    setSharedRisks(reconciled.sharedRisks);
    setSharedRiskSubscriptions(reconciled.sharedRiskSubscriptions);
    setSharedDecisions(snapshot.sharedLibrary?.decisions ?? []);
    setActiveProjectId(nextActiveProject.id);
    setSelectedRiskId(nextActiveProject.risks[0]?.id ?? '');
    setSelectedSharedRiskId('');
    setSelectedDecisionId(nextActiveProject.decisions[0]?.id ?? '');
    setDrawerOpen(false);
    setSharedRiskDrawerOpen(false);
    setCreateRiskOpen(false);
    setCreateDecisionOpen(false);
    setRegistrySession({
      sourceLabel: sessionOverrides?.sourceLabel ?? 'Opened master registry',
      sourceFileName: sessionOverrides?.sourceFileName ?? '',
      registryName: sessionOverrides?.registryName ?? snapshot.registry?.name ?? 'Governance Register',
      baseDocumentId: sessionOverrides?.baseDocumentId ?? snapshot.registry?.documentId ?? null,
      baseRevision: sessionOverrides?.baseRevision ?? snapshot.registry?.revision ?? null,
      baseContentHash: sessionOverrides?.baseContentHash ?? snapshot.registry?.contentHash ?? null,
      loadedAt: sessionOverrides?.loadedAt ?? new Date().toISOString(),
      lastPublishedAt: sessionOverrides?.lastPublishedAt ?? null,
      lastPublishedRevision: sessionOverrides?.lastPublishedRevision ?? null,
      status: sessionOverrides?.status ?? 'master_loaded_clean',
      lastError: sessionOverrides?.lastError ?? '',
    });
  }

  function updateActiveProject(updater: (project: Project) => Project) {
    setProjects((prev) => prev.map((p) => (p.id === activeProjectId ? updater(p) : p)));
  }

  function handleSwitchProject(projectId: string) {
    const next = projects.find((p) => p.id === projectId);
    if (!next) return;
    setActiveProjectId(projectId);
    setSelectedRiskId(next.risks[0]?.id ?? '');
    setSelectedSharedRiskId('');
    setSelectedDecisionId(next.decisions[0]?.id ?? '');
    setDrawerOpen(false);
    setSharedRiskDrawerOpen(false);
    setCreateRiskOpen(false);
  }

  function handleCreateProject(name: string, description: string) {
    const baseName = name.trim() || 'Untitled Project';
    const nextProjectKey = ensureUniqueProjectKeys([
      ...projects,
      createBlankProject({
        name: baseName,
        description: description.trim(),
        scoringModel: defaultRiskScoringModel,
      }),
    ]).at(-1)?.projectKey;
    const newProject = createBlankProject({
      name: baseName,
      projectKey: nextProjectKey,
      description: description.trim(),
      scoringModel: defaultRiskScoringModel,
    });
    setProjects((prev) => [...prev, newProject]);
    setActiveProjectId(newProject.id);
    setSelectedRiskId('');
    setSelectedSharedRiskId('');
    setSelectedDecisionId('');
    setDrawerOpen(false);
    setSharedRiskDrawerOpen(false);
    setCreateRiskOpen(false);
  }

  function handleDeleteProject(projectId: string) {
    setProjects((prev) => {
      const remainingProjects = prev.filter((project) => project.id !== projectId);

      if (remainingProjects.length === 0) {
        const replacementProject = createBlankProject({scoringModel: defaultRiskScoringModel});
        setActiveProjectId(replacementProject.id);
        setSelectedRiskId('');
        setSelectedSharedRiskId('');
        setSelectedDecisionId('');
        setDrawerOpen(false);
        setSharedRiskDrawerOpen(false);
        setCreateRiskOpen(false);
        setCreateDecisionOpen(false);
        return [replacementProject];
      }

      if (activeProjectId === projectId) {
        const nextProject = remainingProjects[0];
        setActiveProjectId(nextProject.id);
        setSelectedRiskId(nextProject.risks[0]?.id ?? '');
        setSelectedSharedRiskId('');
        setSelectedDecisionId(nextProject.decisions[0]?.id ?? '');
        setDrawerOpen(false);
        setSharedRiskDrawerOpen(false);
        setCreateRiskOpen(false);
        setCreateDecisionOpen(false);
      }

      return remainingProjects;
    });
  }

  function handleRiskSelect(riskId: string) {
    setSelectedRiskId(riskId);
    setDrawerOpen(true);
    setSharedRiskDrawerOpen(false);
  }

  function handleOpenRiskInProject(projectId: string, riskId: string) {
    const project = projects.find((item) => item.id === projectId);
    if (!project) {
      return;
    }

    setActiveProjectId(projectId);
    setSelectedRiskId(riskId);
    setSelectedSharedRiskId('');
    setSelectedDecisionId(project.decisions[0]?.id ?? '');
    setView('risk');
    setSharedRiskDrawerOpen(false);
    setDrawerOpen(true);
  }

  function handleSharedRiskSelect(sharedRiskId: string) {
    setSelectedSharedRiskId(sharedRiskId);
    setSharedRiskDrawerOpen(true);
    setDrawerOpen(false);
  }

  function handleSelectDecision(decisionId: string) {
    setSelectedDecisionId(decisionId);
    setView('decision');
  }

  function buildSharedRiskFromSourceRisk(sourceRisk: Risk, existingSharedRisk?: SharedRisk | null): SharedRisk {
    const base: SharedRisk =
      existingSharedRisk ?? {
        id: sourceRisk.sharedRiskId ?? formatSharedRiskSequence(nextSharedRiskSequence),
        referenceCode: sourceRisk.id,
        title: sourceRisk.title,
        statement: sourceRisk.statement,
        trigger: sourceRisk.trigger,
        consequence: sourceRisk.consequence,
        status: sourceRisk.status,
        owner: sourceRisk.owner,
        upstreamLikelihood: sourceRisk.likelihood,
        upstreamImpact: sourceRisk.impact,
        responseSummary: sourceRisk.mitigation,
        sourceImpactScore: sourceRisk.impact,
        sourceOriginRiskKey: sourceRisk.originKey,
        sharedImpactProfile:
          getImpactTranslationProfile(
            getScoreDefinition(activeProject.scoringModel.impact, sourceRisk.impact) ??
              activeProject.scoringModel.impact[sourceRisk.impact - 1],
          ) ?? undefined,
        versionNumber: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sharedAt: new Date().toISOString(),
        sourceProjectId: activeProject.id,
        isArchived: false,
        lastChangeSummary: [],
        history: [],
      };

    const nextSharedRisk: SharedRisk = {
      ...base,
      referenceCode: sourceRisk.id,
      title: sourceRisk.title,
      statement: sourceRisk.statement,
      trigger: sourceRisk.trigger,
      consequence: sourceRisk.consequence,
      status: sourceRisk.status,
      owner: sourceRisk.owner,
      upstreamLikelihood: sourceRisk.likelihood,
      upstreamImpact: sourceRisk.impact,
      responseSummary: sourceRisk.mitigation,
      sourceImpactScore: sourceRisk.impact,
      sourceOriginRiskKey: sourceRisk.originKey,
      sharedImpactProfile:
        getImpactTranslationProfile(
          getScoreDefinition(activeProject.scoringModel.impact, sourceRisk.impact) ??
            activeProject.scoringModel.impact[sourceRisk.impact - 1],
        ) ?? undefined,
      updatedAt: new Date().toISOString(),
    };

    const changeSummary = existingSharedRisk ? getSharedRiskChangeSummary(existingSharedRisk, nextSharedRisk) : ['published from source project'];

    if (!existingSharedRisk) {
      return {
        ...nextSharedRisk,
        versionNumber: 1,
        lastChangeSummary: changeSummary,
        history: [createHistoryEntry('Shared risk published', 'Source project')],
      };
    }

    if (changeSummary.length === 0) {
      return existingSharedRisk;
    }

    return {
      ...nextSharedRisk,
      versionNumber: existingSharedRisk.versionNumber + 1,
      lastChangeSummary: changeSummary,
      history: [
        createHistoryEntry(`Shared risk updated to v${existingSharedRisk.versionNumber + 1}`, changeSummary.join(' • ')),
        ...existingSharedRisk.history,
      ],
    };
  }

  function handleUpdateRisk(riskId: string, updates: Partial<Risk>, historyLabel: string) {
    const currentRisk = riskRecords.find((risk) => risk.id === riskId);
    const currentSharedRisk =
      currentRisk?.sharedRiskId ? sharedRisks.find((sharedRisk) => sharedRisk.id === currentRisk.sharedRiskId) ?? null : null;
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

        if (updates.residualLikelihood !== undefined || updates.residualImpact !== undefined) {
          nextRisk.residualRiskRating = getResidualRating(
            nextRisk.residualLikelihood,
            nextRisk.residualImpact,
          ).label;
        }

        return {
          ...nextRisk,
          lastUpdated: new Date().toISOString(),
          history: [createHistoryEntry(historyLabel, 'Local edit'), ...risk.history],
        };
      }),
    }));

    if (!currentRisk || !currentRisk.sharedRiskId || currentRisk.sharedRiskRole !== 'source' || !currentSharedRisk) {
      return;
    }

    const nextRisk = {
      ...currentRisk,
      ...updates,
    };
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
    if (updates.residualLikelihood !== undefined || updates.residualImpact !== undefined) {
      nextRisk.residualRiskRating = getResidualRating(
        nextRisk.residualLikelihood,
        nextRisk.residualImpact,
      ).label;
    }

    const updatedSharedRisk = buildSharedRiskFromSourceRisk(nextRisk, currentSharedRisk);
    if (updatedSharedRisk.versionNumber === currentSharedRisk.versionNumber) {
      return;
    }

    setSharedRisks((current) =>
      current.map((sharedRisk) => (sharedRisk.id === updatedSharedRisk.id ? updatedSharedRisk : sharedRisk)),
    );
    setSharedRiskSubscriptions((current) =>
      current.map((subscription) =>
        subscription.sharedRiskId === updatedSharedRisk.id && subscription.projectId !== activeProject.id
          ? {
              ...subscription,
              state: subscription.state === 'not_applicable' ? 'not_applicable' : 'review_required',
              updatedAt: new Date().toISOString(),
              lastSeenSharedRiskVersion: updatedSharedRisk.versionNumber,
            }
          : subscription,
      ),
    );
    setProjects((current) =>
      current.map((project) => ({
        ...project,
        risks: project.risks.map((risk) =>
          project.id !== activeProject.id &&
          risk.sharedRiskId === updatedSharedRisk.id &&
          risk.sharedRiskRole === 'linked'
            ? {
                ...risk,
                sharedReviewStatus: 'review_required',
                lastUpdated: risk.lastUpdated,
                history: [
                  createHistoryEntry(
                    `Parent shared risk updated to v${updatedSharedRisk.versionNumber}`,
                    updatedSharedRisk.lastChangeSummary.join(' • '),
                  ),
                  ...risk.history,
                ],
              }
            : risk,
        ),
      })),
    );
  }

  function handleDeleteRisk(riskId: string) {
    const currentRisk = riskRecords.find((risk) => risk.id === riskId);
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

    if (currentRisk?.sharedRiskId && currentRisk.sharedRiskRole === 'linked') {
      setSharedRiskSubscriptions((current) =>
        current.map((subscription) =>
          subscription.sharedRiskId === currentRisk.sharedRiskId && subscription.projectId === activeProject.id
            ? {
                ...subscription,
                state: subscription.state === 'not_applicable' ? 'not_applicable' : 'watching',
                linkedLocalRiskId: null,
                updatedAt: new Date().toISOString(),
              }
            : subscription,
        ),
      );
    }
  }

  function handleShareRisk(riskId: string) {
    const localRisk = riskRecords.find((risk) => risk.id === riskId);
    if (!localRisk) {
      return;
    }

    if (localRisk.sharedRiskId) {
      setView('library');
      return;
    }

    const sourceRisk: Risk = {...localRisk, sharedRiskId: formatSharedRiskSequence(nextSharedRiskSequence), sharedRiskRole: 'source'};
    const sharedRisk = buildSharedRiskFromSourceRisk(sourceRisk);

    setSharedRisks((current) => [sharedRisk, ...current]);
    updateActiveProject((project) => ({
      ...project,
      risks: project.risks.map((risk) =>
        risk.id === riskId
          ? {
              ...risk,
              sharedRiskId: sharedRisk.id,
              sharedRiskRole: 'source',
              sharedParentVersionSeen: sharedRisk.versionNumber,
              sharedReviewStatus: 'current',
              history: [createHistoryEntry('Added to shared library', 'Local edit'), ...risk.history],
            }
          : risk,
      ),
    }));
  }

  function handleSubscribeToSharedRisk(sharedRiskId: string) {
    const sharedRisk = sharedRisks.find((risk) => risk.id === sharedRiskId);
    if (!sharedRisk) {
      return;
    }

    if (sharedRisk.sourceProjectId === activeProject.id) {
      setView('risk');
      return;
    }

    const existingSubscription = sharedRiskSubscriptions.find(
      (subscription) => subscription.sharedRiskId === sharedRiskId && subscription.projectId === activeProject.id,
    );
    if (existingSubscription) {
      setView('risk');
      return;
    }

    const nextSubscription = normalizeSharedRiskSubscriptionRecord({
      id: formatSharedRiskSubscriptionSequence(nextSharedRiskSubscriptionSequence),
      sharedRiskId,
      projectId: activeProject.id,
      state: 'watching',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastSeenSharedRiskVersion: sharedRisk.versionNumber,
      lastReviewedSharedRiskVersion: null,
      linkedLocalRiskId: null,
    });
    setSharedRiskSubscriptions((current) => [nextSubscription, ...current]);
    setView('risk');
  }

  function handleCreateLinkedLocalRisk(sharedRiskId: string) {
    setSharedRiskDrawerOpen(false);

    const sharedRisk = sharedRisks.find((risk) => risk.id === sharedRiskId);
    if (!sharedRisk) {
      return;
    }

    const existingLinkedRisk = riskRecords.find(
      (risk) => risk.sharedRiskId === sharedRiskId && risk.sharedRiskRole === 'linked',
    );
    if (existingLinkedRisk) {
      setSelectedRiskId(existingLinkedRisk.id);
      setView('risk');
      setDrawerOpen(true);
      return;
    }

    const translatedImpact =
      mapSharedImpactProfileToLocalScore(activeProject.scoringModel.impact, sharedRisk.sharedImpactProfile) ??
      sharedRisk.sourceImpactScore;
    const residual = getResidualRating(3, translatedImpact);
    const nextRisk: Risk = {
      id: formatRiskSequence(nextRiskSequence),
      originKey: createOriginKey('risk'),
      sharedRiskId,
      sharedRiskRole: 'linked',
      sharedParentVersionSeen: sharedRisk.versionNumber,
      sharedReviewStatus: 'current',
      sharedOverrideRationale: '',
      title: sharedRisk.title,
      statement: sharedRisk.statement,
      trigger: sharedRisk.trigger,
      consequence: sharedRisk.consequence,
      resultingIn: '',
      status: 'Pending',
      severity: residual.severity,
      owner: '',
      likelihood: 3,
      impact: translatedImpact,
      residualRating: residual.label,
      residualLikelihood: 3,
      residualImpact: translatedImpact,
      residualRiskRating: residual.label,
      responseType: 'Mitigate',
      project: activeProject.name,
      lastUpdated: new Date().toISOString(),
      
      dueDate: '',
      mitigation: 'Define the mitigation plan for this shared risk in this project context.',
      mitigationActions: [],
      contingency: '',
      linkedDecision: 'None',
      attachments: 0,
      comments: [],
      legacyCommentCount: 0,
      createdBy: 'Shared library import',
      internalOnly: false,
      history: [
        createHistoryEntry(
          sharedRisk.sharedImpactProfile && translatedImpact !== sharedRisk.sharedImpactProfile.sourceScore
            ? `Linked local risk created from shared risk ${sharedRisk.referenceCode} and suggested impact mapped to local score ${translatedImpact}`
            : `Linked local risk created from shared risk ${sharedRisk.referenceCode}`,
          'Local edit',
        ),
      ],
    };

    const existingSubscription = sharedRiskSubscriptions.find(
      (subscription) => subscription.sharedRiskId === sharedRiskId && subscription.projectId === activeProject.id,
    );
    const nextSubscription = normalizeSharedRiskSubscriptionRecord({
      id: existingSubscription?.id ?? formatSharedRiskSubscriptionSequence(nextSharedRiskSubscriptionSequence),
      sharedRiskId,
      projectId: activeProject.id,
      state: 'linked',
      createdAt: existingSubscription?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastSeenSharedRiskVersion: sharedRisk.versionNumber,
      lastReviewedSharedRiskVersion: sharedRisk.versionNumber,
      lastReviewedAt: new Date().toISOString(),
      reviewComment: existingSubscription?.reviewComment ?? '',
      reviewedByName: existingSubscription?.reviewedByName ?? '',
      linkedLocalRiskId: nextRisk.id,
    });
    setSharedRiskSubscriptions((current) => {
      const others = current.filter(
        (subscription) => !(subscription.sharedRiskId === sharedRiskId && subscription.projectId === activeProject.id),
      );
      return [nextSubscription, ...others];
    });

    updateActiveProject((project) => ({
      ...project,
      risks: [nextRisk, ...project.risks],
    }));
    setSelectedRiskId(nextRisk.id);
    setView('risk');
    setDrawerOpen(true);
  }

  function handleAcknowledgeSharedRiskReview(sharedRiskId: string, comment: string) {
    const sharedRisk = sharedRisks.find((risk) => risk.id === sharedRiskId);
    const currentSubscription = sharedRiskSubscriptions.find(
      (subscription) => subscription.sharedRiskId === sharedRiskId && subscription.projectId === activeProject.id,
    );
    if (!sharedRisk || !comment.trim() || !currentSubscription) {
      return;
    }
    const fromVersion =
      currentSubscription.lastReviewedSharedRiskVersion ??
      (currentSubscription.lastSeenSharedRiskVersion > 1 ? currentSubscription.lastSeenSharedRiskVersion - 1 : 1);

    setSharedRiskSubscriptions((current) =>
      current.map((subscription) =>
        subscription.sharedRiskId === sharedRiskId && subscription.projectId === activeProject.id
          ? {
              ...subscription,
              state: subscription.linkedLocalRiskId ? 'linked' : 'watching',
              updatedAt: new Date().toISOString(),
              lastSeenSharedRiskVersion: sharedRisk.versionNumber,
              lastReviewedSharedRiskVersion: sharedRisk.versionNumber,
              lastReviewedAt: new Date().toISOString(),
              reviewComment: comment.trim(),
            }
          : subscription,
      ),
    );
    updateActiveProject((project) => ({
      ...project,
      risks: project.risks.map((risk) =>
        risk.sharedRiskId === sharedRiskId && risk.sharedRiskRole === 'linked'
          ? {
              ...risk,
              sharedParentVersionSeen: sharedRisk.versionNumber,
              sharedReviewStatus: 'reviewed_no_change',
              history: [
                createHistoryEntry(
                  `Reviewed parent shared risk change v${fromVersion} -> v${sharedRisk.versionNumber}`,
                  `Comment: ${comment.trim()}`,
                ),
                ...risk.history,
              ],
            }
          : risk,
      ),
    }));
  }

  function handleMarkSharedRiskNotApplicable(sharedRiskId: string) {
    const sharedRisk = sharedRisks.find((risk) => risk.id === sharedRiskId);
    if (!sharedRisk) {
      return;
    }

    setSharedRiskSubscriptions((current) =>
      current.map((subscription) =>
        subscription.sharedRiskId === sharedRiskId && subscription.projectId === activeProject.id
          ? {
              ...subscription,
              state: 'not_applicable',
              updatedAt: new Date().toISOString(),
              lastSeenSharedRiskVersion: sharedRisk.versionNumber,
            }
          : subscription,
        ),
    );
  }

  function handleUnshareRisk(riskId: string) {
    const localRisk = riskRecords.find((risk) => risk.id === riskId);
    if (!localRisk?.sharedRiskId) {
      return;
    }

    const sharedRiskId = localRisk.sharedRiskId;

    if (localRisk.sharedRiskRole === 'source') {
      const linkedRisks = projects.flatMap((project) =>
        project.risks
          .filter((risk) => risk.sharedRiskId === sharedRiskId && risk.sharedRiskRole === 'linked')
          .map((risk) => ({
            projectName: project.name,
            scopedId: formatProjectScopedId(project.projectKey, risk.id),
            title: risk.title,
          })),
      );

      if (linkedRisks.length > 0) {
        const listedRisks = linkedRisks
          .slice(0, 12)
          .map((risk) => `- ${risk.projectName}: ${risk.scopedId} - ${risk.title}`)
          .join('\n');
        const overflowNotice =
          linkedRisks.length > 12 ? `\n...and ${linkedRisks.length - 12} more linked risk(s).` : '';
        const confirmed = window.confirm(
          `Unsharing this source risk will detach ${linkedRisks.length} linked risk(s):\n\n${listedRisks}${overflowNotice}\n\nContinue?`,
        );
        if (!confirmed) {
          return;
        }
      }

      setSharedRisks((current) => current.filter((sharedRisk) => sharedRisk.id !== sharedRiskId));
      setSharedRiskSubscriptions((current) =>
        current.filter((subscription) => subscription.sharedRiskId !== sharedRiskId),
      );
      setProjects((current) =>
        current.map((project) => ({
          ...project,
          risks: project.risks.map((risk) =>
            risk.sharedRiskId === sharedRiskId
              ? {
                  ...risk,
                  sharedRiskId: undefined,
                  sharedRiskRole: undefined,
                  sharedParentVersionSeen: null,
                  sharedReviewStatus: undefined,
                  sharedOverrideRationale: '',
                }
              : risk,
          ),
        })),
      );
      return;
    }

    updateActiveProject((project) => ({
      ...project,
      risks: project.risks.map((risk) =>
        risk.id === riskId
          ? {
              ...risk,
              sharedRiskId: undefined,
              sharedRiskRole: undefined,
              sharedParentVersionSeen: null,
              sharedReviewStatus: undefined,
              sharedOverrideRationale: '',
            }
          : risk,
      ),
    }));
    setSharedRiskSubscriptions((current) =>
      current.filter(
        (subscription) =>
          !(subscription.sharedRiskId === sharedRiskId && subscription.projectId === activeProject.id),
      ),
    );
  }

  function handleRenameRisk(riskId: string, nextRiskId: string) {
    const normalizedNextId = sanitizeRiskId(nextRiskId);
    if (!normalizedNextId || normalizedNextId === riskId) {
      return;
    }

    const currentRisk = riskRecords.find((risk) => risk.id === riskId);

    updateActiveProject((project) => ({
      ...project,
      risks: project.risks.map((risk) =>
        risk.id === riskId
          ? {
              ...risk,
              id: normalizedNextId,
              lastUpdated: new Date().toISOString(),
              history: [
                createHistoryEntry(`Risk ID updated (${riskId} -> ${normalizedNextId})`, 'Local edit'),
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

    if (currentRisk?.sharedRiskId && currentRisk.sharedRiskRole === 'source') {
      setSharedRisks((current) =>
        current.map((sharedRisk) =>
          sharedRisk.id === currentRisk.sharedRiskId ? {...sharedRisk, referenceCode: normalizedNextId} : sharedRisk,
        ),
      );
    }

    if (currentRisk?.sharedRiskId && currentRisk.sharedRiskRole === 'linked') {
      setSharedRiskSubscriptions((current) =>
        current.map((subscription) =>
          subscription.sharedRiskId === currentRisk.sharedRiskId && subscription.projectId === activeProject.id
            ? {...subscription, linkedLocalRiskId: normalizedNextId, updatedAt: new Date().toISOString()}
            : subscription,
        ),
      );
    }
  }

  function handleCreateRisk(input: {
    id: string;
    title: string;
    owner: string;
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
      originKey: createOriginKey('risk'),
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
      residualLikelihood: input.likelihood,
      residualImpact: input.impact,
      residualRiskRating: residual.label,
      responseType: input.responseType,
      project: activeProject.name,
      lastUpdated: new Date().toISOString(),
      dueDate: input.dueDate,
      mitigation:
        residual.severity === 'Low'
          ? 'Mitigation plans are not required for low risks. Contingency planning is not applicable at this risk level.'
          : 'Define the mitigation plan for this risk.',
      mitigationActions: [],
      contingency: '',
      linkedDecision: input.linkedDecision,
      attachments: 0,
      comments: [],
      legacyCommentCount: 0,
      createdBy: 'Local edit',
      internalOnly: false,
      history: [createHistoryEntry('Risk created', 'Local edit')],
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
    deciderRoles: string;
    date: string;
    context: string;
    decisionDrivers: string[];
    consideredOptions: string[];
    outcome: string;
    goodConsequences: string[];
    badConsequences: string[];
  }) {
    const nowIso = new Date().toISOString();
    const next: Decision = buildDecisionRecord({
      id: input.id.trim(),
      title: input.title.trim(),
      summary: '',
      status: input.status,
      deciders: input.deciders.trim(),
      deciderRoles: input.deciderRoles.trim(),
      date: input.date.trim(),
      createdAt: nowIso,
      updatedAt: nowIso,
      statusUpdatedAt: nowIso,
      approvedAt: input.status === 'Approved' ? nowIso : '',
      statusLocked: input.status === 'Approved',
      context: input.context.trim(),
      linkedRisks: [],
      decisionDrivers: input.decisionDrivers,
      consideredOptions: input.consideredOptions,
      outcome: input.outcome.trim(),
      goodConsequences: input.goodConsequences,
      badConsequences: input.badConsequences,
      moreInfo: '',
      approvalChain: [],
    });
    updateActiveProject((project) => ({
      ...project,
      decisions: [next, ...project.decisions],
    }));
    setSelectedDecisionId(next.id);
    setCreateDecisionOpen(false);
  }

  function handleShareDecision(decisionId: string) {
    const localDecision = decisions.find((decision) => decision.id === decisionId);
    if (!localDecision) {
      return;
    }

    if (localDecision.sharedDecisionId) {
      setView('library');
      return;
    }

    const sharedDecisionId = formatSharedDecisionSequence(nextSharedDecisionSequence);
    const sharedDecision: SharedDecision = {
      id: sharedDecisionId,
      title: localDecision.title,
      context: localDecision.context,
      decisionDrivers: localDecision.decisionDrivers,
      consideredOptions: localDecision.consideredOptions,
      outcome: localDecision.outcome,
      goodConsequences: localDecision.goodConsequences,
      badConsequences: localDecision.badConsequences,
      moreInfo: localDecision.moreInfo,
      updatedAt: new Date().toISOString(),
      sourceProjectId: activeProject.id,
    };

    setSharedDecisions((current) => [sharedDecision, ...current]);
    updateActiveProject((project) => ({
      ...project,
      decisions: project.decisions.map((decision) =>
        decision.id === decisionId ? {...decision, sharedDecisionId} : decision,
      ),
    }));
  }

  function handleUnshareDecision(decisionId: string) {
    const localDecision = decisions.find((decision) => decision.id === decisionId);
    if (!localDecision?.sharedDecisionId) {
      return;
    }

    const sharedDecisionId = localDecision.sharedDecisionId;
    const isSourceProjectDecision = sharedDecisions.some(
      (sharedDecision) => sharedDecision.id === sharedDecisionId && sharedDecision.sourceProjectId === activeProject.id,
    );

    if (isSourceProjectDecision) {
      setSharedDecisions((current) => current.filter((decision) => decision.id !== sharedDecisionId));
      setProjects((current) =>
        current.map((project) => ({
          ...project,
          decisions: project.decisions.map((decision) =>
            decision.sharedDecisionId === sharedDecisionId ? {...decision, sharedDecisionId: undefined} : decision,
          ),
        })),
      );
      return;
    }

    handleUpdateDecision(decisionId, {sharedDecisionId: undefined});
  }

  function handlePublishDecisionToLibrary(decisionId: string) {
    const localDecision = decisions.find((decision) => decision.id === decisionId);
    if (!localDecision?.sharedDecisionId) {
      return;
    }

    const updatedSharedDecision: SharedDecision = {
      id: localDecision.sharedDecisionId,
      title: localDecision.title,
      context: localDecision.context,
      decisionDrivers: localDecision.decisionDrivers,
      consideredOptions: localDecision.consideredOptions,
      outcome: localDecision.outcome,
      goodConsequences: localDecision.goodConsequences,
      badConsequences: localDecision.badConsequences,
      moreInfo: localDecision.moreInfo,
      updatedAt: new Date().toISOString(),
      sourceProjectId: activeProject.id,
    };

    setSharedDecisions((current) =>
      current.map((decision) => (decision.id === updatedSharedDecision.id ? updatedSharedDecision : decision)),
    );
    setProjects((current) =>
      current.map((project) => ({
        ...project,
        decisions: project.decisions.map((decision) =>
          decision.sharedDecisionId === updatedSharedDecision.id
            ? {
                ...decision,
                title: updatedSharedDecision.title,
                context: updatedSharedDecision.context,
                decisionDrivers: updatedSharedDecision.decisionDrivers,
                consideredOptions: updatedSharedDecision.consideredOptions,
                outcome: updatedSharedDecision.outcome,
                goodConsequences: updatedSharedDecision.goodConsequences,
                badConsequences: updatedSharedDecision.badConsequences,
                moreInfo: updatedSharedDecision.moreInfo,
              }
            : decision,
        ),
      })),
    );
  }

  function handleRefreshDecisionFromLibrary(decisionId: string) {
    const localDecision = decisions.find((decision) => decision.id === decisionId);
    if (!localDecision?.sharedDecisionId) {
      return;
    }

    const sharedDecision = sharedDecisions.find((item) => item.id === localDecision.sharedDecisionId);
    if (!sharedDecision) {
      return;
    }

    handleUpdateDecision(decisionId, {
      title: sharedDecision.title,
      context: sharedDecision.context,
      decisionDrivers: sharedDecision.decisionDrivers,
      consideredOptions: sharedDecision.consideredOptions,
      outcome: sharedDecision.outcome,
      goodConsequences: sharedDecision.goodConsequences,
      badConsequences: sharedDecision.badConsequences,
      moreInfo: sharedDecision.moreInfo,
    });
  }

  function handleAddSharedDecisionToActiveProject(sharedDecisionId: string) {
    const sharedDecision = sharedDecisions.find((decision) => decision.id === sharedDecisionId);
    if (!sharedDecision) {
      return;
    }

    const alreadyLinked = decisions.some((decision) => decision.sharedDecisionId === sharedDecisionId);
    if (alreadyLinked) {
      setView('decision');
      return;
    }

    const nowIso = new Date().toISOString();
    const next: Decision = buildDecisionRecord({
      id: formatDecisionSequence(nextDecisionSequence),
      sharedDecisionId,
      title: sharedDecision.title,
      summary: '',
      status: 'Proposed',
      deciders: '',
      deciderRoles: '',
      date: new Date().toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'}),
      createdAt: nowIso,
      updatedAt: nowIso,
      statusUpdatedAt: nowIso,
      approvedAt: '',
      statusLocked: false,
      linkedRisks: [],
      context: sharedDecision.context,
      decisionDrivers: sharedDecision.decisionDrivers,
      consideredOptions: sharedDecision.consideredOptions,
      outcome: sharedDecision.outcome,
      goodConsequences: sharedDecision.goodConsequences,
      badConsequences: sharedDecision.badConsequences,
      moreInfo: sharedDecision.moreInfo,
      approvalChain: [],
    });

    updateActiveProject((project) => ({
      ...project,
      decisions: [next, ...project.decisions],
    }));
    setSelectedDecisionId(next.id);
    setView('decision');
  }

  function handleUpdateDecision(decisionId: string, updates: Partial<Decision>) {
    updateActiveProject((project) => ({
      ...project,
      decisions: project.decisions.map((d) => (d.id === decisionId ? applyDecisionUpdates(d, updates) : d)),
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

  function downloadSnapshot(snapshot: AppSnapshot, fileName?: string) {
    const json = JSON.stringify(snapshot, null, 2);
    downloadTextFile(
      json,
      fileName ?? `risk-decision-register-snapshot-${getLocalFileDateStamp()}.json`,
      'application/json',
    );
  }

  function downloadTextFile(contents: string, fileName: string, mimeType: string) {
    const blob = new Blob([contents], {type: mimeType});
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  function handleOpenMasterSnapshot(source: string, fileName: string) {
    const snapshot = parseAppSnapshot(source);
    applySnapshotToWorkspace(snapshot, {
      sourceLabel: 'Master registry',
      sourceFileName: fileName,
      registryName: snapshot.registry?.name ?? fileName.replace(/\.json$/i, '') ?? 'Governance Register',
      baseDocumentId: snapshot.registry?.documentId ?? null,
      baseRevision: snapshot.registry?.revision ?? null,
      baseContentHash: snapshot.registry?.contentHash ?? null,
      loadedAt: new Date().toISOString(),
      status: 'master_loaded_clean',
      lastError: '',
    });
    return `Opened master registry ${fileName} at revision v${snapshot.registry?.revision ?? 1}.`;
  }

  function handleStartNewBoard() {
    const confirmationMessage = boardLoaded
      ? hasUnsavedChanges
        ? 'Starting a new board will leave the current board and any unpublished changes. Continue?'
        : 'Start a new board and leave the current board?'
      : 'Start a new blank board?';

    if (!window.confirm(confirmationMessage)) {
      return;
    }

    const blankProject = createBlankProject({
      id: 'proj-new-board',
      name: 'New Project',
      description: 'Blank workspace ready for your first risk and decision records.',
      scoringModel: defaultRiskScoringModel,
    });
    const blankSnapshot = buildAppSnapshot([blankProject], blankProject.id, [], [], [], {
      documentId: createRegistryDocumentId(),
      name: 'New Board',
      revision: 0,
      parentRevision: null,
      parentContentHash: null,
      lastModifiedAt: new Date().toISOString(),
      lastModifiedBy: editorName.trim() || 'Browser workspace',
    });

    applySnapshotToWorkspace(blankSnapshot, {
      sourceLabel: 'New board',
      sourceFileName: '',
      registryName: 'New Board',
      baseDocumentId: blankSnapshot.registry?.documentId ?? null,
      baseRevision: 0,
      baseContentHash: blankSnapshot.registry?.contentHash ?? null,
      loadedAt: new Date().toISOString(),
      status: 'master_loaded_clean',
      lastError: '',
    });
    setView('risk');
  }

  function handleRestoreRecoveryDraft() {
    if (!recoveryDraft) {
      return 'No recovery draft is available.';
    }

    applySnapshotToWorkspace(recoveryDraft.snapshot, {
      ...recoveryDraft.session,
      status: recoveryDraft.session.baseDocumentId ? 'master_loaded_dirty' : 'recovery_draft_available',
      lastError: '',
    });
    return `Restored recovery draft saved ${formatHistoryTimestamp(recoveryDraft.savedAt)}.`;
  }

  function handleDiscardRecoveryDraft() {
    window.localStorage.removeItem(REGISTRY_DRAFT_STORAGE_KEY);
    setRecoveryDraft(null);
    setRegistrySession((current) => ({
      ...current,
      status: current.baseDocumentId ? (hasUnsavedChanges ? 'master_loaded_dirty' : 'master_loaded_clean') : 'no_registry_loaded',
      lastError: '',
    }));
    return 'Recovery draft discarded from this browser.';
  }

  function handleExportRecoveryDraft() {
    if (!recoveryDraft) {
      return 'No recovery draft is available.';
    }

    const dateStamp = getLocalFileDateStamp();
    downloadSnapshot(recoveryDraft.snapshot, `risk-decision-register-draft-${dateStamp}.json`);
    return 'Recovery draft exported.';
  }

  function handleRequestReadOnlyBoardExport() {
    if (!registrySession.baseDocumentId) {
      throw new Error('Open or start a board first before exporting a read-only view.');
    }

    setReadOnlyExportProjectIds(projects.map((project) => project.id));
    setReadOnlyExportContentMode('both');
    setReadOnlyExportOpen(true);
  }

  function handleExportReadOnlyBoard(selectedProjectIds: string[], contentMode: ReadOnlyExportContentMode) {
    if (!registrySession.baseDocumentId) {
      throw new Error('Open or start a board first before exporting a read-only view.');
    }

    const filteredProjects = projects.filter((project) => selectedProjectIds.includes(project.id));
    if (!filteredProjects.length) {
      throw new Error('Choose at least one project to include in the read-only export.');
    }
    if (!['both', 'risks', 'decisions'].includes(contentMode)) {
      throw new Error('Choose whether to export risks, decisions, or both.');
    }

    const exportedAt = new Date().toISOString();
    const exportActiveProjectId = filteredProjects.some((project) => project.id === activeProjectId)
      ? activeProjectId
      : filteredProjects[0].id;
    const exportProjects = filteredProjects.map((project) => ({
      ...project,
      risks: contentMode === 'decisions' ? [] : project.risks,
      decisions: contentMode === 'risks' ? [] : project.decisions,
    }));
    const snapshot = buildAppSnapshot(
      exportProjects,
      exportActiveProjectId,
      sharedRisks,
      sharedRiskSubscriptions,
      sharedDecisions,
      {
        documentId: registrySession.baseDocumentId,
        name: registrySession.registryName,
        revision: registrySession.baseRevision ?? 1,
        parentRevision: registrySession.baseRevision != null ? Math.max(registrySession.baseRevision - 1, 0) || null : null,
        parentContentHash: registrySession.baseContentHash,
        lastModifiedAt: registrySession.loadedAt ?? exportedAt,
        lastModifiedBy: editorName.trim() || registrySession.sourceLabel || 'Governance Register',
      },
    );
    snapshot.readOnlyExport = {contentMode};
    const html = buildReadOnlyBoardHtml(snapshot);
    const timestampToken = getLocalFileTimestamp(new Date(exportedAt));
    const scopeSuffix =
      contentMode === 'both' ? 'read-only' : contentMode === 'risks' ? 'read-only-risks' : 'read-only-decisions';
    const fileName = `${sanitizeFileStem(registrySession.registryName)}_${timestampToken}_${scopeSuffix}.html`;
    downloadTextFile(html, fileName, 'text/html');
    setReadOnlyExportOpen(false);
    return `Exported a read-only board view as ${fileName} using your local time.`;
  }

  function handlePublishBoard() {
    if (!registrySession.baseDocumentId || !registrySession.baseRevision || !registrySession.baseContentHash) {
      throw new Error('Open a board first before publishing.');
    }

    const publishName = window.prompt('Enter your name for this published board version.', editorName.trim());
    if (publishName == null) {
      throw new Error('Publish cancelled.');
    }
    const normalizedPublishName = publishName.trim();
    if (!normalizedPublishName) {
      throw new Error('Your name is required before publishing.');
    }
    if (normalizedPublishName !== editorName) {
      setEditorName(normalizedPublishName);
    }

    setRegistrySession((current) => ({
      ...current,
      status: 'publish_in_progress',
      lastError: '',
    }));

    const nextRevision = registrySession.baseRevision + 1;
    const publishedAt = new Date().toISOString();
    const publishedBy = normalizedPublishName;
    const publishedSnapshot = buildAppSnapshot(
      projects,
      activeProjectId,
      sharedRisks,
      sharedRiskSubscriptions,
      sharedDecisions,
      {
        documentId: registrySession.baseDocumentId,
        name: registrySession.registryName,
        revision: nextRevision,
        parentRevision: registrySession.baseRevision,
        parentContentHash: registrySession.baseContentHash,
        lastModifiedAt: publishedAt,
        lastModifiedBy: publishedBy,
      },
    );

    const timestampToken = getLocalFileTimestamp(new Date(publishedAt));
    const publishedFileName = `${sanitizeFileStem(registrySession.registryName)}_${timestampToken}_${sanitizeFileStem(
      publishedBy,
    ) || 'editor'}.json`;

    downloadSnapshot(publishedSnapshot, publishedFileName);
    applySnapshotToWorkspace(publishedSnapshot, {
      sourceLabel: 'Master registry',
      sourceFileName: publishedFileName,
      registryName: publishedSnapshot.registry?.name ?? registrySession.registryName,
      baseDocumentId: publishedSnapshot.registry?.documentId ?? registrySession.baseDocumentId,
      baseRevision: publishedSnapshot.registry?.revision ?? nextRevision,
      baseContentHash: publishedSnapshot.registry?.contentHash ?? null,
      loadedAt: publishedAt,
      lastPublishedAt: publishedAt,
      lastPublishedRevision: nextRevision,
      status: 'master_loaded_clean',
      lastError: '',
    });

    return `Published a new board version as ${publishedFileName} using your local time. Share or store that JSON as the next board artifact.`;
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body">
      <div className="flex min-h-screen">
        <Sidebar
          boardLoaded={boardLoaded}
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
              boardLoaded={boardLoaded}
              hasUnsavedChanges={hasUnsavedChanges}
              onExportReadOnlyBoard={() => {
                try {
                  handleRequestReadOnlyBoardExport();
                } catch (error) {
                  window.alert(error instanceof Error ? error.message : 'Read-only export failed.');
                }
              }}
              onPublishBoard={() => {
                try {
                  const message = handlePublishBoard();
                  window.alert(message);
                } catch (error) {
                  window.alert(error instanceof Error ? error.message : 'Publish failed.');
                }
              }}
              onPrimaryAction={() => {
                if (!boardLoaded) {
                  setView('snapshot');
                  return;
                }
                if (view === 'risk') setCreateRiskOpen(true);
                if (view === 'decision') setCreateDecisionOpen(true);
              }}
            />
            {view === 'risk' ? (
              <RiskRegisterPage
                activeProject={activeProject}
                risks={riskRecords}
                sharedRiskSubscriptions={activeProjectSharedRiskSubscriptions}
                sharedRisks={sharedRisks}
                projects={projects}
                selectedRiskId={selectedRisk?.id ?? ''}
                selectedRisk={selectedRisk}
                onSelectRisk={handleRiskSelect}
                onSelectSharedRisk={handleSharedRiskSelect}
                onCreateLinkedLocalRisk={handleCreateLinkedLocalRisk}
                onAcknowledgeSharedRisk={handleAcknowledgeSharedRiskReview}
                onMarkSharedRiskNotApplicable={handleMarkSharedRiskNotApplicable}
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
                onShareDecision={handleShareDecision}
                onUnshareDecision={handleUnshareDecision}
                onPublishSharedDecision={handlePublishDecisionToLibrary}
                onRefreshFromSharedDecision={handleRefreshDecisionFromLibrary}
                sharedDecisions={sharedDecisions}
                projects={projects}
                activeProjectId={activeProject.id}
              />
            ) : view === 'analytics' ? (
              <TrendsAnalyticsPage
                risks={riskRecords}
              />
            ) : view === 'library' ? (
              <SharedLibraryPage
                activeProject={activeProject}
                projects={projects}
                sharedRisks={sharedRisks}
                sharedRiskSubscriptions={sharedRiskSubscriptions}
                sharedDecisions={sharedDecisions}
                onAddSharedRiskToProject={handleSubscribeToSharedRisk}
                onOpenRiskInProject={handleOpenRiskInProject}
                onAddSharedDecisionToProject={handleAddSharedDecisionToActiveProject}
              />
            ) : view === 'snapshot' ? (
              <SnapshotPage
                activeProjectName={activeProject.name}
                projectCount={projects.length}
                onOpenMasterSnapshot={handleOpenMasterSnapshot}
                onStartNewBoard={handleStartNewBoard}
                onPublishBoard={handlePublishBoard}
                onExportReadOnlyBoard={handleRequestReadOnlyBoardExport}
                onRestoreRecoveryDraft={handleRestoreRecoveryDraft}
                onDiscardRecoveryDraft={handleDiscardRecoveryDraft}
                onExportRecoveryDraft={handleExportRecoveryDraft}
                registrySession={registrySession}
                recoveryDraft={recoveryDraft}
                hasUnsavedChanges={hasUnsavedChanges}
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
              linkedDecisionOptions={getDecisionSelectOptions(decisions)}
              decisions={decisions}
              projects={projects}
              sharedRisks={sharedRisks}
              sharedRiskSubscriptions={sharedRiskSubscriptions}
              activeProjectId={activeProject.id}
              onShareRisk={handleShareRisk}
              onUnshareRisk={handleUnshareRisk}
              onOpenSharedRisk={handleSharedRiskSelect}
            />
          ) : null}
          {view === 'risk' && selectedSharedRisk && selectedSharedRiskSubscription ? (
            <SharedRiskDrawer
              open={sharedRiskDrawerOpen}
              sharedRisk={selectedSharedRisk}
              subscription={selectedSharedRiskSubscription}
              linkedLocalRisk={
                selectedSharedRiskSubscription.linkedLocalRiskId
                  ? riskRecords.find((risk) => risk.id === selectedSharedRiskSubscription.linkedLocalRiskId) ?? null
                  : null
              }
              sourceProject={projects.find((project) => project.id === selectedSharedRisk.sourceProjectId) ?? activeProject}
              onClose={() => setSharedRiskDrawerOpen(false)}
              onCreateLinkedLocalRisk={() => handleCreateLinkedLocalRisk(selectedSharedRisk.id)}
              onAcknowledge={(comment) => handleAcknowledgeSharedRiskReview(selectedSharedRisk.id, comment)}
              onMarkNotApplicable={() => handleMarkSharedRiskNotApplicable(selectedSharedRisk.id)}
            />
          ) : null}
          {view === 'risk' ? (
            <CreateRiskModal
              open={createRiskOpen}
              existingIds={usedRiskIds}
              nextRiskId={formatRiskSequence(nextRiskSequence)}
              scoringModel={riskScoringModel}
              ownerOptions={Array.from(new Set<string>(riskRecords.map((risk) => risk.owner)))}
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
          <ReadOnlyExportModal
            activeProjectId={activeProjectId}
            onClose={() => setReadOnlyExportOpen(false)}
            onConfirm={() => {
              try {
                const message = handleExportReadOnlyBoard(readOnlyExportProjectIds, readOnlyExportContentMode);
                window.alert(message);
              } catch (error) {
                window.alert(error instanceof Error ? error.message : 'Read-only export failed.');
              }
            }}
            contentMode={readOnlyExportContentMode}
            onContentModeChange={setReadOnlyExportContentMode}
            onSelectionChange={setReadOnlyExportProjectIds}
            open={readOnlyExportOpen}
            projects={projects}
            selectedProjectIds={readOnlyExportProjectIds}
          />
        </div>
      </div>
    </div>
  );
}

function Sidebar({
  boardLoaded,
  view,
  onChangeView,
  activeProject,
  projects,
  onDeleteProject,
  onSwitchProject,
  onCreateProject,
}: {
  boardLoaded: boolean;
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
    {id: 'analytics', label: 'Trends / Analytics', icon: 'insights'},
    {id: 'library', label: 'Shared Library', icon: 'hub'},
    {id: 'snapshot', label: 'Registry Source', icon: 'sync_alt'},
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
          className={`mb-8 w-full rounded-2xl p-4 text-left shadow-[0_8px_24px_rgba(42,52,57,0.05)] transition ${
            boardLoaded
              ? 'bg-white/75 hover:bg-white hover:shadow-[0_8px_28px_rgba(42,52,57,0.09)]'
              : 'cursor-not-allowed bg-white/40 text-slate-400'
          }`}
          disabled={!boardLoaded}
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
          {boardLoaded && activeProject.description ? (
            <div className="mt-1.5 line-clamp-2 text-xs text-slate-500">
              {activeProject.description}
            </div>
          ) : null}
          {boardLoaded ? (
            <div className="mt-2 flex items-center gap-3 text-[10px] font-semibold text-slate-400">
              <span>{activeProject.risks.length} risk{activeProject.risks.length !== 1 ? 's' : ''}</span>
              <span>·</span>
              <span>{activeProject.decisions.length} decision{activeProject.decisions.length !== 1 ? 's' : ''}</span>
            </div>
          ) : (
            <div className="mt-2 text-[10px] font-semibold text-slate-400">
              Start or open a board first
            </div>
          )}
        </button>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const active = view === item.id;
            const disabled = !boardLoaded && item.id !== 'snapshot';
            return (
              <button
                key={item.id}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition-all ${
                  active
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10'
                    : disabled
                      ? 'cursor-not-allowed text-slate-300'
                      : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
                }`}
                disabled={disabled}
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

        {!boardLoaded ? (
          <div className="mt-4 rounded-2xl bg-white/70 px-4 py-3 text-xs leading-relaxed text-slate-500 shadow-[0_8px_24px_rgba(42,52,57,0.05)]">
            Open a board file or start a new board from `Registry Source` before working in the registers.
          </div>
        ) : null}

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
  boardLoaded,
  hasUnsavedChanges,
  onExportReadOnlyBoard,
  onPublishBoard,
}: {
  view: View;
  onPrimaryAction?: () => void;
  projectName: string;
  boardLoaded: boolean;
  hasUnsavedChanges: boolean;
  onExportReadOnlyBoard: () => void;
  onPublishBoard: () => void;
}) {
  const showPrimaryAction = view === 'risk' || view === 'decision';
  const [helpOpen, setHelpOpen] = useState(false);
  const [publishMenuOpen, setPublishMenuOpen] = useState(false);
  const publishMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!publishMenuOpen) {
      return undefined;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!publishMenuRef.current?.contains(event.target as Node)) {
        setPublishMenuOpen(false);
      }
    }

    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [publishMenuOpen]);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/70 bg-slate-50/90 px-8 backdrop-blur-xl">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
            {view === 'risk'
              ? 'Operational View'
              : view === 'decision'
                ? 'Decision Review'
                : view === 'analytics'
                  ? 'Trends / Analytics'
                : view === 'library'
                  ? 'Cross-Project Library'
                : view === 'snapshot'
                  ? 'Registry Source'
                  : 'Configuration'}
          </div>
          <div className="max-w-[340px] truncate font-headline text-lg font-extrabold text-slate-900">
            {projectName}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {boardLoaded ? (
            <div className="hidden text-right md:block">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                {hasUnsavedChanges ? 'Unpublished changes' : 'Board up to date'}
              </div>
              <div className="text-xs text-slate-500">
                {hasUnsavedChanges ? 'Publish to save a new board version' : 'Publish again after your next edits'}
              </div>
            </div>
          ) : null}
          {boardLoaded ? (
            <div className="relative" ref={publishMenuRef}>
              <div className="flex overflow-hidden rounded-xl">
                <button
                  className={`px-4 py-2.5 text-sm font-bold transition ${
                    hasUnsavedChanges
                      ? 'bg-primary text-on-primary hover:bg-primary-dim'
                      : 'bg-white text-on-surface ring-1 ring-slate-200 hover:bg-slate-50'
                  }`}
                  onClick={onPublishBoard}
                  type="button"
                >
                  Publish
                </button>
                <button
                  aria-expanded={publishMenuOpen}
                  aria-haspopup="menu"
                  className={`border-l px-3 py-2.5 text-sm transition ${
                    hasUnsavedChanges
                      ? 'border-white/20 bg-primary text-on-primary hover:bg-primary-dim'
                      : 'border-slate-200 bg-white text-on-surface ring-1 ring-slate-200 hover:bg-slate-50'
                  }`}
                  onClick={() => setPublishMenuOpen((current) => !current)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">expand_more</span>
                </button>
              </div>
              {publishMenuOpen ? (
                <div
                  className="absolute right-0 top-[calc(100%+0.5rem)] z-40 min-w-[220px] rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_20px_60px_rgba(42,52,57,0.16)]"
                  role="menu"
                >
                  <button
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-on-surface transition hover:bg-slate-50"
                    onClick={() => {
                      setPublishMenuOpen(false);
                      onPublishBoard();
                    }}
                    role="menuitem"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px] text-primary">upload_file</span>
                    <span>Publish JSON</span>
                  </button>
                  <button
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-on-surface transition hover:bg-slate-50"
                    onClick={() => {
                      setPublishMenuOpen(false);
                      onExportReadOnlyBoard();
                    }}
                    role="menuitem"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px] text-primary">overview</span>
                    <span>Export Read-Only HTML</span>
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
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
                    Use `Registry Source` to open a board JSON, start a new board, publish a new board version, or export a read-only HTML view for teammates who only need to review the current registers.
                  </p>
                </div>

                <div>
                  <div className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Risk Register</div>
                  <p>
                    Log risks from the main action button, review them in the table, and click a row to open the right-side drawer for scoring, ownership, response, and history updates.
                  </p>
                </div>

                <div>
                  <div className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Trends / Analytics</div>
                  <p>
                    Use the analytics page to review risk burndown trends over time, compare selected risks, and inspect the rationale behind recorded score changes.
                  </p>
                </div>

                <div>
                  <div className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Decision Register</div>
                  <p>
                    Record governance decisions, connect them to related risks, and maintain the decision rationale, options considered, and consequences in one place.
                  </p>
                </div>

                <div>
                  <div className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Master Workflow</div>
                  <p>
                    Open or start a board, work in the browser, then publish a new JSON version when you are ready to save your changes. If you need a view-only shareout, export a read-only HTML copy.
                  </p>
                </div>

                <div>
                  <div className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Shared Library</div>
                  <p>
                    Promote risks and decisions into the shared library when they should be reused across projects. Scoring, owners, status, and response remain local to each project.
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
  linkedDecisionOptions,
  onClose,
  onCreate,
}: {
  open: boolean;
  existingIds: string[];
  nextRiskId: string;
  scoringModel: RiskScoringModel;
  ownerOptions: string[];
  linkedDecisionOptions: SelectOption[];
  onClose: () => void;
  onCreate: (input: {
    id: string;
    title: string;
    owner: string;
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
                    {(['Pending', 'Active', 'Monitoring', 'Rejected'] as RiskStatus[]).map((option) => (
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
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    setDraftModel(scoringModel);
    setConfirmReset(false);
  }, [scoringModel]);

  useEffect(() => {
    if (!saved) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setSaved(false), 1800);
    return () => window.clearTimeout(timeoutId);
  }, [saved]);

  function updateDefinition(
    section: 'likelihood' | 'impact',
    value: number,
    field: 'label' | 'description' | 'scheduleMinMonths' | 'scheduleMaxMonths' | 'costMinAmount' | 'costMaxAmount',
    nextValue: string,
  ) {
    setDraftModel((current) => ({
      ...current,
      [section]: current[section].map((entry) =>
        entry.value === value
          ? {
              ...entry,
              [field]:
                field === 'label' || field === 'description'
                  ? nextValue
                  : nextValue.trim()
                    ? Number(nextValue)
                    : null,
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
      </div>

      <div className="sticky top-16 z-20 mb-8 flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border border-slate-200/70 bg-slate-50/95 px-5 py-4 shadow-[0_10px_24px_rgba(42,52,57,0.08)] backdrop-blur-xl">
        <div className="text-sm leading-relaxed text-on-surface-variant">
          Scoring model actions remain available while you review or edit the rubric below.
        </div>
        <div className="flex items-center gap-3">
          {saved ? (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-800">
              Saved
            </span>
          ) : null}
          {confirmReset ? (
            <>
              <span className="text-xs font-semibold text-slate-500">Reset unsaved rubric changes?</span>
              <button
                className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
                onClick={() => {
                  setDraftModel(scoringModel);
                  setConfirmReset(false);
                  setSaved(false);
                }}
                type="button"
              >
                Confirm Reset
              </button>
              <button
                className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-on-surface transition hover:bg-slate-200"
                onClick={() => setConfirmReset(false)}
                type="button"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-on-surface transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!isDirty}
              onClick={() => setConfirmReset(true)}
              type="button"
            >
              Reset
            </button>
          )}
          <button
            className="rounded-xl bg-gradient-to-br from-primary to-primary-dim px-4 py-2.5 text-sm font-bold text-on-primary shadow-lg shadow-primary/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!isDirty}
            onClick={() => {
              onSaveScoringModel(draftModel);
              setSaved(true);
              setConfirmReset(false);
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
            showImpactRanges={false}
            title="Likelihood Definitions"
          />
          <ScoringDefinitionEditor
            definitions={draftModel.impact}
            onChange={(value, field, nextValue) => updateDefinition('impact', value, field, nextValue)}
            showImpactRanges
            title="Impact Definitions"
          />
        </div>
      </section>
    </div>
  );
}

function TrendsAnalyticsPage({
  risks,
}: {
  risks: Risk[];
}) {
  const burndownTimeframe: BurndownTimeframe = 'all';
  const [selectedBurndownRiskIds, setSelectedBurndownRiskIds] = useState<string[]>(() =>
    risks.map((risk) => risk.id),
  );
  const [selectedBurndownPoint, setSelectedBurndownPoint] = useState<SelectedBurndownPoint | null>(null);
  const [riskSelectorOpen, setRiskSelectorOpen] = useState(false);
  const [burndownExportMenuOpen, setBurndownExportMenuOpen] = useState(false);
  const [burndownExportState, setBurndownExportState] = useState<'idle' | 'copied' | 'copy-failed'>('idle');
  const [burndownCopyError, setBurndownCopyError] = useState('');
  const [focusedBurndownRiskId, setFocusedBurndownRiskId] = useState<string>('');
  const [burndownShowExportLegend, setBurndownShowExportLegend] = useState(false);
  const riskSelectorRef = useRef<HTMLDivElement | null>(null);
  const burndownExportMenuRef = useRef<HTMLDivElement | null>(null);
  const burndownChartRef = useRef<SVGSVGElement | null>(null);

  const burndownRiskOptions = [...risks].sort((left, right) => {
    const leftRetired = isRetiredRiskStatus(left.status);
    const rightRetired = isRetiredRiskStatus(right.status);
    if (leftRetired !== rightRetired) {
      return leftRetired ? 1 : -1;
    }

    return right.likelihood * right.impact - left.likelihood * left.impact;
  });
  const burndownSeries = burndownRiskOptions
    .filter((risk) => selectedBurndownRiskIds.includes(risk.id))
    .map((risk) => ({
      risk,
      points: filterBurndownPoints(buildRiskBurndownTimeline(risk), burndownTimeframe),
    }))
    .filter((series) => series.points.length > 0);
  const selectedBurndownPointDetail = selectedBurndownPoint
    ? burndownSeries
        .flatMap((series) =>
          series.points.map((point) => ({
            risk: series.risk,
            point,
          })),
        )
        .find((item) => item.risk.id === selectedBurndownPoint.riskId && item.point.at === selectedBurndownPoint.at) ?? null
    : null;
  const focusedBurndownSeries =
    burndownSeries.find((series) => series.risk.id === focusedBurndownRiskId) ??
    (selectedBurndownPointDetail
      ? burndownSeries.find((series) => series.risk.id === selectedBurndownPointDetail.risk.id) ?? null
      : burndownSeries[0] ?? null);

  useEffect(() => {
    const availableIds = new Set(risks.map((risk) => risk.id));
    setSelectedBurndownRiskIds((current) => {
      const retained = current.filter((riskId) => availableIds.has(riskId));
      if (retained.length > 0) {
        return retained;
      }

      return risks.map((risk) => risk.id);
    });
  }, [risks]);

  useEffect(() => {
    if (!selectedBurndownPoint) {
      return;
    }

    const stillExists = burndownSeries.some(
      (series) =>
        series.risk.id === selectedBurndownPoint.riskId &&
        series.points.some((point) => point.at === selectedBurndownPoint.at),
    );

    if (!stillExists) {
      setSelectedBurndownPoint(null);
    }
  }, [burndownSeries, selectedBurndownPoint]);

  useEffect(() => {
    if (!riskSelectorOpen) {
      return undefined;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!riskSelectorRef.current?.contains(event.target as Node)) {
        setRiskSelectorOpen(false);
      }
    }

    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [riskSelectorOpen]);

  useEffect(() => {
    if (!burndownExportMenuOpen) {
      return undefined;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!burndownExportMenuRef.current?.contains(event.target as Node)) {
        setBurndownExportMenuOpen(false);
      }
    }

    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [burndownExportMenuOpen]);

  useEffect(() => {
    if (burndownExportState === 'idle') {
      setBurndownCopyError('');
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setBurndownExportState('idle'), 1800);
    return () => window.clearTimeout(timeoutId);
  }, [burndownExportState]);

  useEffect(() => {
    if (selectedBurndownPointDetail) {
      setFocusedBurndownRiskId(selectedBurndownPointDetail.risk.id);
      return;
    }

    if (!focusedBurndownSeries && burndownSeries[0]) {
      setFocusedBurndownRiskId(burndownSeries[0].risk.id);
    }
  }, [burndownSeries, focusedBurndownSeries, selectedBurndownPointDetail]);

  async function handleCopyBurndownChart() {
    if (!window.isSecureContext) {
      setBurndownCopyError('Image copy requires a secure browser context such as localhost or HTTPS.');
      setBurndownExportState('copy-failed');
      return;
    }

    if (!('ClipboardItem' in window) || !navigator.clipboard?.write) {
      setBurndownCopyError('This browser does not support copying images to the clipboard.');
      setBurndownExportState('copy-failed');
      return;
    }

    if (!burndownChartRef.current) {
      setBurndownCopyError('The burndown chart is not available to export yet.');
      setBurndownExportState('copy-failed');
      return;
    }

    try {
      setBurndownShowExportLegend(true);
      await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
      const blob = await renderSvgElementToPngBlob(burndownChartRef.current);
      const clipboardSupportsPng =
        typeof ClipboardItem !== 'undefined' &&
        typeof ClipboardItem.supports === 'function' &&
        ClipboardItem.supports('image/png');

      if (!clipboardSupportsPng) {
        setBurndownCopyError('This browser supports clipboard access, but not PNG image copy.');
        setBurndownExportState('copy-failed');
        return;
      }

      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob,
        }),
      ]);
      setBurndownExportState('copied');
      setBurndownExportMenuOpen(false);
    } catch (error) {
      if (error instanceof Error && error.message) {
        setBurndownCopyError(`Image copy failed: ${error.message}`);
      } else {
        setBurndownCopyError('The browser blocked image clipboard access for this page.');
      }
      setBurndownExportState('copy-failed');
    } finally {
      setBurndownShowExportLegend(false);
    }
  }

  async function handleDownloadBurndownPng() {
    if (!burndownChartRef.current) {
      return;
    }

    try {
      setBurndownShowExportLegend(true);
      await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
      const blob = await renderSvgElementToPngBlob(burndownChartRef.current);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'risk-burndown-chart.png';
      anchor.click();
      window.URL.revokeObjectURL(url);
      setBurndownExportMenuOpen(false);
    } catch {
      // silently ignore download errors
    } finally {
      setBurndownShowExportLegend(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] px-8 py-8">
      <div className="mb-8 flex items-end justify-between gap-6">
        <div>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
            Trends / Analytics
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-on-surface-variant">
            Review how project risks have moved over time based on recorded likelihood and impact changes. Use this page for trend review and risk-retirement conversations without crowding the working register.
          </p>
        </div>
      </div>

      <section className="mb-5 rounded-[1.75rem] bg-white p-6 shadow-[0_14px_40px_rgba(42,52,57,0.06)]">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Risk Burndown</div>
            <div className="mt-1 text-sm leading-relaxed text-on-surface-variant">
              Track how selected project risks change over time based on recorded likelihood and impact updates. Click a score-change point to inspect the associated rationale.
            </div>
            {burndownExportState !== 'idle' ? (
              <div
                className={`mt-2 text-[11px] font-semibold ${
                  burndownExportState === 'copied' ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {burndownExportState === 'copied'
                  ? 'Burndown chart image copied to clipboard'
                  : burndownCopyError}
              </div>
            ) : null}
          </div>
          <div className="flex w-full flex-wrap items-end justify-between gap-4">
            <div className="w-full max-w-[24rem]" ref={riskSelectorRef}>
              <label className="block">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Risks Shown</div>
                <div className="relative">
                  <button
                    aria-expanded={riskSelectorOpen}
                    aria-haspopup="listbox"
                    className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm text-on-surface outline-none transition hover:bg-white focus:border-primary/25 focus:bg-white focus:shadow-[0_0_0_4px_rgba(79,94,126,0.08)]"
                    onClick={() => setRiskSelectorOpen((current) => !current)}
                    type="button"
                  >
                    <span className="truncate">
                      {selectedBurndownRiskIds.length === 0
                        ? 'No risks selected'
                        : selectedBurndownRiskIds.length === burndownRiskOptions.length
                          ? 'All risks selected'
                          : `${selectedBurndownRiskIds.length} risks selected`}
                    </span>
                    <span className="material-symbols-outlined text-[18px] text-slate-500">
                      {riskSelectorOpen ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>
                  {riskSelectorOpen ? (
                    <div className="absolute right-0 top-[calc(100%+0.5rem)] z-20 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_20px_60px_rgba(42,52,57,0.16)]">
                      <div className="max-h-72 overflow-y-auto pr-1">
                        <div className="mb-2 flex items-center justify-between px-2 pt-1">
                          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                            Select Risks
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-200"
                              onClick={() => setSelectedBurndownRiskIds([])}
                              type="button"
                            >
                              Clear
                            </button>
                            <button
                              className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-200"
                              onClick={() => setSelectedBurndownRiskIds(burndownRiskOptions.map((risk) => risk.id))}
                              type="button"
                            >
                              All
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {burndownRiskOptions.map((risk) => {
                            const checked = selectedBurndownRiskIds.includes(risk.id);
                            const retired = isRetiredRiskStatus(risk.status);
                            return (
                              <label
                                key={risk.id}
                                className="flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 transition hover:bg-slate-50"
                              >
                                <input
                                  checked={checked}
                                  className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-primary"
                                  onChange={() =>
                                    setSelectedBurndownRiskIds((current) =>
                                      checked ? current.filter((riskId) => riskId !== risk.id) : [...current, risk.id],
                                    )
                                  }
                                  type="checkbox"
                                />
                                <div className="min-w-0">
                                  <div className={`text-sm font-semibold ${retired ? 'text-slate-500' : 'text-on-surface'}`}>
                                    {risk.id} - {risk.title}
                                  </div>
                                  <div className="mt-0.5 text-xs text-on-surface-variant">
                                    {risk.status}
                                    {retired ? ' · Retired' : ''}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </label>
            </div>
            <div className="relative" ref={burndownExportMenuRef}>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Export</div>
              <button
                aria-expanded={burndownExportMenuOpen}
                aria-haspopup="menu"
                className="flex min-h-[50px] items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-left text-sm font-semibold text-on-surface transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={burndownSeries.length === 0}
                onClick={() => setBurndownExportMenuOpen((current) => !current)}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px] text-slate-500">ios_share</span>
                Export Chart
                <span className="material-symbols-outlined text-[18px] text-slate-500">
                  {burndownExportMenuOpen ? 'expand_less' : 'expand_more'}
                </span>
              </button>
              {burndownExportMenuOpen ? (
                <div className="absolute right-0 top-[calc(100%+0.5rem)] z-20 min-w-[220px] rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_20px_60px_rgba(42,52,57,0.16)]">
                  <button
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[11px] font-semibold text-on-surface transition hover:bg-slate-50"
                    onClick={handleCopyBurndownChart}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px] text-slate-500">content_copy</span>
                    Copy image to clipboard
                  </button>
                  <button
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[11px] font-semibold text-on-surface transition hover:bg-slate-50"
                    onClick={handleDownloadBurndownPng}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px] text-slate-500">download</span>
                    Download as PNG
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <RiskBurndownChart
          chartRef={burndownChartRef}
          highlightedRiskId={focusedBurndownSeries?.risk.id ?? null}
          selectedPoint={selectedBurndownPoint}
          showLegend={burndownShowExportLegend}
          series={burndownSeries.map((series) => ({
            riskId: series.risk.id,
            title: series.risk.title,
            severity: series.risk.severity,
            status: series.risk.status,
            points: series.points,
          }))}
          onSelectRisk={(riskId) => {
            setFocusedBurndownRiskId(riskId);
            if (selectedBurndownPoint?.riskId && selectedBurndownPoint.riskId !== riskId) {
              setSelectedBurndownPoint(null);
            }
          }}
          onSelectPoint={(point) => setSelectedBurndownPoint(point)}
        />

        {focusedBurndownSeries ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Focused Risk Timeline</div>
                <div className="mt-1 text-sm font-semibold text-on-surface">
                  {focusedBurndownSeries.risk.id} · {focusedBurndownSeries.risk.title}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {burndownSeries.map((series, index) => (
                  <button
                    key={series.risk.id}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] transition ${
                      focusedBurndownSeries.risk.id === series.risk.id
                        ? 'bg-primary text-white'
                        : 'bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                    onClick={() => {
                      setFocusedBurndownRiskId(series.risk.id);
                      if (selectedBurndownPoint?.riskId && selectedBurndownPoint.riskId !== series.risk.id) {
                        setSelectedBurndownPoint(null);
                      }
                    }}
                    type="button"
                  >
                    <span
                      className="mr-1.5 inline-block h-2 w-2 rounded-full"
                      style={{backgroundColor: ['#0f8f4f', '#2563eb', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#4f46e5', '#be123c'][index % 8]}}
                    />
                    {series.risk.id}
                  </button>
                ))}
              </div>
            </div>
            <div className="w-full overflow-x-auto pb-1">
              <div className="flex w-max gap-3">
                {focusedBurndownSeries.points.map((point) => {
                  const selected =
                    selectedBurndownPoint?.riskId === focusedBurndownSeries.risk.id &&
                    selectedBurndownPoint.at === point.at;
                  return (
                    <button
                      key={`${focusedBurndownSeries.risk.id}-${point.at}`}
                      className={`w-[220px] shrink-0 rounded-2xl border px-4 py-3 text-left transition ${
                        selected
                          ? 'border-primary bg-primary/5 shadow-[0_8px_24px_rgba(79,94,126,0.14)]'
                          : 'border-slate-200 bg-white hover:border-primary/30 hover:bg-slate-50'
                      }`}
                      onClick={() => setSelectedBurndownPoint({riskId: focusedBurndownSeries.risk.id, at: point.at})}
                      type="button"
                    >
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        {formatHistoryTimestamp(point.at)}
                      </div>
                      <div className="mt-2 text-base font-extrabold text-on-surface">
                        {point.score}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-on-surface">
                        Likelihood {point.likelihood} / Impact {point.impact}
                      </div>
                      <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                        {point.label}
                      </div>
                      <div className="mt-2 line-clamp-4 text-sm leading-relaxed text-on-surface-variant">
                        {point.rationale || 'No rationale recorded for this point.'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function SharedLibraryPage({
  activeProject,
  projects,
  sharedRisks,
  sharedRiskSubscriptions,
  sharedDecisions,
  onAddSharedRiskToProject,
  onOpenRiskInProject,
  onAddSharedDecisionToProject,
}: {
  activeProject: Project;
  projects: Project[];
  sharedRisks: SharedRisk[];
  sharedRiskSubscriptions: SharedRiskSubscription[];
  sharedDecisions: SharedDecision[];
  onAddSharedRiskToProject: (sharedRiskId: string) => void;
  onOpenRiskInProject: (projectId: string, riskId: string) => void;
  onAddSharedDecisionToProject: (sharedDecisionId: string) => void;
}) {
  const riskUsages = sharedRisks.map((sharedRisk) => ({
    sharedRisk,
    subscriptions: sharedRiskSubscriptions.filter((subscription) => subscription.sharedRiskId === sharedRisk.id),
    usages: projects.flatMap((project) =>
      project.risks
        .filter((risk) => risk.sharedRiskId === sharedRisk.id)
        .map((risk) => ({
          projectId: project.id,
          projectName: project.name,
          risk,
          isSourceProject: project.id === sharedRisk.sourceProjectId,
          scoringModelMatches: scoringModelsMatch(project.scoringModel, activeProject.scoringModel),
        })),
    ),
  }));
  const decisionUsages = sharedDecisions.map((sharedDecision) => ({
    sharedDecision,
    usages: projects.flatMap((project) =>
      project.decisions
        .filter((decision) => decision.sharedDecisionId === sharedDecision.id)
        .map((decision) => ({
          projectId: project.id,
          projectName: project.name,
          decision,
        })),
    ),
  }));

  return (
    <div className="mx-auto w-full max-w-[1450px] px-8 py-8">
      <div className="mb-8 flex items-end justify-between gap-6">
        <div>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">Shared Library</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-on-surface-variant">
            Reuse common risks and decisions across projects while keeping scoring, status, ownership, response, and due dates local to each project.
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
          Shared risks now work as source-owned upstream records. Subscriber projects can review them and optionally create linked local risks, but downstream scores and handling stay local and are not overwritten by parent updates.
        </div>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <SummaryMetricCard label="Shared Risks" tone="text-on-surface" value={String(sharedRisks.length)} />
        <SummaryMetricCard label="Shared Decisions" tone="text-on-surface" value={String(sharedDecisions.length)} />
        <SummaryMetricCard
          label="Active Project"
          tone="text-primary"
          value={activeProject.name}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[1.75rem] bg-white p-6 shadow-[0_14px_40px_rgba(42,52,57,0.06)]">
          <div className="mb-5 flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">warning</span>
            <div>
              <h2 className="font-headline text-2xl font-extrabold text-on-surface">Shared Risks</h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Promote a risk from a project drawer, then add it into other projects from here.
              </p>
            </div>
          </div>
          {riskUsages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm leading-relaxed text-slate-500">
              No shared risks yet. Open a risk drawer and use the share action to add it to the cross-project library.
            </div>
          ) : (
            <div className="space-y-4">
              {riskUsages.map(({sharedRisk, usages, subscriptions}) => {
                const activeProjectSubscription = subscriptions.find((subscription) => subscription.projectId === activeProject.id);
                const alreadyInActiveProject = Boolean(activeProjectSubscription) || sharedRisk.sourceProjectId === activeProject.id;
                const hasDifferentRubric = usages.some((usage) => !usage.scoringModelMatches);
                const sharedImpactLabel = sharedRisk.sharedImpactProfile
                  ? `${sharedRisk.sharedImpactProfile.basis === 'schedule' ? 'Schedule' : 'Cost'} basis: ${
                      sharedRisk.sharedImpactProfile.basis === 'schedule'
                        ? formatImpactRange(sharedRisk.sharedImpactProfile.min, sharedRisk.sharedImpactProfile.max, 'months')
                        : formatImpactRange(sharedRisk.sharedImpactProfile.min, sharedRisk.sharedImpactProfile.max, '', '$')
                    }`
                  : null;
                return (
                  <div key={sharedRisk.id} className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-mono text-[11px] font-bold text-primary">{sharedRisk.id}</div>
                        <h3 className="mt-1 text-lg font-extrabold text-on-surface">{sharedRisk.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                          {renderStatementWithBoldKeywords(sharedRisk.statement)}
                        </p>
                      </div>
                      <button
                        className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-on-surface shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={alreadyInActiveProject}
                        onClick={() => onAddSharedRiskToProject(sharedRisk.id)}
                        type="button"
                      >
                        {sharedRisk.sourceProjectId === activeProject.id
                          ? 'Source Project'
                          : alreadyInActiveProject
                            ? 'Already Subscribed'
                            : `Subscribe ${activeProject.name}`}
                      </button>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
                        Source project {projects.find((project) => project.id === sharedRisk.sourceProjectId)?.name ?? sharedRisk.sourceProjectId}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600">
                        Subscribed in {subscriptions.length} project{subscriptions.length === 1 ? '' : 's'}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600">
                        Linked locally in {usages.filter((usage) => usage.risk.sharedRiskRole === 'linked').length} project{usages.filter((usage) => usage.risk.sharedRiskRole === 'linked').length === 1 ? '' : 's'}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600">
                        Source impact {sharedRisk.sourceImpactScore}
                      </span>
                      {sharedImpactLabel ? (
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600">
                          {sharedImpactLabel}
                        </span>
                      ) : null}
                      {hasDifferentRubric ? (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-amber-800">
                          Different scoring rubrics in use
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-4 space-y-2">
                      {usages.map((usage) => (
                        <div key={`${sharedRisk.id}-${usage.projectId}`} className="rounded-2xl bg-white px-4 py-3">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-semibold text-on-surface">{usage.projectName}</div>
                              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${
                                usage.projectId === sharedRisk.sourceProjectId
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {usage.projectId === sharedRisk.sourceProjectId ? 'Source' : 'Subscriber'}
                              </span>
                              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${
                                usage.risk.sharedRiskRole === 'linked'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {usage.risk.sharedRiskRole === 'linked' ? 'Linked local risk' : 'Published source risk'}
                              </span>
                            </div>
                            <div className="text-xs text-on-surface-variant">
                              Likelihood {usage.risk.likelihood} · Impact {usage.risk.impact} · Score {usage.risk.likelihood * usage.risk.impact}
                            </div>
                          </div>
                          <div className="mt-1 flex items-center justify-between gap-3 text-xs text-on-surface-variant">
                            <div>
                              Status {usage.risk.status} · Owner {usage.risk.owner || 'Not assigned'} · Response {usage.risk.responseType}
                            </div>
                            <button
                              className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-700 transition hover:bg-slate-200"
                              onClick={() => onOpenRiskInProject(usage.projectId, usage.risk.id)}
                              type="button"
                            >
                              {usage.projectId === activeProject.id ? 'Go To Risk' : 'Open In Project'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-[1.75rem] bg-white p-6 shadow-[0_14px_40px_rgba(42,52,57,0.06)]">
          <div className="mb-5 flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">balance</span>
            <div>
              <h2 className="font-headline text-2xl font-extrabold text-on-surface">Shared Decisions</h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Reuse governance decisions across projects while keeping local status and linked risks in each project.
              </p>
            </div>
          </div>
          {decisionUsages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm leading-relaxed text-slate-500">
              No shared decisions yet. Open a decision detail panel and share a decision when it should be reused elsewhere.
            </div>
          ) : (
            <div className="space-y-4">
              {decisionUsages.map(({sharedDecision, usages}) => {
                const alreadyInActiveProject = usages.some((usage) => usage.projectId === activeProject.id);
                return (
                  <div key={sharedDecision.id} className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-mono text-[11px] font-bold text-primary">{sharedDecision.id}</div>
                        <h3 className="mt-1 text-lg font-extrabold text-on-surface">{sharedDecision.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                          {sharedDecision.outcome || sharedDecision.context || 'No shared decision narrative yet.'}
                        </p>
                      </div>
                      <button
                        className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-on-surface shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={alreadyInActiveProject}
                        onClick={() => onAddSharedDecisionToProject(sharedDecision.id)}
                        type="button"
                      >
                        {alreadyInActiveProject ? 'Already In Project' : `Add To ${activeProject.name}`}
                      </button>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600">
                        Used in {usages.length} project{usages.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="mt-4 space-y-2">
                      {usages.map((usage) => (
                        <div key={`${sharedDecision.id}-${usage.projectId}`} className="rounded-2xl bg-white px-4 py-3">
                          <div className="flex items-center justify-between gap-4">
                            <div className="text-sm font-semibold text-on-surface">{usage.projectName}</div>
                            <div className="text-xs text-on-surface-variant">Status {usage.decision.status}</div>
                          </div>
                          <div className="mt-1 text-xs text-on-surface-variant">
                            Deciders {usage.decision.deciders || 'Not assigned'} · {usage.decision.linkedRisks.length} linked risk{usage.decision.linkedRisks.length === 1 ? '' : 's'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ReadOnlyExportModal({
  open,
  projects,
  selectedProjectIds,
  contentMode,
  activeProjectId,
  onSelectionChange,
  onContentModeChange,
  onConfirm,
  onClose,
}: {
  open: boolean;
  projects: Project[];
  selectedProjectIds: string[];
  contentMode: ReadOnlyExportContentMode;
  activeProjectId: string;
  onSelectionChange: (projectIds: string[]) => void;
  onContentModeChange: (contentMode: ReadOnlyExportContentMode) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const backdropPressStarted = useRef(false);
  const selectedProjectIdSet = new Set(selectedProjectIds);
  const hasSelection = selectedProjectIds.length > 0;

  if (!open) {
    return null;
  }

  function handleToggleProject(projectId: string) {
    onSelectionChange(
      selectedProjectIdSet.has(projectId)
        ? selectedProjectIds.filter((currentProjectId) => currentProjectId !== projectId)
        : [...selectedProjectIds, projectId],
    );
  }

  return (
    <div
      className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/30"
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
      <div className="flex min-h-full items-center justify-center px-6 py-6">
        <div
          className="flex w-full max-w-2xl flex-col rounded-[2rem] bg-white shadow-[0_28px_80px_rgba(42,52,57,0.18)]"
          onClick={(event) => event.stopPropagation()}
          onMouseDown={() => {
            backdropPressStarted.current = false;
          }}
        >
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Read-Only Export</div>
              <h2 className="mt-1 font-headline text-2xl font-extrabold text-on-surface">Choose projects to publish</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
                Include only the projects you want teammates to see in this HTML shareout. The source board stays unchanged.
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

          <div className="space-y-5 px-6 py-6">
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-on-surface transition hover:bg-slate-200"
                onClick={() => onSelectionChange(projects.map((project) => project.id))}
                type="button"
              >
                Select all
              </button>
              <button
                className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-on-surface transition hover:bg-slate-200"
                onClick={() => onSelectionChange([activeProjectId])}
                type="button"
              >
                Current project only
              </button>
              <button
                className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-on-surface transition hover:bg-slate-200"
                onClick={() => onSelectionChange([])}
                type="button"
              >
                Clear
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Content to include</div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {[
                  {
                    value: 'both',
                    label: 'Risks and decisions',
                    description: 'Keep both registers available in the exported review copy.',
                  },
                  {
                    value: 'risks',
                    label: 'Risks only',
                    description: 'Hide decision records and open the export directly in the risk register.',
                  },
                  {
                    value: 'decisions',
                    label: 'Decisions only',
                    description: 'Hide risk records and open the export directly in the decision register.',
                  },
                ].map((option) => {
                  const selected = contentMode === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition ${
                        selected ? 'border-primary/30 bg-primary/5' : 'border-slate-200 bg-white hover:bg-slate-100'
                      }`}
                    >
                      <input
                        checked={selected}
                        className="mt-1 h-4 w-4 shrink-0 accent-primary"
                        name="read-only-export-content-mode"
                        onChange={() => onContentModeChange(option.value as ReadOnlyExportContentMode)}
                        type="radio"
                      />
                      <div>
                        <div className="font-semibold text-on-surface">{option.label}</div>
                        <div className="mt-1 text-sm text-on-surface-variant">{option.description}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              {projects.map((project) => {
                const selected = selectedProjectIdSet.has(project.id);
                const riskCount = project.risks.length;
                const decisionCount = project.decisions.length;

                return (
                  <label
                    key={project.id}
                    className={`flex cursor-pointer items-start justify-between gap-4 rounded-2xl border px-4 py-3 transition ${
                      selected ? 'border-primary/30 bg-primary/5' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-on-surface">{project.name}</span>
                        {project.id === activeProjectId ? (
                          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 ring-1 ring-slate-200">
                            Current
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-sm text-on-surface-variant">
                        {riskCount} risk{riskCount === 1 ? '' : 's'} and {decisionCount} decision{decisionCount === 1 ? '' : 's'}
                      </div>
                      {project.description ? (
                        <div className="mt-1 text-sm text-on-surface-variant">{project.description}</div>
                      ) : null}
                    </div>
                    <input
                      checked={selected}
                      className="mt-1 h-4 w-4 shrink-0 accent-primary"
                      onChange={() => handleToggleProject(project.id)}
                      type="checkbox"
                    />
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-slate-200 px-6 py-5">
            <div className="text-sm text-on-surface-variant">
              {selectedProjectIds.length} project{selectedProjectIds.length === 1 ? '' : 's'} selected
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-on-surface transition hover:bg-slate-200"
                onClick={onClose}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-gradient-to-br from-primary to-primary-dim px-4 py-2.5 text-sm font-bold text-on-primary shadow-lg shadow-primary/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!hasSelection}
                onClick={onConfirm}
                type="button"
              >
                Export HTML
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SnapshotPage({
  activeProjectName,
  projectCount,
  onOpenMasterSnapshot,
  onStartNewBoard,
  onPublishBoard,
  onExportReadOnlyBoard,
  onRestoreRecoveryDraft,
  onDiscardRecoveryDraft,
  onExportRecoveryDraft,
  registrySession,
  recoveryDraft,
  hasUnsavedChanges,
}: {
  activeProjectName: string;
  projectCount: number;
  onOpenMasterSnapshot: (source: string, fileName: string) => string;
  onStartNewBoard: () => void;
  onPublishBoard: () => string;
  onExportReadOnlyBoard: () => void;
  onRestoreRecoveryDraft: () => string;
  onDiscardRecoveryDraft: () => string;
  onExportRecoveryDraft: () => string;
  registrySession: RegistrySession;
  recoveryDraft: RecoveryDraft | null;
  hasUnsavedChanges: boolean;
}) {
  const [snapshotStatus, setSnapshotStatus] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);
  const openMasterFileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!snapshotStatus) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setSnapshotStatus(null), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [snapshotStatus]);

  async function handleMasterFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const contents = await file.text();
      const message = onOpenMasterSnapshot(contents, file.name);
      setSnapshotStatus({
        tone: 'success',
        message,
      });
    } catch (error) {
      setSnapshotStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Registry action failed.',
      });
    } finally {
      event.target.value = '';
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] px-8 py-8">
      <input
        accept=".json,application/json,text/plain"
        className="hidden"
        onChange={(event) => void handleMasterFileSelection(event)}
        ref={openMasterFileRef}
        type="file"
      />

      {snapshotStatus ? (
        <div
          className={`mb-6 rounded-2xl px-4 py-3 text-sm font-medium ${
            snapshotStatus.tone === 'success' ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
          }`}
        >
          {snapshotStatus.message}
        </div>
      ) : null}

      {!registrySession.baseDocumentId ? (
        <div className="mx-auto mt-16 max-w-4xl">
          <div className="mb-10 text-center">
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">Open Or Start A Board</h1>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-on-surface-variant">
              Choose an existing governance board JSON file, or start a new board from a blank workspace.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <button
              className="rounded-[2rem] bg-white p-8 text-left shadow-[0_14px_40px_rgba(42,52,57,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(42,52,57,0.10)]"
              onClick={() => openMasterFileRef.current?.click()}
              type="button"
            >
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-[28px]">folder_open</span>
              </div>
              <div className="text-2xl font-extrabold text-on-surface">Open Registry File</div>
              <div className="mt-3 text-sm leading-relaxed text-on-surface-variant">
                Load an existing board JSON file and continue working from that saved governance register.
              </div>
            </button>

            <button
              className="rounded-[2rem] bg-white p-8 text-left shadow-[0_14px_40px_rgba(42,52,57,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(42,52,57,0.10)]"
              onClick={onStartNewBoard}
              type="button"
            >
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <span className="material-symbols-outlined text-[28px]">add_box</span>
              </div>
              <div className="text-2xl font-extrabold text-on-surface">Start New Board</div>
              <div className="mt-3 text-sm leading-relaxed text-on-surface-variant">
                Begin with a blank governance workspace and publish the first board version when you are ready.
              </div>
            </button>
          </div>

          {recoveryDraft ? (
            <div className="mt-8 text-center text-sm text-on-surface-variant">
              Unsaved draft available from {formatHistoryTimestamp(recoveryDraft.savedAt)}.
              {' '}
              <button
                className="font-semibold text-primary underline decoration-primary/40 underline-offset-4"
                onClick={() => {
                  const message = onRestoreRecoveryDraft();
                  setSnapshotStatus({tone: 'success', message});
                }}
                type="button"
              >
                Restore draft
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(360px,1fr)_minmax(0,1fr)]">
          <section className="rounded-[1.75rem] bg-white p-6 shadow-[0_14px_40px_rgba(42,52,57,0.06)]">
            <div className="mb-5 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">folder_managed</span>
              <div>
                <h2 className="font-headline text-2xl font-extrabold text-on-surface">Current Board</h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Continue working on the board you opened, publish a new version, or switch to another board file.
                </p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Board</div>
                <div className="mt-3 space-y-2 text-sm text-on-surface-variant">
                  <div>Name: <span className="font-semibold text-on-surface">{registrySession.registryName || 'Governance Register'}</span></div>
                  <div>File: <span className="font-semibold text-on-surface">{registrySession.sourceFileName || 'New board'}</span></div>
                  <div>Opened: <span className="font-semibold text-on-surface">{registrySession.loadedAt ? formatHistoryTimestamp(registrySession.loadedAt) : 'Not loaded'}</span></div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Status</div>
                <div className="mt-3 space-y-2 text-sm text-on-surface-variant">
                  <div>Workspace: <span className="font-semibold text-on-surface">{activeProjectName}</span></div>
                  <div>Changes: <span className="font-semibold text-on-surface">{hasUnsavedChanges ? 'Unsaved changes' : 'No pending changes'}</span></div>
                  <div>{registrySession.lastPublishedAt ? `Last published ${formatHistoryTimestamp(registrySession.lastPublishedAt)}` : 'Not published yet'}</div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                className="rounded-xl bg-gradient-to-br from-primary to-primary-dim px-4 py-2.5 text-sm font-bold text-on-primary shadow-lg shadow-primary/20 transition hover:opacity-90"
                onClick={() => openMasterFileRef.current?.click()}
                type="button"
              >
                Open Board
              </button>
              <button
                className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-on-surface ring-1 ring-slate-200 transition hover:bg-slate-50"
                disabled={!registrySession.baseDocumentId}
                onClick={() => {
                  try {
                    const message = onPublishBoard();
                    setSnapshotStatus({tone: 'success', message});
                  } catch (error) {
                    setSnapshotStatus({
                      tone: 'error',
                      message: error instanceof Error ? error.message : 'Publish failed.',
                    });
                  }
                }}
                type="button"
              >
                Publish
              </button>
              <button
                className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-on-surface ring-1 ring-slate-200 transition hover:bg-slate-50"
                disabled={!registrySession.baseDocumentId}
                onClick={() => {
                  try {
                    onExportReadOnlyBoard();
                  } catch (error) {
                    setSnapshotStatus({
                      tone: 'error',
                      message: error instanceof Error ? error.message : 'Read-only export failed.',
                    });
                  }
                }}
                type="button"
              >
                Export Read-Only HTML
              </button>
              <button
                className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-on-surface transition hover:bg-slate-200"
                onClick={onStartNewBoard}
                type="button"
              >
                Start New Board
              </button>
            </div>
          </section>

          <section className="rounded-[1.75rem] bg-white p-6 shadow-[0_14px_40px_rgba(42,52,57,0.06)]">
            <div className="mb-5 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">restore_page</span>
              <div>
                <h2 className="font-headline text-2xl font-extrabold text-on-surface">Draft Recovery</h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Restore a recent unsaved draft if the browser was closed or refreshed before you published.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-on-surface-variant">
              {recoveryDraft ? (
                <>
                  Saved at {formatHistoryTimestamp(recoveryDraft.savedAt)}.
                  {' '}
                  {recoveryDraft.session.baseRevision != null ? `Based on board version ${recoveryDraft.session.baseRevision}.` : ''}
                </>
              ) : (
                'No local recovery draft is available right now.'
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-on-surface transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!recoveryDraft}
                onClick={() => {
                  const message = onRestoreRecoveryDraft();
                  setSnapshotStatus({tone: 'success', message});
                }}
                type="button"
              >
                Restore Draft
              </button>
              <button
                className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-800 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!recoveryDraft}
                onClick={() => {
                  const message = onDiscardRecoveryDraft();
                  setSnapshotStatus({tone: 'success', message});
                }}
                type="button"
              >
                Discard Draft
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function RiskRegisterPage({
  activeProject,
  risks,
  sharedRiskSubscriptions,
  sharedRisks,
  projects,
  selectedRiskId,
  selectedRisk,
  onSelectRisk,
  onSelectSharedRisk,
  onCreateLinkedLocalRisk,
  onAcknowledgeSharedRisk,
  onMarkSharedRiskNotApplicable,
  onShowDecision,
  scoringModel,
  decisions,
}: {
  activeProject: Project;
  risks: Risk[];
  sharedRiskSubscriptions: SharedRiskSubscription[];
  sharedRisks: SharedRisk[];
  projects: Project[];
  selectedRiskId: string;
  selectedRisk: Risk | null;
  onSelectRisk: (riskId: string) => void;
  onSelectSharedRisk: (sharedRiskId: string) => void;
  onCreateLinkedLocalRisk: (sharedRiskId: string) => void;
  onAcknowledgeSharedRisk: (sharedRiskId: string, comment: string) => void;
  onMarkSharedRiskNotApplicable: (sharedRiskId: string) => void;
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

  function requestSharedRiskAcknowledgement(sharedRiskId: string) {
    const subscription = sharedRiskSubscriptions.find((item) => item.sharedRiskId === sharedRiskId);
    const sharedRisk = sharedRisks.find((item) => item.id === sharedRiskId);
    const fromVersion =
      subscription?.lastReviewedSharedRiskVersion ??
      (sharedRisk && sharedRisk.versionNumber > 1 ? sharedRisk.versionNumber - 1 : 1);
    const toVersion = sharedRisk?.versionNumber ?? fromVersion;
    const response = window.prompt(
      `Enter the acknowledgement rationale/comment for reviewing the shared-risk change v${fromVersion} -> v${toVersion}.`,
    );
    if (!response || !response.trim()) {
      return;
    }

    onAcknowledgeSharedRisk(sharedRiskId, response.trim());
  }

  const openRisks = risks
    .filter((risk) => !isRetiredRiskStatus(risk.status))
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
  const retiredRisks = risks.filter((risk) => isRetiredRiskStatus(risk.status));
  const projectSharedRisks = sharedRiskSubscriptions
    .map((subscription) => {
      const sharedRisk = sharedRisks.find((risk) => risk.id === subscription.sharedRiskId);
      if (!sharedRisk) {
        return null;
      }

      const sourceProject = projects.find((project) => project.id === sharedRisk.sourceProjectId);
      const linkedLocalRisk = subscription.linkedLocalRiskId
        ? risks.find((risk) => risk.id === subscription.linkedLocalRiskId) ?? null
        : null;

      return {
        subscription,
        sharedRisk,
        sourceProjectName: sourceProject?.name ?? sharedRisk.sourceProjectId,
        linkedLocalRisk,
      };
    })
    .filter(
      (
        row,
      ): row is {
        subscription: SharedRiskSubscription;
        sharedRisk: SharedRisk;
        sourceProjectName: string;
        linkedLocalRisk: Risk | null;
      } => row != null,
    );
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

      <section className="mb-5 overflow-hidden rounded-[1.75rem] bg-white shadow-[0_14px_40px_rgba(42,52,57,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 px-6 py-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Shared Risks</div>
            <div className="mt-1 text-sm text-on-surface-variant">
              Read-only source-owned risks subscribed into this project. Create a linked local risk when local scoring or handling is needed.
            </div>
          </div>
        </div>

        {projectSharedRisks.length === 0 ? (
          <div className="px-6 py-8 text-sm leading-relaxed text-on-surface-variant">
            No shared risks are subscribed into this project yet. Use the `Shared Library` to subscribe a shared risk, then manage any local response through a linked local risk here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] border-collapse text-left">
              <thead className="bg-surface-container-low/70 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-6 py-4">Shared Risk</th>
                  <th className="px-6 py-4">Source Project</th>
                  <th className="px-6 py-4">Owner / Status</th>
                  <th className="px-6 py-4">Upstream Score</th>
                  <th className="px-6 py-4">Version</th>
                  <th className="px-6 py-4">Subscription</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projectSharedRisks.map(({subscription, sharedRisk, sourceProjectName, linkedLocalRisk}, index) => (
                  <tr
                    key={subscription.id}
                    className={`border-t border-slate-200/60 ${index % 2 === 1 ? 'bg-slate-50/60' : ''}`}
                  >
                    <td className="px-6 py-5">
                      <button
                        className="text-left transition hover:opacity-80"
                        onClick={() => onSelectSharedRisk(sharedRisk.id)}
                        type="button"
                      >
                        <div className="font-mono text-sm font-bold text-primary">{sharedRisk.referenceCode}</div>
                        <div className="mt-1 text-sm font-bold text-on-surface">{sharedRisk.title}</div>
                      </button>
                    </td>
                    <td className="px-6 py-5 text-sm text-on-surface-variant">{sourceProjectName}</td>
                    <td className="px-6 py-5 text-sm text-on-surface-variant">
                      {sharedRisk.owner || 'Not assigned'} · {sharedRisk.status}
                    </td>
                    <td className="px-6 py-5 text-sm text-on-surface-variant">
                      Likelihood {sharedRisk.upstreamLikelihood} · Impact {sharedRisk.upstreamImpact}
                    </td>
                    <td className="px-6 py-5 text-sm font-semibold text-on-surface">v{sharedRisk.versionNumber}</td>
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600">
                          {subscription.state.replace('_', ' ')}
                        </span>
                        {linkedLocalRisk ? (
                          <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
                            Linked local risk {linkedLocalRisk.id}
                          </span>
                        ) : null}
                        {subscription.state === 'review_required' ? (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-amber-800">
                            Review required
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700 transition hover:bg-slate-200"
                          onClick={() => onSelectSharedRisk(sharedRisk.id)}
                          type="button"
                        >
                          View
                        </button>
                        <button
                          className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-on-surface ring-1 ring-slate-200 transition hover:bg-slate-50"
                          onClick={() => onCreateLinkedLocalRisk(sharedRisk.id)}
                          type="button"
                        >
                          {linkedLocalRisk ? 'Open Linked Local Risk' : 'Create Linked Local Risk'}
                        </button>
                        {subscription.state === 'review_required' ? (
                          <button
                            className="rounded-full bg-amber-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-amber-900 transition hover:bg-amber-200"
                            onClick={() => requestSharedRiskAcknowledgement(sharedRisk.id)}
                            type="button"
                          >
                            Acknowledge
                          </button>
                        ) : null}
                        {subscription.state !== 'not_applicable' ? (
                          <button
                            className="rounded-full bg-rose-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-rose-700 transition hover:bg-rose-100"
                            onClick={() => onMarkSharedRiskNotApplicable(sharedRisk.id)}
                            type="button"
                          >
                            Mark Not Applicable
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
                Start by logging a new risk, or go to `Registry Source` to open the current board file or import a JSON file before you begin working.
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
                        {(['All', 'Pending', 'Active', 'Monitoring'] as Array<'All' | RiskStatus>).map((option) => (
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
                        <td className="px-6 py-5 font-mono text-sm font-bold text-primary">
                          {formatProjectScopedId(activeProject.projectKey, risk.id)}
                        </td>
                        <td className="px-6 py-5">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-sm font-bold text-on-surface">{risk.title}</div>
                              {risk.sharedRiskId ? (
                                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
                                  {risk.sharedRiskRole === 'source' ? 'Published' : 'Linked'}
                                </span>
                              ) : null}
                            </div>
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
                        <td className="px-6 py-5 text-sm tabular-nums text-on-surface-variant">
                          {formatHistoryTimestamp(risk.lastUpdated)}
                        </td>
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
              <span className="font-semibold text-on-surface">
                {selectedRisk ? formatProjectScopedId(activeProject.projectKey, selectedRisk.id) : 'None selected'}
              </span>
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
                    <td className="px-6 py-5 font-mono text-sm font-bold text-slate-500">
                      {formatProjectScopedId(activeProject.projectKey, risk.id)}
                    </td>
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
                    <td className="px-6 py-5 text-sm tabular-nums">{formatHistoryTimestamp(risk.lastUpdated)}</td>
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
  onShareDecision,
  onUnshareDecision,
  onPublishSharedDecision,
  onRefreshFromSharedDecision,
  sharedDecisions,
  projects,
  activeProjectId,
}: {
  decisions: Decision[];
  selectedDecision: Decision | null;
  risks: Risk[];
  onSelectDecision: (decisionId: string) => void;
  onUpdateDecision: (decisionId: string, updates: Partial<Decision>) => void;
  onDeleteDecision: (decisionId: string) => void;
  onShowRisk: (riskId: string) => void;
  onShareDecision: (decisionId: string) => void;
  onUnshareDecision: (decisionId: string) => void;
  onPublishSharedDecision: (decisionId: string) => void;
  onRefreshFromSharedDecision: (decisionId: string) => void;
  sharedDecisions: SharedDecision[];
  projects: Project[];
  activeProjectId: string;
}) {
  const [statusFilter, setStatusFilter] = useState<'All' | DecisionStatus>('All');
  const [deciderFilter, setDeciderFilter] = useState('All');
  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0];
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
    const headers = ['ID', 'Scoped ID', 'Title', 'Status', 'Deciders', 'Roles', 'Updated', 'Linked Risks', 'Summary'];
    const rows = filteredCurrentDecisions.map((decision) => [
      decision.id,
      formatProjectScopedId(activeProject.projectKey, decision.id),
      decision.title,
      decision.status,
      decision.deciders,
      decision.deciderRoles,
      getDecisionActivityLabel(decision),
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
              <th className="whitespace-nowrap px-5 py-4">Updated</th>
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
                  <td className={`whitespace-nowrap px-5 py-5 font-mono text-sm font-bold ${dimmed ? 'text-slate-500' : 'text-primary'}`}>
                    {formatProjectScopedId(activeProject.projectKey, decision.id)}
                  </td>
                  <td className="px-5 py-5">
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className={`text-sm font-bold ${dimmed ? 'text-slate-600' : 'text-on-surface'}`}>{decision.title}</div>
                        {decision.sharedDecisionId ? (
                          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
                            Shared
                          </span>
                        ) : null}
                      </div>
                      <div className="line-clamp-1 text-xs text-on-surface-variant">{getDecisionPreview(decision)}</div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-5">
                    <DecisionStatusBadge status={decision.status} />
                  </td>
                  <td className="whitespace-nowrap px-5 py-5 text-sm font-medium text-on-surface-variant">
                    <div>{decision.deciders}</div>
                    {decision.deciderRoles ? (
                      <div className="mt-1 text-xs text-slate-400">{decision.deciderRoles}</div>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-5 py-5 text-sm tabular-nums text-on-surface">{getDecisionActivityLabel(decision)}</td>
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
            activeProject={activeProject}
            decision={selectedDecision}
            risks={risks}
            onUpdate={(updates) => onUpdateDecision(selectedDecision.id, updates)}
            onDelete={() => onDeleteDecision(selectedDecision.id)}
            onShowRisk={onShowRisk}
            onShareDecision={() => onShareDecision(selectedDecision.id)}
            onUnshareDecision={() => onUnshareDecision(selectedDecision.id)}
            onPublishSharedDecision={() => onPublishSharedDecision(selectedDecision.id)}
            onRefreshFromSharedDecision={() => onRefreshFromSharedDecision(selectedDecision.id)}
            sharedDecision={sharedDecisions.find((item) => item.id === selectedDecision.sharedDecisionId) ?? null}
            sharedUsages={
              selectedDecision.sharedDecisionId
                ? projects.flatMap((project) =>
                    project.decisions
                      .filter((decision) => decision.sharedDecisionId === selectedDecision.sharedDecisionId)
                      .map((decision) => ({
                        projectId: project.id,
                        projectKey: project.projectKey,
                        projectName: project.name,
                        decision,
                        isActiveProject: project.id === activeProjectId,
                      })),
                  )
                : []
            }
          />
        ) : (
          <div className="flex items-center justify-center rounded-[1.75rem] bg-white p-12 shadow-[0_14px_40px_rgba(42,52,57,0.06)]">
            <div className="max-w-md text-center">
              <div className="text-lg font-bold text-on-surface">No decisions in this project yet</div>
              <div className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                Start by logging a new decision, or go to `Registry Source` to open the current board file or import a JSON file that already contains register data.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DecisionDetailPanel({
  activeProject,
  decision,
  risks,
  onUpdate,
  onDelete,
  onShowRisk,
  onShareDecision,
  onUnshareDecision,
  onPublishSharedDecision,
  onRefreshFromSharedDecision,
  sharedDecision,
  sharedUsages,
}: {
  activeProject: Project;
  decision: Decision;
  risks: Risk[];
  onUpdate: (updates: Partial<Decision>) => void;
  onDelete: () => void;
  onShowRisk: (riskId: string) => void;
  onShareDecision: () => void;
  onUnshareDecision: () => void;
  onPublishSharedDecision: () => void;
  onRefreshFromSharedDecision: () => void;
  sharedDecision: SharedDecision | null;
  sharedUsages: Array<{projectId: string; projectKey: string; projectName: string; decision: Decision; isActiveProject: boolean}>;
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
            <div className="font-mono text-[11px] font-bold text-primary">
              {formatProjectScopedId(activeProject.projectKey, decision.id)}
            </div>
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
            {!decision.sharedDecisionId ? (
              <button
                className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700 transition hover:bg-slate-200"
                onClick={onShareDecision}
                type="button"
              >
                Share
              </button>
            ) : (
              <>
                <button
                  className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700 transition hover:bg-slate-200"
                  onClick={onRefreshFromSharedDecision}
                  type="button"
                >
                  Refresh
                </button>
                <button
                  className="rounded-full bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-primary-dim"
                  onClick={onPublishSharedDecision}
                  type="button"
                >
                  Update Shared
                </button>
                <button
                  className="rounded-full bg-rose-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-rose-700 transition hover:bg-rose-100"
                  onClick={onUnshareDecision}
                  type="button"
                >
                  Unshare
                </button>
              </>
            )}
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

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Status</div>
            <select
              className="w-full bg-transparent text-sm font-semibold text-on-surface outline-none"
              disabled={decision.statusLocked}
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
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Roles</div>
            <EditableText
              className="text-sm font-semibold text-on-surface"
              value={decision.deciderRoles}
              placeholder="Approver roles..."
              onSave={(v) => save({deciderRoles: v}, 'Roles updated')}
            />
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Updated</div>
            <div className="text-sm font-semibold text-on-surface">{getDecisionActivityLabel(decision)}</div>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-2">
          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Decision Date</div>
            <EditableText
              className="text-sm font-semibold text-on-surface"
              value={decision.date}
              placeholder="e.g. Apr 09, 2026"
              onSave={(v) => save({date: v}, 'Decision date updated')}
            />
          </div>
          <label className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-semibold text-on-surface">
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Status Lock</div>
              <div className="text-sm font-semibold text-on-surface">
                {decision.statusLocked ? 'Locked until manually unchecked' : 'Unlocked'}
              </div>
            </div>
            <input
              checked={decision.statusLocked}
              className="h-4 w-4 accent-primary"
              onChange={(event) =>
                save(
                  {statusLocked: event.target.checked},
                  event.target.checked ? 'Status locked' : 'Status unlocked',
                )
              }
              type="checkbox"
            />
          </label>
        </div>
        {decision.sharedDecisionId ? (
          <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-4">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
                Shared Decision {decision.sharedDecisionId}
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600">
                Used in {sharedUsages.length} project{sharedUsages.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="text-sm leading-relaxed text-on-surface-variant">
              The shared decision description can be reused across projects, while status, deciders, date, linked risks, and local follow-through remain project-specific.
            </div>
            {sharedDecision ? (
              <div className="mt-3 space-y-2">
                {sharedUsages.map((usage) => (
                  <div key={`${decision.sharedDecisionId}-${usage.projectId}`} className="rounded-xl bg-white px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-on-surface">
                        {usage.projectName}
                        {usage.isActiveProject ? ' (current project)' : ''}
                      </div>
                      <div className="text-right text-xs text-on-surface-variant">
                        <div>Status {usage.decision.status}</div>
                        <div>{formatProjectScopedId(usage.projectKey, usage.decision.id)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
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
          onUpdate={(i, v) =>
            save(
              {decisionDrivers: decision.decisionDrivers.map((item, index) => (index === i ? v : item))},
              'Driver updated',
            )
          }
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
          onUpdate={(i, v) =>
            save(
              {consideredOptions: decision.consideredOptions.map((item, index) => (index === i ? v : item))},
              'Option updated',
            )
          }
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
            onUpdate={(i, v) =>
              save(
                {
                  goodConsequences: decision.goodConsequences.map((item, index) =>
                    index === i ? v : item,
                  ),
                },
                'Consequence updated',
              )
            }
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
            onUpdate={(i, v) =>
              save(
                {
                  badConsequences: decision.badConsequences.map((item, index) =>
                    index === i ? v : item,
                  ),
                },
                'Consequence updated',
              )
            }
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
    <span className={`group inline-flex items-start gap-1 rounded-lg px-0.5 ${className ?? ''}`}>
      <span>{value || <span className="text-slate-400">{placeholder}</span>}</span>
      <button
        className="inline-flex rounded-full p-0.5 text-slate-300 opacity-0 transition hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-60"
        onClick={() => setEditing(true)}
        title="Edit"
        type="button"
      >
        <span className="material-symbols-outlined text-[13px] text-current">edit</span>
      </button>
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
      <p className="whitespace-pre-line text-sm leading-relaxed text-on-surface">
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
  onUpdate,
  onRemove,
  numbered = false,
}: {
  items: string[];
  placeholder: string;
  onAdd: (value: string) => void;
  onUpdate?: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  numbered?: boolean;
}) {
  const [draft, setDraft] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState('');

  return (
    <div>
      <div className="space-y-1.5">
        {items.map((item, index) => {
          const isEditing = editingIndex === index;
          return (
            <div
              key={`${item}-${index}`}
              className={`group flex items-start gap-2 rounded-xl border px-3 py-2.5 transition ${
                isEditing
                  ? 'border-primary/25 bg-primary/5'
                  : 'border-slate-200/80 bg-slate-50/55 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className="mt-0.5 shrink-0 text-xs font-bold text-slate-400">
                {numbered ? `${index + 1}.` : '•'}
              </span>
              {isEditing ? (
                <div className="flex-1">
                  <input
                    autoFocus
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary/40"
                    value={editDraft}
                    onChange={(event) => setEditDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && editDraft.trim()) {
                        onUpdate?.(index, editDraft.trim());
                        setEditingIndex(null);
                        setEditDraft('');
                      }
                      if (event.key === 'Escape') {
                        setEditingIndex(null);
                        setEditDraft('');
                      }
                    }}
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      className="rounded-full bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition hover:opacity-90 disabled:opacity-40"
                      disabled={!editDraft.trim()}
                      onClick={() => {
                        if (!editDraft.trim()) return;
                        onUpdate?.(index, editDraft.trim());
                        setEditingIndex(null);
                        setEditDraft('');
                      }}
                      type="button"
                    >
                      Save
                    </button>
                    <button
                      className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-200"
                      onClick={() => {
                        setEditingIndex(null);
                        setEditDraft('');
                      }}
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="min-w-0 flex-1 rounded-lg px-1 py-0.5 text-sm text-on-surface">
                    <span className="block">{item}</span>
                  </div>
                  <div className="mt-0.5 flex shrink-0 items-center self-start gap-1">
                    {onUpdate ? (
                      <button
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/85 p-0 text-slate-400 ring-1 ring-slate-200 transition hover:text-slate-700"
                        onClick={() => {
                          setEditingIndex(index);
                          setEditDraft(item);
                        }}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[13px]">edit</span>
                      </button>
                    ) : null}
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/85 p-0 text-slate-300 ring-1 ring-slate-200 transition hover:text-error"
                      onClick={() => onRemove(index)}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[13px]">close</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
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

function DraftDecisionListEditor({
  items,
  placeholder,
  addLabel,
  onChange,
}: {
  items: string[];
  placeholder: string;
  addLabel: string;
  onChange: (items: string[]) => void;
}) {
  const rows = items.length > 0 ? items : [''];

  return (
    <div className="space-y-2">
      {rows.map((item, index) => (
        <div
          key={`draft-item-${index}`}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
        >
          <span className="shrink-0 text-base font-bold text-slate-400">•</span>
          <input
            className="flex-1 bg-transparent text-sm text-on-surface outline-none"
            onChange={(event) => {
              const nextItems = [...rows];
              nextItems[index] = event.target.value;
              onChange(nextItems);
            }}
            placeholder={placeholder}
            value={item}
          />
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 p-0 text-slate-300 ring-1 ring-slate-200 transition hover:text-error"
            onClick={() => {
              const nextItems = rows.filter((_, currentIndex) => currentIndex !== index);
              onChange(nextItems);
            }}
            type="button"
          >
            <span className="material-symbols-outlined text-[13px]">close</span>
          </button>
        </div>
      ))}
      <button
        className="rounded-xl bg-slate-100 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-200"
        onClick={() => onChange([...rows, ''])}
        type="button"
      >
        {addLabel}
      </button>
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
    deciderRoles: string;
    date: string;
    context: string;
    decisionDrivers: string[];
    consideredOptions: string[];
    outcome: string;
    goodConsequences: string[];
    badConsequences: string[];
  }) => void;
}) {
  const backdropPressStarted = useRef(false);
  const [form, setForm] = useState({
    id: nextDecisionId,
    title: '',
    status: 'Proposed' as DecisionStatus,
    deciders: '',
    deciderRoles: '',
    date: new Date().toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'}),
    context: '',
    decisionDrivers: [''],
    consideredOptions: [''],
    outcome: '',
    goodConsequences: [''],
    badConsequences: [''],
  });

  function resetDecisionDraft() {
    setForm({
      id: nextDecisionId,
      title: '',
      status: 'Proposed',
      deciders: '',
      deciderRoles: '',
      date: new Date().toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'}),
      context: '',
      decisionDrivers: [''],
      consideredOptions: [''],
      outcome: '',
      goodConsequences: [''],
      badConsequences: [''],
    });
  }

  useEffect(() => {
    if (
      !open &&
      !form.title &&
      !form.deciders &&
      !form.deciderRoles &&
      !form.context &&
      form.decisionDrivers.every((item) => !item.trim()) &&
      form.consideredOptions.every((item) => !item.trim()) &&
      !form.outcome &&
      form.goodConsequences.every((item) => !item.trim()) &&
      form.badConsequences.every((item) => !item.trim()) &&
      form.id !== nextDecisionId
    ) {
      setForm((current) => ({...current, id: nextDecisionId}));
    }
  }, [
    form.consideredOptions,
    form.context,
    form.deciders,
    form.deciderRoles,
    form.decisionDrivers,
    form.goodConsequences,
    form.id,
    form.badConsequences,
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

  function field(key: 'id' | 'title' | 'status' | 'deciders' | 'deciderRoles' | 'date' | 'context' | 'outcome', value: string) {
    setForm((f) => ({...f, [key]: value}));
  }

  function listField(
    key: 'decisionDrivers' | 'consideredOptions' | 'goodConsequences' | 'badConsequences',
    value: string[],
  ) {
    setForm((current) => ({...current, [key]: value}));
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
              <FormField label="Decider Roles">
                <input
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-primary/40"
                  placeholder="e.g. Chief Engineer, Program Manager"
                  value={form.deciderRoles}
                  onChange={(e) => field('deciderRoles', e.target.value)}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Decision Date">
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
              <DraftDecisionListEditor
                addLabel="Add Driver"
                items={form.decisionDrivers}
                onChange={(value) => listField('decisionDrivers', value)}
                placeholder="Add a decision driver…"
              />
            </FormField>

            <FormField label="Considered Options">
              <DraftDecisionListEditor
                addLabel="Add Option"
                items={form.consideredOptions}
                onChange={(value) => listField('consideredOptions', value)}
                placeholder="Add an option…"
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

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <FormField label="Positive Consequences">
                <DraftDecisionListEditor
                  addLabel="Add Positive"
                  items={form.goodConsequences}
                  onChange={(value) => listField('goodConsequences', value)}
                  placeholder="Add a positive consequence…"
                />
              </FormField>

              <FormField label="Negative Consequences">
                <DraftDecisionListEditor
                  addLabel="Add Negative"
                  items={form.badConsequences}
                  onChange={(value) => listField('badConsequences', value)}
                  placeholder="Add a negative consequence…"
                />
              </FormField>
            </div>
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
                    deciderRoles: form.deciderRoles,
                    date: form.date,
                    context: form.context,
                    decisionDrivers: form.decisionDrivers.map((item) => item.trim()).filter(Boolean),
                    consideredOptions: form.consideredOptions.map((item) => item.trim()).filter(Boolean),
                    outcome: form.outcome,
                    goodConsequences: form.goodConsequences.map((item) => item.trim()).filter(Boolean),
                    badConsequences: form.badConsequences.map((item) => item.trim()).filter(Boolean),
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

function SharedRiskDrawer({
  open,
  sharedRisk,
  subscription,
  linkedLocalRisk,
  sourceProject,
  onClose,
  onCreateLinkedLocalRisk,
  onAcknowledge,
  onMarkNotApplicable,
}: {
  open: boolean;
  sharedRisk: SharedRisk;
  subscription: SharedRiskSubscription;
  linkedLocalRisk: Risk | null;
  sourceProject: Project;
  onClose: () => void;
  onCreateLinkedLocalRisk: () => void;
  onAcknowledge: (comment: string) => void;
  onMarkNotApplicable: () => void;
}) {
  const backdropPressStarted = useRef(false);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/10"
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
      <aside
        className="fixed inset-y-0 right-0 flex w-[28rem] flex-col border-l border-slate-200 bg-white shadow-[-20px_0_50px_rgba(42,52,57,0.12)]"
        onClick={(event) => event.stopPropagation()}
        onMouseDown={() => {
          backdropPressStarted.current = false;
        }}
      >
        <div className="shrink-0 border-b border-slate-200 px-6 py-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                Shared Risk {sharedRisk.referenceCode}
              </div>
              <h2 className="mt-1 font-headline text-2xl font-extrabold leading-tight text-on-surface">
                {sharedRisk.title}
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

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
              Source-owned
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600">
              Version v{sharedRisk.versionNumber}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600">
              {subscription.state.replace('_', ' ')}
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-4 text-sm leading-relaxed text-on-surface-variant">
            This shared risk is read-only in this project. The source project owns the upstream statement and assessment. Create a linked local risk when this project needs its own local scoring, ownership, response, or due dates.
          </div>

          <div className="grid gap-3">
            <DrawerMeta label="Source project" value={sourceProject.name} />
            <DrawerMeta label="Owner" value={sharedRisk.owner || 'Not assigned'} />
            <DrawerMeta label="Status" value={sharedRisk.status} />
            <DrawerMeta label="Upstream likelihood" value={`${sharedRisk.upstreamLikelihood}`} />
            <DrawerMeta label="Upstream impact" value={`${sharedRisk.upstreamImpact}`} />
            <DrawerMeta label="Updated" value={formatHistoryTimestamp(sharedRisk.updatedAt)} />
          </div>

          <DrawerSection title="Shared Statement">
            <div className="rounded-2xl bg-surface-container-low p-4 text-sm leading-relaxed text-on-surface">
              {renderStatementWithBoldKeywords(sharedRisk.statement)}
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <DrawerMeta label="Trigger / Condition" value={sharedRisk.trigger} />
              <DrawerMeta label="Consequence" value={sharedRisk.consequence} />
            </div>
          </DrawerSection>

          <DrawerSection title="Review Status">
            <div className="space-y-3">
              <DrawerMeta label="Subscription state" value={subscription.state.replace('_', ' ')} />
              <DrawerMeta
                label="Last reviewed version"
                value={subscription.lastReviewedSharedRiskVersion != null ? `v${subscription.lastReviewedSharedRiskVersion}` : 'Not yet reviewed'}
              />
              {linkedLocalRisk ? (
                <DrawerMeta
                  label="Linked local risk"
                  value={`${linkedLocalRisk.id} · ${linkedLocalRisk.sharedReviewStatus ?? 'current'}`}
                />
              ) : (
                <DrawerMeta label="Linked local risk" value="None yet" />
              )}
            </div>
          </DrawerSection>

          {sharedRisk.lastChangeSummary.length > 0 ? (
            <DrawerSection title="Recent Shared Changes">
              <div className="rounded-2xl bg-surface-container-low p-4">
                <div className="space-y-2 text-sm leading-relaxed text-on-surface-variant">
                  {sharedRisk.lastChangeSummary.map((change) => (
                    <div key={change}>{change}</div>
                  ))}
                </div>
              </div>
            </DrawerSection>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-primary-dim"
              onClick={onCreateLinkedLocalRisk}
              type="button"
            >
              {linkedLocalRisk ? 'Open Linked Local Risk' : 'Create Linked Local Risk'}
            </button>
            {subscription.state === 'review_required' ? (
              <button
                className="rounded-full bg-amber-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-amber-900 transition hover:bg-amber-200"
                onClick={() => {
                  const fromVersion =
                    subscription.lastReviewedSharedRiskVersion ??
                    (sharedRisk.versionNumber > 1 ? sharedRisk.versionNumber - 1 : 1);
                  const response = window.prompt(
                    `Enter the acknowledgement rationale/comment for reviewing the shared-risk change v${fromVersion} -> v${sharedRisk.versionNumber}.`,
                  );
                  if (!response || !response.trim()) {
                    return;
                  }
                  onAcknowledge(response.trim());
                }}
                type="button"
              >
                Acknowledge
              </button>
            ) : null}
            {subscription.state !== 'not_applicable' ? (
              <button
                className="rounded-full bg-rose-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-rose-700 transition hover:bg-rose-100"
                onClick={onMarkNotApplicable}
                type="button"
              >
                Mark Not Applicable
              </button>
            ) : null}
          </div>
        </div>
      </aside>
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
  linkedDecisionOptions,
  decisions,
  projects,
  sharedRisks,
  sharedRiskSubscriptions,
  activeProjectId,
  onShareRisk,
  onUnshareRisk,
  onOpenSharedRisk,
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
  linkedDecisionOptions: SelectOption[];
  decisions: Decision[];
  projects: Project[];
  sharedRisks: SharedRisk[];
  sharedRiskSubscriptions: SharedRiskSubscription[];
  activeProjectId: string;
  onShareRisk: (riskId: string) => void;
  onUnshareRisk: (riskId: string) => void;
  onOpenSharedRisk: (sharedRiskId: string) => void;
}) {
  const backdropPressStarted = useRef(false);
  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0];
  const [editingField, setEditingField] = useState<QuickEditFieldName | null>(null);
  const [savedFieldLabel, setSavedFieldLabel] = useState<string | null>(null);
  const [editingStatement, setEditingStatement] = useState(false);
  const [editingMitigation, setEditingMitigation] = useState(false);
  const [pendingScoreChange, setPendingScoreChange] = useState<{field: 'likelihood' | 'impact'; value: number} | null>(null);
  const [scoreChangeReason, setScoreChangeReason] = useState('');
  const [pendingClosureStatus, setPendingClosureStatus] = useState<RiskStatus | null>(null);
  const [closureReason, setClosureReason] = useState('');
  const [commentDraft, setCommentDraft] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [commentEditDraft, setCommentEditDraft] = useState('');
  const [actionDraft, setActionDraft] = useState({title: '', owner: '', dueDate: ''});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingRiskId, setEditingRiskId] = useState(false);
  const [riskIdDraft, setRiskIdDraft] = useState(risk.id);
  const [riskIdError, setRiskIdError] = useState('');
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [projectedResidualOpen, setProjectedResidualOpen] = useState(false);
  const [mitigationActionsOpen, setMitigationActionsOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [recordDetailsOpen, setRecordDetailsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sharedRiskDetailsOpen, setSharedRiskDetailsOpen] = useState(false);
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
    setPendingClosureStatus(null);
    setClosureReason('');
    setCommentDraft('');
    setEditingCommentId(null);
    setCommentEditDraft('');
    setActionDraft({title: '', owner: '', dueDate: ''});
    setConfirmDelete(false);
    setEditingRiskId(false);
    setRiskIdDraft(risk.id);
    setRiskIdError('');
    setHistoryExpanded(false);
    setProjectedResidualOpen(false);
    setMitigationActionsOpen(false);
    setCommentsOpen(false);
    setRecordDetailsOpen(false);
    setHistoryOpen(false);
    setSharedRiskDetailsOpen(false);
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
      field === 'likelihood' || field === 'impact' || field === 'residualLikelihood' || field === 'residualImpact'
        ? Number(value)
        : value;

    if (risk[field] === normalizedValue) {
      return;
    }

    if (field === 'likelihood' || field === 'impact') {
      setPendingScoreChange({field, value: normalizedValue as number});
      setScoreChangeReason('');
      return;
    }

    if (field === 'status' && isRetiredRiskStatus(normalizedValue as RiskStatus)) {
      setPendingClosureStatus(normalizedValue as RiskStatus);
      setClosureReason('');
      return;
    }

    const fieldLabels: Record<QuickEditFieldName, string> = {
      owner: 'Owner updated',
      dueDate: 'Due date updated',
      status: 'Status updated',
      linkedDecision: 'Linked decision updated',
      responseType: 'Response updated',
      likelihood: 'Likelihood updated',
      impact: 'Impact updated',
      residualLikelihood: 'Projected residual likelihood updated',
      residualImpact: 'Projected residual impact updated',
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
    const changeDescription = `${fieldLabel} updated (${oldValue} ${oldLabel} → ${newValue} ${newLabel})\nRationale: ${scoreChangeReason.trim()}`;

    onUpdateRisk(
      risk.id,
      {[pendingScoreChange.field]: pendingScoreChange.value} as Partial<Risk>,
      changeDescription,
    );
    setSavedFieldLabel(`${pendingScoreChange.field === 'likelihood' ? 'Likelihood' : 'Impact'} updated`);
    setPendingScoreChange(null);
    setScoreChangeReason('');
  }

  function confirmRiskClosure() {
    if (!pendingClosureStatus || !closureReason.trim()) {
      return;
    }

    const statusLabel =
      pendingClosureStatus === 'Converted to Issue'
        ? 'Risk converted to issue'
        : pendingClosureStatus === 'Rejected'
          ? 'Risk rejected'
          : 'Risk closed';

    onUpdateRisk(
      risk.id,
      {status: pendingClosureStatus},
      `${statusLabel}\nRationale: ${closureReason.trim()}`,
    );
    setSavedFieldLabel(statusLabel);
    setPendingClosureStatus(null);
    setClosureReason('');
    setConfirmDelete(false);
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
    const statementUpdates = {
      trigger: draftNarrative.trigger,
      consequence: draftNarrative.consequence,
      statement: buildRiskStatement(draftNarrative.trigger, draftNarrative.consequence),
    };

    onUpdateRisk(risk.id, statementUpdates, 'Risk statement updated');

    setEditingStatement(false);
    setSavedFieldLabel(
      risk.sharedRiskRole === 'source' && risk.sharedRiskId
        ? 'Source shared risk updated'
        : 'Risk statement saved',
    );
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

  function addMitigationAction() {
    if (!actionDraft.title.trim()) {
      return;
    }

    const nextActions: MitigationAction[] = [
      ...risk.mitigationActions,
      {
        id: `mitigation-action-${Date.now()}`,
        title: actionDraft.title.trim(),
        owner: actionDraft.owner.trim(),
        dueDate: actionDraft.dueDate,
        status: 'Not Started',
      },
    ];

    onUpdateRisk(risk.id, {mitigationActions: nextActions}, 'Mitigation action added');
    setActionDraft({title: '', owner: '', dueDate: ''});
    setSavedFieldLabel('Mitigation action added');
  }

  function updateMitigationAction(actionId: string, updates: Partial<MitigationAction>) {
    onUpdateRisk(
      risk.id,
      {
        mitigationActions: risk.mitigationActions.map((action) =>
          action.id === actionId ? {...action, ...updates} : action,
        ),
      },
      'Mitigation action updated',
    );
    setSavedFieldLabel('Mitigation action updated');
  }

  function deleteMitigationAction(actionId: string) {
    onUpdateRisk(
      risk.id,
      {mitigationActions: risk.mitigationActions.filter((action) => action.id !== actionId)},
      'Mitigation action removed',
    );
    setSavedFieldLabel('Mitigation action removed');
  }

  function addComment() {
    if (!commentDraft.trim()) {
      return;
    }

    const now = new Date().toISOString();
    const nextComments: RiskComment[] = [
      {
        id: `comment-${Date.now()}`,
        body: commentDraft.trim(),
        author: 'Local edit',
        createdAt: now,
        updatedAt: now,
      },
      ...risk.comments,
    ];

    onUpdateRisk(risk.id, {comments: nextComments}, 'Comment added');
    setCommentDraft('');
    setSavedFieldLabel('Comment added');
  }

  function beginEditComment(comment: RiskComment) {
    setEditingCommentId(comment.id);
    setCommentEditDraft(comment.body);
  }

  function saveCommentEdit(commentId: string) {
    if (!commentEditDraft.trim()) {
      return;
    }

    onUpdateRisk(
      risk.id,
      {
        comments: risk.comments.map((comment) =>
          comment.id === commentId
            ? {...comment, body: commentEditDraft.trim(), updatedAt: new Date().toISOString()}
            : comment,
        ),
      },
      'Comment updated',
    );
    setEditingCommentId(null);
    setCommentEditDraft('');
    setSavedFieldLabel('Comment updated');
  }

  function deleteComment(commentId: string) {
    onUpdateRisk(
      risk.id,
      {comments: risk.comments.filter((comment) => comment.id !== commentId)},
      'Comment deleted',
    );
    setEditingCommentId(null);
    setCommentEditDraft('');
    setSavedFieldLabel('Comment deleted');
  }

  const mitigationRequired = risk.severity !== 'Low';
  const sharedRiskUsages = risk.sharedRiskId
    ? sharedRiskSubscriptions
        .filter((subscription) => subscription.sharedRiskId === risk.sharedRiskId && subscription.projectId !== activeProjectId)
        .map((subscription) => ({
          ...subscription,
          projectName: projects.find((project) => project.id === subscription.projectId)?.name ?? subscription.projectId,
          linkedRisk:
            projects
              .find((project) => project.id === subscription.projectId)
              ?.risks.find((projectRisk) => projectRisk.id === subscription.linkedLocalRiskId) ?? null,
          scoringModelMatches: scoringModelsMatch(
            projects.find((project) => project.id === subscription.projectId)?.scoringModel ?? scoringModel,
            scoringModel,
          ),
        }))
    : [];
  const hasDifferentSharedRubric = sharedRiskUsages.some((usage) => !usage.scoringModelMatches);
  const sharedRiskRecord = risk.sharedRiskId ? sharedRisks.find((item) => item.id === risk.sharedRiskId) ?? null : null;
  const suggestedLocalImpact =
    sharedRiskRecord?.sharedImpactProfile
      ? mapSharedImpactProfileToLocalScore(scoringModel.impact, sharedRiskRecord.sharedImpactProfile)
      : null;
  const sharedImpactSummary = sharedRiskRecord?.sharedImpactProfile
    ? `${
        sharedRiskRecord.sharedImpactProfile.basis === 'schedule' ? 'Schedule' : 'Cost'
      } basis: ${
        sharedRiskRecord.sharedImpactProfile.basis === 'schedule'
          ? formatImpactRange(sharedRiskRecord.sharedImpactProfile.min, sharedRiskRecord.sharedImpactProfile.max, 'months')
          : formatImpactRange(sharedRiskRecord.sharedImpactProfile.min, sharedRiskRecord.sharedImpactProfile.max, '', '$')
      }`
    : null;
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/10"
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
      {pendingScoreChange ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/30 px-5">
          <div className="w-full max-w-md rounded-[1.75rem] border border-amber-200 bg-white p-5 shadow-[0_24px_60px_rgba(42,52,57,0.22)]">
            <div className="mb-3 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
                <span className="material-symbols-outlined text-[22px]">rule</span>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-700">Rationale Required</div>
                <div className="mt-1 text-base font-bold text-on-surface">
                  Confirm the {pendingScoreChange.field === 'likelihood' ? 'likelihood' : 'impact'} score change
                </div>
              </div>
            </div>

            <div className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950">
              This score change will not be saved until you provide a rationale. Add the reason below or cancel the change.
            </div>

            <textarea
              autoFocus
              className="min-h-28 w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm leading-relaxed text-on-surface outline-none transition focus:border-amber-300 focus:shadow-[0_0_0_4px_rgba(217,119,6,0.12)]"
              onChange={(event) => setScoreChangeReason(event.target.value)}
              placeholder="Enter the rationale for this score change"
              value={scoreChangeReason}
            />

            <div className="mt-4 flex gap-2">
              <button
                className="rounded-full bg-amber-600 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!scoreChangeReason.trim()}
                onClick={confirmScoreChange}
                type="button"
              >
                Save Score Change
              </button>
              <button
                className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700 transition hover:bg-slate-200"
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
        </div>
      ) : null}
      {pendingClosureStatus ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/30 px-5">
          <div className="w-full max-w-md rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_rgba(42,52,57,0.22)]">
            <div className="mb-3 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <span className="material-symbols-outlined text-[22px]">lock</span>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Closure Rationale Required</div>
                <div className="mt-1 text-base font-bold text-on-surface">
                  Explain why this risk is moving to {pendingClosureStatus.toLowerCase()}
                </div>
              </div>
            </div>

            <div className="mb-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-on-surface-variant">
              Retired risks leave the active register, so the rationale is recorded in history for audit and future review.
            </div>

            <textarea
              autoFocus
              className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-on-surface outline-none transition focus:border-primary/30 focus:shadow-[0_0_0_4px_rgba(79,94,126,0.1)]"
              onChange={(event) => setClosureReason(event.target.value)}
              placeholder="Example: Mitigation completed, no open exposure remains, and owner accepted retirement on Apr 27, 2026."
              value={closureReason}
            />

            <div className="mt-4 flex gap-2">
              <button
                className="rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!closureReason.trim()}
                onClick={confirmRiskClosure}
                type="button"
              >
                Save Status
              </button>
              <button
                className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700 transition hover:bg-slate-200"
                onClick={() => {
                  setPendingClosureStatus(null);
                  setClosureReason('');
                }}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <aside
        className="fixed inset-y-0 right-0 flex w-[28rem] flex-col border-l border-slate-200 bg-white shadow-[-20px_0_50px_rgba(42,52,57,0.12)]"
        onClick={(event) => event.stopPropagation()}
        onMouseDown={() => {
          backdropPressStarted.current = false;
        }}
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
                <span>{formatProjectScopedId(activeProject.projectKey, risk.id)}</span>
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
            Last updated {formatHistoryTimestamp(risk.lastUpdated)}
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
            options={['Pending', 'Active', 'Monitoring', 'Rejected', 'Closed', 'Converted to Issue']}
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
              <div className="mt-0.5 flex items-center gap-2 text-sm font-semibold text-on-surface">
                <span>Internal only</span>
                <button
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                  onClick={(event) => {
                    event.preventDefault();
                    window.alert('Internal only means this risk should stay out of customer-facing graphics, dashboards, and reports.');
                  }}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[14px]">help</span>
                </button>
              </div>
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
          {!risk.sharedRiskId ? (
            <DrawerAction icon="share" label="Share" onClick={() => onShareRisk(risk.id)} />
          ) : (
            <DrawerAction icon="link_off" label="Unshare" destructive onClick={() => onUnshareRisk(risk.id)} />
          )}
          <DrawerAction destructive icon="delete" label="Delete" onClick={() => setConfirmDelete(true)} />
        </div>

        {risk.sharedRiskId ? (
          <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
                {risk.sharedRiskRole === 'source' ? 'Shared source' : 'Linked shared risk'} {risk.sharedRiskId}
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600">
                {risk.sharedRiskRole === 'source'
                  ? `${sharedRiskUsages.length} subscriber${sharedRiskUsages.length === 1 ? '' : 's'}`
                  : `Parent version ${risk.sharedParentVersionSeen ?? sharedRiskRecord?.versionNumber ?? 1}`}
              </span>
              {risk.sharedReviewStatus === 'review_required' ? (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-amber-800">
                  Review required
                </span>
              ) : null}
              {sharedImpactSummary ? (
                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600">
                  {sharedImpactSummary}
                </span>
              ) : null}
              {hasDifferentSharedRubric ? (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-amber-800">
                  Different scoring rubrics
                </span>
              ) : null}
            </div>
            <div className="mt-3 flex items-start justify-between gap-3 rounded-xl bg-white px-4 py-3">
              <div className="text-sm leading-relaxed text-on-surface-variant">
                {risk.sharedRiskRole === 'source'
                  ? 'Edits here update the shared source record and notify subscribers when review is needed.'
                  : 'This project owns local status, scoring, and response; the parent shared risk stays upstream.'}
              </div>
              <button
                className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary transition hover:bg-primary/10"
                onClick={() => setSharedRiskDetailsOpen((current) => !current)}
                type="button"
              >
                {sharedRiskDetailsOpen ? 'Hide' : 'Details'}
              </button>
            </div>
            {sharedRiskDetailsOpen ? (
              <div className="mt-3 space-y-3">
            {risk.sharedRiskRole === 'linked' && sharedRiskRecord ? (
              <div className="mt-3">
                <button
                  className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-primary transition hover:bg-primary/10"
                  onClick={() => onOpenSharedRisk(sharedRiskRecord.id)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                  View Parent Shared Risk
                </button>
              </div>
            ) : null}
            {suggestedLocalImpact != null ? (
              <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-on-surface-variant">
                Shared profile suggests impact
                {' '}
                <span className="font-semibold text-on-surface">
                  {suggestedLocalImpact} - {getScoreDefinition(scoringModel.impact, suggestedLocalImpact)?.label ?? suggestedLocalImpact}
                </span>
                {suggestedLocalImpact !== risk.impact ? (
                  <span className="text-amber-800">
                    {' '}
                    but this risk uses impact {risk.impact}. Review if that difference is intentional.
                  </span>
                ) : (
                  <span>
                    {' '}
                    This matches the current local impact score.
                  </span>
                )}
              </div>
            ) : null}
            {hasDifferentSharedRubric ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
                Other projects using this risk have different Likelihood and Impact definitions. Scores should be compared carefully rather than treated as directly equivalent.
              </div>
            ) : null}
            <div className="mt-3 space-y-2">
              {sharedRiskUsages.map((usage) => (
                <div key={`${risk.sharedRiskId}-${usage.projectId}`} className="rounded-xl bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-on-surface">
                      {usage.projectName}
                    </div>
                    <div className="text-xs text-on-surface-variant">
                      {usage.state.replace('_', ' ')}
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-on-surface-variant">
                    {usage.linkedRisk
                      ? `Linked local risk ${usage.linkedRisk.id} · ${usage.linkedRisk.sharedReviewStatus ?? 'current'}`
                      : 'No linked local risk yet'}
                  </div>
                </div>
              ))}
            </div>
              </div>
            ) : suggestedLocalImpact != null && suggestedLocalImpact !== risk.impact ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
                Shared profile suggests impact {suggestedLocalImpact}; this risk uses impact {risk.impact}.
              </div>
            ) : null}
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
                  setPendingClosureStatus('Closed');
                  setClosureReason('Risk closed instead of deleted.');
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
              <DrawerMeta label="Risk score" value={`${risk.likelihood} x ${risk.impact} = ${getRiskScoreLabel(risk.likelihood, risk.impact)}`} />
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
          <CollapsibleDrawerSection
            open={projectedResidualOpen}
            summary={`${risk.residualLikelihood} x ${risk.residualImpact} = ${getRiskScoreLabel(risk.residualLikelihood, risk.residualImpact)}`}
            title="Projected Residual Risk"
            onToggle={() => setProjectedResidualOpen((current) => !current)}
          >
            <div className="rounded-2xl bg-surface-container-low p-4">
              <div className="mb-3 text-sm leading-relaxed text-on-surface-variant">
                Set the risk score expected after the mitigation plan is complete. This does not change the current risk score.
              </div>
              <div className="grid grid-cols-2 gap-4">
                <QuickEditSelect
                  activeField={editingField}
                  field="residualLikelihood"
                  label="Residual likelihood"
                  options={toScoreSelectOptions(scoringModel.likelihood)}
                  value={String(risk.residualLikelihood)}
                  onBeginEdit={setEditingField}
                  onSave={saveQuickField}
                />
                <QuickEditSelect
                  activeField={editingField}
                  field="residualImpact"
                  label="Residual impact"
                  options={toScoreSelectOptions(scoringModel.impact)}
                  value={String(risk.residualImpact)}
                  onBeginEdit={setEditingField}
                  onSave={saveQuickField}
                />
                <DrawerMeta
                  label="Projected residual risk"
                  value={`${risk.residualLikelihood} x ${risk.residualImpact} = ${getRiskScoreLabel(risk.residualLikelihood, risk.residualImpact)}`}
                />
              </div>
            </div>
          </CollapsibleDrawerSection>
          <CollapsibleDrawerSection
            open={mitigationActionsOpen}
            summary={`${risk.mitigationActions.length} action${risk.mitigationActions.length === 1 ? '' : 's'}`}
            title="Mitigation Actions"
            onToggle={() => setMitigationActionsOpen((current) => !current)}
          >
            <MitigationActionsEditor
              actions={risk.mitigationActions}
              draft={actionDraft}
              onAdd={addMitigationAction}
              onChangeDraft={setActionDraft}
              onDelete={deleteMitigationAction}
              onUpdate={updateMitigationAction}
            />
          </CollapsibleDrawerSection>
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
            <DrawerMeta label="Comments" value={`${getRiskCommentCount(risk)}`} />
          </div>
          <CollapsibleDrawerSection
            open={commentsOpen}
            summary={`${getRiskCommentCount(risk)} comment${getRiskCommentCount(risk) === 1 ? '' : 's'}`}
            title="Comments"
            onToggle={() => setCommentsOpen((current) => !current)}
          >
            <RiskCommentsEditor
              comments={risk.comments}
              draft={commentDraft}
              editingCommentId={editingCommentId}
              editDraft={commentEditDraft}
              legacyCommentCount={risk.legacyCommentCount}
              onAdd={addComment}
              onBeginEdit={beginEditComment}
              onCancelEdit={() => {
                setEditingCommentId(null);
                setCommentEditDraft('');
              }}
              onChangeDraft={setCommentDraft}
              onChangeEditDraft={setCommentEditDraft}
              onDelete={deleteComment}
              onSaveEdit={saveCommentEdit}
            />
          </CollapsibleDrawerSection>
        </DrawerSection>

        <CollapsibleDrawerSection
          open={recordDetailsOpen}
          summary={`Last updated ${formatHistoryTimestamp(risk.lastUpdated)}`}
          title="Record Details"
          onToggle={() => setRecordDetailsOpen((current) => !current)}
        >
          <div className="grid grid-cols-2 gap-4">
            <DrawerMeta label="Created by" value={risk.createdBy} />
            <DrawerMeta label="Last updated" value={formatHistoryTimestamp(risk.lastUpdated)} />
          </div>
        </CollapsibleDrawerSection>

        <CollapsibleDrawerSection
          open={historyOpen}
          summary={`${risk.history.length} entr${risk.history.length === 1 ? 'y' : 'ies'}`}
          title="History"
          onToggle={() => setHistoryOpen((current) => !current)}
        >
          {risk.history.length > 2 ? (
            <div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
              <div className="text-sm text-on-surface-variant">
                Showing {historyExpanded ? risk.history.length : 2} of {risk.history.length} history entr{risk.history.length === 1 ? 'y' : 'ies'}.
              </div>
              <button
                className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-primary transition hover:bg-primary/10"
                onClick={() => setHistoryExpanded((current) => !current)}
                type="button"
              >
                {historyExpanded ? 'Show Less' : `Show All ${risk.history.length}`}
              </button>
            </div>
          ) : null}
          <div className="space-y-3">
            {(historyExpanded ? risk.history : risk.history.slice(0, 2)).map((entry) => (
              <div key={`${entry.label}-${entry.meta}-${entry.at ?? 'legacy'}`} className="rounded-xl bg-slate-50 px-4 py-3">
                <div className="text-sm font-semibold whitespace-pre-line text-on-surface">{entry.label}</div>
                <div className="mt-1 text-xs text-on-surface-variant">{normalizeHistoryMeta(entry.meta)}</div>
                <div className="mt-1 text-[11px] font-medium text-slate-400">
                  {entry.at ? formatHistoryTimestamp(entry.at) : 'Recorded previously'}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleDrawerSection>
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

function RiskBurndownChart({
  chartRef,
  highlightedRiskId,
  series,
  selectedPoint,
  showLegend,
  onSelectRisk,
  onSelectPoint,
}: {
  chartRef: RefObject<SVGSVGElement | null>;
  highlightedRiskId: string | null;
  series: {
    riskId: string;
    title: string;
    severity: RiskSeverity;
    status: RiskStatus;
    points: RiskBurndownPoint[];
  }[];
  selectedPoint: SelectedBurndownPoint | null;
  showLegend: boolean;
  onSelectRisk: (riskId: string) => void;
  onSelectPoint: (point: SelectedBurndownPoint) => void;
}) {
  const [hoveredRiskId, setHoveredRiskId] = useState<string | null>(null);
  const [hoverCard, setHoverCard] = useState<{x: number; y: number; riskId: string; title: string} | null>(null);
  const chartSeries = series.filter((item) => item.points.length > 0);
  const allPoints = chartSeries.flatMap((item) =>
    item.points.map((point) => ({
      ...point,
      riskId: item.riskId,
      title: item.title,
    })),
  );

  if (chartSeries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-sm leading-relaxed text-on-surface-variant">
        No risks are selected for the burndown view yet. Choose one or more risks above to plot how their scores changed over time.
      </div>
    );
  }

  const severityCounts = {
    High: chartSeries.filter((item) => item.severity === 'High').length,
    Medium: chartSeries.filter((item) => item.severity === 'Medium').length,
    Low: chartSeries.filter((item) => item.severity === 'Low').length,
  };
  const rawTimelineStart = Math.min(...allPoints.map((point) => new Date(point.at).getTime()));
  const rawTimelineEnd = Math.max(...allPoints.map((point) => new Date(point.at).getTime()), rawTimelineStart + 1);
  const rawTimelineSpan = Math.max(rawTimelineEnd - rawTimelineStart, 1);
  const timelinePadding =
    rawTimelineSpan <= 1000 * 60 * 60 * 24
      ? Math.max(rawTimelineSpan * 0.3, 1000 * 60 * 30)
      : rawTimelineSpan * 0.08;
  const timelineStart = rawTimelineStart - timelinePadding;
  const timelineEnd = rawTimelineEnd + timelinePadding;
  const width = 1240;
  const height = showLegend ? 600 : 430;
  const paddingLeft = 58;
  const paddingRight = 24;
  const paddingTop = 54;
  const paddingBottom = showLegend ? 230 : 60;
  const panelWidth = 168;
  const panelGap = 22;
  const plotRight = width - paddingRight - panelWidth - panelGap;
  const plotWidth = plotRight - paddingLeft;
  const plotHeight = height - paddingTop - paddingBottom;
  const scoreBands = [
    {from: 0, to: 8, fill: '#d8f0df'},
    {from: 8, to: 15, fill: '#fff5bf'},
    {from: 15, to: 25, fill: '#ffd9d9'},
  ];
  const colorPalette = ['#0f8f4f', '#2563eb', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#4f46e5', '#be123c'];
  const yForScore = (score: number) => paddingTop + plotHeight - (score / 25) * plotHeight;
  const xForTime = (value: number) =>
    paddingLeft + ((Math.max(Math.min(value, timelineEnd), timelineStart) - timelineStart) / Math.max(timelineEnd - timelineStart, 1)) * plotWidth;
  const xTicks = Array.from({length: 5}, (_, index) => timelineStart + ((timelineEnd - timelineStart) * index) / 4);
  const panelX = plotRight + panelGap;
  const legendColumns = 1;
  const legendColumnWidth = plotRight - paddingLeft;
  const xAxisLabelY = paddingTop + plotHeight + 30;
  const legendTitleY = paddingTop + plotHeight + 72;
  const legendStartY = paddingTop + plotHeight + 106;
  const activeRiskId = hoveredRiskId ?? highlightedRiskId;

  function showHoverCard(event: ReactMouseEvent<SVGElement>, riskId: string, title: string) {
    const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!bounds) {
      return;
    }

    setHoverCard({
      x: Math.min(event.clientX - bounds.left + 16, bounds.width - 220),
      y: Math.min(event.clientY - bounds.top + 16, bounds.height - 88),
      riskId,
      title,
    });
  }

  return (
    <div className="relative rounded-2xl bg-slate-50 px-4 py-4">
      <div className="w-full overflow-hidden">
        <svg
          className="block h-auto w-full"
          ref={chartRef}
          preserveAspectRatio="xMidYMin meet"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          <text
            data-export-font="headline"
            fill="#243342"
            fontSize="22"
            fontWeight="800"
            textAnchor="middle"
            x={paddingLeft + plotWidth / 2}
            y={28}
          >
            Risk Burndown
          </text>
          <text
            fill="#64748b"
            fontSize="11"
            fontWeight="700"
            textAnchor="middle"
            x={paddingLeft + plotWidth / 2}
            y={44}
          >
            Selected risks with recorded score history
          </text>

          {scoreBands.map((band) => (
            <rect
              key={`${band.from}-${band.to}`}
              fill={band.fill}
              height={yForScore(band.from) - yForScore(band.to)}
              rx="10"
              width={plotWidth}
              x={paddingLeft}
              y={yForScore(band.to)}
            />
          ))}

          {[0, 5, 10, 15, 20, 25].map((tick) => (
            <g key={tick}>
              <line
                stroke="#cbd5e1"
                strokeDasharray={tick === 0 ? '0' : '4 6'}
                x1={paddingLeft}
                x2={plotRight}
                y1={yForScore(tick)}
                y2={yForScore(tick)}
              />
              <text
                fill="#64748b"
                fontSize="11"
                fontWeight="700"
                textAnchor="end"
                x={paddingLeft - 10}
                y={yForScore(tick) + 4}
              >
                {tick}
              </text>
            </g>
          ))}

          {xTicks.map((tick) => (
            <g key={tick}>
              <text
                fill="#64748b"
                fontSize="11"
                fontWeight="700"
                textAnchor="middle"
                x={xForTime(tick)}
                y={xAxisLabelY}
              >
                {formatBurndownDateLabel(new Date(tick).toISOString(), rawTimelineStart, rawTimelineEnd)}
              </text>
            </g>
          ))}

          <text
            fill="#64748b"
            fontSize="11"
            fontWeight="700"
            textAnchor="middle"
            transform={`translate(16 ${paddingTop + plotHeight / 2}) rotate(-90)`}
          >
            Risk Score
          </text>

          <line
            stroke="#cbd5e1"
            strokeWidth="1"
            x1={panelX - panelGap / 2}
            x2={panelX - panelGap / 2}
            y1={paddingTop}
            y2={paddingTop + plotHeight}
          />

          <text
            fill="#64748b"
            fontSize="10"
            fontWeight="800"
            letterSpacing="1.5"
            textAnchor="start"
            x={panelX}
            y={paddingTop + 2}
          >
            SEVERITY COUNTS
          </text>
          {[
            {label: 'High', value: severityCounts.High, color: '#dc2626', y: (yForScore(25) + yForScore(15)) / 2},
            {label: 'Medium', value: severityCounts.Medium, color: '#d97706', y: (yForScore(15) + yForScore(8)) / 2},
            {label: 'Low', value: severityCounts.Low, color: '#059669', y: (yForScore(8) + yForScore(0)) / 2},
          ].map((band) => (
            <g key={band.label}>
              <circle cx={panelX + 6} cy={band.y - 6} fill={band.color} r="5" />
              <text fill="#243342" fontSize="12" fontWeight="800" x={panelX + 18} y={band.y - 2}>
                {band.label}: {band.value}
              </text>
            </g>
          ))}

          {showLegend ? (
            <>
              <text
                fill="#64748b"
                fontSize="10"
                fontWeight="800"
                letterSpacing="1.5"
                textAnchor="start"
                x={paddingLeft}
                y={legendTitleY}
              >
                RISK LEGEND
              </text>
              {chartSeries.slice(0, 8).map((item, index) => {
                const columnIndex = index % legendColumns;
                const rowIndex = Math.floor(index / legendColumns);
                const legendY = legendStartY + rowIndex * 34;
                const legendX = paddingLeft + columnIndex * legendColumnWidth;
                const color = colorPalette[index % colorPalette.length];
                return (
                  <g key={`legend-${item.riskId}`}>
                    <line stroke={color} strokeLinecap="round" strokeWidth="4" x1={legendX} x2={legendX + 18} y1={legendY} y2={legendY} />
                    <circle cx={legendX + 9} cy={legendY} fill={color} r="4" />
                    <text fill="#243342" fontSize="11" fontWeight="800" x={legendX + 26} y={legendY + 4}>
                      {item.riskId}
                    </text>
                    <text fill="#64748b" fontSize="10" x={legendX + 26} y={legendY + 18}>
                      {item.title.length > 64 ? `${item.title.slice(0, 64)}…` : item.title}
                    </text>
                  </g>
                );
              })}
            </>
          ) : null}

          {chartSeries.map((item, index) => {
            const color = colorPalette[index % colorPalette.length];
            const isActive = !activeRiskId || activeRiskId === item.riskId;
            const path = item.points
              .map((point, pointIndex) => {
                const command = pointIndex === 0 ? 'M' : 'L';
                return `${command} ${xForTime(new Date(point.at).getTime())} ${yForScore(point.score)}`;
              })
              .join(' ');

            return (
              <g key={item.riskId}>
                <path
                  d={path}
                  fill="none"
                  opacity={isActive ? 1 : 0.22}
                  stroke={color}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={isActive ? 5 : 3}
                  style={{cursor: 'pointer'}}
                  onClick={() => onSelectRisk(item.riskId)}
                  onMouseEnter={(event) => {
                    setHoveredRiskId(item.riskId);
                    showHoverCard(event, item.riskId, item.title);
                  }}
                  onMouseLeave={() => {
                    setHoveredRiskId(null);
                    setHoverCard(null);
                  }}
                  onMouseMove={(event) => showHoverCard(event, item.riskId, item.title)}
                />
                {item.points.map((point) => {
                  const isSelected =
                    selectedPoint?.riskId === item.riskId && selectedPoint.at === point.at;
                  const hasRationale = Boolean(point.rationale);
                  const pointX = xForTime(new Date(point.at).getTime());
                  const pointY = yForScore(point.score);
                  return (
                    <g key={`${item.riskId}-${point.at}`}>
                      {isSelected ? (
                        <>
                          <line
                            stroke={color}
                            strokeDasharray="4 4"
                            strokeOpacity="0.45"
                            strokeWidth="1.5"
                            x1={pointX}
                            x2={pointX}
                            y1={paddingTop}
                            y2={paddingTop + plotHeight}
                          />
                          <line
                            stroke={color}
                            strokeDasharray="4 4"
                            strokeOpacity="0.45"
                            strokeWidth="1.5"
                            x1={paddingLeft}
                            x2={plotRight}
                            y1={pointY}
                            y2={pointY}
                          />
                          <circle
                            cx={pointX}
                            cy={pointY}
                            fill={`${color}22`}
                            r="12"
                            stroke={color}
                            strokeWidth="2"
                          />
                        </>
                      ) : null}
                      <circle
                        cx={pointX}
                        cy={pointY}
                        fill={hasRationale ? color : '#fff'}
                        opacity={isActive ? 1 : 0.3}
                        r={isSelected ? 7 : isActive ? 5.5 : 4.5}
                        stroke={color}
                        strokeWidth={isSelected ? 4 : hasRationale ? 2.5 : 3}
                        style={{cursor: 'pointer'}}
                        onClick={() => onSelectPoint({riskId: item.riskId, at: point.at})}
                        onMouseEnter={(event) => {
                          setHoveredRiskId(item.riskId);
                          showHoverCard(event, item.riskId, item.title);
                        }}
                        onMouseLeave={() => {
                          setHoveredRiskId(null);
                          setHoverCard(null);
                        }}
                        onMouseMove={(event) => showHoverCard(event, item.riskId, item.title)}
                      />
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
      {!showLegend && hoverCard ? (
        <div
          className="pointer-events-none absolute z-10 max-w-[220px] rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 shadow-[0_16px_40px_rgba(42,52,57,0.16)] backdrop-blur"
          style={{
            left: `${hoverCard.x}px`,
            top: `${hoverCard.y}px`,
          }}
        >
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Risk</div>
          <div className="mt-1 text-sm font-bold text-on-surface">{hoverCard.riskId}</div>
          <div className="mt-1 text-sm leading-snug text-on-surface-variant">{hoverCard.title}</div>
        </div>
      ) : null}
      <div className="mt-3 text-xs leading-relaxed text-on-surface-variant">
        Filled points indicate score changes that include rationale. Open points indicate baseline or carry-forward points used to show the full score trend over the selected timeframe.
      </div>
    </div>
  );
}

function ScoringDefinitionEditor({
  title,
  definitions,
  onChange,
  showImpactRanges,
}: {
  title: string;
  definitions: ScoreDefinition[];
  onChange: (
    value: number,
    field: 'label' | 'description' | 'scheduleMinMonths' | 'scheduleMaxMonths' | 'costMinAmount' | 'costMaxAmount',
    nextValue: string,
  ) => void;
  showImpactRanges: boolean;
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
              {showImpactRanges ? (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                    <div className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                      Schedule Impact Band
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <FormField label="Min months">
                        <input
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-on-surface outline-none transition focus:border-primary/25 focus:shadow-[0_0_0_4px_rgba(79,94,126,0.08)]"
                          min="0"
                          onChange={(event) => onChange(definition.value, 'scheduleMinMonths', event.target.value)}
                          placeholder="Optional"
                          step="0.1"
                          type="number"
                          value={definition.scheduleMinMonths ?? ''}
                        />
                      </FormField>
                      <FormField label="Max months">
                        <input
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-on-surface outline-none transition focus:border-primary/25 focus:shadow-[0_0_0_4px_rgba(79,94,126,0.08)]"
                          min="0"
                          onChange={(event) => onChange(definition.value, 'scheduleMaxMonths', event.target.value)}
                          placeholder="Leave blank for open-ended"
                          step="0.1"
                          type="number"
                          value={definition.scheduleMaxMonths ?? ''}
                        />
                      </FormField>
                    </div>
                    <div className="mt-2 text-xs leading-relaxed text-on-surface-variant">
                      Use blank max for open-ended bands such as anything greater than 12 months.
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                    <div className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                      Cost Impact Band
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <FormField label="Min dollars">
                        <input
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-on-surface outline-none transition focus:border-primary/25 focus:shadow-[0_0_0_4px_rgba(79,94,126,0.08)]"
                          min="0"
                          onChange={(event) => onChange(definition.value, 'costMinAmount', event.target.value)}
                          placeholder="Optional"
                          step="1000"
                          type="number"
                          value={definition.costMinAmount ?? ''}
                        />
                      </FormField>
                      <FormField label="Max dollars">
                        <input
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-on-surface outline-none transition focus:border-primary/25 focus:shadow-[0_0_0_4px_rgba(79,94,126,0.08)]"
                          min="0"
                          onChange={(event) => onChange(definition.value, 'costMaxAmount', event.target.value)}
                          placeholder="Leave blank for open-ended"
                          step="1000"
                          type="number"
                          value={definition.costMaxAmount ?? ''}
                        />
                      </FormField>
                    </div>
                    <div className="mt-2 text-xs leading-relaxed text-on-surface-variant">
                      These optional dollar ranges allow shared risks to map into another project&apos;s local impact score when cost impacts are used as the common basis.
                    </div>
                  </div>
                </>
              ) : null}
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
          : status === 'Converted to Issue'
            ? 'bg-orange-100 text-orange-800'
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

function CollapsibleDrawerSection({
  title,
  summary,
  open,
  children,
  onToggle,
}: {
  title: string;
  summary?: string;
  open: boolean;
  children: ReactNode;
  onToggle: () => void;
}) {
  return (
    <section className="space-y-4">
      <button
        className="group flex w-full items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100/90"
        onClick={onToggle}
        type="button"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="h-[2px] w-4 bg-primary" />
            <h3 className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">{title}</h3>
          </div>
          {summary ? (
            <div className="mt-1 truncate pl-7 text-sm font-semibold text-on-surface">{summary}</div>
          ) : null}
        </div>
        <span className="material-symbols-outlined text-[20px] text-slate-400 transition group-hover:text-slate-700">
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>
      {open ? children : null}
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
    <div className="rounded-2xl transition">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</div>
        {!editable ? (
          <button
            className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            onClick={onEdit}
            type="button"
          >
            <span className="material-symbols-outlined text-[14px]">edit</span>
          </button>
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
    <div className="rounded-2xl transition">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</div>
        {!editable ? (
          <button
            className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            onClick={onEdit}
            type="button"
          >
            <span className="material-symbols-outlined text-[14px]">edit</span>
          </button>
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

function MitigationActionsEditor({
  actions,
  draft,
  onChangeDraft,
  onAdd,
  onUpdate,
  onDelete,
}: {
  actions: MitigationAction[];
  draft: {title: string; owner: string; dueDate: string};
  onChangeDraft: (draft: {title: string; owner: string; dueDate: string}) => void;
  onAdd: () => void;
  onUpdate: (actionId: string, updates: Partial<MitigationAction>) => void;
  onDelete: (actionId: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Mitigation Actions</div>
          <div className="mt-1 text-xs leading-relaxed text-on-surface-variant">
            Track the actual work that makes the mitigation plan credible.
          </div>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600">
          {actions.length}
        </span>
      </div>

      <div className="space-y-3">
        {actions.length === 0 ? (
          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-on-surface-variant">
            No mitigation actions yet. Add specific actions when ownership, due dates, or completion tracking matters.
          </div>
        ) : (
          actions.map((action) => (
            <div key={action.id} className="rounded-xl bg-slate-50 px-4 py-3">
              <input
                className="w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm font-semibold text-on-surface outline-none transition focus:border-primary/25"
                onBlur={(event) => onUpdate(action.id, {title: event.target.value.trim() || action.title})}
                defaultValue={action.title}
              />
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <input
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-on-surface outline-none focus:border-primary/25"
                  onBlur={(event) => onUpdate(action.id, {owner: event.target.value.trim()})}
                  defaultValue={action.owner}
                  placeholder="Owner"
                />
                <input
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-on-surface outline-none focus:border-primary/25"
                  onChange={(event) => onUpdate(action.id, {dueDate: event.target.value})}
                  type="date"
                  value={action.dueDate}
                />
                <select
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-on-surface outline-none focus:border-primary/25"
                  onChange={(event) => onUpdate(action.id, {status: event.target.value as MitigationAction['status']})}
                  value={action.status}
                >
                  {(['Not Started', 'In Progress', 'Done', 'Blocked'] as MitigationAction['status'][]).map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              <button
                className="mt-2 rounded-full bg-rose-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-rose-700 transition hover:bg-rose-100"
                onClick={() => onDelete(action.id)}
                type="button"
              >
                Delete Action
              </button>
            </div>
          ))
        )}
      </div>

      <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3">
        <input
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-on-surface outline-none focus:border-primary/25"
          onChange={(event) => onChangeDraft({...draft, title: event.target.value})}
          placeholder="New mitigation action"
          value={draft.title}
        />
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-on-surface outline-none focus:border-primary/25"
            onChange={(event) => onChangeDraft({...draft, owner: event.target.value})}
            placeholder="Owner"
            value={draft.owner}
          />
          <input
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-on-surface outline-none focus:border-primary/25"
            onChange={(event) => onChangeDraft({...draft, dueDate: event.target.value})}
            type="date"
            value={draft.dueDate}
          />
        </div>
        <button
          className="mt-3 rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-primary-dim disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!draft.title.trim()}
          onClick={onAdd}
          type="button"
        >
          Add Action
        </button>
      </div>
    </div>
  );
}

function RiskCommentsEditor({
  comments,
  legacyCommentCount,
  draft,
  editingCommentId,
  editDraft,
  onChangeDraft,
  onAdd,
  onBeginEdit,
  onChangeEditDraft,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: {
  comments: RiskComment[];
  legacyCommentCount: number;
  draft: string;
  editingCommentId: string | null;
  editDraft: string;
  onChangeDraft: (value: string) => void;
  onAdd: () => void;
  onBeginEdit: (comment: RiskComment) => void;
  onChangeEditDraft: (value: string) => void;
  onSaveEdit: (commentId: string) => void;
  onCancelEdit: () => void;
  onDelete: (commentId: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      {legacyCommentCount > 0 ? (
        <div className="mb-3 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
          This imported record had {legacyCommentCount} legacy comment{legacyCommentCount === 1 ? '' : 's'} without stored text. New comments added here can be edited or deleted.
        </div>
      ) : null}

      <textarea
        className="min-h-20 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-on-surface outline-none transition focus:border-primary/25 focus:bg-white"
        onChange={(event) => onChangeDraft(event.target.value)}
        placeholder="Add a comment, rationale, or follow-up note"
        value={draft}
      />
      <button
        className="mt-2 rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-primary-dim disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!draft.trim()}
        onClick={onAdd}
        type="button"
      >
        Add Comment
      </button>

      <div className="mt-4 space-y-3">
        {comments.length === 0 ? (
          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-on-surface-variant">
            No editable comments yet.
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="rounded-xl bg-slate-50 px-4 py-3">
              {editingCommentId === comment.id ? (
                <div>
                  <textarea
                    className="min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-on-surface outline-none focus:border-primary/25"
                    onChange={(event) => onChangeEditDraft(event.target.value)}
                    value={editDraft}
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      className="rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white"
                      disabled={!editDraft.trim()}
                      onClick={() => onSaveEdit(comment.id)}
                      type="button"
                    >
                      Save
                    </button>
                    <button
                      className="rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600"
                      onClick={onCancelEdit}
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-on-surface">{comment.body}</p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-on-surface-variant">
                    <span>{comment.author} · {formatHistoryTimestamp(comment.updatedAt)}</span>
                    <span className="flex gap-2">
                      <button className="font-bold text-primary" onClick={() => onBeginEdit(comment)} type="button">Edit</button>
                      <button className="font-bold text-rose-700" onClick={() => onDelete(comment.id)} type="button">Delete</button>
                    </span>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
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
    <div className="group rounded-xl bg-slate-50 px-4 py-3 transition hover:bg-slate-100/90">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</div>
        <div className="flex items-center gap-2">
          {labelAction}
          {!editing ? (
            <button
              className="rounded-full p-1 text-slate-400 opacity-0 transition hover:bg-white hover:text-slate-700 group-hover:opacity-100"
              onClick={() => onBeginEdit(field)}
              type="button"
            >
              <span className="material-symbols-outlined text-[14px]">edit</span>
            </button>
          ) : null}
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
            <div className="mt-2 space-y-1 text-xs leading-relaxed text-on-surface-variant">
              {renderSelectDescription(selectedOption.description)}
            </div>
          ) : null}
        </div>
      ) : (
        <div>
          <div className="text-sm font-semibold text-on-surface">
            {field.includes('Date') ? formatDisplayDate(value) : selectedOption?.label ?? value}
          </div>
          {selectedOption?.description ? (
            <div className="mt-1 space-y-1 text-xs leading-relaxed text-on-surface-variant">
              {renderSelectDescription(selectedOption.description)}
            </div>
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
    <div className="group rounded-xl bg-slate-50 px-4 py-3 transition hover:bg-slate-100/90">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</div>
        {!editing ? (
          <button
            className="rounded-full p-1 text-slate-400 opacity-0 transition hover:bg-white hover:text-slate-700 group-hover:opacity-100"
            onClick={() => onBeginEdit(field)}
            type="button"
          >
            <span className="material-symbols-outlined text-[14px]">edit</span>
          </button>
        ) : null}
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
    <div className="group rounded-xl bg-slate-50 px-4 py-3 transition hover:bg-slate-100/90">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</div>
        {!editing ? (
          <button
            className="rounded-full p-1 text-slate-400 opacity-0 transition hover:bg-white hover:text-slate-700 group-hover:opacity-100"
            onClick={() => onBeginEdit(field)}
            type="button"
          >
            <span className="material-symbols-outlined text-[14px]">edit_calendar</span>
          </button>
        ) : null}
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
