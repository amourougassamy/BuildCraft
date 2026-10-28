// sim.js: the building model and game rules. Pure logic, no DOM or three.js,
// so it runs in the browser and in `node --test`. Same seed + same actions
// = same year, every time.
import {
  SITE, GEOM, SIDES, SIDE_INFO, THERMAL, HVAC, ELECTRICAL, STRUCTURE, MONEY, PEOPLE,
  WEATHER, START_MONTH, DAYS_PER_YEAR, EVENTS, OPTIONS, DEFAULT_DESIGN,
  WWR_MIN, WWR_MAX, ROOF_SLOTS, UNIT_SLOT_ORDER, PV_SLOT_PAIRS, WHY,
} from "./data.js";

export const DT = 0.25; // hours per simulation step
const RAD = Math.PI / 180;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const round2 = (v) => Math.round(v * 100) / 100;

// ---------- random numbers ----------
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- zones ----------
const FLOOR_AREA = GEOM.lengthX * GEOM.depthZ;
const PERIMETER = 2 * (GEOM.lengthX + GEOM.depthZ);
export const ZONES = [];
for (let f = 0; f < GEOM.floors; f++) {
  for (const s of SIDES) {
    const share = SIDE_INFO[s].length / PERIMETER;
    ZONES.push({ index: ZONES.length, floor: f, side: s, area: FLOOR_AREA * share, desks: Math.round((PEOPLE.max / GEOM.floors) * share) });
  }
}
export const TOTAL_AREA = FLOOR_AREA * GEOM.floors;

export function opt(key, id) {
  const o = OPTIONS[key].find((x) => x.id === id);
  if (!o) throw new Error(`Unknown option ${key}:${id}`);
  return o;
}

// ---------- sun and weather ----------
export function sunPosition(dayOfYear, hour, lat = SITE.latitude) {
  const decl = 23.45 * Math.sin(RAD * (360 / 365) * (284 + dayOfYear));
  const w = 15 * (hour - 12);
  const sinAlt = Math.sin(lat * RAD) * Math.sin(decl * RAD) + Math.cos(lat * RAD) * Math.cos(decl * RAD) * Math.cos(w * RAD);
  const alt = Math.asin(clamp(sinAlt, -1, 1));
  const cosAz = (sinAlt * Math.sin(lat * RAD) - Math.sin(decl * RAD)) / (Math.cos(alt) * Math.cos(lat * RAD) || 1e-9);
  let az = Math.acos(clamp(cosAz, -1, 1)) / RAD; // degrees from south
  if (w < 0) az = -az; // morning sun is east (negative)
  return { altitude: alt / RAD, azimuth: az };
}

export function irradiance(altitude, cloud) {
  if (altitude <= 0) return { dni: 0, dhi: 0, ghi: 0 };
  const s = Math.sin(altitude * RAD);
  const am = 1 / Math.max(s, 0.05);
  const dniClear = 1000 * Math.pow(0.7, Math.pow(am, 0.678));
  const dni = dniClear * (1 - cloud);
  const dhi = 0.1 * dniClear + cloud * 0.3 * dniClear * s;
  return { dni, dhi, ghi: dni * s + dhi };
}

export function outdoorTemp(day, hour) {
  const mean = (day.hi + day.lo) / 2;
  const amp = (day.hi - day.lo) / 2;
  return mean + amp * Math.cos((2 * Math.PI * (hour - 15)) / 24);
}

// Direct sun let through by the shades on one facade (1 = no shading).
export function shadeFactor(side, hasShade, sun) {
  if (!hasShade) return 1;
  if (side !== "S") return 0.3; // louvered fins on east, west and north
  const rel = Math.cos((sun.azimuth - SIDE_INFO.S.azimuth) * RAD);
  if (rel <= 0 || sun.altitude <= 0) return 1;
  const tanProfile = Math.tan(sun.altitude * RAD) / rel;
  return 1 - Math.min(1, 0.6 * tanProfile); // overhang 0.6x the window height
}

export function facadeSun(side, sun, irr) {
  const cosInc = Math.cos(sun.altitude * RAD) * Math.cos((sun.azimuth - SIDE_INFO[side].azimuth) * RAD);
  return {
    direct: irr.dni * Math.max(0, cosInc),
    diffuse: irr.dhi * 0.5 + irr.ghi * THERMAL.groundReflectance * 0.5,
    cosInc,
  };
}

// One representative day per month, with seeded clouds and events.
export function makeYear(seed) {
  const rng = mulberry32(seed);
  const days = [];
  for (let d = 0; d < DAYS_PER_YEAR; d++) {
    const month = (START_MONTH + d) % 12;
    const w = WEATHER[month];
    days.push({ index: d, month, doy: w.doy, hi: w.hi, lo: w.lo, cloud: clamp(w.cloud + (rng() - 0.5) * 0.5, 0, 0.9), snowPsf: w.snow, event: null });
  }
  const byMonth = (months) => days.filter((x) => months.includes(x.month) && !x.event);
  const pick = (list) => list[Math.floor(rng() * list.length)];
  const heat = pick(byMonth([5, 6, 7]));
  Object.assign(heat, { event: "heatwave", hi: heat.hi + 7, lo: heat.lo + 5, cloud: 0.05 });
  const cold = pick(byMonth([11, 0, 1]));
  Object.assign(cold, { event: "coldsnap", hi: cold.hi - 14, lo: cold.lo - 14, cloud: 0.1 });
  const bliz = pick(byMonth([11, 0, 1]));
  Object.assign(bliz, { event: "blizzard", snowPsf: STRUCTURE.designSnowPsf, cloud: 0.9 });
  const wind = pick(byMonth([2, 3, 9, 10]));
  wind.event = "windstorm";
  const quake = pick(days.filter((x) => !x.event && x.index > 0));
  quake.event = "earthquake";
  return { seed, days };
}

