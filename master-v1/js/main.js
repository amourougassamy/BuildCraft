// ============================================================
// main.js — screens and game flow:
// name → world map → mission brief → design (one screen) → run the year → report card / game over
// ============================================================

import {
  LEVELS, SECTIONS, ITEMS, SOILS, HAZARDS, POWER_NAMES, MONTH_NAMES, MONTH_DAYS, DAYS,
  DAYS_PER_SEC, SPEEDS, HEALTH_CLOSED, REPAIR_DAYS, WEEKS, CAST,
} from "./data.js";
import {
  defaultChoice, designCost, designStats, coinsLeft, canRun, soilNeed, strength,
  createRun, advance, repair, reportCard, lessons, isUnlocked, systemsHappy,
} from "./sim.js";
import { createSite, createMap } from "./scene.js";
import { boardEnabled, submitScore } from "./board.js";
import { cleanName } from "./board-stats.js";

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
const knowsSoil = () => choice.soil > 0; // bought the soil report
// The sim counts days; players see weeks.
const weekOf = day => Math.min(WEEKS, Math.floor((day / DAYS) * WEEKS) + 1);
const weeks = days => Math.round((days / DAYS) * WEEKS);
const UNKNOWN_GROUND = "❓ Unknown. Buy a 🔬 <b>Soil Report</b> in the design screen to find out!";

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

// ---------- people's speech bubbles ----------
// Short lines over people's heads in the 3D view. Events from the sim feed make one person react
// right away (talkOnFeed); between events a chatter timer lets someone say how they feel.
// {n} is the player's name. Keep lines short (about 30 letters) so the bubbles stay small.
const LINES = {
  design: ["Can't wait for it to open!", "Ooh, what are you building?", "I hope it's super strong!", "I'll be first in line!", "Go, {n}, go! 🏗️", "Make it cozy, {n}!"],
  opening: ["Yay, it's open! 🎉", "Hooray! Let's go in!", "Thanks, {n}! 🎀", "Ooh, so shiny!"],
  happy: ["Nice view! 😍", "Best building ever!", "I love it here!", "So comfy! 👌", "Great job, {n}!", "This place rocks!"],
  ok: ["Pretty nice in here.", "Not bad at all!", "Hmm, it's okay."],
  meh: ["Kind of boring in here…", "Could be comfier…", "Meh. 😐"],
  sad: ["Something's broken… 😟", "Can someone fix this?", "Please fix it, {n}!"],
  broken: {
    cracks: ["Look, cracks in the wall! 🧱"], frame: ["The walls look bent!"], roof: ["Drip, drip… the roof! 💧"],
    windows: ["Brr, broken windows! 🪟"], floor: ["The floor's soggy! 💧"], power: ["The wires got wet! 🔌"], found: ["It's all crooked! ⬇️"],
  },
  closed: ["Aww, it's closed. 😢", "When will it open?", "Hello? Anybody in?"],
  repairing: ["Go, fix-it crew! 🚧", "Hammer time! 🔨", "Is it fixed yet?"],
  fixed: ["Yay, it's fixed! ✨", "Thanks, {n}!", "Good as new! 🔧", "Hooray, we're back!"],
  hot: ["Heat wave! 🥵", "It's an oven in here!", "My ice cream melted!", "Can we get AC, please?"],
  cool: ["Hot out, cool in here! 😎", "Ahh, nice and cool!", "Love the cool air!"],
  cooled: ["Phew, it cooled off!", "Finally, no more heat!"],
  dark: ["Power's out! 😱", "Who turned off the lights?", "I can't see a thing!", "It's so dark in here!"],
  backed: ["Lights still on! 💡", "Backup power, yay!", "We still have power!"],
  held: ["Phew, it held! 💪", "Strong building!", "We're safe! 😅", "Nice work, {n}!"],
  hit: ["Oh no, it broke! 😟", "Uh oh, look at that!", "That's not good…"],
  sinking: ["Is the floor tilting?", "We're sinking! ⬇️", "Why is it crooked?"],
  shelves: ["The shelves fell! 📚", "Watch out, books!", "CRASH! 😲"],
  falling: ["It's falling down! 😱", "Run, everybody!"],
  warn: {
    quake: ["I feel a rumble…", "Did the ground move?"], wind: ["Look at those clouds!", "It's getting windy…"],
    flood: ["Lots of rain coming…", "The river's rising!"], heat: ["It's getting warm…", "Sunscreen time! ☀️"],
  },
  scared: {
    quake: ["Is the building shaking?!", "Earthquake! Hold on!", "Whoa, the floor's moving!"],
    wind: ["Hold onto your hat! 🌪️", "So windy!", "The roof is rattling!"],
    flood: ["The floor's soggy! 🌊", "Water's coming in!", "My shoes are wet!"],
  },
  love: {
    lights: ["LED lights, so bright! ✨", "I can read so well now!"], sprinklers: ["Sprinklers keep us safe! 🚿"], garden: ["Look, butterflies! 🦋", "Pretty rain garden! 🌼"],
    energy: ["Yay, sun power! ☀️", "Clean energy rocks!"], hvac: ["Just-right temperature!", "Fresh air, yay! 🌬️"],
    trees: ["I love the shade trees! 🌳", "So shady and nice!"],
  },
  ghost: ["Boo! 👻", "Ooooo… 👻", "I'm see-through!"],
  hurt: ["Ouch! 🩹", "Owie!", "I need a bandage."],
  pet: { happy: ["Woof! 🐶", "Arf arf! 🐾", "*wags tail*"], sad: ["Whimper… 🐶", "Arf…?"], scared: ["Yip yip! 😱", "AROOO!"], hot: ["*pant pant* 🥵"], dark: ["Woof? 🌑"] },
};
const TALK_MAX = 3;          // bubbles on screen at once during the year (2 while designing)
let talks = [], talkPhase = "", talkWait = 1, lastTalker = "", recentLines = [];
const who = () => save.name || "Builder"; // plain text: bubbles use textContent, never innerHTML

