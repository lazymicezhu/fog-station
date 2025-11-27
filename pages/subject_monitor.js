import { createTimeSystem } from "../modules/time.js";
import { subjects as subjectSeed, dailyPools } from "../data/subjects.js";
import { hudFrames } from "../data/hud_frames.js";
import { paimonMessages, paimonAlertText } from "../data/paimon_messages.js";
import { initPlayerSubjects, getPlayerSubjects, getEnemyPool, SubjectInstance } from '../modules/cultivation.js';
import { CombatSession } from '../modules/combat.js';
import { SKILL_DB, ELEMENT_NAMES } from '../data/combat_data.js';

const subjects = subjectSeed.map(s => ({
  ...s,
  remarkQueues: {
    low: [],
    medium: [],
    high: [],
  },
  lastHeart: 60,
  lastBrain: 60,
  lastHeartAlert: false,
  lastBrainAlert: false
}));
let currentSubject = null;

// DOM 引用
const subjectListEl = document.getElementById("subject-list");
const headerStatusEl = document.getElementById("header-status");
const monitorSubtitleEl = document.getElementById("monitor-subtitle");
const monitorScreenEl = document.getElementById("monitor-screen");
const scanLineEl = document.getElementById("scan-line");
const screenFooterLeft = document.getElementById("screen-footer-left");
const screenFooterRight = document.getElementById("screen-footer-right");
const infoIdEl = document.getElementById("info-id");
const infoSpeciesEl = document.getElementById("info-species");
const infoStageEl = document.getElementById("info-stage");
const infoRiskEl = document.getElementById("info-risk");
const infoNoteEl = document.getElementById("info-note");
const vitalHeartFill = document.getElementById("vital-heart");
const vitalBrainFill = document.getElementById("vital-brain");
const vitalShiftFill = document.getElementById("vital-shift");
const vitalHeartText = document.getElementById("vital-heart-text");
const vitalBrainText = document.getElementById("vital-brain-text");
const vitalShiftText = document.getElementById("vital-shift-text");
const logListEl = document.getElementById("log-list");
const btnSample = document.getElementById("btn-sample");
const btnRandom = document.getElementById("btn-random");
const btnPreview = document.getElementById("btn-preview");
const btnStabilizer = document.getElementById("btn-stabilizer");
const guideMask = document.getElementById("guide-mask");
const guideOverlay = document.getElementById("guide-overlay");
const guideCard = document.getElementById("guide-card");
const guideStepText = document.getElementById("guide-step");
const guideBodyText = document.getElementById("guide-text");
const guidePrev = document.getElementById("guide-prev");
const guideNext = document.getElementById("guide-next");
const guideSkip = document.getElementById("guide-skip");
const silhouetteEl = document.getElementById("silhouette");
const silhouetteImg = document.getElementById("silhouette-img");
const previewGrid = document.getElementById("preview-grid");
const btnAlertLog = document.getElementById("btn-alert-log");
const timeDisplay = document.getElementById("time-display");
const btnNextDay = document.getElementById("btn-next-day");
const lostOverlay = document.getElementById("lost-overlay");
const permitText = document.getElementById("permit-text");
const stabilizerText = document.getElementById("stabilizer-text");
const researchText = document.getElementById("research-text");
const researchFill = document.getElementById("research-fill");
const waveformPanel = document.getElementById("waveform-panel");
const hudFramesEl = document.getElementById("hud-frames");
const waveHeart = document.getElementById("wave-heart");
const waveBrain = document.getElementById("wave-brain");
const waveHeartText = document.getElementById("wave-heart-text");
const waveBrainText = document.getElementById("wave-brain-text");
const paimonWidget = document.getElementById("paimon-widget");
const paimonMessageEl = document.getElementById("paimon-message");
const paimonAvatar = document.getElementById("paimon-avatar");

const MAX_LOGS = 18;
const DAILY_SAMPLE_PERMITS = 10;
const INITIAL_STABILIZERS = 3;
const NEXT_DAY_UNLOCK_MINUTES = 12 * 60; // 12:00 之后才能跳日
let previewMotionHandles = [];
let vitalsTimer = null;
let staticEffectTimer = null;
let previewVitalsTimer = null;
let currentShift = 0;
let heartAlert = false;
let brainAlert = false;
const alertLogs = [];
const logs = [];
let alertView = false;
let canSampleInCycle = true;
let pendingDayChangeReason = "auto";
const dailyQueues = { white: [], orange: [], red: [] };
const testSeq = { step: 0 };
const statusColors = { white: "#91a2f0", orange: "#ffcb8a", red: "#ff9bb0" };
const defaultInfoColor = "#91a2f0";
const defaultPreviewStageColor = "#9bdfff";
let guideStepIndex = 0;
let guideActive = false;
let samplePermits = DAILY_SAMPLE_PERMITS;
let stabilizerCount = INITIAL_STABILIZERS;
let stabilizerArmed = false;
let researchProgress = 0;
let hudDebug = false;
let paimonPosition = { x: null, y: null }; // 表示头像中心锚点位置
let paimonDrag = { active: false, pointerId: null, offsetX: 0, offsetY: 0 };

const time = createTimeSystem({
  onTick: updateTimeDisplay,
  onDayChange: () => handleDayChange(pendingDayChangeReason)
});

function updateTimeDisplay() {
  if (timeDisplay) timeDisplay.textContent = time.format();
  updateNextDayButtonState();
}

function updateResourceUI() {
  if (permitText) permitText.textContent = `${samplePermits} / ${DAILY_SAMPLE_PERMITS}`;
  if (stabilizerText) {
    const armedText = stabilizerArmed ? "（已待命）" : "";
    stabilizerText.textContent = `${stabilizerCount} 支${armedText}`;
  }
  if (btnStabilizer) {
    btnStabilizer.disabled = stabilizerCount <= 0 || stabilizerArmed;
  }
  const progressValue = Math.min(100, researchProgress);
  if (researchFill) researchFill.style.width = `${progressValue}%`;
  if (researchText) researchText.textContent = `${progressValue.toFixed(1)}%`;
  updateNextDayButtonState();
}
function updateNextDayButtonState() {
  if (!btnNextDay || !time || !time.getTime) return;
  const { minutes } = time.getTime();
  const unlocked = minutes >= NEXT_DAY_UNLOCK_MINUTES || samplePermits <= 0;
  btnNextDay.disabled = !unlocked;
  btnNextDay.classList.toggle("btn-disabled", !unlocked);
}

function updateWaveforms(hr = null, brain = null) {
  if (waveHeartText && hr !== null) waveHeartText.textContent = `${hr} bpm`;
  if (waveBrainText && brain !== null) waveBrainText.textContent = `${brain}%`;
  if (waveHeart && hr !== null) {
    const amp = Math.max(0.7, Math.min(1.6, hr / 120));
    waveHeart.style.animationDuration = `${Math.max(0.8, Math.min(2.4, 120 / Math.max(hr, 1)))}s`;
    waveHeart.style.setProperty("--wave-amp", amp.toFixed(2));
  }
  if (waveBrain && brain !== null) {
    const amp = Math.max(0.7, Math.min(1.5, brain / 90));
    waveBrain.style.animationDuration = `${Math.max(0.8, Math.min(2.4, 120 / Math.max(brain, 1)))}s`;
    waveBrain.style.setProperty("--wave-amp", amp.toFixed(2));
  }
}

