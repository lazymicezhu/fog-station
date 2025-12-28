import { createTimeSystem } from "../modules/time.js";
import { subjects as subjectSeed, dailyPools } from "../data/subjects.js";
import { hudFrames } from "../data/hud_frames.js";
import { paimonMessages, paimonAlertText } from "../data/paimon_messages.js";
import { initPlayerSubjects, getPlayerSubjects, getEnemyPool, SubjectInstance } from '../modules/cultivation.js';
import { CombatSession } from '../modules/combat.js';
import { SKILL_DB, ELEMENT_NAMES, ITEMS } from '../data/combat_data.js';
import { getSystemPrompt } from '../data/game_knowledge.js';

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
let NOTE_ENTRIES = [];
let notesReady = false;
const notesInitPromise = initNotes();
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
const btnResearchData = document.getElementById("btn-research-data");
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
const chatMessagesEl = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const chatSend = document.getElementById("chat-send");
const chatStatus = document.getElementById("chat-status");
const chatUsername = document.getElementById("chat-username");
const btnOpenNotes = document.getElementById("btn-open-notes");
const btnCloseNotes = document.getElementById("btn-close-notes");
const notesOverlay = document.getElementById("notes-overlay");
const notesListEl = document.getElementById("notes-list");
const notesTitleEl = document.getElementById("notes-title");
const notesMetaEl = document.getElementById("notes-meta");
const notesContentEl = document.getElementById("notes-content");
const notesActionsEl = document.getElementById("notes-actions");
const notesAchievementEl = document.getElementById("notes-achievement");
const btnNotesRestart = document.getElementById("btn-notes-restart");
const notesAchievementsListEl = document.getElementById("notes-achievements-list");
const worldviewOverlay = document.getElementById("worldview-overlay");
const worldviewBg = document.getElementById("worldview-bg");
const worldviewTextEl = document.getElementById("worldview-text");
const worldviewSkip = document.getElementById("worldview-skip");

const NOTES_STORAGE_KEY = "fog_station_notes_state";
const ENDING_ACHIEVEMENTS_KEY = "fog_station_ending_achievements";
let notesState = loadNotesState();
let endingAchievements = loadEndingAchievements();
let lastResearchProgress = 0;

async function initNotes() {
  try {
    const [storyMd, endingMd, outlineMd] = await Promise.all([
      fetch("docs/scripts/实验体剧情.md").then(res => res.ok ? res.text() : ""),
      fetch("docs/scripts/结局.md").then(res => res.ok ? res.text() : ""),
      fetch("docs/scripts/剧情大纲.md").then(res => res.ok ? res.text() : "")
    ]);
    const subjectEntries = parseSubjectStoryMarkdown(storyMd);
    const endingEntries = parseEndingMarkdown(endingMd);
    const outlineEntries = parseOutlineMarkdown(outlineMd);
    NOTE_ENTRIES = [...outlineEntries, ...subjectEntries, ...endingEntries];
    if (NOTE_ENTRIES.length === 0) {
      NOTE_ENTRIES = buildFallbackNotes(subjectSeed);
    }
  } catch (err) {
    console.warn("Failed to load notes markdown, using fallback.", err);
    NOTE_ENTRIES = buildFallbackNotes(subjectSeed);
  } finally {
    notesReady = true;
    syncNotesWithState();
  }
}

function buildFallbackNotes(seed) {
  return seed.flatMap(subject => {
    const entries = [];
    if (subject.note) {
      entries.push({
        id: `${subject.id}-note-00`,
        subjectId: subject.id,
        title: `${subject.name} · 初始记录`,
        content: subject.note,
        unlock: { type: "observe" }
      });
    }
    return entries;
  });
}

