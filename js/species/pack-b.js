// Species pack b: Marsh, night and mind (ids 70-113, see docs/CREATURES.md).
(function () {
const G = globalThis.G, D = G.defineSpecies, ART = G.CREATURE_ART;

// ---- New moves --------------------------------------------------------------
G.defineMove('Meditate', 'Psychic', 0, 100, 20, { stat: ['spa', 2], self: true });
G.defineMove('Hex Glow', 'Ghost', 50, 100, 20);
G.defineMove('Gloom Orb', 'Ghost', 80, 100, 15);
G.defineMove('Pilfer', 'Dark', 45, 100, 25);
G.defineMove('Night Slash', 'Dark', 70, 100, 15);
G.defineMove('Static Lash', 'Electric', 65, 100, 20, { status: 'par', chance: 20 });
G.defineMove('Dazzle Lure', 'Normal', 0, 100, 20, { stat: ['spd', -1] });

// ---- Frog monk line: Tadmo, Hopmonk, Lotusage -------------------------------
D(70, 'Tadmo', ['Water'], [48, 40, 50, 52, 50, 60], 220, 55, {
  evo: [16, 71], learn: [[1, 'Tackle'], [1, 'Water Gun'], [4, 'Meditate'], [8, 'Confusion'], [12, 'Bubble Beam']],
  look: { stage: 1, form: 'round', feat: ['legs'] }, desc: 'A tiny tadpole-frog that sits very still and hums to itself.',
  habitat: [['mirewood', 6, 9, 10], ['shore', 4, 8, 6]] });
ART[70] = { main: '#5cc9a4', belly: '#fff2c4', acc: '#2f8f86', mouth: 'smile', eye: 'sleepy', iris: '#2a6a60', cheek: '#ffa8a0', bubbles: true };
D(71, 'Hopmonk', ['Water', 'Psychic'], [66, 62, 64, 76, 68, 74], 100, 140, {
  evo: [34, 72], learn: [[1, 'Water Gun'], [1, 'Meditate'], [1, 'Confusion'], [16, 'Bubble Beam'], [20, 'Psybeam'], [26, 'Mind Spike'], [30, 'Surf']],
  look: { stage: 2, form: 'round', feat: ['legs', 'arms'] }, desc: 'It hops between lily pads while thinking deep froggy thoughts.',
  habitat: [['mirewood', 11, 13, 2]] });
ART[71] = { main: '#4fbf9a', belly: '#fff2c4', acc: '#ff9a3a', mouth: 'smile', eye: 'sleepy', iris: '#2a6a60', scarf: true, fists: true, bubbles: true, cheek: '#ffa8a0' };
D(72, 'Lotusage', ['Psychic', 'Water'], [82, 70, 84, 114, 102, 70], 45, 232, {
  learn: [[1, 'Water Gun'], [1, 'Meditate'], [1, 'Psybeam'], [24, 'Surf'], [30, 'Mind Spike'], [36, 'Psychic'], [42, 'Moonbeam']],
  look: { stage: 3, form: 'tall', feat: ['legs', 'arms', 'horns'] }, desc: 'A sage frog who floats above the pond with a lotus halo.',
  });
ART[72] = { main: '#44b890', belly: '#fff2c4', acc: '#ff8ac0', mouth: 'smile', eye: 'sleepy', iris: '#7a2a8a', flowerCrown: true, halo: true, float: true, stars: true, fists: true, scarf: true, horn: 'crystal', petals: true };

// ---- Bog lantern ghosts: Wickle, Bogwick, Wispwarden --------------------------
D(73, 'Wickle', ['Ghost'], [38, 40, 42, 60, 48, 62], 225, 55, {
  evo: [18, 74], learn: [[1, 'Lick'], [1, 'Growl'], [5, 'Hex Glow'], [9, 'Confusion'], [13, 'Shadow Claw']],
  look: { stage: 1, form: 'round', feat: ['flame'] }, desc: 'A little marsh-light with a candle wick for a hat.',
  habitat: [['mirewood', 6, 9, 8], ['mine', 10, 12, 4]] });
ART[73] = { main: '#8fe0b0', belly: null, acc: '#ffd24a', body: 'wisp', mouth: 'wisp', eye: 'glow', float: true, tail: 'none', iris: '#ffe66a', cheeks: false };
D(74, 'Bogwick', ['Ghost', 'Grass'], [58, 60, 62, 90, 72, 74], 100, 138, {
  evo: [36, 75], learn: [[1, 'Lick'], [1, 'Hex Glow'], [1, 'Razor Leaf'], [16, 'Shadow Claw'], [22, 'Psybeam'], [28, 'Gloom Orb'], [32, 'Petal Blast']],
  look: { stage: 2, form: 'tall', feat: ['flame', 'arms', 'tail'] }, desc: 'It swings a green lantern to lure lost travelers into the reeds.',
  habitat: [['mirewood', 12, 13, 2]] });
ART[74] = { main: '#5fbf8a', belly: null, acc: '#ffd24a', body: 'wisp', mouth: 'grin', eye: 'glow', float: true, tail: 'none', iris: '#ffe66a', cheeks: false, smoke: true, leafSkirt: true, hook: true };
D(75, 'Wispwarden', ['Ghost', 'Water'], [72, 72, 80, 118, 100, 88], 45, 235, {
  learn: [[1, 'Lick'], [1, 'Hex Glow'], [1, 'Bubble Beam'], [28, 'Gloom Orb'], [34, 'Surf'], [40, 'Phantom Rush']],
  look: { stage: 3, form: 'tall', feat: ['flame', 'arms', 'tail', 'horns'] }, desc: 'The keeper of the marsh lights. Its lantern guides the lost home.',
  });
ART[75] = { main: '#3f9c82', belly: null, acc: '#ffd24a', body: 'wisp', mouth: 'grin', eye: 'glow', float: true, tail: 'none', iris: '#ffe66a', cheeks: false, smoke: true, crown: true, halo: true, tentacles: true, gem: true, horn: 'antler' };

// ---- Raccoon thieves: Pilfet, Bandibit, Masquiff --------------------------------
D(76, 'Pilfet', ['Dark'], [44, 52, 40, 38, 40, 72], 230, 55, {
  evo: [17, 77], learn: [[1, 'Scratch'], [1, 'Growl'], [5, 'Pilfer'], [9, 'Quick Attack'], [13, 'Bite']],
  look: { stage: 1, form: 'round', feat: ['ears', 'tail', 'arms'] }, desc: 'A masked sneak-thief that swipes shiny buttons and runs off.',
  habitat: [['mirewood', 6, 10, 8], ['ridge', 7, 11, 4]] });
ART[76] = { main: '#8b90aa', belly: '#e8e8f2', acc: '#3a3550', face: '#d9dbe8', ear: 'bear', tail: 'ringed', mouth: 'cheeky', goggles: true, paws: true, nose: true, iris: '#2a2540' };
D(77, 'Bandibit', ['Dark'], [62, 76, 60, 52, 58, 100], 100, 140, {
  evo: [36, 78], learn: [[1, 'Scratch'], [1, 'Pilfer'], [1, 'Bite'], [18, 'Quick Attack'], [24, 'Night Slash'], [30, 'Crunch'], [34, 'Slam']],
  look: { stage: 2, form: 'round', feat: ['ears', 'tail', 'arms', 'legs'] }, desc: 'It wears a stolen scarf and is always one step ahead of you.',
  habitat: [['mirewood', 12, 13, 2]] });
ART[77] = { main: '#7e83a2', belly: '#e8e8f2', acc: '#e0405a', face: '#d0d3e4', ear: 'bear', tail: 'ringed', mouth: 'grin', goggles: true, paws: true, claws: true, scarf: true, nose: true, iris: '#2a2540' };
D(78, 'Masquiff', ['Dark', 'Fairy'], [78, 100, 76, 70, 84, 118], 45, 235, {
  learn: [[1, 'Pilfer'], [1, 'Bite'], [1, 'Night Slash'], [30, 'Crunch'], [36, 'Dusk Fang'], [42, 'Glimmer']],
  look: { stage: 3, form: 'tall', feat: ['ears', 'tail', 'arms', 'legs'] }, desc: 'The master burglar of the marsh. It steals hearts as well as hats.',
  });
ART[78] = { main: '#6b6f95', belly: '#e8e8f2', acc: '#a050d8', face: '#cfd2e6', ear: 'bear', tail: 'ringed', mouth: 'grin', goggles: true, paws: true, claws: true, scarf: true, gem: true, sparkles: true, eye: 'fierce', crown: true, iris: '#d040a0' };

// ---- Eel line: Zipeel, Currenel, Tempestel ---------------------------------------
D(79, 'Zipeel', ['Electric'], [36, 42, 34, 58, 40, 78], 235, 55, {
  evo: [18, 80], learn: [[1, 'Tackle'], [1, 'Thunder Shock'], [6, 'Water Gun'], [10, 'Thunder Wave'], [14, 'Static Lash']],
  look: { stage: 1, form: 'wide', feat: ['fin', 'bolt'] }, desc: 'A skinny little eel that zips through the reeds, fizzing.',
  habitat: [['mirewood', 7, 10, 6], ['shore', 5, 9, 6]] });
ART[79] = { main: '#4ab8e8', belly: '#d8f4ff', acc: '#ffe040', body: 'serpent', tail: 'fish', boltCol: '#ffe040', mouth: 'open', eye: 'round', iris: '#2a5a90', fin: 'head' };
D(80, 'Currenel', ['Electric', 'Water'], [54, 60, 52, 88, 60, 90], 100, 140, {
  evo: [36, 81], learn: [[1, 'Thunder Shock'], [1, 'Static Lash'], [1, 'Water Gun'], [18, 'Bubble Beam'], [24, 'Bite'], [30, 'Thunderbolt']],
  look: { stage: 2, form: 'wide', feat: ['fin', 'bolt', 'tail'] }, desc: 'Sparks arc along its back whenever it hunts in murky water.',
  habitat: [['shore', 9, 10, 2]] });
ART[80] = { main: '#3a9ae0', belly: '#d8f4ff', acc: '#ffe040', body: 'serpent', tail: 'fish', boltCol: '#ffe040', mouth: 'fang', eye: 'fierce', iris: '#ffe040', fin: 'crest', backStripes: true, sparkles: true };
D(81, 'Tempestel', ['Electric', 'Dragon'], [70, 80, 70, 128, 84, 96], 45, 240, {
  learn: [[1, 'Thunder Shock'], [1, 'Static Lash'], [1, 'Drake Breath'], [28, 'Thunderbolt'], [34, 'Wyrm Claw'], [42, 'Volt Crash']],
  look: { stage: 3, form: 'wide', feat: ['fin', 'bolt', 'tail', 'horns'] }, desc: 'A storm in the shape of a serpent. Thunder follows it home.',
  });
ART[81] = { main: '#2a78d0', belly: '#c8ecff', acc: '#ffe040', body: 'serpent', tail: 'fish', boltCol: '#fff070', mouth: 'fang', eye: 'fierce', iris: '#fff070', fin: 'crest', horn: 'crystal', tusks: true, backStripes: true, sparkles: true, bubbles: true };

// ---- Mushroom witch: Sporlet, Hexcap, Brewitch ----------------------------------------
D(82, 'Sporlet', ['Poison'], [52, 40, 50, 58, 56, 36], 230, 55, {
  evo: [18, 83], learn: [[1, 'Tackle'], [1, 'Poison Powder'], [5, 'Poison Sting'], [9, 'Sleep Powder'], [13, 'Sludge']],
  look: { stage: 1, form: 'round', feat: ['legs'] }, desc: 'A mushroom cap with legs. It puffs sleepy spores when startled.',
  habitat: [['mirewood', 6, 10, 10]] });
ART[82] = { main: '#b472dc', belly: '#f6eed8', acc: '#8a4ab8', body: 'shroom', mushroomSpots: true, spots: '#fff0a0', mouth: 'smile', eye: 'round', iris: '#4a2a6a', cheek: '#ff9ac0' };
D(83, 'Hexcap', ['Poison', 'Grass'], [70, 52, 70, 86, 84, 52], 100, 140, {
  evo: [36, 84], learn: [[1, 'Poison Sting'], [1, 'Sleep Powder'], [1, 'Sludge'], [16, 'Razor Leaf'], [22, 'Mind Spike'], [28, 'Petal Blast']],
  look: { stage: 2, form: 'round', feat: ['legs', 'arms'] }, desc: 'It stirs a bubbling brew of bog water and swears it is soup.',
  habitat: [['mirewood', 12, 13, 2]] });
ART[83] = { main: '#a35ed0', belly: '#f6eed8', acc: '#6fbf4a', body: 'shroom', mushroomSpots: true, spots: '#fff0a0', mouth: 'grin', eye: 'round', iris: '#2a6a2a', leaf: 'hood', bubbles: true, vineArms: true, cheek: '#ff9ac0' };
D(84, 'Brewitch', ['Poison', 'Fairy'], [88, 60, 82, 120, 106, 70], 45, 235, {
  learn: [[1, 'Sludge'], [1, 'Sleep Powder'], [1, 'Glimmer'], [26, 'Toxic Spray'], [32, 'Mind Spike'], [38, 'Petal Blast'], [42, 'Moonbeam']],
  look: { stage: 3, form: 'tall', feat: ['legs', 'arms', 'horns'] }, desc: 'The mushroom witch of the deep bog. Her potions are never boring.',
  });
ART[84] = { main: '#8a46c0', belly: '#f6eed8', acc: '#ff5aa8', body: 'shroom', mushroomSpots: true, spots: '#ffe27a', mouth: 'grin', eye: 'round', iris: '#ff3f9a', horn: 'jester', smoke: true, bubbles: true, vineArms: true, gem: true, sparkles: true, cheek: '#ff9ac0' };

// ---- Brawler line: Jabbit, Boxaroo, Pummeroo ------------------------------------------
D(85, 'Jabbit', ['Fighting'], [52, 60, 40, 30, 38, 64], 230, 55, {
  evo: [17, 86], learn: [[1, 'Tackle'], [1, 'Jab'], [5, 'Quick Attack'], [9, 'Pump Up'], [13, 'Palm Strike']],
  look: { stage: 1, form: 'round', feat: ['ears', 'tail', 'legs'] }, desc: 'It shadow-boxes all day and bounces when it wins.',
  habitat: [['ridge', 6, 10, 8], ['sunmeadow', 5, 9, 5]] });
ART[85] = { main: '#e8b87c', belly: '#fff0d6', acc: '#e04848', ear: 'bunny', tail: 'club', mouth: 'cheeky', fists: true, iris: '#7a4a20', eye: 'fierce', cheek: '#ff9a8a' };
D(86, 'Boxaroo', ['Fighting'], [68, 86, 60, 40, 56, 86], 100, 140, {
  evo: [36, 87], learn: [[1, 'Jab'], [1, 'Pump Up'], [1, 'Quick Attack'], [18, 'Palm Strike'], [24, 'Bite'], [30, 'Slam'], [34, 'Mighty Blow']],
  look: { stage: 2, form: 'tall', feat: ['ears', 'tail', 'legs', 'arms'] }, desc: 'Its gloves are rock hard and its footwork is even better.',
  habitat: [['ridge', 11, 12, 2]] });
ART[86] = { main: '#dca066', belly: '#fff0d6', acc: '#e04848', ear: 'bunny', tail: 'club', mouth: 'grin', fists: true, scarf: true, iris: '#7a4a20', eye: 'fierce', backStripes: true };
D(87, 'Pummeroo', ['Fighting', 'Normal'], [90, 128, 84, 50, 76, 92], 45, 240, {
  learn: [[1, 'Jab'], [1, 'Pump Up'], [1, 'Palm Strike'], [30, 'Slam'], [36, 'Mighty Blow'], [42, 'Belly Flop']],
  look: { stage: 3, form: 'tall', feat: ['ears', 'tail', 'legs', 'arms'] }, desc: 'The undefeated champ. It trains by punching thunderclouds.',
  });
ART[87] = { main: '#c88848', belly: '#fff0d6', acc: '#ffcf3a', ear: 'bunny', tail: 'club', mouth: 'grin', fists: true, armor: true, crown: true, iris: '#7a4a20', eye: 'fierce', claws: true };

// ---- Anglerfish: Glimfin, Lurkfin, Abyssor ---------------------------------------------
D(88, 'Glimfin', ['Water'], [56, 40, 40, 60, 46, 50], 225, 55, {
  evo: [18, 89], learn: [[1, 'Tackle'], [1, 'Water Gun'], [5, 'Dazzle Lure'], [9, 'Bite'], [13, 'Bubble Beam']],
  look: { stage: 1, form: 'round', feat: ['fin', 'antenna'] }, desc: 'A deep-water fish with a glowing lure. It is shy but curious.',
  habitat: [['mine', 10, 13, 8], ['shore', 6, 10, 4]] });
ART[88] = { main: '#3a5aa8', belly: '#a8c8f0', acc: '#ffe870', body: 'fish', tail: 'fish', antenna: 'feather', mouth: 'fang', eye: 'glow', iris: '#ffe870', fin: 'side' };
D(89, 'Lurkfin', ['Water', 'Dark'], [76, 64, 62, 90, 66, 60], 100, 140, {
  evo: [36, 90], learn: [[1, 'Water Gun'], [1, 'Dazzle Lure'], [1, 'Bite'], [18, 'Bubble Beam'], [24, 'Dusk Fang'], [30, 'Surf']],
  look: { stage: 2, form: 'wide', feat: ['fin', 'antenna', 'fangs'] }, desc: 'It waits in the dark, lure aglow, grinning with too many teeth.',
  habitat: [['mine', 14, 16, 2]] });
ART[89] = { main: '#2f4890', belly: '#8aa8e0', acc: '#ffe870', body: 'fish', tail: 'fish', antenna: 'feather', mouth: 'teeth', eye: 'glow', iris: '#ffe870', fin: 'crest', bubbles: true };
D(90, 'Abyssor', ['Dark', 'Water'], [100, 84, 86, 122, 88, 50], 45, 240, {
  learn: [[1, 'Bite'], [1, 'Dazzle Lure'], [1, 'Bubble Beam'], [30, 'Surf'], [34, 'Dusk Fang'], [40, 'Tidal Crash']],
  look: { stage: 3, form: 'wide', feat: ['fin', 'antenna', 'fangs', 'spikes'] }, desc: 'The lord of the lightless deep. Its lure shines like a small moon.',
  });
ART[90] = { main: '#22306e', belly: '#6a88d0', acc: '#fff08a', body: 'fish', tail: 'fish', antenna: 'feather', mouth: 'teeth', eye: 'glow', iris: '#fff08a', fin: 'crest', gem: true, tentacles: true, bubbles: true, tusks: true };

// ---- Two-stage lines ---------------------------------------------------------------------
// Crystal-ball owl
D(91, 'Gazowl', ['Psychic'], [48, 34, 44, 66, 52, 58], 190, 60, {
  evo: [22, 92], learn: [[1, 'Peck'], [1, 'Confusion'], [6, 'Meditate'], [11, 'Gust'], [16, 'Psybeam']],
  look: { stage: 1, form: 'round', feat: ['wings', 'ears'] }, desc: 'A round owl that stares into a little glass orb and hoots softly.',
  habitat: [['mine', 10, 13, 6], ['mirewood', 8, 12, 5]] });
ART[91] = { main: '#b08ae8', belly: '#f6ecff', acc: '#7ad8ff', body: 'bird', wing: 'bird', mouth: 'beak', eye: 'round', iris: '#ffcf4a', eyeR: .2, gem: true, birdFeet: true, tuft3: true };
D(92, 'Oraclowl', ['Psychic', 'Flying'], [70, 52, 66, 112, 92, 78], 70, 170, {
  learn: [[1, 'Confusion'], [1, 'Meditate'], [1, 'Gust'], [18, 'Psybeam'], [24, 'Air Slash'], [30, 'Psychic'], [36, 'Moonbeam']],
  look: { stage: 2, form: 'round', feat: ['wings', 'ears', 'tail'] }, desc: 'Its crystal ball shows tomorrow, though it mostly predicts lunch.',
  habitat: [['mine', 15, 16, 1]] });
ART[92] = { main: '#9468d8', belly: '#f6ecff', acc: '#7ad8ff', body: 'bird', wing: 'big', tail: 'feather', horn: 'crest', mouth: 'beak', eye: 'glow', iris: '#ffcf4a', gem: true, halo: true, stars: true, birdFeet: true, tuft3: true };
// Toxic newt
D(93, 'Newtik', ['Poison'], [46, 52, 44, 48, 44, 56], 200, 60, {
  evo: [22, 94], learn: [[1, 'Scratch'], [1, 'Poison Sting'], [5, 'Water Gun'], [10, 'Poison Powder'], [15, 'Sludge']],
  look: { stage: 1, form: 'wide', feat: ['legs', 'tail'] }, desc: 'Its bright warning spots say do not touch. Believe the spots.',
  habitat: [['mirewood', 7, 11, 9], ['shore', 5, 9, 4]] });
ART[93] = { main: '#5ad0a8', belly: '#e8ffe8', acc: '#a050e0', tail: 'lizard', mouth: 'smile', eye: 'round', iris: '#3a2a6a', spots: '#8a3ad0', bugStripes: false };
D(94, 'Venomander', ['Poison', 'Water'], [72, 84, 70, 92, 72, 70], 75, 165, {
  learn: [[1, 'Poison Sting'], [1, 'Water Gun'], [1, 'Sludge'], [18, 'Bubble Beam'], [24, 'Cross Cut'], [30, 'Toxic Spray'], [34, 'Surf']],
  look: { stage: 2, form: 'wide', feat: ['legs', 'tail', 'arms', 'fangs'] }, desc: 'A swaggering swamp newt whose spit can melt a boot.',
  });
ART[94] = { main: '#3fbf95', belly: '#e8ffe8', acc: '#a050e0', tail: 'lizard', mouth: 'fang', eye: 'fierce', iris: '#ffe040', spots: '#8a3ad0', fin: 'crest', claws: true, bubbles: true, spikes: 'collar' };
// Shadow cat
D(95, 'Nyxkit', ['Dark'], [40, 52, 36, 56, 40, 84], 190, 60, {
  evo: [22, 96], learn: [[1, 'Scratch'], [1, 'Growl'], [5, 'Quick Attack'], [10, 'Bite'], [15, 'Pilfer']],
  look: { stage: 1, form: 'round', feat: ['ears', 'tail'] }, desc: 'A kitten made of dusk. It vanishes whenever it is not being watched.',
  habitat: [['mine', 10, 14, 6], ['mirewood', 8, 12, 5]] });
ART[95] = { main: '#4a4068', belly: '#8a7ab0', acc: '#ffe040', ear: 'cat', tail: 'curl', mouth: 'cat', eye: 'glow', iris: '#ffe040', whiskers: true, stars: true, float: false };
D(96, 'Umbrapard', ['Dark', 'Ghost'], [62, 88, 58, 84, 64, 106], 70, 168, {
  learn: [[1, 'Scratch'], [1, 'Bite'], [1, 'Pilfer'], [20, 'Night Slash'], [26, 'Shadow Claw'], [32, 'Dusk Fang'], [36, 'Phantom Rush']],
  look: { stage: 2, form: 'wide', feat: ['ears', 'tail', 'legs'] }, desc: 'A sleek night panther. Its stripes glow when it stalks.',
  habitat: [['mine', 15, 16, 2]] });
ART[96] = { main: '#352c58', belly: '#6a5a98', acc: '#9a7ae8', ear: 'cat', tail: 'curl', mouth: 'fang', eye: 'fierce', iris: '#ffe040', whiskers: true, stripes: true, claws: true, smoke: true };
// Bats
D(97, 'Dimwing', ['Dark'], [42, 46, 38, 50, 40, 76], 200, 55, {
  evo: [20, 98], learn: [[1, 'Peck'], [1, 'Growl'], [5, 'Gust'], [10, 'Bite'], [15, 'Wing Attack']],
  look: { stage: 1, form: 'round', feat: ['wings', 'ears', 'fangs'] }, desc: 'A sleepy little bat that hangs upside down and sings off-key.',
  habitat: [['mine', 10, 14, 8]] });
ART[97] = { main: '#6e4e8a', belly: '#ecc8f0', acc: '#ff8ab8', wing: 'bat', ear: 'spark', mouth: 'fang', eye: 'round', iris: '#ff8ab8', cheek: '#ff8ab8' };
D(98, 'Gloamwing', ['Dark', 'Flying'], [68, 82, 62, 82, 66, 112], 75, 165, {
  learn: [[1, 'Bite'], [1, 'Wing Attack'], [1, 'Gust'], [20, 'Night Slash'], [26, 'Air Slash'], [32, 'Crunch'], [36, 'Dusk Fang']],
  look: { stage: 2, form: 'round', feat: ['wings', 'ears', 'fangs', 'tail'] }, desc: 'It glides silently through caves and never bumps into anything.',
  habitat: [['mine', 15, 16, 2]] });
ART[98] = { main: '#5a3a7a', belly: '#ecc8f0', acc: '#ff5a8a', wing: 'big', ear: 'spark', tail: 'spade', mouth: 'fang', eye: 'glow', iris: '#ff5a8a', ruff: true, claws: true, tusks: true };
// Snail
D(99, 'Whelky', ['Water'], [58, 32, 72, 56, 56, 28], 200, 60, {
  evo: [24, 100], learn: [[1, 'Tackle'], [1, 'Harden'], [5, 'Water Gun'], [10, 'Confusion'], [15, 'Bubble Beam']],
  look: { stage: 1, form: 'round', feat: ['antenna'] }, desc: 'A slow snail with a swirly shell. It dreams in spirals.',
  habitat: [['shore', 5, 10, 8], ['mirewood', 7, 11, 4]] });
ART[99] = { main: '#f2a8c8', belly: '#fff0f4', acc: '#8a6ad8', body: 'shell', antenna: 'feather', mouth: 'smile', eye: 'sleepy', iris: '#6a3a8a', stars: true, cheek: '#ff8ab8' };
D(100, 'Whelmind', ['Water', 'Psychic'], [84, 48, 100, 116, 96, 36], 65, 175, {
  learn: [[1, 'Water Gun'], [1, 'Harden'], [1, 'Confusion'], [20, 'Bubble Beam'], [26, 'Psybeam'], [32, 'Surf'], [38, 'Psychic']],
  look: { stage: 2, form: 'wide', feat: ['antenna', 'horns'] }, desc: 'Its shell hums with thoughts. Sit near it and you may feel wise.',
  habitat: [['shore', 10, 10, 1]] });
ART[100] = { main: '#e888b8', belly: '#fff0f4', acc: '#8a6ad8', body: 'shell', antenna: 'feather', horn: 'unicorn', mouth: 'smile', eye: 'sleepy', iris: '#6a3a8a', stars: true, gem: true, cloud: true, halo: true };
// Snake
D(101, 'Hissle', ['Poison'], [44, 54, 42, 46, 42, 62], 210, 60, {
  evo: [23, 102], learn: [[1, 'Tackle'], [1, 'Poison Sting'], [5, 'Bite'], [10, 'Glare'], [15, 'Sludge']],
  look: { stage: 1, form: 'wide', feat: ['tail'] }, desc: 'A noodle-thin snake that hisses when it is happy, too.',
  habitat: [['mirewood', 6, 10, 8], ['ridge', 7, 12, 5]] });
ART[101] = { main: '#8a58b8', belly: '#f0e0a0', acc: '#e8d048', body: 'serpent', tail: 'curl', mouth: 'cheeky', eye: 'round', iris: '#e8d048', cheek: '#ff9ac0' };
D(102, 'Cobrance', ['Poison', 'Dragon'], [68, 92, 70, 76, 72, 90], 70, 165, {
  learn: [[1, 'Poison Sting'], [1, 'Bite'], [1, 'Glare'], [22, 'Sludge'], [28, 'Drake Breath'], [34, 'Toxic Spray'], [38, 'Wyrm Claw']],
  look: { stage: 2, form: 'wide', feat: ['tail', 'fangs', 'horns'] }, desc: 'It sways to a flute only it can hear, hood spread wide.',
  habitat: [['ridge', 12, 12, 1]] });
ART[102] = { main: '#7440a8', belly: '#f0e0a0', acc: '#e8d048', body: 'serpent', tail: 'curl', fin: 'head', mouth: 'fang', eye: 'fierce', iris: '#e8d048', tusks: true, stripes: true, crown: true };
// Crab
D(103, 'Pinchet', ['Water'], [52, 60, 58, 30, 40, 40], 220, 60, {
  evo: [24, 104], learn: [[1, 'Tackle'], [1, 'Water Gun'], [5, 'Jab'], [10, 'Harden'], [15, 'Bubble Beam']],
  look: { stage: 1, form: 'wide', feat: ['legs', 'arms'] }, desc: 'A scrappy crab that picks fights with bigger crabs and wins.',
  habitat: [['shore', 4, 9, 9]] });
ART[103] = { main: '#ef6a56', belly: '#ffe0c8', acc: '#ffd0a0', body: 'shell', mouth: 'open', eye: 'round', iris: '#5a2020', fists: true, claws: true, eyeR: .13 };
D(104, 'Clawmarch', ['Water', 'Fighting'], [74, 108, 100, 46, 64, 62], 80, 165, {
  learn: [[1, 'Water Gun'], [1, 'Jab'], [1, 'Harden'], [18, 'Bubble Beam'], [24, 'Palm Strike'], [30, 'Surf'], [34, 'Mighty Blow']],
  look: { stage: 2, form: 'wide', feat: ['legs', 'arms', 'spikes'] }, desc: 'It marches in time and its giant claws do the talking.',
  habitat: [['shore', 10, 10, 2]] });
ART[104] = { main: '#d84a3a', belly: '#ffe0c8', acc: '#ffd0a0', body: 'shell', mouth: 'teeth', eye: 'fierce', iris: '#ffe040', fists: true, claws: true, armor: true, horn: 'antler', shellSpikes: true };
// Jellyfish
D(105, 'Jelfizz', ['Water'], [50, 30, 40, 62, 58, 60], 200, 60, {
  evo: [24, 106], learn: [[1, 'Tackle'], [1, 'Water Gun'], [5, 'Thunder Shock'], [10, 'Bubble Beam'], [15, 'Static Lash']],
  look: { stage: 1, form: 'round', feat: ['bolt'] }, desc: 'A bubbly jelly that fizzes and tingles when you pat it.',
  habitat: [['shore', 5, 10, 8], ['mirewood', 8, 12, 3]] });
ART[105] = { main: '#8ae0f0', belly: '#e0faff', acc: '#ffe84a', body: 'jelly', tentacles: true, boltCol: '#ffe84a', mouth: 'open', eye: 'happy', iris: '#2a6a90', sparkles: true, float: true };
D(106, 'Stormedusa', ['Water', 'Electric'], [78, 48, 66, 106, 100, 78], 65, 170, {
  learn: [[1, 'Water Gun'], [1, 'Static Lash'], [1, 'Bubble Beam'], [26, 'Psybeam'], [30, 'Thunderbolt'], [34, 'Surf'], [38, 'Volt Crash']],
  look: { stage: 2, form: 'round', feat: ['bolt', 'tail'] }, desc: 'A drifting thundercloud of a jelly. Fishermen steer well clear.',
  habitat: [['shore', 10, 10, 1]] });
ART[106] = { main: '#6ac4e8', belly: '#e0faff', acc: '#ffe84a', body: 'jelly', tentacles: true, boltCol: '#fff070', mouth: 'smile', eye: 'fierce', iris: '#fff070', crown: true, halo: true, bubbles: true, float: true, sparkles: true };

// ---- Single-stage creatures ----------------------------------------------------------------
D(107, 'Lemurmur', ['Psychic', 'Fairy'], [70, 50, 64, 96, 92, 84], 90, 140, {
  learn: [[1, 'Confusion'], [1, 'Pixie Dust'], [6, 'Meditate'], [12, 'Psybeam'], [20, 'Glimmer'], [30, 'Mind Spike'], [38, 'Psychic']],
  look: { stage: 2, form: 'tall', feat: ['ears', 'tail', 'arms', 'legs'] }, desc: 'It stares into your eyes and knows what you will have for dinner.',
  habitat: [['mine', 12, 15, 4], ['sunmeadow', 6, 9, 3]] });
ART[107] = { main: '#c9cbe6', belly: '#f4f4ff', acc: '#5a4a8a', face: '#f4f4ff', ear: 'bear', tail: 'ringed', mouth: 'smile', eye: 'round', iris: '#ffb040', eyeR: .2, gem: true, paws: true, stars: true };
D(108, 'Kettlegeist', ['Ghost', 'Fire'], [90, 56, 84, 100, 88, 40], 80, 150, {
  learn: [[1, 'Lick'], [1, 'Ember'], [8, 'Hex Glow'], [14, 'Confusion'], [20, 'Gloom Orb'], [26, 'Shadow Claw'], [30, 'Flamethrower']],
  look: { stage: 2, form: 'round', feat: ['flame', 'arms', 'tail'] }, desc: 'An old copper kettle that boils with ghostly tea and a grudge.',
  habitat: [['mine', 11, 15, 4], ['mirewood', 9, 13, 3]] });
ART[108] = { main: '#b8744a', belly: '#e8b078', acc: '#ffb040', body: 'blob', mouth: 'grin', eye: 'glow', iris: '#ffb040', smoke: true, float: true, hook: true, gem: false, tailFlame: true, cheek: '#ff8a5a' };
D(109, 'Zaphron', ['Electric', 'Flying'], [64, 70, 56, 104, 66, 110], 70, 160, {
  learn: [[1, 'Peck'], [1, 'Thunder Shock'], [8, 'Gust'], [14, 'Thunder Wave'], [22, 'Wing Attack'], [28, 'Static Lash'], [34, 'Thunderbolt']],
  look: { stage: 2, form: 'tall', feat: ['wings', 'tail', 'bolt'] }, desc: 'A lanky heron that stands in storm puddles, hoping for lightning.',
  habitat: [['shore', 7, 10, 3], ['mirewood', 9, 13, 4]] });
ART[109] = { main: '#f4f0d8', belly: '#ffffff', acc: '#ffd23a', body: 'bird', wing: 'bird', tail: 'bolt', boltCol: '#ffd23a', horn: 'crest', mouth: 'beak', eye: 'normal', iris: '#2a5a90', legLift: 9, birdFeet: true, tuft3: true, sparkles: true };
D(110, 'Gloamhound', ['Dark'], [72, 102, 66, 60, 64, 106], 75, 160, {
  learn: [[1, 'Bite'], [1, 'Growl'], [8, 'Quick Attack'], [16, 'Crunch'], [24, 'Night Slash'], [32, 'Dusk Fang'], [38, 'Phantom Rush']],
  look: { stage: 2, form: 'wide', feat: ['ears', 'tail', 'legs', 'fangs'] }, desc: 'A moonlit hunter. Its howl makes lanterns flicker and go out.',
  habitat: [['ridge', 8, 12, 4], ['mine', 12, 16, 4]] });
ART[110] = { main: '#3a3a52', belly: '#7a7a9a', acc: '#a07ae8', ear: 'fox', tail: 'fluff', mouth: 'fang', eye: 'glow', iris: '#ff5a6a', claws: true, ruff: true, stars: true, smoke: true };
D(111, 'Gunkroak', ['Poison', 'Ground'], [110, 88, 112, 60, 70, 30], 100, 140, {
  learn: [[1, 'Tackle'], [1, 'Poison Sting'], [8, 'Mud Shot'], [15, 'Sludge'], [22, 'Slam'], [30, 'Earth Pulse'], [36, 'Toxic Spray']],
  look: { stage: 2, form: 'wide', feat: ['legs', 'spikes'] }, desc: 'A boggy old toad. It is mostly mud, grumbles, and mild toxins.',
  habitat: [['mirewood', 8, 13, 5]] });
ART[111] = { main: '#8e9a4a', belly: '#d8d890', acc: '#5a3a7a', body: 'blob', mouth: 'open', eye: 'sleepy', iris: '#5a3a1a', spots: '#5a3a7a', bubbles: true, spikes: 'collar', eyeAsp: 1.2, cheek: '#c8a050' };
D(112, 'Axolune', ['Water', 'Fairy'], [88, 52, 68, 92, 100, 70], 100, 140, {
  learn: [[1, 'Water Gun'], [1, 'Pixie Dust'], [8, 'Bubble Beam'], [14, 'Charm Wink'], [22, 'Glimmer'], [30, 'Surf'], [38, 'Moonbeam']],
  look: { stage: 2, form: 'wide', feat: ['fin', 'tail', 'legs'] }, desc: 'A moon-pink axolotl that smiles at ponds and makes them sparkle.',
  habitat: [['mirewood', 8, 13, 3], ['shore', 6, 10, 3]] });
ART[112] = { main: '#ffb8d8', belly: '#fff0f8', acc: '#ff7ab0', ear: 'frill', tail: 'fish', mouth: 'smile', eye: 'happy', iris: '#7a2a5a', sparkles: true, bubbles: true, cheek: '#ff7ab0', fin: 'head' };
D(113, 'Grumbadger', ['Fighting', 'Dark'], [82, 110, 90, 42, 70, 66], 75, 150, {
  learn: [[1, 'Scratch'], [1, 'Jab'], [8, 'Bite'], [16, 'Palm Strike'], [24, 'Pump Up'], [30, 'Crunch'], [36, 'Mighty Blow']],
  look: { stage: 2, form: 'wide', feat: ['ears', 'legs', 'arms'] }, desc: 'Grumpy, stubborn and unbothered by anything. Do not steal its snacks.',
  habitat: [['ridge', 8, 12, 4], ['mine', 12, 16, 3]] });
ART[113] = { main: '#575764', belly: null, acc: '#e8e8f0', face: '#f0f0f6', ear: 'nub', mouth: 'teeth', eye: 'fierce', iris: '#3a2a20', claws: true, fists: true, stripes: true, backStripes: true, tusks: true, scarf: false };
})();
