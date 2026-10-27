// ============================================================
// sim.js — the game rules. Pure: no DOM, no Three.js, no Math.random,
// so the same site + design + repair taps always give the same year.
// The UI calls advance() every frame and drains S.feed for things to show.
// ============================================================

import {
  DAYS, MONTH_DAYS, WARN_DAYS, HAZARD_DAYS, REPAIR_DAYS, OUTAGE_DAYS, HOT_DAYS, BROKE_DAYS,
  START_HAPPY, HEALTH_CLOSED, HIT_DAMAGE, SETTLE_DAMAGE, SETTLE_DAYS,
  WEIGHTS, GRADES, PASS_SCORE, GHOST_CAP, SOILS, BREAKS, ITEMS, ECO_MAX, CAST, LEVELS,
} from "./data.js";

export const TICK = 0.25; // days per fixed step, so frame rate never changes the result

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- design ----------
export const defaultChoice = () => Object.fromEntries(Object.keys(ITEMS).map(k => [k, 0]));
export const option = (choice, key) => ITEMS[key].options[choice[key]];
export const designCost = choice => Object.keys(ITEMS).reduce((n, k) => n + option(choice, k).cost, 0);
export const soilNeed = level => Math.min(3, SOILS[level.soil].need + (level.tall ? 1 : 0));
export const coinsLeft = (level, choice) => level.budget - level.shell - designCost(choice);
export const canRun = (level, choice) => coinsLeft(level, choice) >= 0;

export function designStats(choice) {
  const s = { quake: 0, wind: 0, flood: 0, heat: 0, happy: 0, eco: 0, power: false, bolted: false, found: 1 };
  for (const k in ITEMS) {
    const o = option(choice, k);
    for (const f of ["quake", "wind", "flood", "heat", "happy", "eco"]) s[f] += o[f] || 0;
    s.power = s.power || !!o.power;
    s.bolted = s.bolted || !!o.bolted;
    if (o.level) s.found = o.level;
  }
  return s;
}

// Strength against each hazard. Every building starts at 1 (Code Minimum).
export function strength(level, stats, type) {
  if (type === "heat") return stats.heat;
  let s = 1 + stats[type];
  // A foundation too small for the soil rocks loose in a quake; on wet sand the ground turns soupy too.
  if (type === "quake" && stats.found < soilNeed(level)) s -= SOILS[level.soil].liquefy ? 2 : 1;
  return s;
}

// ---------- run ----------
export function createRun(level, choice) {
  const stats = designStats(choice);
  const S = {
    level, choice: { ...choice }, stats, day: 0, acc: 0,
    coins: coinsLeft(level, choice), health: 100, minHealth: 100,
    happy: START_HAPPY, happySum: 0,
    people: CAST.map(c => ({ ...c, mood: START_HAPPY, ghost: false, reason: "" })),
    events: level.events.map(([type, power, month], i) => ({ id: i, type, power, day: month * MONTH_DAYS + 12, warned: false, done: false })),
    broken: [], nextId: 1, repairing: null, hazard: null, outage: 0, hot: 0, hotOver: 0,
    open: true, daysOpen: 0, brokeDays: 0, settled: 0,
    visitors: 0, visitorFrac: 0, earned: 0, repairSpent: 0, eco: 0,
    ghosts: 0, shelvesTipped: 0, hits: { quake: 0, wind: 0, flood: 0, heat: 0, settle: 0, outage: 0 },
    log: [], feed: [], over: null, done: false,
  };
  updateMoods(S);
  return S;
}

function emit(S, type, data = {}) { S.feed.push({ type, day: S.day, ...data }); }
function log(S, text) { S.log.push({ month: Math.min(11, Math.floor(S.day / MONTH_DAYS)), text }); }

function damage(S, amount, parts) {
  const each = amount / parts.length;
  for (const p of parts) S.broken.push({ id: S.nextId++, ...p, sev: each });
  S.health = Math.max(0, S.health - amount);
  S.minHealth = Math.min(S.minHealth, S.health);
}

