// Story: Chapters 2 to 4.
//   2. The Green Hush (Sunmeadow, Evergreen, Sunhaven): the Meadow shard is with Evergreen's forest guardian; relight the
//      Elder Oak's lantern, earn the guardian's trust, face Vesper's lieutenant, win Ferna's Bloom Badge. Reward: a rowboat.
//   3. Tides and Winds (Driftwood, Verdant Isle): relight Grimsby's lighthouse, win Zephyra's Gale Badge, sail to Verdant
//      and drive off the Ashen sailors with Tam, who starts to doubt Vesper. Reward: a motorboat.
//   4. The Quiet Water (Lakeside, Tidefall): get the stolen Tide Stone back, win Marlo's Tide Badge, then race the Ashen
//      Wardens to Tidefall's drowned shrine and dive for the Marsh shard. Reward: a sailboat.
// Each chapter starts when the one before is done, and every step reads saved state, so earlier progress counts.
(function () {
const DOWN = 0, UP = 1, LEFT = 2, RIGHT = 3, TAU = Math.PI * 2;
const F = () => G.state.flags, says = l => G.worldApi.says(l), Q = G.quest;
const ASHEN = { hair: '#3a3440', skin: '#e8c0a0', shirt: '#4a4450', pants: '#2a2630', hat: '#8a3a3a' };
const VESPER = { hair: '#e8e8f0', skin: '#e8c8b0', shirt: '#2a2a3a', pants: '#1a1a24', hat: '#6a2a4a' };
const TAM = { hair: '#2a8a8a', skin: '#f0c8a0', shirt: '#f0a030', pants: '#3a3a50', hat: '#2a8a8a' };
const npc = (map, x, y, dir, style, o) => G.mk.npc(G.MAPS[map], x, y, dir, style, null, Object.assign({ still: true }, o));
const ashen = (map, id, x, y, dir, name, team, pre, win, post, hide) => npc(map, x, y, dir, 'boy', { style: ASHEN, hide,
  trainer: { id, style: ASHEN, name, cls: 'ASHEN WARDEN', sight: 3, team, pre, win, post, prize: 120 } });
const grant = id => { if (G.vehicles && G.vehicles.grant && !(G.state.vehicles.owned || []).includes(id)) G.vehicles.grant(id); };
G.SHARD_PLACES = { meadow: 'evergreen', marsh: 'tidefall', mine: 'ridge' };   // where each Ember Shard is found now

// Hazel and Bog still battle you, but they no longer hold shards (js/maps/sunmeadow.js, mirewood.js). Saves that have one keep it.
const shardGet = async (k, label) => { const S = G.state; S.flags['shard_' + k] = true; G.audio.sfx('levelup'); await says(`${S.name} received the ${label} EMBER SHARD!`); };

// ==== Chapter 2: The Green Hush ===========================================================================================
Q.def({ id: 'ch2', cat: 'main', prio: 10, title: 'Chapter 2: The Green Hush', giver: 'Elder Wren',
  desc: 'Evergreen Forest has gone silent, and the Meadow shard went with its guardian.',
  start: S => Q.done('ch1'),
  steps: [
    { id: 'hazel', text: 'Battle Hazel, the Meadow Warden, in Sunmeadow', at: 'sunmeadow', done: S => !!(S.flags.sm_hazel || S.flags.shard_meadow) },
    { id: 'oak', text: 'Relight the old lantern by the Elder Oak (Evergreen)', at: 'evergreen', done: S => !!(S.flags.ch2_oak || S.flags.shard_meadow) },
    { id: 'guardian', text: "Earn the forest guardian's trust", at: 'evergreen', done: S => !!S.flags.shard_meadow },
    { id: 'vesper', text: "Face Vesper's lieutenant in Evergreen", at: 'evergreen', done: S => !!S.flags.ashen_eg },
    { id: 'badge', text: "Earn Ferna's Bloom Badge in Sunhaven", at: 'sunhaven', done: S => !!S.flags.badge_bloom },
  ],
  reward: { money: 3000, rep: { west: 15 }, text: 'a rowboat', fn: () => grant('rowboat') } });
// the Elder Oak's lantern: dark until you light it (any LIGHT helper, including the Warden's Lamp)
G.MAPS.evergreen.objs.push({ x: 29, y: 16, prompt: 'Look', fn: async () => {
  const f = F();
  if (f.ch2_oak) { await says('The lantern by the Elder Oak burns warm and steady. Birdsong fills the forest again.'); return; }
  const who = G.fieldHelper('light');
  if (!who) { await says(['An old Warden lantern sits on the great log by the Elder Oak. It has gone out, and the forest around it is silent.', G.FIELD.light.need]); return; }
  f.ch2_oak = true; G.audio.sfx('heal'); await G.fadeTo(.7, 10, '#fff6c0'); await G.fadeTo(0, 16);
  await says([`${who.creature ? who.name + ' breathed on the wick' : 'You held up ' + who.name}, and the old lantern flickered back to life!`, 'Birdsong rises all around. Something stirs in the ferns to the west.']);
} });
npc('evergreen', 26, 18, RIGHT, 'boy', { creature: 46, hide: () => !F().ch2_oak || !!F().shard_meadow, talk: async () => {
  await says(['A Florelle, the forest guardian. Its petals are closed tight around something that glows like an ember.', 'It watches you warily.']);
  if (!(await G.trust('Florelle'))) return;
  await says('The Florelle opens its petals. Inside rests the Meadow Ember Shard. It holds it out to you.');
  await shardGet('meadow', 'MEADOW'); G.rep.add('west', 10);
  await says('The Florelle bows, then melts back into the ferns. The forest is safe in its keeping.');
} });
npc('evergreen', 32, 22, UP, 'boy', { style: VESPER, hide: () => !F().shard_meadow || !!F().ashen_eg || !Q.state('ch2'), talk: () => vesper2() });
ashen('evergreen', 'ashen_eg', 34, 22, LEFT, 'MORDANT', [[22, 16], [78, 17], [20, 18]], ['VESPER: Mordant. Show this apprentice what order looks like.', 'MORDANT: With pleasure.'], 'MORDANT: ...Impossible.', 'MORDANT: The Warden will not be so gentle next time.', () => !F().shard_meadow || !Q.state('ch2'));
async function vesper2() {
  const f = F(); if (f.ch2_vesper) { await says('VESPER: Go on, then. Prove me wrong.'); return; }
  f.ch2_vesper = true; G.audio.sfx('exclaim');
  await says(['VESPER: So the forest gave its shard to you. It never gave anything to me.', 'VESPER: Do you know why the Lantern fails, apprentice? Because Wardens like Wren think kindness is enough.', 'VESPER: I have seen what wild creatures do when nothing holds them. My Mordant will show you.']);
}
G.hooks.tick.push(() => {
  const S = G.state; if (!S || !S.flags || G.world.busy || G.scene !== G.world.scene || G.ui.text || !G.world.map || G.world.p.moving) return;
  const f = S.flags, id = G.world.map.id;
  if (id === 'evergreen' && f.shard_meadow && Q.active('ch2') && !f.ch2_vesper) G.runWorld(vesper2);
  else if (id === 'verdant' && f.ashen_vd && Q.active('ch3') && !f.ch3_tam) G.runWorld(tam3);
});

// ==== Chapter 3: Tides and Winds ===========================================================================================
Q.def({ id: 'ch3', cat: 'main', prio: 10, title: 'Chapter 3: Tides and Winds', giver: 'Elder Wren',
  desc: "Driftwood Port's lighthouse has gone dark, and Ashen boats are prowling the sea.",
  start: S => Q.done('ch2'),
  steps: [
    { id: 'go', text: 'Travel to Driftwood Port', at: 'driftwood', done: S => !!S.visited.driftwood },
    { id: 'light', text: "Relight Grimsby's lighthouse", at: 'driftwood', done: S => !!S.flags.ch3_light },
    { id: 'badge', text: "Earn Zephyra's Gale Badge", at: 'driftwood', done: S => !!S.flags.badge_gale },
    { id: 'sail', text: 'Sail to Verdant Isle', at: 'verdant', done: S => !!S.visited.verdant },
    { id: 'ashen', text: 'Drive off the Ashen sailors on Verdant Isle', at: 'verdant', done: S => !!S.flags.ashen_vd },
  ],
  reward: { money: 4000, rep: { west: 20 }, text: 'a motorboat', fn: () => grant('motorboat') } });
G.MAPS.driftwood.objs.push({ x: 6, y: 7, prompt: 'Look', fn: async () => {
  const f = F();
  if (f.ch3_light) { await says('The lighthouse lamp sweeps the bay. Ships can find Driftwood again.'); return; }
  if (!Q.active('ch3')) { await says('The lighthouse door is locked. GRIMSBY keeps the key.'); return; }
  const who = G.fieldHelper('light');
  if (!who) { await says(['The lighthouse lamp is out. Someone cut the oil line, and the wick is cold.', G.FIELD.light.need]); return; }
  f.ch3_light = true; G.audio.sfx('heal'); await G.fadeTo(.7, 10, '#fff6c0'); await G.fadeTo(0, 16);
  await says([`You climb the stairs. ${who.creature ? who.name + ' lights' : 'You light'} the great lamp, and its beam swings out over the bay.`, 'GRIMSBY (below): Ha! She shines again! Those grey-cloaked rats cut my line, but they could not cut a Warden.']);
  G.rep.add('west', 5);
} });
ashen('verdant', 'ashen_vd', 20, 24, DOWN, 'SKIFF', [[42, 20], [22, 21], [77, 22]], ['SKIFF: This island is under the Ashen Wardens now. Turn your little boat around.', 'TAM (behind you): I will take the one on the beach. You take this one!'], 'SKIFF: Back to the boats!', 'SKIFF: Vesper will hear about the two of you.', () => !Q.state('ch3') || !G.state.visited.verdant);
npc('verdant', 18, 26, RIGHT, 'boy', { style: TAM, hide: () => !Q.active('ch3') || !!F().ch3_tam, talk: () => tam3() });
async function tam3() {
  const f = F();
  if (!f.ashen_vd) { await says("TAM: There are Ashen Wardens up the path. They tied up the islanders' boats. Let's chase them off, together this time."); return; }
  if (f.ch3_tam) return; f.ch3_tam = true;
  await says(['TAM: That was close. The one on the beach had a whole crate of frightened creatures.', 'TAM: Vesper told me the Ashen Wardens keep creatures calm. Those creatures were not calm. They were terrified.', "TAM: ...I don't know what to think any more. See you around, okay?"]);
}

// ==== Chapter 4: The Quiet Water ===========================================================================================
const STONE = 'Tide Stone';
G.ITEMS[STONE] = { kind: 'key', price: 0, desc: 'A smooth blue stone that hums like the sea. It keeps Lakeside full.' };
const swimmer = () => G.state.party.find(c => c.hp > 0 && c.lvl >= 15 && G.SPECIES[c.id].types.includes('Water'));
Q.def({ id: 'ch4', cat: 'main', prio: 10, title: 'Chapter 4: The Quiet Water', giver: 'Elder Wren',
  desc: "Lakeside's lake is draining away, and the Marsh shard lies in a drowned shrine at Tidefall.",
  start: S => Q.done('ch3'),
  steps: [
    { id: 'go', text: 'Travel to Lakeside', at: 'lakeside', done: S => !!S.visited.lakeside },
    { id: 'thief', text: 'Catch the Ashen Warden who stole the Tide Stone', at: 'lakeside', done: S => !!(S.flags.ashen_lk || S.flags.ch4_stone) },
    { id: 'stone', text: 'Put the Tide Stone back on its plinth', at: 'lakeside', done: S => !!S.flags.ch4_stone },
    { id: 'badge', text: "Earn Marlo's Tide Badge", at: 'lakeside', done: S => !!S.flags.badge_tide },
    { id: 'race', text: 'Race the Ashen Wardens to Tidefall', at: 'tidefall', done: S => !!S.flags.ashen_tf },
    { id: 'dive', text: 'Dive into the drowned shrine for the Marsh shard', at: 'tidefall', done: S => !!S.flags.shard_marsh },
  ],
  reward: { money: 5000, rep: { north: 15, south: 15 }, text: 'a sailboat', fn: () => grant('sailboat') } });
G.MAPS.lakeside.objs.push({ x: 46, y: 7, prompt: 'Look', fn: async () => {
  const S = G.state, f = F();
  if (f.ch4_stone) { await says('The Tide Stone hums on its plinth. The lake is full and bright again.'); return; }
  if (S.bag[STONE]) {
    delete S.bag[STONE]; f.ch4_stone = true; G.audio.sfx('heal'); await G.fadeTo(.6, 10, '#9fe0ff'); await G.fadeTo(0, 16);
    await says(['You set the Tide Stone back on its plinth. It hums, and the water begins to rise.', 'Down in the town, people cheer as the piers float again.']); G.rep.add('north', 10); return;
  }
  await says(Q.active('ch4') ? ['An empty stone plinth by the water. Fresh scratches show where something was pried off.', 'Grey footprints lead east along the shore.'] : 'An old stone plinth. The Tide Stone sits on it, humming softly.');
} });
ashen('lakeside', 'ashen_lk', 50, 10, LEFT, 'BRACKEN', [[88, 21], [22, 22], [20, 23]], 'BRACKEN: Looking for this? The Tide Stone is worth more to Vesper than to a town of fishermen.', 'BRACKEN: Fine! Take the rock!', 'BRACKEN: Sable is already on the way to Tidefall. You are too late.', () => !Q.state('ch4'));
// winning against Bracken hands over the stone
G.hooks.tick.push(() => { const S = G.state; if (S && S.flags && S.flags.ashen_lk && !S.flags.ch4_gotstone) { S.flags.ch4_gotstone = true; if (!S.flags.ch4_stone) { S.bag[STONE] = 1; G.questToast('GOT: TIDE STONE', 'step'); } } });
ashen('tidefall', 'ashen_tf', 10, 34, LEFT, 'SABLE', [[22, 24], [76, 24], [47, 25], [20, 26]], ['SABLE: You again! The shrine is ours, apprentice.', 'SABLE: Vesper needs every shard. Every single one.'], 'SABLE: I hate the water anyway.', 'SABLE: You will need more than a boat to get down there.', () => !Q.state('ch4'));
G.MAPS.tidefall.objs.push({ x: 8, y: 33, prompt: 'Look', fn: async () => {
  const f = F();
  if (f.shard_marsh) { await says('The drowned shrine rests quietly under the water. Its little lamp still glows.'); return; }
  if (Q.active('ch4') && !f.ashen_tf) { await says('SABLE is guarding the shrine. Deal with her first!'); return; }
  const c = swimmer();
  if (!c) { await says(['A shrine sunk beneath the water. Something glows like an ember far below.', 'You would need a strong Water creature (Lv 15 or higher) to dive that deep.']); return; }
  await says([`You take a deep breath and hold on to ${G.name(c)}. Down, down through the green water...`, 'In the drowned shrine, a lamp still burns. The Marsh Ember Shard rests on its altar.']);
  await G.fadeTo(1, 12, '#1a4a6a'); await G.wait(20); await G.fadeTo(0, 14);
  await shardGet('marsh', 'MARSH'); G.rep.add('south', 10);
} });
G.hooks.load.push(m => {   // solid story objects
  const B = { evergreen: ['29,16'], driftwood: [], lakeside: ['46,7'], tidefall: ['8,33'] }[m.id]; if (!B) return;
  m.block = m.block || new Set(); for (const k of B) m.block.add(k);
});

// ---- Drawing: the Oak's lantern, the lighthouse beam, the Tide Stone, the drowned shrine -----------------------------------
G.hooks.draw.push((items, cx, cy, t) => {
  const m = G.world.map, S = G.state; if (!m || !S || !S.flags) return; const f = S.flags;
  if (m.id === 'evergreen') items.push({ y: 16 * 16 + 17, draw: c => { const x = 29 * 16 - cx + 8, y = 16 * 16 - cy + 4;
    c.fillStyle = '#5a3a1e'; c.fillRect(x - 2.5, y - 3, 5, 7); c.fillStyle = f.ch2_oak ? '#ffd860' : '#4a4458'; c.fillRect(x - 1.6, y - 1.8, 3.2, 4.4);
    if (f.ch2_oak) { c.globalCompositeOperation = 'lighter'; G.kit.drawGlow(c, '#ffd860', x, y, 14 + Math.sin(t / 10), .5); c.globalCompositeOperation = 'source-over'; } } });
  if (m.id === 'driftwood' && f.ch3_light) items.push({ y: 9 * 16, draw: c => { const x = 7 * 16 - cx, y = 5 * 16 - cy, a = t / 40;
    c.globalCompositeOperation = 'lighter'; G.kit.drawGlow(c, '#fff0a0', x, y, 12, .7);
    c.fillStyle = 'rgba(255,240,170,.18)'; c.beginPath(); c.moveTo(x, y); c.arc(x, y, 90, a, a + .35); c.closePath(); c.fill(); c.globalCompositeOperation = 'source-over'; } });
  if (m.id === 'lakeside') items.push({ y: 7 * 16 + 15, draw: c => { const x = 46 * 16 - cx + 8, y = 7 * 16 - cy + 12;
    c.fillStyle = '#9a9aa8'; c.fillRect(x - 6, y - 4, 12, 6); c.fillStyle = '#bcbcc8'; c.fillRect(x - 6, y - 5, 12, 2);
    if (f.ch4_stone || !Q.state('ch4')) { c.fillStyle = '#3a8ad8'; c.beginPath(); c.ellipse(x, y - 8, 4, 3.4, 0, 0, TAU); c.fill(); c.globalCompositeOperation = 'lighter'; G.kit.drawGlow(c, '#7fd0ff', x, y - 8, 8, .4 + .2 * Math.sin(t / 12)); c.globalCompositeOperation = 'source-over'; } } });
  if (m.id === 'tidefall') items.push({ y: 33 * 16 + 15, draw: c => { const x = 8 * 16 - cx + 8, y = 33 * 16 - cy + 12;
    c.fillStyle = 'rgba(40,110,160,.55)'; c.beginPath(); c.ellipse(x, y - 2, 9, 6, 0, 0, TAU); c.fill();
    c.strokeStyle = '#d8e4ec'; c.lineWidth = 1.4; c.beginPath(); c.arc(x, y - 4, 5, Math.PI, TAU); c.stroke(); c.fillStyle = '#d8e4ec'; c.fillRect(x - 5.7, y - 4, 1.4, 4); c.fillRect(x + 4.3, y - 4, 1.4, 4);
    if (!f.shard_marsh) { c.globalCompositeOperation = 'lighter'; G.kit.drawGlow(c, '#ff9a40', x, y - 1, 5, .5 + .3 * Math.sin(t / 9)); c.globalCompositeOperation = 'source-over'; }
    c.strokeStyle = `rgba(255,255,255,${.35 + .2 * Math.sin(t / 14)})`; c.lineWidth = .6; c.beginPath(); c.ellipse(x, y - 2, 7 + (t % 40) / 10, 4.5 + (t % 40) / 16, 0, 0, TAU); c.stroke(); } });
});

// Wren's lines move with the story
const wrenLines = { ch2: ['ELDER WREN: The forest has gone silent. Hazel in Sunmeadow will know why.', 'ELDER WREN: Take the Lamp into Evergreen. Light is the first kindness.'],
  ch3: ['ELDER WREN: Driftwood\'s lighthouse is dark, and grey sails are out on the water.', 'ELDER WREN: Go to the coast. And keep an eye on Tam. That one is torn.'],
  ch4: ['ELDER WREN: Lakeside writes that their lake is draining away.', 'ELDER WREN: Bog says the Marsh shard lies in a drowned shrine at Tidefall. Bring a strong swimmer.'] };
const wren0 = G.onWren;
G.onWren = async function () {
  if (wren0 && await wren0()) return true;
  for (const id of ['ch2', 'ch3', 'ch4']) if (Q.active(id) && !F()['wren_' + id]) { F()['wren_' + id] = true; await says(wrenLines[id]); return true; }
  return false;
};
G.storyFlags = (G.storyFlags || []).concat(['ch2_oak', 'ch2_vesper', 'ashen_eg', 'ch3_light', 'ashen_vd', 'ch3_tam', 'ashen_lk', 'ch4_gotstone', 'ch4_stone', 'ashen_tf', 'wren_ch2', 'wren_ch3', 'wren_ch4']);
})();
