// ============================================================
// sim.js — OWNED BY SQUAD 2 (Game logic)
// Pure functions: choices in, numbers out. No DOM here.
// ============================================================

(function () {
  const G = window.GAME;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function decision(id) {
    return G.decisions.find((d) => d.id === id);
  }

  function option(decisionId, optionId) {
    return decision(decisionId).options.find((o) => o.id === optionId);
  }

  // Every option the player has picked, extras included.
  function picked(choices) {
    const out = [];
    for (const d of G.decisions) {
      const v = choices[d.id];
      if (d.type === "multi") (v || []).forEach((id) => out.push(option(d.id, id)));
      else out.push(option(d.id, v));
    }
    return out.filter(Boolean);
  }

  function costs(choices) {
    const opts = picked(choices);
    const construction = G.basePackage + opts.reduce((s, o) => s + (o.cost || 0), 0);
    const fees = construction * G.feeRate;
    const rate = option("contingency", choices.contingency).rate;
    const contingency = construction * rate;
    const planned = construction + fees + contingency;
    return { construction, fees, contingency, rate, planned, left: G.budget - planned };
  }

  function ratings(choices) {
    const opts = picked(choices);
    const out = {};
    for (const h of Object.keys(G.hazards)) {
      const governing = G.governs[h]
        .map((dId) => option(dId, choices[dId]))
        .map((o) => (o && o.ratings && o.ratings[h] != null ? o.ratings[h] : 0));
      const base = governing.length ? Math.min(...governing) : 0;
      const bonus = opts.reduce((s, o) => s + ((o.bonus && o.bonus[h]) || 0), 0);
      out[h] = clamp(base + bonus, 0, 10);
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

  function bonusSum(choices, key) {
    return picked(choices).reduce((s, o) => s + (o[key] || 0), 0);
  }

  // Seeded random so a "random year" can be replayed exactly.
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
      return G.demoWeather.map((s) => ({
        season: s.season,
        events: s.events.map((e) => ({ ...card(e.id), intensity: e.intensity })),
      }));
    }
    const r = rng(seed);
    return G.seasons.map((season) => ({
      season,
      events: G.weatherDeck
        .filter((e) => e.season === season)
        .map((e) => ({ e, roll: r(), size: r() })) // two draws per card keeps replays stable
        .filter((x) => x.roll < x.e.chance)
        .map((x) => ({ ...x.e, intensity: x.e.min + Math.floor(x.size * (x.e.max - x.e.min + 1)) })),
    }));
  }

  // The cheapest option in the governing decision that would have survived.
  function findFix(choices, hazard, intensity) {
    const dId = G.governs[hazard][0];
    const d = decision(dId);
    const current = option(dId, choices[dId]);
    const sorted = [...d.options].sort((a, b) => a.cost - b.cost);
    for (const o of sorted) {
      const test = { ...choices, [dId]: o.id };
      if (ratings(test)[hazard] >= intensity && o.id !== current.id) {
        return { option: o, extra: o.cost - current.cost, decision: d };
      }
    }
    return null;
  }

  function simulate(choices, mode, seed) {
    const G_ = G;
    const c = costs(choices);
    const rate = ratings(choices);
    const r = rng(seed * 31 + 7);

    // Construction: the soils gamble
    const soils = option("soils", choices.soils);
    let soilsHit = false;
    let surprise = 0;
    if (soils.risk) {
      soilsHit = mode === "demo" ? true : r() < soils.risk.chance;
      if (soilsHit) surprise = soils.risk.cost;
    }
    const fromContingency = Math.min(surprise, c.contingency);
    const overContingency = surprise - fromContingency;
    const spent = c.construction + c.fees + surprise; // unused contingency is returned

    // The year
    let repairs = 0;
    let closedDays = 0;
    const seasons = weatherYear(mode, seed).map((s) => ({
      season: s.season,
      events: s.events.map((e) => {
        const rating = rate[e.hazard];
        const over = Math.max(0, e.intensity - rating);
        const hz = G_.hazards[e.hazard];
        const repair = over * hz.repair;
        const days = Math.round(over * hz.days);
        repairs += repair;
        closedDays += days;
        return { ...e, rating, over, repair, days };
      }),
    }));

    const energyCost = energy(choices);
    const left = G.budget - spent - repairs - energyCost;

    // Meters, 0-100
    const meters = {
      budget: clamp(left >= 0 ? 60 + (left / G.budget) * 220 : 60 + (left / G.budget) * 300, 0, 100),
      people: clamp(55 + bonusSum(choices, "people") - closedDays * 0.4, 0, 100),
      resilience: clamp(100 - (repairs / G.budget) * 600 - closedDays, 0, 100),
      planet: clamp(30 + bonusSum(choices, "planet") + (1 - energyCost / G.baselineEnergy) * 60, 0, 100),
    };
    Object.keys(meters).forEach((k) => (meters[k] = Math.round(meters[k])));

    const w = G.weights;
    const wsum = w.people + w.resilience + w.budget + w.planet;
    const score = Math.round(
      (meters.people * w.people + meters.resilience * w.resilience + meters.budget * w.budget + meters.planet * w.planet) / wsum
    );
    const review = G.reviews.find((x) => score >= x.min).text;

    // Lesson: the costliest event and what would have stopped it
    const all = seasons.flatMap((s) => s.events);
    const worst = all.filter((e) => e.over > 0).sort((a, b) => b.repair - a.repair)[0];
    let lesson;
    if (worst) {
      const fix = findFix(choices, worst.hazard, worst.intensity);
      lesson = {
        event: worst,
        fix,
      };
    }

    return {
      choices: JSON.parse(JSON.stringify(choices)),
      mode, seed, costs: c, ratings: rate, soilsHit, surprise, fromContingency, overContingency,
      spent, seasons, repairs, closedDays, energyCost, left, meters, score, review, lesson,
    };
  }

  window.SIM = { picked, costs, ratings, energy, bonusSum, simulate, weatherYear, option, decision };
})();
