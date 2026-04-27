# 总体架构

JLUCraft 基础设施采用四层架构，**每层去中心化，都有明确的信任锚点**。

## 分层视图

| 层 | 关键能力 | 详见 |
| ---- | --------- | ------ |
| 应用层 | 启动器 / 管理终端 / 联赛系统 | [客户端](./client.md) · [联赛](./tournament.md) |
| 业务层 | 实例编排 / 预言机 / 多签治理 | [业务层](./business.md) · [预言机](./oracle.md) · [治理](./governance.md) |
| HAL | Instance 抽象 / Docker 运行时 / 健康检查 | [HAL](./hal.md) |
| 网络层 | libp2p + QUIC 多径 / DHT / 中继 | [网络层](./network.md) |

## 架构总图

```mermaid
flowchart TB
  subgraph App["应用层"]
    direction LR
    A1["启动器<br/>(用户入口)"]
    A2["管理终端<br/>(管理员入口)"]
    A3["联赛系统<br/>(积分 / 组队)"]
  end

  subgraph Biz["业务层"]
    direction LR
    B1[实例编排引擎]
    B2[预言机 & 积分]
    B3[多签治理引擎]
  end

  subgraph HAL["主机抽象层 (HAL)"]
    direction LR
    H1["实例抽象<br/>房间 vs 服务"]
    H2[Docker 运行时管理]
    H3[健康检查 & 自愈]
  end

  subgraph Net["网络层"]
    direction LR
    N1["libp2p + QUIC<br/>多径组网"]
    N2[DHT 分布式寻址]
    N3[中继 / TURN 穿透]
  end

  App --> Biz --> HAL --> Net
```

## 端到端的一次"加入服务器"

玩家点击"加入"后发生的事，串起所有层：

```mermaid
sequenceDiagram
    autonumber
    participant L as 启动器 (App 层)
    participant DHT as DHT (网络层)
    participant S as 服务器节点 (HAL)
    participant Biz as 业务层
    participant MC as MC 客户端

    MC->>L: 连接 localhost 代理
    L->>DHT: 查询实例位置
    DHT-->>L: multiaddr
    L->>S: 建立 QUIC stream
    S->>Biz: 验证 VC，允许进入
    Biz-->>S: ok
    S-->>L: 转发到容器端口
    L-->>MC: 透明转发 MC 协议
    Note over Biz: 在线状态被预言机采集
```

任一层故障都有兜底：网络层切中继、HAL 触发实例迁移、共识层重新调度。

## 核心设计原则

- **去中心化**：不依赖中心服务。引导节点宕机只影响新节点加入。
- **信任锚点明确**：硬编码社长公钥是唯一根信任，其余权限通过签名链派生。
- **持久化与运行分离**：节点无状态，数据在 S3 + 共识日志，宕机重启即可恢复。
- **客观度量优先**：预言机用算法而非人工统计，降低治理摩擦。
- **平面对等**：各节点地位平等，无主从之分。
