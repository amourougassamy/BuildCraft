import { test } from "node:test";
import assert from "node:assert/strict";
import { LEVELS, ITEMS, CAST } from "../js/data.js";
import {
  defaultChoice, createRun, advance, simulate, reportCard, canRun, coinsLeft, isUnlocked, gradeFor, repair, TICK,
} from "../js/sim.js";

const lv = key => LEVELS.find(l => l.key === key);
const design = picks => ({ ...defaultChoice(), ...picks });
const pick = (key, label) => ITEMS[key].options.findIndex(o => o.label === label);

test("same site + same design + same repair taps = same year", () => {
  const a = simulate(lv("breezy"), design({ found: 1 })), b = simulate(lv("breezy"), design({ found: 1 }));
  assert.deepEqual(reportCard(a), reportCard(b));
  assert.deepEqual(a.log, b.log);
});

test("frame size does not change the result", () => {
  const run = step => { const S = createRun(lv("prairie"), defaultChoice()); while (!S.done && !S.over) advance(S, step); return S; };
  const a = run(TICK), b = run(0.37);
  assert.equal(Math.round(a.happySum), Math.round(b.happySum));
  assert.equal(a.daysOpen, b.daysOpen);
});

test("a shallow foundation on soft clay sinks; a mat slab does not", () => {
  const weak = simulate(lv("breezy"), defaultChoice(), null);
  const strong = simulate(lv("breezy"), design({ found: pick("found", "Mat Slab") }), null);
  assert.equal(weak.hits.settle, 2);
  assert.equal(strong.hits.settle, 0);
});

test("wet sand needs deep piles, or quakes hit harder", () => {
  const upper = { frame: 1, iso: 1, shelves: 1 };
  const mat = simulate(lv("shaky"), design({ ...upper, found: 1 }));
  const piles = simulate(lv("shaky"), design({ ...upper, found: 2 }));
  assert.ok(mat.hits.quake > 0);
  assert.equal(piles.hits.quake, 0);
});

test("you can't run over budget", () => {
  const everything = Object.fromEntries(Object.keys(ITEMS).map(k => [k, ITEMS[k].options.length - 1]));
  assert.ok(coinsLeft(lv("rocky"), everything) < 0);
  assert.equal(canRun(lv("rocky"), everything), false);
  assert.equal(canRun(lv("rocky"), defaultChoice()), true);
});

test("grade cutoffs", () => {
  assert.equal(gradeFor(100), "A+");
  assert.equal(gradeFor(90), "A+");
  assert.equal(gradeFor(89), "A");
  assert.equal(gradeFor(75), "B");
  assert.equal(gradeFor(65), "C");
  assert.equal(gradeFor(64), "D");
  assert.equal(gradeFor(10), "F");
});

test("sites unlock in order, only after a C or better", () => {
  assert.equal(isUnlocked({}, 0), true);
  assert.equal(isUnlocked({}, 1), false);
  assert.equal(isUnlocked({ rocky: { best: 64 } }, 1), false);
  assert.equal(isUnlocked({ rocky: { best: 65 } }, 1), true);
  assert.equal(isUnlocked({ rocky: { best: 90 } }, 2), false);
});

test("the cheapest design collapses in Shaky Hills: game over, F", () => {
  const S = simulate(lv("shaky"), defaultChoice());
  assert.equal(S.over && S.over.reason, "collapse");
  const r = reportCard(S);
  assert.equal(r.grade, "F");
  assert.equal(r.pass, false);
});

test("a hazard that wins by 2 makes a ghost and caps the grade", () => {
  const S = simulate(lv("prairie"), defaultChoice());
  assert.ok(S.ghosts >= 1);
  assert.ok(reportCard(S).score <= 84);
});

test("repairs cost coins and close the doors while the crew works", () => {
  const S = createRun(lv("rocky"), defaultChoice());
  while (!S.broken.length) advance(S, TICK);
  while (S.hazard) advance(S, TICK);
  const coins = S.coins, part = S.broken[0];
  assert.ok(repair(S, part.id));
  assert.equal(S.coins, coins - part.cost);
  advance(S, TICK);
  assert.equal(S.open, false);
  while (S.repairing) advance(S, TICK);
  assert.equal(S.broken.length, 0);
});

test("every site can be passed, and the first one gives an easy start", () => {
  const good = {
    rocky: { roof: 1, hvac: 1, garden: 1 },
    prairie: { windows: 1, roof: 1, hvac: 1, trees: 1 },
    breezy: { found: 1, windows: 1, roof: 1, raise: 1, hvac: 1 },
    shaky: { found: 2, frame: 1, iso: 1, shelves: 1, backup: 1 },
    mega: { found: 2, iso: 1, windows: 1, roof: 1, raise: 1, hvac: 1, trees: 1 },
  };
  for (const L of LEVELS) {
    const d = design(good[L.key]);
    assert.ok(canRun(L, d), `${L.key} design fits the budget`);
    const r = reportCard(simulate(L, d));
    assert.ok(r.pass, `${L.key} passes (got ${r.grade} ${r.score})`);
  }
  assert.ok(reportCard(simulate(lv("rocky"), defaultChoice())).pass, "Code Minimum passes the first site");
});

test("no Furniture choice, and everyone loves an upgrade that exists", () => {
  assert.equal(ITEMS.furniture, undefined);
  for (const c of CAST) assert.ok(ITEMS[c.loves] && ITEMS[c.loves].options.length > 1, `${c.name} loves ${c.loves}`);
  assert.equal(CAST.find(c => c.key === "gus").loves, "lights");
});
