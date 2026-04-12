Risk + Decision Register Tool Plan

1. Purpose

Build a cross-platform desktop application for macOS and Windows that helps teams capture, assess, review, and track organizational risks and major decisions in one intuitive system. The tool should be visually clean, low-friction, and fast to use, so teams will actually keep it updated.

The application should support:
	•	A structured risk register
	•	A structured decision register
	•	Configurable likelihood and impact criteria
	•	Automatic generation of a risk cube / heat map
	•	Mitigation planning and action tracking for medium and high risks
	•	Historical tracking of how risks change over time
	•	Useful trend visualizations showing whether risk is being burned down
	•	Links between decisions and the risks they create, accept, change, or retire

This document defines the product concept, scope, data model, workflows, and MVP plan so the tool can be built efficiently.

⸻

2. Product Vision

Create a beautiful, practical desktop application that replaces scattered spreadsheets, slide decks, and meeting notes with a single source of truth for risk and decision management.

The product should feel:
	•	Simple to understand
	•	Fast to update during live meetings
	•	Structured enough to enforce good discipline
	•	Flexible enough to work across different projects or organizations
	•	Visually polished rather than “ugly enterprise software”

The key design principle is low friction with enough structure to produce consistent, useful data.

⸻

3. Problem Statement

Today, many teams manage risks and major decisions in disconnected ways:
	•	Risks are tracked in spreadsheets
	•	Decisions are buried in meeting notes or email threads
	•	Mitigation plans are tracked separately
	•	Risk scores are inconsistent because criteria are unclear
	•	Old risks remain open without review
	•	Leadership cannot easily see whether risks are improving or getting worse over time

This leads to poor visibility, weak traceability, inconsistent scoring, and limited organizational learning.

The tool should solve this by unifying risk and decision tracking in a system that is structured, reviewable, and easy to maintain.

⸻

4. Product Goals

Primary goals
	•	Make it easy to capture and update risks consistently
	•	Make it easy to record major decisions and their rationale
	•	Link decisions and risks together in a meaningful way
	•	Define likelihood and impact scoring criteria explicitly
	•	Generate a risk cube automatically from recorded data
	•	Track mitigation plans and their progress
	•	Preserve history so users can see how risks evolve over time
	•	Support regular review workflows

Secondary goals
	•	Provide trend charts and dashboards
	•	Enable filtering by project, owner, category, severity, and status
	•	Support export for reporting
	•	Encourage disciplined decision-making and risk management without making the process burdensome

Non-goals for MVP
	•	Full enterprise workflow or approval engine
	•	Heavy customization of every field and screen
	•	Portfolio-level resource management
	•	Formal Monte Carlo or advanced probabilistic modeling
	•	Complex external integrations

⸻

5. Core Product Concept

This should be a unified system for managing related governance artifacts, but not a single undifferentiated table.

The main record types should be separate but linkable:
	•	Risk
	•	Decision
	•	Mitigation Action

Future expansion can add:
	•	Issue
	•	Assumption

This keeps the data model clean while still allowing rich traceability.

Example relationships:
	•	A decision can create or reduce one or more risks
	•	A risk can be associated with one or more decisions
	•	A risk can have many mitigation actions
	•	Mitigation actions can change the residual risk over time

⸻

6. Target Users

Likely users include:
	•	Systems engineers
	•	Program managers
	•	Project managers
	•	Technical leads
	•	Engineering managers
	•	Product teams
	•	Review boards or leadership teams

Typical usage modes:
	•	Capture new risks during reviews
	•	Update risk status in recurring meetings
	•	Record major decisions and rationale
	•	Review heat maps and trend charts
	•	Track mitigation action owners and due dates

⸻

7. Design Principles

7.1 Low friction

The product must be fast and convenient enough to use in real meetings. If it is cumbersome, people will return to spreadsheets.

7.2 Structured but not bureaucratic

The application should guide good behavior without overwhelming users with too many required fields.

7.3 Intuitive first, configurable second

The default workflow should be strong out of the box. Configuration should exist where it matters, especially for scoring criteria.

7.4 History matters

The system should not only show the current state. It should preserve changes over time.

7.5 Beautiful and calm UI

The UI should feel modern, spacious, readable, and clean. The visuals should help users think clearly rather than burden them with clutter.

⸻

8. Functional Scope

8.1 Risk Register

The application shall support a structured risk register.

Each risk should include:
	•	Unique ID
	•	Title
	•	Description
	•	Cause
	•	Risk event
	•	Consequence / impact statement
	•	Category
	•	Owner
	•	Project / program / product / area
	•	Date identified
	•	Status
	•	Likelihood score
	•	Impact score
	•	Risk level / severity
	•	Inherent risk score
	•	Residual risk score
	•	Review date
	•	Target close date
	•	Linked decisions
	•	Mitigation strategy summary
	•	Notes / rationale

