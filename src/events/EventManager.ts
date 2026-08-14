import type { DreamEvent, EventContext } from './DreamEvent.ts';
import { createAllEvents } from './EventRegistry.ts';

export class EventManager {
  private events: DreamEvent[];
  private active: DreamEvent | null = null;
  private activeTimer = 0;
  private elapsed = 0;
  private nextEventAt = 45;
  private rng: () => number;

  constructor(seed: number) {
    this.events = createAllEvents();
    let s = seed;
    this.rng = () => {
      s = (s * 16807 + 0) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  update(ctx: EventContext, delta: number, timeRemaining: number): void {
    this.elapsed += delta;

    if (this.active) {
      this.activeTimer -= delta;
      this.active.update(ctx, delta);
      if (this.activeTimer <= 0) {
        this.active.end(ctx);
        this.active = null;
      }
      return;
    }

    if (timeRemaining <= 0) return;

    if (this.elapsed >= this.nextEventAt) {
      this.triggerRandom(ctx);
      this.nextEventAt = this.elapsed + 35 + this.rng() * 25;
    }
  }

  triggerRandom(ctx: EventContext): void {
    const event = this.events[Math.floor(this.rng() * this.events.length)]!;
    this.startEvent(event, ctx);
  }

  startEvent(event: DreamEvent, ctx: EventContext): void {
    if (this.active) this.active.end(ctx);
    this.active = event;
    this.activeTimer = event.duration;
    event.start(ctx);
  }

  getActiveEventId(): string | null {
    return this.active?.id ?? null;
  }

  getActiveAnnouncement(): string | null {
    return this.active?.announcement ?? null;
  }
}
