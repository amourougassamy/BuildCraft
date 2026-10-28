// data.js: every number and every word in BuildCraft Tycoon.
// All figures are illustrative game values, not design values.
// Internal units are SI (m, W, degC); the UI converts to US units.

export const SITE = { city: "Chicago, Illinois", latitude: 41.9 };

// The preset building: a 3-storey office, long sides facing north and south.
export const GEOM = {
  lengthX: 30, // m, east-west length (north and south facades)
  depthZ: 20, // m, north-south depth (east and west facades)
  floors: 3,
  floorHeight: 4, // m
  bay: 5, // m, window bay width
};

export const SIDES = ["N", "E", "S", "W"];
export const SIDE_INFO = {
  N: { name: "North", azimuth: 180, length: 30 },
  E: { name: "East", azimuth: -90, length: 20 },
  S: { name: "South", azimuth: 0, length: 30 },
  W: { name: "West", azimuth: 90, length: 20 },
};

export const THERMAL = {
  capacitancePerM2: 120e3, // J/K per m2 of floor (furniture, slab, air)
  ventPerM2: 0.6, // W/K per m2, outdoor air while the building is open
  infilPerM2: 0.15, // W/K per m2, leaks, always
  personW: 75, // sensible heat per person
  plugWPerM2: 8,
  miscKwOpen: 15, // elevator, pumps, IT closet
  miscKwClosed: 6,
  roofAbsorptance: 0.7,
  outsideFilm: 20, // W/m2K
  groundReflectance: 0.2,
  setpoints: { coolOpen: 24, heatOpen: 21, coolClosed: 29, heatClosed: 15 },
  comfort: { low: 20, high: 25.5 }, // 68-78 F
  openHour: 7,
  closeHour: 18,
};

export const HVAC = {
  unitCoolKw: 28, // 8 tons per rooftop unit
  copCool: 3.0,
  fanKw: 1.5,
  gasHeatKw: 36,
  gasEff: 0.8,
  hpHeatKw: 30,
  hpCop: (tOut) => Math.min(3.5, Math.max(1.25, 1.25 + 0.075 * (tOut + 20))),
  liftCost: 6000, // helicopter lift, each way
};

export const ELECTRICAL = {
  voltsKwPerAmp: 0.324, // 208 V three-phase at 0.9 power factor
  pvKwPerArray: 20,
  pvDerate: 0.85,
};

export const STRUCTURE = {
  roofDeadPsf: 10,
  designSnowPsf: 22,
  unitPsf: 1.0, // spread-out weight of one rooftop unit
  pvPsf: 1.5, // one solar array
  unitKips: 2.5,
  pvKips: 3,
  buildingKips: 1900,
  windPsf: 25,
  seismicCs: 0.05,
  ftPerM: 3.281,
};

export const MONEY = {
  startCash: 150000,
  rentPerTenant: 700, // per month
  elecPerKwh: 0.15,
  gasPerKwh: 0.04,
  demandPerKw: 12, // per kW of the month's peak
  billingDays: 22, // working days a representative day stands for
  windowAddPerM2: 400,
  windowRemovePerM2: 150,
  shadePerM: 250, // per metre of facade per floor
  pvCost: 45000,
  pvRemove: 5000,
  repairBase: 40000,
};

export const PEOPLE = {
  max: 60,
  start: 45,
  shirts: ["#e76f51", "#2a9d8f", "#e9c46a", "#264653", "#f4a261", "#8d6cab", "#4c86c6", "#d64f7a", "#5fae57"],
  skins: ["#f1c7a5", "#d9a37c", "#a8714c", "#7a4b2c", "#f6d7c3"],
};

// Monthly Chicago weather: daily high/low (C), typical cloudiness, normal roof snow (psf).
export const WEATHER = [
  { name: "January", short: "Jan", hi: 0, lo: -8, cloud: 0.55, snow: 12, doy: 17 },
  { name: "February", short: "Feb", hi: 2, lo: -6, cloud: 0.5, snow: 10, doy: 47 },
  { name: "March", short: "Mar", hi: 8, lo: -1, cloud: 0.5, snow: 4, doy: 75 },
  { name: "April", short: "Apr", hi: 15, lo: 4, cloud: 0.45, snow: 0, doy: 105 },
  { name: "May", short: "May", hi: 21, lo: 10, cloud: 0.4, snow: 0, doy: 135 },
  { name: "June", short: "Jun", hi: 27, lo: 16, cloud: 0.3, snow: 0, doy: 162 },
  { name: "July", short: "Jul", hi: 29, lo: 19, cloud: 0.25, snow: 0, doy: 198 },
  { name: "August", short: "Aug", hi: 28, lo: 18, cloud: 0.3, snow: 0, doy: 228 },
  { name: "September", short: "Sep", hi: 24, lo: 13, cloud: 0.3, snow: 0, doy: 258 },
  { name: "October", short: "Oct", hi: 17, lo: 7, cloud: 0.4, snow: 0, doy: 288 },
  { name: "November", short: "Nov", hi: 9, lo: 1, cloud: 0.55, snow: 2, doy: 318 },
  { name: "December", short: "Dec", hi: 2, lo: -5, cloud: 0.6, snow: 8, doy: 344 },
];
export const START_MONTH = 5; // the building opens in June
export const DAYS_PER_YEAR = 12; // one representative day per month

