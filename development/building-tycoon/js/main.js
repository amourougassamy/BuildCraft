// main.js: game loop. Glues the sim (rules), the scene (3D) and the UI (panels).
import { createGame, step, applyAction, DT, ZONES, cloneDesign } from "./sim.js";
import { DEFAULT_DESIGN, EVENTS, WEATHER, HVAC, OPTIONS } from "./data.js";
import { createWorld } from "./scene.js";
import { createUI, money, toF, zoneName } from "./ui.js";

const params = new URLSearchParams(location.search);
let seed = Number(params.get("seed")) || 2026;
let state = createGame(seed);
let speed = 0;
let lastSpeed = 1;
let acc = 0;
let alertDay = -1;

const world = createWorld(document.getElementById("view3d"));
const ui = createUI({ getState: () => state, onAction, screenPos: (id) => world.screenPos(id) });

const PART = { roofDC: "roof", latDC: "walls", elecDC: "transformer", coolDC: "units", heatDC: "units" };

function onAction(a) {
  const r = applyAction(state, a);
  if (!r.ok) {
    ui.toast(r.reason, "bad");
    return;
  }
  if (r.fx && r.fx.kind === "heliDeliver") world.heliDeliver(r.fx.slot);
  if (r.fx && r.fx.kind === "heliRemove") world.heliRemove(r.fx.slot);
  if (r.fx && r.fx.kind === "truck") world.truck(state.design.service);
  ui.addChain(r.chain);
  for (const l of r.chain.lines) if (PART[l.metric]) world.flash(PART[l.metric], l.status);
  ui.refresh();
}

function setSpeed(s) {
  speed = s;
  if (s > 0) lastSpeed = s;
  document.querySelectorAll("#speed button").forEach((b) => b.classList.toggle("on", Number(b.dataset.speed) === s));
}

function handle(events) {
  for (const e of events) {
    switch (e.type) {
      case "dayStart": {
        const m = WEATHER[e.month];
        if (e.event) {
          const ev = EVENTS[e.event];
          ui.banner(`${ev.icon} ${m.name}: ${ev.label}!`, ev.kid);
        } else ui.banner(`📅 ${m.name}`, `Month ${e.day + 1} of 12`);
        break;
      }
      case "dayEnd":
        ui.toast(`🧾 ${WEATHER[e.month].name}: rent +${money(e.rent)}, energy −${money(e.energy).replace("−", "")}. ${e.tenants} tenants, mood ${Math.round(e.mood)}.`, "info", null, 5000);
        break;
      case "trip":
        ui.toast(`⚡ Main breaker tripped! ${Math.round(e.load)} kW load vs ${Math.round(e.cap)} kW service. Lights and AC are off for 2 hours.`, "bad", nextService(), 9000);
        break;
      case "power":
        ui.toast("💡 Power's back on.", "good", null, 3000);
        break;
      case "structEvent":
        structEvent(e);
        break;
      case "quit":
        ui.say(e.id, "I quit! 📦", 4000);
        break;
      case "newTenant":
        setTimeout(() => ui.say(e.id, "Just moved in! 🎉", 3500), 1500);
        break;
      case "yearEnd":
        setSpeed(0);
        ui.showReport(e.report, {
          keep: () => restart(seed, state.design),
          fresh: () => restart(seed, DEFAULT_DESIGN),
          newYear: () => restart(seed + 1, DEFAULT_DESIGN),
        });
        break;
      default:
    }
  }
}

function nextService() {
  const list = OPTIONS.service;
  const i = list.findIndex((o) => o.id === state.design.service);
  if (i < 0 || i >= list.length - 1) return null;
  const o = list[i + 1];
  return { label: `🚚 Upgrade to ${o.name}`, fn: () => onAction({ type: "setOption", key: "service", value: o.id }) };
}

