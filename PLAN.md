# Master V1 upgrade plan

The task board for the next round of work on **Master V1** (`master-v1/`, built by Anand, merged into `main` in PR #4). It comes from the team's review meeting on 2026-10-27. Pick a task, claim it with your initials, and tick it when it's merged.

## How to use this board

> **Claim first, then code.** The moment you start a task, put your initials on it here and push to `main`, before you write any code. That's how teammates see what's taken and avoid doing the same work twice. A task with no initials is free; a task with initials and ⬜ is in progress.
>
> **Agents:** your first step on any task is to pull `main` and check the **Who** cell. If it's empty, put your human's initials in it and commit and push that one-line change to `main` right away. If someone else's initials are there, pick a different task. Your last step, once the PR is merged, is to change ⬜ to ✅ and push.

1. **Claim a task:** put your initials in its **Who** cell (e.g. `TK`) and commit to `main`. This board always lives on `main`, and editing it on GitHub with the pencil icon is the quickest way. Add yourself to the [Team](#team) table the first time. Two people can pair on a task: `TK+AM`.
2. **Build it** on your own branch (see [Workflow](#workflow)), one task per PR, with the task ID at the start of the PR title (`B1: see-through building on hover`).
3. **Finish:** once your PR is merged, change the task's **Done** cell from ⬜ to ✅.
4. **New idea?** Add a row at the bottom of the right section with the next free ID, and describe it under [Task details](#task-details).

Sizes: **S** is under an hour, **M** is 1–3 hours, **L** is half a day or more.

## Board

| ID | Task | Area | Size | Needs | Who | Done |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Merge `master_V1` into `main` so Master V1 goes live | Setup | S | | Anand | ✅ |
| U3 | Remove the Furniture option (Basic / Cozy & Colorful) | UI | S | | TK | ✅ |
| M4 | Level 1 can fail: running without changes should not pass | Levels | S | | ADAR | ⬜ |
| M5 | Bigger buildings: at least 2 storeys and a larger footprint | Levels | M | | ADAR | ⬜ |
| M6 | L-shaped building (re-entrant corner) on a later level | Levels | M | M5 | | ⬜ |
| M3 | Soil profiles: show the ground layers under each site | Levels | M | | ADAR | ⬜ |
| M2 | River site on really bad soil (river next to Breezy Bay) | Levels | M | M3 | | ⬜ |
| M1 | World map shows what each site sits on: mountain, city, river | Map | M | | TK | ⬜ |
| B1 | Building turns see-through when you hover over it | Building | M | | | ⬜ |
| B2 | People doing activities inside (reading at desks in the library…) | Building | L | B1 | | ⬜ |
| B3 | Buildings look more structural and realistic, less like a box | Building | L | M5 | | ⬜ |
| B4 | Bigger ground so the edges of the grass never show | Site | S | | TK | ✅ |
| B5 | City around the site: neighbouring buildings, streets, lane markings | Site | M | B4 | TK | ⬜ |
| B6 | Cars drive up and drop people off | Site | M | B5 | TK | ⬜ |
| P1 | People say things (speech bubbles), not only emoji faces | People | M | | TK | ✅ |
| U1 | Clean up the cluttered right panel on the design screen | UI | M | | ADAR | ⬜ |
| U2 | Drawing sheet: a plan-view mini drawing that updates as you choose | UI | L | U1 | | ⬜ |
| S1 | Elevators for taller buildings | Systems | M | | | ⬜ |
| S2 | Number of restrooms for bigger buildings | Systems | S | | ADAR | ⬜ |
| S3 | Fire sprinklers: yes / no option | Systems | S | | TK | ✅ |
| S4 | Fire event (and a MEGA "flaming tornado") | Systems | M | S3 | | ⬜ |
| S5 | A helicopter flies in the rooftop HVAC unit | Systems | M | | TK | ✅ |

**Suggested order:** do **0** and **U3** first. U3 touches `data.js`, `sim.js` and the tests that everyone else builds on. After that, tasks in different areas can run in parallel.

## Task details

Paths are inside `master-v1/`. Every task that changes `js/data.js` or `js/sim.js` also runs `npm test` and `npm run calibrate`, and updates `tests/sim.test.mjs` when a rule changes.

### Setup

- **0 · Merge `master_V1` into `main`.** Merging publishes https://amourougassamy.github.io/BuildCraft/master-v1/. The branch also edits the root `index.html` and `README.md`, so pull `main` first and resolve any conflict there.
  - **Done when:** the live link opens Master V1 and the launcher lists it as *latest*.
  - **Owner:** Anand.

### Levels and soil

- **M4 · Level 1 can fail.** Today, running Rocky Ridge with every Code Minimum choice still passes, which is too easy.
  - **How:** tune its `events` (power or count) in `LEVELS`, `js/data.js`.
  - **Done when:** the all-defaults design gets below a C on Rocky Ridge; one sensible upgrade still passes; a test in `tests/sim.test.mjs` locks both in.
- **M5 · Bigger buildings.** Raise the minimum to 2 storeys (Rocky Ridge is 1 today) and enlarge the footprint. The size is hard-coded in `createSite()` in `js/scene.js` (`W = 9, D = 7, FH = 2.6`), so move it into `LEVELS`.
  - **Done when:** every site has at least 2 storeys; buildings read clearly at the default zoom; the people's walk paths and the door still line up.
- **M6 · L-shaped building.** Give a later site (Shaky Hills or Mega City) a re-entrant corner. A `shape: "L"` field in `LEVELS` drives the geometry. Optional teaching hook: re-entrant corners are a known weak spot in quakes, so it could need one more quake strength.
  - **Done when:** that site builds an L; its walls, roof and door work; the brief mentions the corner.
- **M3 · Soil profiles.** Give each soil in `SOILS` (`js/data.js`) a stack of layers (name, thickness, colour), for example topsoil / soft clay / rock. Draw it as a cross-section under the building in `createSite()`; today the soil there is see-through so the foundation shows.
  - **Done when:** each site shows its layers; footings, mat or piles visibly reach the right layer (piles reach rock); the mission brief shows the profile.
- **M2 · River site on bad soil.** Put a river beside Breezy Bay in its site view and on the map, and make it the "really bad soil" level (wet, soft ground near water; review its `soil` and events).
  - **Done when:** the river shows in the site scene and on the map; that site's soil profile (M3) reads as the worst so far; calibrate still finds a passing design.

### World map

- **M1 · The map shows what each site sits on.** Rocky Ridge on a mountain, Mega City with a skyline of buildings, Breezy Bay with a river and beach. The code is in `createMap()` in `js/scene.js`, with marker positions in each level's `map: [x, z]`.
  - **Done when:** each site marker sits on matching terrain, and kids can tell the sites apart before reading the labels.

### Building

- **B1 · See-through on hover.** Raycast from the mouse to the building group in `createSite()`; while hovered, fade the walls and roof to about 30% opacity.
  - **Gotcha:** after changing `transparent` on a three.js material, set `material.needsUpdate = true`. See `applyHeatView()` in `prototypes/building-tycoon/js/scene.js`.
  - **Done when:** hovering shows the floors and people inside; leaving restores it; it works on touch (tap to toggle).
- **B2 · Activities inside.** Each building type gets a scene: library (desks and people reading), school (class), aquarium (tanks), hospital (beds), apartments (sofas). Tycoon has desks with seated people to copy from (`deskPos()` and `makePerson()` in `prototypes/building-tycoon/js/scene.js`).
  - **Done when:** with B1 hover on, each of the five building types shows its own activity.
- **B3 · More structural look.**
  - Show slabs at each floor, columns at the corners and bays, and a visible roof edge.
  - When **Braced Steel** is picked, show X-braces on the facade.
  - **Shake Absorbers** show as pads under the base; the foundation choice shows below grade.
  - **Done when:** each structure choice changes the 3D model visibly, so a kid can point at what they bought.
- **B4 · Bigger ground.** Today the grass platform in `createSite()` is `rbox(28, 0.8, 22, …)`. Enlarge it, or fade the edges into fog, so the edge never shows at any allowed zoom or pan.
  - **Done when:** no edge is visible at maximum zoom-out.
- **B5 · City around the site.** Simple low-detail neighbouring buildings, a street with lane markings and sidewalks in the site view. Look per site: farm for Prairie, beach for Breezy, towers for Mega City.
  - **Done when:** every site has context around it and still runs smoothly on a laptop.
- **B6 · Cars drop people off.** Cars drive along the B5 street, stop at the door, people get out and walk in; they leave the same way.
  - **Done when:** some arrivals come by car, and the run speed (1×/2×/4×) still feels right.

### People

- **P1 · People say things.** Short speech bubbles tied to what's happening: "Heat wave! 🥵", "Nice view!", "Power's out!", "The floor's soggy!". Pick lines from the sim's feed (`emit()` in `js/sim.js`) and each person's mood.
  - **Reuse:** Tom's tycoon has a working bubble system: the `SAY` lines plus `say()`/`frame()` in `prototypes/building-tycoon/js/ui.js`, positioned with `screenPos()` in its `scene.js`.
  - **Done when:** at most two or three bubbles show at once; they follow the person; the lines match the moment.

### Design screen

- **U3 · Remove Furniture.** Delete the `furniture` item from `SECTIONS` in `js/data.js`. Grandpa Gus's `loves` points at it, so give him another favourite. Re-balance happiness and check the calibrate output.
  - **Done when:** the option is gone, the tests pass, and every site still has a passing design.
- **U1 · Clean up the right panel.** The panel in `renderDesign()` in `js/main.js` shows the cash strip, the checks and five sections at once, which feels busy.
  - **Step 1:** sketch two options and get a quick team vote. Ideas: one section at a time behind tabs; collapse the meters into one row; show the tips only on hover.
  - **Step 2:** build the winner.
  - **Done when:** the team agrees it reads cleanly at laptop size, and every choice is still reachable in one click.
- **U2 · Drawing sheet.** During design, show a small drawing-set sheet: a plan view, or an elevation with a title block (sheet IDs like A-101 / S-201, as in v0.1). It updates as options are picked: braces appear on the elevation, piles in the section, trees on the site plan. Doubles as an explainer.
  - **Done when:** each structural or outside choice changes the drawing, and it fits the cleaned-up panel (U1).

### New systems

- **S1 · Elevators.** For taller buildings (Mega City, or 3+ storeys): a "Stairs only / Elevator" choice. No elevator in a tall building means unhappy visitors; an elevator stops in a blackout unless there's backup power.
  - **Done when:** the choice shows only where it matters, it has a sim effect plus a test, and Fran explains it.
- **S2 · Restrooms.** A "Few / Enough / Plenty" choice scaled by building size; too few means unhappy people and a speech-bubble hook for P1.
  - **Done when:** the effect shows on bigger sites, with a test.
- **S3 · Fire sprinklers.** A yes / no option (under Power & Air, or a new Safety section). It adds fire strength once S4 exists.
  - **Done when:** the option exists with a cost and a tip, and `designStats()` carries a `fire` stat.
- **S4 · Fire event.** A new hazard `fire` in `HAZARDS` and `BREAKS`, added to some levels' `events`, plus flames or smoke in the scene. Sprinklers (S3) reduce the damage. Fun extra: a MEGA "flaming tornado".
  - **Done when:** fire appears on at least one site, sprinklers visibly save the day, tests cover both outcomes, and calibrate passes.
- **S5 · Helicopter delivers the HVAC unit.** When the year starts (or when a heating and cooling upgrade is picked), a helicopter flies in and lowers the rooftop unit onto the roof.
  - **Reuse:** copy `makeHeli()`, `heliDeliver()` and `updateHelis()` from `prototypes/building-tycoon/js/scene.js` (cable, landing ring, puff).
  - **Done when:** the unit arrives by helicopter, the scene doesn't hitch, and the unit stays on the roof afterwards.

## Workflow

- **Base branch:** `main` (Master V1 was merged into it in PR #4). Open your PR back into `main`.

  ```sh
  git fetch origin
  git checkout -b <initials>/<task-id>-short-name origin/main   # e.g. tk/b1-hover-see-through
  ```

- **Run it:** `python3 master-v1/tools/serve.py`, then open http://127.0.0.1:8765/master-v1/.
- **Check it:** from `master-v1/`, run `npm test` and `npm run calibrate`. Play the site you changed.
- **Keep PRs small:** one task each, and pull the base branch again before pushing.
- **Busy files:** most tasks touch `js/data.js`, `js/scene.js` or `js/main.js`.
  - In `data.js`, add your new fields and items next to the ones like them, so different tasks rarely edit the same lines.
  - In `scene.js`, keep changes inside the function you're working on (`createSite()` or `createMap()`), and add new helpers in their own block.
  - Say in the team chat when you start on `renderDesign()` (U1, U2, U3) or `createSite()` building geometry (M5, M6, B3), because several tasks share them.

## Team

Add your name and initials so the **Who** column makes sense.

| GitHub | Name | Initials |
| --- | --- | --- |
| amourougassamy | Anand | |
| tkovalcik-stru-ai | Tom Kovalcik | TK |
| asundal022 / andrewdsundal | Andrew | |
| LoganPatri | Logan | |
| nabdo1451 | | |
| Radarino | | |
| cnavea | | |
| SSOEkramer | | |
| | Alex | ADAR |
