// ============================================================
// scene.js — the clay-style 3D world. Two views share these helpers:
//   createSite(el)  the building, its people and the weather
//   createMap(el)   the island of level pins you pan around
// Renderer, emoji sprites and the person model follow Tom's
// prototypes/building-tycoon/js/scene.js.
// ============================================================

import * as THREE from "three";
import { OrbitControls } from "three/addons/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/RoundedBoxGeometry.js";
import { SOILS, CAST } from "./data.js";

const reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- clay helpers ----------
const matCache = new Map();
function clay(color, extra = {}) {
  const key = color + JSON.stringify(extra);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0, ...extra }));
  return matCache.get(key);
}
function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
const rbox = (w, h, d, color, x, y, z, r = 0.25) =>
  mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2)), typeof color === "number" ? clay(color) : color, x, y, z);
const ball = (r, color, x, y, z) => mesh(new THREE.SphereGeometry(r, 14, 10), clay(color), x, y, z);
const cyl = (r1, r2, h, color, x, y, z) => mesh(new THREE.CylinderGeometry(r1, r2, h, 18), clay(color), x, y, z);

function makeRenderer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  return renderer;
}

function addLights(scene, size) {
  const hemi = new THREE.HemisphereLight(0xfff4e0, 0x9fb8a0, 1.5);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.2);
  sun.position.set(18, 30, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.radius = 10;
  sun.shadow.blurSamples = 8;
  Object.assign(sun.shadow.camera, { left: -size, right: size, top: size, bottom: -size, near: 1, far: 120 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.06;
  scene.add(sun);
  return { hemi, sun };
}

// Run a render loop only while the canvas is on screen.
// On a slow computer (under ~20 fps for the first 2 s on screen) drop soft shadows and sharpness.
function loop(container, renderer, fn) {
  const clock = new THREE.Clock();
  let shown = 0, frames = 0, lowPower = false;
  (function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.1);
    if (container.offsetParent === null) return;
    fn(dt, clock.elapsedTime);
    if (!lowPower && (shown += dt) < 2.5) {
      frames++;
      if (shown >= 2 && frames / shown < 20) {
        lowPower = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;
        renderer.setPixelRatio(1);
        renderer.setSize(container.clientWidth || 1, container.clientHeight || 1, false);
        renderer.shadowMap.needsUpdate = true;
      }
    }
  })();
}

function fit(container, renderer, camera, ortho) {
  function resize() {
    const w = container.clientWidth || 1, h = container.clientHeight || 1, a = w / h;
    if (ortho) {
      camera.left = -ortho * a / 2; camera.right = ortho * a / 2;
      camera.top = ortho / 2; camera.bottom = -ortho / 2;
    } else camera.aspect = a;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  new ResizeObserver(resize).observe(container);
  resize();
}

// ---------- emoji and label sprites ----------
const texCache = new Map();
function emojiTexture(emoji, ring) {
  const key = emoji + ring;
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  g.beginPath(); g.arc(64, 64, 56, 0, Math.PI * 2);
  g.fillStyle = "rgba(255,255,255,0.95)"; g.fill();
  if (ring) { g.lineWidth = 10; g.strokeStyle = ring; g.stroke(); }
  g.font = "72px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(emoji, 64, 70);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, t);
  return t;
}
function sprite(emoji, ring, size = 1.2) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture(emoji, ring), depthTest: false, transparent: true }));
  s.scale.set(size, size, 1);
  s.renderOrder = 10;
  return s;
}
function setSprite(s, emoji, ring) { s.material.map = emojiTexture(emoji, ring); }

function labelSprite(text, bg = "#fff", fg = "#3a3340") {
  const c = document.createElement("canvas");
  const g = c.getContext("2d");
  g.font = "600 44px Fredoka, 'Trebuchet MS', sans-serif";
  const w = Math.ceil(g.measureText(text).width) + 48;
  c.width = w; c.height = 76;
  g.font = "600 44px Fredoka, 'Trebuchet MS', sans-serif";
  g.fillStyle = bg; g.strokeStyle = fg; g.lineWidth = 6;
  g.beginPath(); g.roundRect(3, 3, w - 6, 70, 30); g.fill(); g.stroke();
  g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(text, w / 2, 40);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  s.scale.set(w / 76 * 1.1, 1.1, 1);
  s.renderOrder = 11;
  return s;
}

