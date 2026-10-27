// Tries every affordable design on every site (auto-repair on) and prints the spread of grades.
// Use it after changing numbers in js/data.js:  node tools/calibrate.mjs
import { LEVELS, ITEMS } from "../js/data.js";
import { simulate, reportCard, canRun, defaultChoice } from "../js/sim.js";

const keys = Object.keys(ITEMS);
function* designs(i = 0, c = defaultChoice()) {
  if (i === keys.length) { yield { ...c }; return; }
  for (let o = 0; o < ITEMS[keys[i]].options.length; o++) { c[keys[i]] = o; yield* designs(i + 1, c); }
}
for (const L of LEVELS) {
  const counts = {}; let best = null, n = 0, over = 0;
  for (const d of designs()) {
    if (!canRun(L, d)) continue;
    n++;
    const S = simulate(L, d), r = reportCard(S);
    if (S.over) over++;
    counts[r.grade] = (counts[r.grade] || 0) + 1;
    if (!best || r.score > best.r.score) best = { d, r, S };
  }
  const cheap = reportCard(simulate(L, defaultChoice()));
  console.log(`${L.name}: ${n} designs, game over ${over}, grades ${JSON.stringify(counts)}`);
  console.log(`  cheapest: ${cheap.grade} ${cheap.score}  best: ${best.r.grade} ${best.r.score} ${JSON.stringify(best.r.subjects)}`);
  console.log(`  best design: ${keys.filter(k => best.d[k]).map(k => ITEMS[k].options[best.d[k]].label).join(", ")}`);
}
