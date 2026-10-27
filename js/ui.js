// ============================================================
// ui.js — OWNED BY SQUAD 4 (UI and UX), wired by SQUAD 1
// Screens: brief -> design -> year -> results. One render() call
// redraws the whole app from `state`; clicks go through one handler.
// ============================================================

(function () {
  const G = window.GAME;
  const S = window.SIM;
  const app = document.getElementById("app");

  const state = {
    screen: "brief",
    choices: JSON.parse(JSON.stringify(G.defaultChoices)),
    mode: "demo",
    seed: 2026,
    run: null,
    stage: 0, // 0 = construction, 1-4 = seasons
    history: [],
  };

  // ---------- helpers ----------
  const money = (n) => (n < 0 ? "-$" : "$") + Math.abs(Math.round(n)).toLocaleString("en-US");
  const millions = (n) => (n < 0 ? "-$" : "$") + (Math.abs(n) / 1e6).toFixed(2) + "M";
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  const meterNames = { people: "People", resilience: "Resilience", budget: "Budget", planet: "Planet" };
  const meterHelp = {
    people: "Comfort, daylight, days open",
    resilience: "Damage avoided",
    budget: "Money left after a year",
    planet: "Energy and materials",
  };

  function optionTags(o) {
    const t = [];
    if (o.ratings) Object.entries(o.ratings).forEach(([h, v]) => t.push(`${G.hazards[h].label} ${v}`));
    if (o.bonus) Object.entries(o.bonus).forEach(([h, v]) => t.push(`${G.hazards[h].label} +${v}`));
    if (o.energyPct) t.push(`Energy ${Math.round(o.energyPct * 100)}%`);
    if (o.energySave) t.push(`Energy -${money(o.energySave)}/yr`);
    if (o.people) t.push(`People ${o.people > 0 ? "+" : ""}${o.people}`);
    if (o.planet) t.push(`Planet ${o.planet > 0 ? "+" : ""}${o.planet}`);
    if (o.note) t.push(o.note);
    return t;
  }

  function stars(v) {
    const n = v >= 80 ? 3 : v >= 55 ? 2 : 1;
    return `<span class="stars" aria-label="${n} of 3 stars">${[1, 2, 3].map((i) => `<i class="${i <= n ? "on" : ""}"></i>`).join("")}</span>`;
  }

  // ---------- header ----------
  function header() {
    const c = S.costs(state.choices);
    const pct = Math.min(100, (c.planned / G.budget) * 100);
    const over = c.planned > G.budget;
    const sheets = [
      { id: "brief", no: "G-001", name: "Brief", ok: true },
      { id: "design", no: "A-101", name: "Design", ok: true },
      { id: "year", no: "W-201", name: "Weather year", ok: !!state.run },
      { id: "results", no: "R-301", name: "Results", ok: !!state.run && state.stage >= 4 },
    ];
    return `
    <header class="titleblock">
      <div class="tb-brand">
        <span class="wordmark">Build It!</span>
        <span class="tb-project">${esc(G.scenario.name)} <span class="sep">/</span> ${esc(G.scenario.city)}</span>
      </div>
      <nav class="tb-sheets" aria-label="Game steps">
        ${sheets
          .map(
            (s) => `<button class="sheet${state.screen === s.id ? " current" : ""}" data-go="${s.id}" ${s.ok ? "" : "disabled"}>
            <span class="sheet-no">${s.no}</span><span class="sheet-name">${s.name}</span></button>`
          )
          .join("")}
      </nav>
      <div class="tb-budget${over ? " over" : ""}">
        <div class="tb-budget-row"><span class="label">Planned</span><span class="num">${millions(c.planned)} <span class="of">of ${millions(G.budget)}</span></span></div>
        <div class="bar" role="meter" aria-valuemin="0" aria-valuemax="${G.budget}" aria-valuenow="${Math.round(c.planned)}" aria-label="Planned cost against budget"><span style="width:${pct}%"></span></div>
      </div>
    </header>`;
  }

  // ---------- brief ----------
  function briefScreen() {
    const sc = G.scenario;
    const w = G.weights;
    const order = Object.entries(w).sort((a, b) => b[1] - a[1]);
    return `
    <section class="brief">
      <div class="brief-client">
        <p class="eyebrow">Your client</p>
        <blockquote class="quote">${esc(sc.client.quote)}</blockquote>
        <p class="attrib"><strong>${esc(sc.client.name)}</strong>, ${esc(sc.client.role)}</p>
        <p class="twist"><span class="tag">The twist</span> ${esc(sc.twist)}</p>
      </div>
      <div class="brief-facts">
        <p class="eyebrow">Project facts</p>
        <dl class="facts">
          <div><dt>Building</dt><dd>${esc(sc.name)}</dd></div>
          <div><dt>Size</dt><dd>${esc(sc.size)}</dd></div>
          <div><dt>Site</dt><dd>${esc(sc.site)}</dd></div>
          <div><dt>Climate</dt><dd>${esc(sc.climate)}</dd></div>
          <div><dt>Budget</dt><dd class="num">${money(G.budget)}</dd></div>
        </dl>
        <p class="eyebrow">What the client cares about</p>
        <ul class="weights">
          ${order
            .map(
              ([k, v]) => `<li><span class="w-name">${meterNames[k]}</span><span class="w-bar"><span style="width:${v * 2.5}%"></span></span><span class="w-val num">${v}%</span></li>`
            )
            .join("")}
        </ul>
        <button class="btn primary big" data-go="design">Start designing</button>
      </div>
    </section>`;
  }

  // ---------- design ----------
  function ratingStrip(r) {
    return `<ul class="ratings">${Object.keys(G.hazards)
      .map(
        (h) => `<li><span class="r-name">${G.hazards[h].label}</span><span class="r-track">${Array.from({ length: 10 }, (_, i) => `<i class="${i < r[h] ? "on" : ""}"></i>`).join("")}</span><span class="r-val num">${r[h]}</span></li>`
      )
      .join("")}</ul>`;
  }

  function designScreen() {
    const ch = state.choices;
    const c = S.costs(ch);
    const r = S.ratings(ch);
    const over = c.planned > G.budget;
    const cards = G.decisions
      .map((d) => {
        const opts = d.options
          .map((o) => {
            const multi = d.type === "multi";
            const checked = multi ? (ch[d.id] || []).includes(o.id) : ch[d.id] === o.id;
            const inputId = `${d.id}-${o.id}`;
            return `<label class="opt${checked ? " checked" : ""}" for="${inputId}">
              <input id="${inputId}" type="${multi ? "checkbox" : "radio"}" name="${d.id}" value="${o.id}" ${checked ? "checked" : ""} data-pick="${d.id}">
              <span class="opt-head"><span class="opt-name">${esc(o.name)}</span><span class="opt-cost num">${o.cost ? "+" + money(o.cost) : d.id === "contingency" ? "held back" : "$0"}</span></span>
              <span class="opt-tags">${optionTags(o).map((t) => `<span>${esc(t)}</span>`).join("")}</span>
            </label>`;
          })
          .join("");
        return `<fieldset class="card"><legend>${esc(d.title)}</legend><p class="help">${esc(d.help)}</p><div class="opts">${opts}</div></fieldset>`;
      })
      .join("");

    return `
    <section class="design">
      <aside class="preview">
        <div class="drawing">${window.drawBuilding(ch)}</div>
        <div class="preview-cols">
          <div>
            <p class="eyebrow">Hazard ratings (0-10)</p>
            ${ratingStrip(r)}
          </div>
          <div>
            <p class="eyebrow">At a glance</p>
            <dl class="mini">
              <div><dt>Energy per year</dt><dd class="num">${money(S.energy(ch))}</dd></div>
              <div><dt>People points</dt><dd class="num">+${S.bonusSum(ch, "people")}</dd></div>
              <div><dt>Planet points</dt><dd class="num">${S.bonusSum(ch, "planet") >= 0 ? "+" : ""}${S.bonusSum(ch, "planet")}</dd></div>
              <div><dt>Construction</dt><dd class="num">${money(c.construction)}</dd></div>
              <div><dt>Design fees</dt><dd class="num">${money(c.fees)}</dd></div>
              <div><dt>Contingency</dt><dd class="num">${money(c.contingency)}</dd></div>
            </dl>
          </div>
        </div>
      </aside>
      <div class="decisions">
        <div class="quickstart">
          <span class="label">Quick start</span>
          <button class="btn chip" data-preset="bargain">${G.presets.bargain.label}</button>
          <button class="btn chip" data-preset="longgame">${G.presets.longgame.label}</button>
          <button class="btn chip ghost" data-preset="reset">Reset</button>
          <span class="weather-mode">
            <span class="label">Weather</span>
            <button class="btn chip${state.mode === "demo" ? " on" : ""}" data-mode="demo" aria-pressed="${state.mode === "demo"}">Demo year</button>
            <button class="btn chip${state.mode === "random" ? " on" : ""}" data-mode="random" aria-pressed="${state.mode === "random"}">Random year</button>
          </span>
        </div>
        ${cards}
      </div>
      <div class="buildbar${over ? " over" : ""}">
        <div class="bb-text">
          <span class="num big">${millions(c.planned)}</span>
          <span>${over ? `Over budget by <strong class="num">${money(-c.left)}</strong>. Cut something to build.` : `Under budget by <strong class="num">${money(c.left)}</strong>.`}</span>
        </div>
        <button class="btn primary big" data-action="build" ${over ? "disabled" : ""}>Build it and face the weather</button>
      </div>
    </section>`;
  }

  // ---------- year ----------
  function stageFx(run, stage) {
    if (stage === 0) return { assemble: true, crack: run.soilsHit };
    const fx = { crack: run.soilsHit };
    const s = run.seasons[stage - 1];
    s.events.forEach((e) => {
      fx[e.hazard] = { intensity: e.intensity, over: e.over };
      if (e.days >= 1) fx.closed = true;
    });
    return fx;
  }

  function eventCard(e) {
    const hit = e.over > 0;
    return `<div class="event${hit ? " hit" : " ok"}">
      <div class="ev-head"><span class="ev-name">${esc(e.name)}</span><span class="ev-hz">${G.hazards[e.hazard].label}</span></div>
      <div class="gauge" aria-label="Intensity ${e.intensity} against rating ${e.rating}">
        <span class="g-rating" style="width:${e.rating * 10}%"></span>
        <span class="g-storm" style="left:${e.intensity * 10}%"></span>
      </div>
      <div class="gauge-key"><span>Your rating <strong class="num">${e.rating}</strong></span><span>Storm <strong class="num">${e.intensity}</strong></span></div>
      <p class="ev-out">${hit ? `${e.over} over your rating: <strong class="num">${money(e.repair)}</strong> in repairs${e.days ? `, closed <strong class="num">${e.days}</strong> days` : ""}.` : "No damage. The building held."}</p>
    </div>`;
  }

  function yearScreen() {
    const run = state.run;
    const st = state.stage;
    const labels = ["Construction", ...G.seasons];
    let panel;
    if (st === 0) {
      const lines = [];
      lines.push(`<p>The crew builds your design: <strong class="num">${money(run.costs.construction)}</strong> of construction plus <strong class="num">${money(run.costs.fees)}</strong> in design fees.</p>`);
      if (run.soilsHit) {
        lines.push(`<div class="event hit"><div class="ev-head"><span class="ev-name">Soft soil under the north wall</span><span class="ev-hz">Surprise</span></div>
          <p class="ev-out">You skipped the soils report. Fixing the foundation cost <strong class="num">${money(run.surprise)}</strong>. Contingency covered <strong class="num">${money(run.fromContingency)}</strong>${run.overContingency ? `; <strong class="num">${money(run.overContingency)}</strong> came out of your budget` : ""}.</p></div>`);
      } else if (run.choices.soils === "skip") {
        lines.push(`<div class="event ok"><p class="ev-out">You skipped the soils report and got lucky this time.</p></div>`);
      } else {
        lines.push(`<div class="event ok"><p class="ev-out">The soils report matched the foundation to the ground. No surprises.</p></div>`);
      }
      lines.push(`<p class="muted">Unused contingency goes back into your budget.</p>`);
      panel = lines.join("");
    } else {
      const s = run.seasons[st - 1];
      panel = s.events.length ? s.events.map(eventCard).join("") : `<div class="event ok"><p class="ev-out">A calm ${s.season.toLowerCase()}. The library is busy and dry.</p></div>`;
    }
    const nextLabel = st < 4 ? `Next: ${labels[st + 1]}` : "See the results";
    return `
    <section class="year">
      <div class="year-stage">
        <ol class="timeline">${labels.map((l, i) => `<li class="${i < st ? "done" : i === st ? "now" : ""}">${l}</li>`).join("")}</ol>
        <div class="drawing big">${window.drawBuilding(run.choices, stageFx(run, st))}</div>
      </div>
      <div class="year-panel">
        <p class="eyebrow">${state.mode === "demo" ? "Demo year" : `Random year #${state.seed}`}</p>
        <h2>${labels[st]}</h2>
        ${panel}
        <div class="year-actions">
          <button class="btn primary big" data-action="next">${nextLabel}</button>
          ${st < 4 ? `<button class="btn ghost" data-action="skip">Skip to results</button>` : ""}
        </div>
      </div>
    </section>`;
  }

  // ---------- results ----------
  function resultsScreen() {
    const run = state.run;
    const prev = state.history.length > 1 ? state.history[state.history.length - 2] : null;
    let lesson;
    if (run.lesson) {
      const e = run.lesson.event, f = run.lesson.fix;
      lesson = `The ${esc(e.name.toLowerCase())} hit ${G.hazards[e.hazard].label.toLowerCase()} ${e.intensity} against your rating of ${e.rating}. It cost <strong class="num">${money(e.repair)}</strong>${e.days ? ` and closed the library <strong class="num">${e.days}</strong> days` : ""}.`;
      if (f) lesson += ` ${esc(f.option.name)} (${f.extra > 0 ? "+" + money(f.extra) : "no extra cost"}) would have handled it.`;
    } else {
      lesson = "Your building rode out every storm. Next challenge: keep that record and spend less.";
    }
    const meterRows = Object.keys(meterNames)
      .map(
        (k) => `<li>
        <div class="m-head"><span class="m-name">${meterNames[k]}</span><span class="m-help">${meterHelp[k]}</span><span class="m-w num">weight ${G.weights[k]}%</span></div>
        <div class="m-row"><span class="m-bar"><span style="width:${run.meters[k]}%"></span></span><span class="m-val num">${run.meters[k]}</span>${stars(run.meters[k])}</div>
      </li>`
      )
      .join("");
    const compare = prev
      ? `<div class="compare">
          <p class="eyebrow">This run against your last one</p>
          <div class="table-wrap"><table>
            <thead><tr><th></th><th>Last run</th><th>This run</th></tr></thead>
            <tbody>
              <tr><th>Score</th><td class="num">${prev.score}</td><td class="num strong">${run.score}</td></tr>
              ${Object.keys(meterNames).map((k) => `<tr><th>${meterNames[k]}</th><td class="num">${prev.meters[k]}</td><td class="num">${run.meters[k]}</td></tr>`).join("")}
              <tr><th>Spent to build</th><td class="num">${money(prev.spent)}</td><td class="num">${money(run.spent)}</td></tr>
              <tr><th>Repairs</th><td class="num">${money(prev.repairs)}</td><td class="num">${money(run.repairs)}</td></tr>
              <tr><th>Days closed</th><td class="num">${prev.closedDays}</td><td class="num">${run.closedDays}</td></tr>
            </tbody>
          </table></div>
        </div>`
      : "";
    return `
    <section class="results">
      <div class="score-card">
        <p class="eyebrow">Final score</p>
        <div class="score num">${run.score}<span>/100</span></div>
        <blockquote class="quote small">${esc(run.review)}</blockquote>
        <p class="attrib"><strong>${esc(G.scenario.client.name)}</strong>, ${esc(G.scenario.client.role)}</p>
        <p class="lesson"><span class="tag">The lesson</span> ${lesson}</p>
        <div class="result-actions">
          <button class="btn primary big" data-action="redesign">Redesign, same weather</button>
          <button class="btn" data-action="newweather">Try a random year</button>
        </div>
      </div>
      <div class="result-detail">
        <ul class="meters">${meterRows}</ul>
        <dl class="money">
          <div><dt>Spent to build</dt><dd class="num">${money(run.spent)}</dd></div>
          <div><dt>Repairs</dt><dd class="num">${money(run.repairs)}</dd></div>
          <div><dt>Energy, year one</dt><dd class="num">${money(run.energyCost)}</dd></div>
          <div class="total"><dt>Left of ${millions(G.budget)}</dt><dd class="num">${money(run.left)}</dd></div>
        </dl>
        ${compare}
      </div>
    </section>`;
  }

  // ---------- render + events ----------
  function render() {
    const screens = { brief: briefScreen, design: designScreen, year: yearScreen, results: resultsScreen };
    app.innerHTML = header() + `<main id="main">${screens[state.screen]()}</main>`;
  }

  function go(screen) {
    state.screen = screen;
    render();
    window.scrollTo({ top: 0 });
  }

  app.addEventListener("click", (ev) => {
    const t = ev.target.closest("[data-go],[data-preset],[data-mode],[data-action]");
    if (!t || t.disabled) return;
    if (t.dataset.go) return go(t.dataset.go);
    if (t.dataset.preset) {
      state.choices = JSON.parse(JSON.stringify(t.dataset.preset === "reset" ? G.defaultChoices : G.presets[t.dataset.preset].choices));
      return render();
    }
    if (t.dataset.mode) {
      state.mode = t.dataset.mode;
      if (state.mode === "random") state.seed = Math.floor(Math.random() * 9000) + 1000;
      return render();
    }
    const a = t.dataset.action;
    if (a === "build") {
      state.run = S.simulate(state.choices, state.mode, state.seed);
      state.history.push(state.run);
      state.stage = 0;
      return go("year");
    }
    if (a === "next") {
      if (state.stage < 4) { state.stage++; return render(); }
      return go("results");
    }
    if (a === "skip") { state.stage = 4; return go("results"); }
    if (a === "redesign") return go("design");
    if (a === "newweather") {
      state.mode = "random";
      state.seed = Math.floor(Math.random() * 9000) + 1000;
      return go("design");
    }
  });

  app.addEventListener("change", (ev) => {
    const el = ev.target;
    if (!el.dataset.pick) return;
    const d = S.decision(el.dataset.pick);
    if (d.type === "multi") {
      const set = new Set(state.choices[d.id] || []);
      el.checked ? set.add(el.value) : set.delete(el.value);
      state.choices[d.id] = [...set];
    } else {
      state.choices[d.id] = el.value;
    }
    const y = window.scrollY;
    render();
    window.scrollTo({ top: y });
    const again = document.getElementById(el.id);
    if (again) again.focus({ preventScroll: true });
  });

  render();
})();
