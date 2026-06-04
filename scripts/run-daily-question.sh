#!/usr/bin/env bash
# =============================================================================
# run-daily-question.sh
# =====================
# 每日面试题目生成脚本的 Shell 包装器。
#
# 功能：
#   1. 解析命令行参数（provider、date、model）
#   2. 验证并设置所需的环境变量（API 密钥等）
#   3. 调用 npm run gen:daily 触发 Node.js 生成脚本
#   4. 将输出写入 logs/daily-{DATE}.log 日志文件
#   5. 自动清理 30 天前的旧日志
#
# 使用方式：
#   # 使用 DeepSeek 生成今天的题目
#   ./scripts/run-daily-question.sh --provider deepseek
#
#   # 使用 OpenAI 生成指定日期的题目
#   QUESTION_API_PROVIDER=openai OPENAI_API_KEY=sk-xxx \
#     ./scripts/run-daily-question.sh --date 2026-05-21
#
#   # 指定模型
#   ./scripts/run-daily-question.sh --provider deepseek --model deepseek-v4-pro --date 2026-05-20
#
#   # 查看帮助
#   ./scripts/run-daily-question.sh --help
#
# 环境变量：
#   DEEPSEEK_API_KEY  - DeepSeek API 密钥（使用 deepseek provider 时必需）
#   OPENAI_API_KEY    - OpenAI API 密钥（使用 openai provider 时必需）
#   QUESTION_API_PROVIDER - 覆盖 provider 设置
#   QUESTION_MODEL    - 覆盖模型设置
#
# 输出：
#   logs/daily-{DATE}.log - 生成过程的完整日志
# =============================================================================

set -euo pipefail

# 切换到项目根目录
cd "$(dirname "$0")/.." || exit 1

# ---- 默认配置 ----
PROVIDER_DEFAULT="deepseek"
PROVIDER="${PROVIDER:-$PROVIDER_DEFAULT}"
QUESTION_DATE=""
QUESTION_MODEL=""

# ---- 解析命令行参数 ----
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

# 未指定日期时默认使用今天（UTC）
if [[ -z "$QUESTION_DATE" ]]; then
  QUESTION_DATE=$(date -u +%F)
fi

# ---- 设置环境变量 ----
# 优先使用已设置的 QUESTION_API_PROVIDER，否则使用 --provider 参数
export QUESTION_API_PROVIDER="${QUESTION_API_PROVIDER:-$PROVIDER}"
if [[ -n "$QUESTION_MODEL" ]]; then
  export QUESTION_MODEL="$QUESTION_MODEL"
fi

# ---- 验证 API 密钥 ----
if [[ "$QUESTION_API_PROVIDER" == "deepseek" ]]; then
  if [[ -z "${DEEPSEEK_API_KEY:-}" ]]; then
    echo "ERROR: DEEPSEEK_API_KEY is not set. Export it or provide via environment." >&2
    exit 1
  fi
  export DEEPSEEK_API_KEY
  # 如果外部未设置，则提供默认 DEEPSEEK_API_BASE，允许用户通过环境覆盖以避免 404
  export DEEPSEEK_API_BASE="${DEEPSEEK_API_BASE:-https://api.deepseek.com}"
elif [[ "$QUESTION_API_PROVIDER" == "qianwen" ]]; then
  if [[ -z "${QIANWEN_API_KEY:-}" ]]; then
    echo "ERROR: QIANWEN_API_KEY is not set. Export it or provide via environment." >&2
    exit 1
  fi
  export QIANWEN_API_KEY
  export QIANWEN_API_BASE="${QIANWEN_API_BASE:-https://dashscope.aliyuncs.com/compatible-mode/v1}"
else
  if [[ -z "${OPENAI_API_KEY:-}" ]]; then
    echo "ERROR: OPENAI_API_KEY is not set. Export it or provide via environment." >&2
    exit 1
  fi
  export OPENAI_API_KEY
fi

export QUESTION_DATE

# ---- 日志设置 ----
LOG_DIR="./logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/daily-${QUESTION_DATE}.log"

echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] Start generate for ${QUESTION_DATE} (provider=${QUESTION_API_PROVIDER})" >> "$LOG_FILE"

# ---- 执行生成脚本 ----
# 通过 npm run gen:daily 触发（定义在 package.json 中）
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

# ---- 清理旧日志（保留 30 天） ----
find "$LOG_DIR" -type f -name 'daily-*.log' -mtime +30 -exec rm -f {} + || true

exit 0