function makeGhost(S, type) {
  const alive = S.people.filter(p => !p.ghost);
  if (!alive.length) return null;
  const who = alive.find(p => p.worries === type) || alive[0];
  who.ghost = true;
  S.ghosts++;
  return who;
}

function strike(S, ev) {
  const { level, stats } = S;
  const over = ev.power - strength(level, stats, ev.type);
  S.hazard = { ...ev, over, left: HAZARD_DAYS };
  if (ev.type === "heat") {
    if (over > 0) {
      S.hot = HOT_DAYS; S.hotOver = over; S.hits.heat++;
      S.happy -= 8 * over;
      log(S, `A ${powerName(ev)} heat wave made everyone too hot 🥵`);
    } else {
      S.happy += 3;
      log(S, "A heat wave came, but it stayed nice and cool inside 😎");
    }
    emit(S, "hazard", { ev, over });
    return;
  }
  if (over > 0) {
    S.hits[ev.type]++;
    damage(S, Math.min(4, over) * HIT_DAMAGE, BREAKS[ev.type].slice(0, Math.min(2, over)));
    S.happy -= 10 * over;
    const ghost = over >= 2 ? makeGhost(S, ev.type) : null;
    log(S, `A ${powerName(ev)} ${hazWord(S, ev.type)} beat the building by ${over}` + (ghost ? `. ${ghost.name} didn't make it 👻` : " 😬"));
    emit(S, "hazard", { ev, over, ghost: ghost && ghost.key });
  } else {
    S.happy += 4;
    log(S, `A ${powerName(ev)} ${hazWord(S, ev.type)} hit, and the building held strong 💪`);
    emit(S, "hazard", { ev, over });
  }
  if (ev.type === "quake" && !stats.bolted && ev.power >= 2) {
    S.shelvesTipped++;
    S.happy -= 8;
    log(S, "The shelves tipped over! Bolting them to the wall stops that.");
    emit(S, "shelves");
  }
  if (ev.power >= 2) {
    S.outage = OUTAGE_DAYS;
    if (!stats.power) { S.hits.outage++; log(S, "The power lines went down. No lights, so the doors closed 🔌"); }
    emit(S, "outage", { backed: stats.power });
  }
}

const HAZ_WORD = { quake: "earthquake", wind: "windstorm", flood: "flood" };
const hazWord = (S, type) => (type === "wind" && S.level.windWord) || HAZ_WORD[type];
const POWER = ["", "small", "medium", "BIG", "MEGA"];
const powerName = ev => POWER[ev.power] || "huge";

export function cheapestRepair(S) {
  return S.broken.length ? Math.min(...S.broken.map(b => b.cost)) : 0;
}

// Player taps 🔧 on one broken part. Returns false if it can't start.
export function repair(S, id) {
  if (S.over || S.done || S.repairing || S.hazard) return false;
  const part = S.broken.find(b => b.id === id);
  if (!part || S.coins < part.cost) return false;
  S.coins -= part.cost;
  S.repairSpent += part.cost;
  S.repairing = { id, left: REPAIR_DAYS };
  emit(S, "repairStart", { part });
  return true;
}

function isOpen(S) {
  const shaking = S.hazard && S.hazard.type !== "heat";
  return !S.over && !shaking && !S.repairing && S.health >= HEALTH_CLOSED && !(S.outage > 0 && !S.stats.power);
}

function targetHappy(S) {
  let t = START_HAPPY + S.stats.happy - 5 * S.broken.length;
  if (S.hot > 0) t -= 8 * S.hotOver;
  if (S.outage > 0 && !S.stats.power) t -= 10;
  return clamp(t, 0, 100);
}