export const EVENTS = {
  heatwave: { icon: "🔥", label: "Heat wave", kid: "A heat wave! It's going to be scorching all day." },
  coldsnap: { icon: "🥶", label: "Cold snap", kid: "A polar vortex! Freezing air from the Arctic." },
  blizzard: { icon: "🌨️", label: "Blizzard", kid: "A blizzard is piling snow on the roof!", hour: 10 },
  windstorm: { icon: "🌪️", label: "Windstorm", kid: "Huge winds are pushing on the building!", hour: 14 },
  earthquake: { icon: "🫨", label: "Earthquake", kid: "The ground is shaking! (Yes, Illinois gets them: the New Madrid fault.)", hour: 11 },
};

// Design choices. Each option has a kid line and an engineer line.
export const OPTIONS = {
  glass: [
    { id: "double", name: "Clear double pane", icon: "🪟", cost: 0, u: 2.8, shgc: 0.7, vt: 0.78,
      kid: "Two layers of glass. Lets lots of sunshine (and heat) in.", eng: "U 2.8 W/m²K · SHGC 0.70 · VT 0.78" },
    { id: "lowe", name: "Low-e double pane", icon: "✨", cost: 60000, u: 1.7, shgc: 0.38, vt: 0.68,
      kid: "An invisible coating bounces summer heat back outside.", eng: "U 1.7 W/m²K · SHGC 0.38 · VT 0.68" },
    { id: "triple", name: "Triple pane low-e", icon: "💎", cost: 130000, u: 0.9, shgc: 0.3, vt: 0.58,
      kid: "Three layers. Cozy in winter, cool in summer, a bit darker.", eng: "U 0.9 W/m²K · SHGC 0.30 · VT 0.58" },
  ],
  insulation: [
    { id: "basic", name: "Basic", icon: "🧱", cost: 0, uWall: 0.9, uRoof: 0.55, roofPsf: 0,
      kid: "Thin walls. Heat sneaks in and out.", eng: "Wall U 0.90 · roof U 0.55 W/m²K" },
    { id: "code", name: "Code minimum", icon: "🧶", cost: 40000, uWall: 0.45, uRoof: 0.28, roofPsf: 0.5,
      kid: "A warm sweater for the building.", eng: "Wall U 0.45 · roof U 0.28 W/m²K · +0.5 psf" },
    { id: "super", name: "Super insulated", icon: "🧥", cost: 95000, uWall: 0.22, uRoof: 0.14, roofPsf: 1.5,
      kid: "A puffy winter coat. Thicker roof insulation is heavier, though.", eng: "Wall U 0.22 · roof U 0.14 W/m²K · +1.5 psf on the roof" },
  ],
  lateral: [
    { id: "shear", name: "Concrete shear walls", icon: "🧱", cost: 0, capPerFt: 1.5,
      kid: "Solid walls brace the building. Every window cuts a hole in them.", eng: "1.5 kips per ft of solid wall, parallel to the load" },
    { id: "braced", name: "Steel braced frames", icon: "❎", cost: 90000, capKips: 150, viewPenalty: 0.2,
      kid: "Big steel X's. Strong no matter the windows, but they block some views.", eng: "150 kips each way · braces cover 20% of the glass" },
    { id: "moment", name: "Steel moment frames", icon: "🏗️", cost: 180000, capKips: 140,
      kid: "Stiff steel joints let you have all the glass you want. Pricey, and a little swaying in big wind.", eng: "140 kips each way · no wall needed · sways in storms" },
  ],
  roof: [
    { id: "standard", name: "Standard joists", icon: "📏", cost: 0, capPsf: 40,
      kid: "Holds normal snow and a few machines.", eng: "40 psf superimposed capacity" },
    { id: "reinforced", name: "Reinforced joists", icon: "💪", cost: 35000, capPsf: 55,
      kid: "Extra steel so the roof can carry more.", eng: "55 psf superimposed capacity" },
    { id: "heavy", name: "Heavy steel framing", icon: "🏋️", cost: 80000, capPsf: 70,
      kid: "A roof that could hold a swimming pool. Almost.", eng: "70 psf superimposed capacity" },
  ],
  hvacType: [
    { id: "gas", name: "Rooftop units + gas heat", icon: "🔥", unitCost: 40000,
      kid: "Electric cooling, gas furnace heating. Cheap to buy.", eng: "28 kW (8 tons) cooling, COP 3 · 36 kW gas heat, 80%" },
    { id: "hp", name: "Heat pump units", icon: "♻️", unitCost: 48000,
      kid: "All-electric and efficient, no gas. But winter heating pulls lots of power.", eng: "28 kW cooling · 30 kW heat, COP 3.5 mild → 1.25 at −4 °F" },
  ],
  service: [
    { id: 400, name: "400 A service", icon: "🔌", cost: 0, amps: 400,
      kid: "The building's power pipe from the street.", eng: "400 A @ 208 V 3φ ≈ 130 kW" },
    { id: 800, name: "800 A service", icon: "⚡", cost: 70000, amps: 800,
      kid: "A bigger power pipe. A utility truck brings a new transformer.", eng: "800 A @ 208 V 3φ ≈ 259 kW" },
    { id: 1200, name: "1200 A service", icon: "🏭", cost: 120000, amps: 1200,
      kid: "A giant power pipe. Room for anything.", eng: "1200 A @ 208 V 3φ ≈ 389 kW" },
  ],
  lighting: [
    { id: "fluorescent", name: "Fluorescent tubes", icon: "💡", cost: 0, wPerM2: 10,
      kid: "Old-school lights. They make heat, too.", eng: "10 W/m² · all of it becomes heat" },
    { id: "led", name: "LED lights", icon: "🔆", cost: 30000, wPerM2: 5,
      kid: "Half the power, half the heat. The air conditioning works less.", eng: "5 W/m²" },
  ],
};

