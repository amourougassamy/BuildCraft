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
const geoCache = new Map();
function rboxGeo(w, h, d, r) {
  const key = `${w.toFixed(2)},${h.toFixed(2)},${d.toFixed(2)},${r.toFixed(2)}`;
  if (!geoCache.has(key)) geoCache.set(key, new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2)));
  return geoCache.get(key);
}
const rbox = (w, h, d, color, x, y, z, r = 0.25) =>
  mesh(rboxGeo(w, h, d, r), typeof color === "number" ? clay(color) : color, x, y, z);
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

// Rooftop heating and cooling unit. Origin at the bottom centre, so it sits on whatever it's placed on.
const HVAC_H = 1.25;
function hvacUnit(heatPump) {
  const g = new THREE.Group();
  g.add(rbox(1.8, 0.16, 1.5, 0x8a8f96, 0, 0.08, 0, 0.05));                      // curb
  g.add(rbox(1.6, 0.9, 1.3, heatPump ? 0x9ccc65 : 0xb0bec5, 0, 0.61, 0, 0.18)); // cabinet
  g.add(rbox(0.06, 0.55, 1.0, 0x5f6670, 0.81, 0.6, 0, 0.03));                    // side grille
  g.add(cyl(0.42, 0.42, 0.12, 0x3a3340, 0.25, 1.1, 0));                          // fan ring
  const fan = new THREE.Group();
  fan.add(rbox(0.72, 0.04, 0.13, 0x2d2a32, 0, 0, 0, 0.02), rbox(0.13, 0.04, 0.72, 0x2d2a32, 0, 0, 0, 0.02));
  fan.position.set(0.25, 1.18, 0);
  g.add(fan);
  if (heatPump) g.add(ball(0.15, 0x43b05c, -0.5, 1.12, 0.42));                   // green "eco" badge
  g.userData.fan = fan;
  return g;
}