export function moodFace(p, gentle) {
  if (p.ghost) return gentle ? "🩹" : "👻";
  if (p.reason === "scared") return "😱";
  if (p.reason === "hot") return "🥵";
  if (p.reason === "dark") return "😟";
  if (p.mood >= 85) return p.pet ? "🐶" : "😍";
  if (p.mood >= 68) return "😀";
  if (p.mood >= 52) return "🙂";
  if (p.mood >= 38) return "😐";
  if (p.mood >= 25) return "🙁";
  return "😭";
}
const moodRing = p => p.ghost ? "#b0b8c8" : p.mood >= 60 ? "#43b05c" : p.mood >= 40 ? "#f2b630" : "#e5534b";

// ---------- props ----------
function tree(x, z, s = 1, color = 0x7cc47f) {
  const g = new THREE.Group();
  g.add(cyl(0.18 * s, 0.24 * s, 1.4 * s, 0x9a6b4a, 0, 0.7 * s, 0));
  const top = ball(0.95 * s, color, 0, 1.9 * s, 0);
  g.add(top);
  g.position.set(x, 0, z);
  g.userData.top = top;
  return g;
}
function cloud(x, y, z, s = 1) {
  const g = new THREE.Group();
  [[0, 0, 0, 1], [1, -0.1, 0.2, 0.75], [-1, -0.15, 0, 0.7], [0.4, 0.4, -0.2, 0.7]].forEach(([a, b, c, r]) => {
    const m = ball(r * s, 0xffffff, a * s, b * s, c * s);
    m.castShadow = false;
    g.add(m);
  });
  g.position.set(x, y, z);
  return g;
}
function mountain(x, z, h, color = 0x9aa5b1) {
  const g = new THREE.Group();
  const m = mesh(new THREE.ConeGeometry(h * 0.7, h, 7), clay(color), 0, h / 2, 0);
  g.add(m);
  const cap = mesh(new THREE.ConeGeometry(h * 0.25, h * 0.36, 7), clay(0xffffff), 0, h * 0.83, 0);
  g.add(cap);
  g.position.set(x, 0, z);
  return g;
}

function makePerson(c) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  if (c.pet) {
    body.add(rbox(0.9, 0.5, 0.5, c.shirt, 0, 0.5, 0, 0.22));
    body.add(ball(0.32, c.shirt, 0.55, 0.85, 0));
    body.add(ball(0.12, 0x3a3340, 0.85, 0.85, 0));
    body.add(rbox(0.12, 0.3, 0.2, 0x8a5a35, 0.5, 1.15, 0.18, 0.05));
    body.add(rbox(0.12, 0.3, 0.2, 0x8a5a35, 0.5, 1.15, -0.18, 0.05));
    const tail = cyl(0.05, 0.08, 0.45, c.shirt, -0.55, 0.85, 0);
    tail.rotation.z = 0.8;
    body.add(tail);
    [[0.3, 0.2], [0.3, -0.2], [-0.3, 0.2], [-0.3, -0.2]].forEach(([x, z]) => body.add(cyl(0.08, 0.08, 0.35, c.shirt, x, 0.18, z)));
  } else {
    body.add(mesh(new THREE.CapsuleGeometry(0.34, 0.6, 6, 14), clay(c.shirt), 0, 0.78, 0));
    body.add(ball(0.32, c.skin, 0, 1.58, 0));
    body.add(ball(0.06, 0x2d2a32, 0.28, 1.63, 0.11));
    body.add(ball(0.06, 0x2d2a32, 0.28, 1.63, -0.11));
    body.add(ball(0.13, 0x3a3340, -0.05, 0.12, 0.16));
    body.add(ball(0.13, 0x3a3340, -0.05, 0.12, -0.16));
  }
  const face = sprite("😀", "#43b05c", 1.15);
  face.position.y = c.pet ? 1.85 : 2.55;
  g.add(face);
  g.userData = { body, face, faceKey: "" };
  g.scale.setScalar(1.3);
  return g;
}