function pickLine(lines) {
  if (!lines || !lines.length) return "";
  const fresh = lines.filter(l => !recentLines.includes(l)); // no line twice in a row
  const from = fresh.length ? fresh : lines;
  return from[Math.floor(Math.random() * from.length)];
}
function dropTalk(b) {
  talks = talks.filter(t => t !== b);
  b.el.classList.add("bye");
  setTimeout(() => b.el.remove(), 250);
}
function clearTalks() { talks.forEach(b => b.el.remove()); talks = []; }

// One person says one line. force: event lines replace that person's bubble or the oldest one.
function speak(key, line, { ms = 2800, tone = "", force = false } = {}) {
  if (!site || !line || !site.headPos(key)) return false;
  const old = talks.find(t => t.key === key);
  if (old && !force) return false;
  if (old) { old.el.remove(); talks = talks.filter(t => t !== old); }
  if (talks.length >= TALK_MAX) { if (!force) return false; dropTalk(talks[0]); }
  const el = document.createElement("div");
  el.className = `talk ${tone}`;
  el.textContent = line.replace("{n}", who());
  $("talk").appendChild(el);
  talks.push({ key, el, w: el.offsetWidth, h: el.offsetHeight, until: performance.now() + ms });
  recentLines = [line, ...recentLines.filter(l => l !== line)].slice(0, 6);
  lastTalker = key;
  placeTalks();
  return true;
}
// Someone (not the dog, not a ghost) reacts to an event. People not already talking go first.
function speakSomeone(lines, opts = {}) {
  const line = pickLine(lines), busy = p => talks.some(t => t.key === p.key);
  const crowd = (S ? S.people : CAST).filter(p => !p.pet && !p.ghost).sort(() => Math.random() - 0.5);
  return [...crowd.filter(p => !busy(p)), ...crowd.filter(busy)].some(p => speak(p.key, line, { force: true, ...opts }));
}

