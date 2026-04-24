#!/bin/zsh
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_INDEX="$SCRIPT_DIR/app/dist/index.html"
if [[ ! -f "$APP_INDEX" ]]; then
  osascript -e 'display alert "Governance Register" message "The production build was not found at app/dist/index.html. Run `cd app && npm run build` first or download the latest release bundle." as critical'
  exit 1
fi
open "$APP_INDEX"
