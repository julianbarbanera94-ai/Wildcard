// Species pack c: Mountain, mine and legends (ids 114-156). See docs/CREATURES.md.
(function () {
const G = globalThis.G, D = G.defineSpecies, ART = G.CREATURE_ART;

G.defineMove('Magma Spit', 'Fire', 70, 95, 15, { status: 'brn', chance: 20 });
G.defineMove('Gear Grind', 'Steel', 65, 100, 20);
G.defineMove('Dawnfire', 'Fire', 100, 90, 5, { status: 'brn', chance: 20 });
G.defineMove('Glacier Crush', 'Ice', 100, 90, 5);
G.defineMove('Anvil Drop', 'Steel', 100, 90, 5);
G.defineMove('Starfall', 'Fairy', 95, 100, 10);

// ---- Gravlet line: a baby dragon that hoards pebbles ------------------------
D(114, 'Gravlet', ['Dragon'], [45, 52, 55, 48, 45, 55], 220, 58, {
  evo: [18, 115], learn: [[1, 'Tackle'], [1, 'Growl'], [5, 'Rock Throw'], [9, 'Drake Breath'], [13, 'Harden'], [16, 'Mud Shot']],
  look: { stage: 1, form: 'round', feat: ['tail', 'legs', 'horns'] }, desc: 'A baby dragon that stuffs its cheeks with shiny pebbles.',
  habitat: [['ridge', 6, 10, 9]],
});
ART[114] = { main: '#86b8ae', belly: '#f4e8c8', acc: '#c9b48a', body: 'dragon', horn: 'rock', tail: 'lizard', mouth: 'cheeky', crystals: true, iris: '#3a6a60', cheek: '#ffa890' };
D(115, 'Cragwyrm', ['Dragon', 'Rock'], [65, 80, 85, 66, 60, 60], 100, 140, {
  evo: [34, 116], learn: [[1, 'Tackle'], [1, 'Drake Breath'], [1, 'Rock Throw'], [18, 'Rock Slide'], [24, 'Wyrm Claw'], [30, 'Harden']],
  look: { stage: 2, form: 'tall', feat: ['tail', 'legs', 'arms', 'horns', 'wings'] }, desc: 'Its pebble hoard has hardened into armour plates along its back.',
  habitat: [['ridge', 12, 12, 1]],
});
ART[115] = { main: '#6f9c9c', belly: '#f0e2bc', acc: '#b79c78', body: 'dragon', wing: 'dragon', horn: 'rock', tail: 'lizard', mouth: 'fang', rockBack: true, claws: true, iris: '#2a5a5a' };
D(116, 'Cragdrakon', ['Dragon', 'Rock'], [88, 112, 115, 90, 80, 40], 45, 235, {
  learn: [[1, 'Drake Breath'], [1, 'Wyrm Claw'], [1, 'Rock Slide'], [34, 'Earth Pulse'], [38, 'Boulder Crash'], [44, 'Sky Roar']],
  look: { stage: 3, form: 'tall', feat: ['tail', 'legs', 'arms', 'horns', 'wings', 'spikes'] }, desc: 'A mountain-sized dragon wearing a lifetime of gems as a cuirass.',
});
ART[116] = { main: '#5a8896', belly: '#ecdcae', acc: '#d8b66a', body: 'dragon', wing: 'dragon', horn: 'crystal', tail: 'lizard', mouth: 'fang', eye: 'fierce', rockBack: true, crystals: true, claws: true, iris: '#ffc84a' };

// ---- Smoldit line: magma salamander -----------------------------------------
D(117, 'Smoldit', ['Fire'], [42, 50, 40, 60, 44, 59], 225, 56, {
  evo: [17, 118], learn: [[1, 'Scratch'], [1, 'Growl'], [5, 'Ember'], [9, 'Quick Attack'], [13, 'Mud Shot'], [16, 'Magma Spit']],
  look: { stage: 1, form: 'round', feat: ['tail', 'legs', 'flame'] }, desc: 'A salamander whose spots glow like coals when it is excited.',
  habitat: [['ridge', 6, 10, 9]],
});
ART[117] = { main: '#d4503a', belly: '#ffb86a', acc: '#ffd860', tail: 'lizard', tailFlame: true, mouth: 'open', spots: '#ffd860', iris: '#7a2010', cheek: '#ff9a50' };
D(118, 'Magmaw', ['Fire', 'Ground'], [62, 76, 62, 86, 60, 64], 100, 142, {
  evo: [34, 119], learn: [[1, 'Scratch'], [1, 'Ember'], [1, 'Magma Spit'], [17, 'Mud Shot'], [22, 'Bite'], [27, 'Earth Pulse'], [32, 'Flamethrower']],
  look: { stage: 2, form: 'wide', feat: ['tail', 'legs', 'arms', 'spikes', 'flame'] }, desc: 'It wades through lava and shrugs off the heat like a bath.',
  habitat: [['ridge', 12, 12, 1]],
});
ART[118] = { main: '#b8402e', belly: '#ffa860', acc: '#3b2f35', tail: 'lizard', tailFlame: true, mouth: 'fang', rockBack: true, claws: true, spots: '#ffc850', iris: '#ffd060' };
D(119, 'Calderon', ['Fire', 'Ground'], [85, 92, 85, 125, 88, 50], 45, 238, {
  learn: [[1, 'Ember'], [1, 'Magma Spit'], [1, 'Earth Pulse'], [34, 'Flamethrower'], [38, 'Quake'], [44, 'Inferno Blast']],
  look: { stage: 3, form: 'wide', feat: ['tail', 'legs', 'arms', 'spikes', 'flame', 'horns'] }, desc: 'A crater sits on its back, and it erupts whenever it sneezes.',
});
ART[119] = { main: '#9c3a2e', belly: '#ff9a48', acc: '#ffb030', horn: 'rhino', tail: 'lizard', tailFlame: true, mouth: 'fang', eye: 'fierce', rockBack: true, smoke: true, claws: true, mane: true, iris: '#ffe070' };

// ---- Armidig line: armadillo miner ------------------------------------------
D(120, 'Armidig', ['Ground'], [48, 55, 70, 30, 40, 52], 230, 55, {
  evo: [20, 121], learn: [[1, 'Scratch'], [1, 'Harden'], [5, 'Mud Shot'], [10, 'Rock Throw'], [14, 'Slam'], [18, 'Brace']],
  look: { stage: 1, form: 'round', feat: ['ears', 'legs'] }, desc: 'A tiny miner that rolls into a ball whenever the roof creaks.',
  habitat: [['mine', 10, 13, 9], ['ridge', 7, 10, 4]],
});
ART[120] = { main: '#b89c84', belly: '#f4e4cc', acc: '#7b6a5a', ear: 'nub', shell: true, goggles: true, nose: true, paws: true, tail: 'none', mouth: 'smile', iris: '#4a3020', cheek: '#ff9aa0' };
D(121, 'Drillmail', ['Ground'], [66, 85, 95, 40, 55, 69], 100, 142, {
  evo: [36, 122], learn: [[1, 'Scratch'], [1, 'Mud Shot'], [1, 'Harden'], [20, 'Earth Pulse'], [24, 'Iron Bash'], [28, 'Slam'], [32, 'Brace']],
  look: { stage: 2, form: 'wide', feat: ['ears', 'legs', 'arms', 'horns'] }, desc: 'Its snout spins like a drill and bores a tunnel in a minute.',
  habitat: [['mine', 15, 16, 1]],
});
ART[121] = { main: '#a89684', belly: '#f0dcc0', acc: '#9aa5b5', ear: 'nub', horn: 'rhino', shell: true, armor: true, goggles: true, nose: true, claws: true, tail: 'none', mouth: 'fang', iris: '#3a3a4a' };
D(122, 'Bulwarmor', ['Ground', 'Steel'], [88, 115, 130, 45, 72, 70], 45, 232, {
  learn: [[1, 'Mud Shot'], [1, 'Steel Spin'], [1, 'Brace'], [36, 'Quake'], [40, 'Boulder Crash'], [44, 'Mighty Blow']],
  look: { stage: 3, form: 'wide', feat: ['ears', 'legs', 'arms', 'horns', 'spikes'] }, desc: 'A walking fortress whose plated shell no pickaxe can scratch.',
});
ART[122] = { main: '#8c8f9c', belly: '#e6dccb', acc: '#d4b468', ear: 'nub', horn: 'rhino', shell: true, shellSpikes: true, armor: true, gears: true, claws: true, tail: 'none', mouth: 'fang', eye: 'fierce', iris: '#ffcf60' };

// ---- Rivetle line: steel beetle ---------------------------------------------
D(123, 'Rivetle', ['Bug'], [40, 52, 65, 25, 40, 60], 235, 54, {
  evo: [16, 124], learn: [[1, 'Tackle'], [1, 'Harden'], [5, 'Bug Bite'], [9, 'Iron Bash'], [14, 'Gear Grind']],
  look: { stage: 1, form: 'wide', feat: ['antenna', 'legs'] }, desc: 'A little beetle studded with rivets that squeaks when it walks.',
  habitat: [['mine', 10, 13, 8]],
});
ART[123] = { main: '#8fa0b8', belly: '#dfe6f2', acc: '#5a6a88', body: 'beetle', horn: 'rhino', mouth: 'open', spots: '#ffb04a', iris: '#2a3a5a' };
D(124, 'Girderon', ['Bug', 'Steel'], [58, 82, 100, 38, 60, 72], 100, 140, {
  evo: [36, 125], learn: [[1, 'Tackle'], [1, 'Bug Bite'], [1, 'Iron Bash'], [18, 'Gear Grind'], [24, 'Cross Cut'], [30, 'Steel Spin']],
  look: { stage: 2, form: 'wide', feat: ['antenna', 'legs', 'arms', 'horns'] }, desc: 'Steel girders for horns let it lift boulders twice its size.',
});
ART[124] = { main: '#7a8caa', belly: '#d4dcec', acc: '#e08a3a', body: 'beetle', horn: 'twin', armor: true, mouth: 'fang', spots: '#ffb04a', claws: true, iris: '#a04a10' };
D(125, 'Forgehorn', ['Bug', 'Steel'], [78, 125, 125, 45, 75, 87], 45, 235, {
  learn: [[1, 'Bug Bite'], [1, 'Iron Bash'], [1, 'Gear Grind'], [36, 'Steel Spin'], [40, 'Swarm'], [44, 'Anvil Drop']],
  look: { stage: 3, form: 'wide', feat: ['antenna', 'legs', 'arms', 'horns', 'spikes'] }, desc: 'Its glowing horn is hot enough to weld iron rails together.',
});
ART[125] = { main: '#68789a', belly: '#c4cde0', acc: '#ff8a3a', body: 'beetle', horn: 'rhino', armor: true, gears: true, smoke: true, mouth: 'fang', eye: 'fierce', claws: true, spots: '#ff9a40', iris: '#ffb040' };
// ---- Snuffrost line: yeti cub -----------------------------------------------
D(126, 'Snuffrost', ['Ice'], [55, 48, 50, 42, 45, 50], 225, 56, {
  evo: [20, 127], learn: [[1, 'Tackle'], [1, 'Growl'], [5, 'Frost Nip'], [10, 'Jab'], [14, 'Harden'], [18, 'Hail Shard']],
  look: { stage: 1, form: 'round', feat: ['ears', 'arms', 'legs'] }, desc: 'A fluffy yeti cub whose sneezes leave little snowflakes behind.',
  habitat: [['ridge', 7, 11, 5], ['shore', 5, 9, 3]],
});
ART[126] = { main: '#e6f0f8', belly: '#bfe2f2', body: 'fluff', ear: 'bear', tail: 'puff', snowcap: true, mouth: 'open', iris: '#3a70a8', cheek: '#ffb0b8', face: '#cfe6f4' };
D(127, 'Rimeroar', ['Ice', 'Fighting'], [75, 85, 75, 55, 65, 58], 100, 146, {
  evo: [38, 128], learn: [[1, 'Tackle'], [1, 'Frost Nip'], [1, 'Jab'], [20, 'Palm Strike'], [25, 'Hail Shard'], [30, 'Pump Up'], [34, 'Glacier Beam']],
  look: { stage: 2, form: 'tall', feat: ['ears', 'arms', 'legs', 'horns'] }, desc: 'It beats its chest to start avalanches that scare off rivals.',
});
ART[127] = { main: '#d8e8f6', belly: '#a8d4ee', acc: '#5aa0d8', body: 'fluff', ear: 'bear', horn: 'crystal', icicles: true, fists: true, mouth: 'teeth', eye: 'fierce', iris: '#2a60a0', face: '#b8d8ee' };
D(128, 'Glacimaul', ['Ice', 'Fighting'], [100, 125, 95, 60, 85, 60], 45, 236, {
  learn: [[1, 'Frost Nip'], [1, 'Palm Strike'], [1, 'Pump Up'], [38, 'Glacier Beam'], [42, 'Mighty Blow'], [46, 'Glacier Crush']],
  look: { stage: 3, form: 'tall', feat: ['ears', 'arms', 'legs', 'horns', 'spikes'] }, desc: 'The great yeti of the high pass. Its roar can bring down a glacier.',
});
ART[128] = { main: '#cfe2f2', belly: '#9ccbe8', acc: '#3f88cf', body: 'fluff', ear: 'bear', horn: 'crystal', icicles: true, fists: true, tusks: true, mouth: 'fang', eye: 'fierce', claws: true, iris: '#1f4f95', face: '#a8cfe8' };

// ---- Prismel line: crystal fox ----------------------------------------------
D(129, 'Prismel', ['Rock'], [40, 40, 52, 60, 52, 56], 220, 58, {
  evo: [18, 130], learn: [[1, 'Tackle'], [1, 'Tail Whip'], [5, 'Rock Throw'], [9, 'Quick Attack'], [14, 'Glimmer'], [17, 'Mind Spike']],
  look: { stage: 1, form: 'round', feat: ['ears', 'tail'] }, desc: 'A fox cub with a tiny gem on its brow that sparkles in the dark.',
  habitat: [['mine', 10, 14, 7]],
});
ART[129] = { main: '#b79ae0', belly: '#f4eaff', acc: '#7be0d8', ear: 'fox', tail: 'fluff', crystals: true, gem: true, mouth: 'cat', iris: '#5a3a9a', cheek: '#ff9ac8' };
D(130, 'Prismox', ['Rock', 'Fairy'], [58, 56, 72, 85, 78, 70], 100, 148, {
  evo: [36, 131], learn: [[1, 'Tackle'], [1, 'Rock Throw'], [1, 'Glimmer'], [20, 'Rock Slide'], [24, 'Psybeam'], [28, 'Quick Attack'], [32, 'Moonbeam']],
  look: { stage: 2, form: 'tall', feat: ['ears', 'tail', 'legs', 'arms'] }, desc: 'Crystal shards grow along its tail and ring like bells when it runs.',
});
ART[130] = { main: '#a88ad8', belly: '#f0e4ff', acc: '#6fe0d4', ear: 'fox', tail: 'fluff', crystals: true, gem: true, sparkles: true, mouth: 'cat', iris: '#4a2a8a', eyeAsp: 1.2 };
D(131, 'Prismantle', ['Rock', 'Fairy'], [75, 65, 95, 118, 108, 64], 45, 238, {
  learn: [[1, 'Rock Throw'], [1, 'Glimmer'], [1, 'Moonbeam'], [36, 'Boulder Crash'], [40, 'Psychic'], [44, 'Starfall']],
  look: { stage: 3, form: 'tall', feat: ['ears', 'tail', 'legs', 'arms', 'horns'] }, desc: 'Nine crystal tails splash rainbow light across the cave walls.',
});
ART[131] = { main: '#9878d0', belly: '#ece0ff', acc: '#5fe8d8', ear: 'fox', tail: 'fluff', horn: 'crystal', crystals: true, gem: true, sparkles: true, mouth: 'cat', eye: 'star', iris: '#ff7ad0' };

// ---- Ashell line: lava turtle -----------------------------------------------
D(132, 'Ashell', ['Fire'], [50, 45, 62, 52, 45, 36], 230, 55, {
  evo: [18, 133], learn: [[1, 'Tackle'], [1, 'Harden'], [5, 'Ember'], [9, 'Rock Throw'], [14, 'Magma Spit'], [17, 'Brace']],
  look: { stage: 1, form: 'round', feat: ['legs', 'tail', 'flame'] }, desc: 'A turtle with a cooled-lava shell, still warm as a hearth stone.',
  habitat: [['ridge', 7, 11, 6], ['shore', 5, 9, 4]],
});
ART[132] = { main: '#7a5e52', belly: '#f2dcb0', acc: '#ff7a2e', shell: true, flipper: true, tail: 'lizard', tailFlame: true, mouth: 'smile', iris: '#4a2a1a', cheek: '#ff9a50' };
D(133, 'Cindershell', ['Fire', 'Rock'], [70, 65, 95, 76, 70, 40], 100, 144, {
  evo: [36, 134], learn: [[1, 'Tackle'], [1, 'Ember'], [1, 'Magma Spit'], [18, 'Rock Slide'], [24, 'Brace'], [30, 'Flamethrower']],
  look: { stage: 2, form: 'wide', feat: ['legs', 'tail', 'arms', 'flame', 'spikes'] }, desc: 'Embers glow in the cracks of its shell and light its way underground.',
});
ART[133] = { main: '#6a5048', belly: '#f0d4a0', acc: '#ff6a24', shell: true, shellSpikes: true, flipper: true, tail: 'lizard', tailFlame: true, mouth: 'fang', smoke: true, iris: '#ffa040' };
D(134, 'Volcashell', ['Fire', 'Rock'], [95, 85, 130, 100, 90, 25], 45, 240, {
  learn: [[1, 'Ember'], [1, 'Rock Slide'], [1, 'Brace'], [36, 'Flamethrower'], [40, 'Boulder Crash'], [44, 'Inferno Blast']],
  look: { stage: 3, form: 'wide', feat: ['legs', 'tail', 'arms', 'flame', 'spikes', 'horns'] }, desc: 'It carries a live volcano on its back and naps beside warm springs.',
});
ART[134] = { main: '#5a4440', belly: '#ecc890', acc: '#ff5a1e', horn: 'rock', shell: true, shellSpikes: true, rockBack: true, flipper: true, tail: 'lizard', tailFlame: true, mouth: 'fang', eye: 'fierce', smoke: true, crystals: true, iris: '#ffd050' };

// ---- Two-stage lines ---------------------------------------------------------
D(135, 'Cogglet', ['Steel'], [45, 50, 65, 45, 50, 40], 190, 60, {
  evo: [22, 136], learn: [[1, 'Tackle'], [1, 'Harden'], [6, 'Iron Bash'], [11, 'Thunder Shock'], [16, 'Gear Grind'], [20, 'Brace']],
  look: { stage: 1, form: 'round', feat: ['arms', 'legs', 'antenna'] }, desc: 'A wind-up miner bot that hums a tune while it polishes ore.',
  habitat: [['mine', 11, 15, 8]],
});
ART[135] = { main: '#9fb2c4', belly: null, acc: '#e8a33a', ear: 'nub', gears: true, eye: 'round', mouth: 'smile', fists: true, iris: '#2a5a8a', cheek: '#ff9a70' };
D(136, 'Gearhulk', ['Steel', 'Electric'], [70, 85, 100, 80, 70, 50], 90, 165, {
  learn: [[1, 'Tackle'], [1, 'Iron Bash'], [1, 'Thunder Shock'], [22, 'Steel Spin'], [26, 'Thunder Wave'], [30, 'Thunderbolt'], [34, 'Brace']],
  look: { stage: 2, form: 'tall', feat: ['arms', 'legs', 'antenna', 'bolt'] }, desc: 'A hulking mining robot powered by a humming lightning core.',
  habitat: [['mine', 15, 16, 1]],
});
ART[136] = { main: '#8a9cb4', belly: null, acc: '#f0c030', body: 'golem', ear: 'spark', tail: 'bolt', boltCol: '#5ac8ff', gears: true, armor: true, eye: 'glow', mouth: 'grin', fists: true, iris: '#7adfff' };

D(137, 'Scrambit', ['Fighting'], [48, 62, 45, 30, 40, 65], 215, 58, {
  evo: [22, 138], learn: [[1, 'Scratch'], [1, 'Growl'], [5, 'Jab'], [10, 'Quick Attack'], [15, 'Palm Strike'], [20, 'Pump Up']],
  look: { stage: 1, form: 'round', feat: ['horns', 'legs', 'ears'] }, desc: 'A mountain kid that headbutts anything blocking the trail.',
  habitat: [['ridge', 6, 11, 9]],
});
ART[137] = { main: '#d8c29c', belly: '#fff1d8', acc: '#6a5a48', ear: 'droopy', horn: 'ram', tail: 'puff', tuft: true, paws: true, fists: true, mouth: 'cheeky', iris: '#5a3a1a', cheek: '#ffa890' };
D(138, 'Ramblast', ['Fighting', 'Rock'], [80, 115, 80, 45, 60, 75], 90, 168, {
  learn: [[1, 'Scratch'], [1, 'Jab'], [1, 'Palm Strike'], [22, 'Rock Slide'], [26, 'Pump Up'], [32, 'Mighty Blow']],
  look: { stage: 2, form: 'tall', feat: ['horns', 'legs', 'arms', 'ears'] }, desc: 'The boss of the cliffs. It settles every dispute with a head-on charge.',
  habitat: [['ridge', 12, 12, 1]],
});
ART[138] = { main: '#bfa47a', belly: '#f2e0bc', acc: '#3a3a50', ear: 'droopy', horn: 'ram', ruff: true, claws: true, fists: true, backStripes: true, mouth: 'teeth', eye: 'fierce', rockBack: true, iris: '#c83a2a' };

D(139, 'Flurrow', ['Ice', 'Flying'], [42, 40, 38, 60, 50, 70], 200, 60, {
  evo: [24, 140], learn: [[1, 'Peck'], [1, 'Growl'], [5, 'Frost Nip'], [9, 'Gust'], [15, 'Hail Shard'], [20, 'Wing Attack']],
  look: { stage: 1, form: 'round', feat: ['wings', 'tail'] }, desc: 'A snowy owlet that glides silently through falling flurries.',
  habitat: [['shore', 5, 10, 6], ['ridge', 8, 12, 3]],
});
ART[139] = { main: '#d4e8f6', belly: '#ffffff', acc: '#6fb5e0', body: 'bird', wing: 'ice', tail: 'feather', tuft3: true, mouth: 'beak', eye: 'round', birdFeet: true, iris: '#2a6aa8', cheek: '#ffb0c0' };
D(140, 'Hoarowl', ['Ice', 'Flying'], [72, 70, 65, 105, 85, 68], 75, 170, {
  learn: [[1, 'Peck'], [1, 'Frost Nip'], [1, 'Wing Attack'], [24, 'Hail Shard'], [28, 'Air Slash'], [34, 'Glacier Beam']],
  look: { stage: 2, form: 'tall', feat: ['wings', 'tail', 'horns'] }, desc: 'Its wingbeats whip up blizzards. Sleet hangs from its feathers like lace.',
});
ART[140] = { main: '#c4def0', belly: '#ffffff', acc: '#4f9fd8', body: 'bird', wing: 'ice', tail: 'feather', horn: 'crest', snowcap: true, icicles: true, mouth: 'beak', hook: true, eye: 'fierce', birdFeet: true, iris: '#ffd040' };

D(141, 'Stalabat', ['Rock', 'Flying'], [45, 50, 50, 35, 45, 65], 210, 56, {
  evo: [22, 142], learn: [[1, 'Tackle'], [1, 'Gust'], [5, 'Rock Throw'], [10, 'Bite'], [15, 'Wing Attack'], [19, 'Harden']],
  look: { stage: 1, form: 'round', feat: ['wings', 'ears'] }, desc: 'A cave bat that hangs from stalactites and pretends to be one.',
  habitat: [['mine', 10, 15, 9]],
});
ART[141] = { main: '#8a7a96', belly: '#d9ccb8', acc: '#c9b46a', wing: 'bat', ear: 'fox', mouth: 'fang', iris: '#d8a020', float: true, crystals: true };
D(142, 'Grottowing', ['Rock', 'Flying'], [75, 85, 85, 55, 70, 95], 80, 168, {
  learn: [[1, 'Tackle'], [1, 'Rock Throw'], [1, 'Wing Attack'], [22, 'Rock Slide'], [26, 'Crunch'], [30, 'Air Slash']],
  look: { stage: 2, form: 'tall', feat: ['wings', 'ears', 'horns', 'spikes'] }, desc: 'Its huge wings can sweep a whole tunnel clear of dust and rival bats.',
  habitat: [['mine', 15, 16, 1]],
});
ART[142] = { main: '#6e5f82', belly: '#cbbda4', acc: '#d4bc6a', wing: 'bat', ear: 'fox', horn: 'rock', mouth: 'fang', eye: 'glow', crystals: true, iris: '#ffd860', float: true, ruff: true };

D(143, 'Gritsting', ['Ground'], [42, 58, 50, 35, 40, 60], 205, 56, {
  evo: [20, 144], learn: [[1, 'Scratch'], [1, 'Tail Whip'], [5, 'Mud Shot'], [10, 'Poison Sting'], [15, 'Earth Pulse'], [19, 'Bite']],
  look: { stage: 1, form: 'wide', feat: ['tail', 'legs', 'arms'] }, desc: 'A sand scorpion that buries itself with only its tiny stinger showing.',
  habitat: [['shore', 5, 9, 6], ['ridge', 6, 10, 4]],
});
ART[143] = { main: '#e0b870', belly: '#f8e4b8', acc: '#a8643a', tail: 'stinger', claws: true, hook: true, mouth: 'open', iris: '#6a3a10', spots: '#c8863a' };
D(144, 'Scythetail', ['Ground', 'Poison'], [70, 110, 80, 50, 60, 85], 75, 172, {
  learn: [[1, 'Scratch'], [1, 'Mud Shot'], [1, 'Poison Sting'], [24, 'Sludge'], [28, 'Earth Pulse'], [32, 'Toxic Spray']],
  look: { stage: 2, form: 'wide', feat: ['tail', 'legs', 'arms', 'spikes', 'horns'] }, desc: 'Its scythe-shaped tail carves canyons and drips a sleepy venom.',
});
ART[144] = { main: '#c89a58', belly: '#f0d8a4', acc: '#9a5ab0', horn: 'dark', tail: 'stinger', claws: true, hook: true, armor: true, mouth: 'fang', eye: 'fierce', bugStripes: true, iris: '#d040e0' };

D(145, 'Coalpaw', ['Fire'], [55, 60, 50, 45, 45, 40], 195, 60, {
  evo: [24, 146], learn: [[1, 'Scratch'], [1, 'Growl'], [5, 'Ember'], [10, 'Bite'], [15, 'Magma Spit'], [20, 'Slam']],
  look: { stage: 1, form: 'round', feat: ['ears', 'legs', 'arms'] }, desc: 'A sooty bear cub whose belly glows orange when it is happy.',
  habitat: [['ridge', 7, 12, 6], ['mirewood', 7, 11, 3]],
});
ART[145] = { main: '#4a3a40', belly: '#ff9a50', acc: '#ff7a2e', ear: 'bear', tail: 'puff', stubTail: true, paws: true, smoke: true, mouth: 'cheeky', iris: '#ffa040', cheek: '#ff7a50' };
D(146, 'Coalbruin', ['Fire', 'Fighting'], [90, 115, 80, 60, 70, 50], 75, 175, {
  learn: [[1, 'Scratch'], [1, 'Ember'], [1, 'Bite'], [24, 'Palm Strike'], [28, 'Flamethrower'], [32, 'Mighty Blow']],
  look: { stage: 2, form: 'tall', feat: ['ears', 'legs', 'arms', 'flame'] }, desc: 'A furnace-hot brawler that smelts ore bare-pawed and loves to wrestle.',
  habitat: [['ridge', 12, 12, 1]],
});
ART[146] = { main: '#3e2f36', belly: '#ff8a40', acc: '#ff6a24', ear: 'bear', tail: 'flame', tailFlame: true, fists: true, claws: true, ruff: true, smoke: true, mouth: 'teeth', eye: 'fierce', iris: '#ffc040' };

D(147, 'Sleetling', ['Ice'], [40, 45, 40, 62, 50, 55], 210, 58, {
  evo: [26, 148], learn: [[1, 'Tackle'], [1, 'Frost Nip'], [5, 'Drake Breath'], [10, 'Water Gun'], [15, 'Hail Shard'], [22, 'Lullaby']],
  look: { stage: 1, form: 'round', feat: ['fin'] }, desc: 'A frosty little snake that coils up in snowbanks to doze.',
  habitat: [['shore', 5, 10, 5], ['mirewood', 8, 12, 3]],
});
ART[147] = { main: '#8fd0e8', belly: '#f4fcff', acc: '#3a78c8', body: 'serpent', fin: 'head', icicles: true, tail: 'none', mouth: 'smile', eye: 'round', iris: '#2a5aa8', cheek: '#ffb0c8' };
D(148, 'Sleetcoil', ['Ice', 'Dragon'], [68, 70, 70, 110, 80, 72], 75, 172, {
  learn: [[1, 'Frost Nip'], [1, 'Drake Breath'], [1, 'Hail Shard'], [26, 'Wyrm Claw'], [30, 'Glacier Beam'], [36, 'Sky Roar']],
  look: { stage: 2, form: 'tall', feat: ['wings', 'horns', 'fin', 'fangs'] }, desc: 'A sky-serpent whose frozen breath turns clouds into hail.',
});
ART[148] = { main: '#6fb8e0', belly: '#e8f8ff', acc: '#2f5ec0', body: 'serpent', wing: 'ice', horn: 'crystal', fin: 'crest', icicles: true, tail: 'none', mouth: 'fang', eye: 'fierce', iris: '#ffe060' };

D(149, 'Rustpup', ['Steel'], [48, 58, 55, 35, 40, 64], 215, 58, {
  evo: [22, 150], learn: [[1, 'Tackle'], [1, 'Growl'], [5, 'Iron Bash'], [10, 'Bite'], [15, 'Quick Attack'], [20, 'Gear Grind']],
  look: { stage: 1, form: 'round', feat: ['ears', 'tail', 'legs'] }, desc: 'A scrapyard puppy with a coat of iron flakes. It squeaks when it wags.',
  habitat: [['mine', 10, 14, 6], ['sunmeadow', 4, 8, 3]],
});
ART[149] = { main: '#a8a8b8', belly: '#e6dccd', acc: '#b8683a', ear: 'droopy', tail: 'curl', collar: true, nose: true, spots: '#c4703a', mouth: 'open', iris: '#4a3a2a', cheek: '#ffa090' };
D(150, 'Rusthound', ['Steel', 'Dark'], [75, 100, 90, 50, 65, 85], 80, 170, {
  learn: [[1, 'Tackle'], [1, 'Iron Bash'], [1, 'Bite'], [24, 'Gear Grind'], [28, 'Crunch'], [32, 'Steel Spin'], [36, 'Dusk Fang']],
  look: { stage: 2, form: 'tall', feat: ['ears', 'tail', 'legs', 'arms', 'spikes'] }, desc: 'A guard hound in iron plates. It growls like a rusty hinge.',
});
ART[150] = { main: '#8a8aa0', belly: '#d4c8bc', acc: '#4a4a62', ear: 'fox', tail: 'curl', collar: true, armor: true, claws: true, mouth: 'fang', eye: 'fierce', spots: '#b8683a', iris: '#ff5a4a' };

// ---- Singles -----------------------------------------------------------------
D(151, 'Cairnwight', ['Rock', 'Ghost'], [70, 70, 90, 95, 95, 50], 75, 160, {
  learn: [[1, 'Lick'], [1, 'Rock Throw'], [8, 'Harden'], [14, 'Shadow Claw'], [20, 'Rock Slide'], [27, 'Mind Spike'], [34, 'Phantom Rush']],
  look: { stage: 2, form: 'tall', feat: ['arms'] }, desc: 'A spirit that stacks itself like a trail marker to guide lost hikers.',
  habitat: [['mine', 12, 16, 4], ['mirewood', 9, 13, 3]],
});
ART[151] = { main: '#9a9aa6', belly: null, acc: '#8a62d8', body: 'golem', eye: 'glow', mouth: 'wisp', stars: true, float: true, iris: '#b8a0ff', cheeks: false };
D(152, 'Tuskalanche', ['Ice', 'Ground'], [105, 110, 90, 55, 70, 40], 60, 165, {
  learn: [[1, 'Tackle'], [1, 'Frost Nip'], [1, 'Mud Shot'], [12, 'Hail Shard'], [20, 'Earth Pulse'], [28, 'Slam'], [34, 'Glacier Beam'], [40, 'Quake']],
  look: { stage: 2, form: 'wide', feat: ['ears', 'tail', 'legs', 'horns'] }, desc: 'A snow mammoth. Where it stomps, avalanches roll down the slopes.',
  habitat: [['ridge', 9, 12, 3], ['mine', 13, 16, 3]],
});
ART[152] = { main: '#a58f7e', belly: '#d8c8b4', acc: '#f4f0e0', ear: 'droopy', tail: 'puff', tusks: true, nose: true, snowcap: true, icicles: true, eye: 'sleepy', mouth: 'smile', iris: '#4a3020', body: 'fluff' };

// ---- Legendaries -------------------------------------------------------------
D(153, 'Aurodrax', ['Dragon', 'Fire'], [90, 110, 85, 125, 90, 95], 20, 260, {
  learn: [[1, 'Wyrm Claw'], [1, 'Flamethrower'], [1, 'Drake Breath'], [30, 'Sky Dive'], [38, 'Dawnfire'], [46, 'Sky Roar']],
  look: { stage: 3, form: 'tall', feat: ['wings', 'tail', 'horns', 'legs', 'arms', 'flame', 'fangs'] }, desc: 'The dawn dragon. Mountain peaks blush gold wherever it flies.',
  habitat: [['ridge', 15, 16, 1]],
});
ART[153] = { main: '#f5a05a', belly: '#ffe6a0', acc: '#e8506a', body: 'dragon', wing: 'dragon', horn: 'crystal', tail: 'lizard', tailFlame: true, halo: true, sparkles: true, mouth: 'fang', eye: 'fierce', claws: true, mane: true, iris: '#fff0a0' };
D(154, 'Glacitan', ['Ice', 'Rock'], [120, 115, 140, 90, 100, 20], 20, 262, {
  learn: [[1, 'Hail Shard'], [1, 'Rock Slide'], [1, 'Brace'], [30, 'Glacier Beam'], [38, 'Glacier Crush'], [46, 'Boulder Crash']],
  look: { stage: 3, form: 'wide', feat: ['arms', 'legs', 'horns', 'spikes'] }, desc: 'A glacier titan that sleeps for a thousand winters at a time.',
  habitat: [['shore', 15, 16, 1]],
});
ART[154] = { main: '#9ad4ec', belly: null, acc: '#e8f8ff', body: 'golem', horn: 'crystal', icicles: true, crystals: true, snowcap: true, fists: true, armor: true, eye: 'glow', mouth: 'grin', iris: '#ffffff' };
D(155, 'Anvilord', ['Steel', 'Fire'], [100, 135, 130, 80, 95, 45], 20, 262, {
  learn: [[1, 'Iron Bash'], [1, 'Ember'], [1, 'Brace'], [30, 'Steel Spin'], [38, 'Anvil Drop'], [46, 'Inferno Blast']],
  look: { stage: 3, form: 'tall', feat: ['arms', 'legs', 'horns', 'flame'] }, desc: 'The forge golem. It hammers the mountain roots and sparks fly for miles.',
  habitat: [['mine', 15, 16, 1]],
});
ART[155] = { main: '#6a6e7e', belly: null, acc: '#ff8a2a', body: 'golem', horn: 'twin', gears: true, armor: true, crown: true, smoke: true, fists: true, eye: 'glow', mouth: 'grin', iris: '#ffb040' };
D(156, 'Starveil', ['Ghost', 'Fairy'], [85, 70, 90, 130, 120, 95], 20, 262, {
  learn: [[1, 'Glimmer'], [1, 'Shadow Claw'], [1, 'Confusion'], [30, 'Phantom Rush'], [38, 'Starfall'], [46, 'Moonbeam']],
  look: { stage: 3, form: 'tall', feat: ['wings', 'horns', 'tail'] }, desc: 'A starlit spirit draped in night. It drifts above the marsh on moonless nights.',
  habitat: [['mirewood', 15, 16, 1]],
});
ART[156] = { main: '#4a3f8a', belly: '#9a8ae8', acc: '#ffe27a', body: 'wisp', wing: 'fairy', horn: 'moon', tail: 'feather', stars: true, halo: true, sparkles: true, scarf: true, mouth: 'wisp', eye: 'star', float: true, iris: '#ffe27a' };
})();
