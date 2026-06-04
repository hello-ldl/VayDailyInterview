# Scripts 目录说明

本目录包含 VayDailyInterview 项目的所有构建和维护脚本。

---

## 脚本一览

| 脚本 | 功能 | 类型 |
|------|------|------|
| `emit-java-bank.mjs` | 将题库文件解析为 JSON 分片 | 构建 |
| `generate-daily-question.mjs` | 通过 AI 生成每日面试题 | 核心 |
| `run-daily-question.sh` | 每日生成任务的 Shell 包装器 | 调度 |
| `fix-answers.mjs` | 修复架构类占位答案 | 维护 |
| `update-answers.mjs` | 精确匹配更新题目答案 | 维护 |
| `update-answers-v2.mjs` | 关键词匹配更新题目答案 | 维护 |
| `optimize-answers.mjs` | 通过指定 provider（deepseek / qianwen / openai）批量优化题目答案 | 维护 |

---

## 详细说明

### 1. `emit-java-bank.mjs` — 题库构建

将 `java-bank.lines` 题库文件解析为结构化的 JSON 分片文件。

```bash
node scripts/emit-java-bank.mjs
```

**输入**：`scripts/java-bank.lines`（每行格式：`标题|||补充|||答案|||tag1,tag2`）

**输出**：
- `public/questions/chunks/*.json` — 每个分片包含 5 道题
- `public/questions/meta.json` — 分片索引文件

**要求**：`java-bank.lines` 必须恰好 100 行。

---

### 2. `generate-daily-question.mjs` — AI 生成每日题

调用 OpenAI / DeepSeek API 自动生成 5 道不重复的 Java 面试题，并自动提交到 Git。

```bash
# 通过 Shell 脚本调用（推荐）
./scripts/run-daily-question.sh --provider deepseek --date 2026-05-20

# 直接运行
QUESTION_API_PROVIDER=deepseek \
DEEPSEEK_API_KEY=sk-xxx \
QUESTION_DATE=2026-05-20 \
node scripts/generate-daily-question.mjs
```

**核心流程**：
1. 读取 `meta.json` 获取已有题目列表
2. 调用 AI API 生成题目
3. 用 Levenshtein 编辑距离去重（相似度 > 70% 视为重复）
4. 写入新分片文件 + 更新 `meta.json`
5. 自动 `git add → commit → push`

**环境变量**：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `QUESTION_API_PROVIDER` | API 提供商 (`openai` / `deepseek` / `qianwen`) | `openai` |
| `OPENAI_API_KEY` | OpenAI API 密钥 | — |
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 | — |
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 | — |
| `DEEPSEEK_API_BASE` | DeepSeek API 基础地址（或完整请求 URL） | `https://api.deepseek.com/anthropic` |
| `QIANWEN_API_KEY` | 千问（Qianwen）API 密钥 | — |
| `QIANWEN_API_BASE` | 千问兼容 OpenAI SDK 的请求基础地址 | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| `DEEPSEEK_API_URL` | DeepSeek 完整请求 URL，优先级高于 `DEEPSEEK_API_BASE` | — |
| `QUESTION_DATE` | 生成日期 `YYYY-MM-DD` | 今天 |
| `QUESTION_MODEL` | 模型名称 | `gpt-4o-mini` / `deepseek-v4-pro` |
| `KAIYUAN_CLI` | （可选）外部相似度 CLI | — |

---

### 3. `run-daily-question.sh` — 每日任务调度器

`generate-daily-question.mjs` 的 Shell 包装器，负责参数解析、环境变量验证和日志管理。

```bash
# 使用 DeepSeek 生成今天的题目
./scripts/run-daily-question.sh --provider deepseek

# 指定日期和模型
./scripts/run-daily-question.sh --provider deepseek --date 2026-05-20 --model deepseek-v4-pro

# 查看帮助
./scripts/run-daily-question.sh --help
```

**日志**：`logs/daily-{DATE}.log`（自动清理 30 天前的日志）

---

### 4. `fix-answers.mjs` — 修复架构类答案

针对性的修复脚本，将分片文件中包含"架构设计需要权衡各种因素"占位文本的题目替换为详细的架构解答。

```bash
node scripts/fix-answers.mjs
```

**覆盖题型**：
- 常见误区（读写分离、模块化单体、SAGA、CQRS）
- 适用场景 / 何时优先使用
- 核心概念
- 模式区别（SAGA vs 2PC、CQRS vs CRUD 等）

---

### 5. `update-answers.mjs` — 精确匹配批量更新

使用**精确标题匹配**（硬编码答案字典）批量替换题目答案。

```bash
node scripts/update-answers.mjs
```

**适用场景**：题目标题固定的情况下，用预编写的详细答案替换 AI 生成的简短答案。

---

### 6. `update-answers-v2.mjs` — 关键词匹配批量更新

使用**关键词模糊匹配**（`title.includes()`）批量替换题目答案。覆盖面更广但不如 v1 精准。

```bash
node scripts/update-answers-v2.mjs
```

**覆盖领域**：JVM、并发、架构、数据库、网络、Spring 框架。

---

### 7. `optimize-answers.mjs` — 答案优化（支持 provider）

通过指定 provider（`deepseek` / `qianwen` / `openai`）逐题优化题库中的现有答案。脚本会先根据题目标题提问一次，再根据补充说明提问一次，将两次得到的回答组合到 `answer` 字段中。

```bash
# 使用 Deepseek（默认）
DEEPSEEK_API_KEY=sk-xxx \
node scripts/optimize-answers.mjs

# 或者指定 provider 为 qianwen
QUESTION_API_PROVIDER=qianwen QIANWEN_API_KEY=sk-xxx \
node scripts/optimize-answers.mjs
```

**可选环境变量**：
- `QUESTION_DATE`：只优化指定日期分片，例如 `2026-05-20`
- `QUESTION_CHUNK_FILE`：只优化指定分片路径，例如 `chunks/2026-05-20.json`
- `DEEPSEEK_API_BASE`：Deepseek API 基础地址，默认 `https://api.deepseek.com/anthropic`
- `DEEPSEEK_MODEL`：Deepseek 模型名称，默认 `deepseek-v4-pro`
- `QIANWEN_API_BASE`：千问兼容地址，默认 `https://dashscope.aliyuncs.com/compatible-mode/v1`
- `QIANWEN_MODEL`：千问模型名称，默认 `qianwen`
- `INTERVIEWER_PROMPT`：覆盖默认面试官提示词

---

## 典型工作流

```
┌─────────────────────────────────────────────────────────┐
│                    初始化 / 重建题库                        │
│  java-bank.lines → emit-java-bank.mjs → chunks/*.json    │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    每日自动生成题目                         │
│  run-daily-question.sh → generate-daily-question.mjs     │
│  → AI API → 去重 → 写入分片 → git push                    │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    答案质量优化                            │
│  fix-answers.mjs / update-answers.mjs /                  │
│  update-answers-v2.mjs → 替换为详细答案                    │
└─────────────────────────────────────────────────────────┘
```
