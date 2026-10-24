// Stage B caves (docs/CAVES.md): four 40 x 32 cave interiors from the cave map pack, and the cave mouths that lead to them.
// Tiles as in Glimmer Mine (js/maps/ridge.js): C wall, c tunnel, e cavern floor (encounters), w water, ! lava, 3 plank bridge,
// o dais or rune stone, i crystal, 5 stalagmite, 8 glowing mushrooms (Glowcap Spores), 9 rune pillar, 6 lantern, 7 light shaft,
// r boulder. Every cave is entered from the south and has an optional reward reached off the main route; the hidden nooks
// behind LIGHT gaps are field spots in js/field.js. Runs after zz_mouths.js (it takes over three of its mouths; the old
// small rooms stay defined so a save made inside one still loads) and before zz_mouths_dress.js, which themes and lights them.
(function () {
const { newMap, set, warp, trainer, DOWN, UP, RIGHT } = G.mk, maps = G.MAPS;
const says = t => G.worldApi.says(t), F = () => G.state.flags;
function build(id, name, rows, enc, back) {
  const m = newMap(id, name, 40, 32, 'C', { music: 'cave', bg: 'cave', banner: true, outdoor: false, enc });
  rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) set(m, x, y, row[x]); });
  for (const x of [18, 19, 20, 21]) warp(m, x, 31, back.map, back.x, back.y, DOWN);
  return m;
}
// A cave mouth on an overworld map now leads into the cave (arriving on its entrance tunnel).
function link(from, tiles, to) {
  const m = maps[from]; if (!m) return;
  const old = m.warps.filter(w => tiles.some(([x, y]) => w.x === x && w.y === y));
  for (const w of old) if (maps[w.to]) maps[w.to].retired = true;   // the small room it used to lead to: kept, no longer entered
  m.warps = m.warps.filter(w => !old.includes(w));
  tiles.forEach(([x, y], i) => warp(m, x, y, to, 19 + (i % 2), 30, UP));
}
// Tiles that change when a puzzle is solved; the terrain and minimap caches follow m.rev.
const retile = (m, tiles, ch) => { for (const [x, y] of tiles) m.t[y][x] = ch; m.rev = (m.rev || 0) + 1; };

// ---- Emberfall Tunnels: lava fields round a central hall, an ore face in the west and a hot chamber in the east. The dark
// stones across the eastern magma river lead to an island. Behind the Emberfall cave mouth.
const ember = build('cave_emberfall', 'EMBERFALL TUNNELS', [
    'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCCCCCC6CCCCCCCeCCCCCCC',
    'CCCCCCCCCCCCCCCecccc5ccrccCCCCereeeCCCCC',
    'CCCCC6CCeCCCCeeccc5ccc5cccceCreeeereCCCC',
    'CCCCCCeeeeeCcc6ccccccccccccceeeeeeeeeCCC',
    'CCCCCeeeereeccccccccccccccccceeeeeeeCCCC',
    'CCCCeeereeerecccccceeeecc!ccceeeeeeCCCCC',
    'CCCCCeeeeeeecccccceeeeeeccccceeeeCC6CCCC',
    'CCCCCCeeeeecccceeereeee!!!!cceeeeCCCCCCC',
    'CCCCCCCCeee!ccceeeeeeee!!!!!!eeeeCCCCCCC',
    'CCCCCCCCeeeccccccceeeee!!!!!!!!eeCCCCCCC',
    'CCCCCCCCeeecccccccceeeeec!!!!!!!!CCCCCCC',
    'CCCCCCCeeeecc!!!ccceeeccccc!!!!!!ccCCCCC',
    'CCCCCC6Ceee!!!!!ccceecccccccc!!!!c!!CCCC',
    'CCCCCCCCee!!!!!!ccceeccccccceee!!c!!CCCC',
    'CCCCCCCCe!!!!!!cccceecccccceeeeeec!!!CCC',
    'CCCCCC!!!!!!!eecccccecccceeee5eee!!!!!CC',
    'CCC!!!!!!!!!eeecccccceeeeeeeeeeeCC!!!!CC',
    'CCC!!!!!!!!eeeeccccccceeeeeeeeeCCCC!!!CC',
    'CCC!!!!!CCeeeeeecccccceeeeeeeeeCCCC!!!CC',
    'CCCCCCCCCCCreeeeeccccceeeeeeer6CCCCCCCCC',
    'CCCCCCCCCCCCCeee6ecccceeeeeeCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCeecccccceeeCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCccccccCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCccccccCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCccccccCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCccccccCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCccccCCCCCCCCCCCCCCCCCC',
], [[117, 38, 44, 10], [132, 38, 44, 10], [145, 38, 44, 10], [141, 38, 44, 8], [149, 38, 44, 6], [115, 40, 45, 4], [118, 42, 46, 3], [133, 42, 46, 3], [116, 46, 48, 1]], { map: 'emberfall', x: 29, y: 15 });
ember.objs.push({ x: 6, y: 9, id: 'ce_ore', item: 'Iron Ore', qty: 4, ball: true }, { x: 34, y: 9, id: 'ce_chamber', item: 'Flare Orb', qty: 3, ball: true },
  { x: 34, y: 16, id: 'ce_island', item: 'Mythic Orb', ball: true });
