// Story: the Prologue (Tam, the Warden's Lamp) and Chapter 1, "First Light" (the Ashen Wardens in Stonebridge, Vesper,
// a frightened guardian you calm instead of fight, and Mason's lesson about protecting your partner).
// Every scene runs once (flags), checks state rather than order, and never blocks progress: losing to Tam is fine, and
// Mason gives the Badge however the battle went.
(function () {
const DOWN = 0, UP = 1, LEFT = 2, RIGHT = 3;
const F = () => G.state.flags, says = l => G.worldApi.says(l);
const TAM_LOOK = { hair: '#2a8a8a', skin: '#f0c8a0', shirt: '#f0a030', pants: '#3a3a50', hat: '#2a8a8a' };
const ASHEN_LOOK = { hair: '#3a3440', skin: '#e8c0a0', shirt: '#4a4450', pants: '#2a2630', hat: '#8a3a3a' };
const COUNTER = { 1: 4, 4: 7, 7: 1 };   // Tam takes the Bondling that's strong against yours
G.LAMP = "Warden's Lamp";
G.ITEMS[G.LAMP] = { kind: 'key', price: 0, desc: "Elder Wren's lamp. It lights dark places, and its flame leans toward Ember Shards." };
// The Warden's Lamp lights dark passages (js/field.js).
if (G.FIELD) G.FIELD.light.tools = [G.LAMP];

// ---- People on the maps -----------------------------------------------------------------------------------------------------
{ // Tam waits outside the Hearth Shrine once Wren has given you her advice
  const m = G.MAPS.lanternrest;
  G.mk.npc(m, 39, 9, UP, 'boy', null, { style: TAM_LOOK, still: true, hide: () => !F().wrenTips || !!F().tam1, talk: () => tamScene() });
}
{ // Stonebridge: two Ashen Wardens by the Arena, and later the guardian by the river
  const m = G.MAPS.stonebridge;
  const ashen = (id, x, y, dir, name, team, pre, win, post) => {
    G.mk.npc(m, x, y, dir, 'boy', null, { style: ASHEN_LOOK, still: true, hide: () => !F().tam1,
      trainer: { id, style: ASHEN_LOOK, name, cls: 'ASHEN WARDEN', sight: 3, team, pre, win, post, prize: 60 } });
  };
  ashen('ashen_sb1', 45, 18, LEFT, 'CORVIN', [[20, 7], [77, 7]], ['Stand aside, apprentice. Warden Vesper needs these creatures more than this town does.', 'Calm creatures are safe creatures. We are only... borrowing them.'], 'You fight like an old-style Warden.', 'Vesper will hear about you.');
  ashen('ashen_sb2', 50, 20, DOWN, 'SABLE', [[22, 7], [76, 8]], 'Another one who thinks a Lantern and kind words can keep the wild in line?', 'Hmph. Lucky.', 'The big one by the river got away from us. It will not get away from Vesper.');
  G.mk.npc(m, 44, 38, UP, 'boy', null, { creature: 151, still: true, hide: () => !F().vesper1 || !!F().guardian1, talk: () => guardianScene() });
}
// ---- Battles that never send you home ----------------------------------------------------------------------------------------
async function storyBattle(trainer) { return G.storyBattle({ trainer }); }
// opts: { trainer } or { wild } (startBattle options); you are healed instead of sent home if you lose.
G.storyBattle = async function (opts) {
  const r = await G.startBattle(Object.assign({ bg: G.world.map.bg }, opts));
  if (r === 'lose') { G.state.party.forEach(G.healFull); }
  G.audio.music(G.world.map.music); await G.fadeTo(0, 14);
  return r;
}

// ---- Prologue: Tam ---------------------------------------------------------------------------------------------------------
async function tamScene() {
  const S = G.state, f = F(); if (f.tam1) return;
  const mine = (S.party[0] || {}).id, tamId = COUNTER[f.starterSp || mine] || 4, tamName = G.SPECIES[tamId].name.toUpperCase();
  G.audio.sfx('exclaim');
  await says(['???: Hey! Wait up!', `TAM: So Wren let you wake a Bondling too. I'm Tam. We trained at the same hearth, remember? I picked ${tamName}.`,
    "TAM: Warden Vesper came through last week. Vesper says the Lantern is finished, and the only way to keep creatures calm is to hold them tight. Maybe Vesper is right.",
    "TAM: Let's see whose way works. Battle me!"]);
  const r = await storyBattle({ name: 'TAM', cls: 'RIVAL', style: TAM_LOOK, prize: 50, win: 'Okay... you and your Bondling move together. I need to think about that.', team: [G.makeCreature(tamId, 5)] });
  f.tam1 = true; f.tamWon = r === 'lose';
  await says(r === 'win'
    ? ["TAM: You beat me. Huh. Your partner didn't even look scared.", "TAM: Strange people in grey cloaks were heading to Stonebridge. Ashen Wardens, they call themselves. Vesper's people. See you around."]
    : ["TAM: Ha! Told you. Holding tight works.", "TAM: Don't sulk. Your Bondling is fine, look. Strange people in grey cloaks were heading to Stonebridge. Ashen Wardens, they call themselves. See you around."]);
  if (!S.bag[G.LAMP]) {
    S.bag[G.LAMP] = 1; G.audio.sfx('levelup');
    await says(['ELDER WREN: Before you go, little Warden. Take my lamp.', `${S.name} received the WARDEN'S LAMP!`, "ELDER WREN: It lights dark places, and its flame leans toward the Ember Shards. Go to Stonebridge and find out what these Ashen Wardens want."]);
  }
  G.quest.start('ch1');
}

// ---- Chapter 1: Vesper watches from the bridge ------------------------------------------------------------------------------
async function vesperScene() {
  const f = F(); if (f.vesper1) return;
  f.vesper1 = true; G.audio.sfx('exclaim');
  await says(['A cold voice carries over the river.', '???: So the old Lantern still sends apprentices out to play Warden.',
    "VESPER: I am Vesper. I was a Warden once, like you. I watched the Lantern fail, and I watched creatures run wild because of it.",
    'VESPER: Fear keeps them still. Order keeps them safe. When I hold the Wildcard, the whole vale will be calm, forever.',
    'VESPER: My Wardens frightened a Cairnwight down by the river. See if your kindness can do anything with it.',
    'The figure on the bridge is gone.']);
}
G.hooks.tick.push(() => {
  const S = G.state; if (!S || !S.flags || G.world.busy || G.scene !== G.world.scene || G.ui.text) return;
  const f = S.flags, m = G.world.map, p = G.world.p; if (!m || p.moving) return;
  if (m.id === 'lanternrest' && f.wrenTips && !f.tam1 && Math.abs(p.x - 39) <= 2 && p.y <= 8) G.runWorld(tamScene);
  else if (m.id === 'stonebridge' && f.ashen_sb1 && f.ashen_sb2 && !f.vesper1) G.runWorld(vesperScene);
});

// ---- The first guardian: earn its trust ----------------------------------------------------------------------------------
// Each round the Cairnwight shows a mood; the right response builds trust (3 to win), a wrong one scares it (2 to fail).
// G.trust(name): the trust encounter, reusable for any creature. Resolves true when it trusts you.
const MOODS = [
  { text: 'The NAME trembles and presses itself against the ground.', good: [1, 3] },
  { text: 'The NAME sniffs the air, watching your hands.', good: [2] },
  { text: 'The NAME takes a slow step toward you.', good: [0] },
  { text: 'The NAME growls softly, its eyes on you.', good: [1] },
];
const ACTS = ['STEP CLOSER', 'STAY STILL', 'OFFER FOOD', 'SPEAK SOFTLY'];
G.trust = async function (name) {
  let trust = 0, fear = 0, i = G.rand(MOODS.length);
  while (trust < 3 && fear < 2) {
    const mood = MOODS[i % MOODS.length];
    await G.say(mood.text.replace('NAME', name), { auto: 1 });
    const c = await G.choose(ACTS, { right: 236, bottom: 108, cancel: false }); G.closeText();
    if (mood.good.includes(c)) { trust++; G.audio.sfx('select'); await says([`The ${name} relaxes a little.`, `It stops trembling and looks at you.`, `It rests its head against your hand.`][trust - 1]); i += 1 + G.rand(2); }
    else { fear++; G.audio.sfx('bump'); await says(fear < 2 ? `The ${name} flinches and backs away.` : `The ${name} scrambles out of reach. Give it time and try again.`); i++; }
  }
  return trust >= 3;
};
async function guardianScene() {
  const S = G.state, f = F(); if (f.guardian1) return;
  if (!f.guardianMet) { f.guardianMet = true; await says(['A huge Cairnwight is huddled between the rocks, shaking. Grey cloth is caught on its stones.', 'It is far too frightened to fight. Maybe it can learn to trust you.']); }
  if (!(await G.trust('Cairnwight'))) return;
  f.guardian1 = true; f.guardianCalm = true;
  const c = G.makeCreature(151, 12); c.befriended = true; S.dex[151] = 2;
  (S.party.length < 6 ? S.party : S.box).push(c); G.audio.sfx('caught');
  G.rep.add('south', 10);
  await says(['The Cairnwight rumbles happily. It has decided to come with you!', `${S.name} befriended CAIRNWIGHT! ${S.party.includes(c) ? 'It joined your party.' : 'It went to your PC.'}`, 'The people of Stonebridge saw what you did. (+10 SOUTH reputation)']);
}

// ---- Mason's lesson ------------------------------------------------------------------------------------------------------
// After the Keystone Badge: did your first partner make it through standing?
G.onBadge = async function (b) {
  if (b.id !== 'keystone') return;
  const S = G.state, f = S.flags; if (f.masonLesson) return; f.masonLesson = true;
  const first = S.party.find(c => c.starter) || S.party[0], safe = !!first && first.hp > 0;
  await says(safe
    ? [`MASON: One more thing. ${G.name(first)} is still on its feet. You won without throwing your partner on the rocks.`, 'MASON: That is what an arch is: every stone carries the others. Take these, Warden.']
    : ['MASON: One more thing. You won, but your partner took the fall for it.', 'MASON: A Warden is an arch: every stone carries the others. Next time, keep your partner standing. Take these anyway.']);
  S.bag['Climbing Gear'] = (S.bag['Climbing Gear'] || 0) + 1; if (safe) S.bag['Super Potion'] = (S.bag['Super Potion'] || 0) + 3;
  G.audio.sfx('levelup'); await says(`${S.name} received CLIMBING GEAR${safe ? ' and 3 SUPER POTIONS' : ''}! Rock faces with handholds are no problem now.`);
};

// ---- Wren after Chapter 1 ---------------------------------------------------------------------------------------------------
G.onWren = async function () {
  const f = F(); if (!G.quest.active('ch1') || !f.badge_keystone || !f.guardian1 || f.ch1_wren) return false;
  f.ch1_wren = true;
  await says(['ELDER WREN: Stonebridge is safe, and you calmed a frightened guardian without a single orb. I heard it all.',
    'ELDER WREN: Vesper... I knew Vesper long ago. A gifted Warden, and a frightened one.',
    'ELDER WREN: The Lamp in your bag is warmer than it was. The shards are waking. Find the Wardens of the Meadow, the Marsh and the Mine.']);
  return true;
};

// ---- Chapter 1 in the journal --------------------------------------------------------------------------------------------
G.quest.def({ id: 'ch1', cat: 'main', prio: 10, title: 'Chapter 1: First Light', giver: 'Elder Wren',
  desc: 'Grey-cloaked Ashen Wardens are taking creatures in Stonebridge. Find out what they want.',
  steps: [
    { id: 'go', text: 'Travel south to Stonebridge', at: 'stonebridge', done: S => !!S.visited.stonebridge },
    { id: 'ashen', text: 'Stop the Ashen Wardens near the Arena', at: 'stonebridge', count: S => [(S.flags.ashen_sb1 ? 1 : 0) + (S.flags.ashen_sb2 ? 1 : 0), 2], done: S => !!(S.flags.ashen_sb1 && S.flags.ashen_sb2) },
    { id: 'calm', text: 'Calm the frightened creature by the river', at: 'stonebridge', done: S => !!S.flags.guardian1 },
    { id: 'badge', text: "Earn Mason's Keystone Badge", at: 'stonebridge', done: S => !!S.flags.badge_keystone },
    { id: 'wren', text: 'Tell Elder Wren what happened', at: 'lanternrest', done: S => !!S.flags.ch1_wren },
  ],
  reward: { money: 2000, rep: { south: 15, vale: 10 } } });
// Test Mode: the story so far is done too
G.storyFlags = ['tam1', 'vesper1', 'guardian1', 'guardianCalm', 'masonLesson', 'ch1_wren', 'ashen_sb1', 'ashen_sb2'];
})();
