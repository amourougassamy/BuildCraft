# AGENTS.md: BuildCraft

Standing instructions for any coding agent (Claude Code, Codex, Cursor, …) working in this repo. Humans: the player-facing overview is `README.md`.

## What this is

BuildCraft is a set of browser games built at the NCSEA hackathon (2026-10-27). They teach kids, students and non-engineers how a building's disciplines work together: architecture, structure, envelope, mechanical, electrical. Every game puts the player in the designer's or client's seat, then tests the design with weather, quakes or occupants. All numbers are illustrative game values, and each game says so on screen.

- **Live:** https://buildcraft.quest (Firebase Hosting, project `buildcraft-4eee7`, also at https://buildcraft-4eee7.web.app) and https://amourougassamy.github.io/BuildCraft/ (GitHub Pages: the home page plus `master-v1/`).
- **Deploy:**
  - **GitHub Pages** builds from the root of `main`. **Merging to `main` rebuilds it within 1–2 minutes**, so try changes locally before merging. `_config.yml` keeps `development/` out of the published site.
  - **Firebase** is deployed by hand from `master-v1/`: `firebase deploy --only hosting,firestore:rules --project buildcraft-4eee7`. Only that folder is published.
  - Browsers may show old files for a few minutes; hard-refresh to check.
- **Team:** work on a branch and open a PR per task (see `PLAN.md`). Pull before you start and again before you push.

## What's built (as of 2026-10-28)

| Path | Owner | What it is | Tech |
| --- | --- | --- | --- |
| `index.html` | team | Home page: Play and Leaderboard | static HTML |
| `master-v1/` | team (started by Anand) | **The app.** Kid-first claymation 3D: name prompt, island map with 5 unlockable sites, soil report, one-screen design with coin jar, a forward-only 52-week year with repairs and downtime, emoji moods and speech bubbles, ghosts, report card, About page, shared leaderboard and dashboard | ES modules, three.js 0.160.1 vendored, Firestore over REST, `npm test` |
| `development/` | various | Earlier versions and prototypes from the hackathon, kept for reference and **not published**: `buildcraft-v0.1`, `buildcraft-v0.2` (team / andrewdsundal), `alex` (Alex), `building-tycoon` (Tom), `sky-high-builders`, `buildcraft-3d`, `interactive`, `earthquake-tower` (Logan), `learning-hub-nextjs` (nabdo, with story mode) | mixed; see each folder's README and `docs/REPO_GUIDE.md` |

## Before you edit

- **Picking up work:** read `PLAN.md`, the team's task board for Master V1. It lives on `main`. **Claim before you code:** your first step is to put your human's initials in the task's **Who** cell and push that change to `main`. If the cell already has someone else's initials, pick another task. Once the PR is merged, change ⬜ to ✅ and push.
- **Before editing a folder, read its `README.md`:** owner, how to run it, and which squad owns which file.
- **For architecture details**, read `docs/REPO_GUIDE.md`: module map, data schemas, sim rules, the leaderboard, and how each older version is wired.

## Working rules

- **`master-v1/` is the shared app.** Claiming a `PLAN.md` task is your go-ahead to edit the files that task names. **`development/` is reference only:** leave it as it is unless its owner asks; to reuse something, copy it into `master-v1/`.
- **Master V1 grows in place, through `PLAN.md` tasks:** one task per branch and PR. Content and tuning go in `data.js`; rules in `sim.js` (pure, tested).
- **New experiment:** create `development/<what-it-is>/`, named for what it is, with an `index.html` and a short `README.md` (what it is, owner, how to run), and add a row to `development/index.html`. It won't be published.
- **Keep paths inside a folder relative** (`js/ui.js`, not `/js/ui.js`), so the app works on Pages (under `/BuildCraft/master-v1/`), on Firebase (at the root) and locally.
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

- **The app:** `python3 master-v1/tools/serve.py` (no-cache, port 8765), then open `http://127.0.0.1:8765/master-v1/`. It vendors three.js and runs offline.
- **Leaderboard dashboard:** `http://127.0.0.1:8765/master-v1/leaderboard.html?demo` shows labelled sample data without Firebase.
- **Tests:** `npm test` and `npm run calibrate` in `master-v1/` (Node 18+, no installs).
- **Older versions:** `python3 -m http.server 8000` from the repo root, then `http://localhost:8000/development/<folder>/`. Tycoon tests: `node --test development/building-tycoon/tests/*.test.mjs`.

