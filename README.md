# NEON VECTOR

A complete single-player arcade spaceflight campaign. Pilot an original spacecraft through five worlds, dodge obstacles, shoot enemy formations, chain boost gates, and improve your saved scores.

## Run locally

Requires Node.js 20.19+ or 22.12+ and a desktop browser with WebGL2 / hardware acceleration.

```sh
npm install
npm run dev
```

Open the URL printed by Vite. If another application already uses the default port, run `npm run dev -- --port 4175`.

```sh
npm run build    # TypeScript checks + static production output in dist/
npm run preview # Serve production build
npm test        # Domain regression tests
```

Deploy the contents of `dist/` to any static host. All geometry, effects and audio are generated locally. The bundled display font includes its OFL license in `public/fonts/OFL.txt`. No account, backend, runtime CDN or API key is needed.

## Controls

| Input                   | Action                           |
| ----------------------- | -------------------------------- |
| WASD / arrow keys       | Move horizontally and vertically |
| Hold Space / left mouse | Fire forward lasers              |
| Escape / P              | Pause or resume                  |
| M                       | Toggle audio                     |

Forward flight is automatic. Lime rings trigger overdrive, widen the camera and award points. Smaller precision rings award more. Cyan pickups restore shields, green repairs hull, orange grants rapid fire, violet grants spread shot, and gold adds score. Weapon upgrades last 12 seconds. Missed pickups and rings are harmless. Laser barriers, mines, asteroids and red ships are hazards. The scenery outside the flight corridor is decorative.

## Campaign and scoring

1. **Asteroid Belt:** forgiving opening, drones, boost lines and a shattering moon fragment.
2. **Derelict Fleet:** metallic wrecks, hangar frames, turrets and collapsing debris.
3. **Ice Rings:** blue crystalline fields and dense boost chains at higher speed.
4. **Enemy Territory:** fighter formations, moving laser bars, mines and a gunship boss.
5. **The Megastation:** open superstructure transitions into a tunnel; destroy the reactor and escape through an explosion sequence.

Routes typically take 45–90 seconds, depending on boosts and boss accuracy. Destroy the gunship/reactor to release route progression. Finishing a world unlocks the next. Local storage preserves independent best score, fastest time and highest rank. Private browsing or disabled storage may prevent persistence.

Kills award 250 base points; rings 300, precision rings 450, score pickups and near misses 100. Every three scoring events increases the multiplier, up to ×8. Score within five seconds to maintain a chain; inactivity decays it and damage resets it. Twelve seconds without damage grants a small shield regeneration and score bonus (no score bonus during bosses). Completion adds survival and time bonuses. Rank thresholds scale to each world's scoring opportunities; S also requires less than 100 damage. End reports include score, time, kills, pickups, gates, damage, accuracy and peak multiplier.

You start with 80 shield and 100 hull. Damage consumes shield first, with excess spilling into hull. One second of impact grace prevents stacked collisions. Retry resets a mission immediately. Losing focus automatically pauses.

## Architecture

- `src/model.ts`: pure scoring, damage, ranks, save validation, swept collision and world definitions.
- `src/game.ts`: fixed 60 Hz simulation, responsive movement, encounter scheduling, weapon/projectile pools, collisions, boss objectives and lifecycle.
- `src/visuals.ts`: Three.js geometry, original ships, world scenery, chase camera, reusable entity pools and 400 instanced effect particles. World-relative coordinates avoid large-position precision problems.
- `src/audio.ts`: generated Web Audio engine, event synthesis, throttled effects and bounded voices.
- `src/main.ts`: mission select, HUD, dialogs, input accessibility and local progression.
- `src/style.css`: responsive interface with locally bundled display typography.

Simulation and rendered frames are separate. Projectiles use swept forward collision tests so high speed does not tunnel through enemies. Geometry/materials are shared, projectiles are preallocated, and entities are reused by type. The render pixel ratio is capped for high-density screens.

## Verification

`npm test` covers damage spillover, combo cap/decay, collision sweeps, one-time plane crossing, corrupted saves, and independent personal bests.

With a dev server at `http://127.0.0.1:4175`, run:

```sh
npx playwright install chromium
node tests/browser-check.mjs
node tests/regression.mjs
```

The campaign check drives steering and firing through every full level using accelerated fixed simulation steps; it does not grant extra health or skip bosses. Separate real-time keyboard checks cover movement and pause. Regression checks inject individual entities to isolate pickup, damage and boost behavior. Screenshots and measured results are in `docs/`. The development inspection hook is excluded from production builds.

Independent gameplay, level design, visual, UX and technical review passes informed fixes to scoring, resource lifetime, precision gates, finale presentation and laptop layouts. A 100-world-switch browser check held GPU geometry count constant. The final verification report records performance; 60 FPS is a target, not a guarantee.

## Known limitations and future improvements

- Designed for desktop keyboard/mouse; touch flight and gamepad bindings are not implemented.
- Stylized procedural geometry and synthesized ambience, without authored music or imported art.
- Controlled flight corridors, not freely explorable worlds. Encounter positions are deterministically seeded for replay; no authored branching routes.
- Browser automation verifies completion and mechanics but cannot establish subjective long-term fun. More human playtesting would improve tuning.
- Performance depends on GPU, browser, screen density and power settings; headless Chromium measured roughly 30 FPS in this build environment.
- Future additions: authored boss phases, richer level geometry, gamepad support, daily seeds, replay ghosts, quality presets and accessibility remapping.
