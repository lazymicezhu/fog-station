// modules/combat.js
import { ELEMENT_CHART, SKILL_DB } from '../data/combat_data.js';
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
        
        this.buffs = { player: [], enemy: [] };
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
        
        this.onLog(playerFirst ? "判定结果：己方先手" : "判定结果：敌方先手");
        
        this.state = playerFirst ? 'PLAYER_ACT' : 'ENEMY_ACT';
        this.nextTurn();
    }

    nextTurn() {
        if (this.checkEnd()) return;

        if (this.state === 'ENEMY_ACT') {
            setTimeout(() => this.enemyAction(), 1200);
        } else {
            this.onLog(`
[第 ${this.turnCount} 回合] 等待指令...`);
            this.onUpdate(); 
        }
    }

    playerAction(skillId) {
        if (this.state !== 'PLAYER_ACT') return; 
        
        this.executeSkill(this.player, this.enemy, skillId);
        if (this.checkEnd()) return;
        
        this.state = 'ENEMY_ACT';
        this.nextTurn(); 
    }

    enemyAction() {
        const skills = this.enemy.getSkills();
        const randomSkill = skills[Math.floor(Math.random() * skills.length)];
        this.executeSkill(this.enemy, this.player, randomSkill);
        
        if (this.checkEnd()) return;
        
        this.state = 'PLAYER_ACT';
        this.turnCount++;
        this.nextTurn();
    }

    executeSkill(attacker, defender, skillId) {
        const skill = SKILL_DB[skillId];
        if (!skill) return;

        this.onLog(`> ${attacker.getName()} 使用了 [${skill.name}]`);

        // 1. Calc Damage
        if (skill.type.includes('damage') || skill.type === 'special') {
            let dmg = skill.val || 0;
            
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

            const multiplier = this.getElementMultiplier(attacker.element, defender.element);
            if (multiplier > 1.0) {
                dmg *= multiplier;
                this.onLog(`  效果拔群！(克制 x${multiplier})`);
            } else if (multiplier === 0) {
                dmg = 0;
                this.onLog(`  无效攻击！(免疫)`);
            }

            dmg = Math.floor(dmg);
            defender.currentHp = Math.max(0, defender.currentHp - dmg);
            
            // Log & Visual Effect
            this.onLog(`  💥 造成 ${dmg} 点伤害`);
            this.onEvent('damage', { target: defender === this.player ? 'player' : 'enemy', val: dmg });
        }
        
        if (skill.type.includes('self') && skill.selfDmg) {
            attacker.currentHp = Math.max(0, attacker.currentHp - skill.selfDmg);
            this.onLog(`  💢 受到反噬伤害 ${skill.selfDmg}`);
            this.onEvent('damage', { target: attacker === this.player ? 'player' : 'enemy', val: skill.selfDmg });
        }
        
         if (skill.type === 'heal') {
            const heal = skill.val;
            attacker.currentHp = Math.min(attacker.getMaxHp(), attacker.currentHp + heal);
            this.onLog(`  💚 恢复了 ${heal} 点生命`);
            this.onEvent('heal', { target: attacker === this.player ? 'player' : 'enemy', val: heal });
         }
         
         if (skill.type === 'dot') {
             this.onLog(`  ☠️ 施加了持续伤害`);
         }

        this.onUpdate(); 
    }

    getElementMultiplier(atkEl, defEl) {
        const map = ELEMENT_CHART[atkEl];
        if (map && map[defEl] !== undefined) return map[defEl];
        return 1.0;
    }

    checkEnd() {
        if (this.player.currentHp <= 0) {
            this.state = 'END_LOSS';
            this.onLog(`
!!! 警报：${this.player.getName()} 生命反应消失`);
            this.onLog(`战斗结束。任务失败。`);
            
            // Full Heal on Loss
            this.player.currentHp = this.player.getMaxHp();
            this.onLog(`系统：${this.player.getName()} 生命值已重置（模拟训练保护）。`);
            
            this.onUpdate();
            return true;
        }
        if (this.enemy.currentHp <= 0) {
            this.state = 'END_WIN';
            this.onLog(`
目标 ${this.enemy.getName()} 已被压制。`);
            this.onLog(`战斗胜利。`);
            
            // Full Heal on Win (Requested Feature)
            this.player.currentHp = this.player.getMaxHp();
            this.onLog(`系统：${this.player.getName()} 生命值已完全恢复。`);

            const xpGain = 400; 
            this.onLog(`获得经验值: ${xpGain}`);
            const res = this.player.gainXp(xpGain);
            if (res.leveled) this.onLog(`系统提示：${this.player.getName()} 获得了成长。`);
            if (res.evolved) this.onLog(`系统警报：${this.player.getName()} 发生了突变进化！`);
            
            savePlayerSubjects();
            this.onUpdate();
            return true;
        }
        return false;
    }
}
