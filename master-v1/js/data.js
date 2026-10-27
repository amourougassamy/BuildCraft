// ============================================================
// data.js — every number to tune lives here.
// Money is whole coins. Time is days (12 months x 30 days).
// All numbers are illustrative game values, not engineering.
// ============================================================

export const DAYS = 360;
export const MONTH_DAYS = 30;
export const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Run speed: days of game time per real second at 1x. 6 days/s = 60 s year.
export const DAYS_PER_SEC = 6;
export const SPEEDS = [1, 2, 4];
export const WARN_DAYS = 12;       // banner shows this many days before a hazard
export const HAZARD_DAYS = 4;      // how long a hazard shakes / blows / floods
export const REPAIR_DAYS = 15;     // building is closed while a crew fixes one part
export const OUTAGE_DAYS = 20;     // power stays out this long without backup
export const HOT_DAYS = 20;        // heat waves last this long
export const BROKE_DAYS = 45;      // closed and can't afford a repair this long = game over

export const START_HAPPY = 70;     // everyone starts happy
export const HEALTH_CLOSED = 50;   // below this the building must close
export const HIT_DAMAGE = 25;      // health lost per point a hazard beats the building by
export const SETTLE_DAMAGE = 20;   // health lost each time a weak foundation sinks
export const SETTLE_DAYS = [90, 210];

// Report card. Score 0-100 per subject, weighted into one overall score.
export const WEIGHTS = { safety: 30, happy: 25, open: 20, eco: 15, budget: 10 };
export const GRADES = [[90, "A+"], [85, "A"], [75, "B"], [65, "C"], [50, "D"], [0, "F"]];
export const PASS_SCORE = 65;      // C or better unlocks the next site
export const GHOST_CAP = 84;       // any ghost caps the overall score just below an A

// layers: the ground under the grass, top first (PLAN.md M3). h is in site-scene units and the
// layers add up to SOIL_DEPTH. Footings reach 0.1 into the top layer, a mat slab 0.3,
// and deep piles 4.7, so a soil that needs piles must have rock: true starting above 4.7.
export const SOIL_DEPTH = 5.4;
export const SOILS = {
  rock: { name: "Solid Rock", need: 1, color: 0xa7a3a0, desc: "Super strong ground. Shallow footings work great!",
          layers: [{ name: "Solid rock", h: 2.4, color: 0xa7a3a0, rock: true }, { name: "Deep bedrock", h: 3, color: 0x8d8a94, rock: true }] },
  firm: { name: "Firm Gravel", need: 1, color: 0xcfa86c, desc: "Strong packed ground. Shallow footings are fine for short buildings.",
          layers: [{ name: "Packed gravel", h: 3.2, color: 0xcfa86c }, { name: "Solid rock", h: 2.2, color: 0x8d8a94, rock: true }] },
  clay: { name: "Soft Clay", need: 2, color: 0xb08f80, desc: "Squishy ground! Heavy buildings sink unless the foundation spreads out (mat slab) or goes deep (piles).",
          layers: [{ name: "Soft squishy clay", h: 4, color: 0xb08f80 }, { name: "Solid rock", h: 1.4, color: 0x8d8a94, rock: true }] },
  sand: { name: "Wet Sand", need: 3, color: 0xe8cf86, liquefy: true,
          desc: "In an earthquake, wet sand turns soupy like a milkshake (liquefaction)! Only deep piles reach the solid rock below.",
          layers: [{ name: "Wet sand", h: 2.2, color: 0xe8cf86 }, { name: "Soupy mud", h: 1.8, color: 0x9c8a6a },
                   { name: "Solid rock", h: 1.4, color: 0x8d8a94, rock: true }] },
};

export const HAZARDS = {
  quake: { name: "earthquake", ico: "🌋", stat: "quake" },
  wind: { name: "windstorm", ico: "🌪️", stat: "wind" },
  flood: { name: "flood", ico: "🌊", stat: "flood" },
  heat: { name: "heat wave", ico: "🥵", stat: "heat" },
};
export const POWER_NAMES = ["", "small", "medium", "BIG", "MEGA"];

// What breaks when a hazard wins. Repair cost in coins.
export const BREAKS = {
  quake: [{ part: "cracks", label: "Cracked walls", ico: "🧱", cost: 3 }, { part: "frame", label: "Bent frame", ico: "🏗️", cost: 5 }],
  wind: [{ part: "roof", label: "Roof torn up", ico: "🏠", cost: 3 }, { part: "windows", label: "Smashed windows", ico: "🪟", cost: 2 }],
  flood: [{ part: "floor", label: "Soggy floors", ico: "💧", cost: 3 }, { part: "power", label: "Wet wiring", ico: "🔌", cost: 2 }],
  settle: [{ part: "found", label: "Sinking foundation", ico: "⬇️", cost: 4 }],
};

