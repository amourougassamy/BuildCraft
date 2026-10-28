// ============================================================
// ui.js — OWNED BY SQUAD 4 (UI and UX), wired by SQUAD 1
// Screens: intro -> build -> opening -> year -> results.
// render() redraws from `state`; one click handler routes actions.
// ============================================================

(function () {
  const G = window.GAME, S = window.SIM, A = window.ART, FX = window.FX;
  const app = document.getElementById("app");
  const clone = (o) => JSON.parse(JSON.stringify(o));

  const store = {
    get(k, d) { try { const v = localStorage.getItem("buildcraft." + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("buildcraft." + k, JSON.stringify(v)); } catch (e) { /* storage is optional */ } },
  };

  const state = {
    screen: "intro",
    introStep: 0,
    choices: clone(G.defaultChoices),
    mode: "demo",
    seed: 2026,
    run: null,
    lastRun: null,
    season: 0,          // 1-4 during the year
    phase: "incoming",  // incoming | reveal
    ribbonCut: false,
    gentle: store.get("gentle", false),
    muted: store.get("muted", false),
    best: store.get("best", 0),
    tip: "Tap a card to pick each piece. Watch your coin jar!",
    newRecord: false,
  };
  FX.setMuted(state.muted);

  const coins = (n) => Math.round(n).toLocaleString("en-US");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const castBy = (id) => G.cast.find((c) => c.id === id);
  const tierNames = (n) => (n === 3 ? ["Good", "Better", "Best"] : ["Good", "Best"]);
  const optionName = (key) => { const [d, o] = key.split(":"); return S.option(d, o).name; };

  // ---------- shared pieces ----------
  function topbar() {
    const steps = [["intro", "Meet"], ["build", "Build"], ["opening", "Open"], ["year", "Storms"], ["results", "Stars"]];
    const at = steps.findIndex((s) => s[0] === state.screen);
    return `<header class="topbar">
      <div class="logo">Build<span>Craft</span></div>
      <ol class="steps" aria-label="Progress">${steps.map((s, i) => `<li class="${i < at ? "done" : i === at ? "now" : ""}">${s[1]}</li>`).join("")}</ol>
      <div class="toggles">
        <button class="toggle" data-act="sound" aria-pressed="${!state.muted}">${state.muted ? "Sound off" : "Sound on"}</button>
        <button class="toggle" data-act="gentle" aria-pressed="${state.gentle}" title="Swap ghosts for a trip to the hospital">Gentle mode ${state.gentle ? "on" : "off"}</button>
      </div>
    </header>`;
  }

  function bubble(who, text, cls) {
    const face = who === "rivet" ? A.rivet() : A.person(castBy(who) || castBy("rosa"), "happy", false);
    return `<div class="bubble-row ${cls || ""}"><div class="avatar">${face}</div><p class="bubble">${text}</p></div>`;
  }

  function jar(left, cracked) {
    const pct = Math.max(0, Math.min(100, (left / G.budget) * 100 * 4)); // zoomed: the last quarter of the budget fills the jar
    return `<div class="jar ${cracked ? "cracked" : ""}">
      <svg viewBox="0 0 80 96" aria-hidden="true">
        <defs><clipPath id="jarclip"><path d="M14 22 h52 v62 a10 10 0 0 1 -10 10 h-32 a10 10 0 0 1 -10 -10z"/></clipPath></defs>
        <rect x="18" y="6" width="44" height="14" rx="5" fill="#c98d55" stroke="#22315a" stroke-width="3"/>
        <g clip-path="url(#jarclip)"><rect x="10" y="${94 - (pct / 100) * 72}" width="60" height="80" fill="#ffd23f"/>
        <circle cx="28" cy="${90 - (pct / 100) * 60}" r="6" fill="#ffe680" stroke="#b8860b" stroke-width="2" opacity="${pct > 10 ? 1 : 0}"/><circle cx="50" cy="${86 - (pct / 100) * 50}" r="6" fill="#ffe680" stroke="#b8860b" stroke-width="2" opacity="${pct > 25 ? 1 : 0}"/></g>
        <path d="M14 22 h52 v62 a10 10 0 0 1 -10 10 h-32 a10 10 0 0 1 -10 -10z" fill="#bfe8ff" fill-opacity=".35" stroke="#22315a" stroke-width="3"/>
        ${cracked ? `<path d="M40 24 l-6 14 l8 8 l-8 14 l6 10" fill="none" stroke="#ff4d5e" stroke-width="3" stroke-linecap="round"/>` : ""}
      </svg>
      <div class="jar-text"><span class="jar-label">${cracked ? "Over by" : "Coins left"}</span><span class="jar-num">${coins(Math.abs(left))}</span></div>
    </div>`;
  }

  function castStrip(moods, big) {
    return `<ul class="cast ${big ? "big" : ""}">${G.cast.map((c) => {
      const m = moods[c.id] || "happy";
      return `<li class="${m}" data-cast="${c.id}"><div class="portrait-wrap">${A.person(c, m, state.gentle)}</div><span class="cast-name">${esc(c.name)}</span></li>`;
    }).join("")}</ul>`;
  }

  // ---------- intro ----------
  function introScreen() {
    const lines = G.scenario.intro.slice(0, state.introStep + 1);
    const done = state.introStep >= G.scenario.intro.length - 1;
    const preview = clone(G.presets.longgame.choices);
    return `<section class="intro">
      <div class="panel hero">
        <h1>Build a library.<br>Survive a year of wild weather.</h1>
        <div class="stage">${A.building(preview, { moods: S.startMoods(preview) })}</div>
      </div>
      <div class="panel talk">
        <div class="bubbles">${lines.map((l, i) => bubble(l.who, esc(l.text), i === lines.length - 1 ? "fresh" : "")).join("")}</div>
        ${done ? `
          <h2>Meet your regulars</h2>
          <ul class="meet">${G.cast.map((c) => `<li><div class="portrait-wrap">${A.person(c, "happy")}</div><div><strong>${esc(c.name)}</strong> <span class="tag">${esc(c.tag)}</span><p>${esc(c.line)}. Loves: ${c.loves.map(optionName).map(esc).join(", ")}.</p></div></li>`).join("")}</ul>
          <button class="btn big go" data-act="tobuild">Let's build!</button>`
        : `<button class="btn big" data-act="intronext">Next</button>`}
      </div>
    </section>`;
  }

  // ---------- build ----------
  function card(d, o, idx) {
    const multi = d.type === "multi";
    const on = multi ? (state.choices[d.id] || []).includes(o.id) : state.choices[d.id] === o.id;
    const tier = d.id === "soils" ? "" : multi ? "Add-on" : tierNames(d.options.length)[idx];
    const powers = o.ratings ? Object.entries(o.ratings).map(([h, v]) => `<span class="power"><span class="p-name">${G.hazards[h].power}</span><span class="p-bar"><i style="width:${v * 10}%"></i></span><b>${v}</b></span>`).join("") : "";
    const fans = G.cast.filter((c) => c.loves.includes(`${d.id}:${o.id}`));
    return `<button class="card ${on ? "on" : ""}" data-pick="${d.id}" data-opt="${o.id}" aria-pressed="${on}">
      ${tier ? `<span class="tier tier-${tier.toLowerCase().replace("-", "")}">${tier}</span>` : ""}
      ${A.icon(d.id, o.id)}
      <span class="card-name">${esc(o.name)}</span>
      <span class="card-cost">${o.cost ? coins(o.cost) + " coins" : "Free"}</span>
      ${powers}
      ${fans.length ? `<span class="fans">${fans.map((c) => `<span class="fan" title="${esc(c.name)} loves this">${A.person(c, "happy")}</span>`).join("")}</span>` : ""}
      ${on ? `<span class="check" aria-hidden="true">&#10003;</span>` : ""}
    </button>`;
  }

  function buildScreen() {
    const c = S.costs(state.choices);
    const over = c.coinsLeft < 0;
    const moods = S.startMoods(state.choices);
    return `<section class="build">
      <div class="left">
        <div class="panel stagebox">
          <div class="stage">${A.building(state.choices, { moods, gentle: state.gentle })}</div>
          <div class="under-stage">
            ${jar(c.coinsLeft, over)}
            <div class="rivet-tip">${bubble("rivet", esc(state.tip), "small")}</div>
          </div>
          ${castStrip(moods)}
          <div class="shortcuts"><span>Demo shortcuts:</span>
            <button class="link" data-preset="bargain">${G.presets.bargain.label}</button>
            <button class="link" data-preset="longgame">${G.presets.longgame.label}</button>
            <button class="link" data-act="weather">${state.mode === "demo" ? "Storms: demo year" : "Storms: surprise #" + state.seed}</button>
          </div>
        </div>
      </div>
      <div class="right">
        ${G.decisions.map((d) => `<section class="part"><h2>${esc(d.title)}${d.type === "multi" ? ` <span class="hint">pick any</span>` : ""}</h2><div class="cards">${d.options.map((o, i) => card(d, o, i)).join("")}</div></section>`).join("")}
      </div>
      <div class="buildbar ${over ? "over" : ""}">
        <p>${over ? "Whoa, you spent too many coins! Swap something for a cheaper card." : `Ready? You'll have <b>${coins(c.coinsLeft)}</b> coins left.`}</p>
        <button class="btn big go" data-act="build" ${over ? "disabled" : ""}>Build it!</button>
      </div>
    </section>`;
  }

  // ---------- grand opening ----------
  function openingScreen() {
    const run = state.run;
    const ribbon = state.ribbonCut ? "" : `<div class="ribbon" aria-hidden="true"><span></span><b></b></div>`;
    let talk;
    if (!state.ribbonCut) {
      const mud = run.soilsHit
        ? bubble("rivet", `Uh oh! The crew found squishy mud under one wall. Fixing it cost <b>${coins(run.surprise)}</b> coins.${run.rainyUsed ? ` Your rainy-day coins paid for <b>${coins(run.rainyUsed)}</b> of it.` : ""}`)
        : bubble("rivet", run.choices.soils === "test" ? "The dirt test paid off: solid ground, no surprises!" : "You skipped the dirt test... and got lucky. Phew!");
      talk = `${bubble("rivet", "Hammers, cranes, beeping trucks... your library is going up!")}${mud}<button class="btn big go" data-act="ribbon">Cut the ribbon!</button>`;
    } else {
      const happy = G.cast.filter((c) => run.startingMoods[c.id] === "happy").length;
      talk = `<h2 class="banner">Grand opening!</h2>
        ${bubble("rosa", happy === 6 ? "Everyone LOVES it! Look at those smiles!" : happy >= 3 ? `${happy} of our regulars are smiling. Not bad!` : "Hmm. Some of our regulars look a little grumpy...")}
        ${castStrip(run.startingMoods)}
        <button class="btn big go" data-act="startyear">Bring on the weather!</button>`;
    }
    return `<section class="opening">
      <div class="panel stagebox"><div class="stage ${state.ribbonCut ? "" : "assembling"}">${A.building(run.choices, { moods: run.startingMoods, empty: !state.ribbonCut, gentle: state.gentle, fx: { crack: run.soilsHit } })}${ribbon}</div></div>
      <div class="panel talk">${talk}</div>
    </section>`;
  }

  // ---------- storm year ----------
  function seasonFx(s, reveal) {
    const fx = { crack: state.run.soilsHit };
    if (!s.events.length) return fx;
    if (!reveal) { fx.storm = true; s.events.forEach((e) => (fx[e.hazard] = { intensity: e.intensity, over: 0 })); return fx; }
    s.events.forEach((e) => { fx[e.hazard] = { intensity: e.intensity, over: e.over }; if (e.days >= 1) fx.closed = true; });
    return fx;
  }

  function prevMoods(i) { return i <= 1 ? state.run.startingMoods : state.run.seasons[i - 2].moods; }

  function eventResult(e) {
    const hz = G.hazards[e.hazard];
    if (e.over === 0) {
      return `<div class="result good"><h3>Nailed it!</h3><p>Your ${hz.power.toLowerCase()} is <b>${e.rating}</b>. This ${esc(e.name.toLowerCase())} was a <b>${e.intensity}</b>. The storm cloud shakes its fist and drifts away.</p></div>`;
    }
    const ghosts = e.changes.filter((c) => c.to === "ghost").map((c) => castBy(c.id));
    const sad = e.changes.filter((c) => c.to === "sad").map((c) => castBy(c.id).name);
    let who = "";
    ghosts.forEach((g) => {
      who += state.gentle
        ? `<p class="who-line">Ouch! <b>${esc(g.name)}</b> got hurt and is off to the hospital.</p>`
        : `<p class="who-line ghost-line"><b>${esc(g.name)}</b> didn't make it and floats away as a ghost.</p>`;
    });
    if (sad.length) who += `<p class="who-line">${sad.map(esc).join(" and ")} ${sad.length > 1 ? "are" : "is"} sad now.</p>`;
    const engineer = e.crash && hz.deadly ? `<p class="why">Real engineers design buildings so this never happens. That's their whole job!</p>` : "";
    const fix = e.fix ? `<p class="fix">Next time, try <b>${e.fix.names.map(esc).join(" + ")}</b> (${e.fix.extra > 0 ? "+" + coins(e.fix.extra) + " coins" : "same coins"}).</p>` : "";
    return `<div class="result bad"><h3>${esc(e.crash ? hz.crash : hz.hurt)}</h3>
      <p>Your ${hz.power.toLowerCase()} is <b>${e.rating}</b>. This ${esc(e.name.toLowerCase())} was a <b>${e.intensity}</b>. Repairs cost <b>${coins(e.repair)}</b> coins${e.days ? ` and the library closed for <b>${e.days}</b> days` : ""}.</p>
      ${who}${engineer}${fix}</div>`;
  }

  function streak(i) {
    let n = 0;
    for (let k = i - 1; k >= 0; k--) { if (state.run.seasons[k].events.every((e) => e.over === 0)) n++; else break; }
    return n;
  }

  function yearScreen() {
    const run = state.run, i = state.season, s = run.seasons[i - 1];
    const reveal = state.phase === "reveal" || !s.events.length;
    const moods = reveal ? s.moods : prevMoods(i);
    let panel;
    if (!s.events.length) {
      const n = streak(i);
      panel = `<div class="result good"><h3>A calm ${s.season.toLowerCase()}!</h3><p>${esc(G.calm[s.season])}</p></div>${n >= 2 ? `<p class="streak">${n} seasons in a row with no damage!</p>` : ""}`;
    } else if (!reveal) {
      panel = s.events.map((e) => `<div class="incoming"><h3>${esc(e.name)}!</h3><p>${esc(e.intro)} Strength <b>${e.intensity}</b> out of 10.</p></div>`).join("") + `<button class="btn big danger" data-act="brace">Brace for it!</button>`;
    } else {
      const n = streak(i);
      panel = s.events.map(eventResult).join("") + (n >= 2 ? `<p class="streak">${n} seasons in a row with no damage!</p>` : "");
    }
    const nextBtn = reveal ? `<button class="btn big go" data-act="nextseason">${i < 4 ? `On to ${run.seasons[i].season}` : "See how you did!"}</button>` : "";
    return `<section class="year">
      <div class="panel stagebox">
        <ol class="seasons">${G.seasons.map((n, k) => `<li class="${k + 1 < i ? "done" : k + 1 === i ? "now" : ""}">${n}</li>`).join("")}</ol>
        <div class="stage ${reveal ? "" : "shake"}">${A.building(run.choices, { moods, gentle: state.gentle, fx: seasonFx(s, reveal) })}</div>
        ${castStrip(moods)}
      </div>
      <div class="panel talk">
        <p class="eyebrow">${s.season}</p>
        ${panel}
        ${nextBtn}
      </div>
    </section>`;
  }

  // ---------- results ----------
  function finalLine(c, mood) {
    if (mood === "ghost") return state.gentle ? "Ouch! Build me a stronger library next time?" : "Boooo... build it stronger next time and I'll be back!";
    if (mood === "sad") return state.run.closedDays > 0 && c.closed ? c.closed : c.sad;
    return c.happy;
  }

  function resultsScreen() {
    const run = state.run;
    const titles = { 3: "Amazing builder!", 2: "Nice work!", 1: "Uh-oh..." };
    const worst = run.worst;
    const lesson = worst
      ? `The ${esc(worst.name.toLowerCase())} was a ${worst.intensity}, and your ${G.hazards[worst.hazard].power.toLowerCase()} was ${worst.rating}.${worst.fix ? ` <b>${worst.fix.names.map(esc).join(" + ")}</b> would have handled it.` : ""}`
      : "Your library rode out every storm. Can you do it again with more coins left over?";
    return `<section class="results">
      <div class="panel score">
        <p class="eyebrow">Your result</p>
        <div class="stars" aria-label="${run.stars} out of 3 stars">${[1, 2, 3].map((n) => `<span class="star ${n <= run.stars ? "on" : ""}" style="--n:${n}">&#9733;</span>`).join("")}</div>
        <h1>${titles[run.stars]}</h1>
        ${state.newRecord ? `<p class="record">New record!${state.lastRun ? ` <s>${state.lastRun.stars} star${state.lastRun.stars === 1 ? "" : "s"}</s>` : ""}</p>` : ""}
        ${bubble("rosa", esc(run.review))}
        <p class="lesson"><span class="tag">Lesson</span> ${lesson}</p>
        ${run.ghosts.length && !state.gentle ? `<p class="cap">Ghosts mean 2 stars max. Keep everyone safe for 3!</p>` : ""}
        <div class="actions">
          <button class="btn big go" data-act="again">Play again (same storms)</button>
          <button class="btn" data-act="surprise">Surprise weather!</button>
        </div>
      </div>
      <div class="panel lineup-panel">
        <h2>How your regulars feel</h2>
        <ul class="lineup">${G.cast.map((c) => {
          const m = run.moods[c.id];
          return `<li class="${m}"><p class="say">${esc(finalLine(c, m))}</p><div class="portrait-wrap">${A.person(c, m, state.gentle)}</div><span class="cast-name">${esc(c.name)}</span></li>`;
        }).join("")}</ul>
        <div class="money">
          ${jar(run.coinsLeft, run.coinsLeft < 0)}
          <div>
            <p>Repairs: <b>${coins(run.repairs)}</b> coins</p>
            <p>Energy bill: <b>${coins(run.energyCost)}</b> coins</p>
            ${run.rainyBack > 0 ? `<p class="back">Rainy-day coins you didn't need came back: <b>+${coins(run.rainyBack)}</b></p>` : ""}
          </div>
        </div>
        <h2>Badges</h2>
        <ul class="badges">${G.badges.map((b) => `<li class="${run.badges.includes(b.id) ? "got" : ""}"><span class="medal" aria-hidden="true"></span><strong>${esc(b.name)}</strong><span>${esc(b.how)}</span></li>`).join("")}</ul>
        <details class="grownups"><summary>For grown-ups: the numbers</summary>
          <table><tbody>
            <tr><th>Score</th><td>${run.score} / 100</td></tr>
            ${Object.entries(run.meters).map(([k, v]) => `<tr><th>${k[0].toUpperCase() + k.slice(1)} (weight ${G.weights[k]}%)</th><td>${v}</td></tr>`).join("")}
            <tr><th>Spent to build</th><td>$${coins(run.spent)}</td></tr>
            <tr><th>Repairs</th><td>$${coins(run.repairs)}</td></tr>
            <tr><th>Days closed</th><td>${run.closedDays}</td></tr>
          </tbody></table>
        </details>
      </div>
    </section>`;
  }

  // ---------- render ----------
  function render() {
    const screens = { intro: introScreen, build: buildScreen, opening: openingScreen, year: yearScreen, results: resultsScreen };
    app.innerHTML = topbar() + `<main>${screens[state.screen]()}</main>`;
  }
  function go(screen) { FX.clear(); state.screen = screen; render(); window.scrollTo({ top: 0 }); }
  function centerOf(el) { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }
  function pulse(selector) { const el = app.querySelector(selector); if (el) { el.classList.remove("pop"); void el.getBoundingClientRect(); el.classList.add("pop"); } }

  const pieceFor = { site: "foundation", soils: "foundation", frame: "frame", walls: "frame", roof: "roof", windows: "windows", hvac: "extras", extras: "extras" };

  function pick(dId, oId, btn) {
    const d = S.decision(dId), o = S.option(dId, oId);
    const before = S.startMoods(state.choices);
    const at = btn ? centerOf(btn) : null;
    if (d.type === "multi") {
      const set = new Set(state.choices[dId] || []);
      set.has(oId) ? set.delete(oId) : set.add(oId);
      state.choices[dId] = [...set];
    } else {
      state.choices[dId] = oId;
    }
    const added = d.type === "multi" ? state.choices[dId].includes(oId) : true;
    const isBest = d.type !== "multi" && d.id !== "soils" && d.options.indexOf(o) === d.options.length - 1;
    state.tip = added ? o.kid : `Took off the ${o.name.toLowerCase()}.`;
    const after = S.startMoods(state.choices);
    const cheered = G.cast.filter((c) => before[c.id] !== "happy" && after[c.id] === "happy");
    if (cheered.length) state.tip = `${cheered.map((c) => c.name).join(" and ")} ${cheered.length > 1 ? "love" : "loves"} it! ${o.kid}`;
    const y = window.scrollY;
    render();
    window.scrollTo({ top: y });
    pulse(`[data-piece="${pieceFor[dId]}"]`);
    cheered.forEach((c) => pulse(`.cast [data-cast="${c.id}"]`));
    if (at && added) FX.burst(at[0], at[1], isBest);
    FX.sound(added ? (isBest ? "ding" : "pop") : "pop");
    if (S.costs(state.choices).coinsLeft < 0) pulse(".jar");
  }

  app.addEventListener("click", (ev) => {
    const t = ev.target.closest("[data-act],[data-pick],[data-preset]");
    if (!t || t.disabled) return;
    if (t.dataset.pick) return pick(t.dataset.pick, t.dataset.opt, t);
    if (t.dataset.preset) {
      state.choices = clone(G.presets[t.dataset.preset].choices);
      state.tip = `Loaded "${G.presets[t.dataset.preset].label}". Change anything you like!`;
      FX.sound("pop");
      return render();
    }
    const a = t.dataset.act;
    if (a === "sound") { state.muted = !state.muted; FX.setMuted(state.muted); store.set("muted", state.muted); if (!state.muted) FX.sound("pop"); return render(); }
    if (a === "gentle") { state.gentle = !state.gentle; store.set("gentle", state.gentle); return render(); }
    if (a === "intronext") { state.introStep++; FX.sound("pop"); return render(); }
    if (a === "tobuild") { FX.sound("ding"); return go("build"); }
    if (a === "weather") {
      state.mode = state.mode === "demo" ? "random" : "demo";
      if (state.mode === "random") state.seed = 1000 + Math.floor(Math.random() * 9000);
      return render();
    }
    if (a === "build") {
      state.run = S.simulate(state.choices, state.mode, state.seed);
      state.ribbonCut = false;
      FX.sound("kaching");
      FX.coins(36);
      return go("opening");
    }
    if (a === "ribbon") { state.ribbonCut = true; FX.sound("cheer"); FX.confetti(180); return render(); }
    if (a === "startyear") { state.season = 1; state.phase = "incoming"; enterSeason(); return go("year"); }
    if (a === "brace") { reveal(); return; }
    if (a === "nextseason") {
      if (state.season < 4) { state.season++; state.phase = "incoming"; enterSeason(); return go("year"); }
      return finish();
    }
    if (a === "again") {
      state.choices = clone(state.run.choices);
      state.tip = state.run.ghosts.length ? "Good news: everyone's back! Can you keep them all safe this time?" : "Same storms again. Can you keep the stars AND save more coins?";
      return go("build");
    }
    if (a === "surprise") {
      state.mode = "random";
      state.seed = 1000 + Math.floor(Math.random() * 9000);
      state.choices = clone(state.run.choices);
      state.tip = "Surprise weather! Nobody knows what's coming...";
      return go("build");
    }
  });

  function enterSeason() {
    const s = state.run.seasons[state.season - 1];
    if (s.events.length) setTimeout(() => FX.sound("thunder"), 150);
    else setTimeout(() => FX.sound("ding"), 150);
  }

  function reveal() {
    state.phase = "reveal";
    render();
    const s = state.run.seasons[state.season - 1];
    const hit = s.events.some((e) => e.over > 0);
    const ghost = s.events.some((e) => e.changes.some((c) => c.to === "ghost"));
    if (!hit) { FX.sound("cheer"); FX.confetti(70); }
    else if (ghost && !state.gentle) { FX.sound("boo"); setTimeout(() => FX.sound("sad"), 700); }
    else FX.sound("sad");
  }

  function finish() {
    const run = state.run;
    state.newRecord = run.score > state.best && state.best > 0;
    if (run.score > state.best) { state.best = run.score; store.set("best", run.score); }
    go("results");
    if (run.stars === 3) { FX.sound("win"); FX.fireworks(2600); FX.confetti(120); }
    else if (run.stars === 2) { FX.sound("cheer"); FX.confetti(80); }
    else FX.sound("sad");
    state.lastRun = run;
  }

  render();
})();
