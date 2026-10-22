// Optional adventure threads: short authored quests with a choice, and a world that remembers what you chose.
//   The Missing Ferry (Sunhaven / Tidepool Shore), The Sick Fields (Sunmeadow), Trader's Debt (Lanternrest / Stonebridge),
//   Duel at Dawn (Lanternrest, Stonebridge, Sunhaven, then your homestead), The Unusual Footprints (Sunmeadow to Mirewood).
// Each thread starts when you talk to its giver, keeps its state in flags (th_*), and records the outcome in the journal.
(function () {
const DOWN = 0, UP = 1, LEFT = 2, RIGHT = 3;
const F = () => G.state.flags, says = l => G.worldApi.says(l), Q = G.quest;
const npc = (map, x, y, dir, style, o) => G.mk.npc(G.MAPS[map], x, y, dir, style, null, Object.assign({ still: true }, o));
const ask = async (q, items) => { await G.say(q, { auto: 1 }); const c = await G.choose(items, { right: 236, bottom: 108, cancel: false }); G.closeText(); return c; };
const give = (items, money) => { const S = G.state; if (money) S.money += money; for (const [k, n] of Object.entries(items || {})) S.bag[k] = (S.bag[k] || 0) + n; G.audio.sfx('levelup'); };
const giveLine = (items, money) => Object.entries(items || {}).map(([k, n]) => `${n} ${k.toUpperCase()}`).concat(money ? ['$' + money.toLocaleString('en-US')] : []).join(' and ');
const TAU = Math.PI * 2;

// ==== 1. The Missing Ferry ===================================================================================================
// Captain Ilsa's little ferry, the Gull, slipped its moorings. It turns up on Tidepool Shore with a smuggler who'd buy it.
// Return it: Ilsa sails you between Sunhaven and Tidepool Shore for free, and the West trusts you. Sell it: $3,000, and she won't.
Q.def({ id: 'ferry', cat: 'side', title: 'The Missing Ferry', giver: 'Captain Ilsa, Sunhaven',
  desc: "Captain Ilsa's little ferry, the Gull, slipped its moorings in a storm and drifted off.",
  steps: [
    { id: 'find', text: 'Look for the Gull along Tidepool Shore', at: 'shore', done: S => !!S.flags.th_ferry_found },
    { id: 'decide', text: 'Decide what to do with the Gull', at: 'shore', done: S => !!(S.flags.th_ferry_back || S.flags.th_ferry_sold) },
    { id: 'tell', text: 'Tell Captain Ilsa in Sunhaven', at: 'sunhaven', done: S => !!S.flags.th_ferry_told },
  ] });
npc('sunhaven', 10, 26, DOWN, 'old', { style: { hair: '#e8e8e8', skin: '#e0b088', shirt: '#2a5a9a', pants: '#3a3a50', hat: '#f8f8f8' }, talk: async () => {
  const f = F();
  if (!Q.state('ferry')) {
    await says(['CAPTAIN ILSA: Forty years I have sailed the Gull between this pier and Tidepool Shore. Last night the storm took her right off her ropes.', 'CAPTAIN ILSA: The currents run south-east. If you are passing Tidepool Shore, keep an eye out for a little red-and-white ferry.']);
    Q.start('ferry'); return;
  }
  if (f.th_ferry_back && !f.th_ferry_told) {
    f.th_ferry_told = true; Q.outcome('ferry', 'You brought the Gull home. Ilsa sails you between Sunhaven and Tidepool Shore for free.');
    await says(['CAPTAIN ILSA: The Gull! She came home on her own, with a little help. You brought her back?', 'CAPTAIN ILSA: Then you will never pay for a crossing again. Any time you want to go to Tidepool Shore, just ask.']);
    give({ 'Pearl': 2 }, 1000); await says(`${G.state.name} received ${giveLine({ 'Pearl': 2 }, 1000)}!`);
    G.rep.add('west', 15); Q.complete('ferry'); return;
  }
  if (f.th_ferry_sold && !f.th_ferry_told) {
    f.th_ferry_told = true; Q.outcome('ferry', 'You sold the Gull to a smuggler for $3,000. Ilsa never sailed again.');
    await says(['CAPTAIN ILSA: Someone saw a smuggler sailing the Gull out past the point. And they saw who sold it to him.', 'CAPTAIN ILSA: ...I have nothing more to say to you, Warden.']);
    G.rep.add('west', -15); Q.complete('ferry'); return;
  }
  if (f.th_ferry_back) {   // the free crossing
    if ((await ask('CAPTAIN ILSA: Fancy a sail to Tidepool Shore? Free for you, of course.', ['SAIL', 'NOT NOW'])) === 0) await sailGull('shore');
    return;
  }
  if (f.th_ferry_sold) { await says('CAPTAIN ILSA: (She turns her back on you.)'); return; }
  await says('CAPTAIN ILSA: Any sign of the Gull? Tidepool Shore, south-east of here. The currents always end up there.');
} });
// The smuggler and the beached Gull on Tidepool Shore
npc('shore', 11, 27, RIGHT, 'hiker', { style: { hair: '#2a2018', skin: '#c89868', shirt: '#6a4a3a', pants: '#2a2630', hat: '#3a3440' }, hide: () => !!(F().th_ferry_back || F().th_ferry_sold), talk: async () => {
  const S = G.state, f = F();
  if (!Q.active('ferry')) { await says('SMUGGLER GRIZZ: Nice little boat washed up, eh? Finders keepers. Move along.'); return; }
  f.th_ferry_found = true;
  await says(['SMUGGLER GRIZZ: Oh, this? Washed up this morning. Nobody\'s boat now.', 'SMUGGLER GRIZZ: Tell you what. You say you never saw it, and I give you $3,000. Fair?']);
  const c = await ask('What do you do?', ['RETURN IT TO ILSA', 'TAKE THE $3,000']);
  if (c === 0) {
    f.th_ferry_back = true; G.audio.sfx('select');
    await says(['SMUGGLER GRIZZ: Bah. Wardens. Take it, then.', 'You untie the Gull and point her bow north-west. The tide carries her home to Sunhaven.']);
  } else {
    f.th_ferry_sold = true; give({}, 3000);
    await says(['SMUGGLER GRIZZ: Pleasure doing business.', `${S.name} received $3,000. The smuggler pushes the Gull out to sea.`]);
  }
} });
// Ilsa's free crossing: a quick fade and you're there
async function sailGull(to) {
  const dest = to === 'shore' ? ['shore', 21, 33, UP] : ['sunhaven', 10, 27, DOWN];
  G.audio.sfx('select'); await says('You climb aboard the Gull. Ilsa casts off...');
  await G.fadeTo(1, 16, '#000'); G.loadMap(dest[0]); G.placePlayer(dest[1], dest[2], dest[3]); G.scene = G.world.scene; await G.wait(20); await G.fadeTo(0, 16);
  await says(to === 'shore' ? 'CAPTAIN ILSA: Tidepool Shore! Ask for me at the dock if you want to go back.' : 'CAPTAIN ILSA: Home port. Mind your step.');
}
// On the shore, Ilsa is at the dock with the Gull once she's back
npc('shore', 20, 33, DOWN, 'old', { style: { hair: '#e8e8e8', skin: '#e0b088', shirt: '#2a5a9a', pants: '#3a3a50', hat: '#f8f8f8' }, hide: () => !F().th_ferry_told || !F().th_ferry_back, talk: async () => {
  if ((await ask('CAPTAIN ILSA: Back to Sunhaven?', ['SAIL', 'NOT NOW'])) === 0) await sailGull('sunhaven');
} });
function boat(c, x, y, t, beached) {
  const bob = beached ? 0 : Math.sin(t / 16) * .8;
  c.save(); c.translate(x + 8, y + 10 + bob); if (beached) c.rotate(-.12);
  c.fillStyle = 'rgba(20,40,80,.2)'; c.beginPath(); c.ellipse(0, 5, 11, 2.5, 0, 0, TAU); c.fill();
  c.fillStyle = '#d83a3a'; c.beginPath(); c.moveTo(-11, -1); c.lineTo(11, -1); c.quadraticCurveTo(9, 5, 0, 5); c.quadraticCurveTo(-9, 5, -11, -1); c.fill();
  c.fillStyle = '#f8f8f8'; c.fillRect(-10, -2.5, 20, 2); c.fillStyle = '#8a5a2a'; c.fillRect(-.6, -14, 1.2, 12);
  c.fillStyle = '#fff6e0'; c.beginPath(); c.moveTo(.6, -13); c.lineTo(8, -4); c.lineTo(.6, -4); c.fill();
  c.restore();
}

// ==== 2. The Sick Fields =======================================================================================================
// Farmer Bram's crops are wilting. Three sick beds point to a Venomite nest by the creek, fouling the water.
// Move the nest to your homestead (one Venomite joins you) or drive it off in battle. Either way the fields recover,
// and Bram has something for you every day after.
Q.def({ id: 'orchard', cat: 'side', title: 'The Sick Fields', giver: 'Farmer Bram, Sunmeadow',
  desc: "Farmer Bram's crops in Sunmeadow are wilting, and nobody knows why.",
  steps: [
    { id: 'trees', text: 'Look at the sick crops in the fields', at: 'sunmeadow', count: S => [['a', 'b', 'c'].filter(k => S.flags['th_tree_' + k]).length, 3], done: S => ['a', 'b', 'c'].every(k => S.flags['th_tree_' + k]) },
    { id: 'source', text: 'Find what is poisoning the water by the creek', at: 'sunmeadow', done: S => !!(S.flags.th_nest_moved || S.flags.th_nest_fought) },
    { id: 'tell', text: 'Tell Farmer Bram', at: 'sunmeadow', done: S => !!S.flags.th_orchard_told },
  ] });
const healed = () => !!(F().th_nest_moved || F().th_nest_fought);
npc('sunmeadow', 32, 6, LEFT, 'hiker', { style: { hair: '#8a5a2a', skin: '#e8b890', shirt: '#6a9a3a', pants: '#6a4a2a', hat: '#e8c060' }, talk: async () => {
  const S = G.state, f = F();
  if (!Q.state('orchard')) { await says(['FARMER BRAM: My crops! Three good summers, and now the leaves are curling up brown.', 'FARMER BRAM: Have a look at the beds for me? You Wardens notice things.']); Q.start('orchard'); return; }
  if (healed() && !f.th_orchard_told) {
    f.th_orchard_told = true;
    Q.outcome('orchard', f.th_nest_moved ? 'You moved the Venomite nest to your homestead. The fields recovered, and Bram shares his harvest.' : 'You drove the Venomite nest away. The fields recovered, and Bram shares his harvest.');
    await says(['FARMER BRAM: Look at that! Green again, all of them.', f.th_nest_moved ? 'FARMER BRAM: And you gave those little Venomite a new home instead of fighting them. That is proper Warden work.' : 'FARMER BRAM: Chased them right off, did you? Well, the water runs clear now.', 'FARMER BRAM: Come by any day. There will always be something for you.']);
    give({ 'Honey': 3 }, 1500); await says(`${S.name} received ${giveLine({ 'Honey': 3 }, 1500)}!`);
    G.rep.add('west', 12); Q.complete('orchard'); f.th_bram_day = S.day; return;
  }
  if (f.th_orchard_told) {   // the daily gift
    if (f.th_bram_day !== S.day) { f.th_bram_day = S.day; give({ 'Honey': 2 }); await says(['FARMER BRAM: Fresh from the fields, with honey from my hives. Take some!', `${S.name} received 2 HONEY!`]); }
    else await says('FARMER BRAM: Come back tomorrow, there will be more.');
    return;
  }
  await says(healed() ? 'FARMER BRAM: The crops look better already! Come and tell me what you found.' : 'FARMER BRAM: The sick beds are the ones with brown leaves. Something is wrong with them.');
} });
const TREES = [['a', 26, 3], ['b', 29, 5], ['c', 27, 7]];
for (const [k, x, y] of TREES) G.MAPS.sunmeadow.objs.push({ x, y, prompt: 'Look', hide: () => !Q.active('orchard') || !!F()['th_tree_' + k], fn: async () => {
  F()['th_tree_' + k] = true;
  const n = TREES.filter(([j]) => F()['th_tree_' + j]).length;
  await says(n < 3 ? ['The leaves are brown and curled. The soil around the roots is damp and smells sour.', 'The water for the fields comes down from the creek to the south.'][Math.min(1, n - 1)] : 'Every sick bed drinks from the creek south of the fields. The trouble must be there.');
} });
G.MAPS.sunmeadow.objs.push({ x: 35, y: 30, prompt: 'Look', hide: () => !Q.active('orchard') || healed() || !TREES.every(([k]) => F()['th_tree_' + k]), fn: async () => {
  const S = G.state, f = F();
  await says(['A nest of Venomite has dug in right where the creek feeds the field ditch. Their burrows are leaking purple ooze into the water.', 'They do not look dangerous, just very settled.']);
  const c = await ask('What do you do?', ['MOVE THE NEST HOME', 'DRIVE THEM OFF']);
  if (c === 0) {
    f.th_nest_moved = true; const v = G.makeCreature(20, 9); v.befriended = true; S.dex[20] = 2; (S.party.length < 6 ? S.party : S.box).push(v);
    G.audio.sfx('caught'); await says(['You coax the Venomite into a basket, one by one, and carry the nest to your homestead.', `One VENOMITE decided to stay with you! ${S.party.includes(v) ? 'It joined your party.' : 'It went to your PC.'}`]);
  } else {
    await says('The biggest Venomite rears up!');
    await G.storyBattle({ wild: G.makeCreature(20, 10) });
    f.th_nest_fought = true; await says('The Venomite scatter into the long grass. The ooze stops, and the creek starts to run clear.');
  }
} });

// ==== 3. Trader's Debt ======================================================================================================
// Oswin at the Trading Post needs a sealed crate delivered to Miller Ada in Stonebridge within three days.
// Deliver it sealed: Oswin pays $2,500. Open it: stolen Glimmer Mine crystals; report him to Elder Brigg in Stonebridge,
// and Oswin's honest niece Pell takes over his stall. Miss the deadline and the quest fails.
Q.def({ id: 'trader', cat: 'side', title: "Trader's Debt", giver: 'Oswin, Lanternrest',
  desc: 'Oswin owes Miller Ada in Stonebridge, and needs a crate delivered within three days.',
  steps: [
    { id: 'deliver', text: 'Bring the crate to Miller Ada in Stonebridge (3 days)', at: 'stonebridge', done: S => !!(S.flags.th_crate_given || S.flags.th_crate_reported) },
    { id: 'back', text: 'Go back to Lanternrest', at: 'lanternrest', done: S => !!S.flags.th_trader_end },
  ] });
const CRATE = 'Sealed Crate';
G.ITEMS[CRATE] = { kind: 'key', price: 0, desc: "Oswin's crate for Miller Ada. It is heavier than flour, and something inside clinks." };
const oswinGone = () => !!F().th_crate_reported;
npc('lanternrest', 38, 31, DOWN, 'clerk', { style: { hair: '#4a3a30', skin: '#e0b088', shirt: '#9a3a5a', pants: '#3a3040', hat: '#c8a050' }, hide: () => oswinGone() && !!F().th_trader_end, talk: async () => {
  const S = G.state, f = F();
  if (!Q.state('trader')) {
    await says(['OSWIN: Psst, Warden! I owe Miller Ada in Stonebridge, and she is not a patient woman.', 'OSWIN: Take this crate to her within three days, and I will make it worth $2,500. And don\'t open it. Flour spills.']);
    S.bag[CRATE] = 1; f.th_crate_day = S.day || 1; Q.start('trader'); G.audio.sfx('levelup'); await says(`${S.name} received the SEALED CRATE!`); return;
  }
  if (Q.active('trader') && f.th_crate_given) {
    f.th_trader_end = true; give({}, 2500); Q.outcome('trader', 'You delivered the sealed crate. Oswin paid you $2,500 and asked no questions.');
    await says(['OSWIN: Ada got it? Wonderful! You are a credit to the Wardens.', `${S.name} received $2,500!`]); Q.complete('trader'); return;
  }
  if (Q.active('trader')) { await says(`OSWIN: The crate goes to Miller Ada at the Stonebridge mill. ${3 - ((S.day || 1) - f.th_crate_day)} day(s) left!`); return; }
  await says(f.th_trader_end ? 'OSWIN: Business is good. Very good.' : 'OSWIN: Ah, the Warden. Nothing for you today.');
} });
// Pell, Oswin's niece, takes over once he's been reported
npc('lanternrest', 38, 31, DOWN, 'lass', { style: { hair: '#c86a3a', skin: '#f8d0a8', shirt: '#3a9a8a', pants: '#3a3040', hat: '#f0e0a0' }, hide: () => !(oswinGone() && F().th_trader_end), talk: async () => {
  const S = G.state, f = F();
  if (f.th_pell_day !== S.day) { f.th_pell_day = S.day; give({ 'Terra Orb': 2 }); await says(['PELL: Uncle Oswin is paying back everything he took from the mine. I run the stall now, honestly.', 'PELL: Here, a little thank-you. Come by any day.', `${S.name} received 2 TERRA ORBs!`]); }
  else await says('PELL: Honest prices, honest goods. That is the new rule here.');
} });
// Miller Ada: deliver it, or open it first
{ const mill = G.MAPS.stonemill, ada = mill && mill.npcs.find(n => n.lines && /MILLER ADA/.test(n.lines[0]));
  if (ada) { const lines = ada.lines; ada.talk = async () => {
    const S = G.state, f = F();
    if (!Q.active('trader') || !S.bag[CRATE]) { await says(lines); return; }
    const c = await ask("MILLER ADA: Is that Oswin's crate? Hand it over.", ['HAND IT OVER', 'OPEN IT FIRST']);
    if (c === 0) { delete S.bag[CRATE]; f.th_crate_given = true; await says(['MILLER ADA: About time. Tell that weasel we are square.', 'She carries the crate off without opening it.']); return; }
    f.th_crate_opened = true;
    await says(['You pry the lid up. Under a layer of flour are dozens of glittering CRYSTAL SHARDS, stamped with the Glimmer Mine seal.', 'MILLER ADA: Those are stolen! Oswin has been smuggling crystals out of the mine. I want no part of this.', 'MILLER ADA: Take them to Elder Brigg, out in the square.']);
  }; } }
{ const sb = G.MAPS.stonebridge, brigg = sb.npcs.find(n => n.lines && /ELDER BRIGG/.test(n.lines[0]));
  if (brigg) { const lines = brigg.lines; brigg.talk = async () => {
    const S = G.state, f = F();
    if (!(Q.active('trader') && f.th_crate_opened && S.bag[CRATE])) { await says(lines); return; }
    delete S.bag[CRATE]; f.th_crate_reported = true; f.th_trader_end = true;
    await says(['ELDER BRIGG: Glimmer Mine crystals! The miners have been missing these for months.', 'ELDER BRIGG: I will send word to Lanternrest. Oswin will pay back every shard. You did right, Warden.']);
    give({ 'Crystal Shard': 2 }, 1000); await says(`${S.name} received ${giveLine({ 'Crystal Shard': 2 }, 1000)} as a reward!`);
    G.rep.add('south', 15); G.rep.add('north', 10);
    Q.outcome('trader', "You opened the crate and found stolen crystals. Oswin was caught, and his niece Pell runs the stall honestly now."); Q.complete('trader');
  }; } }
// The deadline: three days after you took the crate
G.hooks.tick.push(() => {
  const S = G.state; if (!S || !S.flags || G.frameNo % 60) return;
  if (Q.active('trader') && S.bag[CRATE] && (S.day || 1) - (S.flags.th_crate_day || 1) >= 3) {
    delete S.bag[CRATE]; S.flags.th_trader_end = true; Q.fail('trader', 'You took too long. Oswin sent someone else, and the crate was gone from your bag.');
  }
});

// ==== 4. Duel at Dawn =======================================================================================================
// Rook, a travelling battler, challenges you in three towns. Beat all three and Rook moves to your homestead for daily sparring.
Q.def({ id: 'duel', cat: 'people', title: 'Duel at Dawn', giver: 'Rook, a travelling battler',
  desc: 'Rook challenges you to three battles in three towns, each harder than the last.',
  steps: [
    { id: 'd1', text: 'Beat Rook in Lanternrest', at: 'lanternrest', done: S => !!S.flags.th_rook1 },
    { id: 'd2', text: 'Beat Rook again in Stonebridge', at: 'stonebridge', done: S => !!S.flags.th_rook2 },
    { id: 'd3', text: 'Beat Rook a third time in Sunhaven', at: 'sunhaven', done: S => !!S.flags.th_rook3 },
  ],
  reward: { money: 3000, rep: { vale: 10, south: 5, west: 5 }, text: 'Rook moves to your homestead' } });
const ROOK = { hair: '#1a1a24', skin: '#d8a880', shirt: '#c82a3a', pants: '#2a2a3a', hat: '#1a1a24' };
const ROOK_TEAMS = [[[66, 9], [16, 10]], [[67, 14], [17, 14], [35, 15]], [[68, 19], [17, 19], [36, 20], [28, 20]]];
async function rook(n) {
  const S = G.state, f = F();
  if (n === 1 && !Q.state('duel')) { await says(['ROOK: You. You have the look of a Warden who thinks they are good.', 'ROOK: Three duels, three towns: here, Stonebridge, then Sunhaven. Win all three and I will tell everyone you are the real thing.']); Q.start('duel'); }
  else if (f['th_rook' + (n - 1)] === false || (n > 1 && !f['th_rook' + (n - 1)])) { await says(n === 2 ? 'ROOK: Beat me in Lanternrest first.' : 'ROOK: Stonebridge first. Then here.'); return; }
  await says(['ROOK: First duel. Show me what you have!', 'ROOK: Second duel. I trained all the way here.', 'ROOK: Last one. Everything I have!'][n - 1]);
  const r = await G.storyBattle({ trainer: { name: 'ROOK', cls: 'DUELIST', style: ROOK, prize: 80 * n, win: ['Not bad.', 'You are getting on my nerves.', 'Alright. You are the real thing.'][n - 1], team: ROOK_TEAMS[n - 1].map(([id, l]) => G.makeCreature(id, l)) } });
  if (r !== 'win') { await says('ROOK: Ha! Come back when you are ready. I will wait.'); return; }
  f['th_rook' + n] = true;
  if (n < 3) await says(n === 1 ? 'ROOK: Stonebridge next. Do not keep me waiting.' : 'ROOK: Sunhaven. The last duel. Bring everything.');
  else { await says(['ROOK: Three for three. I said I would tell everyone, and I will.', 'ROOK: Got room on that homestead of yours? I could use a place to train. I will spar with you every day.']); Q.outcome('duel', 'You won all three duels. Rook lives at your homestead now and spars with you every day.'); }
}
npc('lanternrest', 11, 23, DOWN, 'boy', { style: ROOK, hide: () => !!F().th_rook1, talk: () => rook(1) });
npc('stonebridge', 20, 21, DOWN, 'boy', { style: ROOK, hide: () => !F().th_rook1 || !!F().th_rook2, talk: () => rook(2) });
npc('sunhaven', 36, 27, DOWN, 'boy', { style: ROOK, hide: () => !F().th_rook2 || !!F().th_rook3, talk: () => rook(3) });
npc('homestead', 24, 39, RIGHT, 'boy', { style: ROOK, hide: () => !F().th_rook3, talk: async () => {
  const S = G.state, f = F();
  if (f.th_rook_day === S.day) { await says('ROOK: We already sparred today. Rest up.'); return; }
  if ((await ask('ROOK: Spar with me? Winner takes $500.', ['SPAR', 'NOT NOW'])) !== 0) return;
  const top = Math.max(...S.party.map(c => c.lvl));
  const r = await G.storyBattle({ trainer: { name: 'ROOK', cls: 'DUELIST', style: ROOK, prize: 500, win: 'Good spar.', team: ROOK_TEAMS[2].map(([id]) => G.makeCreature(id, Math.max(10, top))) } });
  f.th_rook_day = S.day; if (r !== 'win') await says('ROOK: Again tomorrow!');
} });

// ==== 5. The Unusual Footprints ============================================================================================
// Researcher Fenna has found strange glowing footprints. Follow them from Sunmeadow, past Lanternrest's pond, into Mirewood.
// At the end is a Lemurmur: observe it (research reward, and it stays wild in Mirewood), befriend it, or battle it.
Q.def({ id: 'tracks', cat: 'research', title: 'The Unusual Footprints', giver: 'Researcher Fenna, Lanternrest',
  desc: 'Glowing footprints have been seen around Lanternrest. Nobody knows what made them.',
  steps: [
    { id: 't1', text: 'Find the footprints in Sunmeadow', at: 'sunmeadow', done: S => !!S.flags.th_track1 },
    { id: 't2', text: 'Follow them past the pond in Lanternrest', at: 'lanternrest', done: S => !!S.flags.th_track2 },
    { id: 't3', text: 'Follow them into Mirewood Marsh', at: 'mirewood', done: S => !!S.flags.th_track3 },
    { id: 'meet', text: 'Find what made them', at: 'mirewood', done: S => !!S.flags.th_lemur },
    { id: 'tell', text: 'Tell Researcher Fenna', at: 'lanternrest', done: S => !!S.flags.th_tracks_told },
  ],
  reward: { rep: { vale: 10 }, text: 'research notes' } });
npc('lanternrest', 24, 32, DOWN, 'prof', { talk: async () => {
  const S = G.state, f = F();
  if (!Q.state('tracks')) { await says(['RESEARCHER FENNA: Footprints that glow in the dark! Three toes, and a long tail dragging behind.', 'RESEARCHER FENNA: I spotted some in Sunmeadow. Follow them for me? I am terrible in long grass.']); Q.start('tracks'); return; }
  if (f.th_lemur && !f.th_tracks_told) {
    f.th_tracks_told = true;
    const how = f.th_lemur;
    Q.outcome('tracks', how === 'watch' ? 'You watched the Lemurmur without disturbing it. It still wanders Mirewood.' : how === 'friend' ? 'You earned the Lemurmur\'s trust, and it came with you.' : 'You battled the Lemurmur.');
    await says(how === 'watch' ? ['RESEARCHER FENNA: You just watched it? Wonderful! Wild behaviour, undisturbed. These notes are priceless.'] : how === 'friend' ? ['RESEARCHER FENNA: It trusts you enough to come along? I have never heard of a wild Lemurmur doing that.'] : ['RESEARCHER FENNA: A Lemurmur! Even a battle tells us something. Thank you.']);
    const items = how === 'watch' ? { 'Mythic Orb': 1, 'Revive': 2 } : { 'Revive': 2 }, money = how === 'watch' ? 3000 : 1500;
    give(items, money); await says(`${S.name} received ${giveLine(items, money)}!`);
    Q.complete('tracks'); return;
  }
  await says('RESEARCHER FENNA: Any luck with the footprints? Sunmeadow first, then they head east.');
} });
const TRACKS = [['th_track1', 'sunmeadow', 30, 27], ['th_track2', 'lanternrest', 5, 31], ['th_track3', 'mirewood', 40, 45]];
for (const [k, map, x, y] of TRACKS) G.MAPS[map].objs.push({ x, y, prompt: 'Examine', hide: () => !Q.active('tracks') || !!F()[k], fn: async () => {
  F()[k] = true;
  await says({ th_track1: 'Three-toed prints, softly glowing, with a thin line where a tail dragged. They lead east, toward Lanternrest.', th_track2: 'More glowing prints by the pond. They lead south-east, toward the marsh.', th_track3: 'The prints get fresher here. Whatever made them is close, somewhere east along the boardwalk.' }[k]);
} });
npc('mirewood', 60, 48, LEFT, 'boy', { creature: 107, hide: () => !F().th_track3 || !!F().th_lemur, talk: async () => {
  const S = G.state, f = F();
  await says(['A Lemurmur! Its fur gives off a faint glow, and its tail leaves a shining line in the mud.', 'It has not seen you yet.']);
  const c = await ask('What do you do?', ['WATCH QUIETLY', 'TRY TO BEFRIEND IT', 'BATTLE IT']);
  if (c === 0) { f.th_lemur = 'watch'; await says(['You crouch in the reeds and watch. It grooms its tail, sniffs the air, and hums to itself.', 'You fill a whole page of notes before it wanders off into the marsh.']); return; }
  if (c === 1) {
    if (!(await G.trust('Lemurmur'))) return;
    f.th_lemur = 'friend'; const l = G.makeCreature(107, 14); l.befriended = true; S.dex[107] = 2; (S.party.length < 6 ? S.party : S.box).push(l);
    G.audio.sfx('caught'); await says(`The Lemurmur hums and climbs onto your shoulder! ${S.name} befriended LEMURMUR!`); return;
  }
  const r = await G.storyBattle({ wild: G.makeCreature(107, 14) }); f.th_lemur = 'battle';
  await says(r === 'caught' ? 'You caught the Lemurmur!' : 'The Lemurmur slips away into the marsh.');
} });

// ---- Drawing: the Gull, sick trees, footprints ------------------------------------------------------------------------------
function prints(c, x, y, t) {
  const a = .7 + .3 * Math.sin(t / 15);
  c.globalCompositeOperation = 'lighter'; G.kit.drawGlow(c, '#7fffe0', x + 8, y + 8, 9, .35 * a); c.globalCompositeOperation = 'source-over';
  for (const [dx, dy] of [[3, 13], [8, 8], [13, 3]]) for (const [ox, oy, r] of [[0, 0, 1.6], [-2, -2.2, .9], [0, -2.9, .9], [2, -2.2, .9]]) {
    c.fillStyle = `rgba(40,110,100,${a * .5})`; c.beginPath(); c.arc(x + dx + ox, y + dy + oy + .5, r + .3, 0, TAU); c.fill();
    c.fillStyle = `rgba(200,255,245,${a})`; c.beginPath(); c.arc(x + dx + ox, y + dy + oy, r, 0, TAU); c.fill(); }
}
G.hooks.draw.push((items, cx, cy, t) => {
  const m = G.world.map, S = G.state; if (!m || !S || !S.flags) return; const f = S.flags;
  if (m.id === 'shore' && Q.state('ferry') && !f.th_ferry_back && !f.th_ferry_sold) items.push({ y: 28 * 16 + 14, draw: c => boat(c, 13 * 16 - cx, 28 * 16 - cy, t, true) });
  if (m.id === 'sunhaven' && f.th_ferry_back) items.push({ y: 23 * 16 + 14, draw: c => boat(c, 2 * 16 - cx, 23 * 16 - cy, t, false) });
  if (m.id === 'shore' && f.th_ferry_back && f.th_ferry_told) items.push({ y: 34 * 16 + 14, draw: c => boat(c, 22 * 16 - cx, 34 * 16 - cy, t, false) });
  if (m.id === 'sunmeadow' && Q.state('orchard') && !healed()) for (const [, x, y] of TREES) items.push({ y: y * 16 + 16.5, draw: c => {
    const px = x * 16 - cx, py = y * 16 - cy; c.fillStyle = 'rgba(150,90,40,.55)';
    for (const [a, b, r] of [[5, 2, 3.2], [11, 3, 2.8], [8, 6, 3.5], [3, 7, 2.4], [13, 8, 2.2]]) { c.beginPath(); c.arc(px + a, py + b, r, 0, TAU); c.fill(); }
  } });
  if (m.id === 'sunmeadow' && Q.active('orchard') && !healed()) items.push({ y: 30 * 16 + 14, draw: c => {   // the Venomite nest
    const px = 35 * 16 - cx + 8, py = 30 * 16 - cy + 10;
    c.fillStyle = '#7a5a3a'; c.beginPath(); c.ellipse(px, py, 7.5, 4.5, 0, 0, TAU); c.fill();
    c.fillStyle = '#2a1a10'; for (const [a, b] of [[-3, 0], [2.5, -1], [0, 2]]) { c.beginPath(); c.ellipse(px + a, py + b, 1.6, 1.1, 0, 0, TAU); c.fill(); }
    c.fillStyle = `rgba(170,80,220,${.55 + .25 * Math.sin(t / 12)})`; c.beginPath(); c.ellipse(px + 6, py + 4, 4, 1.6, .3, 0, TAU); c.fill();
  } });
  for (const [k, map, x, y] of TRACKS) if (m.id === map && Q.active('tracks') && !f[k]) items.push({ y: y * 16 + 1, draw: c => prints(c, x * 16 - cx, y * 16 - cy, t) });
});

// the nest is solid while it's there
G.hooks.load.push(m => { if (m.id !== 'sunmeadow' || !G.state) return; m.block = m.block || new Set(); if (Q.active('orchard') && !healed()) m.block.add('35,30'); else m.block.delete('35,30'); });
G.hooks.tick.push(() => { const m = G.world.map; if (m && m.id === 'sunmeadow' && m.block && healed()) m.block.delete('35,30'); });
// Test Mode's UNLOCK EVERYTHING finishes these too (G.quest.completeAll); these flags put the world in its finished state.
G.storyFlags = (G.storyFlags || []).concat(['th_ferry_found', 'th_ferry_back', 'th_ferry_told', 'th_tree_a', 'th_tree_b', 'th_tree_c', 'th_nest_moved', 'th_orchard_told', 'th_rook1', 'th_rook2', 'th_rook3', 'th_track1', 'th_track2', 'th_track3', 'th_tracks_told']);
})();