// Each frame: keep bubbles over their heads, inside the stage, and not on top of each other.
function placeTalks() {
  const W = $("talk").clientWidth, now = performance.now(), placed = [];
  for (const b of [...talks]) {
    const at = now < b.until && site.headPos(b.key);
    if (!at) { dropTalk(b); continue; }
    const half = b.w / 2, x = Math.min(Math.max(at.x, half + 6), W - half - 6);
    let y = at.y;
    for (const o of placed) if (Math.abs(x - o.x) < (b.w + o.w) / 2 + 4 && Math.abs(y - o.y) < o.h + 4) y = o.y - o.h - 4;
    placed.push({ x, y, w: b.w, h: b.h });
    b.el.style.transform = `translate(${x - half}px, ${y - b.h - 9}px)`;
    b.el.style.setProperty("--tail", `${Math.max(14 - half, Math.min(half - 14, at.x - x))}px`); // tail still points at the head
  }
}

// What this person feels like saying right now (run phase).
function runLines(p) {
  if (p.ghost) return save.gentle ? LINES.hurt : LINES.ghost;
  if (p.pet) return LINES.pet[["scared", "hot", "dark"].includes(p.reason) ? p.reason : p.mood < 40 ? "sad" : "happy"];
  if (p.reason === "scared") return LINES.scared[S.hazard && S.hazard.type] || LINES.scared.quake;
  if (p.reason === "hot") return LINES.hot;
  if (p.reason === "dark") return LINES.dark;
  if (S.repairing) return LINES.repairing;
  if (!S.open) return LINES.closed;
  if (S.broken.length && p.mood < 60) {
    const part = S.broken[Math.floor(Math.random() * S.broken.length)].part;
    return Math.random() < 0.6 && LINES.broken[part] ? LINES.broken[part] : LINES.sad;
  }
  if (p.reason === "love" && Math.random() < 0.5) return LINES.love[p.loves];
  return p.mood >= 68 ? LINES.happy : p.mood >= 45 ? LINES.ok : LINES.meh;
}
const isLoud = p => p.ghost || ["scared", "hot", "dark"].includes(p.reason) || p.mood < 45;

function chatter() {
  if (talks.length >= (talkPhase === "run" ? TALK_MAX : 2)) return;
  const people = S ? S.people : CAST.map(c => ({ ...c, mood: 75, reason: "" }));
  const pool = people.filter(p => p.key !== lastTalker && !talks.some(t => t.key === p.key)
    && (!p.ghost || Math.random() < 0.3) && site.headPos(p.key)); // ghosts mostly stay quiet
  if (!pool.length) return;
  const loud = pool.filter(isLoud);
  const from = loud.length && Math.random() < 0.7 ? loud : pool;
  const p = from[Math.floor(Math.random() * from.length)];
  const lines = !S ? (p.pet ? LINES.pet.happy : LINES.design) : runLines(p);
  speak(p.key, pickLine(lines), { tone: p.ghost ? "ghost" : S && isLoud(p) ? "bad" : "" });
}

