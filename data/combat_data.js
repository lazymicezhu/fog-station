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
  [ELEMENT_TYPES.QUANTUM]: { [ELEMENT_TYPES.FIRE]: 1.5, [ELEMENT_TYPES.PSYCHIC]: 0.8 }, // Psychic slightly resistant to quantum based on lore? Or neutral. Doc says Psychic immune Quantum dmg?
  // Doc: "超能：不弱任何属性，免疫量子任何伤害"
  // Correcting chart based on doc:
  [ELEMENT_TYPES.QUANTUM]: { [ELEMENT_TYPES.FIRE]: 1.5, [ELEMENT_TYPES.PSYCHIC]: 0 }, 
  [ELEMENT_TYPES.FIRE]: { [ELEMENT_TYPES.ALLOY]: 1.5 },
  [ELEMENT_TYPES.ALLOY]: { [ELEMENT_TYPES.THUNDER]: 1.5 },
  [ELEMENT_TYPES.THUNDER]: { [ELEMENT_TYPES.QUANTUM]: 1.5 },
  [ELEMENT_TYPES.PSYCHIC]: {} 
};

export const SUBJECT_DB = [
  {
    "id": "S-01",
    "name": "小咪",
    "element": "psychic",
    "forms": [
      {
        "name": "小咪",
        "hp": 120,
        "xpMax": 1500,
        "skills": [
          "psychic_kinesis",
          "cat_scratch"
        ]
      },
      {
        "name": "咪咪",
        "hp": 150,
        "xpMax": 4000,
        "skills": [
          "psychic_kinesis",
          "cat_scratch",
          "breakthrough"
        ]
      },
      {
        "name": "哈基咪",
        "hp": 200,
        "xpMax": 0,
        "skills": [
          "psychic_kinesis",
          "cat_scratch",
          "breakthrough",
          "erase"
        ]
      }
    ]
  },
  {
    "id": "S-02",
    "name": "反观者",
    "element": "psychic",
    "forms": [
      {
        "name": "反观者",
        "hp": 110,
        "xpMax": 1300,
        "skills": [
          "mind_needle",
          "echo_vision"
        ]
      },
      {
        "name": "夜镜",
        "hp": 160,
        "xpMax": 3600,
        "skills": [
          "mind_needle",
          "echo_vision",
          "silence_field"
        ]
      },
      {
        "name": "真视",
        "hp": 210,
        "xpMax": 0,
        "skills": [
          "mind_needle",
          "echo_vision",
          "silence_field"
        ]
      }
    ]
  },
  {
    "id": "S-07",
    "name": "马楼",
    "element": "quantum",
    "forms": [
      {
        "name": "马楼",
        "hp": 130,
        "xpMax": 1800,
        "skills": [
          "monkey_roar",
          "grassland"
        ]
      },
      {
        "name": "函数猿",
        "hp": 180,
        "xpMax": 0,
        "skills": [
          "monkey_roar",
          "grassland"
        ]
      }
    ]
  },
  {
    "id": "S-08",
    "name": "叠码鼠",
    "element": "quantum",
    "forms": [
      {
        "name": "叠码鼠",
        "hp": 90,
        "xpMax": 1000,
        "skills": [
          "quantum_bite",
          "superpos_run"
        ]
      },
      {
        "name": "叠加体",
        "hp": 130,
        "xpMax": 0,
        "skills": [
          "quantum_bite",
          "superpos_run"
        ]
      }
    ]
  },
  {
    "id": "S-09",
    "name": "相位狐",
    "element": "quantum",
    "forms": [
      {
        "name": "相位狐",
        "hp": 115,
        "xpMax": 1400,
        "skills": [
          "tail_strike",
          "phase_shift"
        ]
      },
      {
        "name": "隧道狐",
        "hp": 165,
        "xpMax": 0,
        "skills": [
          "tail_strike",
          "phase_shift",
          "melt_break"
        ]
      }
    ]
  },
  {
    "id": "S-13",
    "name": "炉心犬",
    "element": "fire",
    "forms": [
      {
        "name": "炉心犬",
        "hp": 125,
        "xpMax": 1400,
        "skills": [
          "fire_bite",
          "fire_dash"
        ]
      },
      {
        "name": "赤焰犬",
        "hp": 175,
        "xpMax": 3600,
        "skills": [
          "fire_bite",
          "fire_dash",
          "fire_sac"
        ]
      },
      {
        "name": "余烬主",
        "hp": 230,
        "xpMax": 0,
        "skills": [
          "fire_bite",
          "fire_dash",
          "fire_sac"
        ]
      }
    ]
  },
  {
    "id": "S-14",
    "name": "炉渣蜥",
    "element": "fire",
    "forms": [
      {
        "name": "炉渣蜥",
        "hp": 135,
        "xpMax": 1700,
        "skills": [
          "melt_wave",
          "smoke_cover"
        ]
      },
      {
        "name": "硅熔蜥",
        "hp": 190,
        "xpMax": 0,
        "skills": [
          "melt_wave",
          "smoke_cover",
          "magma_pulse"
        ]
      }
    ]
  },
  {
    "id": "S-21",
    "name": "元素体",
    "element": "thunder",
    "forms": [
      {
        "name": "元素体",
        "hp": 110,
        "xpMax": 1200,
        "skills": [
          "arc",
          "overload"
        ]
      },
      {
        "name": "电核",
        "hp": 160,
        "xpMax": 0,
        "skills": [
          "arc",
          "overload",
          "static_shield"
        ]
      }
    ]
  },
  {
    "id": "S-32",
    "name": "钢脉志愿",
    "element": "alloy",
    "forms": [
      {
        "name": "钢脉志愿",
        "hp": 150,
        "xpMax": 1600,
        "skills": [
          "steel_fist",
          "auto_heal"
        ]
      },
      {
        "name": "稳态志愿",
        "hp": 210,
        "xpMax": 0,
        "skills": [
          "steel_fist",
          "auto_heal",
          "mech_calm"
        ]
      }
    ]
  },
  {
    "id": "S-33",
    "name": "钢颚犬",
    "element": "alloy",
    "forms": [
      {
        "name": "钢颚犬",
        "hp": 135,
        "xpMax": 1400,
        "skills": [
          "metal_bite",
          "armor_cover"
        ]
      },
      {
        "name": "装甲犬",
        "hp": 185,
        "xpMax": 0,
        "skills": [
          "metal_bite",
          "armor_cover",
          "pin_down"
        ]
      }
    ]
  },
  // 超能 - 浮点系列
  {
    "id": "S-03",
    "name": "浮点",
    "element": "psychic",
    "forms": [
      {
        "name": "浮点",
        "hp": 100,
        "xpMax": 1200,
        "skills": ["gravity_touch", "memory_bubble"]
      },
      {
        "name": "漂浮体",
        "hp": 140,
        "xpMax": 3200,
        "skills": ["gravity_touch", "memory_bubble", "collapse"]
      },
      {
        "name": "空壳",
        "hp": 190,
        "xpMax": 0,
        "skills": ["gravity_touch", "memory_bubble", "collapse"]
      }
    ]
  },
  // 超能 - 镜灵系列
  {
    "id": "S-04",
    "name": "镜灵",
    "element": "psychic",
    "forms": [
      {
        "name": "镜灵",
        "hp": 125,
        "xpMax": 1600,
        "skills": ["mirror_reflect", "split_frame"]
      },
      {
        "name": "裂像",
        "hp": 170,
        "xpMax": 0,
        "skills": ["mirror_reflect", "split_frame", "draft"]
      }
    ]
  },
  // 量子 - 随机鹦系列
  {
    "id": "S-10",
    "name": "随机鹦",
    "element": "quantum",
    "forms": [
      {
        "name": "随机鹦",
        "hp": 105,
        "xpMax": 1500,
        "skills": ["repeat", "recursive_peck"]
      },
      {
        "name": "递归鸟",
        "hp": 155,
        "xpMax": 0,
        "skills": ["repeat", "recursive_peck", "bell_state"]
      }
    ]
  },
  // 火焰 - 灰翼系列
  {
    "id": "S-15",
    "name": "灰翼",
    "element": "fire",
    "forms": [
      {
        "name": "灰翼",
        "hp": 90,
        "xpMax": 900,
        "skills": ["ash_spread", "after_warm"]
      },
      {
        "name": "灰烬蛾",
        "hp": 130,
        "xpMax": 0,
        "skills": ["ash_spread", "after_warm", "self_burn"]
      }
    ]
  },
  // 火焰 - 浮火系列
  {
    "id": "S-16",
    "name": "浮火",
    "element": "fire",
    "forms": [
      {
        "name": "浮火",
        "hp": 80,
        "xpMax": 800,
        "skills": ["dark_flame", "sub_burn"]
      },
      {
        "name": "隐焰",
        "hp": 120,
        "xpMax": 0,
        "skills": ["dark_flame", "sub_burn", "ablation"]
      }
    ]
  },
  // 雷电 - 脉冲蛇系列
  {
    "id": "S-22",
    "name": "脉冲蛇",
    "element": "thunder",
    "forms": [
      {
        "name": "脉冲蛇",
        "hp": 115,
        "xpMax": 1400,
        "skills": ["ambush_shock", "voltage_hiss"]
      },
      {
        "name": "雷鳞蛇",
        "hp": 170,
        "xpMax": 0,
        "skills": ["ambush_shock", "voltage_hiss", "discharge_ring"]
      }
    ]
  },
  // 雷电 - 天线鸦系列
  {
    "id": "S-23",
    "name": "天线鸦",
    "element": "thunder",
    "forms": [
      {
        "name": "天线鸦",
        "hp": 95,
        "xpMax": 1000,
        "skills": ["wire_peck", "signal_jam"]
      },
      {
        "name": "闪烁鸦",
        "hp": 140,
        "xpMax": 0,
        "skills": ["wire_peck", "signal_jam", "flicker"]
      }
    ]
  },
  // 雷电 - 净空员系列
  {
    "id": "S-24",
    "name": "净空员",
    "element": "thunder",
    "forms": [
      {
        "name": "净空员",
        "hp": 140,
        "xpMax": 1700,
        "skills": ["silent_thunder", "insulate_step"]
      },
      {
        "name": "避雷人",
        "hp": 190,
        "xpMax": 0,
        "skills": ["silent_thunder", "insulate_step", "mag_storm"]
      }
    ]
  },
  // 合金 - 哨戒蜂系列
  {
    "id": "S-34",
    "name": "哨戒蜂",
    "element": "alloy",
    "forms": [
      {
        "name": "哨戒蜂",
        "hp": 100,
        "xpMax": 1100,
        "skills": ["shrapnel", "jam_freq"]
      },
      {
        "name": "铁幕蜂",
        "hp": 145,
        "xpMax": 0,
        "skills": ["shrapnel", "jam_freq", "self_destruct"]
      }
    ]
  },
  // 合金 - 链式护工系列
  {
    "id": "S-35",
    "name": "链式护工",
    "element": "alloy",
    "forms": [
      {
        "name": "链式护工",
        "hp": 170,
        "xpMax": 1900,
        "skills": ["chain_anchor", "counter_stance"]
      },
      {
        "name": "锚链者",
        "hp": 230,
        "xpMax": 0,
        "skills": ["chain_anchor", "counter_stance", "steel_wall"]
      }
    ]
  }
];

