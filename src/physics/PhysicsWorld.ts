import * as CANNON from 'cannon-es';
import * as THREE from 'three';

export interface PhysicsBody {
  id: string;
  body: CANNON.Body;
  mesh: THREE.Object3D;
}

export class PhysicsWorld {
  readonly world: CANNON.World;
  private bodies = new Map<string, PhysicsBody>();
  private defaultGravity = -20;

  constructor() {
    this.world = new CANNON.World();
    this.world.gravity.set(0, this.defaultGravity, 0);
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.allowSleep = true;
    this.world.defaultContactMaterial.friction = 0.4;
    this.world.defaultContactMaterial.restitution = 0.3;
  }

  addGround(_size = 60): CANNON.Body {
    const shape = new CANNON.Plane();
    const body = new CANNON.Body({ mass: 0, shape });
    body.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(body);
    return body;
  }

  addBox(
    id: string,
    mesh: THREE.Mesh,
    mass: number,
    size: { x: number; y: number; z: number },
  ): PhysicsBody {
    const shape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
    const body = new CANNON.Body({ mass, shape });
    body.position.set(mesh.position.x, mesh.position.y, mesh.position.z);
    body.quaternion.set(
      mesh.quaternion.x,
      mesh.quaternion.y,
      mesh.quaternion.z,
      mesh.quaternion.w,
    );
    body.linearDamping = 0.1;
    body.angularDamping = 0.3;
    this.world.addBody(body);

    const entry: PhysicsBody = { id, body, mesh };
    this.bodies.set(id, entry);
    return entry;
  }

  addSphere(id: string, mesh: THREE.Mesh, mass: number, radius: number): PhysicsBody {
    const shape = new CANNON.Sphere(radius);
    const body = new CANNON.Body({ mass, shape });
    body.position.set(mesh.position.x, mesh.position.y, mesh.position.z);
    body.linearDamping = 0.05;
    body.angularDamping = 0.2;
    this.world.addBody(body);

    const entry: PhysicsBody = { id, body, mesh };
    this.bodies.set(id, entry);
    return entry;
  }

  getBody(id: string): PhysicsBody | undefined {
    return this.bodies.get(id);
  }

  getAllBodies(): PhysicsBody[] {
    return [...this.bodies.values()];
  }

  removeBody(id: string): void {
    const entry = this.bodies.get(id);
    if (entry) {
      this.world.removeBody(entry.body);
      this.bodies.delete(id);
    }
  }

  setGravity(y: number): void {
    this.world.gravity.set(0, y, 0);
  }

  resetGravity(): void {
    this.world.gravity.set(0, this.defaultGravity, 0);
  }

  setHeld(id: string, held: boolean): void {
    const entry = this.bodies.get(id);
    if (!entry) return;
    if (held) {
      entry.body.type = CANNON.Body.KINEMATIC;
      entry.body.velocity.set(0, 0, 0);
      entry.body.angularVelocity.set(0, 0, 0);
    } else {
      entry.body.type = CANNON.Body.DYNAMIC;
      entry.body.wakeUp();
    }
  }

  syncMeshes(): void {
    for (const { body, mesh } of this.bodies.values()) {
      mesh.position.set(body.position.x, body.position.y, body.position.z);
      mesh.quaternion.set(
        body.quaternion.x,
        body.quaternion.y,
        body.quaternion.z,
        body.quaternion.w,
      );
    }
  }

  step(delta: number): void {
    this.world.step(1 / 60, delta, 3);
    this.syncMeshes();
  }

  applyThrowForce(id: string, direction: THREE.Vector3, force: number): void {
    const entry = this.bodies.get(id);
    if (!entry) return;
    entry.body.wakeUp();
    entry.body.velocity.set(
      direction.x * force,
      direction.y * force + 2,
      direction.z * force,
    );
  }

  teleport(id: string, pos: { x: number; y: number; z: number }): void {
    const entry = this.bodies.get(id);
    if (!entry) return;
    entry.body.position.set(pos.x, pos.y, pos.z);
    entry.body.velocity.set(0, 0, 0);
    entry.body.angularVelocity.set(0, 0, 0);
    entry.mesh.position.set(pos.x, pos.y, pos.z);
  }
}
