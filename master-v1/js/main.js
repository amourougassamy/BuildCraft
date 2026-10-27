// ============================================================
// main.js — screens and game flow:
// name → world map → mission brief → design (one screen) → run the year → report card / game over
// ============================================================

import {
  LEVELS, SECTIONS, ITEMS, SOILS, HAZARDS, POWER_NAMES, MONTH_NAMES, MONTH_DAYS, DAYS,
  DAYS_PER_SEC, SPEEDS, HEALTH_CLOSED, REPAIR_DAYS,
} from "./data.js";
import {
  defaultChoice, designCost, designStats, coinsLeft, canRun, soilNeed, strength,
  createRun, advance, repair, reportCard, lessons, isUnlocked,
} from "./sim.js";
import { createSite, createMap } from "./scene.js";

const $ = id => document.getElementById(id);
const FX = window.FX;

// ---------- saved on this device (never required) ----------
const SAVE_KEY = "buildcraft-master-v1";
const save = (() => {
  try { return { name: "", gentle: false, muted: false, progress: {}, ...JSON.parse(localStorage.getItem(SAVE_KEY) || "{}") }; }
  catch (e) { return { name: "", gentle: false, muted: false, progress: {} }; }
})();
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* private mode: play without saving */ } }

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const name = () => esc(save.name || "Builder");

// ---------- state ----------
let levelIdx = 0, choice = defaultChoice(), S = null, speedIdx = 0, paused = false;
let site = null, map = null, lastCoins = null;
const L = () => LEVELS[levelIdx];

// ---------- small UI helpers ----------
function show(id) {
  for (const s of ["title", "mapScreen", "play"]) $(s).hidden = s !== id;
  $("hud").hidden = id === "title";
  $("mapBtn").hidden = id === "mapScreen";
  $("jarChip").hidden = $("happyChip").hidden = id === "mapScreen";
}
function say(html) {
  const b = $("say");
  b.innerHTML = html;
  b.classList.remove("new"); void b.offsetWidth; b.classList.add("new");
}
function overlay(html, cls = "") {
  $("sheet").className = `clay sheet ${cls}`;
  $("sheet").innerHTML = html;
  $("overlay").hidden = false;
  $("sheet").scrollTop = 0;
}
function closeOverlay() { $("overlay").hidden = true; }
const sound = n => FX && FX.sound(n);
const hazLabel = (type, power) => `${POWER_NAMES[power] || "huge"} ${type === "wind" ? L().windWord || "windstorm" : HAZARDS[type].name}`;

function setCoins(n) {
  $("coinCount").textContent = n;
  const g = $("jarCoins"), shown = Math.max(0, Math.min(18, n));
  let svg = "";
  for (let i = 0; i < shown; i++) {
    const col = i % 3, row = Math.floor(i / 3);
    svg += `<ellipse cx="${20 + col * 10 + (row % 2) * 3}" cy="${64 - row * 7}" rx="6" ry="3.2" fill="#ffd23f" stroke="#b8860b" stroke-width="1.2"/>`;
  }
  g.innerHTML = svg;
  if (lastCoins !== null && n !== lastCoins) {
    const chip = $("jarChip");
    chip.classList.remove("bump", "drop"); void chip.offsetWidth;
    chip.classList.add(n > lastCoins ? "bump" : "drop");
  }
  lastCoins = n;
}
function flyCoin(fromEl, intoJar) {
  const jar = $("jarChip").getBoundingClientRect();
  const r = fromEl ? fromEl.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
  const c = document.createElement("div");
  c.className = "flycoin";
  c.textContent = "🪙";
  const [ax, ay] = [r.left + r.width / 2, r.top + r.height / 2], [bx, by] = [jar.left + 20, jar.top + 20];
  const [sx, sy, ex, ey] = intoJar ? [ax, ay, bx, by] : [bx, by, ax, ay];
  c.style.left = sx + "px"; c.style.top = sy + "px";
  document.body.appendChild(c);
  requestAnimationFrame(() => { c.style.transform = `translate(${ex - sx}px, ${ey - sy}px) scale(${intoJar ? .6 : 1.3})`; c.style.opacity = intoJar ? "1" : "0"; });
  setTimeout(() => c.remove(), 800);
}
function setHappy(v) {
  $("happyFill").style.width = `${v}%`;
  $("happyFill").style.background = v >= 60 ? "var(--green)" : v >= 40 ? "var(--orange)" : "var(--red)";
  $("face").textContent = v >= 80 ? "😍" : v >= 60 ? "😀" : v >= 45 ? "🙂" : v >= 30 ? "😟" : "😭";
}

