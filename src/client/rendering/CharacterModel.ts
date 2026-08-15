import * as THREE from 'three';

/** Camera / eye height above ground (feet at y=0) */
export const PLAYER_EYE_HEIGHT = 1.65;

const SKIN_TONE = 0xffdbac;
const SHOE_COLOR = 0x2d3436;

function part(
  geo: THREE.BufferGeometry,
  color: number,
  x: number,
  y: number,
  z: number,
  opts: { emissive?: number; metalness?: number; roughness?: number } = {},
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color,
      roughness: opts.roughness ?? 0.75,
      metalness: opts.metalness ?? 0,
      emissive: opts.emissive ?? 0x000000,
      emissiveIntensity: opts.emissive ? 0.15 : 0,
    }),
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Low-poly human character with origin at the feet (ground level).
 */
export function createHumanCharacter(shirtColor: number): THREE.Group {
  const g = new THREE.Group();
  g.userData.eyeHeight = PLAYER_EYE_HEIGHT;

  // Shoes
  g.add(part(new THREE.BoxGeometry(0.22, 0.1, 0.32), SHOE_COLOR, -0.14, 0.05, 0.02));
  g.add(part(new THREE.BoxGeometry(0.22, 0.1, 0.32), SHOE_COLOR, 0.14, 0.05, 0.02));

  // Legs
  g.add(part(new THREE.BoxGeometry(0.2, 0.55, 0.22), 0x4a5568, -0.14, 0.38, 0));
  g.add(part(new THREE.BoxGeometry(0.2, 0.55, 0.22), 0x4a5568, 0.14, 0.38, 0));

  // Torso
  g.add(part(new THREE.BoxGeometry(0.55, 0.6, 0.28), shirtColor, 0, 0.95, 0));

  // Arms
  g.add(part(new THREE.BoxGeometry(0.16, 0.5, 0.16), shirtColor, -0.38, 0.92, 0));
  g.add(part(new THREE.BoxGeometry(0.16, 0.5, 0.16), shirtColor, 0.38, 0.92, 0));
  g.add(part(new THREE.BoxGeometry(0.14, 0.14, 0.14), SKIN_TONE, -0.38, 0.62, 0));
  g.add(part(new THREE.BoxGeometry(0.14, 0.14, 0.14), SKIN_TONE, 0.38, 0.62, 0));

  // Neck + head
  g.add(part(new THREE.BoxGeometry(0.14, 0.1, 0.14), SKIN_TONE, 0, 1.32, 0));
  g.add(part(new THREE.BoxGeometry(0.38, 0.38, 0.38), SKIN_TONE, 0, 1.56, 0));

  // Simple face
  g.add(part(new THREE.BoxGeometry(0.06, 0.06, 0.02), 0x2d3436, -0.08, 1.58, 0.2));
  g.add(part(new THREE.BoxGeometry(0.06, 0.06, 0.02), 0x2d3436, 0.08, 1.58, 0.2));

  return g;
}

export function createPlayerNameTag(name: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(8, 12, 240, 44);
  ctx.fillStyle = '#ffeaa7';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(name, 128, 42);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }),
  );
  sprite.position.y = 2.05;
  sprite.scale.set(2.2, 0.55, 1);
  sprite.renderOrder = 999;
  return sprite;
}

/** Convert eye-level world position to feet position for character mesh */
export function eyeToFeet(eye: { x: number; y: number; z: number }): THREE.Vector3 {
  return new THREE.Vector3(eye.x, eye.y - PLAYER_EYE_HEIGHT, eye.z);
}

/** Convert feet position to eye level */
export function feetToEye(feet: { x: number; y: number; z: number }): THREE.Vector3 {
  return new THREE.Vector3(feet.x, feet.y + PLAYER_EYE_HEIGHT, feet.z);
}

export function createFirstPersonBody(shirtColor: number): THREE.Group {
  const g = new THREE.Group();

  const legMat = new THREE.MeshStandardMaterial({ color: 0x4a5568, roughness: 0.8 });
  const torsoMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.8 });
  const armMat = torsoMat;

  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.65, 0.22), legMat);
  leftLeg.position.set(-0.14, -0.55, -0.35);
  g.add(leftLeg);

  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.65, 0.22), legMat);
  rightLeg.position.set(0.14, -0.55, -0.35);
  g.add(rightLeg);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.26), torsoMat);
  torso.position.set(0, -0.15, -0.4);
  g.add(torso);

  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.45, 0.14), armMat);
  leftArm.position.set(-0.34, -0.1, -0.38);
  g.add(leftArm);

  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.45, 0.14), armMat);
  rightArm.position.set(0.34, -0.1, -0.38);
  g.add(rightArm);

  return g;
}
