import type { DreamEvent, EventContext } from './DreamEvent.ts';
import { PLAYER_EYE_HEIGHT } from '../client/rendering/CharacterModel.ts';

export class LowGravityEvent implements DreamEvent {
  id = 'low_gravity';
  name = 'Low Gravity';
  announcement = 'GRAVITY IS FADING...';
  duration = 20;

  start(ctx: EventContext): void {
    ctx.setGravityMultiplier(0.25);
    ctx.broadcastMessage(this.announcement);
  }

  update(_ctx: EventContext, _delta: number): void {}

  end(ctx: EventContext): void {
    ctx.setGravityMultiplier(1);
  }
}

export class BlackoutEvent implements DreamEvent {
  id = 'blackout';
  name = 'Blackout';
  announcement = 'THE LIGHTS GO OUT.';
  duration = 15;

  start(ctx: EventContext): void {
    ctx.setLightsEnabled(false);
    ctx.broadcastMessage(this.announcement);
  }

  update(_ctx: EventContext, _delta: number): void {}

  end(ctx: EventContext): void {
    ctx.setLightsEnabled(true);
  }
}

export class TinyPlayersEvent implements DreamEvent {
  id = 'tiny_players';
  name = 'Tiny World';
  announcement = 'EVERYONE SHRINKS!';
  duration = 18;

  start(ctx: EventContext): void {
    ctx.setPlayerScale(0.5);
    ctx.broadcastMessage(this.announcement);
  }

  update(_ctx: EventContext, _delta: number): void {}

  end(ctx: EventContext): void {
    ctx.setPlayerScale(1);
  }
}

export class GiantPlayersEvent implements DreamEvent {
  id = 'giant_players';
  name = 'Giant World';
  announcement = 'YOU ARE ENORMOUS NOW.';
  duration = 18;

  start(ctx: EventContext): void {
    ctx.setPlayerScale(2);
    ctx.broadcastMessage(this.announcement);
  }

  update(_ctx: EventContext, _delta: number): void {}

  end(ctx: EventContext): void {
    ctx.setPlayerScale(1);
  }
}

export class IceFloorEvent implements DreamEvent {
  id = 'ice_floor';
  name = 'Ice World';
  announcement = 'THE GROUND IS PURE ICE.';
  duration = 20;

  start(ctx: EventContext): void {
    ctx.setFrictionMultiplier(0.05);
    ctx.broadcastMessage(this.announcement);
  }

  update(_ctx: EventContext, _delta: number): void {}

  end(ctx: EventContext): void {
    ctx.setFrictionMultiplier(1);
  }
}

export class RandomTeleportEvent implements DreamEvent {
  id = 'random_teleport';
  name = 'Random Teleport';
  announcement = 'REALITY SHIFTS!';
  duration = 5;

  private positions = [
    { x: -15, y: PLAYER_EYE_HEIGHT, z: -10 },
    { x: 15, y: PLAYER_EYE_HEIGHT, z: 10 },
    { x: 0, y: PLAYER_EYE_HEIGHT, z: -20 },
    { x: -10, y: PLAYER_EYE_HEIGHT, z: 18 },
    { x: 20, y: PLAYER_EYE_HEIGHT, z: -5 },
  ];

  start(ctx: EventContext): void {
    ctx.broadcastMessage(this.announcement);
    for (const [id] of ctx.remotePlayerMeshes) {
      const pos = this.positions[Math.floor(Math.random() * this.positions.length)]!;
      ctx.teleportPlayer(id, pos);
    }
    const pos = this.positions[Math.floor(Math.random() * this.positions.length)]!;
    ctx.teleportPlayer(ctx.localPlayerId, pos);
  }

  update(_ctx: EventContext, _delta: number): void {}

  end(_ctx: EventContext): void {}
}

export class BackroomsDoorEvent implements DreamEvent {
  id = 'backrooms_door';
  name = 'Forgotten Door';
  announcement = 'A STRANGE DOOR HAS APPEARED...';
  duration = 30;

  start(ctx: EventContext): void {
    ctx.spawnBackroomsDoor();
    ctx.broadcastMessage(this.announcement);
  }

  update(_ctx: EventContext, _delta: number): void {}

  end(_ctx: EventContext): void {}
}

export function createAllEvents(): DreamEvent[] {
  return [
    new LowGravityEvent(),
    new BlackoutEvent(),
    new TinyPlayersEvent(),
    new GiantPlayersEvent(),
    new IceFloorEvent(),
    new RandomTeleportEvent(),
    new BackroomsDoorEvent(),
  ];
}