// ---------- 1. title ----------
function initTitle() {
  if (save.name) {
    $("nameInput").value = save.name;
    $("welcomeBack").textContent = `Welcome back, ${save.name}! 👋`;
  }
  $("nameForm").addEventListener("submit", e => {
    e.preventDefault();
    const v = $("nameInput").value.trim().slice(0, 16);
    if (!v) return;
    save.name = v;
    persist();
    sound("pop");
    $("nameText").textContent = save.name;
    openMap();
  });
}

// ---------- 2. map ----------
function siteStates() {
  return LEVELS.map((lv, i) => ({ locked: !isUnlocked(save.progress, i), grade: save.progress[lv.key] && save.progress[lv.key].grade }));
}
function openMap(focusIdx) {
  closeOverlay();
  show("mapScreen");
  if (!map) map = createMap($("mapView"), LEVELS, pickSite);
  const states = siteStates();
  map.setProgress(states);
  const cur = focusIdx ?? Math.max(0, states.reduce((n, s, i) => (!s.locked ? i : n), 0));
  map.focus(cur);
  $("siteCard").hidden = true;
  setCoins(0);
  $("ecoCount").textContent = Object.values(save.progress).reduce((n, p) => n + (p.eco || 0), 0);
  setHappy(75);
}

function hazardSummary(lv) {
  return lv.events.map(([t, p, m]) => `${HAZARDS[t].ico} ${hazLabel(t, p)} <small>(${MONTH_NAMES[m]})</small>`).join("<br>");
}
function pickSite(i) {
  const lv = LEVELS[i], locked = !isUnlocked(save.progress, i), best = save.progress[lv.key];
  sound("pop");
  const card = $("siteCard");
  card.hidden = false;
  card.innerHTML = `<button class="close" aria-label="Close">✖</button>
    <h2>${lv.ico} ${lv.name}</h2><p class="region">${lv.region} · Site ${i + 1}</p>
    ${locked ? `<p>🔒 Locked! Pass <b>${LEVELS[i - 1].name}</b> with a <b>C</b> or better to open this site, ${name()}.</p>`
      : `<ul>
          <li>${lv.bico} Build a <b>${lv.building}</b> (${lv.floors} floor${lv.floors > 1 ? "s" : ""})</li>
          <li>🪨 Ground: <b>${SOILS[lv.soil].name}</b></li>
          <li>🫙 Budget: <b>${lv.budget} coins</b></li>
          <li>⚠️ Weather this year:<br>${hazardSummary(lv)}</li>
          ${best ? `<li>📝 Your best grade: <b>${best.grade}</b></li>` : ""}
        </ul>
        <button class="btn go" id="goSite">Let's go, ${name()}! ▶</button>`}`;
  card.querySelector(".close").onclick = () => (card.hidden = true);
  if (!locked) $("goSite").onclick = () => openBrief(i);
}

// ---------- 3. brief ----------
function openBrief(i) {
  levelIdx = i;
  const lv = L();
  choice = defaultChoice();
  const need = soilNeed(lv);
  overlay(`<div class="brief">
    <h2>${lv.ico} Mission: ${lv.name}</h2>
    <div class="mascot" style="padding:0"><div class="fran">👷‍♀️</div>
      <div class="bubble">${name()}, ${lv.brief}! You have <b>🫙 ${lv.budget} coins</b>. The building itself costs ${lv.shell}, so you have
      <b>${lv.budget - lv.shell} coins</b> for upgrades. Coins you don't spend become your <b>repair fund</b>.</div></div>
    <div class="facts">
      <div><b>🪨 The ground</b>${SOILS[lv.soil].name}. ${SOILS[lv.soil].desc}${lv.tall ? " This tower is tall and heavy, so it needs one foundation step more." : ""}
        <br><small>Needs: <b>${ITEMS.found.options[need - 1].label}</b> or better</small></div>
      <div><b>⚠️ This year's weather</b>${hazardSummary(lv)}</div>
      <div><b>📝 Your report card</b>Safety · Happiness · Open Days · Eco · Budget${lv.hospital ? "<br><small>🏥 Hospitals must stay open: Open Days count double!</small>" : ""}</div>
      <div><b>🔓 To pass</b>Get a <b>C</b> or better to unlock the next site.</div>
    </div>
    <div class="btns"><button class="btn ghost" id="briefBack">🗺️ Map</button><button class="btn go" id="briefGo">Start designing! ✏️</button></div>
  </div>`);
  $("briefBack").onclick = () => openMap(i);
  $("briefGo").onclick = () => { closeOverlay(); startDesign(); };
}

