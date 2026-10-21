// All art is generated in code: tiles, characters, creature sprites and UI frames.
(function () {
const G = globalThis.G;
const W = 240, H = 160, S = 3;
G.W = W; G.H = H; G.S = S;

function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
G.mulberry = mulberry;
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; return [c, x]; }
G.cv = cv;
function hex(h) { // accepts #rgb, #rrggbb and rgb()/rgba(); anything else falls back to mid grey
  h = String(h).trim();
  let m = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(h); if (m) return [1, 2, 3].map(i => parseInt(m[i] + m[i], 16));
  m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(h); if (m) return [1, 2, 3].map(i => parseInt(m[i], 16));
  m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i.exec(h); if (m) return [1, 2, 3].map(i => +m[i]);
  return [128, 128, 128];
}
G.rgbOf = hex;   // [r, g, b] from any CSS colour string the game uses
G.shade = function (h, f) { // f<1 darkens, f>1 lightens
  const c = hex(h).map(v => f < 1 ? v * f : v + (255 - v) * (f - 1));
  return '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
};
})();