// Called from the main frame loop.
function talkFrame(dt) {
  if (!site) return;
  if ($("play").hidden || !$("overlay").hidden) { if (talks.length) clearTalks(); return; }
  placeTalks();
  if (talkPhase === "done" || paused || (talkWait -= dt) > 0) return;
  talkWait = talkPhase === "run" ? 1.4 + Math.random() * 1.2 : 2.6 + Math.random() * 1.6;
  chatter();
}
function setTalkPhase(phase) {
  talkPhase = phase;
  talkWait = 1.2;
  clearTalks(); // design chatter doesn't carry into the year
  if (phase === "run") speakSomeone(LINES.opening, { tone: "good" });
}
// Picking something a person loves on the design screen makes them cheer.
function talkAboutChoice(key, opt) {
  const fan = opt > 0 && CAST.find(c => c.loves === key && !c.pet);
  if (fan) speak(fan.key, pickLine(LINES.love[key]), { force: true, tone: "good" });
}
// One person reacts to each sim event.
function talkOnFeed(f) {
  const bad = { tone: "bad" }, good = { tone: "good" };
  if (f.type === "warn") speakSomeone(LINES.warn[f.ev.type]);
  if (f.type === "hazard") {
    if (f.ev.type === "heat") speakSomeone(f.over > 0 ? LINES.hot : LINES.cool, f.over > 0 ? bad : good);
    else speakSomeone(LINES.scared[f.ev.type], bad);
    if (f.ghost) speak(f.ghost, save.gentle ? "Ouch! 🩹" : "Boo! 👻", { force: true, tone: "ghost" });
  }
  if (f.type === "calm" && f.ev) {
    if (f.ev.type === "heat") { if (f.ev.over > 0) speakSomeone(LINES.cooled, good); }
    else speakSomeone(f.ev.over > 0 ? LINES.hit : LINES.held, f.ev.over > 0 ? bad : good);
  }
  if (f.type === "settle") speakSomeone(LINES.sinking, bad);
  if (f.type === "shelves") speakSomeone(LINES.shelves, bad);
  if (f.type === "outage") speakSomeone(f.backed ? LINES.backed : LINES.dark, f.backed ? good : bad);
  if (f.type === "repairStart") speakSomeone(LINES.repairing);
  if (f.type === "repaired") speakSomeone(LINES.fixed, good);
  if (f.type === "over" && f.reason === "collapse") speakSomeone(LINES.falling, bad);
  if (f.type === "over" || f.type === "end") talkPhase = "done";
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
          <li>🪨 Ground: ${UNKNOWN_GROUND}</li>
          <li>🫙 Budget: <b>${lv.budget} coins</b></li>
          <li>⚠️ Weather this year:<br>${hazardSummary(lv)}</li>
          ${best ? `<li>📝 Your best grade: <b>${best.grade}</b></li>` : ""}
        </ul>
        <button class="btn go" id="goSite">Let's go, ${name()}! ▶</button>`}`;
  card.querySelector(".close").onclick = () => (card.hidden = true);
  if (!locked) $("goSite").onclick = () => openBrief(i);
}

