// ============================================================
// data.js — OWNED BY SQUAD 3 (Content and data)
// Every number and every word kids read lives here.
// Coins: 1 coin = $1. Figures are illustrative game values;
// have an estimator and an engineer sanity-check them.
// Option keys elsewhere are written "decision:option", e.g. "roof:snow".
// ============================================================

window.GAME = {
  scenario: {
    name: "Riverside Library",
    city: "Minneapolis, Minnesota",
    client: { name: "Rosa", role: "the librarian" },
    intro: [
      { who: "rosa", text: "Hi! I'm Rosa, the librarian. Our town saved up 4 million coins for a brand-new library by the river!" },
      { who: "rivet", text: "And I'm Rivet. Beavers are nature's builders! I'll help you pick every piece." },
      { who: "rosa", text: "Our regulars are counting on you. Build something that keeps them happy, cozy and SAFE, all year long." },
    ],
  },

  budget: 4000000,
  basePackage: 2700000, // the must-haves: sprinklers, ramps, basic rooms
  feeRate: 0.09, // design team (hidden inside the jar for kids)
  rainyDayRate: 0.07, // contingency, also hidden; unused coins come back
  baselineEnergy: 38000,

  weights: { people: 35, safety: 25, coins: 20, planet: 20 },

  // deadly: a miss of 3+ points can turn someone into a ghost
  hazards: {
    snow: { label: "Snow", power: "Snow power", repair: 25000, days: 2, deadly: true,
      hurt: "The roof sagged under all that snow!", crash: "The roof caved in!" },
    wind: { label: "Wind", power: "Wind power", repair: 30000, days: 3, deadly: true,
      hurt: "The wind ripped off part of the roof!", crash: "The wind tore the roof right off!" },
    flood: { label: "Flood", power: "Flood power", repair: 40000, days: 5, deadly: true,
      hurt: "Water poured into the lobby!", crash: "The whole first floor flooded!" },
    hail: { label: "Hail", power: "Hail power", repair: 15000, days: 0.5, deadly: false,
      hurt: "Hail cracked the windows!", crash: "Hail smashed the windows!" },
    cold: { label: "Cold", power: "Cozy power", repair: 10000, days: 2, deadly: true,
      hurt: "The pipes froze and the heat quit!", crash: "Everything froze solid!" },
    heat: { label: "Heat", power: "Cool power", repair: 5000, days: 1, deadly: false,
      hurt: "It's like an oven in here!", crash: "It's way too hot to stay inside!" },
  },

  // Which piece sets each power. Two pieces = the weaker one wins.
  governs: { snow: ["roof"], wind: ["frame"], flood: ["site"], hail: ["roof", "windows"], cold: ["walls"], heat: ["hvac"] },

  decisions: [
    { id: "site", title: "Where to build", type: "one", options: [
      { id: "river", name: "By the river", kid: "Cheap land with a river view. Rivers like to flood, though.", cost: 0, ratings: { flood: 2 } },
      { id: "hill", name: "Up the hill", kid: "Costs more, but the water can't reach you up here.", cost: 150000, ratings: { flood: 9 } },
    ]},
    { id: "soils", title: "Dig test", type: "one", options: [
      { id: "skip", name: "Skip it", kid: "Save coins and hope the ground is solid. (3 in 10 chance it isn't!)", cost: 0, risk: { chance: 0.3, cost: 180000 } },
      { id: "test", name: "Test the dirt", kid: "Scientists check the ground first. No surprises.", cost: 8000 },
    ]},
    { id: "frame", title: "Frame", type: "one", options: [
      { id: "wood", name: "Wood frame", kid: "Light and cheap. Okay in wind.", cost: 0, ratings: { wind: 5 }, planet: 10 },
      { id: "steel", name: "Steel frame", kid: "Super strong when the wind howls.", cost: 120000, ratings: { wind: 8 }, planet: -10 },
      { id: "timber", name: "Giant timber", kid: "Huge wooden beams. Strong, cozy and good for the planet.", cost: 200000, ratings: { wind: 7 }, planet: 20 },
    ]},
    { id: "roof", title: "Roof", type: "one", options: [
      { id: "basic", name: "Basic roof", kid: "Keeps the rain out. Not much else.", cost: 0, ratings: { snow: 6, hail: 4 } },
      { id: "snow", name: "Snow-strong roof", kid: "Holds a GIANT pile of snow and shrugs off hail.", cost: 45000, ratings: { snow: 9, hail: 7 } },
      { id: "garden", name: "Garden roof", kid: "Plants on top! Soaks up rain and keeps it cool.", cost: 160000, ratings: { snow: 8, hail: 6 }, bonus: { flood: 1 }, energySave: 2000, planet: 10 },
    ]},
    { id: "walls", title: "Walls", type: "one", options: [
      { id: "thin", name: "Thin walls", kid: "Fine in fall. Brrr in January.", cost: 0, ratings: { cold: 5 } },
      { id: "cozy", name: "Cozy walls", kid: "Warmer inside, smaller heating bill.", cost: 60000, ratings: { cold: 7 }, energyPct: -0.15 },
      { id: "toasty", name: "Super-cozy walls", kid: "Toasty all winter long.", cost: 140000, ratings: { cold: 9 }, energyPct: -0.35 },
    ]},
    { id: "windows", title: "Windows", type: "one", options: [
      { id: "regular", name: "Regular windows", kid: "They work. Hail might crack them.", cost: 0, ratings: { hail: 5 } },
      { id: "super", name: "Super windows", kid: "Three layers of glass: tough, warm and full of sunshine.", cost: 70000, ratings: { hail: 7 }, energyPct: -0.08 },
    ]},
    { id: "hvac", title: "Heating and cooling", type: "one", options: [
      { id: "box", name: "Big rooftop box", kid: "Cheap to buy, pricey to run, and kind of noisy.", cost: 0, ratings: { heat: 5 }, planet: -5 },
      { id: "pump", name: "Heat pump", kid: "Smart, quiet and uses way less energy.", cost: 90000, ratings: { heat: 7 }, energyPct: -0.3, planet: 5 },
      { id: "earth", name: "Earth heat", kid: "Pipes deep underground borrow the earth's warmth.", cost: 350000, ratings: { heat: 8 }, energyPct: -0.6, planet: 15 },
    ]},
    { id: "extras", title: "Extras", type: "multi", options: [
      { id: "solar", name: "Solar panels", kid: "Free power from the sun.", cost: 110000, energySave: 9000, planet: 15 },
      { id: "generator", name: "Backup generator", kid: "Keeps the lights and heat on when the power goes out.", cost: 60000, bonus: { cold: 3 } },
      { id: "raingarden", name: "Rain garden", kid: "Thirsty plants that drink up floodwater.", cost: 35000, bonus: { flood: 1 }, planet: 5 },
      { id: "skylights", name: "Skylights", kid: "Sunshine pours in from above.", cost: 50000, energySave: 1500 },
    ]},
  ],

  // Six regulars. loves = pieces that make them smile (at least one = happy).
  // worries = hazards that make them sad. exposure = who is in harm's way
  // when a storm misses by 3+ (highest number goes first).
  cast: [
    { id: "maya", name: "Maya", tag: "age 10", line: "Comes every day after school",
      loves: ["extras:skylights", "frame:timber"], worries: ["wind"], exposure: { wind: 3, snow: 1 },
      color: "#ff7a59", hair: "#3b2416", skin: "#c68863",
      happy: "This reading nook is the BEST!", sad: "Aww, I wish it was brighter in here.", closed: "The library's closed?! Again?" },
    { id: "okafor", name: "Mr. Okafor", tag: "age 72", line: "Reads the paper every morning",
      loves: ["walls:cozy", "walls:toasty", "extras:generator"], worries: ["cold", "snow"], exposure: { snow: 3, cold: 3 },
      color: "#5b6fd6", hair: "#d9d9d9", skin: "#7a4a2c",
      happy: "Warm as toast. Perfect.", sad: "Brrr! It's freezing in here!", closed: "No paper today, I suppose." },
    { id: "rosa", name: "Rosa", tag: "librarian", line: "Keeps every book safe",
      loves: ["site:hill", "roof:snow", "roof:garden"], worries: ["flood"], exposure: { flood: 2, wind: 1 },
      color: "#2bb673", hair: "#1c1c1c", skin: "#e0a77a",
      happy: "Dry books, happy librarian!", sad: "Is that water near my books?!", closed: "I hate locking the doors." },
    { id: "leo", name: "Leo", tag: "age 7", line: "Never misses story time",
      loves: ["windows:super", "extras:skylights"], worries: ["heat", "hail"], exposure: { heat: 3, hail: 2 },
      color: "#ffc233", hair: "#e3a23a", skin: "#f1c7a0",
      happy: "Story time is AWESOME!", sad: "It's too hot and the windows are scary.", closed: "But it's story day!" },
    { id: "priya", name: "Priya", tag: "age 16", line: "Studies for big exams",
      loves: ["hvac:pump", "hvac:earth", "extras:solar", "extras:generator"], worries: ["cold"], exposure: { cold: 2, flood: 1 },
      color: "#a259ff", hair: "#2a1a10", skin: "#a8714f",
      happy: "Quiet, warm, power on. Studying mode!", sad: "That rooftop box is SO loud.", closed: "My exam is tomorrow!" },
    { id: "biscuit", name: "Biscuit", tag: "library cat", line: "Naps on sunny windowsills",
      loves: ["windows:super", "extras:skylights"], worries: ["flood"], exposure: { flood: 3 },
      color: "#f29a3a", cat: true,
      happy: "Purrrrr.", sad: "Mrrrow?", closed: "Meow." },
  ],

  presets: {
    bargain: { label: "The Bargain", choices: { site: "river", soils: "skip", frame: "wood", roof: "basic", walls: "thin", windows: "regular", hvac: "box", extras: [] } },
    longgame: { label: "The Long Game", choices: { site: "hill", soils: "test", frame: "timber", roof: "snow", walls: "cozy", windows: "super", hvac: "pump", extras: ["raingarden", "skylights"] } },
  },
  defaultChoices: { site: "river", soils: "skip", frame: "wood", roof: "basic", walls: "thin", windows: "regular", hvac: "box", extras: [] },

  seasons: ["Spring", "Summer", "Fall", "Winter"],

  weatherDeck: [
    { id: "icedam", name: "Ice storm", season: "Spring", chance: 0.35, min: 4, max: 7, hazard: "snow", intro: "Ice is piling up on the roof!" },
    { id: "flood", name: "River flood", season: "Spring", chance: 0.2, min: 3, max: 9, hazard: "flood", intro: "The river is rising... fast!" },
    { id: "hail", name: "Hailstorm", season: "Summer", chance: 0.25, min: 4, max: 9, hazard: "hail", intro: "Hail the size of golf balls!" },
    { id: "wind", name: "Thunderstorm", season: "Summer", chance: 0.3, min: 4, max: 8, hazard: "wind", intro: "Here comes a howling thunderstorm!" },
    { id: "heatwave", name: "Heat wave", season: "Summer", chance: 0.2, min: 5, max: 8, hazard: "heat", intro: "A sizzling heat wave rolls in!" },
    { id: "earlysnow", name: "Surprise snow", season: "Fall", chance: 0.15, min: 3, max: 6, hazard: "snow", intro: "Snow in October?!" },
    { id: "blizzard", name: "Blizzard", season: "Winter", chance: 0.4, min: 5, max: 10, hazard: "snow", intro: "A HUGE blizzard is dumping snow!" },
    { id: "vortex", name: "Polar vortex", season: "Winter", chance: 0.3, min: 6, max: 10, hazard: "cold", intro: "The coldest air in years is coming!" },
  ],

  demoWeather: [
    { season: "Spring", events: [{ id: "flood", intensity: 6 }] },
    { season: "Summer", events: [{ id: "hail", intensity: 7 }] },
    { season: "Fall", events: [] },
    { season: "Winter", events: [{ id: "blizzard", intensity: 9 }] },
  ],

  calm: {
    Spring: "Sunny spring days. Everyone's reading by the windows.",
    Summer: "A breezy summer. Story time is packed!",
    Fall: "Crunchy leaves and cozy reading. Not a storm in sight.",
    Winter: "A gentle, snowy winter. Hot cocoa in the lobby!",
  },

  reviews: [
    { stars: 3, text: "It stayed open every single day, even in the blizzard. The whole neighborhood loves it!" },
    { stars: 2, text: "Pretty good! A few rough days, but people keep coming back." },
    { stars: 1, text: "We saved coins, but our regulars paid for it. That's not what we asked for." },
  ],

  badges: [
    { id: "snowboss", name: "Snow Boss", how: "Survive a blizzard of 9 or more" },
    { id: "floodfighter", name: "Flood Fighter", how: "A flood hits and nobody gets wet" },
    { id: "pennypincher", name: "Penny Pincher", how: "3 stars with 250,000+ coins left" },
    { id: "peoplepleaser", name: "People Pleaser", how: "All six regulars happy" },
    { id: "greenmachine", name: "Green Machine", how: "Energy bill under 20,000 coins" },
  ],
};
