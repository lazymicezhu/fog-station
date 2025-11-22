# 实验体监控终端（subject_monitor.html）技术说明

面向后续界面系统扩展的参数与逻辑参考。

## 数据结构
- `subjects: Array<Subject>`  
  - `id`: 实验体代号（如 `S-01`）  
  - `name`: 展示名（含 RW 时长）  
  - `species`: 物种学名  
  - `stage`: 异化阶段（显示用）  
  - `risk`: 风险等级（显示用）  
  - `note`: 备注/行为特征（信息卡与日志）  
  - `rwDuration`: RW 注射时长  
  - `baseShift`: 异化进度基线（当前逻辑初始为 0，异常时累加）  
  - `image`: 红外轮廓图片路径（预览与监控屏共用）

## 关键 DOM 引用
`subjectListEl` 左侧列表；`monitorSubtitleEl` 中部副标题；`silhouetteEl` 监控屏轮廓容器；`silhouetteImg` 当前红外图片；`previewGrid` 预览四宫格；`vitalHeart/Brain/Shift` 生命体征条与文本；`logListEl` 日志列表；按钮 `btnSample`、`btnRandom`。

## 主要逻辑函数
- `renderSubjectList()`：根据 `subjects` 列表生成左侧条目并绑定 `selectSubject`。
- `selectSubject(idx)`：进入某实验体监控。隐藏预览、显示轮廓，刷新头部状态/副标题/信息卡，重置生命体征并启动轮廓动画与体征轮询。
- `setSilhouetteAppearance(id)`：切换轮廓样式（cat/monkey/human 类）与图片源 `silhouetteImg.src`。
- `randomizeVitals(resetShift = false)`：生命体征逻辑。心率/脑电按物种区间（猫 120-170 bpm & 55-82%；猕猴 90-135 & 60-90%；人类 60-110 & 50-85%）每 5 秒自动刷新，有 25% 概率出现一次异常大幅上升，异常时进度条变红；此函数只更新体征显示，不提升异化。`resetShift` 会从当前实验体的保留值（`subject.shift`）加载异化。按钮“刷新生命体征”会立即触发一次同样逻辑。
- 采集驱动异化：仅在点击“采集数据”时提升异化；若心率或脑电有一项异常，异化随机 +0.0~10.0%；两项同时异常，异化随机 +5.0~15.0%；无异常则异化不变。采集操作有 5s 冷却，冷却内重复点击不会重复记录或叠加。  
- `renderPreviewGrid()`：生成预览四宫格（含扫描线/噪点/红外全图），绑定点击进入 `selectSubject`，并启动预览动画。
- `showPreview()`：返回待机预览态，清空当前实验体状态/生命体征，显示预览并重启预览动画。
- `startSilhouetteMotion(forceRestart = false)`：监控屏轮廓动画（approach/retreat/pace 随机循环）。`forceRestart` 在切换或刷新生命体征时重置。
- `startPreviewMotion()`：为每个预览 mini 屏随机分配轻微“呼吸”动画（小幅缩放/亮度），带随机延迟/负延迟，避免同步跳动。

## UI 与状态
- 未选实验体：显示预览网格（3 个已占用 + 1 备用占位），轮廓容器隐藏，状态栏与信息卡为待机占位。
- 选中实验体：预览隐藏，轮廓展示对应图片+扫描/噪点，信息卡/生命体征/日志实时更新；当前会读取并保留该实验体的异化值（`subject.shift`），切换实验体时在同一轮游戏内不重置。
- 响应按钮：`采集数据` 写备注日志；`刷新生命体征` 仅随机生命体征并轻触发轮廓动画。
- 日志/异常视图：日志最多保留 20 条（`MAX_LOGS`），超出移除最早；异常日志持久存入 `alertLogs`。右上“异常日志”按钮与监控日志共用同一日志框，点击切换“仅异常”视图，再点返回普通视图；异常记录不会被覆盖丢失。

## 动画概览
- 监控轮廓：`motion-approach/motion-retreat/motion-pace`（轻微位移/缩放）。
- 预览小屏：`preview-motion-*`（长周期微缩放/亮度脉动，不平移框线），扫描线 `scan` 循环，噪点叠加。

## 媒体与图片
- 红外轮廓图片位于 `arts/`，通过 `subjects.image` 引用。
- 预览卡片同时展示缩略图、全屏背景和扫描/噪点覆盖；监控屏用 `silhouetteImg` 覆盖核心轮廓，保留外圈光圈与扫描线。

## 响应式
- 主栅格列宽：180px / 2fr / 1.2fr（1200px 以下收紧为 160px / 1.7fr / 1.1fr）；字号与 padding 已下调以适配小窗口。
- 900px 以下切换为上下堆叠（原样规则）。

## 扩展建议
- 新增实验体：在 `subjects` 里追加对象；若需新轮廓形态，可在 CSS 添加 `.silhouette.<type>` 并在 `setSilhouetteAppearance` 分支里匹配。
- 状态联动：可在 `selectSubject` 或 `randomizeVitals` 中加入后端 API 推送或 WebSocket 回调。
- 视觉替换：预览/监控共用图片，若需不同视角，可增加字段 `imagePreview` / `imageMonitor`。
- 日志/异常视图：日志最多保留 20 条（`MAX_LOGS`），超出移除最早；异常日志持久存入 `alertLogs`。右上“异常日志”按钮与监控日志共用同一日志框，点击切换“仅异常”视图，再点返回普通视图；异常记录不会被覆盖丢失。 ***