// ---------- building model ----------
export function buildingModel(design) {
  const glass = opt("glass", design.glass);
  const ins = opt("insulation", design.insulation);
  const lat = opt("lateral", design.lateral);
  const light = opt("lighting", design.lighting);
  const zones = ZONES.map((z) => {
    const wall = SIDE_INFO[z.side].length * GEOM.floorHeight;
    const wwr = design.wwr[z.side];
    const win = wall * wwr;
    const top = z.floor === GEOM.floors - 1;
    const roofArea = top ? z.area : 0;
    const uaEnv = glass.u * win + ins.uWall * (wall - win) + ins.uRoof * roofArea + THERMAL.infilPerM2 * z.area;
    const viewWwr = wwr * (1 - (lat.viewPenalty || 0));
    return { ...z, wall, wwr, win, roofArea, uaEnv, vent: THERMAL.ventPerM2 * z.area, cap: THERMAL.capacitancePerM2 * z.area, viewWwr };
  });
  return { design, glass, ins, lat, light, zones };
}

// Heat gains for one zone at one moment (W) plus daylight and glare.
export function zoneGains(model, z, sun, irr, people, open) {
  const fs = facadeSun(z.side, sun, irr);
  const shaded = model.design.shades[z.side];
  const sf = shadeFactor(z.side, shaded, sun);
  const diffuseF = shaded ? 0.8 : 1;
  const solar = z.win * model.glass.shgc * (fs.direct * sf + fs.diffuse * diffuseF);
  const roofSolar = z.roofArea ? (THERMAL.roofAbsorptance * irr.ghi / THERMAL.outsideFilm) * model.ins.uRoof * z.roofArea : 0;
  const sky = clamp(irr.ghi / 400, 0, 1);
  const daylight = z.viewWwr * model.glass.vt * diffuseF * sky; // 0..~0.6
  const dimming = open ? clamp(daylight * 2.2, 0, 0.7) : 0;
  const lightFrac = open ? 1 - dimming : 0.05;
  const lights = model.light.wPerM2 * z.area * lightFrac;
  const plugs = THERMAL.plugWPerM2 * z.area * (open ? 1 : 0.25);
  const internal = people * THERMAL.personW + lights + plugs;
  const directIn = fs.direct * sf;
  const glare = open && sun.altitude > 0 && sun.altitude < 40 && fs.cosInc > 0.3 && directIn > 250 && z.viewWwr >= 0.45;
  return { solar, roofSolar, internal, lights, plugs, daylight, dimming, glare };
}

// Advance zone temperatures by one step. Returns the new temps and all loads.
export function stepBuilding(model, temps, ctx) {
  const { tOut, sun, irr, open, presentByZone, hvacOn } = ctx;
  const d = model.design;
  const sp = THERMAL.setpoints;
  const tc = open ? sp.coolOpen : sp.coolClosed;
  const th = open ? sp.heatOpen : sp.heatClosed;
  const dtS = DT * 3600;
  const zoneOut = [];
  let coolDem = 0;
  let heatDem = 0;
  for (const z of model.zones) {
    const g = zoneGains(model, z, sun, irr, presentByZone[z.index] || 0, open);
    const ua = z.uaEnv + (open ? z.vent : 0);
    const qFree = g.solar + g.roofSolar + g.internal + ua * (tOut - temps[z.index]);
    const tPred = temps[z.index] + (dtS / z.cap) * qFree;
    const cool = tPred > tc ? ((tPred - tc) * z.cap) / dtS : 0;
    const heat = tPred < th ? ((th - tPred) * z.cap) / dtS : 0;
    coolDem += cool;
    heatDem += heat;
    zoneOut.push({ g, tPred, cool, heat, qFree });
  }
  const coolCap = hvacOn ? d.units * HVAC.unitCoolKw * 1000 : 0;
  const heatCap = hvacOn ? d.units * (d.hvacType === "hp" ? HVAC.hpHeatKw : HVAC.gasHeatKw) * 1000 : 0;
  const cs = coolDem > 0 ? Math.min(1, coolCap / coolDem) : 0;
  const hs = heatDem > 0 ? Math.min(1, heatCap / heatDem) : 0;
  const newTemps = [];
  let coolDel = 0;
  let heatDel = 0;
  let lights = 0;
  let plugs = 0;
  const zones = model.zones.map((z, i) => {
    const o = zoneOut[i];
    const c = o.cool * cs;
    const h = o.heat * hs;
    coolDel += c;
    heatDel += h;
    lights += o.g.lights;
    plugs += o.g.plugs;
    const t = o.tPred + ((h - c) * dtS) / z.cap;
    newTemps.push(t);
    return { t, solar: o.g.solar, dimming: o.g.dimming, daylight: o.g.daylight, glare: o.g.glare, cool: c, heat: h, unmet: o.cool - c };
  });
  if (!hvacOn) {
    lights = 0;
    plugs = 0;
  }
  const hp = d.hvacType === "hp";
  const loadFrac = d.units ? (coolDel + heatDel) / (d.units * HVAC.unitCoolKw * 1000) : 0;
  const fans = hvacOn ? d.units * HVAC.fanKw * 1000 * (open ? 1 : Math.min(1, loadFrac)) : 0;
  const coolElec = coolDel / HVAC.copCool;
  const heatElec = hp ? heatDel / HVAC.hpCop(tOut) : 0;
  const gas = hp ? 0 : heatDel / HVAC.gasEff;
  const misc = hvacOn ? (open ? THERMAL.miscKwOpen : THERMAL.miscKwClosed) * 1000 : 0;
  const pv = d.pv * ELECTRICAL.pvKwPerArray * 1000 * (irr.ghi / 1000) * ELECTRICAL.pvDerate;
  const gross = lights + plugs + misc + fans + coolElec + heatElec;
  const kw = (w) => w / 1000;
  return {
    temps: newTemps,
    zones,
    cooling: { demand: kw(coolDem), delivered: kw(coolDel), cap: kw(coolCap) },
    heating: { demand: kw(heatDem), delivered: kw(heatDel), cap: kw(heatCap) },
    elec: { lights: kw(lights), plugs: kw(plugs), misc: kw(misc), hvac: kw(fans + coolElec + heatElec), pv: kw(pv), gross: kw(gross), net: kw(gross - pv) },
    gasKw: kw(gas),
  };
}