// ---------- 3. brief ----------
// The dig-down picture of the ground (PLAN.md M3): grass, then each soil layer, sized by thickness.
const hex = c => "#" + c.toString(16).padStart(6, "0");
function soilBars(soil) {
  const rows = [{ name: "Grass", h: 0.8, color: 0x9fd27a }, ...soil.layers];
  return `<span class="profile">${rows.map(l =>
    `<span style="flex:${l.h};background:${hex(l.color)}">${l.rock ? "🪨 " : ""}${l.name}</span>`).join("")}</span>`;
}
function openBrief(i) {
  levelIdx = i;
  const lv = L();
  choice = defaultChoice();
  overlay(`<div class="brief">
    <h2>${lv.ico} Mission: ${lv.name}</h2>
    <div class="mascot" style="padding:0"><div class="fran">👷‍♀️</div>
      <div class="bubble">${name()}, ${lv.brief}! You have <b>🫙 ${lv.budget} coins</b>. The building itself costs ${lv.shell}, so you have
      <b>${lv.budget - lv.shell} coins</b> for upgrades. Coins you don't spend become your <b>repair fund</b>.</div></div>
    <div class="facts">
      <div><b>🪨 The ground</b>${UNKNOWN_GROUND}${lv.tall ? "<br><small>This tower is tall and heavy, so it needs a stronger foundation than a small building would.</small>" : ""}</div>
      <div><b>⚠️ This year's weather</b>${hazardSummary(lv)}</div>
      <div><b>📝 Your report card</b>Safety · Happiness · Open Weeks · Eco · Budget${lv.hospital ? "<br><small>🏥 Hospitals must stay open: Open Weeks count double!</small>" : ""}</div>
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
  site.setSoilKnown(knowsSoil());
  site.setRun(null);
  site.setSpin(true);
  $("runBtn").hidden = false; $("ffBtn").hidden = true; $("pauseBtn").hidden = true;
  $("banner").hidden = true; $("fixPop").hidden = true; $("openBadge").textContent = "";
  $("phase").textContent = `✏️ Design your ${L().building}`;
  document.body.classList.remove("quake");
  renderMonths();
  renderDesign();
  setTalkPhase("design");
  say(`Okay ${name()}, everything is on one screen. What's under <b>${L().name}</b>? A 🔬 <b>Soil Report</b> tells you which foundation you need. The meters show if you're strong enough for the weather. Press <b>▶ Run the year!</b> when you're ready.`);
}

function effectText(o) {
  const bits = [];
  if (o.quake) bits.push(`🌋+${o.quake}`);
  if (o.wind) bits.push(`🌪️+${o.wind}`);
  if (o.flood) bits.push(`🌊+${o.flood}`);
  if (o.heat) bits.push(`❄️+${o.heat}`);
  if (o.fire) bits.push(`🧯+${o.fire}`);
  if (o.happy) bits.push(`😊+${o.happy}`);
  if (o.eco) bits.push(`🌱+${o.eco}`);
  if (o.power) bits.push("⚡");
  if (o.bolted) bits.push("🔩");
  return bits.join(" ");
}

function renderChecks() {
  const lv = L(), st = designStats(choice);
  const types = [...new Set(lv.events.map(e => e[0]))];
  // Without a soil report, the ground's needs stay a mystery.
  const need = knowsSoil() ? soilNeed(lv) : 0;
  const rows = [`<div class="check ${!need ? "" : st.found >= need ? "ok" : "bad"}"><span class="what">🪨 Foundation${need ? "" : " ❓"}</span>
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
  // Kept short on purpose: each button is icon, name and cost. Fran explains the rest when you tap it.
  $("panel").innerHTML = `
    <div class="clay topCard">
      <div class="cash" title="Where your coins go">
        <span class="step">🫙 <b>${lv.budget}</b></span><span class="arrow">−</span>
        <span class="step">${lv.bico} <b>${lv.shell}</b></span><span class="arrow">−</span>
        <span class="step">🛠️ <b>${cost}</b></span><span class="arrow">=</span>
        <span class="step left ${left < 0 ? "neg" : ""}">🔧 Repair fund <b>${left}</b></span>
      </div>
      <div class="checks">${renderChecks()}</div>
    </div>
    <p class="legend">Left choice in each row = 📏 Code Minimum. Tap any choice to hear what it does.</p>
    <div class="secGrid">${SECTIONS.map(sec => ({ ...sec, items: sec.items.filter(it => lv.floors >= (it.minFloors || 1)) }))
      .filter(sec => sec.items.length).map((sec, si) => `<div class="clay section ${si === 0 ? "wide" : ""}" style="--c:${sec.color}"><h3>${sec.ico} ${sec.name}</h3>
      ${sec.items.map(it => `<div class="item"><span class="nm">${it.name}</span><div class="opts">
        ${it.options.map((o, i) => `<button class="opt ${choice[it.key] === i ? "sel" : ""}" data-item="${it.key}" data-opt="${i}" title="${esc(o.tip)}">
          <span class="ico">${o.ico}</span><span class="lb">${o.label}</span><span class="cost">${o.cost ? "🪙" + o.cost : "Free"}</span>
        </button>`).join("")}
      </div></div>`).join("")}
    </div>`).join("")}</div>`;
  setCoins(Math.max(0, left));
  $("ecoCount").textContent = `${st.eco * 10}/yr`;
  setHappy(Math.max(0, Math.min(100, 70 + st.happy + systemsHappy(lv, choice))));
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
  site.setSoilKnown(knowsSoil());
  renderDesign();
  talkAboutChoice(k, i);
  const lv = L(), it = ITEMS[k];
  if (k === "soil") {
    const soil = SOILS[lv.soil];
    say(knowsSoil()
      ? `🔬 Soil report is back, ${name()}: <b>${soil.name}</b>! ${soil.desc} Your foundation needs to be at least: <b>${ITEMS.found.options[soilNeed(lv) - 1].label}</b>.`
      : `🤷 Okay, no soil test. You'll have to guess the foundation, ${name()}!`);
    return;
  }
  const fnd = k !== "found" ? ""
    : !knowsSoil() ? " 🤔 Is it strong enough? Only a soil report can tell!"
    : o.level >= soilNeed(lv) ? " ✅ Strong enough for this ground!" : " ⚠️ Too weak for this ground. It will sink!";
  const fx = effectText(o), min = i === 0 && !it.foundation && !it.info;
  say(`<b>${o.ico} ${o.label}</b>${min ? " (📏 Code Minimum)" : ""}: ${o.tip}${fx ? ` <span class="fxline">${fx}</span>` : ""}${fnd}` +
    `${after < 0 ? ` <b>Uh oh, ${name()}, that's over budget!</b>` : ""}`);
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
  setTalkPhase("run");
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
  const recent = S.log.slice(-4).reverse();
  $("panel").innerHTML = `
    <div class="clay runStats">
      <div><b>${weeks(S.daysOpen)}</b>🏪 weeks open</div>
      <div><b>+${S.earned}</b>🪙 earned</div>
      <div><b>${Math.round(S.eco)}</b>🌱 eco points</div>
    </div>
    <div class="clay health"><b>🏗️ Building health ${Math.round(S.health)}%</b>
      <div class="meter"><i style="width:${S.health}%;background:${S.health >= 75 ? "var(--green)" : S.health >= HEALTH_CLOSED ? "var(--orange)" : "var(--red)"}"></i></div>
      ${fixes ? `<div class="fixes">${fixes}</div><small>Each fix takes about ${weeks(REPAIR_DAYS)} weeks, and the doors stay closed while the crew works.</small>`
        : `<small>Nothing broken 💪 Below ${HEALTH_CLOSED}% the doors must close until it's fixed.</small>`}</div>
    <div class="clay logBox"><h3>📓 Latest news</h3><ul>${recent.map(l => `<li><b>${MONTH_NAMES[l.month]}:</b> ${l.text}</li>`).join("") || "<li>Opening day! 🎀</li>"}</ul></div>`;
  setCoins(S.coins);
  $("ecoCount").textContent = Math.round(S.eco);
  setHappy(S.happy);
  const month = Math.min(11, Math.floor(S.day / MONTH_DAYS));
  $("phase").textContent = `📅 ${MONTH_NAMES[month]} · Week ${weekOf(S.day)} of ${WEEKS}`;
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
    talkOnFeed(f);
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
  talkFrame(dt);
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
const SUBJECTS = [["safety", "💪 Safety"], ["happy", "😊 Happiness"], ["open", "🏪 Open Weeks"], ["eco", "🌱 Eco Points"], ["budget", "🫙 Budget"]];

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
    ${boardEnabled() ? `<p class="boardRow"><button class="btn board" id="rBoard">🏆 Add ${name()} to the leaderboard</button>
      <span class="small" id="rBoardNote">Only your first name or nickname and this score are shared.</span></p>` : ""}
    <div class="btns">
      <button class="btn ghost" id="rMap">🗺️ Map</button>
      <button class="btn ff" id="rRetry">🔁 Try again</button>
      ${r.pass && levelIdx + 1 < LEVELS.length ? `<button class="btn go" id="rNext">Next site ▶</button>` : ""}
    </div>`, "report");
  if ($("rBoard")) $("rBoard").onclick = () => postScore(R, r, lv);
  if (r.stars >= 2) { sound("win"); FX && FX.confetti(180); FX && FX.fireworks(2600); }
  else if (r.pass) { sound("cheer"); FX && FX.confetti(80); }
  else sound("sad");
  $("rMap").onclick = () => openMap(nowUnlocked ? levelIdx + 1 : levelIdx);
  $("rRetry").onclick = () => { closeOverlay(); startDesign(true); };
  if ($("rNext")) $("rNext").onclick = () => openBrief(levelIdx + 1);
}

// Opt-in: the player taps the button; nothing is sent otherwise.
async function postScore(R, r, lv) {
  const btn = $("rBoard"), note = $("rBoardNote");
  const nick = cleanName(save.name);
  if (!nick) { note.textContent = "Pick a first name or nickname with letters and numbers to join the leaderboard."; return; }
  btn.disabled = true;
  btn.textContent = "⏳ Sending…";
  try {
    await submitScore({ name: nick, site: lv.key, score: r.score, grade: r.grade, eco: Math.round(R.eco),
      ghosts: R.ghosts, passed: r.pass, choices: { ...R.choice } });
    btn.textContent = `✅ ${esc(nick)} is on the leaderboard!`;
    note.innerHTML = `<a href="leaderboard.html" target="_blank" rel="noopener">See the leaderboard ↗</a>`;
    sound("ding");
  } catch (e) {
    btn.disabled = false;
    btn.textContent = "🏆 Try again";
    note.textContent = "Couldn't reach the leaderboard right now. Your grade is still saved on this device.";
  }
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

// ---------- about ----------
const TEAM = [
  ["Anandharam Mourougassamy", "MKA · Seattle", "https://www.linkedin.com/in/amurugas/"],
  ["Alexander Alaura Reyes", "ZFA · San Francisco", "https://www.linkedin.com/in/alexander-alaura-reyes-se-46761085/"],
  ["Nancy Abdo", "SSOE Group", "https://www.linkedin.com/in/nancyabdo/"],
  ["Tom Kovalcik", "Structured AI", "https://www.linkedin.com/in/tomaskovalcik/"],
  ["Andrew Sundal", "HGA · Minneapolis", "https://www.linkedin.com/in/andrew-sundal-b374169/"],
  ["Carlos Navea", "SDSU", "https://www.linkedin.com/in/carlosnavea/"],
  ["Rao Patri", "Logan Patri Engineering", "https://www.linkedin.com/in/rao-patri-pe-se-425a0319/"],
  ["Joel Kramer", "SSOE Group", "https://www.linkedin.com/in/joel-kramer-pe-35662817/"],
  ["Victor Garcia", "SSOE Group", ""], // add his LinkedIn URL here when we have it
];
function showAbout() {
  overlay(`<div class="about">
    <h2>👷 About BuildCraft</h2>
    <p>BuildCraft puts kids in the builder's seat. Pick a site, test the soil, spend a budget wisely, and see whether your building
      keeps its people safe and happy through a year of earthquakes, storms, floods and heat waves. Along the way you learn how
      structure, architecture, building systems and sustainability work together.</p>
    <p class="event">🏆 Made at the <b>NCSEA Hackathon 2026</b></p>
    ${boardEnabled() ? `<p><a class="btn board" href="leaderboard.html" target="_blank" rel="noopener">🏆 See the leaderboard</a></p>` : ""}
    <h3>💛 Thank you to the team</h3>
    <ul class="team">${TEAM.map(([n, org, url]) => `<li><b>${n}</b><span>${org}</span>
      ${url ? `<a href="${url}" target="_blank" rel="noopener noreferrer">LinkedIn ↗</a>` : ""}</li>`).join("")}</ul>
    <p class="small">A game, not engineering: every number in it is made up to teach the big ideas. Real buildings are designed by licensed engineers.</p>
    <div class="btns"><button class="btn go" id="aboutClose">Back to building ▶</button></div>
  </div>`);
  $("aboutClose").onclick = closeOverlay;
}
$("aboutBtn").onclick = showAbout;
$("aboutLink").onclick = showAbout;
$("boardBtn").hidden = $("boardLink").hidden = !boardEnabled();

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
