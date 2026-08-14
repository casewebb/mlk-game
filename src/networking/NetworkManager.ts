import Peer, { type DataConnection } from 'peerjs';
import type { NetworkMessage } from './NetworkMessages.ts';
import { MAX_PLAYERS, PEER_PREFIX } from './NetworkMessages.ts';

export type NetworkRole = 'host' | 'client' | 'none';

export interface NetworkCallbacks {
  onConnected: () => void;
  onDisconnected: () => void;
  onMessage: (msg: NetworkMessage, fromId: string) => void;
  onPlayerJoined: (id: string, name: string) => void;
  onPlayerLeft: (id: string) => void;
  onError: (error: string) => void;
}

export class NetworkManager {
  private peer: Peer | null = null;
  private connections = new Map<string, DataConnection>();
  private role: NetworkRole = 'none';
  private localId = '';
  private callbacks: NetworkCallbacks;

  constructor(callbacks: NetworkCallbacks) {
    this.callbacks = callbacks;
  }

  get isHost(): boolean {
    return this.role === 'host';
  }

  get id(): string {
    return this.localId;
  }

  get connectedPlayerIds(): string[] {
    return [...this.connections.keys()];
  }

  async host(roomCode: string): Promise<void> {
    this.role = 'host';
    const peerId = `${PEER_PREFIX}${roomCode}`;

    return new Promise((resolve, reject) => {
      this.peer = new Peer(peerId, { debug: 1 });

      this.peer.on('open', (id) => {
        this.localId = id;
        this.callbacks.onConnected();
        resolve();
      });

      this.peer.on('connection', (conn) => {
        this.setupConnection(conn);
      });

      this.peer.on('error', (err) => {
        if (err.type === 'unavailable-id') {
          reject(new Error('Room code already in use. Try hosting again.'));
        } else {
          this.callbacks.onError(err.message);
        }
      });

      this.peer.on('disconnected', () => {
        this.callbacks.onDisconnected();
      });
    });
  }

  async join(roomCode: string): Promise<void> {
    this.role = 'client';
    const hostId = `${PEER_PREFIX}${roomCode}`;

    return new Promise((resolve, reject) => {
      let settled = false;
      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error('Connection timed out. Check the room code.'));
        }
      }, 10000);

      this.peer = new Peer(`client-${crypto.randomUUID()}`, { debug: 1 });

      this.peer.on('open', (id) => {
        this.localId = id;
        const conn = this.peer!.connect(hostId, { reliable: true });

        conn.on('open', () => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          this.setupConnection(conn);
          this.callbacks.onConnected();
          resolve();
        });

        conn.on('error', (err) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          reject(new Error(`Could not connect to room: ${err.message}`));
        });
      });

      this.peer.on('error', (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        reject(new Error(err.message));
      });

      this.peer.on('disconnected', () => {
        this.callbacks.onDisconnected();
      });
    });
  }

  private setupConnection(conn: DataConnection): void {
    if (this.role === 'host' && this.connections.size >= MAX_PLAYERS - 1) {
      conn.close();
      return;
    }

    conn.on('data', (data) => {
      const msg = data as NetworkMessage;
      const fromId = conn.peer;
      this.callbacks.onMessage(msg, fromId);

      if (this.role === 'host' && msg.type === 'JOIN') {
        this.callbacks.onPlayerJoined(fromId, msg.name);
      }
    });

    conn.on('close', () => {
      const id = conn.peer;
      this.connections.delete(id);
      this.callbacks.onPlayerLeft(id);
    });

    this.connections.set(conn.peer, conn);
  }

  send(msg: NetworkMessage, targetId?: string): void {
    if (targetId) {
      this.connections.get(targetId)?.send(msg);
    } else if (this.role === 'client') {
      const conn = this.connections.values().next().value;
      conn?.send(msg);
    }
  }

  broadcast(msg: NetworkMessage): void {
    if (this.role !== 'host') return;
    for (const conn of this.connections.values()) {
      conn.send(msg);
    }
  }

  broadcastAll(msg: NetworkMessage): void {
    if (this.role === 'host') {
      this.broadcast(msg);
    } else {
      this.send(msg);
    }
  }

  disconnect(): void {
    for (const conn of this.connections.values()) {
      conn.close();
    }
    this.connections.clear();
    this.peer?.destroy();
    this.peer = null;
    this.role = 'none';
  }
}
