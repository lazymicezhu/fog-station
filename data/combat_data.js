// data/combat_data.js

export const ELEMENT_TYPES = {
  QUANTUM: 'quantum', // 量子
  FIRE: 'fire',       // 火焰
  THUNDER: 'thunder', // 雷电
  PSYCHIC: 'psychic', // 超能
  ALLOY: 'alloy'      // 合金
};

export const ELEMENT_NAMES = {
  [ELEMENT_TYPES.QUANTUM]: '量子',
  [ELEMENT_TYPES.FIRE]: '火焰',
  [ELEMENT_TYPES.THUNDER]: '雷电',
  [ELEMENT_TYPES.PSYCHIC]: '超能',
  [ELEMENT_TYPES.ALLOY]: '合金'
};

// 属性克制倍率 (Attacker -> Defender)
export const ELEMENT_CHART = {
  [ELEMENT_TYPES.QUANTUM]: { [ELEMENT_TYPES.FIRE]: 1.5, [ELEMENT_TYPES.PSYCHIC]: 0 },
  [ELEMENT_TYPES.FIRE]: { [ELEMENT_TYPES.ALLOY]: 1.5 },
  [ELEMENT_TYPES.ALLOY]: { [ELEMENT_TYPES.THUNDER]: 1.5 },
  [ELEMENT_TYPES.THUNDER]: { [ELEMENT_TYPES.QUANTUM]: 1.5 },
  [ELEMENT_TYPES.PSYCHIC]: {} // 不弱任何，也不克制任何
};

export const SUBJECT_DB = [
  // --- 超能 ---
  {
    id: 'S-01',
    name: '小咪',
    element: ELEMENT_TYPES.PSYCHIC,
    forms: [
      { name: '小咪', hp: 120, xpMax: 1500, skills: ['psychic_kinesis', 'cat_scratch'] },
      { name: '咪咪', hp: 150, xpMax: 4000, skills: ['psychic_kinesis', 'cat_scratch', 'breakthrough'] },
      { name: '哈基咪', hp: 200, xpMax: 0, skills: ['psychic_kinesis', 'cat_scratch', 'breakthrough', 'erase'] }
    ]
  },
  // --- 量子 ---
  {
    id: 'S-07',
    name: '马楼',
    element: ELEMENT_TYPES.QUANTUM,
    forms: [
      { name: '马楼', hp: 130, xpMax: 1800, skills: ['monkey_roar', 'grassland'] },
      { name: '函数猿', hp: 180, xpMax: 0, skills: ['monkey_roar', 'grassland'] } // 假设二阶段相同技能或增强
    ]
  },
  // --- 火焰 ---
  {
    id: 'S-13',
    name: '炉心犬',
    element: ELEMENT_TYPES.FIRE,
    forms: [
      { name: '炉心犬', hp: 125, xpMax: 1400, skills: ['fire_bite', 'fire_dash'] },
      { name: '赤焰犬', hp: 175, xpMax: 3600, skills: ['fire_bite', 'fire_dash', 'fire_sacrifice'] },
      { name: '余烬主', hp: 230, xpMax: 0, skills: ['fire_bite', 'fire_dash', 'fire_sacrifice'] }
    ]
  },
  // --- 雷电 ---
  {
    id: 'S-21',
    name: '元素体',
    element: ELEMENT_TYPES.THUNDER,
    forms: [
      { name: '元素体', hp: 110, xpMax: 1200, skills: ['arc', 'overload'] },
      { name: '电核', hp: 160, xpMax: 0, skills: ['arc', 'overload', 'static_shield'] }
    ]
  },
  // --- 合金 ---
  {
    id: 'S-32',
    name: '钢脉志愿',
    element: ELEMENT_TYPES.ALLOY,
    forms: [
      { name: '钢脉志愿', hp: 150, xpMax: 1600, skills: ['steel_fist', 'auto_heal'] },
      { name: '稳态志愿', hp: 210, xpMax: 0, skills: ['steel_fist', 'auto_heal', 'mech_calm'] }
    ]
  }
];

export const SKILL_DB = {
  // --- Common / Psychic ---
  'psychic_kinesis': { name: '念力', type: 'damage', val: 60, desc: '造成 60 点伤害' },
  'cat_scratch': { 
    name: '挠', 
    type: 'special', 
    base: 40, 
    desc: '抛硬币三次，伤害为 40 * 正面次数',
    logic: 'coin_toss_3_times'
  },
  'breakthrough': { name: '突破', type: 'effect', desc: '获得对手身上的一个道具 (模拟: 偷取Buff)', logic: 'steal_buff' },
  'erase': { name: '擦除', type: 'effect', desc: '【专属】4回合后抹除对手', logic: 'doom_4' },

  // --- Quantum ---
  'monkey_roar': { name: '吼叫', type: 'damage', val: 50, desc: '造成 50 点伤害' },
  'grassland': { name: '青青草地', type: 'dot', val: 20, duration: 3, desc: '造成 20 点持续伤害，持续 3 回合' },

  // --- Fire ---
  'fire_bite': { name: '灼咬', type: 'damage_dot', val: 55, dotVal: 20, duration: 2, desc: '造成 55 伤害并点燃 2 回合(20/回合)' },
  'fire_dash': { name: '火线冲锋', type: 'damage_self', val: 70, selfDmg: 10, desc: '造成 70 伤害，自身受到 10 点反噬' },
  'fire_sacrifice': { name: '燃烧献祭', type: 'buff', desc: '下回合必定先手，伤害+40', logic: 'next_priority_dmg_up' },

  // --- Thunder ---
  'arc': { name: '电弧', type: 'damage', val: 50, desc: '造成 50 伤害' }, // 简化连锁逻辑
  'overload': { name: '过载', type: 'damage_stun_self', val: 70, desc: '造成 70 伤害，下回合自身无法行动' },
  'static_shield': { name: '静电罩', type: 'shield_reflect', val: 0, desc: '反弹首个近战伤害 50%' },

  // --- Alloy ---
  'steel_fist': { name: '钢拳', type: 'damage', val: 55, desc: '造成 55 伤害' },
  'auto_heal': { name: '自愈凝胶', type: 'heal', val: 50, cd: 2, desc: '恢复 50 HP' },
  'mech_calm': { name: '机械冷静', type: 'buff', desc: '下回合必定命中', logic: 'next_hit_sure' }
};

export const ITEMS = [
  { id: 'heal_s', name: '纳米修补剂(白)', type: 'heal', val: 80 },
  { id: 'heal_m', name: '纳米修补剂(蓝)', type: 'heal', val: 160 },
  { id: 'buff_atk_s', name: '过载注射(白)', type: 'buff_atk', val: 0.15, duration: 2 }
];
