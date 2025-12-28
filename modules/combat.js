// modules/combat.js
import { ELEMENT_CHART, SKILL_DB, ITEMS, DROP_TABLE } from '../data/combat_data.js';
import { savePlayerSubjects } from './cultivation.js';

export class CombatSession {
    constructor(playerSubject, enemySubject, onLog, onUpdate, onEvent) {
        this.player = playerSubject;
        this.enemy = enemySubject;
        this.onLog = onLog;
        this.onUpdate = onUpdate;
        this.onEvent = onEvent || (() => {}); // New callback for effects

        this.turnCount = 1;
        this.state = 'INIT';

        // Enhanced buff/debuff system
        this.buffs = { player: [], enemy: [] };
        this.shields = { player: 0, enemy: 0 };
        this.dots = { player: [], enemy: [] }; // Damage over time effects
        this.cooldowns = { player: {}, enemy: {} }; // Skill cooldowns
        this.stunned = { player: false, enemy: false }; // Stun status
        this.lastSkillUsed = { player: null, enemy: null }; // Track last skill for echo/copy effects
        this.dooms = { player: [], enemy: [] }; // Delayed execution effects (e.g., erase)
    }

    async start() {
        this.onLog(`--- 遭遇异常实体 ---`);
        this.onLog(`目标: ${this.enemy.getName()} (HP: ${this.enemy.currentHp}/${this.enemy.getMaxHp()})`);
        this.onLog(`出战: ${this.player.getName()} (HP: ${this.player.currentHp}/${this.player.getMaxHp()})`);
        
        // Coin Toss Animation
        this.onLog("正在判定行动顺序...");
        if (this.onEvent) await this.onEvent('coin_toss_start');
        
        const playerFirst = Math.random() > 0.5;
        
        if (this.onEvent) await this.onEvent('coin_toss_result', playerFirst);
        
        this.onLog(playerFirst ? `>>> ${this.player.getName()} 获得先手！` : `>>> ${this.enemy.getName()} 获得先手！`);
        
        this.state = playerFirst ? 'PLAYER_ACT' : 'ENEMY_ACT';
        this.nextTurn();
    }

    nextTurn() {
        if (this.checkEnd()) return;

        // Process turn start effects (DOT, buffs, etc.)
        this.processTurnStart();

        if (this.state === 'ENEMY_ACT') {
            setTimeout(() => this.enemyAction(), 1200);
        } else {
            this.onLog(`
[第 ${this.turnCount} 回合] 等待指令...`);
            this.onUpdate();
        }
    }

    processTurnStart() {
        // Apply DOT effects
        ['player', 'enemy'].forEach(side => {
            const target = side === 'player' ? this.player : this.enemy;
            const dots = this.dots[side];

            // Process each DOT
            for (let i = dots.length - 1; i >= 0; i--) {
                const dot = dots[i];
                const dmg = dot.value;
                target.currentHp = Math.max(0, target.currentHp - dmg);
                this.onLog(`  🔥 ${target.getName()} 受到持续伤害 ${dmg}`);
                this.onEvent('damage', { target: side, val: dmg });

                // Decrease duration
                dot.duration--;
                if (dot.duration <= 0) {
                    dots.splice(i, 1);
                    this.onLog(`  ${target.getName()} 的 ${dot.name} 效果已结束`);
                }
            }

            // Update buffs duration
            const buffs = this.buffs[side];
            for (let i = buffs.length - 1; i >= 0; i--) {
                const buff = buffs[i];
                buff.duration--;
                if (buff.duration <= 0) {
                    buffs.splice(i, 1);
                    this.onLog(`  ${target.getName()} 的 ${buff.name} 效果已结束`);
                }
            }

            // Decrease cooldowns
            const cds = this.cooldowns[side];
            Object.keys(cds).forEach(skillId => {
                if (cds[skillId] > 0) {
                    cds[skillId]--;
                }
            });

            // Process delayed execution effects
            const dooms = this.dooms[side];
            for (let i = dooms.length - 1; i >= 0; i--) {
                const doom = dooms[i];
                doom.remaining--;
                if (doom.remaining <= 0) {
                    target.currentHp = 0;
                    dooms.splice(i, 1);
                    this.onLog(`  🧨 ${target.getName()} 被擦除，存在记录清空`);
                }
            }

            // Clear stun status at turn start
            if (this.stunned[side]) {
                this.stunned[side] = false;
                this.onLog(`  ${target.getName()} 恢复行动能力`);
            }
        });

        if (this.checkEnd()) return;
        this.onUpdate();
    }

