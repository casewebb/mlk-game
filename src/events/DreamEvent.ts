import type * as THREE from 'three';
import type { FirstPersonControls } from '../client/input/FirstPersonControls.ts';

export interface EventContext {
  scene: THREE.Scene;
  controls: FirstPersonControls | null;
  remotePlayerMeshes: Map<string, THREE.Object3D>;
  setGravityMultiplier(m: number): void;
  setMoveSpeedMultiplier(m: number): void;
  setPlayerScale(scale: number): void;
  setLightsEnabled(enabled: boolean): void;
  setFrictionMultiplier(m: number): void;
  teleportPlayer(playerId: string, pos: { x: number; y: number; z: number }): void;
  localPlayerId: string;
  isHost: boolean;
  broadcastMessage(text: string): void;
  spawnBackroomsDoor(): void;
}

export interface DreamEvent {
  id: string;
  name: string;
  announcement: string;
  duration: number;

  start(ctx: EventContext): void;
  update(_ctx: EventContext, _delta: number): void;
  end(ctx: EventContext): void;
}