function updateMoods(S) {
  for (const p of S.people) {
    if (p.ghost) { p.mood = 0; p.reason = "ghost"; continue; }
    const loved = S.choice[p.loves] > 0;
    p.mood = clamp(S.happy + (loved ? 8 : -2), 0, 100);
    p.reason = S.hazard && S.hazard.type !== "heat" ? "scared"
      : S.hot > 0 && p.worries === "heat" ? "hot"
      : S.hot > 0 ? "hot"
      : S.outage > 0 && !S.stats.power ? "dark"
      : loved ? "love" : "";
  }
}

function tick(S) {
  const { level } = S;
  S.day += TICK;

  // A foundation too weak for the soil sinks, twice a year.
  if (S.stats.found < soilNeed(level) && S.settled < SETTLE_DAYS.length && S.day >= SETTLE_DAYS[S.settled]) {
    S.settled++;
    S.hits.settle++;
    damage(S, SETTLE_DAMAGE, BREAKS.settle);
    S.happy -= 6;
    log(S, `The building sank into the ${SOILS[level.soil].name.toLowerCase()} ⬇️`);
    emit(S, "settle");
  }

  for (const ev of S.events) {
    if (ev.done) continue;
    if (!ev.warned && S.day >= ev.day - WARN_DAYS) { ev.warned = true; emit(S, "warn", { ev }); }
    if (S.day >= ev.day && !S.hazard) { ev.done = true; strike(S, ev); }
  }

  if (S.hazard && (S.hazard.left -= TICK) <= 0) { emit(S, "calm", { ev: S.hazard }); S.hazard = null; }
  if (S.outage > 0) S.outage = Math.max(0, S.outage - TICK);
  if (S.hot > 0) S.hot = Math.max(0, S.hot - TICK);

  if (S.repairing && (S.repairing.left -= TICK) <= 0) {
    const part = S.broken.find(b => b.id === S.repairing.id);
    S.broken = S.broken.filter(b => b !== part);
    S.health = Math.min(100, S.health + part.sev);
    S.repairing = null;
    S.happy += 4;
    log(S, `Fixed: ${part.label} 🔧`);
    emit(S, "repaired", { part });
  }

  if (S.health <= 0) {
    S.over = { reason: "collapse" };
    log(S, "The building fell down 💥");
    emit(S, "over", S.over);
    return;
  }

  const wasOpen = S.open;
  S.open = isOpen(S);
  if (S.open !== wasOpen) emit(S, S.open ? "opened" : "closed");
  if (S.open) {
    S.daysOpen += TICK;
    S.visitorFrac += level.visitors * TICK * (0.5 + S.happy / 100);
    const whole = Math.floor(S.visitorFrac);
    S.visitorFrac -= whole;
    const before = Math.floor(S.visitors / level.perCoin);
    S.visitors += whole;
    const coinsNow = Math.floor(S.visitors / level.perCoin) - before;
    if (coinsNow > 0) { S.coins += coinsNow; S.earned += coinsNow; emit(S, "coin", { n: coinsNow }); }
  }
  S.eco += (S.stats.eco * 10 * TICK) / DAYS;

  // Closed for damage, no crew working, and not enough coins for any repair.
  const stuck = S.health < HEALTH_CLOSED && !S.repairing && S.coins < cheapestRepair(S);
  S.brokeDays = stuck ? S.brokeDays + TICK : 0;
  if (S.brokeDays >= BROKE_DAYS) {
    S.over = { reason: "broke" };
    log(S, "Out of coins to fix the building 🫙");
    emit(S, "over", S.over);
    return;
  }

  S.happy += clamp(targetHappy(S) - S.happy, -1.5 * TICK, 1.5 * TICK);
  S.happy = clamp(S.happy, 0, 100);
  S.happySum += S.happy * TICK;
  updateMoods(S);

  if (S.day >= DAYS) { S.done = true; emit(S, "end"); }
}

// Advance by real game days (any size). Runs whole fixed ticks only.
export function advance(S, days) {
  S.acc += days;
  while (S.acc >= TICK && !S.over && !S.done) { S.acc -= TICK; tick(S); }
}

