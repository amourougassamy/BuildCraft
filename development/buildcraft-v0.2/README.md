# BuildCraft v0.2

Kids are the boss of a real building: 4 million coins, a library by the river, and six regulars who live with every choice. Pick Good / Better / Best cards, cut the ribbon, then watch a year of wild weather hit. The people inside end up happy, sad, or floating away as ghosts.

## Run it

Open `index.html` in a browser. No installs, no build step. This folder is kept in the repo for reference and is not published online.

Need one file to share? `python3 tools/bundle.py` writes `dist/buildcraft.html`.

## What's new since v0.1

- Kid look: chunky toy-box panels, bright colors, picture cards, a coin jar instead of a budget table
- Rivet the beaver as the guide, Rosa the librarian as the client
- Six regulars (Maya, Mr. Okafor, Rosa, Leo, Priya, Biscuit the cat) who smile when you build what they love
- Grand opening with ribbon cutting, confetti and coin rain
- Storms with a grumpy storm cloud, shaking building, silly damage (fish in the lobby, caved-in roof)
- Happy / sad / ghost moods; any ghost caps the result at 2 stars
- **Gentle mode** switch: ghosts become "off to the hospital" with an ambulance
- Stars, "New record!", fireworks, five badges, and sound effects (with a mute switch)
- A "For grown-ups" panel with the real numbers

## Who owns what

| File | Squad | What's in it |
| --- | --- | --- |
| `js/data.js` | 3. Content | Every number and every word: cards, cast, storms, badges, speech |
| `js/sim.js` | 2. Game logic | Coins, powers, storms, moods, stars, badges |
| `js/art.js` | 5. Art | The dollhouse building, the cast, ghosts, storm effects, card pictures |
| `js/fx.js` | 5. Art + 4. UI | Confetti, coins, fireworks, sparkle bursts, sound effects |
| `js/ui.js` | 4. UI | The five screens and click handling |
| `css/styles.css` | 4. UI + 5. Art | The toy-box look and every animation |

## How moods work

- **Before any storm:** a regular is happy if you built at least one thing they love (see `cast[].loves`), otherwise sad.
- **A storm beats a power by 1–2:** regulars who worry about that hazard turn sad.
- **A storm beats a power by 3+** (snow, wind, flood or cold only): the most exposed regular becomes a ghost (`cast[].exposure`).
- Hail and heat can make people sad but never create ghosts.

## Demo path (3 minutes)

1. Meet → Build → **Demo shortcuts: The Bargain** → Build it! → Cut the ribbon. Everyone's a bit grumpy.
2. Spring flood: Biscuit floats away. Summer hail cracks windows. Winter blizzard caves in the roof: Mr. Okafor floats away. 1 star.
3. **Play again (same storms)** → **The Long Game** → Build it! Everyone smiles, every storm gets a "Nailed it!", 3 stars, fireworks, five badges.
