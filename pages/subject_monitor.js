import { createTimeSystem } from "../modules/time.js";
import { subjects as subjectSeed, dailyPools } from "../data/subjects.js";

const subjects = subjectSeed.map(s => ({ ...s }));
let currentSubject = null;

// DOM 引用
const subjectListEl = document.getElementById("subject-list");
const headerStatusEl = document.getElementById("header-status");
const monitorSubtitleEl = document.getElementById("monitor-subtitle");
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
const silhouetteEl = document.getElementById("silhouette");
const silhouetteImg = document.getElementById("silhouette-img");
const previewGrid = document.getElementById("preview-grid");
const btnAlertLog = document.getElementById("btn-alert-log");
const timeDisplay = document.getElementById("time-display");
const btnNextDay = document.getElementById("btn-next-day");
const lostOverlay = document.getElementById("lost-overlay");

const MAX_LOGS = 18;
const SAMPLE_COOLDOWN = 5000;
let motionTimer = null;
let previewMotionHandles = [];
let vitalsTimer = null;
let currentShift = 0;
let heartAlert = false;
let brainAlert = false;
const alertLogs = [];
const logs = [];
let alertView = false;
let lastSampleTs = 0;
let pendingDayChangeReason = "auto";
const dailyQueues = { white: [], orange: [], red: [] };
const testSeq = { step: 0 };
const statusColors = { white: "#91a2f0", orange: "#ffcb8a", red: "#ff9bb0" };
const defaultInfoColor = "#91a2f0";
const defaultPreviewStageColor = "#9bdfff";

const time = createTimeSystem({
  onTick: updateTimeDisplay,
  onDayChange: () => handleDayChange(pendingDayChangeReason)
});

function updateTimeDisplay() {
  if (timeDisplay) timeDisplay.textContent = time.format();
}

function handleDayChange(reason) {
  pendingDayChangeReason = "auto";
  logs.length = 0;
  alertLogs.length = 0;
  renderLogList([]);
  assignDailyStatuses(true);
  const prefix = reason === "manual" ? "时间跳转到" : "时间推进到";
  addLog(`${prefix} ${time.format()}。`, true);
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
  currentShift = currentSubject.shift || 0;
  heartAlert = false;
  brainAlert = false;
  document.querySelectorAll(".subject-item").forEach((el, i) => {
    el.classList.toggle("active", i === idx);
  });

  headerStatusEl.textContent = `当前实验体：${currentSubject.id} / ${currentSubject.name}`;
  monitorSubtitleEl.textContent = "遮蔽舱联机中… 已锁定当前实验体。";
  screenFooterLeft.textContent = `状态：${currentSubject.stage}`;
  screenFooterRight.textContent = `RW 注射时长：${currentSubject.rwDuration}`;

  infoIdEl.textContent = currentSubject.id;
  infoSpeciesEl.textContent = `物种：${currentSubject.species}`;
  infoStageEl.textContent = currentSubject.stage;
  infoRiskEl.textContent = `风险：${currentSubject.risk}`;
  updateDailyStatusUI();
  updateLostOverlay();

  setSilhouetteAppearance(currentSubject.id);

  randomizeVitals(true);
  vitalsTimer = setInterval(() => randomizeVitals(), 5000);
  addLog(`切换监控目标为 ${currentSubject.id}（${currentSubject.name}）。`);
  startSilhouetteMotion(true);
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

  vitalHeartFill.classList.toggle("alert", heartAlert);
  vitalBrainFill.classList.toggle("alert", brainAlert);
  vitalHeartText.textContent = hr + " bpm";
  vitalBrainText.textContent = brain + "%";
  vitalShiftText.textContent = currentShift.toFixed(1) + "%";
  updateLostOverlay();

  const logText = `生命体征更新：心率 ${hr} bpm${heartAlert ? "（异常）" : ""}，脑电活动 ${brain}%${brainAlert ? "（异常）" : ""}，异化进度 ${currentShift.toFixed(1)}%。`;
  const alertFlag = heartAlert || brainAlert;
  addLog(logText, true, alertFlag);
}