// ---------- 4. design ----------
function ensureSite() {
  if (!site) {
    site = createSite($("siteView"));
    site.setGentle(save.gentle);
    site.onDeliver(() => sound("ding")); // helicopter set the rooftop unit down
  }
}
function startDesign(keepChoice) {
  if (!keepChoice) choice = defaultChoice();
  S = null; paused = false; speedIdx = 0;
  show("play");
  ensureSite();
  site.reset();
  site.setLevel(L());
  site.setDesign(L(), choice);
  site.setRun(null);
  site.setSpin(true);
  $("runBtn").hidden = false; $("ffBtn").hidden = true; $("pauseBtn").hidden = true;
  $("banner").hidden = true; $("fixPop").hidden = true; $("openBadge").textContent = "";
  $("phase").textContent = `✏️ Design your ${L().building}`;
  document.body.classList.remove("quake");
  renderMonths();
  renderDesign();
  say(`Okay ${name()}, everything is on one screen. Pick an upgrade in each row. The meters show if you're strong enough for <b>${L().name}</b>'s weather. Press <b>▶ Run the year!</b> when you're ready.`);
}

function effectText(o) {
  const bits = [];
  if (o.quake) bits.push(`🌋+${o.quake}`);
  if (o.wind) bits.push(`🌪️+${o.wind}`);
  if (o.flood) bits.push(`🌊+${o.flood}`);
  if (o.heat) bits.push(`❄️+${o.heat}`);
  if (o.happy) bits.push(`😊+${o.happy}`);
  if (o.eco) bits.push(`🌱+${o.eco}`);
  if (o.power) bits.push("⚡");
  if (o.bolted) bits.push("🔩");
  return bits.join(" ");
}

function renderChecks() {
  const lv = L(), st = designStats(choice);
  const types = [...new Set(lv.events.map(e => e[0]))];
  const need = soilNeed(lv);
  const rows = [`<div class="check ${st.found >= need ? "ok" : "bad"}"><span class="what">🪨 Foundation</span>
    <span class="bars">${[1, 2, 3].map(n => `<i class="${n <= st.found ? "on" : ""} ${n === need ? "need" : ""}"></i>`).join("")}</span></div>`];
  for (const t of types) {
    const max = Math.max(...lv.events.filter(e => e[0] === t).map(e => e[1]));
    const s = strength(lv, st, t);
    rows.push(`<div class="check ${s >= max ? "ok" : "bad"}"><span class="what">${HAZARDS[t].ico} vs ${POWER_NAMES[max]}</span>
      <span class="bars">${[1, 2, 3, 4].slice(0, Math.max(max, s, 1)).map(n => `<i class="${n <= s ? "on" : ""} ${n === max ? "need" : ""}"></i>`).join("")}</span></div>`);
  }
  if (lv.events.some(e => e[1] >= 2 && e[0] !== "heat")) rows.push(`<div class="check ${st.power ? "ok" : "bad"}"><span class="what">⚡ Power in a blackout</span></div>`);
  return rows.join("");
}

