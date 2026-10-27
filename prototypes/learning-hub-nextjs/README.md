# Learning Hub (Next.js prototype)

Owner: nabdo. Live at https://ncseahackathon.ssoe.abacus.ai/

Design a neighborhood learning hub in 3D: footprint, floors, frame members, braces, foundation, insulation and AC units. The game checks the design against a $1.8M budget, a 4,000 sf usable-area target and a 12-hour hot-day cooling simulation, then lists which checks are met, not met, or not evaluated.

Originally uploaded as `ncsea_hackathon_nextjs_space.zip` (exported from Abacus.AI). It was unzipped here so the code can be read and diffed; the generated `tsconfig.tsbuildinfo` and `next-env.d.ts` were left out.

## Where the game is

| File | What's in it |
| --- | --- |
| `app/page.tsx` | Entry point; renders the game |
| `components/game/game.tsx` | Controls, results and review panel |
| `components/game/building-scene.tsx` | Three.js 3D building |
| `lib/game/assumptions.ts` | Every number: budget, costs, thermal properties |
| `lib/game/design.ts` | Design inputs, baseline design, input validation |
| `lib/game/engineering.ts` | Area, cost and one-zone hot-day heat balance |
| `lib/game/review.ts` | The checklist shown to the player |
| `tests/game-model.test.ts` | Model tests (bounds, cost, cooling behavior) |

Everything else (`components/ui/`, `components/viz/`, `public/abacus-viz/`, `prisma/`) is template scaffolding from the export. The game does not use `components/viz/` or the database; `prisma/schema.prisma` defines no models.

## Run it

Needs Node and Yarn. It does not run on GitHub Pages. `.yarnrc.yml` points Yarn's global cache at `/opt/hostedapp/...` (the Abacus.AI host), so local installs may need that line removed.

```
yarn install
yarn dev
```

Model values are illustrative game numbers, not market prices or code provisions. Structural, foundation and code checks are shown as "Not evaluated" on purpose.
