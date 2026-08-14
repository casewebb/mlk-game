export type PlayerRole = 'dreamer' | 'nightmare';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface PlayerSnapshot {
  id: string;
  name: string;
  position: Vec3;
  rotationY: number;
  heldObjectId: string | null;
  scale: number;
}

export interface ObjectSnapshot {
  id: string;
  position: Vec3;
  rotation: Vec3;
  type: 'fragment' | 'prop';
  deposited: boolean;
}

export interface RoundSnapshot {
  timeRemaining: number;
  fragmentsCollected: number;
  fragmentsRequired: number;
  phase: 'intro' | 'playing' | 'vote' | 'ended';
  activeEvent: string | null;
  eventMessage: string | null;
  inBackrooms: boolean;
  backroomsDoorActive: boolean;
  backroomsDoorPos: Vec3 | null;
  winner: 'dreamers' | 'nightmare' | null;
}

export type NetworkMessage =
  | { type: 'JOIN'; playerId: string; name: string }
  | { type: 'LOBBY_UPDATE'; players: { id: string; name: string; isHost: boolean }[] }
  | { type: 'GAME_START'; players: { id: string; name: string; role: PlayerRole }[]; seed: number }
  | { type: 'PLAYER_INPUT'; playerId: string; position: Vec3; rotationY: number; actions: PlayerActions }
  | { type: 'GAME_STATE'; tick: number; players: PlayerSnapshot[]; objects: ObjectSnapshot[]; round: RoundSnapshot }
  | { type: 'INTERACT'; playerId: string; action: 'pickup' | 'drop' | 'throw' | 'deposit'; objectId?: string; targetId?: string }
  | { type: 'ABILITY'; playerId: string; abilityId: string }
  | { type: 'VOTE'; playerId: string; targetId: string | null }
  | { type: 'VOTE_RESULT'; accusedId: string | null; wasNightmare: boolean }
  | { type: 'WAKE_UP'; playerId: string }
  | { type: 'ENTER_BACKROOMS'; playerId: string }
  | { type: 'EXIT_BACKROOMS'; playerId: string }
  | { type: 'HOST_DISCONNECTED' }
  | { type: 'PLAYER_LEFT'; playerId: string }
  | { type: 'CHAT'; playerId: string; text: string };

export interface PlayerActions {
  sprint: boolean;
  interact: boolean;
  throw: boolean;
  ability: boolean;
  wakeUp: boolean;
}

export const MAX_PLAYERS = 8;
export const PEER_PREFIX = 'ihaveadream-';
