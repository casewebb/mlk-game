import * as THREE from 'three';

function mat(color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.82, ...opts });
}

function box(
  w: number, h: number, d: number,
  material: THREE.Material,
  x: number, y: number, z: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function addWindows(
  group: THREE.Group,
  faceX: number,
  faceZ: number,
  width: number,
  startY: number,
  rows: number,
  cols: number,
  axis: 'x' | 'z',
): void {
  const winMat = mat(0xffeaa7, { emissive: 0xffeaa7, emissiveIntensity: 0.35, metalness: 0.1 });
  const spacing = width / (cols + 1);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const u = (c + 1) * spacing - width / 2;
      const y = startY + r * 1.4;
      if (axis === 'z') {
        group.add(box(0.9, 1.0, 0.08, winMat, faceX, y, faceZ + u));
      } else {
        group.add(box(0.08, 1.0, 0.9, winMat, faceX + u, y, faceZ));
      }
    }
  }
}

function addRoof(group: THREE.Group, w: number, d: number, y: number, color: number, x = 0, z = 0): void {
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(Math.max(w, d) * 0.72, 2.2, 4),
    mat(color),
  );
  roof.position.set(x, y + 1.1, z);
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  group.add(roof);

  const trim = box(w + 0.3, 0.15, d + 0.3, mat(0x2d3436), x, y, z);
  group.add(trim);
}

function addDoor(group: THREE.Group, x: number, y: number, z: number, facing: 'x' | 'z'): void {
  const doorMat = mat(0x5d4037);
  if (facing === 'z') {
    group.add(box(1.2, 2.2, 0.12, doorMat, x, y + 1.1, z));
    group.add(box(1.4, 2.4, 0.06, mat(0x3d3560), x, y + 1.1, z - 0.04));
  } else {
    group.add(box(0.12, 2.2, 1.2, doorMat, x, y + 1.1, z));
    group.add(box(0.06, 2.4, 1.4, mat(0x3d3560), x - 0.04, y + 1.1, z));
  }
}

export function createGroceryStore(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const wall = mat(0x6bcb77);
  const accent = mat(0x2d6a4f);

  g.add(box(8, 5, 6, wall, 0, 2.5, 0));
  g.add(box(8.4, 0.35, 6.4, accent, 0, 5.15, 0));
  addRoof(g, 8, 6, 5.3, 0x4a9080);
  addWindows(g, 0, 3.05, 5.5, 2.2, 1, 3, 'z');
  addDoor(g, 0, 0, 3.06, 'z');

  // Awning
  g.add(box(4, 0.12, 1.8, mat(0xff6b9d), 0, 2.8, 3.8));
  // Sign
  g.add(box(3.5, 0.6, 0.15, mat(0xffd93d, { emissive: 0xffd93d, emissiveIntensity: 0.2 }), 0, 4.2, 3.08));
  return g;
}

export function createSchool(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const wall = mat(0x74b9ff);
  g.add(box(10, 7, 8, wall, 0, 3.5, 0));
  g.add(box(10.3, 0.4, 8.3, mat(0x4a8fd4), 0, 7.2, 0));
  addRoof(g, 10, 8, 7.4, 0x5a7fc4);
  addWindows(g, 0, 4.05, 3.8, 2.5, 2, 4, 'z');
  addWindows(g, 0, 4.05, -3.8, 2.5, 2, 4, 'z');
  addDoor(g, 0, 0, 4.06, 'z');
  // Flag pole
  g.add(box(0.08, 5, 0.08, mat(0xcccccc), 4.5, 2.5, 3));
  const flag = box(1.2, 0.7, 0.04, mat(0xff6b9d), 5.1, 5.2, 3);
  g.add(flag);
  return g;
}

export function createChurch(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const wall = mat(0xe17055);
  g.add(box(6, 8, 6, wall, 0, 4, 0));
  addDoor(g, 0, 0, 3.06, 'z');

  // Steeple
  g.add(box(2, 6, 2, mat(0xc0392b), 0, 9, 0));
  const spire = new THREE.Mesh(
    new THREE.ConeGeometry(1.2, 4, 4),
    mat(0xffd93d, { emissive: 0xffd93d, emissiveIntensity: 0.15 }),
  );
  spire.position.set(0, 13, 0);
  spire.rotation.y = Math.PI / 4;
  spire.castShadow = true;
  g.add(spire);

  // Stained glass
  g.add(box(1.5, 2.5, 0.08, mat(0xa29bfe, { emissive: 0x6c5ce7, emissiveIntensity: 0.5 }), 0, 4, 3.04));
  addWindows(g, -2.8, 3.04, 2, 3.5, 2, 1, 'x');
  addWindows(g, 2.8, 3.04, 2, 3.5, 2, 1, 'x');
  return g;
}

export function createShop(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.add(box(12, 3.5, 8, mat(0xa29bfe), 0, 1.75, 0));
  g.add(box(12, 0.25, 8.2, mat(0x6c5ce7), 0, 3.6, 0));
  addWindows(g, 0, 4.05, 3.8, 1.8, 1, 5, 'z');
  addDoor(g, -2, 0, 4.06, 'z');
  // Neon sign
  g.add(box(5, 0.5, 0.1, mat(0xff6b9d, { emissive: 0xff6b9d, emissiveIntensity: 0.6 }), 0, 3.9, 4.06));
  return g;
}

