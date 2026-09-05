export interface World {
  name: string;
  subtitle: string;
  description: string;
  color: number;
  sky: number;
  planet: number;
  length: number;
  speed: number;
  difficulty: string;
  finale: string;
  tags: string[];
}
export const WORLDS: World[] = [
  {
    name: "Asteroid Belt",
    subtitle: "THE EDGE OF KNOWN SPACE",
    description:
      "Thread the drifting ruins of a shattered moon. Find your line, light the engines, and make the void your own.",
    color: 0x55e5ee,
    sky: 0x050d1b,
    planet: 0x236c85,
    length: 5200,
    speed: 65,
    difficulty: "ROOKIE",
    finale: "SHATTERED MOON",
    tags: ["Asteroid fields", "Drone patrols", "Boost corridors"],
  },
  {
    name: "Derelict Fleet",
    subtitle: "GRAVEYARD OF GIANTS",
    description:
      "Skim silent warships and dive through broken hangars. The fleet is abandoned. Its defenses are not.",
    color: 0xffb76c,
    sky: 0x120d19,
    planet: 0x765b6f,
    length: 5650,
    speed: 70,
    difficulty: "PILOT",
    finale: "COLLAPSING HANGAR",
    tags: ["Capital wrecks", "Turrets", "Hull breach"],
  },
  {
    name: "Ice Rings",
    subtitle: "ON THE EDGE OF LIGHT",
    description:
      "A frozen ocean in orbit. Ride long chains of energy gates between crystalline shards at impossible speed.",
    color: 0x97dfff,
    sky: 0x08152b,
    planet: 0x4f83b2,
    length: 6350,
    speed: 83,
    difficulty: "ACE",
    finale: "WHITEOUT RUN",
    tags: ["Ice fragments", "Gate chains", "Extreme velocity"],
  },
  {
    name: "Enemy Territory",
    subtitle: "BEYOND THE FRONT LINE",
    description:
      "Break a defense perimeter of mines, interceptors and laser grids. Bring down the command gunship.",
    color: 0xff6869,
    sky: 0x16091c,
    planet: 0x7d3149,
    length: 6200,
    speed: 77,
    difficulty: "ELITE",
    finale: "DREADNOUGHT",
    tags: ["Fighter wings", "Defense grids", "Gunship boss"],
  },
  {
    name: "The Megastation",
    subtitle: "ONE WAY OUT",
    description:
      "Enter the superstructure. Destroy the reactor and burn through the escape tunnel before the station tears itself apart.",
    color: 0xb8a0ff,
    sky: 0x090b23,
    planet: 0x50427c,
    length: 6750,
    speed: 82,
    difficulty: "LEGEND",
    finale: "REACTOR OVERLOAD",
    tags: ["Moving machinery", "Reactor core", "Final escape"],
  },
];
export class RunState {
  constructor(public world = 0) {}
  score = 0;
  combo = 0;
  peak = 1;
  comboTime = 0;
  shield = 80;
  hull = 100;
  damageTaken = 0;
  kills = 0;
  pickups = 0;
  rings = 0;
  shots = 0;
  hits = 0;
  elapsed = 0;
  get multiplier() {
    return Math.min(8, 1 + Math.floor(this.combo / 3));
  }
  addScore(base: number) {
    this.combo++;
    this.comboTime = 5;
    this.peak = Math.max(this.peak, this.multiplier);
    const n = Math.round(base * this.multiplier);
    this.score += n;
    return n;
  }
  damage(n: number) {
    this.damageTaken += n;
    const spill = Math.max(0, n - this.shield);
    this.shield = Math.max(0, this.shield - n);
    this.hull = Math.max(0, this.hull - spill);
    this.combo = 0;
    this.comboTime = 0;
  }
  tick(dt: number) {
    this.elapsed += dt;
    this.comboTime -= dt;
    if (this.comboTime <= 0 && this.combo > 0) {
      this.combo = Math.max(0, this.combo - 3);
      this.comboTime = 1;
    }
  }
  get rank() {
    const target = [28000, 38000, 150000, 70000, 80000][this.world] || 28000;
    return this.score >= target && this.damageTaken < 100
      ? "S"
      : this.score >= target * 0.5
        ? "A"
        : this.score >= target * 0.2
          ? "B"
          : "C";
  }
}
export function sweptHit(
  x: number,
  y: number,
  z0: number,
  z1: number,
  tx: number,
  ty: number,
  tz: number,
  r: number,
) {
  return (
    (x - tx) ** 2 + (y - ty) ** 2 <= r * r &&
    tz >= Math.min(z0, z1) - r &&
    tz <= Math.max(z0, z1) + r
  );
}
export interface Best {
  score: number;
  time: number;
  rank: string;
}
export interface Save {
  unlocked: number;
  best: Record<number, Best>;
}
export function readSave(raw: string | null): Save {
  try {
    const s = JSON.parse(raw || "{}");
    if (!Number.isInteger(s.unlocked) || s.unlocked < 1 || s.unlocked > 5)
      return { unlocked: 1, best: {} };
    const best: Record<number, Best> = {};
    for (let i = 0; i < 5; i++) {
      const b = s.best?.[i];
      if (
        b &&
        Number.isFinite(b.score) &&
        b.score >= 0 &&
        Number.isFinite(b.time) &&
        b.time > 0 &&
        ["C", "B", "A", "S"].includes(b.rank)
      )
        best[i] = b;
    }
    return { unlocked: s.unlocked, best };
  } catch {
    return { unlocked: 1, best: {} };
  }
}
export function recordWin(
  s: Save,
  i: number,
  score: number,
  time: number,
  rank: string,
) {
  s.unlocked = Math.min(5, Math.max(s.unlocked, i + 2));
  const old = s.best[i];
  s.best[i] = {
    score: Math.max(score, old?.score || 0),
    time: Math.min(time, old?.time || Infinity),
    rank:
      old && "CBAS".indexOf(old.rank) > "CBAS".indexOf(rank) ? old.rank : rank,
  };
}
export function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function crossesPlane(before: number, after: number) {
  return before < 0 && after >= 0;
}
