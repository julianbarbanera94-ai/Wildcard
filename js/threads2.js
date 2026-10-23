// More optional quests (Phase 8): six more authored threads, using the same quest, flag and reward system as threads.js.
//   Who Took the Tomatoes (Lanternrest: a gentle detective story with a choice), Lantern Night Lights (Lanternrest: gather
//   from across Aurelis), Bridge Repairs (Stonebridge: donate your crafted materials), The Cobalt Cup (a three-battle
//   tournament), Lost Little Pilfet (find an escaped pet, return or keep it), A Salve for the Hermit (Whispering Woods).
// With threads.js that makes eleven optional quests.
(function () {
const DOWN = 0, UP = 1, LEFT = 2, RIGHT = 3, TAU = Math.PI * 2;
const F = () => G.state.flags, says = l => G.worldApi.says(l), Q = G.quest;
const npc = (map, x, y, dir, style, o) => G.mk.npc(G.MAPS[map], x, y, dir, style, null, Object.assign({ still: true }, o));
const ask = async (q, items) => { await G.say(q, { auto: 1 }); const c = await G.choose(items, { right: 236, bottom: 108, cancel: false }); G.closeText(); return c; };
const give = (items, money) => { const S = G.state; if (money) S.money += money; for (const [k, n] of Object.entries(items || {})) S.bag[k] = (S.bag[k] || 0) + n; G.audio.sfx('levelup'); };
const line = (items, money) => Object.entries(items || {}).map(([k, n]) => `${n} ${k.toUpperCase()}`).concat(money ? ['$' + money.toLocaleString('en-US')] : []).join(' and ');
const have = (k, n) => G.inv.count(k) >= n;
const take = (needs) => { for (const [k, n] of Object.entries(needs)) G.inv.take ? G.inv.take(k, n) : (G.state.bag[k] -= n); };
const joinCreature = (id, lvl) => { const S = G.state, c = G.makeCreature(id, lvl); c.befriended = true; S.dex[id] = 2; (S.party.length < 6 ? S.party : S.box).push(c); G.audio.sfx('caught'); return `${S.party.includes(c) ? 'It joined your party.' : 'It went to your PC.'}`; };
const block = {}; G.hooks.load.push(m => { if (!block[m.id]) return; m.block = m.block || new Set(); for (const k of block[m.id]) m.block.add(k); });
const solid = (map, x, y) => (block[map] = block[map] || []).push(x + ',' + y);

// ==== 1. Who Took the Tomatoes ================================================================================================
// Farmer Dilla's tomatoes keep vanishing (she's the lady by the shrine who blames the meadow creatures). Check the garden, the
// fence and the lane: the culprit is a hungry Fluffur family. Build a scarecrow (the Fluffur go hungry), or leave them a
// patch of their own (Dilla's garden is shared, and a Fluffur joins you).
Q.def({ id: 'tomato', cat: 'side', title: 'Who Took the Tomatoes', giver: 'Dilla, Lanternrest',
  desc: "Dilla's tomatoes keep vanishing overnight. She blames the creatures from the meadow.",
  steps: [
    { id: 'clues', text: 'Look for clues around the garden', at: 'lanternrest', count: S => [['a', 'b', 'c'].filter(k => S.flags['th_tom_' + k]).length, 3], done: S => ['a', 'b', 'c'].every(k => S.flags['th_tom_' + k]) },
    { id: 'decide', text: 'Decide what to do about the culprits', at: 'lanternrest', done: S => !!(S.flags.th_tom_scare || S.flags.th_tom_share) },
    { id: 'tell', text: 'Tell Dilla', at: 'lanternrest', done: S => !!S.flags.th_tom_told },
  ] });
const CLUES = [['a', 17, 12, ['Tomato stems, nibbled right down. The bites are small and neat.']], ['b', 19, 13, ['A gap under the fence, just big enough for something round and soft. Tufts of white fur are caught on the wood.']], ['c', 14, 11, ['A little pile of leaves by the lane, arranged like a thank-you note.', 'The tomatoes are not stolen. They are being eaten by something polite.']]];
for (const [k, x, y, text] of CLUES) G.MAPS.lanternrest.objs.push({ x, y, prompt: 'Look', hide: () => !Q.active('tomato') || !!F()['th_tom_' + k], fn: async () => { F()['th_tom_' + k] = true; await says(text); } });
{ const dilla = G.MAPS.lanternrest.npcs.find(n => n.x === 18 && n.y === 10); const old = dilla.lines; dilla.talk = async () => {
  const S = G.state, f = S.flags;
  if (!Q.state('tomato')) { await says(['DILLA: Our tomatoes keep vanishing, and I blame the round fluffy ones from the meadow. They always leave a thank-you leaf, so I can not stay mad.', 'DILLA: But I am tired of an empty garden! Will you find out what is going on?']); Q.start('tomato'); return; }
  if (f.th_tom_told) { await says(f.th_tom_share ? 'DILLA: The little ones come by every evening. The garden has never been so cheerful.' : 'DILLA: The scarecrow is working. Not one tomato missing!'); return; }
  if (f.th_tom_scare || f.th_tom_share) {
    f.th_tom_told = true; Q.outcome('tomato', f.th_tom_share ? 'You gave the Fluffur their own patch. Dilla shares her garden, and one of them came home with you.' : 'You built a scarecrow. The tomatoes are safe, and the Fluffur went hungry.');
    await says(f.th_tom_share ? ['DILLA: A patch of their own, with a fence gap? And they still leave leaves for me!', 'DILLA: Here, for a good heart. Bring me a basket of anything you grow and I will cook it.'] : ['DILLA: Not one tomato missing! You are a wonder, Warden.', 'DILLA: ...Though I do feel a little bad about those poor creatures.']);
    give(f.th_tom_share ? { 'Tomato Seeds': 3, 'Honey': 2 } : {}, f.th_tom_share ? 800 : 1600); await says(`${S.name} received ${f.th_tom_share ? line({ 'Tomato Seeds': 3, 'Honey': 2 }, 800) : '$1,600'}!`);
    G.rep.add('vale', f.th_tom_share ? 15 : 8); Q.complete('tomato'); return;
  }
  await says(Q.active('tomato') && ['a', 'b', 'c'].every(k => f['th_tom_' + k]) ? 'DILLA: Well? What did you find?' : 'DILLA: Look around the garden, the fence and the lane. Something is going on at night.');
}; }
// the culprits, once you know
npc('lanternrest', 16, 10, DOWN, 'boy', { creature: 10, hide: () => !['a', 'b', 'c'].every(k => F()['th_tom_' + k]) || !Q.active('tomato') || !!(F().th_tom_scare || F().th_tom_share), talk: async () => {
  const S = G.state, f = S.flags;
  await says(['A family of Fluffur, with tomato juice on their whiskers! They freeze when they see you, then look at their feet.', 'They are not thieves. They are hungry, and the meadow has been dry this summer.']);
  const c = await ask('What do you do?', ['BUILD A SCARECROW', 'GIVE THEM A PATCH']);
  if (c === 0) { f.th_tom_scare = true; await says(['You and Dilla stand a patched scarecrow in the garden. The Fluffur take one look, and trot back to the meadow.']); }
  else { f.th_tom_share = true; await says(['You clear a patch by the fence and plant it with meadow clover. The Fluffur sniff it, then flop down in it, delighted.', `One of the Fluffur follows you home! ${joinCreature(10, 8)}`]); }
} });

// ==== 2. Lantern Night Lights ================================================================================================
// Child-sized lanterns for the festival: the children of Lanternrest want Glowcap (a mushroom), Honey and Wool, from across Aurelis.
// Bring all three sets (3 Glowcap, 3 Honey, 3 Wool) in any order. The lights go up around Lanternrest's fountain.
const LN = { Glowcap: 3, Honey: 3, Wool: 3 };
Q.def({ id: 'lights', cat: 'side', title: 'Lantern Night Lights', giver: 'Pim, Lanternrest',
  desc: 'The children want to hang paper lanterns for Lantern Night. They need Glowcap, Honey and Wool.',
  steps: [
    { id: 'glow', text: 'Bring 3 Glowcap', at: 'mirewood', count: S => [Math.min(3, S.bag.Glowcap || 0), 3], done: S => (S.bag.Glowcap || 0) >= 3 || !!S.flags.th_lights_done },
    { id: 'honey', text: 'Bring 3 Honey', at: 'sunmeadow', count: S => [Math.min(3, S.bag.Honey || 0), 3], done: S => (S.bag.Honey || 0) >= 3 || !!S.flags.th_lights_done },
    { id: 'wool', text: 'Bring 3 Wool', at: 'sunhaven', count: S => [Math.min(3, S.bag.Wool || 0), 3], done: S => (S.bag.Wool || 0) >= 3 || !!S.flags.th_lights_done },
    { id: 'tell', text: 'Give them to Pim', at: 'lanternrest', done: S => !!S.flags.th_lights_done },
  ] });
npc('lanternrest', 31, 28, DOWN, 'kid', { talk: async () => {
  const S = G.state, f = S.flags;
  if (!Q.state('lights')) { await says(['PIM: Lantern Night is almost here, and we have nothing to light the paths with!', 'PIM: We need Glowcap for the glow, Honey for the paste and Wool for the wicks. Three of each. Please?']); Q.start('lights'); return; }
  if (f.th_lights_done) { await says('PIM: Look up! The whole village is glowing. Thank you, Warden!'); return; }
  if (Object.entries(LN).every(([k, n]) => have(k, n))) {
    if ((await ask('PIM: Is that everything? Hand it over?', ['HAND IT OVER', 'NOT YET'])) !== 0) return;
    take(LN); f.th_lights_done = true; Q.outcome('lights', 'You gathered the Glowcap, Honey and Wool. The paper lanterns hang all over Lanternrest.');
    await says(['PIM: Glowcap, Honey and Wool! The grown-ups said it could not be done by Lantern Night.', 'The children run off, laughing. By dusk, rows of paper lanterns glow along every path in Lanternrest.']);
    give({ 'Super Potion': 3, 'Pulse Orb': 2 }, 1200); await says(`${S.name} received ${line({ 'Super Potion': 3, 'Pulse Orb': 2 }, 1200)}!`); G.rep.add('vale', 12); Q.complete('lights'); return;
  }
  const miss = Object.entries(LN).filter(([k, n]) => !have(k, n)).map(([k, n]) => `${n - G.inv.count(k)} more ${k}`);
  await says(`PIM: We still need ${miss.join(', ')}. Glowcap grows in the marsh, Honey comes from Bug creatures, and Wool from sheepy ones.`);
} });

// ==== 3. Bridge Repairs =====================================================================================================
// Stonebridge's oldest bridge is cracked. The bridgewrights need 12 Plank and 8 Brick. Donate them all and the bridge is
// repaired (a lasting change: a bench and lanterns appear on it); or pay the bridgewright's price (a flat $4,000) for the same
// result without crafting.
Q.def({ id: 'bridge', cat: 'home', title: 'Bridge Repairs', giver: 'Bridgewright Tobin, Stonebridge',
  desc: "Stonebridge's oldest bridge has a crack right across it. The bridgewrights need Plank and Brick.",
  steps: [
    { id: 'help', text: 'Deliver 12 Plank and 8 Brick (or pay $4,000)', at: 'stonebridge', count: S => [Math.min(12, S.bag.Plank || 0) + Math.min(8, S.bag.Brick || 0), 20], done: S => !!S.flags.th_bridge_fixed },
  ],
  reward: { rep: { south: 15 } } });
npc('stonebridge', 28, 14, DOWN, 'hiker', { style: { hair: '#6a4a30', skin: '#d8a880', shirt: '#c8a050', pants: '#3a3a50', hat: '#e8c060' }, talk: async () => {
  const S = G.state, f = S.flags;
  if (!Q.state('bridge')) { await says(['TOBIN: See that crack? The oldest bridge in town, and it will not hold another winter.', 'TOBIN: Twelve Plank and eight Brick would do it. Or $4,000, if you would rather pay a crew. Your choice, Warden.']); Q.start('bridge'); return; }
  if (f.th_bridge_fixed) { await says('TOBIN: Good as new, and better lit. Stonebridge says thank you.'); return; }
  const mats = have('Plank', 12) && have('Brick', 8), cash = S.money >= 4000;
  const opts = []; if (mats) opts.push('GIVE MATERIALS'); if (cash) opts.push('PAY $4,000'); opts.push('NOT YET');
  if (opts.length === 1) { await says(`TOBIN: I still need 12 Plank and 8 Brick (you have ${Math.min(12, G.inv.count('Plank'))} and ${Math.min(8, G.inv.count('Brick'))}), or $4,000. The Refinery at the Yard makes both.`); return; }
  const c = opts[await ask('TOBIN: Ready to fix the bridge?', opts)];
  if (c === 'NOT YET') return;
  if (c === 'GIVE MATERIALS') { take({ Plank: 12, Brick: 8 }); give({}, 1500); } else S.money -= 4000;
  f.th_bridge_fixed = true; Q.outcome('bridge', c === 'GIVE MATERIALS' ? 'You donated the Plank and Brick. The bridgewrights repaired the old bridge and paid you for the extra labour.' : 'You paid the bridgewrights $4,000 to repair the old bridge.');
  await G.fadeTo(1, 12, '#000'); await G.wait(30); await G.fadeTo(0, 16);
  await says(['The bridgewrights work through the night. By morning the old bridge is whole, with a bench and two lanterns on it.', c === 'GIVE MATERIALS' ? 'TOBIN: Your materials saved us a month. Here is something for your trouble.' : 'TOBIN: Thank you, Warden. The town will remember this.']);
  G.rep.add('south', 15); Q.complete('bridge');
} });
G.hooks.draw.push((items, cx, cy, t) => {
  const m = G.world.map; if (!m || m.id !== 'stonebridge' || !G.state) return;
  const fixed = !!F().th_bridge_fixed, started = Q.state('bridge');
  for (const [x, y] of [[29, 13], [26, 13]]) items.push({ y: y * 16 + 15, draw: c => {   // a bench and a lantern at the old bridge
    const px = x * 16 - cx, py = y * 16 - cy;
    if (fixed) { c.fillStyle = '#8a5a2a'; c.fillRect(px + 2, py + 9, 12, 3); c.fillRect(px + 3, py + 12, 2, 3); c.fillRect(px + 11, py + 12, 2, 3); c.fillStyle = '#c8a050'; c.fillRect(px + 2, py + 8, 12, 1.4);
      if (x === 26) { c.globalCompositeOperation = 'lighter'; G.kit.drawGlow(c, '#ffd860', px + 8, py + 3, 10, .5 + .2 * Math.sin(t / 14)); c.globalCompositeOperation = 'source-over'; c.fillStyle = '#ffe080'; c.beginPath(); c.arc(px + 8, py + 3, 2, 0, TAU); c.fill(); } }
    else if (started && x === 29) { c.strokeStyle = '#5a3a1e'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(px + 1, py + 6); c.lineTo(px + 6, py + 9); c.lineTo(px + 4, py + 12); c.lineTo(px + 14, py + 14); c.stroke(); }
  } });
});

// ==== 4. The Cobalt Cup ======================================================================================================
// A three-round tournament in Cobalt City. You are healed between rounds, but cannot swap your team, and lose the whole run
// if you faint. Win all three for the cup. Enter as often as you like.
Q.def({ id: 'cup', cat: 'people', title: 'The Cobalt Cup', giver: 'Referee Sparks, Cobalt City',
  desc: 'A three-round tournament in Cobalt City. Win all three rounds with the same team.',
  steps: [
    { id: 'r1', text: 'Win round 1', at: 'cobalt', done: S => (S.flags.th_cup_round || 0) >= 1 || !!S.flags.th_cup_won },
    { id: 'r2', text: 'Win round 2', at: 'cobalt', done: S => (S.flags.th_cup_round || 0) >= 2 || !!S.flags.th_cup_won },
    { id: 'r3', text: 'Win the final', at: 'cobalt', done: S => !!S.flags.th_cup_won },
  ],
  reward: { money: 5000, rep: { east: 15 }, text: 'the Cobalt Cup' } });
const CUP = [
  { name: 'JUNO', cls: 'SPARK', team: [[12, 0], [13, 1]], win: 'Round one, yours!' },
  { name: 'HERTZ', cls: 'WIRE ACE', team: [[80, 2], [106, 3], [136, 3]], win: 'A fine run. On to the semi!' },
  { name: 'DYNAMO', cls: 'CHAMPION', team: [[109, 4], [81, 5], [13, 5], [136, 6]], win: 'You deserve the cup.' },
];
const CUP_LOOK = [{ hair: '#f0d030', skin: '#f8d0a8', shirt: '#2a2a40', pants: '#ffd830', hat: '#ffd830' }, { hair: '#4a6a9a', skin: '#e8c098', shirt: '#3a9cf0', pants: '#284870', hat: '#f8f8f8' }, { hair: '#c82a3a', skin: '#e0b088', shirt: '#2a2a40', pants: '#1a1a24', hat: '#ffd830' }];
npc('cobalt', 35, 26, DOWN, 'clerk', { style: { hair: '#2a2a30', skin: '#e0b088', shirt: '#f8f8f8', pants: '#1a1a24', hat: '#f8d030' }, talk: async () => {
  const S = G.state, f = S.flags;
  if (!Q.state('cup')) { await says(['REFEREE SPARKS: Welcome to the Cobalt Cup! Three rounds, one team. You are healed between rounds, but no swapping, and if you faint, you are out.', 'REFEREE SPARKS: Enter any time. The cup is waiting.']); Q.start('cup'); }
  if (f.th_cup_won) { await says('REFEREE SPARKS: Our champion! The cup sits in the lobby with your name on it.'); return; }
  if ((await ask(`REFEREE SPARKS: ${(f.th_cup_round || 0) > 0 ? 'Back for round ' + ((f.th_cup_round || 0) + 1) + '?' : 'Ready to enter?'}`, ['ENTER', 'NOT NOW'])) !== 0) return;
  const team = S.party.slice();
  for (let r = f.th_cup_round || 0; r < 3; r++) {
    await says(r === 2 ? 'REFEREE SPARKS: The FINAL! Dynamo, the reigning champion!' : `REFEREE SPARKS: Round ${r + 1}. ${CUP[r].name} the ${CUP[r].cls}!`);
    const R = CUP[r], lv = Math.max(15, Math.round(Math.max(...team.map(c => c.lvl)) * (.75 + r * .12)));
    const res = await G.storyBattle({ trainer: { name: R.name, cls: R.cls, style: CUP_LOOK[r], prize: 300 * (r + 1), win: R.win, team: R.team.map(([id, d]) => G.makeCreature(id, Math.min(100, lv + d))) } });
    if (res !== 'win') { f.th_cup_round = 0; await says('REFEREE SPARKS: Knocked out! Rest up and try again. The first round starts fresh.'); return; }
    f.th_cup_round = r + 1; S.party.forEach(G.healFull);
  }
  f.th_cup_won = true; Q.outcome('cup', 'You won the Cobalt Cup in three rounds.');
  await says(['REFEREE SPARKS: The CHAMPION of the Cobalt Cup!', 'The crowd cheers as you are handed a gleaming silver cup.']); G.rep.add('east', 10);
} });

// ==== 5. Lost Little Pilfet ===================================================================================================
// A child's pet Pilfet escaped. Ask around Sandsreach, Cobalt City and the Badlands; the Pilfet is hiding in the Badlands.
// Return it (the child is overjoyed), or keep it (it joins you, the child is sad, and the East thinks a little less of you).
Q.def({ id: 'pilfet', cat: 'side', title: 'Lost Little Pilfet', giver: 'Jory, Sandsreach',
  desc: "Jory's pet Pilfet slipped out of its basket and ran off.",
  steps: [
    { id: 'ask', text: 'Ask around about a runaway Pilfet', at: 'cobalt', count: S => [['sr', 'cb'].filter(k => S.flags['th_pil_' + k]).length, 2], done: S => !!(S.flags.th_pil_sr && S.flags.th_pil_cb) },
    { id: 'find', text: 'Find the Pilfet in the Badlands', at: 'badlands', done: S => !!(S.flags.th_pil_back || S.flags.th_pil_kept) },
    { id: 'tell', text: 'Tell Jory', at: 'sandsreach', done: S => !!S.flags.th_pil_told },
  ] });
npc('sandsreach', 35, 30, DOWN, 'kid', { talk: async () => {
  const S = G.state, f = S.flags;
  if (!Q.state('pilfet')) { await says(['JORY: My Pilfet is gone! It chewed through its basket and ran off with my sock!', 'JORY: It is small and dark and sneaky. Please find it?']); Q.start('pilfet'); return; }
  if (f.th_pil_told) { await says(f.th_pil_back ? 'JORY: Pilfet sleeps on my bed every night, with its sock. Thank you!' : 'JORY: ...I hope it is happy where it is.'); return; }
  if (f.th_pil_back || f.th_pil_kept) {
    f.th_pil_told = true;
    if (f.th_pil_back) { Q.outcome('pilfet', 'You returned the Pilfet to Jory. The East thinks well of you.'); await says(['JORY: PILFET! You found it! And it brought the sock back!', 'JORY: Take this. It is my favourite one.']); give({ 'Full Heal': 2, 'Pulse Orb': 2 }, 1000); await says(`${S.name} received ${line({ 'Full Heal': 2, 'Pulse Orb': 2 }, 1000)}!`); G.rep.add('east', 12); }
    else { Q.outcome('pilfet', 'You kept the Pilfet. Jory was heartbroken, and the East thinks less of you.'); await says(['JORY: Did you... find anything?', 'JORY: Oh. Never mind. It probably wanted to be somewhere else.', 'Jory looks at the floor and goes quiet.']); G.rep.add('east', -10); }
    Q.complete('pilfet'); return;
  }
  await says('JORY: Any sign of my Pilfet? It likes places with lots of hiding spots.');
} });
npc('cobalt', 38, 26, LEFT, 'lass', { hide: () => !Q.active('pilfet') || !!F().th_pil_cb, talk: async () => { F().th_pil_cb = true; await says(['A STREET MUSICIAN: A little dark creature with a sock? It ran past me towards the east gate, laughing.', 'A STREET MUSICIAN: It was heading for the Badlands, I think. Lots of rocks to hide in.']); } });
npc('sandsreach', 38, 28, UP, 'camper', { hide: () => !Q.active('pilfet') || !!F().th_pil_sr, talk: async () => { F().th_pil_sr = true; await says(['A TRAVELLER: Little Pilfet? It stole half my lunch and ran east.', 'A TRAVELLER: I saw it cross towards Cobalt. Ask there!']); } });
npc('badlands', 20, 22, DOWN, 'boy', { creature: 76, hide: () => !F().th_pil_sr || !F().th_pil_cb || !Q.active('pilfet') || !!(F().th_pil_back || F().th_pil_kept), talk: async () => {
  const S = G.state, f = S.flags;
  await says(['A small dark Pilfet, curled up inside a hollow rock with a stripy sock. It looks up at you with big eyes.', 'It is not scared. It is just very, very pleased with itself.']);
  const c = await ask('What do you do?', ['RETURN IT TO JORY', 'KEEP IT']);
  if (c === 0) { f.th_pil_back = true; await says(['You scoop up the Pilfet. It sighs, and rests its chin on your arm.', 'You carry it all the way back to Sandsreach.']); }
  else { f.th_pil_kept = true; await says(['The Pilfet hops into your bag as though it had already decided.', `${S.name} befriended PILFET! ${joinCreature(76, 12)}`]); }
} });

// ==== 6. A Salve for the Hermit ================================================================================================
// A sick hermit in the Whispering Woods needs a Herb Salve (made at the forge from Glowcap and Honey). Bring her one.
Q.def({ id: 'hermit', cat: 'side', title: 'A Salve for the Hermit', giver: 'Elm, Whispering Woods',
  desc: 'An old hermit in the Whispering Woods is ill and needs a Herb Salve.',
  steps: [
    { id: 'salve', text: 'Bring a Herb Salve to the hermit', at: 'whispering', done: S => !!S.flags.th_hermit_healed },
    { id: 'tell', text: 'Speak with her again', at: 'whispering', done: S => !!S.flags.th_hermit_told },
  ],
  reward: { rep: { south: 10 } } });
npc('whispering', 31, 24, DOWN, 'old', { talk: async () => {
  const S = G.state, f = S.flags;
  if (!Q.state('hermit')) { await says(['A HERMIT: *cough* I have not been well, young Warden. I am too weak to gather the glowcaps for my own medicine.', 'A HERMIT: A Herb Salve would set me right. The forge makes it from Glowcap and Honey, if you know someone with a forge.']); Q.start('hermit'); return; }
  if (f.th_hermit_told) { await says('A HERMIT: Strong as an old oak, thanks to you. Visit any time.'); return; }
  if (f.th_hermit_healed) {
    f.th_hermit_told = true; Q.outcome('hermit', 'You brought the hermit a Herb Salve, and she recovered.');
    await says(['A HERMIT: Look at me, up and about! I owe you more than a few leaves.', 'A HERMIT: Take this. I found it long ago, and I never knew what to do with it.']);
    give({ 'Mythic Orb': 1, 'Revive': 1 }, 800); await says(`${S.name} received ${line({ 'Mythic Orb': 1, 'Revive': 1 }, 800)}!`); G.rep.add('south', 10); Q.complete('hermit'); return;
  }
  const opts = []; if (have('Herb Salve', 1)) opts.push('GIVE HERB SALVE'); opts.push('NOT YET');
  if (opts.length === 1) { await says('A HERMIT: *cough* Any luck with that Herb Salve? Glowcap from the marsh, Honey from Bug creatures, and the forge in your homestead.'); return; }
  if ((await ask('A HERMIT: Is that a Herb Salve?', opts)) !== 0) return;
  take({ 'Herb Salve': 1 }); f.th_hermit_healed = 'salve'; G.audio.sfx('heal');
  await says(['She sips the salve slowly. The colour comes back to her cheeks.', 'A HERMIT: Oh, that is better. Come and talk with me again in a moment, when I can stand without leaning on my stick.']);
} });

// Drawing: the paper lanterns, the Fluffur family's tomato patch
G.hooks.draw.push((items, cx, cy, t) => {
  const m = G.world.map; if (!m || !G.state) return; const f = G.state.flags;
  if (m.id === 'lanternrest' && f.th_lights_done) for (const [x, y] of [[20, 12], [24, 12], [28, 12], [16, 16], [22, 16], [30, 16], [18, 20], [26, 20]]) items.push({ y: y * 16 + 3, draw: c => {
    const px = x * 16 - cx + 8, py = y * 16 - cy + 5 + Math.sin(t / 30 + x) * .8; c.globalCompositeOperation = 'lighter'; G.kit.drawGlow(c, ['#ffd860', '#ff9a60', '#9ad0ff'][(x + y) % 3], px, py, 7, .5); c.globalCompositeOperation = 'source-over';
    c.fillStyle = ['#ffd860', '#ff9a60', '#9ad0ff'][(x + y) % 3]; c.beginPath(); c.ellipse(px, py, 2.4, 3, 0, 0, TAU); c.fill(); c.fillStyle = '#5a3a1e'; c.fillRect(px - .4, py - 5, .8, 2.4); } });
  if (m.id === 'lanternrest' && f.th_tom_share) items.push({ y: 11 * 16 + 14, draw: c => { const px = 16 * 16 - cx, py = 11 * 16 - cy; c.fillStyle = '#7a4e2a'; c.fillRect(px + 1, py + 7, 14, 7); c.fillStyle = '#6aa83a'; for (const a of [3, 7, 11]) { c.beginPath(); c.arc(px + a, py + 8, 2, 0, TAU); c.fill(); } } });
  if (m.id === 'lanternrest' && f.th_tom_scare && !f.th_tom_share) items.push({ y: 11 * 16 + 14, draw: c => { const px = 16 * 16 - cx + 8, py = 11 * 16 - cy; c.strokeStyle = '#6a4a2a'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(px, py + 4); c.lineTo(px, py + 15); c.moveTo(px - 6, py + 8); c.lineTo(px + 6, py + 8); c.stroke(); c.fillStyle = '#e8c870'; c.beginPath(); c.arc(px, py + 3, 3, 0, TAU); c.fill(); c.fillStyle = '#c8603a'; c.fillRect(px - 4, py - 1, 8, 1.6); } });
});

G.storyFlags = (G.storyFlags || []).concat(['th_tom_a', 'th_tom_b', 'th_tom_c', 'th_tom_share', 'th_tom_told', 'th_lights_done', 'th_bridge_fixed', 'th_cup_won', 'th_pil_sr', 'th_pil_cb', 'th_pil_back', 'th_pil_told', 'th_hermit_told']);
G.threadsDone = () => ['ferry', 'orchard', 'trader', 'duel', 'tracks', 'tomato', 'lights', 'bridge', 'cup', 'pilfet', 'hermit'].filter(id => Q.done(id)).length;
})();
