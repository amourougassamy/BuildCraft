// ui.js: panels, gauges, chain reactions, toasts, speech bubbles, report card.
import { OPTIONS, SIDES, SIDE_INFO, WWR_MIN, WWR_MAX, WWR_STEP, HVAC, MONEY, EVENTS, PEOPLE } from "./data.js";
import { actionCost, canAddUnit, canAddPV, clock, avgMood, activeOccupants, dcStatus, ZONES, serviceKw, HOT_HOURS_BASE } from "./sim.js";
import { moodFace } from "./scene.js";

const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (k === "html") e.innerHTML = v;
    else e.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null) e.append(c);
  return e;
};
export const toF = (c) => Math.round((c * 9) / 5 + 32);
export const money = (v) => `${v < 0 ? "−" : ""}$${Math.abs(v) >= 1e6 ? (Math.abs(v) / 1e6).toFixed(2) + "M" : Math.round(Math.abs(v) / 1000) + "k"}`;
const costTag = (c) => (c > 0 ? `${money(c)}` : "free");
const FLOOR = ["1st", "2nd", "3rd"];
export const zoneName = (z) => `${FLOOR[z.floor]} floor ${SIDE_INFO[z.side].name.toLowerCase()}`;

const TABS = [
  { id: "arch", icon: "📐", name: "Architecture" },
  { id: "struct", icon: "🏗️", name: "Structure" },
  { id: "env", icon: "🧥", name: "Envelope" },
  { id: "mech", icon: "❄️", name: "Mechanical" },
  { id: "elec", icon: "⚡", name: "Electrical" },
];

const GAUGES = [
  { key: "roofDC", tab: "struct", icon: "🏠", name: "Roof framing", detail: (a) => `${a.roof.demand.toFixed(1)} of ${a.roof.cap} psf` },
  { key: "latDC", tab: "struct", icon: "🌪️", name: "Wind & quake bracing", detail: (a) => { const w = a.lateral[a.lateral.worst.toLowerCase()]; return `${Math.round(w.demand)} of ${Math.round(w.cap)} kips (${a.lateral.worst === "Y" ? "N–S" : "E–W"})`; } },
  { key: "coolDC", tab: "mech", icon: "❄️", name: "Cooling", detail: (a) => `${Math.round(a.coolLoad)} kW needed, ${Math.round(a.coolCap)} kW installed` },
  { key: "heatDC", tab: "mech", icon: "🔥", name: "Heating", detail: (a) => `${Math.round(a.heatLoad)} kW needed, ${Math.round(a.heatCap)} kW installed` },
  { key: "elecDC", tab: "elec", icon: "⚡", name: "Electrical service", detail: (a) => `${Math.round(a.elecDemand)} of ${Math.round(a.elecCap)} kW` },
];
const KID_STATUS = { ok: "OK", warn: "Near the limit", bad: "Overloaded!" };

const SAY = {
  hot: ["It's an oven in here! 🥵", "Can someone turn up the AC?", "My chocolate bar melted.", "Why is it so hot by the windows?"],
  cold: ["Brrr! 🥶", "I can see my breath.", "Where's the heat?", "I'm wearing my coat inside."],
  glare: ["The sun's in my eyes! 😎", "I can't see my screen!", "Blinds, anyone?"],
  dark: ["Who turned off the lights?!", "My computer just died!", "Power's out! 😱"],
  view: ["What a view! 😍", "I love all this daylight.", "Best office ever."],
  comfy: ["Just right. 👌", "Great building!", "Nice and cozy."],
  sway: ["Is the building… moving? 🤢", "I feel seasick."],
};

