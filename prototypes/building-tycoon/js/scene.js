// scene.js: the 3D world (three.js). Reads the sim state, never changes it.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GEOM, SIDES, SIDE_INFO, ROOF_SLOTS, OPTIONS } from "./data.js";
import { ZONES, roofLayout, dcStatus } from "./sim.js";

const L = GEOM.lengthX;
const D = GEOM.depthZ;
const H = GEOM.floorHeight;
const NF = GEOM.floors;
const ROOF_Y = NF * H;
const SLAB = 0.35;
const DOOR = new THREE.Vector3(0, 0, D / 2 + 2.6);
const CABLE = 5;
const TRANSFORMER_POS = new THREE.Vector3(L / 2 + 4.5, 0, 4);

const C = {
  grass: new THREE.Color(0x8cc084),
  snowGround: new THREE.Color(0xeef3f6),
  nightSky: new THREE.Color(0x0f1b33),
  dusk: new THREE.Color(0xf2a65a),
  day: new THREE.Color(0x9fd3f0),
  cloudy: new THREE.Color(0xb9c6cf),
  heat: new THREE.Color(0xf6c58f),
  cold: new THREE.Color(0x3b82f6),
  comfy: new THREE.Color(0x22c55e),
  warm: new THREE.Color(0xf59e0b),
  hot: new THREE.Color(0xdc2626),
  red: new THREE.Color(0xff2a2a),
  yellow: new THREE.Color(0xffc400),
  green: new THREE.Color(0x22c55e),
  black: new THREE.Color(0x000000),
  lit: new THREE.Color(0xffd27a),
};

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05, ...extra });
function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
function disposeGroup(g) {
  g.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
  });
  g.clear();
}
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// Temperature (C) to a comfort colour.
function tempColor(t, out) {
  if (t < 20) return out.copy(C.cold).lerp(C.comfy, Math.max(0, Math.min(1, (t - 16) / 4)));
  if (t <= 25.5) return out.copy(C.comfy);
  if (t <= 28) return out.copy(C.comfy).lerp(C.warm, (t - 25.5) / 2.5);
  return out.copy(C.warm).lerp(C.hot, Math.min(1, (t - 28) / 3));
}

// Emoji sprite textures, cached.
const texCache = new Map();
function emojiTexture(emoji, ring) {
  const key = emoji + ring;
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement("canvas");
  c.width = c.height = 96;
  const g = c.getContext("2d");
  g.beginPath();
  g.arc(48, 48, 42, 0, Math.PI * 2);
  g.fillStyle = "rgba(255,255,255,0.92)";
  g.fill();
  g.lineWidth = 8;
  g.strokeStyle = ring;
  g.stroke();
  g.font = "52px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(emoji, 48, 52);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, t);
  return t;
}

export function moodFace(o) {
  if (o.reason === "dark") return "😱";
  if (o.mood < 55) {
    if (o.reason === "hot") return "🥵";
    if (o.reason === "cold") return "🥶";
    if (o.reason === "glare") return "😎";
    if (o.reason === "sway") return "🤢";
  }
  if (o.mood >= 72) return "😀";
  if (o.mood >= 58) return "🙂";
  if (o.mood >= 42) return "😐";
  if (o.mood >= 28) return "🙁";
  return "😡";
}
export function moodRing(m) {
  return m >= 58 ? "#22c55e" : m >= 40 ? "#f5b800" : "#ef4444";
}

// ---------- positions ----------
export function slotPos(slot) {
  const c = slot % ROOF_SLOTS.cols;
  const r = Math.floor(slot / ROOF_SLOTS.cols);
  return new THREE.Vector3(-L / 2 + (L / ROOF_SLOTS.cols) * (c + 0.5), ROOF_Y + SLAB / 2, -D / 2 + (D / ROOF_SLOTS.rows) * (r + 0.5));
}

function deskPos(zoneIndex, desk) {
  const z = ZONES[zoneIndex];
  const y = z.floor * H + SLAB / 2;
  const n = z.desks;
  const t = (desk + 0.5) / n;
  switch (z.side) {
    case "N": return new THREE.Vector3(-L / 2 + 2.5 + t * (L - 5) - 0.0, y, -D / 2 + 2.6);
    case "S": return new THREE.Vector3(-L / 2 + 2.5 + t * (L - 5), y, D / 2 - 2.6);
    case "E": return new THREE.Vector3(L / 2 - 2.6, y, -D / 2 + 5.5 + t * (D - 11));
    default: return new THREE.Vector3(-L / 2 + 2.6, y, -D / 2 + 5.5 + t * (D - 11));
  }
}

const ZONE_RECTS = {
  N: [-L / 2, L / 2, -D / 2, -D / 2 + 5],
  S: [-L / 2, L / 2, D / 2 - 5, D / 2],
  E: [L / 2 - 6, L / 2, -D / 2 + 5, D / 2 - 5],
  W: [-L / 2, -L / 2 + 6, -D / 2 + 5, D / 2 - 5],
};

// Window size for a window-to-wall ratio, inside one bay.
export function windowSize(wwr) {
  const h = H * Math.min(0.9, 0.45 + 0.5 * wwr);
  const w = Math.min(GEOM.bay - 0.2, (wwr * GEOM.bay * H) / h);
  return { w, h, sill: Math.max(0.35, (H - h) * 0.45) };
}

