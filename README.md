# Fog Station - BNU 实验体监控终端

![Version](https://img.shields.io/badge/version-0.7.1-blue)
![License](https://img.shields.io/badge/license-MIT-green)

一个实验性的交互叙事项目，模拟实验体监控系统的操作界面。

## 特性

- **实时监控** - 动态生命体征显示和异化进度跟踪
- **多人聊天** - 基于 WebSocket 的实时研究员频道
- **战斗系统** - 回合制战斗，元素反应机制
- **数据持久化** - 自动保存游戏进度
- **赛博朋克风格** - 终端式 UI 设计
- **响应式布局** - 支持不同屏幕尺寸

## 技术栈

- **前端**: 原生 JavaScript (ES6+)
- **构建工具**: Vite
- **样式**: CSS3 (模块化)
- **部署**: Cloudflare Workers + Pages
- **WebSocket**: Cloudflare Durable Objects

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装

```bash
# 克隆项目
git clone <repository-url>
cd Fog-station

# 安装依赖
npm install
```

### 开发

```bash
# 启动开发服务器
npm run dev

# 访问 http://localhost:3000
```

### 构建

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

### 测试

```bash
# 运行测试
npm test

# 测试覆盖率
npm run test:coverage

# 测试 UI
npm run test:ui
```

### 代码检查

```bash
# 运行 ESLint
npm run lint

# 自动修复
npm run lint:fix
```

## 项目结构

```
Fog-station/
├── data/                  # 游戏数据
│   ├── subjects.js       # 实验体数据
│   ├── combat_data.js    # 战斗数据
│   └── paimon_messages.js # 派蒙消息
├── modules/               # 核心模块
│   ├── event-bus.js      # 事件总线
│   ├── persistence.js    # 持久化
│   ├── state-manager.js  # 状态管理
│   ├── log-system.js     # 日志系统
│   ├── resource-manager.js # 资源管理
│   ├── vitals-manager.js # 生命体征
│   ├── modal-system.js   # 模态框
│   ├── time.js           # 时间系统
│   ├── login.js          # 登录系统
│   ├── cultivation.js    # 培养系统
│   └── combat.js         # 战斗系统
├── pages/                 # 页面入口
│   └── subject_monitor.js # 监控主页面
├── styles/                # 样式文件
│   ├── base/             # 基础样式
│   │   ├── variables.css # 设计变量
│   │   └── reset.css     # 重置样式
│   └── components/       # 组件样式
├── functions/            # Cloudflare Functions
│   └── ws.js            # WebSocket 处理
├── index.html           # 主页面
├── index.css            # 主样式
├── _worker.js           # Cloudflare Worker
├── vite.config.js       # Vite 配置
├── package.json         # 项目配置
└── README.md           # 项目说明
```

## 架构设计

### 模块化架构

项目采用模块化设计，各模块职责清晰：

- **状态管理** (`state-manager.js`): 集中管理全局状态
- **事件总线** (`event-bus.js`): 解耦模块间通信
- **持久化** (`persistence.js`): 统一的数据存储
- **UI 模块**: 各司其职的UI控制器

详见 [REFACTOR_GUIDE.md](./REFACTOR_GUIDE.md)

### 设计模式

- **单例模式**: 状态管理器、事件总线
- **观察者模式**: 事件驱动的模块通信
- **工厂模式**: 实验体实例创建
- **策略模式**: 不同实验体的体征范围

## 部署

### Cloudflare Pages

```bash
# 部署到 Cloudflare Pages
npm run deploy

# 或使用 wrangler 命令
wrangler pages deploy dist
```

### 配置 Durable Objects

在 `wrangler.toml` 中配置：

```toml
name = "fog-station"
compatibility_date = "2024-01-01"

[[durable_objects.bindings]]
name = "CHAT_ROOM"
class_name = "ChatRoom"
script_name = "fog-station"

[site]
bucket = "./dist"
```

## 游戏机制

### 实验体监控

- 观察实验体的心率、脑电和异化进度
- 异常体征会触发警告
- 异化达到 100% 将失去监控

### 资源管理

- **采集许可**: 每天 10 次，用于采集数据
- **稳定剂**: 3 支，可抵消异化增长
- **研究进度**: 通过采集数据累积

### 战斗系统

- 回合制战斗
- 元素反应（克制/被克制）
- 技能和物品使用
- 实验体成长系统

## 开发计划

- [ ] 完善剩余 UI 模块拆分
- [ ] 添加单元测试
- [ ] 优化性能
- [ ] 增加更多实验体
- [ ] 扩展战斗系统
- [ ] 添加成就系统
- [ ] 多语言支持

## 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 代码规范

- 使用 ESLint 进行代码检查
- 遵循 JavaScript Standard Style
- 添加适当的注释和文档

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 鸣谢

- 设计灵感来自赛博朋克和实验室主题
- 使用了 Cloudflare Workers 和 Durable Objects
- 字体: Roboto Mono, Noto Sans SC

## 联系方式

项目链接: [https://github.com/yourusername/Fog-station](https://github.com/yourusername/Fog-station)

---

⚠️ **注意**: 这是一个实验性项目，仅用于学习和娱乐目的。
