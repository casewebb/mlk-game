import type { PlayerRole, PlayerSnapshot, RoundSnapshot } from '../../networking/NetworkMessages.ts';
import type { SessionPlayer } from '../../game/RoundState.ts';

export class GameHUD {
  private overlay: HTMLElement;
  private announcementTimer: number | null = null;

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'game-hud';
    document.body.appendChild(this.overlay);
  }

  render(
    round: RoundSnapshot,
    localRole: PlayerRole | null,
    isNightmare: boolean,
    nightmareAbilityReady: boolean,
    stunRemaining = 0,
  ): void {
    const mins = Math.floor(round.timeRemaining / 60);
    const secs = Math.floor(round.timeRemaining % 60);
    const timerClass = round.timeRemaining <= 30 ? 'timer-critical' : '';
    const roleHint = isNightmare
      ? '<div class="role-badge nightmare">YOU ARE THE NIGHTMARE · Q = Ability</div>'
      : localRole === 'dreamer'
        ? '<div class="role-badge dreamer">DREAMER · Complete the objective!</div>'
        : '';

    const crosshair = stunRemaining <= 0
      ? '<div class="crosshair"></div>'
      : '';

    const stunOverlay = stunRemaining > 0
      ? `<div class="stun-overlay"><h2>YOU ARE OUT</h2><p>Invisible ghost mode · ${Math.ceil(stunRemaining)}s</p><span class="stun-hint">You can move but cannot shoot or interact</span></div>`
      : '';

    this.overlay.innerHTML = `
      ${crosshair}
      ${stunOverlay}
      <div class="hud-top">
        <div class="hud-objective">
          <span class="hud-label">DREAM OBJECTIVE</span>
          <span class="hud-value">Collect ${round.fragmentsRequired} Dream Fragments</span>
        </div>
        <div class="hud-timer ${timerClass}">${mins}:${secs.toString().padStart(2, '0')}</div>
      </div>
      <div class="hud-progress">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${(round.fragmentsCollected / round.fragmentsRequired) * 100}%"></div>
        </div>
        <span class="progress-text">${round.fragmentsCollected} / ${round.fragmentsRequired} fragments in Dream Machine</span>
      </div>
      ${roleHint}
      ${isNightmare ? `<div class="ability-hint${nightmareAbilityReady ? ' ready' : ''}">Q — Nightmare Ability${nightmareAbilityReady ? ' (READY)' : ''}</div>` : ''}
      ${round.activeEvent ? `<div class="event-banner">${round.eventMessage ?? round.activeEvent}</div>` : ''}
      <div class="hud-controls-bar">
        Click shoot · E interact / deposit · WASD move · Shift sprint · Space jump · R vote · Esc menu
      </div>
    `;
  }

  showAnnouncement(text: string, duration = 3000): void {
    let el = this.overlay.querySelector('.announcement') as HTMLElement | null;
    if (!el) {
      el = document.createElement('div');
      el.className = 'announcement';
      this.overlay.appendChild(el);
    }
    el.textContent = text;
    el.classList.add('visible');

    if (this.announcementTimer) clearTimeout(this.announcementTimer);
    this.announcementTimer = window.setTimeout(() => {
      el?.classList.remove('visible');
    }, duration);
  }

  showIntro(onDone: () => void): void {
    this.overlay.innerHTML = `
      <div class="intro-screen">
        <h1 class="intro-title">YOU HAVE ENTERED THE DREAM.</h1>
        <p class="intro-objective">DREAM OBJECTIVE:<br/>COLLECT 10 DREAM FRAGMENTS<br/>AND BRING THEM TO THE DREAM MACHINE.</p>
      </div>
    `;
    setTimeout(onDone, 4000);
  }

  showVoteScreen(
    players: SessionPlayer[],
    localId: string,
    onVote: (targetId: string | null) => void,
  ): void {
    const options = players
      .filter((p) => p.id !== localId)
      .map((p) => `<button class="btn btn-vote" data-id="${p.id}">${escapeHtml(p.name)}</button>`)
      .join('');

    this.overlay.innerHTML = `
      <div class="vote-screen">
        <h2>WAKE UP!</h2>
        <p>Who is ruining the dream?</p>
        <div class="vote-options">${options}</div>
        <button class="btn btn-ghost" id="skip-vote">Skip Vote</button>
      </div>
    `;

    this.overlay.querySelectorAll('.btn-vote').forEach((btn) => {
      btn.addEventListener('click', () => onVote((btn as HTMLElement).dataset.id!));
    });
    this.overlay.querySelector('#skip-vote')!.addEventListener('click', () => onVote(null));
  }

  showEndScreen(
    winner: 'dreamers' | 'nightmare',
    nightmareName: string,
    fragmentsCollected: number,
    fragmentsRequired: number,
    onPlayAgain: () => void,
    onLeave: () => void,
  ): void {
    const won = winner === 'dreamers';
    this.overlay.innerHTML = `
      <div class="end-screen ${won ? 'win' : 'lose'}">
        <h1>${won ? 'THE DREAM HAS BEEN SAVED.' : 'THE DREAM HAS BEEN RUINED.'}</h1>
        <p class="end-sub">${won ? 'The dream lives on!' : 'Time ran out...'}</p>
        <div class="scoreboard">
          <p>Fragments: ${fragmentsCollected} / ${fragmentsRequired}</p>
          <p class="nightmare-reveal">${escapeHtml(nightmareName)} WAS THE NIGHTMARE.</p>
        </div>
        <button class="btn btn-primary btn-large" id="btn-again">PLAY AGAIN</button>
        <button class="btn btn-ghost" id="btn-leave-end">LEAVE</button>
      </div>
    `;
    this.overlay.querySelector('#btn-again')!.addEventListener('click', onPlayAgain);
    this.overlay.querySelector('#btn-leave-end')!.addEventListener('click', onLeave);
  }

  showCollapsed(onLeave: () => void): void {
    this.overlay.innerHTML = `
      <div class="end-screen lose full-screen">
        <h1>THE DREAM HAS COLLAPSED.</h1>
        <p class="end-sub">The host disconnected.</p>
        <button class="btn btn-primary" id="btn-leave-collapsed">RETURN TO MENU</button>
      </div>
    `;
    this.overlay.querySelector('#btn-leave-collapsed')!.addEventListener('click', onLeave);
  }

  showPauseMenu(onResume: () => void, onLeave: () => void): void {
    const existing = this.overlay.querySelector('.pause-overlay');
    if (existing) return;
    const pause = document.createElement('div');
    pause.className = 'pause-overlay';
    pause.innerHTML = `
      <div class="screen pause-screen">
        <h2>PAUSED</h2>
        <button class="btn btn-primary" id="btn-resume">RESUME</button>
        <button class="btn btn-ghost" id="btn-quit">LEAVE DREAM</button>
      </div>
    `;
    this.overlay.appendChild(pause);
    pause.querySelector('#btn-resume')!.addEventListener('click', () => {
      pause.remove();
      onResume();
    });
    pause.querySelector('#btn-quit')!.addEventListener('click', onLeave);
  }

  hidePauseMenu(): void {
    this.overlay.querySelector('.pause-overlay')?.remove();
  }

  hide(): void {
    this.overlay.classList.add('hidden');
  }

  show(): void {
    this.overlay.classList.remove('hidden');
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

export function interpolatePlayers(
  current: Map<string, RemotePlayerEntry>,
  snapshots: PlayerSnapshot[],
  alpha: number,
): void {
  for (const snap of snapshots) {
    const entry = current.get(snap.id);
    if (!entry) continue;
    entry.mesh.position.lerp(
      { x: snap.position.x, y: snap.position.y, z: snap.position.z } as Vector3Like,
      alpha,
    );
    entry.mesh.rotation.y = snap.rotationY;
    entry.mesh.scale.setScalar(snap.scale);
  }
}

interface Vector3Like { x: number; y: number; z: number }

interface RemotePlayerEntry {
  mesh: { position: { lerp: (v: Vector3Like, a: number) => void }; rotation: { y: number }; scale: { setScalar: (s: number) => void } };
}
