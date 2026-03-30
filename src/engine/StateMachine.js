/**
 * NovaStar State Machine
 * For game states, AI behavior, menu flow, animation states
 */

export class StateMachine {
  constructor(owner = null) {
    this.owner = owner;
    this.states = new Map();
    this.currentState = null;
    this.previousState = null;
    this.stateTime = 0;
    this._globalTransitions = [];
  }

  /**
   * Add a state
   * @param {string} name
   * @param {object} state - { enter?, update?, exit?, transitions? }
   */
  addState(name, state) {
    this.states.set(name, {
      enter: state.enter || null,
      update: state.update || null,
      exit: state.exit || null,
      transitions: state.transitions || [],
      ...state
    });
    return this;
  }

  /**
   * Add a global transition (checked from any state)
   */
  addGlobalTransition(condition, targetState) {
    this._globalTransitions.push({ condition, targetState });
    return this;
  }

  /**
   * Start the state machine with an initial state
   */
  start(initialState) {
    this.transition(initialState);
    return this;
  }

  /**
   * Transition to a new state
   */
  transition(newStateName, data = null) {
    const newState = this.states.get(newStateName);
    if (!newState) {
      console.warn(`[StateMachine] State "${newStateName}" not found`);
      return;
    }

    // Exit current
    if (this.currentState) {
      const current = this.states.get(this.currentState);
      if (current && current.exit) current.exit(this.owner, data);
    }

    this.previousState = this.currentState;
    this.currentState = newStateName;
    this.stateTime = 0;

    // Enter new
    if (newState.enter) newState.enter(this.owner, data);
  }

  /**
   * Update — call each frame
   */
  update(dt) {
    if (!this.currentState) return;

    this.stateTime += dt;
    const state = this.states.get(this.currentState);
    if (!state) return;

    // Check global transitions first
    for (const t of this._globalTransitions) {
      if (t.condition(this.owner, this.stateTime)) {
        this.transition(t.targetState);
        return;
      }
    }

    // Check state-specific transitions
    if (state.transitions) {
      for (const t of state.transitions) {
        if (t.condition(this.owner, this.stateTime)) {
          this.transition(t.target, t.data);
          return;
        }
      }
    }

    // Run state update
    if (state.update) state.update(this.owner, dt, this.stateTime);
  }

  /** Check if currently in a specific state */
  is(stateName) {
    return this.currentState === stateName;
  }

  /** Get time spent in current state */
  get time() {
    return this.stateTime;
  }
}


/**
 * Behavior Tree — for more complex AI
 * Nodes: Sequence, Selector, Condition, Action, Repeater, Inverter
 */
export class BehaviorTree {
  constructor(root) {
    this.root = root;
  }

  update(dt, context) {
    return this.root.execute(dt, context);
  }
}

// Node result types
export const BTStatus = { SUCCESS: 'success', FAILURE: 'failure', RUNNING: 'running' };

/** Execute children in order; fail on first failure */
export class BTSequence {
  constructor(children) { this.children = children; this._index = 0; }
  execute(dt, ctx) {
    while (this._index < this.children.length) {
      const result = this.children[this._index].execute(dt, ctx);
      if (result === BTStatus.RUNNING) return BTStatus.RUNNING;
      if (result === BTStatus.FAILURE) { this._index = 0; return BTStatus.FAILURE; }
      this._index++;
    }
    this._index = 0;
    return BTStatus.SUCCESS;
  }
}

/** Try children in order; succeed on first success */
export class BTSelector {
  constructor(children) { this.children = children; this._index = 0; }
  execute(dt, ctx) {
    while (this._index < this.children.length) {
      const result = this.children[this._index].execute(dt, ctx);
      if (result === BTStatus.RUNNING) return BTStatus.RUNNING;
      if (result === BTStatus.SUCCESS) { this._index = 0; return BTStatus.SUCCESS; }
      this._index++;
    }
    this._index = 0;
    return BTStatus.FAILURE;
  }
}

/** Boolean check */
export class BTCondition {
  constructor(fn) { this.fn = fn; }
  execute(dt, ctx) { return this.fn(ctx) ? BTStatus.SUCCESS : BTStatus.FAILURE; }
}

/** Perform an action */
export class BTAction {
  constructor(fn) { this.fn = fn; }
  execute(dt, ctx) { return this.fn(dt, ctx) || BTStatus.SUCCESS; }
}

/** Invert the result of a child */
export class BTInverter {
  constructor(child) { this.child = child; }
  execute(dt, ctx) {
    const r = this.child.execute(dt, ctx);
    if (r === BTStatus.SUCCESS) return BTStatus.FAILURE;
    if (r === BTStatus.FAILURE) return BTStatus.SUCCESS;
    return BTStatus.RUNNING;
  }
}

/** Repeat a child N times */
export class BTRepeater {
  constructor(child, times = Infinity) { this.child = child; this.times = times; this._count = 0; }
  execute(dt, ctx) {
    const r = this.child.execute(dt, ctx);
    if (r === BTStatus.RUNNING) return BTStatus.RUNNING;
    this._count++;
    if (this._count >= this.times) { this._count = 0; return BTStatus.SUCCESS; }
    return BTStatus.RUNNING;
  }
}
