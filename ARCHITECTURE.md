# 系统架构文档

## 概述

Fog Station 是一个基于事件驱动的模块化 Web 应用，采用原生 JavaScript 开发，无框架依赖。

## 架构图

```
┌─────────────────────────────────────────────────────────┐
│                     Presentation Layer                   │
│                     (UI Components)                       │
├─────────────────────────────────────────────────────────┤
│  Subject   │  Vitals  │  Paimon  │  Chat  │  Combat    │
│ Controller │  Manager │ Assistant│ Client │    UI      │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   Application Layer                       │
│                 (Business Logic Modules)                  │
├─────────────────────────────────────────────────────────┤
│  State    │ Resource │   Log    │  Guide │  Preview     │
│  Manager  │  Manager │  System  │ System │   Grid       │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                      Core Layer                           │
│                  (Infrastructure)                         │
├─────────────────────────────────────────────────────────┤
│   Event    │ Persistence │  Time   │  Modal │  Combat   │
│    Bus     │   Manager   │ System  │ System │  Engine   │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                     Data Layer                            │
├─────────────────────────────────────────────────────────┤
│  Subjects  │  Combat   │  Paimon  │    HUD   │  Pools   │
│    Data    │   Data    │ Messages │  Frames  │   Data   │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   Storage / Network                       │
├─────────────────────────────────────────────────────────┤
│  localStorage  │  WebSocket  │  Cloudflare Workers      │
└─────────────────────────────────────────────────────────┘
```

## 核心概念

### 1. 事件驱动架构

使用 `event-bus.js` 实现模块间解耦通信：

```javascript
// 发布事件
eventBus.emit('state:subjectSelected', { subject, index });

// 订阅事件
eventBus.on('state:subjectSelected', ({ subject }) => {
  // 处理逻辑
});
```

**优势**:
- 模块独立性强
- 易于扩展和维护
- 支持异步处理
- 便于调试和追踪

### 2. 单一数据源 (Single Source of Truth)

`state-manager.js` 作为唯一的状态管理中心：

```javascript
// 状态结构
{
  currentSubject: Object,
  subjects: Array,
  samplePermits: Number,
  logs: Array,
  // ...
}
```

**优势**:
- 状态可预测
- 易于调试
- 支持时间旅行（未来）
- 自动持久化

### 3. 依赖注入

模块通过构造函数接收依赖：

```javascript
class ResourceManager {
  constructor(elements) {
    this.elements = elements;
  }

  setTimeSystem(timeSystem) {
    this.timeSystem = timeSystem;
  }
}
```

**优势**:
- 易于测试
- 松耦合
- 可配置性强

## 模块说明

### 核心模块 (Core)

#### Event Bus
- **职责**: 模块间通信
- **依赖**: 无
- **导出**: `eventBus` 单例
- **关键方法**: `on()`, `off()`, `emit()`, `once()`

#### Persistence Manager
- **职责**: 数据持久化
- **依赖**: localStorage API
- **导出**: `loadGameState()`, `saveGameState()`
- **特性**: 版本迁移、数据导入导出

#### State Manager
- **职责**: 全局状态管理
- **依赖**: Event Bus, Persistence
- **导出**: `stateManager` 单例
- **特性**: 自动保存、事件触发

### 业务模块 (Application)

#### Log System
- **职责**: 日志记录和显示
- **依赖**: State Manager, Event Bus
- **特性**: 分类日志、自动滚动、日志限制

#### Resource Manager
- **职责**: 资源管理
- **依赖**: State Manager, Time System
- **管理内容**: 采集许可、稳定剂、研究进度

#### Vitals Manager
- **职责**: 生命体征管理
- **依赖**: State Manager
- **特性**: 自动刷新、异常检测、波形动画

### UI 模块 (Presentation)

#### Modal System
- **职责**: 对话框管理
- **依赖**: 无
- **导出**: `sysAlert()`, `sysConfirm()` 全局函数

#### Paimon Assistant (待完成)
- **职责**: 助手交互
- **特性**: 拖拽、消息提示、位置管理

#### Chat Client (待完成)
- **职责**: 聊天功能
- **特性**: WebSocket、自动重连、消息历史

## 数据流

### 用户操作流程

```
User Action
    │
    ▼
UI Component (Handler)
    │
    ▼
State Manager (Update State)
    │
    ├─────► Event Bus (Emit Event)
    │           │
    │           ├──► UI Module 1 (Update Display)
    │           ├──► UI Module 2 (Update Display)
    │           └──► Log System (Record Event)
    │
    └─────► Persistence (Auto Save)
```

