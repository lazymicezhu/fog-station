# 项目概览
- Fog-station：交互叙事原型，当前包含“实验体监控终端”界面与通用时间系统。监控终端支持实验体切换、生命体征刷新、异化进度、每日状态与日志视图；时间系统提供统一的游戏内时间流（1 秒=2 分钟，时间栏每 0.5 秒 +1 分钟跳动）与跳日事件。

## 架构速览
- 页面层：每个系统单独的 HTML（例 `subject_monitor.html`），仅放结构与入口脚本引用。
- 入口脚本：`pages/`（例 `pages/subject_monitor.js`），以 ES Module 形式绑定 DOM、调度模块。
- 功能模块：`modules/`（例 `modules/time.js` 时间流），供各页面复用。
- 数据：`data/`（例 `data/subjects.js` 定义实验体与日常状态池）。
- 样式：当前集中于 `subject_monitor.css`，后续可拆分 base/theme 与页面局部。

# 文档导航与约定

- **日志**：`UPDATE_LOG.md`（根目录）按时间顺序追加，保留旧记录；新记录需包含日期与时分。
- **架构概览**：`docs/architecture.md`
- **系统文档**：`docs/systems/subject_monitor.md`、`docs/systems/time_system.md`
- **世界观/设定**：`docs/world/世界观.md`
- **新手教程**：`docs/tutorial.md`
- **模板**：`docs/templates/doc_template.md`（新文档可复制使用）

## 维护约定
- 不修改历史日志，新增内容一律追加。
- 文档间互相引用用相对路径（如 `./systems/subject_monitor.md`），方便整体迁移。
- 功能变更时同步更新对应系统文档相关章节，并在 `UPDATE_LOG.md` 追加记录。
