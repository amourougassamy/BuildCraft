# BuildCraft (Alex's versions)

Single-file HTML games. Open any file in a browser to play; no install needed.

| File | What's in it |
| --- | --- |
| [`index.html`](index.html) | **Latest (v3).** Pick a town, building type and floors. 90-second build, then a 12-month year with surprise earthquakes and windstorms, visitor income, retrofits, repairs, and an end screen with stars. Foundations (shallow / mat / deep piles) must match the town's soil, with a cut-away view of the ground. Money is shown as $ signs, happiness as a needle meter, and a ⏩ button speeds up the months (1×, 2×, 4×). |
| [`v2.html`](v2.html) | Live scene with people walking in and out, five option categories (Structural, Architectural, Interior Design, MEP, Sustainability), each with Code Minimum vs. Beyond Code choices. One-off hazard tests. |
| [`v1-build-it-strong.html`](v1-build-it-strong.html) | First slim prototype: four categories, a $100 budget, and a happiness meter. |

## Changing the numbers (v3)

Everything to tune is near the top of the `<script>` in `index.html`:

- `MONTH_MS`, `BUILD_MS`, `WARN_MS`: timing (15 s per month, 90 s build, 10 s storm warning)
- `FLOOR_COST`, `RETROFIT`, `REPAIR_COST`: money rules (all money is whole $ signs)
- `SPEEDS`: fast-forward speeds; `GREEN_ZONE`, `RED_ZONE`: where the happiness meter turns green or red
- `SOILS`: soil types and the foundation level each one needs
- `TOWNS`: budget, soil, and weather events for each town
- `TYPES`: building types, visitor fee, and mission
- `CATS`: every option in the shop, with cost and effects
