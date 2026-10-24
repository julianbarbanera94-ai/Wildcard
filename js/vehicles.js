// Vehicles: vehicle data, riding (speed / turn / tile rules / encounters / drawing via the single world hooks),
// parking, the garage and helipad, creature flight and the helicopter (with the overhead vale-map fly scene),
// the TRAVEL menu, the dealership purchase API and the two vehicle quests. See docs/HOMESTEAD.md section 7.
(function () {
const G = globalThis.G;
const VEC = [[0, 1], [0, -1], [-1, 0], [1, 0]];
const DOWN = 0, UP = 1, LEFT = 2, RIGHT = 3;
const TAU = Math.PI * 2;
const HOME = 'homestead';
const says = l => G.worldApi.says(l);
const inv = () => G.inv;

// ---- Vehicle data ----------------------------------------------------------------------------
// tiles: the tile chars the vehicle may enter. `land` vehicles also accept new, non-solid, non-grass tile chars
// added later (another agent may add ground tiles). Warp tiles always use the default walking rule.
const LAND = 'gfpyzVDZY', ROAD = 'pyVzZDY';
const KNOWN = 'gGpfDMceTmayqzVZYvwX';
G.VEHICLES = {
  bicycle: { name: 'Bicycle', speed: 2.5, turn: 4, tiles: LAND, land: true, enc: 0, price: 4000, color: '#e04848',
    where: 'land, but not tall grass, marsh reeds or caves',
    how: 'Craft one at a Forge (tier 2), or buy one for $4,000 at Tidewheel Motors.',
    desc: 'A trusty bicycle. Fast on paths and fields, but it can\'t go through tall grass, marsh reeds or caves.' },
  scooter: { name: 'Scooter', speed: 3, turn: 4, tiles: ROAD + 'M', road: true, enc: 0, price: 0, color: '#3cb8e0',
    where: 'roads, paths, bridges, boardwalks and plaza sand only',
    how: 'The courier kid in Lanternrest trades it for 3 Carrots and 2 Turnips.',
    desc: 'A zippy kick scooter. Very quick, but only on roads and paths.' },
  quad: { name: 'Quad Bike', speed: 2.5, turn: 6, tiles: LAND + 'GqceM', land: true, enc: .5, price: 0, color: '#e0a020',
    where: 'all land, including tall grass, marsh reeds and cave floors',
    how: 'An abandoned quad lies on the Ridge. Repair it with 1 Engine Part and 2 Wheels.',
    desc: 'A rugged quad bike. Goes anywhere on land and halves wild encounters in tall grass.' },
  motorbike: { name: 'Motorbike', speed: 3.5, turn: 8, tiles: LAND + 'ceM', land: true, enc: 0, price: 15000, color: '#3a4a6a', req: { shards: 1 },
    where: 'land and cave floors, but not tall grass or marsh reeds',
    how: '$15,000 at Tidewheel Motors, once you hold an Ember Shard.',
    desc: 'A roaring motorbike. Very fast on land and in caves; it can\'t push through tall grass.' },
  car: { name: 'Car', speed: 4, turn: 10, tiles: ROAD, road: true, enc: 0, price: 30000, color: '#4a7ae0', req: { shards: 2, struct: { garage: 2 } },
    where: 'roads and paths only, never caves',
    how: '$30,000 at Tidewheel Motors. Needs a Double Garage and 2 Ember Shards.',
    desc: 'A shiny little car. The fastest thing on wheels, but it sticks to the roads.' },
  hoverboard: { name: 'Hoverboard', speed: 3, turn: 3, tiles: LAND + 'Gqw', land: true, enc: 0, price: 0, color: '#a070ff',
    where: 'all open land and even water, but not caves',
    how: 'Craft one at a Master Forge (tier 3) after the Great Lantern is lit.',
    desc: 'It floats over grass and water alike. Wild creatures never notice you pass.' },
  rowboat: { name: 'Rowboat', speed: 2, turn: 4, tiles: 'w', boat: true, enc: 0, price: 1500, color: '#b9783c',
    where: 'water only', how: 'Craft one at a Forge (tier 1), or buy one for $1,500 at Tidewheel Motors.',
    desc: 'A little wooden rowboat. Slow and steady across any open water.' },
  motorboat: { name: 'Motorboat', speed: 3.5, turn: 6, tiles: 'w', boat: true, enc: 0, price: 9000, color: '#e04848',
    where: 'water only', how: 'Craft one at a Forge (tier 2), or buy one for $9,000 at Tidewheel Motors.',
    desc: 'An outboard motorboat. It skips across open water almost twice as fast as rowing.' },
  sailboat: { name: 'Sailboat', speed: 3, turn: 5, tiles: 'w', boat: true, enc: 0, price: 0, color: '#3a78e0',
    where: 'water only', how: 'Craft one at a Master Forge (tier 3).',
    desc: 'A graceful sailboat with a bright white sail. Quick, quiet and lovely to look at.' },
  helicopter: { name: 'Helicopter', speed: 0, turn: 0, tiles: '', enc: 0, price: 80000, color: '#e05030', flies: true, req: { lit: true, struct: { garage: 3, helipad: 1 } },
    where: 'flies between landing spots',
    how: '$80,000 at Tidewheel Motors after the Lantern is lit. Needs a Motor Hall (Garage Lv3) and a Helipad.',
    desc: 'Your own helicopter. Fly to any landing spot in the vale you have visited.' },
};
const ORDER = Object.keys(G.VEHICLES);
const SOLD = ['bicycle', 'rowboat', 'motorboat', 'motorbike', 'car', 'helicopter'];
const PAINTS = [['RED', '#e04848'], ['BLUE', '#3a78e0'], ['GREEN', '#3fae5a'], ['YELLOW', '#f0c030'], ['PURPLE', '#9a5ae0'], ['BLACK', '#3a3a48']];
const TILE_WORD = { G: 'tall grass', q: 'marsh reeds', c: 'cave floors', e: 'cave floors', M: 'cave mouths', w: 'water', g: 'grass', f: 'flowers' };

// ---- Landing spots (checked for walkability at runtime; map.landing wins) ----------------------
const LANDING = {
  lanternrest: { x: 29, y: 25 },   // the plaza, just south of the Great Lantern
  sunmeadow: { x: 64, y: 20 },     // the sand road by the east entrance
  mirewood: { x: 7, y: 24 },       // the entry path in the west woods
  ridge: { x: 24, y: 46 },         // the trail at the foot of the ridge
  shore: { x: 30, y: 7 },          // the road down onto the beach
  hollow: { x: 19, y: 27 },        // the mouth of the crystal cavern
  homestead: { x: 28, y: 38 },     // fallback guess; homestead.js should define map.landing
};

// ---- State --------------------------------------------------------------------------------------
function st() {
  const S = G.state;
  const V = S.vehicles = S.vehicles || {};   // fill defaults in place: callers keep references to this object
  for (const [k, d] of [['owned', null], ['riding', null], ['parked', null], ['paint', null], ['tune', null], ['heli', null], ['moored', null], ['equipped', null]]) if (V[k] === undefined) V[k] = d;
  if (!Array.isArray(V.owned)) V.owned = [];
  V.paint = V.paint || {}; V.tune = V.tune || {};
  if (V.riding && !G.VEHICLES[V.riding]) V.riding = null;
  S.visited = S.visited || {}; S.flags = S.flags || {};
  return V;
}
const V$ = id => G.VEHICLES[id];
const nameOf = id => V$(id).name;
const NAME = id => nameOf(id).toUpperCase();
const a_ = id => /^[AEIOU]/.test(nameOf(id)) ? 'an' : 'a';
const owns = id => st().owned.includes(id);
const riding = () => (G.state && st().riding) || null;
const colorOf = id => (st().paint[id]) || V$(id).color;
const speedOf = id => V$(id).speed + (st().tune[id] ? .5 : 0);
const mapName = id => { const m = G.MAPS[id]; return m ? m.name : id.toUpperCase(); };
const garageB = () => (G.state.builds || []).find(b => b.type === 'garage') || null;
const helipadB = () => (G.state.builds || []).find(b => b.type === 'helipad') || null;
const garageLvl = () => { const b = garageB(); return b && G.home ? G.home.lvl(b) : 0; };
const perks = () => { const b = garageB(); return b && G.home ? G.home.L(b).perks : { slots: 0 }; };
const slots = () => perks().slots || 0;
const landOwned = () => st().owned.filter(id => !V$(id).flies && !V$(id).boat);
const isBoat = id => !!(V$(id) && V$(id).boat);
// Vehicles beyond the garage's capacity (in the order you got them) wait at the dealer lot.
// Light vehicles (bicycle, scooter, hoverboard) go wherever you do: no Garage needed, and they never wait at the dealer lot.
const LIGHT = new Set(['bicycle', 'scooter', 'hoverboard']);
const atLot = id => !LIGHT.has(id) && !V$(id).flies && !V$(id).boat && landOwned().indexOf(id) >= slots();
function whereIs(id) {
  const V = st();
  if (!owns(id)) return 'none';
  if (V$(id).flies) return V.heli ? 'away' : 'pad';
  if (V$(id).boat) return V.riding === id ? 'riding' : (V.moored && V.moored.id === id) ? 'moored' : 'stowed';
  if (V.riding === id) return 'riding';
  if (V.parked && V.parked.id === id) return 'parked';
  return atLot(id) ? 'lot' : 'garage';
}
function reqList(req) {
  if (G.home && G.home.reqList) return G.home.reqList(req);
  return [];
}
const shards = () => G.home && G.home.shards ? G.home.shards() : ['meadow', 'marsh', 'mine'].filter(k => G.state.flags['shard_' + k]).length;

// ---- Tile rules ----------------------------------------------------------------------------------
function allowed(id, ch) {
  const V = V$(id); if (!V || V.flies) return false;
  if (V.tiles.includes(ch)) return true;
  const T = G.TILES[ch];
  return !!(V.land && T && !T.solid && !T.enc && !KNOWN.includes(ch));
}
function refusal(id, ch) {
  const V = V$(id);
  if (V.boat) return `${a_(id) === 'an' ? 'An' : 'A'} ${V.name} can only sail on water.`;
  if (V.road) return `${a_(id) === 'an' ? 'An' : 'A'} ${V.name} can only go on roads and paths.`;
  return `${a_(id) === 'an' ? 'An' : 'A'} ${V.name} can't go on ${TILE_WORD[ch] || 'that ground'}.`;
}
// What is blocking the player at (x, y) on the current map: parked vehicles, the helicopter and the quad wreck.
function vehicleAt(x, y) {
  const V = st(), m = G.world.mapId;
  if (V.parked && V.parked.map === m && V.parked.x === x && V.parked.y === y) return { kind: 'parked', id: V.parked.id };
  if (V.moored && V.moored.map === m && V.moored.x === x && V.moored.y === y && owns(V.moored.id)) return { kind: 'moored', id: V.moored.id };
  if (V.heli && owns('helicopter') && V.heli.map === m && V.heli.x === x && V.heli.y === y) return { kind: 'heli', id: 'helicopter' };
  return null;
}
const wreckAt = (x, y) => (G.world.map.objs || []).find(o => o.x === x && o.y === y && isWreck(o) && !(o.hide && o.hide()));
const isWreck = o => o.vq === 'quad' || (o.prompt && typeof o.prompt === 'string' && /quad/i.test(o.prompt));

// ---- Toast (a short hint chip when a vehicle refuses a tile) -------------------------------------
let toast = null;
const showToast = text => { if (!toast || toast.text !== text || G.frameNo > toast.until - 60) toast = { text, until: G.frameNo + 110 }; };

// ---- World hooks (single owner: Vehicles) --------------------------------------------------------
G.hooks.enter = function (x, y, ch) {
  if (!G.state) return undefined;
  if (vehicleAt(x, y) || wreckAt(x, y)) return false;
  const id = riding(); if (!id) return undefined;
  if (G.worldApi.tileWarp(x, y)) return allowed(id, ch) && G.TILES[ch] && G.TILES[ch].solid ? true : undefined;   // harbour gates sit on water
  if (allowed(id, ch)) return G.TILES[ch] && G.TILES[ch].solid ? true : undefined;   // the hoverboard over water
  const T = G.TILES[ch];
  if (T && T.solid) return undefined;
  showToast(refusal(id, ch));
  return false;
};
G.hooks.speed = function (held) { const id = riding(); return id ? speedOf(id) : (G.running(held) ? 2 : 1); };   // run: hold B, toggle or always (settings)
G.hooks.turn = function () { const id = riding(); return id ? V$(id).turn : 5; };
G.hooks.encRate = function (rate) { const id = riding(); return id ? rate * (V$(id).enc || 0) : rate; };

// ---- Art: G.homeArt.vehicle when present, else a drawn fallback ----------------------------------
const SEAT = {
  bicycle: [{ dx: 0, dy: -3 }, { dx: 0, dy: -3 }, { dx: 0, dy: -3 }, { dx: 0, dy: -3 }],
  scooter: [{ dx: 0, dy: -2 }, { dx: 0, dy: -2 }, { dx: 1, dy: -2 }, { dx: -1, dy: -2 }],
  quad: [{ dx: 0, dy: -5 }, { dx: 0, dy: -5 }, { dx: 1, dy: -5 }, { dx: -1, dy: -5 }],
  motorbike: [{ dx: 0, dy: -4 }, { dx: 0, dy: -4 }, { dx: 1, dy: -4 }, { dx: -1, dy: -4 }],
  car: [{ dx: 0, dy: 0, hide: true }, { dx: 0, dy: 0, hide: true }, { dx: 0, dy: 0, hide: true }, { dx: 0, dy: 0, hide: true }],
  hoverboard: [{ dx: 0, dy: -4 }, { dx: 0, dy: -4 }, { dx: 0, dy: -4 }, { dx: 0, dy: -4 }],
  helicopter: [{ dx: 0, dy: 0, hide: true }, { dx: 0, dy: 0, hide: true }, { dx: 0, dy: 0, hide: true }, { dx: 0, dy: 0, hide: true }],
};
const hasArt = () => !!(G.homeArt && G.homeArt.vehicle);
function seat(id, dir) {
  if (ownBoatArt(id)) return boatSeat(id, dir);
  let s = null;
  if (hasArt() && G.homeArt.seat) { try { s = G.homeArt.seat(id, dir); } catch (e) { s = null; } }
  s = Object.assign({ dx: 0, dy: 0 }, s || SEAT[id][dir] || {});
  if (id === 'hoverboard' && !(hasArt() && G.homeArt.seat)) s.dy -= hoverBob(G.frameNo);
  return s;
}
function art(ctx, id, dir, x, y, t, info) {
  info = Object.assign({ color: colorOf(id) }, info);
  if (ownBoatArt(id)) { boatArt(ctx, id, dir, x, y, t, info); return; }
  if (hasArt()) { try { G.homeArt.vehicle(ctx, id, dir, x, y, t, info); return; } catch (e) { /* use the fallback */ } }
  fallback(ctx, id, dir, x, y, t, info);
}
G.vehicleArt = art;

const hoverBob = t => Math.sin(t / 9) * 1.1;
function circ(c, x, y, r, col) { c.beginPath(); c.arc(x, y, Math.max(.01, r), 0, TAU); c.fillStyle = col; c.fill(); }
function ell(c, x, y, rx, ry, col) { c.beginPath(); c.ellipse(x, y, Math.max(.01, rx), Math.max(.01, ry), 0, 0, TAU); c.fillStyle = col; c.fill(); }
function line(c, pts, col, w) { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(); }
function box(c, x, y, w, h, r, col) { G.kit.rr(c, x, y, w, h, r); c.fillStyle = col; c.fill(); }
const TYRE = '#2b2a36', RIM = '#c9ccd8', CHROME = '#dfe3ee', GLASS = '#bfe6ff', SEATC = '#3a3040';
function sideWheel(c, x, y, r, t, moving) {
  circ(c, x, y, r, TYRE); circ(c, x, y, r * .62, RIM); circ(c, x, y, r * .5, '#9aa0b4');
  const a = moving ? t / 3 : .4;
  for (let k = 0; k < 3; k++) { const b = a + k * TAU / 6; line(c, [x - Math.cos(b) * r * .5, y - Math.sin(b) * r * .5, x + Math.cos(b) * r * .5, y + Math.sin(b) * r * .5], '#eef0f6', .45); }
  circ(c, x, y, r * .16, '#5a5f70');
}
function edgeWheel(c, x, y, rx, ry) { ell(c, x, y, rx, ry, TYRE); ell(c, x - rx * .25, y - ry * .2, rx * .3, ry * .55, 'rgba(255,255,255,.18)'); }
function shadow(c, cx, gy, rx, a) { ell(c, cx, gy, rx, 1.9, `rgba(30,40,60,${a || .22})`); }

function fallback(c, id, dir, x, y, t, info) {
  const cx = x + 8, gy = y + 15, col = info.color, back = info.layer !== 'front', front = info.layer !== 'back';
  const side = dir > 1, s = dir === RIGHT ? 1 : -1, mv = !!info.moving, dark = G.shade(col, .7), lite = G.shade(col, 1.35);
  c.save();
  if (id === 'bicycle') {
    if (side) {
      if (back) {
        shadow(c, cx, gy, 9);
        sideWheel(c, cx - 5.5 * s, gy - 3.7, 3.7, t, mv); sideWheel(c, cx + 5.5 * s, gy - 3.7, 3.7, t, mv);
        line(c, [cx - 5.5 * s, gy - 3.7, cx - 1.5 * s, gy - 9.5, cx + 4 * s, gy - 9.5, cx, gy - 3.7, cx - 5.5 * s, gy - 3.7], col, 1.3);
        line(c, [cx - 1.5 * s, gy - 9.5, cx, gy - 3.7], col, 1.3);
        line(c, [cx + 4 * s, gy - 9.5, cx + 5.5 * s, gy - 3.7], CHROME, 1);
        circ(c, cx, gy - 3.7, 1.2, '#7a7f90');
        box(c, cx - 3.2 * s - 1.6, gy - 11, 3.6, 1.6, .8, SEATC);
      }
      if (front) { line(c, [cx + 4 * s, gy - 9.5, cx + 3.4 * s, gy - 12, cx + 5 * s, gy - 12.4], CHROME, 1); circ(c, cx + 5 * s, gy - 12.4, .8, SEATC); }
    } else if (dir === DOWN) {
      if (back) { shadow(c, cx, gy, 5); box(c, cx - 1.8, gy - 11, 3.6, 1.6, .8, SEATC); }
      if (front) {
        edgeWheel(c, cx, gy - 3.8, 1.5, 3.8); line(c, [cx - 1.3, gy - 4, cx, gy - 10.5, cx + 1.3, gy - 4], col, 1);
        line(c, [cx - 5, gy - 10.6, cx + 5, gy - 10.6], CHROME, 1); circ(c, cx - 5.2, gy - 10.6, .9, SEATC); circ(c, cx + 5.2, gy - 10.6, .9, SEATC);
        circ(c, cx, gy - 9, .9, '#fff6c0');
      }
    } else {
      if (back) { shadow(c, cx, gy, 5); edgeWheel(c, cx, gy - 5, 1.2, 3); line(c, [cx - 5, gy - 11.6, cx + 5, gy - 11.6], CHROME, 1); }
      if (front) { edgeWheel(c, cx, gy - 3.6, 1.5, 3.6); box(c, cx - 2, gy - 8.5, 4, 2.4, 1, col); circ(c, cx, gy - 7.3, .8, '#ff4a4a'); box(c, cx - 1.8, gy - 11, 3.6, 1.6, .8, SEATC); }
    }
  } else if (id === 'scooter') {
    if (side) {
      if (back) {
        shadow(c, cx, gy, 8);
        box(c, cx - 6.5 + (s > 0 ? 0 : 3), gy - 4.4, 10, 1.8, .9, col); box(c, cx - 6.5 + (s > 0 ? 0 : 3), gy - 4.4, 10, .6, .3, lite);
        sideWheel(c, cx - 5.5 * s, gy - 2.3, 2.3, t, mv); sideWheel(c, cx + 5 * s, gy - 2.3, 2.3, t, mv);
        line(c, [cx + 5 * s, gy - 2.6, cx + 3.6 * s, gy - 13], col, 1.3);
      }
      if (front) { line(c, [cx + 2.4 * s, gy - 13.2, cx + 5 * s, gy - 13.2], SEATC, 1.2); }
    } else {
      const far = dir === UP;
      if (back) { shadow(c, cx, gy, 4.5); if (far) { line(c, [cx, gy - 4, cx, gy - 13.5], col, 1.3); line(c, [cx - 4.5, gy - 13.5, cx + 4.5, gy - 13.5], SEATC, 1.2); } }
      if (front) {
        edgeWheel(c, cx, gy - 2.4, 1.2, 2.4);
        if (!far) { line(c, [cx, gy - 4, cx, gy - 13.5], col, 1.3); line(c, [cx - 4.5, gy - 13.5, cx + 4.5, gy - 13.5], SEATC, 1.2); circ(c, cx, gy - 10, .9, '#fff6c0'); }
        else { box(c, cx - 2, gy - 5, 4, 1.6, .8, col); circ(c, cx, gy - 4.2, .7, '#ff4a4a'); }
      }
    }
  } else if (id === 'motorbike') {
    if (side) {
      if (back) {
        shadow(c, cx, gy, 10);
        sideWheel(c, cx - 6 * s, gy - 4, 4, t, mv); sideWheel(c, cx + 6 * s, gy - 4, 4, t, mv);
        box(c, cx - 2.5, gy - 7, 5, 4, 1.2, '#6a6e7c');
        line(c, [cx - 1 * s, gy - 3.6, cx - 7.5 * s, gy - 5.2], CHROME, 1.3);
        line(c, [cx + 4 * s, gy - 10, cx + 6 * s, gy - 4], CHROME, 1.1);
        c.beginPath(); c.moveTo(cx - 6 * s, gy - 8.5); c.quadraticCurveTo(cx - 1 * s, gy - 12.5, cx + 5 * s, gy - 10.5); c.lineTo(cx + 3 * s, gy - 6.5); c.lineTo(cx - 5 * s, gy - 6.5); c.closePath(); c.fillStyle = col; c.fill();
        c.beginPath(); c.moveTo(cx - 1 * s, gy - 11.6); c.quadraticCurveTo(cx + 2 * s, gy - 12.4, cx + 4.5 * s, gy - 10.8); c.strokeStyle = lite; c.lineWidth = .8; c.stroke();
        box(c, cx - 3.5 * s - 3, gy - 10.6, 6, 1.8, .9, SEATC);
        circ(c, cx + 6.2 * s, gy - 10, 1.3, '#fff2a0');
      }
      if (front) { line(c, [cx + 4 * s, gy - 10.5, cx + 3 * s, gy - 13, cx + 4.6 * s, gy - 13.4], CHROME, 1); ell(c, cx + 5 * s, gy - 13, 1.4, 2, 'rgba(190,230,255,.55)'); }
    } else {
      const far = dir === UP;
      if (back) { shadow(c, cx, gy, 6); if (far) { box(c, cx - 4, gy - 12, 8, 5, 2, col); line(c, [cx - 6.5, gy - 12.5, cx + 6.5, gy - 12.5], CHROME, 1); } }
      if (front) {
        edgeWheel(c, cx, gy - 4, 2.2, 4);
        if (!far) {
          box(c, cx - 4.2, gy - 12, 8.4, 6, 2.2, col); box(c, cx - 3.2, gy - 11.4, 6.4, 1.4, .7, lite);
          circ(c, cx, gy - 8.8, 1.7, '#fff2a0'); circ(c, cx, gy - 8.8, .8, '#ffffff');
          line(c, [cx - 6.5, gy - 12.4, cx + 6.5, gy - 12.4], CHROME, 1); circ(c, cx - 6.8, gy - 13.6, .9, CHROME); circ(c, cx + 6.8, gy - 13.6, .9, CHROME);
        } else { box(c, cx - 3, gy - 9, 6, 3, 1.2, col); box(c, cx - 1.5, gy - 8.2, 3, 1.1, .5, '#ff4a4a'); box(c, cx - 2.6, gy - 11, 5.2, 1.8, .9, SEATC); }
      }
    }
  } else if (id === 'quad') {
    if (side) {
      if (back) {
        shadow(c, cx, gy, 11);
        sideWheel(c, cx - 5.5 * s, gy - 4.2, 4.2, t, mv); sideWheel(c, cx + 5.5 * s, gy - 4.2, 4.2, t, mv);
        box(c, cx - 9, gy - 10.5, 18, 4.2, 2, col); box(c, cx - 8, gy - 10.3, 16, 1.2, .6, lite);
        c.beginPath(); c.arc(cx - 5.5 * s, gy - 6.5, 5, Math.PI, TAU); c.strokeStyle = dark; c.lineWidth = 1.2; c.stroke();
        c.beginPath(); c.arc(cx + 5.5 * s, gy - 6.5, 5, Math.PI, TAU); c.stroke();
        box(c, cx - 4 * s - 2.5, gy - 12, 5, 2, 1, SEATC);
        line(c, [cx + 7 * s, gy - 11, cx + 10 * s, gy - 11], '#6a6e7c', 1);
      }
      if (front) { line(c, [cx + 3 * s, gy - 10.5, cx + 2.6 * s, gy - 13.4, cx + 4.6 * s, gy - 13.6], CHROME, 1); }
    } else {
      const far = dir === UP;
      if (back) {
        shadow(c, cx, gy, 10);
        box(c, cx - 9, gy - 9.5, 4.4, 7.5, 1.8, TYRE); box(c, cx + 4.6, gy - 9.5, 4.4, 7.5, 1.8, TYRE);
        if (far) { box(c, cx - 6, gy - 12.5, 12, 4, 2, col); line(c, [cx - 5.5, gy - 13.4, cx + 5.5, gy - 13.4], CHROME, 1); }
      }
      if (front) {
        box(c, cx - 9.5, gy - 7.6, 4.8, 7.6, 2, TYRE); box(c, cx + 4.7, gy - 7.6, 4.8, 7.6, 2, TYRE);
        box(c, cx - 8.8, gy - 6.6, 1.2, 5.6, .6, 'rgba(255,255,255,.14)'); box(c, cx + 5.4, gy - 6.6, 1.2, 5.6, .6, 'rgba(255,255,255,.14)');
        box(c, cx - 6, gy - 10, 12, 6.5, 2.4, col); box(c, cx - 5, gy - 9.6, 10, 1.4, .7, lite);
        if (!far) { circ(c, cx - 3, gy - 6.2, 1.2, '#fff2a0'); circ(c, cx + 3, gy - 6.2, 1.2, '#fff2a0'); line(c, [cx - 6, gy - 11.5, cx + 6, gy - 11.5], CHROME, 1); box(c, cx - 3.5, gy - 3.8, 7, 1.2, .6, '#6a6e7c'); }
        else { circ(c, cx - 3, gy - 6, .9, '#ff4a4a'); circ(c, cx + 3, gy - 6, .9, '#ff4a4a'); box(c, cx - 2.5, gy - 12, 5, 2, 1, SEATC); }
      }
    }
  } else if (id === 'car') {
    if (back) {
      const head = (G.state && G.state.style && G.state.style.hair) || '#4a2f1a';
      if (side) {
        shadow(c, cx, gy, 13, .26);
        box(c, cx - 11.5, gy - 11, 23, 7.6, 3, col);
        c.beginPath(); c.moveTo(cx - 7 * s, gy - 10.8); c.lineTo(cx - 5 * s, gy - 17); c.lineTo(cx + 3.5 * s, gy - 17); c.lineTo(cx + 7 * s, gy - 10.8); c.closePath(); c.fillStyle = col; c.fill();
        c.beginPath(); c.moveTo(cx - 5.6 * s, gy - 11.2); c.lineTo(cx - 4.2 * s, gy - 16); c.lineTo(cx - .6 * s, gy - 16); c.lineTo(cx - .6 * s, gy - 11.2); c.closePath(); c.fillStyle = GLASS; c.fill();
        c.beginPath(); c.moveTo(cx + .6 * s, gy - 11.2); c.lineTo(cx + .6 * s, gy - 16); c.lineTo(cx + 3 * s, gy - 16); c.lineTo(cx + 5.6 * s, gy - 11.2); c.closePath(); c.fillStyle = GLASS; c.fill();
        circ(c, cx + 2 * s, gy - 13.2, 1.8, head);
        box(c, cx - 10.5, gy - 10.3, 21, 1.4, .7, lite);
        line(c, [cx, gy - 10.5, cx, gy - 4.5], dark, .5);
        sideWheel(c, cx - 6.5, gy - 3.4, 3.4, t, mv); sideWheel(c, cx + 6.5, gy - 3.4, 3.4, t, mv);
        box(c, cx + 10.2 * s - 1, gy - 9.6, 2, 1.6, .8, '#fff2a0'); box(c, cx - 10.6 * s - 1, gy - 9.6, 2, 1.6, .8, '#ff5a4a');
      } else {
        const far = dir === UP;
        shadow(c, cx, gy, 11, .26);
        box(c, cx - 9.5, gy - 5, 3.6, 5, 1.4, TYRE); box(c, cx + 5.9, gy - 5, 3.6, 5, 1.4, TYRE);
        c.beginPath(); c.moveTo(cx - 7.5, gy - 11); c.lineTo(cx - 5.8, gy - 17.5); c.lineTo(cx + 5.8, gy - 17.5); c.lineTo(cx + 7.5, gy - 11); c.closePath(); c.fillStyle = col; c.fill();
        c.beginPath(); c.moveTo(cx - 6.2, gy - 11.4); c.lineTo(cx - 4.9, gy - 16.6); c.lineTo(cx + 4.9, gy - 16.6); c.lineTo(cx + 6.2, gy - 11.4); c.closePath(); c.fillStyle = GLASS; c.fill();
        if (!far) { circ(c, cx - 1.8, gy - 13.4, 2, head); ell(c, cx - 1.8, gy - 12.2, 1.6, 1, '#f8d0a8'); }
        else circ(c, cx - 1.8, gy - 13.6, 2, head);
        c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(cx + 1.5, gy - 16.4); c.lineTo(cx + 3.6, gy - 16.4); c.lineTo(cx + 1.2, gy - 11.6); c.lineTo(cx - .9, gy - 11.6); c.closePath(); c.fill();
        box(c, cx - 9.8, gy - 11.6, 19.6, 8.4, 3, col); box(c, cx - 9, gy - 11.2, 18, 1.5, .7, lite);
        if (!far) { circ(c, cx - 6.4, gy - 7.8, 1.6, '#fff2a0'); circ(c, cx + 6.4, gy - 7.8, 1.6, '#fff2a0'); box(c, cx - 3.5, gy - 8.6, 7, 2.6, 1, dark); for (let k = -2; k <= 2; k += 1.4) line(c, [cx + k, gy - 8.2, cx + k, gy - 6.4], G.shade(col, .5), .4); }
        else { box(c, cx - 8, gy - 8.4, 3.2, 1.6, .8, '#ff4a4a'); box(c, cx + 4.8, gy - 8.4, 3.2, 1.6, .8, '#ff4a4a'); box(c, cx - 2.6, gy - 7.6, 5.2, 2.2, .6, '#f4f0d0'); }
        box(c, cx - 10, gy - 4.4, 20, 1.6, .8, '#8a8e9c');
      }
    }
  } else if (id === 'hoverboard') {
    const bob = hoverBob(t), glow = .35 + Math.sin(t / 6) * .12;
    if (back) {
      ell(c, cx, gy, side ? 7.5 : 5, 1.6, 'rgba(30,40,60,.16)');
      ell(c, cx, gy - 1.5, side ? 7 : 4.6, 1.8, `rgba(120,240,255,${glow})`);
      if (mv) for (let k = 0; k < 3; k++) { const ph = (t / 3 + k * 7) % 12; circ(c, cx - (side ? s * (4 + ph) : (k - 1) * 3), gy - 2 - ph * .1 + (side ? 0 : ph * .3), Math.max(.1, .9 - ph * .07), `rgba(170,250,255,${.7 - ph * .05})`); }
    }
    if (back) {
      const w = side ? 17 : 10.5, yy = gy - 5 - bob;
      box(c, cx - w / 2, yy, w, 2.8, 1.4, col); box(c, cx - w / 2 + 1, yy + .2, w - 2, .9, .45, lite);
      box(c, cx - w / 2 + 1.2, yy + 2.1, w - 2.4, .7, .35, '#7af0ff');
    }
  } else if (id === 'helicopter') {
    if (back) {
      const blur = mv, pilot = (G.state && G.state.style && G.state.style.hair) || '#4a2f1a';
      shadow(c, cx, gy, 14, .25);
      if (side) {
        line(c, [cx - 9, gy - 1.2, cx + 9, gy - 1.2], '#5a5e6c', 1.2); line(c, [cx - 5, gy - 1.2, cx - 4, gy - 5], '#5a5e6c', .9); line(c, [cx + 5, gy - 1.2, cx + 4, gy - 5], '#5a5e6c', .9);
        c.beginPath(); c.moveTo(cx - 5 * s, gy - 12.5); c.lineTo(cx - 20 * s, gy - 13); c.lineTo(cx - 20 * s, gy - 10.6); c.lineTo(cx - 5 * s, gy - 9); c.closePath(); c.fillStyle = dark; c.fill();
        c.beginPath(); c.moveTo(cx - 18 * s, gy - 12.5); c.lineTo(cx - 21.5 * s, gy - 18); c.lineTo(cx - 20.5 * s, gy - 11); c.closePath(); c.fillStyle = col; c.fill();
        if (blur) ell(c, cx - 20 * s, gy - 12, 3.4, 3.4, 'rgba(220,225,235,.45)'); else line(c, [cx - 20 * s, gy - 15.4, cx - 20 * s, gy - 8.6], '#4a4e5c', .8);
        ell(c, cx, gy - 10, 9.5, 7, col); ell(c, cx - 1 * s, gy - 13.6, 6, 2, lite);
        c.save(); c.beginPath(); c.ellipse(cx, gy - 10, 9.5, 7, 0, 0, TAU); c.clip(); ell(c, cx + 6 * s, gy - 11, 5.5, 5.2, GLASS); circ(c, cx + 3.6 * s, gy - 11.6, 1.8, pilot); c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(cx + (s > 0 ? 6 : -8), gy - 14.5, 2, 4); c.restore();
      } else {
        line(c, [cx - 8, gy - 1.2, cx - 8, gy - 5], '#5a5e6c', 1); line(c, [cx + 8, gy - 1.2, cx + 8, gy - 5], '#5a5e6c', 1);
        line(c, [cx - 10, gy - 1.2, cx - 6, gy - 1.2], '#5a5e6c', 1.3); line(c, [cx + 6, gy - 1.2, cx + 10, gy - 1.2], '#5a5e6c', 1.3);
        if (dir === UP) { box(c, cx - 1.6, gy - 24, 3.2, 12, 1.2, dark); box(c, cx - 4, gy - 25, 8, 2, 1, col); }
        ell(c, cx, gy - 10, 8.6, 7.6, col); ell(c, cx, gy - 14.6, 5, 2, lite);
        if (dir === DOWN) { ell(c, cx, gy - 9.6, 6, 5.2, GLASS); circ(c, cx, gy - 10.6, 2, pilot); ell(c, cx, gy - 9.3, 1.5, 1, '#f8d0a8'); c.fillStyle = 'rgba(255,255,255,.45)'; c.fillRect(cx + 2, gy - 13.4, 1.4, 4); }
        else { circ(c, cx - 3, gy - 7, .9, '#ff4a4a'); circ(c, cx + 3, gy - 7, .9, '#ff4a4a'); }
      }
      // mast and main rotor
      line(c, [cx, gy - 16.5, cx, gy - 19], '#4a4e5c', 1.2);
      if (blur) {
        ell(c, cx, gy - 19.5, 18, 3.4, 'rgba(225,230,240,.38)'); ell(c, cx, gy - 19.5, 18, 3.4, 'rgba(0,0,0,0)');
        c.strokeStyle = 'rgba(80,85,100,.35)'; c.lineWidth = .6; c.beginPath(); c.ellipse(cx, gy - 19.5, 18, 3.4, 0, 0, TAU); c.stroke();
        const a = t / 1.6; line(c, [cx - Math.cos(a) * 17, gy - 19.5 - Math.sin(a) * 3.2, cx + Math.cos(a) * 17, gy - 19.5 + Math.sin(a) * 3.2], 'rgba(60,64,78,.5)', 1);
      } else {
        line(c, [cx - 16, gy - 20.4, cx + 16, gy - 18.6], '#4a4e5c', 1.1); line(c, [cx - 6, gy - 22, cx + 6, gy - 17], '#4a4e5c', 1.1);
      }
      circ(c, cx, gy - 19.5, 1.2, '#3a3e4c');
    }
  }
  c.restore();
}

// ---- Boats: drawn art (used unless G.homeArt.vehicleIds lists the boat) -------------------------------
const BOATS = { rowboat: 1, motorboat: 1, sailboat: 1 };
const ownBoatArt = id => !!BOATS[id] && !(hasArt() && G.homeArt.vehicleIds && G.homeArt.vehicleIds.includes(id));
const boatBob = t => Math.sin(t / 17) * .7;
function boatSeat(id, dir) {
  const s = dir === RIGHT ? 1 : -1, b = boatBob(G.frameNo);
  if (dir < 2) return { dx: 0, dy: -6 + b };
  return { dx: -s * (id === 'motorboat' ? 2.5 : id === 'sailboat' ? 3 : .5), dy: -2 + b };
}
function waterFx(c, cx, gy, side, s, dirY, t, mv) {
  const rx = side ? 12.5 : 7.5, ry = side ? 2.8 : 3.4, cy = side ? gy - 1.2 : gy - 9;
  ell(c, cx, side ? gy - 1.2 : gy - 8, rx, side ? ry : 8.5, 'rgba(20,60,100,.2)');   // soft shadow on the water
  for (const off of [0, 27]) {
    const ph = ((t + off) % 54) / 54;
    c.strokeStyle = `rgba(255,255,255,${.6 * (1 - ph)})`; c.lineWidth = .6; c.beginPath(); c.ellipse(cx, cy, rx + 1 + ph * 6, side ? ry + ph * 2 : 8.5 + ph * 3, 0, 0, TAU); c.stroke();
  }
  if (!mv) return;
  for (let k = 0; k < 3; k++) {   // wake: V lines streaming off the stern
    const q = ((t * .9 + k * 9) % 27) / 27, a = (1 - q) * .75, len = 5 + q * 10, sp = 1.2 + q * 3.4;
    c.strokeStyle = `rgba(255,255,255,${a})`; c.lineWidth = .8; c.lineCap = 'round';
    for (const sg of [-1, 1]) {
      c.beginPath();
      if (side) { const sx = cx - s * 10; c.moveTo(sx, gy - 1.6); c.lineTo(sx - s * len, gy - 1.6 + sg * sp * .6); }
      else { const sy = dirY > 0 ? gy - 15 : gy - 2; c.moveTo(cx + sg * 3, sy); c.lineTo(cx + sg * (3 + sp), sy - dirY * len * .8); }
      c.stroke();
    }
    c.fillStyle = `rgba(255,255,255,${a * .8})`;
    if (side) c.fillRect(cx - s * (11 + len * .7), gy - 2.2 + (k - 1) * .6, 1.2, .8); else c.fillRect(cx - .6 + (k - 1) * 1.4, (dirY > 0 ? gy - 15 : gy - 2) - dirY * len * .7, 1.2, .8);
  }
  if (side) { c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = .8; c.beginPath(); c.arc(cx + s * 12, gy - 2, 1.8 + (t % 8) * .12, s > 0 ? -1 : Math.PI - .6 + 0, s > 0 ? .9 : Math.PI + 1, false); c.stroke(); }
}
function hullSide(c, cx, y0, y1, s) {
  c.beginPath(); c.moveTo(cx - s * 10, y0);
  c.quadraticCurveTo(cx + s * 1, y0 + 1.4, cx + s * 12.5, y0 - 2.8);
  c.quadraticCurveTo(cx + s * 10.5, y1 - .6, cx + s * 5.5, y1);
  c.lineTo(cx - s * 7, y1); c.quadraticCurveTo(cx - s * 10, y1 - .8, cx - s * 10.6, y0 + .4); c.closePath();
}
function hullV(c, cx, gy, bob, g) {
  const w = 6 + g, t0 = gy - 17.5 + bob - g * .2, tb = gy - .5 + bob + g * .3;
  c.beginPath(); c.moveTo(cx - w + .5, t0 + 2.5); c.quadraticCurveTo(cx, t0 - 1.2, cx + w - .5, t0 + 2.5);
  c.lineTo(cx + w, gy - 9 + bob); c.quadraticCurveTo(cx + w - .5, gy - 3.5 + bob, cx, tb); c.quadraticCurveTo(cx - w + .5, gy - 3.5 + bob, cx - w, gy - 9 + bob); c.closePath();
}
function boatArt(c, id, dir, x, y, t, info) {
  const cx = x + 8, gy = y + 15, col = info.color, mv = !!info.moving, back = info.layer !== 'front', front = info.layer !== 'back';
  const bob = boatBob(t) + (mv ? Math.sin(t / 3.5) * .3 : 0), side = dir > 1, s = dir === RIGHT ? 1 : -1, dirY = dir === UP ? -1 : 1;
  const lite = G.shade(col, 1.32), dark = G.shade(col, .7), deep = '#5a3a22', motor = id === 'motorboat', sail = id === 'sailboat', row = id === 'rowboat';
  const trim = motor ? '#ffffff' : sail ? '#fff6e0' : lite;
  c.save();
  if (side) {
    const y0 = gy - 7 + bob, y1 = gy - 1.6 + bob;
    if (back) {
      waterFx(c, cx, gy, true, s, 0, t, mv);
      if (sail) {   // mast and sails sit behind the sailor
        const mx = cx + s * 2.5, top = gy - 28 + bob, sw = Math.sin(t / 24) * .8;
        c.beginPath(); c.moveTo(mx - s * .8, top + 1.5); c.quadraticCurveTo(mx - s * (6 + sw), (top + y0) / 2 + 2, mx - s * 9.5, y0 - 3.4); c.lineTo(mx - s * .8, y0 - 3.4); c.closePath(); c.fillStyle = '#fffaf0'; c.fill();
        c.beginPath(); c.moveTo(mx - s * .8, top + 5); c.quadraticCurveTo(mx - s * (3.6 + sw * .6), (top + y0) / 2 + 3, mx - s * 6.5, y0 - 3.4); c.strokeStyle = 'rgba(160,140,110,.5)'; c.lineWidth = .5; c.stroke();
        c.beginPath(); c.moveTo(mx + s * .8, top + 3); c.quadraticCurveTo(mx + s * (7 + sw), (top + y0) / 2 + 2, mx + s * 11.5, y0 - 3.6); c.lineTo(mx + s * .8, y0 - 3.6); c.closePath(); c.fillStyle = '#ffd6dc'; c.fill();
        line(c, [mx, top - .5, mx, y0 - 1], '#7a4a22', 1.2);
        c.beginPath(); c.moveTo(mx, top - .5); c.lineTo(mx + s * 4.2, top + .8 + sw * .3); c.lineTo(mx, top + 2.4); c.closePath(); c.fillStyle = '#ff5a4a'; c.fill();
        line(c, [mx, y0 - 3.4, mx - s * 9.5, y0 - 3.4], '#7a4a22', .9);
      }
      if (motor) {  // outboard engine at the stern
        const ex = cx - s * 12.3;
        box(c, ex - 2, y0 - 4.5, 4, 6, 1.4, '#3a3e4c'); box(c, ex - 2, y0 - 4.5, 4, 2.4, 1.2, col); line(c, [ex, y0 + 1, ex, y1 + 2.2], '#5a5e6c', 1.1);
        circ(c, ex, y1 + 2.8, 1.1, '#9aa0b0'); line(c, [ex + 2.3 * Math.cos(t / 2), y1 + 2.8, ex - 2.3 * Math.cos(t / 2), y1 + 2.8], '#c9ccd8', .7);
        if (mv) for (let k = 0; k < 4; k++) { const q = ((t * 1.3 + k * 5) % 20) / 20; circ(c, ex - s * (1 + q * 8), y1 + 2.6 + Math.sin(k * 2 + t / 3) * .8, 1.3 * (1 - q * .6), `rgba(255,255,255,${.85 - q * .7})`); }
      }
      // interior: dark floor seen over the near gunwale, and the far rim
      c.beginPath(); c.moveTo(cx - s * 9.4, y0 - 2.4); c.quadraticCurveTo(cx + s * 1, y0 - .8, cx + s * 11.6, y0 - 4.4); c.lineTo(cx + s * 12.5, y0 - 2.8); c.quadraticCurveTo(cx + s * 1, y0 + 1.4, cx - s * 10, y0); c.closePath(); c.fillStyle = deep; c.fill();
      c.beginPath(); c.moveTo(cx - s * 9.4, y0 - 2.4); c.quadraticCurveTo(cx + s * 1, y0 - .8, cx + s * 11.6, y0 - 4.4); c.strokeStyle = lite; c.lineWidth = .9; c.stroke();
      box(c, cx - 3 - s * 1, y0 - 1.4, 6, 1.4, .6, '#d8a860');   // thwart
    }
    if (front) {
      // outer hull face over the sailor's legs
      c.save(); hullSide(c, cx, y0, y1, s); c.fillStyle = G.kit.lin(c, 0, y0 - 3, 0, y1, [lite, col, dark]); c.fill(); c.clip();
      c.strokeStyle = 'rgba(0,0,0,.2)'; c.lineWidth = .4; for (let k = 1; k <= 2; k++) { c.beginPath(); c.moveTo(cx - 12, y0 + k * 1.7 - .2); c.quadraticCurveTo(cx, y0 + k * 1.7 + .9, cx + 14, y0 + k * 1.7 - 3); c.stroke(); }
      if (motor || sail) { c.strokeStyle = trim; c.lineWidth = 1; c.beginPath(); c.moveTo(cx - 11, y0 + 1.6); c.quadraticCurveTo(cx, y0 + 2.6, cx + 14, y0 - .8); c.stroke(); }
      c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(cx - 12, y0 - 1, 26, 1.1);
      c.restore();
      c.beginPath(); c.moveTo(cx - s * 10, y0); c.quadraticCurveTo(cx + s * 1, y0 + 1.4, cx + s * 12.5, y0 - 2.8); c.strokeStyle = trim; c.lineWidth = 1.1; c.stroke();
      circ(c, cx + s * 12.2, y0 - 2.8, .9, lite);
      c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = .8; c.beginPath(); c.moveTo(cx - s * 8, y1 + .5); c.quadraticCurveTo(cx - s * 1, y1 + 1.5, cx + s * 6, y1 + .3); c.stroke();   // water lapping at the hull
      if (row) {   // the oar dips in time with the strokes
        const sw = mv ? Math.sin(t / 5) : .15, ex = cx - s * .5 + s * sw * 5, ey = gy + 1.6;
        line(c, [cx - s * .5, y0 - 1, ex, ey], '#8a5a2a', 1); ell(c, ex + s * .6, ey + .6, 1.7, .9, '#b07a40');
        if (mv) { c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = .5; c.beginPath(); c.ellipse(ex, ey + 1, 2.4 + (t % 10) * .3, .8, 0, 0, TAU); c.stroke(); }
      }
      if (motor) { c.beginPath(); c.moveTo(cx + s * 4, y0 - .6); c.lineTo(cx + s * 5.4, y0 - 5); c.lineTo(cx + s * 8.6, y0 - 4.2); c.lineTo(cx + s * 8, y0 - 2.2); c.closePath(); c.fillStyle = 'rgba(190,232,255,.75)'; c.fill(); c.strokeStyle = '#ffffff'; c.lineWidth = .6; c.stroke(); }
    }
  } else {
    const flip = dir === UP;
    const place = fn => { c.save(); if (flip) { c.translate(0, 2 * (gy - 9)); c.scale(1, -1); } fn(); c.restore(); };
    if (back) {
      waterFx(c, cx, gy, false, s, dirY, t, mv);
      if (sail) {
        const mx = cx, top = gy - 29 + bob;
        line(c, [mx, top, mx, gy - 8 + bob], '#7a4a22', 1.2);
        c.beginPath(); c.moveTo(mx + 1, top + 1.5); c.quadraticCurveTo(mx + 5.5 + Math.sin(t / 24) * .6, gy - 19, mx + 1.6, gy - 11 + bob); c.lineTo(mx + 1, gy - 11 + bob); c.closePath(); c.fillStyle = '#fffaf0'; c.fill();
        c.beginPath(); c.moveTo(mx, top - .5); c.lineTo(mx - 3.6, top + .8); c.lineTo(mx, top + 2.4); c.closePath(); c.fillStyle = '#ff5a4a'; c.fill();
      }
      place(() => {
        hullV(c, cx, gy, bob, 0); c.fillStyle = G.kit.lin(c, cx - 6, 0, cx + 6, 0, [dark, lite, col, dark]); c.fill();
        c.strokeStyle = trim; c.lineWidth = 1; c.stroke();
        hullV(c, cx, gy, bob, -1.9); c.fillStyle = deep; c.fill();
        c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = .4; c.beginPath(); c.moveTo(cx - 3.2, gy - 14 + bob); c.lineTo(cx + 3.2, gy - 14 + bob); c.moveTo(cx - 3.4, gy - 5 + bob); c.lineTo(cx + 3.4, gy - 5 + bob); c.stroke();
        box(c, cx - 3.4, gy - 11.6 + bob, 6.8, 1.5, .6, '#d8a860');
      });
      if (motor && flip) {   // windscreen ahead of the driver (bow points away)
        c.beginPath(); c.moveTo(cx - 3.8, gy - 12 + bob); c.lineTo(cx - 2.6, gy - 14.6 + bob); c.lineTo(cx + 2.6, gy - 14.6 + bob); c.lineTo(cx + 3.8, gy - 12 + bob); c.closePath(); c.fillStyle = 'rgba(190,232,255,.75)'; c.fill(); c.strokeStyle = '#fff'; c.lineWidth = .5; c.stroke();
      }
    }
    if (front) {
      c.save(); c.beginPath(); c.rect(cx - 12, gy - 9.5 + bob, 24, 14); c.clip();
      place(() => {
        hullV(c, cx, gy, bob, 0); c.fillStyle = G.kit.lin(c, cx - 6, 0, cx + 6, 0, [dark, lite, col, dark]); c.fill();
        c.strokeStyle = trim; c.lineWidth = 1.1; c.stroke();
        c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = .6; c.beginPath(); c.moveTo(cx, gy - 9 + bob); c.lineTo(cx, gy - 1 + bob); c.stroke();
      });
      c.restore();
      c.strokeStyle = trim; c.lineWidth = 1; c.beginPath(); c.moveTo(cx - 5.6, gy - 9.2 + bob); c.quadraticCurveTo(cx, gy - 8 + bob, cx + 5.6, gy - 9.2 + bob); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = .8; c.beginPath(); c.moveTo(cx - 3.5, gy + .8 + bob); c.quadraticCurveTo(cx, gy + 1.6 + bob, cx + 3.5, gy + .8 + bob); c.stroke();
      if (row) {
        const sw = mv ? Math.sin(t / 5) * 3.2 : 0;
        for (const sg of [-1, 1]) { const ex = cx + sg * 12.5, ey = gy - 8 + sg * sw * .0 + sw * sg * sg * (dir === DOWN ? -1 : 1) * .6;
          line(c, [cx + sg * 5.8, gy - 10.4, ex, ey], '#8a5a2a', 1); ell(c, ex + sg * .8, ey, 1.9, 1, '#b07a40'); }
      }
      if (motor && !flip) { c.beginPath(); c.moveTo(cx - 4.4, gy - 7.8 + bob); c.lineTo(cx - 3, gy - 11.6 + bob); c.lineTo(cx + 3, gy - 11.6 + bob); c.lineTo(cx + 4.4, gy - 7.8 + bob); c.closePath(); c.fillStyle = 'rgba(190,232,255,.75)'; c.fill(); c.strokeStyle = '#ffffff'; c.lineWidth = .6; c.stroke(); }
      if (motor && flip) {   // the outboard hangs off the stern, which faces the camera
        box(c, cx - 2.2, gy - 4.6 + bob, 4.4, 4.2, 1.2, '#3a3e4c'); box(c, cx - 2.2, gy - 4.6 + bob, 4.4, 1.8, 1, col);
        if (mv) for (let k = 0; k < 4; k++) { const q = ((t * 1.3 + k * 5) % 20) / 20; circ(c, cx + Math.sin(k * 2 + t / 3) * 1.6, gy + 1 + q * 6, 1.3 * (1 - q * .6), `rgba(255,255,255,${.85 - q * .7})`); }
      }
    }
  }
  c.restore();
}

// ---- Drawing the rider ---------------------------------------------------------------------------
G.hooks.drawPlayer = function (ctx, x, y, dir, frame, t, grassOver) {
  const id = riding(); if (!id || !G.world.map || !G.world.map.outdoor) return false;
  const moving = G.world.p.moving, sp = seat(id, dir); t = G.frameNo;   // the same clock as seat(), so a hoverboard's bob lines up
  art(ctx, id, dir, x, y, t, { moving, layer: 'back' });
  if (!sp.hide) G.drawChar(ctx, G.state.style, dir, 0, x + sp.dx, y + sp.dy, t, true);
  art(ctx, id, dir, x, y, t, { moving, layer: 'front' });
  if (id === 'quad') grassOver();
  return true;
};

// ---- Parked vehicles, the helicopter and the quad wreck on the map --------------------------------
G.hooks.draw.push((items, cx, cy, t) => {
  if (!G.state) return;
  const V = st(), m = G.world.map;
  if (V.parked && V.parked.map === m.id && owns(V.parked.id)) {
    const P = V.parked, x = P.x * 16 - cx, y = P.y * 16 - cy;
    items.push({ y: P.y * 16 + 16.05, draw: c => { art(c, P.id, P.dir || 0, x, y, t, { parked: true, layer: 'back' }); art(c, P.id, P.dir || 0, x, y, t, { parked: true, layer: 'front' }); } });
  }
  if (V.moored && V.moored.map === m.id && owns(V.moored.id)) {
    const P = V.moored, x = P.x * 16 - cx, y = P.y * 16 - cy;
    items.push({ y: P.y * 16 + 16.05, draw: c => { art(c, P.id, P.dir || 0, x, y, G.frameNo, { parked: true, layer: 'back' }); art(c, P.id, P.dir || 0, x, y, G.frameNo, { parked: true, layer: 'front' }); } });
  }
  if (owns('helicopter')) {
    let hx = null, hy = null, base = 0;
    const pad = helipadB();
    if (V.heli && V.heli.map === m.id) { hx = V.heli.x * 16; hy = V.heli.y * 16; base = (V.heli.y + 1) * 16; }
    else if (!V.heli && pad && pad.map === m.id) { hx = (pad.x + 1) * 16; hy = (pad.y + 1) * 16; base = (pad.y + 3) * 16 - .2; }
    if (hx !== null) { const x = hx - cx, y = hy - cy; items.push({ y: base + .02, draw: c => art(c, 'helicopter', DOWN, x, y, t, { parked: true, layer: 'back' }) }); }
  }
  for (const o of m.objs || []) {
    if (!isWreck(o) || (o.hide && o.hide())) continue;
    const x = o.x * 16 - cx, y = o.y * 16 - cy;
    items.push({ y: o.y * 16 + 16.05, draw: c => drawWreck(c, x, y, t) });
  }
});
function drawWreck(c, x, y, t) {
  c.save();
  art(c, 'quad', RIGHT, x, y, t, { parked: true, color: '#9a6a3a', layer: 'back' });
  // a dusty tarp and rust spots
  c.beginPath(); c.moveTo(x - 1, y + 6); c.quadraticCurveTo(x + 5, y + 1, x + 12, y + 4); c.lineTo(x + 15, y + 9); c.quadraticCurveTo(x + 7, y + 8, x, y + 10); c.closePath(); c.fillStyle = 'rgba(110,130,90,.92)'; c.fill();
  c.strokeStyle = 'rgba(60,70,50,.6)'; c.lineWidth = .5; c.stroke();
  circ(c, x + 3, y + 9.5, .9, '#7a4a2a'); circ(c, x + 12, y + 8.5, .7, '#7a4a2a');
  if ((t >> 5) % 4 === 0) G.kit.star(c, x + 13, y + 3, 1.6, '#fff6c0');
  c.restore();
}
// Boats: these two hooks go first, because gather.js claims every water tile for refilling the can.
const shoreOk = (tx, ty) => { const W = G.worldApi, m = G.world.map; return W.tileAt(tx, ty) && W.tileAt(tx, ty) !== 'w' && W.canWalk(tx, ty) && !W.tileWarp(tx, ty) && !vehicleAt(tx, ty) && !(m.block && m.block.has(tx + ',' + ty)); };
function launchWhy(tx, ty, id) {
  const W = G.worldApi, m = G.world.map;
  if (!m || !m.outdoor) return `You can't sail ${a_(id)} ${nameOf(id)} indoors. Go outside first.`;
  if (W.tileAt(tx, ty) !== 'w' || vehicleAt(tx, ty) || (m.block && m.block.has(tx + ',' + ty)) || W.npcAt(tx, ty) || W.objAt(tx, ty) || W.tileWarp(tx, ty)) return `Face open water to launch your ${nameOf(id).toLowerCase()}: stand on the shore and look at the water.`;
  return null;
}
const ownedBoats = () => ORDER.filter(id => owns(id) && isBoat(id));
G.hooks.prompt.unshift((tx, ty) => {
  if (!G.state) return null;
  const v = vehicleAt(tx, ty), rid = riding();
  if (v) return v.kind === 'heli' ? 'Fly helicopter' : v.kind === 'moored' ? `Board ${nameOf(v.id).toLowerCase()}` : `Ride ${nameOf(v.id).toLowerCase()}`;
  if (rid && isBoat(rid)) return shoreOk(tx, ty) ? 'Step ashore' : null;
  if (!rid && ownedBoats().length && !launchWhy(tx, ty, ownedBoats()[0])) return 'Launch boat';
  return null;
});
async function launchFlow(tx, ty) {
  const boats = ownedBoats(), S = G.state, cap = G.farm && G.farm.canCap ? G.farm.canCap() : 0, can = cap > 0 && (S.can || 0) < cap;
  let pick;
  if (boats.length === 1 && !can) {
    await G.say(`Launch the ${nameOf(boats[0]).toLowerCase()}?`, { auto: 1 });
    if (!(await G.yesNo())) { G.closeText(); return true; }
    pick = boats[0];
  } else {
    await G.say(boats.length === 1 ? `Launch the ${nameOf(boats[0]).toLowerCase()}?` : 'Launch a boat here?', { auto: 1 });
    const opts = boats.map(id => `LAUNCH ${NAME(id)}`).concat(can ? ['REFILL CAN'] : [], ['CANCEL']);
    const i = await G.choose(opts, { right: 236, bottom: 108, minW: 70 }); G.closeText();
    if (i < 0 || opts[i] === 'CANCEL') return true;
    if (opts[i] === 'REFILL CAN') { await G.farm.refill('water'); return true; }
    pick = boats[i];
  }
  const p = G.world.p; st().moored = null; st().riding = pick;
  G.placePlayer(tx, ty, p.dir); G.audio.sfx('levelup'); showToast('Smooth sailing! Face the shore and press A to step ashore.');
  return true;
}
G.hooks.interact.unshift(async (tx, ty) => {
  if (!G.state) return false;
  const v = vehicleAt(tx, ty), rid = riding();
  if (v) {
    if (v.kind === 'heli') { await helicopter(); return true; }
    if (rid) { await says(`Get off the ${nameOf(rid)} first.`); return true; }
    const p = G.world.p; st().parked = null; st().moored = null; st().riding = v.id;
    G.placePlayer(tx, ty, p.dir); G.audio.sfx('select');
    return true;
  }
  if (rid && isBoat(rid)) { if (!shoreOk(tx, ty)) return false; return stepAshore(tx, ty); }
  if (!rid && ownedBoats().length && !launchWhy(tx, ty, ownedBoats()[0])) return launchFlow(tx, ty);
  return false;
});
// Step from the boat onto the shore tile (tx, ty); the boat stays moored where it floats.
function stepAshore(tx, ty) {
  const V = st(), p = G.world.p, id = V.riding;
  V.riding = null; V.moored = { id, map: G.world.mapId, x: p.x, y: p.y, dir: p.dir };
  G.placePlayer(tx, ty, p.dir); G.audio.sfx('select'); showToast(`You stepped ashore. The ${nameOf(id)} is moored.`);
  return true;
}
// Park a vehicle: boats are only ever moored on water (else they go back to storage).
function putDown(id, map, x, y, dir) {
  const V = st();
  if (isBoat(id)) { const m = G.MAPS[map], ch = m && m.t[y] && m.t[y][x]; V.moored = ch === 'w' ? { id, map, x, y, dir } : null; }
  else V.parked = { id, map, x, y, dir };
}
G.hooks.overlay.push((ctx) => {
  if (!toast || G.frameNo > toast.until || G.scene !== G.world.scene) return;
  const f = G.FONT_S || G.FONT; ctx.save(); ctx.font = f; const w = Math.ceil(ctx.measureText(toast.text).width) + 16; ctx.restore();
  const a = Math.min(1, (toast.until - G.frameNo) / 20), x = Math.round(G.W / 2 - w / 2), y = 22;
  ctx.save(); ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(30,20,50,.62)'; G.kit.rr(ctx, x, y, w, 12, 6); ctx.fill();
  ctx.fillStyle = '#ff9a4a'; ctx.beginPath(); ctx.arc(x + 6, y + 6, 2, 0, TAU); ctx.fill();
  G.text(ctx, toast.text, x + 10, y + 2.6, { color: '#fff', shadow: false, font: f });
  ctx.restore();
});

// ---- Map loads: visited maps, and never a vehicle indoors ---------------------------------------
let lastMap = null;
G.hooks.load.push(m => {
  if (!G.state) return;
  const V = st(), prev = lastMap; lastMap = m.id; toast = null;
  if (m.outdoor) G.state.visited[m.id] = true;
  if (V.riding && !m.outdoor) {
    const p = G.world.p, id = V.riding; V.riding = null;
    if (prev && G.MAPS[prev] && G.MAPS[prev].outdoor) { putDown(id, prev, p.x, p.y, p.dir); showToast(`You left the ${nameOf(id)} parked outside.`); }
  }
});
G.hooks.beforeWarp.push(async w => {
  const id = riding(); if (!id) return;
  const dest = G.MAPS[w.to], ch = dest && dest.t[w.ty] && dest.t[w.ty][w.tx];
  if (dest && dest.outdoor && allowed(id, ch)) return;   // ride on to the next outdoor area
  const p = G.world.p, bx = p.x - VEC[p.dir][0], by = p.y - VEC[p.dir][1];
  st().riding = null; putDown(id, G.world.mapId, bx, by, p.dir);
  G.audio.sfx('select');
  await says(dest && dest.outdoor ? `The ${nameOf(id)} can't go in there. You parked it by the entrance.` : `You parked the ${nameOf(id)} outside. It will be waiting when you come back out.`);
});
// Stepping out of a door onto your parked vehicle puts you straight back on it.
G.hooks.tick.push(() => {
  if (!G.state) return;
  const V = st(), p = G.world.p;
  if (!V.riding && V.parked && !p.moving && V.parked.map === G.world.mapId && V.parked.x === p.x && V.parked.y === p.y && G.world.map.outdoor) {
    V.riding = V.parked.id; V.parked = null; G.audio.sfx('select'); showToast(`You hopped back on the ${nameOf(V.riding)}.`);
  }
});

// ---- Ownership, riding, parking --------------------------------------------------------------------
// Why can't you ride this vehicle right now? null when you can. o.garage: taking it out at the garage.
function rideWhy(id, o) {
  o = o || {};
  const V = st(), m = G.world.map, p = G.world.p;
  if (!V$(id)) return 'There is no such vehicle.';
  if (!owns(id)) return `You don't own ${a_(id)} ${nameOf(id)}. ${V$(id).how}`;
  if (V$(id).flies) return 'The helicopter flies from your Helipad: pick HELICOPTER in the TRAVEL menu.';
  if (V.riding === id) return `You're already riding the ${nameOf(id)}.`;
  if (V.riding) return `Get off the ${nameOf(V.riding)} first.`;
  if (!m || !m.outdoor) return `You can't ride ${a_(id)} ${nameOf(id)} indoors. Go outside first.`;
  if (isBoat(id)) { const [fx, fy] = G.worldApi.facing(); return launchWhy(fx, fy, id); }
  if (!garageB() && !LIGHT.has(id)) return `You need a Garage to keep your ${nameOf(id)} in. Build one on your homestead (BUILD > VEHICLES).`;
  const w = whereIs(id);
  if (w === 'lot') return `Your ${nameOf(id)} is waiting at the dealer lot: your Garage only has room for ${slots()}. Upgrade the Garage to make space.`;
  if (w === 'parked') {
    const P = V.parked;
    return P.map === G.world.mapId ? `Your ${nameOf(id)} is parked nearby. Walk up to it and press A to ride it.` : `Your ${nameOf(id)} is parked in ${mapName(P.map)}. Use SEND ${NAME(id)} HOME first, or go and get it.`;
  }
  const ch = G.worldApi.tileAt(p.x, p.y);
  if (!allowed(id, ch)) return refusal(id, ch) + ' Move somewhere else first.';
  return null;
}
const api = G.vehicles = {
  list: () => ORDER.slice(),
  owned: () => st().owned.slice(),
  // The transport the ride button (HUD or V key) uses: the one you equipped, else the hoverboard, else the first land vehicle you own.
  equipped() { const V = st(), land = ORDER.filter(id => owns(id) && !V$(id).flies); return land.includes(V.equipped) ? V.equipped : land.includes('hoverboard') ? 'hoverboard' : land[0] || null; },
  equip(id) { const V = st(); if (!owns(id) || V$(id).flies) return false; V.equipped = id; return true; },
  riding,
  where: whereIs,
  speed: speedOf,
  allowed,
  rideWhy,
  lastWhy: null,
  grant(id) { if (!V$(id)) return false; const V = st(); if (V.owned.includes(id)) return false; V.owned.push(id); return true; },
  // Get on a vehicle where you stand (it comes out of the garage). true on success; else false and lastWhy.
  mount(id) {
    const why = rideWhy(id); api.lastWhy = why; if (why) return false;
    if (isBoat(id)) { const [fx, fy] = G.worldApi.facing(); st().moored = null; st().riding = id; G.placePlayer(fx, fy, G.world.p.dir); return true; }
    st().riding = id; return true;
  },
  // Get off: the vehicle stays parked on this tile and you step beside it.
  dismount() {
    const V = st(), id = V.riding, p = G.world.p, W = G.worldApi;
    if (!id) { api.lastWhy = "You're not riding anything."; return false; }
    if (isBoat(id)) {   // onto the shore tile you face first, else any shore tile beside the boat
      for (const d of [p.dir, ...[0, 1, 2, 3].filter(d => d !== p.dir)]) { const x = p.x + VEC[d][0], y = p.y + VEC[d][1]; if (shoreOk(x, y)) { api.lastWhy = null; return stepAshore(x, y); } }
      api.lastWhy = 'There is no shore next to you. Sail up against the land to step ashore.'; return false;
    }
    const ch = W.tileAt(p.x, p.y);
    if (G.TILES[ch] && G.TILES[ch].solid) { api.lastWhy = `You can't get off over ${TILE_WORD[ch] || 'here'}! Get back onto dry land first.`; return false; }
    const L = [[LEFT, RIGHT, UP, DOWN], [RIGHT, LEFT, DOWN, UP], [DOWN, UP, LEFT, RIGHT], [UP, DOWN, RIGHT, LEFT]][p.dir];
    const order = [L[0], L[1], (p.dir ^ 1), p.dir];
    for (const d of order) {
      const x = p.x + VEC[d][0], y = p.y + VEC[d][1];
      if (W.canWalk(x, y) && !W.tileWarp(x, y) && !vehicleAt(x, y)) {
        V.riding = null; V.parked = { id, map: G.world.mapId, x: p.x, y: p.y, dir: p.dir };
        G.placePlayer(x, y, d ^ 1); api.lastWhy = null; return true;
      }
    }
    api.lastWhy = 'There is no room to get off here.'; return false;
  },
  // Park the vehicle you're riding right where you stand (the player stays put; used before flights).
  park() {
    const V = st(), id = V.riding, p = G.world.p; if (!id) return false;
    V.riding = null; putDown(id, G.world.mapId, p.x, p.y, p.dir); return true;
  },
  // Send a vehicle back to the garage (default: whichever is out). The helicopter flies back to the Helipad.
  returnHome(id) {
    const V = st();
    if (!id) id = V.riding || (V.parked && V.parked.id) || (V.moored && V.moored.id) || (V.heli && 'helicopter');
    if (!id) return false;
    if (isBoat(id)) {
      if (V.riding === id) { api.lastWhy = `Step ashore first: you can't leave the ${nameOf(id)} stranded under you.`; return false; }
      if (V.moored && V.moored.id === id) { V.moored = null; return true; }
      return false;
    }
    if (id === 'helicopter') { if (!V.heli) return false; V.heli = null; return true; }
    if (V.riding === id) { V.riding = null; return true; }
    if (V.parked && V.parked.id === id) { V.parked = null; return true; }
    return false;
  },
  // Dealership list for js/shops.js: why is null when it can be bought (money is checked by buy()).
  shopList() {
    st();
    return SOLD.map(id => { const V = V$(id), bad = reqList(V.req).filter(r => !r.ok).map(r => r.text);
      return { id, name: V.name, price: V.price, desc: V.desc, why: owns(id) ? `You already own ${a_(id)} ${V.name}.` : bad.length ? `Needs ${bad.join(', ')}.` : null }; });
  },
  _seat: (id, dir) => seat(id, dir),
  ownsBoat: () => ownedBoats().length > 0,
  boats: () => ownedBoats(),
  buy: (id, o) => buy(id, o),
  canFly: c => G.canFly(c),
  flyer: () => flyer(),
  fly: () => creatureFlight(),
  helicopter: () => helicopter(),
  landingFor: id => landingFor(id),
  LANDING,
};

// ---- Dealership ---------------------------------------------------------------------------------------
async function buy(id, o) {
  o = o || {}; st();
  const V = V$(id), S = G.state;
  if (!V || !V.price) { await says("That vehicle isn't for sale."); return false; }
  if (owns(id)) { await says(`You already own ${a_(id)} ${V.name}.`); return false; }
  const cost = { money: V.price };
  const panel = G.home && G.home.costPanel ? G.home.costPanel(V.name.toUpperCase(), `Tidewheel Motors  ·  ${V.where}`, cost, V.req, V.desc) : null;
  if (panel) G.ui.layers.push(panel);
  const done = () => { if (panel && G.ui.layers.includes(panel)) G.ui.layers.splice(G.ui.layers.indexOf(panel), 1); };
  const bad = reqList(V.req).filter(r => !r.ok).map(r => r.text), short = Math.max(0, V.price - inv().count('money'));
  if (bad.length || short) {
    const lines = [];
    if (bad.length) lines.push(`To buy the ${V.name} you first need: ${bad.join(', ')}.`);
    if (short) lines.push(`You need $${short} more.`);
    await says(lines); done(); return false;
  }
  if (o.confirm !== false) {
    await G.say(`Buy the ${V.name} for $${V.price}?`, { auto: 1 });
    const yes = await G.yesNo();
    if (!yes) { G.closeText(); done(); return false; }
  }
  if (!inv().pay(cost)) { await says('Something went wrong. Nothing was spent.'); done(); return false; }
  api.grant(id); G.audio.sfx('buy'); done();
  const lines = [`You bought the ${V.name}!`];
  if (V.flies) lines.push('It is waiting on your Helipad. Pick HELICOPTER in the TRAVEL menu (START) to fly.');
  else if (V.boat) lines.push('Stand on a shore, face the water and press A to launch it.');
  else if (!garageB()) lines.push(`It will wait at the dealer lot until you build a Garage on your homestead.`);
  else if (atLot(id)) lines.push('Your Garage is full, so it waits at the dealer lot until you upgrade the Garage.');
  else lines.push(`It is in your Garage. Pick RIDE ${NAME(id)} in the TRAVEL menu (START) to ride it.`);
  await says(lines);
  return true;
}

// ---- Garage ---------------------------------------------------------------------------------------------
const STATUS = { moored: ['MOORED', '#3a8ad8'], stowed: ['STOWED', '#9a9aa8'], garage: ['IN GARAGE', '#3fae5a'], riding: ['RIDING', '#3a8ad8'], parked: ['PARKED', '#f0983f'], lot: ['DEALER LOT', '#9a9aa8'], pad: ['ON HELIPAD', '#3fae5a'], away: ['AWAY', '#f0983f'] };
function vehicleIcon(ctx, id, x, y, t, color) {
  // fit the vehicle into a 26x18 box with its ground line at y+16
  const big = id === 'helicopter' || id === 'car', k = big ? .62 : .9;
  ctx.save(); ctx.translate(x + 13, y + 16); ctx.scale(k, k);
  const info = color ? { color } : {};
  art(ctx, id, RIGHT, -8, -15, t, Object.assign({ layer: 'back' }, info)); art(ctx, id, RIGHT, -8, -15, t, Object.assign({ layer: 'front' }, info));
  ctx.restore();
}
function garagePanel(b, list, sel, preview) {
  return { draw(ctx) {
    const t = G.frameNo, lvl = G.home.lvl(b), max = G.home.def(b).levels.length, per = G.home.L(b).perks;
    const bi = list.findIndex(isBoat), HD = bi >= 0 ? 9 : 0, rowH = list.length + (bi >= 0 ? 1 : 0) > 6 ? 13 : 17, h = 26 + Math.max(1, list.length) * rowH + HD + 4;
    const rowY = i => 24 + i * rowH + (bi >= 0 && i >= bi ? HD : 0);
    G.frame(ctx, 4, 4, 232, h, 'light');
    G.text(ctx, `${G.home.L(b).name.toUpperCase()}  ${'★'.repeat(lvl)}${'☆'.repeat(max - lvl)}`, 12, 9, { font: G.FONT_B || G.FONT });
    const used = Math.min(per.slots, landOwned().length);
    G.text(ctx, `SLOTS ${used}/${per.slots}`, 228, 10, { align: 'right', font: G.FONT_S, color: '#6a5a78' });
    for (let k = 0; k < per.slots && k < 8; k++) box(ctx, 160 - per.slots * 6 + k * 6, 11, 4.4, 4.4, 1.2, k < used ? '#5fae3f' : 'rgba(90,70,110,.18)');
    if (!list.length) G.text(ctx, 'No vehicles yet. Craft a Bicycle at a Forge, or visit Tidewheel Motors.', 12, 30, { font: G.FONT_S });
    if (bi >= 0) { const hy = 24 + bi * rowH + 1; G.text(ctx, 'BOATS', 12, hy, { font: G.FONT_S, color: '#3a8ad8', shadow: false }); ctx.fillStyle = 'rgba(58,138,216,.35)'; ctx.fillRect(34, hy + 3, 194, .7); }
    list.forEach((id, i) => {
      const y = rowY(i), on = i === sel();
      if (on) { ctx.fillStyle = 'rgba(255,190,90,.28)'; G.kit.rr(ctx, 8, y - 1, 224, rowH - 1, 6); ctx.fill(); }
      vehicleIcon(ctx, id, 12, y - 2, t, preview && preview.id === id ? preview.color : null);
      G.text(ctx, nameOf(id).toUpperCase(), 44, y + 4, { color: on ? '#3a2a48' : '#5a4a66' });
      const [label, col] = STATUS[whereIs(id)] || ['', '#999'];
      const lw = G.textW(ctx, label) * .78 + 10; G.kit.pill(ctx, 118, y + 3, lw, 9, col, label);
      const P = st().parked, H = st().heli;
      const MO = st().moored, where = whereIs(id) === 'moored' && MO ? mapName(MO.map) : whereIs(id) === 'parked' && P ? mapName(P.map) : whereIs(id) === 'away' && H ? mapName(H.map) : '';
      if (where) G.text(ctx, where, 120 + lw, y + 4.5, { font: G.FONT_S, color: '#8a6a40', shadow: false });
      if (st().tune[id]) G.text(ctx, '+TUNED', 226, y + 1.5, { align: 'right', font: G.FONT_S, color: '#2a7a4a', shadow: false });
      box(ctx, 217, y + 8.5, 8, 5, 2, (preview && preview.id === id) ? preview.color : colorOf(id)); ctx.strokeStyle = 'rgba(60,40,80,.35)'; ctx.lineWidth = .5; G.kit.rr(ctx, 217, y + 8.5, 8, 5, 2); ctx.stroke();
    });
  } };
}
// Moor a boat at the closest shore water within 8 tiles of the player.
function moorNearby(id) {
  const W = G.worldApi, m = G.world.map, p = G.world.p; let best = null, bd = 99;
  for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) {
    const x = p.x + dx, y = p.y + dy; if (W.tileAt(x, y) !== 'w' || vehicleAt(x, y) || (m.block && m.block.has(x + ',' + y))) continue;
    if (!VEC.some(([a, c]) => shoreOk(x + a, y + c))) continue;
    const d = Math.abs(dx) + Math.abs(dy); if (d < bd) { bd = d; best = { x, y }; }
  }
  if (best) st().moored = { id, map: m.id, x: best.x, y: best.y, dir: RIGHT };
  return best;
}
G.homeUse.garage = async function (b) {
  st();
  let sel = 0;
  for (;;) {
    const list = ORDER.filter(owns).sort((a, c) => (isBoat(a) ? 1 : 0) - (isBoat(c) ? 1 : 0)), per = G.home.L(b).perks;
    api._garage = list;
    const panel = garagePanel(b, list, () => sel, null);
    G.ui.layers.push(panel);
    const pop = () => { if (G.ui.layers.includes(panel)) G.ui.layers.splice(G.ui.layers.indexOf(panel), 1); };
    if (!list.length) { await says(['Your Garage is empty.', 'Craft a Bicycle at a Forge (tier 2), or buy one at Tidewheel Motors on the shore.']); pop(); return; }
    const i = await G.choose(list.map(id => NAME(id)).concat(['DONE']), { right: 236, bottom: 156, minW: 64, rowH: 12, index: sel, onMove: k => { sel = k; } });
    if (i < 0 || i >= list.length) { pop(); return; }
    sel = i; const id = list[i], w = whereIs(id), acts = [];
    if (V$(id).flies) {
      acts.push([w === 'away' ? 'CALL IT HOME' : 'TAKE OFF', async () => { if (w === 'away') { api.returnHome('helicopter'); G.audio.sfx('select'); await says('Your helicopter flew itself back to the Helipad.'); } else { pop(); await helicopter(); return 'exit'; } }]);
    } else if (isBoat(id)) {
      if (w !== 'riding') acts.push(['MOOR NEARBY', async () => {
        const spot = moorNearby(id);
        if (!spot) { await says(`Moor it at the water instead: there is no shoreline within 8 tiles of here. Carry on to a shore, face the water and press A to launch your ${nameOf(id).toLowerCase()}.`); return; }
        G.audio.sfx('select'); await says(`The ${nameOf(id)} was moored at the nearest water. Walk up to it and press A to board.`);
      }]);
      if (w === 'moored') acts.push(['PUT BACK', async () => { api.returnHome(id); G.audio.sfx('select'); await says(`The ${nameOf(id)} was hauled back into storage.`); }]);
    } else if (w === 'riding' || w === 'parked') {
      acts.push(['PUT BACK', async () => { api.returnHome(id); G.audio.sfx('select'); await says(w === 'riding' ? `You put the ${nameOf(id)} back in the Garage.` : `The ${nameOf(id)} was brought back from ${mapName(st().parked ? st().parked.map : G.world.mapId)} and put away.`); }]);
    } else {
      acts.push(['TAKE OUT', async () => {
        const why = rideWhy(id, { garage: true }); if (why) { await says(why); return; }
        st().riding = id; G.audio.sfx('levelup'); pop(); await says(`You wheeled out the ${nameOf(id)}. Off you go!`); return 'exit';
      }]);
    }
    if (!V$(id).flies) acts.push(['TUNE-UP', async () => {
      if (id === 'rowboat') { await says('A rowboat has no engine to tune. Its oars are as good as they get.'); return; }
      if (!per.tune) { await says('Tune-ups need a Double Garage. Upgrade your Garage to Lv2.'); return; }
      if (st().tune[id]) { await says(`The ${nameOf(id)} is already tuned up to its best.`); return; }
      if (inv().count('Engine Part') < 1) { await says(`A tune-up costs 1 Engine Part (+0.5 speed). You don't have one. Craft one at a Forge or buy one at Tidewheel Motors.`); return; }
      await G.say(`Tune up the ${nameOf(id)} for 1 Engine Part? (+0.5 speed)`, { auto: 1 });
      if (!(await G.yesNo())) { G.closeText(); return; }
      inv().take('Engine Part', 1); st().tune[id] = true; G.audio.sfx('levelup');
      await says(`The ${nameOf(id)} purrs like new! Its speed went up.`);
    }]);
    acts.push(['PAINT', async () => {
      if (!per.paint) { await says('Paint jobs need a Double Garage. Upgrade your Garage to Lv2.'); return; }
      const preview = { id, color: colorOf(id) }; pop();
      const pp = garagePanel(b, list, () => sel, preview); G.ui.layers.push(pp);
      const k = await G.choose(PAINTS.map(p => p[0]).concat(['CANCEL']), { right: 236, bottom: 156, minW: 50, rowH: 12, onMove: j => { preview.color = j < PAINTS.length ? PAINTS[j][1] : colorOf(id); } });
      G.ui.layers.splice(G.ui.layers.indexOf(pp), 1);
      if (k < 0 || k >= PAINTS.length) return;
      st().paint[id] = PAINTS[k][1]; G.audio.sfx('buy');
      await says(`The ${nameOf(id)} gleams in a fresh coat of ${PAINTS[k][0].toLowerCase()} paint!`);
    }]);
    acts.push(['BACK', null]);
    const j = await G.choose(acts.map(a => a[0]), { right: 236, bottom: 156, minW: 56, rowH: 12 });
    let r = null;
    if (j >= 0 && acts[j][1]) r = await acts[j][1]();
    pop();
    if (r === 'exit') return;
  }
};
G.homeUse.helipad = async function () {
  st();
  if (!owns('helicopter')) { await says(['A freshly painted landing pad.', 'Tidewheel Motors on the shore sells helicopters once the Great Lantern is lit.']); return; }
  if (st().heli) {
    await G.say(`Your helicopter is parked in ${mapName(st().heli.map)}. Call it back to the Helipad?`, { auto: 1 });
    if (await G.yesNo()) { api.returnHome('helicopter'); G.audio.sfx('select'); await says('Your helicopter flew itself home and settled on the pad.'); } else G.closeText();
    return;
  }
  await helicopter();
};

// ---- Creature flight ------------------------------------------------------------------------------------
let PRE = null;
const hasPre = id => { if (!PRE) { PRE = new Set(); for (const s of Object.values(G.SPECIES)) if (s.evo) PRE.add(s.evo[1]); } return PRE.has(id); };
G.canFly = function (c) {
  if (!c || c.hp <= 0 || c.lvl < 18) return false;
  const sp = G.SPECIES[c.id]; if (!sp) return false;
  const types = sp.types || [], look = (G.CREATURE_ART || {})[c.id] || {};
  const winged = !!look.wing || ((sp.look && sp.look.feat) || []).includes('wings');
  if (!types.includes('Flying') && !(types.includes('Dragon') && winged)) return false;
  const single = !sp.evo && !hasPre(c.id), legend = !!sp.legendary || sp.catchRate <= 30;
  return hasPre(c.id) || single || legend;
};
// Test Mode's FLY ANYWHERE lets any healthy creature carry you.
const flyer = () => (G.state.party || []).find(c => G.canFly(c)) || (G.cheat && G.cheat('fly') ? (G.state.party || []).find(c => c.hp > 0) : null) || null;
const NO_FLYER = 'No creature in your party can carry you. A Flying-type that has evolved, at Lv18+, can.';
function landingFor(id) {
  const m = G.MAPS[id]; if (!m || !m.outdoor) return null;
  if (m.landing) return m.landing;
  if (LANDING[id]) return LANDING[id];
  return null;
}
function takeoffWhy() {
  const m = G.world.map;
  if (!G.state.flags.starter) return 'You need a partner creature before you can travel.';
  if (!m.outdoor) return 'You need open sky to take off. Go outside first.';
  if (!landingFor(m.id) && m.bg === 'cave') return "There's no open sky down here. Head back outside first.";
  return null;
}
// A walkable spot at or near (L.x, L.y) on the current map, avoiding warps, vehicles and tall grass if possible.
function safeSpot(L, avoid) {
  const W = G.worldApi, m = G.world.map;
  const ok = (x, y, grass) => x > 0 && y > 0 && x < m.w - 1 && y < m.h - 1 && W.canWalk(x, y) && !W.tileWarp(x, y) && !vehicleAt(x, y) && !W.objAt(x, y) &&
    !(avoid && avoid.x === x && avoid.y === y) && (grass || !G.TILES[W.tileAt(x, y)].enc);
  for (const grass of [false, true]) for (let r = 0; r <= 12; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    if (ok(L.x + dx, L.y + dy, grass)) return { x: L.x + dx, y: L.y + dy };
  }
  return { x: L.x, y: L.y };
}
async function creatureFlight() {
  st();
  const why = takeoffWhy(); if (why) { await says(why); return false; }
  const c = flyer(); if (!c) { await says(NO_FLYER); return false; }
  return flight('creature', c);
}
function heliWhy() {
  const V = st();
  if (G.cheat && G.cheat('fly')) return takeoffWhy();   // Test Mode: a helicopter wherever you stand
  if (!owns('helicopter')) return "You don't own a helicopter. Tidewheel Motors on the shore sells them once the Great Lantern is lit.";
  if (garageLvl() < 3) return 'Your helicopter needs a Motor Hall to be serviced. Upgrade your Garage to Lv3.';
  if (!helipadB()) return 'You need a Helipad on your homestead before you can fly the helicopter.';
  const why = takeoffWhy(); if (why) return why;
  const p = G.world.p, m = G.world.mapId;
  if (V.heli) {
    if (V.heli.map !== m || Math.abs(V.heli.x - p.x) + Math.abs(V.heli.y - p.y) > 4) return `Your helicopter is parked in ${mapName(V.heli.map)}. Go there to take off, or SEND HELICOPTER HOME.`;
  } else {
    const pad = helipadB();
    if (pad.map !== m || Math.abs(pad.x + 1 - p.x) + Math.abs(pad.y + 1 - p.y) > 5) return `Your helicopter is on the Helipad at ${mapName(pad.map)}. Go there to take off.`;
  }
  return null;
}
async function helicopter() {
  st();
  const why = heliWhy(); if (why) { await says(why); return false; }
  return flight('heli', null);
}

// ---- The fly scene: an overhead map of the vale -------------------------------------------------------------
// The map itself (places, positions, services) lives in js/worldmap.js; this is the flight picker's view of it.
const flightNodes = () => G.WORLD.places.map(p => ({ id: p.id, name: p.name, x: p.nx * 240, y: p.ny * 160 }));
function nodeWhy(n) {
  const m = G.MAPS[n.id];
  if (!m || !m.outdoor || n.id === 'mine') return 'There is nowhere to land there.';
  if (!landingFor(n.id)) return "There is nowhere to land there yet.";
  if (n.id === G.world.mapId || n.id === (G.worldPlaceOf && G.worldPlaceOf(G.world.mapId))) return 'You are here.';
  if (G.cheat && G.cheat('fly')) return null;   // Test Mode: every place, visited or not
  const lock = G.worldLockWhy ? G.worldLockWhy(n.id) : null;
  if (lock) return lock;
  if (!G.state.visited[n.id]) return `You haven't been to ${m.name} yet. Go there on foot first.`;
  return null;
}
const RNG = s => G.mulberry(s);
function cloudArt(k) {
  return G.kit.cache('fly-cloud' + k, 40, 18, x => {
    x.fillStyle = 'rgba(120,150,190,.25)'; x.beginPath(); x.ellipse(20, 15, 17, 3, 0, 0, TAU); x.fill();
    [[9, 11, 6], [17, 7, 8 - k], [27, 8, 7 + k], [34, 12, 4.5]].forEach(([a, b, r]) => { x.fillStyle = '#ffffff'; x.beginPath(); x.arc(a, b, r, 0, TAU); x.fill(); });
    x.fillStyle = 'rgba(210,228,245,.7)'; x.beginPath(); x.ellipse(20, 13.5, 15, 2.4, 0, 0, Math.PI); x.fill();
  }, { pad: 1, qmax: 4 });
}
function drawCarrier(ctx, mode, c, x, y, t, faceRight, moving) {
  if (mode === 'heli') {
    ctx.save(); ctx.translate(x, y); ctx.scale(.85, .85); art(ctx, 'helicopter', faceRight ? RIGHT : LEFT, -8, -8, t, { moving: true, layer: 'back' }); ctx.restore();
    return;
  }
  const flap = moving ? Math.sin(t / 3.2) : Math.sin(t / 10) * .4, img = G.creatureSprite(c.id), sz = 30;
  ctx.save(); ctx.translate(x, y);
  // rider sits on the back
  ctx.save(); ctx.translate(0, -11 + flap * .6); ctx.scale(.6, .6); G.drawChar(ctx, G.state.style, faceRight ? RIGHT : LEFT, 0, -8, -15, t, true); ctx.restore();
  ctx.save(); if (!faceRight) ctx.scale(-1, 1); ctx.drawImage(img, -sz / 2, -sz * .62 + flap, sz, sz * (1 + flap * .04)); ctx.restore();
  ctx.restore();
}
async function flight(mode, carrier) {
  const S = G.state, back = G.scene;
  const nodes = flightNodes();
  const hereId = (G.worldPlaceOf && G.worldPlaceOf(G.world.mapId)) || G.world.mapId, here = nodes.find(n => n.id === hereId) || nodes[0];
  const why = n => nodeWhy(n), whyById = {}, whyOf = id => { const n = nodes.find(q => q.id === id); return n ? why(n) : null; };
  let sel = nodes.indexOf(nodes.find(n => !why(n)) || here), phase = 'pick', tapped = -1, cancel = false;
  const fly = { t: 0, x: here.x, y: here.y, k: 0, from: here, to: null, faceRight: true, a: [0, 0], b: [0, 0] };
  const nav = G.mapNav(nodes);
  nav.update(sel); nav.last = sel;
  const scene = {
    wide: true, raw: true,
    update() { fly.t++; nav.update(sel); },
    tap() {},
    draw(ctx) {
      const t = fly.t;
      // slow drifting clouds; they stream past while flying
      const drift = phase === 'fly' ? (fly.faceRight ? -1 : 1) : 0, vel = phase === 'fly' ? 1.6 : .12;
      fly.cl = (fly.cl || 0) + vel * (drift || 1);
      const W = G.W, H = G.H, hxy = nav.xy(here.id);
      G.drawWorldMap(ctx, 0, 0, W, H, { t, here: here.id, view: nav.view(), cursor: phase === 'pick' ? nodes[sel].id : undefined, names: phase === 'pick' && nav.zoom ? 'known' : 'sel', icons: phase === 'pick' ? 'sel' : 'none', ok: id => phase === 'pick' && !whyOf(id), dim: id => !!whyOf(id) && whyOf(id) !== 'You are here.', ferries: false });
      if (phase === 'fly') {
        const gx = fly.a[0] + (fly.b[0] - fly.a[0]) * fly.k, gy = fly.a[1] + (fly.b[1] - fly.a[1]) * fly.k;
        ell(ctx, gx, gy + 2, 7 - Math.sin(fly.k * Math.PI) * 2.5, 2, 'rgba(30,30,60,.28)');
        drawCarrier(ctx, mode, carrier, fly.x, fly.y, t, fly.faceRight, true);
        // near clouds sweep past quickly for depth
        for (let i = 0; i < 3; i++) { const e = cloudArt(i), w = 70 + i * 16, cx = ((i * 113 - fly.t * (3.2 + i) * (fly.faceRight ? 1 : -1)) % 420 + 420) % 420 - 100, cy = (18 + i * 46) * H / 160;
          ctx.globalAlpha = .82; ctx.drawImage(e.c, cx - e.pad, cy - e.pad, w + e.pad * 2, w * 18 / 40 + e.pad * 2); ctx.globalAlpha = 1; }
      } else drawCarrier(ctx, mode, carrier, hxy[0], hxy[1] - 8, t, true, false);
      // header chip and info panel (the panel flips to the top when the cursor is low on the map)
      const title = mode === 'heli' ? 'HELICOPTER' : `FLY WITH ${G.name(carrier)}`;
      if (phase !== 'pick') { G.frame(ctx, 4, 4, Math.max(96, G.textW(ctx, title) + 20), 17, 'light'); G.text(ctx, title, 12, 8.5, { font: G.FONT_B || G.FONT }); }
      if (phase === 'pick') {
        const n = nodes[sel], w = why(n), ph = 34, pw = Math.min(W - 8, 232), x0 = (W - pw) / 2, top = nav.xy(n.id)[1] > H * .55, py = top ? 3 : H - ph - 3;
        nav.touch(i => { tapped = i; });
        G.frame(ctx, x0, py, pw, ph, 'light'); G.tapZone(x0, py, pw, ph, () => {});
        G.text(ctx, n.name, x0 + 8, py + 4, { font: G.FONT_B || G.FONT });
        G.text(ctx, title, x0 + pw - 6, py + 4.5, { align: 'right', font: G.FONT_S, color: '#8a7a90', shadow: false });
        G.text(ctx, w || 'Ready for take-off. A landing spot is waiting.', x0 + 8, py + 14.5, { font: G.FONT_S, color: w ? '#b03a3a' : '#2a7a4a', shadow: false });
        const bw = 44, by = py + ph - 11;
        G.kit.pill(ctx, x0 + 8, by, bw, 8.5, '#3a9ae8', G.touch ? (nav.zoom ? 'ZOOM OUT' : 'ZOOM') : nav.zoom ? 'ENTER: OUT' : 'ENTER: ZOOM'); G.tapZone(x0 + 8, by - 1, bw, 11, () => nav.setZoom(!nav.zoom, sel));
        G.kit.pill(ctx, x0 + 8 + bw + 4, by, bw, 8.5, '#9a8ea8', G.touch ? 'BACK' : 'B: BACK'); G.tapZone(x0 + 8 + bw + 4, by - 1, bw, 11, () => { cancel = true; });
        if (!w) { G.kit.pill(ctx, x0 + pw - 52, by, 46, 8.5, '#3fae5a', G.touch ? 'TAP: FLY' : 'A: FLY'); G.tapZone(x0 + pw - 54, by - 1, 50, 11, () => { tapped = sel; }); }
        if (nav.zoom && G.touch) G.text(ctx, 'DRAG TO LOOK AROUND', W / 2, top ? py + ph + 3 : py - 11, { font: G.FONT_S, color: '#fff', shadow: '#000', align: 'center' });
      }
    },
  };
  api._fly = { scene, nodes, get sel() { return sel; }, set sel(v) { sel = v; }, get phase() { return phase; } };
  G.audio.sfx('select'); await G.fadeTo(1, 10, '#000');
  G.scene = scene; await G.fadeTo(0, 10);
  let target = null;
  for (;;) {
    await G.nextFrame();
    const k = G.input.pressed;
    if (tapped >= 0) { if (tapped === sel && !why(nodes[sel])) { target = nodes[sel]; break; } sel = tapped; tapped = -1; G.audio.sfx('select'); continue; }
    if (cancel || k.b) break;
    if (k.start) nav.setZoom(!nav.zoom, sel);
    const nx = G.worldNav(nodes, sel, k); if (nx !== sel) { sel = nx; G.audio.sfx('select'); }
    if (k.a) { if (!why(nodes[sel])) { target = nodes[sel]; break; } G.audio.sfx('bump'); }
  }
  if (!target) { await G.fadeTo(1, 10, '#000'); G.scene = back || G.world.scene; await G.fadeTo(0, 10); api._fly = null; return false; }
  // Before taking off: a vehicle you're riding stays parked where you are.
  if (riding()) api.park();
  nav.snap(); fly.a = nav.xy(here.id); fly.b = nav.xy(target.id); fly.x = fly.a[0]; fly.y = fly.a[1];
  phase = 'fly'; fly.from = here; fly.to = target; fly.faceRight = fly.b[0] >= fly.a[0];
  G.audio.sfx('throw');
  const dist = Math.hypot(fly.b[0] - fly.a[0], fly.b[1] - fly.a[1]), T = Math.max(80, Math.min(150, Math.round(dist * 1.2))), lift = 18 + dist * .12;
  for (let i = 0; i <= T; i++) {
    const k = i / T, e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    fly.k = e; fly.x = fly.a[0] + (fly.b[0] - fly.a[0]) * e; fly.y = fly.a[1] + (fly.b[1] - fly.a[1]) * e - 8 - Math.sin(e * Math.PI) * lift;
    if (i === T - 18) G.fadeTo(1, 18, '#ffffff');
    await G.nextFrame();
  }
  G.ui.fade.a = 1;
  // land
  G.loadMap(target.id);
  const m = G.world.map, L = landingFor(target.id) || { x: m.w >> 1, y: m.h >> 1 };
  let spot;
  if (mode === 'heli') {
    const pad = helipadB();
    if (pad && pad.map === target.id) { st().heli = null; spot = safeSpot({ x: pad.x + 1, y: pad.y + 3 }); }
    else { const hs = safeSpot(L); st().heli = { map: target.id, x: hs.x, y: hs.y }; spot = safeSpot({ x: hs.x, y: hs.y + 1 }, hs); }
  } else spot = safeSpot(L);
  G.placePlayer(spot.x, spot.y, DOWN);
  G.scene = G.world.scene;
  api._fly = null;
  await G.wait(4); await G.fadeTo(0, 18);
  G.audio.sfx('select');
  await says(mode === 'heli' ? `The helicopter touched down in ${m.name}.` : `${G.name(carrier)} carried you safely to ${m.name}!`);
  return true;
}

// ---- World map (START > MAP): see js/worldmap.js (G.worldMapScreen) ---------------------------------

// ---- TRAVEL menu (START > TRAVEL) ---------------------------------------------------------------
function statusLayer() {
  return { draw(ctx) {
    const V = st(), lines = [];
    lines.push(V.riding ? `Riding the ${nameOf(V.riding)}` : 'On foot');
    if (V.parked) lines.push(`${nameOf(V.parked.id)} parked in ${mapName(V.parked.map)}`);
    if (V.moored) lines.push(`${nameOf(V.moored.id)} moored in ${mapName(V.moored.map)}`);
    if (V.heli && owns('helicopter')) lines.push(`Helicopter in ${mapName(V.heli.map)}`);
    const f = flyer(); lines.push(f ? `Flyer: ${G.name(f)}` : 'No creature can fly you');
    const h = 18 + lines.length * 9;
    G.frame(ctx, 4, 4, 130, h, 'light');
    G.text(ctx, 'TRAVEL', 12, 8.5, { font: G.FONT_B || G.FONT });
    lines.forEach((l, i) => G.text(ctx, l, 12, 19 + i * 9, { font: G.FONT_S, color: '#5a4a66', shadow: false }));
  } };
}
async function pickVehicle(ids, label) {
  const i = await G.choose(ids.map(id => `${NAME(id)}${label ? label(id) : ''}`).concat(['CANCEL']), { right: 236, y: 4, minW: 70, rowH: 13 });
  return i >= 0 && i < ids.length ? ids[i] : null;
}
async function rideFromMenu(id) {
  const why = rideWhy(id); if (why) { await says(why); return; }
  if (isBoat(id)) { api.mount(id); G.audio.sfx('levelup'); showToast('Smooth sailing! Face the shore and press A to step ashore.'); await says(`You launched the ${nameOf(id)}. Face the shore and press A to step ashore.`); return; }
  st().riding = id;
  await G.fadeTo(.6, 6, '#ffffff'); G.audio.sfx('levelup'); await G.fadeTo(0, 8);
  await says(`Your ${nameOf(id)} was brought out of the Garage. Hop on!`);
}
// One button for transport (HUD ride chip, V key): get off if you are riding; otherwise get on your equipped vehicle, bringing it
// to you first if it is parked somewhere. Problems (no Garage, wrong place) are explained, not ignored.
G.quickRide = async function () {
  const V = st();
  if (V.riding) {
    const id = V.riding; if (V$(id).flies) { await says('Land the helicopter at a Helipad first.'); return; }
    if (!api.dismount()) { await says(api.lastWhy); return; }
    G.audio.sfx('select'); showToast(isBoat(id) ? `You stepped ashore. The ${nameOf(id)} is moored.` : `You got off. The ${nameOf(id)} is parked here.`); return;
  }
  const id = api.equipped();
  if (!id) { await says("You don't have any transport yet. Craft a Bicycle or Rowboat at a Forge, or visit Tidewheel Motors on the shore."); return; }
  if (whereIs(id) === 'parked') api.returnHome(id);   // call it to you: back to the Garage (or the lot), then out again
  const why = rideWhy(id);
  if (why) { await says(why); return; }
  if (isBoat(id)) { api.mount(id); G.audio.sfx('levelup'); showToast(`You launched the ${nameOf(id)}.`); return; }
  V.riding = id; G.audio.sfx('levelup'); showToast(`You hopped on your ${nameOf(id)}.`);
};
G.travelMenu = async function () {
  st();
  const V = st(), land = ORDER.filter(id => owns(id) && !V$(id).flies);
  const out = land.filter(id => ['riding', 'parked', 'moored'].includes(whereIs(id)));
  if (V.heli && owns('helicopter')) out.push('helicopter');
  const opts = [];
  if (!land.length) opts.push(['RIDE', () => says("You don't own a vehicle yet. Craft a Bicycle or Rowboat at a Forge, or visit Tidewheel Motors on the shore.")]);
  else if (land.length === 1) opts.push([`RIDE ${NAME(land[0])}`, () => rideFromMenu(land[0])]);
  else opts.push(['RIDE...', async () => { const id = await pickVehicle(land, id => { const w = whereIs(id); return w === 'lot' ? ' (LOT)' : w === 'riding' ? ' (ON)' : w === 'parked' ? ' (PARKED)' : w === 'moored' ? ' (MOORED)' : ''; }); if (id) await rideFromMenu(id); }]);
  if (land.length > 1) opts.push([`EQUIP...  (${NAME(api.equipped())})`, async () => {   // which vehicle the ride button uses
    const id = await pickVehicle(land, id => id === api.equipped() ? ' (EQUIPPED)' : ''); if (!id) return;
    api.equip(id); G.audio.sfx('select'); await says(`${nameOf(id)} equipped. The ride button (V, or the button on screen) now uses it.`);
  }]);
  opts.push(['GET OFF', async () => {
    if (!V.riding) { await says("You're not riding anything."); return; }
    const id = V.riding;
    if (!api.dismount()) { await says(api.lastWhy); return; }
    G.audio.sfx('select'); await says(isBoat(id) ? `You stepped ashore. The ${nameOf(id)} is moored: face it and press A to board.` : `You got off the ${nameOf(id)} and parked it. Press A beside it to ride again.`);
  }]);
  const send = async id => {
    if (isBoat(id)) {
      if (V.riding === id && !api.dismount()) { await says(api.lastWhy); return; }
      api.returnHome(id); G.audio.sfx('select'); await says(`The ${nameOf(id)} was hauled back into storage.`); return;
    }
    if (!garageB() && id !== 'helicopter') { api.returnHome(id); await says(`The ${nameOf(id)} was taken back to the dealer lot for safekeeping. Build a Garage to keep it at home.`); return; }
    const wasRiding = V.riding === id; api.returnHome(id); G.audio.sfx('select');
    await says(id === 'helicopter' ? 'Your helicopter flew itself back to the Helipad.' : wasRiding ? `You hopped off, and the ${nameOf(id)} was sent back to your Garage.` : `The ${nameOf(id)} was sent back to your Garage.`);
  };
  if (!out.length) opts.push(['SEND HOME', () => says('All your vehicles are already at home.')]);
  else if (out.length === 1) opts.push([`SEND ${NAME(out[0])} HOME`, () => send(out[0])]);
  else opts.push(['SEND HOME...', async () => { const id = await pickVehicle(out); if (id) await send(id); }]);
  opts.push(['FLY', () => creatureFlight()]);
  opts.push(['HELICOPTER', () => helicopter()]);
  opts.push(['CANCEL', null]);
  api.menuItems = opts.map(o => o[0]);
  const lay = statusLayer(); G.ui.layers.push(lay);
  const i = await G.choose(opts.map(o => o[0]), { right: 236, y: 4, minW: 70, rowH: 13 });
  G.ui.layers.splice(G.ui.layers.indexOf(lay), 1);
  if (i >= 0 && opts[i][1]) await opts[i][1]();
  G.closeText();
};

// ---- Vehicle quests (the NPC and the object are placed by the map owner) ------------------------------
G.vehicleQuest = {
  // Pip the courier kid in Lanternrest: 3 Carrots + 2 Turnips for the Scooter.
  async courier() {
    const S = G.state, f = S.flags, I = inv(); st();
    if (f.courierDone) { await says(['PIP: Zoom zoom! Business is booming since I got my new delivery cart.', 'Look after that Scooter for me. It goes fastest on the roads!']); return; }
    const c = I.count('Carrot'), tn = I.count('Turnip');
    if (!f.courierAsked) {
      f.courierAsked = true;
      await says(['PIP: Hi! I\'m Pip, the fastest courier in Lanternrest!', 'I\'m saving for a delivery cart, so I\'m selling my old SCOOTER.', 'I don\'t want money, though. Bring me 3 CARROTS and 2 TURNIPS for my veggie deliveries, and it\'s yours!']);
    }
    if (c < 3 || tn < 2) {
      await says([`PIP: So far you have ${Math.min(c, 3)}/3 Carrots and ${Math.min(tn, 2)}/2 Turnips.`, 'Grow them in a garden plot on your homestead. Seeds come from bushes in the meadow, or the Meadowbrook stand.']);
      return;
    }
    await G.say('PIP: You\'ve got them! Trade 3 CARROTS and 2 TURNIPS for my SCOOTER?', { auto: 1 });
    if (!(await G.yesNo())) { G.closeText(); await says('PIP: No rush! The offer stands.'); return; }
    I.take('Carrot', 3); I.take('Turnip', 2); f.courierDone = true; api.grant('scooter'); G.audio.sfx('levelup');
    await says([`${S.name} received the SCOOTER!`, 'PIP: It only runs on roads and paths, but boy is it quick. Keep it in a Garage and ride it from the TRAVEL menu!']);
  },
  // The abandoned quad on the Ridge: repair with 1 Engine Part + 2 Wheels.
  async quad() {
    const S = G.state, f = S.flags, I = inv(); st();
    if (f.quadFound) { await says('Only tyre tracks are left in the gravel.'); return; }
    const ep = I.count('Engine Part'), wh = I.count('Wheel');
    await says(['An old QUAD BIKE lies abandoned under a dusty tarp.', 'Its engine is seized and two tyres are shredded. It needs 1 ENGINE PART and 2 WHEELS.']);
    if (ep < 1 || wh < 2) { await says([`You have ${Math.min(ep, 1)}/1 Engine Part and ${Math.min(wh, 2)}/2 Wheels.`, 'A Forge can make both. Tidewheel Motors on the shore sells them too.']); return; }
    await G.say('Repair the quad bike with 1 Engine Part and 2 Wheels?', { auto: 1 });
    if (!(await G.yesNo())) { G.closeText(); return; }
    I.take('Engine Part', 1); I.take('Wheel', 2); f.quadFound = true; api.grant('quad');
    await G.fadeTo(.7, 8, '#ffffff'); G.audio.sfx('levelup'); await G.wait(16); await G.fadeTo(0, 10);
    await says([`After some tinkering, the engine coughs into life. ${S.name} got the QUAD BIKE!`, 'It can go anywhere on land, even tall grass and caves. It was sent to your Garage.']);
  },
  quadHidden: () => !!(G.state && G.state.flags.quadFound),
  courierDone: () => !!(G.state && G.state.flags.courierDone),
};
})();
