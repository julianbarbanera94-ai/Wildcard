// Resource catalogue and inventory helpers shared by building, crafting, farming, shops and vehicles.
// Everything the player owns lives in one bag (G.state.bag: { itemName: qty }) plus money (G.state.money).
// Item kinds: orb, heal, cure, revive, key (battle items, js/data.js), and the homestead kinds below:
//   mat   raw, refined and component materials      tool  owned once, unlocks an action
//   seed  plant in a garden plot                    crop  harvested produce (some are edible: energy > 0)
//   food  cooked meals for the player (energy)      treat creature care: gives a creature EXP
(function () {
const G = globalThis.G;
const I = G.ITEMS;
G.defineItem = (name, def) => { if (I[name]) G.dupItems = (G.dupItems || []).concat(name); I[name] = def; };
const D = (kind, list) => list.forEach(([name, price, desc, extra]) => G.defineItem(name, Object.assign({ kind, price, desc }, extra)));

// Pockets for the bag screen, in order.
G.POCKETS = [
  { id: 'items', name: 'ITEMS', kinds: ['orb', 'heal', 'cure', 'revive', 'treat'] },
  { id: 'mats', name: 'MATERIALS', kinds: ['mat'] },
  { id: 'farm', name: 'FARM', kinds: ['seed', 'crop', 'tool'] },
  { id: 'food', name: 'FOOD', kinds: ['food'] },
  { id: 'key', name: 'KEY ITEMS', kinds: ['key'] },
];
G.pocketOf = name => { const k = (I[name] || {}).kind; return (G.POCKETS.find(p => p.kinds.includes(k)) || G.POCKETS[0]).id; };

// ---- Materials: gathered ----------------------------------------------------------------
D('mat', [
  ['Wood', 10, 'Sturdy logs from trees and stumps. An Axe gets you more.'],
  ['Stone', 10, 'Chunks of rock from boulders.'],
  ['Fiber', 8, 'Tough plant fibre from bushes. Twist it into rope.'],
  ['Clay', 12, 'Soft clay from boulders on the shore and in the marsh.'],
  ['Coal', 20, 'Black fuel from the Glimmer Mine. Refineries burn it.'],
  ['Iron Ore', 30, 'Rusty ore from mine boulders. Needs a Pickaxe.'],
  ['Copper Ore', 25, 'Green-streaked ore from ridge boulders. Needs a Pickaxe.'],
  ['Crystal Shard', 80, 'A glowing shard chipped from mine crystals. Needs a Pickaxe.'],
  // produced by creatures living in the barn
  ['Wool', 40, 'Soft fluff shed by Normal-type creatures in the barn.'],
  ['Milk', 30, 'Fresh milk from a contented barn creature.'],
  ['Honey', 45, 'Golden honey made by Bug-type creatures.'],
  ['Fertilizer', 25, 'Rich compost. Use it on a garden plot for a bigger harvest.'],
  ['Pearl', 150, 'A rare pearl from a Water-type creature. Sells well.'],
]);
// ---- Materials: refined (Refinery) -------------------------------------------------------
D('mat', [
  ['Plank', 35, 'Smooth sawn boards. The basic building material.'],
  ['Brick', 50, 'Fired clay bricks for solid walls.'],
  ['Iron Ingot', 120, 'A bar of refined iron.'],
  ['Copper Ingot', 100, 'A bar of refined copper.'],
  ['Glass', 150, 'Clear glass melted from crystal shards.'],
  ['Rope', 40, 'Strong rope twisted from fibre.'],
  ['Cloth', 110, 'Woven wool cloth.'],
  ['Flour', 45, 'Ground wheat for baking.'],
]);
// ---- Materials: components (Forge) -------------------------------------------------------
D('mat', [
  ['Nails', 40, 'A box of iron nails.'],
  ['Gear', 280, 'A toothed iron gear for machines.'],
  ['Wire', 120, 'A coil of copper wire.'],
  ['Wheel', 200, 'A rubber-rimmed wheel for vehicles.'],
  ['Engine Part', 1200, 'A small engine assembly. Vehicles need these.'],
  ['Hover Core', 3000, 'A humming crystal core that pushes against the ground.'],
  ['Rotor', 2500, 'A balanced rotor blade assembly.'],
]);
// ---- Tools ------------------------------------------------------------------------------
D('tool', [
  ['Axe', 400, 'Chop trees for 2 extra Wood each time.'],
  ['Pickaxe', 500, 'Break ore and crystals out of rock.'],
  ['Watering Can', 300, 'Waters a garden plot. Holds 6 splashes; refill it at water.'],
  ['Big Watering Can', 1500, 'Holds 15 splashes and waters a plot and its neighbours.'],
]);
// ---- Seeds and crops ---------------------------------------------------------------------
D('seed', [
  ['Turnip Seeds', 30, 'Grows a Turnip in 3 days. Easy to grow.'],
  ['Carrot Seeds', 40, 'Grows Carrots in 4 days.'],
  ['Wheat Seeds', 25, 'Grows Wheat in 3 days. Grind it into Flour.'],
  ['Tomato Seeds', 60, 'Grows Tomatoes in 5 days.'],
  ['Pepper Seeds', 70, 'Grows fiery Peppers in 5 days.'],
  ['Glowcap Spores', 55, 'A marsh mushroom. Grows in 4 days and never needs water.'],
  ['Pumpkin Seeds', 120, 'Grows a big Pumpkin in 7 days.'],
  ['Starmelon Seeds', 0, 'A rare seed that twinkles. Grows a Starmelon in 9 days.'],
]);
D('crop', [
  ['Turnip', 60, 'A crunchy turnip. Eat it raw or cook it.', { energy: 6 }],
  ['Carrot', 80, 'A sweet carrot. Eat it raw or cook it.', { energy: 8 }],
  ['Wheat', 50, 'A bundle of wheat. Refine it into Flour.'],
  ['Tomato', 110, 'A juicy tomato. Eat it raw or cook it.', { energy: 8 }],
  ['Pepper', 140, 'A fiery pepper. Too hot to eat on its own.'],
  ['Glowcap', 120, 'A softly glowing mushroom used in salves.'],
  ['Pumpkin', 300, 'A huge pumpkin. Bake it into a pie.'],
  ['Starmelon', 900, 'A melon that glitters like the night sky.', { energy: 30 }],
]);
// ---- Meals (Kitchen) and creature care -----------------------------------------------------
D('food', [
  ['Veggie Stew', 260, 'A hearty stew. Restores 40 energy.', { energy: 40 }],
  ['Tomato Soup', 220, 'Warm and comforting. Restores 30 energy.', { energy: 30 }],
  ['Bread', 160, 'Fresh-baked bread. Restores 25 energy.', { energy: 25 }],
  ['Honey Toast', 240, 'Bread with honey. Restores 35 energy.', { energy: 35 }],
  ['Pepper Skewer', 380, 'Spicy veg skewer. Restores 50 energy.', { energy: 50 }],
  ['Pumpkin Pie', 700, 'A whole pie. Restores all your energy.', { energy: 999 }],
]);
D('heal', [['Herb Salve', 350, 'A glowcap salve for creatures. Restores 35 HP.', { amt: 35 }]]);
D('treat', [
  ['Spicy Treat', 600, 'A creature snack with a kick. Gives 300 EXP.', { exp: 300 }],
  ['Star Treat', 2500, 'A sparkling starmelon treat. Gives 1500 EXP.', { exp: 1500 }],
]);

// ---- Inventory helpers ------------------------------------------------------------------
// A cost is { money: n, ItemName: qty, ... }.
const bag = () => G.state.bag;
const inv = G.inv = {
  count: name => name === 'money' ? G.state.money : (bag()[name] || 0),
  give(name, n) { n = n === undefined ? 1 : n; if (name === 'money') G.state.money += n; else bag()[name] = (bag()[name] || 0) + n; return n; },
  take(name, n) {
    n = n === undefined ? 1 : n; if (inv.count(name) < n) return false;
    if (name === 'money') G.state.money -= n; else { bag()[name] -= n; if (!bag()[name]) delete bag()[name]; }
    return true;
  },
  // Free items (Test Mode infinite items) are never consumed; money is never charged in infinite-money mode.
  missing(cost) {
    const out = [];
    for (const [k, n] of Object.entries(cost || {})) { if (!n) continue; const have = inv.count(k); if (have < n) out.push({ item: k, need: n, have }); }
    return out;
  },
  has: cost => inv.missing(cost).length === 0,
  // Pays the whole cost or nothing. Returns true on success.
  pay(cost) {
    if (!inv.has(cost)) return false;
    for (const [k, n] of Object.entries(cost || {})) if (n) inv.take(k, n);
    return true;
  },
  refund(cost, frac) { for (const [k, n] of Object.entries(cost || {})) { const r = Math.floor(n * (frac === undefined ? 1 : frac)); if (r) inv.give(k, r); } },
  // "$3000, 20 Plank, 15 Stone"
  costText: cost => Object.entries(cost || {}).filter(([, n]) => n).map(([k, n]) => k === 'money' ? `$${n}` : `${n} ${k}`).join(', ') || 'Free',
  missingText: cost => inv.missing(cost).map(m => m.item === 'money' ? `$${m.need - m.have} more money` : `${m.need - m.have} more ${m.item}`).join(', '),
};
})();