// ---------- report card ----------
export function gradeFor(score) { return GRADES.find(([min]) => score >= min)[1]; }

export function reportCard(S) {
  const L = S.level;
  const days = Math.max(S.day, TICK);
  const subjects = {
    safety: clamp(S.minHealth - 25 * S.ghosts - 5 * S.shelvesTipped, 0, 100),
    happy: clamp(S.happySum / days, 0, 100),
    open: clamp((100 * S.daysOpen) / DAYS, 0, 100),
    eco: clamp((100 * S.eco) / (ECO_MAX * 10), 0, 100),
    budget: clamp(80 + 4 * S.coins - (150 * S.repairSpent) / L.budget, 0, 100),
  };
  const w = { ...WEIGHTS, ...(L.hospital ? { open: WEIGHTS.open * 2 } : {}) };
  const total = Object.keys(w).reduce((n, k) => n + w[k], 0);
  let score = Object.keys(w).reduce((n, k) => n + w[k] * subjects[k], 0) / total;
  if (S.ghosts > 0) score = Math.min(score, GHOST_CAP);
  if (S.over) score = Math.min(score, 0);
  score = Math.round(score);
  const grade = gradeFor(score);
  const stars = grade.startsWith("A") ? 3 : grade === "B" ? 2 : grade === "C" ? 1 : 0;
  return {
    score, grade, stars, pass: !S.over && score >= PASS_SCORE, weights: w,
    subjects: Object.fromEntries(Object.entries(subjects).map(([k, v]) => [k, { score: Math.round(v), grade: gradeFor(v) }])),
  };
}

// Foreman Fran's tips, from what actually happened this year.
export function lessons(S) {
  const L = S.level, out = [], st = S.stats;
  if (S.hits.settle) out.push(`On ${SOILS[L.soil].name.toLowerCase()} this building needs a ${["", "shallow footing", "mat slab", "deep pile"][soilNeed(L)]} foundation or better, or it sinks.`);
  if (S.hits.quake) out.push(SOILS[L.soil].liquefy && st.found < 3
    ? "Wet sand turns soupy in an earthquake. Deep piles reach solid rock. Then add braces or shake absorbers."
    : "Earthquakes: braced steel and shake absorbers keep the building steady.");
  if (S.hits.wind) out.push("Wind: strap the roof down, use storm-proof windows, or brace the frame.");
  if (S.hits.flood) out.push("Floods: a raised floor lets the water flow underneath.");
  if (S.hits.heat) out.push("Heat waves: a heat pump and shade trees keep people cool.");
  if (S.hits.outage) out.push("When the power lines go down, a generator or solar + battery keeps the doors open.");
  if (S.shelvesTipped) out.push("Bolt the shelves to the wall so they can't tip over in an earthquake.");
  if (st.eco < 4) out.push("Want more 🌱 eco points? Try LED lights, a heat pump, solar + battery, a rain garden or shade trees.");
  if (S.broken.length && !S.over) out.push("Broken parts make people sad. Keep some coins in the jar for repairs!");
  return out;
}

// ---------- helpers for tests and tuning ----------
export function autoRepair(S) {
  if (S.repairing || S.hazard) return;
  const fix = [...S.broken].sort((a, b) => b.sev - a.sev).find(b => b.cost <= S.coins);
  if (fix) repair(S, fix.id);
}

export function simulate(level, choice, policy = autoRepair) {
  const S = createRun(level, choice);
  while (!S.over && !S.done) { advance(S, TICK); if (policy) policy(S); }
  return S;
}

export const levelByKey = key => LEVELS.find(l => l.key === key);

// Progress is { [levelKey]: { best: score, grade } }. A site opens once the one before it is passed.
export function isUnlocked(progress, index) {
  if (index === 0) return true;
  const prev = progress[LEVELS[index - 1].key];
  return !!prev && prev.best >= PASS_SCORE;
}
