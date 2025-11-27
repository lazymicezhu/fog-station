// modules/cultivation.js
import { SUBJECT_DB } from '../data/combat_data.js';

export class SubjectInstance {
  constructor(templateId, savedData = null) {
    this.templateId = templateId;
    const template = SUBJECT_DB.find(s => s.id === templateId);
    if (!template) throw new Error(`Template ${templateId} not found`);

    this.baseName = template.name;
    this.element = template.element;
    
    if (savedData) {
      this.formIndex = savedData.formIndex;
      this.xp = savedData.xp;
      this.currentHp = savedData.currentHp;
    } else {
      this.formIndex = 0;
      this.xp = 0;
      // Init HP will be set by getMaxHp() logic later, but for now:
      this.currentHp = template.forms[0].hp;
    }
  }

  getTemplate() {
    return SUBJECT_DB.find(s => s.id === this.templateId);
  }

  getCurrentForm() {
    return this.getTemplate().forms[this.formIndex];
  }
  
  getName() {
      return this.getCurrentForm().name;
  }

  getMaxHp() {
    return this.getCurrentForm().hp;
  }

  getSkills() {
    return this.getCurrentForm().skills;
  }

  gainXp(amount) {
    const form = this.getCurrentForm();
    if (form.xpMax === 0) return { evolved: false, leveled: false }; // Max level

    this.xp += amount;
    let evolved = false;
    // Check evolution
    if (this.xp >= form.xpMax) {
      const forms = this.getTemplate().forms;
      if (this.formIndex < forms.length - 1) {
          this.xp -= form.xpMax;
          this.formIndex++;
          this.currentHp = this.getMaxHp(); // Full heal on evolve
          evolved = true;
      } else {
          this.xp = form.xpMax; // Cap at max
      }
    }
    return { evolved, leveled: true };
  }
  
  serialize() {
      return {
          templateId: this.templateId,
          formIndex: this.formIndex,
          xp: this.xp,
          currentHp: this.currentHp
      };
  }
}

// Global Manager (Mock persistence)
let playerSubjects = [];

export function initPlayerSubjects() {
    const saved = localStorage.getItem('fog_station_combat_subjects');
    if (saved) {
        try {
            const list = JSON.parse(saved);
            playerSubjects = list.map(data => new SubjectInstance(data.templateId, data));
        } catch (e) {
            console.error("Failed to load combat subjects", e);
            playerSubjects = [];
        }
    }

    // For demo, if empty, give player default team
    if (playerSubjects.length === 0) {
        playerSubjects.push(new SubjectInstance('S-01')); // Psychic
        playerSubjects.push(new SubjectInstance('S-32')); // Alloy
        savePlayerSubjects();
    }
}

export function savePlayerSubjects() {
    const data = playerSubjects.map(s => s.serialize());
    localStorage.setItem('fog_station_combat_subjects', JSON.stringify(data));
}

export function getPlayerSubjects() {
    return playerSubjects;
}

export function getEnemyPool() {
    // Return templates for random encounter
    return SUBJECT_DB; 
}
