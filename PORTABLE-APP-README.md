# Governance Register Portable Launch

This repo includes a production build that can be launched without `npm run dev`.

## Mac launch

Double-click `Launch Governance Register.command`.

That script opens the built app from `app/dist/index.html` in your default browser.
No package install or dev server is required on the user's machine.

## Windows launch

Double-click `Launch Governance Register.bat`.

That batch file opens the same built app from `app\dist\index.html` in the default browser on Windows.

## What to include in a GitHub release or handoff

- `Launch Governance Register.command`
- `Launch Governance Register.bat`
- `app/dist/`

## Demo content

The live app starts blank by default.
To load the example project, use the bundled `demo-project-snapshot.json` link on the `Import / Export` page.
