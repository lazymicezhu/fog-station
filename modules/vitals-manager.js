/**
 * 生命体征管理器 - 管理心率、脑电和异化进度
 * Vitals Manager - Manage heart rate, brain activity and shift progress
 */

import { eventBus } from './event-bus.js';
import { stateManager } from './state-manager.js';

export class VitalsManager {
  constructor(elements) {
    this.elements = {
      vitalHeartFill: elements.vitalHeartFill,
      vitalBrainFill: elements.vitalBrainFill,
      vitalShiftFill: elements.vitalShiftFill,
      vitalHeartText: elements.vitalHeartText,
      vitalBrainText: elements.vitalBrainText,
      vitalShiftText: elements.vitalShiftText,
      waveHeart: elements.waveHeart,
      waveBrain: elements.waveBrain,
      waveHeartText: elements.waveHeartText,
      waveBrainText: elements.waveBrainText,
    };

    this.vitalsTimer = null;

    // 不同实验体的体征范围
    this.vitalRanges = {
      "S-01": { heart: [120, 170], brain: [55, 82] },
      "S-07": { heart: [90, 135], brain: [60, 90] },
      "S-32": { heart: [60, 110], brain: [50, 85] }
    };

    this.setupEventListeners();
  }

  setupEventListeners() {
    eventBus.on('state:subjectSelected', ({ subject }) => {
      this.stopVitalsTimer();
      if (subject && !stateManager.isSubjectLost(subject)) {
        this.randomizeVitals(true);
        this.startVitalsTimer();
      } else {
        this.clearDisplay();
      }
    });

    eventBus.on('state:shiftUpdated', () => {
      this.updateShiftDisplay();
    });
  }

  /**
   * 随机化生命体征
   */
  randomizeVitals(resetShift = false) {
    const state = stateManager.getState();
    const currentSubject = state.currentSubject;

    if (!currentSubject) return;
    if (stateManager.isSubjectLost(currentSubject)) {
      this.clearDisplay();
      return;
    }

    const ranges = this.vitalRanges[currentSubject.id] || {
      heart: [70, 120],
      brain: [50, 90]
    };

    const { heart: [hMin, hMax], brain: [bMin, bMax] } = ranges;

    let hr = Math.round(hMin + Math.random() * (hMax - hMin));
    let brain = Math.round(bMin + Math.random() * (bMax - bMin));

    // 随机产生异常
    const heartAlert = Math.random() < 0.25;
    const brainAlert = Math.random() < 0.25;

    if (heartAlert) {
      hr = Math.min(hMax + 30, hr + 25 + Math.round(Math.random() * 20));
    }
    if (brainAlert) {
      brain = Math.min(bMax + 25, brain + 15 + Math.round(Math.random() * 25));
    }

    // 更新状态
    stateManager.state.heartAlert = heartAlert;
    stateManager.state.brainAlert = brainAlert;

    if (resetShift) {
      stateManager.state.currentShift = currentSubject.shift || 0;
    }

    // 保存到实验体对象
    currentSubject.lastHeart = hr;
    currentSubject.lastBrain = brain;
    currentSubject.lastHeartAlert = heartAlert;
    currentSubject.lastBrainAlert = brainAlert;

    // 更新显示
    this.updateDisplay(hr, brain);
    this.updateShiftDisplay();

    // 重置采样标志
    stateManager.state.canSampleInCycle = true;

    // 发送日志事件
    const logText = `生命体征更新：心率 ${hr} bpm${heartAlert ? "（异常）" : ""}，脑电活动 ${brain}%${brainAlert ? "（异常）" : ""}，异化进度 ${stateManager.state.currentShift.toFixed(1)}%。`;
    const alertFlag = heartAlert || brainAlert;

    eventBus.emit('log:add', {
      text: logText,
      light: true,
      alert: alertFlag,
    });
  }

  /**
   * 更新生命体征显示
   */
  updateDisplay(hr, brain) {
    const state = stateManager.getState();

    // 更新进度条
    if (this.elements.vitalHeartFill) {
      this.elements.vitalHeartFill.style.width = Math.min(hr / 2, 100) + "%";
      this.elements.vitalHeartFill.classList.toggle("alert", state.heartAlert);
    }

    if (this.elements.vitalBrainFill) {
      this.elements.vitalBrainFill.style.width = Math.min(brain, 100) + "%";
      this.elements.vitalBrainFill.classList.toggle("alert", state.brainAlert);
    }

    // 更新文本
    if (this.elements.vitalHeartText) {
      this.elements.vitalHeartText.textContent = hr + " bpm";
    }
    if (this.elements.vitalBrainText) {
      this.elements.vitalBrainText.textContent = brain + "%";
    }

    // 更新波形
    this.updateWaveforms(hr, brain);
  }

  /**
   * 更新异化进度显示
   */
  updateShiftDisplay() {
    const state = stateManager.getState();
    const shift = state.currentShift;

    if (this.elements.vitalShiftFill) {
      this.elements.vitalShiftFill.style.width = Math.min(shift, 100) + "%";
    }
    if (this.elements.vitalShiftText) {
      this.elements.vitalShiftText.textContent = shift.toFixed(1) + "%";
    }
  }

  /**
   * 更新波形动画
   */
  updateWaveforms(hr = null, brain = null) {
    if (this.elements.waveHeartText && hr !== null) {
      this.elements.waveHeartText.textContent = `${hr} bpm`;
    }
    if (this.elements.waveBrainText && brain !== null) {
      this.elements.waveBrainText.textContent = `${brain}%`;
    }

    if (this.elements.waveHeart && hr !== null) {
      const amp = Math.max(0.7, Math.min(1.6, hr / 120));
      this.elements.waveHeart.style.animationDuration =
        `${Math.max(0.8, Math.min(2.4, 120 / Math.max(hr, 1)))}s`;
      this.elements.waveHeart.style.setProperty("--wave-amp", amp.toFixed(2));
    }

    if (this.elements.waveBrain && brain !== null) {
      const amp = Math.max(0.7, Math.min(1.5, brain / 90));
      this.elements.waveBrain.style.animationDuration =
        `${Math.max(0.8, Math.min(2.4, 120 / Math.max(brain, 1)))}s`;
      this.elements.waveBrain.style.setProperty("--wave-amp", amp.toFixed(2));
    }
  }

  /**
   * 清空显示
   */
  clearDisplay() {
    if (this.elements.vitalHeartFill) this.elements.vitalHeartFill.style.width = "0%";
    if (this.elements.vitalBrainFill) this.elements.vitalBrainFill.style.width = "0%";
    if (this.elements.vitalHeartText) this.elements.vitalHeartText.textContent = "——";
    if (this.elements.vitalBrainText) this.elements.vitalBrainText.textContent = "——";

    this.updateWaveforms(null, null);
  }

  /**
   * 启动定时刷新
   */
  startVitalsTimer() {
    this.stopVitalsTimer();
    this.vitalsTimer = setInterval(() => {
      this.randomizeVitals();
    }, 5000);
  }

  /**
   * 停止定时刷新
   */
  stopVitalsTimer() {
    if (this.vitalsTimer) {
      clearInterval(this.vitalsTimer);
      this.vitalsTimer = null;
    }
  }

  /**
   * 销毁
   */
  destroy() {
    this.stopVitalsTimer();
  }
}
