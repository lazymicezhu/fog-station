/**
 * 状态管理器 - 统一管理全局状态
 * State Manager - Centralized state management
 */

import { eventBus } from './event-bus.js';
import { saveGameState, loadGameState } from './persistence.js';

const MAX_LOGS = 18;
const DAILY_SAMPLE_PERMITS = 10;
const INITIAL_STABILIZERS = 3;

/**
 * 全局状态
 */
class StateManager {
  constructor() {
    this.state = {
      // 当前选中的实验体
      currentSubject: null,
      currentSubjectIndex: -1,

      // 实验体列表
      subjects: [],

      // 资源
      samplePermits: DAILY_SAMPLE_PERMITS,
      stabilizerCount: INITIAL_STABILIZERS,
      stabilizerArmed: false,
      researchProgress: 0,

      // 生命体征
      currentShift: 0,
      heartAlert: false,
      brainAlert: false,

      // 日志
      logs: [],
      alertLogs: [],
      alertView: false,

      // 采样控制
      canSampleInCycle: true,

      // 测试序列（调试用）
      testSeq: { step: 0 },

      // 日常状态队列
      dailyQueues: { white: [], orange: [], red: [] },

      // 派蒙位置
      paimonPosition: { x: null, y: null },

      // 聊天状态
      chatOpen: false,

      // 教程状态
      guideActive: false,
      guideStepIndex: 0,
    };

    this.initialized = false;
  }

  /**
   * 初始化状态（从持久化加载）
   */
  init(subjects) {
    if (this.initialized) return;

    this.state.subjects = subjects;

    // 尝试从本地存储加载
    const saved = loadGameState();
    if (saved && saved.day) {
      this.mergeState(saved);
    }

    this.initialized = true;
    eventBus.emit('state:initialized', this.state);
  }

  /**
   * 合并保存的状态
   */
  mergeState(saved) {
    if (saved.samplePermits !== undefined) {
      this.state.samplePermits = saved.samplePermits;
    }
    if (saved.stabilizerCount !== undefined) {
      this.state.stabilizerCount = saved.stabilizerCount;
    }
    if (saved.researchProgress !== undefined) {
      this.state.researchProgress = saved.researchProgress;
    }
    if (saved.subjects && Array.isArray(saved.subjects)) {
      // 合并实验体的shift进度
      saved.subjects.forEach(savedSubj => {
        const subj = this.state.subjects.find(s => s.id === savedSubj.id);
        if (subj && savedSubj.shift !== undefined) {
          subj.shift = savedSubj.shift;
        }
      });
    }
    if (saved.logs && Array.isArray(saved.logs)) {
      this.state.logs = saved.logs.slice(-MAX_LOGS);
    }
    if (saved.alertLogs && Array.isArray(saved.alertLogs)) {
      this.state.alertLogs = saved.alertLogs;
    }
  }

  /**
   * 获取完整状态
   */
  getState() {
    return this.state;
  }

  /**
   * 选择实验体
   */
  selectSubject(index) {
    if (index < 0 || index >= this.state.subjects.length) {
      this.state.currentSubject = null;
      this.state.currentSubjectIndex = -1;
    } else {
      this.state.currentSubject = this.state.subjects[index];
      this.state.currentSubjectIndex = index;
      this.state.currentShift = this.state.currentSubject.shift || 0;
    }

    this.state.heartAlert = false;
    this.state.brainAlert = false;
    this.state.stabilizerArmed = false;
    this.state.testSeq.step = 0;

    eventBus.emit('state:subjectSelected', {
      subject: this.state.currentSubject,
      index: this.state.currentSubjectIndex,
    });

    this.autoSave();
  }

  /**
   * 更新资源
   */
  updateResource(key, value) {
    if (key in this.state) {
      this.state[key] = value;
      eventBus.emit('state:resourceUpdated', { key, value });
      this.autoSave();
    }
  }

  /**
   * 设置稳定剂待命状态
   */
  armStabilizer() {
    if (this.state.stabilizerCount > 0 && !this.state.stabilizerArmed) {
      this.state.stabilizerArmed = true;
      eventBus.emit('state:stabilizerArmed', true);
      this.autoSave();
      return true;
    }
    return false;
  }

  /**
   * 使用稳定剂
   */
  useStabilizer() {
    if (this.state.stabilizerArmed && this.state.stabilizerCount > 0) {
      this.state.stabilizerCount -= 1;
      this.state.stabilizerArmed = false;
      eventBus.emit('state:stabilizerUsed', this.state.stabilizerCount);
      this.autoSave();
      return true;
    }
    return false;
  }

  /**
   * 更新异化进度
   */
  updateShift(increment) {
    const prevShift = this.state.currentShift;
    this.state.currentShift = Math.min(100, this.state.currentShift + increment);
    const actualIncrement = this.state.currentShift - prevShift;

    if (this.state.currentSubject) {
      this.state.currentSubject.shift = this.state.currentShift;
    }

    eventBus.emit('state:shiftUpdated', {
      shift: this.state.currentShift,
      increment: actualIncrement,
    });

    this.autoSave();
    return actualIncrement;
  }

  /**
   * 更新研究进度
   */
  updateResearchProgress(increment) {
    this.state.researchProgress = Math.min(100,
      parseFloat((this.state.researchProgress + increment).toFixed(2))
    );
    eventBus.emit('state:researchUpdated', this.state.researchProgress);
    this.autoSave();
  }

  /**
   * 重置每日资源
   */
  resetDailyResources() {
    this.state.samplePermits = DAILY_SAMPLE_PERMITS;
    this.state.stabilizerArmed = false;
    this.state.canSampleInCycle = true;
    eventBus.emit('state:dailyReset', {
      samplePermits: this.state.samplePermits,
    });
    this.autoSave();
  }

  /**
   * 添加日志
   */
  addLog(logItem) {
    this.state.logs.push(logItem);
    if (this.state.logs.length > MAX_LOGS) {
      this.state.logs.shift();
    }
    if (logItem.alert) {
      this.state.alertLogs.push(logItem);
    }
    eventBus.emit('state:logAdded', logItem);
    this.autoSave();
  }

  /**
   * 清空日志
   */
  clearLogs() {
    this.state.logs = [];
    this.state.alertLogs = [];
    eventBus.emit('state:logsCleared');
    this.autoSave();
  }

  /**
   * 切换日志视图
   */
  toggleLogView() {
    this.state.alertView = !this.state.alertView;
    eventBus.emit('state:logViewToggled', this.state.alertView);
    return this.state.alertView;
  }

  /**
   * 判断实验体是否丢失
   */
  isSubjectLost(subject) {
    if (!subject) return false;
    return (subject.shift || 0) >= 100;
  }

  /**
   * 自动保存
   */
  autoSave() {
    const stateToSave = {
      day: 1, // 这个需要从时间系统获取
      minutes: 0, // 这个需要从时间系统获取
      samplePermits: this.state.samplePermits,
      stabilizerCount: this.state.stabilizerCount,
      researchProgress: this.state.researchProgress,
      subjects: this.state.subjects.map(s => ({
        id: s.id,
        shift: s.shift || 0,
      })),
      logs: this.state.logs,
      alertLogs: this.state.alertLogs,
    };
    saveGameState(stateToSave);
  }
}

// 导出单例
export const stateManager = new StateManager();

// 导出常量
export { MAX_LOGS, DAILY_SAMPLE_PERMITS, INITIAL_STABILIZERS };
