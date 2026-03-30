/**
 * NovaStar Engine — Public API
 */

// Core
export { NovaStarEngine } from './NovaStarEngine.js';
export { Renderer, NovaToonShader, OutlineShader } from './Renderer.js';
export { AudioEngine } from './AudioEngine.js';
export { ParticleSystem } from './ParticleSystem.js';
export { InputManager } from './InputManager.js';
export { PhysicsWorld, PhysicsBody } from './PhysicsWorld.js';
export { SceneManager } from './SceneManager.js';
export { MeshBuilder } from './MeshBuilder.js';

// New systems
export { UISystem } from './UISystem.js';
export { AnimationSystem, Easing } from './AnimationSystem.js';
export { CameraSystem } from './CameraSystem.js';
export {
  StateMachine,
  BehaviorTree, BTStatus,
  BTSequence, BTSelector, BTCondition, BTAction, BTInverter, BTRepeater
} from './StateMachine.js';
export { TimerSystem } from './TimerSystem.js';
export { SaveSystem } from './SaveSystem.js';
export { EventSystem } from './EventSystem.js';
export { System2D } from './System2D.js';
export { BuildSystem } from './BuildSystem.js';
export { AssetLoader } from './AssetLoader.js';
export { Tilemap } from './Tilemap.js';
export {
  Component, Entity, EntityManager,
  MeshRenderer, RigidBody, AutoRotate, AutoBob,
  Patrol, TriggerZone, Health
} from './ComponentSystem.js';

// v0.2 additions
export { GizmoSystem } from './GizmoSystem.js';
export { SceneTransition } from './SceneTransition.js';