// ============================================================
// Site: one building on a clay platform
// ============================================================
export function createSite(container) {
  const renderer = makeRenderer(container);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 300);
  camera.position.set(30, 22, 34);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 3, 0);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 14;
  controls.maxDistance = 70;
  controls.minPolarAngle = 0.35;
  controls.maxPolarAngle = 1.35;
  controls.autoRotate = !reduceMotion;
  controls.autoRotateSpeed = 0.35;
  fit(container, renderer, camera);
  const { hemi, sun } = addLights(scene, 22);

  const world = new THREE.Group();   // everything that shakes in a quake
  scene.add(world);

  // Platform: grass on top, see-through soil so the foundation shows, rock at the bottom.
  const grass = rbox(28, 0.8, 22, 0x9fd27a, 0, -0.4, 0, 0.35);
  world.add(grass);
  const soilMat = new THREE.MeshStandardMaterial({ color: 0xb08f80, roughness: 1, transparent: true, opacity: 0.55 });
  const soil = rbox(27.6, 4, 21.6, soilMat, 0, -2.8, 0, 0.3);
  soil.castShadow = false;
  world.add(soil);
  const rock = rbox(27.6, 1.4, 21.6, 0x8d8a94, 0, -5.5, 0, 0.3);
  world.add(rock);

  const water = mesh(new RoundedBoxGeometry(30, 1, 24, 3, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x5aa9e6, roughness: 0.3, transparent: true, opacity: 0.7 }), 0, -1.5, 0);
  water.visible = false;
  scene.add(water);

  const backdrop = new THREE.Group();
  scene.add(backdrop);
  const clouds = [cloud(-14, 15, -14, 1.6), cloud(10, 17, -18, 2), cloud(18, 13, 4, 1.3)];
  clouds.forEach(c => scene.add(c));
  const debris = new THREE.Group();
  scene.add(debris);
  for (let i = 0; i < 26; i++) {
    const d = rbox(0.35, 0.12, 0.35, [0x7cc47f, 0xe8a33d, 0xc9a37a][i % 3], 0, 0, 0, 0.05);
    d.userData = { seed: i * 1.7 };
    debris.add(d);
  }
  debris.visible = false;

  let bld = new THREE.Group(), parts = {}, level = null, gentle = false;
  world.add(bld);

  const DOOR = new THREE.Vector3(0, 0, 4.2);
  const wander = () => new THREE.Vector3((Math.random() - 0.5) * 22, 0, 5 + Math.random() * 4.5);
  let people = [];
  function spawnPeople() {
    people.forEach(p => world.remove(p.m));
    people = CAST.map(c => {
      const m = makePerson(c);
      m.position.copy(wander());
      world.add(m);
      return { c, m, state: "out", target: wander(), wait: Math.random() * 2, phase: Math.random() * 6, ghostT: 0 };
    });
  }
  spawnPeople();

  // ----- building -----
  function buildBuilding(lv, choice) {
    world.remove(bld);
    bld = new THREE.Group();
    parts = {};
    const floors = lv.floors, W = 9, D = 7, FH = 2.6;
    const lift = choice.raise ? 1.1 : 0;
    const iso = choice.iso ? 0.35 : 0;
    const base = lift + iso;
    const palette = { rocky: [0xf4b183, 0xf8cbad], prairie: [0xe57373, 0xf4a6a6], breezy: [0x80cbc4, 0xb2dfdb], shaky: [0xf5f5f5, 0xcfe3f7], mega: [0xb39ddb, 0xd1c4e9] }[lv.key];

    // Foundation
    const f = choice.found;
    const fnd = new THREE.Group();
    if (f === 0) [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => fnd.add(rbox(1.4, 0.9, 1.4, 0xb7b2a8, a * (W / 2 - 0.9), -0.45, b * (D / 2 - 0.9), 0.15)));
    if (f >= 1) fnd.add(rbox(W + 0.8, f === 1 ? 1.2 : 0.8, D + 0.8, 0xb7b2a8, 0, f === 1 ? -0.5 : -0.3, 0, 0.2));
    if (f === 2) for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b += 2) fnd.add(cyl(0.3, 0.3, 5, 0x9e9a92, a * 3.4, -3, b * 2.6));
    bld.add(fnd);
    parts.fnd = fnd;

    if (iso) for (let a = -1; a <= 1; a += 2) for (let b = -1; b <= 1; b += 2) bld.add(cyl(0.6, 0.6, iso, 0x3a3340, a * 3.6, iso / 2, b * 2.6));
    if (lift) {
      bld.add(rbox(W, lift, D, 0xd8cfc4, 0, iso + lift / 2, 0, 0.2));
      const steps = rbox(2, lift * 0.6, 1.6, 0xd8cfc4, 0, iso + lift * 0.3, D / 2 + 0.8, 0.15);
      bld.add(steps);
    }

    // Body, one rounded block per floor
    const body = new THREE.Group();
    body.position.y = base;
    bld.add(body);
    parts.body = body;
    const winMat = choice.furniture ? clay(0xffd27a, { emissive: 0xffb347, emissiveIntensity: choice.lights ? 0.55 : 0.3 }) : clay(0xbfe3f5, { roughness: 0.4 });
    parts.windows = [];
    for (let i = 0; i < floors; i++) {
      body.add(rbox(W, FH, D, palette[i % 2], 0, i * FH + FH / 2, 0, 0.45));
      for (let w = -1; w <= 1; w++) {
        if (i === 0 && w === 0) continue;
        const win = rbox(1.6, 1.2, 0.3, winMat, w * 2.9, i * FH + 1.4, D / 2 + 0.05, 0.12);
        win.userData.mat = winMat;
        body.add(win);
        parts.windows.push(win);
        if (choice.windows) body.add(rbox(1.9, 1.5, 0.2, 0xf08a3c, w * 2.9, i * FH + 1.4, D / 2 - 0.02, 0.1));
      }
      for (let w = -1; w <= 1; w += 2) {
        const win = rbox(0.3, 1.2, 1.6, winMat, W / 2 + 0.05, i * FH + 1.4, w * 1.7, 0.12);
        win.userData.mat = winMat;
        body.add(win);
        parts.windows.push(win);
      }
    }
    body.add(rbox(1.7, 2, 0.3, 0x8a5a35, 0, 1, D / 2 + 0.05, 0.15));
    const sign = sprite(lv.bico, "#fff", 1.4);
    sign.position.set(0, 2.6, D / 2 + 0.4);
    body.add(sign);

    // Braces on the sides
    if (choice.frame) {
      for (let i = 0; i < floors; i++) for (const s of [-1, 1]) {
        for (const r of [-1, 1]) {
          const b = rbox(0.22, Math.hypot(D - 1, FH) - 0.3, 0.22, 0x5c6bc0, s * (W / 2 + 0.15), i * FH + FH / 2, 0, 0.08);
          b.rotation.x = r * Math.atan2(D - 1, FH);
          body.add(b);
        }
      }
    }

    // Roof
    const roof = new THREE.Group();
    roof.position.y = floors * FH;
    body.add(roof);
    parts.roof = roof;
    roof.add(rbox(W + 0.6, 0.5, D + 0.6, 0x8d6e63, 0, 0.25, 0, 0.2));
    if (choice.roof) for (let s = -1; s <= 1; s++) roof.add(rbox(0.25, 0.62, D + 0.8, 0x3a3340, s * 3, 0.26, 0, 0.08));
    roof.add(rbox(1.6, 1, 1.4, choice.hvac ? 0x9ccc65 : 0xb0bec5, -2.8, 1, -1.6, 0.2));
    if (choice.energy) for (let s = -1; s <= 1; s++) {
      const panel = rbox(1.8, 0.12, 1.4, clay(0x2f4f8f, { roughness: 0.35 }), s * 2.1 + 0.9, 0.95, 1.2, 0.05);
      panel.rotation.x = -0.35;
      roof.add(panel);
    }

    // Yard
    if (choice.backup) bld.add(rbox(1.6, 1.1, 1.1, 0xffd23f, W / 2 + 1.8, 0.55, -2, 0.2));
    if (choice.energy) bld.add(rbox(0.8, 1.2, 0.8, 0x43b05c, W / 2 + 1.8, 0.6, 0.2, 0.2));
    if (choice.garden) {
      bld.add(rbox(4, 0.3, 1.6, 0x6d4c41, -6.5, 0.15, 5.4, 0.15));
      for (let i = 0; i < 9; i++) bld.add(ball(0.24, [0xff8fa3, 0xffd23f, 0xa259ff][i % 3], -8 + (i % 5) * 0.75, 0.45, 4.9 + Math.floor(i / 5) * 0.9));
    }
    parts.trees = [];
    if (choice.trees) [[-8, -4], [8.5, -5], [-9, 1]].forEach(([x, z]) => { const t = tree(x, z, 1.2); bld.add(t); parts.trees.push(t); });
    parts.cracks = new THREE.Group();
    body.add(parts.cracks);
    for (let i = 0; i < floors * 3; i++) {
      const cr = rbox(0.12, 1.2, 0.12, 0x3a3340, -3.6 + (i % 4) * 2.3, (i % floors) * FH + 1.2, D / 2 + 0.12, 0.04);
      cr.rotation.z = (i % 2 ? 0.6 : -0.5);
      parts.cracks.add(cr);
    }
    parts.cracks.visible = false;
    parts.puddles = new THREE.Group();
    for (let i = 0; i < 4; i++) parts.puddles.add(rbox(1.8, 0.06, 1.2, clay(0x5aa9e6, { roughness: 0.2 }), -4 + i * 2.6, 0.04, 5.2 + (i % 2), 0.03));
    parts.puddles.visible = false;
    bld.add(parts.puddles);
    parts.repair = sprite("🚧", "#f0a43a", 1.8);
    parts.repair.position.set(0, floors * FH + base + 2.6, 0);
    parts.repair.visible = false;
    bld.add(parts.repair);

    parts.doorZ = D / 2 + 0.6;
    parts.top = floors * FH + base;
    bld.userData.pop = 1;
    world.add(bld);
    DOOR.set(0, 0, parts.doorZ + (lift ? 1.4 : 0));
  }

  function setLevel(lv) {
    level = lv;
    soilMat.color.setHex(SOILS[lv.soil].color);
    backdrop.clear();
    if (lv.key === "rocky") { backdrop.add(mountain(-20, -22, 14), mountain(-6, -26, 18, 0x8f9aa6), mountain(12, -24, 12)); }
    if (lv.key === "prairie") {
      backdrop.add(rbox(10, 0.3, 6, 0xf2d27a, -18, -0.2, -18, 0.2), rbox(8, 0.3, 6, 0xe8c25a, 8, -0.2, -20, 0.2));
      const barn = rbox(5, 4, 4, 0xd9534f, 18, 2, -18, 0.3); backdrop.add(barn);
    }
    if (lv.key === "breezy") {
      backdrop.add(rbox(40, 0.4, 10, 0xf4dc9c, 0, -0.6, -18, 0.2), rbox(60, 0.3, 20, clay(0x5aa9e6, { roughness: 0.25 }), 0, -0.9, -32, 0.2));
      const palm = tree(-16, -16, 1.5, 0x4caf50); backdrop.add(palm);
    }
    if (lv.key === "shaky") {
      const v = mountain(-14, -26, 16, 0x8d6e63); v.children[1].material = clay(0xff7043); backdrop.add(v, mountain(10, -24, 10, 0xa1887f));
    }
    if (lv.key === "mega") {
      [[-18, -20, 14], [-11, -24, 20], [-3, -26, 17], [7, -24, 24], [15, -21, 12], [21, -16, 16]].forEach(([x, z, h], i) =>
        backdrop.add(rbox(5, h, 5, [0xb0bec5, 0xcfd8dc, 0x90a4ae][i % 3], x, h / 2 - 0.5, z, 0.4)));
    }
    camera.position.set(19, 12 + lv.floors * 2.5, 25);
    controls.target.set(0, 2.5 + lv.floors, 0);
  }

  // ----- run state -----
  let run = null, hazard = null, hazardT = 0, shakeAmt = 0, collapse = 0, speed = 1, bounce = 0;

  function setDesign(lv, choice) {
    buildBuilding(lv, choice);
    bounce = 1;
  }
  function setRun(S, sp = 1) { run = S; speed = sp; }
  function startHazard(ev) {
    hazard = ev; hazardT = 0;
    water.visible = ev.type === "flood";
    debris.visible = ev.type === "wind";
  }
  function endHazard() {
    hazard = null;
    debris.visible = false;
  }
  function doCollapse() { collapse = 0.001; }
  function reset() {
    run = null; hazard = null; collapse = 0; water.visible = false; debris.visible = false;
    world.position.set(0, 0, 0);
    spawnPeople();
  }

  function personTick(p, dt, t) {
    const info = run ? run.people.find(q => q.key === p.c.key) : { mood: 75, reason: "", ghost: false, pet: p.c.pet };
    const { m } = p;
    const face = moodFace(info, gentle);
    const ring = moodRing(info);
    if (m.userData.faceKey !== face + ring) { setSprite(m.userData.face, face, ring); m.userData.faceKey = face + ring; }

    if (info.ghost) {
      m.visible = true;
      if (gentle) {
        m.userData.body.scale.set(1, 0.55, 1);
        m.position.y = 0;
        return;
      }
      p.ghostT += dt;
      m.userData.body.traverse(o => { if (o.isMesh) { o.material = clay(0xf5f7ff, { transparent: true, opacity: 0.55 }); } });
      const top = (parts.top || 4) + 3;
      m.position.y = Math.min(top, m.position.y + dt * 2.5) + Math.sin(t * 2 + p.phase) * 0.3;
      m.position.x += Math.sin(t * 0.7 + p.phase) * dt * 1.2;
      m.rotation.z = Math.sin(t * 1.5 + p.phase) * 0.2;
      return;
    }

    const open = run ? run.open : true;
    const scared = info.reason === "scared";
    const fast = (scared ? 16 : 10) * (run ? Math.min(speed, 2) : 1);

    if (scared && p.state !== "flee") { p.state = "flee"; p.m.visible = true; p.target.set((Math.random() - 0.5) * 24, 0, 8 + Math.random() * 2); }
    if (!scared && p.state === "flee") p.state = "out";
    if (!open && !scared && (p.state === "toDoor" || p.state === "inside")) {
      p.state = "out"; m.visible = true; m.position.copy(DOOR); p.target.copy(wander());
    }

    if (p.state === "inside") {
      p.wait -= dt * (run ? speed : 1);
      if (p.wait <= 0) { p.state = "out"; m.visible = true; m.position.copy(DOOR); p.target.copy(wander()); }
      return;
    }

    const to = p.state === "toDoor" ? DOOR : p.target;
    const d = new THREE.Vector3(to.x - m.position.x, 0, to.z - m.position.z);
    const dist = d.length();
    if (dist > 0.2) {
      d.normalize();
      m.position.x += d.x * Math.min(dist, fast * dt);
      m.position.z += d.z * Math.min(dist, fast * dt);
      m.rotation.y = Math.atan2(-d.z, d.x);
      p.phase += dt * 22;
      const hop = Math.abs(Math.sin(p.phase));
      m.position.y = hop * 0.55;
      const sq = 1 + (hop < 0.2 ? -0.18 : 0.08);
      m.userData.body.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    } else {
      m.position.y = 0;
      const sad = info.mood < 40;
      p.phase += dt * (sad ? 2 : 5);
      const s = 1 + Math.sin(p.phase) * (scared ? 0.12 : 0.04);
      m.userData.body.scale.set(1, s, 1);
      if (scared) m.position.x += Math.sin(t * 50) * 0.05;
      p.wait -= dt;
      if (p.wait <= 0) {
        if (p.state === "toDoor") { p.state = "inside"; m.visible = false; p.wait = 1.5 + Math.random() * 2.5; }
        else if (open && !scared) { p.state = "toDoor"; }
        else { p.target.copy(wander()); p.wait = 0.6 + Math.random(); }
        if (p.state === "out") p.wait = 0.5 + Math.random();
      }
      if (p.state === "toDoor" && dist <= 0.2) { p.state = "inside"; m.visible = false; p.wait = 1.5 + Math.random() * 2.5; }
    }
  }

  loop(container, renderer, (dt, t) => {
    // Damage looks, from the live run
    if (run && parts.body) {
      const broken = new Set(run.broken.map(b => b.part));
      parts.cracks.visible = broken.has("cracks") || broken.has("frame");
      parts.puddles.visible = broken.has("floor") || (hazard && hazard.type === "flood");
      parts.windows.forEach(w => w.material = broken.has("windows") ? clay(0x4a4a55) : w.userData.mat);
      parts.roof.rotation.z = broken.has("roof") ? 0.18 + Math.sin(t * 8) * (hazard && hazard.type === "wind" ? 0.15 : 0.02) : 0;
      parts.roof.position.x = broken.has("roof") ? 0.8 : 0;
      const lean = (broken.has("found") ? 0.05 : 0) + (broken.has("frame") ? 0.04 : 0);
      parts.body.rotation.z += (lean - parts.body.rotation.z) * 0.05;
      parts.repair.visible = !!run.repairing;
      if (run.repairing) { parts.repair.position.y = parts.top + 2.6 + Math.abs(Math.sin(t * 9)) * 0.8; }
      parts.windows.forEach(w => { if (w.material.emissive) w.material.emissiveIntensity = run.outage > 0 && !run.stats.power ? 0 : 0.45; });
    }

    // Design "boing" when a choice changes
    if (bounce > 0) {
      bounce = Math.max(0, bounce - dt * 2.2);
      const s = 1 + Math.sin(bounce * 14) * bounce * 0.12;
      bld.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
    }

    // Exaggerated hazards
    world.position.set(0, 0, 0);
    if (parts.body) parts.body.rotation.x = 0;
    if (hazard) {
      hazardT += dt;
      const P = hazard.power;
      if (hazard.type === "quake") {
        world.position.x = Math.sin(t * 45) * 0.18 * P;
        world.position.z = Math.cos(t * 37) * 0.12 * P;
        if (parts.body) parts.body.rotation.z = Math.sin(t * 30) * 0.03 * Math.max(0, hazard.over + 1);
        shakeAmt = 0.25 * P;
      }
      if (hazard.type === "wind") {
        if (parts.body) parts.body.rotation.x = -0.03 * P - Math.max(0, hazard.over) * 0.04 + Math.sin(t * 7) * 0.02 * P;
        debris.children.forEach((d, i) => {
          const k = (t * (8 + i % 5) * 1.5 + d.userData.seed * 7) % 44;
          d.position.set(Math.sin(d.userData.seed) * 12, 1 + (i % 7) * 1.4 + Math.sin(t * 6 + i) * 0.6, -22 + k);
          d.rotation.set(t * 9 + i, t * 7, 0);
        });
        (parts.trees || []).forEach(tr => tr.rotation.x = -0.25 + Math.sin(t * 9) * 0.1);
        clouds.forEach(c => c.position.z += dt * 12);
        shakeAmt = 0.05 * P;
      }
      if (hazard.type === "flood") {
        water.position.y = Math.min(-0.6 + hazard.power * 0.55, water.position.y + dt * 1.5);
        water.position.y += Math.sin(t * 3) * 0.01;
      }
      if (hazard.type === "heat") {
        sun.color.setHex(0xffa860);
        sun.intensity = 3.2;
      }
    } else {
      water.position.y = Math.max(-1.5, water.position.y - dt * 1.5);
      if (water.position.y <= -1.49) water.visible = false;
      sun.color.setHex(0xfff1d6);
      sun.intensity = 2.2;
      (parts.trees || []).forEach(tr => tr.rotation.x *= 0.9);
    }
    clouds.forEach((c, i) => { c.position.x += dt * (0.3 + i * 0.1); if (c.position.x > 30) c.position.x = -30; if (c.position.z > 25) c.position.z = -18; });

    if (collapse > 0 && parts.body) {
      collapse = Math.min(1, collapse + dt * 1.2);
      const e = 1 - Math.pow(1 - collapse, 3);
      parts.body.scale.set(1 + e * 0.35, 1 - e * 0.78, 1 + e * 0.35);
      parts.body.rotation.z = e * 0.25;
      shakeAmt = Math.max(shakeAmt, (1 - collapse) * 1.2);
    }

    people.forEach(p => personTick(p, dt, t));
    const idle = 1 + Math.sin(t * 2) * 0.004;
    if (!bounce && !collapse) bld.scale.set(1, idle, 1);

    controls.update();
    if (shakeAmt > 0 && !reduceMotion) {
      const o = new THREE.Vector3((Math.random() - 0.5) * shakeAmt, (Math.random() - 0.5) * shakeAmt, 0);
      camera.position.add(o);
      renderer.render(scene, camera);
      camera.position.sub(o);
      shakeAmt *= 0.9;
    } else renderer.render(scene, camera);
  });

  return {
    setLevel, setDesign, setRun, startHazard, endHazard, doCollapse, reset,
    setGentle: g => { gentle = g; people.forEach(p => p.m.userData.faceKey = ""); },
    setSpin: on => { controls.autoRotate = on && !reduceMotion; },
  };
}

