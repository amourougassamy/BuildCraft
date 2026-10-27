// ============================================================
// data.js — OWNED BY SQUAD 3 (Content and data)
// Every number in the game lives here. Edit freely; logic reads
// it at load. All dollar figures are illustrative game values —
// have an estimator and an engineer sanity-check before the demo.
// ============================================================

window.GAME = {
  scenario: {
    id: "riverside",
    name: "Riverside Branch Library",
    city: "Minneapolis, MN",
    size: "9,000 sf",
    site: "Two lots by the Mississippi",
    climate: "Cold winters, spring floods, summer hail",
    client: {
      name: "Dana Ortiz",
      role: "Library Director",
      quote:
        "We need a library the whole neighborhood can count on. Kids after school, seniors in a cold snap, everyone. Spend wisely: this money came from the community.",
    },
    twist: "Neighbors want it open as a warming center during cold snaps.",
  },

  budget: 4000000, // total project budget, $
  basePackage: 2700000, // required: code structure, sprinklers, accessibility, basic interiors
  feeRate: 0.09, // design team fees as share of construction
  baselineEnergy: 38000, // $/yr with code-minimum everything

  // Brief weights (sum to 100). A different client = different weights.
  weights: { people: 35, resilience: 25, budget: 20, planet: 20 },

  // repair: $ per point that an event exceeds the building's rating
  // days: days closed per point over
  hazards: {
    snow: { label: "Snow", repair: 25000, days: 2 },
    wind: { label: "Wind", repair: 30000, days: 3 },
    flood: { label: "Flood", repair: 40000, days: 5 },
    hail: { label: "Hail", repair: 15000, days: 0.5 },
    cold: { label: "Cold", repair: 10000, days: 2 },
    heat: { label: "Heat", repair: 5000, days: 1 },
  },

  // Which decision sets each hazard rating. Several = the weakest wins.
  governs: {
    snow: ["roof"],
    wind: ["structure"],
    flood: ["site"],
    hail: ["roof", "windows"],
    cold: ["insulation"],
    heat: ["hvac"],
  },

  // type "one" = pick one option; "multi" = pick any number
  // option fields: cost ($ added), ratings {hazard: 0-10}, bonus {hazard: +n},
  // energyPct (-0.15 = 15% less energy), energySave ($/yr off),
  // people / planet (meter points), risk (soils gamble)
  decisions: [
    {
      id: "site",
      title: "Site",
      help: "Cheap land by the river floods. High ground costs more.",
      type: "one",
      options: [
        { id: "floodplain", name: "Floodplain lot", cost: 0, ratings: { flood: 2 } },
        { id: "high", name: "High-ground lot", cost: 150000, ratings: { flood: 9 } },
      ],
    },
    {
      id: "soils",
      title: "Soils report",
      help: "Pay to know what's underground, or gamble on the foundation.",
      type: "one",
      options: [
        {
          id: "skip",
          name: "Skip it",
          cost: 0,
          risk: { chance: 0.3, cost: 180000 },
          note: "30% chance of a $180,000 surprise",
        },
        { id: "buy", name: "Buy the report", cost: 8000, note: "Foundation matched to the soil" },
      ],
    },
    {
      id: "structure",
      title: "Structure",
      help: "The skeleton. Sets wind strength, carbon and how the space feels.",
      type: "one",
      options: [
        { id: "wood", name: "Wood frame", cost: 0, ratings: { wind: 5 }, planet: 10 },
        { id: "steel", name: "Steel frame", cost: 120000, ratings: { wind: 8 }, planet: -10 },
        { id: "timber", name: "Mass timber", cost: 200000, ratings: { wind: 7 }, planet: 20, people: 8 },
      ],
    },
    {
      id: "roof",
      title: "Roof",
      help: "Holds the snow and keeps the hail out.",
      type: "one",
      options: [
        { id: "basic", name: "Basic membrane", cost: 0, ratings: { snow: 6, hail: 4 } },
        { id: "snow", name: "Snow-rated roof", cost: 45000, ratings: { snow: 9, hail: 7 } },
        {
          id: "green",
          name: "Green roof",
          cost: 160000,
          ratings: { snow: 8, hail: 6 },
          bonus: { flood: 1 },
          energySave: 2000,
          people: 5,
          planet: 10,
        },
      ],
    },
    {
      id: "insulation",
      title: "Walls and insulation",
      help: "Better walls cost more now and less every winter.",
      type: "one",
      options: [
        { id: "code", name: "Code minimum", cost: 0, ratings: { cold: 5 } },
        { id: "better", name: "Better", cost: 60000, ratings: { cold: 7 }, energyPct: -0.15, people: 3 },
        { id: "high", name: "High-performance", cost: 140000, ratings: { cold: 9 }, energyPct: -0.35, people: 5 },
      ],
    },
    {
      id: "windows",
      title: "Windows",
      help: "Daylight and views, but glass is where heat escapes.",
      type: "one",
      options: [
        { id: "double", name: "Double pane", cost: 0, ratings: { hail: 5 } },
        { id: "triple", name: "Triple pane", cost: 70000, ratings: { hail: 7 }, energyPct: -0.08, people: 4 },
      ],
    },
    {
      id: "hvac",
      title: "Heating and cooling",
      help: "Cheap to install or cheap to run. Rarely both.",
      type: "one",
      options: [
        { id: "rtu", name: "Rooftop unit", cost: 0, ratings: { heat: 5 }, planet: -5 },
        { id: "heatpump", name: "Heat pump", cost: 90000, ratings: { heat: 7 }, energyPct: -0.3, people: 3, planet: 5 },
        { id: "geo", name: "Geothermal", cost: 350000, ratings: { heat: 8 }, energyPct: -0.6, people: 3, planet: 15 },
      ],
    },
    {
      id: "extras",
      title: "Extras",
      help: "Pick any. Each one is a bet on something you care about.",
      type: "multi",
      options: [
        { id: "solar", name: "Solar panels", cost: 110000, energySave: 9000, planet: 15 },
        { id: "generator", name: "Backup generator", cost: 60000, bonus: { cold: 3 }, note: "Stays open as a warming center" },
        { id: "raingarden", name: "Rain garden", cost: 35000, bonus: { flood: 1 }, planet: 5 },
        { id: "daylight", name: "Skylights", cost: 50000, energySave: 1500, people: 10 },
      ],
    },
    {
      id: "contingency",
      title: "Contingency",
      help: "Money held back for surprises. Unspent contingency comes back to you.",
      type: "one",
      options: [
        { id: "c5", name: "5%", cost: 0, rate: 0.05 },
        { id: "c7", name: "7%", cost: 0, rate: 0.07 },
        { id: "c10", name: "10%", cost: 0, rate: 0.1 },
      ],
    },
  ],

  defaultChoices: {
    site: "floodplain", soils: "skip", structure: "wood", roof: "basic", insulation: "code",
    windows: "double", hvac: "rtu", extras: [], contingency: "c7",
  },

  presets: {
    bargain: {
      label: "The Bargain",
      choices: {
        site: "floodplain", soils: "skip", structure: "wood", roof: "basic", insulation: "code",
        windows: "double", hvac: "rtu", extras: [], contingency: "c5",
      },
    },
    longgame: {
      label: "The Long Game",
      choices: {
        site: "high", soils: "buy", structure: "timber", roof: "snow", insulation: "better",
        windows: "triple", hvac: "heatpump", extras: ["raingarden", "daylight"], contingency: "c7",
      },
    },
  },

  seasons: ["Spring", "Summer", "Fall", "Winter"],

  // Minneapolis weather deck. chance = odds per season; intensity 1-10.
  weatherDeck: [
    { id: "icedam", name: "Ice dams", season: "Spring", chance: 0.35, min: 4, max: 7, hazard: "snow" },
    { id: "flood", name: "River flood", season: "Spring", chance: 0.2, min: 3, max: 9, hazard: "flood" },
    { id: "hail", name: "Hailstorm", season: "Summer", chance: 0.25, min: 4, max: 9, hazard: "hail" },
    { id: "wind", name: "Thunderstorm wind", season: "Summer", chance: 0.3, min: 4, max: 8, hazard: "wind" },
    { id: "heatwave", name: "Heat wave", season: "Summer", chance: 0.2, min: 5, max: 8, hazard: "heat" },
    { id: "earlysnow", name: "Early snow", season: "Fall", chance: 0.15, min: 3, max: 6, hazard: "snow" },
    { id: "blizzard", name: "Blizzard", season: "Winter", chance: 0.4, min: 5, max: 10, hazard: "snow" },
    { id: "vortex", name: "Polar vortex", season: "Winter", chance: 0.3, min: 6, max: 10, hazard: "cold" },
  ],

  // The demo year: same every run, so two designs compare fairly on stage.
  demoWeather: [
    { season: "Spring", events: [{ id: "flood", intensity: 6 }] },
    { season: "Summer", events: [{ id: "hail", intensity: 7 }] },
    { season: "Fall", events: [] },
    { season: "Winter", events: [{ id: "blizzard", intensity: 9 }] },
  ],

  // Client review by final score (first match from the top)
  reviews: [
    { min: 80, text: "It stayed open every single day, even in the blizzard. The neighborhood is proud of this place." },
    { min: 60, text: "A solid building. A few rough days, but people keep coming back." },
    { min: 40, text: "We saved money up front and lost the library for weeks. That's not what we asked for." },
    { min: 0, text: "The board is asking hard questions about where the money went." },
  ],
};
