// The walk through the school: where each section's content hangs in the 3D world and how the
// camera travels between them. Only numbers live here, so the scroll logic can read it without
// loading three.js.
//
// A room's content is a flat sheet of ordinary HTML laid on a real surface (`at`, `normal`, `up`).
// `viewH` is how much of the world, in height, the screen shows at rest: the camera's place in the
// room stays the same on every screen, and one CSS pixel on the sheet is one on the screen there.
// The element named by `anchor` is centred on `at`; surfaces around it are sized from the page.
export const FOV = 38

export const HERO = { pos: [0, 1.7, 12], look: [0, 13.4, -40], up: [0, 1, 0], fov: 32, sets: ['campus'] }

export const ROOMS = {
  problem: { sets: ['corridor'], at: [0, 2.3, -47.86], normal: [0, 0, 1], up: [0, 1, 0], viewH: 5.4, anchor: '.why-board', focus: [0, 0, -44] },
  features: { sets: ['roomA'], at: [8, 2.35, -59.86], normal: [0, 0, 1], up: [0, 1, 0], viewH: 6, anchor: '.fs-board', focus: [8, 0, -56] },
  flow: { sets: ['roomA'], at: [8, 0.84, -54.9], normal: [0, 1, 0], up: [0, 0, -1], viewH: 7.5, anchor: '.flow-list', focus: [8, 0, -54] },
  roles: { sets: ['roomB'], at: [21.6, 2.06, -53.4], normal: [-1, 0, 0], up: [0, 1, 0], viewH: 5, anchor: '.role-tabs', focus: [20, 0, -54] },
  ai: { sets: ['roomB'], at: [20, 2.3, -63.86], normal: [0, 0, 1], up: [0, 1, 0], viewH: 5.4, anchor: '.pulse-grid', focus: [20, 0, -60] },
  impact: { sets: ['corridor'], at: [36, 2.35, -47.86], normal: [0, 0, 1], up: [0, 1, 0], viewH: 6, anchor: '.impact-board', focus: [36, 0, -44] },
  colleges: { sets: ['hall'], at: [67.7, 4.15, -44.5], normal: [-1, 0, 0], up: [0, 1, 0], viewH: 8.2, anchor: '.colleges-board', focus: [60, 0, -44.5] },
  campus: { sets: ['yard'], at: [54, 14, -78], normal: [0, 0, 1], up: [0, 1, 0], viewH: 5.9, anchor: '.campus-board', focus: [54, 0, -84] },
  faq: { sets: ['study'], at: [80, 0.86, -76.5], normal: [0, 1, 0], up: [1, 0, 0], viewH: 4.4, anchor: '.faq-grid', focus: [80, 0, -76.5] },
  login: { sets: ['study'], at: [89.86, 2.4, -76.5], normal: [-1, 0, 0], up: [0, 1, 0], viewH: 5.6, anchor: '.signin-frame', focus: [84, 0, -76.5] },
}

export const ROOM_ORDER = Object.keys(ROOMS)

// Elements each room's 3D props line up with, measured from the page.
export const MEASURE = {
  problem: {},
  features: { screen: '.fs-frame' },
  flow: { desks: '.flow-card' },
  roles: { seats: '.role-tab', notebook: '.role-panels' },
  ai: { screen: '.pulse-demo', gap: '.pulse-gap' },
  impact: { frames: '.evidence-item', goals: '.goals' },
  colleges: { banner: '.cit-feature', cards: '.college-card' },
  campus: { rows: '.photo-row' },
  faq: {},
  login: {},
}

// Phones and portrait screens have no sheets on the surfaces, so the props are sized from this
// typical desktop layout instead (all in CSS pixels of a 1440 by 900 page).
/** @param {number} y @param {number} h @param {number} count @param {number} x0 @param {number} w @param {number} gap */
const row = (y, h, count, x0, w, gap) => Array.from({ length: count }, (_, i) => ({ x: x0 + i * (w + gap), y, w, h }))
export const LITE_LAYOUT = {
  W: 1440,
  H: 900,
  rooms: {
    problem: { anchor: { x: 160, y: 200, w: 1120, h: 540 } },
    features: { anchor: { x: 130, y: 190, w: 1180, h: 560 }, items: { screen: [{ x: 620, y: 230, w: 680, h: 460 }] } },
    flow: { anchor: { x: 130, y: 240, w: 1180, h: 590 }, items: { desks: [...row(250, 170, 3, 130, 365, 44), ...row(550, 170, 3, 130, 365, 44)] } },
    roles: { anchor: { x: 150, y: 390, w: 1140, h: 44 }, items: { seats: row(390, 44, 5, 150, 218, 12), notebook: [{ x: 150, y: 446, w: 1140, h: 330 }] } },
    ai: { anchor: { x: 130, y: 290, w: 1180, h: 400 }, items: { screen: [{ x: 850, y: 295, w: 460, h: 390 }], gap: [{ x: 680, y: 330, w: 150, h: 320 }] } },
    impact: { anchor: { x: 190, y: 270, w: 1060, h: 430 }, items: { frames: row(390, 170, 3, 190, 311, 64), goals: [{ x: 190, y: 590, w: 1060, h: 110 }] } },
    colleges: { anchor: { x: 160, y: 230, w: 1120, h: 520 }, items: { banner: [{ x: 160, y: 280, w: 1120, h: 210 }], cards: row(505, 240, 4, 160, 269, 14) } },
    campus: { anchor: { x: 0, y: 240, w: 1440, h: 440 }, items: { rows: [{ x: 0, y: 325, w: 1440, h: 170 }, { x: 0, y: 505, w: 1440, h: 170 }] } },
    faq: { anchor: { x: 200, y: 230, w: 1040, h: 500 } },
    login: { anchor: { x: 220, y: 170, w: 1000, h: 600 } },
  },
}

