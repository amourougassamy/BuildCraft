import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanName, topPerSite, champions, funStats, timeAgo, NAME_MAX } from "../js/board-stats.js";

const row = (uid, name, site, score, extra = {}) => ({ uid, name, site, score, grade: "B", eco: 10, ghosts: 0, passed: score >= 65, choices: {}, ts: 1000, ...extra });

test("names: letters, numbers and spaces only, capped, rude words blocked", () => {
  assert.equal(cleanName("  Maya!! "), "Maya");
  assert.equal(cleanName("Leo   the  Builder"), "Leo the Buil");
  assert.ok(cleanName("A very long builder name").length <= NAME_MAX);
  assert.equal(cleanName("<script>"), "script");
  assert.equal(cleanName("💥🔥"), "");
  assert.equal(cleanName("poopy"), "");
  assert.equal(cleanName("Hello"), "Hello", "a rude word inside a normal name doesn't block it");
  assert.equal(cleanName("Cassidy"), "Cassidy");
});

test("top per site keeps each player's best run only, highest first", () => {
  const rows = [row("a", "Ava", "rocky", 70), row("a", "Ava", "rocky", 90), row("b", "Ben", "rocky", 80), row("c", "Cy", "mega", 60)];
  const tops = topPerSite(rows);
  assert.deepEqual(tops.rocky.map(r => [r.name, r.score]), [["Ava", 90], ["Ben", 80]]);
  assert.equal(tops.mega.length, 1);
  assert.deepEqual(tops.breezy, []);
});

test("ties on a site go to whoever got there first", () => {
  const tops = topPerSite([row("a", "Ava", "rocky", 80, { ts: 20 }), row("b", "Ben", "rocky", 80, { ts: 10 })]);
  assert.equal(tops.rocky[0].name, "Ben");
});

test("champions add up each player's best score per site", () => {
  const rows = [row("a", "Ava", "rocky", 90), row("a", "Ava", "rocky", 50), row("a", "Ava", "prairie", 70),
    row("b", "Ben", "rocky", 95), row("b", "Benny", "breezy", 40, { ts: 2000 })];
  const c = champions(rows);
  assert.deepEqual(c.map(p => [p.name, p.total, p.passed]), [["Ava", 160, 2], ["Benny", 135, 1]]);
});

test("fun stats count games, players, grades and real upgrades only", () => {
  const rows = [row("a", "Ava", "rocky", 92, { grade: "A+", eco: 30, choices: { roof: 1, frame: 0 } }),
    row("b", "Ben", "rocky", 40, { grade: "F", ghosts: 1, choices: { roof: 1, iso: 1 } })];
  const s = funStats(rows);
  assert.equal(s.games, 2);
  assert.equal(s.players, 2);
  assert.equal(s.aPlus, 1);
  assert.equal(s.avgScore, 66);
  assert.equal(s.ghosts, 1);
  assert.equal(s.eco, 40);
  assert.equal(s.grades.find(g => g.grade === "F").count, 1);
  assert.equal(s.topPicks[0].label, "Strapped Roof");
  assert.equal(s.topPicks[0].count, 2);
  assert.ok(!s.topPicks.some(p => p.label === "Wood Frame"), "Code Minimum picks are not counted as upgrades");
});

test("empty board", () => {
  assert.equal(funStats([]).avgScore, 0);
  assert.deepEqual(champions([]), []);
});

test("time ago", () => {
  assert.equal(timeAgo(0, 30e3), "just now");
  assert.equal(timeAgo(0, 5 * 60e3), "5 min ago");
  assert.equal(timeAgo(0, 3 * 3600e3), "3 h ago");
});
