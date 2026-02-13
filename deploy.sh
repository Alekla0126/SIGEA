#!/usr/bin/env bash
set -euo pipefail

# Compat wrapper: GitHub Actions / operadores esperan /opt/sigea/deploy.sh
exec "$(dirname "$0")/deploy/deploy.sh" "$@"