function handleDayChange(reason) {
  pendingDayChangeReason = "auto";
  logs.length = 0;
  alertLogs.length = 0;
  renderLogList([]);
  // Reset daily-limited resources
  samplePermits = DAILY_SAMPLE_PERMITS;
  stabilizerArmed = false;
  canSampleInCycle = true;
  updateResourceUI();
  assignDailyStatuses(true);
  const prefix = reason === "manual" ? "时间跳转到" : "时间推进到";
  addLog(`${prefix} ${time.format()}。`, true);
  addLog(`采集许可已重置为 ${samplePermits}/${DAILY_SAMPLE_PERMITS}。`, true);
}

function isSubjectLost(subj) {
  if (!subj) return false;
  return (subj.shift || 0) >= 100;
}

// 渲染左侧实验体列表
function renderSubjectList() {
  subjectListEl.innerHTML = "";
  subjects.forEach((s, index) => {
    const item = document.createElement("div");
    item.className = "subject-item";
    item.dataset.id = s.id;
    item.innerHTML = `
      <div class="subject-id">${s.id}</div>
      <div class="subject-name">${s.name}</div>
      <div class="subject-meta">RW 注射：${s.rwDuration}</div>
    `;
    item.addEventListener("click", () => selectSubject(index));
    subjectListEl.appendChild(item);
  });
}

function selectSubject(idx) {
  currentSubject = subjects[idx];
  testSeq.step = 0;
  previewGrid.style.display = "none";
  silhouetteEl.style.display = "flex";
  previewMotionHandles.forEach(h => clearTimeout(h));
  previewMotionHandles = [];
  clearInterval(vitalsTimer);
  vitalsTimer = null;
  clearInterval(previewVitalsTimer);
  previewVitalsTimer = null;
  clearTimeout(staticEffectTimer);
  currentShift = currentSubject.shift || 0;
  heartAlert = false;
  brainAlert = false;
  stabilizerArmed = false;
  document.querySelectorAll(".subject-item").forEach((el, i) => {
    el.classList.toggle("active", i === idx);
  });

  headerStatusEl.textContent = `当前实验体：${currentSubject.id} / ${currentSubject.name}`;
  monitorSubtitleEl.textContent = "遮蔽舱联机中… 已锁定当前实验体。";
  if (typeof screenFooterLeft !== "undefined" && screenFooterLeft) {
    screenFooterLeft.textContent = "";
  }
  if (typeof screenFooterRight !== "undefined" && screenFooterRight) {
    screenFooterRight.textContent = "";
  }
  if (waveformPanel) waveformPanel.style.display = "grid";
  renderHudFrames(currentSubject.id);

  infoIdEl.textContent = currentSubject.id;
  infoSpeciesEl.textContent = `物种：${currentSubject.species}`;
  infoStageEl.textContent = currentSubject.stage;
  infoRiskEl.textContent = `风险：${currentSubject.risk}`;
  updateDailyStatusUI();
  updateLostOverlay();
  updateResourceUI();

  setSilhouetteAppearance(currentSubject.id);

  randomizeVitals(true);
  vitalsTimer = setInterval(() => randomizeVitals(), 5000);
  addLog(`切换监控目标为 ${currentSubject.id}（${currentSubject.name}）。`);
  startEffectLoops();
  if (guideActive && guideStepIndex === 0) {
    setGuideStep(1);
  }
}

function setSilhouetteAppearance(id) {
  silhouetteEl.className = "silhouette";
  const tailEl = silhouetteEl.querySelector(".tail");
  const subject = subjects.find(s => s.id === id);
  silhouetteImg.src = subject?.image || "";
  silhouetteImg.style.opacity = subject ? "1" : "0";
  if (id === "S-01") {
    silhouetteEl.classList.add("cat");
    tailEl.style.display = "none";
  } else if (id === "S-07") {
    silhouetteEl.classList.add("monkey");
    tailEl.style.display = "none";
  } else {
    silhouetteEl.classList.add("human");
    tailEl.style.display = "none";
  }
}

// 随机生命体征
function randomizeVitals(resetShift = false) {
  if (!currentSubject) return;
  if (isSubjectLost(currentSubject)) {
    updateLostOverlay();
    return;
  }
  const ranges = {
    "S-01": { heart: [120, 170], brain: [55, 82] },
    "S-07": { heart: [90, 135], brain: [60, 90] },
    "S-13": { heart: [60, 110], brain: [50, 85] }
  };
  const { heart: [hMin, hMax], brain: [bMin, bMax] } = ranges[currentSubject.id] || { heart: [70, 120], brain: [50, 90] };

  let hr = Math.round(hMin + Math.random() * (hMax - hMin));
  let brain = Math.round(bMin + Math.random() * (bMax - bMin));

  heartAlert = Math.random() < 0.25;
  brainAlert = Math.random() < 0.25;
  if (heartAlert) hr = Math.min(hMax + 30, hr + 25 + Math.round(Math.random() * 20));
  if (brainAlert) brain = Math.min(bMax + 25, brain + 15 + Math.round(Math.random() * 25));

  if (resetShift) currentShift = currentSubject.shift || 0;
  vitalHeartFill.style.width = Math.min(hr / 2, 100) + "%";
  vitalBrainFill.style.width = Math.min(brain, 100) + "%";
  vitalShiftFill.style.width = Math.min(currentShift, 100) + "%";

  currentSubject.lastHeart = hr;
  currentSubject.lastBrain = brain;
  currentSubject.lastHeartAlert = heartAlert;
  currentSubject.lastBrainAlert = brainAlert;
  applyPreviewVitals(currentSubject);
  updateWaveforms(hr, brain);

  vitalHeartFill.classList.toggle("alert", heartAlert);
  vitalBrainFill.classList.toggle("alert", brainAlert);
  vitalHeartText.textContent = hr + " bpm";
  vitalBrainText.textContent = brain + "%";
  vitalShiftText.textContent = currentShift.toFixed(1) + "%";
  updateLostOverlay();

  const logText = `生命体征更新：心率 ${hr} bpm${heartAlert ? "（异常）" : ""}，脑电活动 ${brain}%${brainAlert ? "（异常）" : ""}，异化进度 ${currentShift.toFixed(1)}%。`;
  const alertFlag = heartAlert || brainAlert;
  addLog(logText, true, alertFlag);
  canSampleInCycle = true; // Re-arm sampling for the new cycle
}

function renderLogList(list) {
  logListEl.innerHTML = "";
  list.forEach(item => {
    const entry = document.createElement("div");
    entry.className = "log-entry";
    if (item.kind === "sample") entry.classList.add("log-entry-sample");
    const shiftValue = typeof item.shift === "number" ? Math.min(100, Math.max(0, item.shift)) : null;
    if (shiftValue !== null) {
      entry.style.setProperty("--sample-shift", `${shiftValue}%`);
    }
    if (item.alert) entry.classList.add("alert");

    const meta = document.createElement("div");
    meta.className = "log-meta";
    meta.innerHTML = `<span>${item.subject}</span><span>${item.ts}</span>`;

    const body = document.createElement("div");
    body.className = "log-text";
    body.textContent = item.text + (item.light ? "" : "\n");
    if (item.color === "orange") body.style.color = "#ffcb8a";
    if (item.color === "red") body.style.color = "#ff9bb0";
    entry.appendChild(meta);
    entry.appendChild(body);
    logListEl.appendChild(entry);
  });
  logListEl.scrollTop = logListEl.scrollHeight;
}

