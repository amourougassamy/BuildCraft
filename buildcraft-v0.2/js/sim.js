// ============================================================
// sim.js — OWNED BY SQUAD 2 (Game logic)
// Pure functions: choices in, results out. No drawing here.
// ============================================================

(function () {
  const G = window.GAME;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const decision = (id) => G.decisions.find((d) => d.id === id);
  const option = (dId, oId) => decision(dId).options.find((o) => o.id === oId);

  // ["roof:snow", "extras:solar", ...]
  function keys(choices) {
    const out = [];
    for (const d of G.decisions) {
      const v = choices[d.id];
      if (d.type === "multi") (v || []).forEach((id) => out.push(`${d.id}:${id}`));
      else out.push(`${d.id}:${v}`);
    }
    return out;
  }
  const picked = (choices) => keys(choices).map((k) => { const [d, o] = k.split(":"); return option(d, o); });

  function costs(choices) {
    const construction = G.basePackage + picked(choices).reduce((s, o) => s + (o.cost || 0), 0);
    const fees = construction * G.feeRate;
    const rainy = construction * G.rainyDayRate;
    const planned = construction + fees + rainy;
    return { construction, fees, rainy, planned, coinsLeft: G.budget - planned };
  }

  function ratings(choices) {
    const opts = picked(choices);
    const out = {};
    for (const h of Object.keys(G.hazards)) {
      const vals = G.governs[h].map((dId) => {
        const o = option(dId, choices[dId]);
        return o && o.ratings && o.ratings[h] != null ? o.ratings[h] : 0;
      });
      const bonus = opts.reduce((s, o) => s + ((o.bonus && o.bonus[h]) || 0), 0);
      out[h] = clamp(Math.min(...vals) + bonus, 0, 10);
    }
    return out;
  }

  function energy(choices) {
    const opts = picked(choices);
    let e = G.baselineEnergy;
    opts.forEach((o) => { if (o.energyPct) e *= 1 + o.energyPct; });
    opts.forEach((o) => { if (o.energySave) e -= o.energySave; });
    return Math.max(0, Math.round(e));
  }

  // Mood before any storm: happy if they got something they love.
  function startMoods(choices) {
    const k = new Set(keys(choices));
    const moods = {};
    G.cast.forEach((c) => (moods[c.id] = c.loves.some((l) => k.has(l)) ? "happy" : "sad"));
    return moods;
  }

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function weatherYear(mode, seed) {
    const card = (id) => G.weatherDeck.find((e) => e.id === id);
    if (mode === "demo") {
      return G.demoWeather.map((s) => ({ season: s.season, events: s.events.map((e) => ({ ...card(e.id), intensity: e.intensity })) }));
    }
    const r = rng(seed);
    return G.seasons.map((season) => ({
      season,
      events: G.weatherDeck
        .filter((e) => e.season === season)
        .map((e) => ({ e, roll: r(), size: r() }))
        .filter((x) => x.roll < x.e.chance)
        .map((x) => ({ ...x.e, intensity: x.e.min + Math.floor(x.size * (x.e.max - x.e.min + 1)) })),
    }));
  }

  // Cheapest piece in the governing decision that would have survived.
  // Returns { names: [...], extra } or null when nothing on the menu is strong enough.
  function findFix(choices, hazard, intensity) {
    const govs = G.governs[hazard];
    let best = null;
    // Try one piece at a time first, then upgrading every piece that sets this power.
    for (const dId of govs) {
      const current = option(dId, choices[dId]);
      for (const o of [...decision(dId).options].sort((a, b) => a.cost - b.cost)) {
        if (o.id === current.id) continue;
        if (ratings({ ...choices, [dId]: o.id })[hazard] >= intensity) {
          const extra = o.cost - current.cost;
          if (!best || extra < best.extra) best = { names: [o.name], extra };
          break;
        }
      }
    }
    if (best) return best;
    const test = { ...choices };
    let extra = 0;
    const names = [];
    for (const dId of govs) {
      const current = option(dId, choices[dId]);
      const strongest = [...decision(dId).options].sort((a, b) => ((b.ratings || {})[hazard] || 0) - ((a.ratings || {})[hazard] || 0))[0];
      if (strongest.id !== current.id) { test[dId] = strongest.id; extra += strongest.cost - current.cost; names.push(strongest.name); }
    }
    return names.length && ratings(test)[hazard] >= intensity ? { names, extra } : null;
  }

  function simulate(choices, mode, seed) {
    const c = costs(choices);
    const power = ratings(choices);
    const r = rng(seed * 31 + 7);

    // Construction: the dig-test gamble
    const soils = option("soils", choices.soils);
    const soilsHit = !!soils.risk && (mode === "demo" ? true : r() < soils.risk.chance);
    const surprise = soilsHit ? soils.risk.cost : 0;
    const rainyUsed = Math.min(surprise, c.rainy);
    const rainyBack = c.rainy - rainyUsed;
    const spent = c.construction + c.fees + surprise;

    // The year, with moods changing storm by storm
    const moods = startMoods(choices);
    const startingMoods = { ...moods };
    let repairs = 0, closedDays = 0, ghosts = [];
    const seasons = weatherYear(mode, seed).map((s) => {
      const events = s.events.map((e) => {
        const hz = G.hazards[e.hazard];
        const rating = power[e.hazard];
        const over = Math.max(0, e.intensity - rating);
        const repair = over * hz.repair;
        const days = Math.round(over * hz.days);
        repairs += repair;
        closedDays += days;
        const changes = [];
        if (over >= 3 && hz.deadly) {
          const victim = G.cast
            .filter((p) => moods[p.id] !== "ghost" && (p.exposure[e.hazard] || 0) > 0)
            .sort((a, b) => (b.exposure[e.hazard] || 0) - (a.exposure[e.hazard] || 0))[0];
          if (victim) { moods[victim.id] = "ghost"; ghosts.push(victim.id); changes.push({ id: victim.id, to: "ghost" }); }
        }
        if (over > 0) {
          G.cast.forEach((p) => {
            if (moods[p.id] === "ghost") return;
            const worried = p.worries.includes(e.hazard);
            const closedHit = days >= 1 && p.id === "maya";
            if ((worried || closedHit) && moods[p.id] !== "sad") { moods[p.id] = "sad"; changes.push({ id: p.id, to: "sad" }); }
          });
        }
        const fix = over > 0 ? findFix(choices, e.hazard, e.intensity) : null;
        return { ...e, rating, over, repair, days, changes, fix, crash: over >= 3 };
      });
      return { season: s.season, events, moods: { ...moods } };
    });

    const energyCost = energy(choices);
    const coinsLeft = G.budget - spent - repairs - energyCost;
    const happy = G.cast.filter((p) => moods[p.id] === "happy").length;
    const sad = G.cast.filter((p) => moods[p.id] === "sad").length;

    const meters = {
      people: clamp(10 + happy * 15 + sad * 4, 0, 100),
      safety: clamp(100 - (repairs / G.budget) * 600 - closedDays - ghosts.length * 15, 0, 100),
      coins: clamp(coinsLeft >= 0 ? 60 + (coinsLeft / G.budget) * 220 : 60 + (coinsLeft / G.budget) * 300, 0, 100),
      planet: clamp(30 + picked(choices).reduce((s, o) => s + (o.planet || 0), 0) + (1 - energyCost / G.baselineEnergy) * 60, 0, 100),
    };
    Object.keys(meters).forEach((k) => (meters[k] = Math.round(meters[k])));
    const w = G.weights;
    const score = Math.round((meters.people * w.people + meters.safety * w.safety + meters.coins * w.coins + meters.planet * w.planet) / (w.people + w.safety + w.coins + w.planet));
    let stars = score >= 75 ? 3 : score >= 50 ? 2 : 1;
    if (ghosts.length && stars > 2) stars = 2;
    const review = G.reviews.find((x) => x.stars === stars).text;

    const all = seasons.flatMap((s) => s.events);
    const worst = all.filter((e) => e.over > 0).sort((a, b) => b.repair - a.repair)[0] || null;

    const badges = [];
    if (all.some((e) => e.hazard === "snow" && e.intensity >= 9 && e.over === 0)) badges.push("snowboss");
    if (all.some((e) => e.hazard === "flood") && !all.some((e) => e.hazard === "flood" && e.over > 0)) badges.push("floodfighter");
    if (stars === 3 && coinsLeft >= 250000) badges.push("pennypincher");
    if (happy === G.cast.length) badges.push("peoplepleaser");
    if (energyCost < 20000) badges.push("greenmachine");

    return {
      choices: JSON.parse(JSON.stringify(choices)), mode, seed,
      costs: c, power, soilsHit, surprise, rainyUsed, rainyBack, spent,
      startingMoods, seasons, moods, ghosts, happy, sad,
      repairs, closedDays, energyCost, coinsLeft, meters, score, stars, review, worst, badges,
    };
  }

  window.SIM = { keys, picked, costs, ratings, energy, startMoods, simulate, decision, option };
})();