export function createUI(api) {
  const state = () => api.getState();
  let tab = "arch";
  let eng = false;
  const panel = $("#panel");
  const tabsEl = el("nav", { class: "tabs", role: "tablist" });
  const body = el("div", { class: "tab-body" });
  panel.append(tabsEl, body);

  TABS.forEach((t) => tabsEl.append(el("button", { class: "tab", role: "tab", "data-tab": t.id, onclick: () => setTab(t.id), title: t.name }, el("span", { class: "ti" }, t.icon), el("span", { class: "tn" }, t.name))));

  function setTab(id) {
    tab = id;
    tabsEl.querySelectorAll(".tab").forEach((b) => b.classList.toggle("on", b.dataset.tab === id));
    renderTab();
  }

  // ---------- option cards ----------
  function optionCards(key, note) {
    const s = state();
    const wrap = el("div", { class: "cards" });
    for (const o of OPTIONS[key]) {
      const on = s.design[key] === o.id;
      const cost = on ? 0 : actionCost(s, { type: "setOption", key, value: o.id });
      wrap.append(
        el("button", { class: `card${on ? " on" : ""}`, onclick: () => !on && api.onAction({ type: "setOption", key, value: o.id }) },
          el("div", { class: "card-top" }, el("span", { class: "ci" }, o.icon), el("span", { class: "cn" }, o.name), el("span", { class: "cc" }, on ? "✓ Installed" : costTag(cost))),
          el("div", { class: "ck" }, o.kid),
          el("div", { class: "ce eng-only" }, o.eng)),
      );
    }
    return el("section", {}, note ? el("p", { class: "note" }, note) : null, wrap);
  }

  function section(title, ...kids) {
    return el("section", { class: "sec" }, el("h3", {}, title), ...kids);
  }

  function renderTab() {
    const s = state();
    const d = s.design;
    body.innerHTML = "";
    if (tab === "arch") {
      const rows = SIDES.map((side) => {
        const v = d.wwr[side];
        const minus = Math.round((v - WWR_STEP) * 100) / 100;
        const plus = Math.round((v + WWR_STEP) * 100) / 100;
        const shadeCost = actionCost(s, { type: "toggleShade", side });
        return el("div", { class: "wrow" },
          el("div", { class: "wname" }, el("b", {}, SIDE_INFO[side].name), el("small", {}, { N: "no direct sun", E: "morning sun", S: "midday sun", W: "hot afternoon sun" }[side])),
          el("div", { class: "stepper" },
            el("button", { class: "sb", disabled: v <= WWR_MIN + 1e-6 ? "" : null, title: `Smaller (saves on wall)`, onclick: () => api.onAction({ type: "setWWR", side, value: minus }) }, "−"),
            el("span", { class: "wv" }, `${Math.round(v * 100)}%`),
            el("button", { class: "sb", disabled: v >= WWR_MAX - 1e-6 ? "" : null, title: `Bigger (${costTag(actionCost(s, { type: "setWWR", side, value: plus }))})`, onclick: () => api.onAction({ type: "setWWR", side, value: plus }) }, "+")),
          el("label", { class: "shade" }, el("input", { type: "checkbox", ...(d.shades[side] ? { checked: "" } : {}), onchange: () => api.onAction({ type: "toggleShade", side }) }), ` Shades ${d.shades[side] ? "" : `(${costTag(shadeCost)})`}`));
      });
      body.append(
        section("🪟 Windows (glass % of each wall)", el("p", { class: "note" }, "Bigger windows make people happier and let the lights dim. But they let in summer sun, leak winter heat, and cut holes in the walls that brace the building."), ...rows.map((r) => r).filter(Boolean)),
        el("p", { class: "note small" }, "Tip: west glass gets the low, hot afternoon sun. South shades block high summer sun but let low winter sun in."),
      );
      body.querySelectorAll("button[disabled='']").forEach((b) => (b.disabled = true));
    } else if (tab === "struct") {
      body.append(
        section("🌪️ Lateral system: what holds the building up against wind and earthquakes", optionCards("lateral")),
        section("🏠 Roof framing: snow, rooftop units and solar panels all sit on it", optionCards("roof")),
      );
    } else if (tab === "env") {
      body.append(section("🪟 Glass", optionCards("glass")), section("🧱 Insulation", optionCards("insulation")));
    } else if (tab === "mech") {
      const addCost = actionCost(s, { type: "addUnit" });
      const can = canAddUnit(d);
      body.append(
        section("🌀 Rooftop units",
          el("div", { class: "units" },
            el("div", { class: "ucount" }, el("b", {}, String(d.units)), el("span", {}, ` units · ${d.units * HVAC.unitCoolKw} kW (${Math.round((d.units * HVAC.unitCoolKw) / 3.517)} tons) cooling`)),
            el("button", { class: "primary big", disabled: can ? null : "", onclick: () => api.onAction({ type: "addUnit" }) }, `🚁 Call the helicopter: add a unit (${money(addCost)})`),
            el("button", { class: "ghost", disabled: d.units ? null : "", onclick: () => api.onAction({ type: "removeUnit" }) }, `Fly one away (${money(HVAC.liftCost)})`),
            can ? null : el("p", { class: "note warn" }, "The roof is full! Remove a solar array to make room."),
            el("p", { class: "note" }, "Each unit cools, but it's heavy for the roof and draws a lot of power from the electrical service."))),
        section("🔥 Heating type", optionCards("hvacType")),
      );
      body.querySelectorAll("button[disabled='']").forEach((b) => (b.disabled = true));
    } else if (tab === "elec") {
      body.append(
        section("🔌 Electrical service: the power pipe from the street", optionCards("service", "Upgrades arrive by utility truck with a bigger transformer.")),
        section("💡 Lighting", optionCards("lighting")),
        section("☀️ Solar panels",
          el("div", { class: "units" },
            el("div", { class: "ucount" }, el("b", {}, String(d.pv)), el("span", {}, ` arrays · ${d.pv * 20} kW peak`)),
            el("button", { class: "primary", disabled: canAddPV(d) ? null : "", onclick: () => api.onAction({ type: "addPV" }) }, `Add a solar array (${money(MONEY.pvCost)})`),
            el("button", { class: "ghost", disabled: d.pv ? null : "", onclick: () => api.onAction({ type: "removePV" }) }, `Remove one (${money(MONEY.pvRemove)})`),
            el("p", { class: "note" }, "Free power on sunny days, but panels are heavy, take roof space from rooftop units, and don't help on a cloudy winter morning."))),
      );
      body.querySelectorAll("button[disabled='']").forEach((b) => (b.disabled = true));
    }
  }

  // ---------- gauges ----------
  const gaugesEl = $("#gauges");
  const gaugeEls = GAUGES.map((g) => {
    const fill = el("div", { class: "fill" });
    const val = el("span", { class: "gval" });
    const det = el("div", { class: "gdet eng-only" });
    const row = el("button", { class: "gauge", onclick: () => setTab(g.tab), title: "Open the tab that fixes this" },
      el("div", { class: "glab" }, el("span", {}, `${g.icon} ${g.name}`), val),
      el("div", { class: "bar" }, fill, el("div", { class: "limit" })),
      det);
    gaugesEl.append(row);
    return { g, row, fill, val, det };
  });

  function renderGauges() {
    const a = state().analysis;
    for (const x of gaugeEls) {
      const dc = a[x.g.key];
      const st = dcStatus(dc);
      x.row.dataset.status = st;
      x.fill.style.width = `${Math.min(100, (dc / 1.5) * 100)}%`;
      x.val.textContent = eng ? `D/C ${dc.toFixed(2)}` : KID_STATUS[st];
      x.det.textContent = x.g.detail(a);
    }
    const f = $("#forecast");
    f.innerHTML = "";
    f.append(
      el("div", {}, el("span", {}, "Yearly energy bill (forecast)"), el("b", {}, money(a.energyCost))),
      el("div", {}, el("span", {}, "Work hours too hot somewhere"), el("b", {}, `${Math.round((100 * a.hotHours) / HOT_HOURS_BASE)}%`)),
      el("div", { class: "eng-only" }, el("span", {}, "Energy use intensity"), el("b", {}, `${Math.round(a.eui)} kWh/m²·yr`)),
      el("div", { class: "eng-only" }, el("span", {}, "Units needed for design day"), el("b", {}, String(a.unitsNeeded))),
    );
  }

  // ---------- live strip ----------
  function renderLive() {
    const s = state();
    const L = s.live;
    if (!L) return;
    let hot = 0;
    s.temps.forEach((t, i) => { if (t > s.temps[hot]) hot = i; });
    const cap = serviceKw(s.design);
    const pct = Math.min(100, (L.net / cap) * 100);
    const live = $("#live");
    live.innerHTML = "";
    live.append(
      el("div", { class: "lrow" }, el("span", {}, "Hottest room"), el("b", { class: s.temps[hot] > 25.5 ? "hot" : "" }, `${toF(s.temps[hot])}°F · ${zoneName(ZONES[hot])}`)),
      el("div", { class: "lrow" }, el("span", {}, "Power use"), el("b", { class: L.blackout ? "hot" : "" }, L.blackout ? "BLACKOUT" : `${Math.round(L.net)} of ${Math.round(cap)} kW`)),
      el("div", { class: "pbar" }, el("div", { style: `width:${pct}%`, class: pct > 90 ? "bad" : pct > 75 ? "warn" : "" })),
      el("div", { class: "lrow eng-only" }, el("span", {}, "Cooling now"), el("b", {}, `${Math.round(L.cooling.delivered)} of ${Math.round(L.cooling.cap)} kW${L.cooling.demand > L.cooling.cap + 1 ? " (maxed)" : ""}`)),
      el("div", { class: "lrow eng-only" }, el("span", {}, "Heating now"), el("b", {}, `${Math.round(L.heating.delivered)} of ${Math.round(L.heating.cap)} kW`)),
      el("div", { class: "lrow eng-only" }, el("span", {}, "Lights / plugs / HVAC / solar"), el("b", {}, `${Math.round(L.elec.lights)} / ${Math.round(L.elec.plugs)} / ${Math.round(L.elec.hvac)} / −${Math.round(L.elec.pv)} kW`)),
    );
  }

  // ---------- top bar ----------
  function renderTop() {
    const s = state();
    const c = clock(s);
    const L = s.live;
    const day = s.day;
    const wx = day.event === "blizzard" ? "🌨️" : day.cloud > 0.65 ? (day.snowPsf ? "🌨️" : "☁️") : day.cloud > 0.35 ? "⛅" : L && L.sun.altitude <= 0 ? "🌙" : "☀️";
    $("#clock").textContent = `${c.month.name} · ${c.label}`;
    $("#monthn").textContent = `Month ${s.dayIndex + 1} of 12`;
    $("#weather").textContent = `${wx} ${L ? toF(L.tOut) : "--"}°F`;
    const ev = $("#event");
    if (day.event) {
      ev.hidden = false;
      ev.textContent = `${EVENTS[day.event].icon} ${EVENTS[day.event].label}`;
    } else ev.hidden = true;
    const cash = $("#cash");
    cash.textContent = money(s.cash);
    cash.classList.toggle("neg", s.cash < 0);
    $("#tenants").textContent = `${activeOccupants(s).length}/${PEOPLE.max}`;
    const m = avgMood(s);
    $("#moodface").textContent = moodFace({ mood: m, reason: "" });
    const mb = $("#moodbar");
    mb.style.width = `${m}%`;
    mb.className = m >= 58 ? "" : m >= 40 ? "warn" : "bad";
  }

  // ---------- chain feed ----------
  const feed = $("#feed");
  function addChain(ch) {
    const card = el("div", { class: "chain" },
      el("div", { class: "chead" }, el("b", {}, ch.title), el("span", { class: "ccost" }, ch.cost ? `−${money(ch.cost).replace("−", "")}` : "")),
      ...ch.lines.map((l) => el("div", { class: `cline ${l.status}` },
        el("div", {}, el("span", { class: "arrow" }, "→ "), el("span", {}, `${l.label}: `), el("b", {}, `${l.from} → ${l.to}`), el("span", {}, ` ${l.icon}`)),
        l.why ? el("div", { class: "why" }, l.why) : null,
        l.detail ? el("div", { class: "cdet eng-only" }, l.detail) : null)),
      ch.lines.length ? null : el("div", { class: "cline" }, "No big knock-on effects."));
    feed.prepend(card);
    while (feed.children.length > 8) feed.lastChild.remove();
    const empty = $("#feed-empty");
    if (empty) empty.remove();
  }

  // ---------- toasts ----------
  const toasts = $("#toasts");
  function toast(text, kind = "info", action = null, ms = 6500) {
    const t = el("div", { class: `toast ${kind}` }, el("span", {}, text));
    if (action) t.append(el("button", { class: "primary", onclick: () => { action.fn(); t.remove(); } }, action.label));
    t.append(el("button", { class: "x", title: "Dismiss", onclick: () => t.remove() }, "×"));
    toasts.prepend(t);
    while (toasts.children.length > 4) toasts.lastChild.remove();
    setTimeout(() => t.remove(), ms);
  }

  function banner(text, sub) {
    const b = $("#banner");
    b.innerHTML = "";
    b.append(el("div", { class: "bt" }, text), sub ? el("div", { class: "bs" }, sub) : null);
    b.classList.remove("show");
    void b.offsetWidth;
    b.classList.add("show");
  }

  // ---------- speech bubbles ----------
  const bubblesEl = $("#bubbles");
  const bubbles = [];
  function say(id, text, ms = 3200) {
    if (bubbles.some((b) => b.id === id)) return;
    const e = el("div", { class: "bubble" }, text);
    bubblesEl.append(e);
    bubbles.push({ id, e, until: performance.now() + ms });
  }
  let chatter = 0;
  function frame(dt, running) {
    const now = performance.now();
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      const p = api.screenPos(b.id);
      if (!p || now > b.until) {
        b.e.remove();
        bubbles.splice(i, 1);
        continue;
      }
      b.e.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
    }
    chatter -= dt;
    if (running && chatter <= 0) {
      chatter = 1.6;
      const s = state();
      const inside = activeOccupants(s).filter((o) => o.inside);
      if (inside.length && bubbles.length < 3) {
        const loud = inside.filter((o) => o.reason !== "comfy" && o.reason !== "view");
        const pool = loud.length && s.rng ? loud : inside;
        const o = pool[Math.floor(Math.random() * pool.length)];
        const lines = SAY[o.reason] || SAY.comfy;
        say(o.id, lines[Math.floor(Math.random() * lines.length)]);
      }
    }
  }

  // ---------- modals ----------
  const modal = $("#modal");
  function showModal(content) {
    modal.innerHTML = "";
    modal.append(el("div", { class: "mbox" }, content));
    modal.hidden = false;
  }
  function hideModal() {
    modal.hidden = true;
  }

  function showIntro(onStart) {
    showModal(el("div", { class: "intro" },
      el("div", { class: "kicker" }, "BuildCraft · NCSEA hackathon"),
      el("h1", {}, "Building Tycoon"),
      el("p", { class: "lead" }, "You run a 3-storey office in Chicago for one year. Tenants come and go every day. Keep them comfy and they stay. Every design choice ripples through the whole building: architecture, structure, envelope, mechanical and electrical."),
      el("ul", {},
        el("li", {}, "🪟 Bigger windows = happier people, but hotter summers and weaker shear walls."),
        el("li", {}, "🚁 Too hot? Fly in another rooftop unit. Then check the roof and the electrical service."),
        el("li", {}, "🌪️ A windstorm, an earthquake, a blizzard, a heat wave and a cold snap are coming."),
        el("li", {}, "📊 The gauges on the right compare load against capacity. Keep them out of the red.")),
      el("p", { class: "small" }, "Drag to orbit · scroll to zoom · right-drag to pan · Q / E rotate 90° · H heat view · Space pause"),
      el("button", { class: "primary big", onclick: () => { hideModal(); onStart(); } }, "Open the building →")));
  }

  function showReport(r, handlers) {
    showModal(el("div", { class: "report" },
      el("div", { class: "kicker" }, "Year-end report card"),
      el("div", { class: "grade-row" }, el("div", { class: `grade g${r.grade}` }, r.grade), el("div", {}, el("h2", {}, `Overall ${r.overall}/100`), el("p", {}, `${r.tenants} tenants · average mood ${Math.round(r.happiness)} · cash ${money(r.cash)} (${r.cashChange >= 0 ? "+" : ""}${money(r.cashChange)})`))),
      el("div", { class: "rcards" }, ...r.cards.map((c) => el("div", { class: "rcard" }, el("div", { class: `rg g${c.grade}` }, c.grade), el("div", {}, el("b", {}, `${c.icon} ${c.discipline}`), el("div", { class: "small" }, c.line))))),
      el("p", { class: "small" }, `Rent ${money(r.rent)} · energy ${money(r.energyCost)} · repairs ${money(r.repairs)} · upgrades ${money(r.spent)} · ${r.arrivals} moved in · ${r.quits} quit`),
      el("div", { class: "mbtns" },
        el("button", { class: "primary", onclick: () => { hideModal(); handlers.keep(); } }, "Replay this year with my design"),
        el("button", { class: "ghost", onclick: () => { hideModal(); handlers.fresh(); } }, "Start over (same weather)"),
        el("button", { class: "ghost", onclick: () => { hideModal(); handlers.newYear(); } }, "New year, new weather"))));
  }

  function setEng(on) {
    eng = on;
    document.body.classList.toggle("eng", on);
    renderGauges();
  }

  function refresh() {
    renderTab();
    renderGauges();
    renderTop();
    renderLive();
  }

  let slow = 0;
  function tick(dt) {
    slow -= dt;
    if (slow <= 0) {
      slow = 0.2;
      renderTop();
      renderLive();
    }
  }

  setTab(tab);
  return { refresh, tick, frame, addChain, toast, banner, say, showIntro, showReport, setEng, setTab, renderGauges, isEng: () => eng };
}
