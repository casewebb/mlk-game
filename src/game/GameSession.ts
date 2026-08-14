import * as THREE from 'three';
import { SceneManager } from '../client/rendering/SceneManager.ts';
import { FirstPersonControls } from '../client/input/FirstPersonControls.ts';
import { GameHUD } from '../client/ui/GameHUD.ts';
import { AudioManager } from '../client/audio/AudioManager.ts';
import { PhysicsWorld } from '../physics/PhysicsWorld.ts';
import { NetworkManager } from '../networking/NetworkManager.ts';
import type { NetworkMessage, PlayerRole, PlayerSnapshot, RoundSnapshot } from '../networking/NetworkMessages.ts';
import { CollectFragmentsObjective, FRAGMENTS_REQUIRED } from '../objectives/CollectFragments.ts';
import type { DreamObjective } from '../objectives/Objective.ts';
import { EventManager } from '../events/EventManager.ts';
import type { EventContext } from '../events/DreamEvent.ts';
import { createAllEvents } from '../events/EventRegistry.ts';
import { createNightmareAbilities, type NightmareAbility } from '../abilities/NightmareAbility.ts';
import {
  buildDreamCity,
  createBackroomsDoorMesh,
  createDreamMachineMesh,
  createFragmentMesh,
  createRemotePlayerMesh,
  PLAYER_COLORS,
  SKY_COLOR,
} from '../maps/DreamCity.ts';
import { buildBackrooms, getBackroomsFogColor, updateBackroomsLights } from '../maps/Backrooms.ts';
import {
  createRoundSnapshot,
  INTRO_DURATION,
  ROUND_DURATION,
  type RoundEndInfo,
  type SessionPlayer,
} from './RoundState.ts';

export interface GameSessionConfig {
  localPlayerId: string;
  localPlayerName: string;
  isHost: boolean;
  network: NetworkManager;
  players: SessionPlayer[];
  seed: number;
  onEnd: (info: RoundEndInfo) => void;
  onLeave: () => void;
  onHostDisconnected: () => void;
}

export class GameSession {
  private config: GameSessionConfig;
  private sceneManager: SceneManager;
  private controls: FirstPersonControls;
  private hud: GameHUD;
  private audio: AudioManager;
  private physics: PhysicsWorld;
  private objective: DreamObjective;
  private eventManager: EventManager;
  private nightmareAbilities: NightmareAbility[];

  private paused = false;
  private disposed = false;

  private players = new Map<string, SessionPlayer>();
  private remoteMeshes = new Map<string, THREE.Group>();
  private fragments = new Map<string, { deposited: boolean; holderId: string | null }>();

  private dreamMachine: THREE.Group | null = null;
  private backroomsDoor: THREE.Group | null = null;
  private cityGroup: THREE.Group | null = null;
  private backroomsGroup: THREE.Group | null = null;
  private mapLights: THREE.Light[] = [];

  private inBackrooms = false;
  private bounds = { min: new THREE.Vector3(-38, 0, -38), max: new THREE.Vector3(38, 20, 38) };
  private spawnPoint = new THREE.Vector3(0, 1.8, 20);
  private citySpawn = new THREE.Vector3(0, 1.8, 20);
  private backroomsSpawn = new THREE.Vector3(0, 1.8, 0);

  private timeRemaining = ROUND_DURATION;
  private introTimer = INTRO_DURATION;
  private phase: RoundSnapshot['phase'] = 'intro';
  private tick = 0;
  private stateSyncTimer = 0;
  private localRole: PlayerRole = 'dreamer';
  private heldObjectId: string | null = null;
  private depositedCount = 0;
  private winner: 'dreamers' | 'nightmare' | null = null;
  private voting = false;
  private elapsed = 0;

  constructor(canvas: HTMLCanvasElement, config: GameSessionConfig) {
    this.config = config;
    this.sceneManager = new SceneManager(canvas);
    this.controls = new FirstPersonControls(this.sceneManager.camera);
    this.hud = new GameHUD();
    this.audio = new AudioManager();
    this.physics = new PhysicsWorld();
    this.objective = new CollectFragmentsObjective();
    this.eventManager = new EventManager(config.seed);
    this.nightmareAbilities = createNightmareAbilities();

    for (const p of config.players) {
      this.players.set(p.id, { ...p });
    }

    const local = this.players.get(config.localPlayerId);
    if (local) this.localRole = local.role;

    this.setupMap();
    this.setupNetworking();
    this.setupInput();

    this.hud.showIntro(() => {
      this.phase = 'playing';
      this.controls.enable();
    });

    this.sceneManager.onUpdate((delta) => this.update(delta));
    this.sceneManager.start();
  }