### 示例：采集数据流程

1. 用户点击"采集数据"按钮
2. `SubjectController` 验证条件
3. 调用 `StateManager.updateShift()`
4. State Manager 更新状态并触发 `state:shiftUpdated` 事件
5. `VitalsManager` 监听事件，更新UI
6. `LogSystem` 记录日志
7. `Persistence` 自动保存状态

## 通信协议

### 事件命名规范

格式: `module:action`

**系统事件**:
- `state:initialized` - 状态初始化
- `state:subjectSelected` - 实验体选择
- `state:resourceUpdated` - 资源更新
- `state:shiftUpdated` - 异化更新
- `state:dailyReset` - 每日重置

**请求事件**:
- `log:add` - 请求添加日志
- `ui:update` - 请求更新UI

### WebSocket 消息格式

```javascript
// 聊天消息
{
  type: "chat",
  user: "username",
  text: "message content",
  ts: 1234567890
}

// 历史记录
{
  type: "history",
  messages: [...]
}
```

## 性能优化

### 1. 代码分割

使用 Vite 的动态导入：

```javascript
// 按需加载战斗系统
const { CombatSession } = await import('./modules/combat.js');
```

### 2. 缓存策略

- **HTML**: 不缓存 (`max-age=0`)
- **JS/CSS**: 长期缓存 (`max-age=31536000`)
- **图片/字体**: 长期缓存 + `immutable`
- **数据**: 短期缓存 (`max-age=300`)

### 3. 防抖和节流

```javascript
// 生命体征每 5 秒更新一次
vitalsTimer = setInterval(() => randomizeVitals(), 5000);
```

### 4. 事件委托

```javascript
// 实验体列表使用事件委托
subjectListEl.addEventListener('click', (e) => {
  const item = e.target.closest('.subject-item');
  if (item) selectSubject(index);
});
```

## 安全考虑

### 1. 输入验证

- 聊天消息长度限制 (320字符)
- 用户名长度限制 (32字符)
- XSS 防护 (`textContent` 代替 `innerHTML`)

### 2. 数据完整性

- localStorage 错误处理
- 版本迁移机制
- 数据验证和恢复

### 3. WebSocket 安全

- 使用 WSS (加密连接)
- 消息格式验证
- 频率限制（TODO）

## 可测试性

### 单元测试示例

```javascript
// state-manager.test.js
import { stateManager } from './modules/state-manager.js';

describe('StateManager', () => {
  test('should select subject', () => {
    const subjects = [{ id: 'S-01', shift: 0 }];
    stateManager.init(subjects);
    stateManager.selectSubject(0);
    expect(stateManager.getState().currentSubjectIndex).toBe(0);
  });
});
```

### 集成测试

```javascript
// 测试完整流程
test('sampling workflow', () => {
  // 1. 选择实验体
  // 2. 等待异常体征
  // 3. 采集数据
  // 4. 验证异化增长
  // 5. 验证研究进度
  // 6. 验证日志记录
});
```

## 部署架构

```
                  Internet
                     │
                     ▼
          ┌─────────────────────┐
          │  Cloudflare CDN     │
          └─────────────────────┘
                     │
       ┌─────────────┴─────────────┐
       │                           │
       ▼                           ▼
┌─────────────┐           ┌──────────────┐
│   Workers   │           │    Pages     │
│  (WebSocket)│           │ (Static HTML)│
└─────────────┘           └──────────────┘
       │
       ▼
┌─────────────┐
│   Durable   │
│   Objects   │
│ (Chat Room) │
└─────────────┘
```

## 未来规划

### 短期 (v1.1)
- [ ] 完成剩余 UI 模块拆分
- [ ] 添加单元测试（覆盖率 > 60%）
- [ ] 性能分析和优化

### 中期 (v1.2)
- [ ] Redux-style 时间旅行调试
- [ ] 主题切换功能
- [ ] 国际化支持 (i18n)

### 长期 (v2.0)
- [ ] TypeScript 迁移
- [ ] 离线 PWA 支持
- [ ] 移动端适配
- [ ] 多人协作功能

## 参考资料

- [Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)
- [Flux Architecture](https://facebook.github.io/flux/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Vite Documentation](https://vitejs.dev/)

---

最后更新: 2024-01-XX
维护者: [Your Name]