    playerAction(skillId) {
        if (this.state !== 'PLAYER_ACT') return;

        // Check if stunned
        if (this.stunned.player) {
            this.onLog(`${this.player.getName()} 无法行动！`);
            this.state = 'ENEMY_ACT';
            this.nextTurn();
            return;
        }

        // Check cooldown
        if (this.cooldowns.player[skillId] > 0) {
            this.onLog(`技能冷却中... 剩余 ${this.cooldowns.player[skillId]} 回合`);
            return;
        }

        this.executeSkill(this.player, this.enemy, skillId, 'player', 'enemy');
        if (this.checkEnd()) return;

        this.state = 'ENEMY_ACT';
        this.nextTurn();
    }

    enemyAction() {
        // Check if stunned
        if (this.stunned.enemy) {
            this.onLog(`${this.enemy.getName()} 无法行动！`);
            this.state = 'PLAYER_ACT';
            this.turnCount++;
            this.nextTurn();
            return;
        }

        const skills = this.enemy.getSkills();
        // Filter out skills on cooldown
        const availableSkills = skills.filter(skillId => !this.cooldowns.enemy[skillId] || this.cooldowns.enemy[skillId] <= 0);
        const randomSkill = availableSkills.length > 0
            ? availableSkills[Math.floor(Math.random() * availableSkills.length)]
            : skills[Math.floor(Math.random() * skills.length)];

        this.executeSkill(this.enemy, this.player, randomSkill, 'enemy', 'player');

        if (this.checkEnd()) return;

        this.state = 'PLAYER_ACT';
        this.turnCount++;
        this.nextTurn();
    }

