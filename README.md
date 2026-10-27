# BuildCraft

A browser game that puts students in the client's seat: a budget, a building, every feature a cost decision, and a year of weather that tests the choices.

Open `index.html` at the repo root for a launcher that links to everything below. With GitHub Pages on, each entry also has its own link, such as `https://amourougassamy.github.io/BuildCraft/buildcraft-v0.2/`.

## Repo layout

```
index.html               Launcher for every playable version
buildcraft-v0.1/         Team mainline: starter (Riverside Library)
buildcraft-v0.2/         Team mainline: kid edition (latest)
prototypes/              Individual explorations, one folder each
  alex/                    Alex's single-file versions (v1-v3)
  sky-high-builders/       Wind-challenge tower builder (Logan)
  buildcraft-3d/           3D frame builder with loads (Logan)
  learning-hub-nextjs/     Next.js app: 3D design + hot-day cooling check (nabdo)
```

## Team mainline

Each `buildcraft-v*` folder is a complete, playable version. Old folders are never edited, so every iteration stays playable side by side.

| Folder | What's in it |
| --- | --- |
| [`buildcraft-v0.2/`](buildcraft-v0.2/) | Kid edition: toy-box look, six regulars with happy / sad / ghost moods, celebrations, Gentle mode, sound |
| [`buildcraft-v0.1/`](buildcraft-v0.1/) | Starter: Riverside Library, Minneapolis weather, 9 decisions |

Each iteration's own README explains how the game works and which squad owns which file.

## Prototypes

Side explorations built in parallel. Ideas that work here can be pulled into the next mainline version.

| Folder | Owner | What's in it | Runs on Pages? |
| --- | --- | --- | --- |
| [`prototypes/alex/`](prototypes/alex/) | Alex | Three single-file versions. Latest: pick a town, building type and floors; 90 s build, then a 12-month year of earthquakes and windstorms; foundations must match the soil. | Yes |
| [`prototypes/sky-high-builders/`](prototypes/sky-high-builders/) | Logan | "The Wind Challenge": stack pieces on a grid to build a tower for a windy city. | Yes |
| [`prototypes/buildcraft-3d/`](prototypes/buildcraft-3d/) | Logan | Orbitable 3D models, templates (tower, house, bridge, frame), six adjustable loads, demand/capacity score, JSON export/import. Loads Three.js from a CDN. | Yes (needs internet) |
| [`prototypes/learning-hub-nextjs/`](prototypes/learning-hub-nextjs/) | nabdo | Next.js app: design a neighborhood learning hub in 3D against a budget, area target and a 12-hour hot-day cooling simulation. Live at https://ncseahackathon.ssoe.abacus.ai/ | No (needs Node) |

All of these are games. Their numbers are illustrative and are not structural analysis or code checks.

## Contributing

**New mainline iteration**

1. Copy the newest folder and rename it: `cp -r buildcraft-v0.2 buildcraft-v0.3`
2. Work only in the new folder.
3. Add a row for it at the top of the mainline list in the root `index.html` and in the table above.
4. Commit and push.

**New prototype**

1. Make a folder under `prototypes/` named for what it is (not `my-version` or `test`).
2. Put an `index.html` at its root if it runs in the browser, plus a short `README.md`: what it is, who owns it, how to run it.
3. Add a row to the launcher and to the Prototypes table above.

**House rules**

- Keep every path inside a folder relative (`js/ui.js`, not `/js/ui.js`) so each version runs from its own folder.
- Don't commit zip files. Unzip into a folder so the code can be read and diffed on GitHub.
- Don't commit build output, `node_modules/`, or `.env` files (see `.gitignore`).
