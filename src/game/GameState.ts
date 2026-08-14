export type GamePhase = 'menu' | 'lobby' | 'playing' | 'ended';

export interface PlayerInfo {
  id: string;
  name: string;
  isHost: boolean;
  ready?: boolean;
}

export interface GameState {
  phase: GamePhase;
  roomCode: string | null;
  isHost: boolean;
  playerName: string;
  players: PlayerInfo[];
  localPlayerId: string;
  error: string | null;
  connecting: boolean;
}

export function createInitialState(): GameState {
  return {
    phase: 'menu',
    roomCode: null,
    isHost: false,
    playerName: '',
    players: [],
    localPlayerId: crypto.randomUUID(),
    error: null,
    connecting: false,
  };
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function randomPlayerName(): string {
  const names = [
    'Alex', 'Jordan', 'Sam', 'Riley', 'Casey', 'Morgan',
    'Quinn', 'Avery', 'Blake', 'Drew', 'Jamie', 'Skyler',
  ];
  return names[Math.floor(Math.random() * names.length)]!;
}
