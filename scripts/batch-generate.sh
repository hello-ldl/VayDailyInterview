#!/usr/bin/env bash
# batch-generate.sh - 批量生成指定日期范围内的每日面试题
# 用法: ./scripts/batch-generate.sh --start-date 2026-05-24 --end-date 2026-05-27 --provider deepseek

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# 默认值
START_DATE=""
END_DATE=""
PROVIDER="deepseek"
MODEL=""

# 解析参数
while [[ $# -gt 0 ]]; do
  case $1 in
    --start-date)
      START_DATE="$2"
      shift 2
      ;;
    --end-date)
      END_DATE="$2"
      shift 2
      ;;
    --provider)
      PROVIDER="$2"
      shift 2
      ;;
    --model)
      MODEL="$2"
      shift 2
      ;;
    --help)
      echo "用法: $0 --start-date YYYY-MM-DD --end-date YYYY-MM-DD [--provider openai|deepseek] [--model MODEL_NAME]"
      echo ""
      echo "示例:"
      echo "  $0 --start-date 2026-05-24 --end-date 2026-05-27 --provider deepseek"
      echo ""
      echo "环境变量:"
      echo "  OPENAI_API_KEY    - OpenAI API 密钥（当 provider=openai 时需要）"
      echo "  DEEPSEEK_API_KEY  - DeepSeek API 密钥（当 provider=deepseek 时需要）"
      exit 0
      ;;
    *)
      echo "未知参数: $1"
      exit 1
      ;;
  esac
done

# 验证必需参数
if [ -z "$START_DATE" ] || [ -z "$END_DATE" ]; then
  echo "错误: --start-date 和 --end-date 是必需的"
  exit 1
fi

# 验证日期格式
if ! [[ "$START_DATE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  echo "错误: 开始日期格式不正确，应为 YYYY-MM-DD"
  exit 1
fi

if ! [[ "$END_DATE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  echo "错误: 结束日期格式不正确，应为 YYYY-MM-DD"
  exit 1
fi

# 验证 API 密钥
if [ "$PROVIDER" = "openai" ] && [ -z "$OPENAI_API_KEY" ]; then
  echo "错误: 使用 OpenAI 时需要设置 OPENAI_API_KEY 环境变量"
  exit 1
fi

if [ "$PROVIDER" = "deepseek" ] && [ -z "$DEEPSEEK_API_KEY" ]; then
  echo "错误: 使用 DeepSeek 时需要设置 DEEPSEEK_API_KEY 环境变量"
  exit 1
fi

echo "=========================================="
echo "批量生成每日面试题"
echo "=========================================="
echo "日期范围: $START_DATE 到 $END_DATE"
echo "API 提供商: $PROVIDER"
[ -n "$MODEL" ] && echo "模型: $MODEL"
echo "=========================================="
echo ""

# 计算日期范围内的所有日期
current_date="$START_DATE"
success_count=0
fail_count=0
skipped_count=0

while [[ "$current_date" <= "$END_DATE" ]]; do
  echo "------------------------------------------"
  echo "处理日期: $current_date"
  echo "------------------------------------------"
  
  # 检查该日期的分片是否已存在
  chunk_file="$ROOT_DIR/public/questions/chunks/${current_date}.json"
  if [ -f "$chunk_file" ]; then
    echo "⚠️  跳过: $current_date 的题目已存在"
    skipped_count=$((skipped_count + 1))
  else
    # 构建命令
    cmd="QUESTION_API_PROVIDER=$PROVIDER QUESTION_DATE=$current_date"
    [ -n "$MODEL" ] && cmd="$cmd QUESTION_MODEL=$MODEL"
    
    if [ "$PROVIDER" = "openai" ]; then
      cmd="$cmd OPENAI_API_KEY=$OPENAI_API_KEY"
    else
      cmd="$cmd DEEPSEEK_API_KEY=$DEEPSEEK_API_KEY"
    fi
    
    cmd="$cmd node $SCRIPT_DIR/generate-daily-question.mjs"
    
    # 执行生成
    if eval "$cmd"; then
      echo "✅ 成功生成 $current_date 的题目"
      success_count=$((success_count + 1))
    else
      echo "❌ 生成 $current_date 的题目失败"
      fail_count=$((fail_count + 1))
    fi
  fi
  
  echo ""
  
  # 计算下一天
  current_date=$(date -j -v+1d -f "%Y-%m-%d" "$current_date" "+%Y-%m-%d" 2>/dev/null || \
                 date -d "$current_date + 1 day" "+%Y-%m-%d" 2>/dev/null)
  
  # 如果日期计算失败，退出循环
  if [ -z "$current_date" ]; then
    break
  fi
done

echo "=========================================="
echo "批量生成完成"
echo "=========================================="
echo "成功: $success_count"
echo "跳过: $skipped_count"
echo "失败: $fail_count"
echo "=========================================="

if [ $fail_count -gt 0 ]; then
  exit 1
fi
