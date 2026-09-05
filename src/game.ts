import * as T from "three";
import { RunState, WORLDS, seeded, sweptHit, crossesPlane } from "./model";
import { Visuals, type Entity, type Kind } from "./visuals";
import { AudioSystem } from "./audio";
export type Mode = "menu" | "playing" | "paused" | "won" | "dead";
interface Bolt {
  mesh: T.Mesh;
  active: boolean;
  enemy: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
}
export class Game {
  v: Visuals;
  audio = new AudioSystem();
  state = new RunState();
  mode: Mode = "menu";
  world = 0;
  distance = 0;
  speed = 0;
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  boost = 0;
  power = "LASER CANNON";
  powerTime = 0;
  invulnerable = 0;
  boss: Entity | null = null;
  bossSpawned = false;
  keys = new Set<string>();
  mouse = false;
  onChange = () => {};
  onToast = (text: string) => {};
  bolts: Bolt[] = [];
  private rng = seeded(1);
  private nextSpawn = 0;
  private wave = 0;
  private fireTimer = 0;
  private last = 0;
  private accumulator = 0;
  private finale = false;
  private cleanTime = 0;
  private engineTrail = 0;
  private escapePulse = 0;
  constructor(el: HTMLElement) {
    this.v = new Visuals(el);
    const g = new T.BoxGeometry(0.09, 0.09, 2.8);
    for (let i = 0; i < 180; i++) {
      const mesh = new T.Mesh(
        g,
        new T.MeshBasicMaterial({ color: i < 120 ? 0x7cffff : 0xff496f }),
      );
      mesh.visible = false;
      this.v.scene.add(mesh);
      this.bolts.push({
        mesh,
        active: false,
        enemy: i >= 120,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
      });
    }
    window.addEventListener("keydown", (e) => {
      if (
        this.mode === "playing" &&
        ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
          e.code,
        )
      )
        e.preventDefault();
      if (e.code === "Escape" || e.code === "KeyP") {
        if (!e.repeat) this.pause();
        return;
      }
      this.keys.add(e.code);
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    this.v.renderer.domElement.addEventListener("pointerdown", () => {
      this.mouse = true;
      this.audio.start();
    });
    window.addEventListener("pointerup", () => (this.mouse = false));
    window.addEventListener("blur", () => {
      this.keys.clear();
      this.mouse = false;
      if (this.mode === "playing") this.pause();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.mode === "playing") this.pause();
    });
    requestAnimationFrame((t) => this.frame(t));
  }
  start(index: number) {
    this.world = index;
    this.v.setWorld(index);
    this.state = new RunState(index);
    this.distance = 0;
    this.x = this.y = this.vx = this.vy = 0;
    this.boost = 0;
    this.power = "LASER CANNON";
    this.powerTime = 0;
    this.invulnerable = 1;
    this.boss = null;
    this.bossSpawned = false;
    this.nextSpawn = 20;
    this.wave = 0;
    this.fireTimer = 0;
    this.finale = false;
    this.cleanTime = 0;
    this.escapePulse = 0;
    this.rng = seeded(100 + index);
    this.keys.clear();
    this.mouse = false;
    this.bolts.forEach((b) => {
      b.active = false;
      b.mesh.visible = false;
    });
    this.mode = "playing";
    this.audio.start();
    this.audio.play("ui");
    this.onChange();
    this.onToast("FLIGHT ONLINE · WASD TO STEER · SPACE TO FIRE");
  }
  menu(index = 0) {
    this.mode = "menu";
    this.world = index;
    this.v.setWorld(index);
    this.bolts.forEach((b) => {
      b.active = false;
      b.mesh.visible = false;
    });
    this.audio.engine(0, false);
    this.onChange();
  }
  pause() {
    if (this.mode !== "playing" && this.mode !== "paused") return;
    if (this.mode === "playing") {
      this.mode = "paused";
      this.keys.clear();
      this.mouse = false;
      this.audio.engine(0, false);
    } else if (this.mode === "paused") {
      this.mode = "playing";
      this.audio.start();
    }
    this.onChange();
  }
  private bolt(
    enemy: boolean,
    x: number,
    y: number,
    z: number,
    vx = 0,
    vy = 0,
  ) {
    const b = this.bolts.find((b) => !b.active && b.enemy === enemy);
    if (!b) return;
    b.active = true;
    Object.assign(b, { x, y, z, vx, vy });
    b.mesh.visible = true;
    b.mesh.position.set(x, y, z);
  }
  private award(base: number, label?: string) {
    const old = this.state.multiplier;
    const n = this.state.addScore(base);
    if (label) this.onToast(`${label} +${n.toLocaleString()}`);
    else if (old !== this.state.multiplier)
      this.onToast(`CHAIN UP · ×${this.state.multiplier} MULTIPLIER`);
  }
  private hit(n: number) {
    if (this.invulnerable > 0) return;
    this.state.damage(n);
    this.invulnerable = 1;
    this.cleanTime = 0;
    this.v.shake = 0.8;
    this.v.burst(
      this.x,
      this.y,
      0,
      this.state.shield > 0 ? 0x7ceaff : 0xff7777,
      28,
    );
    this.audio.play("hit");
    if (this.state.hull <= 0) this.end(false);
  }
  private end(win: boolean) {
    if (this.mode !== "playing") return;
    if (win) {
      this.state.score += Math.round(
        2500 +
          this.state.hull * 15 +
          Math.max(0, 105 - this.state.elapsed) * 80,
      );
      this.mode = "won";
      this.audio.play("win");
    } else {
      this.mode = "dead";
      this.v.burst(this.x, this.y, 0, 0xff9747, 110);
      this.audio.play("death");
      this.v.shake = 1.5;
    }
    this.audio.engine(0, false);
    this.onChange();
  }
  private spawnWave() {
    const i = this.wave++,
      w = this.world;
    const x = (this.rng() - 0.5) * 21,
      y = (this.rng() - 0.5) * 12;
    const kind: Kind = w === 2 ? "ice" : w === 1 || w === 4 ? "debris" : "rock";
    const end = this.distance / WORLDS[w].length > 0.78;
    for (let j = 0; j < (end ? 4 : 2) + Math.floor(w / 2); j++) {
      const ox = (this.rng() - 0.5) * 27,
        oy = (this.rng() - 0.5) * 15;
      this.v.spawn(kind, ox, oy, -255 - j * 18, 1.2 + this.rng() * 1.6);
    }
    if (i % 3 === 0 || (w === 2 && i % 2 === 0)) {
      const rx = Math.sin(i * 0.8) * 8,
        ry = Math.cos(i * 0.5) * 4;
      const r = this.v.spawn("ring", rx, ry, -245, 1);
      r.extra = i % 6 === 0 ? 1 : 0;
      if (r.extra) {
        r.radius = 0.7;
        r.mesh.scale.setScalar(0.7);
      }
      for (let j = 1; j <= 3; j++)
        this.v.spawn("score", rx, ry, -245 - j * 10, 0.8);
      if (w === 2) this.v.spawn("ring", rx + 2, ry, -305, 1);
    }
    if (i % 2 === 0) {
      for (let j = 0; j < (w >= 3 ? 3 : 1 + (i % 4 === 0 ? 1 : 0)); j++)
        this.v.spawn(
          w === 1 ? "turret" : w >= 3 ? "fighter" : "drone",
          Math.max(-11, Math.min(11, x + j * 3)),
          y,
          -230 - j * 13,
          w === 1 ? 1.1 : 0.85,
        );
    }
    if (i % 5 === 2) {
      const p: Kind[] = ["shield", "rapid", "spread", "repair"];
      this.v.spawn(
        p[Math.floor(i / 5) % 4],
        Math.sin(i) * 6,
        Math.cos(i) * 3,
        -235,
        1,
      );
    }
    if (w >= 3 && i % 3 === 1) {
      this.v.spawn("barrier", Math.sin(i) * 8, Math.cos(i * 0.7) * 4, -245, 1);
      this.v.spawn("mine", -x, -y, -260, 1);
    }
    if (w === 4 && i % 4 === 0) {
      for (const s of [-1, 1])
        this.v.spawn("barrier", s * 8, Math.sin(i) * 3, -270, 1.4);
    }
  }
  update(dt: number) {
    if (this.mode !== "playing") return;
    const w = WORLDS[this.world];
    this.state.tick(dt);
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.boost = Math.max(0, this.boost - dt);
    this.powerTime = Math.max(0, this.powerTime - dt);
    if (!this.powerTime) this.power = "LASER CANNON";
    const ax =
      Number(this.keys.has("KeyD") || this.keys.has("ArrowRight")) -
      Number(this.keys.has("KeyA") || this.keys.has("ArrowLeft"));
    const ay =
      Number(this.keys.has("KeyW") || this.keys.has("ArrowUp")) -
      Number(this.keys.has("KeyS") || this.keys.has("ArrowDown"));
    this.vx = T.MathUtils.damp(this.vx, ax * 20, 12, dt);
    this.vy = T.MathUtils.damp(this.vy, ay * 15, 12, dt);
    this.x = T.MathUtils.clamp(this.x + this.vx * dt, -14, 14);
    this.y = T.MathUtils.clamp(this.y + this.vy * dt, -8, 8);
    this.speed =
      w.speed *
      (this.boost > 0 ? 1.65 : 1) *
      (1 + Math.min(1, this.distance / w.length) * 0.12);
    this.distance += this.speed * dt;
    if (this.boss?.active)
      this.distance = Math.min(
        this.distance,
        w.length - (this.world === 4 ? 900 : 80),
      );
    this.cleanTime += dt;
    if (this.cleanTime > 12) {
      if (!this.boss?.active) this.award(150);
      this.state.shield = Math.min(80, this.state.shield + 8);
      this.cleanTime = 0;
    }
    if (this.distance > this.nextSpawn && this.distance < w.length - 280) {
      this.spawnWave();
      this.nextSpawn += this.world === 2 ? 155 : 175 - this.world * 8;
    }
    if (this.distance / w.length > 0.73 && !this.finale) {
      this.finale = true;
      this.onToast(`FINAL SEQUENCE · ${w.finale}`);
      if (this.world < 3) {
        this.boost = 5;
        if (this.world === 0) {
          const a = this.v.spawn("rock", 0, 0, -150, 7);
          a.extra = 99;
        } else if (this.world === 1) {
          for (const side of [-1, 1]) {
            const a = this.v.spawn("debris", side * 8, 6, -180, 3);
            a.extra = 99;
          }
        }
      } else {
        this.boss = this.v.spawn(
          this.world === 3 ? "boss" : "reactor",
          0,
          0,
          -130,
          this.world === 3 ? 3 : 2,
        );
        this.bossSpawned = true;
      }
    }
    this.fireTimer -= dt;
    if ((this.keys.has("Space") || this.mouse) && this.fireTimer <= 0) {
      this.fireTimer = this.power === "RAPID FIRE" ? 0.09 : 0.18;
      this.audio.play("laser");
      const spread = this.power === "SPREAD SHOT" ? [-0.2, 0, 0.2] : [0];
      for (const a of spread) {
        this.bolt(false, this.x - 0.5, this.y, -2, a * 65, 0);
        this.bolt(false, this.x + 0.5, this.y, -2, a * 65, 0);
        this.state.shots += 2;
      }
    }
    for (const e of this.v.entities) {
      if (!e.active) continue;
      e.age += dt;
      const oldZ = e.z;
      const enemy = ["drone", "fighter", "turret", "boss", "reactor"].includes(
        e.kind,
      );
      if (e.kind === "boss" || e.kind === "reactor") {
        e.z = T.MathUtils.damp(e.z, -75, 1.2, dt);
        e.x = Math.sin(e.age * 0.55) * 6;
        e.y = Math.sin(e.age * 0.8) * 3;
      } else {
        e.z += this.speed * dt;
        if (enemy && e.kind !== "turret") {
          e.x = e.baseX + Math.sin(e.age * (e.kind === "fighter" ? 2 : 1)) * 2;
          e.y = e.baseY + Math.sin(e.age) * 0.7;
        } else if (e.kind === "barrier") {
          e.y = e.baseY + Math.sin(e.age * 1.3) * 1.7;
        }
      }
      if (enemy && e.z > -210 && e.z < -12) {
        e.shot -= dt;
        if (e.shot < 0) {
          e.shot = e.kind === "boss" ? 0.8 : 2.7 - this.world * 0.2;
          const travel = Math.abs(e.z) / (this.speed + 34);
          this.bolt(
            true,
            e.x,
            e.y,
            e.z,
            (this.x - e.x) / travel,
            (this.y - e.y) / travel,
          );
          if (e.kind === "boss" || e.kind === "reactor") {
            this.bolt(
              true,
              e.x - 4,
              e.y,
              e.z,
              (this.x - e.x + 3) / travel,
              (this.y - e.y) / travel,
            );
            this.bolt(
              true,
              e.x + 4,
              e.y,
              e.z,
              (this.x - e.x - 3) / travel,
              (this.y - e.y) / travel,
            );
          }
        }
      }
      if (e.extra === 99 && e.z > -65) {
        this.v.burst(e.x, e.y, e.z, this.world === 0 ? 0xffb67b : 0xff966a, 80);
        this.audio.play("explosion");
        this.v.shake = 0.6;
        this.v.release(e);
        continue;
      }
      e.mesh.position.set(e.x, e.y, e.z);
      if (!enemy) e.mesh.rotation.z += dt * (e.kind === "ring" ? 0.18 : 0.5);
      if (["rock", "ice", "debris", "mine"].includes(e.kind))
        e.mesh.rotation.y += dt * 0.24;
      const crossed = crossesPlane(oldZ, e.z);
      if (e.kind === "ring") {
        if (crossed) {
          const d = Math.hypot(e.x - this.x, e.y - this.y);
          if (d < 3.25 * e.radius) {
            this.boost = 3.4;
            this.state.rings++;
            this.award(
              e.extra ? 450 : 300,
              e.extra ? "PRECISION GATE" : "BOOST GATE",
            );
            this.audio.play("boost");
            this.v.burst(e.x, e.y, 0, 0xd6ff71, 24);
          }
          this.v.release(e);
        }
      } else if (
        ["score", "shield", "repair", "rapid", "spread"].includes(e.kind)
      ) {
        if (sweptHit(this.x, this.y, oldZ, e.z, e.x, e.y, 0, 2)) {
          this.state.pickups++;
          if (e.kind === "shield")
            this.state.shield = Math.min(80, this.state.shield + 35);
          if (e.kind === "repair")
            this.state.hull = Math.min(100, this.state.hull + 30);
          if (e.kind === "rapid" || e.kind === "spread") {
            this.power = e.kind === "rapid" ? "RAPID FIRE" : "SPREAD SHOT";
            this.powerTime = 12;
          }
          this.award(
            e.kind === "score" ? 100 : 150,
            e.kind === "score" ? undefined : e.kind.toUpperCase(),
          );
          this.audio.play("pickup");
          this.v.burst(e.x, e.y, 0, 0x9dffff, 12);
          this.v.release(e);
        }
      } else if (e.kind !== "boss" && e.kind !== "reactor") {
        const radius = e.kind === "barrier" ? 0 : e.radius * 0.8 + 0.55;
        const collision =
          e.kind === "barrier"
            ? Math.abs(this.x - e.x) < 2.5 * e.radius + 0.5 &&
              Math.abs(this.y - e.y) < 0.35 * e.radius + 0.5 &&
              oldZ < 1 &&
              e.z >= -1
            : sweptHit(this.x, this.y, oldZ, e.z, e.x, e.y, 0, radius);
        if (collision) {
          this.hit(e.kind === "mine" ? 40 : enemy ? 22 : 30);
          this.v.release(e);
          if (this.mode !== "playing") return;
        } else if (
          crossed &&
          Math.hypot(this.x - e.x, this.y - e.y) < radius + 1.2
        ) {
          this.award(100, "NEAR MISS");
        }
      }
      if (e.z > 25) this.v.release(e);
    }
    for (const b of this.bolts) {
      if (!b.active) continue;
      const old = b.z;
      b.z += (b.enemy ? this.speed + 34 : -230) * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.mesh.position.set(b.x, b.y, b.z);
      if (b.enemy) {
        if (sweptHit(b.x, b.y, old, b.z, this.x, this.y, 0, 0.8)) {
          this.hit(14);
          b.active = false;
          b.mesh.visible = false;
          if (this.mode !== "playing") return;
        }
      } else {
        for (const e of this.v.entities) {
          if (
            !e.active ||
            !["drone", "fighter", "turret", "boss", "reactor", "mine"].includes(
              e.kind,
            )
          )
            continue;
          if (
            sweptHit(b.x, b.y, old, b.z, e.x, e.y, e.z, e.radius * 1.3 + 0.35)
          ) {
            b.active = false;
            this.state.hits++;
            e.hp--;
            this.v.burst(b.x, b.y, b.z, 0xffca98, 3);
            if (e.hp <= 0) {
              this.state.kills++;
              this.award(
                e.kind === "boss" || e.kind === "reactor" ? 3000 : 250,
                e.kind === "boss"
                  ? "GUNSHIP DESTROYED"
                  : e.kind === "reactor"
                    ? "CORE BREACHED · ESCAPE"
                    : undefined,
              );
              this.v.burst(e.x, e.y, e.z, 0xffaa6a, 45);
              this.audio.play("explosion");
              this.v.release(e);
              if (e === this.boss) {
                this.boost = 8;
                this.v.shake = 0.8;
              }
            }
            break;
          }
        }
      }
      if (b.z < -350 || b.z > 25) b.active = false;
      b.mesh.visible = b.active;
    }
    if (this.world === 4 && this.bossSpawned && !this.boss?.active) {
      this.escapePulse += dt;
      if (this.escapePulse > 0.35) {
        this.escapePulse = 0;
        this.v.burst(
          (this.rng() - 0.5) * 30,
          (this.rng() - 0.5) * 20,
          6,
          0xff9b52,
          32,
        );
        this.v.shake = 0.3;
      }
    }
    if (this.mode === "playing" && this.distance >= w.length) this.end(true);
    this.engineTrail += dt;
    if (this.engineTrail > 0.05) {
      this.engineTrail = 0;
      this.v.burst(this.x - 0.85, this.y, 2, 0x5dedff, 1);
      this.v.burst(this.x + 0.85, this.y, 2, 0x5dedff, 1);
    }
  }
  private frame(t: number) {
    const dt = Math.min((t - this.last) / 1000 || 0, 0.05);
    this.last = t;
    this.accumulator += dt;
    while (this.accumulator >= 1 / 60) {
      this.update(1 / 60);
      this.accumulator -= 1 / 60;
    }
    const active = this.mode === "playing";
    this.v.progress = this.distance / WORLDS[this.world].length;
    if (this.mode !== "paused")
      this.v.update(
        dt,
        active ? this.speed : this.mode === "menu" ? 10 : 3,
        this.mode === "menu" ? 15 : this.x,
        this.mode === "menu" ? 1 : this.y,
        this.vx / 20,
        this.boost > 0 && active,
        this.mode === "menu",
      );
    this.v.player.visible = this.mode !== "dead";
    if (this.invulnerable > 0 && active)
      this.v.player.visible = Math.floor(t / 90) % 2 === 0;
    this.audio.engine(this.speed / 150, active);
    this.v.render();
    requestAnimationFrame((t) => this.frame(t));
  }
}
