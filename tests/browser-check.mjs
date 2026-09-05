import { chromium } from "@playwright/test";
import fs from "node:fs";
import assert from "node:assert/strict";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:4175");
await page.waitForTimeout(800);
await page.screenshot({ path: "docs/screenshots/launch.png" });
await page.locator("#launch").click();
await page.keyboard.down("KeyD");
await page.waitForTimeout(300);
await page.keyboard.up("KeyD");
console.log("movement", await page.evaluate(() => window.__game.x));
await page.keyboard.press("Escape");
console.log("pause", await page.evaluate(() => window.__game.mode));
await page.locator("#resume").click();
const results = [];
for (let world = 0; world < 5; world++) {
  await page.evaluate((w) => {
    window.__game.start(w);
    window.__game.audio.setMuted(true);
  }, world);
  for (let chunk = 0; chunk < 22; chunk++) {
    const status = await page.evaluate(() => {
      const g = window.__game;
      for (let k = 0; k < 360 && g.mode === "playing"; k++) {
        const active = g.v.entities.filter((e) => e.active);
        let target = g.boss?.active
          ? g.boss
          : active
              .filter(
                (e) => ["ring", "shield", "repair"].includes(e.kind) && e.z < 0,
              )
              .sort((a, b) => b.z - a.z)[0];
        let tx = target?.x || 0,
          ty = target?.y || 0;
        const threat = active.find(
          (e) =>
            ["rock", "ice", "debris", "mine", "barrier"].includes(e.kind) &&
            e.z > -65 &&
            e.z < 5 &&
            Math.hypot(e.x - g.x, e.y - g.y) < e.radius + 2,
        );
        if (threat) {
          tx = g.x + (g.x > threat.x ? 5 : -5);
          ty = g.y + (g.y > threat.y ? 3 : -3);
        }
        g.keys.clear();
        g.keys.add("Space");
        if (Math.abs(tx - g.x) > 0.45) g.keys.add(tx > g.x ? "KeyD" : "KeyA");
        if (Math.abs(ty - g.y) > 0.4) g.keys.add(ty > g.y ? "KeyW" : "KeyS");
        g.update(1 / 60);
      }
      return {
        mode: g.mode,
        time: g.state.elapsed,
        score: g.state.score,
        hull: g.state.hull,
        shield: g.state.shield,
        kills: g.state.kills,
        rings: g.state.rings,
        damage: g.state.damageTaken,
        boss: g.boss?.hp,
        pool: g.v.entities.length,
      };
    }, null);
    if (chunk === 3) {
      await page.waitForTimeout(1200);
      await page.screenshot({
        path: `docs/screenshots/world-${world + 1}.png`,
      });
    }
    if (status.mode !== "playing") {
      results.push({ world: world + 1, ...status });
      break;
    }
    if (chunk === 21) results.push({ world: world + 1, ...status });
  }
}
console.log(JSON.stringify({ results, errors }, null, 2));
fs.writeFileSync(
  "docs/browser-results.json",
  JSON.stringify({ results, errors }, null, 2),
);
assert.equal(results.length, 5);
assert.ok(
  results.every((r) => r.mode === "won"),
  "all worlds complete",
);
assert.deepEqual(errors, []);
await page.reload();
await page.locator("#launch").waitFor();
assert.equal(
  await page.evaluate(
    () => JSON.parse(localStorage.getItem("neon-vector-save")).unlocked,
  ),
  5,
);
await browser.close();
