import * as THREE from 'three';

export interface BackroomsResult {
  group: THREE.Group;
  spawnPoint: THREE.Vector3;
  exitPoint: THREE.Vector3;
  bounds: { min: THREE.Vector3; max: THREE.Vector3 };
}

const WALL = 0xc9b458;
const FLOOR = 0x8a7a40;

function createWall(w: number, h: number, d: number, x: number, y: number, z: number): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color: WALL, roughness: 0.95 }),
  );
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  return mesh;
}

export function buildBackrooms(seed: number): BackroomsResult {
  const group = new THREE.Group();
  let s = seed;

  const rng = () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };

  const size = 40;
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshStandardMaterial({ color: FLOOR, roughness: 1 }),
  );
  floor.rotation.x = -Math.PI / 2;
  group.add(floor);

  // Maze-like walls
  for (let i = 0; i < 24; i++) {
    const w = 2 + rng() * 6;
    const h = 3;
    const d = 0.3;
    const x = (rng() - 0.5) * (size - 6);
    const z = (rng() - 0.5) * (size - 6);
    group.add(createWall(w, h, d, x, h / 2, z));
  }

  // Perimeter
  group.add(createWall(size, 3, 0.3, 0, 1.5, -size / 2));
  group.add(createWall(size, 3, 0.3, 0, 1.5, size / 2));
  group.add(createWall(0.3, 3, size, -size / 2, 1.5, 0));
  group.add(createWall(0.3, 3, size, size / 2, 1.5, 0));

  // Flickering lights
  for (let i = 0; i < 6; i++) {
    const light = new THREE.PointLight(0xffeaa7, 0.6, 12);
    light.position.set((rng() - 0.5) * 30, 2.5, (rng() - 0.5) * 30);
    light.userData.flicker = rng() * Math.PI * 2;
    group.add(light);
  }

  const ambient = new THREE.AmbientLight(0x3a3520, 0.5);
  group.add(ambient);

  return {
    group,
    spawnPoint: new THREE.Vector3(0, 1.8, 0),
    exitPoint: new THREE.Vector3(size / 2 - 2, 1.8, 0),
    bounds: {
      min: new THREE.Vector3(-size / 2 + 1, 0, -size / 2 + 1),
      max: new THREE.Vector3(size / 2 - 1, 5, size / 2 - 1),
    },
  };
}

export function updateBackroomsLights(group: THREE.Group, time: number): void {
  group.traverse((obj) => {
    if (obj instanceof THREE.PointLight && obj.userData.flicker !== undefined) {
      obj.intensity = 0.3 + Math.sin(time * 8 + obj.userData.flicker) * 0.15
        + (Math.random() > 0.97 ? -0.2 : 0);
    }
  });
}

export function getBackroomsFogColor(): number {
  return 0x2a2410;
}
