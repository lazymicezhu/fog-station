# 更新记录
> 约定：每次提交/推送代码时，都需同步更新本文件，记录涉及的子系统、日期（含具体时间）与关键改动，便于版本追踪。 
> 约定：历史记录保持只追加，不修改已记录的日期与内容。
> 约定：按顺序向下填写

## 2024-11-22 — 实验体监控终端（subject_monitor）
- 生命体征与异化逻辑调整：体征刷新不再提升异化，异化仅在采集时按异常随机累加（单异常 +0.0~10.0%，双异常 +5.0~15.0%，5s 冷却）。切换实验体保留各自异化值。
- 日志系统优化：普通日志上限 20 条；异常日志持久保存，使用同一日志框切换查看。
- 预览与监控：预览四宫格显示红外轮廓并具备柔和动态；监控屏展示不同实验体红外图，支持采集/刷新体征。
- 文档更新：`subject_monitor.md` 补充上述逻辑、UI 状态与扩展说明。 
- 样式与时间系统：样式抽离至 `subject_monitor.css` 便于审查； 

## 2024-11-23 — 实验体监控终端（subject_monitor）
- 日志上限调整为 18；游戏开始/日切/跳日清空当前日志后写入当日状态。
- 日常状态：按白/橙/红概率 70%/20%/10% 分配事件池（20/10/5 条），状态日志用文字颜色标识。
- 异化封顶：异化 100% 时监控屏噪点遮罩显示“已丢失观测结果”，心率/脑电/日常状态停止更新，采集/刷新提示观测结果已丢失。
- 调试序列：采集×2 → 刷新生命体征×3 → 采集×1，可快速将当前实验体异化置为 100%。
- 文档更新：`subject_monitor.md` 同步上述行为与展示文案。 

## 2024-11-23 — 架构模块化与清理
- 入口与模块：`subject_monitor.html` 改用 `<script type="module">` 加载 `pages/subject_monitor.js`，主逻辑拆分到模块。
- 时间与数据：时间系统抽成 `modules/time.js` 并暴露订阅接口；实验体与日常状态池移到 `data/subjects.js`。
- 资源清理：删除演示文件 `time_system.html`/`time_system.css`，统一使用模块化时间栏。
- 文档：新增 `architecture.md` 说明分层，`time_system.md` 描述模块用法，本文件追加本次改动记录。 
- 观察备注展示移除，信息卡仅展示当日状态文本（无“今日状态”前缀）。
- 预览占位文案改为“选择实验体后，将在此显示当日状态”。
- 文档更新：`subject_monitor.md` 说明信息卡行为调整。 

## 2024-11-23 — 信息卡状态染色
- 信息卡当日状态文本随状态染色（白/橙/红），丢失时显示“已丢失观测结果”并标红。
- 文档更新：`subject_monitor.md` 描述信息卡颜色随状态变化。 

## 2025-11-23 19:45 — 日志格式补充
- 约定补充：后续新增记录需写具体时间（含时分），历史记录不改动。

## 2025-11-23 20:09 — 文档目录整理
- 文档移动至 `docs/` 分层：`docs/systems/`（系统）、`docs/world/`（世界观）、`docs/architecture.md`（架构）。
- 新增 `docs/README.md`（导航与约定）与 `docs/templates/doc_template.md`（文档模板）。
- 更新 `time_system.md` 引用路径，其他历史日志未改动。

## 2025-11-23 20:21 — 时间倍率调整
- 时间系统节奏改为 1 秒现实 = 2 分钟游戏（`modules/time.js`），自动推进与跳日保持不变。
- 文档同步：`docs/systems/time_system.md`、`docs/systems/subject_monitor.md`、`docs/architecture.md`、`docs/README.md` 更新时间倍率描述。

## 2025-11-23 20:22 — 时间显示节奏微调
- 时间流改为 1 秒现实 = 1 分钟游戏，时间栏每秒跳动 1 分钟以提升沉浸感（`modules/time.js`）。
- 文档同步：`docs/systems/time_system.md`、`docs/systems/subject_monitor.md`、`docs/architecture.md`、`docs/README.md` 恢复对应说明。

## 2025-11-23 20:24 — 时间倍率与呈现更新
- 时间流保持 1 秒现实 = 2 分钟游戏，但时间栏以每 0.5 秒 +1 分钟方式跳动，维持压迫感且避免大步进（`modules/time.js`）。
- 文档同步：`docs/systems/time_system.md`、`docs/systems/subject_monitor.md`、`docs/architecture.md`、`docs/README.md` 调整时间节奏描述。

