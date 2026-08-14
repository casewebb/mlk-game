import * as THREE from 'three';

export interface DreamCityResult {
  group: THREE.Group;
  spawnPoint: THREE.Vector3;
  dreamMachinePos: THREE.Vector3;
  bounds: { min: THREE.Vector3; max: THREE.Vector3 };
  fragmentSpawnPoints: THREE.Vector3[];
  lights: THREE.Light[];
}

const WALL_COLOR = 0x8b7ec8;
const FLOOR_COLOR = 0x4a6741;
const ACCENT_COLOR = 0xff6b9d;
export const SKY_COLOR = 0x1a1a2e;

function createBox(
  w: number, h: number, d: number, color: number,
  x: number, y: number, z: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.85 }),
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createBuilding(w: number, h: number, d: number, color: number, x: number, z: number): THREE.Mesh {
  return createBox(w, h, d, color, x, h / 2, z);
}

export function buildDreamCity(): DreamCityResult {
  const group = new THREE.Group();
  const lights: THREE.Light[] = [];

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({ color: FLOOR_COLOR, roughness: 0.9 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  const wallH = 6;
  group.add(createBox(80, wallH, 1, WALL_COLOR, 0, wallH / 2, -40));
  group.add(createBox(80, wallH, 1, WALL_COLOR, 0, wallH / 2, 40));
  group.add(createBox(1, wallH, 80, WALL_COLOR, -40, wallH / 2, 0));
  group.add(createBox(1, wallH, 80, WALL_COLOR, 40, wallH / 2, 0));

  // Main street buildings
  group.add(createBuilding(8, 6, 6, 0x6bcb77, -20, -15)); // Grocery
  group.add(createBuilding(10, 8, 8, 0x74b9ff, 20, -15)); // School
  group.add(createBuilding(6, 10, 6, 0xe17055, -20, 15)); // Church
  group.add(createBuilding(12, 4, 8, 0xa29bfe, 20, 15)); // Store

  // Construction site
  group.add(createBox(6, 3, 6, 0xffd93d, -8, 1.5, -8));
  group.add(createBox(2, 8, 2, 0xff8fab, -10, 4, -6));

  // Central monument / Dream Machine platform
  const machinePlatform = createBox(8, 1, 8, 0xffd93d, 0, 0.5, 0);
  group.add(machinePlatform);
  group.add(createBox(3, 6, 3, ACCENT_COLOR, 0, 3.5, 0));

  // Park area
  for (let i = 0; i < 5; i++) {
    const tree = createBox(1, 3 + Math.random() * 2, 1, 0x2d6a4f, -5 + i * 3, 1.5, 20);
    group.add(tree);
  }

  // Rooftop access ramp
  const ramp = createBox(6, 0.5, 4, 0xa29bfe, -25, 0.5, 5);
  ramp.rotation.x = -0.3;
  group.add(ramp);

  // Alley
  group.add(createBox(2, 4, 12, 0x5a4a7a, 8, 2, -25));

  // Underground tunnel entrance (visual)
  group.add(createBox(4, 3, 4, 0x3d3560, 15, 1.5, -30));

  const ambient = new THREE.AmbientLight(0x404060, 0.6);
  group.add(ambient);
  lights.push(ambient);

  const sun = new THREE.DirectionalLight(0xfff5e6, 1.2);
  sun.position.set(15, 25, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 100;
  sun.shadow.camera.left = -45;
  sun.shadow.camera.right = 45;
  sun.shadow.camera.top = 45;
  sun.shadow.camera.bottom = -45;
  group.add(sun);
  lights.push(sun);

  const fill = new THREE.PointLight(0x9b59b6, 0.5, 50);
  fill.position.set(-10, 8, -10);
  group.add(fill);
  lights.push(fill);

  const dreamMachinePos = new THREE.Vector3(0, 1.8, 4);

  const fragmentSpawnPoints = [
    new THREE.Vector3(-20, 1, -10),
    new THREE.Vector3(20, 1, -10),
    new THREE.Vector3(-20, 1, 15),
    new THREE.Vector3(20, 1, 15),
    new THREE.Vector3(-8, 1, -8),
    new THREE.Vector3(15, 1, -30),
    new THREE.Vector3(-25, 1, 5),
    new THREE.Vector3(8, 1, -25),
    new THREE.Vector3(-5, 1, 20),
    new THREE.Vector3(25, 1, 5),
    new THREE.Vector3(-15, 1, -30),
    new THREE.Vector3(0, 1, 30),
  ];

  return {
    group,
    spawnPoint: new THREE.Vector3(0, 1.8, 20),
    dreamMachinePos,
    bounds: {
      min: new THREE.Vector3(-38, 0, -38),
      max: new THREE.Vector3(38, 20, 38),
    },
    fragmentSpawnPoints,
    lights,
  };
}

export function getSkyColor(): number {
  return SKY_COLOR;
}

export function createDreamMachineMesh(): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(2, 2.5, 1.5, 8),
    new THREE.MeshStandardMaterial({ color: 0x6c5ce7, emissive: 0x6c5ce7, emissiveIntensity: 0.3 }),
  );
  base.position.y = 0.75;
  g.add(base);

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.8, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xffeaa7, emissive: 0xffeaa7, emissiveIntensity: 0.8 }),
  );
  core.position.y = 2;
  g.add(core);

  g.userData.isDreamMachine = true;
  return g;
}

export function createFragmentMesh(): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.35, 0),
    new THREE.MeshStandardMaterial({
      color: 0xffeaa7,
      emissive: 0xff6b9d,
      emissiveIntensity: 0.5,
      metalness: 0.3,
    }),
  );
  mesh.castShadow = true;
  return mesh;
}

export function createBackroomsDoorMesh(): THREE.Group {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(2, 3, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x3d3560 }),
  );
  frame.position.y = 1.5;
  g.add(frame);

  const portal = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 2.5),
    new THREE.MeshStandardMaterial({
      color: 0xc9b458,
      emissive: 0xc9b458,
      emissiveIntensity: 0.6,
      side: THREE.DoubleSide,
    }),
  );
  portal.position.set(0, 1.5, 0.15);
  g.add(portal);
  g.userData.isBackroomsDoor = true;
  return g;
}

export function createRemotePlayerMesh(name: string, color: number): THREE.Group {
  const g = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.4, 1, 4, 8),
    new THREE.MeshStandardMaterial({ color }),
  );
  body.position.y = 0.9;
  g.add(body);

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = '#ffeaa7';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(name, 128, 42);

  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true }),
  );
  sprite.position.y = 2.2;
  sprite.scale.set(2, 0.5, 1);
  g.add(sprite);

  return g;
}

export const PLAYER_COLORS = [
  0xff6b9d, 0x6bcb77, 0x74b9ff, 0xffd93d,
  0xa29bfe, 0xe17055, 0xff8fab, 0x00cec9,
];
