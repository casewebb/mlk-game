import type { Vec3 } from '../networking/NetworkMessages.ts';
import { SHOOT_RANGE } from '../game/RoundState.ts';

export interface HitscanTarget {
  id: string;
  position: Vec3;
  scale: number;
}

export interface HitscanResult {
  playerId: string;
  hitPoint: Vec3;
  distance: number;
}

export function hitscan(
  origin: Vec3,
  direction: Vec3,
  shooterId: string,
  targets: HitscanTarget[],
): HitscanResult | null {
  let best: HitscanResult | null = null;

  for (const target of targets) {
    if (target.id === shooterId) continue;

    const ox = origin.x;
    const oy = origin.y;
    const oz = origin.z;
    const dx = direction.x;
    const dy = direction.y;
    const dz = direction.z;

    const tx = target.position.x - ox;
    const ty = target.position.y - oy - 0.5;
    const tz = target.position.z - oz;

    const proj = tx * dx + ty * dy + tz * dz;
    if (proj < 0 || proj > SHOOT_RANGE) continue;

    const cx = ox + dx * proj;
    const cy = oy + dy * proj;
    const cz = oz + dz * proj;

    const distSq =
      (target.position.x - cx) ** 2 +
      (target.position.y - 0.5 - cy) ** 2 +
      (target.position.z - cz) ** 2;

    const hitRadius = 0.85 * target.scale;
    if (distSq <= hitRadius * hitRadius) {
      if (!best || proj < best.distance) {
        best = {
          playerId: target.id,
          hitPoint: { x: cx, y: cy, z: cz },
          distance: proj,
        };
      }
    }
  }

  return best;
}

export function aimToDirection(rotationY: number, pitch: number): Vec3 {
  const cosPitch = Math.cos(pitch);
  return {
    x: -Math.sin(rotationY) * cosPitch,
    y: Math.sin(pitch),
    z: -Math.cos(rotationY) * cosPitch,
  };
}

export function normalizeDirection(dir: Vec3): Vec3 {
  const len = Math.sqrt(dir.x ** 2 + dir.y ** 2 + dir.z ** 2) || 1;
  return { x: dir.x / len, y: dir.y / len, z: dir.z / len };
}
