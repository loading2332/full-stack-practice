# 第 4 章：对接 YouTube Data API 与 Analytics API

这一章严格对应原 A.D.A.M. 小册的第 4 章，但业务域从广告数据改成了 YouTube 频道数据。

原版第 4 章解决的是：

> 如何把外部平台的业务数据稳定接入到后端系统中。

YouTube 版这一章解决的仍然是这个问题，只不过数据源从广告平台换成了 YouTube。

但要注意，这一章不是孤立存在的。它服务的是整条业务主线：

- 第 5 章的诊断引擎
- 第 6 章的 Pipeline 编排
- 第 6 章的飞书推送
- 第 8 章和第 13 章的 Tool 体系
- 第 11 章的数据页面
- 第 9、10 章的 Chat + SSE 渲染

所以本章的目标，不只是“把数据查出来”，而是为后续完整闭环打基础。

你学完这一章后，应该能做到：

- 用户连接自己的 YouTube 频道
- 后端获取频道主信息
- 后端获取上传视频列表与视频详情
- 后端获取频道级和视频级分析指标
- 后端产出统一的数据结构，供诊断、报告、Pipeline、飞书和 Agent 复用

---

## 4.1 YouTube API 基础

### 4.1.1 为什么 YouTube 不是一个 API

第一次接触 YouTube 官方接口时，最容易误解的一点，就是把它当成一个单一 API。

对这个项目真正有用的其实是两套能力：

- `YouTube Data API v3`
- `YouTube Analytics API`

它们解决的问题不同，分别对应“资源层”和“指标层”。

### 4.1.2 YouTube Data API：资源层

`YouTube Data API v3` 负责资源本身，也就是频道、视频、播放列表这些对象的元数据。

它适合用来获取：

- 当前授权用户拥有的频道
- 频道基础信息
- uploads playlist
- 最近上传的视频列表
- 视频标题、描述、发布时间、封面、标签、时长
- 公开视频统计，例如 `viewCount`、`likeCount`、`commentCount`

它回答的问题是：

> 这个频道有什么内容？

### 4.1.3 YouTube Analytics API：指标层

`YouTube Analytics API` 负责分析指标，也就是更适合做趋势分析、诊断和报告的数据。

它适合用来获取：

- 近 28 天频道播放趋势
- 观看时长
- 平均观看时长
- 平均观看占比
- 点赞、评论、分享
- 订阅增长与流失
- 按视频维度聚合的表现
- 按国家、流量来源、设备等维度拆分的表现

它回答的问题是：

> 这些内容最近表现得怎么样？

### 4.1.4 为什么两个 API 都要用

只用 `Data API` 不够，因为它更偏资源清单，难以支撑后面的诊断、趋势页和报告。

只用 `Analytics API` 也不够，因为它不会替你维护频道、视频和播放列表这些实体对象。

所以本项目的数据接入层必须是组合式的：

- `Data API` 负责资源
- `Analytics API` 负责指标
- `PostgreSQL` 负责持久化
- `Service` 层负责统一封装

而这些标准化结果，会继续流向：

- `Diagnosis` 诊断引擎
- `Reports` 报告系统
- `Pipeline` 编排与定时任务
- `Feishu` 消息卡片
- `Agent Tool`

### 4.1.5 OAuth 2.0 认证

在这个项目里，我们采用两步式授权：

- 第一步：用户登录应用
- 第二步：用户单独点击“连接 YouTube 频道”

这样做有几个直接好处：

- 应用身份和业务授权解耦
- 后续更容易处理 token 失效和重新授权
- YouTube 连接状态能被单独管理
- 更适合后面的 Pipeline 和定时同步

第一阶段建议只申请这两个 scope：

```txt
https://www.googleapis.com/auth/youtube.readonly
https://www.googleapis.com/auth/yt-analytics.readonly
```

它们分别用于：

- 读取频道和视频资源
- 读取 YouTube 分析指标

### 4.1.6 YouTube 的业务层级结构

YouTube 版虽然没有广告账户树形结构，但仍然有自己的业务层级：