function renderLogList(list) {
  logListEl.innerHTML = "";
  list.forEach(item => {
    const entry = document.createElement("div");
    entry.className = "log-entry";
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

function addLog(text, light = false, alert = false, color = null) {
  const ts = time.format();
  const subjectId = currentSubject ? currentSubject.id : "——";
  const logItem = { ts, subject: subjectId, text, alert, light, color };

  logs.push(logItem);
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }
  if (alert) {
    alertLogs.push(logItem);
  }

  renderLogList(alertView ? alertLogs : logs);
}

function addLogForSubject(subjectId, text, alert = false, color = null) {
  const ts = time.format();
  const logItem = { ts, subject: subjectId, text, alert, light: false, color };
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
    alert("请先选择一个实验体。");
    return;
  }
  if (isSubjectLost(currentSubject)) {
    alert("观测结果已丢失。");
    return;
  }
  handleTestSequence("sample");
  const now = Date.now();
  if (now - lastSampleTs < SAMPLE_COOLDOWN) {
    return;
  }
  lastSampleTs = now;

  const alertFlag = heartAlert || brainAlert;
  let inc = 0;
  if (heartAlert && brainAlert) {
    inc = parseFloat((5 + Math.random() * 10).toFixed(1));
  } else if (alertFlag) {
    inc = parseFloat((Math.random() * 10).toFixed(1));
  }
  currentShift = Math.min(100, currentShift + inc);
  currentSubject.shift = currentShift;
  vitalShiftFill.style.width = Math.min(currentShift, 100) + "%";
  vitalShiftText.textContent = currentShift.toFixed(1) + "%";
  updateLostOverlay();

  addLog(
    `采集数据：记录 ${currentSubject.id} 的当前姿态与行为。\n备注：红外轮廓在摄像头外缘停留时间异常延长。${inc > 0 ? ` 异化进度 +${inc.toFixed(1)}%` : ""}`,
    false,
    alertFlag
  );
});

btnRandom.addEventListener("click", () => {
  if (!currentSubject) {
    alert("请先选择一个实验体。");
    return;
  }
  if (isSubjectLost(currentSubject)) {
    alert("观测结果已丢失。");
    return;
  }
  handleTestSequence("random");
  randomizeVitals();
  startSilhouetteMotion(true);
});

btnAlertLog.addEventListener("click", () => {
  alertView = !alertView;
  btnAlertLog.textContent = alertView ? "返回监控日志" : "异常日志";
  renderLogList(alertView ? alertLogs : logs);
});

btnPreview.addEventListener("click", () => {
  showPreview();
});

btnNextDay.addEventListener("click", () => {
  pendingDayChangeReason = "manual";
  time.nextDay();
});

function shuffle(arr) {
  return arr
    .map(value => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
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
      <div class="preview-meta">
        <div class="preview-id">${s.id}</div>
        <div class="preview-name">${s.name}</div>
        <div class="preview-stage">阶段：${s.stage}</div>
      </div>
    `;
    card.addEventListener("click", () => selectSubject(index));
    previewGrid.appendChild(card);
    applyPreviewCardStatus(card, s.dailyStatus);
  });
  const placeholder = document.createElement("div");
  placeholder.className = "preview-card preview-empty";
  placeholder.innerHTML = `<div class="preview-meta">备用遮蔽舱<br>待分配实验体</div>`;
  previewGrid.appendChild(placeholder);
  startPreviewMotion();
}

function applyPreviewCardStatus(card, status) {
  const stageEl = card.querySelector(".preview-stage");
  if (status && statusColors[status.color]) {
    const color = statusColors[status.color];
    card.style.borderColor = color;
    card.style.boxShadow = `0 0 10px ${color}b3`;
    if (stageEl) stageEl.style.color = color;
  } else {
    card.style.borderColor = "";
    card.style.boxShadow = "";
    if (stageEl) stageEl.style.color = defaultPreviewStageColor;
  }
}

function updatePreviewStatusColors() {
  const cards = previewGrid.querySelectorAll(".preview-card[data-id]");
  cards.forEach(card => {
    const subj = subjects.find(s => s.id === card.dataset.id);
    applyPreviewCardStatus(card, subj?.dailyStatus);
  });
}

function showPreview() {
  currentSubject = null;
  clearTimeout(motionTimer);
  motionTimer = null;
  previewMotionHandles.forEach(h => clearTimeout(h));
  previewMotionHandles = [];
  clearInterval(vitalsTimer);
  vitalsTimer = null;
  previewGrid.style.display = "grid";
  silhouetteEl.style.display = "none";
  headerStatusEl.textContent = "当前实验体：——";
  monitorSubtitleEl.textContent = "选择实验舱开始监控。";
  screenFooterLeft.textContent = "状态：待机";
  screenFooterRight.textContent = "RW 注射时长：——";
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
  updatePreviewStatusColors();
  startPreviewMotion();
}

function startSilhouetteMotion(forceRestart = false) {
  if (!currentSubject) return;
  if (motionTimer && !forceRestart) return;
  clearTimeout(motionTimer);
  const motions = ["approach", "retreat", "pace"];
  const nextMotion = () => {
    if (!currentSubject) return;
    silhouetteEl.classList.remove("motion-approach", "motion-retreat", "motion-pace");
    const m = motions[Math.floor(Math.random() * motions.length)];
    silhouetteEl.classList.add(`motion-${m}`);
    motionTimer = setTimeout(nextMotion, 4200 + Math.random() * 1200);
  };
  nextMotion();
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

renderSubjectList();
renderPreviewGrid();
showPreview();
assignDailyStatuses(true);
time.start();
addLog("系统启动：展示实验舱预览，等待选择实验体。");
