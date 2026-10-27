# BuildCraft Master V1

This is the "master" version. It combines what the team liked best from the earlier versions:
- **Alex's version:** a game made for kids, a coin jar, Code Minimum vs. Beyond Code choices, matching foundations to the soil, and repairs.
- **v0.2:** happy, sad and ghost moods, a pet, celebrations and Gentle mode.
- **Tom's tycoon:** a 3D building that people walk in and out of, with an emoji over each head that shows how they feel.

## Play

- **Online:** https://amourougassamy.github.io/BuildCraft/master-v1/
- **Locally:** the game uses ES modules, so it needs `http://`, not `file://`. From the repo root:

  ```
  python3 master-v1/tools/serve.py    # then open http://127.0.0.1:8765/master-v1/
  ```

Three.js (0.160.1) is copied into `vendor/`, so the 3D works without internet. The only online extra is the Google font, and the game falls back to a system font without it.

## Hosting for a live demo (Firebase)

The game is static files: about 210 KB compressed per player, and no server code. A room of 200 players downloads roughly 42 MB in total, which any CDN serves easily. `firebase.json` in this folder publishes it with Firebase Hosting:

```
npm install -g firebase-tools
firebase login
cd master-v1
firebase deploy --only hosting --project <your-firebase-project-id>
```

**Custom domain (Porkbun):**
1. Firebase console → Hosting → **Add custom domain** → enter `buildcraft.quest`.
2. Copy the TXT and A records Firebase shows into Porkbun → Domain Management → DNS.
3. SSL turns on by itself once DNS checks out. This can take from minutes to a few hours, so do it the day before.

**On the day:** the network in the room matters more than the host. If the Wi-Fi is shaky, have a few laptops open the game ahead of time. Once loaded, it runs with no connection.

## How a game goes

1. **Name.** The kid types their name. Foreman Fran uses it throughout the game.
2. **World map.** A clay island you can drag around. It holds 5 sites, easiest first. A site stays locked (🔒) until the one before it gets a **C or better**. Passed sites show 🏆 / ⭐ / ✅.
3. **Mission brief.** Each site is a fixed scenario:
   - the building, its floors and the budget
   - the soil, and which foundation it needs
   - the year's weather, month by month

   Retrying a site plays the same year, so kids can learn from it.
4. **Design, all on one screen.** Sections of choices: Structure, Outside, Inside, Power & Air, People Systems (2+ storeys only), Eco. Each button shows icon, name and cost; Fran explains what it does when you tap it.
   - **Soil report:** the ground is a mystery (❓) until you buy a 🔬 Soil Report for 2 coins. Then Fran names the soil and the foundation it needs, and the soil shows its colour in 3D.
   - **People Systems:** stairs or an elevator, and enough or extra restrooms. The taller the building, the more they matter to happiness (`systemsHappy()` in `js/sim.js`).
   - The cash-flow strip shows **Budget − Building − Upgrades = Repair fund**.
   - Meters show strength against this site's worst weather and whether the foundation suits the soil.
   - You can't run while over budget.
   - Drag to orbit, right-drag (two fingers) to pan. Orbit down past the grass to look under the ground at the foundation.
5. **Run the year (forward only).** The design is locked once the year starts. The year is shown as 52 weeks and takes about 45 s at 1× (⏩ for 2× / 4×). Inside, the sim still counts 360 days.
   - People walk in fast and bouncy and earn coins.
   - Hazards come with a warning banner and an over-the-top shake, wind or flood.
   - When something breaks, tap **🔧** to fix that part. It costs coins, and the doors stay closed while the crew works (downtime).
   - A hazard that beats the building by 2 or more turns someone, or Biscuit the dog, into a floating ghost 👻 (🩹 in Gentle mode).
6. **Report card or game over.**
   - **Report card:** a grade for each subject (Safety, Happiness, Open Weeks, Eco Points, Budget), an overall grade from A+ to F, stars, and Fran's tips based on what actually happened.
   - **Game over:** the building collapses, or it stays closed for 45 days with no coins for a repair.

## Files

| File | What it does |
| --- | --- |
| `js/data.js` | **All numbers to tune:** sites, choices, hazards, timing, grade cutoffs, report-card weights |
| `js/sim.js` | The rules. Pure (no DOM, no randomness), so the same design and the same repair taps always give the same year |
| `js/scene.js` | Clay-style Three.js: the site, people and pet, hazard effects, the helicopter that flies in the rooftop heating and cooling unit, and the island map |
| `js/main.js` | The screens and game flow |
| `js/fx.js` | Confetti and synth sounds (copied from v0.2) |
| `tests/sim.test.mjs` | Rule tests: `npm test` (Node 18+, no installs) |
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
- **Report card.** Weighted average: Safety 30, Happiness 25, Open Days 20 (doubled for the hospital), Eco 15, Budget 10.
  - Grade cutoffs: A+ ≥ 90, A ≥ 85, B ≥ 75, C ≥ 65, D ≥ 50.
  - Any ghost caps the score at 84 (a B).

Run `npm run calibrate` after changing numbers in `data.js`. It checks that every site can still be passed and that the cheapest design isn't enough on the harder sites.

**This is a game, not engineering.** The cause and effect points the right way: piles on soft soil, braces and isolators for quakes, straps for wind, raised floors for floods. Every number is made up to teach the big ideas, and none of it is a structural analysis or a code check.