// ---------- structure ----------
export function roofCheck(design, snowPsf = STRUCTURE.designSnowPsf) {
  const demand = STRUCTURE.roofDeadPsf + opt("insulation", design.insulation).roofPsf + snowPsf + design.units * STRUCTURE.unitPsf + design.pv * STRUCTURE.pvPsf;
  const cap = opt("roof", design.roof).capPsf;
  return { demand, cap, dc: demand / cap };
}

export function lateralCheck(design) {
  const ft = STRUCTURE.ftPerM;
  const hFt = GEOM.floors * GEOM.floorHeight * ft;
  const lx = GEOM.lengthX * ft;
  const lz = GEOM.depthZ * ft;
  const roofSf = GEOM.lengthX * GEOM.depthZ * ft * ft;
  const weight = STRUCTURE.buildingKips + design.units * STRUCTURE.unitKips + design.pv * STRUCTURE.pvKips + (0.2 * STRUCTURE.designSnowPsf * roofSf) / 1000;
  const seismic = STRUCTURE.seismicCs * weight;
  // Wind on the long north/south faces pushes north-south (Y); on the east/west faces, east-west (X).
  const windY = (STRUCTURE.windPsf * lx * hFt) / 1000;
  const windX = (STRUCTURE.windPsf * lz * hFt) / 1000;
  const lat = opt("lateral", design.lateral);
  let capX;
  let capY;
  if (lat.id === "shear") {
    // Walls parallel to the load resist it: N+S walls for X, E+W walls for Y.
    capX = lat.capPerFt * lx * ((1 - design.wwr.N) + (1 - design.wwr.S));
    capY = lat.capPerFt * lz * ((1 - design.wwr.E) + (1 - design.wwr.W));
  } else {
    capX = lat.capKips;
    capY = lat.capKips;
  }
  const x = { wind: windX, seismic, demand: Math.max(windX, seismic), cap: capX };
  const y = { wind: windY, seismic, demand: Math.max(windY, seismic), cap: capY };
  x.dc = x.demand / x.cap;
  y.dc = y.demand / y.cap;
  const worst = y.dc >= x.dc ? "Y" : "X";
  return { x, y, weight, dc: Math.max(x.dc, y.dc), worst };
}

// ---------- design checks (what the gauges show) ----------
export function serviceKw(design) {
  return opt("service", design.service).amps * ELECTRICAL.voltsKwPerAmp;
}

export function unitMaxElecKw(design) {
  const cool = HVAC.unitCoolKw / HVAC.copCool + HVAC.fanKw;
  if (design.hvacType !== "hp") return cool;
  return Math.max(cool, HVAC.hpHeatKw / HVAC.hpCop(-20) + HVAC.fanKw);
}

