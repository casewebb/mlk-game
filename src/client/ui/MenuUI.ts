import type { GameState, PlayerInfo } from '../../game/GameState.ts';

export type MenuAction =
  | { type: 'host' }
  | { type: 'join'; code: string }
  | { type: 'start' }
  | { type: 'leave' }
  | { type: 'setName'; name: string };

export class MenuUI {
  private overlay: HTMLElement;
  private onAction: (action: MenuAction) => void;

  constructor(onAction: (action: MenuAction) => void) {
    this.onAction = onAction;
    this.overlay = document.createElement('div');
    this.overlay.id = 'ui-overlay';
    document.body.appendChild(this.overlay);
    this.renderMainMenu();
  }

  renderMainMenu(defaultName = ''): void {
    this.overlay.innerHTML = `
      <div class="screen menu-screen">
        <h1 class="title">I HAVE A DREAM</h1>
        <p class="subtitle">...But Who Ruined It?</p>
        <div class="menu-actions">
          <button class="btn btn-primary" id="btn-host">HOST GAME</button>
          <button class="btn btn-secondary" id="btn-join-prompt">JOIN GAME</button>
        </div>
        <div class="join-section" id="join-section">
          <p class="join-label">OR ENTER ROOM CODE:</p>
          <div class="join-row">
            <input type="text" id="room-code-input" maxlength="6" placeholder="ABC123" autocomplete="off" spellcheck="false" />
            <button class="btn btn-primary" id="btn-join">JOIN</button>
          </div>
        </div>
        <div class="name-section">
          <label for="player-name">YOUR NAME</label>
          <input type="text" id="player-name" maxlength="16" placeholder="Dreamer" value="${escapeAttr(defaultName)}" autocomplete="off" />
        </div>
        <p class="menu-footer">2–8 players · Browser · No download required</p>
      </div>
    `;

    this.overlay.querySelector('#btn-host')!.addEventListener('click', () => {
      this.onAction({ type: 'host' });
    });

    this.overlay.querySelector('#btn-join')!.addEventListener('click', () => {
      const code = (this.overlay.querySelector('#room-code-input') as HTMLInputElement).value.trim().toUpperCase();
      if (code.length >= 4) this.onAction({ type: 'join', code });
    });

    this.overlay.querySelector('#room-code-input')!.addEventListener('keydown', (e) => {
      const event = e as KeyboardEvent;
      if (event.key === 'Enter') {
        const code = (event.target as HTMLInputElement).value.trim().toUpperCase();
        if (code.length >= 4) this.onAction({ type: 'join', code });
      }
    });

    this.overlay.querySelector('#player-name')!.addEventListener('change', (e) => {
      this.onAction({ type: 'setName', name: (e.target as HTMLInputElement).value.trim() });
    });
  }

  renderConnecting(message: string): void {
    this.overlay.innerHTML = `
      <div class="screen connecting-screen">
        <div class="spinner"></div>
        <p class="connecting-text">${escapeHtml(message)}</p>
      </div>
    `;
  }

  renderLobby(state: GameState): void {
    const playerList = state.players
      .map((p) => `<li class="player-item${p.isHost ? ' host' : ''}">● ${escapeHtml(p.name)}${p.isHost ? ' (host)' : ''}</li>`)
      .join('');

    const playerCount = state.players.length;
    const canStart = playerCount >= 1;

    this.overlay.innerHTML = `
      <div class="screen lobby-screen">
        <h2 class="lobby-title">ROOM CODE</h2>
        <div class="room-code">${state.roomCode ?? '------'}</div>
        <p class="lobby-hint">Share this code with friends</p>
        <p class="player-count">${playerCount} / 8 dreamers</p>
        <ul class="player-list">${playerList || '<li class="player-item">● Waiting for players...</li>'}</ul>
        ${state.error ? `<p class="error-text">${escapeHtml(state.error)}</p>` : ''}
        ${state.isHost
          ? `<button class="btn btn-primary btn-large" id="btn-start"${canStart ? '' : ' disabled'}>START DREAM</button>`
          : '<p class="waiting-text">Waiting for host to start...</p>'
        }
        <button class="btn btn-ghost" id="btn-leave">LEAVE</button>
      </div>
    `;

    this.overlay.querySelector('#btn-start')?.addEventListener('click', () => {
      this.onAction({ type: 'start' });
    });

    this.overlay.querySelector('#btn-leave')!.addEventListener('click', () => {
      this.onAction({ type: 'leave' });
    });
  }

  showCollapsed(onLeave: () => void): void {
    this.show();
    this.overlay.innerHTML = `
      <div class="screen end-screen lose">
        <h1>THE DREAM HAS COLLAPSED.</h1>
        <p class="end-sub">The host disconnected.</p>
        <button class="btn btn-primary" id="btn-collapsed-leave">RETURN TO MENU</button>
      </div>
    `;
    this.overlay.querySelector('#btn-collapsed-leave')!.addEventListener('click', onLeave);
  }

  hide(): void {
    this.overlay.classList.add('hidden');
  }

  show(): void {
    this.overlay.classList.remove('hidden');
  }

  clearHUDMode(): void {
    this.overlay.classList.remove('hud-only');
  }

  updatePlayerList(players: PlayerInfo[]): void {
    const list = this.overlay.querySelector('.player-list');
    if (!list) return;
    list.innerHTML = players
      .map((p) => `<li class="player-item${p.isHost ? ' host' : ''}">● ${escapeHtml(p.name)}${p.isHost ? ' (host)' : ''}</li>`)
      .join('');
  }

  dispose(): void {
    this.overlay.remove();
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function escapeAttr(text: string): string {
  return text.replace(/"/g, '&quot;');
}
