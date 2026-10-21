// Species pack a: ids 26-69, "Meadow and shore life" (see docs/CREATURES.md).
(function () {
const G = globalThis.G, D = G.defineSpecies, ART = G.CREATURE_ART;

// ---- New moves ------------------------------------------------------------
G.defineMove('Petal Gust', 'Grass', 50, 100, 25);
G.defineMove('Dew Drop', 'Water', 50, 100, 25);
G.defineMove('Tide Roll', 'Water', 75, 100, 15);
G.defineMove('Buzz Jab', 'Bug', 40, 100, 30);
G.defineMove('Pinch Snap', 'Normal', 55, 100, 25);
G.defineMove('Fluff Up', 'Normal', 0, 100, 20, { stat: ['def', 2], self: true });

// ---- Dandelion drifters (26-28) -------------------------------------------
D(26, 'Dandrop', ['Grass'], [42, 36, 40, 56, 50, 66], 235, 55, {
  evo: [16, 27],
  learn: [[1, 'Tackle'], [1, 'Growl'], [5, 'Gust'], [8, 'Petal Gust'], [12, 'Sleep Powder'], [15, 'Razor Leaf']],
  look: { stage: 1, form: 'round', feat: ['leaf', 'tail'] },
  desc: 'A dandelion puff that drifts on every breeze and never lands twice in a row.',
  habitat: [['sunmeadow', 3, 7, 10]],
});
ART[26] = { main: '#fbeeb0', belly: '#fffdf0', acc: '#7ccf5a', body: 'fluff', leaf: 'sprout', tail: 'puff', mouth: 'open', eye: 'round', float: true, tuft3: true, cheek: '#ffb0a0', iris: '#a07a20' };
D(27, 'Driftuft', ['Grass', 'Flying'], [60, 50, 58, 76, 72, 86], 100, 140, {
  evo: [34, 28],
  learn: [[1, 'Gust'], [1, 'Petal Gust'], [1, 'Sleep Powder'], [16, 'Razor Leaf'], [22, 'Air Slash'], [28, 'Seed Burst']],
  look: { stage: 2, form: 'round', feat: ['leaf', 'wings', 'tail'] },
  desc: 'Leafy wings carry its cloud of seeds over whole valleys.',
  habitat: [['sunmeadow', 8, 9, 1]],
});
ART[27] = { main: '#fff2c0', belly: '#fffdf0', acc: '#8fd860', body: 'fluff', leaf: 'sprout', wing: 'leaf', tail: 'puff', mouth: 'smile', eye: 'happy', float: true, tuft3: true, sparkles: true, cheek: '#ffa890', iris: '#7a8a20' };
D(28, 'Zephbloom', ['Grass', 'Flying'], [78, 64, 74, 112, 98, 108], 45, 235, {
  learn: [[1, 'Petal Gust'], [1, 'Air Slash'], [1, 'Sleep Powder'], [30, 'Seed Burst'], [34, 'Petal Blast'], [42, 'Sky Dive']],
  look: { stage: 3, form: 'tall', feat: ['leaf', 'wings', 'tail', 'arms'] },
  desc: 'A queen of the breeze. Her seed-cloud crown sows meadows wherever she flies.',
});
ART[28] = { main: '#fffbe6', belly: '#fff6d8', acc: '#6fcf68', body: 'fluff', leaf: 'tree', wing: 'leaf', tail: 'puff', mouth: 'smile', eye: 'star', float: true, flowerCrown: true, petals: true, sparkles: true, halo: true, ruff: true, cheek: '#ffa0a0', iris: '#58a838' };

// ---- Ladybug knights (29-31) ----------------------------------------------
D(29, 'Spotlet', ['Bug'], [44, 50, 58, 34, 40, 54], 235, 55, {
  evo: [18, 30],
  learn: [[1, 'Tackle'], [1, 'Harden'], [4, 'Buzz Jab'], [8, 'Bug Bite'], [12, 'Quick Attack'], [16, 'Cross Cut']],
  look: { stage: 1, form: 'wide', feat: ['antenna', 'legs'] },
  desc: 'A tiny red ladybug. It counts its spots every morning and is proud of all six.',
  habitat: [['sunmeadow', 3, 7, 8], ['mirewood', 6, 9, 4]],
});
ART[29] = { main: '#e8402e', belly: '#2a2030', acc: '#2a2030', body: 'beetle', spots: '#2a2030', mouth: 'smile', eye: 'round', iris: '#401818', cheek: '#ff9a8a' };
D(30, 'Scutarm', ['Bug', 'Steel'], [62, 80, 98, 44, 70, 56], 100, 140, {
  evo: [34, 31],
  learn: [[1, 'Bug Bite'], [1, 'Harden'], [1, 'Buzz Jab'], [18, 'Iron Bash'], [22, 'Cross Cut'], [26, 'Brace']],
  look: { stage: 2, form: 'wide', feat: ['antenna', 'legs', 'arms', 'horns'] },
  desc: 'It wears a polished shield-shell and guards flower beds like a tiny knight.',
  habitat: [['mirewood', 11, 13, 1]],
});
ART[30] = { main: '#d83a30', belly: '#2a2030', acc: '#a8b2c8', body: 'beetle', horn: 'crest', armor: true, spots: '#2a2030', mouth: 'smile', eye: 'normal', iris: '#401818', claws: true };
D(31, 'Coccarch', ['Bug', 'Steel'], [80, 106, 128, 56, 92, 68], 45, 235, {
  learn: [[1, 'Bug Bite'], [1, 'Iron Bash'], [1, 'Brace'], [30, 'Cross Cut'], [34, 'Steel Spin'], [40, 'Swarm']],
  look: { stage: 3, form: 'wide', feat: ['antenna', 'legs', 'arms', 'horns', 'spikes'] },
  desc: 'The Ladybug Lord. Its crimson plate has never been dented in a hundred duels.',
});
ART[31] = { main: '#c42a3a', belly: '#2a2030', acc: '#d4dbe8', body: 'beetle', horn: 'rhino', armor: true, crown: true, scarf: true, shellSpikes: true, spots: '#2a2030', mouth: 'fang', eye: 'fierce', iris: '#ffd040', claws: true, fists: true };

// ---- Sea otters (32-34) -----------------------------------------------------
D(32, 'Bobotter', ['Water'], [46, 42, 44, 52, 50, 56], 235, 55, {
  evo: [16, 33],
  learn: [[1, 'Tackle'], [1, 'Tail Whip'], [4, 'Water Gun'], [8, 'Dew Drop'], [11, 'Quick Attack'], [15, 'Bite']],
  look: { stage: 1, form: 'round', feat: ['ears', 'tail'] },
  desc: 'It floats on its back and cracks shells on its belly. It holds hands when it naps.',
  habitat: [['shore', 4, 8, 9]],
});
ART[32] = { main: '#9a7452', belly: '#e8d2a8', ear: 'nub', tail: 'club', whiskers: true, nose: true, paws: true, mouth: 'smile', eye: 'round', bubbles: true, cheek: '#ffa090', iris: '#3a2a20' };
D(33, 'Raftotter', ['Water', 'Normal'], [70, 70, 66, 70, 72, 64], 100, 140, {
  evo: [34, 34],
  learn: [[1, 'Water Gun'], [1, 'Dew Drop'], [1, 'Quick Attack'], [18, 'Bubble Beam'], [24, 'Belly Flop'], [28, 'Tide Roll']],
  look: { stage: 2, form: 'round', feat: ['ears', 'tail', 'arms', 'legs'] },
  desc: 'Whole families link paws and drift in a raft. The strongest paddles at the front.',
  habitat: [['shore', 9, 10, 1]],
});
ART[33] = { main: '#7e5a3c', belly: '#ecd6ae', acc: '#4aa0e0', ear: 'nub', tail: 'club', whiskers: true, nose: true, paws: true, scarf: true, flipper: true, mouth: 'open', eye: 'normal', bubbles: true, cheek: '#ff9a88', iris: '#2a1a10' };
D(34, 'Reefotter', ['Water', 'Fighting'], [90, 84, 84, 100, 100, 74], 45, 235, {
  learn: [[1, 'Bubble Beam'], [1, 'Jab'], [1, 'Tide Roll'], [28, 'Palm Strike'], [32, 'Surf'], [38, 'Mighty Blow']],
  look: { stage: 3, form: 'tall', feat: ['ears', 'tail', 'arms', 'legs'] },
  desc: 'The guardian of the reef. It tosses boulders at storms and tucks pups in coral.',
});
ART[34] = { main: '#5e6e8a', belly: '#f2e6c8', acc: '#e8c060', ear: 'nub', tail: 'club', whiskers: true, nose: true, scarf: true, fists: true, gem: true, tusks: true, mouth: 'fang', eye: 'fierce', bubbles: true, cheek: '#ff9a88', iris: '#ffd040', ruff: true };

// ---- Snowy owls (35-37) ---------------------------------------------------
D(35, 'Hushling', ['Normal', 'Flying'], [50, 40, 42, 46, 46, 62], 230, 55, {
  evo: [18, 36],
  learn: [[1, 'Peck'], [1, 'Growl'], [5, 'Gust'], [9, 'Quick Attack'], [13, 'Frost Nip'], [16, 'Wing Attack']],
  look: { stage: 1, form: 'round', feat: ['wings', 'tail'] },
  desc: 'A fluffy owlet that glides without a sound. It blinks very, very slowly.',
  habitat: [['ridge', 6, 10, 8], ['sunmeadow', 4, 8, 3]],
});
ART[35] = { main: '#f4f0f2', belly: '#fffaf6', acc: '#b8b0c4', body: 'bird', wing: 'bird', tail: 'feather', mouth: 'beak', eye: 'round', eyeR: .14, iris: '#ffc030', birdFeet: true, tuft3: true, cheek: '#ffc0c0' };
D(36, 'Snowhoot', ['Ice', 'Flying'], [66, 60, 60, 84, 70, 72], 100, 140, {
  evo: [34, 37],
  learn: [[1, 'Peck'], [1, 'Gust'], [1, 'Frost Nip'], [20, 'Wing Attack'], [24, 'Hail Shard'], [28, 'Air Slash']],
  look: { stage: 2, form: 'round', feat: ['wings', 'tail', 'ears'] },
  desc: 'Frost glitters on its feathers. Its hoot makes snow fall softly.',
  habitat: [['ridge', 11, 12, 1]],
});
ART[36] = { main: '#e4eefa', belly: '#fbfdff', acc: '#7ab8ec', body: 'bird', wing: 'ice', tail: 'feather', ear: 'cat', mouth: 'beak', eye: 'round', eyeR: .14, iris: '#ffc030', birdFeet: true, hook: true, snowcap: true, cheek: '#b8d8ff' };
D(37, 'Aurowl', ['Ice', 'Flying'], [84, 78, 76, 120, 100, 76], 45, 235, {
  learn: [[1, 'Hail Shard'], [1, 'Air Slash'], [1, 'Frost Nip'], [30, 'Glacier Beam'], [34, 'Psybeam'], [40, 'Sky Dive']],
  look: { stage: 3, form: 'tall', feat: ['wings', 'tail', 'ears', 'horns'] },
  desc: 'On clear winter nights its wings paint ribbons of light across the sky.',
});
ART[37] = { main: '#d8ecff', belly: '#f8fcff', acc: '#6aa8e8', body: 'bird', wing: 'ice', tail: 'feather', ear: 'cat', horn: 'crystal', mouth: 'beak', eye: 'fierce', eyeR: .13, iris: '#ffd040', birdFeet: true, hook: true, icicles: true, halo: true, sparkles: true, ruff: true, boltCol: '#8ad8ff' };

// ---- Leaf hedgehogs (38-40) ---------------------------------------------
D(38, 'Burrkin', ['Grass'], [54, 50, 56, 36, 40, 44], 235, 55, {
  evo: [16, 39],
  learn: [[1, 'Tackle'], [1, 'Harden'], [4, 'Vine Whip'], [8, 'Petal Gust'], [12, 'Razor Leaf'], [15, 'Quick Attack']],
  look: { stage: 1, form: 'round', feat: ['ears', 'spikes'] },
  desc: 'It curls into a prickly burr when scared. Its little leaf spines tickle.',
  habitat: [['sunmeadow', 3, 8, 9], ['mirewood', 7, 10, 4]],
});
ART[38] = { main: '#c49a68', belly: '#f4dfb8', acc: '#6fbf4a', ear: 'nub', leaf: 'sprout', thorns: true, nose: true, paws: true, mouth: 'smile', eye: 'round', cheek: '#ff9a88', iris: '#3a2a18' };
D(39, 'Spindrel', ['Grass'], [74, 84, 84, 46, 58, 64], 100, 140, {
  evo: [33, 40],
  learn: [[1, 'Vine Whip'], [1, 'Harden'], [1, 'Petal Gust'], [16, 'Razor Leaf'], [20, 'Jab'], [26, 'Seed Burst']],
  look: { stage: 2, form: 'round', feat: ['ears', 'spikes', 'legs', 'arms'] },
  desc: 'A forest of sharp green leaves covers its back. It rolls downhill at top speed.',
  habitat: [['mirewood', 12, 13, 1]],
});
ART[39] = { main: '#aa7c52', belly: '#f0d8aa', acc: '#58b848', ear: 'nub', leaf: 'hood', thorns: true, nose: true, paws: true, claws: true, mouth: 'open', eye: 'normal', iris: '#3a2a18', cheek: '#ff9a88' };
D(40, 'Briarhog', ['Grass', 'Fighting'], [100, 114, 108, 60, 70, 64], 45, 235, {
  learn: [[1, 'Vine Whip'], [1, 'Razor Leaf'], [1, 'Jab'], [30, 'Seed Burst'], [34, 'Palm Strike'], [40, 'Mighty Blow']],
  look: { stage: 3, form: 'wide', feat: ['ears', 'spikes', 'legs', 'arms'] },
  desc: 'Thick briars armor this brawler. It shrugs off blows and answers with one punch.',
});
ART[40] = { main: '#8a5e3c', belly: '#e8cfa0', acc: '#3f9a44', ear: 'nub', leaf: 'tree', thorns: true, shellSpikes: true, nose: true, claws: true, fists: true, tusks: true, mouth: 'fang', eye: 'fierce', iris: '#ffc040' };

// ---- Tide-pool crabs (41-43) ------------------------------------------------
D(41, 'Pinchip', ['Water'], [46, 58, 58, 34, 38, 46], 235, 55, {
  evo: [18, 42],
  learn: [[1, 'Scratch'], [1, 'Harden'], [4, 'Water Gun'], [8, 'Pinch Snap'], [14, 'Bubble Beam'], [17, 'Bite']],
  look: { stage: 1, form: 'wide', feat: ['arms', 'legs'] },
  desc: 'A shy pool crab. It waves one big claw at anything bigger than itself.',
  habitat: [['shore', 4, 9, 10]],
});
ART[41] = { main: '#ff7e5a', belly: '#ffe2c4', fists: true, claws: true, bubbles: true, mouth: 'open', eye: 'round', eyeR: .13, iris: '#401818', cheek: '#ffb8a0', legLift: 3 };
D(42, 'Brinecrab', ['Water', 'Rock'], [66, 84, 102, 48, 68, 48], 100, 140, {
  evo: [34, 43],
  learn: [[1, 'Pinch Snap'], [1, 'Water Gun'], [1, 'Harden'], [18, 'Rock Throw'], [22, 'Bubble Beam'], [28, 'Rock Slide']],
  look: { stage: 2, form: 'wide', feat: ['arms', 'legs', 'spikes'] },
  desc: 'Barnacles crust its shell like armor. Its claws can crack a clam in one snap.',
  habitat: [['shore', 10, 10, 1]],
});
ART[42] = { main: '#e8644a', belly: '#f6dcc0', acc: '#8a94a4', rockBack: true, fists: true, claws: true, spots: '#ece4d4', crystals: true, bubbles: true, mouth: 'fang', eye: 'normal', iris: '#401818', legLift: 3 };
D(43, 'Crabarch', ['Water', 'Rock'], [84, 112, 128, 66, 86, 56], 45, 235, {
  learn: [[1, 'Pinch Snap'], [1, 'Bubble Beam'], [1, 'Rock Throw'], [30, 'Rock Slide'], [34, 'Surf'], [40, 'Boulder Crash']],
  look: { stage: 3, form: 'wide', feat: ['arms', 'legs', 'spikes', 'horns'] },
  desc: 'The tide-pool king. Its castle shell stands against the biggest waves.',
});
ART[43] = { main: '#d4483c', belly: '#f2d4b8', acc: '#8e98aa', rockBack: true, armor: true, crown: true, gem: true, fists: true, claws: true, shellSpikes: true, tusks: true, crystals: true, mouth: 'fang', eye: 'fierce', iris: '#ffd040', legLift: 3 };

// ---- Flower fairies (44-46) ---------------------------------------------
D(44, 'Blossling', ['Fairy'], [44, 32, 40, 56, 56, 60], 230, 55, {
  evo: [17, 45],
  learn: [[1, 'Pixie Dust'], [1, 'Growl'], [5, 'Petal Gust'], [9, 'Charm Wink'], [12, 'Sleep Powder'], [15, 'Glimmer']],
  look: { stage: 1, form: 'round', feat: ['wings', 'leaf'] },
  desc: 'A bud-sized sprite who sleeps in flowers and sneezes glitter.',
  habitat: [['sunmeadow', 4, 9, 6]],
});
ART[44] = { main: '#ffc4de', belly: '#fff2f8', acc: '#8ad870', wing: 'fairy', flowerCrown: true, float: true, sparkles: true, mouth: 'smile', eye: 'happy', cheek: '#ff8ab0', iris: '#a04a8a' };
D(45, 'Bloomaid', ['Fairy'], [60, 48, 60, 86, 88, 74], 100, 140, {
  evo: [34, 46],
  learn: [[1, 'Pixie Dust'], [1, 'Petal Gust'], [1, 'Charm Wink'], [17, 'Glimmer'], [20, 'Razor Leaf'], [26, 'Seed Burst']],
  look: { stage: 2, form: 'tall', feat: ['wings', 'leaf', 'arms'] },
  desc: 'She tends the meadow flowers and dances when they open.',
  habitat: [['sunmeadow', 9, 9, 1]],
});
ART[45] = { main: '#ffa8d2', belly: '#fff0f6', acc: '#6fcf68', wing: 'fairy', flowerCrown: true, leafSkirt: true, petals: true, float: true, sparkles: true, mouth: 'smile', eye: 'happy', cheek: '#ff7aa8', iris: '#a04a8a' };
D(46, 'Florelle', ['Fairy', 'Grass'], [78, 60, 76, 122, 112, 86], 45, 235, {
  learn: [[1, 'Glimmer'], [1, 'Petal Gust'], [1, 'Charm Wink'], [30, 'Seed Burst'], [34, 'Moonbeam'], [40, 'Petal Blast']],
  look: { stage: 3, form: 'tall', feat: ['wings', 'leaf', 'arms', 'legs'] },
  desc: 'The meadow queen. Where she walks, flowers bloom in a ring behind her.',
});
ART[46] = { main: '#ff86be', belly: '#ffeaf4', acc: '#5cc260', body: 'flower', wing: 'fairy', flowerCrown: true, crown: true, leafSkirt: true, petals: true, halo: true, float: true, sparkles: true, mouth: 'smile', eye: 'star', cheek: '#ff6a9a', iris: '#d0408a' };

// ---- Two-stage lines (47-62) ----------------------------------------------
D(47, 'Gullet', ['Water', 'Flying'], [50, 52, 44, 46, 44, 64], 200, 60, {
  evo: [22, 48],
  learn: [[1, 'Peck'], [1, 'Growl'], [5, 'Water Gun'], [9, 'Gust'], [14, 'Wing Attack'], [18, 'Dew Drop']],
  look: { stage: 1, form: 'round', feat: ['wings', 'tail'] },
  desc: 'A cheeky seagull that snatches snacks from picnic baskets.',
  habitat: [['shore', 4, 9, 9]],
});
ART[47] = { main: '#f6f8ff', belly: '#ffffff', acc: '#7eb8ec', body: 'bird', wing: 'bird', tail: 'feather', mouth: 'beak', eye: 'normal', birdFeet: true, cheek: '#ffc0b0', iris: '#3a5a8a' };
D(48, 'Brinegull', ['Water', 'Flying'], [74, 88, 72, 80, 70, 90], 90, 165, {
  learn: [[1, 'Peck'], [1, 'Water Gun'], [1, 'Wing Attack'], [22, 'Bubble Beam'], [26, 'Air Slash'], [30, 'Tide Roll'], [34, 'Surf']],
  look: { stage: 2, form: 'tall', feat: ['wings', 'tail', 'legs'] },
  desc: 'A storm-sailor with a booming call. It dives through whitecaps to catch fish.',
  habitat: [['shore', 10, 10, 2]],
});
ART[48] = { main: '#eaf2fa', belly: '#ffffff', acc: '#2e6fb0', body: 'bird', wing: 'big', tail: 'feather', mouth: 'beak', hook: true, eye: 'fierce', birdFeet: true, goggles: true, scarf: true, iris: '#ffc030' };

D(49, 'Clovet', ['Normal'], [52, 44, 40, 32, 42, 66], 240, 52, {
  evo: [20, 50],
  learn: [[1, 'Tackle'], [1, 'Tail Whip'], [4, 'Quick Attack'], [8, 'Fluff Up'], [12, 'Petal Gust'], [15, 'Bite']],
  look: { stage: 1, form: 'round', feat: ['ears', 'tail', 'leaf'] },
  desc: 'A little bunny wearing a four-leaf clover. It bounces whenever it is happy.',
  habitat: [['sunmeadow', 3, 7, 10]],
});
ART[49] = { main: '#f4ecda', belly: '#ffffff', acc: '#5cc860', ear: 'bunny', tail: 'puff', leaf: 'sprout', mouth: 'cat', eye: 'round', nose: true, cheek: '#ffa8b0', iris: '#a05a50' };
D(50, 'Lunahare', ['Normal', 'Fairy'], [78, 80, 66, 70, 76, 106], 80, 165, {
  learn: [[1, 'Quick Attack'], [1, 'Fluff Up'], [1, 'Tackle'], [20, 'Pixie Dust'], [24, 'Slam'], [28, 'Glimmer'], [34, 'Moonbeam']],
  look: { stage: 2, form: 'tall', feat: ['ears', 'tail', 'legs', 'horns'] },
  desc: 'It hops under moonlight and leaves ring-shaped glimmers in the grass.',
  habitat: [['sunmeadow', 8, 9, 2]],
});
ART[50] = { main: '#e6dcf6', belly: '#fbf8ff', acc: '#ffd860', ear: 'bunny', horn: 'moon', tail: 'puff', mouth: 'cat', eye: 'normal', nose: true, stars: true, sparkles: true, ruff: true, cheek: '#ffa0c8', iris: '#8a5ac8' };

D(51, 'Buzzbit', ['Bug', 'Flying'], [42, 44, 40, 48, 40, 70], 225, 55, {
  evo: [20, 52],
  learn: [[1, 'Buzz Jab'], [1, 'Tackle'], [6, 'Gust'], [10, 'Bug Bite'], [16, 'Wing Attack'], [19, 'Quick Attack']],
  look: { stage: 1, form: 'round', feat: ['wings', 'antenna', 'tail'] },
  desc: 'A round little bee that hums off-key and collects pollen in fuzzy leg-pants.',
  habitat: [['sunmeadow', 4, 8, 7]],
});
ART[51] = { main: '#ffd23a', belly: '#fff3b0', acc: '#3a2a20', wing: 'fairy', tail: 'stinger', stripes: true, bugStripes: true, float: true, mouth: 'open', eye: 'round', cheek: '#ff9a6a', iris: '#3a2a20' };
D(52, 'Honeywarden', ['Bug', 'Fairy'], [70, 70, 78, 92, 92, 76], 90, 160, {
  learn: [[1, 'Buzz Jab'], [1, 'Bug Bite'], [1, 'Pixie Dust'], [22, 'Glimmer'], [26, 'Cross Cut'], [32, 'Swarm']],
  look: { stage: 2, form: 'tall', feat: ['wings', 'antenna', 'tail', 'arms'] },
  desc: 'It guards the hive and the honey like a queen. Every sweet crumb is its treasure.',
  habitat: [['sunmeadow', 9, 9, 1]],
});
ART[52] = { main: '#ffc42a', belly: '#fff0a8', acc: '#4a2e20', wing: 'fairy', tail: 'stinger', stripes: true, bugStripes: true, crown: true, ruff: true, float: true, sparkles: true, mouth: 'smile', eye: 'normal', cheek: '#ff9a6a', iris: '#4a2e20' };

D(53, 'Dewsnail', ['Water', 'Bug'], [56, 40, 64, 48, 56, 26], 220, 58, {
  evo: [22, 54],
  learn: [[1, 'Tackle'], [1, 'Harden'], [5, 'Dew Drop'], [9, 'Bug Bite'], [15, 'Bubble Beam'], [20, 'Slam']],
  look: { stage: 1, form: 'round', feat: ['antenna'] },
  desc: 'It carries a dewdrop in its shell and leaves a trail that sparkles at dawn.',
  habitat: [['mirewood', 6, 10, 9]],
});
ART[53] = { main: '#b6e0b4', belly: '#f2f8dc', acc: '#5ab0d8', body: 'shell', antenna: 'feather', bubbles: true, mouth: 'smile', eye: 'round', cheek: '#ffb0a0', iris: '#2a5a7a' };
D(54, 'Dewspire', ['Water', 'Bug'], [84, 56, 104, 84, 100, 32], 90, 160, {
  learn: [[1, 'Harden'], [1, 'Dew Drop'], [1, 'Bug Bite'], [22, 'Bubble Beam'], [26, 'Tide Roll'], [32, 'Surf']],
  look: { stage: 2, form: 'wide', feat: ['antenna', 'spikes'] },
  desc: 'Its spiral shell towers like a crystal spire and rings softly in the rain.',
  habitat: [['mirewood', 12, 13, 2]],
});
ART[54] = { main: '#9ad4a8', belly: '#eef8d0', acc: '#3a98d0', body: 'shell', shellSpikes: true, crystals: true, antenna: 'feather', bubbles: true, mouth: 'smile', eye: 'normal', cheek: '#ffa090', iris: '#1a4a6a' };

D(55, 'Waddlet', ['Water', 'Normal'], [54, 46, 46, 44, 44, 48], 230, 55, {
  evo: [18, 56],
  learn: [[1, 'Tackle'], [1, 'Growl'], [4, 'Water Gun'], [9, 'Dew Drop'], [12, 'Quick Attack'], [16, 'Peck']],
  look: { stage: 1, form: 'round', feat: ['wings', 'tail'] },
  desc: 'A fluffy duckling that waddles after anyone kind enough to quack back.',
  habitat: [['shore', 4, 8, 7], ['mirewood', 6, 9, 4]],
});
ART[55] = { main: '#ffe566', belly: '#fff6c8', acc: '#ffb43a', wing: 'bird', tail: 'puff', mouth: 'beak', eye: 'round', eyeR: .13, tuft3: true, birdFeet: true, bubbles: true, cheek: '#ffa070', iris: '#3a2a10' };
D(56, 'Mallarch', ['Water', 'Flying'], [80, 76, 70, 92, 80, 78], 90, 160, {
  learn: [[1, 'Water Gun'], [1, 'Dew Drop'], [1, 'Quick Attack'], [20, 'Wing Attack'], [22, 'Bubble Beam'], [26, 'Air Slash'], [33, 'Surf']],
  look: { stage: 2, form: 'tall', feat: ['wings', 'tail', 'legs'] },
  desc: 'A proud green-capped duck. It leads the flock south with a trumpet call.',
  habitat: [['shore', 10, 10, 1]],
});
ART[56] = { main: '#4fa890', belly: '#f4f2e2', acc: '#ffd84a', wing: 'big', tail: 'feather', mouth: 'beak', eye: 'fierce', collar: true, scarf: true, tuft3: true, birdFeet: true, bubbles: true, iris: '#ffd84a' };

D(57, 'Flurpup', ['Ice'], [54, 48, 50, 44, 44, 46], 220, 58, {
  evo: [22, 58],
  learn: [[1, 'Tackle'], [1, 'Tail Whip'], [4, 'Frost Nip'], [8, 'Water Gun'], [14, 'Hail Shard'], [18, 'Belly Flop']],
  look: { stage: 1, form: 'round', feat: ['ears', 'tail'] },
  desc: 'A snowball of a seal pup. It slides on its belly just for the joy of it.',
  habitat: [['shore', 5, 9, 5], ['ridge', 6, 10, 5]],
});
ART[57] = { main: '#eef4fc', belly: '#ffffff', acc: '#9ac8f0', ear: 'nub', tail: 'fish', whiskers: true, nose: true, flipper: true, snowcap: true, mouth: 'smile', eye: 'round', eyeR: .14, cheek: '#ffb8c8', iris: '#2a3a5a' };
D(58, 'Floeseal', ['Ice', 'Water'], [92, 82, 88, 84, 82, 50], 80, 165, {
  learn: [[1, 'Frost Nip'], [1, 'Water Gun'], [1, 'Tackle'], [20, 'Hail Shard'], [24, 'Bubble Beam'], [28, 'Belly Flop'], [34, 'Glacier Beam']],
  look: { stage: 2, form: 'wide', feat: ['ears', 'tail', 'spikes'] },
  desc: 'It rides ice floes like a ship. Its tusks are carved by ten winters of frost.',
  habitat: [['ridge', 11, 12, 1]],
});
ART[58] = { main: '#c4d8ee', belly: '#f6fbff', acc: '#6aa8e0', ear: 'nub', tail: 'fish', whiskers: true, nose: true, flipper: true, tusks: true, icicles: true, snowcap: true, scarf: true, mouth: 'open', eye: 'normal', iris: '#1a2a4a' };

D(59, 'Padhop', ['Water', 'Grass'], [50, 48, 48, 46, 46, 50], 230, 55, {
  evo: [20, 60],
  learn: [[1, 'Tackle'], [1, 'Growl'], [4, 'Dew Drop'], [8, 'Vine Whip'], [13, 'Mud Shot'], [17, 'Bubble Beam']],
  look: { stage: 1, form: 'wide', feat: ['leaf', 'legs'] },
  desc: 'A frog that wears a lily pad as a hat. It hops from puddle to puddle.',
  habitat: [['mirewood', 6, 10, 9], ['shore', 4, 8, 3]],
});
ART[59] = { main: '#68c870', belly: '#eefab8', acc: '#3a9a58', body: 'blob', leaf: 'hood', mouth: 'open', eye: 'round', eyeR: .15, eyeAsp: 1, bubbles: true, cheek: '#ffa890', iris: '#2a5a2a' };
D(60, 'Lotoad', ['Water', 'Grass'], [82, 78, 80, 86, 84, 60], 90, 160, {
  learn: [[1, 'Dew Drop'], [1, 'Vine Whip'], [1, 'Tackle'], [22, 'Bubble Beam'], [24, 'Razor Leaf'], [28, 'Tide Roll'], [30, 'Belly Flop']],
  look: { stage: 2, form: 'wide', feat: ['leaf', 'legs', 'arms'] },
  desc: 'A lotus blooms on its head. It sings at dusk and the whole pond answers.',
  habitat: [['mirewood', 12, 13, 2]],
});
ART[60] = { main: '#4aa860', belly: '#e8f6b0', acc: '#ff9ac8', body: 'blob', flowerCrown: true, petals: true, leafSkirt: true, spots: '#2e7a40', mouth: 'open', eye: 'normal', bubbles: true, cheek: '#ffa0a8', iris: '#3a2a10' };

D(61, 'Silkling', ['Bug'], [48, 36, 44, 52, 48, 52], 235, 55, {
  evo: [20, 62],
  learn: [[1, 'Tackle'], [1, 'Harden'], [4, 'Bug Bite'], [8, 'Sleep Powder'], [12, 'Confusion'], [16, 'Buzz Jab']],
  look: { stage: 1, form: 'round', feat: ['antenna'] },
  desc: 'It spins glossy silk into scarves. A full night of spinning leaves it sleepy.',
  habitat: [['sunmeadow', 4, 8, 7], ['mirewood', 6, 10, 3]],
});
ART[61] = { main: '#ece4fa', belly: '#fffaff', acc: '#bca8f0', body: 'blob', antenna: 'feather', tuft: true, spots: '#c8b8f4', scarf: true, mouth: 'smile', eye: 'happy', cheek: '#ffb0d0', iris: '#6a4aa8' };
D(62, 'Prismwing', ['Bug', 'Fairy'], [70, 52, 66, 98, 92, 100], 90, 160, {
  learn: [[1, 'Bug Bite'], [1, 'Sleep Powder'], [1, 'Confusion'], [20, 'Pixie Dust'], [24, 'Glimmer'], [30, 'Swarm'], [36, 'Moonbeam']],
  look: { stage: 2, form: 'tall', feat: ['wings', 'antenna', 'arms'] },
  desc: 'Its wings scatter light into rainbow dust that makes everyone sneeze happily.',
  habitat: [['sunmeadow', 9, 9, 1]],
});
ART[62] = { main: '#b8a0f0', belly: '#f6eeff', acc: '#ff90d8', wing: 'moth', antenna: 'feather', float: true, sparkles: true, spots: '#ffd0f0', halo: true, mouth: 'smile', eye: 'star', cheek: '#ff90c0', iris: '#d0408a' };

// ---- Singles (63-69) --------------------------------------------------------
D(63, 'Fleecit', ['Normal'], [100, 60, 74, 68, 90, 38], 100, 120, {
  learn: [[1, 'Tackle'], [1, 'Fluff Up'], [6, 'Lullaby'], [10, 'Pixie Dust'], [16, 'Belly Flop'], [22, 'Slam'], [28, 'Glimmer']],
  look: { stage: 2, form: 'round', feat: ['ears', 'horns', 'tail'] },
  desc: 'A cloud-wool sheep that dozes anywhere. Counting its wool puts trainers to sleep.',
  habitat: [['sunmeadow', 5, 9, 5]],
});
ART[63] = { main: '#fff6ee', belly: '#fffaf4', face: '#e8c4a8', acc: '#c8a878', body: 'cloud', ear: 'droopy', horn: 'ram', tail: 'puff', mouth: 'smile', eye: 'sleepy', nose: true, bow: true, cheek: '#ff9ab8', iris: '#e8d8f0' };
D(64, 'Starbrine', ['Water', 'Psychic'], [70, 58, 78, 92, 82, 86], 90, 150, {
  learn: [[1, 'Water Gun'], [1, 'Harden'], [6, 'Confusion'], [10, 'Dew Drop'], [18, 'Psybeam'], [22, 'Bubble Beam'], [30, 'Tide Roll'], [40, 'Psychic']],
  look: { stage: 2, form: 'round', feat: ['spikes', 'arms'] },
  desc: 'A starfish that shines at low tide. It mends its own arms and hums to the moon.',
  habitat: [['shore', 6, 10, 4]],
});
ART[64] = { main: '#ff8e5a', belly: '#ffd9a0', acc: '#ffe27a', spots: '#fff2c0', horn: 'crystal', gem: true, tentacles: true, stars: true, bubbles: true, mouth: 'smile', eye: 'star', cheek: '#ff6a6a', iris: '#8a3aa8' };
D(65, 'Dawnstag', ['Grass', 'Fairy'], [76, 84, 70, 84, 78, 88], 75, 165, {
  learn: [[1, 'Tackle'], [1, 'Petal Gust'], [8, 'Pixie Dust'], [12, 'Razor Leaf'], [20, 'Glimmer'], [28, 'Seed Burst'], [36, 'Moonbeam']],
  look: { stage: 2, form: 'tall', feat: ['ears', 'horns', 'tail', 'legs'] },
  desc: 'A young stag with flowering antlers. Dawn light makes its whole coat glow.',
  habitat: [['sunmeadow', 7, 9, 3], ['mirewood', 9, 12, 3]],
});
ART[65] = { main: '#dcb480', belly: '#fff0d0', acc: '#7ed06a', horn: 'antler', ear: 'leaf', tail: 'puff', flowerCrown: true, spots: '#fff6e0', sparkles: true, mouth: 'smile', eye: 'happy', nose: true, cheek: '#ffa090', iris: '#6a4a20', legLift: 8 };
D(66, 'Skimdart', ['Bug', 'Water'], [60, 76, 56, 62, 60, 126], 120, 125, {
  learn: [[1, 'Buzz Jab'], [1, 'Water Gun'], [8, 'Gust'], [12, 'Bug Bite'], [18, 'Dew Drop'], [22, 'Cross Cut'], [26, 'Bubble Beam'], [34, 'Swarm']],
  look: { stage: 2, form: 'wide', feat: ['wings', 'antenna', 'tail'] },
  desc: 'The fastest flier on the pond. It skims the water and never gets its feet wet.',
  habitat: [['shore', 6, 10, 5], ['mirewood', 8, 12, 3]],
});
ART[66] = { main: '#2fc4b8', spots: '#9ae8e0', belly: '#d0f6ee', acc: '#5a8ae8', body: 'cater', wing: 'fairy', tail: 'stinger', antenna: 'feather', bugStripes: true, goggles: true, float: true, mouth: 'smile', eye: 'round', eyeR: .15, cheek: '#ffd0a0', iris: '#103a5a' };
D(67, 'Capnap', ['Grass', 'Poison'], [88, 72, 84, 70, 86, 40], 100, 125, {
  learn: [[1, 'Tackle'], [1, 'Harden'], [6, 'Poison Powder'], [8, 'Petal Gust'], [12, 'Sleep Powder'], [18, 'Razor Leaf'], [24, 'Sludge'], [32, 'Petal Blast']],
  look: { stage: 2, form: 'round', feat: ['legs'] },
  desc: 'A sleepy mushroom that naps under ferns. Do not poke it while it dreams.',
  habitat: [['mirewood', 7, 12, 6]],
});
ART[67] = { main: '#f4dcc4', belly: '#fff6ea', acc: '#d85a6a', body: 'shroom', mushroomSpots: true, spots: '#fff0e8', mouth: 'open', eye: 'sleepy', cheek: '#ff9aa0', iris: '#6a3a30' };
D(68, 'Rosewade', ['Flying', 'Fairy'], [72, 70, 64, 98, 86, 84], 75, 160, {
  learn: [[1, 'Peck'], [1, 'Gust'], [6, 'Pixie Dust'], [14, 'Wing Attack'], [20, 'Glimmer'], [26, 'Air Slash'], [36, 'Moonbeam']],
  look: { stage: 2, form: 'tall', feat: ['wings', 'tail', 'legs'] },
  desc: 'A rosy wader that stands on one leg for hours and dances when it is watched.',
  habitat: [['shore', 7, 10, 3]],
});
ART[68] = { main: '#ff9cc0', belly: '#ffd8e6', acc: '#fff4f8', body: 'bird', wing: 'bird', tail: 'feather', mouth: 'beak', hook: true, eye: 'normal', birdFeet: true, ruff: true, tuft3: true, cheek: '#ff6a9a', iris: '#8a2a5a', legLift: 12 };
D(69, 'Glimbell', ['Water', 'Fairy'], [90, 40, 70, 100, 110, 50], 90, 130, {
  learn: [[1, 'Water Gun'], [1, 'Charm Wink'], [6, 'Pixie Dust'], [10, 'Poison Sting'], [16, 'Bubble Beam'], [22, 'Glimmer'], [30, 'Surf'], [38, 'Moonbeam']],
  look: { stage: 2, form: 'round', feat: ['arms'] },
  desc: 'A moon jelly that glows softly in the shallows. Its bell chimes with the tide.',
  habitat: [['shore', 6, 10, 4]],
});
ART[69] = { main: '#cfe4ff', belly: null, acc: '#c8a0ff', body: 'jelly', tentacles: true, bubbles: true, sparkles: true, float: true, halo: true, mouth: 'smile', eye: 'happy', cheek: '#ffb0e0', iris: '#5a4aa8' };
})();