    executeSkill(attacker, defender, skillId, attackerSide, defenderSide) {
        const skill = SKILL_DB[skillId];
        if (!skill) return;

        this.onLog(`> ${attacker.getName()} 使用了 [${skill.name}]`);
        this.lastSkillUsed[attackerSide] = skillId;

        // Get buffs for damage calculation
        const atkBuffs = this.buffs[attackerSide];
        const defBuffs = this.buffs[defenderSide];
        let damageMultiplier = 1.0;

        // Calculate damage multiplier from buffs
        atkBuffs.forEach(buff => {
            if (buff.type === 'atk_boost') damageMultiplier += buff.value;
        });
        defBuffs.forEach(buff => {
            if (buff.type === 'atk_reduce') damageMultiplier -= buff.value;
        });

        // 1. Handle Damage Skills
        if (skill.type.includes('damage') || skill.type === 'special') {
            let dmg = skill.val || 0;

            // Special logic: coin toss
            if (skill.logic === 'coin_toss_3_times') {
                let heads = 0;
                let results = [];
                for(let i=0; i<3; i++) {
                    if(Math.random() > 0.5) { heads++; results.push("正"); }
                    else { results.push("反"); }
                }
                dmg = (skill.base || 0) * heads;
                this.onLog(`  硬币判定：${results.join('')} -> ${heads}倍伤害`);
            }

            // Special skill effects - Extra damage vs specific elements
            if (skillId === 'tail_strike' && defender.element === 'alloy') {
                dmg += 20;
                this.onLog(`  对合金额外伤害 +20`);
            } else if (skillId === 'melt_wave' && defender.element === 'alloy') {
                dmg += 30;
                this.onLog(`  对合金额外伤害 +30`);
            } else if (skillId === 'metal_bite' && defender.element === 'fire') {
                dmg += 15;
                this.onLog(`  对火焰额外伤害 +15`);
            } else if (skillId === 'ablation' && defender.element === 'thunder') {
                dmg += 20;
                this.onLog(`  对雷电额外伤害 +20`);
            } else if (skillId === 'wire_peck' && defender.element === 'quantum') {
                dmg += 15;
                this.onLog(`  对量子额外伤害 +15`);
            } else if (skillId === 'mag_storm' && defender.element === 'alloy') {
                dmg += 20;
                this.onLog(`  对合金额外伤害 +20`);
            }

            // Shield破坏效果
            if (skillId === 'silent_thunder' && this.shields[defenderSide] > 0) {
                dmg *= 2;
                this.onLog(`  对护盾目标伤害翻倍！`);
            } else if (skillId === 'melt_break') {
                if (this.shields[defenderSide] > 0) {
                    this.shields[defenderSide] = 0;
                    this.onLog(`  💥 破坏护盾！`);
                }
            } else if (skillId === 'dark_flame' && this.shields[defenderSide] > 0) {
                this.shields[defenderSide] = 0;
                this.onLog(`  🔥 清空对方护盾`);
            }

            // Apply element multiplier
            const elementMult = this.getElementMultiplier(attacker.element, defender.element);
            if (elementMult > 1.0) {
                dmg *= elementMult;
                this.onLog(`  效果拔群！(克制 x${elementMult})`);
            } else if (elementMult === 0) {
                dmg = 0;
                this.onLog(`  无效攻击！(免疫)`);
            }

            // Apply damage multiplier from buffs
            dmg *= damageMultiplier;
            dmg = Math.floor(dmg);

            // Apply to shield first, then HP
            const defShield = this.shields[defenderSide];
            if (defShield > 0) {
                const shieldDmg = Math.min(defShield, dmg);
                this.shields[defenderSide] -= shieldDmg;
                dmg -= shieldDmg;
                this.onLog(`  🛡️ 护盾吸收 ${shieldDmg} 点伤害 (剩余: ${this.shields[defenderSide]})`);
            }

            if (dmg > 0) {
                defender.currentHp = Math.max(0, defender.currentHp - dmg);
                this.onLog(`  💥 造成 ${dmg} 点伤害`);
                this.onEvent('damage', { target: defenderSide, val: dmg });

                // Check for counter/thorns buffs on defender
                const defBuffsList = this.buffs[defenderSide];
                defBuffsList.forEach(buff => {
                    if (buff.type === 'thorns' && buff.value > 0) {
                        attacker.currentHp = Math.max(0, attacker.currentHp - buff.value);
                        this.onLog(`  ⚡ ${defender.getName()} 反伤 ${buff.value} 点`);
                        this.onEvent('damage', { target: attackerSide, val: buff.value });
                    } else if (buff.type === 'counter' && buff.value > 0) {
                        const counterDmg = typeof buff.value === 'number' && buff.value < 1
                            ? Math.floor(dmg * buff.value)
                            : buff.value;
                        attacker.currentHp = Math.max(0, attacker.currentHp - counterDmg);
                        this.onLog(`  ⚔️ ${defender.getName()} 反击 ${counterDmg} 点`);
                        this.onEvent('damage', { target: attackerSide, val: counterDmg });
                    }
                });
            }
        }

        // 2. Self Damage
        if (skill.type.includes('self') && skill.selfDmg) {
            attacker.currentHp = Math.max(0, attacker.currentHp - skill.selfDmg);
            this.onLog(`  💢 受到反噬伤害 ${skill.selfDmg}`);
            this.onEvent('damage', { target: attackerSide, val: skill.selfDmg });
        }

        // 3. Heal
        if (skill.type === 'heal') {
            const heal = skill.val;
            attacker.currentHp = Math.min(attacker.getMaxHp(), attacker.currentHp + heal);
            this.onLog(`  💚 恢复了 ${heal} 点生命`);
            this.onEvent('heal', { target: attackerSide, val: heal });
        }

        // 4. DOT (Damage Over Time)
        if (skill.type === 'dot' || skill.type.includes('damage_dot')) {
            const dotDmg = skill.dotVal || skill.val || 20;
            const duration = skill.duration || 2;
            this.dots[defenderSide].push({
                name: skill.name,
                value: dotDmg,
                duration: duration
            });
            this.onLog(`  🔥 施加了持续伤害 (${dotDmg}/回合, ${duration}回合)`);
        }

        // 5. Buffs
        if (skill.type === 'buff' || skill.type.includes('damage_self_stun')) {
            if (skillId === 'fire_sac') {
                // Fire sacrifice: priority next turn + damage boost
                this.buffs[attackerSide].push({
                    name: '燃烧献祭',
                    type: 'atk_boost',
                    value: 0.40,
                    duration: 1
                });
                this.onLog(`  ⚡ 下回合获得先手并伤害+40`);
            } else if (skillId === 'auto_heal') {
                // Already handled as heal
            } else if (skillId === 'armor_cover') {
                // Shield
                this.shields[attackerSide] += 60;
                this.onLog(`  🛡️ 获得 60 点护盾 (2回合)`);
            } else if (skillId === 'static_shield') {
                // Shield buff
                this.shields[attackerSide] += 50;
                this.buffs[attackerSide].push({
                    name: '静电罩',
                    type: 'counter',
                    value: 0.5,
                    duration: 2
                });
                this.onLog(`  🛡️ 获得静电护盾，反弹近战伤害50%`);
            } else if (skillId === 'self_burn') {
                // ATK buff
                this.buffs[attackerSide].push({
                    name: '自燃升温',
                    type: 'atk_boost',
                    value: 0.25,
                    duration: 2
                });
                this.onLog(`  🔥 伤害提升 25% (2回合)`);
            } else if (skillId === 'voltage_hiss') {
                this.buffs[attackerSide].push({
                    name: '升压',
                    type: 'atk_boost',
                    value: 0.20,
                    duration: 3
                });
                this.onLog(`  ⚡ 伤害提升 20% (3回合)`);
            } else if (skillId === 'mech_calm') {
                this.buffs[attackerSide].push({
                    name: '机械冷静',
                    type: 'accuracy',
                    value: 1.0,
                    duration: 1
                });
                this.onLog(`  🎯 下回合必定命中`);
            } else if (skillId === 'smoke_cover') {
                this.buffs[attackerSide].push({
                    name: '黑烟掩护',
                    type: 'thorns',
                    value: 15,
                    duration: 2
                });
                this.onLog(`  💨 两回合内被击中则反伤 15`);
            } else if (skillId === 'counter_stance') {
                this.buffs[attackerSide].push({
                    name: '反击姿态',
                    type: 'counter',
                    value: 50,
                    duration: 1
                });
                this.onLog(`  ⚔️ 本回合受到伤害则回击 50`);
            } else if (skillId === 'steel_wall') {
                this.shields[attackerSide] += 100;
                this.onLog(`  🛡️ 获得 100 点护盾`);
            } else if (skillId === 'superpos_run') {
                this.buffs[attackerSide].push({
                    name: '叠加跑轮',
                    type: 'evasion',
                    value: 0.3,
                    duration: 2
                });
                this.onLog(`  💨 两回合内闪避率+30%`);
            } else if (skillId === 'insulate_step') {
                // Clear all debuffs
                this.buffs[attackerSide] = this.buffs[attackerSide].filter(b => b.type !== 'atk_reduce');
                this.shields[attackerSide] += 40;
                this.onLog(`  ⚡ 解除全部负面效果并获得 40 护盾`);
            }

            // Stun self if needed (overload)
            if (skillId === 'overload') {
                this.stunned[attackerSide] = true;
                this.onLog(`  ⚠️ 下回合无法行动`);
            }
        }

        // 6. Debuffs
        if (skill.type === 'debuff') {
            if (skillId === 'silence_field') {
                this.buffs[defenderSide].push({
                    name: '静默场',
                    type: 'atk_reduce',
                    value: 0.20,
                    duration: 2
                });
                this.onLog(`  🔇 使对手伤害降低 20% (2回合)`);
            } else if (skillId === 'jam_freq') {
                this.buffs[defenderSide].push({
                    name: '干扰射频',
                    type: 'atk_reduce',
                    value: 0.15,
                    duration: 2
                });
                this.onLog(`  📡 使对手伤害降低 15% (2回合)`);
            }
        }

        // 7. Set cooldown if skill has CD
        if (skill.cd && skill.cd > 0) {
            this.cooldowns[attackerSide][skillId] = skill.cd;
            this.onLog(`  ⏱️ 技能进入冷却 (${skill.cd}回合)`);
        }

        // Special skill effects that need extra processing
        if (skillId === 'magma_pulse') {
            this.cooldowns[attackerSide][skillId] = 2;
        } else if (skillId === 'recursive_peck') {
            // 50% chance for extra damage
            if (Math.random() < 0.5) {
                const extraDmg = 30;
                defender.currentHp = Math.max(0, defender.currentHp - extraDmg);
                this.onLog(`  🔄 触发递归！额外造成 ${extraDmg} 点伤害`);
                this.onEvent('damage', { target: defenderSide, val: extraDmg });
            }
        } else if (skillId === 'phase_shift') {
            // Swap buffs/debuffs
            const temp = this.buffs[attackerSide];
            this.buffs[attackerSide] = this.buffs[defenderSide];
            this.buffs[defenderSide] = temp;
            this.onLog(`  🔀 交换了双方的增益/减益效果`);
        } else if (skillId === 'echo_vision') {
            // Copy enemy's last skill
            const lastSkill = this.lastSkillUsed[defenderSide];
            if (lastSkill) {
                this.onLog(`  👁️ 复制了对手的技能 [${SKILL_DB[lastSkill]?.name}]`);
                // Execute the copied skill (simplified, may cause recursion issues in complex cases)
                setTimeout(() => {
                    this.executeSkill(attacker, defender, lastSkill, attackerSide, defenderSide);
                }, 300);
            } else {
                this.onLog(`  👁️ 没有可复制的技能`);
            }
        } else if (skillId === 'repeat') {
            // Copy opponent's basic attack
            this.onLog(`  🔁 复制对手基础攻击`);
            const basicSkill = defender.getSkills()[0]; // Assume first skill is basic
            if (basicSkill) {
                setTimeout(() => {
                    this.executeSkill(attacker, defender, basicSkill, attackerSide, defenderSide);
                }, 300);
            }
        } else if (skillId === 'pin_down') {
            // Force opponent to use only basic attack next turn (simplified)
            this.onLog(`  🔒 牵制对手，下回合只能使用普通攻击`);
        } else if (skillId === 'ambush_shock') {
            // If first strike, add stun
            if (this.turnCount === 1) {
                this.stunned[defenderSide] = true;
                this.onLog(`  ⚡ 先手麻痹！对手下回合无法行动`);
            }
        } else if (skillId === 'signal_jam') {
            // Skill failure chance (simplified - just show message)
            this.onLog(`  📡 干扰信号，对手技能失败概率+40%`);
        } else if (skillId === 'breakthrough') {
            const drop = this.rollSingleDrop();
            if (drop) {
                const item = ITEMS.find(i => i.id === drop.id);
                this.onLog(`  🧲 突破成功，获得道具：${item ? item.name : drop.id}`);
                if (this.onEvent) {
                    this.onEvent('battle_drops', [{ id: drop.id, count: 1 }]);
                }
            } else {
                this.onLog(`  🧲 突破未获取到道具`);
            }
        } else if (skillId === 'erase') {
            const existing = this.dooms[defenderSide].find(d => d.id === 'erase');
            if (existing) {
                existing.remaining = Math.max(existing.remaining, 4);
            } else {
                this.dooms[defenderSide].push({ id: 'erase', remaining: 4 });
            }
            this.onLog(`  ⏳ 擦除已标记，${SKILL_DB[skillId]?.name}将在 4 回合后生效`);
        }

        // Special multi-hit skills
        if (skillId === 'draft' || skillId === 'flicker' || skillId === 'shrapnel') {
            // Already handled in main damage, just visual feedback
            this.onLog(`  ⚡ 三连击！`);
        }

        this.onUpdate();
    }