export const SKILL_DB = {
  "psychic_kinesis": {
    "name": "念力",
    "type": "damage",
    "val": 60,
    "desc": "造成 60 点伤害"
  },
  "cat_scratch": {
    "name": "挠",
    "type": "special",
    "base": 40,
    "logic": "coin_toss_3_times",
    "desc": "抛硬币三次，伤害为 40 * 正面次数"
  },
  "breakthrough": {
    "name": "突破",
    "type": "effect",
    "desc": "获得NPC身上的一个道具"
  },
  "erase": {
    "name": "擦除",
    "type": "effect",
    "logic": "doom_4",
    "desc": "【专属】4回合后，让对手从存在层级中彻底消失"
  },
  "mind_needle": {
    "name": "心灵针",
    "type": "damage",
    "val": 55,
    "desc": "造成 55 伤害，目标 1 回合无法使用高费技能"
  },
  "echo_vision": {
    "name": "回声视野",
    "type": "effect",
    "desc": "复制上回合对手的技能效果"
  },
  "silence_field": {
    "name": "静默场",
    "type": "debuff",
    "val": 20,
    "duration": 2,
    "desc": "造成 30 伤害，使对手两回合内伤害-20%"
  },
  "gravity_touch": {
    "name": "失重触",
    "type": "damage",
    "val": 45,
    "desc": "造成 45 伤害，使对手下回合必定后手"
  },
  "memory_bubble": {
    "name": "记忆泡",
    "type": "effect",
    "desc": "将对手已用技能封存 2 回合"
  },
  "collapse": {
    "name": "崩折",
    "type": "damage",
    "val": 80,
    "desc": "造成 80 伤害，若对手被封印技能，额外+40"
  },
  "mirror_reflect": {
    "name": "镜反",
    "type": "counter",
    "desc": "将本回合指向自身的首个伤害反弹"
  },
  "split_frame": {
    "name": "裂帧",
    "type": "damage",
    "val": 70,
    "desc": "造成 70 伤害，对方若先手则改为 100"
  },
  "draft": {
    "name": "残稿",
    "type": "damage",
    "val": 60,
    "desc": "三连击，总伤害 60，命中后自身免疫下一次控制"
  },
  "monkey_roar": {
    "name": "吼叫",
    "type": "damage",
    "val": 50,
    "desc": "造成 50 点伤害"
  },
  "grassland": {
    "name": "青青草地",
    "type": "dot",
    "val": 20,
    "duration": 3,
    "desc": "造成 20 点持续伤害，持续 3 回合"
  },
  "quantum_bite": {
    "name": "量子啮咬",
    "type": "damage",
    "val": 35,
    "desc": "造成 35 伤害，若本回合未被击中则下回合伤害翻倍"
  },
  "superpos_run": {
    "name": "叠加跑轮",
    "type": "buff",
    "desc": "两回合内闪避率+30%"
  },
  "tail_strike": {
    "name": "干涉尾击",
    "type": "damage",
    "val": 60,
    "desc": "造成 60 伤害，对合金额外+20"
  },
  "phase_shift": {
    "name": "相位移",
    "type": "effect",
    "desc": "交换双方当前增益/减益"
  },
  "melt_break": {
    "name": "溶断",
    "type": "damage",
    "val": 45,
    "desc": "造成 45 伤害，抹除对方护盾类效果"
  },
  "repeat": {
    "name": "口令复述",
    "type": "effect",
    "desc": "复制对手基础攻击并立即施放"
  },
  "recursive_peck": {
    "name": "递归喙击",
    "type": "damage",
    "val": 30,
    "desc": "造成 30 伤害，50% 概率触发一次额外同值伤害"
  },
  "bell_state": {
    "name": "贝尔态",
    "type": "damage",
    "val": 70,
    "desc": "造成 70 伤害，若上一回合双方都未命中，伤害翻倍"
  },
  "fire_bite": {
    "name": "灼咬",
    "type": "damage_dot",
    "val": 55,
    "dotVal": 20,
    "duration": 2,
    "desc": "造成 55 伤害并点燃 2 回合(20/回合)"
  },
  "fire_dash": {
    "name": "火线冲锋",
    "type": "damage_self",
    "val": 70,
    "selfDmg": 10,
    "desc": "造成 70 伤害，自身受 10 点反噬"
  },
  "fire_sac": {
    "name": "燃烧献祭",
    "type": "buff",
    "desc": "换取本回合必定先手并伤害+40"
  },
  "melt_wave": {
    "name": "熔波",
    "type": "damage",
    "val": 60,
    "desc": "造成 60 伤害，对合金额外+30"
  },
  "smoke_cover": {
    "name": "黑烟掩护",
    "type": "buff",
    "desc": "两回合内被击中则反伤 15"
  },
  "magma_pulse": {
    "name": "岩浆脉冲",
    "type": "damage",
    "val": 80,
    "desc": "造成 80 伤害，CD 2 回合"
  },
  "ash_spread": {
    "name": "灰烬散布",
    "type": "damage",
    "val": 30,
    "desc": "造成 30 伤害，命中后对方命中率-15% 两回合"
  },
  "after_warm": {
    "name": "余温",
    "type": "damage",
    "val": 45,
    "desc": "造成 45 伤害，若对方已点燃，则额外持续伤害 25/回合 2 回合"
  },
  "self_burn": {
    "name": "自燃升温",
    "type": "buff",
    "desc": "自身伤害+25% 持续两回合"
  },
  "dark_flame": {
    "name": "暗焰刺",
    "type": "damage",
    "val": 40,
    "desc": "造成 40 伤害，命中后清空对方护盾"
  },
  "sub_burn": {
    "name": "潜燃",
    "type": "buff",
    "desc": "潜行一回合，下一回合攻击必中并+30"
  },
  "ablation": {
    "name": "烧蚀",
    "type": "damage",
    "val": 55,
    "desc": "造成 55 伤害，对雷电额外+20"
  },
  "arc": {
    "name": "电弧",
    "type": "damage",
    "val": 50,
    "desc": "造成 50 伤害，连锁伤害"
  },
  "overload": {
    "name": "过载",
    "type": "damage_self_stun",
    "val": 70,
    "desc": "造成 70 伤害，自身下回合无法行动"
  },
  "static_shield": {
    "name": "静电罩",
    "type": "buff",
    "desc": "反弹首个近战伤害 50%"
  },
  "ambush_shock": {
    "name": "伏击电击",
    "type": "damage",
    "val": 60,
    "desc": "造成 60 伤害，若先手则附带麻痹 1 回合"
  },
  "voltage_hiss": {
    "name": "升压嘶鸣",
    "type": "buff",
    "desc": "自身伤害+20% 持续 3 回合"
  },
  "discharge_ring": {
    "name": "放电环",
    "type": "damage",
    "val": 30,
    "desc": "造成 30 伤害"
  },
  "wire_peck": {
    "name": "导线啄",
    "type": "damage",
    "val": 45,
    "desc": "造成 45 伤害，对量子额外+15"
  },
  "signal_jam": {
    "name": "信号扰断",
    "type": "debuff",
    "desc": "使对手本回合技能失败概率+40%"
  },
  "flicker": {
    "name": "闪烁",
    "type": "damage",
    "val": 75,
    "desc": "三连击，总伤害 75"
  },
  "silent_thunder": {
    "name": "静默落雷",
    "type": "damage",
    "val": 70,
    "desc": "造成 70 伤害，若对手有护盾则伤害翻倍"
  },
  "insulate_step": {
    "name": "绝缘步",
    "type": "buff",
    "desc": "解除自身全部负面并获得一层护盾 40"
  },
  "mag_storm": {
    "name": "磁暴",
    "type": "damage",
    "val": 90,
    "desc": "造成 90 伤害，对合金额外+20"
  },
  "steel_fist": {
    "name": "钢拳",
    "type": "damage",
    "val": 55,
    "desc": "造成 55 伤害"
  },
  "auto_heal": {
    "name": "自愈凝胶",
    "type": "heal",
    "val": 50,
    "desc": "恢复 50 HP"
  },
  "mech_calm": {
    "name": "机械冷静",
    "type": "buff",
    "desc": "下回合必定命中"
  },
  "metal_bite": {
    "name": "金属咬合",
    "type": "damage",
    "val": 60,
    "desc": "造成 60 伤害，对火焰额外+15"
  },
  "armor_cover": {
    "name": "护甲覆盖",
    "type": "buff",
    "desc": "获得 60 护盾，持续 2 回合"
  },
  "pin_down": {
    "name": "牵制",
    "type": "damage",
    "val": 30,
    "desc": "造成 30 伤害，迫使对手下回合只能普通攻击"
  },
  "shrapnel": {
    "name": "弹片",
    "type": "damage",
    "val": 120,
    "desc": "三连击，总伤害 120"
  },
  "jam_freq": {
    "name": "干扰射频",
    "type": "debuff",
    "desc": "让对手伤害-15% 两回合"
  },
  "self_destruct": {
    "name": "自毁脉冲",
    "type": "damage_self",
    "val": 90,
    "selfDmg": 30,
    "desc": "造成 90 伤害，自身跌落 30 hp"
  },
  "chain_anchor": {
    "name": "链锚",
    "type": "damage",
    "val": 65,
    "desc": "造成 65 伤害，并使对手速度-20%"
  },
  "counter_stance": {
    "name": "反击姿态",
    "type": "buff",
    "desc": "本回合受到伤害则回击 50"
  },
  "steel_wall": {
    "name": "钢壁",
    "type": "buff",
    "desc": "获得 100 护盾"
  }
};