function addLog(text, light = false, alert = false, color = null, kind = null, shift = null) {
  const ts = time.format();
  const subjectId = currentSubject ? currentSubject.id : "——";
  const logItem = { ts, subject: subjectId, text, alert, light, color, kind, shift };

  logs.push(logItem);
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }
  if (alert) {
    alertLogs.push(logItem);
  }

  renderLogList(alertView ? alertLogs : logs);
  if (guideActive && guideStepIndex === 1 && (alert || text.includes("生命体征更新"))) {
    setGuideStep(guideStepIndex + 1);
  }
}

function addLogForSubject(subjectId, text, alert = false, color = null, kind = null, shift = null) {
  const ts = time.format();
  const logItem = { ts, subject: subjectId, text, alert, light: false, color, kind, shift };
  logs.push(logItem);
  if (logs.length > MAX_LOGS) logs.shift();
  if (alert) alertLogs.push(logItem);
  if (!alertView) {
    renderLogList(logs);
  } else {
    renderLogList(alertLogs);
  }
}

btnSample.addEventListener("click", () => {
  if (!currentSubject) {
    sysAlert("请先选择一个实验体。");
    return;
  }
  if (isSubjectLost(currentSubject)) {
    sysAlert("观测结果已丢失。");
    return;
  }
  if (samplePermits <= 0) {
    sysAlert("今日采集许可已用尽。");
    return;
  }

  if (!canSampleInCycle) {
    if (!btnSample.classList.contains("btn-cooldown")) {
      btnSample.classList.add("btn-cooldown");
      setTimeout(() => {
        btnSample.classList.remove("btn-cooldown");
      }, 500);
    }
    return;
  }
  triggerScanLine();
  
  canSampleInCycle = false; // Consume the sampling right for this cycle
  samplePermits = Math.max(0, samplePermits - 1);
  updateResourceUI();
  handleTestSequence("sample");

  const alertFlag = heartAlert || brainAlert;
  let rawInc = 0;
  if (heartAlert && brainAlert) {
    rawInc = parseFloat((5 + Math.random() * 10).toFixed(1));
  } else if (alertFlag) {
    rawInc = parseFloat((Math.random() * 10).toFixed(1));
  }
  let usedStabilizer = false;
  let effectiveInc = rawInc;
  if (rawInc > 0 && stabilizerArmed && stabilizerCount > 0) {
    usedStabilizer = true;
    stabilizerCount -= 1;
    stabilizerArmed = false;
    effectiveInc = 0;
  }

  const prevShift = currentShift;
  currentShift = Math.min(100, currentShift + effectiveInc);
  effectiveInc = currentShift - prevShift;
  currentSubject.shift = currentShift;
  vitalShiftFill.style.width = Math.min(currentShift, 100) + "%";
  vitalShiftText.textContent = currentShift.toFixed(1) + "%";
  updateLostOverlay();

  // If the subject is now lost, re-render the preview grid in the background
  if (isSubjectLost(currentSubject)) {
    renderPreviewGrid();
  }

  let researchGain = 0;
  if (effectiveInc > 0) {
    researchGain = parseFloat((effectiveInc * 0.1).toFixed(2));
    researchProgress = Math.min(100, parseFloat((researchProgress + researchGain).toFixed(2)));
  }
  updateResourceUI();

  const remark = getRemark(currentSubject, rawInc);
  const logLines = [`采集数据：${remark}`];
  if (usedStabilizer) {
    logLines.push("稳定剂生效：本次异化增长已被抵消。");
  }
  const logText = logLines.join("\n");

  addLog(
    logText,
    false,
    alertFlag,
    null,
    "sample",
    currentShift
  );
  if (guideActive) {
    if (guideStepIndex === 2) {
      setGuideStep(guideStepIndex + 1);
    } else if (guideStepIndex === 3) {
      setGuideStep(guideStepIndex + 1);
    }
  }
});

btnRandom.addEventListener("click", () => {
  if (!currentSubject) {
    sysAlert("请先选择一个实验体。");
    return;
  }
  if (isSubjectLost(currentSubject)) {
    sysAlert("观测结果已丢失。");
    return;
  }
  handleTestSequence("random");
  randomizeVitals();
  startEffectLoops();
});

btnAlertLog.addEventListener("click", () => {
  alertView = !alertView;
  btnAlertLog.textContent = alertView ? "返回监控日志" : "异常日志";
  renderLogList(alertView ? alertLogs : logs);
});

btnStabilizer?.addEventListener("click", () => {
  if (!currentSubject) {
    sysAlert("请先选择一个实验体。");
    return;
  }
  if (isSubjectLost(currentSubject)) {
    sysAlert("观测结果已丢失。");
    return;
  }
  if (stabilizerCount <= 0) {
    sysAlert("稳定剂已用尽。");
    return;
  }
  if (stabilizerArmed) return;
  stabilizerArmed = true;
  updateResourceUI();
  addLog("稳定剂已待命：下一次异化增长将被抵消。", true);
});

btnPreview.addEventListener("click", () => {
  showPreview();
  if (guideActive && guideStepIndex === 4) {
    endGuide();
  }
});

guidePrev?.addEventListener("click", () => {
  guidePrevStep();
});
guideNext?.addEventListener("click", () => {
  guideNextStep();
});
guideSkip?.addEventListener("click", () => {
  endGuide();
});

btnNextDay.addEventListener("click", () => {
  const { minutes } = time.getTime();
  if (minutes < NEXT_DAY_UNLOCK_MINUTES && samplePermits > 0) {
    sysAlert("需到 12:00 或耗尽采集许可后才能进入下一天。");
    return;
  }
  pendingDayChangeReason = "manual";
  time.nextDay();
  showPreview();
});