## 2025-11-23 20:41 — 预览快捷与状态染色
- 监控按钮区新增“快捷预览”，快速返回实验舱预览网格。
- 预览网格舱卡同步当日状态颜色（白/橙/红），与信息卡保持一致。
- 文档更新：`docs/systems/subject_monitor.md` 记录新按钮与预览染色行为。

## 2025-11-23 20:47 — 预览内框精简
- 移除预览舱卡内部框线，仅保留可染色的外层卡框，视觉更简洁（`subject_monitor.css`）。

## 2025-11-23 20:52 — 新手教程引导
- 新增遮罩式新手教程，步骤覆盖选择实验体、等待异常、采集数据、异化进度、快捷预览，高亮目标区域，可跳过/返回（`subject_monitor.html`/`pages/subject_monitor.js`/`subject_monitor.css`）。
- 文档同步：`docs/systems/subject_monitor.md` 补充新手教程行为。

## 2025-11-23 20:59 — 教程高亮可读性
- 调整新手教程高亮遮罩为透明镂空，确保被高亮区域文本清晰可见（`subject_monitor.css`）。

## 2025-11-23 21:00 — 教程提示框高亮
- 教程提示框增加描边与光晕，提升对比度与可读性（`subject_monitor.css`）。

## 2025-11-23 21:04 — 教程提示框提亮
- 提亮教程提示框背景、描边与文字颜色，确保遮罩下内容清晰可读（`subject_monitor.css`）。

## 2025-11-23 21:03 — 教程提示无遮罩
- 移除教程高亮的遮罩阴影，仅保留描边高亮，提示文字不再被遮挡（`subject_monitor.css`）。

## 2025-11-23 21:05 — 教程遮罩调整
- 仅保留整体遮罩使背景变暗，`guide-card` 和 `guide-highlight` 提升层级不被遮罩，突出提示内容与高亮区域（`subject_monitor.css`）。

## 2025-11-23 21:07 — 教程高亮提亮
- 保持背景遮罩变暗，但为高亮区域增加半透明底与更强光晕，确保高亮区域和提示文字清晰可见（`subject_monitor.css`）。

## 2025-11-23 21:08 — 教程高亮透光
- 降低整体遮罩透明度、移除高亮底色并强化光晕，保证左侧列表等被高亮区域更易看清（`subject_monitor.css`）。

## 2025-11-23 21:11 — 教程遮罩镂空
- 教程遮罩对高亮目标位置打孔（随目标动态调整），保证左侧列表等高亮区域完全不被遮挡，同时保持背景变暗（`subject_monitor.css`/`pages/subject_monitor.js`）。

## 2025-11-23 21:12 — 教程遮罩修复
- 补充遮罩元素引用（`guide-overlay`），修复教程初始化报错（`subject_monitor.html`/`pages/subject_monitor.js`）。

## 2025-11-23 21:16 — 教程步骤联动
- 选择实验体后自动推进新手教程到“等待异常”步骤（`pages/subject_monitor.js`），避免卡在 Step 1。

## 2025-11-23 21:19 — 教程完善
- 修复“下一步”无法从 Step 4 到 Step 5 的问题，统一用控制函数推进/回退（`pages/subject_monitor.js`）。
- 新增 `docs/tutorial.md` 记录完整教程逻辑；`docs/README.md` 添加教程导航。

## 2025-11-23 21:24 — 教程采集与按钮逻辑
- Step 4 再次点击“采集数据”即可进入 Step 5，符合“采集至满”流程；Step 5 仅显示“上一步”“完成”按钮（`pages/subject_monitor.js`）。
- 教程文档同步更新推进规则（`docs/tutorial.md`）。

## 2025-11-23 21:26 — 教程高亮范围调整
- Step 2/4 高亮区域限定为生命体征条（心率/脑电/异化），避免遮罩覆盖过大区域（`pages/subject_monitor.js`）。

## 2025-11-23 21:29 — 教程完成条件补充
- Step 5 下点击“快捷预览”将自动结束教程，除“完成”外的另一快速退出路径（`pages/subject_monitor.js`/`docs/tutorial.md`）。

## 2025-11-23 21:31 — 采集冷却优化
- 刷新生命体征后，下一次采集可跳过 5s 冷却限制（`pages/subject_monitor.js`）。
- 文档同步：`docs/systems/subject_monitor.md` 说明冷却跳过规则。