trainer(ember, 'ce_brand', 13, 9, RIGHT, 'hiker', { name: 'BRAND', cls: 'FIRE BREATHER', sight: 4, team: [[117, 40], [145, 41], [118, 43]], pre: 'The tunnels are warm today. So am I!', win: 'You put my fire right out.', post: 'See the dark stones in the eastern magma river? Step only on those.', prize: 80 });
link('emberfall', [[28, 14], [29, 14]], 'cave_emberfall');

// ---- Frostmere Grotto: a frozen hall between two lakes. The ice switch in the middle raises old walkways across both lakes to
// the islands with the frost relic and a Mythic Orb. Behind the cave mouth on Glacier Pass, which had a crystal in front of it.
const ICE = [[11, 20], [12, 20], [27, 20], [28, 20], [29, 20]];
const frost = build('cave_frostmere', 'FROSTMERE GROTTO', [
    'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCiCCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCiccccccccciCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCccccccccccccccCCCCiCCCCCCCC',
    'CCCCCCCiCCicc6ccccccccccccc6cCCCCCCCCCCC',
    'CCCCCiCCCcccccccceeeeeeccccccccCCCiCCCCC',
    'CCCCCCCCCccccccee6eeeee6eccccccCCCCCCCCC',
    'CCCCCCCCCcccceeeeeeeeeeeeeeccccCCCCCCCCC',
    'CCCCCCCCCrccreeeeeeeeeeeeerecrceCCCCCCCC',
    'CCCCCCCCCccceeeeeeeeeeeeeeeeccceCCCCCCCC',
    'CCCCCCCCeccccceeeeeeeeeeeeeeccceeCCCCCCC',
    'CCCCCCCCeccccccceeeeeeeeeeccccceeCCCCCCC',
    'CCCCCCiCeeccccccceeeeeeeccccccceeCCCCCCC',
    'CCCCCCCiweeecccccereoerccccicceweeCCCCCC',
    'CCCCCCwwwwweeeccceeeeeecccccewwwwwCCCCCC',
    'CCCCCwwwwwwweiccceeeeeeccceewwwwww6CCCCC',
    'CCCCwee3333wweccceeeeeecccewww3333eeCCCC',
    'CCCCCwwwwwwweeccccceeecccceewwwwwwwCCCCC',
    'CCCCCC6wwwweeeccccrcccrccceeewwwwwiCCCCC',
    'CCCCCCCCwCeeeeeccicccccccceeeeewCCCCCCCC',
    'CCCCCCCCCCCeeeeeeccccccceeeeeeCCCCCCCCCC',
    'CCCCCCCCCCCCCeeeeeecccceeeeeCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCeecccccceeeCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCccccccCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCccccccCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCccccccCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCccccccCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCccccCCCCCCCCCCCCCCCCCC',
], [[126, 32, 38, 10], [147, 32, 38, 10], [57, 32, 38, 10], [139, 32, 38, 8], [36, 32, 38, 8], [127, 36, 40, 3], [148, 36, 40, 3], [128, 40, 42, 1]], { map: 'glacier', x: 17, y: 8 });
frost.objs.push({ x: 5, y: 20, id: 'cf_relic', item: 'Frost Orb', qty: 3, ball: true }, { x: 35, y: 20, id: 'cf_east', item: 'Mythic Orb', ball: true },
  { x: 20, y: 6, id: 'cf_chamber', item: 'Revive', qty: 2, ball: true });