```text
应用用户
  -> YouTube 授权连接
    -> YouTube 频道
      -> uploads playlist
        -> 视频列表
          -> 视频指标 / 频道指标
```

后面整个系统都会围绕这条链路展开：

- 第 4 章：接数据
- 第 5 章：解释数据
- 第 6 章：同步和推送数据
- 第 8 章：把数据暴露给 Tool

---

## 4.2 YouTube Analytics Query Model：YouTube 没有 GAQL

这一节对应原版的：

> 4.2 GAQL：统一查询语言

YouTube 版必须先接受一个事实：

> YouTube 没有 GAQL 这种统一查询语言。

你不能用一条 DSL 把所有业务查询写出来，但不代表它没有查询模型。

### 4.2.1 Data API 的查询模型：资源式查询

`YouTube Data API` 走的是资源式查询。

常用方法有：

- `channels.list`
- `playlistItems.list`
- `videos.list`

这类接口的特点是：

- 以资源对象为中心
- 通过 `part` 指定返回字段
- 通过 `mine`、`playlistId`、`id` 等参数定位对象

例如：

- `channels.list(mine=true)` 获取当前授权用户的频道
- `playlistItems.list(playlistId=uploadsPlaylistId)` 获取上传视频清单
- `videos.list(id=videoIds)` 批量补全视频详情

### 4.2.2 Analytics API 的查询模型：报表参数组合

`YouTube Analytics API` 的核心接口是 `reports.query`。

它不是 DSL，而是一组结构化参数：

- `ids`
- `startDate`
- `endDate`
- `metrics`
- `dimensions`
- `filters`
- `sort`

例如一个频道日趋势查询，可以表达为：

```txt
ids=channel==MINE
startDate=2026-03-01
endDate=2026-03-28
dimensions=day
metrics=views,estimatedMinutesWatched,averageViewDuration,likes,comments,shares,subscribersGained,subscribersLost
sort=day
```

所以在 YouTube 版里，后端的职责会变成：

- 把业务问题翻译成报表参数
- 把返回结果标准化
- 把结果沉淀到自己的数据库

### 4.2.3 第 4 章建议实现的最小查询集合

为了控制这一章的复杂度，建议只实现 4 类查询。

#### 1. 当前频道主信息

接口：

- `channels.list`

用途：

- 初始化频道主档案
- 给 Dashboard 顶部概览用
- 给 Pipeline 和报告生成提供基础上下文

#### 2. 最近上传视频列表

接口：

- `playlistItems.list`
- `videos.list`

用途：

- 初始化视频主档案
- 给视频列表页、报告页和 Tool 查询用

#### 3. 频道级日趋势

接口：

- `reports.query`

用途：

- 作为第 5 章诊断规则输入
- 作为 Dashboard 趋势图输入
- 作为报告摘要输入
- 作为飞书卡片摘要输入

#### 4. 视频级表现排行

接口：

- `reports.query`

用途：

- 作为视频表现列表输入
- 作为 Agent 的“最近哪些视频表现最好”类问题输入
- 作为后续优化建议的输入

---

## 4.3 YouTubeService 架构

这一节严格对应原版的：

> 4.3 GoogleAdsService 架构

这里要解决的问题是：

> 如何把外部 API 封装成项目内部可复用的服务层？

### 4.3.1 不要把所有逻辑塞进一个 YouTubeService

如果把 OAuth、频道查询、视频查询、Analytics 查询、Token 刷新、同步装配全部塞进一个类里，这一章可能还能勉强跑通，但到后面第 6 章 Pipeline、第 8 章 Tool、第 11 章页面、第 12 章认证时，代码会很快失控。

所以这里应该一开始就按边界拆开。

### 4.3.2 推荐的模块拆分

建议目录结构如下：

```text
backend/src/youtube/
  youtube.module.ts
  youtube.constants.ts
  youtube.types.ts
  youtube.controller.ts

  auth/
    youtube-oauth.service.ts

  data/
    youtube-data.service.ts

  analytics/
    youtube-analytics.service.ts

  sync/
    youtube-sync.service.ts

  feishu/
    youtube-feishu.service.ts
```

