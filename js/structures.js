// Structure catalogue: every buildable thing, its levels, costs, prerequisites and perks.
// Adding a structure or a level is a data change here; js/homestead.js handles placing, upgrading,
// moving and removing generically, and each structure's own behaviour is registered in G.homeUse[use].
//
// def: { name, desc, cat, use, useLabel, homestead (only on your property), unique, rotatable, removable,
//        tiles (legacy: stamped tile chars instead of a drawn sprite), style (name-plate style), label,
//        levels: [{ name, w, h, door: [col, row] | null, cost: { money, Item: n }, req: { shards, lit, struct: { type: lvl }, deed },
//                   desc (what this level adds), perks: { ... } }] }
(function () {
const G = globalThis.G;
const S = G.STRUCTURES = {};
const def = (id, d) => { S[id] = Object.assign({ cat: 'decor', removable: true, label: true, style: 'home' }, d, { id }); };

// ---- Home ---------------------------------------------------------------------------------
def('house', {
  name: 'Player House', cat: 'home', homestead: true, unique: true, removable: false, use: 'house', useLabel: 'ENTER',
  desc: 'Your home. Sleep, cook, wash and store your things. Upgrade it to add rooms.',
  levels: [
    { name: 'Cabin', w: 4, h: 3, door: [1, 2], cost: {}, desc: 'A snug cabin: a bed and a little living area.',
      perks: { interior: 'home1', energy: 100, storage: 20, kitchen: 0, rooms: ['Bedroom', 'Living area'] } },
    { name: 'Cottage', w: 5, h: 4, door: [2, 3], cost: { money: 3000, Plank: 20, Stone: 20, Brick: 10 },
      desc: 'A real house: a separate bedroom, a kitchen to cook in, and a bathroom.',
      perks: { interior: 'home2', energy: 120, storage: 40, kitchen: 1, rooms: ['Bedroom', 'Kitchen', 'Bathroom', 'Living area'] } },
    { name: 'Family Home', w: 6, h: 4, door: [2, 3], cost: { money: 8000, Plank: 40, Brick: 30, 'Iron Ingot': 10, Glass: 6 }, req: { shards: 1 },
      desc: 'A lounge with a sofa and TV, a spare bedroom, a bigger kitchen and a storage room.',
      perks: { interior: 'home3', energy: 140, storage: 80, kitchen: 2, rooms: ['Bedroom', 'Spare room', 'Kitchen', 'Bathroom', 'Lounge', 'Storage'] } },
    { name: 'Grand Homestead', w: 7, h: 5, door: [3, 4], cost: { money: 20000, Plank: 60, Brick: 50, 'Iron Ingot': 20, Glass: 12, 'Copper Ingot': 10 }, req: { shards: 3 },
      desc: 'A premium home with a bath, a chef\'s kitchen, a trophy hall and a creature room.',
      perks: { interior: 'home4', energy: 160, storage: 150, kitchen: 3, rooms: ['Master bedroom', 'Spare room', 'Chef\'s kitchen', 'Bathroom', 'Lounge', 'Trophy hall', 'Creature room'] } },
  ],
});
def('shed', {
  name: 'Storage Shed', cat: 'home', homestead: true, use: 'shed', useLabel: 'OPEN STORAGE',
  desc: 'Extra storage space shared with your house cupboard.',
  levels: [
    { name: 'Shed', w: 3, h: 2, door: null, cost: { money: 600, Wood: 20, Stone: 6 }, desc: '+40 storage slots.', perks: { storage: 40 } },
    { name: 'Big Shed', w: 4, h: 3, door: null, cost: { money: 2000, Plank: 20, Nails: 4 }, desc: '+100 storage slots.', perks: { storage: 100 } },
  ],
});

// ---- Creatures ------------------------------------------------------------------------------
def('nursery', {
  name: 'Nursery', cat: 'creature', use: 'nursery', useLabel: 'NURSERY', homestead: false,
  desc: 'Leave creatures here. They gain EXP as you walk around.',
  levels: [
    { name: 'Nursery', w: 3, h: 2, door: null, cost: { money: 1200 }, desc: 'Holds 1 creature. 4 EXP per step.', perks: { slots: 1, exp: 4, cap: 60 } },
    { name: 'Nursery+', w: 4, h: 2, door: null, cost: { money: 2500, Plank: 15, Fiber: 10 }, desc: 'Holds 2 creatures. 6 EXP per step.', perks: { slots: 2, exp: 6, cap: 70 } },
    { name: 'Play Garden', w: 5, h: 3, door: null, cost: { money: 6000, Plank: 25, Brick: 10, Honey: 5 }, desc: 'Holds 3 creatures. 8 EXP per step, up to Lv80.', perks: { slots: 3, exp: 8, cap: 80 } },
  ],
});
def('barn', {
  name: 'Barn', cat: 'creature', homestead: true, use: 'barn', useLabel: 'BARN',
  desc: 'Creatures that live here produce materials every day: Wool, Honey, Fertilizer and more.',
  levels: [
    { name: 'Barn', w: 4, h: 3, door: null, cost: { money: 1500, Wood: 20, Stone: 10 }, desc: 'Houses 2 creatures. Each makes 1 item a day.', perks: { slots: 2, output: 1 } },
    { name: 'Big Barn', w: 5, h: 3, door: null, cost: { money: 4000, Plank: 25, Stone: 20, Rope: 5 }, desc: 'Houses 4 creatures. Fertilizer gives a bonus item.', perks: { slots: 4, output: 1, feedBonus: true } },
    { name: 'Grand Barn', w: 6, h: 4, door: null, cost: { money: 9000, Plank: 40, Brick: 20, 'Iron Ingot': 5 }, desc: 'Houses 6 creatures. Each makes 2 items a day.', perks: { slots: 6, output: 2, feedBonus: true } },
  ],
});
def('station', {
  name: 'Healing Station', cat: 'creature', use: 'station', useLabel: 'HEALING', style: 'heal', homestead: false,
  desc: 'Heals your team. Free heals each day; build it at home or out in the wild.',
  levels: [
    { name: 'Healing Station', w: 2, h: 2, door: null, cost: { money: 800 }, desc: '1 heal a day: restores HP and cures status.', perks: { perDay: 1, revive: false } },
    { name: 'Healing Clinic', w: 3, h: 2, door: null, cost: { money: 2500, Brick: 10, Glass: 2, Glowcap: 3 }, desc: '3 heals a day, and it revives fainted creatures.', perks: { perDay: 3, revive: true } },
    { name: 'Healing Spa', w: 3, h: 3, door: null, cost: { money: 6000, Brick: 20, 'Crystal Shard': 5, 'Iron Ingot': 5 }, req: { shards: 2 }, desc: 'Unlimited heals with revives.', perks: { perDay: 99, revive: true } },
  ],
});

// ---- Production -----------------------------------------------------------------------------
def('refinery', {
  name: 'Refinery', cat: 'craft', homestead: true, use: 'refinery', useLabel: 'REFINERY', style: 'craft',
  desc: 'Turns raw materials into planks, bricks, ingots, rope, glass and flour. Takes time.',
  levels: [
    { name: 'Refinery', w: 3, h: 3, door: null, cost: { money: 1500, Stone: 20, Wood: 10 }, desc: '1 job at a time. Planks, rope, bricks and ingots.', perks: { slots: 1, speed: 1, tier: 1 } },
    { name: 'Refinery Mk II', w: 4, h: 3, door: null, cost: { money: 4000, Brick: 15, 'Iron Ingot': 5 }, desc: '2 jobs at once, 1.5x faster. Adds glass, cloth and flour.', perks: { slots: 2, speed: 1.5, tier: 2 } },
    { name: 'Refinery Mk III', w: 4, h: 4, door: null, cost: { money: 9000, Brick: 25, 'Iron Ingot': 15, 'Copper Ingot': 10 }, desc: '3 jobs at once, 2x faster, double planks and bricks.', perks: { slots: 3, speed: 2, tier: 3 } },
  ],
});
def('forge', {
  name: 'Forge', cat: 'craft', homestead: true, use: 'forge', useLabel: 'CRAFT', style: 'craft',
  desc: 'A workshop for tools, parts, care items, orbs, sprinklers and vehicles.',
  levels: [
    { name: 'Workbench', w: 3, h: 2, door: null, cost: { money: 1200, Stone: 15, Wood: 10 }, desc: 'Tools, nails, rope goods and basic care items.', perks: { tier: 1 } },
    { name: 'Forge', w: 4, h: 3, door: null, cost: { money: 4000, Brick: 10, 'Iron Ingot': 8 }, desc: 'Gears, wire, wheels, engine parts, orbs, sprinklers and the bicycle.', perks: { tier: 2 } },
    { name: 'Master Forge', w: 5, h: 3, door: null, cost: { money: 10000, Brick: 20, 'Iron Ingot': 20, 'Crystal Shard': 10 }, req: { lit: true }, desc: 'Hover cores, rotors and the hoverboard.', perks: { tier: 3 } },
  ],
});
def('garage', {
  name: 'Garage', cat: 'vehicle', homestead: true, unique: true, use: 'garage', useLabel: 'GARAGE', style: 'craft',
  desc: 'Stores your vehicles. Take one out to ride it, and bring it back to park it.',
  levels: [
    { name: 'Garage', w: 4, h: 3, door: null, cost: { money: 2000, Plank: 15, Stone: 10 }, desc: 'Stores 2 vehicles.', perks: { slots: 2 } },
    { name: 'Double Garage', w: 5, h: 3, door: null, cost: { money: 6000, Plank: 20, 'Iron Ingot': 10 }, desc: 'Stores 4 vehicles. Tune-ups and paint jobs.', perks: { slots: 4, tune: true, paint: true } },
    { name: 'Motor Hall', w: 6, h: 4, door: null, cost: { money: 15000, Brick: 20, 'Iron Ingot': 20, 'Copper Ingot': 10 }, desc: 'Stores 7 vehicles, and unlocks the Helipad.', perks: { slots: 7, tune: true, paint: true, helipad: true } },
  ],
});
def('helipad', {
  name: 'Helipad', cat: 'vehicle', homestead: true, unique: true, use: 'helipad', useLabel: 'HELIPAD', style: 'craft',
  desc: 'A landing pad. A helicopter needs one at home.',
  levels: [{ name: 'Helipad', w: 3, h: 3, door: null, cost: { money: 5000, Stone: 30, Brick: 10 }, req: { struct: { garage: 3 } }, desc: 'Lets you own and fly a helicopter.', perks: {} }],
});

// ---- Farming --------------------------------------------------------------------------------
def('plot', {
  name: 'Garden Plot', cat: 'farm', homestead: true, use: 'plot', direct: true, label: false, repeat: true,
  desc: 'Tilled soil. Plant seeds, water them every day, and harvest.',
  levels: [
    { name: 'Garden Plot', w: 1, h: 1, door: null, cost: { Wood: 2 }, desc: 'Grows one crop. Water it every day.', perks: { yield: 0, selfWater: false } },
    { name: 'Rich Plot', w: 1, h: 1, door: null, cost: { Plank: 2, Fertilizer: 2 }, desc: '+1 crop at every harvest.', perks: { yield: 1, selfWater: false } },
    { name: 'Planter Box', w: 1, h: 1, door: null, cost: { Brick: 2, 'Copper Ingot': 1 }, desc: '+1 crop, and it waters itself.', perks: { yield: 1, selfWater: true } },
  ],
});
def('sprinkler', {
  name: 'Sprinkler', cat: 'farm', homestead: true, use: 'sprinkler', label: false,
  desc: 'Waters the plots around it every morning.',
  levels: [
    { name: 'Sprinkler', w: 1, h: 1, door: null, cost: { 'Iron Ingot': 2, Wire: 2 }, req: { struct: { forge: 2 } }, desc: 'Waters the 8 plots around it.', perks: { radius: 1 } },
    { name: 'Super Sprinkler', w: 1, h: 1, door: null, cost: { 'Copper Ingot': 2, Wire: 2, Gear: 1 }, desc: 'Waters every plot within 2 tiles.', perks: { radius: 2 } },
  ],
});
def('well', {
  name: 'Well', cat: 'farm', homestead: true, use: 'well', useLabel: 'REFILL CAN',
  desc: 'Refill your watering can here (any water works too).',
  levels: [{ name: 'Well', w: 2, h: 2, door: null, cost: { money: 300, Stone: 10, Wood: 5 }, desc: 'Fresh water for your garden.', perks: {} }],
});
def('greenhouse', {
  name: 'Greenhouse', cat: 'farm', homestead: true, use: 'greenhouse', useLabel: 'GREENHOUSE',
  desc: 'Warm glass walls: plots within 3 tiles grow twice as fast.',
  levels: [{ name: 'Greenhouse', w: 5, h: 4, door: null, cost: { money: 8000, Glass: 20, Plank: 20, 'Iron Ingot': 5 }, req: { struct: { house: 2 } }, desc: 'Watered plots within 3 tiles grow 2 days a day.', perks: { radius: 3, boost: 1 } }],
});

// ---- Decorations and landscaping -------------------------------------------------------------
const deco = (id, name, cost, desc, o) => def(id, Object.assign({ name, desc, cat: 'decor', label: false, repeat: true, levels: [{ name, w: 1, h: 1, door: null, cost, desc, perks: {} }] }, o));
deco('lamp', 'Lamp Post', { money: 60 }, 'A warm light for your camp.', { tiles: ['l'] });
deco('flowers', 'Flower Bed', { money: 40 }, 'Pretty flowers you can walk through.', { tiles: ['f'] });
deco('bush', 'Bush', { money: 50 }, 'A round green bush.', { tiles: ['u'] });
deco('pine', 'Pine Tree', { money: 90 }, 'A tall pine tree.', { tiles: ['n'] });
deco('fence', 'Fence', { Wood: 1 }, 'One section of wooden fence.', { tiles: ['F'] });
deco('gate', 'Gate', { Wood: 2 }, 'A fence gate you can walk through.', { tiles: ['Y'], homestead: true });
deco('path', 'Stone Path', { Stone: 1 }, 'A neat stone path tile.', { tiles: ['Z'], homestead: true });
deco('dirt', 'Dirt Path', { money: 5 }, 'A plain dirt path tile.', { tiles: ['p'], homestead: true });
deco('statue', 'Creature Statue', { Stone: 12 }, 'A carved statue of your partner.', { homestead: true });
def('bench', { name: 'Bench', cat: 'decor', homestead: true, label: false, rotatable: true, repeat: true, use: 'bench', useLabel: 'SIT', desc: 'A garden bench. Sit and rest.',
  levels: [{ name: 'Bench', w: 2, h: 1, door: null, cost: { Plank: 3 }, desc: 'Sit to recover a little energy once a day.', perks: {} }] });
def('flowerbox', { name: 'Flower Box', cat: 'decor', homestead: true, label: false, rotatable: true, repeat: true, desc: 'A long planter of flowers.',
  levels: [{ name: 'Flower Box', w: 2, h: 1, door: null, cost: { Plank: 2, Fiber: 2 }, desc: 'Cheerful flowers in a wooden box.', perks: {} }] });

// Legacy: the old teal Base (pre-homestead saves). Not offered in the build menu any more; existing ones keep working.
def('base', { name: 'Base', cat: 'home', unique: true, hidden: true, tiles: ['AAAAA', 'AAAAA', 'WNDNW'], legacyDoor: [2, 2], desc: 'Your old base, with a bed and a PC.',
  levels: [{ name: 'Base', w: 5, h: 3, door: [2, 2], cost: { money: 2500 }, desc: 'A bed to rest in and a PC.', perks: {} }] });

G.BUILD_CATS = [['home', 'HOME'], ['creature', 'CREATURES'], ['craft', 'CRAFTING'], ['farm', 'FARMING'], ['vehicle', 'VEHICLES'], ['decor', 'DECOR']];
})();