export function designChecks(design) {
  const model = buildingModel(design);
  // Cooling: clear July design day, 91 F high, every desk full.
  const day = { hi: 33, lo: 23, doy: 198 };
  let coolLoad = 0;
  let peakHour = 15;
  let peakZone = null;
  for (let h = 8; h <= 18; h++) {
    const sun = sunPosition(day.doy, h);
    const irr = irradiance(sun.altitude, 0);
    const tOut = outdoorTemp(day, h);
    let sum = 0;
    let best = null;
    for (const z of model.zones) {
      const g = zoneGains(model, z, sun, irr, z.desks, true);
      const q = Math.max(0, g.solar + g.roofSolar + g.internal + (z.uaEnv + z.vent) * (tOut - THERMAL.setpoints.coolOpen));
      sum += q;
      if (!best || q / z.area > best.q / best.z.area) best = { z, q };
    }
    if (sum > coolLoad) {
      coolLoad = sum;
      peakHour = h;
      peakZone = best.z;
    }
  }
  coolLoad /= 1000;
  const coolCap = design.units * HVAC.unitCoolKw;
  // Heating: -4 F winter morning, half the outdoor air, no free heat.
  const dT = THERMAL.setpoints.heatOpen - -20;
  const heatLoad = model.zones.reduce((s, z) => s + (z.uaEnv + 0.5 * z.vent) * dT, 0) / 1000;
  const heatCap = design.units * (design.hvacType === "hp" ? HVAC.hpHeatKw : HVAC.gasHeatKw);
  // Electrical: everything that could run at once (solar not counted: cloudy days happen).
  const base = (model.light.wPerM2 * TOTAL_AREA + THERMAL.plugWPerM2 * TOTAL_AREA) / 1000 + THERMAL.miscKwOpen;
  const elecDemand = base + design.units * unitMaxElecKw(design);
  const elecCap = serviceKw(design);
  const roof = roofCheck(design);
  const lateral = lateralCheck(design);
  const daylight = model.zones.reduce((s, z) => s + Math.min(1, z.viewWwr / 0.45) * z.area, 0) / TOTAL_AREA;
  return {
    coolLoad, coolCap, coolDC: coolCap ? coolLoad / coolCap : 9.99, peakHour, peakZone: peakZone && { floor: peakZone.floor, side: peakZone.side },
    heatLoad, heatCap, heatDC: heatCap ? heatLoad / heatCap : 9.99,
    elecDemand, elecCap, elecDC: elecDemand / elecCap,
    roof, roofDC: roof.dc,
    lateral, latDC: lateral.dc,
    daylight,
    unitsNeeded: Math.ceil(Math.max(coolLoad / HVAC.unitCoolKw, heatLoad / (design.hvacType === "hp" ? HVAC.hpHeatKw : HVAC.gasHeatKw))),
  };
}

// Quick full-year run with every desk full: energy, comfort, breaker trips.
export function forecastYear(design, year) {
  const model = buildingModel(design);
  let temps = ZONES.map(() => 22);
  const present = ZONES.map((z) => z.desks);
  const empty = ZONES.map(() => 0);
  const cap = serviceKw(design);
  let elecKwh = 0;
  let gasKwh = 0;
  let cost = 0;
  let hotHours = 0;
  let coldHours = 0;
  let tripHours = 0;
  for (const day of year.days) {
    let dayElec = 0;
    let dayGas = 0;
    let peak = 0;
    for (let h = 0; h < 24; h += DT) {
      const open = h >= THERMAL.openHour && h < THERMAL.closeHour;
      const sun = sunPosition(day.doy, h);
      const irr = irradiance(sun.altitude, day.cloud);
      const r = stepBuilding(model, temps, { tOut: outdoorTemp(day, h), sun, irr, open, presentByZone: open ? present : empty, hvacOn: true });
      temps = r.temps;
      const net = Math.max(0, r.elec.net);
      dayElec += net * DT;
      dayGas += r.gasKw * DT;
      peak = Math.max(peak, net);
      if (open) {
        for (const t of temps) {
          if (t > THERMAL.comfort.high) hotHours += DT;
          if (t < THERMAL.comfort.low) coldHours += DT;
        }
        if (net > cap) tripHours += DT;
      }
    }
    elecKwh += dayElec * MONEY.billingDays;
    gasKwh += dayGas * MONEY.billingDays;
    cost += (dayElec * MONEY.elecPerKwh + dayGas * MONEY.gasPerKwh) * MONEY.billingDays + peak * MONEY.demandPerKw;
  }
  return { elecKwh, gasKwh, energyCost: cost, hotHours, coldHours, tripHours, eui: (elecKwh + gasKwh) / TOTAL_AREA };
}

export function analyze(design, year) {
  return { ...designChecks(design), ...forecastYear(design, year) };
}

// ---------- roof slots ----------
export function roofLayout(design) {
  const slots = Array(ROOF_SLOTS.cols * ROOF_SLOTS.rows).fill(null);
  const pv = [];
  for (const pair of PV_SLOT_PAIRS) {
    if (pv.length >= design.pv) break;
    pair.forEach((s) => (slots[s] = "pv"));
    pv.push(pair);
  }
  const units = [];
  for (const s of UNIT_SLOT_ORDER) {
    if (units.length >= design.units) break;
    if (!slots[s]) {
      slots[s] = "unit";
      units.push(s);
    }
  }
  return { slots, units, pv, free: slots.filter((s) => !s).length };
}

export function canAddUnit(design) {
  return roofLayout(design).free >= 1;
}

export function canAddPV(design) {
  if (design.pv >= PV_SLOT_PAIRS.length) return false;
  const lay = roofLayout({ ...design, pv: design.pv + 1 });
  return lay.pv.length === design.pv + 1 && lay.units.length === design.units;
}

// ---------- the game ----------
export function cloneDesign(d) {
  return { ...d, wwr: { ...d.wwr }, shades: { ...d.shades } };
}

