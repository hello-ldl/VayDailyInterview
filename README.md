# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

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

### 每日题库自动生成脚本

项目增加了一个自动生成当天题库并推送到 Git 的脚本：

```bash
npm run gen:daily
```

脚本默认使用今天日期生成 5 道 Java 技术面试题，并自动更新 `public/questions/meta.json`。

需要配置环境变量：

```bash
export OPENAI_API_KEY=your_api_key_here
```

如果需要改用 Deepseek，请设置：

```bash
export QUESTION_API_PROVIDER=deepseek
export DEEPSEEK_API_KEY=your_deepseek_api_key
```

Deepseek 默认使用：
- 基础地址 `https://api.deepseek.com/anthropic`
- API 模型 `deepseek-v4-pro`
- 生成答案要求：清晰分段、段落分明、格式美观

如果要指定某个日期，可以这样运行：

```bash
QUESTION_DATE=2026-05-21 npm run gen:daily
```

在 Mac 或 Linux 上，可以用 cron 定时执行：

```bash
0 3 * * * cd /Users/lidonglin/cursor/VayDailyInterview && OPENAI_API_KEY=your_api_key_here npm run gen:daily
```

### 题库数据结构

题库数据位于 `public/questions/`，按照日期分块存储。

- `public/questions/meta.json`
  - `version`: 数据版本
  - `chunkSize`: 每个分块题量
  - `totalQuestions`: 全量题目数
  - `chunkCount`: 分块总数
  - `latestDate`: 最新题目日期，格式 `YYYY-MM-DD`
  - `chunks`: 题库分块列表，按最新日期排序

- `public/questions/chunks/YYYY-MM-DD.json`
  - 包含 `questions` 数组
  - 每题对象字段：
    - `id`
    - `date`
    - `title`
    - `prompt`
    - `answer`
    - `tags?`

### 新增每日题库

新增题库时请按以下步骤操作：

1. 在 `public/questions/chunks/` 下新增 `YYYY-MM-DD.json` 文件。
2. 每个文件包含 5 道题目，`questions` 数组中的每个对象都要包含 `id`, `date`, `title`, `prompt`, `answer`。
3. 将新分块插入 `public/questions/meta.json` 的 `chunks` 数组开头，保持最新日期在前。
4. 更新 `meta.json` 中的 `chunkCount`、`totalQuestions` 和 `latestDate`。
5. 根据 `chunks` 顺序重新计算每一项的 `cumulativeStart`，从 `0` 开始累加。

### 已有报告与脚本

- `public/questions/answer-lengths-by-date.md`：按日期列出每题答案长度的表格。
- `public/questions/answer-lengths-summary-by-date.md`：按日期汇总题目数量、最小/最大/平均答案长度。
- `public/questions/answer-lengths.json`：所有题目答案长度统计数据。
- `scripts/`：包含生成与修复题库数据的脚本。

### 提交与发布

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
> 本项目已配置自定义域名 `interview.vaydaily.top`，部署时会自动生成 `CNAME` 文件。