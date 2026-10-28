// ============================================================
// board-stats.js — pure helpers for the leaderboard: name cleaning, rankings and fun stats.
// No DOM and no network, so tests/board-stats.test.mjs can check them with plain node.
// A score row: { name, site, score, grade, eco, ghosts, passed, choices: {itemKey: optionIndex}, uid, ts }
// ============================================================

import { LEVELS, GRADES, ITEMS, PASS_SCORE } from "./data.js";

export const NAME_MAX = 12;
// A short, kid-safe filter. STARTS blocks any word beginning with it; EXACT blocks only the whole
// word, so names like "Hello" or "Cassidy" still pass.
const STARTS = ["fuck", "shit", "bitch", "stupid", "idiot", "poop"];
const EXACT = ["ass", "butt", "fart", "dumb", "hate", "kill", "sex", "damn", "hell", "crap"];

// Letters, numbers and single spaces only, up to NAME_MAX characters. Returns "" if nothing usable is left.
export function cleanName(raw) {
  const s = String(raw || "").replace(/[^A-Za-z0-9 ]/g, "").replace(/\s+/g, " ").trim().slice(0, NAME_MAX).trim();
  const bad = s.toLowerCase().split(" ").some(w => EXACT.includes(w) || STARTS.some(b => w.startsWith(b)));
  return bad ? "" : s;
}

const playerId = r => r.uid || `name:${r.name}`;

// Each player's best run per site (ties go to the earlier run).
function bestRuns(rows) {
  const best = new Map();
  for (const r of rows) {
    const k = `${playerId(r)}|${r.site}`, b = best.get(k);
    if (!b || r.score > b.score || (r.score === b.score && r.ts < b.ts)) best.set(k, r);
  }
  return [...best.values()];
}

// Top n per site, one row per player, highest score first.
export function topPerSite(rows, n = 10) {
  const best = bestRuns(rows);
  return Object.fromEntries(LEVELS.map(l => [l.key,
    best.filter(r => r.site === l.key).sort((a, b) => b.score - a.score || a.ts - b.ts).slice(0, n)]));
}

// Overall champions: best score on each site, summed. Ties go to whoever passed more sites.
export function champions(rows, n = 10) {
  const byPlayer = new Map();
  for (const r of bestRuns(rows)) {
    const id = playerId(r);
    const p = byPlayer.get(id) || { id, name: r.name, total: 0, passed: 0, sites: 0, lastTs: 0 };
    p.total += r.score;
    p.sites++;
    if (r.score >= PASS_SCORE) p.passed++;
    if (r.ts > p.lastTs) { p.lastTs = r.ts; p.name = r.name; } // show the name they used most recently
    byPlayer.set(id, p);
  }
  return [...byPlayer.values()].sort((a, b) => b.total - a.total || b.passed - a.passed || a.lastTs - b.lastTs).slice(0, n);
}

// Headline numbers, the grade spread and the most-picked upgrades.
export function funStats(rows) {
  const grades = Object.fromEntries(GRADES.map(([, g]) => [g, 0]));
  const picks = new Map();
  let eco = 0, ghosts = 0, total = 0;
  for (const r of rows) {
    if (r.grade in grades) grades[r.grade]++;
    eco += r.eco || 0;
    ghosts += r.ghosts || 0;
    total += r.score;
    for (const [k, i] of Object.entries(r.choices || {})) {
      const opt = ITEMS[k] && ITEMS[k].options[i];
      if (!opt || i === 0) continue; // option 0 is the free / Code Minimum choice, not an upgrade
      const id = `${k}:${i}`;
      const p = picks.get(id) || { label: opt.label, ico: opt.ico, count: 0 };
      p.count++;
      picks.set(id, p);
    }
  }
  return {
    games: rows.length,
    players: new Set(rows.map(playerId)).size,
    aPlus: grades["A+"] || 0,
    avgScore: rows.length ? Math.round(total / rows.length) : 0,
    eco, ghosts,
    grades: GRADES.map(([, g]) => ({ grade: g, count: grades[g] })),
    topPicks: [...picks.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).slice(0, 6),
  };
}

export function timeAgo(ts, now = Date.now()) {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}
