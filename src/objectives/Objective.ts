import type { RoundSnapshot } from '../networking/NetworkMessages.ts';

export interface ObjectiveContext {
  getFragmentCount(): number;
  getDepositedCount(): number;
  getRequiredCount(): number;
}

export interface DreamObjective {
  id: string;
  name: string;
  description: string;

  initialize(ctx: ObjectiveContext): void;
  isComplete(ctx: ObjectiveContext): boolean;
  isFailed(_ctx: ObjectiveContext): boolean;
  getProgress(ctx: ObjectiveContext): { current: number; total: number };
}

export function objectiveToRound(ctx: ObjectiveContext, objective: DreamObjective): Partial<RoundSnapshot> {
  const progress = objective.getProgress(ctx);
  return {
    fragmentsCollected: progress.current,
    fragmentsRequired: progress.total,
  };
}
