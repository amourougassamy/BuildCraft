# BuildCraft

A browser game that puts students in the client's seat: a budget, a building, every feature a cost decision, and a year of weather that tests the choices.

## ▶ Play it

**https://amourougassamy.github.io/BuildCraft/**

That page lists every version. Nothing to install; it runs in any modern browser. To play offline, open a folder's `index.html` in a browser.

## Repo layout

```
index.html               Launcher for every playable version
buildcraft-v0.1/         Team mainline: starter (Riverside Library)
buildcraft-v0.2/         Team mainline: kid edition
master-v1/               Master version (latest): the best ideas from every version
prototypes/              Individual explorations, one folder each
  building-tycoon/         Isometric 3D building-systems tycoon (Tom)
  alex/                    Alex's single-file versions (v1-v3)
  sky-high-builders/       Wind-challenge tower builder (Logan)
  buildcraft-3d/           3D frame builder with loads (Logan)
  learning-hub-nextjs/     Next.js app: 3D design + hot-day cooling check (nabdo)
```

## Team mainline

Each `buildcraft-v*` folder is a complete, playable version. Old folders are never edited, so every iteration stays playable side by side.

| Version | Play | What's in it | Source |
| --- | --- | --- | --- |
| Master V1 (latest) | [Play](https://amourougassamy.github.io/BuildCraft/master-v1/) | The best of every prototype: kid-first claymation 3D, name, island map with unlockable sites, one-screen design, forward-only year with repairs and downtime, emoji moods, ghosts, eco points, A+ report card, game over | [`master-v1/`](master-v1/) |
| v0.2 | [Play](https://amourougassamy.github.io/BuildCraft/buildcraft-v0.2/) | Kid edition: toy-box look, six regulars with happy / sad / ghost moods, celebrations, Gentle mode, sound | [`buildcraft-v0.2/`](buildcraft-v0.2/) |
| v0.1 | [Play](https://amourougassamy.github.io/BuildCraft/buildcraft-v0.1/) | Starter: Riverside Library, Minneapolis weather, 9 decisions | [`buildcraft-v0.1/`](buildcraft-v0.1/) |

Each iteration's own README explains how the game works and which squad owns which file.

## Prototypes

Side explorations built in parallel. Ideas that work here can be pulled into the next mainline version.

| Prototype | Owner | Play | What's in it | Source |
| --- | --- | --- | --- | --- |
| Building Tycoon | Tom | [Play](https://amourougassamy.github.io/BuildCraft/prototypes/building-tycoon/) | Isometric 3D office (orbit, zoom, rotate). Tenants' moods follow the design; windows, structure, envelope, HVAC and electrical all affect each other; a helicopter delivers rooftop units. Needs internet for Three.js | [`prototypes/building-tycoon/`](prototypes/building-tycoon/) |
| Alex's latest (v3) | Alex | [Play](https://amourougassamy.github.io/BuildCraft/prototypes/alex/) | Pick a town, building type and floors; 90 s build, then a 12-month year of earthquakes and windstorms; foundations must match the soil | [`prototypes/alex/`](prototypes/alex/) |
| Alex's v2 | Alex | [Play](https://amourougassamy.github.io/BuildCraft/prototypes/alex/v2.html) | Live scene with visitors; Code Minimum vs. Beyond Code choices in five categories | [`v2.html`](prototypes/alex/v2.html) |
| Alex's v1: Build It Strong | Alex | [Play](https://amourougassamy.github.io/BuildCraft/prototypes/alex/v1-build-it-strong.html) | First slim prototype: four categories, a $100 budget, a happiness meter | [`v1-build-it-strong.html`](prototypes/alex/v1-build-it-strong.html) |
| Sky High Builders | Logan | [Play](https://amourougassamy.github.io/BuildCraft/prototypes/sky-high-builders/) | "The Wind Challenge": stack pieces on a grid to build a tower for a windy city | [`prototypes/sky-high-builders/`](prototypes/sky-high-builders/) |
| BuildCraft 3D | Logan | [Play](https://amourougassamy.github.io/BuildCraft/prototypes/buildcraft-3d/) | Orbitable 3D models, templates (tower, house, bridge, frame), six adjustable loads, demand/capacity score, JSON export/import. Needs internet for Three.js | [`prototypes/buildcraft-3d/`](prototypes/buildcraft-3d/) |
| Neighborhood learning hub | nabdo | [Open](https://ncseahackathon.ssoe.abacus.ai/) (hosted on Abacus.AI) | Next.js app: design a learning hub in 3D against a budget, an area target and a 12-hour hot-day cooling simulation. Needs Node; does not run on GitHub Pages | [`prototypes/learning-hub-nextjs/`](prototypes/learning-hub-nextjs/) |

All of these are games. Their numbers are illustrative and are not structural analysis or code checks.

## Contributing

**New mainline iteration**

1. Copy the newest folder and rename it: `cp -r buildcraft-v0.2 buildcraft-v0.3`
2. Work only in the new folder.
3. Add a row for it at the top of the mainline list in the root `index.html` and in the table above (Play link: `https://amourougassamy.github.io/BuildCraft/<folder>/`).
4. Commit and push. GitHub Pages republishes within a minute or two.

**New prototype**

1. Make a folder under `prototypes/` named for what it is (not `my-version` or `test`).
2. Put an `index.html` at its root if it runs in the browser, plus a short `README.md`: what it is, who owns it, how to run it.
3. Add a row to the launcher and to the Prototypes table above (Play link: `https://amourougassamy.github.io/BuildCraft/prototypes/<folder>/`).

**House rules**

- Keep every path inside a folder relative (`js/ui.js`, not `/js/ui.js`) so each version runs from its own folder.
- Don't commit zip files. Unzip into a folder so the code can be read and diffed on GitHub.
- Don't commit build output, `node_modules/`, or `.env` files (see `.gitignore`).
