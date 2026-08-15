import * as THREE from 'three';
import {
  createAlleyBuilding,
  createChurch,
  createConstructionSite,
  createGroceryStore,
  createMonumentPlatform,
  createParkTree,
  createPerimeterWall,
  createRoadMarkings,
  createSchool,
  createShop,
  createSidewalkStrip,
  createStreetLamp,
  createTunnelEntrance,
} from './BuildingFactory.ts';
import {
  createHumanCharacter,
  createPlayerNameTag,
  PLAYER_EYE_HEIGHT,
} from '../client/rendering/CharacterModel.ts';

export interface DreamCityResult {
  group: THREE.Group;
  spawnPoint: THREE.Vector3;
  dreamMachinePos: THREE.Vector3;
  bounds: { min: THREE.Vector3; max: THREE.Vector3 };
  fragmentSpawnPoints: THREE.Vector3[];
  lights: THREE.Light[];
}

export const SKY_COLOR = 0x1a1a2e;
const FLOOR_COLOR = 0x4a6741;
const STREET_COLOR = 0x3d3d3d;

export function buildDreamCity(): DreamCityResult {
  const group = new THREE.Group();
  const lights: THREE.Light[] = [];

  // Ground layers
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({ color: FLOOR_COLOR, roughness: 0.95 }),
  );
  grass.rotation.x = -Math.PI / 2;
  grass.receiveShadow = true;
  group.add(grass);

  const street = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 80),
    new THREE.MeshStandardMaterial({ color: STREET_COLOR, roughness: 0.88 }),
  );
  street.rotation.x = -Math.PI / 2;
  street.position.y = 0.01;
  street.receiveShadow = true;
  group.add(street);

  group.add(createRoadMarkings());
  group.add(createSidewalkStrip(-7, 0, 2, 78));
  group.add(createSidewalkStrip(7, 0, 2, 78));

  // Perimeter
  const wallH = 6;
  group.add(createPerimeterWall(80, wallH, 'z', -40));
  group.add(createPerimeterWall(80, wallH, 'z', 40));
  group.add(createPerimeterWall(80, wallH, 'x', -40));
  group.add(createPerimeterWall(80, wallH, 'x', 40));

  // District buildings
  group.add(createGroceryStore(-20, -15));
  group.add(createSchool(20, -15));
  group.add(createChurch(-20, 15));
  group.add(createShop(20, 15));
  group.add(createConstructionSite(-8, -8));
  group.add(createAlleyBuilding(8, -25));
  group.add(createTunnelEntrance(15, -30));

  // Central monument
  group.add(createMonumentPlatform());

  // Park
  for (let i = 0; i < 6; i++) {
    group.add(createParkTree(-5 + i * 2.5, 20 + (i % 2) * 2, 3 + (i % 3) * 0.5));
  }

  // Street lamps along main street
  for (let z = -30; z <= 30; z += 15) {
    group.add(createStreetLamp(5.5, z));
    group.add(createStreetLamp(-5.5, z + 7));
  }

  // Ramp to rooftop area
  const ramp = new THREE.Mesh(
    new THREE.BoxGeometry(6, 0.2, 5),
    new THREE.MeshStandardMaterial({ color: 0xa29bfe, roughness: 0.85 }),
  );
  ramp.position.set(-25, 0.4, 5);
  ramp.rotation.x = -0.28;
  ramp.receiveShadow = true;
  ramp.castShadow = true;
  group.add(ramp);

  const ambient = new THREE.AmbientLight(0x404060, 0.55);
  group.add(ambient);
  lights.push(ambient);

  const sun = new THREE.DirectionalLight(0xfff5e6, 1.15);
  sun.position.set(15, 25, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 100;
  sun.shadow.camera.left = -45;
  sun.shadow.camera.right = 45;
  sun.shadow.camera.top = 45;
  sun.shadow.camera.bottom = -45;
  group.add(sun);
  lights.push(sun);

  const fill = new THREE.PointLight(0x9b59b6, 0.45, 50);
  fill.position.set(-10, 8, -10);
  group.add(fill);
  lights.push(fill);

  const dreamMachinePos = new THREE.Vector3(0, PLAYER_EYE_HEIGHT, 4);

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
    spawnPoint: new THREE.Vector3(0, PLAYER_EYE_HEIGHT, 20),
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
    new THREE.CylinderGeometry(2, 2.5, 1.5, 12),
    new THREE.MeshStandardMaterial({ color: 0x6c5ce7, emissive: 0x6c5ce7, emissiveIntensity: 0.35, roughness: 0.6 }),
  );
  base.position.y = 0.75;
  base.castShadow = true;
  g.add(base);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.6, 0.12, 8, 24),
    new THREE.MeshStandardMaterial({ color: 0xff6b9d, emissive: 0xff6b9d, emissiveIntensity: 0.4 }),
  );
  ring.position.y = 1.6;
  ring.rotation.x = Math.PI / 2;
  g.add(ring);

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.75, 0),
    new THREE.MeshStandardMaterial({ color: 0xffeaa7, emissive: 0xffeaa7, emissiveIntensity: 0.9, metalness: 0.2 }),
  );
  core.position.y = 2.1;
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
      metalness: 0.35,
      roughness: 0.3,
    }),
  );
  mesh.castShadow = true;
  return mesh;
}

export function createBackroomsDoorMesh(): THREE.Group {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 3.2, 0.25),
    new THREE.MeshStandardMaterial({ color: 0x3d3560, roughness: 0.9 }),
  );
  frame.position.y = 1.6;
  g.add(frame);

  const portal = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 2.8),
    new THREE.MeshStandardMaterial({
      color: 0xc9b458,
      emissive: 0xc9b458,
      emissiveIntensity: 0.65,
      side: THREE.DoubleSide,
    }),
  );
  portal.position.set(0, 1.6, 0.18);
  g.add(portal);

  const knob = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xffeaa7, emissive: 0xffeaa7, emissiveIntensity: 0.5 }),
  );
  knob.position.set(0.6, 1.2, 0.25);
  g.add(knob);

  g.userData.isBackroomsDoor = true;
  return g;
}

export function createRemotePlayerMesh(name: string, color: number): THREE.Group {
  const g = createHumanCharacter(color);
  g.add(createPlayerNameTag(name));
  return g;
}

export const PLAYER_COLORS = [
  0xff6b9d, 0x6bcb77, 0x74b9ff, 0xffd93d,
  0xa29bfe, 0xe17055, 0xff8fab, 0x00cec9,
];

export { PLAYER_EYE_HEIGHT };