function makeOccupant(state, zoneIndex, rng, newcomer = false) {
  const z = ZONES[zoneIndex];
  const used = new Set(state.occupants.filter((o) => o.zone === zoneIndex && o.status === "active").map((o) => o.desk));
  let desk = 0;
  while (used.has(desk)) desk++;
  return {
    id: state.nextId++,
    zone: zoneIndex,
    floor: z.floor,
    side: z.side,
    desk,
    shirt: PEOPLE.shirts[Math.floor(rng() * PEOPLE.shirts.length)],
    skin: PEOPLE.skins[Math.floor(rng() * PEOPLE.skins.length)],
    mood: newcomer ? 75 : 65,
    status: "active",
    inside: false,
    arrive: 8,
    leave: 17,
    reason: "comfy",
    newcomer,
  };
}

function freeZones(state) {
  return ZONES.filter((z) => state.occupants.filter((o) => o.status === "active" && o.zone === z.index).length < z.desks).map((z) => z.index);
}

export function createGame(seed = 2026, design = DEFAULT_DESIGN) {
  const rng = mulberry32(seed ^ 0x9e3779b9);
  const state = {
    seed,
    rng,
    year: makeYear(seed),
    design: cloneDesign(design),
    t: 6, // hours since opening day midnight
    temps: ZONES.map(() => 22),
    cash: MONEY.startCash,
    spent: 0,
    occupants: [],
    nextId: 1,
    blackoutUntil: -1,
    evacuatedUntil: -1,
    topClosedUntil: -1,
    dayIndex: -1,
    day: null,
    live: null,
    finished: false,
    stats: { personHours: 0, comfyHours: 0, moodHours: 0, glareHours: 0, trips: 0, damage: 0, roofSags: 0, survived: 0, elecKwh: 0, gasKwh: 0, energyCost: 0, rent: 0, repairs: 0, quits: 0, arrivals: 0, startTenants: 0 },
    dayStats: null,
    history: [],
  };
  for (let i = 0; i < PEOPLE.start; i++) {
    const zs = freeZones(state);
    state.occupants.push(makeOccupant(state, zs[Math.floor(rng() * zs.length)], rng));
  }
  state.stats.startTenants = PEOPLE.start;
  state.analysis = analyze(state.design, state.year);
  startDay(state, 0, []);
  return state;
}

export function activeOccupants(state) {
  return state.occupants.filter((o) => o.status === "active");
}

export function avgMood(state) {
  const a = activeOccupants(state);
  return a.length ? a.reduce((s, o) => s + o.mood, 0) / a.length : 0;
}

function startDay(state, d, events) {
  const rng = state.rng;
  state.dayIndex = d;
  state.day = state.year.days[d];
  state.dayStats = { elecKwh: 0, gasKwh: 0, peakKw: 0, cost: 0, trips: 0 };
  // Happy buildings attract new tenants.
  const mood = avgMood(state);
  const zs = freeZones(state);
  if (d > 0 && mood > 60 && zs.length) {
    const n = Math.min(zs.length, 1 + Math.floor(rng() * 3) + (mood > 75 ? 1 : 0));
    for (let i = 0; i < n; i++) {
      const free = freeZones(state);
      if (!free.length) break;
      const o = makeOccupant(state, free[Math.floor(rng() * free.length)], rng, true);
      state.occupants.push(o);
      state.stats.arrivals++;
      events.push({ type: "newTenant", id: o.id });
    }
  }
  const newIds = new Set(events.filter((e) => e.type === "newTenant").map((e) => e.id));
  for (const o of activeOccupants(state)) {
    o.arrive = 7 + rng() * 1.75;
    o.leave = 16 + rng() * 2;
    o.newcomer = newIds.has(o.id);
  }
  const day = state.day;
  events.push({ type: "dayStart", day: d, month: day.month, event: day.event });
}

function endDay(state, events) {
  const ds = state.dayStats;
  const tenants = activeOccupants(state).length;
  const rent = tenants * MONEY.rentPerTenant;
  const energy = ds.cost * MONEY.billingDays + ds.peakKw * MONEY.demandPerKw;
  state.cash += rent - energy;
  state.stats.rent += rent;
  state.stats.energyCost += energy;
  state.stats.elecKwh += ds.elecKwh * MONEY.billingDays;
  state.stats.gasKwh += ds.gasKwh * MONEY.billingDays;
  const summary = { day: state.dayIndex, month: state.day.month, rent, energy, tenants, mood: avgMood(state), peakKw: ds.peakKw, trips: ds.trips };
  state.history.push(summary);
  events.push({ type: "dayEnd", ...summary });
  if (state.dayIndex >= DAYS_PER_YEAR - 1) {
    state.finished = true;
    events.push({ type: "yearEnd", report: yearReport(state) });
  } else {
    startDay(state, state.dayIndex + 1, events);
  }
}

