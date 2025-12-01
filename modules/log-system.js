/**
 * 日志系统 - 管理监控日志的显示和记录
 * Log System - Manage monitoring logs display and recording
 */

import { eventBus } from './event-bus.js';
import { stateManager } from './state-manager.js';

export class LogSystem {
  constructor(logListEl) {
    this.logListEl = logListEl;
    this.statusColors = {
      white: "#91a2f0",
      orange: "#ffcb8a",
      red: "#ff9bb0"
    };

    this.setupEventListeners();
  }

  setupEventListeners() {
    // 监听状态变化
    eventBus.on('state:logAdded', () => {
      this.render();
    });

    eventBus.on('state:logsCleared', () => {
      this.render();
    });

    eventBus.on('state:logViewToggled', () => {
      this.render();
    });
  }

  /**
   * 添加日志
   */
  addLog(text, light = false, alert = false, color = null, kind = null, shift = null) {
    const state = stateManager.getState();
    const currentSubject = state.currentSubject;
    const subjectId = currentSubject ? currentSubject.id : "——";

    // 时间戳需要从时间系统获取，这里暂时用占位符
    const ts = this.getTimestamp();

    const logItem = {
      ts,
      subject: subjectId,
      text,
      alert,
      light,
      color,
      kind,
      shift
    };

    stateManager.addLog(logItem);
  }

  /**
   * 为特定实验体添加日志
   */
  addLogForSubject(subjectId, text, alert = false, color = null, kind = null, shift = null) {
    const ts = this.getTimestamp();

    const logItem = {
      ts,
      subject: subjectId,
      text,
      alert,
      light: false,
      color,
      kind,
      shift
    };

    stateManager.addLog(logItem);
  }

  /**
   * 渲染日志列表
   */
  render() {
    if (!this.logListEl) return;

    const state = stateManager.getState();
    const logs = state.alertView ? state.alertLogs : state.logs;

    this.logListEl.innerHTML = "";

    logs.forEach(item => {
      const entry = document.createElement("div");
      entry.className = "log-entry";

      if (item.kind === "sample") {
        entry.classList.add("log-entry-sample");
      }

      const shiftValue = typeof item.shift === "number"
        ? Math.min(100, Math.max(0, item.shift))
        : null;

      if (shiftValue !== null) {
        entry.style.setProperty("--sample-shift", `${shiftValue}%`);
      }

      if (item.alert) {
        entry.classList.add("alert");
      }

      const meta = document.createElement("div");
      meta.className = "log-meta";
      meta.innerHTML = `<span>${item.subject}</span><span>${item.ts}</span>`;

      const body = document.createElement("div");
      body.className = "log-text";
      body.textContent = item.text + (item.light ? "" : "\n");

      if (item.color && this.statusColors[item.color]) {
        body.style.color = this.statusColors[item.color];
      }

      entry.appendChild(meta);
      entry.appendChild(body);
      this.logListEl.appendChild(entry);
    });

    this.logListEl.scrollTop = this.logListEl.scrollHeight;
  }

  /**
   * 清空日志
   */
  clearLogs() {
    stateManager.clearLogs();
  }

  /**
   * 获取时间戳（需要与时间系统集成）
   */
  getTimestamp() {
    // TODO: 从时间系统获取格式化的时间
    // 暂时返回占位符
    return "第 1 天 · 00:00";
  }

  /**
   * 设置时间格式化函数
   */
  setTimeFormatter(formatter) {
    this.getTimestamp = formatter;
  }
}
