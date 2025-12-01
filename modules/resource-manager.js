/**
 * 资源管理器 - 管理采集许可、稳定剂和研究进度
 * Resource Manager - Manage sampling permits, stabilizers and research progress
 */

import { eventBus } from './event-bus.js';
import { stateManager, DAILY_SAMPLE_PERMITS } from './state-manager.js';

export class ResourceManager {
  constructor(elements) {
    this.elements = {
      permitText: elements.permitText,
      stabilizerText: elements.stabilizerText,
      researchText: elements.researchText,
      researchFill: elements.researchFill,
      btnStabilizer: elements.btnStabilizer,
      btnNextDay: elements.btnNextDay,
    };

    this.NEXT_DAY_UNLOCK_MINUTES = 12 * 60;
    this.timeSystem = null;

    this.setupEventListeners();
  }

  setupEventListeners() {
    // 监听资源更新
    eventBus.on('state:resourceUpdated', () => {
      this.updateUI();
    });

    eventBus.on('state:dailyReset', () => {
      this.updateUI();
    });

    eventBus.on('state:researchUpdated', () => {
      this.updateUI();
    });

    eventBus.on('state:stabilizerUsed', () => {
      this.updateUI();
    });

    eventBus.on('state:stabilizerArmed', () => {
      this.updateUI();
    });

    // 绑定按钮事件
    if (this.elements.btnStabilizer) {
      this.elements.btnStabilizer.addEventListener('click', () => {
        this.handleStabilizerClick();
      });
    }
  }

  /**
   * 设置时间系统引用
   */
  setTimeSystem(timeSystem) {
    this.timeSystem = timeSystem;
  }

  /**
   * 更新UI显示
   */
  updateUI() {
    const state = stateManager.getState();

    // 更新采集许可
    if (this.elements.permitText) {
      this.elements.permitText.textContent =
        `${state.samplePermits} / ${DAILY_SAMPLE_PERMITS}`;
    }

    // 更新稳定剂
    if (this.elements.stabilizerText) {
      const armedText = state.stabilizerArmed ? "（已待命）" : "";
      this.elements.stabilizerText.textContent =
        `${state.stabilizerCount} 支${armedText}`;
    }

    // 更新稳定剂按钮状态
    if (this.elements.btnStabilizer) {
      this.elements.btnStabilizer.disabled =
        state.stabilizerCount <= 0 || state.stabilizerArmed;
    }

    // 更新研究进度
    const progressValue = Math.min(100, state.researchProgress);
    if (this.elements.researchFill) {
      this.elements.researchFill.style.width = `${progressValue}%`;
    }
    if (this.elements.researchText) {
      this.elements.researchText.textContent = `${progressValue.toFixed(1)}%`;
    }

    // 更新"下一天"按钮状态
    this.updateNextDayButtonState();
  }

  /**
   * 更新"下一天"按钮状态
   */
  updateNextDayButtonState() {
    if (!this.elements.btnNextDay || !this.timeSystem) return;

    const state = stateManager.getState();
    const { minutes } = this.timeSystem.getTime();
    const unlocked = minutes >= this.NEXT_DAY_UNLOCK_MINUTES || state.samplePermits <= 0;

    this.elements.btnNextDay.disabled = !unlocked;
    this.elements.btnNextDay.classList.toggle("btn-disabled", !unlocked);
  }

  /**
   * 处理稳定剂按钮点击
   */
  handleStabilizerClick() {
    const state = stateManager.getState();
    const currentSubject = state.currentSubject;

    if (!currentSubject) {
      window.sysAlert?.("请先选择一个实验体。");
      return;
    }

    if (stateManager.isSubjectLost(currentSubject)) {
      window.sysAlert?.("观测结果已丢失。");
      return;
    }

    if (state.stabilizerCount <= 0) {
      window.sysAlert?.("稳定剂已用尽。");
      return;
    }

    if (state.stabilizerArmed) return;

    if (stateManager.armStabilizer()) {
      eventBus.emit('log:add', {
        text: "稳定剂已待命：下一次异化增长将被抵消。",
        light: true,
      });
    }
  }

  /**
   * 消耗采集许可
   */
  consumePermit() {
    const state = stateManager.getState();
    if (state.samplePermits > 0) {
      stateManager.updateResource('samplePermits', state.samplePermits - 1);
      return true;
    }
    return false;
  }

  /**
   * 增加研究进度
   */
  addResearchProgress(increment) {
    stateManager.updateResearchProgress(increment);
  }

  /**
   * 重置每日资源
   */
  resetDailyResources() {
    stateManager.resetDailyResources();
  }
}
