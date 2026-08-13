#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../.." && pwd)"
cd "$repo_root"

for command_name in node npm; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "BLOCKED: required command '$command_name' is unavailable."
    exit 1
  fi
done

qa_env="config/environments/qa.env.example"
credentials="config/environments/qa-test-accounts.local.json"

if ! test -f "$qa_env" || ! grep -qx 'EXPO_PUBLIC_APP_ENV=QA' "$qa_env"; then
  echo "BLOCKED: $qa_env must explicitly select QA."
  exit 1
fi

for required_path in app.config.js eas.json package-lock.json; do
  if ! test -f "$required_path"; then
    echo "BLOCKED: required project file '$required_path' is missing."
    exit 1
  fi
done

if ! test -f "$credentials"; then
  echo "BLOCKED: create $credentials from config/environments/qa-test-accounts.example.json."
  exit 2
fi

node -e 'const accounts = require("./config/environments/qa-test-accounts.local.json"); for (const role of ["user_one", "user_two"]) { if (!accounts[role]?.email || !accounts[role]?.password) process.exit(1); }' || {
  echo "BLOCKED: local QA credentials must contain user_one and user_two email/password values."
  exit 2
}

echo "READY: QA environment and local QA-account configuration are present."
