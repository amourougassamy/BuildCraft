// Run: node --test development/building-tycoon/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createGame, step, applyAction, designChecks, sunPosition, roofCheck, lateralCheck,
  cloneDesign, roofLayout, canAddUnit, makeYear, forecastYear,
} from "../js/sim.js";
import { DEFAULT_DESIGN, STRUCTURE, ROOF_SLOTS } from "../js/data.js";

const base = () => cloneDesign(DEFAULT_DESIGN);

test("same seed and same actions give the same year", () => {
  const run = () => {
    const g = createGame(7);
    step(g, 30);
    applyAction(g, { type: "addUnit" });
    applyAction(g, { type: "setWWR", side: "W", value: 0.6 });
    step(g, 24 * 12);
    return JSON.stringify({ cash: g.cash, stats: g.stats, temps: g.temps, moods: g.occupants.map((o) => o.mood) });
  };
  assert.equal(run(), run());
});

test("sun is due south and high at summer noon, east in the morning", () => {
  const noon = sunPosition(172, 12);
  assert.ok(Math.abs(noon.altitude - (90 - 41.9 + 23.45)) < 0.5, `altitude ${noon.altitude}`);
  assert.ok(Math.abs(noon.azimuth) < 1);
  assert.ok(sunPosition(172, 8).azimuth < -60);
  assert.ok(sunPosition(172, 16).azimuth > 60);
  assert.ok(sunPosition(355, 12).altitude < 26);
});

test("bigger west windows weaken shear walls and add cooling load", () => {
  const a = designChecks(base());
  const d = base();
  d.wwr.W = 0.7;
  const b = designChecks(d);
  assert.ok(b.latDC > a.latDC + 0.1);
  assert.ok(b.coolDC > a.coolDC + 0.1);
  assert.ok(b.daylight > a.daylight);
});

test("moment frames make bracing independent of windows", () => {
  const d = base();
  d.lateral = "moment";
  const a = lateralCheck(d).dc;
  d.wwr = { N: 0.8, E: 0.8, S: 0.8, W: 0.8 };
  assert.equal(lateralCheck(d).dc, a);
});

test("roof check adds dead, insulation, snow and equipment", () => {
  const r = roofCheck(base());
  assert.equal(r.demand, STRUCTURE.roofDeadPsf + 0.5 + STRUCTURE.designSnowPsf + 3 * STRUCTURE.unitPsf);
  assert.equal(r.cap, 40);
});

test("adding a unit: more cooling, more electrical and roof load, helicopter to a free slot", () => {
  const g = createGame(1);
  const before = g.analysis;
  const r = applyAction(g, { type: "addUnit" });
  assert.ok(r.ok);
  assert.equal(r.fx.kind, "heliDeliver");
  assert.ok(!roofLayout(base()).units.includes(r.fx.slot));
  assert.ok(g.analysis.coolDC < before.coolDC);
  assert.ok(g.analysis.elecDC > before.elecDC);
  assert.ok(g.analysis.roofDC > before.roofDC);
  assert.ok(r.chain.lines.some((l) => l.metric === "elecDC"));
  assert.ok(g.cash < 150000);
});

test("heat pumps load the electrical service more than gas heat", () => {
  const d = base();
  d.hvacType = "hp";
  assert.ok(designChecks(d).elecDC > designChecks(base()).elecDC + 0.2);
});

test("roof fills up: no unit can be added when every slot is taken", () => {
  const d = base();
  d.units = ROOF_SLOTS.cols * ROOF_SLOTS.rows;
  assert.equal(canAddUnit(d), false);
  const g = createGame(1, d);
  assert.equal(applyAction(g, { type: "addUnit" }).ok, false);
});

test("an undersized service trips the main breaker", () => {
  const d = base();
  d.hvacType = "hp";
  d.units = 7;
  const g = createGame(3, d);
  const ev = step(g, 24 * 12);
  assert.ok(ev.some((e) => e.type === "trip"));
});

test("a glass box with shear walls gets damaged by the storm or quake", () => {
  const d = base();
  d.wwr = { N: 0.8, E: 0.8, S: 0.8, W: 0.8 };
  const g = createGame(5, d);
  const ev = step(g, 24 * 12);
  const hits = ev.filter((e) => e.type === "structEvent" && e.kind !== "blizzard");
  assert.ok(hits.length >= 2);
  assert.ok(hits.every((e) => !e.ok));
});

test("every year has one of each event and ends with a report card", () => {
  const y = makeYear(11);
  const kinds = y.days.map((d) => d.event).filter(Boolean).sort();
  assert.deepEqual(kinds, ["blizzard", "coldsnap", "earthquake", "heatwave", "windstorm"]);
  const g = createGame(11);
  const ev = step(g, 24 * 12);
  const end = ev.find((e) => e.type === "yearEnd");
  assert.ok(end);
  assert.equal(end.report.cards.length, 6);
  assert.ok(g.finished);
});

test("more cooling means fewer too-hot hours in the forecast", () => {
  const y = makeYear(2026);
  const d = base();
  const a = forecastYear(d, y);
  d.units = 5;
  assert.ok(forecastYear(d, y).hotHours < a.hotHours);
});
