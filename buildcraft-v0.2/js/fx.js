// ============================================================
// fx.js — OWNED BY SQUAD 5 (celebrations) with SQUAD 4
// FX.confetti(), FX.coins(), FX.burst(x, y), FX.fireworks(ms)
// FX.sound(name): pop, ding, kaching, cheer, thunder, sad, boo, win
// All particles draw on one full-screen canvas. Sounds are tiny
// synth blips made with Web Audio, so there are no audio files.
// ============================================================

(function () {
  const canvas = document.createElement("canvas");
  canvas.id = "fx";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const COLORS = ["#ff5d5d", "#ffd23f", "#5cc05c", "#4aa3ff", "#a259ff", "#ff8fa3"];
  let parts = [];
  let running = false;

  function size() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size();
  addEventListener("resize", size);

  function loop() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter((p) => p.life > 0 && p.y < innerHeight + 40);
    for (const p of parts) {
      p.vy += p.g;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.spin;
      p.life -= 1;
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life / 30);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === "coin") {
        ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * Math.abs(Math.cos(p.rot * 2)) + 1, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#b8860b"; ctx.lineWidth = 2; ctx.stroke();
      } else if (p.shape === "dot") {
        ctx.beginPath(); ctx.arc(0, 0, p.s, 0, Math.PI * 2); ctx.fill();
      } else if (p.shape === "star") {
        ctx.beginPath();
        for (let i = 0; i < 10; i++) { const r = i % 2 ? p.s * 0.45 : p.s; const a = (i * Math.PI) / 5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
        ctx.closePath(); ctx.fill();
      } else {
        ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      }
      ctx.restore();
    }
    if (parts.length) requestAnimationFrame(loop);
    else { running = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
  }
  function add(list) {
    if (reduce) list = list.slice(0, Math.ceil(list.length / 6));
    parts.push(...list);
    if (!running) { running = true; requestAnimationFrame(loop); }
  }
  const rand = (a, b) => a + Math.random() * (b - a);

  function confetti(n) {
    n = n || 160;
    const list = [];
    for (let i = 0; i < n; i++) list.push({ x: rand(0, innerWidth), y: rand(-200, -10), vx: rand(-2, 2), vy: rand(1, 4), g: 0.06, drag: 0.995, rot: rand(0, 6), spin: rand(-0.2, 0.2), s: rand(8, 14), color: COLORS[i % COLORS.length], life: 260, shape: "rect" });
    add(list);
  }
  function coins(n) {
    n = n || 40;
    const list = [];
    for (let i = 0; i < n; i++) list.push({ x: rand(innerWidth * 0.1, innerWidth * 0.9), y: rand(-160, -10), vx: rand(-1, 1), vy: rand(2, 5), g: 0.12, drag: 0.99, rot: rand(0, 6), spin: rand(0.05, 0.2), s: rand(7, 11), color: "#ffd23f", life: 200, shape: "coin" });
    add(list);
  }
  function burst(x, y, gold) {
    const list = [];
    for (let i = 0; i < (gold ? 26 : 16); i++) {
      const a = rand(0, Math.PI * 2), sp = rand(2, gold ? 7 : 5);
      list.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.08, drag: 0.94, rot: 0, spin: rand(-0.3, 0.3), s: gold ? rand(6, 10) : rand(3, 6), color: gold ? "#ffd23f" : COLORS[i % COLORS.length], life: 55, shape: gold ? "star" : "dot" });
    }
    add(list);
  }
  function fireworks(ms) {
    const end = Date.now() + (ms || 2400);
    (function shoot() {
      const x = rand(innerWidth * 0.15, innerWidth * 0.85), y = rand(innerHeight * 0.12, innerHeight * 0.45);
      const color = COLORS[Math.floor(rand(0, COLORS.length))];
      const list = [];
      for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2, sp = rand(3, 6); list.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.05, drag: 0.96, rot: 0, spin: 0, s: 3, color, life: 70, shape: "dot" }); }
      add(list);
      if (Date.now() < end && !reduce) setTimeout(shoot, rand(220, 420));
    })();
  }

  // ---------- sound ----------
  let ac = null;
  let muted = false;
  function audio() {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } }
    if (ac && ac.state === "suspended") ac.resume();
    return ac;
  }
  function tone(freq, start, dur, type, vol, slideTo) {
    const a = audio(); if (!a) return;
    const t = a.currentTime + start;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.15, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(start, dur, vol, cutoff) {
    const a = audio(); if (!a) return;
    const len = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, len, a.sampleRate), data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = buf; f.type = "lowpass"; f.frequency.value = cutoff || 400; g.gain.value = vol || 0.3;
    src.connect(f); f.connect(g); g.connect(a.destination);
    src.start(a.currentTime + start);
  }
  const SOUNDS = {
    pop: () => tone(520, 0, 0.12, "triangle", 0.18, 880),
    ding: () => { tone(988, 0, 0.25, "sine", 0.15); tone(1319, 0.08, 0.35, "sine", 0.12); },
    kaching: () => { tone(1568, 0, 0.1, "square", 0.06); tone(2093, 0.08, 0.3, "square", 0.06); },
    cheer: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.22, "triangle", 0.14)); noise(0, 0.6, 0.08, 3000); },
    thunder: () => noise(0, 1.4, 0.5, 220),
    sad: () => [392, 370, 349, 294].forEach((f, i) => tone(f, i * 0.28, i === 3 ? 0.7 : 0.28, "sawtooth", 0.07)),
    boo: () => tone(300, 0, 0.9, "sine", 0.14, 520),
    win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.25, "square", 0.07)),
  };
  function sound(name) { if (!muted && SOUNDS[name]) { try { SOUNDS[name](); } catch (e) { /* audio is optional */ } } }

  function clear() { parts = []; ctx.clearRect(0, 0, innerWidth, innerHeight); }

  window.FX = { confetti, coins, burst, fireworks, sound, clear, setMuted: (m) => (muted = m), isMuted: () => muted };
})();
