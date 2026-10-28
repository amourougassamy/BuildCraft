// ============================================================
// leaderboard.js — the dashboard page (leaderboard.html).
// Reads the newest scores every 15 s and redraws: headline tiles, overall champions,
// grade spread, most-picked upgrades, and the top 10 on each site.
// Add ?demo to the URL to preview the page with clearly-labelled sample data.
// ============================================================

import { LEVELS, ITEMS } from "./data.js";
import { boardEnabled, fetchScores, myUid } from "./board.js";
import { topPerSite, champions, funStats, timeAgo } from "./board-stats.js";

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const REFRESH_MS = 15000;
const demo = new URLSearchParams(location.search).has("demo");
const MEDALS = ["🥇", "🥈", "🥉"];
let lastOk = 0, rows = [];

// ---------- sample data for ?demo (deterministic, so screenshots are stable) ----------
function sampleRows() {
  const names = ["Maya", "Leo", "Ava", "Noah", "Zoe", "Sam", "Ivy", "Max", "Ruby", "Eli", "Nia", "Omar"];
  const grades = s => s >= 90 ? "A+" : s >= 85 ? "A" : s >= 75 ? "B" : s >= 65 ? "C" : s >= 50 ? "D" : "F";
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const keys = Object.keys(ITEMS), out = [];
  for (let i = 0; i < 90; i++) {
    const p = Math.floor(rnd() * names.length), lv = LEVELS[Math.min(4, Math.floor(rnd() * rnd() * 6))];
    const score = Math.round(35 + rnd() * 62);
    const choices = Object.fromEntries(keys.map(k => [k, rnd() < 0.45 ? Math.min(ITEMS[k].options.length - 1, 1 + Math.floor(rnd() * 2)) : 0]));
    out.push({ name: names[p], uid: `demo${p}`, site: lv.key, score, grade: grades(score), eco: Math.round(rnd() * 80),
      ghosts: score < 60 ? 1 : 0, passed: score >= 65, choices, ts: Date.now() - Math.round(rnd() * 3 * 3600e3) });
  }
  return out;
}

// ---------- tooltip for chart marks ----------
const tip = $("tip");
document.addEventListener("pointerover", e => {
  const m = e.target.closest("[data-tip]");
  if (!m) { tip.hidden = true; return; }
  tip.textContent = m.dataset.tip;
  tip.hidden = false;
});
document.addEventListener("pointermove", e => {
  if (tip.hidden) return;
  tip.style.left = Math.min(innerWidth - tip.offsetWidth - 8, e.clientX + 14) + "px";
  tip.style.top = (e.clientY - tip.offsetHeight - 10) + "px";
});

// ---------- drawing ----------
function drawTiles(st) {
  const tiles = [["🎮", st.games, "years played"], ["👷", st.players, "builders"], ["🏆", st.aPlus, "A+ grades"],
    ["📈", st.avgScore, "average score"], ["🌱", st.eco, "eco points"], ["👻", st.ghosts, "ghosts"]];
  $("tiles").innerHTML = tiles.map(([ico, n, label]) => `<div class="clay tile"><b>${n.toLocaleString()}</b><span>${ico} ${label}</span></div>`).join("");
}

function drawChamps(list) {
  const me = myUid();
  $("champs").innerHTML = list.length ? list.map((p, i) => `<li class="${p.id === me ? "me" : ""}">
      <span class="pos">${MEDALS[i] || i + 1}</span><span class="who">${esc(p.name)}${p.id === me ? " <small>(you)</small>" : ""}</span>
      <span class="pts">${p.total}</span><span class="small">${"⭐".repeat(p.passed)}</span></li>`).join("")
    : `<li class="empty">No scores yet. Be the first!</li>`;
}

function drawGrades(grades) {
  const max = Math.max(1, ...grades.map(g => g.count));
  $("gradeChart").setAttribute("aria-label", grades.map(g => `${g.grade}: ${g.count}`).join(", "));
  $("gradeChart").innerHTML = grades.map(g => `<div class="col">
      <div class="track"><i style="height:${(g.count / max) * 100}%" data-tip="${g.grade}: ${g.count} year${g.count === 1 ? "" : "s"}"></i></div>
      <span class="lab">${g.grade}</span></div>`).join("");
  $("gradeTable").innerHTML = `<tr><th>Grade</th><th>Years</th></tr>` + grades.map(g => `<tr><td>${g.grade}</td><td>${g.count}</td></tr>`).join("");
}

function drawPicks(picks) {
  const max = Math.max(1, ...picks.map(p => p.count));
  $("pickChart").innerHTML = picks.length ? picks.map(p => `<div class="hb">
      <span class="lab">${p.ico} ${esc(p.label)}</span>
      <span class="track"><i style="width:${(p.count / max) * 100}%" data-tip="${esc(p.label)}: picked ${p.count} times"></i></span>
      <span class="val">${p.count}</span></div>`).join("") : `<p class="small">No upgrades picked yet.</p>`;
  $("pickTable").innerHTML = `<tr><th>Upgrade</th><th>Times picked</th></tr>` + picks.map(p => `<tr><td>${esc(p.label)}</td><td>${p.count}</td></tr>`).join("");
}

function drawSites(tops) {
  const me = myUid(), now = Date.now();
  $("sites").innerHTML = LEVELS.map((lv, i) => {
    const list = tops[lv.key] || [];
    return `<section class="clay card site"><h3>${lv.ico} ${i + 1}. ${lv.name}</h3><p class="sub">${lv.bico} ${lv.building}</p>
      <ol class="rank">${list.length ? list.map((r, k) => `<li class="${r.uid === me ? "me" : ""}">
        <span class="pos">${MEDALS[k] || k + 1}</span><span class="who">${esc(r.name)}${r.uid === me ? " <small>(you)</small>" : ""}</span>
        <span class="gr">${r.grade}</span><span class="pts">${r.score}</span><span class="small when">${timeAgo(r.ts, now)}</span></li>`).join("")
        : `<li class="empty">Nobody yet. Be the first!</li>`}</ol></section>`;
  }).join("");
}

function draw() {
  const st = funStats(rows);
  drawTiles(st);
  drawChamps(champions(rows, 10));
  drawGrades(st.grades);
  drawPicks(st.topPicks);
  drawSites(topPerSite(rows, 10));
}

// ---------- live refresh ----------
async function refresh() {
  if (document.hidden) return;
  try {
    rows = demo ? sampleRows() : await fetchScores();
    lastOk = Date.now();
    draw();
  } catch (e) {
    $("live").textContent = "● Offline, retrying…";
    $("live").className = "live off";
  }
}
function tickLive() {
  if (!lastOk) return;
  const s = Math.round((Date.now() - lastOk) / 1000);
  $("live").textContent = `● Live · updated ${s < 5 ? "just now" : `${s} s ago`}`;
  $("live").className = "live on";
}

if (!boardEnabled() && !demo) {
  $("offCard").hidden = false;
  $("live").textContent = "● Off";
  $("live").className = "live off";
  draw();
} else {
  $("demoNote").hidden = !demo;
  refresh();
  setInterval(refresh, REFRESH_MS);
  setInterval(tickLive, 1000);
  document.addEventListener("visibilitychange", refresh);
}
