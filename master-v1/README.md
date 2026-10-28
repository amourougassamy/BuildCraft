# BuildCraft Master V1

This is the "master" version. It combines what the team liked best from the earlier versions:
- **Alex's version:** a game made for kids, a coin jar, Code Minimum vs. Beyond Code choices, matching foundations to the soil, and repairs.
- **v0.2:** happy, sad and ghost moods, a pet, celebrations and Gentle mode.
- **Tom's tycoon:** a 3D building that people walk in and out of, with an emoji over each head that shows how they feel.

This README covers the game itself. For the project overview, running it locally and deploying, see the [root README](../README.md).

## Play

- **Online:** https://buildcraft.quest. It's also at https://buildcraft-4eee7.web.app and https://amourougassamy.github.io/BuildCraft/master-v1/.
- **Leaderboard:** https://buildcraft.quest/leaderboard.html. Add `?demo` to preview it with sample data.
- **Locally:** the game uses ES modules, so it needs `http://`, not `file://`. From the repo root:

  ```
  python3 master-v1/tools/serve.py    # then open http://127.0.0.1:8765/master-v1/
  ```

Three.js (0.160.1) is copied into `vendor/`, so the 3D works without internet. The only online extras are the Google font (it falls back to a system font) and the leaderboard (its buttons hide when it's off or unreachable).

## Hosting (Firebase)

The game is static files: about 210 KB compressed per player, and no server code. `firebase.json` in this folder publishes only this folder, and also holds the leaderboard's database rules (`firestore.rules`).

```
cd master-v1
firebase deploy --only hosting --project buildcraft-4eee7                   # the game
firebase deploy --only hosting,firestore:rules --project buildcraft-4eee7   # game + leaderboard rules
```

- **Windows PowerShell:** type `firebase.cmd`.
- **Preview first:** `firebase hosting:channel:deploy preview --project buildcraft-4eee7` gives you a private link for 7 days.
- **If a deploy goes wrong:** Firebase console → Hosting → Previous releases → ⋮ → Rollback.
- **Custom domain:** `buildcraft.quest` is set up in Firebase console → Hosting, with DNS at Porkbun (an A record and a TXT record).

## Leaderboard

| File | What it does |
| --- | --- |
| `js/board-config.js` | Firebase `apiKey` and `projectId`. An empty `apiKey` switches the leaderboard off |
| `js/board.js` | Talks to Firestore with plain `fetch`, no SDK: anonymous sign-in, posting a score with the server's time, and reading the newest 1000 |
| `js/board-stats.js` | Pure helpers: `cleanName()`, `topPerSite()`, `champions()`, `funStats()`. Tested in `tests/board-stats.test.mjs` |
| `leaderboard.html`, `js/leaderboard.js`, `css/leaderboard.css` | The dashboard. Refreshes every 15 s |
| `firestore.rules` | Anyone can read. A signed-in player can only add a score with exactly the right fields, their own uid and the server's time. No edits or deletes |

**Posting is opt-in.** The report card has an "Add me to the leaderboard" button. It sends:
- the first name or nickname, cleaned to letters, numbers and spaces, up to 12 characters, with a word filter
- the site, score and grade
- eco points and ghosts
- whether the site was passed
- the design's option numbers, which the dashboard uses for "most-picked upgrades"

How to switch it on is in the [root README](../README.md#leaderboard). Scores are calculated in the browser, so a determined person could fake one. That's fine for a classroom board.

## How a game goes

1. **Name.** The kid types their name. Foreman Fran uses it throughout the game.
2. **World map.** A clay island you can drag around. It holds 5 sites, easiest first. A site stays locked (🔒) until the one before it gets a **C or better**. Passed sites show 🏆 / ⭐ / ✅.
3. **Mission brief.** Each site is a fixed scenario:
   - the building, its floors and the budget
   - the soil, and which foundation it needs
   - the year's weather, month by month

   Retrying a site plays the same year, so kids can learn from it.
4. **Design, all on one screen.** Sections of choices: Structure, Outside, Inside, Power & Air, People Systems (2+ storeys only), Eco. Each button shows icon, name and cost; Fran explains what it does when you tap it.
   - **Soil report:** the ground is a mystery (❓) until you buy a 🔬 Soil Report for 2 coins. Then Fran names the soil, shows its layers (topsoil down to rock, from `SOILS[...].layers` in `data.js`) and says which foundation it needs. The soil layers also appear under the building in 3D.
   - **People Systems:** stairs or an elevator, and enough or extra restrooms. The taller the building, the more they matter to happiness (`systemsHappy()` in `js/sim.js`).
   - The cash-flow strip shows **Budget − Building − Upgrades = Repair fund**.
   - Meters show strength against this site's worst weather and whether the foundation suits the soil.
   - You can't run while over budget.
   - Drag to orbit, right-drag (two fingers) to pan. Orbit down past the grass to look under the ground at the foundation.
5. **Run the year (forward only).** The design is locked once the year starts. The year is shown as 52 weeks and takes about 45 s at 1× (⏩ for 2× / 4×). Inside, the sim still counts 360 days.
   - People walk in fast and bouncy and earn coins. They say what they think in speech bubbles ("Nice view! 😍", "Heat wave! 🥵").
   - Hazards come with a warning banner and an over-the-top shake, wind or flood.
   - When something breaks, tap **🔧** to fix that part. It costs coins, and the doors stay closed while the crew works (downtime).
   - A hazard that beats the building by 2 or more turns someone, or Biscuit the dog, into a floating ghost 👻 (🩹 in Gentle mode).
6. **Report card or game over.**
   - **Report card:** a grade for each subject (Safety, Happiness, Open Weeks, Eco Points, Budget), an overall grade from A+ to F, stars, and Fran's tips based on what actually happened. If the leaderboard is on, you can choose to post your score.
   - **Game over:** the building collapses, or it stays closed for 45 days with no coins for a repair.

## Files

| File | What it does |
| --- | --- |
| `js/data.js` | **All numbers to tune:** sites, choices, hazards, timing, grade cutoffs, report-card weights |
| `js/sim.js` | The rules. Pure (no DOM, no randomness), so the same design and the same repair taps always give the same year |
| `js/scene.js` | Clay-style Three.js: the site, people and pet, hazard effects, the helicopter that flies in the rooftop heating and cooling unit, and the island map |
| `js/main.js` | The screens and game flow, speech bubbles, and the ℹ️ About page with the team |
| `js/fx.js` | Confetti and synth sounds (copied from v0.2) |
| `js/board*.js`, `js/leaderboard.js` | The shared leaderboard (see above) |
| `tests/sim.test.mjs`, `tests/board-stats.test.mjs` | `npm test` runs both (Node 18+, no installs) |
| `tools/calibrate.mjs` | Plays every affordable design on every site and prints the grade spread: `npm run calibrate` |

## How the rules work (so you can explain them)

- **Strength.** Every building starts at strength 1 against each hazard (Code Minimum). Upgrades add to it (shown on each choice, for example 🌋+2).
  - A foundation that is too small for the soil loses 1 strength in quakes, and 2 on wet sand (liquefaction).
  - It also sinks twice a year.
- **Damage.** A hazard's power (1 to 4) minus the building's strength is how much it wins by. Each point costs 25% of the building's health.
  - Below 50% health the doors close.
  - At 0% the building falls down.
- **Heat waves** never break anything. If cooling (heat pump, shade trees) is weaker than the heat, people get hot and less happy.
- **Power outages.** A hazard of power 2 or more knocks out power for 20 days. A generator, or solar + battery, keeps the doors open. Solar without a battery switches off in a blackout, and the game teaches that.
- **Fire sprinklers** (Inside → Fire Safety) add 🧯+2 fire strength, and a red pipe shows under each ceiling. No site has a fire yet (that comes with `PLAN.md` task S4), so for now they only cost coins.
- **People Systems** (2+ storeys only). A building without an elevator loses happiness: 4 points at 2 storeys, 10 at 3+. An elevator adds 4, or costs 4 during a blackout with no backup power. Extra restrooms add 2 per storey. See `systemsHappy()` in `js/sim.js`.
- **Report card.** Weighted average: Safety 30, Happiness 25, Open Weeks 20 (doubled for the hospital), Eco 15, Budget 10.
  - Grade cutoffs: A+ ≥ 90, A ≥ 85, B ≥ 75, C ≥ 65, D ≥ 50.
  - Any ghost caps the score at 84 (a B).

Run `npm run calibrate` after changing numbers in `data.js`. It checks that every site can still be passed and that the cheapest design isn't enough on the harder sites.

**This is a game, not engineering.** The cause and effect points the right way: piles on soft soil, braces and isolators for quakes, straps for wind, raised floors for floods. Every number is made up to teach the big ideas, and none of it is a structural analysis or a code check.