  private setupMap(): void {
    const city = buildDreamCity();
    this.cityGroup = city.group;
    this.sceneManager.scene.add(city.group);
    this.mapLights = city.lights;
    this.bounds = city.bounds;
    this.spawnPoint = city.spawnPoint.clone();
    this.citySpawn = city.spawnPoint.clone();

    this.physics.addGround(80);

    this.dreamMachine = createDreamMachineMesh();
    this.dreamMachine.position.copy(city.dreamMachinePos);
    this.sceneManager.scene.add(this.dreamMachine);

    for (let i = 0; i < FRAGMENTS_REQUIRED; i++) {
      const id = `fragment-${i}`;
      const mesh = createFragmentMesh();
      const spawn = city.fragmentSpawnPoints[i % city.fragmentSpawnPoints.length]!;
      mesh.position.copy(spawn);
      mesh.position.y = 1;
      this.sceneManager.scene.add(mesh);
      this.physics.addSphere(id, mesh, 0.5, 0.35);
      this.fragments.set(id, { deposited: false, holderId: null });
    }

    for (const [id, player] of this.players) {
      if (id === this.config.localPlayerId) {
        this.controls.setPosition(this.spawnPoint.x, this.spawnPoint.y, this.spawnPoint.z);
      } else {
        this.createRemotePlayer(id, player.name);
      }
    }

    this.objective.initialize(this);
  }

  private createRemotePlayer(id: string, name: string): void {
    if (this.remoteMeshes.has(id)) return;
    const idx = this.remoteMeshes.size % PLAYER_COLORS.length;
    const mesh = createRemotePlayerMesh(name, PLAYER_COLORS[idx]!);
    mesh.position.copy(this.spawnPoint);
    this.sceneManager.scene.add(mesh);
    this.remoteMeshes.set(id, mesh);
  }

  private setupNetworking(): void {
    const handler = (msg: NetworkMessage, fromId: string) => {
      if (this.disposed) return;

      switch (msg.type) {
        case 'GAME_STATE':
          if (!this.config.isHost) this.applyGameState(msg);
          break;

        case 'INTERACT':
          if (this.config.isHost) this.handleInteract(msg.playerId, msg.action, msg.objectId, msg.targetId);
          break;

        case 'ABILITY':
          if (this.config.isHost) this.handleAbility(msg.playerId, msg.abilityId);
          break;

        case 'WAKE_UP':
          if (this.config.isHost && !this.voting) this.startVote();
          break;

        case 'VOTE':
          if (this.config.isHost) this.handleVote(fromId, msg.targetId);
          break;

        case 'ENTER_BACKROOMS':
          if (this.config.isHost) this.teleportToBackrooms(msg.playerId);
          break;

        case 'EXIT_BACKROOMS':
          if (this.config.isHost) this.teleportToCity(msg.playerId);
          break;

        case 'HOST_DISCONNECTED':
          this.onHostDisconnected();
          break;

        case 'VOTE_RESULT':
          this.voting = false;
          this.phase = 'playing';
          if (!msg.wasNightmare && msg.accusedId) {
            this.hud.showAnnouncement('WRONG! You lose 30 seconds.', 3000);
          } else if (msg.wasNightmare) {
            this.hud.showAnnouncement('You found the Nightmare!', 3000);
          }
          this.controls.enable();
          break;

        case 'PLAYER_INPUT':
          if (this.config.isHost) {
            const mesh = this.remoteMeshes.get(msg.playerId);
            if (mesh) {
              mesh.position.set(msg.position.x, msg.position.y, msg.position.z);
              mesh.rotation.y = msg.rotationY;
            }
          }
          break;
      }
    };

    // Store handler reference via closure in network callbacks - Game.ts will wire this
    (this as { _netHandler?: typeof handler })._netHandler = handler;
  }

  handleNetworkMessage(msg: NetworkMessage, fromId: string): void {
    const handler = (this as { _netHandler?: (msg: NetworkMessage, fromId: string) => void })._netHandler;
    handler?.(msg, fromId);
  }

  private setupInput(): void {
    // Input handled in update loop
  }