function renderDesign() {
  const lv = L(), cost = designCost(choice), left = coinsLeft(lv, choice), st = designStats(choice);
  $("panel").innerHTML = `
    <div class="clay cash" title="Where your coins go">
      <span class="step">🫙 Budget <b>${lv.budget}</b></span><span class="arrow">−</span>
      <span class="step">${lv.bico} Building <b>${lv.shell}</b></span><span class="arrow">−</span>
      <span class="step">🛠️ Upgrades <b>${cost}</b></span><span class="arrow">=</span>
      <span class="step left ${left < 0 ? "neg" : ""}">🔧 Repair fund <b>${left}</b></span>
    </div>
    <div class="clay checks">${renderChecks()}</div>
    <div class="secGrid">${SECTIONS.map((sec, si) => `<div class="clay section ${si === 0 ? "wide" : ""}" style="--c:${sec.color}"><h3>${sec.ico} ${sec.name}</h3>
      ${sec.items.map(it => `<div class="item"><span class="nm">${it.name}</span><div class="opts">
        ${it.options.map((o, i) => `<button class="opt ${choice[it.key] === i ? "sel" : ""}" data-item="${it.key}" data-opt="${i}" title="${esc(o.tip)}">
          <span class="ico">${o.ico}</span><span class="txt"><span class="lb">${o.label}</span>
          <span class="meta"><span class="cost">${o.cost ? "🪙" + o.cost : "Free"}</span>
          ${i === 0 && !it.foundation ? `<span class="min">📏 Code Min</span>` : `<span class="fx">${effectText(o)}</span>`}</span></span>
        </button>`).join("")}
      </div></div>`).join("")}
    </div>`).join("")}</div>`;
  setCoins(Math.max(0, left));
  $("ecoCount").textContent = `${st.eco * 10}/yr`;
  setHappy(Math.min(100, 70 + st.happy));
  $("runBtn").disabled = !canRun(lv, choice);
  $("phase").textContent = left < 0 ? `🙈 Over budget by ${-left}! Take something back.` : `✏️ Design your ${lv.building}`;
}