function parseSubjectStoryMarkdown(md = "") {
  const lines = md.split(/\r?\n/);
  const entries = [];
  let sectionName = null;
  let sectionSubjectId = null;
  let currentEntry = null;
  let buffer = [];

  const finalize = () => {
    if (!currentEntry) return;
    const content = buffer.join("\n").trim();
    if (content) {
      currentEntry.content = content;
      entries.push(currentEntry);
    }
    currentEntry = null;
    buffer = [];
  };

  lines.forEach(raw => {
    const line = raw.trim();
    const h2 = line.match(/^##\s+(.*)$/);
    const h3 = line.match(/^###\s+(.*)$/);

    if (h2) {
      finalize();
      sectionName = h2[1].trim();
      sectionSubjectId = resolveSubjectId(sectionName);
      return;
    }

    if (h3) {
      finalize();
      if (!sectionName) return;
      const title = h3[1].trim();
      const match = title.match(/(\d+)%/);
      if (!match) return;
      const value = parseInt(match[1], 10);
      const subjectId = sectionSubjectId || "GLOBAL";
      const displayName = sectionSubjectId ? sectionName : "通用";
      currentEntry = {
        id: `${subjectId}-shift-${value}`,
        subjectId,
        title: `${displayName} · 异化 ${value}%`,
        unlock: { type: "shift", value }
      };
      return;
    }

    if (currentEntry) {
      buffer.push(raw);
    }
  });

  finalize();
  return entries;
}

function parseEndingMarkdown(md = "") {
  const lines = md.split(/\r?\n/);
  const entries = [];
  let sectionTitle = null;
  let buffer = [];

  const finalize = () => {
    if (!sectionTitle) return;
    const content = buffer.join("\n").trim();
    if (content) {
      const endingId = resolveEndingId(sectionTitle);
      entries.push({
        id: endingId,
        subjectId: "ENDING",
        title: `结局 · ${sectionTitle}`,
        content,
        unlock: { type: "ending", value: endingId }
      });
    }
    sectionTitle = null;
    buffer = [];
  };

  lines.forEach(raw => {
    const line = raw.trim();
    const h2 = line.match(/^##\s+(.*)$/);
    if (h2) {
      finalize();
      sectionTitle = h2[1].trim();
      return;
    }
    if (sectionTitle) {
      buffer.push(raw);
    }
  });

  finalize();
  return entries;
}

function parseOutlineMarkdown(md = "") {
  const text = md.trim();
  if (!text) return [];
  const lines = md.split(/\r?\n/);
  const entries = [];
  let current = null;
  let buffer = [];
  let blockIndex = 0;

  const finalize = () => {
    if (!current) return;
    const content = buffer.join("\n").trim();
    if (content) {
      current.content = content;
      entries.push(current);
    }
    current = null;
    buffer = [];
  };

  const startBlock = (title, unlockValue, category, unlockType = "research") => {
    finalize();
    current = {
      id: `outline-${blockIndex++}`,
      subjectId: "OUTLINE",
      title,
      category,
      unlock: { type: unlockType, value: unlockValue }
    };
  };

  lines.forEach(raw => {
    const line = raw.trim();
    if (!line) {
      if (current) buffer.push(raw);
      return;
    }

    const worldview = line.match(/^世界观[:：]/);
    if (worldview) {
      startBlock("世界观", 0, "outline", "intro");
      return;
    }

    const diary = line.match(/剧情\s*[（(]日记[）)]\s*实验进度\s*(\d+)\s*%?\s*-\s*(\d+)\s*%/);
    if (diary) {
      const upper = parseInt(diary[2], 10);
      startBlock(`实验日记 · 进度 ${diary[1]}% - ${diary[2]}%`, upper, "diary");
      return;
    }

    const logRecord = line.match(/实验日志追加记录.*实验进度\s*(\d+)\s*%/);
    if (logRecord) {
      const value = parseInt(logRecord[1], 10);
      startBlock(line, value, "log");
      return;
    }

    if (current) {
      buffer.push(raw);
    }
  });

  finalize();
  return entries.length ? entries : [{
    id: "outline-main",
    subjectId: "OUTLINE",
    title: "剧情大纲",
    content: text,
    category: "outline",
    unlock: { type: "research", value: 0 }
  }];
}

function resolveSubjectId(title) {
  if (!title) return null;
  const normalized = title.replace(/[\s【】\[\]\(\)（）]/g, "");
  if (normalized.includes("通用")) return "GLOBAL";

  const alias = {
    "小咪": "S-01",
    "猫": "S-01",
    "马楼": "S-07",
    "猕猴": "S-07",
    "钢铁志愿": "S-32",
    "钢脉志愿": "S-32"
  };
  if (alias[normalized]) return alias[normalized];

  const found = subjectSeed.find(s => normalized.includes(s.name.replace(/\s+/g, "")));
  return found ? found.id : null;
}

function resolveEndingId(title) {
  if (title.includes("牺牲")) return "ending-sacrifice";
  if (title.includes("共存")) return "ending-coexist";
  if (title.includes("悲剧")) return "ending-tragedy";
  if (title.includes("隐藏")) return "ending-hidden";
  return `ending-${title.replace(/\s+/g, "-")}`;
}

function renderNotesMarkdown(md = "") {
  const lines = md.split(/\r?\n/);
  const html = [];
  let inList = false;
  let paraLines = [];
  let keyIdeaNext = false;

  const escapeHtml = (text) =>
    text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const formatInline = (text) => {
    let out = escapeHtml(text);
    out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    out = out.replace(/\*(.+?)\*/g, "<em>$1</em>");
    return out;
  };

  const flushParagraph = () => {
    if (paraLines.length === 0) return;
    const text = paraLines.map(formatInline).join("<br>");
    if (keyIdeaNext) {
      html.push(`<p class="notes-key">${text}</p>`);
      keyIdeaNext = false;
    } else {
      html.push(`<p>${text}</p>`);
    }
    paraLines = [];
  };

  const closeList = () => {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  };

  lines.forEach(raw => {
    const line = raw.trim();
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    const list = line.match(/^-+\s+(.*)$/);

    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      const text = formatInline(heading[2].trim());
      const isKeyIdea = /key\s*idea/i.test(heading[2]);
      if (isKeyIdea) {
        html.push(`<div class="notes-key-label">KEY IDEA</div>`);
        keyIdeaNext = true;
      } else {
        html.push(`<h${level}>${text}</h${level}>`);
      }
      return;
    }

    if (list) {
      flushParagraph();
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${formatInline(list[1])}</li>`);
      return;
    }

    if (!line) {
      flushParagraph();
      closeList();
      return;
    }

    paraLines.push(raw);
  });

  flushParagraph();
  closeList();
  return html.join("");
}

function loadNotesState() {
  const raw = localStorage.getItem(NOTES_STORAGE_KEY);
  if (!raw) return { unlocked: new Set(), seen: new Set() };
  try {
    const parsed = JSON.parse(raw);
    return {
      unlocked: new Set(parsed.unlocked || []),
      seen: new Set(parsed.seen || [])
    };
  } catch (err) {
    console.warn("Failed to load notes state", err);
    return { unlocked: new Set(), seen: new Set() };
  }
}

function saveNotesState() {
  localStorage.setItem(
    NOTES_STORAGE_KEY,
    JSON.stringify({
      unlocked: Array.from(notesState.unlocked),
      seen: Array.from(notesState.seen)
    })
  );
}

function loadEndingAchievements() {
  const raw = localStorage.getItem(ENDING_ACHIEVEMENTS_KEY);
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw);
    return new Set(parsed || []);
  } catch (err) {
    console.warn("Failed to load ending achievements", err);
    return new Set();
  }
}

function saveEndingAchievements() {
  localStorage.setItem(
    ENDING_ACHIEVEMENTS_KEY,
    JSON.stringify(Array.from(endingAchievements))
  );
}

function recordEndingAchievement(note) {
  if (!note || note.unlock?.type !== "ending") return;
  if (endingAchievements.has(note.id)) return;
  endingAchievements.add(note.id);
  saveEndingAchievements();
}

function renderNotesList(activeId = null) {
  if (!notesListEl) return;
  notesListEl.innerHTML = "";
  const unlockedNotes = NOTE_ENTRIES.filter(note => notesState.unlocked.has(note.id));
  if (unlockedNotes.length === 0) {
    const empty = document.createElement("div");
    empty.className = "notes-item empty";
    empty.innerHTML = `
      <span class="notes-item-title">暂无已解锁记录</span>
      <span class="notes-item-meta">触发剧情后自动记录</span>
    `;
    notesListEl.appendChild(empty);
    return;
  }

  const groups = [
    { key: "diary", label: "实验日记" },
    { key: "log", label: "实验日志追加记录" },
    { key: "outline", label: "剧情大纲" },
    { key: "subject", label: "实验体剧情" },
    { key: "ending", label: "结局" }
  ];

  const categorize = (note) => {
    if (note.category) return note.category;
    if (note.unlock?.type === "ending") return "ending";
    if (note.subjectId === "OUTLINE") return "outline";
    if (note.subjectId && note.subjectId !== "GLOBAL") return "subject";
    return "subject";
  };

  groups.forEach(group => {
    const groupNotes = unlockedNotes.filter(note => categorize(note) === group.key);
    if (groupNotes.length === 0) return;
    const header = document.createElement("div");
    header.className = "notes-group-title";
    header.textContent = group.label;
    notesListEl.appendChild(header);

    groupNotes.forEach(note => {
      const item = document.createElement("div");
      item.className = "notes-item";
      if (note.id === activeId) item.classList.add("active");
      item.innerHTML = `
        <span class="notes-item-title">${note.title}</span>
        <span class="notes-item-meta">${note.subjectId}</span>
      `;
      item.addEventListener("click", () => {
        showNoteDetail(note);
        renderNotesList(note.id);
      });
      notesListEl.appendChild(item);
    });
  });
}

function showNoteDetail(note) {
  if (!note) return;
  if (notesTitleEl) notesTitleEl.textContent = note.title;
  if (notesMetaEl) {
    let meta = note.subjectId;
    if (note.unlock?.type === "shift") {
      meta = `${note.subjectId} · 异化 ${note.unlock.value}%`;
    } else if (note.unlock?.type === "research") {
      meta = `研究进度 ${note.unlock.value}%`;
    } else if (note.unlock?.type === "intro") {
      meta = "世界观";
    } else if (note.unlock?.type === "ending") {
      meta = "结局";
    }
    notesMetaEl.textContent = meta;
  }
  if (notesContentEl) {
    const content = note.content || "暂无内容。";
    notesContentEl.innerHTML = renderNotesMarkdown(content);
  }
  renderAchievementsList();
  if (notesActionsEl && notesAchievementEl && btnNotesRestart) {
    if (note.unlock?.type === "ending") {
      recordEndingAchievement(note);
      notesActionsEl.style.display = "flex";
      notesAchievementEl.textContent = `成就已记录：${note.title}`;
      btnNotesRestart.style.display = "inline-flex";
    } else {
      notesActionsEl.style.display = "none";
    }
  }
}

async function openNotes(noteId = null) {
  if (!notesOverlay) return;
  if (!notesReady) {
    if (notesTitleEl) notesTitleEl.textContent = "正在载入记录";
    if (notesMetaEl) notesMetaEl.textContent = "——";
    if (notesContentEl) notesContentEl.textContent = "系统正在解析文本，请稍候...";
    await notesInitPromise;
  }
  notesOverlay.classList.remove("hidden");
  renderAchievementsList();
  if (noteId) {
    const note = NOTE_ENTRIES.find(n => n.id === noteId);
    if (note) {
      showNoteDetail(note);
      renderNotesList(noteId);
      return;
    }
  }
  renderNotesList();
  const firstUnlocked = NOTE_ENTRIES.find(note => notesState.unlocked.has(note.id));
  if (firstUnlocked) {
    showNoteDetail(firstUnlocked);
    renderNotesList(firstUnlocked.id);
  }
}

function unlockNote(note) {
  if (!note || notesState.unlocked.has(note.id)) return false;
  notesState.unlocked.add(note.id);
  saveNotesState();
  return true;
}

function triggerNotesOnSelect(subject) {
  if (!subject || !notesReady) return;
  NOTE_ENTRIES.filter(note => note.subjectId === subject.id && note.unlock?.type === "observe")
    .forEach(note => {
      if (unlockNote(note) && !notesState.seen.has(note.id)) {
        notesState.seen.add(note.id);
        saveNotesState();
        openNotes(note.id);
      }
    });
}

function triggerNotesOnShift(subject, prevShift, currentShift) {
  if (!subject || !notesReady) return;
  unlockShiftNotesForSubject(subject, prevShift, currentShift);
  unlockShiftNotesForGlobal(prevShift, currentShift);
}

function unlockShiftNotesForSubject(subject, prevShift, currentShift) {
  NOTE_ENTRIES.filter(note => note.subjectId === subject.id && note.unlock?.type === "shift")
    .forEach(note => {
      if (prevShift < note.unlock.value && currentShift >= note.unlock.value) {
        if (unlockNote(note) && !notesState.seen.has(note.id)) {
          notesState.seen.add(note.id);
          saveNotesState();
          openNotes(note.id);
        }
      }
    });
}

function unlockShiftNotesForGlobal(prevShift, currentShift) {
  NOTE_ENTRIES.filter(note => note.subjectId === "GLOBAL" && note.unlock?.type === "shift")
    .forEach(note => {
      if (prevShift < note.unlock.value && currentShift >= note.unlock.value) {
        if (unlockNote(note) && !notesState.seen.has(note.id)) {
          notesState.seen.add(note.id);
          saveNotesState();
          openNotes(note.id);
        }
      }
    });
}

function unlockResearchNotes(prevProgress, currentProgress) {
  NOTE_ENTRIES.filter(note => note.unlock?.type === "research")
    .forEach(note => {
      if (prevProgress < note.unlock.value && currentProgress >= note.unlock.value) {
        if (unlockNote(note) && !notesState.seen.has(note.id)) {
          notesState.seen.add(note.id);
          saveNotesState();
          openNotes(note.id);
        }
      }
    });
}

function syncNotesWithState() {
  if (!notesReady) return;
  NOTE_ENTRIES.filter(note => note.unlock?.type === "intro")
    .forEach(note => {
      if (unlockNote(note)) {
        saveNotesState();
      }
    });
  subjects.forEach(subj => {
    const shift = subj.shift || 0;
    unlockShiftNotesForSubject(subj, 0, shift);
  });
  const maxShift = Math.max(...subjects.map(subj => subj.shift || 0), 0);
  unlockShiftNotesForGlobal(0, maxShift);
  unlockResearchNotes(0, researchProgress);
  checkEndingUnlocks();
  syncEndingAchievements();
}

function checkEndingUnlocks() {
  if (!notesReady) return;
  const endingNotes = NOTE_ENTRIES.filter(note => note.unlock?.type === "ending");
  if (endingNotes.length === 0) return;

  const lostCount = subjects.filter(isSubjectLost).length;
  const anyLost = lostCount > 0;
  const allLost = lostCount === subjects.length;
  const s01 = subjects.find(s => s.id === "S-01");
  const s07 = subjects.find(s => s.id === "S-07");
  const s32 = subjects.find(s => s.id === "S-32");
  const day = time?.getTime ? time.getTime().day : 1;

  const unlockChecks = {
    "ending-sacrifice": () => researchProgress >= 90 && allLost,
    "ending-coexist": () => researchProgress >= 70 && lostCount >= 1 && !allLost,
    "ending-tragedy": () => researchProgress < 40 && anyLost && day >= 4,
    "ending-hidden": () =>
      researchProgress >= 95 &&
      (s01?.shift || 0) >= 100 &&
      (s07?.shift || 0) >= 75 &&
      (s32?.shift || 0) >= 75
  };

  endingNotes.forEach(note => {
    const check = unlockChecks[note.id];
    if (check && check()) {
      if (unlockNote(note) && !notesState.seen.has(note.id)) {
        notesState.seen.add(note.id);
        saveNotesState();
        openNotes(note.id);
      }
    }
  });
}

function restartGame() {
  try {
    localStorage.removeItem("fog_station_game_state");
    localStorage.removeItem("fog_station_game_time");
    localStorage.removeItem("playerInventory");
    localStorage.removeItem("fog_station_notes_state");
    localStorage.removeItem("fog_station_combat_subjects");
    localStorage.removeItem("chat_initialized");
  } catch (err) {
    console.warn("Failed to clear game state", err);
  }
  window.location.reload();
}

function syncEndingAchievements() {
  NOTE_ENTRIES.filter(note => note.unlock?.type === "ending")
    .forEach(note => {
      if (notesState.unlocked.has(note.id)) {
        recordEndingAchievement(note);
      }
    });
  renderAchievementsList();
}

function renderAchievementsList() {
  if (!notesAchievementsListEl) return;
  notesAchievementsListEl.innerHTML = "";
  const sorted = Array.from(endingAchievements);
  if (sorted.length === 0) {
    const empty = document.createElement("div");
    empty.className = "notes-achievement-empty";
    empty.textContent = "暂无已记录成就";
    notesAchievementsListEl.appendChild(empty);
    return;
  }
  sorted.forEach(id => {
    const note = NOTE_ENTRIES.find(n => n.id === id);
    const tag = document.createElement("div");
    tag.className = "notes-achievement-tag";
    tag.textContent = note ? note.title : id;
    notesAchievementsListEl.appendChild(tag);
  });
}

function maybePlayWorldviewIntro(gameLoaded, onComplete) {
  if (gameLoaded) {
    if (typeof onComplete === "function") onComplete();
    return;
  }
  if (!worldviewOverlay || !worldviewTextEl || !worldviewBg) return;
  const seen = localStorage.getItem("fog_station_worldview_seen");
  if (seen) {
    if (typeof onComplete === "function") onComplete();
    return;
  }

  notesInitPromise.then(() => {
    const note = NOTE_ENTRIES.find(n => n.unlock?.type === "intro");
    if (!note || !note.content) {
      if (typeof onComplete === "function") onComplete();
      return;
    }
    playWorldviewIntro(note.content, onComplete);
  });
}

function playWorldviewIntro(text, onComplete) {
  const images = [
    "arts/大背景1.png",
    "arts/大背景2.png",
    "arts/大背景3.png",
    "arts/迷雾1.png",
    "arts/实验员研究1.png",
    "arts/陨石研究1.png"
  ];
  const total = text.length;
  const thresholds = images.map((_, i) => Math.floor((total / images.length) * i));
  let nextImage = 0;
  let index = 0;
  let completed = false;

  const setImage = (i) => {
    if (!worldviewBg) return;
    worldviewBg.style.opacity = "0";
    setTimeout(() => {
      worldviewBg.style.backgroundImage = `url('${images[i]}')`;
      requestAnimationFrame(() => {
        worldviewBg.style.opacity = "0.5";
      });
    }, 120);
  };

  if (worldviewOverlay) worldviewOverlay.classList.remove("hidden");
  if (worldviewTextEl) worldviewTextEl.textContent = "";
  if (worldviewSkip) worldviewSkip.textContent = "跳过";
  setImage(0);

  const timer = setInterval(() => {
    index += 1;
    if (worldviewTextEl) {
      worldviewTextEl.textContent = text.slice(0, index);
    }
    if (nextImage + 1 < images.length && index >= thresholds[nextImage + 1]) {
      nextImage += 1;
      setImage(nextImage);
    }
    if (index >= total) {
      finishTyping(timer);
    }
  }, 60);

  const finishTyping = (handle) => {
    clearInterval(handle);
    completed = true;
    if (worldviewSkip) worldviewSkip.textContent = "点击进入";
  };

  const closeIntro = () => {
    localStorage.setItem("fog_station_worldview_seen", "true");
    if (worldviewOverlay) worldviewOverlay.classList.add("hidden");
    if (typeof onComplete === "function") onComplete();
  };

  if (worldviewSkip) {
    worldviewSkip.onclick = () => {
      if (!completed) {
        if (worldviewTextEl) worldviewTextEl.textContent = text;
        finishTyping(timer);
      } else {
        closeIntro();
      }
    };
  }
  worldviewOverlay.onclick = (evt) => {
    if (evt.target === worldviewOverlay && completed) {
      closeIntro();
    }
  };
}

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
let paimonDrag = { active: false, dragging: false, moved: false, pointerId: null, offsetX: 0, offsetY: 0, startX: 0, startY: 0 };
// WebSocket 相关变量已移除，改为纯前端聊天
const chatHistoryLimit = 80;
let currentTab = 'log'; // 当前激活的标签页
let isComposing = false; // 追踪输入法组合状态，防止输入法回车误触发

// ChatGPT API 配置
// ⚠️ 安全警告：在生产环境中，API密钥应该放在后端，不应暴露在前端代码中
const CHATGPT_CONFIG = {
  apiKey: 'sk-vfCUnN4KpRJpUSJn4mLyUsQcp9y0ozR4Ymc1cHMz19UYaPuU',
  baseURL: 'https://api.lazymicezhu.com',
  model: 'gpt-4.1',
  maxTokens: 400,
  temperature: 0.8
};

// 聊天历史记录（用于保持对话上下文）
let chatHistory = [];

const time = createTimeSystem({
  onTick: () => {
    updateTimeDisplay();
    saveGameState(); // 自动保存
  },
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
  if (btnResearchData) {
    const dataCount = playerInventory?.research_data || 0;
    btnResearchData.textContent = `使用实验数据 x${dataCount}`;
    btnResearchData.disabled = dataCount <= 0 || researchProgress >= 100;
  }
  const progressValue = Math.min(100, researchProgress);
  if (researchFill) researchFill.style.width = `${progressValue}%`;
  if (researchText) researchText.textContent = `${progressValue.toFixed(1)}%`;
  updateNextDayButtonState();
  checkEndingUnlocks();
  if (notesReady) {
    unlockResearchNotes(lastResearchProgress, researchProgress);
  }
  lastResearchProgress = researchProgress;
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
  saveGameState(); // 保存跨天后的状态
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
  triggerNotesOnSelect(currentSubject);
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
    "S-32": { heart: [60, 110], brain: [50, 85] }
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
  saveGameState(); // 保存采集许可变化
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
    saveGameState(); // 保存稳定剂使用
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
  saveGameState(); // 保存实验体异化进度和研究进度

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
  triggerNotesOnShift(currentSubject, prevShift, currentShift);
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
  saveGameState(); // 保存稳定剂待命状态
  addLog("稳定剂已待命：下一次异化增长将被抵消。", true);
});

btnResearchData?.addEventListener("click", () => {
  const count = playerInventory?.research_data || 0;
  if (count <= 0) {
    sysAlert("实验数据不足。");
    return;
  }
  if (researchProgress >= 100) {
    sysAlert("研究进度已满。");
    return;
  }
  const gain = 5;
  playerInventory.research_data = Math.max(0, count - 1);
  researchProgress = Math.min(100, parseFloat((researchProgress + gain).toFixed(2)));
  saveInventory();
  saveGameState();
  updateResourceUI();
  addLog(`使用实验数据：研究进度 +${gain}% 。`, true);
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
  const container = paimonWidget.offsetParent || document.body;
  const rect = container.getBoundingClientRect();
  const mouseInContainerX = e.clientX - rect.left;
  const mouseInContainerY = e.clientY - rect.top;

  paimonDrag = {
    active: true,
    dragging: false,
    moved: false,
    pointerId: e.pointerId ?? null,
    startX: mouseInContainerX,
    startY: mouseInContainerY,
    offsetX: mouseInContainerX - (paimonPosition.x ?? mouseInContainerX),
    offsetY: mouseInContainerY - (paimonPosition.y ?? mouseInContainerY)
  };
}

function movePaimon(e) {
  if (!paimonDrag.active || (paimonDrag.pointerId !== null && e.pointerId !== paimonDrag.pointerId)) return;
  const container = paimonWidget.offsetParent || document.body;
  const rect = container.getBoundingClientRect();
  const mouseInContainerX = e.clientX - rect.left;
  const mouseInContainerY = e.clientY - rect.top;

  const dx = mouseInContainerX - paimonDrag.startX;
  const dy = mouseInContainerY - paimonDrag.startY;
  const movedEnough = Math.abs(dx) + Math.abs(dy) > 4;
  if (movedEnough && !paimonDrag.dragging) {
    paimonDrag.dragging = true;
    paimonDrag.moved = true;
    paimonWidget.classList.add("is-dragging");
  }
  if (!paimonDrag.dragging) return;

  setPaimonPosition(mouseInContainerX - paimonDrag.offsetX, mouseInContainerY - paimonDrag.offsetY);
}

function endPaimonDrag(e) {
  if (!paimonDrag.active || (paimonDrag.pointerId !== null && e.pointerId !== paimonDrag.pointerId)) return;
  const container = paimonWidget.offsetParent || document.body;
  const rect = container.getBoundingClientRect();
  const upX = e.clientX - rect.left;
  const upY = e.clientY - rect.top;
  const dx = upX - paimonDrag.startX;
  const dy = upY - paimonDrag.startY;
  const clickLike = Math.abs(dx) + Math.abs(dy) <= 4;
  const wasDragging = paimonDrag.dragging;

  paimonDrag = { active: false, dragging: false, moved: false, pointerId: null, offsetX: 0, offsetY: 0, startX: 0, startY: 0 };
  paimonWidget.classList.remove("is-dragging");
  clampPaimonWithinView();
  // 点击头像时切换到研究员频道标签
  if (!wasDragging && clickLike && paimonAvatar && paimonAvatar.contains(e.target)) {
    switchTab('chat');
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

/* ---
  CHAT CLIENT
--- */
function getResearcherProfile() {
  try {
    const raw = localStorage.getItem("fog_station_user");
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

function getChatNickname() {
  const profile = getResearcherProfile();
  const name = profile?.username || "研究员";
  return name.slice(0, 32);
}

// 标签页切换功能
function switchTab(tabName) {
  console.log('switchTab called:', tabName); // 调试日志
  currentTab = tabName;

  // 更新标签按钮状态
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // 更新标签内容显示
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('hidden', content.dataset.tab !== tabName);
  });

  // 如果切换到聊天标签，聚焦输入框
  if (tabName === 'chat') {
    renderChatUser();
    setChatStatus("同步中", true);
    setTimeout(() => chatInput?.focus(), 80);
  }
}

// 暴露到全局作用域用于调试
window.debugSwitchTab = switchTab;

function setChatStatus(text, online = false) {
  if (chatStatus) {
    chatStatus.textContent = text;
    chatStatus.classList.toggle("online", online);
  }
}

function renderChatUser() {
  if (chatUsername) chatUsername.textContent = getChatNickname();
}

/**
 * 简单的 Markdown 渲染器
 * 支持：**粗体**、*斜体*、`代码`、换行等
 */
function renderMarkdown(text) {
  if (!text) return '';

  // HTML 转义函数，防止 XSS
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  let html = escapeHtml(text);

  // 1. 处理代码块（需要先处理，避免内部的其他标记被渲染）
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // 2. 处理粗体 **text**
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // 3. 处理斜体 *text*
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // 4. 处理数字列表（1. 2. 3.）
  html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<div class="list-item"><span class="list-number">$1.</span> $2</div>');

  // 5. 处理换行（两个空格 + 换行 或 单独的换行）
  html = html.replace(/\n/g, '<br>');

  return html;
}

function appendChatMessage({ user, text, ts }) {
  if (!chatMessagesEl) return;
  const item = document.createElement("div");
  item.className = "chat-item";

  // 根据发送者添加不同的 class
  if (user === "NEURO-SYNC") {
    item.classList.add("chat-ai");
  } else if (user === "系统") {
    item.classList.add("chat-system");
  } else {
    item.classList.add("chat-user");
  }

  const timeStr = ts ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  const meta = document.createElement("div");
  meta.className = "meta";
  const nameEl = document.createElement("span");
  nameEl.className = "username";
  nameEl.textContent = user || "研究员";
  const timeEl = document.createElement("span");
  timeEl.className = "timestamp";
  timeEl.textContent = timeStr;
  meta.appendChild(nameEl);
  meta.appendChild(timeEl);

  const textEl = document.createElement("div");
  textEl.className = "text";

  // 使用 Markdown 渲染（仅对 NEURO-SYNC 和系统消息）
  if (user === "NEURO-SYNC" || user === "系统") {
    textEl.innerHTML = renderMarkdown(text || "");
  } else {
    // 用户消息保持纯文本
    textEl.textContent = text || "";
  }

  item.appendChild(meta);
  item.appendChild(textEl);
  chatMessagesEl.appendChild(item);
  while (chatMessagesEl.children.length > chatHistoryLimit) {
    chatMessagesEl.removeChild(chatMessagesEl.firstChild);
  }
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

// WebSocket 代码已移除，以下为纯前端聊天功能

/**
 * 调用 ChatGPT API
 */
async function callChatGPT(userMessage) {
  // 添加用户消息到历史
  chatHistory.push({
    role: 'user',
    content: userMessage
  });

  // 保持历史记录在合理范围内（最多10条对话）
  if (chatHistory.length > 20) {
    // 保留系统提示词和最近的10条对话
    chatHistory = [chatHistory[0], ...chatHistory.slice(-10)];
  }

  const response = await fetch(`${CHATGPT_CONFIG.baseURL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CHATGPT_CONFIG.apiKey}`
    },
    body: JSON.stringify({
      model: CHATGPT_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: getSystemPrompt()
        },
        ...chatHistory
      ],
      max_tokens: CHATGPT_CONFIG.maxTokens,
      temperature: CHATGPT_CONFIG.temperature
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API请求失败: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const aiReply = data.choices[0]?.message?.content || '抱歉，我无法生成回复。';

  // 添加AI回复到历史
  chatHistory.push({
    role: 'assistant',
    content: aiReply
  });

  return aiReply;
}

/**
 * 发送聊天消息
 */
async function sendChatMessage() {
  const text = chatInput?.value?.trim();
  if (!text) return;

  const nickname = getChatNickname();
  const userMessage = text.slice(0, 320);

  // 显示用户消息
  appendChatMessage({
    user: nickname,
    text: userMessage,
    ts: Date.now()
  });

  chatInput.value = "";

  const handled = handleChatCommand(userMessage);
  if (handled) {
    return;
  }

  try {
    setChatStatus("思考中...", true);

    // 调用 ChatGPT API
    const aiReply = await callChatGPT(userMessage);

    // 显示AI回复
    appendChatMessage({
      user: "NEURO-SYNC",
      text: aiReply,
      ts: Date.now()
    });

    setChatStatus("同步中", true);
  } catch (error) {
    console.error('AI服务错误:', error);

    // 显示错误消息
    appendChatMessage({
      user: "系统",
      text: `AI服务暂时不可用: ${error.message}`,
      ts: Date.now()
    });

    setChatStatus("连接异常", false);
  }
}

function handleChatCommand(command) {
  const normalized = command.toLowerCase();
  if (normalized === "cheats_lazymice") {
    appendChatMessage({
      user: "系统",
      text: "可用指令：restart_lazymice, 10x_lazymice, permits_lazymice, stabilizer_lazymice, research_lazymice, unlock_notes_lazymice, endings_lazymice",
      ts: Date.now()
    });
    return true;
  }
  if (normalized === "restart_lazymice") {
    appendChatMessage({
      user: "系统",
      text: "指令确认：清除本地存储并重启世界观。",
      ts: Date.now()
    });
    localStorage.clear();
    window.location.reload();
    return true;
  }
  if (normalized === "10x_lazymice") {
    ITEMS.forEach(item => {
      addItemToInventory(item.id, 10);
    });
    updateResourceUI();
    appendChatMessage({
      user: "系统",
      text: "已发放：所有道具 x10。",
      ts: Date.now()
    });
    return true;
  }
  if (normalized === "permits_lazymice") {
    addItemToInventory("sample_permit", 10);
    samplePermits = playerInventory.sample_permit || samplePermits;
    updateResourceUI();
    appendChatMessage({
      user: "系统",
      text: "采集许可 +10。",
      ts: Date.now()
    });
    return true;
  }
  if (normalized === "stabilizer_lazymice") {
    addItemToInventory("stabilizer", 5);
    stabilizerCount = playerInventory.stabilizer || stabilizerCount;
    updateResourceUI();
    appendChatMessage({
      user: "系统",
      text: "稳定剂 +5。",
      ts: Date.now()
    });
    return true;
  }
  if (normalized === "research_lazymice") {
    const gain = 25;
    researchProgress = Math.min(100, parseFloat((researchProgress + gain).toFixed(2)));
    updateResourceUI();
    appendChatMessage({
      user: "系统",
      text: `研究进度 +${gain}%。`,
      ts: Date.now()
    });
    return true;
  }
  if (normalized === "unlock_notes_lazymice") {
    NOTE_ENTRIES.forEach(note => unlockNote(note));
    saveNotesState();
    renderNotesList();
    appendChatMessage({
      user: "系统",
      text: "已解锁全部笔记条目。",
      ts: Date.now()
    });
    return true;
  }
  if (normalized === "endings_lazymice") {
    NOTE_ENTRIES.filter(note => note.unlock?.type === "ending")
      .forEach(note => {
        unlockNote(note);
        recordEndingAchievement(note);
      });
    saveNotesState();
    saveEndingAchievements();
    renderAchievementsList();
    appendChatMessage({
      user: "系统",
      text: "已解锁全部结局成就。",
      ts: Date.now()
    });
    return true;
  }
  return false;
}

function initChat() {
  console.log('initChat called'); // 调试日志
  renderChatUser();
  if (chatSend) chatSend.addEventListener("click", sendChatMessage);
  if (chatInput) {
    // 监听输入法组合开始
    chatInput.addEventListener("compositionstart", () => {
      isComposing = true;
    });

    // 监听输入法组合结束
    chatInput.addEventListener("compositionend", () => {
      isComposing = false;
    });

    // 监听回车键，但要排除输入法组合中的回车
    chatInput.addEventListener("keydown", e => {
      if (e.key === "Enter" && !isComposing) {
        sendChatMessage();
      }
    });
  }

  // 绑定标签页切换事件
  const tabBtns = document.querySelectorAll('.tab-btn');
  console.log('Found tab buttons:', tabBtns.length); // 调试日志
  tabBtns.forEach((btn, index) => {
    console.log(`Binding tab button ${index}:`, btn.dataset.tab); // 调试日志
    btn.addEventListener('click', () => {
      console.log('Tab button clicked:', btn.dataset.tab); // 调试日志
      switchTab(btn.dataset.tab);
    });
  });

  // 登录信息更新后刷新昵称
  window.addEventListener("storage", (e) => {
    if (e.key === "fog_station_user") {
      renderChatUser();
    }
  });

  // 显示初始欢迎消息（仅首次）
  if (!localStorage.getItem('chat_initialized')) {
    setTimeout(() => {
      appendChatMessage({
        user: "NEURO-SYNC",
        text: "**神经同步系统已激活**\n\n研究员，欢迎接入 Fog Station 监控网络。我是 NEURO-SYNC，你的 AI 协助模块。\n\n我可以帮助你了解：\n1. **监控系统** 操作方法\n2. **实验体** 特性与异化进程\n3. **资源管理** 策略建议\n\n有任何疑问，随时向我咨询。记住：*保持警觉，记录一切*。",
        ts: Date.now()
      });
      localStorage.setItem('chat_initialized', 'true');
    }, 500);
  }
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
    "S-32": { heart: [60, 110], brain: [50, 85] }
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
// 玩家道具库存系统
let playerInventory = {
  // 治疗类
  'heal_s': 5,           // 纳米修补剂(白) x5
  'heal_m': 3,           // 纳米修补剂(蓝) x3
  'heal_l': 1,           // 纳米修补剂(紫) x1
  // 增益类
  'buff_atk_s': 3,       // 过载注射(白) x3
  'buff_atk_m': 1,       // 过载注射(蓝) x1
  'buff_def_s': 2,       // 护盾生成器 x2
  // 资源类
  'stabilizer': stabilizerCount || 3,      // 稳定剂
  'sample_permit': samplePermits || 10,    // 采集许可
  'research_data': 0     // 研究数据
};

// 保存/加载道具库存
function saveInventory() {
  localStorage.setItem('playerInventory', JSON.stringify(playerInventory));
}

function loadInventory() {
  const saved = localStorage.getItem('playerInventory');
  if (saved) {
    try {
      playerInventory = JSON.parse(saved);
      // 同步稳定剂和采集许可到全局变量
      if (playerInventory.stabilizer !== undefined) {
        stabilizerCount = playerInventory.stabilizer;
      }
      if (playerInventory.sample_permit !== undefined) {
        samplePermits = playerInventory.sample_permit;
      }
    } catch (e) {
      console.error('加载库存失败:', e);
    }
  }
}

// 添加道具到库存
function addItemToInventory(itemId, count = 1) {
  if (playerInventory[itemId] === undefined) {
    playerInventory[itemId] = 0;
  }
  playerInventory[itemId] += count;

  // 同步资源类道具到全局变量
  if (itemId === 'stabilizer') {
    stabilizerCount = playerInventory.stabilizer;
  } else if (itemId === 'sample_permit') {
    samplePermits = playerInventory.sample_permit;
  }

  saveInventory();
}

renderSubjectList();
renderPreviewGrid();
showPreview();
// 页面加载时读取库存
loadInventory();

// 页面加载时恢复游戏状态
const gameLoaded = loadGameState();

initPaimonAssistant();
initChat();
assignDailyStatuses(true);
updateResourceUI(); // 确保UI显示正确的资源状态
updateNextDayButtonState();
time.start();
const shouldStartGuide = !gameLoaded || !localStorage.getItem('tutorial_completed');
maybePlayWorldviewIntro(gameLoaded, () => {
    if (shouldStartGuide) startGuide();
});

// 根据是否加载存档显示不同的日志
if (gameLoaded) {
    addLog("系统恢复：游戏进度已加载。");
} else {
    addLog("系统启动：展示实验舱预览，等待选择实验体。");
}

// 如果加载了存档，刷新预览界面以显示正确的实验体状态
if (gameLoaded) {
    renderPreviewGrid();
    renderSubjectList();
}

/* ---
  COMBAT SYSTEM INTEGRATION
--- */
initPlayerSubjects(); // Initialize user data

const btnCombatEntry = document.getElementById('btn-combat-entry');
const combatOverlay = document.getElementById('combat-overlay');
const btnCombatExit = document.getElementById('btn-combat-exit');
let currentCombat = null;

// 玩家道具库存系统已提前初始化

// ==========================================
// 游戏状态保存/加载系统
// ==========================================

// 保存完整游戏状态
function saveGameState() {
    try {
        const gameState = {
            // 时间
            time: time.getTime(),

            // 资源
            resources: {
                samplePermits,
                stabilizerCount,
                stabilizerArmed,
                researchProgress
            },

            // 实验体状态
            subjects: subjects.map(s => ({
                id: s.id,
                shift: s.shift,
                baseShift: s.baseShift,
                lastHeart: s.lastHeart,
                lastBrain: s.lastBrain,
                lastHeartAlert: s.lastHeartAlert,
                lastBrainAlert: s.lastBrainAlert
            })),

            // 教程进度
            tutorial: {
                guideStepIndex,
                completed: localStorage.getItem('tutorial_completed') === 'true'
            },

            // 保存时间戳
            savedAt: Date.now()
        };

        localStorage.setItem('fog_station_game_state', JSON.stringify(gameState));
        time.saveTime(); // 同时保存时间系统
    } catch (e) {
        console.error('Failed to save game state:', e);
    }
}

// 加载完整游戏状态
function loadGameState() {
    try {
        const saved = localStorage.getItem('fog_station_game_state');
        if (!saved) {
            console.log('No saved game state found, starting new game');
            return false;
        }

        const gameState = JSON.parse(saved);

        // 恢复时间
        if (gameState.time) {
            time.setTime(gameState.time.day, gameState.time.minutes);
        } else {
            time.loadTime(); // 兼容旧的保存格式
        }

        // 恢复资源
        if (gameState.resources) {
            samplePermits = gameState.resources.samplePermits ?? DAILY_SAMPLE_PERMITS;
            stabilizerCount = gameState.resources.stabilizerCount ?? INITIAL_STABILIZERS;
            stabilizerArmed = gameState.resources.stabilizerArmed ?? false;
            researchProgress = gameState.resources.researchProgress ?? 0;

            // 同步到库存系统
            if (playerInventory.stabilizer !== undefined) {
                playerInventory.stabilizer = stabilizerCount;
            }
            if (playerInventory.sample_permit !== undefined) {
                playerInventory.sample_permit = samplePermits;
            }
        }

        // 恢复实验体状态
        if (gameState.subjects && Array.isArray(gameState.subjects)) {
            gameState.subjects.forEach(savedSubj => {
                const subj = subjects.find(s => s.id === savedSubj.id);
                if (subj) {
                    subj.shift = savedSubj.shift ?? 0;
                    subj.baseShift = savedSubj.baseShift ?? 0;
                    subj.lastHeart = savedSubj.lastHeart ?? 60;
                    subj.lastBrain = savedSubj.lastBrain ?? 60;
                    subj.lastHeartAlert = savedSubj.lastHeartAlert ?? false;
                    subj.lastBrainAlert = savedSubj.lastBrainAlert ?? false;
                }
            });
        }

        // 恢复教程进度
        if (gameState.tutorial) {
            guideStepIndex = gameState.tutorial.guideStepIndex ?? 0;
        }

        console.log('Game state loaded successfully:', {
            day: gameState.time?.day,
            savedAt: new Date(gameState.savedAt).toLocaleString()
        });

        return true;
    } catch (e) {
        console.error('Failed to load game state:', e);
        return false;
    }
}

// 注意：库存加载和游戏状态加载已经在上面的初始化代码中完成

if (btnCombatEntry) {
    btnCombatEntry.addEventListener('click', () => {
        startCombatEncounter();
    });
}

if (btnCombatExit) {
    btnCombatExit.addEventListener('click', () => {
        if (currentCombat && currentCombat.state !== 'END_WIN' && currentCombat.state !== 'END_LOSS') {
             window.sysConfirm("战斗正在进行中，断开连接将被视为逃跑。确定吗？", () => {
                // Heal player on exit
                const players = getPlayerSubjects();
                if (players[0]) {
                    players[0].currentHp = players[0].getMaxHp();
                }
                combatOverlay.classList.add('hidden');
                currentCombat = null;
            });
            return;
        }
        // Heal player on exit
        const players = getPlayerSubjects();
        if (players[0]) {
            players[0].currentHp = players[0].getMaxHp();
        }
        combatOverlay.classList.add('hidden');
        currentCombat = null;
    });
}

function renderCombatUI(session) {
    if (!session) return;
    const sigilCache = renderCombatUI.sigilCache || (renderCombatUI.sigilCache = new Map());

    const buildSigilText = (name) => {
        if (sigilCache.has(name)) return sigilCache.get(name);

        const baseChars = Array.from(name).filter(ch => ch.trim() !== '');
        const filler = ['·', '•', '░', '◇', '◆', '○', '◎', '△', '▽', '∴', '∵', 'Ω', 'Ψ', 'Φ', 'Σ', 'λ', '0', '1'];
        const pool = [...new Set([...baseChars, ...filler])];

        const shuffle = (arr) => {
            const copy = [...arr];
            for (let i = copy.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [copy[i], copy[j]] = [copy[j], copy[i]];
            }
            return copy;
        };

        const targetLength = 240;
        const sequence = [];
        while (sequence.length < targetLength) {
            let batch = shuffle(pool);
            if (sequence.length > 0 && batch[0] === sequence[sequence.length - 1]) {
                batch = batch.slice(1).concat(batch[0]);
            }
            sequence.push(...batch);
        }
        const text = sequence.slice(0, targetLength).join('');
        sigilCache.set(name, text);
        return text;
    };

    const setSigil = (spriteId, name) => {
        const sprite = document.getElementById(spriteId);
        if (!sprite) return;
        const sigil = sprite.querySelector('.sigil');
        if (!sigil) return;
        const text = buildSigilText(name);
        if (sigil.textContent !== text) sigil.textContent = text;
    };

    // Enemy
    const eName = document.getElementById('enemy-name');
    if (eName) eName.textContent = `${session.enemy.getName()} [${ELEMENT_NAMES[session.enemy.element]}]`;
    setSigil('enemy-sprite', session.enemy.getName());

    const eHp = session.enemy.currentHp;
    const eMax = session.enemy.getMaxHp();
    const eHpText = document.getElementById('enemy-hp-text');
    const eHpBar = document.getElementById('enemy-hp-bar');
    if (eHpText) {
        const shield = session.shields.enemy > 0 ? ` +${session.shields.enemy}🛡️` : '';
        eHpText.textContent = `${eHp}/${eMax}${shield}`;
    }
    if (eHpBar) eHpBar.style.width = `${(eHp/eMax)*100}%`;

    // Player
    const pName = document.getElementById('player-name');
    if (pName) pName.textContent = `${session.player.getName()} [${ELEMENT_NAMES[session.player.element]}]`;
    setSigil('player-sprite', session.player.getName());

    const pHp = session.player.currentHp;
    const pMax = session.player.getMaxHp();
    const pHpText = document.getElementById('player-hp-text');
    const pHpBar = document.getElementById('player-hp-bar');
    if (pHpText) {
        const shield = session.shields.player > 0 ? ` +${session.shields.player}🛡️` : '';
        pHpText.textContent = `${pHp}/${pMax}${shield}`;
    }
    if (pHpBar) pHpBar.style.width = `${(pHp/pMax)*100}%`;

    // Display buffs/debuffs/dots
    const pBuffContainer = document.getElementById('player-buffs');
    const eBuffContainer = document.getElementById('enemy-buffs');

    if (pBuffContainer) {
        pBuffContainer.innerHTML = '';
        session.buffs.player.forEach(buff => {
            const buffEl = document.createElement('span');
            buffEl.className = 'buff-tag';
            buffEl.textContent = `${buff.name}(${buff.duration})`;
            buffEl.title = `${buff.type}: ${buff.value}`;
            pBuffContainer.appendChild(buffEl);
        });
        session.dots.player.forEach(dot => {
            const dotEl = document.createElement('span');
            dotEl.className = 'dot-tag';
            dotEl.textContent = `🔥${dot.name}(${dot.duration})`;
            pBuffContainer.appendChild(dotEl);
        });
    }

    if (eBuffContainer) {
        eBuffContainer.innerHTML = '';
        session.buffs.enemy.forEach(buff => {
            const buffEl = document.createElement('span');
            buffEl.className = 'buff-tag';
            buffEl.textContent = `${buff.name}(${buff.duration})`;
            buffEl.title = `${buff.type}: ${buff.value}`;
            eBuffContainer.appendChild(buffEl);
        });
        session.dots.enemy.forEach(dot => {
            const dotEl = document.createElement('span');
            dotEl.className = 'dot-tag';
            dotEl.textContent = `🔥${dot.name}(${dot.duration})`;
            eBuffContainer.appendChild(dotEl);
        });
    }

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
let currentManagementTab = 'subjects';

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

if (btnOpenNotes) {
    btnOpenNotes.addEventListener('click', () => {
        openNotes();
    });
}

if (btnCloseNotes) {
    btnCloseNotes.addEventListener('click', () => {
        notesOverlay.classList.add('hidden');
    });
}

if (btnNotesRestart) {
    btnNotesRestart.addEventListener('click', () => {
        window.sysConfirm("确定要重新开始吗？当前进度将被清空，结局成就会保留。", () => {
            restartGame();
        });
    });
}

// 管理界面标签页切换
const managementTabs = document.querySelectorAll('.management-tabs .tab-btn');
managementTabs.forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        currentManagementTab = tab;

        // 更新按钮状态
        managementTabs.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // 重新渲染内容
        renderManagementUI();
    });
});

function renderManagementUI() {
    manageList.innerHTML = '';

    if (currentManagementTab === 'subjects') {
        renderSubjectsTab();
    } else if (currentManagementTab === 'items') {
        renderItemsTab();
    }
}

function renderSubjectsTab() {
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

function renderItemsTab() {
    // 按类别分组道具
    const categories = {
        '治疗类': [],
        '增益类': [],
        '资源类': []
    };

    ITEMS.forEach(itemData => {
        const count = playerInventory[itemData.id] || 0;
        const itemInfo = {
            data: itemData,
            count: count
        };

        if (itemData.type === 'heal') {
            categories['治疗类'].push(itemInfo);
        } else if (itemData.type.includes('buff')) {
            categories['增益类'].push(itemInfo);
        } else if (itemData.type === 'resource') {
            categories['资源类'].push(itemInfo);
        }
    });

    // 渲染每个类别
    Object.keys(categories).forEach(category => {
        if (categories[category].length === 0) return;

        const categorySection = document.createElement('div');
        categorySection.className = 'item-category';
        categorySection.innerHTML = `<div class="category-title">${category}</div>`;

        categories[category].forEach(({ data, count }) => {
            const itemEl = document.createElement('div');
            itemEl.className = 'item-entry';

            // 稀有度颜色
            const rarityColors = {
                'common': '#91a2f0',
                'uncommon': '#9bdfff',
                'rare': '#d69bff'
            };
            const rarityColor = rarityColors[data.rarity] || '#91a2f0';
            const rarityText = {
                'common': '普通',
                'uncommon': '稀有',
                'rare': '珍稀'
            };

            itemEl.innerHTML = `
                <div class="item-header">
                    <span class="item-name" style="color: ${rarityColor}">${data.name}</span>
                    <span class="item-count">x${count}</span>
                </div>
                <div class="item-desc">${data.desc}</div>
                <div class="item-rarity" style="color: ${rarityColor}">稀有度：${rarityText[data.rarity]}</div>
                ${data.inCombat === false ? '<div class="item-usage">⚠️ 无法在战斗中使用</div>' : '<div class="item-usage">可在战斗中使用</div>'}
            `;

            categorySection.appendChild(itemEl);
        });

        manageList.appendChild(categorySection);
    });

    // 如果没有道具
    if (Object.values(categories).every(cat => cat.length === 0)) {
        manageList.innerHTML = '<div class="no-items">暂无道具</div>';
    }
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
    const itemPanel = document.getElementById('item-panel');

    logEl.innerHTML = '';
    skillPanel.innerHTML = '';
    itemPanel.innerHTML = '';

    const appendLog = (text) => {
        const div = document.createElement('div');
        div.className = 'log-line';

        // Colorize based on content
        if (text.startsWith('>>>')) {
            div.classList.add('log-important');
        } else if (text.startsWith('>')) {
            div.classList.add('log-action');
        } else if (text.includes('💥') || text.includes('造成')) {
            div.classList.add('log-damage');
        } else if (text.includes('💚') || text.includes('恢复')) {
            div.classList.add('log-heal');
        } else if (text.includes('🛡️') || text.includes('护盾')) {
            div.classList.add('log-shield');
        } else if (text.includes('⚡') || text.includes('⚔️') || text.includes('🔥')) {
            div.classList.add('log-effect');
        } else if (text.includes('掉落') || text.includes('回收战场物资') || text.includes('可回收物资')) {
            div.classList.add('log-drop');
        } else if (text.includes('已结束') || text.includes('无法') || text.includes('冷却')) {
            div.classList.add('log-warning');
        }

        div.textContent = text;
        logEl.appendChild(div);
        logEl.scrollTop = logEl.scrollHeight;
    };

    const updateUI = () => {
        renderCombatUI(currentCombat);
        renderItemPanel();
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
        if (type === 'battle_drops') {
            // 处理战斗掉落，更新库存
            if (data && Array.isArray(data)) {
                data.forEach(drop => {
                    addItemToInventory(drop.id, drop.count);
                });
                // 更新UI显示
                updateResourceUI();
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
            <div class="skill-meta">
                <span class="skill-title">${skill.name}</span>
                <span class="skill-desc">${skill.desc}</span>
            </div>
        `;
        btn.onclick = () => {
            currentCombat.playerAction(skillId);
        };
        skillPanel.appendChild(btn);
    });

    // Render Items
    function renderItemPanel() {
        if (!itemPanel) return;
        itemPanel.innerHTML = '';

        Object.keys(playerInventory).forEach(itemId => {
            const count = playerInventory[itemId];
            const itemData = ITEMS.find(i => i.id === itemId);
            if (!itemData) return;

            // 只显示可以在战斗中使用的道具
            if (itemData.inCombat === false) return;

            const btn = document.createElement('button');
            btn.className = 'btn-item';
            if (count <= 0) btn.classList.add('depleted');

            const usageText = itemData.desc
                ? itemData.desc
                : (itemData.type === 'heal'
                    ? `恢复 ${itemData.val} 点生命值`
                    : itemData.type === 'buff_atk'
                        ? `攻击力提升 ${(itemData.val * 100).toFixed(0)}%，持续 ${itemData.duration} 回合`
                        : itemData.type === 'buff_shield'
                            ? `获得 ${itemData.val} 点护盾`
                            : '使用后消耗一个回合');

            btn.innerHTML = `
                <div class="item-title">
                    <span>${itemData.name}</span>
                    <span>x${count}</span>
                </div>
                <div class="item-desc">${usageText}</div>
            `;
            btn.disabled = count <= 0 || currentCombat.state !== 'PLAYER_ACT';

            btn.onclick = () => {
                if (count > 0 && currentCombat.useItem) {
                    const success = currentCombat.useItem(itemId);
                    if (success) {
                        playerInventory[itemId]--;
                        saveInventory();
                        renderItemPanel();
                    }
                }
            };

            itemPanel.appendChild(btn);
        });
    }

    renderItemPanel();
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
