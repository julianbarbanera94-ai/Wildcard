// Shops and healing (docs/HOMESTEAD.md section 8): shop data (G.SHOPS), the shop screen (G.openShop), the
// Lanternrest General Store (G.shopMenu), the one healing screen for every healer (G.healUI) and the Lodge nurse.
(function () {
const G = globalThis.G;
const K = G.kit, I = G.ITEMS, FAM = G.FONT_FAM;
const F6 = '800 6px ' + FAM, F5 = '800 5.5px ' + FAM, FB = G.FONT_B || G.FONT, F9 = '900 9px ' + FAM;
const push = l => { G.ui.layers.push(l); return l; };
const pop = l => { const i = G.ui.layers.indexOf(l); if (i >= 0) G.ui.layers.splice(i, 1); };
const says = l => G.worldApi.says(l);
const sfx = n => G.audio && G.audio.sfx(n);
const money = () => (G.inv ? G.inv.count('money') : G.state.money);
const have = n => (G.inv ? G.inv.count(n) : (G.state.bag[n] || 0));
const give = (n, q) => { if (G.inv) G.inv.give(n, q); else G.state.bag[n] = (G.state.bag[n] || 0) + q; };
const take = (n, q) => (G.inv ? G.inv.take(n, q) : (G.state.bag[n] >= q ? ((G.state.bag[n] -= q) || delete G.state.bag[n], true) : false));
const kindOf = n => (I[n] || {}).kind;

// ---- Shop data -----------------------------------------------------------------------------
// G.SHOPS[id] = { name, greet, bye, color, stock: [{ item | vehicle, price?, cat?, need?: () => string|null }],
//                 sells: ['kind' | 'Item name', ...] | 'all' | false, rate (fraction of the price paid when buying from you), special? }
const it = (item, cat, o) => Object.assign({ item, cat }, o);
G.SHOPS = {
  general: { name: 'GENERAL STORE', place: 'LANTERNREST', color: '#4a9ad8', greet: 'Welcome! How may I help you?', bye: 'Please come again!',
    stock: [...(G.MART_STOCK || []).map(n => it(n, kindOf(n) === 'orb' ? 'ORBS' : 'MEDICINE')), it('Watering Can', 'TOOLS')],
    sells: 'all', rate: .5 },
  builder: { name: "BUILDER'S YARD", place: 'LANTERNREST', color: '#c88a3c', greet: 'Timber, stone, brick and nails! Need anything for the homestead?', bye: 'Build something grand!',
    stock: ['Wood', 'Stone', 'Plank', 'Brick', 'Nails', 'Clay'].map(n => it(n, 'MATERIALS')),
    sells: ['mat'], rate: .5 },
  seeds: { name: 'MEADOWBROOK SEEDS', place: 'SUNMEADOW', color: '#5fae3f', greet: 'Fresh seeds from the meadow! Plant them in a Garden Plot and water them daily.', bye: 'Happy growing!',
    stock: [it('Turnip Seeds', 'SEEDS'), it('Carrot Seeds', 'SEEDS'), it('Wheat Seeds', 'SEEDS'), it('Tomato Seeds', 'SEEDS'), it('Watering Can', 'FARM'), it('Fertilizer', 'FARM'), it('Verdant Orb', 'ORBS')],
    sells: ['crop'], rate: .6 },
  apothecary: { name: 'BOGROOT APOTHECARY', place: 'MIREWOOD', color: '#8a62c8', greet: 'Salves and spores, dearie. And I always pay well for Glowcaps and Honey.', bye: 'Mind the mud on your way out.',
    stock: [...['Herb Salve', 'Full Heal', 'Glowcap Spores', 'Honey'].map(n => it(n, 'REMEDIES')), it('Void Orb', 'ORBS')],
    sells: ['Glowcap', 'Honey'], rate: .6 },
  forge: { name: 'RIDGEHOLD FORGE', place: 'THE RIDGE', color: '#d0603a', greet: 'Iron, copper and good tools. Bring me your ore and I will buy it.', bye: 'Keep your pick sharp!',
    stock: [it('Iron Ingot', 'METAL'), it('Copper Ingot', 'METAL'), it('Coal', 'METAL'), it('Gear', 'METAL'), it('Axe', 'TOOLS'), it('Pickaxe', 'TOOLS'), it('Pepper Seeds', 'SEEDS'), it('Stone Orb', 'ORBS'), it('Flare Orb', 'ORBS'), it('Frost Orb', 'ORBS')],
    sells: ['Iron Ore', 'Copper Ore', 'Coal', 'Iron Ingot', 'Copper Ingot'], rate: .6 },
  motors: { name: 'TIDEWHEEL MOTORS', place: 'TIDEPOOL SHORE', color: '#3a8ad8', special: 'vehicles', greet: 'Welcome to Tidewheel Motors! Wheels for every Warden.', bye: 'Drive safe out there!',
    stock: [{ vehicle: 'bicycle', cat: 'VEHICLES' }, { vehicle: 'motorbike', cat: 'VEHICLES' }, { vehicle: 'car', cat: 'VEHICLES' }, { vehicle: 'helicopter', cat: 'VEHICLES' },
      it('Wheel', 'PARTS'), it('Engine Part', 'PARTS')],
    sells: ['Wheel', 'Engine Part', 'Gear', 'Wire', 'Hover Core', 'Rotor'], rate: .5 },
  market: { name: 'TIDEWHEEL MARKET', place: 'TIDEPOOL SHORE', color: '#ff8a5a', greet: 'Fresh from the shore! I buy Pearls, crops and home cooking too.', bye: 'Come back with full baskets!',
    stock: [it('Pumpkin Seeds', 'SEEDS'), it('Tomato Seeds', 'SEEDS'), it('Aqua Orb', 'ORBS'), it('Gale Orb', 'ORBS')],
    sells: ['Pearl', 'crop', 'food'], rate: .6 },
};
const VNAME = { bicycle: 'Bicycle', scooter: 'Scooter', quad: 'Quad Bike', motorbike: 'Motorbike', car: 'Car', hoverboard: 'Hoverboard', helicopter: 'Helicopter' };
const buysItem = (sh, n) => { const d = I[n]; if (!d || d.kind === 'key' || !d.price) return false; if (sh.sells === 'all') return true; return !!sh.sells && (sh.sells.includes(n) || sh.sells.includes(d.kind)); };
G.shopSellPrice = (id, n) => Math.max(1, Math.floor(I[n].price * (G.SHOPS[id].rate || .5)));

// ---- Item icons (cached vector art, 16x16 logical) -------------------------------------------
const ICOL = { Wood: '#b07a40', Stone: '#a0a6b2', Fiber: '#8acb50', Clay: '#e0905a', Coal: '#3c3c4c', 'Iron Ore': '#a87a6a', 'Copper Ore': '#4ab098', 'Crystal Shard': '#8ad8ff',
  Wool: '#f6f0e4', Milk: '#ffffff', Honey: '#ffb820', Fertilizer: '#7a5a30', Pearl: '#f6eeff', Plank: '#deae68', Brick: '#cc5a3e', 'Iron Ingot': '#c0c8d4', 'Copper Ingot': '#e88a4a',
  Glass: '#c8f2ff', Rope: '#c8a060', Cloth: '#ee8aae', Flour: '#f6ecda', Nails: '#9aa2b2', Gear: '#8e96a8', Wire: '#e87a3a', Wheel: '#3c3c4c', 'Engine Part': '#6a7890',
  'Hover Core': '#a070ff', Rotor: '#9aa2b2', Turnip: '#ead8f4', Carrot: '#ff8a2a', Wheat: '#f0c850', Tomato: '#ff4a3a', Pepper: '#e8322a', Glowcap: '#6ae0c8', Pumpkin: '#ff9a2a',
  Starmelon: '#5a6ad8', Glowcap_: '#6ae0c8', Potion: '#ff6aa0', 'Super Potion': '#b070ff', 'Herb Salve': '#5cc86a', 'Full Heal': '#ffd23a' };
const shd = (c, k) => G.shade(c, k);
function paintIcon(x, name, kind) {
  const col = ICOL[name] || '#c8a070', round = (cx, cy, r, c) => { x.fillStyle = K.lin(x, cx - r, cy - r, cx + r, cy + r, [shd(c, 1.35), c, shd(c, .75)]); x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); x.strokeStyle = shd(c, .6); x.lineWidth = .7; x.stroke(); };
  const shine = (cx, cy, r) => { x.fillStyle = 'rgba(255,255,255,.7)'; x.beginPath(); x.ellipse(cx, cy, r, r * .6, -.6, 0, 7); x.fill(); };
  const shadow = () => { x.fillStyle = 'rgba(40,30,60,.18)'; x.beginPath(); x.ellipse(8, 14.6, 5.6, 1.4, 0, 0, 7); x.fill(); };
  shadow();
  if (kind === 'orb' && G.orbImage) { x.drawImage(G.orbImage(G.orbStyleOf(name)), 1.4, 1, 13.2, 13.2); return; }
  if (kind === 'orb') {
    const top = name === 'Pulse Orb' ? '#4a8aff' : name === 'Mythic Orb' ? '#ffd23a' : '#ff4d5e';
    x.fillStyle = '#3d3352'; x.beginPath(); x.arc(8, 8, 6.4, 0, 7); x.fill();
    x.fillStyle = K.lin(x, 0, 2, 0, 8, [shd(top, 1.3), top]); x.beginPath(); x.arc(8, 8, 5.7, Math.PI, 0); x.fill();
    x.fillStyle = '#f4f2fa'; x.beginPath(); x.arc(8, 8, 5.7, 0, Math.PI); x.fill();
    x.fillStyle = '#3d3352'; x.fillRect(2.3, 7.4, 11.4, 1.2); x.beginPath(); x.arc(8, 8, 2, 0, 7); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(8, 8, 1.2, 0, 7); x.fill();
    if (name === 'Mythic Orb') { x.fillStyle = '#3d3352'; x.fillRect(4.5, 3.4, 1.4, 3.4); x.fillRect(10.1, 3.4, 1.4, 3.4); }
    shine(5.6, 4.6, 1.4); return;
  }
  if (kind === 'heal' || kind === 'cure') {   // a round flask
    x.fillStyle = '#e8f6ff'; K.rr(x, 6.3, 1.4, 3.4, 4, 1); x.fill(); x.fillStyle = '#b07a40'; K.rr(x, 6, .8, 4, 1.8, .8); x.fill();
    x.fillStyle = 'rgba(220,240,255,.9)'; x.beginPath(); x.arc(8, 9.4, 5, 0, 7); x.fill(); x.strokeStyle = '#8ab0c8'; x.lineWidth = .7; x.stroke();
    x.fillStyle = K.lin(x, 0, 8, 0, 14, [shd(col, 1.3), col, shd(col, .8)]); x.beginPath(); x.arc(8, 9.4, 4.2, .1, Math.PI - .1); x.closePath(); x.fill();
    if (kind === 'cure') { x.fillStyle = '#fff'; x.fillRect(7.3, 9.6, 1.4, 3.4); x.fillRect(6.3, 10.6, 3.4, 1.4); }
    shine(6, 7.4, 1.3); return;
  }
  if (kind === 'revive') { x.fillStyle = K.lin(x, 2, 2, 14, 14, ['#fff8b0', '#ffd23a', '#e09a10']); x.beginPath(); x.moveTo(8, 1.6); x.lineTo(13.4, 8); x.lineTo(8, 14); x.lineTo(2.6, 8); x.closePath(); x.fill(); x.strokeStyle = '#b8780a'; x.lineWidth = .7; x.stroke(); shine(6.4, 5.6, 1.3); return; }
  if (kind === 'seed') {   // a seed packet showing its crop
    const crop = name.replace(/ (Seeds|Spores)$/, ''), cc = ICOL[crop] || '#8acb50';
    x.save(); x.translate(8, 8); x.rotate(-.12); x.translate(-8, -8);
    x.fillStyle = '#f8f0dc'; K.rr(x, 3, 1.6, 10, 12.4, 1.4); x.fill(); x.strokeStyle = '#c8a878'; x.lineWidth = .7; x.stroke();
    x.fillStyle = shd(cc, 1.1); K.rr(x, 3.6, 2.2, 8.8, 3, 1); x.fill();
    round(8, 9.6, 2.8, cc); x.fillStyle = '#5cb848'; x.beginPath(); x.ellipse(9.4, 6.6, 1.6, .8, -.6, 0, 7); x.fill();
    x.fillStyle = '#a07040'; [[4.6, 12.6], [11.2, 12.4], [5, 8]].forEach(([a, b]) => { x.beginPath(); x.ellipse(a, b, .6, .4, 0, 0, 7); x.fill(); });
    x.restore(); return;
  }
  if (kind === 'crop') {
    if (name === 'Carrot' || name === 'Pepper') { x.fillStyle = K.lin(x, 4, 4, 12, 12, [shd(col, 1.3), col, shd(col, .78)]); x.beginPath(); x.moveTo(4.4, 5); x.quadraticCurveTo(12, 3.6, 12.6, 13.6); x.quadraticCurveTo(5, 11.6, 4.4, 5); x.fill(); }
    else if (name === 'Wheat') { x.strokeStyle = '#c89a30'; x.lineWidth = .8; for (let i = -1; i <= 1; i++) { x.beginPath(); x.moveTo(8 + i, 14); x.lineTo(8 + i * 3, 3); x.stroke(); x.fillStyle = col; x.beginPath(); x.ellipse(8 + i * 3, 4.6, 1.3, 2.6, i * .3, 0, 7); x.fill(); } }
    else if (name === 'Glowcap') { x.fillStyle = '#f0f6ea'; K.rr(x, 6.6, 7, 2.8, 6.6, 1.2); x.fill(); x.fillStyle = K.lin(x, 0, 2, 0, 8, [shd(col, 1.4), col]); x.beginPath(); x.ellipse(8, 7.4, 5.4, 3.6, 0, Math.PI, 0); x.fill(); x.fillStyle = 'rgba(255,255,255,.8)'; [[6, 5.4], [9.6, 4.8]].forEach(([a, b]) => { x.beginPath(); x.arc(a, b, .7, 0, 7); x.fill(); }); }
    else { round(8, 9, name === 'Pumpkin' || name === 'Starmelon' ? 5.4 : 4.6, col); x.fillStyle = '#5cb848'; x.beginPath(); x.ellipse(9.6, 3.6, 2.4, 1.1, -.5, 0, 7); x.fill(); shine(6.2, 7.2, 1.2); }
    if (name === 'Carrot') { x.fillStyle = '#5cb848'; x.beginPath(); x.ellipse(4.2, 4, 2.2, 1, -.8, 0, 7); x.fill(); }
    return;
  }
  if (kind === 'tool') {
    if (/Watering/.test(name)) {
      const c = name.startsWith('Big') ? '#ffb43a' : '#5aa8e0';
      x.strokeStyle = shd(c, .7); x.lineWidth = 1.2; x.beginPath(); x.arc(7, 5.6, 3, Math.PI, 0); x.stroke();
      x.fillStyle = K.lin(x, 0, 5, 0, 14, [shd(c, 1.3), c, shd(c, .78)]); K.rr(x, 3, 6, 8.6, 7.6, 2); x.fill();
      x.strokeStyle = shd(c, .7); x.lineWidth = 1.6; x.beginPath(); x.moveTo(11, 9.6); x.lineTo(14.2, 5.6); x.stroke(); x.fillStyle = '#cce8ff'; x.beginPath(); x.arc(14.2, 5.4, 1.2, 0, 7); x.fill();
      shine(5, 7.8, 1.1); return;
    }
    x.strokeStyle = '#8a5a30'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(4, 14); x.lineTo(11, 3); x.stroke();
    x.fillStyle = K.lin(x, 0, 0, 16, 16, ['#e4ecf6', '#a8b4c4']);
    if (name === 'Axe') { x.beginPath(); x.moveTo(9.6, 2.6); x.quadraticCurveTo(15.6, 3.6, 13.8, 9.4); x.lineTo(10.2, 6.4); x.closePath(); x.fill(); }
    else { x.beginPath(); x.moveTo(5, 2.6); x.quadraticCurveTo(11, .2, 15, 6.6); x.quadraticCurveTo(11, 3.6, 5.4, 4.2); x.closePath(); x.fill(); }
    x.strokeStyle = '#7a8698'; x.lineWidth = .6; x.stroke(); return;
  }
  if (kind === 'food') { x.fillStyle = K.lin(x, 0, 8, 0, 14, ['#ffffff', '#d8dce8']); x.beginPath(); x.ellipse(8, 9.6, 6, 4, 0, 0, Math.PI); x.fill(); x.fillStyle = col === '#c8a070' ? '#ff9a4a' : col; x.beginPath(); x.ellipse(8, 9.6, 5.6, 1.6, 0, 0, 7); x.fill(); x.strokeStyle = 'rgba(255,255,255,.8)'; x.lineWidth = .6; [5.6, 8, 10.4].forEach(a => { x.beginPath(); x.moveTo(a, 7); x.quadraticCurveTo(a + 1, 5, a, 3); x.stroke(); }); return; }
  if (kind === 'treat') { K.star(x, 8, 8, 6.4, '#ffd23a'); K.star(x, 8, 8, 3.4, '#fff6b0'); return; }
  if (kind === 'vehicle') { round(8, 8.6, 5.4, '#3c3c4c'); round(8, 8.6, 2.6, '#c8d0dc'); x.fillStyle = '#ff6a4a'; x.beginPath(); x.arc(8, 8.6, 1, 0, 7); x.fill(); return; }
  if (kind === 'key') { round(8, 8, 5, '#d8a840'); return; }
  // materials
  if (name === 'Wood') { x.fillStyle = K.lin(x, 0, 4, 0, 13, ['#c8925a', '#9a6a3a']); K.rr(x, 2, 5, 12, 7, 3.4); x.fill(); x.fillStyle = '#f0c890'; x.beginPath(); x.ellipse(13, 8.5, 2.4, 3.3, 0, 0, 7); x.fill(); x.strokeStyle = '#b07a40'; x.lineWidth = .5; x.beginPath(); x.ellipse(13, 8.5, 1.2, 1.7, 0, 0, 7); x.stroke(); return; }
  if (name === 'Plank') { [[2, 4], [3, 8.4]].forEach(([a, b]) => { x.fillStyle = K.lin(x, 0, b, 0, b + 3.6, ['#f0c888', '#c8904a']); K.rr(x, a, b, 11.6, 3.6, .8); x.fill(); x.strokeStyle = '#a87038'; x.lineWidth = .5; x.stroke(); }); return; }
  if (name === 'Brick') { x.fillStyle = K.lin(x, 0, 5, 0, 12, [shd(col, 1.25), col, shd(col, .78)]); K.rr(x, 2, 5.4, 12, 6.6, 1); x.fill(); x.strokeStyle = '#f4d8c8'; x.lineWidth = .5; x.beginPath(); x.moveTo(2, 8.7); x.lineTo(14, 8.7); x.moveTo(6, 5.4); x.lineTo(6, 8.7); x.moveTo(10, 8.7); x.lineTo(10, 12); x.stroke(); return; }
  if (/Ingot/.test(name)) { x.fillStyle = K.lin(x, 0, 5, 0, 12, [shd(col, 1.35), col, shd(col, .72)]); x.beginPath(); x.moveTo(4, 5.4); x.lineTo(12, 5.4); x.lineTo(14.4, 11.6); x.lineTo(1.6, 11.6); x.closePath(); x.fill(); x.strokeStyle = shd(col, .6); x.lineWidth = .6; x.stroke(); shine(6, 7, 1.3); return; }
  if (name === 'Gear' || name === 'Rotor') { x.fillStyle = col; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; x.save(); x.translate(8, 8); x.rotate(a); K.rr(x, -1.2, -7, 2.4, 3, .6); x.fill(); x.restore(); } round(8, 8, 4.6, col); x.fillStyle = '#e8ecf4'; x.beginPath(); x.arc(8, 8, 1.6, 0, 7); x.fill(); return; }
  if (name === 'Wheel') { round(8, 8, 6, '#3c3c4c'); round(8, 8, 3, '#c8d0dc'); return; }
  if (name === 'Nails') { x.fillStyle = '#9aa2b2'; for (let i = 0; i < 3; i++) { K.rr(x, 4 + i * 3, 3 + i, 1.2, 9, .5); x.fill(); K.rr(x, 3 + i * 3, 2.6 + i, 3.2, 1.2, .5); x.fill(); } return; }
  if (name === 'Rope' || name === 'Wire') { x.strokeStyle = col; x.lineWidth = 1.6; for (let i = 0; i < 3; i++) { x.beginPath(); x.ellipse(8, 8.4, 5 - i * 1.4, 3.6 - i, 0, 0, 7); x.stroke(); } return; }
  if (name === 'Crystal Shard' || name === 'Glass' || name === 'Hover Core') { x.fillStyle = K.lin(x, 3, 2, 13, 14, ['#ffffff', col, shd(col, .7)]); x.beginPath(); x.moveTo(8, 1.4); x.lineTo(12.6, 6.4); x.lineTo(10, 14); x.lineTo(5.6, 14); x.lineTo(3.4, 6.4); x.closePath(); x.fill(); x.strokeStyle = shd(col, .6); x.lineWidth = .6; x.stroke(); return; }
  if (name === 'Honey' || name === 'Milk') { x.fillStyle = K.lin(x, 0, 4, 0, 14, [shd(col, 1.2), col, shd(col, .85)]); K.rr(x, 4, 4.4, 8, 9.6, 2.4); x.fill(); x.strokeStyle = shd(col, .65); x.lineWidth = .6; x.stroke(); x.fillStyle = name === 'Honey' ? '#c87a30' : '#7ab0e0'; K.rr(x, 3.4, 2.6, 9.2, 2.6, 1); x.fill(); shine(6, 7, 1.1); return; }
  // ore, stone, clay, coal, wool, fiber, fertilizer, pearl...: a soft chunk
  x.fillStyle = K.lin(x, 2, 3, 14, 14, [shd(col, 1.3), col, shd(col, .74)]); x.beginPath(); x.moveTo(3, 11.6); x.quadraticCurveTo(1.6, 6, 6.4, 4); x.quadraticCurveTo(11.6, 2.4, 13.4, 8); x.quadraticCurveTo(14.4, 12.6, 9, 13); x.quadraticCurveTo(4.4, 13.6, 3, 11.6); x.fill(); x.strokeStyle = shd(col, .6); x.lineWidth = .6; x.stroke();
  if (/Ore/.test(name)) { x.fillStyle = name === 'Copper Ore' ? '#7af0d0' : '#f0a080'; [[6, 7], [9.6, 9.4], [10, 5.6]].forEach(([a, b]) => { x.beginPath(); x.arc(a, b, .9, 0, 7); x.fill(); }); }
  shine(6, 6.4, 1.2);
}
function drawIcon(ctx, name, x, y, size, kind) {
  const k = kind || kindOf(name) || 'mat', e = K.cache('shico:' + k + ':' + name, 16, 16, c => paintIcon(c, name, k), { pad: 1, qmax: 8 });
  const s = size / 16; ctx.drawImage(e.c, x - e.pad * s, y - e.pad * s, (e.w + e.pad * 2) * s, (e.h + e.pad * 2) * s);
}
G.drawItemIcon = drawIcon;

