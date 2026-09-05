import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs";
const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
await p.goto("http://127.0.0.1:4175");
await p.locator("#launch").waitFor();
await p.locator('[data-world="4"]').click();
assert.equal(await p.locator("#launch").isDisabled(), true);
await p.locator('[data-world="0"]').click();
await p.locator("#launch").click();
const mechanics = await p.evaluate(() => {
  const g = window.__game;
  const tick = (n = 10) => {
    for (let i = 0; i < n; i++) g.update(1 / 60);
  };
  g.v.clear();
  g.distance = 100;
  g.invulnerable = 0;
  const results = {};
  g.v.spawn("ring", g.x, g.y, -0.5);
  tick(2);
  results.ring = g.state.rings === 1 && g.boost > 0;
  g.v.clear();
  g.state.shield = 20;
  g.v.spawn("shield", g.x, g.y, -0.5);
  tick(2);
  results.shield = g.state.shield === 55;
  g.v.spawn("rapid", g.x, g.y, -0.5);
  tick(2);
  results.rapid = g.power === "RAPID FIRE";
  g.powerTime = 0.01;
  tick(2);
  results.expiry = g.power === "LASER CANNON";
  g.v.clear();
  g.state.combo = 0;
  g.v.spawn("rock", g.x + 2, g.y, -2, 1);
  tick(6);
  results.singleNearMiss = g.state.combo === 1;
  g.v.clear();
  g.invulnerable = 0;
  g.state.shield = 0;
  g.state.hull = 10;
  g.v.spawn("mine", g.x, g.y, -0.5, 1);
  tick(2);
  results.death = g.mode === "dead" && g.state.hull === 0;
  return results;
});
for (const [name, ok] of Object.entries(mechanics)) assert.ok(ok, name);
await p.locator("#retry").click();
assert.equal(await p.evaluate(() => window.__game.state.hull), 100);
await p.keyboard.press("Escape");
const before = await p.evaluate(() => window.__game.distance);
await p.waitForTimeout(200);
assert.equal(await p.evaluate(() => window.__game.distance), before);
await p.locator("#resume").click();
const perf = await p.evaluate(async () => {
  const g = window.__game;
  const samples = [];
  let last = performance.now();
  await new Promise((resolve) => {
    const frame = (t) => {
      samples.push(t - last);
      last = t;
      if (samples.length < 180) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
  samples.sort((a, b) => a - b);
  return {
    medianFrameMs: samples[90],
    p95FrameMs: samples[171],
    drawCalls: g.v.renderer.info.render.calls,
    triangles: g.v.renderer.info.render.triangles,
    geometries: g.v.renderer.info.memory.geometries,
    entityPool: g.v.entities.length,
  };
});
await p.screenshot({ path: "docs/screenshots/final-game-1280.png" });
assert.deepEqual(errors, []);
const output = { mechanics, perf, errors };
console.log(JSON.stringify(output, null, 2));
fs.writeFileSync(
  "docs/regression-results.json",
  JSON.stringify(output, null, 2),
);
await browser.close();
