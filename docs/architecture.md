# 架构说明（Fog-station 前端原型）

- **页面层**：每个系统一个页面文件（例：`subject_monitor.html`），只负责布局容器与引入对应入口脚本。
- **入口脚本**：放在 `pages/`（例：`pages/subject_monitor.js`），以 ES Module 形式运行，负责绑定 DOM、调用功能模块。
- **功能模块**：放在 `modules/`，可复用的系统能力（例：`modules/time.js` 提供游戏时间流与跳日事件）。
- **数据层**：放在 `data/`，静态配置与文案（例：`data/subjects.js` 定义实验体、每日状态池）。
- **样式层**：当前样式集中在 `subject_monitor.css`；后续可拆为 `styles/base.css`（通用）+ 各页面样式。

## 时间与日志
- 全局时间由 `modules/time.js` 管理，1 秒现实=1 分钟游戏，支持自动进位与手动跳日。
- 需要时间戳的系统可在入口脚本中订阅 `onTick` / `onDayChange`，使用 `time.format()` 获取展示字符串。

## 扩展建议
- 新增系统：创建 `xxx.html` + `pages/xxx.js`，在入口脚本中按需引入 `modules/` 与 `data/` 内容。
- 公共能力：将日志、事件总线、音频、资源加载等逐步沉淀为模块，页面只写胶水代码。
- 数据拆分：将更多配置（文案、数值表、资源路径）移入 `data/`，避免页面硬编码，方便后续本地化或剧情更新。
