# AGENTS.md: BuildCraft

Standing instructions for any coding agent (Claude Code, Codex, Cursor, …) working in this repo. Humans: the player-facing overview is `README.md`.

## What this is

BuildCraft is a set of browser games built at the NCSEA hackathon (2026-10-27). They teach kids, students and non-engineers how a building's disciplines work together: architecture, structure, envelope, mechanical, electrical. Every game puts the player in the designer's or client's seat, then tests the design with weather, quakes or occupants. All numbers are illustrative game values, and each game says so on screen.

- **Live:** https://amourougassamy.github.io/BuildCraft/ is the launcher page, which lists every game.
- **Deploy:** GitHub Pages builds from the root of `main`. **Merging to `main` rebuilds the live site within 1–2 minutes**, so try changes locally before merging. Browsers may keep showing the old files for up to about 10 minutes; hard-refresh to check.
- **Team:** several people push to `main` directly (often through the GitHub web uploader). Pull before you start and again before you push.

## What's built (as of 2026-10-27)

| Path | Owner | What it is | Tech |
| --- | --- | --- | --- |
| `index.html` | team | Launcher: one row per playable folder, in two lists (Team mainline, Prototypes) | static HTML |
| `master-v1/` (branch `master_V1` until merged) | Anand | **The team's main game going forward.** Kid-first claymation 3D: name prompt, island map with 5 unlockable sites, one-screen design with coin jar, a forward-only year with repairs and downtime, emoji moods, ghosts, report card | ES modules, three.js 0.160.1 vendored, `npm test` |
| `buildcraft-v0.1/` | team (andrewdsundal) | Mainline starter "Build It!": Riverside Library, $4.0M budget, 9 decisions, then a Minnesota weather year | classic scripts, `window.GAME`/`SIM` |
| `buildcraft-v0.2/` | team (andrewdsundal) | Previous mainline (snapshot). Kid edition: six characters (happy / sad / ghost), coins, celebrations, Gentle mode, sound | classic scripts, `GAME`/`SIM`/`ART`/`FX` |
| `prototypes/alex/` | Alex | v3: pick a town, building type and floors; 90 s build, then a year of quakes and windstorms where foundations must match the soil. v1 and v2 are in the same folder | single HTML, canvas |
| `prototypes/sky-high-builders/` | Logan | Stack frame and brace pieces on a 3×6 grid, then a wind test | single HTML, minified |
| `prototypes/buildcraft-3d/` | Logan | Orbitable 3D templates (tower, house, bridge, frame) with six loads and a demand/capacity score | three.js, minified |
| `interactive/` | Logan | Newer 3D version: click-to-build on a grid, elevation, delete, undo, load test | three.js, minified |
| `earthquake-tower/` | Logan | Five-storey tower, basic vs braced, under an earthquake with an intensity slider | three.js, minified |
| `prototypes/building-tycoon/` | Tom | Isometric 3D tycoon: tenants' moods follow the design; windows, structure, envelope, HVAC and electrical affect each other; helicopter delivers rooftop units | ES modules, three.js, `node --test` |
| `prototypes/learning-hub-nextjs/` | nabdo | Next.js app: design a learning hub in 3D against budget, area and a hot-day cooling check. Hosted on Abacus.AI (https://ncseahackathon.ssoe.abacus.ai/), **not** on Pages | Next 16, React 19, Tailwind, shadcn/ui |
| `ncsea_hackathon_nextjs_space (1).zip` | nabdo | Newer copy of the learning hub, adding story mode (guide "Nova") and a cold-day/heating model. Not unzipped into the folder yet | zip |

## Before you edit

- **Picking up work:** read `PLAN.md`, the team's task board for Master V1. It lives on `main`. Claim a task by putting your initials in its **Who** cell before you start, and change ⬜ to ✅ once it's merged.
- **Master V1's code is on branch `master_V1` until task 0 merges it into `main`.** To read or run it, first run `git fetch origin && git checkout master_V1`.
- **Before editing a folder, read its `README.md`:** owner, how to run it, and which squad owns which file. `interactive/` and `earthquake-tower/` have no README yet; this table and `docs/REPO_GUIDE.md` describe them.
- **For architecture details**, read `docs/REPO_GUIDE.md`: load order, globals, data schemas, sim rules, file formats, and what the zip changes.

## Working rules

- **Stay in your own folder.** Each folder is a complete, self-contained game. To reuse something, copy it into your folder rather than importing across folders. Ask the owner before changing their folder. Master V1 is the exception: it's the shared team game, and claiming a `PLAN.md` task is your go-ahead to edit the files that task names.
- **Master V1 grows in place, through `PLAN.md` tasks:** one task per branch and PR. The older `buildcraft-v0.1/` and `buildcraft-v0.2/` are snapshots that stay as they are, so every version stays playable. In every game, content and tuning go in `data.js`.
- **New prototype:** create `prototypes/<what-it-is>/`, named for what it is, with an `index.html` and a short `README.md` (what it is, owner, how to run).
- **Every playable folder is listed twice:** one row in the root `index.html` launcher and one row in the `README.md` table, with a Play link of the form `https://amourougassamy.github.io/BuildCraft/<path-to-folder>/` (for example `…/prototypes/alex/`).
- **Pages serves static files from `main`.** Keep paths inside a folder relative (`js/ui.js`). A game that needs a server or build step gets hosted elsewhere and linked from the launcher, the way the learning hub is.
- **Commit readable source.** Unzip archives into a folder. Build output, `node_modules/` and `.env` files stay out of git (see `.gitignore`).
- **Small PRs or small commits**, one feature each. Write commit messages that say what changed for the player.

## How we build games here

These patterns are already proven in the repo. Reuse them.

- **Split the code by job:** `data.js` holds every number and word, `sim.js` holds pure rules (no DOM), and the art/scene and UI live in their own files. The split lets content, logic, art and UI squads work in parallel. See v0.2 and building-tycoon.
- **Seed the randomness.** The same seed gives the same weather, so "replay with a better design" is a fair comparison. v0.1, v0.2 and tycoon use a seeded mulberry32.
- **Speak demand/capacity (D/C):** load over strength, where above 1 means it fails. Show it as green/yellow/red gauges and let a choice ripple across disciplines: bigger windows → weaker shear walls → hotter rooms → more rooftop units → more roof and electrical load.
- **Kid view first, engineer view on request.** Plain words and characters up front; the real numbers behind a toggle ("For grown-ups" in v0.2, "Engineer view" in tycoon).
- **Test the sim**, not the pixels. Tycoon runs `node --test` on its ES-module sim. Calibrate numbers with a script you commit, so the tuning can be re-run.
- **Static 3D games use three.js 0.160.1,** so code moves between them easily. Master V1 vendors it in `vendor/` (works offline); the others load it from jsDelivr. The learning hub is the exception: three 0.180 from npm.

## Run and test locally

- Classic-script games (v0.1, v0.2, alex, sky-high) also open from `file://`.
- ES-module games need a local server: `python3 -m http.server 8000` from the repo root, then open `http://localhost:8000/<folder>/`. Master V1 and tycoon each ship a no-cache server on port 8765: `python3 master-v1/tools/serve.py` (open `http://127.0.0.1:8765/master-v1/`) or `python3 prototypes/building-tycoon/tools/serve.py`. Master V1 vendors three.js and runs offline; the other three.js games need internet.
- Tests: `npm test` and `npm run calibrate` in `master-v1/`; `node --test prototypes/building-tycoon/tests/*.test.mjs` for tycoon. The learning hub has `tests/game-model.test.ts`, probably run with `yarn tsx` (unverified). The other games have no tests.

## Gotchas

- **Browsers cache ES modules hard.** After an edit, hard-refresh or use the no-cache server. Pages itself caches for about 10 minutes.
- **The three.js games and sky-high are minified single files.** Reformat to read them, keep the single-file shape, and test in a browser after any edit.
- **`buildcraft-3d` and `interactive` save different JSON formats.** Both say `version: 3`, but neither loads the other's files.
- **The learning hub carries Abacus.AI hosting config:** `.yarnrc.yml` has a host-specific global cache path, `next.config.js` sets `ignoreBuildErrors`, and `layout.tsx` loads an Abacus script. Its `STYLE_GUIDE.md` is the generic Abacus template.
- **Renaming a decision or option ID in a mainline `data.js`** breaks `governs`, presets, `defaultChoices`, v0.2's `cast[].loves`, and checks in `sim.js` that use hard-coded IDs.

## Shared vocabulary

- **Brief → design → year → results:** the loop every game shares. v0.1 labels its screens like drawing sheets: G-001 brief, A-101 design, W-201 weather year, R-301 results. Master V1 adds a name prompt and the island map in front.
- **Hazard rules differ per game.**
  - **v0.1/v0.2:** each hazard (snow, wind, flood, hail, cold, heat) has a 0–10 rating set by the decisions in `GAME.governs`, and the weakest one wins. `damage = max(0, intensity − rating) × repair cost per point`.
  - **Master V1:** hazards are quake, wind, flood and heat, with power 1–4 against a strength that starts at 1 and grows with upgrades. Each point the hazard wins by costs 25% of the building's health.
- **Squads** (mainline file ownership): 1 Lead and integration, 2 Game logic (`sim.js`), 3 Content (`data.js`), 4 UI, 5 Art.
- **D/C:** demand over capacity (see "Speak demand/capacity" above).

## Direction (decided 2026-10-27)

**Master V1 is the game we're building out.** It already combines the team's favourite ideas: Alex's kid focus, coin jar and soil-matched foundations; v0.2's moods, pet, ghosts and Gentle mode; the tycoon's 3D building with people walking in and out. The review meeting on 2026-10-27 turned the next round into tasks in **`PLAN.md`**:
- **Levels and soil:** soil profiles; a failable level 1; bigger, L-shaped buildings; a river site on bad soil.
- **Map:** terrain that shows what each site sits on.
- **Building:** see-through on hover with activities inside; a structural look; a bigger ground and city context with cars.
- **People:** speech bubbles.
- **Design screen:** a cleaner panel, a drawing sheet, and no furniture option.
- **Systems:** elevators, restrooms, sprinklers and a fire event, and a helicopter-delivered HVAC unit.

The prototypes stay as idea sources and stay playable. Housekeeping still open for the owners: unzip nabdo's story-mode update into `prototypes/learning-hub-nextjs/` and delete the zip; move Logan's `interactive/` and `earthquake-tower/` under `prototypes/` with READMEs.

## Decisions log

Add new entries at the top: date, decision, who decided.

- 2026-10-27: Master V1 review meeting. Master V1 is the main game. The upgrade tasks are in `PLAN.md`, claimed with initials and ticked when merged (team).
- 2026-10-27: Master V1 built on branch `master_V1` from the team's favourite ideas (Anand).
- 2026-10-27: `interactive/` and `earthquake-tower/` (Logan) listed in the launcher and README. The folders stay where Logan put them.
- 2026-10-27: Building Tycoon added as a prototype (Tom, PR #2).
- 2026-10-27: Repo organized into team mainline vs prototypes, with a launcher that lists every version. Old mainline folders are never edited (PR #1).
- 2026-10-27: Starter "Build It!" (v0.1) set up with one file per squad and no build step (andrewdsundal).
