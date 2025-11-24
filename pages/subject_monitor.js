import { createTimeSystem } from "../modules/time.js";
import { subjects as subjectSeed, dailyPools } from "../data/subjects.js";

const subjects = subjectSeed.map(s => ({
  ...s,
  remarkQueues: {
    low: [],
    medium: [],
    high: [],
  }
}));
let currentSubject = null;

// DOM 引用
const subjectListEl = document.getElementById("subject-list");
const headerStatusEl = document.getElementById("header-status");
const monitorSubtitleEl = document.getElementById("monitor-subtitle");
const monitorScreenEl = document.getElementById("monitor-screen");
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

const MAX_LOGS = 18;
const DAILY_SAMPLE_PERMITS = 10;
const INITIAL_STABILIZERS = 3;
let previewMotionHandles = [];
let vitalsTimer = null;
let staticEffectTimer = null;
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

const time = createTimeSystem({
  onTick: updateTimeDisplay,
  onDayChange: () => handleDayChange(pendingDayChangeReason)
});

function updateTimeDisplay() {
  if (timeDisplay) timeDisplay.textContent = time.format();
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
  screenFooterLeft.textContent = `状态：${currentSubject.stage}`;
  screenFooterRight.textContent = `RW 注射时长：${currentSubject.rwDuration}`;

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
  if (guideActive && guideStepIndex === 1 && (alert || text.includes("生命体征更新"))) {
    setGuideStep(guideStepIndex + 1);
  }
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
  if (samplePermits <= 0) {
    alert("今日采集许可已用尽。");
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
  if (effectiveInc > 0) {
    logLines.push(`异化进度 +${effectiveInc.toFixed(1)}%`);
  }
  if (researchGain > 0) {
    logLines.push(`研究进度 +${researchGain.toFixed(1)}%（当前 ${researchProgress.toFixed(1)}%）`);
  }
  logLines.push(`剩余采集许可：${samplePermits}/${DAILY_SAMPLE_PERMITS}`);
  const logText = logLines.join("\n");

  addLog(
    logText,
    false,
    alertFlag
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
    alert("请先选择一个实验体。");
    return;
  }
  if (isSubjectLost(currentSubject)) {
    alert("观测结果已丢失。");
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
    alert("请先选择一个实验体。");
    return;
  }
  if (isSubjectLost(currentSubject)) {
    alert("观测结果已丢失。");
    return;
  }
  if (stabilizerCount <= 0) {
    alert("稳定剂已用尽。");
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
      <div class="preview-meta">
        <div class="preview-id">${s.id}</div>
        <div class="preview-name">${s.name}</div>
        <div class="preview-stage">阶段：${s.stage}</div>
      </div>
    `;

    if (isSubjectLost(s)) {
      card.classList.add("is-lost");
    } else {
      card.addEventListener("click", () => selectSubject(index));
    }

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
  previewMotionHandles.forEach(h => clearTimeout(h));
  previewMotionHandles = [];
  clearInterval(vitalsTimer);
  vitalsTimer = null;
  clearTimeout(staticEffectTimer);
  previewGrid.style.display = "grid";
  silhouetteEl.style.display = "none";
  silhouetteEl.classList.remove('is-animating'); // Stop animation
  lostOverlay.classList.remove('active');
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
assignDailyStatuses(true);
updateResourceUI();
time.start();
addLog("系统启动：展示实验舱预览，等待选择实验体。");
startGuide();
