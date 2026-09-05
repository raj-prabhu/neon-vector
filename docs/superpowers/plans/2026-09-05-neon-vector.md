# Neon Vector implementation plan
Goal: deliver a complete locally runnable arcade spaceflight campaign.
Architecture: separate pure domain rules, Three.js renderer/pools, runtime simulation, Web Audio and DOM UI.
Tech stack: Three.js, TypeScript, Vite, Vitest, Playwright.
Spec: ../specs/2026-09-05-neon-vector-design.md

1. Test score multiplier decay, shield spillover, swept collision and save validation; implement domain rules and five world definitions in src/model.ts.
2. Build reusable geometry, pooled entities, particles, stars, scenery and chase camera in src/visuals.ts. Add generated feedback audio in src/audio.ts.
3. Implement fixed-step ship control, projectiles, encounter scheduling, collisions, pickups, finales and lifecycle in src/game.ts.
4. Implement mission select, keyboard-accessible buttons, HUD, pause, debrief and progression in src/main.ts and src/style.css.
5. Run build and domain tests. Play browser sessions and capture all five worlds. Independent gameplay, visual, level design, UX and technical reviews identify concrete fixes.
6. Apply incremental fixes, rerun tests, document controls/architecture/limitations and leave development server available.