  private update(delta: number): void {
    if (this.disposed || this.paused) return;

    this.elapsed += delta;

    if (this.phase === 'intro') {
      this.introTimer -= delta;
      if (this.introTimer <= 0) this.phase = 'playing';
      return;
    }

    if (this.phase === 'ended') return;

    if (this.phase === 'vote') return;

    if (this.controls.consumeEscape()) {
      this.pause();
      return;
    }

    this.controls.update(delta, this.bounds);

    if (this.config.isHost) {
      this.physics.step(delta);
      this.runHostLogic(delta);
    } else {
      this.sendInput();
    }

    this.updateHeldObject();
    this.updateRemoteInterpolation(delta);
    this.handleLocalInput();

    if (this.inBackrooms && this.backroomsGroup) {
      updateBackroomsLights(this.backroomsGroup, this.elapsed);
    }

    this.hud.render(
      this.getRoundSnapshot(),
      this.localRole,
      this.localRole === 'nightmare',
      this.nightmareAbilities.some((a) => a.canUse(this, this.config.localPlayerId)),
    );
  }

  private runHostLogic(delta: number): void {
    this.timeRemaining -= delta;
    this.stateSyncTimer -= delta;

    if (this.config.isHost) {
      this.eventManager.update(this.createEventContext(), delta, this.timeRemaining);
    }

    if (this.objective.isComplete(this)) {
      this.endRound('dreamers');
      return;
    }

    if (this.timeRemaining <= 0) {
      this.endRound('nightmare');
      return;
    }

    if (this.stateSyncTimer <= 0) {
      this.broadcastState();
      this.stateSyncTimer = 0.05;
    }
  }

  private handleLocalInput(): void {
    if (this.controls.consumeInteract()) {
      this.tryInteract();
    }
    if (this.controls.consumeThrow()) {
      this.tryThrow();
    }
    if (this.controls.consumeAbility() && this.localRole === 'nightmare') {
      this.tryAbility();
    }
    if (this.controls.consumeWakeUp()) {
      this.config.network.send({ type: 'WAKE_UP', playerId: this.config.localPlayerId });
      if (this.config.isHost) this.startVote();
    }

  }

  private tryInteract(): void {
    if (this.backroomsDoor && !this.inBackrooms && this.isNearObject(this.backroomsDoor.position, 2.5)) {
      this.config.network.send({ type: 'ENTER_BACKROOMS', playerId: this.config.localPlayerId });
      if (this.config.isHost) this.teleportToBackrooms(this.config.localPlayerId);
      return;
    }

    if (this.inBackrooms && this.isNearPoint(this.backroomsSpawn, 2.5)) {
      this.config.network.send({ type: 'EXIT_BACKROOMS', playerId: this.config.localPlayerId });
      if (this.config.isHost) this.teleportToCity(this.config.localPlayerId);
      return;
    }

    if (this.heldObjectId) {
      this.sendInteract('drop', this.heldObjectId);
      if (this.config.isHost) this.handleInteract(this.config.localPlayerId, 'drop', this.heldObjectId);
      return;
    }

    if (this.dreamMachine && this.isNearObject(this.dreamMachine.position, 3)) {
      const held = this.getHeldFragmentId(this.config.localPlayerId);
      if (held) {
        this.sendInteract('deposit', held, 'dream-machine');
        if (this.config.isHost) this.handleInteract(this.config.localPlayerId, 'deposit', held, 'dream-machine');
      }
      return;
    }

    const nearest = this.findNearestFragment(3);
    if (nearest) {
      this.sendInteract('pickup', nearest);
      if (this.config.isHost) this.handleInteract(this.config.localPlayerId, 'pickup', nearest);
    }
  }

  private tryThrow(): void {
    if (!this.heldObjectId) return;
    this.sendInteract('throw', this.heldObjectId);
    if (this.config.isHost) {
      this.handleInteract(this.config.localPlayerId, 'throw', this.heldObjectId);
      const dir = this.controls.getForward();
      this.physics.applyThrowForce(this.heldObjectId, dir, 12);
    }
  }

  private tryAbility(): void {
    const ability = this.nightmareAbilities.find((a) => a.canUse(this, this.config.localPlayerId));
    if (!ability) return;
    this.config.network.send({ type: 'ABILITY', playerId: this.config.localPlayerId, abilityId: ability.id });
    if (this.config.isHost) this.handleAbility(this.config.localPlayerId, ability.id);
  }