function moodTarget(o, z, ctx) {
  if (ctx.blackout) return { target: 25, reason: "dark" };
  let target = 55;
  let reason = "comfy";
  const c = THERMAL.comfort;
  if (z.t > c.high) {
    target -= Math.min(55, 12 * (z.t - c.high));
    reason = "hot";
  } else if (z.t < c.low) {
    target -= Math.min(55, 12 * (c.low - z.t));
    reason = "cold";
  }
  const view = Math.min(1, ctx.model.zones[o.zone].viewWwr / 0.45);
  target += 20 * view;
  if (z.glare) {
    target -= 15;
    if (reason === "comfy") reason = "glare";
  }
  if (ctx.sway) {
    target -= 6;
    if (reason === "comfy") reason = "sway";
  }
  if (reason === "comfy" && view > 0.8) reason = "view";
  return { target: clamp(target, 0, 100), reason };
}

function runEvent(state, kind, events) {
  const d = state.design;
  const cfg = EVENTS[kind];
  if (kind === "blizzard") {
    const r = roofCheck(d, state.day.snowPsf);
    const ok = r.dc <= 1;
    if (ok) state.stats.survived++;
    else {
      state.stats.roofSags++;
      const cost = MONEY.repairBase;
      state.cash -= cost;
      state.stats.repairs += cost;
      state.topClosedUntil = (state.dayIndex + 1) * 24;
    }
    events.push({ type: "structEvent", kind, ok, dc: r.dc, demand: r.demand, cap: r.cap, unit: "psf", label: cfg.label, icon: cfg.icon });
    return;
  }
  const l = lateralCheck(d);
  const dem = kind === "windstorm" ? Math.max(l.x.wind / l.x.cap, l.y.wind / l.y.cap) : Math.max(l.x.seismic / l.x.cap, l.y.seismic / l.y.cap);
  const ok = dem <= 1;
  if (ok) state.stats.survived++;
  else {
    state.stats.damage++;
    const cost = Math.round(MONEY.repairBase * (1 + 3 * (dem - 1)));
    state.cash -= cost;
    state.stats.repairs += cost;
    state.evacuatedUntil = (state.dayIndex + 1) * 24;
  }
  events.push({ type: "structEvent", kind, ok, dc: dem, label: cfg.label, icon: cfg.icon });
}

// Advance the game by `hours` (in DT steps). Returns events for the UI and scene.
export function step(state, hours) {
  const events = [];
  let left = hours;
  while (left > 1e-9 && !state.finished) {
    tick(state, events);
    left -= DT;
  }
  return events;
}

function tick(state, events) {
  const d = state.design;
  const model = buildingModel(d);
  const day = state.day;
  const hour = state.t - state.dayIndex * 24;
  const open = hour >= THERMAL.openHour && hour < THERMAL.closeHour;
  const sun = sunPosition(day.doy, hour);
  const irr = irradiance(sun.altitude, day.cloud);
  const tOut = outdoorTemp(day, hour);

  // Structural events fire once, at their hour.
  if (day.event && EVENTS[day.event].hour !== undefined && Math.abs(hour - EVENTS[day.event].hour) < DT / 2) runEvent(state, day.event, events);

  const evacuated = state.t < state.evacuatedUntil;
  const topClosed = state.t < state.topClosedUntil;
  const blackout = state.t < state.blackoutUntil;
  const present = ZONES.map(() => 0);
  for (const o of activeOccupants(state)) {
    const want = hour >= o.arrive && hour < o.leave && !evacuated && !(topClosed && o.floor === GEOM.floors - 1);
    if (o.inside && !want) {
      // Leaving. Very unhappy people may quit for good.
      if (o.mood < 30 && state.rng() < 0.5) {
        o.status = "quit";
        state.stats.quits++;
        events.push({ type: "quit", id: o.id, reason: o.reason });
      }
    }
    o.inside = want && o.status === "active";
    if (o.inside) present[o.zone]++;
  }

  const r = stepBuilding(model, state.temps, { tOut, sun, irr, open, presentByZone: present, hvacOn: !blackout });
  state.temps = r.temps;

  // Main breaker.
  const cap = serviceKw(d);
  const net = Math.max(0, r.elec.net);
  if (!blackout && net > cap) {
    state.blackoutUntil = state.t + 2;
    state.stats.trips++;
    state.dayStats.trips++;
    events.push({ type: "trip", load: net, cap });
  }
  if (blackout && state.t + DT >= state.blackoutUntil) events.push({ type: "power", on: true });

  // Moods.
  const sway = day.event === "windstorm" && d.lateral === "moment" && Math.abs(hour - 14) < 2;
  const ctx = { model, blackout, sway };
  const k = 1 - Math.pow(0.7, DT);
  for (const o of activeOccupants(state)) {
    if (!o.inside) continue;
    const z = r.zones[o.zone];
    const { target, reason } = moodTarget(o, z, ctx);
    o.mood += (target - o.mood) * k;
    o.reason = reason;
    state.stats.personHours += DT;
    state.stats.moodHours += o.mood * DT;
    if (z.t <= THERMAL.comfort.high && z.t >= THERMAL.comfort.low && !blackout) state.stats.comfyHours += DT;
    if (z.glare) state.stats.glareHours += DT;
  }

  // Energy.
  const ds = state.dayStats;
  ds.elecKwh += net * DT;
  ds.gasKwh += r.gasKw * DT;
  ds.peakKw = Math.max(ds.peakKw, net);
  ds.cost += (net * MONEY.elecPerKwh + r.gasKw * MONEY.gasPerKwh) * DT;

  state.live = { hour, tOut, sun, irr, open, blackout, evacuated, topClosed, present, cap, ...r, net, event: day.event };
  state.t += DT;
  if (state.t >= (state.dayIndex + 1) * 24 - 1e-9) endDay(state, events);
}

