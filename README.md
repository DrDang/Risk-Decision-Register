# Governance Register

Governance Register is a local-first risk and decision workspace built for teams that need a simple, governed way to manage:

- a risk register
- a decision register
- portable review snapshots

It starts with a blank project for real use and supports import/export of pretty JSON snapshots so teams can collaborate without needing a networked backend.

## Highlights

- Risk register with scoring, ownership, linked decisions, mitigation planning, and history
- Decision register with rationale, linked risks, consequences, and status tracking
- Snapshot import/export workflow for restricted environments such as SharePoint-based collaboration
- Portable launchers for Mac and Windows
- Bundled demo snapshot for walkthroughs and training

## Screenshots

### Risk Register

![Risk Register](docs/assets/risk-register.png)

### Decision Register

![Decision Register](docs/assets/decision-register.png)

## Run Without Setup

This repository includes a production build that can be launched without `npm run dev`.

### Mac

Double-click `Launch Governance Register.command`

### Windows

Double-click `Launch Governance Register.bat`

These launchers open the built app from `app/dist/index.html` in the default browser.

For more portable-launch notes, see [docs/portable-app.md](docs/portable-app.md).

## Demo Content

The app starts with a blank project by default.

To load example content for demos or training:

1. Open the app
2. Go to `Import / Export`
3. Download the bundled demo snapshot
4. Import that snapshot back into the app

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
