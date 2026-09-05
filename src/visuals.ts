import * as T from "three";
import { WORLDS, seeded } from "./model";
export type Kind =
  | "rock"
  | "debris"
  | "ice"
  | "mine"
  | "barrier"
  | "drone"
  | "fighter"
  | "turret"
  | "ring"
  | "score"
  | "shield"
  | "repair"
  | "rapid"
  | "spread"
  | "boss"
  | "reactor";
export interface Entity {
  mesh: T.Group;
  kind: Kind;
  active: boolean;
  x: number;
  y: number;
  z: number;
  baseX: number;
  baseY: number;
  radius: number;
  hp: number;
  age: number;
  shot: number;
  extra: number;
}
const geo = {
  rock: new T.IcosahedronGeometry(1, 1),
  crystal: new T.OctahedronGeometry(1),
  box: new T.BoxGeometry(1, 1, 1),
  sphere: new T.SphereGeometry(1, 24, 16),
  ring: new T.TorusGeometry(3.6, 0.12, 8, 64),
  cylinder: new T.CylinderGeometry(1, 1, 1, 12),
  cone: new T.ConeGeometry(1, 1, 4),
  planetRing: new T.RingGeometry(165, 240, 96),
};
const materials = new Map<string, T.Material>();
function mat(color: number, emissive = false) {
  const key = color + ":" + emissive;
  if (!materials.has(key))
    materials.set(
      key,
      emissive
        ? new T.MeshBasicMaterial({ color })
        : new T.MeshStandardMaterial({
            color,
            roughness: 0.55,
            metalness: 0.45,
          }),
    );
  return materials.get(key)!;
}
function planetMat(color: number, ring = false) {
  const key = "planet:" + color + ":" + ring;
  if (!materials.has(key))
    materials.set(
      key,
      new T.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: ring ? 0.22 : 0.055,
        side: ring ? T.DoubleSide : T.BackSide,
      }),
    );
  return materials.get(key)!;
}
function part(
  g: T.Group,
  geometry: T.BufferGeometry,
  color: number,
  x = 0,
  y = 0,
  z = 0,
  sx = 1,
  sy = sx,
  sz = sx,
  glow = false,
) {
  const m = new T.Mesh(geometry, mat(color, glow));
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  g.add(m);
  return m;
}
export function ship(enemy = false) {
  const g = new T.Group();
  const c = enemy ? 0x97334d : 0xabc9da;
  const accent = enemy ? 0xff597e : 0x63ecff;
  part(g, geo.crystal, c, 0, 0, 0, 0.7, 0.36, 2.2);
  part(g, geo.crystal, 0x122b48, 0, 0.3, -0.5, 0.32, 0.28, 0.9);
  for (const s of [-1, 1]) {
    const wing = part(g, geo.crystal, c, s * 0.98, -0.1, 0.65, 1.1, 0.12, 1.1);
    wing.rotation.y = s * -0.38;
    part(g, geo.box, 0x23374e, s * 0.85, 0, 0.8, 0.35, 0.35, 1.2);
    part(
      g,
      geo.cylinder,
      accent,
      s * 0.85,
      0,
      1.46,
      0.15,
      0.06,
      0.15,
      true,
    ).rotation.x = Math.PI / 2;
    part(
      g,
      geo.cone,
      accent,
      s * 0.85,
      0,
      2.05,
      0.14,
      1.1,
      0.14,
      true,
    ).rotation.x = Math.PI / 2;
    part(g, geo.box, accent, s * 1.62, -0.08, 0.7, 0.05, 0.08, 0.7, true);
  }
  return g;
}
function entityMesh(kind: Kind) {
  const g = new T.Group();
  switch (kind) {
    case "rock":
      part(g, geo.rock, 0x667783);
      break;
    case "ice":
      part(g, geo.crystal, 0x8ad3ec);
      part(g, geo.crystal, 0xd8faff, 0, 0, 0, 0.5, 1.15, 0.55);
      break;
    case "debris":
      part(g, geo.box, 0x515562, 0, 0, 0, 1, 0.5, 1.3);
      part(g, geo.box, 0xf59b54, 0, 0.52, 0, 0.8, 0.035, 0.08, true);
      break;
    case "mine":
      part(g, geo.crystal, 0xe04a62, 0, 0, 0, 0.7);
      for (let i = 0; i < 3; i++) {
        const m = part(g, geo.box, 0xff6982, 0, 0, 0, 0.12, 0.12, 2, true);
        m.rotation.set(i === 0 ? Math.PI / 2 : 0, i === 1 ? Math.PI / 2 : 0, 0);
      }
      break;
    case "barrier":
      part(g, geo.box, 0xf75a75, 0, 0, 0, 5, 0.23, 0.3, true);
      for (const s of [-1, 1])
        part(g, geo.box, 0x657182, s * 2.6, 0, 0, 0.4, 1, 0.7);
      break;
    case "drone":
    case "fighter":
    case "turret":
      g.add(ship(true));
      if (kind === "turret") part(g, geo.box, 0x4f596b, 0, -0.5, 0, 2, 0.7, 2);
      break;
    case "ring":
      part(g, geo.ring, 0xd6ff71, 0, 0, 0, 1, 1, 1, true);
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        const m = part(
          g,
          geo.box,
          0x82aaaa,
          Math.cos(a) * 3.6,
          Math.sin(a) * 3.6,
          0,
          0.35,
          0.65,
          0.38,
        );
        m.rotation.z = a;
      }
      break;
    case "boss":
      g.add(ship(true));
      part(g, geo.box, 0x6f4459, 0, 0, 0, 3, 1, 2);
      for (const s of [-1, 1])
        part(g, geo.box, 0xff687b, s * 1.3, 0.5, 0, 0.2, 0.15, 1.5, true);
      break;
    case "reactor":
      part(g, geo.crystal, 0xc3a4ff, 0, 0, 0, 1.3, 2, 1.3, true);
      for (let i = 0; i < 3; i++) {
        const r = part(g, geo.ring, 0x64578d, 0, 0, 0, 0.7);
        r.rotation.set(i, 0.6 * i, 0);
      }
      break;
    default: {
      const colors: Record<string, number> = {
        score: 0xffd778,
        shield: 0x60e5ff,
        repair: 0x79ffa5,
        rapid: 0xffa369,
        spread: 0xd19bff,
      };
      part(g, geo.crystal, colors[kind], 0, 0, 0, 0.65, 0.9, 0.65, true);
      part(g, geo.ring, colors[kind], 0, 0, 0, 0.3, 0.3, 0.3, true);
    }
  }
  return g;
}
export class Visuals {
  scene = new T.Scene();
  camera = new T.PerspectiveCamera(62, 1, 0.1, 1800);
  renderer: T.WebGLRenderer;
  player = ship();
  entities: Entity[] = [];
  scenery = new T.Group();
  world = 0;
  stars: T.Points;
  planet = new T.Group();
  time = 0;
  shake = 0;
  private dummy = new T.Object3D();
  private particleMesh: T.InstancedMesh;
  private particles: {
    p: T.Vector3;
    v: T.Vector3;
    life: number;
    color: T.Color;
  }[] = [];
  private particleCursor = 0;
  private backdrop: T.Group[] = [];
  private aim = new T.Vector3();
  progress = 0;
  constructor(container: HTMLElement) {
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    container.appendChild(this.renderer.domElement);
    this.scene.add(new T.HemisphereLight(0xaccfff, 0x152038, 3));
    const key = new T.DirectionalLight(0xe7f6ff, 3.5);
    key.position.set(-20, 35, 15);
    this.scene.add(key);
    const rim = new T.DirectionalLight(0x4086ff, 2);
    rim.position.set(20, 0, -30);
    this.scene.add(rim);
    this.scene.add(this.player, this.scenery, this.planet);
    const rng = seeded(12),
      positions = new Float32Array(2400 * 3);
    for (let i = 0; i < 2400; i++) {
      positions[i * 3] = (rng() - 0.5) * 1800;
      positions[i * 3 + 1] = (rng() - 0.5) * 1000;
      positions[i * 3 + 2] = -rng() * 1400;
    }
    const bg = new T.BufferGeometry();
    bg.setAttribute("position", new T.BufferAttribute(positions, 3));
    this.stars = new T.Points(
      bg,
      new T.PointsMaterial({
        color: 0xbcd6ff,
        size: 1.5,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true,
      }),
    );
    this.scene.add(this.stars);
    const cloudCanvas = document.createElement("canvas");
    cloudCanvas.width = cloudCanvas.height = 128;
    const ctx = cloudCanvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(110,170,255,.45)");
    gradient.addColorStop(0.35, "rgba(80,100,220,.18)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    const cloudTexture = new T.CanvasTexture(cloudCanvas);
    for (let i = 0; i < 6; i++) {
      const cloud = new T.Sprite(
        new T.SpriteMaterial({
          map: cloudTexture,
          color: i % 2 ? 0x7868c9 : 0x376e92,
          transparent: true,
          opacity: 0.48,
          depthWrite: false,
          blending: T.AdditiveBlending,
        }),
      );
      cloud.position.set(-500 + i * 170, 150 + Math.sin(i) * 130, -1000);
      cloud.scale.set(600, 380, 1);
      this.scene.add(cloud);
    }

    this.particleMesh = new T.InstancedMesh(
      geo.box,
      new T.MeshBasicMaterial({ color: 0xffffff }),
      400,
    );
    this.particleMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    this.particleMesh.frustumCulled = false;
    this.scene.add(this.particleMesh);
    for (let i = 0; i < 400; i++)
      this.particles.push({
        p: new T.Vector3(),
        v: new T.Vector3(),
        life: 0,
        color: new T.Color(),
      });
    this.setWorld(0);
    window.addEventListener("resize", () => this.resize());
    this.resize();
  }
  resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
  }
  setWorld(index: number) {
    this.world = index;
    this.clear();
    const w = WORLDS[index];
    this.scene.background = new T.Color(w.sky);
    this.scene.fog = new T.FogExp2(w.sky, 0.0017);
    this.scenery.clear();
    this.planet.clear();
    this.backdrop = [];
    const planet = part(this.planet, geo.sphere, w.planet, 0, 0, 0, 130);
    planet.rotation.z = 0.3;
    const halo = new T.Mesh(geo.sphere, planetMat(w.color));
    halo.scale.setScalar(134);
    this.planet.add(halo);
    this.planet.position.set(210, 95, -650);
    if (index === 2 || index === 0) {
      const ring = new T.Mesh(geo.planetRing, planetMat(w.color, true));
      ring.rotation.set(1.2, 0.2, 0.1);
      this.planet.add(ring);
    }
    const rng = seeded(index + 80);
    for (let i = 0; i < 70; i++) {
      const g = new T.Group();
      const side = rng() > 0.5 ? 1 : -1;
      g.position.set(
        side * (45 + rng() * 150),
        (rng() - 0.5) * 140,
        -rng() * 1100,
      );
      if (index === 1) {
        part(
          g,
          geo.box,
          0x38414e,
          0,
          0,
          0,
          10 + rng() * 16,
          8 + rng() * 10,
          45 + rng() * 75,
        );
        for (let j = 0; j < 4; j++)
          part(
            g,
            geo.box,
            0xdf8750,
            side * 13,
            0,
            j * 13 - 20,
            0.2,
            0.5,
            4,
            true,
          );
      } else if (index >= 3) {
        part(g, geo.box, index === 4 ? 0x343855 : 0x4c354b, 0, 0, 0, 8, 30, 45);
        part(g, geo.box, w.color, side * -4.1, 0, 0, 0.1, 25, 0.5, true);
      } else {
        part(
          g,
          index === 2 ? geo.crystal : geo.rock,
          index === 2 ? 0x5287a7 : 0x344655,
          0,
          0,
          0,
          6 + rng() * 15,
          8 + rng() * 18,
          8 + rng() * 15,
        );
      }
      g.rotation.set(rng(), rng(), rng());
      this.scenery.add(g);
      this.backdrop.push(g);
    }
    if (index === 4 || index === 1) {
      for (let i = 0; i < 18; i++) {
        const g = new T.Group();
        g.position.z = -i * 65;
        g.userData.tunnel = true;
        const color = index === 4 ? 0x403d60 : 0x554858;
        for (const s of [-1, 1]) {
          part(g, geo.box, color, s * 20, 0, 0, 2, 30, 3);
          part(g, geo.box, color, 0, s * 15, 0, 42, 2, 3);
          part(g, geo.box, w.color, s * 18.8, 0, 0, 0.14, 25, 0.2, true);
        }
        this.scenery.add(g);
        this.backdrop.push(g);
      }
    }
  }
  spawn(kind: Kind, x: number, y: number, z: number, size = 1): Entity {
    let e = this.entities.find((e) => !e.active && e.kind === kind);
    if (!e) {
      e = {
        mesh: entityMesh(kind),
        kind,
        active: false,
        x: 0,
        y: 0,
        z: 0,
        baseX: 0,
        baseY: 0,
        radius: 1,
        hp: 1,
        age: 0,
        shot: 0,
        extra: 0,
      };
      this.entities.push(e);
      this.scene.add(e.mesh);
    }
    Object.assign(e, {
      active: true,
      x,
      y,
      z,
      baseX: x,
      baseY: y,
      radius: size,
      hp:
        kind === "boss"
          ? 95
          : kind === "reactor"
            ? 65
            : kind === "turret"
              ? 5
              : kind === "fighter"
                ? 3
                : 2,
      age: 0,
      shot: 1.8,
      extra: 0,
    });
    e.mesh.visible = true;
    e.mesh.position.set(x, y, z);
    e.mesh.scale.setScalar(size);
    e.mesh.rotation.set(0, 0, 0);
    return e;
  }
  release(e: Entity) {
    e.active = false;
    e.mesh.visible = false;
  }
  clear() {
    for (const e of this.entities) this.release(e);
    for (const p of this.particles) p.life = 0;
  }
  burst(x: number, y: number, z: number, color: number, count = 22) {
    for (let i = 0; i < count; i++) {
      const p = this.particles[this.particleCursor++ % 400];
      p.p.set(x, y, z);
      p.v.set(
        (Math.random() - 0.5) * 17,
        (Math.random() - 0.5) * 17,
        (Math.random() - 0.5) * 17,
      );
      p.life = 0.4 + Math.random() * 0.6;
      p.color.set(color);
    }
  }
  update(
    dt: number,
    speed: number,
    x: number,
    y: number,
    bank: number,
    boost: boolean,
    menu = false,
  ) {
    this.time += dt;
    this.player.visible = true;
    this.player.position.set(x, y, 0);
    this.player.scale.setScalar(menu ? 1.55 : 1);
    this.player.rotation.z = T.MathUtils.damp(
      this.player.rotation.z,
      -bank * 0.4,
      9,
      dt,
    );
    this.player.rotation.x = T.MathUtils.damp(
      this.player.rotation.x,
      y * 0.016,
      5,
      dt,
    );
    this.player.children.forEach((m, i) => {
      if (i === 5 || i === 10)
        m.scale.y = (boost ? 3 : 1.1) * (0.9 + Math.sin(this.time * 45) * 0.1);
    });
    for (const g of this.backdrop) {
      if (g.userData.tunnel)
        g.visible = this.world !== 4 || this.progress > 0.32;
      g.position.z += speed * dt * 0.7;
      if (g.position.z > 70) g.position.z -= 1150;
    }
    this.stars.rotation.z = Math.sin(this.time * 0.015) * 0.025;
    const camX = menu ? 11 : x * 0.56;
    const camY = menu ? 7 : 4 + y * 0.48;
    this.camera.position.x = T.MathUtils.damp(
      this.camera.position.x,
      camX,
      3,
      dt,
    );
    this.camera.position.y = T.MathUtils.damp(
      this.camera.position.y,
      camY,
      3,
      dt,
    );
    this.camera.position.z = T.MathUtils.damp(
      this.camera.position.z,
      menu ? 20 : boost ? 20 : 17,
      4,
      dt,
    );
    this.shake = Math.max(0, this.shake - dt * 2);
    this.camera.position.x += Math.sin(this.time * 100) * this.shake * 0.13;
    this.camera.position.y += Math.cos(this.time * 87) * this.shake * 0.1;
    this.aim.set(menu ? -5 : x * 0.65, menu ? 0 : y * 0.55, -35);
    this.camera.lookAt(this.aim);
    this.camera.fov = T.MathUtils.damp(this.camera.fov, boost ? 75 : 62, 3, dt);
    this.camera.updateProjectionMatrix();
    for (let i = 0; i < 400; i++) {
      const p = this.particles[i];
      p.life = p.p.z > 10 ? 0 : Math.max(0, p.life - dt);
      if (p.life > 0) {
        p.p.addScaledVector(p.v, dt);
        p.p.z += speed * dt * 0.45;
        this.dummy.position.copy(p.p);
        this.dummy.scale.setScalar(p.life * 0.12);
      } else this.dummy.scale.setScalar(0);
      this.dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, this.dummy.matrix);
      this.particleMesh.setColorAt(i, p.color);
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    if (this.particleMesh.instanceColor)
      this.particleMesh.instanceColor.needsUpdate = true;
    if (boost && Math.random() < 0.7)
      this.burst(
        x + (Math.random() - 0.5) * 40,
        y + (Math.random() - 0.5) * 20,
        -70,
        0x88eaff,
        2,
      );
  }
  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
