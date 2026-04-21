> 一个以 Pull Request / Diff 为主、兼顾仓库健康扫描的 GitHub 代码 Agent。

后端当前能力包括：

- GitHub 仓库与 PR 快照获取
- Repo / Pull Request 双分析引擎
- PostgreSQL 报告持久化
- Pipeline 编排与飞书推送
- LangChain Agent + Tool 调用

## 技术栈

- `frontend`: Next.js 16、React 19、Tailwind CSS 4
- `backend`: NestJS 11
- `database`: PostgreSQL + MikroORM
- `agent`: LangChain + OpenAI-compatible chat model
- `workspace`: pnpm workspace

## 后端主线

当前后端按下面这条主线工作：

```text
GitHub Repo / PR Snapshot
  -> Analysis Engine
  -> RepoReport / PullRequestReport
  -> Pipeline / Feishu
  -> Agent Tools / Chat
```

核心模块：

- `backend/src/github-sync/`: GitHub repo / PR 快照获取
- `backend/src/analysis/`: Repo / PR 规则分析
- `backend/src/reports/`: `RepoReport` 与 `PullRequestReport`
- `backend/src/pipeline/`: 编排 repo / PR 分析流程
- `backend/src/agent/`: LangChain Agent、tool 注册和聊天流式接口

## 本地启动

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动 PostgreSQL

如果你本地没有数据库，最简单的方式是用 Docker：

```bash
docker run --name adam-postgres \
  -e POSTGRES_DB=adam_app \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgres:16
```

### 3. 准备环境变量

```bash
cp backend/.env.example backend/.env
```

当前第一版最重要的环境变量：

- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`（可选，兼容 OpenAI API 的模型服务都可）
- `MODEL_NAME`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `GITHUB_TRACKED_REPOSITORIES`
- `MOCK_MODE`

### 4. 执行数据库迁移

```bash
pnpm --filter ./backend run db:up
```

### 5. 启动后端

```bash
pnpm dev:backend
```

启动整个 workspace：

```bash
pnpm dev
```

## 常用命令

- `pnpm dev`: 同时启动前后端
- `pnpm dev:backend`: 启动后端
- `pnpm dev:frontend`: 启动前端
- `pnpm build`: 构建 workspace
- `pnpm lint`: 运行 ESLint
- `pnpm --filter ./backend test`: 运行后端单测
- `pnpm --filter ./backend exec jest --runInBand`: 串行运行全部后端测试
- `pnpm --filter ./backend run db:generate`: 生成 MikroORM migration
- `pnpm --filter ./backend run db:up`: 执行 migration

## API 示例

### 1. 触发 tracked repositories 扫描

不传 body 时，后端会读取 `GITHUB_TRACKED_REPOSITORIES` 并批量跑 repo pipeline。

```bash
curl -X POST http://localhost:3001/pipeline/run
```

### 2. 手动触发单个仓库分析

```bash
curl -X POST http://localhost:3001/pipeline/run \
  -H "Content-Type: application/json" \
  -d '{
    "scope": "repo",
    "owner": "openai",
    "repo": "openai-node",
    "branch": "main",
    "reason": "manual repo scan"
  }'
```

### 3. 手动触发单个 PR 分析

```bash
curl -X POST http://localhost:3001/pipeline/run \
  -H "Content-Type: application/json" \
  -d '{
    "scope": "pull_request",
    "owner": "openai",
    "repo": "openai-node",
    "prNumber": 123,
    "reason": "manual pr review"
  }'
```

### 4. 查询最新 repo 报告

```bash
curl "http://localhost:3001/reports/latest?scope=repo"
```

### 5. 查询最新 PR 报告

```bash
curl "http://localhost:3001/reports/latest?scope=pull_request"
```

### 6. 查询指定日期的 PR 报告

```bash
curl "http://localhost:3001/reports/by-date?scope=pull_request&owner=openai&repo=openai-node&prNumber=123&date=2026-04-21"
```

### 7. Agent 聊天流接口

后端聊天入口是：

```text
POST /chat/stream
```

请求体最小示例：

```json
{
  "messages": [
    {
      "id": "msg-1",
      "role": "user",
      "parts": [
        {
          "type": "text",
          "text": "帮我分析 openai/openai-node 的 PR #123 风险"
        }
      ]
    }
  ]
}
```

这是一个流式接口，适合前端用 Vercel AI SDK 的 `useChat()` 一类能力对接。

## 当前数据库表

后端当前核心表为：

- `repo_report`
- `pull_request_report`
- `mikro_orm_migrations`

## 下一步方向

1. 将 `github-sync` 从 mock 数据切到真实 GitHub API
2. 扩充 repo / PR 分析规则
3. 补充前端部分
