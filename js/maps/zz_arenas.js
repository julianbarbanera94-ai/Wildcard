// Arenas and the badge system (data and maps; docs/WORLD.md section 6). Loads after every city file, so it can aim each
// arena's exit back at its city's arena door. Runtime pieces (badge case, badge art, fanfare, gates) are in js/arenas.js.
(function () {
const G = globalThis.G;
const { interior, warp, npc, sign, set, DOWN, UP, LEFT, RIGHT } = G.mk;

// ---- Badges ---------------------------------------------------------------------------------------------
G.BADGES = [
  { id: 'keystone', name: 'Keystone Badge', city: 'stonebridge', type: 'Rock', leader: 'MASON', orb: 'Stone Orb', col: '#b08a5c', desc: 'Cut from the arch of Stonebridge. Proof that you can hold firm against anything.' },
  { id: 'bloom', name: 'Bloom Badge', city: 'sunhaven', type: 'Grass', leader: 'FERNA', orb: 'Verdant Orb', col: '#ff7aa8', desc: 'A flower that never wilts. It marks a Warden who grows stronger with every season.' },
  { id: 'tide', name: 'Tide Badge', city: 'lakeside', type: 'Water', leader: 'MARLO', orb: 'Aqua Orb', col: '#3a9cf0', desc: 'Shaped like a drop from Lakeside. It means you can go with the flow, or against it.' },
  { id: 'gale', name: 'Gale Badge', city: 'driftwood', type: 'Flying', leader: 'ZEPHYRA', orb: 'Gale Orb', col: '#8ec8f8', desc: 'Two wings caught mid-flight. The Driftwood winds now carry you.' },
  { id: 'dune', name: 'Dune Badge', city: 'sandsreach', type: 'Ground', leader: 'OSHA', orb: 'Stone Orb', col: '#e0b050', desc: 'A sun-baked disc from Sandsreach. Whoever wears it never gets lost in the sand.' },
  { id: 'circuit', name: 'Circuit Badge', city: 'cobalt', type: 'Electric', leader: 'RAYNE', orb: 'Pulse Orb', col: '#ffd830', desc: 'A live wire in a hexagon. It hums when a battle gets exciting.' },
  { id: 'rime', name: 'Rime Badge', city: 'frostmere', type: 'Ice', leader: 'ISOLDE', orb: 'Frost Orb', col: '#7fe0f0', desc: 'A snowflake that does not melt. It is earned by a calm mind in a cold fight.' },
  { id: 'magma', name: 'Magma Badge', city: 'emberfall', type: 'Fire', leader: 'PYRRA', orb: 'Flare Orb', col: '#ff6a2a', desc: 'A flame forged in the volcano. It burns as bright as your bond with your team.' },
];
G.badgeCount = () => G.BADGES.filter(b => G.state && G.state.flags['badge_' + b.id]).length;
G.badgeGate = (n, place) => G.badgeCount() >= n ? null : `A ranger blocks the way. "${place || 'This area'} is only open to Wardens with ${n} Arena Badge${n > 1 ? 's' : ''}. You have ${G.badgeCount()}."`;
// What each new badge count opens (WORLD.md section 3 gates).
G.BADGE_OPENS = { 1: 'Evergreen Forest and Whispering Woods', 2: 'Driftwood Port and Sandsreach Desert', 3: 'Cloudpeak, Tidefall and the Verdant ferry', 4: 'Cobalt City and the Crimson Badlands', 5: 'Glacier Pass and Frostmere', 6: 'Emberfall', 8: 'Moonlit Island and the Aurora Isles' };

// ---- Arena definitions -------------------------------------------------------------------------------------
// grid: 19 rows of 13 columns (inside the wall). Three wall rows split it into a hall, and three chambers; a single gap in each
// leads on, zig-zagging from the entrance at the bottom to the Leader at the top.
// Chars: '.' floor, 'X' wall, 'o' obstacle, ',' alt floor, 'P' sand pit, '1' '2' '3' trainers, 'Q' Leader, 'G' guide, 'N' sign, '*' item
// (cfg.items), '[' ']' '<' gates and '{' '}' '(' their switches (electric), anything else is a literal tile char.
const ST = G.mk.ST;
const LEADER_LOOK = {
  Rock: { hair: '#4a3a30', skin: '#e0b088', shirt: '#9a7a55', pants: '#4a4048', hat: '#c8a050' },
  Grass: { hair: '#3a7a3a', skin: '#f8d0a8', shirt: '#6cc060', pants: '#8a6a40', hat: '#f0a8c8' },
  Water: { hair: '#2a5aa0', skin: '#f0c8a0', shirt: '#3a9cf0', pants: '#284870', hat: '#f8f8f8' },
  Flying: { hair: '#f0e0a0', skin: '#f8d0a8', shirt: '#9ad0f8', pants: '#e8e8f4', hat: '#e8f4ff' },
  Ground: { hair: '#2a2018', skin: '#c89868', shirt: '#e0b050', pants: '#8a5a30', hat: '#e8d0a0' },
  Electric: { hair: '#f0d030', skin: '#f8d0a8', shirt: '#2a2a40', pants: '#ffd830', hat: '#ffd830' },
  Ice: { hair: '#e8f4ff', skin: '#f4e0d8', shirt: '#7fb8e8', pants: '#e8f4ff', hat: '#cfeeff' },
  Fire: { hair: '#d03a20', skin: '#e8b890', shirt: '#e8502a', pants: '#3a2a30', hat: '#ffb040' },
};
const ARENAS = {
  stonebridge: {
    floor: 'T', wall: '^', obs: 'r', gap: '.',
    grid: ['L...........L', '.....OQO.....', '......a......', '......a......', 'XXXXXX.XXXXXX',
      '.o.....o.....', '...o.1....o..', '.o.....o...o.', '....o...o....', 'XX.XXXXXXXXXX',
      '...o.....o...', '.o...o.2..o.o', '...o.o.....o.', '.o.....o.....', 'XXXXXXXXXX.XX',
      '....o...o....', '.o....o..3...', '...o.....o.o.', '.G...o.....N.'],
    items: [[11, 5, 'Super Potion'], [12, 16, 'Stone Orb', 2]],
    guide: ['A rock maze, with a Leader at the far end! I clear the boulders every morning and they roll back by night.', 'Rock-types are sturdy but slow. Water and Grass attacks crack them like eggs.'],
    sign: 'STONEBRIDGE ARENA\nRock-type. Leader: MASON.',
    leader: { name: 'MASON', pos: [6, 1], look: 'Rock', team: [[14, 12], [129, 13], [141, 14], [15, 15]],
      pre: ['Mason here. I laid the stones of every bridge in this town, and I will not move for you.', 'A Warden is built like an arch: every stone leans on another. Show me how your team leans on each other!'],
      win: 'The keystone holds, and so did you. Well fought!', post: 'Water or Grass, that is how you crack a rock. Come back when you have more badges and I will build you a harder test.' },
    trainers: [
      { id: 1, dir: 0, sight: 3, style: 'hiker', name: 'FLINT', cls: 'MINER', team: [[14, 10], [129, 11]], pre: 'Careful where you step. These boulders hide more than rocks!', win: 'You broke through my guard.', post: 'Mason is up past the second wall.' },
      { id: 2, dir: 2, sight: 3, style: 'lass', name: 'GRETA', cls: 'GEOLOGIST', team: [[129, 11], [141, 11]], pre: 'I study stones, and your creatures look like fine specimens!', win: 'Fascinating. A clean break.', post: 'The Leader hates it when I tap his walls.' },
      { id: 3, dir: 2, sight: 3, style: 'camper', name: 'PIP', cls: 'CLIMBER', team: [[14, 10], [14, 11], [141, 11]], pre: 'I climbed in here for fun, but now I want to battle!', win: 'I will go climb something else.', post: 'The way up is through the right side, then left, then middle.' },
    ],
  },
  sunhaven: {
    floor: 'g', wall: 'u', obs: 'u', alt: 'f', gap: '.', hallPath: 'p',
    grid: ['L...........L', '.,,..OQO..,,.', '......p......', '......p......', 'XXXXXX.XXXXXX',
      '.,.X.....X.,.', '...X.1.X.X...', '.X...X...X.X.', '.X.X...,...X.', 'XX.XXXXXXXXXX',
      '...X...,X.,..', '.X.X.X.2X.X..', '.X...X...X.X.', '.X.X.,.X...X.', 'XXXXXXXXXX.XX',
      '.,...X...,...', '...X...X.3...', '.X...X...X.X.', '.G.X.....X.N.'],
    items: [[1, 5, 'Verdant Orb', 2], [11, 8, 'Super Potion']],
    guide: ['Welcome to the Garden Arena! Do not trample the hedges, Ferna will hear you.', 'Grass-types hate Fire, Ice and Flying attacks. Bring something that burns!'],
    sign: 'SUNHAVEN ARENA\nGrass-type. Leader: FERNA.',
    leader: { name: 'FERNA', pos: [6, 1], look: 'Grass', team: [[26, 16], [38, 17], [60, 18], [28, 19]],
      pre: ['Oh, a visitor! Mind the hedges. I grow everything in here myself, flowers and Wardens alike.', 'Gentle things grow strongest. Let me see what kind of garden you have grown!'],
      win: 'My petals are all out! You tend your team well.', post: 'Fire and Flying scorch my garden, you know. Come back with more badges for a rematch, and bring a watering can.' },
    trainers: [
      { id: 1, dir: 0, sight: 3, style: 'lass', name: 'DAISY', cls: 'GARDENER', team: [[26, 13], [38, 14]], pre: 'You walked right through my tulips! Battle time!', win: 'My poor tulips...', post: 'Ferna keeps the best roses at the far end.' },
      { id: 2, dir: 2, sight: 3, style: 'bug', name: 'MOSS', cls: 'BUG CATCHER', team: [[38, 14], [59, 14], [26, 15]], pre: 'The hedges are full of creatures. I know all of them!', win: 'The hedge hid a stronger one than me.', post: 'Left, then right, then up the middle. That is the maze.' },
      { id: 3, dir: 2, sight: 3, style: 'girl', name: 'IVY', cls: 'FLORIST', team: [[26, 14], [60, 15]], pre: 'Stop and smell the flowers, then fight me!', win: 'You smell like victory.', post: 'I do the arrangements for the Leader.' },
    ],
  },
  lakeside: {
    floor: 'T', wall: 'w', obs: 'w', gap: 'z',
    grid: ['L...........L', '.....OQO.....', '......a......', '......a......', 'wwwwwwzwwwwww',
      '........1....', 'oozzzoooooooo', 'oozoooooooooo', '.............', 'wwzwwwwwwwwww',
      '.....2...ooo.', 'ooozzzzzzoooo', 'oooooooozzzoo', '.............', 'wwwwwwwwwwzww',
      '..ooooo.....o', '..ooooo.3o...', '.............', '.G.........N.'],
    items: [[0, 5, 'Aqua Orb', 2], [0, 18, 'Super Potion']],
    guide: ['Welcome to the Tide Arena! The pools are deeper than they look, so stay on the stepping stones.', 'Water-types love rain but fear Grass and Electric attacks. A good zap goes a long way.'],
    sign: 'LAKESIDE ARENA\nWater-type. Leader: MARLO.',
    leader: { name: 'MARLO', pos: [6, 1], look: 'Water', team: [[88, 20], [53, 21], [47, 22], [42, 22], [34, 23]],
      pre: ['Ahoy, little Warden! Marlo, captain of the Tide Arena. You hopped all the way over my pools? Not bad.', 'Now let us see if you can handle a real current!'],
      win: 'Ha ha! Swept right off my feet. The Tide Badge is yours!', post: 'Grass and Electric moves are the way to beat my crew. Come find me for a rematch when the tide turns.' },
    trainers: [
      { id: 1, dir: 2, sight: 4, style: 'camper', name: 'REEF', cls: 'ANGLER', team: [[88, 17], [41, 18]], pre: 'Got a bite! You will do!', win: 'You got away!', post: 'The best fish live under the stones.' },
      { id: 2, dir: 2, sight: 3, style: 'boy', name: 'SPLASH', cls: 'SWIMMER', team: [[32, 18], [70, 19]], pre: 'Race you across the pool! With creatures!', win: 'You swim faster than I do.', post: 'The stepping stones go left, then up.' },
      { id: 3, dir: 0, sight: 3, style: 'lass', name: 'CORAL', cls: 'DIVER', team: [[103, 17], [105, 18], [88, 18]], pre: 'I just came up for air, and a battle!', win: 'I need a deep breath after that.', post: 'Marlo is at the top of the pools.' },
    ],
  },
  driftwood: {
    floor: 'v', wall: 'w', obs: 'w', gap: 'a', path: 'a',
    grid: ['wwwwwwwwwwwww', 'wwwvvOQOvvwww', 'wwwvvvavvvwww', 'wwwwwwawwwwww', 'wwwwwwawwwwww',
      'wvvvvvavvvvvw', 'wvv1vvvvvv3vw', 'wvvvvwwwvvvvw', 'wwawwwwwwwwww', 'wwawwwwwwwwww',
      'wvvvvvvvvvvvw', 'wvvwvv2vvwvvw', 'wvvwvvvvvwvvw', 'wvvvvvvvvvvvw', 'wwwwwwwwwwaww',
      'wwwwwwwwwwaww', 'wvvvvvvvvvvvw', 'wvvvwvvvwvvvw', 'wvGvvvvvvvNvw'],
    items: [[1, 7, 'Gale Orb', 2], [11, 17, 'Super Potion']],
    guide: ['Welcome to the Gale Arena! The floor is only clouds and feathers, so do not look down.', 'Flying-types soar over most things, but Electric, Ice and Rock attacks bring them right back to earth.'],
    sign: 'DRIFTWOOD ARENA\nFlying-type. Leader: ZEPHYRA.',
    leader: { name: 'ZEPHYRA', pos: [6, 1], look: 'Flying', team: [[17, 24], [142, 25], [56, 25], [109, 26], [28, 27]],
      pre: ['Whoosh! Zephyra, at your service. You made it across my feather bridges without falling? The wind likes you.', 'Hold onto your hat. This is going to be a quick one!'],
      win: 'Whoa! You blew right through my flock! The Gale Badge is yours!', post: 'Rock and Ice are what knock me out of the sky. The wind is calling me, so come find me on a breezy day for a rematch!' },
    trainers: [
      { id: 1, dir: 3, sight: 3, style: 'kid', name: 'KITE', cls: 'BIRD KEEPER', team: [[16, 21], [35, 22]], pre: 'My birds can see you from up here!', win: 'You flew past me.', post: 'The wind loves a brave Warden.' },
      { id: 3, dir: 2, sight: 3, style: 'girl', name: 'WREN', cls: 'SKY DANCER', team: [[17, 22], [27, 22]], pre: 'Dance with me on the clouds!', win: 'You lead beautifully.', post: 'Mind the edges. It is a long way down.' },
      { id: 2, dir: 0, sight: 3, style: 'camper', name: 'TALON', cls: 'FALCONER', team: [[16, 22], [141, 22], [56, 22]], pre: 'Nothing gets past my falcons!', win: 'You are faster than a falcon.', post: 'Left across the feathers, then right, then straight up.' },
    ],
  },
  sandsreach: {
    floor: 'y', wall: 'C', obs: 'r', gap: '.', hallPath: 'a',
    grid: ['L...........L', '.....OQO.....', '......a......', '......a......', 'XXXXXX.XXXXXX',
      '..r.....P.r..', '.P..1.....P..', '...r.PP.r....', '.r.......P.r.', 'XX.XXXXXXXXXX',
      '...r..P...r..', '.P.....2.P...', '...r.P.....r.', '.r...P..r....', 'XXXXXXXXXX.XX',
      '.P...r...P...', '...r...r...3.', '.r...P.....r.', '.G..P.....N..'],
    pitTo: 6,
    items: [[12, 5, 'Stone Orb', 2], [0, 15, 'Super Potion']],
    guide: ['Welcome to the Dune Arena! Watch for the soft patches. The sand pits will dump you right back at the door.', 'Ground-types are tough, but Water, Grass and Ice attacks wash them away. Electric will not touch them at all!'],
    sign: 'SANDSREACH ARENA\nGround-type. Leader: OSHA.',
    leader: { name: 'OSHA', pos: [6, 1], look: 'Ground', team: [[121, 28], [144, 29], [118, 29], [111, 30], [122, 31]],
      pre: ['Hm. You avoided the pits. Most people take the long way through the sand.', 'I am Osha. I have walked this desert since before you were hatched. Let us see if you can stand your ground.'],
      win: 'Hah! Sand shifts, but you did not. Take the Dune Badge.', post: 'Water, Grass and Ice, that is all the sand fears. Return when you have more badges, and I will bury you in a rematch.' },
    trainers: [
      { id: 1, dir: 0, sight: 3, style: 'hiker', name: 'DUSTY', cls: 'RUINS DIGGER', team: [[120, 25], [21, 26]], pre: 'Found something interesting! Your creatures!', win: 'You dug me out.', post: 'Mind the pits. They have no bottom.' },
      { id: 2, dir: 2, sight: 3, style: 'kade', name: 'SCARAB', cls: 'NOMAD', team: [[143, 25], [121, 26]], pre: 'The desert tests everyone who crosses it.', win: 'You passed my test.', post: 'Keep to the stones and walk slowly.' },
      { id: 3, dir: 2, sight: 3, style: 'old', name: 'TAMARISK', cls: 'ELDER', team: [[21, 25], [120, 26], [143, 26]], pre: 'Young one, sit and battle an old digger!', win: 'Old bones, new tricks.', post: 'Osha was once my student.' },
    ],
  },
  cobalt: {
    floor: 'v', wall: 'B', obs: 'l', alt: 'x', gap: '.',
    gates: { '[': ['y', '#ffd23a', 'YELLOW'], ']': ['c', '#3ae0e8', 'CYAN'], '<': ['m', '#ff5ad0', 'PINK'] }, switches: { '{': 'y', '}': 'c', '(': 'm' },
    grid: ['L...........L', '.....OQO.....', '......a......', '......a......', 'BBBBBB<BBBBBB',
      '.x...l.....x.', '(..1....l...x', '.x.....x.....', '.l....l..x...', 'BB]BBBBBBBBBB',
      '.....2..l...x', 'x...l...l..}.', '.x....x...x..', '..l.....x....', 'BBBBBBBBBB[BB',
      '.x...l...x...', '{..l...l3....', '.x...x.....x.', '.G.l.......N.'],
    items: [[12, 7, 'Pulse Orb', 2], [1, 17, 'Super Potion']],
    guide: ['Welcome to the Circuit Arena! Those laser gates are wired to switches. Press the glowing panel in each room to open the way.', 'Electric-types are fast, but Ground-types shrug off their shocks completely.'],
    sign: 'COBALT ARENA\nElectric-type. Leader: RAYNE.',
    leader: { name: 'RAYNE', pos: [6, 1], look: 'Electric', team: [[13, 32], [80, 33], [106, 33], [136, 34], [109, 34], [81, 35]],
      pre: ['Zzzap! You found all three switches? Not bad, not bad! I am Rayne, and I rewired this whole place myself!', 'Ready? Let us turn the power up to max!'],
      win: 'Short circuit! I overloaded! The Circuit Badge is yours, sparky!', post: 'A Ground-type blocks every shock I have. Come back for a rematch, and I will have a new battery.' },
    trainers: [
      { id: 1, dir: 3, sight: 3, style: 'clerk', name: 'WATT', cls: 'ENGINEER', team: [[12, 28], [79, 29]], pre: 'Careful, that wiring is live!', win: 'You blew my fuse.', post: 'The pink gate opens from the top room.' },
      { id: 2, dir: 2, sight: 3, style: 'prof', name: 'OHM', cls: 'SCIENTIST', team: [[79, 29], [109, 30], [12, 30]], pre: 'Let us test your resistance!', win: 'Your resistance is impressive.', post: 'The cyan switch is on the right wall.' },
      { id: 3, dir: 3, sight: 3, style: 'kid', name: 'BOLT', cls: 'TECHNICIAN', team: [[12, 28], [12, 29]], pre: 'I fixed these lights, so now I fix you!', win: 'I will need a recharge.', post: 'The yellow switch is in the first room, left side.' },
    ],
  },
  frostmere: {
    floor: 'v', wall: 'i', obs: 'i', gap: '.',
    grid: ['L...........L', '.....OQO.....', '......a......', '......a......', 'iiiiii.iiiiii',
      '.i...i...i.i.', '...i.1.i...i.', '.i...i...i...', '.i.i...i...i.', 'ii.iiiiiiiiii',
      '...i...i.i...', '.i.i.i.2...i.', '.i...i...i.i.', '...i.....i...', 'iiiiiiiiii.ii',
      '.i...i...i...', '...i...i3....', '.i...i...i.i.', '.G.i.......N.'],
    items: [[12, 5, 'Frost Orb', 2], [0, 16, 'Super Potion']],
    guide: ['Welcome to the Rime Arena! Mind the crystals. They are sharper than they look.', 'Ice-types are brittle. Fire, Fighting, Rock and Steel moves shatter them in a single hit.'],
    sign: 'FROSTMERE ARENA\nIce-type. Leader: ISOLDE.',
    leader: { name: 'ISOLDE', pos: [6, 1], look: 'Ice', team: [[127, 37], [58, 37], [37, 38], [140, 38], [148, 39], [128, 40]],
      pre: ['Welcome. I am Isolde. Forgive the cold, it keeps the mind clear.', 'You have come far through my crystal halls. Let us see whether your composure is as strong as your team.'],
      win: 'Magnificent. Not a single flake out of place. The Rime Badge is yours.', post: 'Fire, Fighting, Rock and Steel are my only worries. Return when you have more badges, and I shall freeze the battlefield.' },
    trainers: [
      { id: 1, dir: 0, sight: 3, style: 'old', name: 'FROST', cls: 'SKATER', team: [[126, 33], [57, 34]], pre: 'Slip into a battle with me!', win: 'You skate circles around me.', post: 'Go left, then right, then up the centre.' },
      { id: 2, dir: 2, sight: 3, style: 'lass', name: 'FLURRY', cls: 'SNOW BUNNY', team: [[57, 34], [36, 35], [147, 35]], pre: 'It is snowing, so it is battle time!', win: 'You melted my heart.', post: 'Isolde loves her crystals.' },
      { id: 3, dir: 2, sight: 3, style: 'kade', name: 'SLEET', cls: 'ICE CLIMBER', team: [[126, 34], [139, 34]], pre: 'I climbed all these crystals myself!', win: 'You are on thin ice.', post: 'Cold hands, warm heart.' },
    ],
  },
  emberfall: {
    floor: 'c', wall: '!', obs: '!', gap: 'z',
    grid: ['L...........L', '.....OQO.....', '......a......', '......a......', '!!!!!!z!!!!!!',
      '..o.....o.o..', '.oo.1...o....', '.....o.....o.', '.o.....o..o..', '!!z!!!!!!!!!!',
      '.o.......o...', '.oo.2.o..o...', '...o.......o.', '.o...oo..o...', '!!!!!!!!!!z!!',
      '..o.....o....', '.oo...o...3o.', '....o...o.o..', '.G.o.....oN..'],
    items: [[12, 5, 'Flare Orb', 2], [0, 18, 'Super Potion']],
    guide: ['Welcome to the Magma Arena! Walk the stone paths, because the lava is not for swimming.', 'Fire-types burn hot, but Water, Ground and Rock attacks put them out fast.'],
    sign: 'EMBERFALL ARENA\nFire-type. Leader: PYRRA.',
    leader: { name: 'PYRRA', pos: [6, 1], look: 'Fire', team: [[119, 42], [146, 43], [134, 43], [108, 43], [3, 44], [155, 45]],
      pre: ['HA! You walked the lava paths without flinching? I like you already! I am Pyrra, keeper of the Magma Arena!', 'Burn bright, little Warden. Show me the fire in your heart!'],
      win: 'AAH! That is a fire! The Magma Badge is yours, and you have earned it!', post: 'Water, Ground and Rock are what I fear. I will be waiting at the crater for our rematch, so stoke your embers!' },
    trainers: [
      { id: 1, dir: 0, sight: 3, style: 'camper', name: 'CINDER', cls: 'FIREWALKER', team: [[145, 39], [117, 40]], pre: 'Walk the coals with me!', win: 'You walk through fire!', post: 'Pyrra is up past the third bridge.' },
      { id: 2, dir: 1, sight: 3, style: 'hiker', name: 'SLAG', cls: 'SMELTER', team: [[132, 40], [118, 40], [145, 41]], pre: 'Time to forge your resolve!', win: 'You cooled my steel.', post: 'The stones are firm. The lava is not.' },
      { id: 3, dir: 2, sight: 3, style: 'boy', name: 'EMBER', cls: 'STOKER', team: [[1, 38], [117, 39], [2, 40]], pre: 'I keep the fires burning, so burn with me!', win: 'My fire went out.', post: 'Do not stop on a hot tile.' },
    ],
  },
};
G.ARENA_DEFS = ARENAS;

// ---- Build the arenas -------------------------------------------------------------------------------------
const TR_DIRS = [DOWN, UP, LEFT, RIGHT];
for (const b of G.BADGES) {
  const cfg = ARENAS[b.city], id = 'arena_' + b.city, W = 15, H = cfg.grid.length + 2, mat = 7;
  const m = interior(id, b.city.toUpperCase() + ' ARENA', W, H, mat);
  m.arenaType = b.type; m.badge = b.id; m.pits = [];
  m.t.forEach((r, y) => r.fill(y === 0 || y === H - 1 ? 'B' : 'T'));
  for (let y = 0; y < H; y++) { set(m, 0, y, 'B'); set(m, W - 1, y, 'B'); }
  set(m, mat, H - 1, 'm');
  const gates = [], pos = {};
  cfg.grid.forEach((row, iy) => {
    if (row.length !== 13) throw new Error(`${id}: row ${iy} has ${row.length} columns`);
    [...row].forEach((c, ix) => {
      const x = ix + 1, y = iy + 1; let ch = c;
      const wallRow = iy === 4 || iy === 9 || iy === 14;
      if (c === '.') ch = wallRow && cfg.gap !== '.' ? cfg.gap : cfg.floor;
      else if (c === 'X') ch = cfg.wall; else if (c === 'o') ch = cfg.obs; else if (c === ',') ch = cfg.alt || cfg.floor;
      else if (c === 'a' && cfg.path) ch = cfg.path;
      else if (/[123QGN*P]/.test(c)) { ch = c === 'P' ? 'c' : c === 'N' ? 's' : cfg.floor; pos[c] = pos[c] || []; pos[c].push([x, y]); }
      else if (cfg.gates && cfg.gates[c]) { ch = cfg.floor; gates.push({ x, y, key: cfg.gates[c][0], col: cfg.gates[c][1], name: cfg.gates[c][2] }); }
      else if (cfg.switches && cfg.switches[c]) { ch = 'h'; pos.sw = pos.sw || []; pos.sw.push([x, y, cfg.switches[c]]); }
      if (c === 'a' && !cfg.path && cfg.hallPath && iy < 4) ch = cfg.hallPath;
      set(m, x, y, ch);
    });
  });
  // exit: back to the city's arena door; and the door leads in here
  warp(m, mat, H - 1, b.city, 0, 0, DOWN);
  const entry = [mat, H - 2];
  const city = G.MAPS[b.city], door = city && city.warps.find(w => w.to === id);
  if (door) { Object.assign(m.warps[0], { tx: door.x, ty: door.y + 1 }); Object.assign(door, { tx: entry[0], ty: entry[1] }); }
  else Object.assign(m.warps[0], { tx: 1, ty: 1 });
  m.arenaDoor = !!door;
  m.landing = { x: entry[0], y: entry[1] };
  // sand pits slip back to the entrance
  for (const [x, y] of pos.P || []) { warp(m, x, y, id, entry[0], entry[1], UP); m.warps[m.warps.length - 1].pit = true; m.pits.push([x, y]); }
  // items
  (cfg.items || []).forEach(([ix, iy, item, qty], k) => { const x = ix + 1, y = iy + 1; set(m, x, y, cfg.floor); m.objs.push({ x, y, id: `${id}_item${k}`, item, qty: qty || 1, ball: true }); });
  // sign and guide
  const [sx, sy] = pos.N[0];
  m.objs.push({ x: sx, y: sy, prompt: 'Read', fn: async () => { const n = G.badgeCount(); await G.story.says([cfg.sign, `Badges earned: ${n} of 8.`]); } });
  const [gx, gy] = pos.G[0];
  npc(m, gx, gy, UP, 'elder', null, { still: true, talk: async () => {
    const n = G.badgeCount(), mine = G.state.flags['badge_' + b.id];
    await G.story.says([`GUIDE: ${cfg.guide[0]}`, `You carry ${n} of 8 Arena Badges${mine ? ', and this one is already yours!' : '.'}`, cfg.guide[1]]);
  } });
  // trainers (unique ids) and the Leader
  for (const t of cfg.trainers) {
    const [tx, ty] = pos[t.id][0];
    G.mk.trainer(m, `${id}_t${t.id}`, tx, ty, TR_DIRS[t.dir], t.style, { name: t.name, cls: t.cls, sight: t.sight, team: t.team, pre: t.pre, win: t.win, post: t.post, prize: 30 });
  }
  const L = cfg.leader, [lx, ly] = [L.pos[0] + 1, L.pos[1] + 1], style = LEADER_LOOK[L.look];
  npc(m, lx, ly, DOWN, 'boy', null, { style, still: true, trainer: { id: `${id}_leader`, style, name: L.name, cls: 'ARENA LEADER', sight: 4, team: L.team, pre: L.pre, win: L.win, post: L.post, prize: 100, leader: b.id } });
  if (b.type === 'Fire') m.bg = 'cave';
  m.gates = gates; m.switches = pos.sw || [];
}
})();