// ---------- actions ----------
const pct = (v) => `${Math.round(v * 100)}%`;

export function actionCost(state, a) {
  const d = state.design;
  switch (a.type) {
    case "setWWR": {
      const area = SIDE_INFO[a.side].length * GEOM.floorHeight * GEOM.floors * (a.value - d.wwr[a.side]);
      return Math.round(area > 0 ? area * MONEY.windowAddPerM2 : -area * MONEY.windowRemovePerM2);
    }
    case "toggleShade":
      return d.shades[a.side] ? 0 : SIDE_INFO[a.side].length * GEOM.floors * MONEY.shadePerM;
    case "setOption": {
      if (a.key === "hvacType") return d.units * Math.max(5000, opt("hvacType", a.value).unitCost - opt("hvacType", d.hvacType).unitCost);
      return Math.max(0, opt(a.key, a.value).cost - opt(a.key, d[a.key]).cost);
    }
    case "addUnit":
      return opt("hvacType", d.hvacType).unitCost + HVAC.liftCost;
    case "removeUnit":
      return HVAC.liftCost;
    case "addPV":
      return MONEY.pvCost;
    case "removePV":
      return MONEY.pvRemove;
    default:
      return 0;
  }
}

function actionLabel(state, a, next) {
  const d = state.design;
  switch (a.type) {
    case "setWWR":
      return `🪟 ${SIDE_INFO[a.side].name} windows ${pct(d.wwr[a.side])} → ${pct(a.value)}`;
    case "toggleShade":
      return `⛱️ ${SIDE_INFO[a.side].name} sun shades ${next.shades[a.side] ? "added" : "removed"}`;
    case "setOption": {
      const o = opt(a.key, a.value);
      return `${o.icon} ${opt(a.key, d[a.key]).name} → ${o.name}`;
    }
    case "addUnit":
      return `🚁 Rooftop unit #${next.units} flown in`;
    case "removeUnit":
      return `🚁 Rooftop unit flown away (${next.units} left)`;
    case "addPV":
      return `☀️ Solar array #${next.pv} installed`;
    case "removePV":
      return `☀️ Solar array removed`;
    default:
      return a.type;
  }
}

function whyKind(a) {
  if (a.type === "setWWR") return "wwr";
  if (a.type === "toggleShade") return "shades";
  if (a.type === "setOption") return a.key;
  return a.type;
}

// Room-hours in a year of work days: 12 days x 11 open hours x 12 rooms.
export const HOT_HOURS_BASE = DAYS_PER_YEAR * (THERMAL.closeHour - THERMAL.openHour) * ZONES.length;

const METRICS = [
  { key: "latDC", label: "Wind & quake bracing", dc: true, detail: (x) => `${Math.round(x.lateral[x.lateral.worst.toLowerCase()].demand)} kips push vs ${Math.round(x.lateral[x.lateral.worst.toLowerCase()].cap)} kips strength` },
  { key: "roofDC", label: "Roof framing", dc: true, detail: (x) => `${x.roof.demand.toFixed(1)} psf vs ${x.roof.cap} psf` },
  { key: "coolDC", label: "Cooling", dc: true, detail: (x) => `${Math.round(x.coolLoad)} kW needed vs ${Math.round(x.coolCap)} kW installed` },
  { key: "heatDC", label: "Heating", dc: true, detail: (x) => `${Math.round(x.heatLoad)} kW needed vs ${Math.round(x.heatCap)} kW installed` },
  { key: "elecDC", label: "Electrical service", dc: true, detail: (x) => `${Math.round(x.elecDemand)} kW load vs ${Math.round(x.elecCap)} kW service` },
  { key: "daylight", label: "Daylight & views", fmt: (v) => `${Math.round(v * 100)}%`, better: 1, min: 0.02 },
  { key: "hotHours", label: "Work hours too hot somewhere", fmt: (v) => `${Math.round((100 * v) / HOT_HOURS_BASE)}%`, better: -1, min: 0.5 },
  { key: "energyCost", label: "Yearly energy bill", fmt: (v) => `$${Math.round(v / 1000)}k`, better: -1, min: 1000 },
];

export function dcStatus(dc) {
  if (dc > 1) return "bad";
  if (dc > 0.85) return "warn";
  return "ok";
}

export function describeChain(state, a, before, after, next, cost) {
  const kind = whyKind(a);
  const lines = [];
  for (const m of METRICS) {
    const b = before[m.key];
    const n = after[m.key];
    if (m.dc) {
      if (Math.abs(n - b) < 0.015) continue;
      const st = dcStatus(n);
      lines.push({ metric: m.key, label: m.label, from: b.toFixed(2), to: n.toFixed(2), status: st, icon: st === "bad" ? "🔴" : st === "warn" ? "🟡" : "✅", detail: m.detail(after), why: (WHY[kind] && WHY[kind][m.key]) || "" });
    } else {
      if (Math.abs(n - b) < m.min) continue;
      const good = (n - b) * m.better > 0;
      lines.push({ metric: m.key, label: m.label, from: m.fmt(b), to: m.fmt(n), status: good ? "ok" : "warn", icon: good ? "👍" : "👎", detail: "", why: (WHY[kind] && WHY[kind][m.key]) || "" });
    }
  }
  return { title: actionLabel(state, a, next), cost, lines };
}