export function createConstructionSite(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.add(box(6, 0.15, 6, mat(0xc4a35a), 0, 0.08, 0));
  g.add(box(6, 3, 0.15, mat(0xffd93d), 0, 1.5, -2.8));
  g.add(box(0.15, 3, 6, mat(0xffd93d), -2.8, 1.5, 0));
  // Crane
  g.add(box(0.25, 8, 0.25, mat(0xff8fab), 2, 4, 2));
  g.add(box(5, 0.2, 0.2, mat(0xff8fab), -0.5, 7.8, 2));
  g.add(box(0.8, 0.8, 0.8, mat(0x636e72), -3, 7.4, 2));
  return g;
}

export function createParkTree(x: number, z: number, height: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.add(box(0.35, height * 0.45, 0.35, mat(0x5d4037), 0, height * 0.22, 0));
  const foliage = new THREE.Mesh(
    new THREE.ConeGeometry(1.2 + height * 0.15, height * 0.7, 6),
    mat(0x2d6a4f),
  );
  foliage.position.y = height * 0.55;
  foliage.castShadow = true;
  g.add(foliage);
  const foliage2 = new THREE.Mesh(
    new THREE.ConeGeometry(0.9 + height * 0.1, height * 0.5, 6),
    mat(0x40916c),
  );
  foliage2.position.y = height * 0.75;
  foliage2.castShadow = true;
  g.add(foliage2);
  return g;
}

export function createStreetLamp(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.add(box(0.12, 4, 0.12, mat(0x2d3436), 0, 2, 0));
  g.add(box(0.8, 0.15, 0.15, mat(0x2d3436), 0.3, 3.8, 0));
  const bulb = box(0.35, 0.25, 0.35, mat(0xffeaa7, { emissive: 0xffeaa7, emissiveIntensity: 0.8 }), 0.65, 3.75, 0);
  g.add(bulb);
  const light = new THREE.PointLight(0xffeaa7, 0.4, 12);
  light.position.set(0.65, 3.75, 0);
  g.add(light);
  return g;
}

export function createAlleyBuilding(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.add(box(2.5, 5, 12, mat(0x5a4a7a), 0, 2.5, 0));
  g.add(box(2.6, 0.2, 12.1, mat(0x3d3560), 0, 5.1, 0));
  addWindows(g, 1.26, 0, 4, 2.5, 3, 1, 'x');
  // Fire escape
  for (let i = 0; i < 3; i++) {
    g.add(box(0.8, 0.08, 1.2, mat(0x636e72), 1.8, 1.2 + i * 1.4, 0));
  }
  return g;
}

export function createTunnelEntrance(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.add(box(5, 3.5, 1, mat(0x3d3560), 0, 1.75, -1.5));
  g.add(box(5, 0.4, 3, mat(0x2d3436), 0, 0.2, 0.5));
  const arch = new THREE.Mesh(
    new THREE.TorusGeometry(1.4, 0.18, 8, 12, Math.PI),
    mat(0x636e72),
  );
  arch.position.set(0, 2.2, 0.5);
  arch.rotation.x = Math.PI / 2;
  arch.rotation.z = Math.PI;
  g.add(arch);
  // Dark tunnel mouth
  g.add(box(2.2, 2.2, 0.3, mat(0x050508), 0, 1.1, 0.65));
  return g;
}

export function createMonumentPlatform(): THREE.Group {
  const g = new THREE.Group();
  g.add(box(9, 0.6, 9, mat(0xffd93d), 0, 0.3, 0));
  // Steps
  for (let i = 0; i < 3; i++) {
    const s = 9 + i * 0.8;
    g.add(box(s, 0.15, s, mat(0xe9c46a), 0, 0.08 - i * 0.12, 0));
  }
  // Obelisk
  g.add(box(2.5, 6, 2.5, mat(0xff6b9d, { emissive: 0xff6b9d, emissiveIntensity: 0.12 }), 0, 3.6, 0));
  const cap = new THREE.Mesh(
    new THREE.ConeGeometry(1.6, 1.5, 4),
    mat(0xffeaa7, { emissive: 0xffeaa7, emissiveIntensity: 0.25 }),
  );
  cap.position.y = 7.2;
  cap.rotation.y = Math.PI / 4;
  g.add(cap);
  return g;
}

export function createPerimeterWall(length: number, height: number, axis: 'x' | 'z', pos: number): THREE.Group {
  const g = new THREE.Group();
  const wallMat = mat(0x8b7ec8);
  const trimMat = mat(0x6b5b95);
  if (axis === 'z') {
    g.add(box(length, height, 1, wallMat, 0, height / 2, pos));
    g.add(box(length, 0.25, 1.15, trimMat, 0, height + 0.12, pos));
  } else {
    g.add(box(1, height, length, wallMat, pos, height / 2, 0));
    g.add(box(1.15, 0.25, length, trimMat, pos, height + 0.12, 0));
  }
  return g;
}

export function createSidewalkStrip(x: number, z: number, w: number, d: number): THREE.Mesh {
  return box(w, 0.08, d, mat(0x95a5a6), x, 0.04, z);
}

export function createRoadMarkings(): THREE.Group {
  const g = new THREE.Group();
  for (let i = -35; i <= 35; i += 4) {
    g.add(box(0.3, 0.02, 1.8, mat(0xffeaa7, { emissive: 0xffeaa7, emissiveIntensity: 0.1 }), 0, 0.02, i));
  }
  return g;
}