// ---------- models ----------
function makeUnit() {
  const g = new THREE.Group();
  g.add(box(3.4, 0.2, 2.4, std(0x8a9096), 0, 0.1, 0));
  g.add(box(3.2, 1.5, 2.2, std(0xe3e7ea, { roughness: 0.6 }), 0, 0.95, 0));
  g.add(box(0.05, 1.0, 1.8, std(0x6b7280), 1.62, 0.95, 0));
  g.add(box(0.05, 1.0, 1.8, std(0x6b7280), -1.62, 0.95, 0));
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.16, 20), std(0x374151));
  ring.position.set(0.7, 1.78, 0);
  g.add(ring);
  const fan = new THREE.Group();
  fan.add(box(1.05, 0.04, 0.16, std(0x111827)));
  fan.add(box(0.16, 0.04, 1.05, std(0x111827)));
  fan.position.set(0.7, 1.88, 0);
  g.add(fan);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 1 }));
  lamp.position.set(-1.0, 1.82, 0.6);
  g.add(lamp);
  g.userData = { fan, lamp, body: g.children[1] };
  return g;
}

function makePV() {
  const g = new THREE.Group();
  const panel = std(0x1d3a6e, { metalness: 0.4, roughness: 0.35 });
  const leg = std(0x9ca3af);
  for (let r = 0; r < 3; r++) {
    const z = -1.9 + r * 1.9;
    const p = box(13.6, 0.08, 1.5, panel, 0, 0.75, z);
    p.rotation.x = 25 * (Math.PI / 180);
    g.add(p);
    g.add(box(0.1, 0.6, 0.1, leg, -6.5, 0.3, z));
    g.add(box(0.1, 0.6, 0.1, leg, 6.5, 0.3, z));
  }
  return g;
}

function makeHeli() {
  const g = new THREE.Group();
  const bodyMat = std(0xf4c430, { roughness: 0.5 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.4, 20, 14), bodyMat);
  body.scale.set(1.7, 1, 1);
  body.castShadow = true;
  g.add(body);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.95, 16, 12), std(0x7dd3fc, { roughness: 0.1, metalness: 0.3 }));
  glass.position.set(1.3, 0.3, 0);
  glass.scale.set(1, 0.8, 0.95);
  g.add(glass);
  g.add(box(4.4, 0.35, 0.35, bodyMat, -3.6, 0.35, 0));
  g.add(box(0.7, 1.3, 0.12, std(0xd62828), -5.6, 0.95, 0));
  const tail = new THREE.Group();
  tail.add(box(0.08, 1.5, 0.15, std(0x222222)));
  tail.position.set(-5.6, 0.95, 0.2);
  g.add(tail);
  const skid = std(0x333333);
  g.add(box(3.4, 0.12, 0.12, skid, 0, -1.45, 0.85));
  g.add(box(3.4, 0.12, 0.12, skid, 0, -1.45, -0.85));
  g.add(box(0.1, 0.5, 0.1, skid, 0.8, -1.2, 0.85));
  g.add(box(0.1, 0.5, 0.1, skid, -0.8, -1.2, 0.85));
  g.add(box(0.1, 0.5, 0.1, skid, 0.8, -1.2, -0.85));
  g.add(box(0.1, 0.5, 0.1, skid, -0.8, -1.2, -0.85));
  g.add(box(0.15, 0.5, 0.15, skid, 0, 1.55, 0));
  const rotor = new THREE.Group();
  rotor.add(box(10, 0.06, 0.4, std(0x1f2937)));
  rotor.add(box(0.4, 0.06, 10, std(0x1f2937)));
  rotor.position.set(0, 1.85, 0);
  g.add(rotor);
  g.userData = { rotor, tail };
  return g;
}

function makeTruck() {
  const g = new THREE.Group();
  const orange = std(0xf28c28, { roughness: 0.6 });
  g.add(box(4.6, 2.3, 2.3, orange, -1.2, 1.65, 0));
  g.add(box(2.0, 1.9, 2.3, std(0xf8fafc), 2.3, 1.45, 0));
  g.add(box(0.1, 0.8, 2.0, std(0x7dd3fc), 3.32, 1.8, 0));
  g.add(box(1.4, 0.15, 1.6, std(0xfde047), -1.2, 2.9, 0));
  const wheel = std(0x111111);
  for (const [x, z] of [[-2.5, 1.15], [-2.5, -1.15], [2.2, 1.15], [2.2, -1.15]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.35, 14), wheel);
    w.rotation.x = Math.PI / 2;
    w.position.set(x, 0.5, z);
    g.add(w);
  }
  return g;
}

function makeTree(x, z, s = 1) {
  const g = new THREE.Group();
  g.add(box(0.4 * s, 2.2 * s, 0.4 * s, std(0x7c5a3a), 0, 1.1 * s, 0));
  const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(1.8 * s, 0), std(0x4f9d4f, { flatShading: true }));
  leaves.position.y = 3.2 * s;
  leaves.castShadow = true;
  g.add(leaves);
  g.position.set(x, 0, z);
  g.userData = { leaves };
  return g;
}

function makePerson(o) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.75, 4, 10), std(o.shirt, { roughness: 0.7 }));
  body.position.y = 0.72;
  body.castShadow = true;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 10), std(o.skin, { roughness: 0.7 }));
  head.position.y = 1.55;
  head.castShadow = true;
  g.add(head);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture("🙂", "#22c55e"), depthTest: false, transparent: true }));
  sprite.scale.set(1.25, 1.25, 1);
  sprite.position.y = 2.55;
  sprite.renderOrder = 10;
  g.add(sprite);
  const carry = box(0.6, 0.45, 0.45, std(0xb7895a), 0, 1.05, 0.42);
  carry.visible = false;
  g.add(carry);
  g.userData = { sprite, carry, face: "" };
  return g;
}