// Each flight: the waypoints between one room's end and the next room's start, as
// [position, look-at, up?]. `door` swings a named door open over part of the flight. `leave` and
// `enter` fade the outgoing and incoming sheets over a stretch of the flight. `flash` is a soft
// wash of light where the camera passes through an opening. `drop` is when the set being left
// stops being drawn, once the camera is through and it can no longer be seen.
export const FLIGHTS = {
  'hero>problem': {
    sets: ['campus', 'corridor'],
    via: [[[0, 2.5, -14], [0, 3.4, -40]], [[0, 2.05, -33], [0, 2.05, -48]]],
    door: ['main', 0.38, 0.68], enter: [0.8, 0.98], flash: [0.78, 0.2], fovKick: 7, drop: 0.74,
  },
  'problem>features': {
    sets: ['corridor', 'roomA'],
    via: [[[3.3, 2.05, -42.8], [5.75, 2, -48]], [[5.75, 1.95, -45.4], [5.75, 1.95, -52]], [[5.75, 1.95, -49.8], [7.2, 2.05, -60]]],
    door: ['a', 0.28, 0.56], leave: [0.14, 0.4], enter: [0.72, 0.96], flash: [0.6, 0.14], fovKick: 8,
  },
  'features>flow': {
    sets: ['roomA'],
    via: [[[8, 3.6, -53.2], [8.2, 1.2, -58.6], [0, 1, -0.2]], [[8.6, 5.2, -54.6], [9, 0.8, -55.8], [0, 0.45, -1]]],
    leave: [0.12, 0.42], enter: [0.62, 0.94], fovKick: 5,
  },
  'flow>roles': {
    sets: ['roomA', 'roomB'],
    via: [[[11, 3.7, -52.4], [18, 1.1, -53.2], [0, 0.7, -0.45]], [[13.2, 1.5, -53.2], [22, 1.3, -53.3]]],
    door: ['b', 0.3, 0.58], leave: [0.08, 0.36], enter: [0.68, 0.96], flash: [0.62, 0.12], fovKick: 8,
  },
  'roles>ai': {
    sets: ['roomB'],
    via: [[[18, 1.6, -55.4], [23.5, 1.9, -62]]],
    leave: [0.05, 0.3], enter: [0.58, 0.94], fovKick: 6,
  },
  'ai>agents': {
    sets: ['roomB'],
    via: [[[20.2, 3, -60], [20.2, 3.55, -64]]],
    end: { fov: 30 }, // on the clock, as far as makes its rim the scope's outer ring (world.js)
    leave: [0.05, 0.32], fovKick: 0,
  },
  'workspace>impact': {
    sets: ['corridor'],
    start: { pos: [27, 1.9, -44.4], look: [34, 1.9, -44.5], fov: FOV + 6 },
    via: [[[32, 2, -43.4], [36, 2.05, -48]]],
    enter: [0.6, 0.96], fovKick: 0,
  },
  'impact>colleges': {
    sets: ['corridor', 'hall'],
    via: [[[41, 2.15, -43.8], [46, 2.2, -44.5]], [[45.2, 2.5, -44.5], [52, 3, -44.5]], [[50, 3.1, -44.5], [66, 3.2, -44.5]]],
    door: ['hall', 0.3, 0.56], leave: [0.1, 0.34], enter: [0.72, 0.96], flash: [0.56, 0.14], fovKick: 8,
  },
  'colleges>campus': {
    sets: ['hall', 'yard'],
    via: [[[56.4, 3.1, -49.5], [54, 3.1, -58]], [[54, 3.1, -56.6], [54, 4, -66]], [[54, 8.4, -64.5], [54, 13, -78]]],
    leave: [0.08, 0.32], enter: [0.74, 0.97], flash: [0.42, 0.22], fovKick: 9,
  },
  'campus>faq': {
    sets: ['yard', 'study'],
    via: [[[62, 8.4, -72], [72, 2.2, -76.5]], [[70, 1.95, -76.5], [78, 1.95, -76.5]], [[74.6, 2.5, -76.5], [80, 0.86, -76.5], [0.45, 1, 0]]],
    door: ['study', 0.44, 0.66], leave: [0.08, 0.3], enter: [0.76, 0.97], flash: [0.66, 0.14], fovKick: 8, drop: 0.66,
  },
  'faq>login': {
    sets: ['study'],
    via: [[[81.4, 3.1, -76.5], [88, 1.7, -76.5], [0.32, 1, 0]]],
    leave: [0.1, 0.36], enter: [0.6, 0.94], fovKick: 4,
  },
}