// ============================================================
// Map: a clay island with one pin per site
// ============================================================
export function createMap(container, levels, onPick) {
  const renderer = makeRenderer(container);
  const scene = new THREE.Scene();
  const VIEW = 50;
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
  camera.position.set(0, 60, 42);
  camera.zoom = 1;
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableRotate = false;
  controls.enableDamping = true;
  controls.screenSpacePanning = false;
  controls.minZoom = 0.8;
  controls.maxZoom = 2.4;
  controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
  controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN };
  controls.target.set(0, 0, 2);
  fit(container, renderer, camera, VIEW);
  addLights(scene, 34);

  const sea = mesh(new THREE.CircleGeometry(140, 48), clay(0x7cc6ee, { roughness: 0.4 }), 0, -1.2, 0);
  sea.rotation.x = -Math.PI / 2;
  sea.castShadow = false;
  scene.add(sea);
  const island = new THREE.Group();
  scene.add(island);
  const land = mesh(new THREE.CylinderGeometry(25, 26.5, 2.4, 48), clay(0x9fd27a), 0, -0.9, 2);
  land.scale.z = 0.85;
  island.add(land);
  const beach = mesh(new THREE.CylinderGeometry(26.6, 27.6, 1.2, 48), clay(0xf4dc9c), 0, -1.4, 2);
  beach.scale.z = 0.86;
  island.add(beach);
  island.add(mountain(-20, 0, 7), mountain(-17, -4, 9, 0x8f9aa6), mountain(17, -7, 8, 0x8d6e63));
  [[-8, 2], [-19, 13], [3, 17], [14, 16], [-11, -9], [18, 4], [6, -3], [-2, 6], [20, -1]].forEach(([x, z], i) => island.add(tree(x, z, 0.9 + (i % 3) * 0.15)));
  const clouds = [cloud(-26, 12, -6, 2), cloud(22, 14, 18, 1.6), cloud(4, 16, -16, 2.2)];
  clouds.forEach(c => scene.add(c));

  // Dotted path between pins
  for (let i = 0; i < levels.length - 1; i++) {
    const [ax, az] = levels[i].map, [bx, bz] = levels[i + 1].map;
    for (let k = 1; k < 8; k++) {
      const u = k / 8;
      island.add(ball(0.32, 0xfff3c4, ax + (bx - ax) * u, 0.35, az + (bz - az) * u + Math.sin(u * Math.PI) * 2));
    }
  }

  const pins = levels.map((lv, i) => {
    const g = new THREE.Group();
    g.position.set(lv.map[0], 0, lv.map[1]);
    const pad = cyl(3.2, 3.4, 0.8, 0xf6f0e3, 0, 0.4, 0);
    g.add(pad);
    const house = new THREE.Group();
    g.add(house);
    const colors = [0xf4b183, 0xe57373, 0x80cbc4, 0xf5f5f5, 0xb39ddb];
    for (let f = 0; f < lv.floors; f++) house.add(rbox(3, 1.3, 2.4, colors[i], 0, 1.45 + f * 1.3, 0, 0.3));
    house.add(rbox(3.4, 0.35, 2.8, 0x8d6e63, 0, 0.95 + lv.floors * 1.3, 0, 0.12));
    const icon = sprite(lv.ico, "#fff", 2.4);
    icon.position.set(0, 3.6 + lv.floors * 1.3, 0);
    g.add(icon);
    const label = labelSprite(`${i + 1}. ${lv.name}`);
    label.position.set(0, 0.6, 3.6);
    g.add(label);
    const badge = sprite("🔒", "#3a3340", 1.6);
    badge.position.set(2.4, 2.6 + lv.floors * 1.3, 0);
    g.add(badge);
    island.add(g);
    g.userData = { index: i, house, badge, icon };
    return g;
  });

  const token = sprite("👷", "#ffd23f", 2.2);
  scene.add(token);

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let downAt = null, hover = -1, current = 0;
  function pick(e) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pins, true)[0];
    if (!hit) return -1;
    let o = hit.object;
    while (o && o.userData.index === undefined) o = o.parent;
    return o ? o.userData.index : -1;
  }
  renderer.domElement.addEventListener("pointerdown", e => { downAt = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener("pointerup", e => {
    if (downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) < 8) {
      const i = pick(e);
      if (i >= 0) onPick(i);
    }
    downAt = null;
  });
  renderer.domElement.addEventListener("pointermove", e => {
    hover = pick(e);
    renderer.domElement.style.cursor = hover >= 0 ? "pointer" : "grab";
  });

  function setProgress(states) {
    // states[i] = { locked, grade }
    states.forEach((s, i) => {
      const { badge, house } = pins[i].userData;
      badge.visible = s.locked || !!s.grade;
      if (s.locked) setSprite(badge, "🔒", "#3a3340");
      else if (s.grade) setSprite(badge, gradeEmoji(s.grade), "#43b05c");
      house.children.forEach(m => { m.material = s.locked ? clay(0xc9c4cc) : m.userData.mat; });
    });
    current = Math.max(0, states.reduce((n, s, i) => (!s.locked ? i : n), 0));
  }
  pins.forEach(p => p.userData.house.children.forEach(m => { m.userData.mat = m.material; }));

  function focus(i) {
    const [x, z] = levels[i].map;
    controls.target.set(x, 0, z);
    camera.position.set(x, 60, z + 42);
  }

  loop(container, renderer, (dt, t) => {
    pins.forEach((p, i) => {
      const h = i === hover ? 1.15 : 1;
      const s = p.scale.x + (h - p.scale.x) * 0.2;
      p.scale.set(s, s, s);
      p.userData.icon.position.y = 3.6 + levels[i].floors * 1.3 + Math.sin(t * 2.5 + i) * 0.3;
    });
    const [cx, cz] = levels[current].map;
    token.position.set(cx - 3, 3 + Math.abs(Math.sin(t * 4)) * 1.2, cz + 1.5);
    clouds.forEach((c, i) => { c.position.x += dt * (0.6 + i * 0.2); if (c.position.x > 40) c.position.x = -40; });
    // Keep the island on screen while panning
    const T = controls.target;
    const cx2 = Math.max(-20, Math.min(20, T.x)), cz2 = Math.max(-14, Math.min(18, T.z));
    if (cx2 !== T.x || cz2 !== T.z) { camera.position.x += cx2 - T.x; camera.position.z += cz2 - T.z; T.set(cx2, T.y, cz2); }
    controls.update();
    renderer.render(scene, camera);
  });

  return { setProgress, focus };
}

const gradeEmoji = g => (g.startsWith("A") ? "🏆" : g === "B" ? "⭐" : "✅");
