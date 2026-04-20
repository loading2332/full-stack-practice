> 一个面向创作者的 YouTube 数据分析 agent，提供频道连接、数据同步、飞书推送和 AI 问答能力。

## 技术栈

- `frontend`: Next.js 16、React 19、Tailwind CSS 4
- `backend`: NestJS 11
- `database`: PostgreSQL + MikroORM
- `workspace`: pnpm workspace

## 功能方向

当前项目围绕以下能力建设：

- Google OAuth 登录
- YouTube 频道连接
- 频道与视频数据同步
- 诊断报告生成
- AI Chat 与 Tool 调用分析
- 飞书推送

## 目录结构

```text
.
├─ backend/      后端服务、数据层、Agent 与报告相关逻辑
├─ frontend/     前端应用
└─ package.json  工作区脚本
```

## 启动方式

安装依赖：

```bash
pnpm install
```

启动前后端开发环境：

```bash
pnpm dev
```

单独启动后端：

```bash
pnpm dev:backend
```

单独启动前端：

```bash
pnpm dev:frontend
```
