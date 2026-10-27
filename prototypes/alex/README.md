# BuildCraft (Alex's versions)

Single-file HTML games. Open any file in a browser to play; no install needed.

| File | What's in it |
| --- | --- |
| [`index.html`](index.html) | **Latest (v4).** Clay-style look. Pick a town on a clickable map, then a building type and floors. A tight budget, a 60-second build, then four seasons: each one starts with a dice roll that decides the weather, followed by a "What can you do now?" panel (repair, upgrade, save, open). A ticket-jar meter shows money earned from visitors. Foundations must match each town's soil. |
| [`v3.html`](v3.html) | 12-month year with surprise hazards and warnings, money as $ signs, happiness needle meter, fast-forward button. |
| [`v2.html`](v2.html) | Live scene with people walking in and out, five option categories (Structural, Architectural, Interior Design, MEP, Sustainability), each with Code Minimum vs. Beyond Code choices. One-off hazard tests. |
| [`v1-build-it-strong.html`](v1-build-it-strong.html) | First slim prototype: four categories, a $100 budget, and a happiness meter. |

## Changing the numbers (v4)

Everything to tune is near the top of the `<script>` in `index.html`:

- `BUILD_MS`, `SEASON_MS`, `HAZARD_MS`: timing (60 s build, 25 s per open season, 3.5 s hazard)
- `FLOOR_COST`, `RETROFIT`, `REPAIR_COST`: money rules (all money is whole $ signs)
- `SPEEDS`: fast-forward speeds; `GREEN_ZONE`, `RED_ZONE`: where the happiness meter turns green or red
- `SOILS`: soil types and the foundation level each one needs
- `TOWNS`: budget, soil, map position, and the weather dice (what each face 1-6 brings)
- `TYPES`: building types, visitors per $ earned, and mission
- `CATS`: every option in the shop, with cost and effects