frost.objs.push({ x: 20, y: 17, prompt: 'Look', fn: async () => {
  if (F().cf_switch) { await says('The ancient switch is cold and still. The ice walkways stay up.'); return; }
  await says(['An ancient switch carved from blue ice. Frost Warden runes run round its rim.', 'You press it down. Deep under both lakes, something groans...']);
  F().cf_switch = true; retile(frost, ICE, '3'); G.audio.sfx('levelup');
  await says('Old walkways rise out of the water on both lakes!');
} });
trainer(frost, 'cf_skye', 10, 12, DOWN, 'lass', { name: 'SKYE', cls: 'ICE SKATER', sight: 4, team: [[126, 35], [147, 36], [127, 38]], pre: 'Careful, the floor is slippery! Ha, got you looking down.', win: 'I slipped. Properly, this time.', post: 'Press the switch in the middle of the hall. The lakes have been waiting for someone to.', prize: 70 });
if (maps.glacier) { set(maps.glacier, 17, 8, 'g'); link('glacier', [[17, 7]], 'cave_frostmere'); }

// ---- The Hollow Ruins: a sunken Warden sanctuary. Three rune stones in the main hall open the rune gate to the altar when
// they are touched in the order the west archive gives (east, west, south: where the sun wakes, rests and sleeps).
// A LIGHT gap in the east wall hides the sanctum. Behind a Badlands cave mouth.
const GATE = [[19, 10], [20, 10], [21, 10]], ORDER = 'east,west,south';
const ruins = build('cave_hollow_ruins', 'THE HOLLOW RUINS', [
    'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCeeeeeeeeeeeeeeCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCereeeeoooeeereCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCeeee69ooo96eeeCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCeeeeeeoooeeeeeCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCeeeeeeeeeeeeeeCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCeree9eeeee9ereeCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCC999CCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCeeeeeeeeccccceeeeeeeeCCCCCCCCC',
    'CCCCCereeeereeeeccccccccceeereeeereCCCCC',
    'CCCCCee9eeeeeeccccccccccccceeeeeeeeCCCCC',
    'CCCCCeeee69eeeccccccccccccceee96eeeCCCCC',
    'CCCCCeeeeeeeeeccccecccecccceeeeeeeeCCCCC',
    'CCCCCeeeoeeeeeccceeccceeccceeeeoeeeCCCCC',
    'CCCCCereeeereeccceeccceecccereeeereCCCCC',
    'CCCCCeeeeeeeeecccc9ccc9cccceeeeeeeeCCCCC',
    'CCCCCCCCeeeeeeccccccccccccceeeeeeCCCCCCC',
    'CCCCCCCCeeeeeeeccccccccccceeeeeeeCCCCCCC',
    'CCCCCCCwCeeeeeeeeccccccceeeeeeeeCwCCCCCC',
    'CCCCCwwwwweeeeeeee6ccc6eeeeeeeewwwwwCCCC',
    'CCCCwwwwwwweeeeeeeeccceeeeeeeewwwwwwwCCC',
    'CCCCCwwwwwCeeeeeeeeccceeoeeeeeCwwwwwCCCC',
    'CCCCCCCwCCCCCeeeeeeccceeeeeeCCCCCwCCCCCC',
    'CCCCCCCCCCCCCCCeecccccceeeCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCccccccCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCccccccCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCccccccCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCccccccCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCccccCCCCCCCCCCCCCCCCCC',
], [[23, 30, 36, 10], [73, 30, 36, 10], [91, 30, 36, 8], [129, 30, 36, 8], [151, 30, 36, 6], [74, 34, 38, 3], [92, 34, 38, 2], [96, 35, 38, 1]], { map: 'badlands', x: 47, y: 15 });
let runes = [];
const stone = (x, y, k) => ruins.objs.push({ x, y, prompt: 'Touch', fn: async () => {
  if (F().cr_gate) { await says(`The ${k}ern rune stone hums softly. The gate is already open.`); return; }
  runes.push(k);
  if (!ORDER.startsWith(runes.join(','))) { runes = []; await says(['The rune flares... then every stone goes dark again.', 'That was not the right order.']); return; }
  if (runes.length < 3) { G.audio.sfx('select'); await says(`The ${k}ern rune lights up and stays lit.`); return; }
  runes = []; F().cr_gate = true; retile(ruins, GATE, 'c'); G.audio.sfx('levelup');
  await says(['The third rune lights. All three stones blaze together...', 'With a long grinding sound, the rune gate to the north sinks into the floor!']);
} });
stone(31, 16, 'east'); stone(8, 16, 'west'); stone(24, 24, 'south');
ruins.objs.push({ x: 7, y: 13, prompt: 'Read', fn: () => says(['Old Warden letters are cut into the pillar:', '"The altar opens for one who follows the sun:', 'where it wakes, where it rests, and where it sleeps below."']) });
ruins.objs.push({ x: 20, y: 7, prompt: 'Look', fn: async () => {
  if (F().cr_altar) { await says("The altar is quiet. The first Wardens' words still run round its rim."); return; }
  await says(['An altar of the first Wardens. Words run round its rim:', '"We did not chain the wild. We walked beside it, and the Lantern listened."', 'Something glints in the offering bowl.']);
  G.grantOnce('cr_altar', S => { S.bag['Mythic Orb'] = (S.bag['Mythic Orb'] || 0) + 2; S.bag['Void Orb'] = (S.bag['Void Orb'] || 0) + 3; S.flags.cr_altar = true; });
  G.audio.sfx('levelup'); await says('You found 2 Mythic Orbs and 3 Void Orbs!');
} });
trainer(ruins, 'cr_vale', 20, 20, DOWN, 'prof', { name: 'VALE', cls: 'RUIN SCHOLAR', sight: 3, team: [[23, 33], [91, 34], [129, 35]], pre: 'Shh! You will wake the runes. Or worse, me. Battle first, questions later!', win: 'Remarkable. Absolutely remarkable.', post: 'The pillar in the west archive tells you the order. I have read it a hundred times and I still get it wrong.', prize: 70 });
link('badlands', [[47, 14]], 'cave_hollow_ruins');

