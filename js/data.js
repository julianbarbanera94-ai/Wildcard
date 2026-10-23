// Static game data: types, moves, species, items.
(function () {
const G = globalThis.G = globalThis.G || {};

G.TYPES = ['Normal', 'Fire', 'Water', 'Grass', 'Electric', 'Bug', 'Flying', 'Rock', 'Ground', 'Poison', 'Ghost', 'Psychic', 'Dark', 'Ice', 'Fighting', 'Steel', 'Dragon', 'Fairy'];

// Attacker type -> defender type -> multiplier (anything missing is 1x).
G.CHART = {
  Normal:   { Rock: .5, Ghost: 0, Steel: .5 },
  Fire:     { Fire: .5, Water: .5, Grass: 2, Bug: 2, Rock: .5, Ice: 2, Steel: 2, Dragon: .5 },
  Water:    { Fire: 2, Water: .5, Grass: .5, Rock: 2, Ground: 2, Dragon: .5 },
  Grass:    { Fire: .5, Water: 2, Grass: .5, Poison: .5, Ground: 2, Flying: .5, Bug: .5, Rock: 2, Dragon: .5, Steel: .5 },
  Electric: { Water: 2, Grass: .5, Electric: .5, Ground: 0, Flying: 2, Dragon: .5 },
  Bug:      { Fire: .5, Grass: 2, Flying: .5, Poison: .5, Ghost: .5, Psychic: 2, Dark: 2, Fighting: .5, Steel: .5, Fairy: .5 },
  Flying:   { Grass: 2, Electric: .5, Bug: 2, Rock: .5, Fighting: 2, Steel: .5 },
  Rock:     { Fire: 2, Flying: 2, Bug: 2, Ground: .5, Ice: 2, Fighting: .5, Steel: .5 },
  Ground:   { Fire: 2, Electric: 2, Grass: .5, Bug: .5, Poison: 2, Flying: 0, Rock: 2, Steel: 2 },
  Poison:   { Grass: 2, Poison: .5, Ground: .5, Rock: .5, Ghost: .5, Fairy: 2, Steel: 0 },
  Ghost:    { Normal: 0, Ghost: 2, Psychic: 2, Dark: .5 },
  Psychic:  { Psychic: .5, Poison: 2, Dark: 0, Fighting: 2, Steel: .5 },
  Dark:     { Ghost: 2, Psychic: 2, Dark: .5, Fighting: .5, Fairy: .5 },
  Ice:      { Grass: 2, Ground: 2, Flying: 2, Dragon: 2, Fire: .5, Water: .5, Ice: .5, Steel: .5 },
  Fighting: { Normal: 2, Rock: 2, Ice: 2, Dark: 2, Steel: 2, Flying: .5, Poison: .5, Bug: .5, Psychic: .5, Fairy: .5, Ghost: 0 },
  Steel:    { Rock: 2, Ice: 2, Fairy: 2, Fire: .5, Water: .5, Electric: .5, Steel: .5 },
  Dragon:   { Dragon: 2, Steel: .5, Fairy: 0 },
  Fairy:    { Fighting: 2, Dragon: 2, Dark: 2, Fire: .5, Poison: .5, Steel: .5 },
};
// As in the classic games, physical/special is decided by the move's type.
G.PHYS = new Set(['Normal', 'Flying', 'Ground', 'Rock', 'Bug', 'Ghost', 'Poison', 'Fighting', 'Steel']);

G.TYPE_COL = {
  Normal: '#c8a878', Fire: '#f08030', Water: '#5890f0', Grass: '#78c850', Electric: '#f8d030',
  Bug: '#a8b820', Flying: '#a890f0', Rock: '#b8a038', Ground: '#d8b860', Poison: '#a040a0',
  Ghost: '#705898', Psychic: '#f85888', Dark: '#705848',
  Ice: '#7fd4e0', Fighting: '#c8463a', Steel: '#a8a8c4', Dragon: '#7058e8', Fairy: '#f29ac0',
};

// ---- Moves ----------------------------------------------------------------
const M = G.MOVES = {};
function mv(name, type, pow, acc, pp, o) { M[name] = Object.assign({ name, type, pow, acc, pp }, o || {}); }
mv('Tackle', 'Normal', 40, 100, 35);
mv('Scratch', 'Normal', 40, 100, 35);
mv('Quick Attack', 'Normal', 40, 100, 30, { pri: 1 });
mv('Slam', 'Normal', 80, 75, 20);
mv('Growl', 'Normal', 0, 100, 40, { stat: ['atk', -1] });
mv('Tail Whip', 'Normal', 0, 100, 30, { stat: ['def', -1] });
mv('Harden', 'Normal', 0, 100, 30, { stat: ['def', 1], self: true });
mv('Lullaby', 'Normal', 0, 70, 15, { status: 'slp' });
mv('Ember', 'Fire', 40, 100, 25, { status: 'brn', chance: 10 });
mv('Flamethrower', 'Fire', 90, 100, 15, { status: 'brn', chance: 10 });
mv('Water Gun', 'Water', 40, 100, 25);
mv('Bubble Beam', 'Water', 65, 100, 20);
mv('Surf', 'Water', 90, 100, 15);
mv('Vine Whip', 'Grass', 45, 100, 25);
mv('Razor Leaf', 'Grass', 55, 95, 25);
mv('Petal Blast', 'Grass', 80, 90, 15);
mv('Sleep Powder', 'Grass', 0, 75, 15, { status: 'slp' });
mv('Thunder Shock', 'Electric', 40, 100, 30, { status: 'par', chance: 10 });
mv('Thunderbolt', 'Electric', 90, 100, 15, { status: 'par', chance: 10 });
mv('Thunder Wave', 'Electric', 0, 90, 20, { status: 'par' });
mv('Bug Bite', 'Bug', 60, 100, 20);
mv('Cross Cut', 'Bug', 80, 100, 15);
mv('Peck', 'Flying', 35, 100, 35);
mv('Gust', 'Flying', 40, 100, 35);
mv('Wing Attack', 'Flying', 60, 100, 35);
mv('Air Slash', 'Flying', 75, 95, 20);
mv('Rock Throw', 'Rock', 50, 90, 15);
mv('Rock Slide', 'Rock', 75, 90, 10);
mv('Mud Shot', 'Ground', 55, 95, 15);
mv('Quake', 'Ground', 100, 100, 10);
mv('Poison Sting', 'Poison', 35, 100, 35, { status: 'psn', chance: 30 });
mv('Sludge', 'Poison', 65, 100, 20, { status: 'psn', chance: 30 });
mv('Poison Powder', 'Poison', 0, 75, 35, { status: 'psn' });
mv('Lick', 'Ghost', 30, 100, 30);
mv('Shadow Claw', 'Ghost', 70, 100, 15);
mv('Confusion', 'Psychic', 50, 100, 25);
mv('Psybeam', 'Psychic', 65, 100, 20);
mv('Psychic', 'Psychic', 90, 100, 10);
mv('Bite', 'Dark', 60, 100, 25);
mv('Crunch', 'Dark', 80, 100, 15);
// moves for the newer types, and a stronger tier for the original ones
mv('Frost Nip', 'Ice', 40, 100, 30); mv('Hail Shard', 'Ice', 65, 95, 20); mv('Glacier Beam', 'Ice', 90, 100, 10);
mv('Jab', 'Fighting', 40, 100, 30); mv('Palm Strike', 'Fighting', 65, 100, 20); mv('Mighty Blow', 'Fighting', 100, 85, 10); mv('Pump Up', 'Fighting', 0, 100, 20, { stat: ['atk', 2], self: true });
mv('Iron Bash', 'Steel', 50, 100, 30); mv('Steel Spin', 'Steel', 80, 100, 15); mv('Brace', 'Steel', 0, 100, 20, { stat: ['def', 2], self: true });
mv('Drake Breath', 'Dragon', 60, 100, 20, { status: 'par', chance: 30 }); mv('Wyrm Claw', 'Dragon', 80, 100, 15); mv('Sky Roar', 'Dragon', 110, 85, 5);
mv('Pixie Dust', 'Fairy', 40, 100, 30); mv('Glimmer', 'Fairy', 65, 100, 20); mv('Moonbeam', 'Fairy', 95, 100, 10); mv('Charm Wink', 'Fairy', 0, 100, 20, { stat: ['atk', -2] });
mv('Glare', 'Normal', 0, 100, 20, { stat: ['spe', -2] }); mv('Belly Flop', 'Normal', 85, 100, 15, { status: 'par', chance: 30 });
mv('Inferno Blast', 'Fire', 110, 85, 5, { status: 'brn', chance: 20 }); mv('Tidal Crash', 'Water', 110, 85, 5); mv('Seed Burst', 'Grass', 80, 100, 15);
mv('Volt Crash', 'Electric', 110, 85, 5, { status: 'par', chance: 20 }); mv('Toxic Spray', 'Poison', 90, 100, 10, { status: 'psn', chance: 30 });
mv('Phantom Rush', 'Ghost', 90, 100, 10); mv('Mind Spike', 'Psychic', 75, 100, 15); mv('Dusk Fang', 'Dark', 75, 100, 15);
mv('Earth Pulse', 'Ground', 75, 100, 15); mv('Boulder Crash', 'Rock', 100, 85, 5); mv('Swarm', 'Bug', 90, 100, 10); mv('Sky Dive', 'Flying', 100, 95, 10);
// Species/move packs in js/species/*.js register through these. A duplicate move name is ignored (and recorded for the tests).
G.dupMoves = [];
G.defineMove = function (name, type, pow, acc, pp, o) { if (M[name]) { G.dupMoves.push(name); return; } mv(name, type, pow, acc, pp, o); };

// ---- Species --------------------------------------------------------------
// base = [hp, atk, def, spa, spd, spe]; look drives the procedural sprite.
const SP = G.SPECIES = {};
function sp(id, name, types, base, catchRate, expYield, o) {
  SP[id] = Object.assign({ id, name, types, base, catchRate, expYield, evo: null, learn: [], look: {}, desc: '' }, o);
}
// Starters
sp(1, 'Embrit', ['Fire'], [42, 50, 40, 58, 48, 62], 45, 62, {
  evo: [14, 2], look: { stage: 1, form: 'round', feat: ['flame', 'ears'] }, desc: 'A playful fox kit. Its fluffy tail burns brighter whenever it is excited.',
  learn: [[1, 'Scratch'], [1, 'Growl'], [5, 'Ember'], [9, 'Quick Attack'], [12, 'Bite']]
});
sp(2, 'Emberon', ['Fire'], [58, 66, 55, 76, 60, 78], 45, 142, {
  evo: [32, 3], look: { stage: 2, form: 'round', feat: ['flame', 'ears', 'tail', 'arms'] }, desc: 'A proud fire fox. Its flame mane flares up when it means to fight.',
  learn: [[1, 'Scratch'], [1, 'Growl'], [1, 'Ember'], [14, 'Quick Attack'], [18, 'Bite'], [24, 'Flamethrower'], [30, 'Slam']]
});
sp(3, 'Infernox', ['Fire', 'Dark'], [80, 88, 72, 108, 80, 98], 45, 240, {
  look: { stage: 3, form: 'tall', feat: ['flame', 'horns', 'tail', 'arms', 'legs'] }, desc: 'Lava runs through its dark hide. It stalks the night with burning eyes.',
  learn: [[1, 'Scratch'], [1, 'Ember'], [1, 'Bite'], [24, 'Flamethrower'], [34, 'Crunch'], [40, 'Slam']]
});
sp(4, 'Splashling', ['Water'], [48, 48, 60, 50, 56, 40], 45, 63, {
  evo: [14, 5], look: { stage: 1, form: 'round', feat: ['fin', 'legs'] }, desc: 'It loves puddles and will follow rain clouds for miles.',
  learn: [[1, 'Tackle'], [1, 'Tail Whip'], [5, 'Water Gun'], [9, 'Harden'], [12, 'Bite']]
});
sp(5, 'Torrentle', ['Water'], [64, 62, 76, 66, 72, 52], 45, 142, {
  evo: [32, 6], look: { stage: 2, form: 'wide', feat: ['fin', 'legs', 'arms'] }, desc: 'Its fins flare into sprays of water as it darts through rivers.',
  learn: [[1, 'Tackle'], [1, 'Water Gun'], [1, 'Tail Whip'], [14, 'Bite'], [20, 'Bubble Beam'], [27, 'Slam'], [30, 'Surf']]
});
sp(6, 'Tidalord', ['Water', 'Ground'], [84, 82, 100, 86, 98, 62], 45, 239, {
  look: { stage: 3, form: 'wide', feat: ['fin', 'legs', 'arms', 'spikes'] }, desc: 'A coiled river serpent. It stirs the mud of the riverbed into floods.',
  learn: [[1, 'Tackle'], [1, 'Water Gun'], [1, 'Bubble Beam'], [30, 'Surf'], [36, 'Quake'], [42, 'Crunch']]
});
sp(7, 'Sproutle', ['Grass'], [45, 48, 50, 52, 54, 45], 45, 64, {
  evo: [14, 8], look: { stage: 1, form: 'round', feat: ['leaf', 'legs'] }, desc: 'A leafy pup. The leaves on its head drink in the sunlight.',
  learn: [[1, 'Tackle'], [1, 'Growl'], [5, 'Vine Whip'], [9, 'Sleep Powder'], [12, 'Razor Leaf']]
});
sp(8, 'Thornling', ['Grass'], [60, 63, 64, 68, 68, 60], 45, 141, {
  evo: [32, 9], look: { stage: 2, form: 'round', feat: ['leaf', 'legs', 'arms', 'spikes'] }, desc: 'Its leafy mane bristles when it guards its trainer.',
  learn: [[1, 'Tackle'], [1, 'Vine Whip'], [1, 'Sleep Powder'], [14, 'Razor Leaf'], [20, 'Poison Powder'], [27, 'Slam'], [30, 'Petal Blast']]
});
sp(9, 'Verdantus', ['Grass', 'Rock'], [80, 84, 86, 92, 90, 72], 45, 236, {
  look: { stage: 3, form: 'wide', feat: ['leaf', 'legs', 'arms', 'spikes', 'horns'] }, desc: 'A great leaf-shelled beast. Ancient moss covers its stony back.',
  learn: [[1, 'Vine Whip'], [1, 'Razor Leaf'], [1, 'Sleep Powder'], [30, 'Petal Blast'], [36, 'Rock Slide'], [42, 'Slam']]
});
// Wild creatures
sp(10, 'Fluffur', ['Normal'], [55, 45, 40, 25, 35, 55], 255, 50, {
  evo: [18, 11], look: { stage: 1, form: 'round', feat: ['ears', 'tail'] }, desc: 'Soft and curious. It is often found napping in tall grass.',
  learn: [[1, 'Tackle'], [3, 'Growl'], [7, 'Quick Attack'], [12, 'Bite'], [17, 'Lullaby']]
});
sp(11, 'Fluffox', ['Normal'], [85, 78, 60, 48, 62, 90], 100, 145, {
  look: { stage: 2, form: 'tall', feat: ['ears', 'tail', 'legs', 'arms'] }, desc: 'A swift runner with a luxurious tail.',
  learn: [[1, 'Tackle'], [1, 'Quick Attack'], [1, 'Bite'], [22, 'Slam'], [28, 'Crunch'], [32, 'Lullaby']]
});
sp(12, 'Voltick', ['Electric'], [35, 45, 35, 50, 40, 80], 190, 55, {
  evo: [22, 13], look: { stage: 1, form: 'round', feat: ['ears', 'bolt'] }, desc: 'Static crackles through its fur on dry days.',
  learn: [[1, 'Tackle'], [1, 'Thunder Shock'], [4, 'Growl'], [9, 'Quick Attack'], [14, 'Thunder Wave'], [19, 'Bite']]
});
sp(13, 'Voltaro', ['Electric'], [60, 70, 55, 95, 70, 100], 75, 160, {
  look: { stage: 2, form: 'tall', feat: ['ears', 'bolt', 'legs', 'arms'] }, desc: 'A crackling fox. Its spiky tail stores enough charge to light a village.',
  learn: [[1, 'Thunder Shock'], [1, 'Quick Attack'], [1, 'Thunder Wave'], [26, 'Thunderbolt'], [30, 'Slam']]
});
sp(14, 'Pebblit', ['Rock'], [40, 70, 100, 30, 40, 20], 255, 60, {
  evo: [24, 15], look: { stage: 1, form: 'round', feat: ['spikes', 'legs'] }, desc: 'It looks like a rock until it blinks.',
  learn: [[1, 'Tackle'], [1, 'Harden'], [6, 'Rock Throw'], [11, 'Mud Shot'], [17, 'Slam']]
});
sp(15, 'Boulderon', ['Rock', 'Ground'], [70, 105, 130, 45, 60, 35], 120, 175, {
  look: { stage: 3, form: 'wide', feat: ['spikes', 'legs', 'arms', 'horns'] }, desc: 'A hulking boulder golem. Its steps cause tremors for miles.',
  learn: [[1, 'Tackle'], [1, 'Rock Throw'], [1, 'Mud Shot'], [28, 'Rock Slide'], [34, 'Quake']]
});
sp(16, 'Wingly', ['Flying'], [40, 50, 40, 35, 40, 70], 255, 52, {
  evo: [18, 17], look: { stage: 1, form: 'round', feat: ['wings', 'tail'] }, desc: 'A round little bluebird that chirps at sunrise.',
  learn: [[1, 'Peck'], [1, 'Growl'], [5, 'Gust'], [10, 'Quick Attack'], [15, 'Wing Attack']]
});
sp(17, 'Skyrant', ['Flying', 'Normal'], [70, 85, 65, 60, 65, 100], 90, 155, {
  look: { stage: 3, form: 'tall', feat: ['wings', 'tail', 'horns'] }, desc: 'Its broad violet wings ride storm winds with ease.',
  learn: [[1, 'Peck'], [1, 'Gust'], [1, 'Wing Attack'], [24, 'Air Slash'], [30, 'Slam']]
});
sp(18, 'Crawlet', ['Bug'], [45, 40, 55, 30, 35, 35], 255, 54, {
  evo: [14, 19], look: { stage: 1, form: 'wide', feat: ['antenna', 'legs'] }, desc: 'It chews leaves all day long.',
  learn: [[1, 'Tackle'], [1, 'Harden'], [5, 'Bug Bite'], [10, 'Poison Sting']]
});
sp(19, 'Chitron', ['Bug'], [65, 70, 95, 40, 80, 50], 120, 130, {
  look: { stage: 2, form: 'wide', feat: ['antenna', 'legs', 'arms', 'horns'] }, desc: 'Its glossy shell turns aside most attacks.',
  learn: [[1, 'Tackle'], [1, 'Bug Bite'], [1, 'Harden'], [20, 'Cross Cut'], [26, 'Slam']]
});
sp(20, 'Venomite', ['Bug', 'Poison'], [50, 60, 45, 60, 45, 60], 150, 110, {
  look: { stage: 2, form: 'round', feat: ['antenna', 'tail', 'fangs'] }, desc: 'Venom drips from its stinger.',
  learn: [[1, 'Poison Sting'], [1, 'Bug Bite'], [8, 'Poison Powder'], [13, 'Sludge'], [18, 'Cross Cut']]
});
sp(21, 'Burrowl', ['Ground'], [50, 65, 55, 35, 45, 70], 150, 95, {
  look: { stage: 2, form: 'round', feat: ['ears', 'arms', 'fangs'] }, desc: 'It tunnels through soil searching for snacks.',
  learn: [[1, 'Scratch'], [1, 'Growl'], [7, 'Mud Shot'], [12, 'Bite'], [18, 'Slam'], [24, 'Quake']]
});
sp(22, 'Gloomoth', ['Dark'], [60, 65, 50, 60, 60, 65], 120, 120, {
  look: { stage: 2, form: 'round', feat: ['wings', 'antenna', 'fangs'] }, desc: 'It drifts toward lanterns after dark.',
  learn: [[1, 'Tackle'], [1, 'Bite'], [10, 'Gust'], [15, 'Poison Sting'], [20, 'Crunch']]
});
sp(23, 'Shadowisp', ['Ghost'], [45, 40, 45, 85, 55, 75], 120, 115, {
  look: { stage: 2, form: 'tall', feat: ['tail', 'fangs'] }, desc: 'A wandering flame of spite. It follows travelers.',
  learn: [[1, 'Lick'], [1, 'Growl'], [10, 'Confusion'], [15, 'Shadow Claw'], [22, 'Psybeam']]
});
sp(24, 'Dreamow', ['Psychic'], [60, 35, 50, 80, 75, 50], 100, 120, {
  look: { stage: 2, form: 'round', feat: ['ears', 'horns', 'arms'] }, desc: 'It feeds on dreams, leaving sleepers well rested.',
  learn: [[1, 'Confusion'], [1, 'Tail Whip'], [11, 'Lullaby'], [16, 'Psybeam'], [24, 'Psychic']]
});
sp(25, 'Joker', ['Psychic', 'Ghost'], [100, 100, 100, 100, 100, 100], 30, 250, {
  look: { stage: 3, form: 'tall', feat: ['horns', 'wings', 'tail', 'arms', 'legs', 'spikes'] }, desc: 'The Wildcard. No one knows what it will do next.',
  learn: [[1, 'Psychic'], [1, 'Shadow Claw'], [1, 'Thunderbolt'], [1, 'Flamethrower']]
});

G.dupSpecies = [];
G.defineSpecies = function (id, name, types, base, catchRate, expYield, o) { if (SP[id]) { G.dupSpecies.push(id); return; } sp(id, name, types, base, catchRate, expYield, o); };
G.CREATURE_ART = G.CREATURE_ART || {};   // per-species art configs from the packs (see js/sprites.js and docs/CREATURES.md)

// ---- Items ----------------------------------------------------------------
G.ITEMS = {
  // Capture orbs (catch rules and art in js/orbart.js: type orbs are 3x on their types)
  'Terra Orb': { kind: 'orb', mult: 1, price: 200, desc: 'The standard capture orb. Reliable for most creatures.' },
  'Aqua Orb': { kind: 'orb', mult: 1, price: 450, desc: 'Catches Water-type creatures far more easily.' },
  'Flare Orb': { kind: 'orb', mult: 1, price: 450, desc: 'Catches Fire-type creatures far more easily.' },
  'Verdant Orb': { kind: 'orb', mult: 1, price: 450, desc: 'Better on Grass and Bug creatures of field and forest.' },
  'Frost Orb': { kind: 'orb', mult: 1, price: 450, desc: 'Catches Ice-type creatures far more easily.' },
  'Gale Orb': { kind: 'orb', mult: 1, price: 450, desc: 'Catches Flying-type creatures far more easily.' },
  'Stone Orb': { kind: 'orb', mult: 1, price: 450, desc: 'Better on Rock, Ground and Steel creatures.' },
  'Void Orb': { kind: 'orb', mult: 1, price: 700, desc: 'Better on Ghost, Dark and Psychic creatures, and rare ones.' },
  'Pulse Orb': { kind: 'orb', mult: 1.5, price: 600, desc: 'A strong orb, even better on fast or fierce creatures.' },
  'Mythic Orb': { kind: 'orb', mult: 2, price: 2000, desc: 'The highest catch rate. Made for legendary creatures.' },
  'Potion': { kind: 'heal', amt: 20, price: 300, desc: 'Restores 20 HP.' },
  'Super Potion': { kind: 'heal', amt: 50, price: 700, desc: 'Restores 50 HP.' },
  'Full Heal': { kind: 'cure', price: 600, desc: 'Cures any status problem.' },
  'Revive': { kind: 'revive', price: 1500, desc: 'Revives a fainted creature to half HP.' },
  'Old Lantern': { kind: 'key', price: 0, desc: 'A battered brass lantern. Someone must be missing it.' },
};
G.MART_STOCK = ['Terra Orb', 'Pulse Orb', 'Potion', 'Super Potion', 'Full Heal', 'Revive'];
G.STATUS_NAME = { slp: 'SLP', par: 'PAR', psn: 'PSN', brn: 'BRN' };
G.STAT_NAME = { hp: 'HP', atk: 'ATTACK', def: 'DEFENSE', spa: 'SP. ATK', spd: 'SP. DEF', spe: 'SPEED' };
})();