  private sendInteract(action: 'pickup' | 'drop' | 'throw' | 'deposit', objectId: string, targetId?: string): void {
    this.config.network.send({
      type: 'INTERACT',
      playerId: this.config.localPlayerId,
      action,
      objectId,
      targetId,
    });
  }

  handleInteract(playerId: string, action: string, objectId?: string, _targetId?: string): void {
    if (!objectId) return;
    const frag = this.fragments.get(objectId);
    if (!frag || frag.deposited) return;

    const player = this.players.get(playerId);
    if (!player) return;

    switch (action) {
      case 'pickup':
        if (frag.holderId) return;
        frag.holderId = playerId;
        player.heldObjectId = objectId;
        this.physics.setHeld(objectId, true);
        if (playerId === this.config.localPlayerId) {
          this.heldObjectId = objectId;
          this.audio.playPickup();
        }
        break;

      case 'drop':
        if (frag.holderId !== playerId) return;
        frag.holderId = null;
        player.heldObjectId = null;
        this.physics.setHeld(objectId, false);
        if (playerId === this.config.localPlayerId) {
          this.heldObjectId = null;
          this.audio.playDrop();
        }
        break;

      case 'throw':
        if (frag.holderId !== playerId) return;
        frag.holderId = null;
        player.heldObjectId = null;
        this.physics.setHeld(objectId, false);
        if (playerId === this.config.localPlayerId) {
          this.heldObjectId = null;
        }
        break;

      case 'deposit':
        if (frag.holderId !== playerId) return;
        frag.deposited = true;
        frag.holderId = null;
        player.heldObjectId = null;
        this.depositedCount++;
        const body = this.physics.getBody(objectId);
        if (body) body.mesh.visible = false;
        this.physics.removeBody(objectId);
        if (playerId === this.config.localPlayerId) {
          this.heldObjectId = null;
          this.audio.playDeposit();
        }
        break;
    }

    if (this.config.isHost) this.broadcastState();
  }

  handleAbility(playerId: string, abilityId: string): void {
    const player = this.players.get(playerId);
    if (!player || player.role !== 'nightmare') return;

    const ability = this.nightmareAbilities.find((a) => a.id === abilityId);
    if (!ability || !ability.canUse(this, playerId)) return;

    ability.use(this, playerId);
    this.audio.playAbility();
    if (this.config.isHost) this.broadcastState();
  }

  // Called by MischiefAbility
  getAvailableFragmentId(): string | null {
    for (const [id, frag] of this.fragments) {
      if (!frag.deposited && !frag.holderId) return id;
    }
    return null;
  }

  mischiefMoveFragment(): void {
    const id = this.getAvailableFragmentId();
    if (!id) return;
    const positions = [
      { x: 25, y: 2, z: -20 },
      { x: -25, y: 2, z: 20 },
      { x: 15, y: 5, z: 15 },
      { x: -15, y: 2, z: -25 },
    ];
    const pos = positions[Math.floor(Math.random() * positions.length)]!;
    this.physics.teleport(id, pos);
    this.hud.showAnnouncement('Something moved...', 2000);
  }

  triggerEventById(id: string): void {
    const event = createAllEvents().find((e) => e.id === id);
    if (event) {
      this.eventManager.startEvent(event, this.createEventContext());
      this.audio.playEvent();
    }
  }

  private startVote(): void {
    if (this.voting || this.phase !== 'playing') return;
    this.voting = true;
    this.phase = 'vote';
    this.controls.disable();
    this.audio.playVote();

    this.hud.showVoteScreen(
      [...this.players.values()],
      this.config.localPlayerId,
      (targetId) => {
        this.config.network.send({ type: 'VOTE', playerId: this.config.localPlayerId, targetId });
        if (this.config.isHost) this.handleVote(this.config.localPlayerId, targetId);
      },
    );

    if (this.config.isHost) {
      setTimeout(() => this.finishVote(), 8000);
    }
  }

  private votes = new Map<string, string | null>();

  private handleVote(voterId: string, targetId: string | null): void {
    this.votes.set(voterId, targetId);
  }