// ---------- world ----------
export function createWorld(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = C.day.clone();

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
  const VIEW = 62;
  camera.position.set(80, 70, 80);
  camera.zoom = 1;
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 5, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.12;
  controls.minZoom = 0.5;
  controls.maxZoom = 4;
  controls.minPolarAngle = 0.25;
  controls.maxPolarAngle = 1.38;
  controls.screenSpacePanning = true;
  controls.update();

  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    const a = w / h;
    camera.left = (-VIEW * a) / 2;
    camera.right = (VIEW * a) / 2;
    camera.top = VIEW / 2;
    camera.bottom = -VIEW / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  new ResizeObserver(resize).observe(container);
  resize();

  // Lights
  const hemi = new THREE.HemisphereLight(0xdbeafe, 0x6b8f5a, 1.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 200 });
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  scene.add(sun.target);
  const ambient = new THREE.AmbientLight(0xffffff, 0.15);
  scene.add(ambient);

  // Site
  const site = new THREE.Group();
  scene.add(site);
  const groundMat = std(C.grass.getHex(), { roughness: 1 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  site.add(ground);
  const paving = std(0xc9ccd1, { roughness: 1 });
  const plaza = box(L + 8, 0.06, 7, paving, 0, 0.03, D / 2 + 3.5);
  plaza.castShadow = false;
  site.add(plaza);
  const walk = box(4, 0.06, 6, paving, 0, 0.03, D / 2 + 9.5);
  walk.castShadow = false;
  site.add(walk);
  const side = box(160, 0.07, 2, paving, 0, 0.035, D / 2 + 13);
  side.castShadow = false;
  site.add(side);
  const road = box(160, 0.05, 7, std(0x4b5563, { roughness: 1 }), 0, 0.025, D / 2 + 17.5);
  road.castShadow = false;
  site.add(road);
  for (let x = -76; x < 80; x += 8) {
    const dash = box(3.5, 0.02, 0.25, std(0xfef3c7), x, 0.06, D / 2 + 17.5);
    dash.castShadow = false;
    site.add(dash);
  }
  const trees = [[-25, -14, 1.2], [-27, 2, 1], [-24, 15, 0.9], [25, -15, 1.1], [27, -4, 0.9], [-10, -21, 1], [9, -22, 1.2], [26, 15, 1]].map(([x, z, s]) => {
    const t = makeTree(x, z, s);
    site.add(t);
    return t;
  });
  const pad = box(4.2, 0.25, 4.2, paving, TRANSFORMER_POS.x, 0.125, TRANSFORMER_POS.z);
  site.add(pad);
  const transformerMat = std(0x3a7d44, { roughness: 0.6 });
  const transformer = box(1, 1, 1, transformerMat, TRANSFORMER_POS.x, 0, TRANSFORMER_POS.z);
  site.add(transformer);
  const transformerSize = { 400: 1.4, 800: 1.9, 1200: 2.4 };

  // Building groups
  const building = new THREE.Group();
  const roof = new THREE.Group();
  const furniture = new THREE.Group();
  scene.add(building, roof, furniture);
  const people = new THREE.Group();
  scene.add(people);
  const fx = new THREE.Group();
  scene.add(fx);

  const wallMats = {};
  const glassMats = ZONES.map(() => new THREE.MeshStandardMaterial({ color: 0x9fd0ea, transparent: true, opacity: 0.38, roughness: 0.08, metalness: 0.2, emissive: 0x000000 }));
  const tintMats = ZONES.map(() => new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.35, depthWrite: false }));
  const roofMat = std(0x6d7278, { roughness: 0.9 });
  const snowMat = std(0xffffff, { roughness: 1 });
  let snowLayer = null;
  let units = []; // { slot, mesh }
  let heatView = false;

  // Desks (static).
  const deskMat = std(0xcaa472);
  ZONES.forEach((z) => {
    for (let k = 0; k < z.desks; k++) {
      const p = deskPos(z.index, k);
      const out = z.side === "N" ? 1 : z.side === "S" ? -1 : 0;
      const dx = z.side === "E" ? -1 : z.side === "W" ? 1 : 0;
      furniture.add(box(dx ? 0.7 : 1.4, 0.75, dx ? 1.4 : 0.7, deskMat, p.x + dx * 0.9, p.y + 0.375, p.z + out * 0.9));
    }
  });

  function buildBuilding(design) {
    disposeGroup(building);
    const lateral = design.lateral;
    for (const s of SIDES) {
      wallMats[s] = std(lateral === "shear" ? 0xcfc8bc : 0xece4d6, { roughness: 0.9 });
    }
    const slabMat = std(0xb9bec4);
    for (let f = 0; f <= NF; f++) {
      const m = box(L + 0.5, SLAB, D + 0.5, f === NF ? roofMat : slabMat, 0, f * H, 0);
      building.add(m);
    }
    // Core (stairs and elevator)
    building.add(box(6, ROOF_Y, 4, std(0xd8d2c8), 0, ROOF_Y / 2, 0));
    // Parapet
    const par = std(0xa8aeb4);
    building.add(box(L + 0.5, 0.9, 0.3, par, 0, ROOF_Y + 0.6, -D / 2 - 0.1));
    building.add(box(L + 0.5, 0.9, 0.3, par, 0, ROOF_Y + 0.6, D / 2 + 0.1));
    building.add(box(0.3, 0.9, D + 0.5, par, -L / 2 - 0.1, ROOF_Y + 0.6, 0));
    building.add(box(0.3, 0.9, D + 0.5, par, L / 2 + 0.1, ROOF_Y + 0.6, 0));
    // Zone floor tints
    ZONES.forEach((z) => {
      const [x0, x1, z0, z1] = ZONE_RECTS[z.side];
      const p = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 - 0.3, z1 - z0 - 0.3), tintMats[z.index]);
      p.rotation.x = -Math.PI / 2;
      p.position.set((x0 + x1) / 2, z.floor * H + SLAB / 2 + 0.02, (z0 + z1) / 2);
      p.renderOrder = 1;
      building.add(p);
    });
    // Facades
    const steel = std(0x2f3640, { metalness: 0.5, roughness: 0.5 });
    const brace = std(0xc0392b, { metalness: 0.4, roughness: 0.5 });
    const shadeMat = std(0xf1f5f9);
    for (const s of SIDES) {
      const info = SIDE_INFO[s];
      const g = new THREE.Group();
      const rotY = { S: 0, N: Math.PI, E: Math.PI / 2, W: -Math.PI / 2 }[s];
      g.rotation.y = rotY;
      g.position.set(s === "E" ? L / 2 : s === "W" ? -L / 2 : 0, 0, s === "S" ? D / 2 : s === "N" ? -D / 2 : 0);
      const len = info.length;
      const bays = Math.round(len / GEOM.bay);
      const win = windowSize(design.wwr[s]);
      const wm = wallMats[s];
      for (let f = 0; f < NF; f++) {
        const y0 = f * H + SLAB / 2;
        const hh = H - SLAB;
        const zone = ZONES.find((z) => z.floor === f && z.side === s);
        const sill = Math.min(win.sill, hh - win.h - 0.05);
        for (let b = 0; b < bays; b++) {
          const u = -len / 2 + GEOM.bay * (b + 0.5);
          const pier = (GEOM.bay - win.w) / 2;
          const top = hh - sill - win.h;
          g.add(box(GEOM.bay, sill, 0.3, wm, u, y0 + sill / 2, 0));
          if (top > 0.01) g.add(box(GEOM.bay, top, 0.3, wm, u, y0 + sill + win.h + top / 2, 0));
          if (pier > 0.01) {
            g.add(box(pier, win.h, 0.3, wm, u - win.w / 2 - pier / 2, y0 + sill + win.h / 2, 0));
            g.add(box(pier, win.h, 0.3, wm, u + win.w / 2 + pier / 2, y0 + sill + win.h / 2, 0));
          }
          const glass = new THREE.Mesh(new THREE.BoxGeometry(win.w, win.h, 0.06), glassMats[zone.index]);
          glass.position.set(u, y0 + sill + win.h / 2, 0);
          glass.renderOrder = 2;
          g.add(glass);
          if (design.shades[s]) {
            if (s === "S") g.add(box(win.w + 0.5, 0.1, 1.2, shadeMat, u, y0 + sill + win.h + 0.1, 0.65));
            else for (let k = 0; k < 4; k++) g.add(box(0.08, win.h, 0.8, shadeMat, u - win.w / 2 + (win.w * (k + 0.5)) / 4, y0 + sill + win.h / 2, 0.45));
          }
          if (lateral === "braced" && (b === 0 || b === bays - 1)) {
            const diag = Math.hypot(GEOM.bay, hh);
            const ang = Math.atan2(hh, GEOM.bay);
            const b1 = box(diag, 0.28, 0.28, brace, u, y0 + hh / 2, 0.35);
            b1.rotation.z = ang;
            const b2 = box(diag, 0.28, 0.28, brace, u, y0 + hh / 2, 0.35);
            b2.rotation.z = -ang;
            g.add(b1, b2);
          }
        }
        if (lateral === "moment") g.add(box(len + 0.4, 0.55, 0.45, steel, 0, (f + 1) * H - 0.1, 0.3));
      }
      if (lateral === "moment") {
        for (let b = 0; b <= bays; b++) g.add(box(0.5, ROOF_Y, 0.5, steel, -len / 2 + b * GEOM.bay, ROOF_Y / 2, 0.3));
      }
      building.add(g);
    }
    // Entrance vestibule
    const vest = new THREE.MeshStandardMaterial({ color: 0x7fb7d6, transparent: true, opacity: 0.55, roughness: 0.1 });
    building.add(box(4.2, 3.2, 2.2, vest, 0, 1.6, D / 2 + 1.25));
    building.add(box(5.4, 0.2, 3, std(0x334155), 0, 3.3, D / 2 + 1.5));
    applyHeatView();
  }

  function buildRoof(design) {
    disposeGroup(roof);
    units = [];
    const lay = roofLayout(design);
    for (const s of lay.units) {
      if (pendingSlots.has(s)) continue;
      const u = makeUnit();
      u.position.copy(slotPos(s));
      roof.add(u);
      units.push({ slot: s, mesh: u });
    }
    for (const pair of lay.pv) {
      const p = makePV();
      const a = slotPos(pair[0]);
      const b = slotPos(pair[1]);
      p.position.copy(a).add(b).multiplyScalar(0.5);
      roof.add(p);
    }
    snowLayer = box(L - 0.4, 1, D - 0.4, snowMat, 0, ROOF_Y, 0);
    snowLayer.visible = false;
    roof.add(snowLayer);
  }

  function applyHeatView() {
    for (const s of SIDES) {
      const m = wallMats[s];
      if (!m) continue;
      m.transparent = heatView;
      m.opacity = heatView ? 0.12 : 1;
      m.depthWrite = !heatView;
      m.needsUpdate = true;
    }
    glassMats.forEach((m) => (m.opacity = heatView ? 0.1 : 0.38));
    roofMat.transparent = heatView;
    roofMat.opacity = heatView ? 0.2 : 1;
    roofMat.depthWrite = !heatView;
    roofMat.needsUpdate = true;
    roof.visible = !heatView;
  }

  // ---------- helicopters, trucks ----------
  const pendingSlots = new Set();
  const helis = [];
  const trucks = [];
  let shownService = null;
  let pendingService = null;
  let designKey = "";
  let roofKey = "";

  function heliDeliver(slot) {
    pendingSlots.add(slot);
    roofKey = "";
    const h = makeHeli();
    const load = makeUnit();
    const cable = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0x111111 }));
    const marker = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.1, 32), new THREE.MeshBasicMaterial({ color: 0xffc400, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
    marker.rotation.x = -Math.PI / 2;
    const target = slotPos(slot);
    marker.position.copy(target).add(new THREE.Vector3(0, 0.25, 0));
    fx.add(h, load, cable, marker);
    const hang = CABLE + 1.7;
    const low = target.y + hang + 0.05;
    const legs = [
      { from: new THREE.Vector3(-75, 34, -55), to: new THREE.Vector3(target.x, 30, target.z), dur: 3.2 },
      { to: new THREE.Vector3(target.x, low, target.z), dur: 1.8 },
      { to: new THREE.Vector3(target.x, low, target.z), dur: 0.5, drop: true },
      { to: new THREE.Vector3(target.x, 30, target.z), dur: 1.4 },
      { to: new THREE.Vector3(80, 36, -45), dur: 3.2 },
    ];
    helis.push({ h, load, cable, marker, legs, leg: 0, t: 0, carrying: true, slot, mode: "deliver" });
  }

  function heliRemove(slot) {
    const h = makeHeli();
    const load = makeUnit();
    const target = slotPos(slot);
    load.position.copy(target);
    const cable = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0x111111 }));
    cable.visible = false;
    fx.add(h, load, cable);
    const hang = CABLE + 1.7;
    const low = target.y + hang + 0.05;
    const legs = [
      { from: new THREE.Vector3(-75, 34, -55), to: new THREE.Vector3(target.x, 30, target.z), dur: 3.2 },
      { to: new THREE.Vector3(target.x, low, target.z), dur: 1.8 },
      { to: new THREE.Vector3(target.x, low, target.z), dur: 0.5, pick: true },
      { to: new THREE.Vector3(target.x, 30, target.z), dur: 1.4 },
      { to: new THREE.Vector3(80, 36, -45), dur: 3.2 },
    ];
    helis.push({ h, load, cable, legs, leg: 0, t: 0, carrying: false, slot, mode: "remove" });
  }

  function updateHelis(dt) {
    for (let i = helis.length - 1; i >= 0; i--) {
      const q = helis[i];
      const leg = q.legs[q.leg];
      const from = leg.from || q.legs[q.leg - 1].to;
      q.t += dt / leg.dur;
      const k = ease(Math.min(1, q.t));
      q.h.position.lerpVectors(from, leg.to, k);
      const dx = leg.to.x - from.x;
      const dz = leg.to.z - from.z;
      if (Math.hypot(dx, dz) > 1) q.h.rotation.y = Math.atan2(-dz, dx);
      q.h.rotation.z = Math.hypot(dx, dz) > 1 ? -0.12 * Math.sin(Math.PI * k) : 0;
      q.h.userData.rotor.rotation.y += dt * 30;
      q.h.userData.tail.rotation.x += dt * 40;
      if (q.carrying) {
        q.load.position.set(q.h.position.x, q.h.position.y - CABLE - 1.7, q.h.position.z);
        q.load.rotation.y = q.h.rotation.y * 0.3;
        q.cable.visible = true;
        q.cable.geometry.setFromPoints([q.h.position.clone().add(new THREE.Vector3(0, -1.4, 0)), q.load.position.clone().add(new THREE.Vector3(0, 1.9, 0))]);
      } else {
        q.cable.visible = false;
      }
      if (q.marker) q.marker.material.opacity = 0.5 + 0.4 * Math.sin(performance.now() / 150);
      if (q.t >= 1) {
        if (leg.drop && q.carrying) {
          q.carrying = false;
          fx.remove(q.load);
          if (q.marker) fx.remove(q.marker);
          q.marker = null;
          pendingSlots.delete(q.slot);
          roofKey = "";
          puff(slotPos(q.slot), 0xffffff);
        }
        if (leg.pick && !q.carrying) q.carrying = true;
        q.leg++;
        q.t = 0;
        if (q.leg >= q.legs.length) {
          fx.remove(q.h, q.cable);
          if (q.carrying) fx.remove(q.load);
          helis.splice(i, 1);
        }
      }
    }
  }

  function truck(newService) {
    pendingService = newService;
    const t = makeTruck();
    fx.add(t);
    const stop = new THREE.Vector3(TRANSFORMER_POS.x, 0, D / 2 + 16);
    trucks.push({ t, legs: [
      { from: new THREE.Vector3(-90, 0, D / 2 + 16), to: stop, dur: 3.5 },
      { to: stop, dur: 1.4, swap: true },
      { to: new THREE.Vector3(95, 0, D / 2 + 16), dur: 3 },
    ], leg: 0, k: 0 });
  }

  function updateTrucks(dt) {
    for (let i = trucks.length - 1; i >= 0; i--) {
      const q = trucks[i];
      const leg = q.legs[q.leg];
      const from = leg.from || q.legs[q.leg - 1].to;
      q.k += dt / leg.dur;
      q.t.position.lerpVectors(from, leg.to, ease(Math.min(1, q.k)));
      if (leg.swap) {
        const s = Math.sin(Math.min(1, q.k) * Math.PI);
        transformer.scale.multiplyScalar(1 + 0.02 * s);
      }
      if (q.k >= 1) {
        if (leg.swap && pendingService) {
          shownService = pendingService;
          pendingService = null;
          sizeTransformer();
          puff(TRANSFORMER_POS.clone().add(new THREE.Vector3(0, 1.5, 0)), 0xfde047);
        }
        q.leg++;
        q.k = 0;
        if (q.leg >= q.legs.length) {
          fx.remove(q.t);
          trucks.splice(i, 1);
        }
      }
    }
  }

  function sizeTransformer() {
    const s = transformerSize[shownService] || 1.4;
    transformer.scale.set(s, s * 0.9, s);
    transformer.position.y = 0.25 + (s * 0.9) / 2;
  }

  // ---------- particles ----------
  const puffs = [];
  function puff(pos, color) {
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 5), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }));
      m.position.copy(pos);
      const a = (i / 14) * Math.PI * 2;
      m.userData.v = new THREE.Vector3(Math.cos(a) * 3, 2 + Math.random() * 2, Math.sin(a) * 3);
      m.userData.life = 1;
      fx.add(m);
      puffs.push(m);
    }
  }
  function updatePuffs(dt) {
    for (let i = puffs.length - 1; i >= 0; i--) {
      const m = puffs[i];
      m.position.addScaledVector(m.userData.v, dt);
      m.userData.life -= dt * 1.2;
      m.material.opacity = Math.max(0, m.userData.life);
      if (m.userData.life <= 0) {
        fx.remove(m);
        m.geometry.dispose();
        puffs.splice(i, 1);
      }
    }
  }

  const SNOW_N = 1600;
  const snowGeo = new THREE.BufferGeometry();
  const snowPos = new Float32Array(SNOW_N * 3);
  for (let i = 0; i < SNOW_N; i++) {
    snowPos[i * 3] = (Math.random() - 0.5) * 110;
    snowPos[i * 3 + 1] = Math.random() * 45;
    snowPos[i * 3 + 2] = (Math.random() - 0.5) * 110;
  }
  snowGeo.setAttribute("position", new THREE.BufferAttribute(snowPos, 3));
  const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.35, transparent: true, opacity: 0.9 }));
  snow.visible = false;
  scene.add(snow);

  const WIND_N = 240;
  const windGeo = new THREE.BufferGeometry();
  const windPos = new Float32Array(WIND_N * 6);
  const windSeed = Array.from({ length: WIND_N }, () => [(Math.random() - 0.5) * 120, 1 + Math.random() * 25, (Math.random() - 0.5) * 120]);
  windGeo.setAttribute("position", new THREE.BufferAttribute(windPos, 3));
  const wind = new THREE.LineSegments(windGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }));
  wind.visible = false;
  scene.add(wind);

  // ---------- people ----------
  const walkers = new Map(); // id -> { g, state, path, k, dir }
  function outsidePath(o) {
    const east = o.id % 2 === 0;
    const sx = east ? 28 : -28;
    return [new THREE.Vector3(sx, 0, D / 2 + 13), new THREE.Vector3(east ? 1.2 : -1.2, 0, D / 2 + 13), DOOR.clone()];
  }
  function pathLength(p) {
    let s = 0;
    for (let i = 1; i < p.length; i++) s += p[i].distanceTo(p[i - 1]);
    return s;
  }
  function pointOnPath(p, d, out) {
    for (let i = 1; i < p.length; i++) {
      const seg = p[i].distanceTo(p[i - 1]);
      if (d <= seg) return out.lerpVectors(p[i - 1], p[i], seg ? d / seg : 0);
      d -= seg;
    }
    return out.copy(p[p.length - 1]);
  }

  function updatePeople(state, dt, speed) {
    const seen = new Set();
    const walkSpeed = 24 * Math.max(1, speed);
    for (const o of state.occupants) {
      let w = walkers.get(o.id);
      if (!w) {
        if (o.status !== "active" && !o.inside) continue;
        const g = makePerson(o);
        g.visible = false;
        people.add(g);
        w = { g, state: "away", path: outsidePath(o), d: 0 };
        w.len = pathLength(w.path);
        walkers.set(o.id, w);
      }
      seen.add(o.id);
      const wantIn = o.inside;
      // State transitions
      if (wantIn && (w.state === "away" || w.state === "out")) {
        if (w.state === "away") w.d = 0;
        w.state = "in";
      } else if (!wantIn && (w.state === "inside" || w.state === "in")) {
        if (w.state === "inside") w.d = w.len;
        w.state = "out";
        w.quit = o.status === "quit";
      }
      const g = w.g;
      if (w.state === "in") {
        w.d += walkSpeed * dt;
        g.visible = true;
        pointOnPath(w.path, w.d, g.position);
        faceAlong(g, w.path, w.d, 1);
        if (w.d >= w.len) {
          w.state = "inside";
          g.position.copy(deskPos(o.zone, o.desk));
          g.rotation.y = { N: Math.PI, S: 0, E: Math.PI / 2, W: -Math.PI / 2 }[o.side];
        }
      } else if (w.state === "out") {
        w.d -= walkSpeed * dt;
        g.visible = true;
        pointOnPath(w.path, Math.max(0, w.d), g.position);
        faceAlong(g, w.path, w.d, -1);
        g.userData.carry.visible = !!w.quit;
        if (w.d <= 0) {
          w.state = "away";
          g.visible = false;
          if (w.quit) {
            people.remove(g);
            walkers.delete(o.id);
            continue;
          }
        }
      } else if (w.state === "inside") {
        g.visible = !heatView || true;
        g.position.y = deskPos(o.zone, o.desk).y + Math.abs(Math.sin(performance.now() / 400 + o.id)) * 0.06;
      } else {
        g.visible = false;
      }
      if (g.visible) {
        const face = moodFace(o);
        const ring = moodRing(o.mood);
        if (g.userData.face !== face + ring) {
          g.userData.sprite.material.map = emojiTexture(face, ring);
          g.userData.sprite.material.needsUpdate = true;
          g.userData.face = face + ring;
        }
      }
    }
    for (const [id, w] of walkers) {
      if (!seen.has(id)) {
        people.remove(w.g);
        walkers.delete(id);
      }
    }
  }
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();
  function faceAlong(g, path, d, dir) {
    pointOnPath(path, Math.max(0, d), tmpA);
    pointOnPath(path, Math.max(0, d + dir * 0.5), tmpB);
    const dx = tmpB.x - tmpA.x;
    const dz = tmpB.z - tmpA.z;
    if (Math.hypot(dx, dz) > 1e-3) g.rotation.y = Math.atan2(dx, dz);
    g.position.y = Math.abs(Math.sin(d * 2)) * 0.12;
  }

  // ---------- flashes and shake ----------
  const flashes = []; // { part, color, until }
  function flash(part, status) {
    flashes.push({ part, color: status === "bad" ? C.red : status === "warn" ? C.yellow : C.green, until: performance.now() + 2600 });
  }
  let shakeUntil = 0;
  let shakeAmp = 0;
  function shake(sec, amp = 0.5) {
    shakeUntil = performance.now() + sec * 1000;
    shakeAmp = amp;
  }

  // ---------- camera snap ----------
  let snap = null;
  function snapRotate(dir) {
    const off = camera.position.clone().sub(controls.target);
    const sph = new THREE.Spherical().setFromVector3(off);
    snap = { from: sph.theta, to: Math.round((sph.theta + (dir * Math.PI) / 2 - Math.PI / 4) / (Math.PI / 2)) * (Math.PI / 2) + Math.PI / 4, t: 0, sph };
  }

  // ---------- per-frame ----------
  const tmpC = new THREE.Color();
  const now = () => performance.now();

  function setEmissive(mat, color, intensity) {
    mat.emissive.copy(color);
    mat.emissiveIntensity = intensity;
  }

  function update(state, dt, speed) {
    const t = now();
    const d = state.design;
    const key = JSON.stringify({ wwr: d.wwr, shades: d.shades, lateral: d.lateral });
    if (key !== designKey) {
      designKey = key;
      buildBuilding(d);
    }
    const rk = JSON.stringify({ u: d.units, pv: d.pv, p: [...pendingSlots] });
    if (rk !== roofKey) {
      roofKey = rk;
      buildRoof(d);
    }
    if (shownService === null) {
      shownService = d.service;
      sizeTransformer();
    }
    if (!pendingService && shownService !== d.service && !trucks.length) {
      shownService = d.service;
      sizeTransformer();
    }

    const live = state.live;
    const day = state.day;
    // Sun and sky
    if (live) {
      const alt = live.sun.altitude * (Math.PI / 180);
      const az = live.sun.azimuth * (Math.PI / 180);
      const dir = new THREE.Vector3(-Math.sin(az) * Math.cos(alt), Math.sin(alt), Math.cos(az) * Math.cos(alt));
      const dayF = THREE.MathUtils.clamp((live.sun.altitude + 4) / 14, 0, 1);
      if (live.sun.altitude > -2) sun.position.copy(dir.multiplyScalar(80));
      else sun.position.set(30, 60, -20);
      sun.intensity = 0.15 + 2.6 * dayF * (1 - 0.55 * day.cloud);
      sun.color.setHSL(0.1, 0.6 * (1 - dayF) + 0.1, 0.5 + 0.45 * dayF);
      hemi.intensity = 0.35 + 0.85 * dayF;
      ambient.intensity = 0.25 - 0.1 * dayF;
      const sky = tmpC.copy(C.day).lerp(C.cloudy, day.cloud);
      if (day.event === "heatwave") sky.lerp(C.heat, 0.45);
      const dusk = THREE.MathUtils.clamp(1 - Math.abs(live.sun.altitude - 2) / 10, 0, 1);
      sky.lerp(C.dusk, dusk * 0.6 * (1 - day.cloud));
      sky.lerp(C.nightSky, 1 - dayF);
      scene.background.copy(sky);
    }
    // Season
    const winter = day.snowPsf > 0;
    groundMat.color.copy(C.grass).lerp(C.snowGround, winter ? 0.85 : 0);
    const month = day.month;
    trees.forEach((tr, i) => {
      const leaves = tr.userData.leaves;
      leaves.visible = !(month === 11 || month <= 2);
      leaves.material.color.set(month === 9 ? 0xe07a2f : month === 10 ? 0xc2410c : month === 3 ? 0x9bd27a : 0x4f9d4f);
      const windy = day.event === "windstorm" && live && Math.abs(live.hour - 14) < 2.5;
      tr.rotation.z = windy ? Math.sin(t / 120 + i) * 0.12 : Math.sin(t / 1400 + i) * 0.015;
    });
    // Snow on the roof
    if (snowLayer) {
      const psf = day.event === "blizzard" && live && live.hour >= 8 ? day.snowPsf : winter ? day.snowPsf : 0;
      snowLayer.visible = psf > 0 && !heatView;
      const hgt = Math.max(0.05, (psf / 22) * 0.9);
      snowLayer.scale.y = hgt;
      snowLayer.position.y = ROOF_Y + SLAB / 2 + hgt / 2;
    }
    // Zone colours and window lights
    if (live) {
      const night = THREE.MathUtils.clamp((8 - live.sun.altitude) / 12, 0, 1);
      ZONES.forEach((z, i) => {
        tempColor(state.temps[i], tintMats[i].color);
        tintMats[i].opacity = heatView ? 0.85 : 0.32;
        const lit = live.open && !live.blackout && live.present[i] > 0 ? 1 : 0;
        setEmissive(glassMats[i], C.lit, night * lit * 0.9);
      });
    }
    // Rooftop units
    const a = state.analysis;
    if (live) {
      const work = live.cooling.cap ? (live.cooling.delivered + live.heating.delivered) / live.cooling.cap : 0;
      const maxed = live.cooling.demand > live.cooling.cap * 1.02 && live.cooling.cap > 0;
      for (const u of units) {
        u.mesh.userData.fan.rotation.y += dt * (live.blackout ? 0 : 4 + 22 * Math.min(1, work));
        const lamp = u.mesh.userData.lamp.material;
        const col = live.blackout ? C.black : maxed ? C.red : C.green;
        lamp.color.copy(col);
        setEmissive(lamp, col, maxed ? 0.6 + 0.6 * Math.sin(t / 120) : 1);
      }
    }
    // Stressed parts glow (design checks), plus chain-reaction flashes.
    const pulse = 0.35 + 0.35 * Math.sin(t / 180);
    const glow = { roof: null, walls: null, transformer: null, units: null };
    if (a.roofDC > 1) glow.roof = C.red;
    if (a.latDC > 1) glow.walls = C.red;
    if (a.elecDC > 1 || (live && live.blackout)) glow.transformer = C.red;
    if (a.coolDC > 1.15 && live && live.cooling.demand > live.cooling.cap) glow.units = C.red;
    for (let i = flashes.length - 1; i >= 0; i--) {
      if (flashes[i].until < t) flashes.splice(i, 1);
      else glow[flashes[i].part] = glow[flashes[i].part] === C.red ? C.red : flashes[i].color;
    }
    setEmissive(roofMat, glow.roof || C.black, glow.roof ? pulse : 0);
    const worst = a.lateral.worst;
    for (const s of SIDES) {
      if (!wallMats[s]) continue;
      const along = worst === "Y" ? s === "E" || s === "W" : s === "N" || s === "S";
      const g = glow.walls && (along || glow.walls !== C.red) ? glow.walls : null;
      setEmissive(wallMats[s], g || C.black, g ? pulse * 0.8 : 0);
    }
    setEmissive(transformerMat, glow.transformer || C.black, glow.transformer ? pulse * 1.4 : 0);
    for (const u of units) setEmissive(u.mesh.userData.body.material, glow.units || C.black, glow.units ? pulse * 0.8 : 0);

    // Weather particles
    const snowing = day.event === "blizzard" || (winter && day.cloud > 0.65);
    snow.visible = snowing;
    if (snowing) {
      const p = snowGeo.attributes.position.array;
      const fall = day.event === "blizzard" ? 9 : 4;
      for (let i = 0; i < SNOW_N; i++) {
        p[i * 3 + 1] -= fall * dt;
        p[i * 3] += (day.event === "blizzard" ? -4 : -0.6) * dt;
        if (p[i * 3 + 1] < 0) p[i * 3 + 1] += 45;
        if (p[i * 3] < -55) p[i * 3] += 110;
      }
      snowGeo.attributes.position.needsUpdate = true;
    }
    const windy = day.event === "windstorm" && live && Math.abs(live.hour - 14) < 2.5;
    wind.visible = !!windy;
    if (windy) {
      const p = windGeo.attributes.position.array;
      for (let i = 0; i < WIND_N; i++) {
        const s = windSeed[i];
        s[2] -= 70 * dt;
        if (s[2] < -60) s[2] += 120;
        p.set([s[0], s[1], s[2], s[0], s[1], s[2] + 4], i * 6);
      }
      windGeo.attributes.position.needsUpdate = true;
    }

    updatePeople(state, dt, speed);
    updateHelis(dt);
    updateTrucks(dt);
    updatePuffs(dt);

    // Camera snap
    if (snap) {
      snap.t = Math.min(1, snap.t + dt / 0.45);
      const th = snap.from + (snap.to - snap.from) * ease(snap.t);
      const off = new THREE.Vector3().setFromSphericalCoords(snap.sph.radius, snap.sph.phi, th);
      camera.position.copy(controls.target).add(off);
      camera.lookAt(controls.target);
      if (snap.t >= 1) snap = null;
    }
    controls.update();
    // Shake (after controls so it doesn't accumulate)
    const shaking = t < shakeUntil;
    const sx = shaking ? (Math.random() - 0.5) * shakeAmp : 0;
    const sz = shaking ? (Math.random() - 0.5) * shakeAmp : 0;
    for (const g of [building, roof, furniture, people]) g.position.set(sx, 0, sz);
    renderer.render(scene, camera);
  }

  // Screen position of an occupant's head, for speech bubbles.
  const proj = new THREE.Vector3();
  function screenPos(id) {
    const w = walkers.get(id);
    if (!w || !w.g.visible) return null;
    proj.copy(w.g.position).add(new THREE.Vector3(0, 3.3, 0)).project(camera);
    const r = renderer.domElement.getBoundingClientRect();
    return { x: ((proj.x + 1) / 2) * r.width, y: ((1 - proj.y) / 2) * r.height };
  }

  function setHeatView(on) {
    heatView = on;
    applyHeatView();
  }

  // New game: forget people and roof state, keep helicopters flying.
  function reset() {
    for (const w of walkers.values()) people.remove(w.g);
    walkers.clear();
    pendingSlots.clear();
    designKey = "";
    roofKey = "";
    shownService = null;
    pendingService = null;
  }

  return { update, heliDeliver, heliRemove, truck, flash, shake, snapRotate, screenPos, setHeatView, reset, renderer, camera, controls };
}