// Sections on the design screen. Option 0 of each item is the cheapest (Code Minimum).
// quake / wind / flood / heat / fire add strength; happy and eco add points;
// power keeps the lights on in an outage; bolted keeps shelves standing.
export const SECTIONS = [
  { key: "structure", name: "Structure", ico: "🏗️", color: "#e8655a", items: [
    { key: "found", name: "Foundation", foundation: true, options: [
      { label: "Shallow Footings", ico: "🦶", cost: 2, level: 1, tip: "Concrete \"feet\" just under the ground. Great on rock or firm soil." },
      { label: "Mat Slab", ico: "🟫", cost: 5, level: 2, tip: "One big thick slab under the whole building. It spreads the weight like a snowshoe." },
      { label: "Deep Piles", ico: "📍", cost: 9, level: 3, tip: "Long poles driven down to solid rock. Best for soft or sandy soil." } ] },
    { key: "frame", name: "Frame", options: [
      { label: "Wood Frame", ico: "🪵", cost: 3, tip: "Meets the rules. Strong enough to keep people safe in normal weather." },
      { label: "Braced Steel", ico: "🔩", cost: 6, quake: 1, wind: 1, tip: "Steel X-braces hold the building steady when it shakes or the wind pushes." } ] },
    { key: "iso", name: "Quake Pads", options: [
      { label: "Bolted Down", ico: "🔧", cost: 0, tip: "The building is bolted to its foundation so it can't slide off." },
      { label: "Shake Absorbers", ico: "🛞", cost: 6, quake: 2, tip: "Rubber pads (base isolators) let the ground wiggle while the building stays calm." } ] },
  ]},
  { key: "arch", name: "Outside", ico: "🏠", color: "#5b9bd5", items: [
    { key: "windows", name: "Windows", options: [
      { label: "Regular Glass", ico: "🪟", cost: 1, tip: "Normal windows." },
      { label: "Storm-Proof", ico: "🛡️", cost: 3, wind: 1, tip: "Extra-tough glass that won't break when stuff flies around in a storm." } ] },
    { key: "roof", name: "Roof", options: [
      { label: "Regular Roof", ico: "🏠", cost: 1, tip: "Keeps the rain out." },
      { label: "Strapped Roof", ico: "⛓️", cost: 3, wind: 1, tip: "Metal straps tie the roof to the walls so wind can't lift it off." } ] },
    { key: "raise", name: "Ground Floor", options: [
      { label: "At Ground Level", ico: "⬜", cost: 0, tip: "The floor sits right on the ground." },
      { label: "Raised Floor", ico: "⬆️", cost: 3, flood: 2, tip: "Lift the floor up high so flood water flows underneath." } ] },
  ]},
  { key: "inside", name: "Inside", ico: "🛋️", color: "#a77bd1", items: [
    { key: "shelves", name: "Shelves", options: [
      { label: "Standing", ico: "📚", cost: 0, tip: "Shelves just stand against the wall." },
      { label: "Bolted to Wall", ico: "🔩", cost: 1, bolted: true, tip: "Bolted shelves can't tip over on anyone in an earthquake." } ] },
    { key: "sprinklers", name: "Fire Safety", options: [
      { label: "Smoke Alarms", ico: "🚨", cost: 0, tip: "Beep beep! Alarms tell everyone to get out, but they can't put out a fire." },
      { label: "Fire Sprinklers", ico: "🚿", cost: 3, fire: 2, tip: "When it gets too hot, water sprays from the ceiling and puts the fire out." } ] },
  ]},
  { key: "mep", name: "Power & Air", ico: "💡", color: "#f0a43a", items: [
    { key: "hvac", name: "Heating & Cooling", options: [
      { label: "Basic Heat & AC", ico: "🌡️", cost: 2, heat: 1, tip: "Keeps rooms warm enough and cool enough." },
      { label: "Heat Pump", ico: "🌬️", cost: 4, heat: 2, happy: 6, eco: 2, tip: "Quiet, fresh air, just-right temperature, and it uses less energy." } ] },
    { key: "backup", name: "Backup Power", options: [
      { label: "None", ico: "🔌", cost: 0, tip: "If the power goes out, the lights go off and the doors close." },
      { label: "Generator", ico: "⚡", cost: 3, power: true, tip: "Keeps the lights on after a storm knocks out the power lines." } ] },
    { key: "lights", name: "Lights", options: [
      { label: "Old Bulbs", ico: "💡", cost: 0, tip: "Regular bulbs." },
      { label: "LED Lights", ico: "✨", cost: 1, eco: 1, tip: "Bright lights that use way less electricity." } ] },
  ]},
  { key: "eco", name: "Eco", ico: "🌱", color: "#5cb85c", items: [
    { key: "energy", name: "Energy", options: [
      { label: "Power Plant", ico: "🏭", cost: 0, tip: "Electricity comes through the wires from the power plant." },
      { label: "Solar + Battery", ico: "☀️", cost: 5, eco: 3, happy: 3, power: true,
        tip: "Clean sun power. The battery keeps the lights on when the power lines are down. (Solar panels without a battery switch off in a blackout!)" } ] },
    { key: "garden", name: "Rain Garden", options: [
      { label: "Storm Drain", ico: "🕳️", cost: 0, tip: "Rainwater runs down the drain." },
      { label: "Rain Garden", ico: "🌼", cost: 2, eco: 2, happy: 3, tip: "Plants soak up rainwater, and butterflies come to visit." } ] },
    { key: "trees", name: "Shade Trees", options: [
      { label: "No Trees", ico: "🟫", cost: 0, tip: "Bare ground." },
      { label: "Shade Trees", ico: "🌳", cost: 1, eco: 1, heat: 1, happy: 2, tip: "Trees shade the walls and keep the building cooler in summer." } ] },
  ]},
];
export const ITEMS = Object.fromEntries(SECTIONS.flatMap(s => s.items.map(i => [i.key, { ...i, section: s.key }])));
export const ECO_MAX = Object.values(ITEMS).reduce((n, i) => n + Math.max(...i.options.map(o => o.eco || 0)), 0);

