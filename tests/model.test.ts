import { describe, it, expect } from "vitest";
import { RunState, readSave, recordWin, sweptHit, WORLDS } from "../src/model";
describe("arcade rules", () => {
  it("shields absorb damage before hull, and damage breaks combo", () => {
    const r = new RunState();
    r.addScore(100);
    r.addScore(100);
    r.damage(85);
    expect(r.shield).toBe(0);
    expect(r.hull).toBe(95);
    expect(r.combo).toBe(0);
    expect(r.damageTaken).toBe(85);
  });
  it("chains score to a capped multiplier and decays after inactivity", () => {
    const r = new RunState();
    for (let i = 0; i < 30; i++) r.addScore(100);
    expect(r.multiplier).toBe(8);
    expect(r.score).toBeGreaterThan(3000);
    r.tick(7);
    expect(r.combo).toBeLessThan(30);
  });
  it("sweeps fast projectiles across targets", () => {
    expect(sweptHit(0, 0, -20, 20, 0, 0, 0, 2)).toBe(true);
    expect(sweptHit(5, 0, -20, 20, 0, 0, 0, 2)).toBe(false);
  });
  it("validates corrupted and out of range local saves", () => {
    expect(readSave("nope").unlocked).toBe(1);
    expect(readSave('{"unlocked":999}').unlocked).toBe(1);
  });
  it("unlocks sequential worlds and preserves independent personal bests", () => {
    const s = readSave(null);
    recordWin(s, 0, 1000, 80, "B");
    recordWin(s, 0, 500, 70, "C");
    expect(s.unlocked).toBe(2);
    expect(s.best[0]).toEqual({ score: 1000, time: 70, rank: "B" });
    expect(WORLDS).toHaveLength(5);
  });
});
