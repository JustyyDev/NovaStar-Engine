/**
 * NovaStar Dialogue System v0.4
 * Branching dialogue trees with speaker portraits, conditions, and events
 *
 * Usage:
 *   const dlg = new DialogueSystem(engine);
 *   dlg.register('npc-greeting', {
 *     start: { speaker: 'Guard', text: 'Halt! Who goes there?', choices: [
 *       { text: 'A friend.', next: 'friendly' },
 *       { text: 'None of your business.', next: 'hostile' }
 *     ]},
 *     friendly: { speaker: 'Guard', text: 'Welcome, friend.', onEnter: () => openGate() },
 *     hostile: { speaker: 'Guard', text: 'Then you shall not pass!', onEnter: () => startFight() }
 *   });
 *   dlg.start('npc-greeting');
 */

export class DialogueSystem {
  constructor(engine) {
    this.engine = engine;
    this.trees = new Map();
    this.active = null;
    this.currentNode = null;
    this.variables = {};
    this._onNodeChange = [];
    this._onEnd = [];
    this._onChoice = [];
  }

  register(id, nodes) {
    this.trees.set(id, nodes);
  }

  start(treeId, startNode = 'start') {
    const tree = this.trees.get(treeId);
    if (!tree) { console.warn('[Dialogue] Tree not found:', treeId); return; }
    this.active = { id: treeId, tree };
    this._goTo(startNode);
  }

  choose(choiceIndex) {
    if (!this.currentNode?.choices) return;
    const choice = this.currentNode.choices[choiceIndex];
    if (!choice) return;
    if (choice.setVar) Object.assign(this.variables, choice.setVar);
    if (choice.onSelect) choice.onSelect(this);
    this._onChoice.forEach(fn => fn(choice, choiceIndex));
    if (choice.next) this._goTo(choice.next);
    else this.end();
  }

  advance() {
    if (!this.currentNode) return;
    if (this.currentNode.choices && this.currentNode.choices.length > 0) return;
    if (this.currentNode.next) this._goTo(this.currentNode.next);
    else this.end();
  }

  end() {
    this.active = null;
    this.currentNode = null;
    this._onEnd.forEach(fn => fn());
  }

  setVar(key, value) { this.variables[key] = value; }
  getVar(key, fallback = null) { return this.variables[key] !== undefined ? this.variables[key] : fallback; }

  onNodeChange(fn) { this._onNodeChange.push(fn); }
  onDialogueEnd(fn) { this._onEnd.push(fn); }
  onChoiceMade(fn) { this._onChoice.push(fn); }

  get isActive() { return this.active !== null; }

  _goTo(nodeId) {
    if (!this.active) return;
    const node = this.active.tree[nodeId];
    if (!node) { console.warn('[Dialogue] Node not found:', nodeId); this.end(); return; }
    if (node.condition && !node.condition(this)) {
      if (node.conditionFail) this._goTo(node.conditionFail);
      else this.end();
      return;
    }
    this.currentNode = { ...node, _id: nodeId };
    if (node.setVar) Object.assign(this.variables, node.setVar);
    if (node.onEnter) node.onEnter(this);
    // Filter choices by conditions
    if (this.currentNode.choices) {
      this.currentNode.choices = this.currentNode.choices.filter(c => !c.condition || c.condition(this));
    }
    this._onNodeChange.forEach(fn => fn(this.currentNode));
  }
}