// ---- The Living Grotto: glowing pools and mushroom beds under the Badlands. The mushrooms shed Glowcap Spores; offer 3 at
// the shrine and Starveil drifts down from the ceiling. The bridges reach an island on each pool, and a LIGHT gap in the
// west wall hides the old rootway. Behind a Badlands cave mouth.
const grotto = build('cave_living_grotto', 'THE LIVING GROTTO', [
    'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCeeeoooeeeCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCee8eooo8eeeCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCeeeeeoooeeeeeCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCeeeeeeeeeeeCCCCCCCCCCCCCC',
    'CCCCCCCCCCC8CCCeeee8eee8eeCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCeeccccceccceee8CCCCCCCCCCCC',
    'CCCCCC8CCCCeeccccc6ccc6ccceeeeCCCC8CCCCC',
    'CCCCCCCC8Ceeccccccccccccccccee8CCCCCCCCC',
    'CCCC8CCCCeeccc8cccccccccccccceeeCCCCCCCC',
    'CCCCCCCCweeccccccceeecccccccceeewCCCCCCC',
    'CCCCCCwwiwwccccceeeeeeeccccccewiwwwC8CCC',
    'CCCCCwwwwwwwccceeecccceeeccccwwwwwwwCCCC',
    'CCCCCwwwwwwwccceeecccceeeccccwwwwwwwCCCC',
    'CCCCCwwee3333ccciecccceeicccc33333eeCCCC',
    'CCCCwwwwwwwwwcccceccccccccccwwwwwwwwwCCC',
    'CCCCCwwwwwwwcc6ccccccccccc6ccwwwwwwwCCCC',
    'CCCCCwwwwwwwccccccccccccccccewwwwwwwCCCC',
    'CCCCCwwwwiwwecccccccccccccceewwwiwwwCCCC',
    'CCCCCCwwwwweeeccciccccciceeeeewwwwwCCCCC',
    'CCCCCC8CwCeeeeeccccccccceee8eeeCwCCCCCCC',
    'CCCCCCCCCCCe8eeeecccccceeeeeeeCCCC8CCCCC',
    'CCCCCCCCCCCCCeeeeecccceeeeeeCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCeecccccceeeCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCccccccCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCccccccCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCccccccCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCccccccCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCccccCCCCCCCCCCCCCCCCCC',
], [[53, 30, 36, 10], [61, 30, 36, 10], [67, 30, 36, 10], [44, 30, 36, 8], [69, 30, 36, 8], [83, 32, 36, 4], [62, 34, 38, 2], [54, 34, 38, 2]], { map: 'badlands', x: 31, y: 41 });
grotto.objs.push({ x: 7, y: 17, id: 'cl_west', item: 'Verdant Orb', qty: 3, ball: true }, { x: 35, y: 17, id: 'cl_east', item: 'Full Heal', qty: 2, ball: true });
grotto.objs.push({ x: 20, y: 6, prompt: 'Look', fn: async () => {
  const S = G.state, f = S.flags;
  if (f.cl_shrine) { await says('Moss and light have grown over the shrine. It feels peaceful here.'); return; }
  if (!f.cl_offered) {
    if ((S.bag['Glowcap Spores'] || 0) < 3) { await says(['A shrine wrapped in glowing moss, with an empty bowl in front of it.', 'The mushrooms in this grotto shed glowing spores. Perhaps 3 of them would make a fitting offering.']); return; }
    await G.say('Offer 3 Glowcap Spores at the shrine?', { auto: 1 });
    if (!(await G.yesNo())) { G.closeText(); return; }
    G.closeText(); S.bag['Glowcap Spores'] -= 3; if (!S.bag['Glowcap Spores']) delete S.bag['Glowcap Spores']; f.cl_offered = true;
    await says(['You scatter the spores into the bowl. The whole grotto brightens...', 'Something drifts down from the glowing ceiling!']);
  } else await says('The spores in the bowl still glow. Something stirs in the light above.');
  const top = Math.max(...S.party.map(c => c.lvl));
  const r = await G.storyBattle({ wild: G.makeCreature(156, Math.max(36, Math.min(50, top))) });
  if (r === 'win' || r === 'caught') { f.cl_shrine = true; await says(r === 'caught' ? 'Starveil settles into the orb, glowing softly.' : 'Starveil circles the shrine once, then drifts back up into the light.'); }
  else await says('Starveil drifts back up into the glowing ceiling. It will come down again.');
} });
trainer(grotto, 'cl_moss', 14, 20, RIGHT, 'bug', { name: 'MOSS', cls: 'BUG CATCHER', sight: 4, team: [[61, 33], [53, 34], [62, 36]], pre: 'Shh! The glowbugs are sleeping. Let us battle very, very quietly.', win: 'You woke them all up. They look happy, though.', post: 'The glowing mushrooms drop spores if you pick them. The shrine up north likes those.', prize: 70 });
link('badlands', [[31, 40]], 'cave_living_grotto');

// Puzzle tiles follow the save (map onLoad, js/world.js): an opened switch or gate stays open, a new game starts closed.
const flag = k => !!(G.state && G.state.flags[k]);
frost.solve = () => retile(frost, ICE, '3'); ruins.solve = () => retile(ruins, GATE, 'c');   // tests/maps.test.js walks the solved caves
frost.onLoad = m => { if ((m.t[20][11] === '3') !== flag('cf_switch')) retile(m, ICE, flag('cf_switch') ? '3' : 'w'); };
ruins.onLoad = m => { if ((m.t[10][20] === 'c') !== flag('cr_gate')) retile(m, GATE, flag('cr_gate') ? 'c' : '9'); };
G.CAVES_STAGE_B = ['cave_emberfall', 'cave_frostmere', 'cave_hollow_ruins', 'cave_living_grotto'];
})();
