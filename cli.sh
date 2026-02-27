#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: ./cli.sh <fixture.json>" >&2
  exit 1
fi

exec node builder/cli.js "$1"
