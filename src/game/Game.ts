import { MenuUI, type MenuAction } from '../client/ui/MenuUI.ts';
import { NetworkManager } from '../networking/NetworkManager.ts';
import type { NetworkMessage, PlayerRole } from '../networking/NetworkMessages.ts';
import {
  assignRoles,
  GameSession,
  generateSeed,
} from './GameSession.ts';
import {
  createInitialState,
  generateRoomCode,
  randomPlayerName,
  type GameState,
  type PlayerInfo,
} from './GameState.ts';
import type { SessionPlayer } from './RoundState.ts';

export class Game {
  private state: GameState;
  private ui: MenuUI;
  private network: NetworkManager;
  private session: GameSession | null = null;
  private canvas: HTMLCanvasElement;
  private gameSeed = 0;

  constructor() {
    this.state = createInitialState();
    this.state.playerName = randomPlayerName();

    this.canvas = document.createElement('canvas');
    this.canvas.id = 'game-canvas';
    document.body.appendChild(this.canvas);
    this.canvas.style.display = 'none';

    this.network = new NetworkManager({
      onConnected: () => this.onNetworkConnected(),
      onDisconnected: () => {
        if (!this.state.isHost && this.state.phase !== 'menu') {
          this.onHostDisconnected();
        }
      },
      onMessage: (msg, fromId) => this.onNetworkMessage(msg, fromId),
      onPlayerJoined: (id, name) => this.onPlayerJoined(id, name),
      onPlayerLeft: (id) => this.onPlayerLeft(id),
      onError: (error) => this.showError(error),
    });

    this.ui = new MenuUI((action) => this.handleMenuAction(action));

    requestAnimationFrame(() => {
      const nameInput = document.getElementById('player-name') as HTMLInputElement | null;
      if (nameInput) nameInput.value = this.state.playerName;
    });
  }

  private handleMenuAction(action: MenuAction): void {
    switch (action.type) {
      case 'setName':
        if (action.name) this.state.playerName = action.name.slice(0, 16);
        break;
      case 'host':
        void this.hostGame();
        break;
      case 'join':
        void this.joinGame(action.code);
        break;
      case 'start':
        void this.startDream();
        break;
      case 'leave':
        this.leaveGame();
        break;
    }
  }

  private async hostGame(): Promise<void> {
    this.state.connecting = true;
    this.state.error = null;
    this.ui.renderConnecting('Creating dream...');

    const roomCode = generateRoomCode();
    try {
      await this.network.host(roomCode);
      this.state.localPlayerId = this.network.id;
      this.state.isHost = true;
      this.state.roomCode = roomCode;
      this.state.phase = 'lobby';
      this.state.players = [this.createLocalPlayer(true)];
      this.state.connecting = false;
      this.ui.renderLobby(this.state);
    } catch (err) {
      this.state.connecting = false;
      this.showError(err instanceof Error ? err.message : 'Failed to host');
      this.ui.renderMainMenu(this.state.playerName);
    }
  }

  private async joinGame(code: string): Promise<void> {
    this.state.connecting = true;
    this.state.error = null;
    this.ui.renderConnecting('Entering the dream...');

    try {
      await this.network.join(code.toUpperCase());
      this.state.localPlayerId = this.network.id;
      this.state.isHost = false;
      this.state.roomCode = code.toUpperCase();
      this.state.phase = 'lobby';

      this.network.send({
        type: 'JOIN',
        playerId: this.network.id,
        name: this.state.playerName || randomPlayerName(),
      });

      this.state.connecting = false;
      this.ui.renderLobby(this.state);
    } catch (err) {
      this.state.connecting = false;
      this.showError(err instanceof Error ? err.message : 'Failed to join');
      this.ui.renderMainMenu(this.state.playerName);
    }
  }

  private onNetworkConnected(): void {
    // Handled per host/join flow
  }

  private onPlayerJoined(id: string, name: string): void {
    if (!this.state.isHost) return;
    if (this.state.players.some((p) => p.id === id)) return;
    if (this.state.players.length >= 8) return;

    this.state.players.push({ id, name, isHost: false });
    this.broadcastLobby();
    this.ui.renderLobby(this.state);
  }

