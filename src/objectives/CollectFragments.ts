import type { DreamObjective, ObjectiveContext } from './Objective.ts';

export const FRAGMENTS_REQUIRED = 10;

export class CollectFragmentsObjective implements DreamObjective {
  id = 'collect_fragments';
  name = 'Collect Dream Fragments';
  description = 'Collect 10 Dream Fragments and bring them to the Dream Machine.';

  initialize(_ctx: ObjectiveContext): void {}

  isComplete(ctx: ObjectiveContext): boolean {
    return ctx.getDepositedCount() >= FRAGMENTS_REQUIRED;
  }

  isFailed(_ctx: ObjectiveContext): boolean {
    return false;
  }

  getProgress(ctx: ObjectiveContext): { current: number; total: number } {
    return { current: ctx.getDepositedCount(), total: FRAGMENTS_REQUIRED };
  }
}