  private finishVote(): void {
    if (!this.config.isHost) return;

    const counts = new Map<string, number>();
    for (const target of this.votes.values()) {
      if (target) counts.set(target, (counts.get(target) ?? 0) + 1);
    }

    let accused: string | null = null;
    let maxVotes = 0;
    for (const [id, count] of counts) {
      if (count > maxVotes) {
        maxVotes = count;
        accused = id;
      }
    }

    const nightmare = [...this.players.values()].find((p) => p.role === 'nightmare');
    const wasNightmare = accused !== null && accused === nightmare?.id;

    this.config.network.broadcast({
      type: 'VOTE_RESULT',
      accusedId: accused,
      wasNightmare,
    });

    if (!wasNightmare && accused) {
      this.timeRemaining = Math.max(0, this.timeRemaining - 30);
      this.hud.showAnnouncement('WRONG! You lose 30 seconds.', 3000);
      this.eventManager.triggerRandom(this.createEventContext());
    } else if (wasNightmare) {
      this.hud.showAnnouncement('You found the Nightmare!', 3000);
    }

    this.votes.clear();
    this.voting = false;
    this.phase = 'playing';
    this.controls.enable();
    this.broadcastState();
  }

  private endRound(winner: 'dreamers' | 'nightmare'): void {
    this.phase = 'ended';
    this.winner = winner;
    this.controls.disable();

    const nightmare = [...this.players.values()].find((p) => p.role === 'nightmare');

    const info: RoundEndInfo = {
      winner,
      nightmarePlayerId: nightmare?.id ?? '',
      nightmareName: nightmare?.name ?? '???',
      fragmentsCollected: this.depositedCount,
      fragmentsRequired: FRAGMENTS_REQUIRED,
    };

    if (winner === 'dreamers') this.audio.playWin();
    else this.audio.playLose();

    this.hud.showEndScreen(
      winner,
      info.nightmareName,
      info.fragmentsCollected,
      info.fragmentsRequired,
      () => this.config.onEnd(info),
      () => this.config.onLeave(),
    );

    if (this.config.isHost) {
      this.broadcastState();
    }
  }

  private broadcastState(): void {
    this.tick++;
    this.config.network.broadcast({
      type: 'GAME_STATE',
      tick: this.tick,
      players: this.buildPlayerSnapshots(),
      objects: this.buildObjectSnapshots(),
      round: this.getRoundSnapshot(),
    });
  }

  private sendInput(): void {
    const pos = this.controls.getPosition();
    this.config.network.send({
      type: 'PLAYER_INPUT',
      playerId: this.config.localPlayerId,
      position: { x: pos.x, y: pos.y, z: pos.z },
      rotationY: this.controls.getRotationY(),
      actions: {
        sprint: this.controls.isSprinting(),
        interact: false,
        throw: false,
        ability: false,
        wakeUp: false,
      },
    });
  }

  private applyGameState(msg: Extract<NetworkMessage, { type: 'GAME_STATE' }>): void {
    for (const snap of msg.players) {
      if (snap.id === this.config.localPlayerId) continue;

      if (!this.remoteMeshes.has(snap.id)) {
        const player = this.players.get(snap.id);
        if (player) this.createRemotePlayer(snap.id, player.name);
      }

      const mesh = this.remoteMeshes.get(snap.id);
      if (mesh) {
        mesh.position.set(snap.position.x, snap.position.y, snap.position.z);
        mesh.rotation.y = snap.rotationY;
        mesh.scale.setScalar(snap.scale);
      }
    }

    for (const obj of msg.objects) {
      const body = this.physics.getBody(obj.id);
      if (body && !this.fragments.get(obj.id)?.holderId) {
        body.mesh.position.set(obj.position.x, obj.position.y, obj.position.z);
        body.body.position.set(obj.position.x, obj.position.y, obj.position.z);
      }
      const frag = this.fragments.get(obj.id);
      if (frag) {
        frag.deposited = obj.deposited;
        if (obj.deposited && body) body.mesh.visible = false;
      }
    }

    this.timeRemaining = msg.round.timeRemaining;
    this.depositedCount = msg.round.fragmentsCollected;
    this.phase = msg.round.phase;
    this.inBackrooms = msg.round.inBackrooms;

    if (msg.round.phase === 'ended' && !this.winner) {
      this.winner = msg.round.winner;
      const nightmare = [...this.players.values()].find((p) => p.role === 'nightmare');
      this.hud.showEndScreen(
        msg.round.winner ?? 'nightmare',
        nightmare?.name ?? '???',
        msg.round.fragmentsCollected,
        msg.round.fragmentsRequired,
        () => this.config.onLeave(),
        () => this.config.onLeave(),
      );
    }

    if (msg.round.eventMessage) {
      // Event announcements handled by host state
    }
  }