  private onPlayerLeft(id: string): void {
    this.state.players = this.state.players.filter((p) => p.id !== id);
    if (this.state.phase === 'lobby') {
      this.ui.renderLobby(this.state);
    }
    if (this.state.isHost) this.broadcastLobby();

    if (!this.state.isHost && this.state.phase === 'playing') {
      // Host left
      this.onHostDisconnected();
    }
  }

  private onHostDisconnected(): void {
    if (this.session) {
      this.session.handleNetworkMessage({ type: 'HOST_DISCONNECTED' }, '');
    } else if (this.state.phase !== 'menu') {
      this.ui.showCollapsed(() => this.leaveGame());
    }
  }

  private onNetworkMessage(msg: NetworkMessage, fromId: string): void {
    switch (msg.type) {
      case 'LOBBY_UPDATE':
        if (!this.state.isHost) {
          this.state.players = msg.players.map((p) => ({
            id: p.id,
            name: p.name,
            isHost: p.isHost,
          }));
          this.ui.renderLobby(this.state);
        }
        break;

      case 'GAME_START':
        this.beginSession(msg.players, msg.seed);
        break;

      case 'HOST_DISCONNECTED':
        this.onHostDisconnected();
        break;

      default:
        this.session?.handleNetworkMessage(msg, fromId);
        break;
    }
  }

  private broadcastLobby(): void {
    this.network.broadcast({
      type: 'LOBBY_UPDATE',
      players: this.state.players.map((p) => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost,
      })),
    });
  }

  private createLocalPlayer(isHost: boolean): PlayerInfo {
    return {
      id: this.network.id || this.state.localPlayerId,
      name: this.state.playerName || randomPlayerName(),
      isHost,
    };
  }

  private async startDream(): Promise<void> {
    if (!this.state.isHost) return;

    this.gameSeed = generateSeed();
    const sessionPlayers: SessionPlayer[] = this.state.players.map((p) => ({
      id: p.id,
      name: p.name,
      role: 'dreamer' as PlayerRole,
      isHost: p.isHost,
      heldObjectId: null,
      scale: 1,
      stunnedUntil: 0,
    }));

    assignRoles(sessionPlayers, this.gameSeed);

    this.network.broadcast({
      type: 'GAME_START',
      players: sessionPlayers.map((p) => ({ id: p.id, name: p.name, role: p.role })),
      seed: this.gameSeed,
    });

    this.beginSession(
      sessionPlayers.map((p) => ({ id: p.id, name: p.name, role: p.role })),
      this.gameSeed,
      sessionPlayers,
    );
  }

  private beginSession(
    players: { id: string; name: string; role: PlayerRole }[],
    seed: number,
    fullPlayers?: SessionPlayer[],
  ): void {
    this.state.phase = 'playing';
    this.ui.hide();
    this.canvas.style.display = 'block';

    const sessionPlayers: SessionPlayer[] = fullPlayers ?? players.map((p) => {
      const info = this.state.players.find((lp) => lp.id === p.id);
      return {
        id: p.id,
        name: p.name,
        role: p.role,
        isHost: info?.isHost ?? false,
        heldObjectId: null,
        scale: 1,
        stunnedUntil: 0,
      };
    });

    const localId = this.network.id || this.state.localPlayerId;
    const localPlayerInfo = sessionPlayers.find((p) => p.id === localId);

    this.session = new GameSession(this.canvas, {
      localPlayerId: localId,
      localPlayerName: localPlayerInfo?.name ?? this.state.playerName,
      isHost: this.state.isHost,
      network: this.network,
      players: sessionPlayers,
      seed,
      onEnd: () => {
        // Play again returns to lobby for host
        if (this.state.isHost) {
          this.endSession();
          this.state.phase = 'lobby';
          this.ui.show();
          this.ui.renderLobby(this.state);
        }
      },
      onLeave: () => this.leaveGame(),
      onHostDisconnected: () => {
        this.endSession();
        this.leaveGame();
      },
    });
  }

  private endSession(): void {
    this.session?.dispose();
    this.session = null;
    this.canvas.style.display = 'none';
  }

  private leaveGame(): void {
    this.endSession();
    this.network.disconnect();
    this.canvas.style.display = 'none';

    const name = this.state.playerName;
    this.state = createInitialState();
    this.state.playerName = name || randomPlayerName();

    this.ui.clearHUDMode();
    this.ui.show();
    this.ui.renderMainMenu(this.state.playerName);
  }

  private showError(error: string): void {
    this.state.error = error;
  }
}
