// Prints the design checks and a full no-action year for a set of fixed scenarios.
// Used to tune the numbers in js/data.js. Deterministic: same output every run.
// Run: node prototypes/building-tycoon/tools/calibrate.mjs [seed]
import { analyze, createGame, step, makeYear, cloneDesign } from "../js/sim.js";
import { DEFAULT_DESIGN } from "../js/data.js";

const seed = Number(process.argv[2] || 2026);
const year = makeYear(seed);

const scenarios = {
  baseline: {},
  "west 60%": { wwr: { ...DEFAULT_DESIGN.wwr, W: 0.6 } },
  "glass box 80%": { wwr: { N: 0.8, E: 0.8, S: 0.8, W: 0.8 } },
  "+1 unit": { units: 4 },
  "+3 units": { units: 6 },
  "heat pumps": { hvacType: "hp" },
  "low-e + LED": { glass: "lowe", lighting: "led" },
  "+2 PV": { pv: 2 },
  "4 units + 2 PV": { units: 4, pv: 2 },
};

const f2 = (v) => v.toFixed(2).padStart(5);
console.log(`seed ${seed}; events: ${year.days.filter((d) => d.event).map((d) => `${d.event}@day${d.index}`).join(", ")}`);
console.log("scenario          cool  heat  elec  roof   lat  units  coolKW heatKW elecKW  hotH  trips  $energy   EUI");
for (const [name, patch] of Object.entries(scenarios)) {
  const d = { ...cloneDesign(DEFAULT_DESIGN), ...patch };
  const a = analyze(d, year);
  console.log(
    `${name.padEnd(16)} ${f2(a.coolDC)} ${f2(a.heatDC)} ${f2(a.elecDC)} ${f2(a.roofDC)} ${f2(a.latDC)}  ${String(a.unitsNeeded).padStart(4)}  ${a.coolLoad.toFixed(0).padStart(6)} ${a.heatLoad.toFixed(0).padStart(6)} ${a.elecDemand.toFixed(0).padStart(6)} ${a.hotHours.toFixed(0).padStart(5)} ${a.tripHours.toFixed(1).padStart(6)} ${(a.energyCost / 1000).toFixed(0).padStart(7)}k ${a.eui.toFixed(0).padStart(5)}`,
  );
}

for (const [name, patch] of [["baseline", {}], ["good design", { units: 4, glass: "lowe", lighting: "led", roof: "reinforced", shades: { N: false, E: true, S: true, W: true } }]]) {
  const g = createGame(seed, { ...cloneDesign(DEFAULT_DESIGN), ...patch });
  const all = step(g, 24 * 12);
  const end = all.find((e) => e.type === "yearEnd");
  console.log(`\n== full year, ${name}, no actions ==`);
  for (const e of all.filter((x) => ["dayEnd", "trip", "structEvent", "quit"].includes(x.type))) {
    if (e.type === "dayEnd") console.log(`day ${e.day} m${e.month}: tenants ${e.tenants} mood ${e.mood.toFixed(0)} rent ${e.rent} energy ${e.energy.toFixed(0)} peak ${e.peakKw.toFixed(0)}kW trips ${e.trips}`);
    else if (e.type === "structEvent") console.log(`   ${e.kind}: dc ${e.dc.toFixed(2)} ${e.ok ? "OK" : "DAMAGE"}`);
  }
  console.log(`quits ${all.filter((x) => x.type === "quit").length}, trips ${all.filter((x) => x.type === "trip").length}`);
  if (end) console.log("report:", end.report.grade, end.report.overall, end.report.cards.map((c) => `${c.discipline} ${c.score}`).join(" | "), `cash ${end.report.cash.toFixed(0)}`);
}