// The regulars. loves: option keys (index > 0) that make them extra happy. worries: hazard that scares them most.
export const CAST = [
  { key: "gus", name: "Grandpa Gus", shirt: 0x7fb3d5, skin: 0xf1c27d, loves: "lights", worries: "heat" },
  { key: "rosa", name: "Rosa", shirt: 0xf28b82, skin: 0xc68642, loves: "garden", worries: "quake" },
  { key: "zoe", name: "Zoe", shirt: 0xfdd663, skin: 0xffdbac, loves: "energy", worries: "wind" },
  { key: "leo", name: "Leo", shirt: 0x81c995, skin: 0x8d5524, loves: "hvac", worries: "flood" },
  { key: "park", name: "Ms. Park", shirt: 0xc58af9, skin: 0xe0ac69, loves: "trees", worries: "quake" },
  { key: "biscuit", name: "Biscuit the dog", pet: true, shirt: 0xd9a066, skin: 0xd9a066, loves: "garden", worries: "wind" },
];

// Sites on the world map, easiest first. Each one is a given scenario.
// events: [hazard, power, month]. Fixed per site so a retry plays the same year.
// shell: what the building itself costs, basic chairs and tables included.
export const LEVELS = [
  { key: "rocky", name: "Rocky Ridge", region: "Mountain Valley", ico: "🏔️", building: "Library", bico: "📚",
    floors: 1, soil: "rock", budget: 28, shell: 9, visitors: 3, perCoin: 140, map: [-14, 9],
    brief: "the mountain town of Rocky Ridge needs a cozy little library",
    // A BIG windstorm beats Code Minimum by 2 (fail); one wind upgrade cuts that to 1 (pass).
    events: [["wind", 3, 3], ["heat", 1, 6], ["quake", 1, 9]] },
  { key: "prairie", name: "Prairie Plains", region: "Big Sky Farms", ico: "🌾", building: "School", bico: "🏫",
    floors: 2, soil: "firm", budget: 32, shell: 11, visitors: 4, perCoin: 180, map: [-4, 13], windWord: "tornado",
    brief: "the farm kids of Prairie Plains need a new school",
    events: [["wind", 3, 4], ["heat", 2, 6], ["wind", 2, 9]] },
  { key: "breezy", name: "Breezy Bay", region: "Sunny Coast", ico: "🏖️", building: "Aquarium", bico: "🐠",
    floors: 2, soil: "clay", budget: 38, shell: 11, visitors: 4, perCoin: 180, map: [8, 10], windWord: "hurricane",
    brief: "the beach town of Breezy Bay wants an aquarium by the sea",
    events: [["heat", 2, 5], ["wind", 3, 7], ["flood", 2, 8]] },
  { key: "shaky", name: "Shaky Hills", region: "Rumble Valley", ico: "🌋", building: "Hospital", bico: "🏥",
    floors: 2, soil: "sand", budget: 46, shell: 13, visitors: 3, perCoin: 140, map: [12, -2], hospital: true,
    brief: "Shaky Hills needs a hospital that stays open even after an earthquake",
    events: [["quake", 3, 2], ["wind", 1, 5], ["quake", 4, 9]] },
  { key: "mega", name: "Mega City", region: "Mega City", ico: "🏙️", building: "Apartment Tower", bico: "🏢",
    floors: 3, soil: "clay", budget: 56, shell: 17, visitors: 5, perCoin: 220, map: [0, -10], tall: true, windWord: "hurricane",
    brief: "Mega City needs a tall apartment tower ready for anything",
    events: [["quake", 3, 3], ["heat", 3, 6], ["wind", 3, 7], ["flood", 2, 8]] },
];
