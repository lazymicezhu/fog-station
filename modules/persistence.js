/**
 * 持久化模块 - 统一的存储管理
 * Persistence Module - Unified Storage Management
 */

const STORAGE_VERSION = '1.0.0';
const STORAGE_KEY_PREFIX = 'fog_station_';

/**
 * 存储键定义
 */
export const STORAGE_KEYS = {
  GAME_STATE: `${STORAGE_KEY_PREFIX}game_state`,
  USER_PROFILE: `${STORAGE_KEY_PREFIX}user`,
  COMBAT_TEAM: `${STORAGE_KEY_PREFIX}combat_team`,
  SETTINGS: `${STORAGE_KEY_PREFIX}settings`,
};

/**
 * 默认游戏状态
 */
const DEFAULT_GAME_STATE = {
  version: STORAGE_VERSION,
  day: 1,
  minutes: 0,
  samplePermits: 10,
  stabilizerCount: 3,
  researchProgress: 0,
  subjects: [],
  logs: [],
  alertLogs: [],
};

/**
 * 获取存储数据
 * @param {string} key - 存储键
 * @param {*} defaultValue - 默认值
 * @returns {*} 存储的数据或默认值
 */
export function getStorage(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    const data = JSON.parse(raw);

    // 版本检查和迁移
    if (data.version && data.version !== STORAGE_VERSION) {
      console.warn(`Storage version mismatch: ${data.version} -> ${STORAGE_VERSION}`);
      return migrateData(key, data);
    }

    return data;
  } catch (error) {
    console.error(`Error reading storage key "${key}":`, error);
    return defaultValue;
  }
}

/**
 * 设置存储数据
 * @param {string} key - 存储键
 * @param {*} value - 要存储的数据
 * @returns {boolean} 是否成功
 */
export function setStorage(key, value) {
  try {
    const data = {
      ...value,
      version: STORAGE_VERSION,
      lastSaved: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`Error writing storage key "${key}":`, error);
    return false;
  }
}

/**
 * 删除存储数据
 * @param {string} key - 存储键
 */
export function removeStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing storage key "${key}":`, error);
  }
}

/**
 * 清空所有游戏数据
 */
export function clearAllGameData() {
  Object.values(STORAGE_KEYS).forEach(key => {
    removeStorage(key);
  });
}

/**
 * 加载游戏状态
 * @returns {Object} 游戏状态
 */
export function loadGameState() {
  return getStorage(STORAGE_KEYS.GAME_STATE, { ...DEFAULT_GAME_STATE });
}

/**
 * 保存游戏状态
 * @param {Object} state - 游戏状态
 * @returns {boolean} 是否成功
 */
export function saveGameState(state) {
  return setStorage(STORAGE_KEYS.GAME_STATE, state);
}

/**
 * 数据迁移
 * @param {string} key - 存储键
 * @param {Object} oldData - 旧数据
 * @returns {Object} 迁移后的数据
 */
function migrateData(key, oldData) {
  // TODO: 实现版本迁移逻辑
  console.log(`Migrating data for key "${key}"`);

  // 简单的兼容性处理：保留旧数据，更新版本号
  return {
    ...oldData,
    version: STORAGE_VERSION,
  };
}

/**
 * 导出游戏数据
 * @returns {string} JSON字符串
 */
export function exportGameData() {
  const data = {};
  Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
    const value = getStorage(key);
    if (value) {
      data[name] = value;
    }
  });
  return JSON.stringify(data, null, 2);
}

/**
 * 导入游戏数据
 * @param {string} jsonString - JSON字符串
 * @returns {boolean} 是否成功
 */
export function importGameData(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    let success = true;

    Object.entries(data).forEach(([name, value]) => {
      const key = STORAGE_KEYS[name];
      if (key) {
        success = setStorage(key, value) && success;
      }
    });

    return success;
  } catch (error) {
    console.error('Error importing game data:', error);
    return false;
  }
}

/**
 * 自动保存装饰器
 * @param {Function} fn - 要装饰的函数
 * @param {Function} getState - 获取状态的函数
 * @returns {Function} 装饰后的函数
 */
export function withAutoSave(fn, getState) {
  return function(...args) {
    const result = fn.apply(this, args);
    saveGameState(getState());
    return result;
  };
}
