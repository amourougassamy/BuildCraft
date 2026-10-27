# BuildCraft

A browser game that puts students in the client's seat: a budget, a building, every feature a cost decision, and a year of weather that tests the choices.

## ▶ Play it

**https://amourougassamy.github.io/BuildCraft/**

That page lists every iteration. Nothing to install; it runs in any modern browser.

## Iterations

Each folder is a complete, playable version. Old folders are never edited, so every iteration stays playable side by side.

| Version | Play | What's in it | Source |
| --- | --- | --- | --- |
| v0.2 (latest) | [Play](https://amourougassamy.github.io/BuildCraft/buildcraft-v0.2/) | Kid edition: toy-box look, six regulars with happy / sad / ghost moods, celebrations, Gentle mode, sound | [`buildcraft-v0.2/`](buildcraft-v0.2/) |
| v0.1 | [Play](https://amourougassamy.github.io/BuildCraft/buildcraft-v0.1/) | Starter: Riverside Library, Minneapolis weather, 9 decisions | [`buildcraft-v0.1/`](buildcraft-v0.1/) |
| BuildCraft 3D, Version 3 web edition | [Play](https://amourougassamy.github.io/BuildCraft/my-version/) | [`my-version/`](my-version/) |
| Alex's latest (v3) | [Play](https://amourougassamy.github.io/BuildCraft/alex/) | [`alex/`](alex/) |
| Alex's v2 | [Play](https://amourougassamy.github.io/BuildCraft/alex/v2.html) | [`alex/v2.html`](alex/v2.html) |
| Alex's v1: Build It Strong | [Play](https://amourougassamy.github.io/BuildCraft/alex/v1-build-it-strong.html) | [`alex/v1-build-it-strong.html`](alex/v1-build-it-strong.html) |
| Sky High Builders | [Play](https://amourougassamy.github.io/BuildCraft/sky-high-builders/) | [`sky-high-builders/`](sky-high-builders/) |

Every folder gets its own link the same way: `https://amourougassamy.github.io/BuildCraft/<folder>/`. To play offline, open the folder's `index.html` in a browser.

## Starting a new iteration

1. Copy the newest folder and rename it: `cp -r buildcraft-v0.1 buildcraft-v0.2`
2. Work only in the new folder.
3. Add a row for it at the top of the list in the root `index.html` and in the table above (Play link: `https://amourougassamy.github.io/BuildCraft/<folder>/`).
4. Commit and push. GitHub Pages republishes within a minute or two.

Keep every path inside a folder relative (`js/ui.js`, not `/js/ui.js`) so each version runs from its own folder.

Each iteration's own README explains how the game works and which squad owns which file.
My link: https://ncseahackathon.ssoe.abacus.ai/
