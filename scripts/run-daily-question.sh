#!/usr/bin/env bash
set -euo pipefail

# run-daily-question.sh
# Usage:
#   ./scripts/run-daily-question.sh [--provider openai|deepseek] [--date YYYY-MM-DD] [--model MODEL]
# Examples:
#   ./scripts/run-daily-question.sh --provider deepseek
#   QUESTION_API_PROVIDER=openai OPENAI_API_KEY=... ./scripts/run-daily-question.sh --date 2026-05-21

cd "$(dirname "$0")/.." || exit 1

PROVIDER_DEFAULT="deepseek"
PROVIDER="${PROVIDER:-$PROVIDER_DEFAULT}"
QUESTION_DATE=""
QUESTION_MODEL=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --provider)
      PROVIDER="$2"; shift 2;;
    --date)
      QUESTION_DATE="$2"; shift 2;;
    --model)
      QUESTION_MODEL="$2"; shift 2;;
    -h|--help)
      sed -n '1,120p' "$0"; exit 0;;
    *)
      echo "Unknown arg: $1"; exit 2;;
  esac
done

# Default date to today when not provided
if [[ -z "$QUESTION_DATE" ]]; then
  QUESTION_DATE=$(date -u +%F)
fi

# Set env vars expected by the Node script
export QUESTION_API_PROVIDER="${QUESTION_API_PROVIDER:-$PROVIDER}"
if [[ -n "$QUESTION_MODEL" ]]; then
  export QUESTION_MODEL="$QUESTION_MODEL"
fi

# Prefer DEEPSEEK_API_KEY when provider is deepseek; otherwise OPENAI_API_KEY for openai
if [[ "$QUESTION_API_PROVIDER" == "deepseek" ]]; then
  if [[ -z "${DEEPSEEK_API_KEY:-}" ]]; then
    echo "ERROR: DEEPSEEK_API_KEY is not set. Export it or provide via environment." >&2
    exit 1
  fi
  export DEEPSEEK_API_KEY
  export DEEPSEEK_API_BASE="https://api.deepseek.com/v1"
else
  if [[ -z "${OPENAI_API_KEY:-}" ]]; then
    echo "ERROR: OPENAI_API_KEY is not set. Export it or provide via environment." >&2
    exit 1
  fi
  export OPENAI_API_KEY
fi

export QUESTION_DATE

LOG_DIR="./logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/daily-${QUESTION_DATE}.log"

echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] Start generate for ${QUESTION_DATE} (provider=${QUESTION_API_PROVIDER})" >> "$LOG_FILE"

# Run the generator (uses package.json script `gen:daily`)
# Using npm so environment gets preserved; adjust to `yarn` if needed
if command -v npm >/dev/null 2>&1; then
  npm run gen:daily >> "$LOG_FILE" 2>&1 || {
    echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] ERROR: generation failed, see $LOG_FILE" >&2
    exit 1
  }
else
  echo "ERROR: npm not found" >&2
  exit 2
fi

echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] Done" >> "$LOG_FILE"

# Optional: prune logs older than 30 days
find "$LOG_DIR" -type f -name 'daily-*.log' -mtime +30 -exec rm -f {} + || true

exit 0
