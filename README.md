# Governance Register

Governance Register is a local-first risk and decision workspace for teams that need a simple, governed way to maintain a risk register, a decision register, and portable review snapshots.

## What It Does

- Track risks in an operational register with scoring, ownership, mitigation, and history
- Track decisions with linked risks, rationale, and consequences
- Import and export full workspace snapshots as pretty JSON for review cycles and revision control
- Start blank for real use, with an optional demo snapshot for walkthroughs

## Run The Portable Build

The repository includes a production build that can be launched without `npm run dev`.

### Mac

Double-click `Launch Governance Register.command`

### Windows

Double-click `Launch Governance Register.bat`

These launchers open the built app from `app/dist/index.html` in the default browser.

## Demo Content

The app starts with a blank project by default.

To load example content for demos or training:

1. Open the app
2. Go to `Import / Export`
3. Download the bundled demo snapshot
4. Import that snapshot back into the app

## Source App

The source code lives under `app/`.

Useful commands for development:

- `cd app`
- `npm install`
- `npm run dev`
- `npm run build`
- `npm run lint`
