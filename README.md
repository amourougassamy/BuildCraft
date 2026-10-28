# BuildCraft

A kid-first building game made at the **NCSEA Hackathon 2026**.

You pick a site, test the soil and spend a coin budget on a building. Then a whole year of earthquakes, storms, floods and heat waves tests your choices. People walk in with emoji faces that show how they feel, and you finish with a school-style report card from F to A+. Along the way you learn how structure, architecture, building systems and sustainability work together.

## ▶ Play online

### **https://buildcraft.quest**

- Nothing to install. It runs in any modern browser, on laptops, tablets and phones.
- The same game is also at https://buildcraft-4eee7.web.app (Firebase) and https://amourougassamy.github.io/BuildCraft/ (GitHub Pages).
- 🏆 **Leaderboard:** https://buildcraft.quest/leaderboard.html. It goes live once the leaderboard is switched on; see [Leaderboard](#leaderboard).

## 💻 Run it on your own computer

The game is plain HTML and JavaScript with no build step and no install. It uses JavaScript modules, which browsers only load from a web address (`http://`), so double-clicking `index.html` won't work. You need a tiny local web server instead.

1. **Get the code.** Either:
   - `git clone https://github.com/amourougassamy/BuildCraft.git`, or
   - download https://github.com/amourougassamy/BuildCraft/archive/refs/heads/main.zip and unzip it.
2. **Start a server from the `BuildCraft` folder.** You need Python 3, which macOS and Linux already have. On Windows, install it from python.org or the Microsoft Store.

   ```
   python3 master-v1/tools/serve.py          # macOS / Linux
   py master-v1\tools\serve.py               # Windows
   ```
3. **Open http://127.0.0.1:8765/master-v1/.** Stop the server with Ctrl+C.

Notes:
- **Offline:** three.js is bundled in `master-v1/vendor/`, so the game runs without internet. Only the Google font and the online leaderboard need a connection, and both fail quietly.
- **No-cache server:** the bundled server turns off caching, so your edits show up on refresh. Any static server also works, for example `python3 -m http.server` or `npx serve`.
- **Tests:** need Node 18+ and no installs. Run `cd master-v1 && npm test`.

## 🚀 Deploy your own copy (Firebase Hosting)

The game is static files, about 210 KB compressed per player, so a free Firebase project serves a room of hundreds easily. All Firebase settings live in `master-v1/firebase.json`.

```
npm install -g firebase-tools          # once
firebase login                          # once
cd master-v1
firebase deploy --only hosting --project buildcraft-4eee7
```

On Windows PowerShell, if you see "running scripts is disabled", type `firebase.cmd` instead of `firebase`. To try a change before going live, use `firebase hosting:channel:deploy preview --project buildcraft-4eee7`; it gives you a private link that lasts 7 days. GitHub Pages also republishes automatically about a minute after every merge to `main`.

**Custom domain:** `buildcraft.quest` is connected in Firebase console → Hosting, with DNS at Porkbun (an A record and a TXT record).

## Leaderboard

Players can choose to post a score from the report card. Only a first name or nickname is sent (letters and numbers, up to 12 characters, with a word filter), along with the score. The **dashboard** (`master-v1/leaderboard.html`) shows:
- top 10 per site
- overall champions
- the grade spread
- the most-picked upgrades
- headline numbers

It refreshes every 15 seconds, so it works well on a big screen in the room. Add `?demo` to the address to preview it with labelled sample data.

**Switch it on (once):**
1. Firebase console → **Build → Firestore Database → Create database** (production mode).
2. **Authentication → Get started → Anonymous → Enable.**
3. **Project settings → Your apps → Web app (`</>`)**, then copy `apiKey` into `master-v1/js/board-config.js`.
4. Deploy the game and the database rules together: `firebase deploy --only hosting,firestore:rules --project buildcraft-4eee7`.
5. Recommended: in Google Cloud console → APIs & Services → Credentials, restrict the key to the HTTP referrers `buildcraft.quest/*`, `buildcraft-4eee7.web.app/*` and `amourougassamy.github.io/*`.

**Honest limits:**
- Scores are calculated in the player's browser, so a determined person could post a fake one. That's acceptable for a classroom board.
- The database rules still check every field, so only well-formed scores get in, and nobody can edit or delete them.

## Repo layout

```
index.html            Home page: Play, Leaderboard
master-v1/            The game (this is the current app). See master-v1/README.md
  js/                   data.js (numbers & words), sim.js (rules), scene.js (3D), main.js (screens),
                        board*.js (leaderboard), leaderboard.js (dashboard), fx.js (confetti & sound)
  tests/  tools/        npm test, npm run calibrate, the local server
  vendor/               three.js 0.160.1 (bundled so it works offline)
  firebase.json  firestore.rules
development/          Earlier versions and prototypes from the hackathon: kept in the repo for reference,
                      not published (_config.yml excludes it from GitHub Pages; Firebase deploys only master-v1/)
_config.yml           GitHub Pages settings (excludes development/)
docs/REPO_GUIDE.md    How the code is wired, for developers and coding agents
AGENTS.md             Standing instructions for coding agents (CLAUDE.md points here)
PLAN.md               Task board for the next round of work
```

## Contributing

- Pick a task in [`PLAN.md`](PLAN.md), put your initials on it, and work on a branch. Open one pull request per task and tick the task once it's merged.
- Every number and word lives in `master-v1/js/data.js`. Rules live in `sim.js`, which has no DOM or randomness, so the same design always gives the same year.
- After changing rules or numbers, run `npm test` and `npm run calibrate` in `master-v1/`. The calibration script checks that every site can still be passed.
- Keep paths relative, and don't commit zip files, `node_modules/` or `.env` files.

## Team

Anandharam Mourougassamy (MKA), Alexander Alaura Reyes (ZFA), Nancy Abdo (SSOE Group), Tom Kovalcik (Structured AI), Andrew Sundal (HGA), Carlos Navea (SDSU), Rao Patri (Logan Patri Engineering), Joel Kramer (SSOE Group) and Victor Garcia (SSOE Group). The in-game ℹ️ About page has links.

**This is a game, not engineering.** The cause and effect points the right way (piles on soft soil, braces for quakes, straps for wind), but every number is made up to teach the big ideas. None of it is a structural analysis or a code check.
