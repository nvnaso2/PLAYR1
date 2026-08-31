#!/usr/bin/env bash
set -euo pipefail

# Keep task merges reproducible without prompting for input.
npm ci --no-audit --no-fund
npm run build