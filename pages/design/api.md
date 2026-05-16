# 接口设计

跨端内部通讯统一使用 **protobuf over libp2p**。节点间控制、启动器与服务器协同、管理终端操作、事件订阅和通知后的状态拉取，都复用 `docs/proto` 中定义的消息，不定义其他业务协议。

## 协议边界

除只读 HTTP 状态接口外，任何控制、管理、查询、订阅和状态同步都必须走 protobuf over libp2p；若调用方无法建立 libp2p 连接，应快速失败并给出有效反馈，不得切换到旁路协议。

## HTTP 状态接口

HTTP 只保留一个只读状态接口，供监视网页展示节点运行状态使用。该接口不得承载控制、管理、授权、查询列表、事件订阅或状态同步语义。

| 方法 | 路径 | 用途 |
| ---- | ---- | ---- |
| GET | `/status` | 返回节点在线状态、PeerID、版本、实例数量、共识角色和最近告警摘要 |

除 `/status` 外，federated-server 不应暴露其他 HTTP 端点。所有原 HTTP 控制面、管理面、业务查询、metrics / health / readiness 端点都应移除或迁移到 protobuf over libp2p / 日志采集链路。

## libp2p 协议定义（Protobuf）

### 服务发现

| 方法 | 功能 |
| ---- | ---- |
| ListInstances | 按筛选条件查询实例列表 |
| WatchInstances | 订阅实例状态变更事件流 |

### 实例管理

| 方法 | 权限 | 功能 |
| ---- | ---- | ---- |
| CreateRoom | 任意玩家 | 创建临时房间实例（需提供 `name`） |
| CreateService | admin only | 创建持久服务实例（需提供 `name`） |
| MigrateInstance | admin only | 迁移实例到其他主机 |
| DestroyInstance | 实例创建者 | 销毁实例 |

### 治理

| 方法 | 权限 | 功能 |
| ---- | ---- | ---- |
| CreateProposal | president only | 创建治理提案 |
| SignProposal | president only | 对提案追加签名 |
| ListProposals | 任意节点 | 查询提案列表 |
| SubmitMemberVote | member only | 普通成员对成员范围内议题投票 |
| SubmitGovernanceFeedback | member only | 普通成员提交治理反馈或申请材料 |
| IssueCredential | admin only | 签发 W3C VC 凭证 |
| RevokeCredential | admin only | 吊销 VC 凭证 |

### 预言机

| 方法 | 功能 |
| ---- | ---- |
| ReportMetrics | 预言机节点提交日度指标 |
| QueryScore | 查询玩家积分及 Merkle 证明 |

### 联赛

| 方法 | 权限 | 功能 |
| ---- | ---- | ---- |
| CreateTournament | admin only | 创建新赛事 |
| RegisterForTournament | 任意玩家 | 报名参赛 |
| SubmitMatchResult | oracle verified | 提交比赛结果 |
| GetLeaderboard | 任意玩家 | 获取赛季排行榜 |

## 启动器内部 API

启动器进程内部使用 Tauri IPC：前端通过 `invoke()` 调用 Rust Core，Rust Core 再通过 protobuf over libp2p 与 `federated-server` 协同；游戏数据面通过本地代理接入 libp2p stream。不使用 HTTP 控制面或 gRPC。

| 方法 | 功能 |
| ---- | ---- |
| get_identity | 获取本地身份 (PeerID + ed25519 密钥对) |
| list_instances | 按筛选条件查询实例列表(含延迟和在线人数) |
| resolve_instance | 加入实例，返回本地代理端口(MC 连接 localhost:port)。实例以 `name` 展示，以 `id` 寻址 |
| create_quick_room | 快速创建房间，返回实例 ID（`name` 可后续修改） |
| invite_players | 邀请其他玩家加入房间 |

## 管理终端 API

| 方法 | 类别 | 功能 |
| ---- | ---- | ---- |
| GetClusterHealth | 监控 | 查询集群健康状态(节点、实例、告警) |
| SubscribeAlerts | 监控 | 订阅实时告警流 |
| ExecuteCommand | 操作 | 发起管理命令，创建 AuthChallenge；需要提醒离线设备时发送 UnifiedPush 通知 |
| RespondChallenge | 操作 | 提交 TEE 签名响应 Challenge，执行命令 |
| ListMembers | 成员管理 | 按社团筛选成员列表(含角色和 VC 状态) |
| GrantRole | 成员管理 | 授予角色并签发 VC |
| QueryAuditLog | 审计 | 按筛选条件查询审计日志 |
| CreateTournament | 联赛管理 | 创建新赛事 |
| ManageTournament | 联赛管理 | 管理赛事状态(开始/暂停/结束) |
| DisputeMatch | 联赛管理 | 对比赛结果提出争议 |

## 事件流

事件通过 `SubscribeEvents` 建立 protobuf over libp2p stream。`EventEnvelope.topic` 只是订阅过滤标签，不是 PubSub 频道；客户端收到事件后按需调用 `List*` / `Get*` / `Query*` 方法拉取权威状态。

| topic 过滤 | 主题 | 订阅者 |
|------|------|--------|
| `instance.{id}` | 实例状态变更 | 该实例的在线玩家 |
| `cluster` | 节点上线 / 离线 / 告警 | 所有管理员 |
| `governance` | 新提案 / 签名 / 执行 / 成员投票事项 | 社长、管理员、相关 VC 成员 |
| `tournament.{id}` | 比赛开始 / 结果 / 争议 | 参赛者 |

::: tip 频道命名约定
- 层级结构 `<domain>.<id?>`，便于按域和对象过滤。
- `{id}` 占位允许只订阅特定实例/比赛，避免噪声。
:::

::: warning 通知边界
UnifiedPush 发送的是用于系统通知展示和拉起应用的提示。payload 可以包含标题、正文和业务摘要，但通知不可靠，不作为权威来源；完整 AuthChallenge、告警、提案或赛事状态必须在应用打开后通过 protobuf over libp2p 拉取并校验。
:::
