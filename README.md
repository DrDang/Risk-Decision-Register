# Governance Register

Governance Register is a local-first risk and decision workspace built for teams that need a simple, governed way to manage:

- a risk register
- a decision register
- portable board files
- view-only review exports

It starts empty on purpose so users explicitly choose whether to open an existing board JSON or start a new board. The app then lets teams publish new JSON board versions and create read-only HTML shareouts without needing a backend.

## Highlights

- Risk register with scoring, ownership, linked decisions, mitigation planning, and history
- Source-owned shared risks with downstream subscriptions, review-required flags, and optional linked local risks
- Decision register with rationale, linked risks, consequences, and status tracking
- Simple board workflow for restricted environments: open a board, edit locally, publish a new JSON version
- Read-only HTML export for stakeholders who need to review the board without editing it
- Portable launchers for Mac and Windows
- Bundled demo snapshot for walkthroughs and training

## Screenshots

### Risk Register

![Risk Register](docs/assets/risk-register.png)

### Decision Register

![Decision Register](docs/assets/decision-register.png)

## Run Without Setup

This repository includes a production build that can be launched without `npm run dev`.

### Recommended Download Flow

1. Download or clone the repository
2. Keep the folder structure intact
3. Launch the app from the repository root using the platform launcher below

This works because the portable build is already included under `app/dist/`.

### Mac

Double-click `Launch Governance Register.command`

If macOS warns that the file came from the internet, use the normal security prompt flow to allow it to open.

### Windows

Double-click `Launch Governance Register.bat`

These launchers open the built app from `app/dist/index.html` in the default browser.

### What To Expect

- No package installation is required for normal use
- No backend or database is required
- The app runs in the browser, but from local files included in this repo
- Your working data stays local unless you export and share a snapshot yourself
- Shared risk subscriptions, linked local risk relationships, and review state are included in snapshots

For more portable-launch notes, see [docs/portable-app.md](docs/portable-app.md).

## Demo Content

The app starts empty by default.

To load example content for demos or training:

1. Open the app
2. Stay on `Registry Source`
3. Choose `Open Board`
4. Open the bundled demo snapshot at `app/public/demo-project-snapshot.json`

The bundled demo snapshot is included in the portable build so users can explore a populated example without affecting the default blank starting state.

## Everyday Workflow

For most users, the intended flow is:

1. Open the app
2. Go to `Registry Source`
3. Either:
   - choose `Open Board` to continue an existing JSON board file
   - choose `Start New Board` to begin a blank board
4. Work in the Risk Register and Decision Register
5. Use `Publish` to save a new JSON board version

If you need a non-editable shareout for reviewers, use the `Publish` menu in the top bar and choose `Export Read-Only HTML`.

## Board Files And Compatibility

- The app opens board JSON snapshots that include a `projects` array.
- Older exported board files are normalized when opened so they can continue working in the current app.
- When you publish, the board is saved back out in the current snapshot format used by this version of the tool.
- Shared risks, linked local risks, scoring models, and review state are preserved in published board files.

## Release Use On GitHub

For GitHub visitors, the simplest path is:

1. Download the repository as a ZIP or clone it
2. Extract it to a normal local folder
3. Launch with `Launch Governance Register.command` on Mac or `Launch Governance Register.bat` on Windows

If you plan to share the tool internally, distributing the full repository contents is important because the launchers expect the built app to remain at `app/dist/index.html`.

## Development

The source app lives under `app/`.

### Local development

```bash
cd app
npm install
npm run dev
```

### Build

```bash
cd app
npm run build
```

### Type check

```bash
cd app
npm run lint
```

## Repository Layout

- `app/`: source app and production build
- `docs/`: portable launch notes, screenshots, and archived planning/reference material
- `Launch Governance Register.command`: Mac launcher
- `Launch Governance Register.bat`: Windows launcher

## Notes

- The portable launch path is intentionally browser-based rather than Electron for a lighter-weight distribution model.
- The built app is checked into the repository on purpose so end users can launch it directly from the repo contents.
- Read-only HTML exports are generated from the current board on demand and are not meant to replace the editable JSON board files.