Recommended status values:
	•	Open
	•	Monitoring
	•	Mitigating
	•	Closed
	•	Accepted
	•	Retired

Why separate cause, event, and consequence?

This improves clarity and produces better quality risks.

Example:
	•	Cause: single-source supplier with long procurement lead time
	•	Event: board delivery slips
	•	Consequence: integration schedule slips by 6 weeks

This is more actionable than a vague title like “supplier risk.”

⸻

8.2 Likelihood Criteria Definition

The application shall allow admins or project leads to define likelihood criteria.

This should support a 1–5 scale by default, with each level having:
	•	Name
	•	Description
	•	Optional probability range

Example:
	•	1 = Rare
	•	2 = Unlikely
	•	3 = Possible
	•	4 = Likely
	•	5 = Very Likely

Users should be able to view the definitions while scoring a risk.

⸻

8.3 Impact Criteria Definition

The application shall allow admins or project leads to define impact criteria.

Impact should support one or more dimensions, such as:
	•	Schedule
	•	Cost
	•	Technical performance
	•	Safety
	•	Customer / mission impact

For each dimension, define what 1 through 5 means.

Example for schedule:
	•	1 = negligible schedule effect
	•	3 = moderate delay requiring replanning
	•	5 = severe delay impacting key milestones

The product should allow the team to decide how impact is determined:
	•	Maximum dimension selected
	•	Single chosen primary dimension
	•	Weighted rollup in a future release

For MVP, the simplest implementation is:
	•	Let users enter one overall impact score
	•	Provide a place to define the meaning of each score
	•	Optionally support dimension detail as a future enhancement

⸻

8.4 Risk Cube / Heat Map

The application shall automatically generate a risk cube or heat map from likelihood and impact inputs.

Capabilities:
	•	Plot risks on a 5x5 grid
	•	Show count of risks per cell
	•	Allow clicking a cell to view the risks within it
	•	Color-code severity zones
	•	Filter by project, owner, category, or status

This view is important, but should not dominate the product. It is a visualization, not the whole workflow.

⸻

8.5 Mitigation Planning

The application shall support mitigation planning for medium and high risks.

Each mitigation action should include:
	•	Unique ID
	•	Linked risk
	•	Action title
	•	Description
	•	Owner
	•	Due date
	•	Status
	•	Notes
	•	Expected effect

Recommended statuses:
	•	Not started
	•	In progress
	•	Blocked
	•	Complete
	•	Canceled

Important rule:
Completing a mitigation action should not automatically lower a risk score. A user should explicitly reassess the residual risk.

⸻

8.6 Decision Register

The application shall support a structured decision register.

Each decision should include:
	•	Unique ID
	•	Title
	•	Decision statement
	•	Context / problem statement
	•	Alternatives considered
	•	Rationale
	•	Assumptions
	•	Decision owner
	•	Approver or decision authority
	•	Date made
	•	Effective date
	•	Review date
	•	Current status
	•	Linked risks
	•	Notes

Recommended status values:
	•	Proposed
	•	Approved
	•	Implemented
	•	Reversed
	•	Superseded

The register should help answer:
	•	What was decided?
	•	Why was it decided?
	•	What were the tradeoffs?
	•	What risks were accepted or created?
	•	When should the decision be revisited?

⸻

8.7 Linkage Between Decisions and Risks

The application shall allow a risk and a decision to be explicitly linked.

Possible relationship labels:
	•	Decision created risk
	•	Decision reduced risk
	•	Decision accepted risk
	•	Decision retired risk
	•	Risk informed decision

This is one of the most valuable parts of the concept because it creates traceability between choices and consequences.

⸻

8.8 History and Audit Trail

The application shall keep a history of meaningful changes.

For risks, track changes such as:
	•	Likelihood changes
	•	Impact changes
	•	Severity changes
	•	Status changes
	•	Owner changes
	•	Review notes

For decisions, track changes such as:
	•	Status changes
	•	Rationale edits
	•	Review outcomes

For mitigation actions, track changes such as:
	•	Status changes
	•	Due date changes
	•	Ownership changes

Each history entry should capture:
	•	What changed
	•	Old value
	•	New value
	•	Who changed it
	•	When it changed
	•	Optional reason/comment

⸻

8.9 Dashboard and Graphics

The application should provide useful visual summaries.

Good MVP visuals include:
	•	Current risk heat map
	•	Open risks by severity
	•	Risks by category
	•	Risks by owner
	•	High risks without mitigations
	•	Overdue mitigation actions
	•	Risk burndown over time
	•	Number of risks opened vs closed by period
	•	Average severity trend over time

