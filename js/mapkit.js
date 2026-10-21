// Map-building toolkit shared by the files in js/maps/. Each map file registers its maps with these helpers.
(function () {
const G = globalThis.G;
const DOWN = 0, UP = 1, LEFT = 2, RIGHT = 3;
G.DIR = { DOWN, UP, LEFT, RIGHT };
// ---- Map building helpers --------------------------------------------------
const maps = G.MAPS = {};
function newMap(id, name, w, h, fill, o) {
  const m = Object.assign({ id, name, w, h, t: Array.from({ length: h }, () => Array(w).fill(fill)), npcs: [], objs: [], warps: [], enc: null, music: 'town', bg: 'grass', outdoor: true }, o);
  return maps[id] = m;
}
const set = (m, x, y, ch) => { if (x >= 0 && y >= 0 && x < m.w && y < m.h) m.t[y][x] = ch; };
const rect = (m, x, y, w, h, ch) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(m, x + i, y + j, ch); };
const border = (m, ch) => { rect(m, 0, 0, m.w, 1, ch); rect(m, 0, m.h - 1, m.w, 1, ch); rect(m, 0, 0, 1, m.h, ch); rect(m, m.w - 1, 0, 1, m.h, ch); };
const scatter = (m, ch, pts) => pts.forEach(([x, y]) => set(m, x, y, ch));
// 3-row building: two roof rows and a wall row with windows and (optionally) a door at x+dx.
function building(m, x, y, w, roof, dx) {
  rect(m, x, y, w, 2, roof); rect(m, x, y + 2, w, 1, 'W');
  for (let i = 1; i < w - 1; i++) if (i !== dx && i % 2) set(m, x + i, y + 2, 'N');
  if (dx >= 0) set(m, x + dx, y + 2, 'D');
}
function interior(id, name, w, h, mat) {
  const m = newMap(id, name, w, h, 'T', { outdoor: false });
  border(m, 'B'); set(m, mat, h - 1, 'm'); return m;
}
const warp = (m, x, y, to, tx, ty, dir, need) => m.warps.push({ x, y, to, tx, ty, dir, need });
const ST = {
  boy: { hair: '#5a3a20', skin: '#f8d0a8', shirt: '#48a0e0', pants: '#506080' }, girl: { hair: '#c04860', skin: '#f8d0a8', shirt: '#f0a0c0', pants: '#885070' },
  old: { hair: '#d8d8d8', skin: '#e8c098', shirt: '#8a7a60', pants: '#605040' }, nurse: { hair: '#f0a0b8', skin: '#f8d0a8', shirt: '#f8f0f0', pants: '#f08098', hat: '#f8f0f0' },
  clerk: { hair: '#304060', skin: '#f8d0a8', shirt: '#4070c0', pants: '#304060' }, prof: { hair: '#7a5a40', skin: '#f8d0a8', shirt: '#f8f8f8', pants: '#506848' },
  mom: { hair: '#8a4a30', skin: '#f8d0a8', shirt: '#f0c060', pants: '#a06848' }, hiker: { hair: '#403020', skin: '#e8b890', shirt: '#a87848', pants: '#605040', hat: '#c8a050' },
  bug: { hair: '#a07830', skin: '#f8d0a8', shirt: '#78c050', pants: '#686848', hat: '#e8d870' }, lass: { hair: '#f0c040', skin: '#f8d0a8', shirt: '#e86090', pants: '#4050a0' },
  camper: { hair: '#403028', skin: '#f8d0a8', shirt: '#e07830', pants: '#3a5a3a', hat: '#3a5a3a' }, kade: { hair: '#c0c0d0', skin: '#e8c8b0', shirt: '#403058', pants: '#282038', hat: '#403058' },
  elder: { hair: '#e8e8f4', skin: '#e8c098', shirt: '#6a4a9a', pants: '#403060', hat: '#6a4a9a' }, kid: { hair: '#c07030', skin: '#f8d0a8', shirt: '#f0e060', pants: '#4868b0' },
};
G.PLAYER_STYLE = { hair: '#4a2f1a', skin: '#f8d0a8', shirt: '#e04848', pants: '#3858a0', hat: '#f8f8f8' };
const npc = (m, x, y, dir, style, lines, o) => m.npcs.push(Object.assign({ x, y, dir, style: ST[style], lines }, o));
const sign = (m, x, y, text) => { set(m, x, y, 's'); m.objs.push({ x, y, fn: () => G.story.says(text) }); };


// ---- Trainers --------------------------------------------------------------
function trainer(m, id, x, y, dir, style, t) {
  npc(m, x, y, dir, style, null, { trainer: Object.assign({ id, style: ST[style] }, t), still: true });
}


G.mk = { maps, newMap, set, rect, border, scatter, building, interior, warp, npc, sign, trainer, ST, DOWN, UP, LEFT, RIGHT };
})();
