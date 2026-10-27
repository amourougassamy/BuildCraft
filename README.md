# Build It!

A browser game that puts students in the client's seat: one library, a $4.0M budget, every feature a cost decision, then a Minnesota year of weather tests the choices.

## Run it

No build step, no installs. Open `index.html` in a browser, or serve the folder:

```
python3 -m http.server 8000
# then open http://localhost:8000
```

Publish: push to GitHub and turn on **Settings → Pages** for the main branch root.
Need a single file to share? `python3 tools/bundle.py` writes `dist/build-it.html`.

## Who owns what

| File | Squad | What's in it |
| --- | --- | --- |
| `js/data.js` | 3. Content and data | Every number: budget, options, costs, ratings, weather deck, reviews |
| `js/sim.js` | 2. Game logic | Costs, hazard ratings, energy, weather year, damage, meters, score |
| `js/building.js` | 5. Art and animation | The side-view SVG and all weather and damage effects |
| `js/ui.js` | 4. UI and UX | The four screens and click handling |
| `css/styles.css` | 4 and 5 | Layout, theme tokens, building art colors, animations |
| `index.html`, `tools/` | 1. Lead and integration | Page shell, load order, bundling |

Rule of thumb: content edits `data.js` only. If you need a new field, tell Squad 2.

## How the game works

1. **Brief** (`G-001`): client, budget, priorities (weights in `data.js`).
2. **Design** (`A-101`): pick a tier for each decision. Build is locked while over budget.
3. **Weather year** (`W-201`): construction (soils gamble), then four seasons. Each event's intensity is checked against the building's rating for that hazard:
   `damage = max(0, intensity - rating) x repair cost per point`
4. **Results** (`R-301`): four meters weighted by the brief, a client review, the lesson, and a comparison with the previous run.

Hazard ratings come from the decision listed in `GAME.governs` (the weakest wins when two decisions share a hazard), plus any `bonus` from extras.

## Demo path (3 minutes)

1. Design → **Quick start: The Bargain** → Build. Step through: flood, hail, blizzard. Score about 48.
2. **Redesign, same weather** → **Quick start: The Long Game** → Build. No damage. Score about 87, with a side-by-side table.

"Demo year" weather is fixed in `GAME.demoWeather` so both runs face the same storms. "Random year" rolls from the deck with a seed.

## Ideas for stretch goals

- Second scenario (Houston community center): add a new `scenario`, `weatherDeck` and `demoWeather`.
- Market surprise card during construction (steel price spike).
- Sound effects on storm and damage.
- Shareable results card.
