/**
 * NovaStar Quest System v0.4
 * Track quests, objectives, progress, and rewards
 *
 * Usage:
 *   const quests = new QuestSystem(engine);
 *   quests.register('collect-stars', {
 *     title: 'Star Collector',
 *     description: 'Collect 5 stars to unlock the gate.',
 *     objectives: [{ id: 'stars', description: 'Collect stars', target: 5 }],
 *     rewards: { xp: 100, unlock: 'gate-key' },
 *     onComplete: () => engine.audio.play('powerup')
 *   });
 *   quests.start('collect-stars');
 *   quests.progress('collect-stars', 'stars', 1); // +1 star
 */

export class QuestSystem {
  constructor(engine) {
    this.engine = engine;
    this.definitions = new Map();
    this.active = new Map();
    this.completed = new Set();
    this._onStart = [];
    this._onProgress = [];
    this._onComplete = [];
  }

  register(id, def) {
    this.definitions.set(id, { id, ...def, objectives: (def.objectives || []).map(o => ({ current: 0, ...o })) });
  }

  start(questId) {
    const def = this.definitions.get(questId);
    if (!def) { console.warn('[Quests] Not found:', questId); return; }
    if (this.active.has(questId) || this.completed.has(questId)) return;
    const quest = { ...def, objectives: def.objectives.map(o => ({ ...o, current: 0 })), startedAt: Date.now() };
    this.active.set(questId, quest);
    this._onStart.forEach(fn => fn(quest));
  }

  progress(questId, objectiveId, amount = 1) {
    const quest = this.active.get(questId);
    if (!quest) return;
    const obj = quest.objectives.find(o => o.id === objectiveId);
    if (!obj) return;
    obj.current = Math.min(obj.current + amount, obj.target);
    this._onProgress.forEach(fn => fn(quest, obj));
    if (quest.objectives.every(o => o.current >= o.target)) this._complete(questId);
  }

  _complete(questId) {
    const quest = this.active.get(questId);
    if (!quest) return;
    this.active.delete(questId);
    this.completed.add(questId);
    quest.completedAt = Date.now();
    if (quest.onComplete) quest.onComplete(quest);
    this._onComplete.forEach(fn => fn(quest));
  }

  abandon(questId) { this.active.delete(questId); }
  isActive(questId) { return this.active.has(questId); }
  isCompleted(questId) { return this.completed.has(questId); }
  getActive() { return [...this.active.values()]; }
  getCompleted() { return [...this.completed]; }
  getQuest(questId) { return this.active.get(questId) || this.definitions.get(questId); }

  onQuestStart(fn) { this._onStart.push(fn); }
  onQuestProgress(fn) { this._onProgress.push(fn); }
  onQuestComplete(fn) { this._onComplete.push(fn); }

  toJSON() {
    return { active: [...this.active.entries()], completed: [...this.completed] };
  }
  fromJSON(data) {
    if (data.active) data.active.forEach(([id, q]) => this.active.set(id, q));
    if (data.completed) data.completed.forEach(id => this.completed.add(id));
  }
}
