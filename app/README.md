# Governance Register App

This directory contains the source code and portable production build for Governance Register.

## What This App Does

Governance Register is a browser-based workspace for:

- managing project risk registers
- managing decision registers
- reviewing shared risks across projects
- publishing versioned JSON board files
- exporting read-only HTML shareouts
- analyzing risk movement over time in `Trends / Analytics`

The app is designed for constrained environments where users may not be allowed to install software or rely on backend services.

## Source And Build Layout

- `src/`: main React application source
- `public/demo-project-snapshot.json`: bundled example board for demos and walkthroughs
- `dist/`: checked-in production build used by the portable launchers
- `scripts/make-portable-build.mjs`: post-build step that prepares the portable output

## Local Development

Prerequisite: Node.js

```bash
cd app
npm install
npm run dev
```

## Production Build

```bash
cd app
npm run build
```

That build updates `app/dist/`, which is what the repository launchers open directly.

## Type Check

```bash
cd app
npm run lint
```

## Portable Use

For normal users, the recommended entry point is not `npm run dev`.

Instead, from the repository root:

- Mac: double-click `Launch Governance Register.command`
- Windows: double-click `Launch Governance Register.bat`

Those launch the checked-in build at `app/dist/index.html`.

## Board Workflow

The app opens to `Registry Source` and starts empty by default.

Users can then:

1. open an existing board JSON file
2. start a new board
3. edit risks, decisions, shared-risk subscriptions, and scoring models
4. publish a new JSON board version
5. optionally export a read-only HTML review copy

## Demo Content

To load example content:

1. open the app
2. stay on `Registry Source`
3. choose `Open Board`
4. open `app/public/demo-project-snapshot.json`

## Notes

- The checked-in build in `dist/` is intentional.
- Published JSON files remain the editable system of record.
- The read-only HTML export is for review and presentation, not editing.