    getElementMultiplier(atkEl, defEl) {
        const map = ELEMENT_CHART[atkEl];
        if (map && map[defEl] !== undefined) return map[defEl];
        return 1.0;
    }

    rollSingleDrop() {
        const rarityRoll = Math.random() * 100;
        let rarity;
        if (rarityRoll < 60) {
            rarity = 'common';
        } else if (rarityRoll < 90) {
            rarity = 'uncommon';
        } else {
            rarity = 'rare';
        }

        const pool = DROP_TABLE[rarity];
        if (!pool || pool.length === 0) return null;

        const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
        let roll = Math.random() * totalWeight;
        for (const dropItem of pool) {
            roll -= dropItem.weight;
            if (roll <= 0) {
                return { id: dropItem.id };
            }
        }
        return { id: pool[pool.length - 1].id };
    }

    useItem(itemId) {
        if (this.state !== 'PLAYER_ACT') {
            this.onLog(`现在无法使用物品`);
            return false;
        }

        const item = ITEMS.find(i => i.id === itemId);
        if (!item) {
            this.onLog(`物品不存在`);
            return false;
        }

        this.onLog(`> 使用了 [${item.name}]`);

        if (item.type === 'heal') {
            const heal = item.val;
            const beforeHp = this.player.currentHp;
            this.player.currentHp = Math.min(this.player.getMaxHp(), this.player.currentHp + heal);
            const actualHeal = this.player.currentHp - beforeHp;
            this.onLog(`  💚 恢复了 ${actualHeal} 点生命`);
            this.onEvent('heal', { target: 'player', val: actualHeal });
        } else if (item.type === 'buff_atk') {
            this.buffs.player.push({
                name: item.name,
                type: 'atk_boost',
                value: item.val,
                duration: item.duration || 2
            });
            this.onLog(`  ⚡ 攻击力提升 ${(item.val * 100).toFixed(0)}% (${item.duration || 2}回合)`);
        } else if (item.type === 'buff_shield') {
            this.shields.player += item.val;
            this.onLog(`  🛡️ 获得 ${item.val} 点护盾`);
        }

        this.onUpdate();

        // Using item ends turn
        this.state = 'ENEMY_ACT';
        this.nextTurn();
        return true;
    }