Longer-term possibilities:
	•	Decision volume over time
	•	Risks created by decisions vs risks reduced by decisions
	•	Mitigation effectiveness trends

⸻

8.10 Review Workflow Support

The application should support recurring review behavior.

Examples:
	•	Weekly project risk review
	•	Monthly program review
	•	Quarterly leadership review

Helpful features:
	•	Show risks due for review
	•	Flag stale risks not updated recently
	•	Show overdue mitigation actions
	•	Provide quick update mode for live meetings

⸻

8.11 Filtering, Search, and Organization

The application shall support filtering and search.

Users should be able to filter by:
	•	Record type
	•	Project / program / product
	•	Category
	•	Owner
	•	Severity
	•	Status
	•	Review date
	•	Tags

Users should be able to search by title, text, or ID.

⸻

8.12 Export and Reporting

The application should support export for sharing and reporting.

Useful exports for MVP:
	•	Risk register to CSV / Excel
	•	Decision register to CSV / Excel
	•	Dashboard snapshots to PDF
	•	Heat map export as image or PDF

⸻

9. Suggested Information Model

9.1 Entities

Risk

Core record representing an uncertain future event with potential negative consequences.

Decision

Core record representing a major organizational or project decision.

Mitigation Action

Task or activity intended to reduce likelihood, impact, or exposure for a risk.

History Event

Immutable event recording changes made to a record.

Criteria Set

Definition of likelihood and impact scales used for scoring.

⸻

9.2 Example Risk Fields
	•	id
	•	title
	•	description
	•	cause
	•	event
	•	consequence
	•	category
	•	owner_id
	•	project_id
	•	status
	•	likelihood_score
	•	impact_score
	•	severity_level
	•	inherent_score
	•	residual_likelihood_score
	•	residual_impact_score
	•	residual_severity_level
	•	date_identified
	•	last_reviewed_at
	•	next_review_date
	•	target_close_date
	•	mitigation_summary
	•	notes
	•	created_at
	•	updated_at

⸻

9.3 Example Decision Fields
	•	id
	•	title
	•	decision_statement
	•	context
	•	alternatives_considered
	•	rationale
	•	assumptions
	•	owner_id
	•	approver_id
	•	decision_date
	•	effective_date
	•	review_date
	•	status
	•	notes
	•	created_at
	•	updated_at

⸻

9.4 Example Mitigation Fields
	•	id
	•	risk_id
	•	title
	•	description
	•	owner_id
	•	due_date
	•	status
	•	expected_effect
	•	notes
	•	created_at
	•	updated_at

⸻

9.5 Relationship Objects

Because decisions and risks can have many-to-many relationships, use a linking table or relationship object.

Example fields:
	•	id
	•	risk_id
	•	decision_id
	•	relationship_type
	•	notes

⸻

10. Key User Workflows

10.1 Create a new risk
	1.	User clicks “New Risk”
	2.	User enters title, cause, event, consequence, owner, and category
	3.	User selects likelihood and impact using visible criteria definitions
	4.	Tool computes severity and places the risk on the heat map
	5.	If severity is medium or high, the tool prompts for a mitigation plan
	6.	Risk appears in the register and dashboard

Design note

This workflow should be very fast. Use progressive disclosure so only essential fields appear first.

⸻

10.2 Review and update an existing risk
	1.	User opens a risk from the register or heat map
	2.	User updates score, status, notes, or review date
	3.	User optionally adds a comment explaining why the score changed
	4.	Tool stores a history event
	5.	Dashboard updates automatically

⸻

10.3 Create a mitigation plan
	1.	User opens a medium or high risk
	2.	User selects “Add Mitigation Action”
	3.	User defines actions, owners, due dates, and expected effects
	4.	Actions appear in the risk detail page and action tracking view
	5.	When actions are complete, the user can reassess residual risk

⸻

10.4 Record a decision
	1.	User clicks “New Decision”
	2.	User enters the decision statement, rationale, alternatives, and owner
	3.	User links relevant risks
	4.	Decision is added to the decision register
	5.	Linked risks display the connection automatically

⸻

10.5 Run a review meeting
	1.	User opens a review dashboard
	2.	Tool shows stale risks, high risks, and overdue actions
	3.	Team updates records in live meeting mode
	4.	Changes are stored with timestamps and history
	5.	Post-review dashboard reflects latest status

⸻

11. UX / UI Guidance

The product must be intuitive and low-friction.

UX principles
	•	Minimize required typing
	•	Use sensible defaults
	•	Keep primary actions obvious
	•	Use inline editing where possible
	•	Show scoring criteria beside scoring controls
	•	Avoid modal overload
	•	Let users work quickly from tables and detail panes
	•	Design for both focused record editing and live review sessions

