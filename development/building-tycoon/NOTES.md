# Building Tycoon: decisions and open items

## Decisions (Tom, 2026-10-27, NCSEA hackathon)

- **Repo:** the team repo `amourougassamy/BuildCraft`. Tom joined late, so he adds one prototype folder plus one launcher row and doesn't rewrite the shared launcher (others were already presenting from it).
- **Account:** commits use `Tom Kovalcik <tom@getstructured.ai>` (repo-local git config), because `tkovalcik-stru-ai` is the collaborator with push access.
- **Flow:** work happens on the local branch `tom/building-tycoon`. Push and open a PR only when Tom says so. GitHub Pages publishes straight from `main`, so merging = live.
- **Stack:** static files, no build step, Three.js 0.160.1 from jsDelivr through an import map (matches the BuildCraft 3D prototype).
- **Quality bar:** the global CI/ruff/branch-protection rule is waived for this hackathon repo. Model logic is covered by `node --test` unit tests.
- **Camera:** orthographic isometric view, free orbit and zoom, Q/E snaps 90°.
- **Building:** tune a preset 3-storey office rather than build from scratch. The point is to show how the building systems interact (architecture, structure, envelope, mechanical, electrical), for other disciplines and for kids.
- **Simulation:** simple but multi-discipline. Window size couples to shear-wall strength, solar gain, heat loss and daylight. Rooftop units couple to roof load, electrical load and seismic weight. Heat pumps couple to winter electrical load.
- **Gauges:** demand/capacity per system (roof, bracing, cooling, heating, electrical), plus a chain-reaction card per change and red glow on the stressed part in 3D.
- **Audience:** playful by default, with an "Engineer view" toggle for the numbers.
- **Win condition:** sandbox, no game over. One year (one representative day per month) takes about 3 minutes at 1×, then a report card per discipline. Replays with the same seed give the same weather.

## Calibration (2026-10-27)

Tuned with `tools/calibrate.mjs` (seed 2026) so the starting building is undersized for cooling (D/C 1.43). July turns hot and the heat wave drops average mood to about 40. One helicopter unit brings cooling to 1.07; switching to heat pumps takes electrical from 0.62 to 0.96; west windows 30% → 60% takes bracing from 0.70 to 0.89. Re-run the script after changing numbers in `js/data.js`.

## Open items

- [x] Pushed and merged as PR #2 on 2026-10-27 (squash `c26fb4d`); live on Pages.
- [ ] Ideas: plumbing/fire protection, vertical fins on the west, a story mode with a client brief, sound, a floor-by-floor cutaway, an Excalidraw version of the README diagrams to share.
