import type { GameSession } from '../game/GameSession.ts';

export interface NightmareAbility {
  id: string;
  name: string;
  cooldown: number;

  canUse(session: GameSession, playerId: string): boolean;
  use(session: GameSession, playerId: string): void;
}

export class MischiefAbility implements NightmareAbility {
  id = 'mischief';
  name = 'Mischief';
  cooldown = 12;
  private lastUsed = new Map<string, number>();

  canUse(session: GameSession, playerId: string): boolean {
    const now = performance.now() / 1000;
    const last = this.lastUsed.get(playerId) ?? 0;
    return now - last >= this.cooldown && session.getAvailableFragmentId() !== null;
  }

  use(session: GameSession, playerId: string): void {
    this.lastUsed.set(playerId, performance.now() / 1000);
    session.mischiefMoveFragment();
  }
}

export class NightmareBlackoutAbility implements NightmareAbility {
  id = 'nightmare_blackout';
  name = 'Blackout';
  cooldown = 30;
  private lastUsed = new Map<string, number>();

  canUse(_session: GameSession, playerId: string): boolean {
    const now = performance.now() / 1000;
    const last = this.lastUsed.get(playerId) ?? 0;
    return now - last >= this.cooldown;
  }

  use(session: GameSession, _playerId: string): void {
    this.lastUsed.set(_playerId, performance.now() / 1000);
    session.triggerEventById('blackout');
  }
}

export function createNightmareAbilities(): NightmareAbility[] {
  return [new MischiefAbility(), new NightmareBlackoutAbility()];
}