// Clay helicopter that flies rooftop units in (PLAN.md task S5). Nose points along +x.
function makeHeli() {
  const g = new THREE.Group();
  const body = ball(0.85, 0xffd23f, 0, 0, 0);
  body.scale.set(1.6, 1, 1);
  g.add(body);
  const glass = mesh(new THREE.SphereGeometry(0.6, 14, 10), clay(0x9fd9f6, { roughness: 0.2 }), 0.75, 0.2, 0);
  glass.scale.set(1, 0.8, 0.95);
  g.add(glass);
  g.add(rbox(2.4, 0.24, 0.24, 0xffd23f, -2.1, 0.25, 0, 0.1));  // tail boom
  g.add(rbox(0.45, 0.8, 0.1, 0xe8655a, -3.25, 0.6, 0, 0.05));  // fin
  const tail = new THREE.Group();
  tail.add(rbox(0.06, 0.9, 0.12, 0x3a3340, 0, 0, 0, 0.02));
  tail.position.set(-3.25, 0.6, 0.14);
  g.add(tail);
  for (const z of [0.55, -0.55]) {
    g.add(rbox(2, 0.08, 0.08, 0x3a3340, 0, -0.95, z, 0.03));
    g.add(rbox(0.07, 0.35, 0.07, 0x3a3340, 0.5, -0.78, z, 0.02), rbox(0.07, 0.35, 0.07, 0x3a3340, -0.5, -0.78, z, 0.02));
  }
  g.add(cyl(0.1, 0.1, 0.35, 0x3a3340, 0, 1.0, 0));            // rotor mast
  const rotor = new THREE.Group();
  rotor.add(rbox(6, 0.05, 0.28, 0x3a3340, 0, 0, 0, 0.02), rbox(0.28, 0.05, 6, 0x3a3340, 0, 0, 0, 0.02));
  rotor.position.y = 1.2;
  g.add(rotor);
  g.userData = { rotor, tail };
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

// ---------- soil profile (PLAN.md M3) ----------
// The ground under the lot as stacked see-through slabs, top layer first, so the cut face shows
// each layer and the foundation still shows through. The last layer runs down to `bottom`.
function soilProfile(layers, w, d, top, bottom) {
  const g = new THREE.Group();
  let y = top;
  layers.forEach((l, i) => {
    const h = i === layers.length - 1 ? y - bottom : Math.min(l.h, y - bottom);
    if (h < 0.05) return;
    const mat = new THREE.MeshStandardMaterial({ color: l.color, roughness: 1, transparent: true, opacity: l.rock ? 0.65 : 0.55 });
    const s = rbox(w, h, d, mat, 0, y - h / 2, 0, 0.3);
    s.castShadow = false;
    g.add(s);
    y -= h;
  });
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

  // Fog fades the far ground into the stage's sky (the CSS gradient behind the see-through canvas),
  // so the edge of the world never shows (PLAN.md B4). three.js mixes fog in screen colours,
  // so this hex is simply the top of the .stage gradient.
  scene.fog = new THREE.Fog(0xd9eefe, 70, 220);

  // The lot: grass on top, then the site's soil layers, see-through so the foundation shows.
  const LOT_W = 28, LOT_D = 22, DIG = 6.2; // DIG: from the grass down to the bottom of the rock
  const grass = rbox(LOT_W, 0.8, LOT_D, 0x9fd27a, 0, -0.4, 0, 0.35);
  world.add(grass);
  const newProfile = soil => soilProfile(SOILS[soil].layers, LOT_W - 0.4, LOT_D - 0.4, -0.8, -DIG);
  let profile = newProfile("clay"); // swapped per site in setLevel
  world.add(profile);

  // Ground: one big grass field around the lot that runs out into the fog. It has a hole for the
  // lot plus a sloped "cutaway" trench on the lot's left and right, so you can still look into the
  // see-through soil and watch the foundation reach down.
  const TRENCH = 9, PIT = 1.5;                       // trench width at the top / flat floor at the bottom
  const HOLE_X = LOT_W / 2 + TRENCH, HOLE_Z = LOT_D / 2, FOOT_X = LOT_W / 2 + PIT;
  const field = new THREE.Shape().absarc(0, 0, 400, 0, Math.PI * 2);
  field.holes.push(new THREE.Path([[-HOLE_X, -HOLE_Z], [HOLE_X, -HOLE_Z], [HOLE_X, HOLE_Z], [-HOLE_X, HOLE_Z]].map(([x, y]) => new THREE.Vector2(x, y))));
  const fieldGeo = new THREE.ShapeGeometry(field, 48).rotateX(-Math.PI / 2);
  const ground = mesh(fieldGeo, clay(0x9fd27a));
  ground.castShadow = false;
  world.add(ground);
  const cutMat = new THREE.MeshStandardMaterial({ color: 0x9a7b62, roughness: 1, side: THREE.DoubleSide }); // trench walls, tinted per soil
  const bankGeo = new THREE.PlaneGeometry(Math.hypot(TRENCH - PIT, DIG), LOT_D).rotateX(-Math.PI / 2);
  for (const s of [1, -1]) {
    const bank = mesh(bankGeo, cutMat, s * (FOOT_X + (TRENCH - PIT) / 2), -DIG / 2, 0);
    bank.rotation.z = s * Math.atan2(DIG, TRENCH - PIT);
    bank.castShadow = false;
    world.add(bank);
  }
  const endGeo = new THREE.ShapeGeometry(new THREE.Shape([[-HOLE_X, 0], [HOLE_X, 0], [FOOT_X, -DIG], [-FOOT_X, -DIG]].map(([x, y]) => new THREE.Vector2(x, y))));
  for (const z of [-HOLE_Z, HOLE_Z]) { const e = mesh(endGeo, cutMat, 0, 0, z); e.castShadow = false; world.add(e); }
  const pitFloor = mesh(new THREE.PlaneGeometry(FOOT_X * 2, LOT_D).rotateX(-Math.PI / 2), clay(0x8d8a94), 0, -DIG - 0.02, 0);
  pitFloor.castShadow = false;
  world.add(pitFloor);

  // Flood water: a wide flat sheet, so a flood fills the trenches first, then covers the whole
  // neighbourhood with no edge in sight. The surface sits 0.5 above water.position.y.
  const water = mesh(new THREE.CircleGeometry(380, 48).rotateX(-Math.PI / 2).translate(0, 0.5, 0),
    new THREE.MeshStandardMaterial({ color: 0x5aa9e6, roughness: 0.3, transparent: true, opacity: 0.7 }), 0, -1.5, 0);
  water.castShadow = false;
  water.visible = false;
  scene.add(water);

  const backdrop = new THREE.Group();
  scene.add(backdrop);
  // Breezy Bay's beach and sea are flat sheets that run out to the foggy horizon.
  const sandGeo = new THREE.PlaneGeometry(800, 12).rotateX(-Math.PI / 2);
  const seaGeo = new THREE.PlaneGeometry(800, 400).rotateX(-Math.PI / 2);
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
  // Built like Tom's tycoon building: floor slabs, corner columns, wall panels around
  // see-through glass, and real furniture inside, so you can watch people through the windows.
  const W = 10, D = 7.5, FH = 3, SLAB = 0.3;
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xcdeeff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.25, depthWrite: false });
  const brokenGlass = clay(0x55525e);
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xffe2a0, emissiveIntensity: 1, roughness: 0.6 });
  let wallMat = null, peek = false;

  // One wall, built along local x and facing local +z: sill, header and piers around each window.
  function facade(len, bays, floors, opts = {}) {
    const g = new THREE.Group(), bw = len / bays, hh = FH - SLAB;
    const ww = bw * 0.74, wh = hh * 0.62, sill = hh * 0.2, pier = (bw - ww) / 2;
    for (let f = 0; f < floors; f++) {
      const y0 = f * FH + SLAB;
      for (let b = 0; b < bays; b++) {
        const u = -len / 2 + bw * (b + 0.5);
        const door = opts.door && f === 0 && b === Math.floor(bays / 2);
        const top = hh - sill - wh;
        if (door) {
          const dh = 2.2, dw = 1.8;
          g.add(rbox(bw, hh - dh, 0.3, wallMat, u, y0 + dh + (hh - dh) / 2, 0, 0.06));
          g.add(rbox((bw - dw) / 2, dh, 0.3, wallMat, u - dw / 2 - (bw - dw) / 4, y0 + dh / 2, 0, 0.06));
          g.add(rbox((bw - dw) / 2, dh, 0.3, wallMat, u + dw / 2 + (bw - dw) / 4, y0 + dh / 2, 0, 0.06));
          const leaf = rbox(0.9, dh - 0.1, 0.1, 0x8a5a35, u - dw / 2 + 0.1, y0 + dh / 2, 0.4, 0.04);
          leaf.rotation.y = -1.1;
          g.add(leaf);
          continue;
        }
        g.add(rbox(bw, sill, 0.3, wallMat, u, y0 + sill / 2, 0, 0.06));
        g.add(rbox(bw, top, 0.3, wallMat, u, y0 + sill + wh + top / 2, 0, 0.06));
        g.add(rbox(pier, wh, 0.3, wallMat, u - ww / 2 - pier / 2, y0 + sill + wh / 2, 0, 0.04));
        g.add(rbox(pier, wh, 0.3, wallMat, u + ww / 2 + pier / 2, y0 + sill + wh / 2, 0, 0.04));
        const glass = new THREE.Mesh(new THREE.BoxGeometry(ww, wh, 0.06), glassMat);
        glass.position.set(u, y0 + sill + wh / 2, 0);
        glass.renderOrder = 2;
        g.add(glass);
        parts.glass.push(glass);
        if (opts.storm) {
          const fr = 0xf08a3c;
          g.add(rbox(ww + 0.2, 0.14, 0.16, fr, u, y0 + sill, 0.16, 0.05), rbox(ww + 0.2, 0.14, 0.16, fr, u, y0 + sill + wh, 0.16, 0.05),
            rbox(0.14, wh, 0.16, fr, u - ww / 2, y0 + sill + wh / 2, 0.16, 0.05), rbox(0.14, wh, 0.16, fr, u + ww / 2, y0 + sill + wh / 2, 0.16, 0.05));
        }
        if (opts.brace) {
          const diag = Math.hypot(bw - 0.3, hh - 0.2), ang = Math.atan2(hh - 0.2, bw - 0.3);
          for (const s of [1, -1]) {
            const br = rbox(diag, 0.2, 0.2, 0xc0392b, u, y0 + hh / 2, 0.3, 0.06);
            br.rotation.z = s * ang;
            g.add(br);
          }
        }
      }
    }
    return g;
  }

  // ----- furniture -----
  function shelf(x, z, rotY) {
    const g = new THREE.Group();
    g.add(rbox(1.8, 2, 0.5, 0x8d6e63, 0, 1, 0, 0.06));
    for (let r = 0; r < 3; r++) for (let k = 0; k < 6; k++)
      g.add(rbox(0.22, 0.42, 0.36, [0xe8655a, 0x5b9bd5, 0xffd23f, 0x5cb85c, 0xa77bd1][(r + k) % 5], -0.65 + k * 0.26, 0.35 + r * 0.6, 0.06, 0.03));
    g.position.set(x, 0, z);
    g.rotation.order = "YXZ"; // so tipping falls forward, whichever wall the shelf stands on
    g.rotation.y = rotY;
    parts.shelves.push(g);
    return g;
  }
  function table(x, z, chairs = 2) {
    const g = new THREE.Group();
    g.add(rbox(1.6, 0.12, 0.9, 0xc69c6d, 0, 0.78, 0, 0.04));
    [[-0.65, -0.35], [0.65, -0.35], [-0.65, 0.35], [0.65, 0.35]].forEach(([a, b]) => g.add(rbox(0.1, 0.75, 0.1, 0x8d6e63, a, 0.38, b, 0.03)));
    for (let c = 0; c < chairs; c++) {
      const s = c % 2 ? 1 : -1;
      g.add(rbox(0.55, 0.5, 0.5, [0xff8fa3, 0x5b9bd5, 0xffd23f, 0x5cb85c][c % 4], (c > 1 ? 0.45 : -0.45), 0.25, s * 0.8, 0.12));
    }
    g.position.set(x, 0, z);
    return g;
  }
  const plant = (x, z) => { const g = new THREE.Group(); g.add(cyl(0.25, 0.2, 0.45, 0xd9825b, 0, 0.22, 0), ball(0.42, 0x6cc070, 0, 0.75, 0)); g.position.set(x, 0, z); return g; };
  const rug = (x, z, w, d) => rbox(w, 0.04, d, 0xf28b82, x, 0.02, z, 0.02);
  function bed(x, z, color) {
    const g = new THREE.Group();
    g.add(rbox(1.1, 0.5, 2.1, 0xf5f5f5, 0, 0.25, 0, 0.1), rbox(1.12, 0.12, 1.4, color, 0, 0.55, 0.3, 0.06), rbox(0.8, 0.18, 0.4, 0xffffff, 0, 0.6, -0.75, 0.08));
    g.position.set(x, 0, z);
    return g;
  }
  function tank(x, z) {
    const g = new THREE.Group();
    g.add(rbox(2.4, 0.8, 0.9, 0x5d6d7e, 0, 0.4, 0, 0.06));
    const w = mesh(new THREE.BoxGeometry(2.3, 1.5, 0.8), new THREE.MeshStandardMaterial({ color: 0x4fb3e8, transparent: true, opacity: 0.5, roughness: 0.1 }), 0, 1.55, 0);
    w.castShadow = false;
    g.add(w);
    for (let i = 0; i < 4; i++) g.add(ball(0.13, [0xff8c42, 0xffd23f, 0xff6f91][i % 3], -0.8 + i * 0.5, 1.2 + (i % 2) * 0.5, 0));
    g.position.set(x, 0, z);
    return g;
  }

  function furnish(key, f) {
    const g = new THREE.Group(), backZ = -D / 2 + 0.6;
    g.add(rug(0, 0.3, 5, 2.6), plant(W / 2 - 0.8, D / 2 - 0.9), plant(-W / 2 + 0.8, D / 2 - 0.9));
    if (key === "rocky") g.add(shelf(-3, backZ, 0), shelf(0, backZ, 0), shelf(3, backZ, 0), table(-2.4, 0.9, 4), table(2.4, 0.9, 4));
    if (key === "prairie") {
      g.add(rbox(4, 1.5, 0.1, 0x2e5e3e, 0, 1.6, -D / 2 + 0.3, 0.04), shelf(-W / 2 + 0.6, -1.4, Math.PI / 2));
      for (let r = 0; r < 2; r++) for (let c = -1; c <= 1; c++) g.add(table(c * 2.6, -0.6 + r * 1.9, 1));
    }
    if (key === "breezy") g.add(tank(-2.6, backZ + 0.2), tank(2.6, backZ + 0.2), shelf(-W / 2 + 0.6, 0.8, Math.PI / 2), table(0, 1, 2));
    if (key === "shaky") {
      g.add(bed(-3, -1.6, 0x81c995), bed(-0.6, -1.6, 0x81c995), bed(1.8, -1.6, 0x81c995), shelf(W / 2 - 0.6, 0.8, -Math.PI / 2));
      g.add(rbox(0.9, 0.9, 0.08, 0xffffff, 3.9, 2, -D / 2 + 0.25, 0.04), rbox(0.6, 0.15, 0.1, 0xe53935, 3.9, 2, -D / 2 + 0.31, 0.03), rbox(0.15, 0.6, 0.1, 0xe53935, 3.9, 2, -D / 2 + 0.31, 0.03));
    }
    if (key === "mega") {
      g.add(rbox(2.6, 0.6, 0.9, 0x5b9bd5, -2.6, 0.3, 0.6, 0.25), rbox(2.6, 0.7, 0.3, 0x5b9bd5, -2.6, 0.6, 1.0, 0.12));
      g.add(rbox(1.8, 1, 0.1, 0x2d2a32, -2.6, 1.4, -D / 2 + 0.35, 0.04), bed(2.8, -1.4, f % 2 ? 0xffd23f : 0xa77bd1), shelf(0.2, -D / 2 + 0.6, 0));
    }
    g.position.y = f * FH + SLAB;
    return g;
  }

  function buildBuilding(lv, choice) {
    world.remove(bld);
    bld = new THREE.Group();
    parts = { glass: [], shelves: [], slots: [], led: !!choice.lights };
    const floors = lv.floors;
    const lift = choice.raise ? 1.1 : 0;
    const iso = choice.iso ? 0.35 : 0;
    const base = lift + iso;
    const palette = { rocky: [0xf4b183, 0xe08e5c], prairie: [0xe57373, 0xc94f4f], breezy: [0x80cbc4, 0x4f9f97], shaky: [0xf2f2f2, 0x9fc3e8], mega: [0xb39ddb, 0x8a72c0] }[lv.key];
    wallMat = new THREE.MeshStandardMaterial({ color: palette[0], roughness: 0.9, transparent: peek, opacity: peek ? 0.15 : 1 });

    // Foundation (shows through the see-through soil)
    const f = choice.found;
    const fnd = new THREE.Group();
    if (f === 0) [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1]].forEach(([a, b]) => fnd.add(rbox(1.4, 0.9, 1.4, 0xb7b2a8, a * (W / 2 - 0.6), -0.45, b * (D / 2 - 0.6), 0.15)));
    if (f >= 1) fnd.add(rbox(W + 0.8, f === 1 ? 1.2 : 0.8, D + 0.8, 0xb7b2a8, 0, f === 1 ? -0.5 : -0.3, 0, 0.2));
    if (f === 2) for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b += 2) fnd.add(cyl(0.3, 0.3, 5, 0x9e9a92, a * 3.8, -3, b * 2.8));
    bld.add(fnd);

    if (iso) for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b += 2) bld.add(cyl(0.55, 0.55, iso, 0x3a3340, a * 4, iso / 2, b * 3));
    if (lift) {
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) bld.add(rbox(0.6, lift, 0.6, 0xd8cfc4, a * (W / 2 - 0.3), iso + lift / 2, b * (D / 2 - 0.3), 0.1));
      bld.add(rbox(2, lift * 0.55, 1.6, 0xd8cfc4, 0, iso + lift * 0.27, D / 2 + 0.9, 0.12));
    }

    const body = new THREE.Group();
    body.position.y = base;
    bld.add(body);
    parts.body = body;

    // Floor slabs, interior floors, corner columns, ceiling lights, fire sprinklers
    const H = floors * FH, sprZ = -1;
    for (let i = 0; i < floors; i++) {
      body.add(rbox(W + 0.4, SLAB, D + 0.4, palette[1], 0, i * FH + SLAB / 2, 0, 0.08));
      body.add(rbox(W - 0.4, 0.04, D - 0.4, 0xe8c9a0, 0, i * FH + SLAB + 0.02, 0, 0.02));
      body.add(furnish(lv.key, i));
      for (const x of [-2.5, 2.5]) {
        const l = rbox(1.6, 0.08, 0.6, lightMat, x, (i + 1) * FH - 0.04, 0, 0.03);
        l.castShadow = false;
        body.add(l);
      }
      // A red water pipe under the ceiling, with little heads that spray when it gets hot
      if (choice.sprinklers) {
        const y = (i + 1) * FH - 0.16;
        body.add(rbox(W - 1, 0.12, 0.12, 0xe53935, 0.05, y, sprZ, 0.06));
        for (const x of [-3.6, -1.2, 1.2, 3.6]) body.add(rbox(0.06, 0.18, 0.06, 0xe53935, x, y - 0.12, sprZ, 0.03), ball(0.08, 0xffd23f, x, y - 0.24, sprZ));
      }
      [[-3, 1.4], [3, 1.4], [-1.2, -1.2], [1.4, 2.2]].forEach(([x, z]) => parts.slots.push(new THREE.Vector3(x, base + i * FH + SLAB, z)));
    }
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) body.add(rbox(0.45, H, 0.45, palette[1], a * W / 2, H / 2, b * D / 2, 0.1));
    if (choice.sprinklers) body.add(cyl(0.08, 0.08, H - SLAB, 0xe53935, W / 2 - 0.45, (H + SLAB) / 2, sprZ)); // riser feeds every floor

    // Four walls
    const front = facade(W, 3, floors, { door: true, storm: !!choice.windows });
    front.position.z = D / 2;
    const back = facade(W, 3, floors, { storm: !!choice.windows });
    back.position.z = -D / 2; back.rotation.y = Math.PI;
    const right = facade(D, 2, floors, { storm: !!choice.windows, brace: !!choice.frame });
    right.position.x = W / 2; right.rotation.y = Math.PI / 2;
    const left = facade(D, 2, floors, { storm: !!choice.windows, brace: !!choice.frame });
    left.position.x = -W / 2; left.rotation.y = -Math.PI / 2;
    body.add(front, back, right, left);
    parts.walls = [front, back, right, left];

    const sign = sprite(lv.bico, "#fff", 1.3);
    sign.position.set(0, 2.9, D / 2 + 0.5);
    body.add(sign);

    // Roof
    const roof = new THREE.Group();
    roof.position.y = H;
    body.add(roof);
    parts.roof = roof;
    roof.add(rbox(W + 0.4, SLAB + 0.1, D + 0.4, 0x8d6e63, 0, 0.2, 0, 0.08));
    roof.add(rbox(W + 0.4, 0.6, 0.25, palette[1], 0, 0.6, D / 2 + 0.1, 0.08), rbox(W + 0.4, 0.6, 0.25, palette[1], 0, 0.6, -D / 2 - 0.1, 0.08),
      rbox(0.25, 0.6, D + 0.4, palette[1], W / 2 + 0.1, 0.6, 0, 0.08), rbox(0.25, 0.6, D + 0.4, palette[1], -W / 2 - 0.1, 0.6, 0, 0.08));
    if (choice.roof) for (let s = -1; s <= 1; s++) roof.add(rbox(0.25, 0.5, D + 0.8, 0x3a3340, s * 3.2, 0.35, 0, 0.08));
    placeUnit(shownHvac); // the unit on the roof is whatever the helicopter last delivered
    if (choice.energy) for (let s = -1; s <= 1; s++) {
      const panel = rbox(1.8, 0.12, 1.4, clay(0x2f4f8f, { roughness: 0.35 }), s * 2.1 + 1, 0.9, 1.4, 0.05);
      panel.rotation.x = -0.35;
      roof.add(panel);
    }

    // Yard
    if (choice.backup) bld.add(rbox(1.6, 1.1, 1.1, 0xffd23f, W / 2 + 1.8, 0.55, -2, 0.2));
    if (choice.energy) bld.add(rbox(0.8, 1.2, 0.8, 0x43b05c, W / 2 + 1.8, 0.6, 0.2, 0.2));
    if (choice.garden) {
      bld.add(rbox(4, 0.3, 1.6, 0x6d4c41, -7.5, 0.15, 5.6, 0.15));
      for (let i = 0; i < 9; i++) bld.add(ball(0.24, [0xff8fa3, 0xffd23f, 0xa259ff][i % 3], -9 + (i % 5) * 0.75, 0.45, 5.1 + Math.floor(i / 5) * 0.9));
    }
    parts.trees = [];
    if (choice.trees) [[-9.5, -4], [9.5, -5], [-10, 1]].forEach(([x, z]) => { const t = tree(x, z, 1.2); bld.add(t); parts.trees.push(t); });

    // Damage looks, hidden until needed
    parts.cracks = new THREE.Group();
    body.add(parts.cracks);
    for (let i = 0; i < floors * 4; i++) {
      const cr = rbox(0.1, 1.1, 0.1, 0x3a3340, -4.2 + (i % 4) * 2.8, Math.floor(i / 4) * FH + 1.7, D / 2 + 0.2, 0.03);
      cr.rotation.z = i % 2 ? 0.6 : -0.5;
      parts.cracks.add(cr);
    }
    parts.cracks.visible = false;
    parts.puddles = new THREE.Group();
    for (let i = 0; i < 4; i++) parts.puddles.add(rbox(1.8, 0.06, 1.2, clay(0x5aa9e6, { roughness: 0.2 }), -4 + i * 2.6, 0.04, 5.4 + (i % 2), 0.03));
    parts.puddles.visible = false;
    bld.add(parts.puddles);
    parts.repair = sprite("🚧", "#f0a43a", 1.8);
    parts.repair.position.set(0, H + base + 2.6, 0);
    parts.repair.visible = false;
    bld.add(parts.repair);

    parts.top = H + base;
    world.add(bld);
    DOOR.set(0, 0, D / 2 + (lift ? 2 : 0.6));
    setPeek(peek);
  }

  function setPeek(on) {
    peek = on;
    if (!wallMat) return;
    wallMat.transparent = on;
    wallMat.opacity = on ? 0.15 : 1;
    wallMat.depthWrite = !on;
    wallMat.needsUpdate = true;
    if (parts.roof) parts.roof.visible = !on;
  }

  function tipShelves() { (parts.shelves || []).forEach(s => (s.userData.tip = true)); }

  // ----- helicopter delivers the rooftop unit (PLAN.md S5) -----
  // The roof shows `shownHvac`. When the design asks for a different unit (or the roof is empty
  // on a fresh site), the helicopter flies the new one in on a cable and sets it down.
  const HVAC_SPOT = new THREE.Vector3(-3, 0, -1.8); // where the unit sits, in roof coordinates
  const CABLE = 3;
  const HANG = 0.9 + CABLE + HVAC_H;                 // heli centre height above the roof when the unit touches down
  const ENTRY = new THREE.Vector3(-60, 26, -50), EXIT = new THREE.Vector3(60, 30, -45);
  const heli = makeHeli();
  heli.visible = false;
  scene.add(heli);
  const cable = cyl(0.04, 0.04, 1, 0x3a3340, 0, 0, 0);
  cable.castShadow = false;
  cable.visible = false;
  scene.add(cable);
  const puffs = new THREE.Group();
  scene.add(puffs);
  let shownHvac = null, trip = null, load = null, deliverCb = null;

  const roofSpot = () => new THREE.Vector3(HVAC_SPOT.x, (parts.top || 4) + 0.4, HVAC_SPOT.z);
  const above = h => () => roofSpot().add(new THREE.Vector3(0, h, 0));
  // Each leg flies to a point that follows the roof, so a taller design mid-flight still lines up.
  const LEGS = [
    { to: above(HANG + 7), dur: 2.6 },          // fly in high
    { to: above(HANG), dur: 1.5 },              // lower the unit onto the roof
    { to: above(HANG), dur: 0.35, drop: true }, // let go
    { to: above(HANG + 7), dur: 1.0 },          // climb
    { to: () => EXIT.clone(), dur: 2.4 },       // fly off
  ];

  function placeUnit(kind) {
    shownHvac = kind;
    if (!parts.roof) return;
    if (parts.hvac) parts.roof.remove(parts.hvac);
    parts.hvac = null;
    if (kind === null) return;
    parts.hvac = hvacUnit(kind === 1);
    parts.hvac.position.set(HVAC_SPOT.x, 0.4, HVAC_SPOT.z);
    parts.roof.add(parts.hvac);
  }

  function setLoad(kind) {
    if (load) scene.remove(load);
    load = hvacUnit(kind === 1);
    scene.add(load);
  }

  const inbound = () => trip && !trip.dropped && !trip.returning; // on the way to the roof with a unit

  function deliver(kind) {
    if (reduceMotion) { placeUnit(kind); return; }
    if (inbound()) { trip.kind = kind; setLoad(kind); return; } // still carrying: swap the load
    trip = { kind, leg: 0, t: 0, from: heli.visible ? heli.position.clone() : ENTRY.clone(), dropped: false };
    setLoad(kind);
    heli.position.copy(trip.from);
    heli.visible = true;
  }

  function cancelDelivery() {
    trip = null;
    heli.visible = false;
    cable.visible = false;
    if (load) { scene.remove(load); load = null; }
  }

  function puff(at) {
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.9 });
    const burst = new THREE.Group();
    burst.userData.life = 1;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const b = mesh(new THREE.SphereGeometry(0.3, 10, 8), mat, at.x, at.y + 0.3, at.z);
      b.castShadow = false;
      b.userData.v = new THREE.Vector3(Math.cos(a) * 2.2, 1 + (i % 3) * 0.5, Math.sin(a) * 2.2);
      burst.add(b);
    }
    puffs.add(burst);
  }

  const ease = k => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  const hook = new THREE.Vector3(), down = new THREE.Vector3(0, -0.9, 0);
  function tickHeli(dt, t) {
    for (const burst of [...puffs.children]) {
      burst.userData.life -= dt * 1.4;
      burst.children.forEach(b => { b.position.addScaledVector(b.userData.v, dt); b.scale.setScalar(1 + (1 - burst.userData.life)); });
      burst.children[0].material.opacity = Math.max(0, burst.userData.life * 0.9);
      if (burst.userData.life <= 0) {
        puffs.remove(burst);
        burst.children.forEach(b => b.geometry.dispose());
        burst.children[0].material.dispose();
      }
    }
    if (!trip) return;
    const leg = LEGS[trip.leg];
    trip.t = Math.min(1, trip.t + dt / leg.dur);
    const to = leg.to();
    const dx = to.x - trip.from.x, dz = to.z - trip.from.z, moving = Math.hypot(dx, dz) > 0.5;
    heli.position.lerpVectors(trip.from, to, ease(trip.t));
    heli.position.y += Math.sin(t * 3) * 0.06;                     // hover bob
    if (moving) heli.rotation.y = Math.atan2(-dz, dx);
    heli.rotation.z = moving ? -0.18 * Math.sin(Math.PI * trip.t) : 0; // nose dips while flying
    heli.userData.rotor.rotation.y += dt * 28;
    heli.userData.tail.rotation.z += dt * 40;
    if (!trip.dropped && load) {
      hook.copy(heli.position).add(down);
      const sway = moving ? Math.sin(t * 2.4) * 0.25 : Math.sin(t * 2.4) * 0.05;
      load.position.set(hook.x + sway, hook.y - CABLE - HVAC_H, hook.z);
      load.rotation.y = heli.rotation.y;
      cable.visible = true;
      cable.position.set(hook.x + sway / 2, hook.y - CABLE / 2, hook.z);
      cable.scale.set(1, CABLE, 1);
      cable.rotation.z = Math.atan2(sway, CABLE);
    } else cable.visible = false;
    if (trip.t >= 1) {
      if (leg.drop && !trip.dropped) {
        trip.dropped = true;
        scene.remove(load);
        load = null;
        placeUnit(trip.kind);
        puff(roofSpot());
        if (deliverCb) deliverCb(trip.kind);
      }
      trip.from = to.clone();
      trip.t = 0;
      if (++trip.leg >= LEGS.length) cancelDelivery();
    }
  }

  function setLevel(lv) {
    level = lv;
    world.remove(profile);
    profile.traverse(o => o.material && o.material.dispose());
    profile = newProfile(lv.soil);
    world.add(profile);
    cutMat.color.setHex(SOILS[lv.soil].color).multiplyScalar(0.78);
    backdrop.clear();
    if (lv.key === "rocky") { backdrop.add(mountain(-20, -22, 14), mountain(-6, -26, 18, 0x8f9aa6), mountain(12, -24, 12)); }
    if (lv.key === "prairie") {
      backdrop.add(rbox(10, 0.3, 6, 0xf2d27a, -18, 0.05, -18, 0.2), rbox(8, 0.3, 6, 0xe8c25a, 8, 0.05, -20, 0.2));
      const barn = rbox(5, 4, 4, 0xd9534f, 18, 2, -18, 0.3); backdrop.add(barn);
    }
    if (lv.key === "breezy") {
      backdrop.add(mesh(sandGeo, clay(0xf4dc9c), 0, 0.03, -19), mesh(seaGeo, clay(0x5aa9e6, { roughness: 0.25 }), 0, 0.06, -225));
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
    const carrying = inbound() ? trip.kind : undefined;
    if (choice.hvac !== shownHvac && choice.hvac !== carrying) deliver(choice.hvac);
    else if (choice.hvac === shownHvac && carrying !== undefined) sendHome(); // changed back mid-flight
  }
  // The roof already has the right unit: fly off still carrying the load.
  function sendHome() {
    trip.returning = true;
    trip.leg = LEGS.length - 1;
    trip.t = 0;
    trip.from = heli.position.clone();
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
    cancelDelivery();
    shownHvac = null; // a fresh site starts with an empty roof, so the helicopter brings the first unit
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
      // Sitting or chatting on a spot you can see through the windows.
      const s = parts.slots[p.slot];
      if (s) m.position.set(s.x, s.y + Math.abs(Math.sin(t * 3 + p.phase)) * 0.12, s.z);
      m.userData.body.scale.set(1, 1 + Math.sin(t * 4 + p.phase) * 0.04, 1);
      p.wait -= dt * (run ? speed : 1);
      if (p.wait <= 0) { p.state = "out"; p.slot = -1; m.visible = true; m.position.copy(DOOR); p.target.copy(wander()); }
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
        if (p.state === "toDoor") goInside(p);
        else if (open && !scared) { p.state = "toDoor"; }
        else { p.target.copy(wander()); p.wait = 0.6 + Math.random(); }
        if (p.state === "out") p.wait = 0.5 + Math.random();
      }
      if (p.state === "toDoor" && dist <= 0.2) goInside(p);
    }
  }

  function goInside(p) {
    const taken = new Set(people.filter(q => q.state === "inside").map(q => q.slot));
    const free = parts.slots.map((_, i) => i).filter(i => !taken.has(i));
    p.state = "inside";
    p.slot = free.length ? free[Math.floor(Math.random() * free.length)] : -1;
    p.m.visible = p.slot >= 0;
    p.m.rotation.set(0, Math.random() * Math.PI * 2, 0);
    p.wait = 4 + Math.random() * 6;
  }

  loop(container, renderer, (dt, t) => {
    // Damage looks, from the live run
    if (run && parts.body) {
      const broken = new Set(run.broken.map(b => b.part));
      parts.cracks.visible = broken.has("cracks") || broken.has("frame");
      parts.puddles.visible = broken.has("floor") || !!(hazard && hazard.type === "flood");
      parts.glass.forEach((w, i) => (w.material = broken.has("windows") && i % 2 === 0 ? brokenGlass : glassMat));
      parts.roof.rotation.z = broken.has("roof") ? 0.18 + Math.sin(t * 8) * (hazard && hazard.type === "wind" ? 0.15 : 0.02) : 0;
      parts.roof.position.x = broken.has("roof") ? 0.8 : 0;
      const lean = (broken.has("found") ? 0.05 : 0) + (broken.has("frame") ? 0.04 : 0);
      parts.body.rotation.z += (lean - parts.body.rotation.z) * 0.05;
      parts.repair.visible = !!run.repairing;
      if (run.repairing) { parts.repair.position.y = parts.top + 2.6 + Math.abs(Math.sin(t * 9)) * 0.8; }
    }
    const dark = run && run.outage > 0 && !run.stats.power;
    lightMat.emissiveIntensity = dark ? 0 : parts.led ? 1.3 : 0.7;
    if (parts.hvac) parts.hvac.userData.fan.rotation.y += dt * (dark ? 0 : run ? 16 : 6);
    tickHeli(dt, t);
    (parts.shelves || []).forEach(s => { if (s.userData.tip && s.rotation.x < 1.35) s.rotation.x = Math.min(1.35, s.rotation.x + dt * 4); });

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

  // Speech bubbles (main.js): the pixel spot just above a person's emoji face, relative to the canvas.
  // null when that person is hidden (inside with no window seat) or off screen.
  const headV = new THREE.Vector3();
  function headPos(key) {
    const p = people.find(q => q.c.key === key);
    if (!p || !p.m.visible) return null;
    p.m.localToWorld(headV.set(0, p.c.pet ? 2.5 : 3.2, 0)).project(camera); // local units, so the 1.3 scale counts
    if (headV.z > 1 || Math.abs(headV.x) > 1 || Math.abs(headV.y) > 1) return null;
    const el = renderer.domElement;
    return { x: (headV.x + 1) / 2 * el.clientWidth, y: (1 - headV.y) / 2 * el.clientHeight };
  }

  return {
    setLevel, setDesign, setRun, startHazard, endHazard, doCollapse, reset, headPos,
    setGentle: g => { gentle = g; people.forEach(p => p.m.userData.faceKey = ""); },
    setPeek, tipShelves,
    setSpin: on => { controls.autoRotate = on && !reduceMotion; },
    onDeliver: fn => { deliverCb = fn; }, // called with choice.hvac when the helicopter sets a unit down
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
