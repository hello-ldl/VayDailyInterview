# AI Daily Interview Question Task Guide

## 目的
这个文档用于让 AI 大模型快速理解项目结构和当前需求，自动新增每日面试题库，并保持页面展示逻辑正常。

## 项目操作手册

### 本地开发

1. 安装依赖

```bash
npm install
```

2. 启动开发服务器

```bash
npm run dev
```

3. 生产构建

```bash
npm run build
```

4. 预览构建结果

```bash
npm run preview
```

## 任务概述
- 项目已经提交并推送到 GitHub。
- 需要新增每日面试题库数据，数据保存在 `public/questions/` 下。
- 题库采用日期分块方式：每个日期一个文件，每天固定 5 道题。
- `meta.json` 是索引文件，必须同步更新最新日期、分块列表、总题数等信息。

## 关键文件
- `public/questions/meta.json`
  - `version`: 版本号，当前为 `1`
  - `chunkSize`: 每个分块的题目数量（当前应为 `5`）
  - `totalQuestions`: 全量题目数量
  - `chunkCount`: 分块总数
  - `latestDate`: 最新题目日期，格式 `YYYY-MM-DD`
  - `chunks`: 分块描述数组，每项包含：
    - `path`: 相对路径，例如 `chunks/2026-05-20.json`
    - `count`: 该分块题目数
    - `cumulativeStart`: 该分块在全局题号中的起始索引

- `public/questions/chunks/*.json`
  - 每个文件包含一个 JSON 数组 `questions`
  - 每题结构：
    - `id`: 唯一字符串
    - `date`: ISO 日期 `YYYY-MM-DD`
    - `title`: 题目标题
    - `prompt`: 题目补充说明
    - `answer`: 标准答案文本，详细回答问题，不能为空或者是只阐述标题
    - `tags?`: 可选标签数组

- `src/pages/LatestPage.tsx`
  - 最新页面默认显示 `meta.chunks[0]` 对应的最新一天题目
  - 只读取最新分块，无随机按钮或其他额外说明

- `src/pages/HistoryPage.tsx`
  - 历史页面展示分块列表，按日期顺序加载
  - 已删除多余的说明文本

- `src/pages/PracticePage.tsx`
  - 刷题页面按全局顺序随机打乱题号，并按题号加载对应分块
  - 已删除多余的说明文本

- `src/components/Layout.tsx`
  - 页脚 footer 已改为简洁版权说明

## 新增题库操作步骤
1. 在 `public/questions/chunks/` 下创建一个日期命名的新文件：
   - `YYYY-MM-DD.json`
   - 包含 5 道题目，`questions` 数组中的每个对象都应带 `id`, `date`, `title`, `prompt`, `answer`

2. 将新分块追加到 `public/questions/meta.json`：
   - `chunkCount` +1
   - `totalQuestions` +5
   - `latestDate` 更新为新文件日期
   - 在 `chunks` 数组开头插入新分块描述，保持最新日期排在最前面
   - 更新每个 `chunks` 项的 `cumulativeStart`，按顺序从 0 开始累加

3. 确认当前日期分块文件名格式与 `meta.json` 一致。

4. 运行构建验证：
   - `npm run build`

## 自动生成每日题库

- 运行脚本：`npm run gen:daily`
- 如果使用 OpenAI，设置 `OPENAI_API_KEY`
- 如果改用 Deepseek，设置：`QUESTION_API_PROVIDER=deepseek` 和 `DEEPSEEK_API_KEY`
  - 默认 `DEEPSEEK_API_BASE=https://api.deepseek.com/anthropic`
  - 可选 `DEEPSEEK_API_URL` 覆盖完整请求 URL
  - 默认 `QUESTION_MODEL=deepseek-v4-pro`
- 答案要求：清晰分段、段落分明、格式美观
- 可选参数：`QUESTION_DATE=YYYY-MM-DD` 用于生成指定日期题目
- 脚本会自动写入 `public/questions/chunks/YYYY-MM-DD.json`，并更新 `public/questions/meta.json`
- 生成完成后会自动提交并推送到 `main`

## 已有报告与脚本

- `scripts/`：包含生成与修复题库数据的脚本。

## 提交与发布
1. 暂存更改

```bash
git add -A
```

2. 提交更改

```bash
git commit -m "chore: update question bank and operation docs"
```

3. 推送到远程仓库

```bash
git push origin main
```

> 如果仓库已经配置 GitHub Pages，推送后即可触发自动发布。

## 备注
- 不要修改页面组件中的默认展示逻辑。
- 只在 `public/questions/` 下新增题库数据，并同步更新 `meta.json`。
- 如果新增题目时需要遵循特定标签或答案格式，请保持与现有题目结构一致。