如果你后面要接数据库实体，也可以补：

```text
  entities/
    youtube-connection.entity.ts
    youtube-channel.entity.ts
    youtube-video.entity.ts
    youtube-metric-snapshot.entity.ts
```

### 4.3.3 `YouTubeOAuthService`

职责：

- 生成授权 URL
- 用 `code` 换 token
- 负责 refresh token
- 创建授权客户端

注意它只负责认证相关能力，不负责业务查询。

### 4.3.4 `YouTubeDataService`

职责：

- 获取当前授权用户的频道
- 获取 uploads playlist
- 获取视频列表和详情
- 把资源层数据标准化

### 4.3.5 `YouTubeAnalyticsService`

职责：

- 封装 `reports.query`
- 提供频道趋势查询
- 提供视频排行查询
- 后续扩展流量来源、国家、设备等维度查询

它是 YouTube 版最接近“统一查询封装层”的地方。

### 4.3.6 `YouTubeSyncService`

职责：

- 组合 DataService 和 AnalyticsService
- 生成一次完整的“同步结果”
- 后续扩展为正式的 Pipeline 步骤
- 为报告、页面和 Tool 提供统一输入

第 4 章先把它做成同步装配服务，第 6 章再把它扩成正式的 PipelineService。

### 4.3.7 `YouTubeFeishuService`

这一层第 4 章不要求完整实现，但必须预留。

原因是原项目不是只有“页面查看”和“Agent 查询”，还有明确的“外部消费出口”。

对于 YouTube 版来说，飞书服务后续至少要支持：

- 渠道诊断摘要卡片
- 最新报告摘要
- 今日/本周异常提醒
- Pipeline 成功或失败通知

所以第 4 章的数据结构，在设计时就要考虑飞书卡片可消费性。

### 4.3.8 Controller 只负责入口，不负责装配

例如可以暴露：

- `GET /youtube/connect`
- `GET /youtube/callback`
- `GET /youtube/me`
- `POST /youtube/sync/bootstrap`

Controller 只负责：

- 接收请求
- 调用服务
- 返回结果

不要把装配逻辑写在 Controller 里。

---

## 4.4 4 类并行查询的设计

原版这一节是：

> 4.4 13 个并行查询的设计

YouTube 第一版不需要一开始就堆到 13 个查询，但它仍然需要保留原版的工程思想：

> 一次同步不是一个接口，而是一组有依赖关系的查询。

### 4.4.1 查询一：频道主信息

接口：

- `channels.list(mine=true, part=snippet,contentDetails,statistics)`

关键字段：

- `channel.id`
- `snippet.title`
- `snippet.description`
- `snippet.customUrl`
- `snippet.thumbnails`
- `contentDetails.relatedPlaylists.uploads`
- `statistics.subscriberCount`
- `statistics.videoCount`
- `statistics.viewCount`

这个查询的产出，是系统里的频道主档案。

### 4.4.2 查询二：上传视频列表

第一步：

- `playlistItems.list(playlistId=uploadsPlaylistId)`

拿到：

- `videoId`
- `publishedAt`
- `title`
- `position`

第二步：

- `videos.list(id=videoIds)`

补全：

- `description`
- `tags`
- `duration`
- `privacyStatus`
- `statistics.viewCount`
- `statistics.likeCount`
- `statistics.commentCount`

这本质上是“一个逻辑查询拆成两段 API 调用”。

### 4.4.3 查询三：频道级分析指标

这是最重要的一类 Analytics 查询。

建议第 4 章先做近 28 天、按天聚合。

推荐参数：

```txt
ids=channel==MINE
dimensions=day
metrics=views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,likes,comments,shares,subscribersGained,subscribersLost
sort=day
```

这类查询会被多个模块共享：

- Dashboard 趋势图
- 诊断规则引擎
- 报告系统
- 飞书摘要卡片
- Agent Tool

### 4.4.4 查询四：视频级表现排行

建议第一版参数：

```txt
ids=channel==MINE
dimensions=video
metrics=views,estimatedMinutesWatched,averageViewDuration
sort=-views
```

