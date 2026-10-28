// ============================================================
// art.js — OWNED BY SQUAD 5 (Art and animation)
// ART.building(choices, opts)  -> SVG string of the cutaway "dollhouse"
//   opts = { moods, gentle, fx: { snow|flood|hail|wind|cold|heat: {intensity, over}, storm, crack, closed } }
// ART.person(cast, mood, size, gentle) -> SVG string of one character
// ART.icon(decisionId, optionId)      -> SVG string for a picture card
// ART.rivet(size)                     -> SVG string of Rivet the beaver
// Colors are set here on purpose: this game commits to one bright look.
// ============================================================

(function () {
  const G = window.GAME;
  const INK = "#22315a";
  const OUT = `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;

  // ---------- characters ----------
  function face(cx, cy, mood) {
    const eyes = `<circle cx="${cx - 4}" cy="${cy - 1}" r="1.8" fill="${INK}"/><circle cx="${cx + 4}" cy="${cy - 1}" r="1.8" fill="${INK}"/>`;
    const mouth = mood === "happy"
      ? `<path d="M${cx - 5} ${cy + 3} q5 5 10 0" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`
      : `<path d="M${cx - 4} ${cy + 6} q4 -4 8 0" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`;
    const cheeks = mood === "happy" ? `<circle cx="${cx - 7}" cy="${cy + 3}" r="2" fill="#ff8fa3" opacity=".7"/><circle cx="${cx + 7}" cy="${cy + 3}" r="2" fill="#ff8fa3" opacity=".7"/>` : "";
    return eyes + mouth + cheeks;
  }

  function moodBits(x, top, mood) {
    if (mood === "happy") {
      return `<g class="hearts"><path class="heart h1" d="M${x + 12} ${top + 4} c-3 -5 -9 -2 -5 3 l5 4 l5 -4 c4 -5 -2 -8 -5 -3z" fill="#ff5d7a"/><path class="heart h2" d="M${x - 14} ${top + 10} c-2 -4 -7 -2 -4 2 l4 3 l4 -3 c3 -4 -2 -6 -4 -2z" fill="#ff5d7a"/></g>`;
    }
    if (mood === "sad") {
      return `<g class="raincloud"><path d="M${x - 10} ${top - 4} a5 5 0 0 1 6 -6 a6 6 0 0 1 11 2 a4 4 0 0 1 3 7 h-18 a4 4 0 0 1 -2 -3z" fill="#9aa8c7" stroke="${INK}" stroke-width="1.5"/><line class="drop d1" x1="${x - 5}" y1="${top + 2}" x2="${x - 6}" y2="${top + 7}" stroke="#4a8fe0" stroke-width="2" stroke-linecap="round"/><line class="drop d2" x1="${x + 3}" y1="${top + 2}" x2="${x + 2}" y2="${top + 7}" stroke="#4a8fe0" stroke-width="2" stroke-linecap="round"/></g>`;
    }
    return "";
  }

  // A standing figure whose feet sit at (x, base). Returns SVG markup.
  function figure(c, x, base, mood) {
    if (c.cat) {
      const y = base - 10;
      return `<g class="who ${mood}">
        <path d="M${x + 12} ${y + 2} q14 -4 10 -16" fill="none" stroke="${c.color}" stroke-width="4" stroke-linecap="round"/>
        <ellipse cx="${x + 2}" cy="${y + 3}" rx="13" ry="8" fill="${c.color}" ${OUT}/>
        <path d="M${x - 16} ${y - 6} l3 -9 l5 6 l5 -6 l3 9 a9 9 0 1 1 -16 0z" fill="${c.color}" ${OUT}/>
        ${face(x - 8, y - 4, mood)}
        ${moodBits(x - 6, y - 26, mood)}
      </g>`;
    }
    const head = base - 44;
    return `<g class="who ${mood}">
      <rect x="${x - 11}" y="${base - 30}" width="22" height="28" rx="9" fill="${c.color}" ${OUT}/>
      <rect x="${x - 9}" y="${base - 4}" width="7" height="6" rx="2" fill="${INK}"/><rect x="${x + 2}" y="${base - 4}" width="7" height="6" rx="2" fill="${INK}"/>
      <circle cx="${x}" cy="${head}" r="12" fill="${c.skin}" ${OUT}/>
      <path d="M${x - 12} ${head - 2} a12 12 0 0 1 24 0 q-6 -6 -12 -5 q-6 -1 -12 5z" fill="${c.hair}"/>
      ${face(x, head + 1, mood)}
      ${moodBits(x, head - 26, mood)}
    </g>`;
  }

  function ghost(c, x, y, i) {
    return `<g class="ghost" style="--i:${i}">
      <ellipse cx="${x}" cy="${y - 24}" rx="11" ry="3.5" fill="none" stroke="#ffd23f" stroke-width="3"/>
      <path d="M${x - 15} ${y + 16} v-22 a15 15 0 0 1 30 0 v22 l-5 -5 l-5 5 l-5 -5 l-5 5 l-5 -5z" fill="#ffffff" fill-opacity=".9" ${OUT}/>
      <circle cx="${x - 5}" cy="${y - 4}" r="2.2" fill="${INK}"/><circle cx="${x + 5}" cy="${y - 4}" r="2.2" fill="${INK}"/>
      <ellipse cx="${x}" cy="${y + 4}" rx="3" ry="3.5" fill="${INK}"/>
      <path d="M${x + 15} ${y} q9 -6 6 -14" fill="none" ${OUT}/>
      <text x="${x}" y="${y + 32}" text-anchor="middle" class="ghost-name">${c.name}</text>
    </g>`;
  }

  function hurtMark(x, base) {
    return `<g class="hurt"><rect x="${x - 12}" y="${base - 26}" width="24" height="24" rx="5" fill="#ffffff" ${OUT}/><path d="M${x - 6} ${base - 14} h12 M${x} ${base - 20} v12" stroke="#ff4d5e" stroke-width="4" stroke-linecap="round"/></g>`;
  }

  function ambulance(x, y) {
    return `<g class="ambulance"><rect x="${x}" y="${y - 30}" width="58" height="26" rx="6" fill="#ffffff" ${OUT}/><rect x="${x + 38}" y="${y - 24}" width="14" height="10" rx="2" fill="#9ed8ff" stroke="${INK}" stroke-width="2"/><path d="M${x + 14} ${y - 17} h12 M${x + 20} ${y - 23} v12" stroke="#ff4d5e" stroke-width="4" stroke-linecap="round"/><rect x="${x + 6}" y="${y - 36}" width="10" height="6" rx="2" fill="#ff4d5e" class="siren"/><circle cx="${x + 13}" cy="${y - 3}" r="6" fill="${INK}"/><circle cx="${x + 46}" cy="${y - 3}" r="6" fill="${INK}"/></g>`;
  }

  // ---------- the building ----------
  function building(ch, opts) {
    opts = opts || {};
    const fx = opts.fx || {};
    const moods = opts.moods || {};
    const gentle = !!opts.gentle;
    const ex = ch.extras || [];
    const hill = ch.site === "hill";
    const gy = hill ? 336 : 372;
    const bx = 214, bw = 300, fh = 94;
    const f1 = gy, f2 = gy - fh, top = gy - fh * 2;
    const p = [];
    const piece = (id, inner) => `<g class="piece" data-piece="${id}">${inner}</g>`;

    // sky and weather mood
    const stormy = fx.storm || fx.snow || fx.flood || fx.hail || fx.wind || fx.cold;
    p.push(`<rect x="0" y="0" width="680" height="460" fill="${stormy ? "#7d8fb3" : fx.heat ? "#ffd99a" : "#9fdcff"}"/>`);
    if (!stormy) p.push(`<circle cx="610" cy="62" r="${fx.heat ? 44 : 30}" fill="#ffd23f" ${OUT} class="${fx.heat ? "sun hot" : "sun"}"/>`);
    if (!stormy && !fx.heat) p.push(`<g class="clouds"><path d="M70 70 a14 14 0 0 1 24 -8 a18 18 0 0 1 32 6 a12 12 0 0 1 2 22 h-54 a12 12 0 0 1 -4 -20z" fill="#fff" stroke="${INK}" stroke-width="2.5"/><path d="M380 50 a10 10 0 0 1 18 -6 a14 14 0 0 1 24 4 a9 9 0 0 1 2 16 h-40 a9 9 0 0 1 -4 -14z" fill="#fff" stroke="${INK}" stroke-width="2.5"/></g>`);

    // water (behind land, rises with floods)
    let waterY = 400;
    if (fx.flood) waterY = fx.flood.over > 0 ? f1 - (fx.flood.over >= 3 ? 52 : 16) : Math.min(gy + 8, 400 - fx.flood.intensity * 5);
    p.push(`<rect x="0" y="${waterY}" width="680" height="${460 - waterY}" fill="#4aa3ff"/>`);
    p.push(`<path d="M0 ${waterY + 10} q20 -6 40 0 t40 0 t40 0 t40 0 t40 0" fill="none" stroke="#ffffff" stroke-opacity=".6" stroke-width="3" class="ripple"/>`);

    // land
    const land = hill
      ? `M0 412 L90 412 C150 412 150 ${gy} 205 ${gy} L680 ${gy} L680 460 L0 460Z`
      : `M0 412 L104 412 C134 412 132 ${gy} 168 ${gy} L680 ${gy} L680 460 L0 460Z`;
    p.push(`<path d="${land}" fill="#8b5e3c" ${OUT}/>`);
    p.push(`<path d="${land.split(" L680 460")[0]}" fill="none" stroke="#5cc05c" stroke-width="9" stroke-linecap="round"/>`);
    p.push(`<g><rect x="604" y="${gy - 54}" width="10" height="54" fill="#8b5e3c" ${OUT}/><circle cx="609" cy="${gy - 70}" r="26" fill="#5cc05c" ${OUT}/><circle cx="597" cy="${gy - 76}" r="4" fill="#ff5d7a"/><circle cx="620" cy="${gy - 64}" r="4" fill="#ff5d7a"/></g>`);

    // earth heat loops (underground)
    if (ch.hvac === "earth") {
      let loops = "";
      for (let i = 0; i < 4; i++) loops += `<path d="M${540 + i * 26} ${gy + 6} v52 a7 7 0 0 0 14 0 v-52" fill="none" stroke="#ff8a3d" stroke-width="5" stroke-dasharray="7 5" stroke-linecap="round"/>`;
      p.push(piece("hvac-earth", loops));
    }

    // foundation + ground floor slab
    p.push(piece("foundation", `<rect x="${bx - 8}" y="${f1}" width="${bw + 16}" height="14" rx="3" fill="#b8c0cc" ${OUT}/>`));

    // back wall (we see it through the cut-away front) and side walls
    const wallFill = { wood: "#ffe2b8", steel: "#e3e8ef", timber: "#ffd49c" }[ch.frame];
    const sideFill = { wood: "#e9b56f", steel: "#9aa6b5", timber: "#c9874a" }[ch.frame];
    let walls = `<rect x="${bx}" y="${top}" width="${bw}" height="${fh * 2}" fill="${wallFill}"/>`;
    if (ch.frame === "wood") for (let y = top + 14; y < f1; y += 14) walls += `<line x1="${bx}" x2="${bx + bw}" y1="${y}" y2="${y}" stroke="#d9a868" stroke-width="1.5"/>`;
    if (ch.frame === "steel") walls += `<path d="M${bx + 14} ${top + 4} L${bx + bw - 14} ${f2 - 4} M${bx + bw - 14} ${top + 4} L${bx + 14} ${f2 - 4}" stroke="#b9c3cf" stroke-width="6"/>`;
    if (ch.frame === "timber") for (let x = bx + 70; x < bx + bw - 20; x += 80) walls += `<rect x="${x}" y="${top}" width="14" height="${fh * 2}" fill="#b5703a" stroke="${INK}" stroke-width="2"/>`;
    // walls insulation thickness shows on the side walls
    const thick = { thin: 10, cozy: 16, toasty: 22 }[ch.walls];
    walls += `<rect x="${bx - thick}" y="${top}" width="${thick}" height="${fh * 2}" fill="${sideFill}" ${OUT}/><rect x="${bx + bw}" y="${top}" width="${thick}" height="${fh * 2}" fill="${sideFill}" ${OUT}/>`;
    if (ch.walls !== "thin") walls += `<rect x="${bx - thick + 3}" y="${top + 4}" width="${thick - 6}" height="${fh * 2 - 8}" fill="#ff9ec4" opacity=".85"/><rect x="${bx + bw + 3}" y="${top + 4}" width="${thick - 6}" height="${fh * 2 - 8}" fill="#ff9ec4" opacity=".85"/>`;
    walls += `<rect x="${bx}" y="${f2 - 5}" width="${bw}" height="10" fill="#c7cfda" ${OUT}/>`;
    p.push(piece("frame", walls));

    // back-wall windows
    const sup = ch.windows === "super";
    const win = (x, y) => {
      let s = `<rect x="${x}" y="${y}" width="46" height="36" rx="4" fill="#bfe8ff" stroke="${INK}" stroke-width="${sup ? 4 : 3}"/>`;
      s += sup ? `<line x1="${x + 15}" x2="${x + 15}" y1="${y}" y2="${y + 36}" stroke="${INK}" stroke-width="2.5"/><line x1="${x + 31}" x2="${x + 31}" y1="${y}" y2="${y + 36}" stroke="${INK}" stroke-width="2.5"/><path d="M${x + 6} ${y + 8} l6 -4" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`
                : `<line x1="${x + 23}" x2="${x + 23}" y1="${y}" y2="${y + 36}" stroke="${INK}" stroke-width="2.5"/>`;
      return s;
    };
    p.push(piece("windows", win(bx + 150, f1 - 74) + win(bx + 236, f1 - 74) + win(bx + 24, f2 - 72) + win(bx + 200, f2 - 72)));

    // furniture
    const books = (x, y, n) => { let s = ""; const cols = ["#ff5d7a", "#4aa3ff", "#ffd23f", "#5cc05c", "#a259ff"]; for (let i = 0; i < n; i++) s += `<rect x="${x + i * 9}" y="${y}" width="7" height="${16 + (i % 3) * 3}" fill="${cols[i % 5]}" stroke="${INK}" stroke-width="1.2"/>`; return s; };
    let furn = "";
    furn += `<rect x="${bx + 12}" y="${f1 - 66}" width="58" height="62" rx="3" fill="#c98d55" ${OUT}/>` + books(bx + 16, f1 - 62, 6) + books(bx + 16, f1 - 34, 6);
    furn += `<rect x="${bx + 92}" y="${f1 - 22}" width="54" height="20" rx="3" fill="#7fd1ae" ${OUT}/>`; // Rosa's desk
    furn += `<path d="M${bx + 222} ${f1 - 2} v-26 a8 8 0 0 1 16 0 v10 h28 v-10 a8 8 0 0 1 16 0 v26z" fill="#ff8a65" ${OUT}/>`; // armchair
    furn += `<ellipse cx="${bx + 130}" cy="${f2 - 4}" rx="44" ry="6" fill="#ffd23f" stroke="${INK}" stroke-width="2"/>`; // story rug
    furn += `<rect x="${bx + 222}" y="${f2 - 28}" width="60" height="8" rx="2" fill="#c98d55" ${OUT}/><line x1="${bx + 228}" x2="${bx + 228}" y1="${f2 - 20}" y2="${f2 - 4}" stroke="${INK}" stroke-width="3"/><line x1="${bx + 276}" x2="${bx + 276}" y1="${f2 - 20}" y2="${f2 - 4}" stroke="${INK}" stroke-width="3"/>`; // study table
    furn += `<rect x="${bx + 8}" y="${f2 - 30}" width="40" height="26" rx="8" fill="#a3b4ff" ${OUT}/>`; // reading nook cushion
    p.push(furn);

    // roof
    let roof = "", roofTop = top;
    if (ch.roof === "basic") { roof = `<rect x="${bx - 16}" y="${top - 10}" width="${bw + 32}" height="12" rx="3" fill="#5a6378" ${OUT}/>`; roofTop = top - 10; }
    if (ch.roof === "snow") {
      roof = `<path d="M${bx - 22} ${top + 2} L${bx + bw / 2} ${top - 46} L${bx + bw + 22} ${top + 2}Z" fill="#ff5d5d" ${OUT}/>`;
      for (let i = 1; i < 6; i++) { const x = bx - 22 + (i * (bw + 44)) / 6; const yTop = top + 2 - 48 * (1 - Math.abs(x - (bx + bw / 2)) / (bw / 2 + 22)); roof += `<line x1="${x}" x2="${x}" y1="${top}" y2="${yTop + 4}" stroke="#ffd23f" stroke-width="3"/>`; }
      roofTop = top - 30;
    }
    if (ch.roof === "garden") {
      roof = `<rect x="${bx - 16}" y="${top - 12}" width="${bw + 32}" height="14" rx="3" fill="#6d5a4a" ${OUT}/>`;
      let tufts = ""; for (let x = bx - 12; x < bx + bw + 12; x += 18) tufts += `<path d="M${x} ${top - 12} q9 -16 18 0" fill="#5cc05c" stroke="${INK}" stroke-width="2"/>`;
      roof += tufts + `<circle cx="${bx + 40}" cy="${top - 20}" r="4" fill="#ff5d7a"/><circle cx="${bx + 160}" cy="${top - 22}" r="4" fill="#ffd23f"/><circle cx="${bx + 250}" cy="${top - 20}" r="4" fill="#ff5d7a"/>`;
      roofTop = top - 22;
    }
    // collapsed roof replaces the roof drawing
    const snowCrash = fx.snow && fx.snow.over >= 3;
    const windCrash = fx.wind && fx.wind.over >= 3;
    if (snowCrash) {
      roof = `<path d="M${bx - 16} ${top - 4} L${bx + bw / 2} ${f2 - 30} L${bx + bw + 16} ${top - 4}" fill="none" stroke="#5a6378" stroke-width="14" stroke-linejoin="round"/>
        <path d="M${bx + 30} ${f2 - 8} q60 -60 120 -22 q50 -40 120 16 v8 h-240z" fill="#ffffff" ${OUT}/>`;
    }
    if (!windCrash) p.push(piece("roof", roof));

    // roof gear
    let gear = "";
    if (ex.includes("skylights") && !snowCrash) {
      gear += `<path d="M${bx + 40} ${top - 6} l8 -16 h26 l8 16z" fill="#bfe8ff" ${OUT}/><path d="M${bx + 200} ${top - 6} l8 -16 h26 l8 16z" fill="#bfe8ff" ${OUT}/>`;
      gear += `<path d="M${bx + 46} ${top + 4} h30 l26 ${fh - 10} h-80z" fill="#fff6a8" opacity=".55"/><path d="M${bx + 206} ${top + 4} h30 l26 ${fh - 10} h-80z" fill="#fff6a8" opacity=".55"/>`;
    }
    if (ex.includes("solar") && !snowCrash) for (let i = 0; i < 3; i++) gear += `<path d="M${bx + 100 + i * 30} ${roofTop - 2} l6 -20 h22 l-6 20z" fill="#2f5bd6" stroke="${INK}" stroke-width="2.5"/>`;
    if (ch.hvac === "box" && !snowCrash) gear += `<rect x="${bx + bw - 66}" y="${roofTop - 30}" width="48" height="28" rx="4" fill="#a7b0c0" ${OUT}/><circle cx="${bx + bw - 42}" cy="${roofTop - 16}" r="8" fill="none" ${OUT}/><path d="M${bx + bw - 14} ${roofTop - 34} q6 -4 0 -8 q-6 -4 0 -8" fill="none" stroke="${INK}" stroke-width="2" class="buzz"/>`;
    if (ch.hvac === "pump" && !snowCrash) gear += `<rect x="${bx + bw - 56}" y="${roofTop - 20}" width="34" height="18" rx="4" fill="#ffffff" ${OUT}/><path d="M${bx + bw - 44} ${roofTop - 8} q4 -10 12 -6 q-2 8 -12 6z" fill="#5cc05c"/>`;
    if (ex.includes("generator")) gear += `<rect x="${bx + bw + 30}" y="${gy - 30}" width="44" height="30" rx="5" fill="#ffd23f" ${OUT}/><path d="M${bx + bw + 54} ${gy - 26} l-8 12 h8 l-6 10" fill="none" stroke="${INK}" stroke-width="2.5"/>`;
    if (ex.includes("raingarden")) {
      gear += `<path d="M${bx - 96} ${gy + 1} q34 18 68 0z" fill="#4aa3ff" stroke="${INK}" stroke-width="2"/>`;
      for (let i = 0; i < 5; i++) gear += `<path d="M${bx - 90 + i * 14} ${gy} q-4 -14 0 -22 q6 10 0 22z" fill="#5cc05c" stroke="${INK}" stroke-width="1.5"/><circle cx="${bx - 90 + i * 14}" cy="${gy - 22}" r="3" fill="${i % 2 ? "#ffd23f" : "#ff5d7a"}"/>`;
    }
    p.push(piece("extras", gear));

    // people inside
    const spots = {
      rosa: [bx + 118, f1 - 2], okafor: [bx + 252, f1 - 14], biscuit: [bx + 176, f1 - 38],
      maya: [bx + 30, f2 - 8], leo: [bx + 130, f2 - 6], priya: [bx + 252, f2 - 26],
    };
    const ghosts = [];
    if (!opts.empty) G.cast.forEach((c) => {
      const mood = moods[c.id] || "happy";
      const [x, base] = spots[c.id];
      if (mood === "ghost") {
        if (gentle) p.push(hurtMark(x, base));
        else ghosts.push(c);
      } else {
        p.push(figure(c, x, base, mood));
      }
    });

    // ---- weather and damage on top ----
    if (fx.crack) p.push(`<path d="M${bx + 40} ${f1 + 12} l8 -22 l-10 -16 l9 -20 l-6 -16" fill="none" stroke="#ff4d5e" stroke-width="4" stroke-linecap="round"/>`);
    if (fx.snow) {
      const depth = 6 + fx.snow.intensity * 2.6;
      if (!snowCrash) p.push(`<path d="M${bx - 24} ${roofTop + 2} q${bw / 2 + 24} ${-depth * 2} ${bw + 48} 0z" fill="#ffffff" ${OUT}/>`);
      if (fx.snow.over > 0 && !snowCrash) for (let i = 0; i < 4; i++) p.push(`<circle class="drip" style="--d:${i * 0.3}s" cx="${bx + 70 + i * 50}" cy="${top + 12}" r="4" fill="#4aa3ff"/>`);
      for (let i = 0; i < 34; i++) p.push(`<circle class="flake" style="--d:${(i % 8) * 0.35}s;--x:${(i % 5) * 4 - 8}px" cx="${(i * 47) % 680}" cy="-8" r="${2 + (i % 3)}" fill="#fff"/>`);
    }
    if (fx.flood && waterY < f1 + 6) {
      p.push(`<rect x="0" y="${waterY}" width="680" height="${f1 + 14 - waterY}" fill="#4aa3ff" opacity=".7"/>`);
      if (fx.flood.over >= 3) p.push(`<g class="fish"><path d="M${bx + 120} ${f1 - 24} q14 -10 28 0 q-14 10 -28 0z" fill="#ff8a3d" ${OUT}/><path d="M${bx + 148} ${f1 - 24} l10 -7 v14z" fill="#ff8a3d" ${OUT}/><circle cx="${bx + 128}" cy="${f1 - 26}" r="2" fill="${INK}"/></g>`);
    }
    if (fx.hail) {
      for (let i = 0; i < 34; i++) p.push(`<circle class="hailstone" style="--d:${(i % 7) * 0.18}s" cx="${(i * 41 + 9) % 680}" cy="-8" r="${3 + (fx.hail.intensity > 7 ? 2 : 0)}" fill="#ffffff" stroke="${INK}" stroke-width="1.5"/>`);
      if (fx.hail.over > 0) p.push(`<path d="M${bx + 158} ${f1 - 70} l10 12 l-6 8 l12 12" fill="none" stroke="#ff4d5e" stroke-width="3.5" stroke-linecap="round"/><path d="M${bx + 30} ${f2 - 68} l12 10 l-6 8 l10 14" fill="none" stroke="#ff4d5e" stroke-width="3.5" stroke-linecap="round"/>`);
    }
    if (fx.wind) {
      for (let i = 0; i < 9; i++) p.push(`<path class="gust" style="--d:${(i % 4) * 0.3}s" d="M-90 ${70 + i * 30} h${70 + (i % 3) * 30}" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>`);
      if (fx.wind.over > 0) p.push(`<rect class="flying" x="${bx + bw - 60}" y="${top - 70}" width="60" height="12" rx="3" fill="#5a6378" ${OUT}/>`);
    }
    if (fx.cold) {
      p.push(`<rect x="0" y="0" width="680" height="460" fill="#bfe8ff" opacity=".25"/>`);
      let ice = ""; for (let x = bx - 10; x < bx + bw + 10; x += 16) ice += `<path d="M${x} ${top + 2} l5 ${10 + ((x / 16) % 3) * 6} l5 ${-10 - ((x / 16) % 3) * 6}z" fill="#dff4ff" stroke="${INK}" stroke-width="1.5"/>`;
      p.push(ice);
      if (fx.cold.over > 0) p.push(`<rect x="${bx}" y="${top}" width="${bw}" height="${fh * 2}" fill="#9ed8ff" opacity=".35"/>`);
    }
    if (fx.heat) {
      for (let i = 0; i < 4; i++) p.push(`<path class="shimmer" style="--d:${i * 0.25}s" d="M${bx + 40 + i * 70} ${roofTop - 24} q10 -10 0 -20 q-10 -10 0 -20" fill="none" stroke="#ff8a3d" stroke-width="3"/>`);
      if (fx.heat.over > 0) p.push(`<rect x="${bx}" y="${top}" width="${bw}" height="${fh * 2}" fill="#ff8a3d" opacity=".2"/>`);
    }
    if (fx.storm) {
      p.push(`<g class="stormcloud"><path d="M220 70 a26 26 0 0 1 44 -18 a34 34 0 0 1 62 8 a24 24 0 0 1 6 44 h-104 a22 22 0 0 1 -8 -34z" fill="#5d6d8e" ${OUT}/>
        <path d="M250 70 l14 6 M300 76 l14 -6" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><circle cx="262" cy="84" r="4" fill="${INK}"/><circle cx="302" cy="84" r="4" fill="${INK}"/><path d="M270 104 q12 -8 24 0" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
        <path class="bolt" d="M330 108 l-14 28 h14 l-10 26" fill="none" stroke="#ffd23f" stroke-width="6" stroke-linejoin="round"/></g>`);
    }
    if (fx.closed) p.push(`<g><rect x="${bx + bw + 34}" y="${gy - 70}" width="6" height="40" fill="${INK}"/><rect x="${bx + bw + 12}" y="${gy - 90}" width="54" height="24" rx="5" fill="#ff4d5e" ${OUT}/><text x="${bx + bw + 39}" y="${gy - 73}" text-anchor="middle" class="sign">CLOSED</text></g>`);

    ghosts.forEach((c, i) => {
      const x = spots[c.id][0];
      p.push(ghost(c, x, top - 92 - (i % 2) * 18, i));
    });
    if (gentle && G.cast.some((c) => moods[c.id] === "ghost")) p.push(ambulance(560, gy));

    const who = G.cast.map((c) => `${c.name} ${moods[c.id] || "happy"}`).join(", ");
    return `<svg class="building" viewBox="0 0 680 460" role="img" aria-label="The library, cut away to show inside. ${who}.">${p.join("")}</svg>`;
  }

  // Single character portrait (cards, lineup, speech bubbles)
  function person(c, mood, gentle) {
    let inner;
    if (mood === "ghost" && !gentle) inner = ghost(c, 40, 46, 0).replace(/<text[^>]*>.*?<\/text>/, "");
    else if (mood === "ghost") inner = figure(c, 40, 84, "sad") + hurtMark(58, 60);
    else inner = figure(c, 40, 84, mood || "happy");
    return `<svg class="portrait" viewBox="0 0 80 92" aria-hidden="true">${inner}</svg>`;
  }

  function rivet() {
    return `<svg class="rivet" viewBox="0 0 90 90" aria-hidden="true">
      <circle cx="22" cy="28" r="9" fill="#8b5e3c" ${OUT}/><circle cx="68" cy="28" r="9" fill="#8b5e3c" ${OUT}/>
      <circle cx="45" cy="52" r="30" fill="#a8703f" ${OUT}/>
      <ellipse cx="45" cy="64" rx="17" ry="12" fill="#e9c49a" ${OUT}/>
      <circle cx="35" cy="46" r="3.5" fill="${INK}"/><circle cx="55" cy="46" r="3.5" fill="${INK}"/>
      <ellipse cx="45" cy="58" rx="6" ry="4" fill="${INK}"/>
      <rect x="39" y="66" width="12" height="10" rx="2" fill="#ffffff" ${OUT}/><line x1="45" y1="66" x2="45" y2="76" stroke="${INK}" stroke-width="2"/>
      <path d="M16 30 a29 22 0 0 1 58 0z" fill="#ffd23f" ${OUT}/><rect x="10" y="27" width="70" height="8" rx="4" fill="#ffd23f" ${OUT}/>
    </svg>`;
  }

  // Picture-card icons
  function icon(d, o) {
    const s = (inner) => `<svg class="icon" viewBox="0 0 96 64" aria-hidden="true"><rect x="0" y="0" width="96" height="64" rx="10" fill="#e9f7ff"/>${inner}</svg>`;
    const house = (x, y) => `<rect x="${x}" y="${y}" width="26" height="18" fill="#ffe2b8" ${OUT}/><path d="M${x - 4} ${y} l17 -12 l17 12z" fill="#ff5d5d" ${OUT}/>`;
    const k = `${d}:${o}`;
    switch (k) {
      case "site:river": return s(`<path d="M0 50 q24 -8 48 0 t48 0 v14 h-96z" fill="#4aa3ff"/>${house(38, 30)}`);
      case "site:hill": return s(`<path d="M0 64 q48 -56 96 0z" fill="#5cc05c" ${OUT}/><path d="M0 58 q20 -4 30 0 v6 h-30z" fill="#4aa3ff"/>${house(36, 16)}`);
      case "soils:skip": return s(`<rect x="0" y="42" width="96" height="22" fill="#8b5e3c"/><text x="48" y="34" text-anchor="middle" font-size="30" font-weight="700" fill="${INK}">?</text>`);
      case "soils:test": return s(`<rect x="0" y="34" width="96" height="10" fill="#c98d55"/><rect x="0" y="44" width="96" height="10" fill="#8b5e3c"/><rect x="0" y="54" width="96" height="10" fill="#6b4428"/><circle cx="50" cy="30" r="14" fill="#bfe8ff" fill-opacity=".7" ${OUT}/><line x1="60" y1="40" x2="74" y2="54" ${OUT}/>`);
      case "frame:wood": return s(`<path d="M24 54 V18 H72 V54 M24 36 H72 M48 18 V54" fill="none" stroke="#d9a050" stroke-width="5"/>`);
      case "frame:steel": return s(`<path d="M30 14 h36 M30 50 h36 M48 14 v36" stroke="#7d8aa0" stroke-width="9"/>`);
      case "frame:timber": return s(`<rect x="22" y="12" width="14" height="42" fill="#b5703a" ${OUT}/><rect x="60" y="12" width="14" height="42" fill="#b5703a" ${OUT}/><rect x="16" y="10" width="64" height="10" fill="#c9874a" ${OUT}/>`);
      case "roof:basic": return s(`<rect x="16" y="28" width="64" height="8" fill="#5a6378" ${OUT}/><rect x="22" y="36" width="52" height="20" fill="#ffe2b8" ${OUT}/>`);
      case "roof:snow": return s(`<path d="M12 40 L48 14 L84 40z" fill="#ff5d5d" ${OUT}/><path d="M22 34 L48 16 L74 34 q-26 -8 -52 0z" fill="#fff"/><rect x="22" y="40" width="52" height="16" fill="#ffe2b8" ${OUT}/>`);
      case "roof:garden": return s(`<rect x="16" y="30" width="64" height="8" fill="#6d5a4a" ${OUT}/><path d="M18 30 q7 -12 14 0 q7 -12 14 0 q7 -12 14 0 q7 -12 14 0" fill="#5cc05c" stroke="${INK}" stroke-width="2"/><circle cx="34" cy="22" r="3" fill="#ff5d7a"/><circle cx="60" cy="22" r="3" fill="#ffd23f"/><rect x="22" y="38" width="52" height="18" fill="#ffe2b8" ${OUT}/>`);
      case "walls:thin": return s(`<rect x="44" y="10" width="8" height="46" fill="#e9b56f" ${OUT}/><text x="72" y="38" font-size="18" fill="#4aa3ff">*</text>`);
      case "walls:cozy": return s(`<rect x="38" y="10" width="20" height="46" fill="#e9b56f" ${OUT}/><rect x="42" y="14" width="12" height="38" fill="#ff9ec4"/>`);
      case "walls:toasty": return s(`<rect x="32" y="10" width="32" height="46" fill="#e9b56f" ${OUT}/><rect x="36" y="14" width="24" height="38" fill="#ff9ec4"/><path d="M76 44 q-8 -10 0 -20 q8 10 0 20z" fill="#ff8a3d"/>`);
      case "windows:regular": return s(`<rect x="28" y="12" width="40" height="40" rx="4" fill="#bfe8ff" ${OUT}/><line x1="48" y1="12" x2="48" y2="52" ${OUT}/>`);
      case "windows:super": return s(`<rect x="26" y="10" width="44" height="44" rx="4" fill="#bfe8ff" stroke="${INK}" stroke-width="5"/><line x1="40" y1="10" x2="40" y2="54" ${OUT}/><line x1="56" y1="10" x2="56" y2="54" ${OUT}/><path d="M76 16 l3 6 l6 3 l-6 3 l-3 6 l-3 -6 l-6 -3 l6 -3z" fill="#ffd23f"/>`);
      case "hvac:box": return s(`<rect x="22" y="16" width="52" height="34" rx="5" fill="#a7b0c0" ${OUT}/><circle cx="48" cy="33" r="10" fill="none" ${OUT}/><path d="M80 18 q6 -4 0 -8" fill="none" ${OUT}/>`);
      case "hvac:pump": return s(`<rect x="24" y="20" width="48" height="28" rx="6" fill="#fff" ${OUT}/><path d="M40 40 q6 -16 18 -10 q-2 12 -18 10z" fill="#5cc05c"/>`);
      case "hvac:earth": return s(`<rect x="0" y="22" width="96" height="42" fill="#8b5e3c"/><path d="M30 22 v26 a6 6 0 0 0 12 0 v-26 M54 22 v26 a6 6 0 0 0 12 0 v-26" fill="none" stroke="#ff8a3d" stroke-width="5" stroke-linecap="round"/>`);
      case "extras:solar": return s(`<path d="M20 50 l10 -32 h44 l-10 32z" fill="#2f5bd6" ${OUT}/><circle cx="80" cy="14" r="8" fill="#ffd23f"/>`);
      case "extras:generator": return s(`<rect x="24" y="18" width="48" height="34" rx="5" fill="#ffd23f" ${OUT}/><path d="M50 22 l-10 14 h10 l-8 12" fill="none" ${OUT}/>`);
      case "extras:raingarden": return s(`<path d="M18 52 q30 14 60 0z" fill="#4aa3ff"/><path d="M30 52 q-4 -18 0 -28 q6 12 0 28z M48 52 q-4 -22 0 -34 q6 14 0 34z M66 52 q-4 -18 0 -28 q6 12 0 28z" fill="#5cc05c" stroke="${INK}" stroke-width="1.5"/>`);
      case "extras:skylights": return s(`<path d="M30 30 l8 -14 h20 l8 14z" fill="#bfe8ff" ${OUT}/><path d="M36 32 h24 l14 26 h-52z" fill="#fff6a8"/><circle cx="80" cy="14" r="8" fill="#ffd23f"/>`);
    }
    return s("");
  }

  window.ART = { building, person, rivet, icon };
})();