## Gotchas

- **Browsers cache ES modules hard.** After an edit, hard-refresh or use the no-cache server. Pages itself caches for about 10 minutes.
- **The three.js games and sky-high are minified single files.** Reformat to read them, keep the single-file shape, and test in a browser after any edit.
- **`buildcraft-3d` and `interactive` save different JSON formats.** Both say `version: 3`, but neither loads the other's files.
- **The learning hub carries Abacus.AI hosting config:** `.yarnrc.yml` has a host-specific global cache path, `next.config.js` sets `ignoreBuildErrors`, and `layout.tsx` loads an Abacus script. Its `STYLE_GUIDE.md` is the generic Abacus template.
- **Renaming an item key or reordering options in `master-v1/js/data.js`** breaks several things:
  - saved leaderboard `choices`, which are stored as option numbers
  - `CAST[].loves`
  - hard-coded keys in `sim.js` (`lift`, `wc`, `soil`, …)
  - the speech-bubble lines in `main.js`

  Add new items instead of renumbering.
- **Leaderboard fields are checked twice:** `firestore.rules` must match what `submitScore()` sends. Change both together and redeploy the rules (`firebase deploy --only firestore:rules`), or every post is refused.
- **The Firebase `apiKey` is public by design.** Access is controlled by `firestore.rules`; restrict the key to the game's domains in Google Cloud. Never put a service-account key or other secret in the repo.

## Shared vocabulary

- **Brief → design → year → results:** the loop every version shares. Master V1 adds a name prompt and the island map in front, and the leaderboard after.
- **Hazard rules differ per game.**
  - **v0.1/v0.2:** each hazard (snow, wind, flood, hail, cold, heat) has a 0–10 rating set by the decisions in `GAME.governs`, and the weakest one wins. `damage = max(0, intensity − rating) × repair cost per point`.
  - **Master V1:** hazards are quake, wind, flood and heat, with power 1–4 against a strength that starts at 1 and grows with upgrades.
    - Each point the hazard wins by costs 25% of the building's health.
    - Fire strength exists for sprinklers, but the fire event itself is still a `PLAN.md` task.
    - The sim counts 360 days; players see 52 weeks.
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

Many of these shipped on 2026-10-27/28; `PLAN.md` shows what's done and what's open. The earlier versions live in `development/` as idea sources, kept in the repo but not published.

## Decisions log

Add new entries at the top: date, decision, who decided.

- 2026-10-28: Repo restructured (Anand):
  - Only the app (`master-v1/`) and a home page are published.
  - Every earlier version moved to `development/`, kept in the repo but not published (`_config.yml`).
  - nabdo's story-mode zip unzipped into `development/learning-hub-nextjs/`.
  - Logan's folders got READMEs.
- 2026-10-28: Shared leaderboard on Firestore (project `buildcraft-4eee7`): opt-in, nickname only, REST with no SDK, dashboard at `master-v1/leaderboard.html` (Anand).
- 2026-10-27: Master V1 hosted on Firebase for the NCSEA Hackathon demo, at https://buildcraft.quest (Anand).
- 2026-10-27: Master V1 merged into `main` (Anand, PR #4).
- 2026-10-27: Master V1 review meeting. Master V1 is the main game. The upgrade tasks are in `PLAN.md`, claimed with initials and ticked when merged (team).
- 2026-10-27: Master V1 built on branch `master_V1` from the team's favourite ideas (Anand).
- 2026-10-27: `interactive/` and `earthquake-tower/` (Logan) listed in the launcher and README. The folders stay where Logan put them.
- 2026-10-27: Building Tycoon added as a prototype (Tom, PR #2).
- 2026-10-27: Repo organized into team mainline vs prototypes, with a launcher that lists every version. Old mainline folders are never edited (PR #1).
- 2026-10-27: Starter "Build It!" (v0.1) set up with one file per squad and no build step (andrewdsundal).
