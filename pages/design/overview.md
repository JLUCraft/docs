# 总体架构

本系统采用五层架构，**每层去中心化，都有明确的信任锚点**。

## 核心设计原则

- **去中心化**：不依赖中心服务。任意单节点宕机不影响系统运行。
- **零配置防篡改**：节点启动时不配置任何角色，物理机控制者无法通过修改配置提升权限。节点能做什么完全由治理层签发的 VC 决定。
- **信任锚点明确**：硬编码社长公钥是唯一根信任，其余权限通过签名链派生。
- **持久化与运行分离**：节点无状态，数据在 S3 + 共识日志，宕机重启即可恢复。
- **客观度量优先**：预言机用算法采集数据，降低治理摩擦。
- **平面对等**：所有节点地位平等，工作负载按资源富余调度，无预设主从之分。

## 分层视图

| 层 | 关键能力 | 详见 |
| ---- | --------- | ------ |
| 应用层 | 启动器 / 管理终端 / 联赛系统 | [客户端](./client) · [联赛](./tournament) |
| 业务层 | 实例编排 / 预言机 / 多签治理 | [业务层](./business) · [预言机](./oracle) · [治理](./governance) |
| HAL | Instance 抽象 / Docker 运行时 / 健康检查 | [HAL](./hal) |
| 网络接入层 | 统一 InboundSession 接口 / LibP2p·Frp·DirectTcp 适配器 | [网络层](./network#网络接入层) |
| 内部网络层 | libp2p + QUIC 多径 / DHT / NAT 穿透 / 中继 | [网络层](./network#内部网络层) |

## 拓扑结构

```mermaid
flowchart TB
  subgraph Shared["共享基础设施"]
    BS["已知节点（DHT 入口）"]
    S3[(S3 / R2 / MinIO)]
    TURN[TURN fallback]
    FRP[frp 服务端]
  end

  subgraph A["节点组 A"]
    A1["节点 A1<br/>(持有 ConsensusCredential)"]
    A2["节点 A2"]
    A3["N× FollyLauncher 客户端"]
    A4["N× HMCL/PCL 客户端"]
  end

  subgraph B["节点组 B"]
    B1["节点 B1<br/>(持有 ConsensusCredential)"]
    B2["节点 B2"]
    B3["N× FollyLauncher 客户端"]
    B4["N× HMCL/PCL 客户端"]
  end

  subgraph C["节点组 C"]
    C1["节点 C1<br/>(持有 ConsensusCredential)"]
    C2["节点 C2"]
  end

  subgraph Raft["Raft 投票组（由 ConsensusCredential 决定）"]
    A1 --- B1 --- C1
  end

  A1 -->|"数据快照"| S3
  A2 -->|"数据快照"| S3
  B1 -->|"数据快照"| S3
  B2 -->|"数据快照"| S3
  C1 -->|"数据快照"| S3
  C2 -->|"数据快照"| S3

  A2 -.->|"内部网络 DHT"| BS
  B2 -.->|"内部网络 DHT"| BS
  C2 -.->|"内部网络 DHT"| BS

  A1 -.->|"QUIC 直连 / 中继"| B1
  A2 -.->|"QUIC 直连 / 中继"| B2
  A2 -.->|"NAT 打洞失败"| TURN

  A3 ==>|"接入层 LibP2pAdapter"| A2
  B3 ==>|"接入层 LibP2pAdapter"| B2
  A4 ==>|"接入层 FrpAdapter"| FRP
  B4 ==>|"接入层 FrpAdapter"| FRP
  FRP ==>|"隧道转发"| A2
  FRP ==>|"隧道转发"| B2
```

- **实线**：Raft 投票组内部通信，成员资格由 `ConsensusCredential` VC 决定，非配置项
- **虚线**：内部网络层——DHT 发现 / 节点间 libp2p 数据流（QUIC 多径，打洞失败走 TURN）
- **粗线**：网络接入层——外部客户端通过适配器接入，统一抽象为 InboundSession

::: tip 节点部署建议
所有节点软件相同，零配置启动。高在线率的机器（云服务器）适合申请 `ConsensusCredential`；高性能机器自然获得更多实例调度权重。这是建议，不是强制分工。
:::

## 端到端工作流

### 方式一：FollyLauncher（VC 玩家）

```mermaid
sequenceDiagram
    autonumber
    participant L as 启动器 (App 层)
    participant DHT as DHT (内部网络层)
    participant A as LibP2pAdapter (接入层)
    participant S as 服务器节点 (HAL)
    participant Biz as 业务层
    participant MC as MC 客户端

    MC->>L: 连接 localhost 代理
    L->>DHT: 查询实例位置（只读，不写入 DHT）
    DHT-->>L: multiaddr
    L->>A: 建立 QUIC stream（携带 VC）
    A->>A: 验证 VC 签名链，包装 InboundSession
    A->>S: InboundSession { VCIdentity, instance_id }
    S->>Biz: 验证 VC，检查 admission
    Biz-->>S: ok
    S-->>L: 转发到容器端口
    L-->>MC: 透明转发 MC 协议
    Note over Biz: 在线状态被预言机采集，计入积分
```

### 方式二：标准启动器（MUA 访客）

```mermaid
sequenceDiagram
    autonumber
    participant Std as HMCL / PCL
    participant FRP as frp 隧道
    participant A as FrpAdapter (接入层)
    participant Union as MUA Union API
    participant S as 服务器节点 (HAL)
    participant Biz as 业务层

    Std->>FRP: TCP 连接（SNI 含 instance_id）
    FRP->>A: 转发连接
    A->>A: 解析 MC 握手包，提取 Yggdrasil token
    A->>Union: 查询 UUID 所属皮肤站
    Union-->>A: ClubCode
    A->>S: InboundSession { YggdrasilId, instance_id }
    S->>Biz: 查 instance.admission 配置
    Biz-->>S: 允许 / 拒绝
    S-->>Std: 建立到容器的连接
    Note over Biz: Guest 状态不入积分系统
```

任一层故障都有兜底：接入层切换适配器、网络层切中继、HAL 触发实例迁移、共识层重新调度。
