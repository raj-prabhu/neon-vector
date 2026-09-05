import "./style.css";
import { Vector3 } from "three";
import { Game } from "./game";
import { WORLDS, readSave, recordWin } from "./model";
const app = document.querySelector<HTMLElement>("#app")!;
app.innerHTML = `<section id="menu" class="overlay"><header class="topbar"><a class="brand" href="#">N<span>／</span>V <small>NEON VECTOR</small></a><div class="meta"><span class="status-dot"></span> FLIGHT SYSTEMS ONLINE <button id="audio" class="secondary" aria-label="Toggle sound">SOUND ON</button></div></header><div class="hero"><div class="eyebrow">SINGLE PLAYER · ARCADE SPACEFLIGHT</div><h1>BEYOND<br>THE <span>LIMIT.</span></h1><p class="description">Five worlds. One pilot. No brakes.<br>Find your line through the impossible.</p></div><div class="mission-layout"><div><div class="section-heading"><span>SELECT YOUR MISSION</span><span id="unlocked"></span></div><nav class="mission-list" aria-label="Select mission"></nav></div><article class="mission-detail"></article></div><footer class="footer"><div class="controls"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><span>STEER</span><kbd>SPACE</kbd><span>FIRE</span><kbd>ESC</kbd><span>PAUSE</span></div><span>CHASE THE LINE. CHAIN THE SCORE.</span></footer></section><section id="hud" class="hidden"><div class="hud-top"><div class="hud-left"><span class="hud-label" id="worldLabel"></span><div class="hud-value" id="score">000000</div><span class="hud-hint">SCORE</span></div><div id="combo"><span class="hud-label">CHAIN MULTIPLIER</span><div class="hud-value" id="multiplier">×1</div><div class="meter"><i id="comboFill"></i></div></div><div class="hud-right"><button id="pauseButton" class="secondary">Ⅱ PAUSE</button><div class="hud-value" id="speed">0</div><span class="hud-hint">VELOCITY / M·S⁻¹</span></div></div><div id="bossbar" class="hidden"><span id="bossLabel">DREADNOUGHT</span><div class="meter"><i id="bossFill"></i></div></div><div id="reticle">＋</div><div id="toast" aria-live="polite"></div><div class="hud-bottom"><div><span class="hud-label">SHIELD <b id="shieldText">80</b></span><div class="meter"><i id="shieldFill"></i></div><span class="hud-label">HULL <b id="hullText">100</b></span><div class="meter hull"><i id="hullFill"></i></div></div><div class="hud-weapon"><span class="hud-label">WEAPON SYSTEM</span><strong id="weapon">LASER CANNON</strong><span class="hud-hint" id="help">WASD / ARROWS TO STEER · HOLD SPACE TO FIRE</span></div><div><span class="hud-label">ROUTE <b id="progressText">0%</b></span><div id="progress" class="meter"><i></i></div><span class="hud-hint" id="timer">00:00</span></div></div></section><section id="dialog" class="overlay hidden" role="dialog" aria-modal="true" aria-labelledby="dialogTitle"><div class="dialog-card"></div></section>`;
let game: Game;
try {
  game = new Game(app);
} catch (e) {
  app.innerHTML =
    '<div style="padding:60px;color:white;background:#091020;font:20px sans-serif">WebGL could not start. Enable hardware acceleration in your browser and reload.</div>';
  throw e;
}
let save = readSave(null);
try {
  save = readSave(localStorage.getItem("neon-vector-save"));
} catch {}
let selected = 0;
let toastUntil = 0;
let muted = false;
const $ = (id: string) => document.getElementById(id)!;
const fmt = (n: number) => n.toLocaleString("en-US");
const time = (n: number) =>
  `${Math.floor(n / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(n % 60)
    .toString()
    .padStart(2, "0")}`;