function shuffle(arr) {
  return arr
    .map(value => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}
function pickPaimonLine() {
  if (!paimonMessages || paimonMessages.length === 0) return "保持监控";
  const idx = Math.floor(Math.random() * paimonMessages.length);
  return paimonMessages[idx] || "保持监控";
}
function hasAnyRedStatus() {
  return subjects.some(s => s.dailyStatus?.color === "red");
}
function updatePaimonMessage(forceAlert = false) {
  if (!paimonWidget || !paimonMessageEl) return;
  const redSubjects = subjects.filter(s => s.dailyStatus?.color === "red");
  const alerting = forceAlert || redSubjects.length > 0;
  paimonWidget.classList.toggle("paimon-alert", alerting);
  const alertLine = redSubjects.length > 0
    ? `${redSubjects[0].id} 实验体有异常`
    : (paimonAlertText || "红色警告");
  const line = alerting ? alertLine : pickPaimonLine();
  paimonMessageEl.textContent = line;
  clampPaimonWithinView();
}

/**
 * 设置派蒙助手的位置 (相对于 .app 容器)
 * @param {number} x - 目标中心点 X 坐标 (相对于 .app 容器)
 * @param {number} y - 目标中心点 Y 坐标 (相对于 .app 容器)
 */
function setPaimonPosition(x, y) {
  if (!paimonWidget) return;
  const container = paimonWidget.offsetParent || document.body;
  const cw = container.clientWidth;
  const ch = container.clientHeight;
  
  const padding = 8;
  const gap = 4;
  const avatarW = paimonAvatar?.offsetWidth || 74;
  const avatarH = paimonAvatar?.offsetHeight || 74;
  const msgW = paimonMessageEl?.offsetWidth || 0;
  const msgH = paimonMessageEl?.offsetHeight || 32;
  const totalW = msgW + gap + avatarW;
  const totalH = Math.max(avatarH, msgH);

  // 1. 钳制锚点 (x, y) 必须在容器内安全区域
  const minX = padding + avatarW / 2;
  const maxX = cw - padding - avatarW / 2;
  const minY = padding + avatarH / 2;
  const maxY = ch - padding - avatarH / 2;
  
  const anchorX = Math.min(Math.max(minX, x), maxX);
  const anchorY = Math.min(Math.max(minY, y), maxY);

  // 2. 决定气泡显示在左侧还是右侧
  // 剩余空间计算
  const spaceRight = cw - (anchorX + avatarW / 2) - gap - padding;
  // const spaceLeft = anchorX - avatarW / 2 - gap - padding;
  
  // 默认尝试放右边，如果右边放不下且左边空间更多，则放左边
  // 但这里简单判定：右边不够就放左边
  let placeLeft = spaceRight < msgW;

  // 计算 Widget 左上角位置 (相对于容器)
  let widgetLeft;
  
  if (placeLeft) {
    widgetLeft = anchorX - avatarW / 2 - gap - msgW;
  } else {
    widgetLeft = anchorX - avatarW / 2; // Avatar 在左，Msg 在右，Widget 起始就是 Avatar 左边缘
  }
  
  // 垂直居中对齐锚点
  let widgetTop = anchorY - avatarH / 2;

  // 3. 再次钳制 Widget 整体不越界
  // 如果放左边还是越界左边缘
  if (widgetLeft < padding) {
      widgetLeft = padding;
      placeLeft = false; // 强制改回右边模式? 或者重叠显示
  }
  // 如果放右边越界右边缘
  if (widgetLeft + totalW > cw - padding) {
      widgetLeft = cw - padding - totalW;
  }
  
  widgetTop = Math.min(Math.max(padding, widgetTop), ch - padding - totalH);

  paimonWidget.classList.toggle("message-left", placeLeft);
  paimonWidget.classList.toggle("message-right", !placeLeft);

  paimonWidget.style.left = `${widgetLeft}px`;
  paimonWidget.style.top = `${widgetTop}px`;
  paimonWidget.style.right = "auto";
  paimonWidget.style.bottom = "auto";

  paimonPosition = { x: anchorX, y: anchorY };
}

function initPaimonPosition() {
  if (!paimonWidget) return;
  const container = paimonWidget.offsetParent || document.body;
  const cw = container.clientWidth;
  const ch = container.clientHeight;
  const avatarW = paimonAvatar?.offsetWidth || 74;
  const avatarH = paimonAvatar?.offsetHeight || 74;
  
  // 初始位置：容器右下角
  const startX = cw - 30 - avatarW / 2;
  const startY = ch - 30 - avatarH / 2;
  setPaimonPosition(startX, startY);
}

function clampPaimonWithinView() {
  if (paimonPosition.x === null || paimonPosition.y === null) return;
  setPaimonPosition(paimonPosition.x, paimonPosition.y);
}

function startPaimonDrag(e) {
  if (!paimonWidget) return;
  // 获取容器偏移
  const container = paimonWidget.offsetParent || document.body;
  const rect = container.getBoundingClientRect();
  
  // 计算当前鼠标在容器内的相对坐标
  const mouseInContainerX = e.clientX - rect.left;
  const mouseInContainerY = e.clientY - rect.top;

  paimonDrag = {
    active: true,
    pointerId: e.pointerId,
    // 记录鼠标相对于当前锚点的偏移
    offsetX: mouseInContainerX - (paimonPosition.x ?? 0),
    offsetY: mouseInContainerY - (paimonPosition.y ?? 0)
  };
  paimonWidget.classList.add("is-dragging");
  paimonWidget.setPointerCapture(e.pointerId);
}

function movePaimon(e) {
  if (!paimonDrag.active || (paimonDrag.pointerId !== null && e.pointerId !== paimonDrag.pointerId)) return;
  
  const container = paimonWidget.offsetParent || document.body;
  const rect = container.getBoundingClientRect();
  const mouseInContainerX = e.clientX - rect.left;
  const mouseInContainerY = e.clientY - rect.top;

  setPaimonPosition(mouseInContainerX - paimonDrag.offsetX, mouseInContainerY - paimonDrag.offsetY);
}

function endPaimonDrag(e) {
  if (!paimonDrag.active || (paimonDrag.pointerId !== null && e.pointerId !== paimonDrag.pointerId)) return;
  paimonDrag = { active: false, pointerId: null, offsetX: 0, offsetY: 0 };
  paimonWidget.classList.remove("is-dragging");
  clampPaimonWithinView();
  if (e.pointerId !== undefined) {
    paimonWidget.releasePointerCapture(e.pointerId);
  }
}

function initPaimonAssistant() {
  if (!paimonWidget) return;
  initPaimonPosition();
  // Expose reset function globally for login transition
  window.resetPaimonWidget = initPaimonPosition;
  
  paimonWidget.addEventListener("pointerdown", startPaimonDrag);
  window.addEventListener("pointermove", movePaimon);
  window.addEventListener("pointerup", endPaimonDrag);
  // Resize logic might need adjustment if container size changes, 
  // but for fixed 1200x900 app, it's less critical unless window resize affects scale.
  // We keep it to re-clamp just in case.
  window.addEventListener("resize", clampPaimonWithinView);
  updatePaimonMessage();
}
function refillQueue(color) {
  dailyQueues[color] = shuffle(dailyPools[color]);
}
function drawStatus(color) {
  if (!dailyQueues[color] || dailyQueues[color].length === 0) {
    refillQueue(color);
  }
  return dailyQueues[color].shift();
}
function refillRemarkQueue(subject, level) {
  if (!subject || !subject.remarks || !subject.remarks[level]) {
    subject.remarkQueues[level] = [];
    return;
  }
  subject.remarkQueues[level] = shuffle([...subject.remarks[level]]);
}

function getRemark(subject, inc) {
  if (!subject) return "未能获取备注：未选择实验体。";

  let level = 'low';
  if (inc > 7) {
    level = 'high';
  } else if (inc > 3) {
    level = 'medium';
  } else if (inc <= 0) {
    // No shift, no special remark
    return "数据采集中... 未见明显行为特征。";
  }

  if (!subject.remarkQueues || !subject.remarkQueues[level] || subject.remarkQueues[level].length === 0) {
    refillRemarkQueue(subject, level);
  }

  const queue = subject.remarkQueues[level];
  if (queue.length === 0) {
    return "传感器数据无明显异常特征。";
  }

  return queue.shift();
}

function rollColor() {
  const r = Math.random();
  if (r < 0.7) return "white";
  if (r < 0.9) return "orange";
  return "red";
}
function assignDailyStatuses(logNow = true) {
  subjects.forEach(s => {
    const color = rollColor();
    const text = drawStatus(color);
    s.dailyStatus = { color, text };
    if (isSubjectLost(s)) return;
    if (currentSubject && currentSubject.id === s.id) {
      updateDailyStatusUI();
    }
    if (logNow) {
      const alertFlag = color === "red";
      addLogForSubject(s.id, `日常状态：${text}`, alertFlag, color);
    }
  });
  updatePreviewStatusColors();
  updatePaimonMessage();
}
function updateDailyStatusUI() {
  if (!currentSubject) return;
  if (isSubjectLost(currentSubject)) {
    infoNoteEl.textContent = "已丢失观测结果";
    infoNoteEl.style.color = statusColors.red;
    return;
  }
  const status = currentSubject.dailyStatus;
  const desc = status ? status.text : "未记录。";
  infoNoteEl.textContent = desc;
  infoNoteEl.style.color = statusColors[status?.color] || defaultInfoColor;
}

function handleTestSequence(action) {
  const seq = ["sample", "sample", "random", "random", "random", "sample"];
  if (action === seq[testSeq.step]) {
    testSeq.step += 1;
    if (testSeq.step >= seq.length) {
      if (currentSubject) {
        currentShift = 100;
        currentSubject.shift = 100;
        vitalShiftFill.style.width = "100%";
        vitalShiftText.textContent = "100.0%";
        updateLostOverlay();
        addLog("测试触发：快速置满异化进度至 100%。", true, true);
        updateDailyStatusUI();
      }
      testSeq.step = 0;
    }
  } else {
    testSeq.step = action === "sample" ? 1 : 0;
  }
}

function updateLostOverlay() {
  const lost = currentSubject && currentShift >= 100;
  if (lostOverlay) {
    lostOverlay.classList.toggle("active", !!lost);
  }
  if (lost) {
    clearTimeout(staticEffectTimer);
    // Stop animations when lost
    startEffectLoops(); 
  }
  if (guideActive && guideStepIndex === 3 && lost) {
    setGuideStep(guideStepIndex + 1);
  }
}

function renderPreviewGrid() {
  previewGrid.innerHTML = "";
  subjects.forEach((s, index) => {
    const card = document.createElement("div");
    card.className = "preview-card";
    card.dataset.id = s.id;
    card.innerHTML = `
      <div class="preview-mini">
        <div class="preview-scan"></div>
        <div class="preview-noise"></div>
        <img class="preview-bg" src="${s.image}" alt="${s.name}" />
      </div>
      <div class="preview-meta-row">
        <div class="preview-meta">
          <div class="preview-id">${s.id}</div>
          <div class="preview-name">${s.name}</div>
        </div>
        <div class="preview-bars">
          <div class="preview-bar"><div class="preview-bar-fill" data-type="heart"></div></div>
          <div class="preview-bar"><div class="preview-bar-fill" data-type="brain"></div></div>
          <div class="preview-bar"><div class="preview-bar-fill" data-type="shift"></div></div>
        </div>
      </div>
    `;

    if (isSubjectLost(s)) {
      card.classList.add("is-lost");
    } else {
      card.addEventListener("click", () => selectSubject(index));
    }

    previewGrid.appendChild(card);
    applyPreviewCardStatus(card, s.dailyStatus);
    applyPreviewVitals(s, card);
  });
  const placeholder = document.createElement("div");
  placeholder.className = "preview-card preview-empty";
  placeholder.innerHTML = `<div class="preview-meta">备用遮蔽舱<br>待分配实验体</div>`;
  previewGrid.appendChild(placeholder);
  startPreviewMotion();
}

function applyPreviewCardStatus(card, status) {
  if (status && statusColors[status.color]) {
    const color = statusColors[status.color];
    card.style.borderColor = color;
    card.style.boxShadow = `0 0 10px ${color}b3`;
  } else {
    card.style.borderColor = "";
    card.style.boxShadow = "";
  }
}

function updatePreviewStatusColors() {
  const cards = previewGrid.querySelectorAll(".preview-card[data-id]");
  cards.forEach(card => {
    const subj = subjects.find(s => s.id === card.dataset.id);
    applyPreviewCardStatus(card, subj?.dailyStatus);
    applyPreviewVitals(subj, card);
  });
}

function showPreview() {
  currentSubject = null;
  previewMotionHandles.forEach(h => clearTimeout(h));
  previewMotionHandles = [];
  clearInterval(vitalsTimer);
  vitalsTimer = null;
  clearInterval(previewVitalsTimer);
  previewVitalsTimer = setInterval(randomizePreviewVitals, 5000);
  randomizePreviewVitals();
  clearTimeout(staticEffectTimer);
  previewGrid.style.display = "grid";
  silhouetteEl.style.display = "none";
  silhouetteEl.classList.remove('is-animating'); // Stop animation
  lostOverlay.classList.remove('active');
  if (waveformPanel) waveformPanel.style.display = "none";
  if (hudFramesEl) hudFramesEl.innerHTML = "";
  headerStatusEl.textContent = "当前实验体：——";
  monitorSubtitleEl.textContent = "选择实验舱开始监控。";
  if (typeof screenFooterLeft !== "undefined" && screenFooterLeft) screenFooterLeft.textContent = "";
  if (typeof screenFooterRight !== "undefined" && screenFooterRight) screenFooterRight.textContent = "";
  infoIdEl.textContent = "——";
  infoSpeciesEl.textContent = "物种：——";
  infoStageEl.textContent = "未监控";
  infoRiskEl.textContent = "风险：——";
  infoNoteEl.textContent = "选择实验体后，将在此显示当日状态。";
  infoNoteEl.style.color = defaultInfoColor;
  vitalHeartFill.style.width = "0%";
  vitalBrainFill.style.width = "0%";
  vitalShiftFill.style.width = "0%";
  vitalHeartText.textContent = "——";
  vitalBrainText.textContent = "——";
  vitalShiftText.textContent = "0%";
  updateWaveforms(null, null);
  updatePreviewStatusColors();
  startPreviewMotion();
}

function startEffectLoops() {
  // Controls the silhouette's own smooth animation
  if (currentSubject && !isSubjectLost(currentSubject)) {
    silhouetteEl.classList.add('is-animating');
  } else {
    silhouetteEl.classList.remove('is-animating');
  }
  // Separately, starts the intermittent screen static effect
  startStaticEffectLoop();
}

function startStaticEffectLoop() {
  clearTimeout(staticEffectTimer);
  if (!currentSubject || isSubjectLost(currentSubject)) {
    return;
  }

  const loop = () => {
    const nextInterval = 2000 + Math.random() * 3000; // Loop every 2-5 seconds
    staticEffectTimer = setTimeout(() => {
      if (Math.random() < 0.3) { // 30% chance to show static
        const duration = 150 + Math.random() * 250; // For 150-400ms
        monitorScreenEl.classList.add('has-static');
        setTimeout(() => {
          monitorScreenEl.classList.remove('has-static');
        }, duration);
      }
      loop(); // Schedule the next check
    }, nextInterval);
  };

  loop(); // Start the loop
}

function triggerScanLine() {
  if (!scanLineEl) return;
  scanLineEl.classList.remove("scan-once");
  void scanLineEl.offsetWidth; // force reflow to restart animation
  scanLineEl.classList.add("scan-once");
}

function startPreviewMotion() {
  const minis = previewGrid.querySelectorAll(".preview-mini");
  const motions = ["preview-motion-approach", "preview-motion-retreat", "preview-motion-pace"];
  minis.forEach(mini => mini.classList.remove(...motions));
  const run = () => {
    minis.forEach(mini => {
      motions.forEach(m => mini.classList.remove(m));
      const m = motions[Math.floor(Math.random() * motions.length)];
      const delay = Math.random() * 1200;
      const handle = setTimeout(() => {
        mini.style.animationDelay = `${(-Math.random() * 2).toFixed(2)}s`;
        mini.classList.add(m);
      }, delay);
      previewMotionHandles.push(handle);
    });
  };
  run();
}

function applyPreviewVitals(subj, cardEl) {
  if (!subj) return;
  const card = cardEl || previewGrid.querySelector(`.preview-card[data-id="${subj.id}"]`);
  if (!card) return;
  const heartFill = card.querySelector('.preview-bar-fill[data-type="heart"]');
  const brainFill = card.querySelector('.preview-bar-fill[data-type="brain"]');
  const shiftFill = card.querySelector('.preview-bar-fill[data-type="shift"]');
  if (heartFill) {
    heartFill.style.width = `${Math.min(100, Math.max(0, (subj.lastHeart || 0) / 2))}%`;
    heartFill.classList.toggle("alert", !!subj.lastHeartAlert);
  }
  if (brainFill) {
    brainFill.style.width = `${Math.min(100, Math.max(0, subj.lastBrain || 0))}%`;
    brainFill.classList.toggle("alert", !!subj.lastBrainAlert);
  }
  if (shiftFill) shiftFill.style.width = `${Math.min(100, Math.max(0, subj.shift || 0))}%`;
}

function randomizePreviewVitals() {
  const ranges = {
    "S-01": { heart: [120, 170], brain: [55, 82] },
    "S-07": { heart: [90, 135], brain: [60, 90] },
    "S-13": { heart: [60, 110], brain: [50, 85] }
  };
  subjects.forEach(subj => {
    if (isSubjectLost(subj)) return;
    const { heart: [hMin, hMax], brain: [bMin, bMax] } = ranges[subj.id] || { heart: [70, 120], brain: [50, 90] };
    const hr = Math.round(hMin + Math.random() * (hMax - hMin));
    const brain = Math.round(bMin + Math.random() * (bMax - bMin));
    subj.lastHeart = hr;
    subj.lastBrain = brain;
    subj.lastHeartAlert = hr > hMax;
    subj.lastBrainAlert = brain > bMax;
    applyPreviewVitals(subj);
  });
}

function renderHudFrames(subjectId) {
  if (!hudFramesEl) return;
  hudFramesEl.innerHTML = "";
  const frames = hudFrames[subjectId];
  if (!frames || !Array.isArray(frames)) return;
  const containerRect = hudFramesEl.getBoundingClientRect();
  const defaultOffset = { x: 70, y: -40 };
  frames.forEach(frame => {
    const item = document.createElement("div");
    item.className = "hud-item";
    const topPercent = parseFloat(frame.pos?.top || "50") / 100;
    const leftPercent = parseFloat(frame.pos?.left || "50") / 100;
    const pinY = containerRect.height * topPercent;
    const pinX = containerRect.width * leftPercent;
    const offset = frame.offset || defaultOffset;
    const boxX = pinX + (offset.x || 0);
    const boxY = pinY + (offset.y || 0);

    const pin = document.createElement("div");
    pin.className = "hud-pin";
    pin.style.top = `${pinY}px`;
    pin.style.left = `${pinX}px`;

    const box = document.createElement("div");
    box.className = "hud-box";
    box.style.top = `${boxY}px`;
    box.style.left = `${boxX}px`;
    box.innerHTML = `
      <div class="hud-frame-label">[${frame.label}]</div>
      <div class="hud-frame-stat">${frame.stat}：<span>${frame.value}</span></div>
    `;

    const connector = document.createElement("div");
    connector.className = "hud-connector";
    // compute connector geometry
    const dx = boxX - pinX;
    const dy = boxY - pinY;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    connector.style.width = `${length}px`;
    connector.style.transform = `translate(${pinX}px, ${pinY}px) rotate(${angle}deg)`;

    item.appendChild(connector);
    item.appendChild(pin);
    item.appendChild(box);
    hudFramesEl.appendChild(item);

    if (hudDebug) {
      enableHudDrag(item, frame);
    }
  });
}

function enableHudDrag(itemEl, frame) {
  const containerRect = hudFramesEl.getBoundingClientRect();
  const pin = itemEl.querySelector(".hud-pin");
  const box = itemEl.querySelector(".hud-box");
  const connector = itemEl.querySelector(".hud-connector");
  if (!pin || !box || !connector) return;

  const attachDrag = (el, type) => {
    el.addEventListener("mousedown", ev => {
      if (!hudDebug) return;
      ev.preventDefault();
      const startX = ev.clientX;
      const startY = ev.clientY;
      const startPinX = parseFloat(pin.style.left);
      const startPinY = parseFloat(pin.style.top);
      const startBoxX = parseFloat(box.style.left);
      const startBoxY = parseFloat(box.style.top);

      const onMove = e => {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        let pinX = startPinX;
        let pinY = startPinY;
        let boxX = startBoxX;
        let boxY = startBoxY;
        if (type === "pin") {
          pinX = Math.max(0, Math.min(containerRect.width, startPinX + dx));
          pinY = Math.max(0, Math.min(containerRect.height, startPinY + dy));
          boxX = pinX + (frame.offset?.x || 0);
          boxY = pinY + (frame.offset?.y || 0);
        } else {
          boxX = startBoxX + dx;
          boxY = startBoxY + dy;
          frame.offset = {
            x: boxX - pinX,
            y: boxY - pinY
          };
        }
        updateHudPositions(pin, box, connector, frame, pinX, pinY, boxX, boxY, containerRect);
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        logHudFrames(currentSubject?.id);
        renderHudFrames(currentSubject?.id);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  };

  attachDrag(pin, "pin");
  attachDrag(box, "box");
}

function updateHudPositions(pin, box, connector, frame, pinX, pinY, boxX, boxY, containerRect) {
  const posTop = Math.max(0, Math.min(100, (pinY / containerRect.height) * 100));
  const posLeft = Math.max(0, Math.min(100, (pinX / containerRect.width) * 100));
  frame.pos = { top: `${posTop.toFixed(1)}%`, left: `${posLeft.toFixed(1)}%` };
  if (!frame.offset) frame.offset = { x: 0, y: 0 };
  frame.offset.x = boxX - pinX;
  frame.offset.y = boxY - pinY;

  pin.style.top = `${pinY}px`;
  pin.style.left = `${pinX}px`;
  box.style.top = `${boxX}px`;
  box.style.left = `${boxY}px`;

  const dx = boxX - pinX;
  const dy = boxY - pinY;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  connector.style.width = `${length}px`;
  connector.style.transform = `translate(${pinX}px, ${pinY}px) rotate(${angle}deg)`;
}

function logHudFrames(subjectId) {
  if (!subjectId) return;
  const frames = hudFrames[subjectId];
  if (!frames) return;
  const snippet = `${JSON.stringify(frames, null, 2)}`;
  console.log(`[HUD frames] ${subjectId}:`, snippet);
}

// 新手教程
const guideSteps = [
  {
    title: "STEP 1 · 选择实验体",
    text: "先从左侧列表点选一个实验体，进入监控。",
    target: () => subjectListEl
  },
  {
    title: "STEP 2 · 等待异常",
    text: "关注生命体征，心率/脑电出现红色时采集更易提升异化。\n也可以点击“刷新生命体征”加速触发。",
    target: () => document.querySelector(".vitals")
  },
  {
    title: "STEP 3 · 采集数据",
    text: "出现异常后点击“采集数据”，可让异化进度提升。",
    target: () => btnSample
  },
  {
    title: "STEP 4 · 异化进度",
    text: "继续等待异常并采集，直至异化达到 100% 将失去监控。",
    target: () => document.querySelector(".vital-row-shift") || document.querySelector(".vitals")
  },
  {
    title: "STEP 5 · 返回预览",
    text: "可随时用“快捷预览”返回舱位总览，舱框颜色同步当日状态。",
    target: () => btnPreview
  }
];
let guideHighlight = null;

function startGuide() {
  guideActive = true;
  guideStepIndex = 0;
  if (guideMask) guideMask.hidden = false;
  ensureHighlight();
  setGuideStep(0);
}

function endGuide() {
  guideActive = false;
  guideStepIndex = 0;
  if (guideMask) guideMask.hidden = true;
  if (guideHighlight) guideHighlight.remove();
}

function guideNextStep() {
  if (!guideActive) return;
  if (guideStepIndex >= guideSteps.length - 1) {
    endGuide();
  } else {
    setGuideStep(guideStepIndex + 1);
  }
}

function guidePrevStep() {
  if (!guideActive) return;
  setGuideStep(guideStepIndex - 1);
}

function ensureHighlight() {
  if (guideHighlight) return;
  guideHighlight = document.createElement("div");
  guideHighlight.className = "guide-highlight";
  guideMask?.appendChild(guideHighlight);
}

function setGuideStep(step) {
  if (!guideActive) return;
  guideStepIndex = Math.max(0, Math.min(step, guideSteps.length - 1));
  const cfg = guideSteps[guideStepIndex];
  const target = cfg.target?.();
  guideStepText.textContent = cfg.title;
  guideBodyText.textContent = cfg.text;
  guidePrev.disabled = guideStepIndex === 0;
  guideNext.textContent = guideStepIndex === guideSteps.length - 1 ? "完成" : "下一步";
  guidePrev.style.display = "inline-flex";
  guideNext.style.display = guideStepIndex === guideSteps.length - 1 ? "inline-flex" : "inline-flex";
  guideSkip.style.display = guideStepIndex === guideSteps.length - 1 ? "none" : "inline-flex";

  if (target && guideHighlight) {
    let rect = target.getBoundingClientRect();
    // 针对 Step 2/4 仅高亮生命体征区域（心率/脑电/异化）
    if ((guideStepIndex === 1 || guideStepIndex === 3) && target === document.querySelector(".vitals")) {
      const bars = document.querySelector(".vitals");
      if (bars) rect = bars.getBoundingClientRect();
    }
    guideHighlight.style.top = `${rect.top - 6 + window.scrollY}px`;
    guideHighlight.style.left = `${rect.left - 6 + window.scrollX}px`;
    guideHighlight.style.width = `${rect.width + 12}px`;
    guideHighlight.style.height = `${rect.height + 12}px`;
    guideHighlight.style.display = "block";
    const r = Math.max(rect.width, rect.height) / 2 + 16;
    const cx = rect.left + rect.width / 2 + window.scrollX;
    const cy = rect.top + rect.height / 2 + window.scrollY;
    guideOverlay?.style.setProperty("--guide-hole-x", `${cx}px`);
    guideOverlay?.style.setProperty("--guide-hole-y", `${cy}px`);
    guideOverlay?.style.setProperty("--guide-hole-r", `${r}px`);
  } else if (guideHighlight) {
    guideHighlight.style.display = "none";
    guideOverlay?.style.removeProperty("--guide-hole-x");
    guideOverlay?.style.removeProperty("--guide-hole-y");
    guideOverlay?.style.removeProperty("--guide-hole-r");
  }
}
renderSubjectList();
renderPreviewGrid();
showPreview();
initPaimonAssistant();
assignDailyStatuses(true);
updateResourceUI();
updateNextDayButtonState();
time.start();
addLog("系统启动：展示实验舱预览，等待选择实验体。");
startGuide();

/* ---
  COMBAT SYSTEM INTEGRATION
--- */
initPlayerSubjects(); // Initialize user data

const btnCombatEntry = document.getElementById('btn-combat-entry');
const combatOverlay = document.getElementById('combat-overlay');
const btnCombatExit = document.getElementById('btn-combat-exit');
let currentCombat = null;

if (btnCombatEntry) {
    btnCombatEntry.addEventListener('click', () => {
        startCombatEncounter();
    });
}

if (btnCombatExit) {
    btnCombatExit.addEventListener('click', () => {
        if (currentCombat && currentCombat.state !== 'END_WIN' && currentCombat.state !== 'END_LOSS') {
             sysConfirm("战斗正在进行中，断开连接将被视为逃跑。确定吗？", () => {
            combatOverlay.classList.add('hidden');
            currentCombat = null;
        });
        return;
        }
        combatOverlay.classList.add('hidden');
        currentCombat = null;
    });
}

function startCombatEncounter() {
    combatOverlay.classList.remove('hidden');
    
    // 1. Pick Player Subject (First one for now)
    const players = getPlayerSubjects();
    const playerSubj = players[0]; // Default to first slot
    
    // Ensure full HP for demo if dead (optional logic, maybe remove later)
    if (playerSubj.currentHp <= 0) playerSubj.currentHp = playerSubj.getMaxHp(); 

    // 2. Pick Random Enemy
    const pool = getEnemyPool();
    const enemyTemplate = pool[Math.floor(Math.random() * pool.length)];
    const enemySubj = new SubjectInstance(enemyTemplate.id);
    
    // 3. Init Session
    const logEl = document.getElementById('combat-log');
    const skillPanel = document.getElementById('skill-panel');
    
    logEl.innerHTML = ''; // Clear log
    skillPanel.innerHTML = ''; // Clear skills
    
    const appendLog = (text) => {
        const div = document.createElement('div');
        div.className = 'log-line';
        div.textContent = text;
        logEl.appendChild(div);
        logEl.scrollTop = logEl.scrollHeight;
    };
    
    const updateUI = () => {
        renderCombatUI(currentCombat);
    };
    
    currentCombat = new CombatSession(playerSubj, enemySubj, appendLog, updateUI);
    
    // Render Skills
    const skills = playerSubj.getSkills();
    skills.forEach(skillId => {
        const skill = SKILL_DB[skillId];
        if (!skill) return;
        
        const btn = document.createElement('button');
        btn.className = 'btn-skill';
        btn.innerHTML = `<span>${skill.name}</span> <span class=skill-cost>ACT</span>`;
        btn.onclick = () => {
            currentCombat.playerAction(skillId);
        };
        skillPanel.appendChild(btn);
    });
    
    currentCombat.start();
}

function renderCombatUI(session) {
    if (!session) return;
    
    // Enemy
    const eName = document.getElementById('enemy-name');
    if (eName) eName.textContent = `${session.enemy.getName()} [${ELEMENT_NAMES[session.enemy.element]}]`;
    
    const eHp = session.enemy.currentHp;
    const eMax = session.enemy.getMaxHp();
    const eHpText = document.getElementById('enemy-hp-text');
    const eHpBar = document.getElementById('enemy-hp-bar');
    if (eHpText) eHpText.textContent = `${eHp}/${eMax}`;
    if (eHpBar) eHpBar.style.width = `${(eHp/eMax)*100}%`;
    
    // Player
    const pName = document.getElementById('player-name');
    if (pName) pName.textContent = `${session.player.getName()} [${ELEMENT_NAMES[session.player.element]}]`;
    
    const pHp = session.player.currentHp;
    const pMax = session.player.getMaxHp();
    const pHpText = document.getElementById('player-hp-text');
    const pHpBar = document.getElementById('player-hp-bar');
    if (pHpText) pHpText.textContent = `${pHp}/${pMax}`;
    if (pHpBar) pHpBar.style.width = `${(pHp/pMax)*100}%`;
    
    // Disable buttons if not player turn or game over
    const btns = document.querySelectorAll('.btn-skill');
    const locked = session.state !== 'PLAYER_ACT';
    btns.forEach(btn => {
        btn.disabled = locked;
    });
}

/* ---
  MANAGEMENT UI & ANIMATION HANDLERS
--- */
const btnOpenManage = document.getElementById('btn-open-management');
const btnCloseManage = document.getElementById('btn-close-management');
const manageOverlay = document.getElementById('management-overlay');
const manageList = document.getElementById('management-list');

if (btnOpenManage) {
    btnOpenManage.addEventListener('click', () => {
        renderManagementUI();
        manageOverlay.classList.remove('hidden');
    });
}

if (btnCloseManage) {
    btnCloseManage.addEventListener('click', () => {
        manageOverlay.classList.add('hidden');
    });
}

function renderManagementUI() {
    manageList.innerHTML = '';
    const players = getPlayerSubjects();
    
    players.forEach(subj => {
        const item = document.createElement('div');
        item.className = 'manage-item';
        
        const form = subj.getCurrentForm();
        const maxXp = form.xpMax;
        const xpPercent = maxXp > 0 ? (subj.xp / maxXp * 100).toFixed(1) : 100;
        
        const skillsContainer = document.createElement('div');
        skillsContainer.className = 'manage-skills';
        
        subj.getSkills().forEach(sid => {
            const skill = SKILL_DB[sid];
            if(skill) {
                const tag = document.createElement('span');
                tag.className = 'skill-tag';
                tag.textContent = skill.name;
                tag.title = skill.desc;
                tag.style.cursor = 'pointer';
                tag.onclick = () => sysAlert(`【${skill.name}】\n${skill.desc}`);
                skillsContainer.appendChild(tag);
            }
        });

        item.innerHTML = `
            <div class="manage-info">
                <div class="manage-name">${subj.getName()} <span style="font-size:12px;color:#8b949e">[${ELEMENT_NAMES[subj.element]}]</span></div>
                <div class="manage-stat">形态: ${subj.formIndex + 1} / ${subj.getTemplate().forms.length}</div>
                <div class="manage-stat">HP: ${subj.currentHp} / ${subj.getMaxHp()}</div>
                <div class="manage-stat">XP: ${subj.xp} / ${maxXp || 'MAX'} (${xpPercent}%)</div>
            </div>
        `;
        item.querySelector('.manage-info').appendChild(skillsContainer);
        manageList.appendChild(item);
    });
}

// 覆写 startCombatEncounter 以支持回调和所有技能
window.startCombatEncounter = function() {
    combatOverlay.classList.remove('hidden');
    
    const players = getPlayerSubjects();
    const playerSubj = players[0]; 
    if (playerSubj.currentHp <= 0) playerSubj.currentHp = playerSubj.getMaxHp(); 

    const pool = getEnemyPool();
    const enemyTemplate = pool[Math.floor(Math.random() * pool.length)];
    const enemySubj = new SubjectInstance(enemyTemplate.id);
    
    const logEl = document.getElementById('combat-log');
    const skillPanel = document.getElementById('skill-panel');
    
    logEl.innerHTML = ''; 
    skillPanel.innerHTML = ''; 
    
    const appendLog = (text) => {
        const div = document.createElement('div');
        div.className = 'log-line';
        div.textContent = text;
        logEl.appendChild(div);
        logEl.scrollTop = logEl.scrollHeight;
    };
    
    const updateUI = () => {
        renderCombatUI(currentCombat);
    };
    
    // Animation Handler
    const handleEvent = async (type, data) => {
        if (type === 'coin_toss_start') {
            // Show overlay
            let coin = document.querySelector('.coin-overlay');
            if (!coin) {
                coin = document.createElement('div');
                coin.className = 'coin-overlay';
                coin.innerHTML = '<div class="coin flipping">?</div>';
                document.querySelector('.combat-terminal').appendChild(coin);
            }
            await new Promise(r => setTimeout(r, 1500));
            coin.remove();
        }
        if (type === 'coin_toss_result') {
             // Optional: Show result coin
        }
        if (type === 'damage' || type === 'heal') {
            const targetEl = data.target === 'player' ? document.querySelector('.player .unit-sprite') : document.querySelector('.enemy .unit-sprite');
            if (targetEl) {
                const float = document.createElement('div');
                float.className = `damage-text ${type === 'heal' ? 'heal' : ''}`;
                float.textContent = data.val;
                float.style.left = '50%';
                float.style.top = '0';
                targetEl.appendChild(float);
                setTimeout(() => float.remove(), 1000);
            }
        }
    };
    
    currentCombat = new CombatSession(playerSubj, enemySubj, appendLog, updateUI, handleEvent);
    
    // Render ALL Skills
    const skills = playerSubj.getSkills();
    skills.forEach(skillId => {
        const skill = SKILL_DB[skillId];
        if (!skill) return;
        
        const btn = document.createElement('button');
        btn.className = 'btn-skill';
        
        btn.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:flex-start;">
                <span style="font-weight:bold">${skill.name}</span>
                <span style="font-size:10px;color:#8b949e">${skill.desc}</span>
            </div>
        `;
        btn.onclick = () => {
            currentCombat.playerAction(skillId);
        };
        skillPanel.appendChild(btn);
    });
    
    currentCombat.start();
};

// Hook into renderSubjectList to sync names
// Use a flag to prevent infinite recursion if we call it immediately
if (typeof originalRenderSubjectList === 'undefined') {
    window.originalRenderSubjectList = renderSubjectList; // Backup
}

renderSubjectList = function() {
    subjectListEl.innerHTML = "";
    const players = getPlayerSubjects();
    
    subjects.forEach((s, index) => {
        // Try find combat instance
        const combatInst = players.find(p => p.templateId === s.id);
        const displayName = combatInst ? combatInst.getName() : s.name;
        
        const item = document.createElement("div");
        item.className = "subject-item";
        item.dataset.id = s.id;
        item.innerHTML = `
          <div class="subject-id">${s.id}</div>
          <div class="subject-name">${displayName}</div>
          <div class="subject-meta">RW 注射：${s.rwDuration}</div>
        `;
        item.addEventListener("click", () => selectSubject(index));
        subjectListEl.appendChild(item);
    });
};
// Re-render immediately to apply name sync
renderSubjectList();

/* ---
  SYSTEM MODAL
--- */
const modalEl = document.getElementById('system-modal');
const modalTitle = document.getElementById('modal-title');
const modalText = document.getElementById('modal-text');
const btnModalConfirm = document.getElementById('modal-btn-confirm');
const btnModalCancel = document.getElementById('modal-btn-cancel');

function showModal(text, isConfirm = false, onConfirm = null) {
    if (!modalEl) return;
    modalText.textContent = text;
    modalTitle.textContent = isConfirm ? '系统确认' : '系统提示';
    
    if (isConfirm) {
        btnModalCancel.classList.remove('hidden');
    } else {
        btnModalCancel.classList.add('hidden');
    }
    
    // Cleanup old listeners by cloning
    const oldConfirm = document.getElementById('modal-btn-confirm');
    const newConfirm = oldConfirm.cloneNode(true);
    oldConfirm.parentNode.replaceChild(newConfirm, oldConfirm);
    
    const oldCancel = document.getElementById('modal-btn-cancel');
    const newCancel = oldCancel.cloneNode(true);
    oldCancel.parentNode.replaceChild(newCancel, oldCancel);
    
    newConfirm.onclick = () => {
        modalEl.classList.add('hidden');
        if (onConfirm) onConfirm();
    };
    
    newCancel.onclick = () => {
        modalEl.classList.add('hidden');
    };
    
    modalEl.classList.remove('hidden');
}

window.sysAlert = (text) => showModal(text, false);
window.sysConfirm = (text, callback) => showModal(text, true, callback);