export function applyAction(state, a) {
  const d = state.design;
  const next = cloneDesign(d);
  let fx = null;
  switch (a.type) {
    case "setWWR": {
      const v = round2(clamp(a.value, WWR_MIN, WWR_MAX));
      if (Math.abs(v - d.wwr[a.side]) < 1e-6) return { ok: false, reason: "No change." };
      next.wwr[a.side] = v;
      a = { ...a, value: v };
      fx = { kind: "rebuild" };
      break;
    }
    case "toggleShade":
      next.shades[a.side] = !d.shades[a.side];
      fx = { kind: "rebuild" };
      break;
    case "setOption":
      if (d[a.key] === a.value) return { ok: false, reason: "Already selected." };
      opt(a.key, a.value);
      next[a.key] = a.value;
      fx = { kind: a.key === "service" ? "truck" : "rebuild" };
      break;
    case "addUnit": {
      if (!canAddUnit(d)) return { ok: false, reason: "The roof is full. Remove a solar array to make room." };
      next.units++;
      const slot = roofLayout(next).units.find((s) => !roofLayout(d).units.includes(s));
      fx = { kind: "heliDeliver", slot };
      break;
    }
    case "removeUnit": {
      if (d.units <= 0) return { ok: false, reason: "No units to remove." };
      next.units--;
      const slot = roofLayout(d).units.find((s) => !roofLayout(next).units.includes(s));
      fx = { kind: "heliRemove", slot };
      break;
    }
    case "addPV":
      if (!canAddPV(d)) return { ok: false, reason: "No room on the roof for another solar array." };
      next.pv++;
      fx = { kind: "rebuild" };
      break;
    case "removePV":
      if (d.pv <= 0) return { ok: false, reason: "No solar arrays to remove." };
      next.pv--;
      fx = { kind: "rebuild" };
      break;
    default:
      return { ok: false, reason: `Unknown action ${a.type}` };
  }
  const cost = actionCost(state, a);
  const before = state.analysis;
  const after = analyze(next, state.year);
  const chain = describeChain(state, a, before, after, next, cost);
  state.design = next;
  state.analysis = after;
  state.cash -= cost;
  state.spent += cost;
  return { ok: true, cost, chain, fx };
}

// ---------- report card ----------
export function grade(score) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export function yearReport(state) {
  const s = state.stats;
  const comfort = s.personHours ? (100 * s.comfyHours) / s.personHours : 0;
  const happiness = s.personHours ? s.moodHours / s.personHours : 0;
  const tenants = activeOccupants(state).length;
  const eui = (s.elecKwh + s.gasKwh) / TOTAL_AREA;
  const glarePct = s.personHours ? (100 * s.glareHours) / s.personHours : 0;
  const daylight = designChecks(state.design).daylight;
  const cards = [
    { discipline: "Architecture", icon: "📐", score: clamp(100 * daylight - glarePct * 2, 0, 100), line: `Daylight & views ${Math.round(daylight * 100)}%, glare ${glarePct.toFixed(0)}% of desk hours` },
    { discipline: "Structural", icon: "🏗️", score: clamp(100 - 35 * s.damage - 25 * s.roofSags, 0, 100), line: `${s.survived} of ${s.survived + s.damage + s.roofSags} storms and quakes survived without damage` },
    { discipline: "Mechanical", icon: "❄️", score: comfort, line: `Comfortable ${comfort.toFixed(0)}% of desk hours` },
    { discipline: "Electrical", icon: "⚡", score: clamp(100 - 15 * s.trips, 0, 100), line: `${s.trips} breaker trip${s.trips === 1 ? "" : "s"}` },
    { discipline: "Energy", icon: "🌱", score: clamp(100 - (eui - 100), 0, 100), line: `${Math.round(eui)} kWh/m²·yr (${Math.round(eui * 0.317)} kBtu/sf), $${Math.round(s.energyCost / 1000)}k bills` },
    { discipline: "Tenants", icon: "🙂", score: clamp((100 * tenants) / PEOPLE.max * 0.5 + happiness * 0.5, 0, 100), line: `${tenants} of ${PEOPLE.max} desks filled, average mood ${Math.round(happiness)}` },
  ].map((c) => ({ ...c, score: Math.round(c.score), grade: grade(c.score) }));
  const overall = Math.round(cards.reduce((a, c) => a + c.score, 0) / cards.length);
  return {
    cards, overall, grade: grade(overall), cash: state.cash, cashChange: state.cash - MONEY.startCash, spent: state.spent,
    rent: s.rent, energyCost: s.energyCost, repairs: s.repairs, quits: s.quits, arrivals: s.arrivals, tenants, happiness, comfort, eui,
  };
}

export function clock(state) {
  const hour = state.t - state.dayIndex * 24;
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return { hour, label: `${h12}:${String(m).padStart(2, "0")} ${ampm}`, month: WEATHER[state.day.month], dayIndex: state.dayIndex };
}
