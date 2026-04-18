# Governance Register Portable Launch

This repo includes a production build that can be launched without `npm run dev`.

When the app opens, it starts at `Registry Source` so the user can either:

- open an existing board JSON file
- start a new blank board

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

The live app starts empty by default.
To load the example project, open `app/public/demo-project-snapshot.json` from the `Registry Source` page.

## Saving And Sharing

- Use `Publish` to save a new editable JSON board version.
- Use the `Publish` menu and choose `Export Read-Only HTML` to generate a view-only browser file for reviewers.
- The JSON board file remains the editable source of truth.