    checkEnd() {
        if (this.player.currentHp <= 0) {
            this.state = 'END_LOSS';
            this.onLog(`
!!! 警报：${this.player.getName()} 生命反应消失`);
            this.onLog(`战斗结束。任务失败。`);
            this.onLog(`提示：退出战斗系统后将自动恢复生命值。`);

            this.onUpdate();
            return true;
        }
        if (this.enemy.currentHp <= 0) {
            this.state = 'END_WIN';
            this.onLog(`
目标 ${this.enemy.getName()} 已被压制。`);
            this.onLog(`战斗胜利！`);

            const xpGain = 400;
            this.onLog(`获得经验值: ${xpGain}`);
            const res = this.player.gainXp(xpGain);
            if (res.leveled) this.onLog(`系统提示：${this.player.getName()} 获得了成长。`);
            if (res.evolved) this.onLog(`系统警报：${this.player.getName()} 发生了突变进化！`);

            // 战斗掉落系统
            this.onLog(`\n正在回收战场物资...`);
            const drops = this.generateDrops();
            if (drops.length > 0) {
                this.onLog(`获得掉落物品：`);
                drops.forEach(drop => {
                    const item = ITEMS.find(i => i.id === drop.id);
                    this.onLog(`  ├─ ${item.name} x${drop.count}`);
                });

                // 触发掉落回调（传递给UI层处理库存更新）
                if (this.onEvent) {
                    this.onEvent('battle_drops', drops);
                }
            } else {
                this.onLog(`未发现可回收物资。`);
            }

            savePlayerSubjects();
            this.onUpdate();
            return true;
        }
        return false;
    }

    // 生成战斗掉落
    generateDrops() {
        const drops = [];
        const dropCount = Math.floor(Math.random() * 3) + 1; // 掉落1-3个物品

        for (let i = 0; i < dropCount; i++) {
            // 确定掉落稀有度
            const rarityRoll = Math.random() * 100;
            let rarity;
            if (rarityRoll < 60) {
                rarity = 'common';
            } else if (rarityRoll < 90) {
                rarity = 'uncommon';
            } else {
                rarity = 'rare';
            }

            // 从对应稀有度的掉落表中选择物品
            const pool = DROP_TABLE[rarity];
            const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
            let roll = Math.random() * totalWeight;

            for (const dropItem of pool) {
                roll -= dropItem.weight;
                if (roll <= 0) {
                    const existing = drops.find(d => d.id === dropItem.id);
                    if (existing) {
                        existing.count++;
                    } else {
                        drops.push({ id: dropItem.id, count: 1 });
                    }
                    break;
                }
            }
        }

        return drops;
    }
}
