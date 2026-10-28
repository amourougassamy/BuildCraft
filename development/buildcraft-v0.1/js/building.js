// ============================================================
// building.js — OWNED BY SQUAD 5 (Art and animation)
// drawBuilding(choices, fx) returns an SVG string: a side view of
// the library that changes with every choice, plus weather effects.
// Colors come from CSS classes (see styles.css, "Building art"),
// so the drawing works in light and dark themes.
//
// fx = { assemble, crack, closed,
//        snow:{intensity,over}, flood:{intensity,over}, hail:{...},
//        wind:{...}, cold:{...}, heat:{...} }
// ============================================================

(function () {
  function drawBuilding(c, fx) {
    fx = fx || {};
    const high = c.site === "high";
    const gy = high ? 290 : 318; // grade at the building
    const bx = 200, bw = 260, bh = 128;
    const top = gy - bh;
    const extras = c.extras || [];
    const p = []; // svg parts
    const a = (step) => (fx.assemble ? ` class="assemble" style="--step:${step}"` : "");

    // Sky
    p.push(`<rect class="sky" x="0" y="0" width="640" height="400"/>`);
    if (fx.heat) p.push(`<circle class="sun" cx="580" cy="56" r="${18 + fx.heat.intensity * 1.5}"/>`);

    // Water: drawn first so the land covers it, except where it's over the land
    let waterY = 344;
    if (fx.flood) {
      waterY = fx.flood.over > 0 ? gy - 10 - fx.flood.over * 6 : Math.min(gy + 6, 344 - fx.flood.intensity * 5);
    }
    p.push(`<rect class="water" x="0" y="${waterY}" width="640" height="${400 - waterY}"/>`);

    // Land: river channel at left, building pad at right
    const land = high
      ? `M0 350 L96 350 C150 350 150 ${gy} 196 ${gy} L640 ${gy} L640 400 L0 400 Z`
      : `M0 350 L100 350 C128 350 128 ${gy} 160 ${gy} L640 ${gy} L640 400 L0 400 Z`;
    p.push(`<path class="earth" d="${land}"/>`);
    p.push(`<path class="grass" d="${land.split(" L640 400")[0].replace("M0 350", "M0 350")}" fill="none"/>`);

    // A tree for scale
    p.push(`<g${a(0)}><rect class="trunk" x="560" y="${gy - 44}" width="6" height="44"/><circle class="tree" cx="563" cy="${gy - 58}" r="22"/></g>`);

    // Geothermal loops below grade
    if (c.hvac === "geo") {
      let loops = "";
      for (let i = 0; i < 4; i++) {
        const x = 482 + i * 26;
        loops += `<path class="geo" d="M${x} ${gy + 4} V${gy + 70} a6 6 0 0 0 12 0 V${gy + 4}"/>`;
      }
      p.push(`<g${a(1)}>${loops}</g>`);
    }

    // Foundation
    p.push(`<rect${a(1)} class="foundation" x="${bx - 6}" y="${gy}" width="${bw + 12}" height="12"/>`);

    // Walls by structure type
    let wall = `<rect class="wall wall-${c.structure}" x="${bx}" y="${top}" width="${bw}" height="${bh}"/>`;
    if (c.structure === "wood") {
      for (let y = top + 10; y < gy; y += 10) wall += `<line class="siding" x1="${bx}" x2="${bx + bw}" y1="${y}" y2="${y}"/>`;
    } else if (c.structure === "steel") {
      for (let x = bx + 26; x < bx + bw; x += 26) wall += `<line class="panel-line" x1="${x}" x2="${x}" y1="${top}" y2="${gy}"/>`;
    } else {
      for (let x = bx; x <= bx + bw - 8; x += 63) wall += `<rect class="timber-col" x="${x}" y="${top}" width="8" height="${bh}"/>`;
    }
    wall += `<line class="floor-line" x1="${bx}" x2="${bx + bw}" y1="${top + bh / 2}" y2="${top + bh / 2}"/>`;
    p.push(`<g${a(2)}>${wall}</g>`);

    // Windows: 5 upstairs, 4 downstairs around the door
    const triple = c.windows === "triple";
    const win = (x, y) => {
      let s = `<rect class="win-frame${triple ? " thick" : ""}" x="${x}" y="${y}" width="34" height="34"/>`;
      s += `<rect class="glass" x="${x + 3}" y="${y + 3}" width="28" height="28"/>`;
      if (triple) s += `<line class="mullion" x1="${x + 12}" x2="${x + 12}" y1="${y + 3}" y2="${y + 31}"/><line class="mullion" x1="${x + 22}" x2="${x + 22}" y1="${y + 3}" y2="${y + 31}"/>`;
      else s += `<line class="mullion" x1="${x + 17}" x2="${x + 17}" y1="${y + 3}" y2="${y + 31}"/>`;
      return s;
    };
    let wins = "";
    [222, 270, 318, 366, 414].forEach((x) => (wins += win(x, top + 16)));
    [222, 266, 364, 410].forEach((x) => (wins += win(x, top + 80)));
    wins += `<rect class="door" x="316" y="${gy - 46}" width="28" height="46"/>`;
    p.push(`<g${a(3)}>${wins}</g>`);

    // Roof
    let roof = "";
    let roofTop = top;
    if (c.roof === "basic") {
      roof = `<rect class="roof" x="${bx - 4}" y="${top - 6}" width="${bw + 8}" height="6"/>`;
      roofTop = top - 6;
    } else if (c.roof === "snow") {
      roof = `<rect class="roof strong" x="${bx - 6}" y="${top - 12}" width="${bw + 12}" height="12"/>`;
      for (let x = bx + 6; x < bx + bw; x += 20) roof += `<line class="truss" x1="${x}" x2="${x + 10}" y1="${top - 1}" y2="${top - 11}"/>`;
      roofTop = top - 12;
    } else {
      roof = `<rect class="roof" x="${bx - 4}" y="${top - 8}" width="${bw + 8}" height="8"/>`;
      let tufts = "";
      for (let x = bx; x < bx + bw; x += 16) tufts += ` q8 -10 16 0`;
      roof += `<path class="greenroof" d="M${bx - 4} ${top - 8}${tufts} L${bx + bw + 4} ${top - 8} Z"/>`;
      roofTop = top - 12;
    }
    p.push(`<g${a(4)}>${roof}</g>`);

    // Roof equipment and extras
    let gear = "";
    if (extras.includes("daylight")) {
      gear += `<path class="glass skylight" d="M${bx + 30} ${roofTop} l6 -12 h22 l6 12 Z"/><path class="glass skylight" d="M${bx + 150} ${roofTop} l6 -12 h22 l6 12 Z"/>`;
    }
    if (extras.includes("solar")) {
      for (let i = 0; i < 3; i++) {
        const x = bx + 74 + i * 24;
        gear += `<path class="solar" d="M${x} ${roofTop} l4 -16 h18 l-4 16 Z"/>`;
      }
    }
    if (c.hvac === "rtu") gear += `<rect class="mech" x="${bx + 200}" y="${roofTop - 24}" width="42" height="24"/><circle class="fan" cx="${bx + 221}" cy="${roofTop - 12}" r="7"/>`;
    if (c.hvac === "heatpump") gear += `<rect class="mech" x="${bx + 210}" y="${roofTop - 16}" width="28" height="16"/><circle class="fan" cx="${bx + 224}" cy="${roofTop - 8}" r="5"/>`;
    if (extras.includes("generator")) gear += `<rect class="mech" x="${bx + bw + 16}" y="${gy - 26}" width="38" height="26"/><text class="tiny" x="${bx + bw + 35}" y="${gy - 9}" text-anchor="middle">GEN</text>`;
    if (extras.includes("raingarden")) {
      gear += `<path class="raingarden" d="M${bx - 78} ${gy} q30 14 60 0 Z"/>`;
      for (let i = 0; i < 5; i++) gear += `<ellipse class="plant" cx="${bx - 72 + i * 12}" cy="${gy - 6 - (i % 2) * 4}" rx="6" ry="9"/>`;
    }
    p.push(`<g${a(5)}>${gear}</g>`);

    // ---- Weather and damage ----
    if (fx.crack) {
      p.push(`<path class="damage" d="M${bx + 40} ${gy} l6 -18 l-8 -12 l7 -16 l-5 -14"/>`);
    }
    if (fx.snow) {
      const depth = 4 + fx.snow.intensity * 2.4;
      p.push(`<rect class="snow" x="${bx - 8}" y="${roofTop - depth}" width="${bw + 16}" height="${depth}" rx="4"/>`);
      if (fx.snow.over > 0) {
        p.push(`<path class="damage" d="M${bx + 60} ${top + 2} q70 ${10 + fx.snow.over * 4} 140 0"/>`);
        for (let i = 0; i < 4; i++) p.push(`<circle class="drip" cx="${bx + 90 + i * 26}" cy="${top + 22 + (i % 2) * 8}" r="3" style="--d:${i * 0.3}s"/>`);
      }
      for (let i = 0; i < 26; i++) {
        const x = (i * 53) % 640, d = (i % 7) * 0.4;
        p.push(`<circle class="flake" cx="${x}" cy="-6" r="${1.5 + (i % 3)}" style="--d:${d}s;--x:${(i % 5) - 2}px"/>`);
      }
    }
    if (fx.hail) {
      for (let i = 0; i < 30; i++) {
        const x = (i * 37 + 11) % 640, d = (i % 6) * 0.22;
        p.push(`<circle class="hailstone" cx="${x}" cy="-6" r="${2 + (fx.hail.intensity > 7 ? 1.5 : 0)}" style="--d:${d}s"/>`);
      }
      if (fx.hail.over > 0) {
        p.push(`<path class="damage" d="M228 ${top + 20} l10 12 l-4 8 l12 10"/><path class="damage" d="M372 ${top + 84} l8 10 l-6 6 l10 12"/>`);
        for (let i = 0; i < 6; i++) p.push(`<circle class="dent" cx="${bx + 20 + i * 42}" cy="${roofTop + 2}" r="2.5"/>`);
      }
    }
    if (fx.wind) {
      for (let i = 0; i < 9; i++) {
        const y = 60 + i * 26, d = (i % 4) * 0.35;
        p.push(`<path class="wind-streak" d="M-80 ${y} h${60 + (i % 3) * 30}" style="--d:${d}s"/>`);
      }
      if (fx.wind.over > 0) p.push(`<path class="damage" d="M${bx + bw - 30} ${top} l30 -20 l10 8"/>`);
    }
    if (fx.cold) {
      p.push(`<rect class="frost" x="0" y="0" width="640" height="400"/>`);
      let ice = "";
      for (let x = bx - 4; x < bx + bw; x += 14) ice += `<path class="ice" d="M${x} ${top} l4 ${8 + ((x / 14) % 3) * 4} l4 ${-8 - ((x / 14) % 3) * 4} Z"/>`;
      p.push(ice);
    }
    if (fx.heat) {
      for (let i = 0; i < 4; i++) p.push(`<path class="shimmer" d="M${bx + 30 + i * 60} ${roofTop - 20} q8 -8 0 -16 q-8 -8 0 -16" style="--d:${i * 0.25}s"/>`);
    }
    if (fx.flood && waterY < gy) {
      p.push(`<rect class="water front" x="0" y="${waterY}" width="640" height="${gy + 14 - waterY}"/>`);
    }
    if (fx.closed) {
      p.push(`<g class="closed-sign"><rect x="300" y="${gy - 74}" width="60" height="20" rx="3"/><text x="330" y="${gy - 60}" text-anchor="middle">CLOSED</text></g>`);
    }

    const label = `Side view of the library: ${c.structure} structure, ${c.roof} roof, ${high ? "high-ground" : "floodplain"} lot`;
    return `<svg class="building" viewBox="0 0 640 400" role="img" aria-label="${label}">${p.join("")}</svg>`;
  }

  window.drawBuilding = drawBuilding;
})();