function menu() {
  $("unlocked").textContent = `${save.unlocked} / 05 UNLOCKED`;
  document.querySelector(".mission-list")!.innerHTML = WORLDS.map(
    (w, i) =>
      `<button class="mission-card ${i === selected ? "active" : ""}" data-world="${i}" aria-pressed="${i === selected}"><span class="num">0${i + 1}</span><span><span class="name">${w.name}</span><span class="sub">${i < save.unlocked ? w.difficulty : "COMPLETE MISSION 0" + i + " TO UNLOCK"}</span></span><span class="lock">${i < save.unlocked ? "↗" : "⊘"}</span></button>`,
  ).join("");
  const w = WORLDS[selected],
    b = save.best[selected],
    unlocked = selected < save.unlocked;
  document.querySelector(".mission-detail")!.innerHTML =
    `<div class="eyebrow">MISSION 0${selected + 1} / ${w.subtitle}</div><h2>${w.name}</h2><p>${w.description}</p><div class="tags">${w.tags.map((t) => `<span>${t}</span>`).join("")}</div><div class="stats"><div><span>BEST SCORE</span><strong>${b ? fmt(b.score) : "—"}</strong></div><div><span>BEST TIME</span><strong>${b ? time(b.time) : "—"}</strong></div><div><span>RANK</span><strong>${b?.rank || "—"}</strong></div></div><button class="launch primary" id="launch" ${unlocked ? "" : "disabled"}>${unlocked ? "LAUNCH MISSION" : "MISSION LOCKED"} <span>↗</span></button><div class="hud-hint">${unlocked ? "FLY THROUGH LIME GATES TO BOOST · BUILD YOUR MULTIPLIER" : "Finish the previous mission to open this route."}</div>`;
  document.querySelectorAll<HTMLButtonElement>("[data-world]").forEach(
    (b) =>
      (b.onclick = () => {
        selected = Number(b.dataset.world);
        game.menu(selected);
        game.audio.play("ui");
      }),
  );
  $("launch").onclick = () => game.start(selected);
}
function dialog(title: string, html: string, buttons: string) {
  $("dialog").classList.remove("hidden");
  document.querySelector(".dialog-card")!.innerHTML =
    `<div class="eyebrow">NEON VECTOR / FLIGHT REPORT</div><h2 id="dialogTitle">${title}</h2>${html}<div class="dialog-actions">${buttons}</div>`;
  setTimeout(
    () => document.querySelector<HTMLButtonElement>("#dialog button")?.focus(),
    0,
  );
}
game.onChange = () => {
  const m = game.mode;
  $("menu").classList.toggle("hidden", m !== "menu");
  $("hud").classList.toggle("hidden", m === "menu");
  $("dialog").classList.add("hidden");
  if (m === "menu") {
    menu();
    return;
  }
  if (m === "paused") {
    dialog(
      "Flight paused",
      `<p>Your route is waiting.</p><p>WASD or arrows to steer. Hold Space or left mouse to fire.<br>Fly through lime rings to boost. Pickups restore shields, repair hull, or upgrade your weapon.<br>Chain scoring events within five seconds. Damage resets the chain.</p>`,
      `<button id="resume" class="primary">RESUME FLIGHT ↗</button><button id="retry" class="secondary">RESTART MISSION</button><button id="quit" class="secondary">LEVEL SELECT</button>`,
    );
    $("resume").onclick = () => game.pause();
  }
  if (m === "won" || m === "dead") {
    const r = game.state;
    if (m === "won") {
      recordWin(save, game.world, r.score, r.elapsed, r.rank);
      try {
        localStorage.setItem("neon-vector-save", JSON.stringify(save));
      } catch {}
    }
    dialog(
      m === "won"
        ? game.world === 4
          ? "Campaign complete"
          : "Mission complete"
        : "Signal lost",
      `<p>${m === "won" ? "Route cleared. Your personal bests have been recorded." : "Your ship was destroyed. Find a new line and fly again."}</p><div class="result-rank">${m === "won" ? r.rank : "×"}</div><div class="results-grid">${[
        ["FINAL SCORE", fmt(r.score)],
        ["FLIGHT TIME", time(r.elapsed)],
        ["ENEMIES DESTROYED", r.kills],
        ["PICKUPS / GATES", r.pickups + " / " + r.rings],
        ["DAMAGE TAKEN", r.damageTaken],
        ["PEAK MULTIPLIER", "×" + r.peak],
        [
          "ACCURACY",
          r.shots ? Math.round((r.hits / r.shots) * 100) + "%" : "—",
        ],
      ]
        .map(([k, v]) => `<div><span>${k}</span><strong>${v}</strong></div>`)
        .join("")}</div>`,
      `<button id="retry" class="primary">RETRY MISSION ↗</button>${m === "won" && game.world < 4 ? '<button id="next" class="primary">NEXT MISSION ↗</button>' : ""}<button id="quit" class="secondary">LEVEL SELECT</button>`,
    );
    if ($("next"))
      $("next").onclick = () => {
        selected = game.world + 1;
        game.start(selected);
      };
  }
  if ($("retry")) $("retry").onclick = () => game.start(game.world);
  if ($("quit")) $("quit").onclick = () => game.menu(selected);
};
game.onToast = (t) => {
  $("toast").textContent = t;
  toastUntil = performance.now() + 2400;
  $("toast").classList.add("visible");
};
$("pauseButton").onclick = () => game.pause();
$("audio").onclick = () => {
  muted = !muted;
  game.audio.start();
  game.audio.setMuted(muted);
  $("audio").textContent = muted ? "SOUND OFF" : "SOUND ON";
};
window.addEventListener("keydown", (e) => {
  if (e.code === "KeyM" && !e.repeat) $("audio").click();
});
const aimPoint = new Vector3();
setInterval(() => {
  if (game.mode === "menu") return;
  const r = game.state;
  aimPoint.set(game.x, game.y, -100).project(game.v.camera);
  $("reticle").style.left = (aimPoint.x * 0.5 + 0.5) * innerWidth + "px";
  $("reticle").style.top = (-aimPoint.y * 0.5 + 0.5) * innerHeight + "px";
  $("worldLabel").textContent =
    `0${game.world + 1} / ${WORLDS[game.world].name.toUpperCase()}`;
  $("score").textContent = fmt(r.score).padStart(6, "0");
  $("multiplier").textContent = "×" + r.multiplier;
  $("comboFill").style.width = Math.max(0, (r.comboTime / 5) * 100) + "%";
  $("speed").textContent = Math.round(game.speed).toString();
  $("shieldText").textContent = Math.round(r.shield).toString();
  $("hullText").textContent = r.hull.toString();
  $("shieldFill").style.width = (r.shield / 80) * 100 + "%";
  $("hullFill").style.width = r.hull + "%";
  const progress = Math.min(
    100,
    Math.floor((game.distance / WORLDS[game.world].length) * 100),
  );
  $("progressText").textContent = progress + "%";
  document.querySelector<HTMLElement>("#progress i")!.style.width =
    progress + "%";
  $("timer").textContent = time(r.elapsed);
  $("weapon").textContent =
    game.power +
    (game.powerTime > 0 ? " / " + Math.ceil(game.powerTime) + "s" : "");
  $("help").textContent =
    game.boost > 0
      ? "OVERDRIVE ACTIVE · CHAIN THE NEXT GATE"
      : r.elapsed < 12
        ? "WASD / ARROWS TO STEER · HOLD SPACE TO FIRE"
        : "M TO TOGGLE SOUND · ESC TO PAUSE";
  $("bossbar").classList.toggle("hidden", !game.boss?.active);
  if (game.boss?.active) {
    $("bossLabel").textContent =
      game.world === 3
        ? "DREADNOUGHT · DESTROY TO CLEAR ROUTE"
        : "REACTOR · DESTROY TO BEGIN ESCAPE";
    $("bossFill").style.width =
      (game.boss.hp / (game.world === 3 ? 95 : 65)) * 100 + "%";
  }
  $("toast").classList.toggle("visible", performance.now() < toastUntil);
}, 70);
menu();
if (import.meta.env.DEV) (window as unknown as { __game: Game }).__game = game;

document.addEventListener("keydown", (e) => {
  if (e.key !== "Tab" || $("dialog").classList.contains("hidden")) return;
  const buttons = Array.from(
    document.querySelectorAll<HTMLButtonElement>("#dialog button"),
  );
  const first = buttons[0],
    last = buttons[buttons.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
});
