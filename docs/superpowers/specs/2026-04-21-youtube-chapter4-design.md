# YouTube Chapter 4 Design

## Goal

在当前 NestJS 后端中实现第 4 章最小可运行版本，完成 YouTube OAuth 接入、资源查询、分析指标查询、首次同步装配和飞书占位服务，为后续诊断、报告、Pipeline、Agent Tool 提供统一输入。

## Scope

本次只覆盖原第 4 章对应的能力：

- Google OAuth 授权 URL 生成
- OAuth callback 中的 code 换 token
- 当前授权用户 YouTube 频道查询
- uploads playlist 查询
- 视频详情查询
- YouTube Analytics 频道日趋势查询
- 首次同步结果装配
- 飞书服务占位
- NestJS 模块接线

明确不包含：

- 正式应用登录体系
- token 入库与 refresh token 持久化
- 诊断引擎
- 正式 Pipeline
- 飞书 webhook 真发送
- 前端页面改造
- Agent Tool 接入

## Existing Project Constraints

当前后端现状：

- `backend/src/app.module.ts` 引用了多个不存在的模块，无法直接编译
- `backend/src/youtube/` 只有一个空的 `youtube.module.ts`
- `googleapis`、`passport`、`passport-google-oauth20` 已安装
- `reports/` 模块存在，但服务方法不完整

所以本次设计优先级是：

1. 先让第 4 章主链路变成可编译、可测试的最小模块
2. 再逐步补齐第 4 章服务层

## Architecture

第 4 章实现采用 5 层结构：

1. `YouTubeOAuthService`

- 负责 OAuth URL 生成、code 换 token、授权客户端创建

2. `YouTubeDataService`

- 负责频道、playlist、视频详情查询

3. `YouTubeAnalyticsService`

- 负责 `reports.query` 封装和频道日趋势查询

4. `YouTubeSyncService`

- 组合 OAuth、Data、Analytics，输出统一同步结果

5. `YouTubeFeishuService`

- 仅提供占位接口，保留未来第 6 章扩展点

控制器只暴露最小入口：

- `GET /youtube/connect`
- `GET /youtube/callback`

## File Structure

本次会新增或修改这些文件：

### Create

- `backend/src/youtube/youtube.constants.ts`
- `backend/src/youtube/youtube.types.ts`
- `backend/src/youtube/youtube.controller.ts`
- `backend/src/youtube/auth/youtube-oauth.service.ts`
- `backend/src/youtube/data/youtube-data.service.ts`
- `backend/src/youtube/analytics/youtube-analytics.service.ts`
- `backend/src/youtube/sync/youtube-sync.service.ts`
- `backend/src/youtube/feishu/youtube-feishu.service.ts`
- `backend/src/youtube/youtube.controller.spec.ts`
- `backend/src/youtube/sync/youtube-sync.service.spec.ts`

### Modify

- `backend/src/youtube/youtube.module.ts`
- `backend/src/app.module.ts`

## Data Contracts

这一章定义平台内部标准类型：

- `YouTubeChannelProfile`
- `YouTubeVideoSummary`
- `YouTubeMetricSnapshot`
- `QueryAnalyticsInput`
- `BootstrapSyncResult`

设计原则：

- 只保留后续页面、诊断、报告、Pipeline、飞书和 Agent 要长期消费的字段
- 不直接把 `googleapis` 原始响应结构扩散到项目全局

## Error Handling

第 4 章阶段采用最小错误处理策略：

- `YouTubeDataService.getMyChannel()` 未找到频道时抛 `NotFoundException`
- OAuth 缺少 `code` 或外部请求失败时，直接让异常上抛
- 飞书占位服务只记录消息，不吞掉异常

不在本次实现中引入复杂重试、降级和统一异常过滤器。

## Testing Strategy

本次只写最小单元测试，覆盖第 4 章核心行为：

1. `YouTubeController`

- `connect()` 返回重定向 URL
- `callback()` 调用 OAuth 和 Sync 并返回统一结果

2. `YouTubeSyncService`

- 能正确装配 OAuth、Data、Analytics 的结果

不写真实外部 API 集成测试。

## Risks

1. `googleapis` 类型层较重

- 解决方式：第 4 章先只封装少量接口和少量字段

2. 当前 `app.module.ts` 无法编译

- 解决方式：先收敛成最小可运行版本

3. 后续第 6 章会引入 token 持久化和异步同步

- 解决方式：本次同步结果结构和服务边界提前留好扩展点

## Acceptance Criteria

完成后应满足：

- `/youtube/connect` 能返回授权 URL
- `/youtube/callback?code=...` 的控制器逻辑可通过单元测试
- `YouTubeSyncService.bootstrapSync()` 可通过单元测试
- `AppModule` 不再引用不存在的模块
- 第 4 章代码结构已为后续诊断、报告、Pipeline、飞书和 Agent 预留清晰边界