$("panel").addEventListener("click", e => {
  const b = e.target.closest(".opt");
  if (!b || S) return;
  const k = b.dataset.item, i = +b.dataset.opt, before = coinsLeft(L(), choice);
  if (choice[k] === i) return;
  choice[k] = i;
  const o = ITEMS[k].options[i], after = coinsLeft(L(), choice);
  sound(after < before ? "kaching" : "pop");
  flyCoin(b, after > before);
  site.setDesign(L(), choice);
  renderDesign();
  const fnd = k === "found" ? (o.level >= soilNeed(L()) ? " ✅ Strong enough for this ground!" : " ⚠️ Too weak for this ground. It will sink!") : "";
  say(`<b>${o.ico} ${o.label}</b>: ${o.tip}${fnd}${after < 0 ? ` <b>Uh oh, ${name()}, that's over budget!</b>` : ""}`);
});

// ---------- 5. run the year ----------
function renderMonths() {
  const lv = L();
  const month = S ? Math.min(11, Math.floor(S.day / MONTH_DAYS)) : -1;
  $("months").innerHTML = MONTH_NAMES.map((m, i) => {
    const ev = lv.events.filter(e => e[2] === i).map(e => HAZARDS[e[0]].ico).join("");
    return `<div class="mo ${i < month ? "past" : i === month ? "now" : ""}">${m}<span class="ev">${ev}</span></div>`;
  }).join("");
}

function startRun() {
  if (!canRun(L(), choice)) return;
  S = createRun(L(), choice);
  speedIdx = 0; paused = false;
  site.setRun(S, SPEEDS[speedIdx]);
  site.setSpin(false);
  $("runBtn").hidden = true; $("ffBtn").hidden = false; $("pauseBtn").hidden = false;
  $("ffBtn").textContent = "⏩ 1×"; $("pauseBtn").textContent = "⏸";
  sound("cheer");
  FX && FX.confetti(60);
  say(`🎉 Ribbon cut! The ${L().building} is open, ${name()}! Everybody's happy. Watch the calendar: when something breaks, tap <b>🔧</b> to fix it.`);
  renderRun();
}

let lastRunRender = 0;
function renderRun() {
  const lv = L();
  const fixes = S.broken.map(b => {
    const can = !S.repairing && !S.hazard && S.coins >= b.cost;
    const working = S.repairing && S.repairing.id === b.id;
    return `<button class="btn repair" data-fix="${b.id}" ${can ? "" : "disabled"}>${working ? "🚧 Fixing" : "🔧 Fix"} ${b.ico} ${b.label} · 🪙${b.cost}</button>`;
  }).join("");
  $("panel").innerHTML = `
    <div class="clay runStats">
      <div><b>${Math.floor(S.daysOpen)}</b>🏪 days open</div>
      <div><b>${S.visitors}</b>👥 visitors</div>
      <div><b>+${S.earned}</b>🪙 earned</div>
      <div><b>${Math.round(S.eco)}</b>🌱 eco points</div>
      <div><b>${S.ghosts}</b>${save.gentle ? "🩹 hurt" : "👻 ghosts"}</div>
      <div><b>🪙${S.repairSpent}</b>🔧 on repairs</div>
    </div>
    <div class="clay health"><b>🏗️ Building health ${Math.round(S.health)}%</b>
      <div class="meter"><i style="width:${S.health}%;background:${S.health >= 75 ? "var(--green)" : S.health >= HEALTH_CLOSED ? "var(--orange)" : "var(--red)"}"></i></div>
      <small>Below ${HEALTH_CLOSED}% the doors must close until it's fixed.</small></div>
    <div class="clay fixes"><h3>🔧 Repairs</h3>${fixes || "<span class='small'>Nothing broken. 💪</span>"}
      ${S.broken.length ? `<span class="small">Each fix takes ${REPAIR_DAYS} days. The building is closed while the crew works.</span>` : ""}</div>
    <div class="clay logBox"><h3>📓 This year</h3><ol>${S.log.map(l => `<li><b>${MONTH_NAMES[l.month]}:</b> ${l.text}</li>`).join("") || "<li>Opening day! 🎀</li>"}</ol></div>`;
  setCoins(S.coins);
  $("ecoCount").textContent = Math.round(S.eco);
  setHappy(S.happy);
  const month = Math.min(11, Math.floor(S.day / MONTH_DAYS));
  $("phase").textContent = `📅 ${MONTH_NAMES[month]} · Day ${Math.floor(S.day)} of ${DAYS}`;
  $("openBadge").textContent = S.over ? "💥 Fell down" : S.repairing ? "🚧 Closed: repairing" : S.open ? "🟢 Open" : "🔴 Closed";
  const fixable = S.broken.some(b => !S.repairing && !S.hazard && S.coins >= b.cost);
  $("fixPop").hidden = !fixable;
  renderMonths();
}

$("panel").addEventListener("click", e => {
  const b = e.target.closest("[data-fix]");
  if (!b || !S) return;
  if (repair(S, +b.dataset.fix)) { sound("pop"); flyCoin(b, false); drain(); renderRun(); }
});
$("fixPop").onclick = () => {
  if (!S) return;
  const b = [...S.broken].sort((x, y) => y.sev - x.sev).find(x => x.cost <= S.coins);
  if (b && repair(S, b.id)) { sound("pop"); flyCoin($("fixPop"), false); drain(); renderRun(); }
};

let coinSoundAt = 0;
function drain() {
  while (S && S.feed.length) {
    const f = S.feed.shift();
    const lv = L();
    if (f.type === "warn") {
      $("banner").hidden = false;
      $("banner").textContent = `⚠️ ${HAZARDS[f.ev.type].ico} ${hazLabel(f.ev.type, f.ev.power).toUpperCase()} coming!`;
      sound("boo");
      say(`Heads up, ${name()}! A <b>${hazLabel(f.ev.type, f.ev.power)}</b> is on its way!`);
    }
    if (f.type === "hazard") {
      $("banner").hidden = false;
      $("banner").textContent = `${HAZARDS[f.ev.type].ico} ${hazLabel(f.ev.type, f.ev.power).toUpperCase()}!`;
      site.startHazard({ ...f.ev, over: f.over });
      sound("thunder");
      if (f.ev.type === "quake") document.body.classList.add("quake");
      if (f.ev.type === "heat") say(f.over > 0 ? `🥵 Phew, it's SO hot! A heat pump or shade trees would keep everyone cool, ${name()}.` : `😎 Heat wave outside, but nice and cool inside. Good thinking, ${name()}!`);
      else if (f.over <= 0) say(`💪 WOW! The ${hazLabel(f.ev.type, f.ev.power)} hit, and your building held strong, ${name()}!`);
      else {
        const ghost = f.ghost && S.people.find(p => p.key === f.ghost);
        say(`😱 The ${hazLabel(f.ev.type, f.ev.power)} was too strong! ` +
          (ghost ? (save.gentle ? `${ghost.name} got hurt 🩹. ` : `Oh no, ${ghost.name} is a ghost now 👻. `) : "") + `Tap 🔧 to fix the damage.`);
        if (ghost) sound("sad");
      }
    }
    if (f.type === "calm") { $("banner").hidden = true; document.body.classList.remove("quake"); site.endHazard(); }
    if (f.type === "settle") { sound("sad"); say(`⬇️ Uh oh, ${name()}! The building is sinking into the ${SOILS[lv.soil].name.toLowerCase()}. A stronger foundation would stop this.`); }
    if (f.type === "shelves") site.tipShelves();
    if (f.type === "shelves") say(`📚 CRASH! The shelves tipped over. Bolting them to the wall stops that, ${name()}.`);
    if (f.type === "outage" && !f.backed) say(`🔌 The power lines are down! No lights, so the doors are closed. A generator or solar + battery would keep them open.`);
    if (f.type === "outage" && f.backed) say(`⚡ The power lines went down, but your backup power kept the lights on. Nice, ${name()}!`);
    if (f.type === "repairStart") say(`🚧 The crew is fixing the <b>${f.part.label.toLowerCase()}</b>. The doors are closed until they finish.`);
    if (f.type === "repaired") { sound("ding"); say(`✨ All fixed: ${f.part.label.toLowerCase()}! Everyone's coming back, ${name()}.`); }
    if (f.type === "coin") { flyCoin($("siteView"), true); const now = performance.now(); if (now - coinSoundAt > 400) { sound("kaching"); coinSoundAt = now; } }
    if (f.type === "over") { finishRun(); return; }
    if (f.type === "end") { finishRun(); return; }
  }
}

function finishRun() {
  const done = S;
  renderRun();
  $("ffBtn").hidden = true; $("pauseBtn").hidden = true; $("fixPop").hidden = true;
  $("banner").hidden = true;
  document.body.classList.remove("quake");
  if (done.over) {
    if (done.over.reason === "collapse") { site.doCollapse(); sound("thunder"); }
    sound("sad");
    setTimeout(() => showGameOver(done), 1800);
  } else {
    setTimeout(() => showReport(done), 600);
  }
  S = null;
  site.setRun(done, 1);
}

// Sim clock, driven by the browser's frame clock
let prev = performance.now();
(function tickLoop(now) {
  requestAnimationFrame(tickLoop);
  const dt = Math.min(0.1, (now - prev) / 1000);
  prev = now;
  if (!S || paused || !$("overlay").hidden) return;
  advance(S, dt * DAYS_PER_SEC * SPEEDS[speedIdx]);
  drain();
  if (S && now - lastRunRender > 250) { renderRun(); lastRunRender = now; }
})(prev);

$("runBtn").onclick = startRun;
$("ffBtn").onclick = () => {
  speedIdx = (speedIdx + 1) % SPEEDS.length;
  $("ffBtn").textContent = `⏩ ${SPEEDS[speedIdx]}×`;
  if (S) site.setRun(S, SPEEDS[speedIdx]);
  sound("pop");
};
$("pauseBtn").onclick = () => { paused = !paused; $("pauseBtn").textContent = paused ? "▶" : "⏸"; };

// ---------- 6. report card / game over ----------
const SUBJECTS = [["safety", "💪 Safety"], ["happy", "😊 Happiness"], ["open", "🏪 Open Days"], ["eco", "🌱 Eco Points"], ["budget", "🫙 Budget"]];

function comment(r) {
  const n = name();
  if (r.grade === "A+") return `WOW, ${n}! A+! You're a real engineer! Strong, happy, green and smart with coins. 🏆`;
  if (r.grade === "A") return `Amazing work, ${n}! Just a tiny bit more and that's an A+!`;
  if (r.grade === "B") return `Great job, ${n}! Your building did really well. Check the tips to reach an A.`;
  if (r.grade === "C") return `You passed, ${n}! 🎉 Some things went wrong, but you learned a lot. Try again for a better grade?`;
  return `Not quite, ${n}. Every great builder learns from a tough year. Read the tips and try again!`;
}

function showReport(R) {
  const lv = L(), r = reportCard(R), prevBest = save.progress[lv.key];
  const wasLocked = levelIdx + 1 < LEVELS.length && !isUnlocked(save.progress, levelIdx + 1);
  if (!prevBest || r.score > prevBest.best) save.progress[lv.key] = { best: r.score, grade: r.grade, eco: Math.round(R.eco) };
  persist();
  const nowUnlocked = wasLocked && isUnlocked(save.progress, levelIdx + 1);
  const tips = lessons(R);
  overlay(`
    <div class="school">BuildCraft School of Building</div>
    <h2>📝 Report Card</h2>
    <div class="who"><span>Student: <b>${name()}</b></span><span>Site: <b>${lv.ico} ${lv.name}</b></span></div>
    <table>${SUBJECTS.map(([k, label]) => `<tr><td>${label}${k === "open" && lv.hospital ? " <small>(×2 for hospitals)</small>" : ""}</td>
      <td class="g"><small>${r.subjects[k].score}</small></td><td class="g"><span class="gr">${r.subjects[k].grade}</span></td></tr>`).join("")}
      <tr><td><b>Overall</b></td><td class="g"><b>${r.score}</b></td><td class="g"><span class="gr">${r.grade}</span></td></tr></table>
    <div class="gradeRow"><div class="stamp">${r.grade}</div>
      <div class="stars">${[0, 1, 2].map(i => `<span style="animation-delay:${0.5 + i * 0.25}s">${i < r.stars ? "⭐" : "☆"}</span>`).join("")}</div></div>
    ${R.ghosts ? `<p class="small">${save.gentle ? "🩹 Someone got hurt" : "👻 Someone became a ghost"}, so the best you can get is a B. Keep everyone safe for an A!</p>` : ""}
    <div class="comment">👷‍♀️ <b>Foreman Fran says:</b> ${comment(r)}
      ${tips.length ? `<ul>${tips.map(t => `<li>${t}</li>`).join("")}</ul>` : ""}</div>
    ${nowUnlocked ? `<p class="unlock">🔓 New site unlocked: ${LEVELS[levelIdx + 1].ico} ${LEVELS[levelIdx + 1].name}!</p>` : ""}
    <div class="btns">
      <button class="btn ghost" id="rMap">🗺️ Map</button>
      <button class="btn ff" id="rRetry">🔁 Try again</button>
      ${r.pass && levelIdx + 1 < LEVELS.length ? `<button class="btn go" id="rNext">Next site ▶</button>` : ""}
    </div>`, "report");
  if (r.stars >= 2) { sound("win"); FX && FX.confetti(180); FX && FX.fireworks(2600); }
  else if (r.pass) { sound("cheer"); FX && FX.confetti(80); }
  else sound("sad");
  $("rMap").onclick = () => openMap(nowUnlocked ? levelIdx + 1 : levelIdx);
  $("rRetry").onclick = () => { closeOverlay(); startDesign(true); };
  if ($("rNext")) $("rNext").onclick = () => openBrief(levelIdx + 1);
}

function showGameOver(R) {
  const why = R.over.reason === "collapse"
    ? { ico: "💥", text: `The ${L().building} fell down!` }
    : { ico: "🫙", text: `The jar ran out of coins, and the building stayed closed too long.` };
  const tips = lessons(R);
  overlay(`
    <div class="big">${why.ico}</div>
    <h2>${"GAME OVER".split("").map((c, i) => `<span style="animation-delay:${i * 0.07}s">${c === " " ? "&nbsp;" : c}</span>`).join("")}</h2>
    <p>${why.text}</p>
    <div class="comment">👷‍♀️ <b>Don't give up, ${name()}!</b> Here's what to change:
      <ul>${tips.map(t => `<li>${t}</li>`).join("")}</ul></div>
    <div class="btns"><button class="btn ghost" id="gMap">🗺️ Map</button><button class="btn go" id="gRetry">🔁 Try again</button></div>`, "gameover");
  $("gMap").onclick = () => openMap(levelIdx);
  $("gRetry").onclick = () => { closeOverlay(); startDesign(true); };
}

// ---------- HUD buttons ----------
$("mapBtn").onclick = () => {
  if (S && !confirm(`Leave this year early, ${save.name || "builder"}? Your progress on this site won't count.`)) return;
  S = null;
  openMap(levelIdx);
};
function syncToggles() {
  $("soundBtn").textContent = save.muted ? "🔇" : "🔊";
  $("gentleBtn").classList.toggle("off", save.gentle);
  $("gentleBtn").title = save.gentle ? "Gentle mode is ON (no ghosts)" : "Gentle mode: no ghosts";
  FX && FX.setMuted(save.muted);
}
$("peekBtn").onclick = () => {
  const on = !$("peekBtn").classList.contains("on");
  $("peekBtn").classList.toggle("on", on);
  site && site.setPeek(on);
  sound("pop");
};
$("soundBtn").onclick =() => { save.muted = !save.muted; persist(); syncToggles(); };
$("gentleBtn").onclick = () => { save.gentle = !save.gentle; persist(); syncToggles(); site && site.setGentle(save.gentle); };

// ---------- boot ----------
syncToggles();
initTitle();
$("nameText").textContent = save.name;
show("title");
// Test hook: lets the automated browser check read the live run.
window.__bc = { get S() { return S; }, LEVELS, save };