export const DEFAULT_DESIGN = {
  wwr: { N: 0.4, E: 0.3, S: 0.4, W: 0.3 },
  shades: { N: false, E: false, S: false, W: false },
  glass: "double",
  insulation: "code",
  lateral: "shear",
  roof: "standard",
  hvacType: "gas",
  units: 3,
  pv: 0,
  service: 400,
  lighting: "fluorescent",
};

export const WWR_MIN = 0.1;
export const WWR_MAX = 0.8;
export const WWR_STEP = 0.1;

// Roof: 4 columns x 3 rows of equipment slots.
export const ROOF_SLOTS = { cols: 4, rows: 3 };
export const UNIT_SLOT_ORDER = [5, 6, 4, 7, 9, 10, 8, 11, 1, 2, 0, 3];
export const PV_SLOT_PAIRS = [[0, 1], [2, 3], [8, 9], [10, 11], [4, 5], [6, 7]];

// One-line reasons shown under chain reactions: WHY[actionKind][metric].
export const WHY = {
  wwr: {
    latDC: "Windows cut holes in the shear walls, so there's less wall to resist wind and quakes.",
    coolDC: "More glass lets in more sun, so the air conditioning has more heat to remove.",
    heatDC: "Glass leaks heat about 6× faster than an insulated wall.",
    elecDC: "",
    daylight: "People love daylight and views, and the lights can dim.",
  },
  shades: {
    coolDC: "Shades stop the sun before it gets through the glass.",
    daylight: "Shades also cut a little daylight.",
  },
  glass: { coolDC: "Low-e glass reflects the sun's heat but still lets light in.", heatDC: "More panes, less heat lost in winter." },
  insulation: { heatDC: "Insulation keeps winter heat in.", roofDC: "Thicker roof insulation adds weight on the roof joists." },
  lateral: { latDC: "This system resists sideways loads from wind and earthquakes.", daylight: "Braces sit in front of some windows." },
  roof: { roofDC: "Stronger joists can carry more snow and equipment." },
  hvacType: { elecDC: "Heat pumps heat with electricity, so winter mornings need a lot more power.", heatDC: "Heat pumps have less heating oomph on the coldest days." },
  addUnit: { coolDC: "One more rooftop unit adds 28 kW (8 tons) of cooling.", elecDC: "Every unit adds a big electrical load.", roofDC: "Every unit adds weight to the roof.", latDC: "More weight up high means more earthquake force." },
  removeUnit: { coolDC: "Less cooling capacity.", elecDC: "Less electrical load.", roofDC: "Less weight on the roof." },
  addPV: { roofDC: "Solar panels are heavy, and snow piles up on them too.", energyCost: "Free power from the sun on bright days." },
  removePV: { roofDC: "Less weight on the roof." },
  service: { elecDC: "A bigger service can feed more equipment at once." },
  lighting: { coolDC: "Less light power means less heat for the AC to remove.", elecDC: "LEDs draw half the power." },
};