这类查询的产出后续可以用于：

- 视频表现页
- 报告中的 Top 内容板块
- Agent 的趋势分析与优化建议

### 4.4.5 并行查询的真正含义

“并行”不是所有请求一起发，而是：

- 能独立发的请求并行发
- 有依赖关系的请求串行发

例如：

- `channels.list` 必须先跑，因为要先拿到 `uploadsPlaylistId`
- `playlistItems.list` 和频道级 Analytics 可以在频道主信息拿到后并行
- `videos.list` 要等视频 ID 拿到后再发

这和第 6 章的 Pipeline 思维是同源的。

---

## 4.7 数据类型定义

这一节对应原版的：

> 4.7 数据类型定义

这里的原则非常明确：

> 不要把 YouTube API 的原始结构直接扩散到整个项目。

因为这些数据不是只给一个页面看的，而是要被多个模块复用：

- 页面
- 诊断规则
- 报告
- Pipeline
- 飞书卡片
- Agent Tool

### 4.7.1 频道类型

```ts
export type YouTubeChannelProfile = {
  channelId: string;
  title: string;
  description: string | null;
  customUrl: string | null;
  uploadsPlaylistId: string;
  thumbnailUrl: string | null;
  subscriberCount: number | null;
  videoCount: number | null;
  viewCount: number | null;
};
```

### 4.7.2 视频类型

```ts
export type YouTubeVideoSummary = {
  videoId: string;
  channelId: string;
  title: string;
  description: string | null;
  publishedAt: string;
  durationSeconds: number | null;
  tags: string[];
  privacyStatus: string | null;
  thumbnailUrl: string | null;
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
};
```

### 4.7.3 分析指标类型

```ts
export type YouTubeMetricSnapshot = {
  channelId: string;
  scope: 'channel' | 'video';
  targetId: string;
  date: string;
  views: number | null;
  estimatedMinutesWatched: number | null;
  averageViewDuration: number | null;
  averageViewPercentage: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  subscribersGained: number | null;
  subscribersLost: number | null;
};
```

### 4.7.4 查询参数类型

```ts
export type QueryAnalyticsInput = {
  ids: string;
  startDate: string;
  endDate: string;
  metrics: string[];
  dimensions?: string[];
  filters?: string[];
  sort?: string[];
};
```

### 4.7.5 首次同步返回结构

```ts
export type BootstrapSyncResult = {
  channel: YouTubeChannelProfile;
  videos: YouTubeVideoSummary[];
  channelDailyMetrics: YouTubeMetricSnapshot[];
};
```

这一步的意义是：

- 先把外部接口打通
- 再把结果装配成平台内部标准结构
- 为后面报告、飞书和 Tool 复用留稳定接口

---

## 4.8 本章小结

这一章结束时，你应该完成以下能力建设：

### 1. 理清 API 边界

- `YouTube Data API` 管资源
- `YouTube Analytics API` 管指标

### 2. 建立 OAuth 基础设施

- 用户能授权自己的频道
- 后端能保存 token
- 后端能创建可复用的授权客户端

### 3. 建立服务层边界

- `YouTubeOAuthService`
- `YouTubeDataService`
- `YouTubeAnalyticsService`
- `YouTubeSyncService`
- `YouTubeFeishuService` 的预留入口

### 4. 跑通最小查询集合

- 当前频道主信息
- 最近上传视频列表
- 频道级日趋势
- 视频级表现排行

### 5. 完成数据标准化

- 不把 YouTube 原始响应直接扩散到项目全局
- 提前定义平台自己的统一类型

### 6. 为后续闭环打基础

这一章完成后，数据就不再只是“查出来看一下”，而是已经具备进入后续主流程的条件：

- 第 5 章：做诊断规则
- 第 6 章：做同步、报告和飞书推送
- 第 8 章：做 Tool 封装
- 第 11 章：做页面展示
- 第 9、10 章：做 Chat + SSE 渲染

也就是说：

> 第 4 章解决“把数据拿进来”，后面的章节解决“如何解释、分发、展示和消费这些数据”。