function structEvent(e) {
  if (e.kind === "earthquake") world.shake(2.8, 0.9);
  if (e.kind === "windstorm") world.shake(2.0, e.ok ? 0.15 : 0.5);
  const pct = `${Math.round(e.dc * 100)}%`;
  if (e.kind === "blizzard") {
    if (e.ok) ui.toast(`${e.icon} The roof carried the blizzard: ${e.demand.toFixed(1)} of ${e.cap} psf (${pct}). 💪`, "good", null, 8000);
    else {
      world.flash("roof", "bad");
      ui.toast(`${e.icon} The roof is sagging under the snow! ${e.demand.toFixed(1)} psf vs ${e.cap} psf capacity. The top floor was sent home and repairs cost money.`, "bad", { label: "💪 Reinforce the roof", fn: () => onAction({ type: "setOption", key: "roof", value: state.design.roof === "standard" ? "reinforced" : "heavy" }) }, 11000);
    }
    return;
  }
  if (e.ok) ui.toast(`${e.icon} ${e.label}! The bracing was loaded to ${pct} of its strength. The building held. 💪`, "good", null, 8000);
  else {
    world.flash("walls", "bad");
    ui.toast(`${e.icon} ${e.label}! The bracing was overloaded (${pct}). Cracked walls, repairs, and everyone was sent home for the day.`, "bad", { label: "🏗️ See structure options", fn: () => ui.setTab("struct") }, 11000);
  }
}

// Friendly nudges that link a symptom to the fix.
function alerts() {
  const L = state.live;
  if (!L || !L.open || state.dayIndex === alertDay) return;
  let hot = 0;
  state.temps.forEach((t, i) => {
    if (t > state.temps[hot]) hot = i;
  });
  if (state.temps[hot] > 26.5 && L.cooling.demand > L.cooling.cap) {
    alertDay = state.dayIndex;
    ui.toast(`🥵 The ${zoneName(ZONES[hot])} is ${toF(state.temps[hot])}°F and the rooftop units are maxed out.`, "bad", { label: `🚁 Fly in a unit`, fn: () => onAction({ type: "addUnit" }) }, 10000);
  } else if (state.temps[hot] < 19 && L.heating.demand > L.heating.cap) {
    alertDay = state.dayIndex;
    ui.toast(`🥶 The ${zoneName(ZONES[hot])} is only ${toF(state.temps[hot])}°F and the heaters are maxed out.`, "bad", { label: `🚁 Fly in a unit`, fn: () => onAction({ type: "addUnit" }) }, 10000);
  }
}

function restart(newSeed, design) {
  seed = newSeed;
  state = createGame(seed, cloneDesign(design));
  world.reset();
  acc = 0;
  alertDay = -1;
  document.getElementById("feed").innerHTML = "";
  ui.refresh();
  setSpeed(1);
}

// Controls
document.querySelectorAll("#speed button").forEach((b) => b.addEventListener("click", () => setSpeed(Number(b.dataset.speed))));
const heatBtn = document.getElementById("heatview");
heatBtn.addEventListener("click", () => {
  const on = heatBtn.classList.toggle("on");
  document.body.classList.toggle("heat", on);
  world.setHeatView(on);
});
const engBtn = document.getElementById("engview");
engBtn.addEventListener("click", () => {
  engBtn.classList.toggle("on");
  ui.setEng(engBtn.classList.contains("on"));
});
document.getElementById("rotl").addEventListener("click", () => world.snapRotate(-1));
document.getElementById("rotr").addEventListener("click", () => world.snapRotate(1));
document.getElementById("help").addEventListener("click", () => {
  const was = speed;
  setSpeed(0);
  ui.showIntro(() => setSpeed(was || 1));
});
window.addEventListener("keydown", (e) => {
  if (e.target.closest && e.target.closest("input, textarea")) return;
  if (e.key === " ") {
    e.preventDefault();
    setSpeed(speed ? 0 : lastSpeed);
  } else if (e.key === "1" || e.key === "2" || e.key === "3") setSpeed([1, 2, 4][Number(e.key) - 1]);
  else if (e.key === "q" || e.key === "Q") world.snapRotate(-1);
  else if (e.key === "e" || e.key === "E") world.snapRotate(1);
  else if (e.key === "h" || e.key === "H") heatBtn.click();
});

// Loop
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (speed > 0 && !state.finished) {
    const hour = state.t % 24;
    const rate = hour >= 6 && hour < 20 ? 1 : 6; // game hours per real second; nights fly by
    acc += dt * speed * rate;
    const n = Math.floor(acc / DT);
    if (n > 0) {
      acc -= n * DT;
      handle(step(state, n * DT));
      alerts();
    }
  }
  world.update(state, dt, speed);
  ui.frame(dt, speed > 0);
  ui.tick(dt);
  requestAnimationFrame(frame);
}

ui.refresh();
setSpeed(0);
ui.showIntro(() => setSpeed(1));
requestAnimationFrame(frame);

// Handy for debugging in the console.
window.buildcraft = { get state() { return state; }, onAction, setSpeed, world, fastForward: (h) => { handle(step(state, h)); ui.refresh(); } };