export const ITEMS = [
  // 治疗类
  { id: 'heal_s', name: '纳米修补剂(白)', type: 'heal', val: 80, desc: '恢复80点生命值', rarity: 'common' },
  { id: 'heal_m', name: '纳米修补剂(蓝)', type: 'heal', val: 160, desc: '恢复160点生命值', rarity: 'uncommon' },
  { id: 'heal_l', name: '纳米修补剂(紫)', type: 'heal', val: 300, desc: '恢复300点生命值', rarity: 'rare' },

  // 增益类
  { id: 'buff_atk_s', name: '过载注射(白)', type: 'buff_atk', val: 0.15, duration: 2, desc: '攻击力提升15%，持续2回合', rarity: 'common' },
  { id: 'buff_atk_m', name: '过载注射(蓝)', type: 'buff_atk', val: 0.25, duration: 3, desc: '攻击力提升25%，持续3回合', rarity: 'uncommon' },
  { id: 'buff_def_s', name: '护盾生成器', type: 'buff_shield', val: 80, desc: '获得80点护盾', rarity: 'common' },

  // 资源类（不在战斗中使用）
  { id: 'stabilizer', name: '稳定剂', type: 'resource', desc: '可以抵消一次异化增长', rarity: 'uncommon', inCombat: false },
  { id: 'sample_permit', name: '采集许可', type: 'resource', desc: '允许进行一次样本采集', rarity: 'common', inCombat: false },
  { id: 'research_data', name: '研究数据', type: 'resource', desc: '增加研究进度', rarity: 'rare', inCombat: false }
];

// 战斗掉落表
export const DROP_TABLE = {
  common: [
    { id: 'heal_s', weight: 40 },
    { id: 'buff_atk_s', weight: 25 },
    { id: 'sample_permit', weight: 20 },
    { id: 'buff_def_s', weight: 15 }
  ],
  uncommon: [
    { id: 'heal_m', weight: 30 },
    { id: 'stabilizer', weight: 25 },
    { id: 'buff_atk_m', weight: 20 },
    { id: 'sample_permit', weight: 15 },
    { id: 'research_data', weight: 10 }
  ],
  rare: [
    { id: 'heal_l', weight: 35 },
    { id: 'stabilizer', weight: 30 },
    { id: 'research_data', weight: 25 },
    { id: 'buff_atk_m', weight: 10 }
  ]
};
