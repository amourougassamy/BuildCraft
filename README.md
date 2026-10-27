# BuildCraft

A browser game that puts students in the client's seat: a budget, a building, every feature a cost decision, and a year of weather that tests the choices.

## Iterations

Each folder is a complete, playable version. Old folders are never edited, so every iteration stays playable side by side.

| Folder | What's in it |
| --- | --- |
| [`buildcraft-v0.2/`](buildcraft-v0.2/) | Kid edition: toy-box look, six regulars with happy / sad / ghost moods, celebrations, Gentle mode, sound |
| [`buildcraft-v0.1/`](buildcraft-v0.1/) | Starter: Riverside Library, Minneapolis weather, 9 decisions |

Open `index.html` at the repo root for a launcher that links to every iteration. With GitHub Pages on, each one has its own link, such as `https://amourougassamy.github.io/BuildCraft/buildcraft-v0.1/`.

## Starting a new iteration

1. Copy the newest folder and rename it: `cp -r buildcraft-v0.1 buildcraft-v0.2`
2. Work only in the new folder.
3. Add a row for it at the top of the list in the root `index.html` and in the table above.
4. Commit and push.

Keep every path inside a folder relative (`js/ui.js`, not `/js/ui.js`) so each version runs from its own folder.

Each iteration's own README explains how the game works and which squad owns which file.
My link: https://ncseahackathon.ssoe.abacus.ai/
