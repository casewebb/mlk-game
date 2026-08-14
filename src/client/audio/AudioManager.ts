export class AudioManager {
  private ctx: AudioContext | null = null;
  private enabled = true;

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15): void {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio not available
    }
  }

  playPickup(): void {
    this.playTone(440, 0.1, 'sine', 0.12);
    setTimeout(() => this.playTone(660, 0.1, 'sine', 0.1), 50);
  }

  playDrop(): void {
    this.playTone(220, 0.15, 'triangle', 0.1);
  }

  playDeposit(): void {
    this.playTone(523, 0.15, 'sine', 0.15);
    setTimeout(() => this.playTone(784, 0.2, 'sine', 0.12), 100);
  }

  playEvent(): void {
    this.playTone(110, 0.5, 'sawtooth', 0.08);
    setTimeout(() => this.playTone(87, 0.6, 'sawtooth', 0.06), 200);
  }

  playWin(): void {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.3, 'sine', 0.12), i * 150);
    });
  }

  playLose(): void {
    [392, 330, 262].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.4, 'triangle', 0.1), i * 200);
    });
  }

  playAbility(): void {
    this.playTone(180, 0.3, 'square', 0.06);
  }

  playVote(): void {
    this.playTone(330, 0.2, 'sine', 0.1);
  }
}