  private buildPlayerSnapshots(): PlayerSnapshot[] {
    const snaps: PlayerSnapshot[] = [];
    for (const [id, player] of this.players) {
      let pos: { x: number; y: number; z: number };
      let rotY = 0;
      let scale = player.scale;

      if (id === this.config.localPlayerId) {
        const p = this.controls.getPosition();
        pos = { x: p.x, y: p.y, z: p.z };
        rotY = this.controls.getRotationY();
        scale = this.controls.getPlayerScale();
      } else {
        const mesh = this.remoteMeshes.get(id);
        pos = mesh
          ? { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z }
          : { x: 0, y: 1.8, z: 0 };
        rotY = mesh?.rotation.y ?? 0;
      }

      snaps.push({
        id,
        name: player.name,
        position: pos,
        rotationY: rotY,
        heldObjectId: player.heldObjectId,
        scale,
      });
    }
    return snaps;
  }

  private buildObjectSnapshots() {
    return [...this.fragments.entries()].map(([id, frag]) => {
      const body = this.physics.getBody(id);
      const pos = body
        ? { x: body.body.position.x, y: body.body.position.y, z: body.body.position.z }
        : { x: 0, y: 0, z: 0 };
      return {
        id,
        position: pos,
        rotation: { x: 0, y: 0, z: 0 },
        type: 'fragment' as const,
        deposited: frag.deposited,
      };
    });
  }

  private getRoundSnapshot(): RoundSnapshot {
    return createRoundSnapshot(
      this.timeRemaining,
      this.depositedCount,
      FRAGMENTS_REQUIRED,
      this.phase,
      {
        activeEvent: this.eventManager.getActiveEventId(),
        eventMessage: this.eventManager.getActiveAnnouncement(),
        inBackrooms: this.inBackrooms,
        backroomsDoorActive: this.backroomsDoor !== null,
        backroomsDoorPos: this.backroomsDoor
          ? { x: this.backroomsDoor.position.x, y: this.backroomsDoor.position.y, z: this.backroomsDoor.position.z }
          : null,
        winner: this.winner,
      },
    );
  }

  private createEventContext(): EventContext {
    return {
      scene: this.sceneManager.scene,
      controls: this.controls,
      remotePlayerMeshes: this.remoteMeshes,
      setGravityMultiplier: (m) => {
        this.controls.setGravityMultiplier(m);
        this.physics.setGravity(-20 * m);
      },
      setMoveSpeedMultiplier: (m) => this.controls.setMoveSpeedMultiplier(m),
      setPlayerScale: (s) => {
        this.controls.setPlayerScale(s);
        for (const p of this.players.values()) p.scale = s;
      },
      setLightsEnabled: (enabled) => {
        for (const light of this.mapLights) {
          if (light instanceof THREE.DirectionalLight || light instanceof THREE.PointLight) {
            light.intensity = enabled ? (light instanceof THREE.DirectionalLight ? 1.2 : 0.5) : 0;
          }
        }
        this.sceneManager.scene.background = new THREE.Color(enabled ? SKY_COLOR : 0x050508);
      },
      setFrictionMultiplier: (m) => {
        this.physics.world.defaultContactMaterial.friction = 0.4 * m;
      },
      teleportPlayer: (playerId, pos) => {
        if (playerId === this.config.localPlayerId) {
          this.controls.setPosition(pos.x, pos.y, pos.z);
        } else {
          const mesh = this.remoteMeshes.get(playerId);
          if (mesh) mesh.position.set(pos.x, pos.y, pos.z);
        }
      },
      localPlayerId: this.config.localPlayerId,
      isHost: this.config.isHost,
      broadcastMessage: (text) => this.hud.showAnnouncement(text),
      spawnBackroomsDoor: () => this.spawnBackroomsDoor(),
    };
  }

  spawnBackroomsDoor(): void {
    if (this.backroomsDoor) return;
    this.backroomsDoor = createBackroomsDoorMesh();
    this.backroomsDoor.position.set(10, 0, -5);
    this.sceneManager.scene.add(this.backroomsDoor);
  }

