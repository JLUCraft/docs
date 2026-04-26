# 接口设计

对外接口分四组:**libp2p 协议(节点间)**、**启动器内部 API**、**管理终端 API**、**事件总线**。

## libp2p 协议定义 (Protobuf)

### 服务发现

| 方法 | 功能 |
| ---- | ---- |
| ListInstances | 按筛选条件查询实例列表 |
| WatchInstances | 订阅实例状态变更事件流 |

### 实例管理

| 方法 | 权限 | 功能 |
| ---- | ---- | ---- |
| CreateRoom | 任意玩家 | 创建临时房间实例 |
| CreateService | admin only | 创建持久服务实例 |
| MigrateInstance | admin only | 迁移实例到其他主机 |
| DestroyInstance | 实例创建者 | 销毁实例 |

### 治理

| 方法 | 权限 | 功能 |
| ---- | ---- | ---- |
| CreateProposal | president only | 创建治理提案 |
| SignProposal | president only | 对提案追加签名 |
| ListProposals | 任意节点 | 查询提案列表 |
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

启动器进程内部用本地 gRPC,UI 与 Core Engine 解耦:

| 方法 | 功能 |
| ---- | ---- |
| Login | 登录获取本地身份 |
| CreateIdentity | 生成 PeerID + ed25519 密钥对 |
| ListAvailableInstances | 按筛选条件查询实例列表(含延迟和在线人数) |
| JoinInstance | 加入实例,返回本地代理端口(MC 连接 localhost:port) |
| CreateQuickRoom | 快速创建房间,返回实例 ID |
| InvitePlayers | 邀请其他玩家加入房间 |

## 管理终端 API

| 方法 | 类别 | 功能 |
| ---- | ---- | ---- |
| GetClusterHealth | 监控 | 查询集群健康状态(节点、实例、告警) |
| SubscribeAlerts | 监控 | 订阅实时告警流 |
| ExecuteCommand | 操作 | 发起管理命令,返回推送授权 Challenge |
| RespondChallenge | 操作 | 提交 TEE 签名响应 Challenge,执行命令 |
| ListMembers | 成员管理 | 按社团筛选成员列表(含角色和 VC 状态) |
| GrantRole | 成员管理 | 授予角色并签发 VC |
| QueryAuditLog | 审计 | 按筛选条件查询审计日志 |
| CreateTournament | 联赛管理 | 创建新赛事 |
| ManageTournament | 联赛管理 | 管理赛事状态(开始/暂停/结束) |
| DisputeMatch | 联赛管理 | 对比赛结果提出争议 |

## 事件总线 (PubSub 频道)

| 频道 | 主题 | 订阅者 |
|------|------|--------|
| `mc.events.instance.{id}` | 实例状态变更 | 该实例的在线玩家 |
| `mc.events.cluster` | 节点上线 / 离线 / 告警 | 所有管理员 |
| `mc.events.governance` | 新提案 / 签名 / 执行 | 所有社长 |
| `mc.events.tournament.{id}` | 比赛开始 / 结果 / 争议 | 参赛者 |
| `mc.events.admin.push` | 推送授权请求 | 指定管理员 |

::: tip 频道命名约定
- 层级结构 `mc.events.<domain>.<id?>`,便于通配符订阅。
- `{id}` 占位允许只订阅特定实例/比赛,避免噪声。
:::
