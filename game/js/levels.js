// The three floors of the archive as plain data: every wall, crate, lamp, warden
// patrol and exit the rest of the game reads. Coordinates are pixels on a
// 960x540 board, +y runs downward. Walls and crates block sight and movement;
// lamps are pools of warm light that make the courier easier to spot.

export const WORLD_W = 960;
export const WORLD_H = 540;
export const WALL_T = 16;

/** The four border walls of a floor. */
function border(t = WALL_T) {
  return [
    { x: 0, y: 0, w: WORLD_W, h: t },
    { x: 0, y: WORLD_H - t, w: WORLD_W, h: t },
    { x: 0, y: 0, w: t, h: WORLD_H },
    { x: WORLD_W - t, y: 0, w: t, h: WORLD_H },
  ];
}

export const LEVELS = [
  {
    name: 'SIDE DOOR',
    hint: 'Two wardens keep the reading desks.',
    par: 30,
    player: { x: 70, y: 270, r: 11 },
    exit: { x: 928, y: 238, w: 16, h: 64 },
    walls: [
      ...border(),
      { x: 300, y: 16, w: 16, h: 210 },
      { x: 300, y: 336, w: 16, h: 188 },
      { x: 620, y: 16, w: 16, h: 150 },
      { x: 620, y: 390, w: 16, h: 134 },
    ],
    crates: [
      { x: 130, y: 96, w: 44, h: 44 },
      { x: 150, y: 396, w: 44, h: 44 },
      { x: 460, y: 250, w: 44, h: 44 },
      { x: 740, y: 70, w: 44, h: 44 },
      { x: 770, y: 455, w: 44, h: 44 },
    ],
    lamps: [
      { x: 210, y: 270, r: 120 },
      { x: 470, y: 110, r: 100 },
      { x: 470, y: 440, r: 100 },
      { x: 780, y: 270, r: 120 },
    ],
    guards: [
      { x: 210, y: 160, waypoints: [[210, 160], [210, 460], [80, 460], [80, 160]] },
      { x: 690, y: 140, waypoints: [[690, 140], [900, 140], [900, 430], [690, 430]] },
    ],
  },
  {
    name: 'READING ROOM',
    hint: 'Three wardens, two partitions, four ways across.',
    par: 45,
    player: { x: 60, y: 470, r: 11 },
    exit: { x: 856, y: 16, w: 72, h: 20 },
    walls: [
      ...border(),
      { x: 250, y: 16, w: 16, h: 150 },
      { x: 250, y: 270, w: 16, h: 120 },
      { x: 250, y: 470, w: 16, h: 54 },
      { x: 520, y: 16, w: 16, h: 160 },
      { x: 520, y: 300, w: 16, h: 100 },
      { x: 520, y: 470, w: 16, h: 54 },
      { x: 640, y: 196, w: 120, h: 16 },
    ],
    crates: [
      { x: 330, y: 70, w: 44, h: 44 },
      { x: 330, y: 440, w: 44, h: 44 },
      { x: 660, y: 240, w: 44, h: 44 },
      { x: 640, y: 330, w: 44, h: 44 },
      { x: 820, y: 60, w: 44, h: 44 },
      { x: 810, y: 460, w: 44, h: 44 },
    ],
    lamps: [
      { x: 120, y: 270, r: 100 },
      { x: 400, y: 110, r: 95 },
      { x: 400, y: 440, r: 95 },
      { x: 650, y: 270, r: 110 },
      { x: 860, y: 250, r: 100 },
    ],
    guards: [
      { x: 120, y: 120, waypoints: [[120, 120], [120, 450], [200, 450], [200, 120]] },
      { x: 300, y: 210, waypoints: [[300, 210], [470, 210], [470, 320], [300, 320]] },
      { x: 620, y: 120, waypoints: [[620, 120], [900, 120], [900, 440], [620, 440]] },
    ],
  },
  {
    name: 'THE VAULT',
    hint: 'Four wardens guard the deep stacks.',
    par: 60,
    player: { x: 60, y: 270, r: 11 },
    exit: { x: 928, y: 240, w: 16, h: 60 },
    walls: [
      ...border(),
      { x: 200, y: 16, w: 16, h: 200 },
      { x: 200, y: 330, w: 16, h: 194 },
      { x: 700, y: 16, w: 16, h: 150 },
      { x: 700, y: 280, w: 16, h: 120 },
      { x: 700, y: 470, w: 16, h: 54 },
      { x: 436, y: 220, w: 140, h: 16 },
      { x: 436, y: 320, w: 140, h: 16 },
      { x: 560, y: 236, w: 16, h: 84 },
    ],
    crates: [
      { x: 96, y: 180, w: 44, h: 44 },
      { x: 84, y: 340, w: 44, h: 44 },
      { x: 300, y: 80, w: 44, h: 44 },
      { x: 320, y: 404, w: 44, h: 44 },
      { x: 480, y: 258, w: 44, h: 44 },
      { x: 640, y: 36, w: 44, h: 44 },
      { x: 640, y: 440, w: 44, h: 44 },
      { x: 780, y: 240, w: 44, h: 44 },
      { x: 880, y: 60, w: 44, h: 44 },
      { x: 880, y: 446, w: 44, h: 44 },
    ],
    lamps: [
      { x: 110, y: 270, r: 95 },
      { x: 360, y: 160, r: 90 },
      { x: 360, y: 400, r: 90 },
      { x: 500, y: 180, r: 105 },
      { x: 500, y: 390, r: 105 },
      { x: 780, y: 120, r: 95 },
      { x: 780, y: 420, r: 95 },
      { x: 880, y: 270, r: 90 },
    ],
    guards: [
      { x: 160, y: 120, waypoints: [[160, 120], [160, 440], [60, 440], [60, 120]] },
      { x: 260, y: 240, waypoints: [[260, 240], [260, 470], [420, 470], [420, 240]] },
      { x: 480, y: 110, waypoints: [[480, 110], [620, 110], [620, 180], [480, 180]] },
      { x: 740, y: 120, waypoints: [[740, 120], [900, 120], [900, 430], [740, 430]] },
    ],
  },
];
