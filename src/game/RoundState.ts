import type { PlayerRole, RoundSnapshot } from '../networking/NetworkMessages.ts';

export interface SessionPlayer {
  id: string;
  name: string;
  role: PlayerRole;
  isHost: boolean;
  heldObjectId: string | null;
  scale: number;
}

export interface FragmentState {
  id: string;
  deposited: boolean;
  holderId: string | null;
}

export const ROUND_DURATION = 300; // 5 minutes
export const INTRO_DURATION = 4;

export interface RoundEndInfo {
  winner: 'dreamers' | 'nightmare';
  nightmarePlayerId: string;
  nightmareName: string;
  fragmentsCollected: number;
  fragmentsRequired: number;
}

export function createRoundSnapshot(
  timeRemaining: number,
  deposited: number,
  required: number,
  phase: RoundSnapshot['phase'],
  extras: Partial<RoundSnapshot> = {},
): RoundSnapshot {
  return {
    timeRemaining,
    fragmentsCollected: deposited,
    fragmentsRequired: required,
    phase,
    activeEvent: null,
    eventMessage: null,
    inBackrooms: false,
    backroomsDoorActive: false,
    backroomsDoorPos: null,
    winner: null,
    ...extras,
  };
}