  private teleportToBackrooms(playerId: string): void {
    if (!this.backroomsGroup) {
      const backrooms = buildBackrooms(this.config.seed);
      this.backroomsGroup = backrooms.group;
      this.backroomsSpawn = backrooms.exitPoint.clone();
      this.sceneManager.scene.add(backrooms.group);
      if (this.cityGroup) this.cityGroup.visible = false;
      this.sceneManager.scene.background = new THREE.Color(getBackroomsFogColor());
      this.sceneManager.scene.fog = new THREE.Fog(getBackroomsFogColor(), 5, 25);
    }

    const pos = { x: 0, y: 1.8, z: 0 };
    if (playerId === this.config.localPlayerId) {
      this.inBackrooms = true;
      this.controls.setPosition(pos.x, pos.y, pos.z);
      this.bounds = { min: new THREE.Vector3(-18, 0, -18), max: new THREE.Vector3(18, 5, 18) };
    } else {
      const mesh = this.remoteMeshes.get(playerId);
      mesh?.position.set(pos.x, pos.y, pos.z);
    }
  }

  private teleportToCity(playerId: string): void {
    const pos = { x: this.citySpawn.x, y: this.citySpawn.y, z: this.citySpawn.z };
    if (playerId === this.config.localPlayerId) {
      this.inBackrooms = false;
      this.controls.setPosition(pos.x, pos.y, pos.z);
      if (this.cityGroup) this.cityGroup.visible = true;
      if (this.backroomsGroup) this.backroomsGroup.visible = false;
      this.sceneManager.scene.background = new THREE.Color(SKY_COLOR);
      this.sceneManager.scene.fog = new THREE.Fog(SKY_COLOR, 20, 55);
      this.bounds = { min: new THREE.Vector3(-38, 0, -38), max: new THREE.Vector3(38, 20, 38) };
    } else {
      const mesh = this.remoteMeshes.get(playerId);
      mesh?.position.set(pos.x, pos.y, pos.z);
    }
  }

  private updateHeldObject(): void {
    if (!this.heldObjectId) return;
    const body = this.physics.getBody(this.heldObjectId);
    if (!body) return;

    const forward = this.controls.getForward();
    const pos = this.controls.getPosition();
    const holdPos = pos.clone().add(forward.multiplyScalar(1.2));
    holdPos.y -= 0.3;

    body.mesh.position.copy(holdPos);
    body.body.position.set(holdPos.x, holdPos.y, holdPos.z);
  }

  private updateRemoteInterpolation(_delta: number): void {
    // Positions updated via network state
  }

  private findNearestFragment(range: number): string | null {
    const pos = this.controls.getPosition();
    let nearest: string | null = null;
    let nearestDist = range;

    for (const [id, frag] of this.fragments) {
      if (frag.deposited || frag.holderId) continue;
      const body = this.physics.getBody(id);
      if (!body) continue;
      const dist = pos.distanceTo(body.mesh.position);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = id;
      }
    }
    return nearest;
  }

  private getHeldFragmentId(playerId: string): string | null {
    for (const [id, frag] of this.fragments) {
      if (frag.holderId === playerId) return id;
    }
    return null;
  }

  private isNearObject(objPos: THREE.Vector3, range: number): boolean {
    return this.controls.getPosition().distanceTo(objPos) < range;
  }

  private isNearPoint(point: THREE.Vector3, range: number): boolean {
    return this.controls.getPosition().distanceTo(point) < range;
  }

  // ObjectiveContext
  getFragmentCount(): number {
    return [...this.fragments.values()].filter((f) => !f.deposited).length;
  }

  getDepositedCount(): number {
    return this.depositedCount;
  }

  getRequiredCount(): number {
    return FRAGMENTS_REQUIRED;
  }

  pause(): void {
    this.paused = true;
    this.controls.disable();
    this.hud.showPauseMenu(
      () => this.resume(),
      () => this.config.onLeave(),
    );
  }

  resume(): void {
    this.paused = false;
    this.hud.hidePauseMenu();
    this.controls.enable();
  }

  isPaused(): boolean {
    return this.paused;
  }

  private onHostDisconnected(): void {
    this.controls.disable();
    this.hud.showCollapsed(() => this.config.onHostDisconnected());
  }

  dispose(): void {
    this.disposed = true;
    this.controls.disable();
    this.sceneManager.dispose();
    this.hud.dispose();
  }
}

export function assignRoles(players: SessionPlayer[], seed: number): void {
  if (players.length === 0) return;
  let s = seed;
  const rng = () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
  const idx = Math.floor(rng() * players.length);
  players.forEach((p, i) => {
    p.role = i === idx ? 'nightmare' : 'dreamer';
  });
}

export function generateSeed(): number {
  return Math.floor(Math.random() * 2147483646) + 1;
}