// ---- Shared drawing bits ---------------------------------------------------------------------
const backdrop = col => K.cache('shbg' + col, 240, 160, x => {
  x.fillStyle = K.lin(x, 0, 0, 0, 160, [shd(col, 1.75), shd(col, 1.55), shd(col, 1.4)]); x.fillRect(0, 0, 240, 160);
  x.fillStyle = 'rgba(255,255,255,.22)'; for (let yy = 0; yy < 176; yy += 16) for (let xx = (yy / 16 % 2) * 16; xx < 256; xx += 32) { x.beginPath(); x.arc(xx + 4, yy + 4, 2.6, 0, 7); x.fill(); }
  const g = x.createRadialGradient(50, 20, 0, 50, 20, 170); g.addColorStop(0, 'rgba(255,255,255,.4)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 240, 160);
}, { pad: 0, qmax: 4 });
const ribbon = col => K.cache('shrib' + col, 236, 15, x => {
  x.save(); x.shadowColor = 'rgba(40,20,30,.3)'; x.shadowBlur = 2 * x.getTransform().a; x.shadowOffsetY = 1 * x.getTransform().a;
  K.rr(x, 0, 0, 236, 15, 7.5); x.fillStyle = '#ffffff'; x.fill(); x.restore();
  K.rr(x, 1.4, 1.4, 233.2, 12.2, 6.1); x.fillStyle = K.lin(x, 0, 1, 0, 14, [shd(col, 1.25), col, shd(col, .85)]); x.fill();
  x.fillStyle = 'rgba(255,255,255,.3)'; K.rr(x, 6, 2.4, 224, 3, 1.5); x.fill();
});
function coin(ctx, x, y, r) {
  r = r || 4.4;
  ctx.fillStyle = '#d98a14'; ctx.beginPath(); ctx.arc(x, y, r + .7, 0, 7); ctx.fill(); ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(x, y - .3, r, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff2a8'; ctx.beginPath(); ctx.arc(x - r * .32, y - r * .4, r * .3, 0, 7); ctx.fill();
  G.text(ctx, '$', x, y - 3.2, { align: 'center', color: '#b86a08', shadow: false, font: '900 ' + (r * 1.3).toFixed(1) + 'px ' + FAM });
}
function moneyPill(ctx, x, y, w, amt) {
  K.rr(ctx, x, y, w, 11, 5.5); ctx.fillStyle = '#6a4210'; ctx.fill(); K.rr(ctx, x + .8, y + .8, w - 1.6, 9.4, 4.7); ctx.fillStyle = K.lin(ctx, 0, y, 0, y + 11, ['#fff6c8', '#ffd86a']); ctx.fill();
  coin(ctx, x + 6, y + 5.5, 3.4); G.text(ctx, '$' + amt, x + w - 4, y + 2, { align: 'right', color: '#6a4210', shadow: false, font: F6 });
}
// A chunky button; returns nothing, registers a tap zone.
function button(ctx, x, y, w, h, label, col, on, fn, dim) {
  const c = dim ? '#b8b0c4' : col, lift = on ? 1 + Math.sin(G.frameNo / 9) * .4 : 0;
  K.rr(ctx, x, y + 1.6, w, h, h / 2); ctx.fillStyle = shd(c, .62); ctx.fill();
  K.rr(ctx, x, y - lift, w, h, h / 2); ctx.fillStyle = K.lin(ctx, 0, y - lift, 0, y + h - lift, [shd(c, 1.3), c, shd(c, .88)]); ctx.fill();
  if (on) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; K.rr(ctx, x - .9, y - .9 - lift, w + 1.8, h + 1.8, h / 2 + .9); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,255,255,.35)'; K.rr(ctx, x + h / 2, y + 1.2 - lift, w - h, h * .28, h * .14); ctx.fill();
  G.text(ctx, label, x + w / 2, y + (h - 8) / 2 + .4 - lift, { align: 'center', color: '#fff', shadow: shd(c, .5), font: FB });
  if (fn) G.tapZone(x - 2, y - 2, w + 4, h + 5, fn);
}
const TONE = { info: '#5a4a66', good: '#2a8a4a', bad: '#d03838', warn: '#c07a10' };

// ---- The shop screen ----------------------------------------------------------------------
// Rows for a tab: { type: 'item' | 'sell' | 'vehicle' | 'soon' | 'empty', item?, id?, name, price, lock?, desc, kind, owned? }
function tabsOf(sh) {
  const cats = []; for (const s of sh.stock) { const c = s.cat || 'BUY'; if (!cats.includes(c)) cats.push(c); }
  if (sh.sells) cats.push('SELL');
  return cats;
}
function rowsOf(id, sh, tab) {
  if (tab === 'SELL') {
    const out = Object.keys(G.state.bag).filter(n => G.state.bag[n] > 0 && buysItem(sh, n)).sort((a, b) => (kindOf(a) + a).localeCompare(kindOf(b) + b))
      .map(n => ({ type: 'sell', item: n, name: n, price: G.shopSellPrice(id, n), desc: I[n].desc, kind: kindOf(n) }));
    return out.length ? out : [{ type: 'empty', name: 'Nothing to sell', price: null, kind: 'key', desc: sellHint(sh), msg: `You have nothing this shop buys. ${sellHint(sh)}` }];
  }
  const rows = [];
  const stock = sh.stock.filter(s => (s.cat || 'BUY') === tab);
  if (stock.some(s => s.vehicle)) rows.push(...vehicleRows(stock.filter(s => s.vehicle)));
  for (const s of stock) if (s.item && I[s.item]) {
    const d = I[s.item], off = G.rep && G.regionOf ? G.rep.discount(G.regionOf(G.worldPlaceOf ? G.worldPlaceOf(G.world.mapId) || G.world.mapId : G.world.mapId)) : 0;   // reputation: friends pay less
      rows.push({ type: 'item', item: s.item, name: s.item, price: Math.max(1, Math.round((s.price || d.price) * (1 - off))), lock: s.need ? s.need() : null, desc: d.desc, kind: d.kind });
  }
  return rows;
}
function sellHint(sh) {
  if (sh.sells === 'all') return 'I buy anything except key items.';
  const names = sh.sells.map(s => ({ mat: 'materials', crop: 'crops', food: 'cooked food', seed: 'seeds', orb: 'orbs' }[s] || s + (/s$/.test(s) ? '' : 's')));
  return 'I buy ' + (names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names[0]) + '.';
}
function vehicleRows(stock) {
  const V = G.vehicles;
  if (V && V.shopList && V.buy) {
    let list = []; try { list = V.shopList() || []; } catch (e) { console.error(e); }
    return list.map(e => { const vid = typeof e === 'string' ? e : e.id, def = (G.VEHICLES && G.VEHICLES[vid]) || {};
      return { type: 'vehicle', id: vid, name: e.name || def.name || VNAME[vid] || vid, price: e.price != null ? e.price : def.price, owned: !!(e.owned || (G.state.vehicles && (G.state.vehicles.owned || []).includes(vid))),
        lock: e.why || e.need || e.lock || e.reason || null, desc: e.desc || def.how || def.desc || 'A fine set of wheels.', kind: 'vehicle' }; });
  }
  return stock.map(s => ({ type: 'soon', id: s.vehicle, name: VNAME[s.vehicle] || s.vehicle, price: null, kind: 'vehicle', desc: 'Vehicles arrive soon. The first delivery is still on the boat!' }));
}

function drawShop(ctx, shop, st, tap) {
  const col = shop.color || '#4a9ad8', t = G.frameNo;
  const H = G.HEADER_COL || '#f7983f';   // one header colour for every screen; the shop's own colour marks it
  K.blit(ctx, backdrop('#ffb060'), 0, 0);
  K.blit(ctx, ribbon(H), 2, 1);
  G.headerMark ? G.headerMark(ctx, 11, 8.5, col) : K.star(ctx, 11, 8.5, 3, '#fff6a8');
  G.text(ctx, shop.name, 18, 4.6, { color: '#fff', shadow: shd(H, .5), font: FB });
  moneyPill(ctx, 172, 3, 62, money());
  // tabs
  const tabs = st.tabs, tw = Math.min(58, Math.floor(232 / tabs.length) - 3);
  { const col = H;   // tabs in the shared orange too
  tabs.forEach((name, i) => {
    const x = 4 + i * (tw + 3), on = i === st.tab, y = on ? 18 : 19.5;
    K.rr(ctx, x, y, tw, 12, 5); ctx.fillStyle = on ? shd(col, .7) : 'rgba(255,255,255,.55)'; ctx.fill();
    K.rr(ctx, x + .8, y + .8, tw - 1.6, 10.4, 4.4); ctx.fillStyle = on ? K.lin(ctx, 0, y, 0, y + 12, [shd(col, 1.3), col]) : 'rgba(255,255,255,.75)'; ctx.fill();
    G.text(ctx, name, x + tw / 2, y + 3, { align: 'center', font: F6, color: on ? '#fff' : shd(col, .6), shadow: on ? shd(col, .45) : false });
    G.tapZone(x, 17, tw, 14, () => tap({ k: 'tab', i }));
  }); }
  // list
  G.frame(ctx, 4, 32, 144, 93, 'light');
  const rows = st.rows, VIS = 6;
  rows.slice(st.top, st.top + VIS).forEach((r, k) => {
    const i = st.top + k, y = 38 + k * 14, sel = i === st.idx && st.mode !== 'leave';
    if (sel) { K.rr(ctx, 8, y - 1.5, 136, 13, 6.5); ctx.fillStyle = `rgba(255,190,90,${.3 + .1 * Math.sin(t / 10)})`; ctx.fill(); ctx.strokeStyle = 'rgba(247,152,63,.8)'; ctx.lineWidth = .8; ctx.stroke(); }
    const dim = r.lock || r.type === 'soon' || r.type === 'empty' || (r.type === 'vehicle' && r.owned);
    if (r.type !== 'empty') drawIcon(ctx, r.item || r.name, 11, y - .5, 11, r.kind);
    G.text(ctx, r.name, 25, y + 1, { color: dim ? '#a898b0' : sel ? '#3a2a48' : '#5a4a66', font: G.FONT, shadow: dim ? false : undefined });
    let right = 141;
    if (r.type === 'soon') { K.pill(ctx, right - 26, y + 1, 26, 8, '#b8b0c4', 'SOON'); }
    else if (r.type === 'vehicle' && r.owned) { K.pill(ctx, right - 28, y + 1, 28, 8, '#5cc86a', 'OWNED'); }
    else if (r.price != null) {
      const afford = r.type === 'sell' || money() >= r.price;
      G.text(ctx, '$' + r.price, right, y + 1, { align: 'right', color: r.lock ? '#a898b0' : afford ? '#4a3b58' : '#d05050', font: G.FONT });
      right -= G.textW(ctx, '$' + r.price) + 4;
      if (r.lock) { K.pill(ctx, right - 9, y + 1.5, 9, 7, '#d05050', '!'); right -= 12; }
    }
    if (r.item) { const n = have(r.item); if (n) { const s = '×' + n, w = Math.max(12, G.textW(ctx, s) * .75 + 6); K.pill(ctx, right - w, y + 1.5, w, 7, r.type === 'sell' ? '#ff9f43' : '#7aa8d8', s); } }
    G.tapZone(6, y - 2, 140, 14, () => tap({ k: 'row', i }));
  });
  const bob = Math.sin(t / 8);
  if (st.top > 0) { G.text(ctx, '▲', 76, 31 - bob, { font: F6, color: '#f7983f', align: 'center' }); G.tapZone(56, 28, 40, 9, () => tap({ k: 'scroll', d: -1 })); }
  if (st.top + VIS < rows.length) { G.text(ctx, '▼', 76, 119 + bob, { font: F6, color: '#f7983f', align: 'center' }); G.tapZone(56, 117, 40, 9, () => tap({ k: 'scroll', d: 1 })); }
  // detail card
  G.frame(ctx, 151, 32, 85, 93, 'light');
  const cur = rows[st.idx];
  if (cur) {
    K.rr(ctx, 175, 37, 36, 30, 10); ctx.fillStyle = shd(col, 1.7); ctx.fill();
    if (cur.type !== 'empty') { const hop = Math.abs(Math.sin(t / 22)) * 1.4; drawIcon(ctx, cur.item || cur.name, 181, 39 - hop, 24, cur.kind); }
    else G.text(ctx, '?', 193, 44, { align: 'center', font: '900 16px ' + FAM, color: shd(col, 1.2), shadow: false });
    const nl = G.wrap(cur.name.toUpperCase(), 72).slice(0, 2);
    nl.forEach((l, k) => G.text(ctx, l, 193.5, 70 + k * 8, { align: 'center', font: F6, color: '#3a2a48', shadow: false }));
    const dy = 70 + nl.length * 8 + 1;
    wrapS(cur.lock || cur.desc || '', 74).slice(0, Math.floor((112 - dy) / 7)).forEach((l, k) => G.text(ctx, l, 157, dy + k * 7, { font: F5, color: cur.lock ? '#c03838' : '#6a5a78', shadow: false }));
    if (cur.item) G.text(ctx, `YOU HAVE ${have(cur.item)}`, 193.5, 115, { align: 'center', font: F5, color: shd(col, .6), shadow: false });
  }
  // message bar
  G.frame(ctx, 2, 128, 236, 30, 'light');
  const ml = G.wrap(st.msg || '', 176).slice(0, 2), mc = TONE[st.tone] || TONE.info;
  if (st.tone === 'good') K.star(ctx, 11, 136 + 3, 3 + Math.sin(t / 6) * .5, '#ffd23a');
  ml.forEach((l, k) => G.text(ctx, l, st.tone === 'good' ? 17 : 10, 134 + k * 10, { color: mc, font: G.FONT, shadow: false }));
  button(ctx, 194, 136, 38, 13, 'LEAVE', '#a088c0', false, () => tap({ k: 'leave' }));
  // floating "+N" / "-$N" after a deal
  if (st.fx && st.fx.t < 50) { st.fx.t++; const a = 1 - st.fx.t / 50; ctx.globalAlpha = a; G.text(ctx, st.fx.text, 208, 2 - st.fx.t * .25 + 14, { align: 'center', font: FB, color: st.fx.col, shadow: '#fff' }); ctx.globalAlpha = 1; }
  // modal (quantity / confirm)
  if (st.mode === 'qty' || st.mode === 'confirm') {
    ctx.fillStyle = 'rgba(40,30,60,.35)'; ctx.fillRect(-60, -60, 360, 280);
    G.tapZone(-999, -999, 2400, 2400, () => {});   // swallow taps outside the dialog
    const m = st.modal, sell = m.row.type === 'sell';
    G.frame(ctx, 36, 36, 168, 84, 'light');
    drawIcon(ctx, m.row.item || m.row.name, 44, 42, 16, m.row.kind);
    G.text(ctx, (sell ? 'SELL ' : 'BUY ') + m.row.name.toUpperCase(), 64, 46, { font: FB, color: '#3a2a48', shadow: false });
    if (st.mode === 'qty') {
      button(ctx, 62, 62, 22, 16, '−', '#ff8a5a', false, () => tap({ k: 'q', d: -1 }));
      button(ctx, 156, 62, 22, 16, '+', '#5cc86a', false, () => tap({ k: 'q', d: 1 }));
      K.rr(ctx, 90, 61, 60, 18, 6); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = shd(col, .9); ctx.lineWidth = 1; ctx.stroke();
      G.text(ctx, '× ' + m.q, 120, 65, { align: 'center', font: F9, color: '#3a2a48', shadow: false });
      G.tapZone(90, 61, 30, 18, () => tap({ k: 'q', d: -10 })); G.tapZone(120, 61, 30, 18, () => tap({ k: 'q', d: 10 }));
      const total = m.q * m.row.price, short = !sell && total > money();
      G.text(ctx, sell ? `YOU GET $${total}` : `TOTAL $${total}`, 120, 84, { align: 'center', font: FB, color: short ? '#d03838' : '#2a7a4a', shadow: false });
      G.text(ctx, sell ? `You have ${have(m.row.item)}` : short ? `You need $${total - money()} more.` : `You have $${money()}`, 120, 94, { align: 'center', font: F6, color: short ? '#d03838' : '#8a7a98', shadow: false });
      button(ctx, 66, 102, 50, 13, sell ? 'SELL' : 'BUY', col, m.btn === 0, () => tap({ k: 'ok' }));
      button(ctx, 124, 102, 50, 13, 'CANCEL', '#a088c0', m.btn === 1, () => tap({ k: 'cancel' }));
    } else {
      const total = m.q * m.row.price;
      G.wrap(m.text, 150).slice(0, 2).forEach((l, k) => G.text(ctx, l, 120, 64 + k * 10, { align: 'center', color: '#4a3b58', shadow: false }));
      if (!sell) G.text(ctx, `$${money()}  →  $${money() - total}`, 120, 88, { align: 'center', font: F6, color: '#8a7a98', shadow: false });
      else G.text(ctx, `$${money()}  →  $${money() + total}`, 120, 88, { align: 'center', font: F6, color: '#8a7a98', shadow: false });
      button(ctx, 66, 102, 50, 13, 'YES', '#5cc86a', m.btn === 0, () => tap({ k: 'yes' }));
      button(ctx, 124, 102, 50, 13, 'NO', '#ff8a5a', m.btn === 1, () => tap({ k: 'no' }));
    }
  }
}
// Small-font wrapping (G.wrap measures in the 8px font).
const mctx = (() => { try { return document.createElement('canvas').getContext('2d'); } catch (e) { return null; } })();
function wrapS(s, w) {
  if (!mctx || !mctx.measureText) return G.wrap(s, w * 1.4);
  mctx.font = F5; const out = [];
  for (const para of String(s).split('\n')) { let cur = ''; for (const word of para.split(' ')) { const t = cur ? cur + ' ' + word : word; if (cur && mctx.measureText(t).width > w) { out.push(cur); cur = word; } else cur = t; } out.push(cur); }
  return out;
}

// Shops defined by the region map files (they load before this file) as G.SHOPS_EXTRA = { id: def }.
Object.assign(G.SHOPS, G.SHOPS_EXTRA || {});

G.openShop = async function (id) {
  const shop = G.SHOPS[id];
  if (!shop) { await says('This shop is closed.'); return; }
  G.closeText();
  const st = G.shopState = { id, tabs: tabsOf(shop), tab: 0, idx: 0, top: 0, rows: [], msg: shop.greet, tone: 'info', mode: 'list', modal: null, fx: null, log: [] };
  const refresh = () => { st.rows = rowsOf(id, shop, st.tabs[st.tab]); st.idx = Math.max(0, Math.min(st.idx, st.rows.length - 1)); st.top = Math.max(0, Math.min(st.top, st.idx, Math.max(0, st.rows.length - 6))); if (st.idx >= st.top + 6) st.top = st.idx - 5; };
  const note = (msg, tone) => { st.msg = msg; st.tone = tone || 'info'; st.log.push({ msg, tone: st.tone }); };
  refresh();
  let tapped = null;
  const layer = push({ draw: ctx => drawShop(ctx, shop, st, a => { tapped = a; }) });
  const next = async () => { await G.nextFrame(); const a = tapped; tapped = null; return { p: G.input.pressed, a }; };
  const setTab = i => { st.tab = (i + st.tabs.length) % st.tabs.length; st.idx = 0; st.top = 0; refresh(); sfx('select'); const r = st.rows[0]; note(st.tabs[st.tab] === 'SELL' ? (r && r.type === 'sell' ? `What would you like to sell? ${sellHint(shop)}` : r.msg) : shop.greet, 'info'); };
  const moveTo = i => { if (i === st.idx || i < 0 || i >= st.rows.length) return; st.idx = i; if (st.idx < st.top) st.top = st.idx; if (st.idx >= st.top + 6) st.top = st.idx - 5; sfx('select'); };

  // quantity picker -> qty or 0
  async function pickQty(row) {
    const sell = row.type === 'sell', max = sell ? have(row.item) : 99;
    st.modal = { row, q: 1, btn: 0 }; st.mode = 'qty';
    for (;;) {
      const { p, a } = await next(), m = st.modal; let d = 0;
      if (p.up) d = 1; if (p.down) d = -1; if (p.right) d = 10; if (p.left) d = -10;
      if (a && a.k === 'q') d = a.d;
      if (d) { const q = Math.max(1, Math.min(max, m.q + d)); if (q !== m.q) { m.q = q; sfx('select'); } else sfx('bump'); }
      const ok = p.a || (a && a.k === 'ok'), cancel = p.b || (a && a.k === 'cancel');
      if (cancel) { st.mode = 'list'; sfx('select'); return 0; }
      if (ok) {
        if (!sell && m.q * row.price > money()) { sfx('bump'); note(`You need $${m.q * row.price - money()} more.`, 'bad'); continue; }
        sfx('select'); return m.q;
      }
    }
  }
  async function confirm(row, q, text) {
    st.modal = { row, q, btn: 0, text }; st.mode = 'confirm';
    for (;;) {
      const { p, a } = await next(), m = st.modal;
      if (p.left || p.right || p.up || p.down) { m.btn ^= 1; sfx('select'); }
      if ((a && a.k === 'yes') || (p.a && m.btn === 0)) { st.mode = 'list'; sfx('select'); return true; }
      if ((a && a.k === 'no') || (p.a && m.btn === 1) || p.b) { st.mode = 'list'; sfx('select'); return false; }
    }
  }
  async function act(row) {
    if (!row) return;
    if (row.type === 'empty') { sfx('bump'); return note(row.msg, 'warn'); }
    if (row.type === 'soon') { sfx('bump'); return note('Vehicles arrive soon! The first shipment is still on the boat.', 'warn'); }
    if (row.lock) { sfx('bump'); return note(row.lock, 'bad'); }
    if (row.type === 'vehicle') {
      if (row.owned) { sfx('bump'); return note(`You already own the ${row.name}.`, 'warn'); }
      pop(layer); let r;
      try { r = await G.vehicles.buy(row.id); } catch (e) { console.error(e); }
      G.closeText(); push(layer); refresh();
      return r ? note(`The ${row.name} is yours! It waits in your garage.`, 'good') : note(`No ${row.name} today, then.`, 'info');
    }
    const sell = row.type === 'sell', d = I[row.item];
    if (!sell && d.kind === 'tool' && have(row.item) > 0) { sfx('bump'); return note(`You already have a ${row.item}. One is plenty!`, 'warn'); }
    const q = (!sell && d.kind === 'tool') || (sell && have(row.item) === 1) ? 1 : await pickQty(row);
    if (!q) { st.mode = 'list'; return note(sell ? 'What else would you like to sell?' : 'Anything else catch your eye?', 'info'); }
    const total = q * row.price;
    if (!sell && total > money()) { st.mode = 'list'; sfx('bump'); return note(`You need $${total - money()} more.`, 'bad'); }
    const ok = await confirm(row, q, sell ? `Sell ${q} ${row.item} for $${total}?` : `Buy ${q} ${row.item} for $${total}?`);
    if (!ok) return note('No problem. Take your time!', 'info');
    if (sell) {
      if (!take(row.item, q)) { sfx('bump'); return note('Hm, you don\'t seem to have that many.', 'bad'); }
      give('money', total); sfx('buy'); st.fx = { t: 0, text: '+$' + total, col: '#2a8a4a' };
      note(`Sold ${q} ${row.item} for $${total}. Pleasure doing business!`, 'good');
    } else {
      if (money() < total) { sfx('bump'); return note(`You need $${total - money()} more.`, 'bad'); }
      if (G.inv) G.inv.pay({ money: total }); else G.state.money -= total;
      give(row.item, q); sfx('buy'); st.fx = { t: 0, text: '-$' + total, col: '#d05050' };
      note(`Thank you! Here ${q > 1 ? 'are your' : 'is your'} ${q > 1 ? q + ' ' : ''}${row.item}.`, 'good');
    }
    refresh();
  }

  try {
    for (;;) {
      const { p, a } = await next();
      if (p.b || (a && a.k === 'leave')) { sfx('select'); break; }
      if (a && a.k === 'tab') { if (a.i !== st.tab) setTab(a.i); continue; }
      if (a && a.k === 'scroll') { moveTo(Math.max(0, Math.min(st.rows.length - 1, st.idx + a.d))); continue; }
      if (p.left && st.tabs.length > 1) { setTab(st.tab - 1); continue; }
      if (p.right && st.tabs.length > 1) { setTab(st.tab + 1); continue; }
      if (p.up) moveTo(st.idx > 0 ? st.idx - 1 : st.rows.length - 1);
      if (p.down) moveTo(st.idx < st.rows.length - 1 ? st.idx + 1 : 0);
      if (a && a.k === 'row' && a.i !== st.idx) { moveTo(a.i); continue; }   // first tap selects, a second tap picks
      if (p.a || (a && a.k === 'row')) { sfx('select'); await act(st.rows[st.idx]); }
    }
  } finally { pop(layer); G.shopState = null; }
  await says(shop.bye || 'Please come again!');
};
// The Lanternrest Trading Post keeps its old entry point.
G.shopMenu = () => G.openShop('general');

// ---- Healing ---------------------------------------------------------------------------------
// G.healUI({ name, free: true } | { name, charges, revive }, plus optional greet / done lines) -> true if it healed.
// G.healUI.last is 'healed', 'cancel' or 'none' (nothing to heal) afterwards.
const needsHeal = (c, revive) => (c.hp <= 0 ? revive : c.hp < c.stats.hp || !!c.status || c.moves.some(m => m.pp < G.MOVES[m.id].pp));
function drawHeal(ctx, o, st, tap) {
  const party = G.state.party, t = G.frameNo, PINK = '#ff6b8a';
  ctx.fillStyle = 'rgba(40,20,40,.25)'; ctx.fillRect(-60, -60, 360, 168);
  G.frame(ctx, 4, 4, 232, 102, 'light');
  K.rr(ctx, 10, 9, 220, 14, 7); ctx.fillStyle = K.lin(ctx, 0, 9, 0, 23, ['#ffc078', '#f7983f', '#e07a2a']); ctx.fill();   // the shared orange header
  ctx.fillStyle = 'rgba(255,255,255,.3)'; K.rr(ctx, 16, 10.5, 208, 3, 1.5); ctx.fill();
  ctx.fillStyle = '#fff'; K.rr(ctx, 15, 11.5, 9, 9, 2.5); ctx.fill(); ctx.fillStyle = '#3fae5a'; ctx.fillRect(18.6, 13, 1.8, 6); ctx.fillRect(16.5, 15.1, 6, 1.8);   // green cross: healing
  G.text(ctx, o.name || 'HEALING', 28, 12, { color: '#fff', shadow: '#9a4a10', font: FB });
  const tag = o.free || o.charges == null ? 'FREE · UNLIMITED' : `HEALS LEFT TODAY: ${o.charges}`;
  const tw = G.textW(ctx, tag) * .75 + 10; K.pill(ctx, 226 - tw, 11.5, tw, 9, o.free || o.charges == null ? '#5cc86a' : '#ffb43a', tag, F6);
  if (!party.length) G.text(ctx, 'You have no creatures with you.', 120, 50, { align: 'center', color: '#8a7a98' });
  party.forEach((c, i) => {
    const x = 10 + (i % 2) * 112, y = 26 + Math.floor(i / 2) * 18, need = st.need[i], fainted = c.hp <= 0;
    const shown = st.anim ? st.from[i] + (st.to[i] - st.from[i]) * Math.min(1, st.anim / 40) : c.hp / c.stats.hp;
    K.rr(ctx, x, y, 108, 17, 6); ctx.fillStyle = need ? `rgba(255,107,138,${.16 + .08 * Math.sin(t / 12)})` : fainted ? 'rgba(160,150,170,.18)' : 'rgba(92,200,106,.14)'; ctx.fill();
    ctx.strokeStyle = need ? 'rgba(255,107,138,.7)' : 'rgba(150,140,170,.35)'; ctx.lineWidth = .8; ctx.stroke();
    const hop = need && !fainted ? 0 : Math.abs(Math.sin(t / 9 + i)) * (st.anim ? 1.6 : 0);
    G.icon(ctx, c.id, x + 2, y + 1 - hop, 15);
    G.text(ctx, G.name(c), x + 19, y + 1.5, { font: F6, color: '#3a2a48', shadow: false });
    G.text(ctx, 'Lv' + c.lvl, x + 104, y + 1.5, { align: 'right', font: F6, color: '#6a5a78', shadow: false });
    G.hpBar(ctx, x + 19, y + 10.5, 48, shown);
    const hpNow = st.anim ? Math.round(shown * c.stats.hp) : c.hp;
    G.text(ctx, `${hpNow}/${c.stats.hp}`, x + 104, y + 9, { align: 'right', font: F5, color: '#6a5a78', shadow: false });
    if (fainted && !st.anim) K.pill(ctx, x + 70, y + 9.5, 16, 6.5, '#ff5a5a', 'FNT', '900 4.5px ' + FAM);
    else if (c.status && !st.anim) K.pill(ctx, x + 70, y + 9.5, 16, 6.5, K.STATUS_COL[c.status], G.STATUS_NAME[c.status], '900 4.5px ' + FAM);
    if (st.anim && st.healed[i]) for (let k = 0; k < 3; k++) { const ph = ((t + k * 13 + i * 7) % 40) / 40; K.star(ctx, x + 4 + k * 5 + ph * 2, y + 14 - ph * 14, 1.6 * Math.sin(ph * Math.PI), '#fff6a8'); }
    else if (!need && !fainted) { ctx.fillStyle = '#5cc86a'; ctx.beginPath(); ctx.arc(x + 15, y + 13.5, 2.4, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(x + 13.9, y + 13.6); ctx.lineTo(x + 14.8, y + 14.5); ctx.lineTo(x + 16.3, y + 12.6); ctx.stroke(); }
  });
  const n = st.need.filter(Boolean).length, cant = party.some(c => c.hp <= 0) && !o.revive;
  const line = st.msg || (n ? `${n} ${n > 1 ? 'creatures need' : 'creature needs'} healing.${cant ? ' Fainted ones can\'t be revived here.' : ''}` : cant ? 'Fainted creatures can\'t be revived here.' : 'Everyone is in top shape!');
  G.text(ctx, line, 120, 81, { align: 'center', font: F6, color: st.msg ? '#2a8a4a' : n ? '#c0405a' : '#2a8a4a', shadow: false });
  if (!st.anim) {
    button(ctx, 54, 91, 70, 11, 'HEAL TEAM', PINK, st.btn === 0, () => tap('heal'), !n);
    button(ctx, 132, 91, 54, 11, 'CANCEL', '#a088c0', st.btn === 1, () => tap('cancel'));
  }
}
G.healUI = async function (o) {
  o = Object.assign({ revive: true }, o || {}); if (o.free) o.revive = true;
  const S = G.state, party = S.party;
  const st = G.healState = { btn: 0, need: party.map(c => needsHeal(c, o.revive)), anim: 0, from: [], to: [], healed: [], msg: '' };
  if (!st.need.some(Boolean)) st.btn = 1;
  const greet = o.greet || `${o.name || 'HEALER'}: Shall I restore your team to full health?`;
  G.ui.text = { lines: G.wrap(greet, 212).slice(0, 2), shown: 999, arrow: false, style: 'light' };
  let tapped = null;
  const layer = push({ draw: ctx => drawHeal(ctx, o, st, a => { tapped = a; }) });
  let res = null;
  try {
    while (!res) {
      await G.nextFrame(); const p = G.input.pressed, a = tapped; tapped = null;
      if (p.left || p.right || p.up || p.down) { st.btn ^= 1; sfx('select'); }
      if (p.b || a === 'cancel' || (p.a && st.btn === 1)) { res = 'cancel'; sfx('select'); break; }
      if (a === 'heal' || (p.a && st.btn === 0)) {
        if (!st.need.some(Boolean)) { sfx('bump'); st.msg = party.length ? 'Your team is already in perfect health!' : 'There is no one to heal.'; G.ui.text = { lines: [st.msg], shown: 999, arrow: false, style: 'light' }; res = 'none'; await G.wait(40); break; }
        // heal, then animate the bars filling up
        st.from = party.map(c => c.hp / c.stats.hp);
        party.forEach((c, i) => { if (o.revive || c.hp > 0) { st.healed[i] = st.need[i]; G.healFull(c); } });
        st.to = party.map(c => c.hp / c.stats.hp); st.need = party.map(() => false);
        G.closeText(); sfx('heal'); st.msg = 'All better! Your team is fully healed.';
        for (st.anim = 1; st.anim <= 70; st.anim++) { await G.nextFrame(); if (st.anim > 45 && (G.input.pressed.a || G.input.pressed.b)) break; }
        res = 'healed';
      }
    }
  } finally { pop(layer); G.healState = null; G.closeText(); }
  G.healUI.last = res;
  if (res === 'healed') await says(o.done || ['Your team is fully healed!', 'Take care out there, Warden.']);
  else if (res === 'cancel' && o.bye !== false) await says(o.bye || 'Come back any time!');
  return res === 'healed';
};

// The Warden Lodge nurse: same welcome as ever, the shared healing screen, and the Lodge becomes your respawn point.
if (G.story) G.story.nurse = async function () {
  const healed = await G.healUI({ name: 'WARDEN LODGE', free: true, greet: 'Welcome to the WARDEN LODGE!\nWe can restore your team to full health. Shall we?',
    done: ['Thank you for waiting.', 'Your partners are fully rested! We hope to see you again!'], bye: 'We hope to see you again!' });
  if (healed || G.healUI.last === 'none') G.state.flags.respawn = 'lodge';
  return healed;
};
})();