UI suggestions
	•	Left navigation with major sections: Dashboard, Risks, Decisions, Actions, Settings
	•	Register tables with filter chips and quick search
	•	Slide-out detail pane or split view for editing records
	•	Heat map view with clickable cells
	•	Calm colors, clean spacing, strong typography
	•	Visual severity cues without making the interface noisy

Important behavior

The app should feel easier than Excel, not more complicated than Excel.

⸻

12. MVP Definition

The MVP should focus on the smallest feature set that delivers clear value.

Include in MVP
	•	Risk register
	•	Decision register
	•	Mitigation actions
	•	Configurable likelihood criteria
	•	Configurable impact criteria
	•	Automatic heat map / risk cube
	•	Links between risks and decisions
	•	Change history
	•	Dashboard with a few core charts
	•	Filtering and search
	•	Export to CSV / PDF

Exclude from MVP
	•	Multi-org admin architecture
	•	Complex permission system
	•	Custom workflow designer
	•	Email or chat integrations
	•	Full issue register
	•	Full assumptions register
	•	Advanced probabilistic analysis

⸻

13. Future Enhancements

Potential future additions:
	•	Issue register
	•	Assumption register
	•	Notifications and reminders
	•	Approvals and signoff workflows
	•	Attachments and evidence storage
	•	Comments and collaboration threads
	•	Multiple scoring models per project
	•	Custom dashboards
	•	Import from spreadsheets
	•	Role-based access control
	•	Cloud sync or shared database options

⸻

14. Technical Direction for Vibe-Coding

This section does not lock implementation, but gives practical guidance.

Recommended shape

A cross-platform desktop app with a local database is the most natural fit.

Good implementation direction
	•	Desktop shell: Electron or Tauri
	•	Frontend: React + TypeScript
	•	UI library: modern component library with accessible tables/forms
	•	Data visualization: charting library for heat map and trends
	•	Local database: SQLite
	•	ORM / query layer: Prisma, Drizzle, or equivalent

Why this direction?
	•	Runs on macOS and Windows
	•	Supports a polished UI
	•	Good for local-first workflows
	•	Easy to package and distribute
	•	Fast iteration for a solo or small-team build

If minimizing app weight matters a lot, Tauri is attractive. If ecosystem convenience matters more, Electron is easier.

⸻

15. Suggested Build Phases

Phase 1: Foundation
	•	Define data model
	•	Set up app shell
	•	Build local database
	•	Build core navigation and layout
	•	Implement settings for scoring criteria

Phase 2: Core records
	•	Implement risk CRUD
	•	Implement decision CRUD
	•	Implement mitigation action CRUD
	•	Implement relationship linking

Phase 3: Risk analysis views
	•	Implement automatic severity calculation
	•	Implement risk cube / heat map
	•	Implement table filters and search
	•	Implement history tracking

Phase 4: Dashboards and exports
	•	Implement trend charts
	•	Implement stale-risk and overdue-action widgets
	•	Implement CSV / PDF export

Phase 5: Polish
	•	Improve UX flow
	•	Add quick-edit features
	•	Improve visual design
	•	Add onboarding and empty states
	•	Prepare for broader usage

⸻

16. Product Risks

The biggest risks to this product are not just technical.

Risk 1: Too much scope too early

Mitigation: keep MVP tight and avoid building full enterprise governance software in version 1.

Risk 2: Too much required data entry

Mitigation: require only essential fields upfront and progressively reveal the rest.

Risk 3: Inconsistent scoring

Mitigation: make criteria definitions explicit and always visible during scoring.

Risk 4: Users stop maintaining the tool

Mitigation: design for fast updates, live meeting use, and useful dashboards.

Risk 5: Over-indexing on visuals

Mitigation: remember the value is in structured records, review cadence, and traceability, not just the cube.

⸻

17. Success Criteria

The product is succeeding if:
	•	Users can create or update a risk in under a minute for basic cases
	•	Users understand why a risk is ranked 1 versus 5
	•	Medium and high risks consistently have mitigation plans
	•	Decisions are captured with rationale instead of disappearing into meeting notes
	•	Users can see how risk exposure changed over time
	•	Teams prefer using the application over maintaining spreadsheets manually

⸻

18. Final Recommendation

This is a strong product concept, especially as a practical desktop tool for engineering, project, and program teams.

The best version of the idea is not “a giant governance platform.” It is a focused, elegant, low-friction system for:
	•	capturing risks,
	•	scoring them consistently,
	•	managing mitigations,
	•	recording major decisions,
	•	and preserving the traceability between the two.

The most important implementation choice is to keep the first version narrow, fast, and pleasant to use.

If the tool is beautiful but bloated, people will avoid it.
If the tool is structured but annoying, people will still use spreadsheets.
If the tool is intuitive, quick, and genuinely helpful during reviews, it has a real chance of sticking.