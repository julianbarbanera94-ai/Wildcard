// Story: Chapters 5 to 8, the finale and the post-game.
//   5. Dust and Thunder (Sandsreach, Cobalt, the Badlands): Ashen machines siphon the calm out of both towns. Help them in
//      the order you choose (the first gets more of your time and more gratitude), then find where the calm goes.
//   6. Cold Resolve (Glacier Pass, Frostmere, the Aurora Isles): Tam turns on Vesper and comes north with you; with Tam there,
//      the Aurora guardian trusts you with the Mine shard that Vesper's people stole from Kade.
//   7. Fire at the Heart (Emberfall): with Pyrra's help, shut down Vesper's machine under the volcano. Vesper flees to Cloudpeak.
//   8. The Great Lantern (Cloudpeak, Lanternrest): Vesper in three stages at the castle, then relight the Lantern.
//   Finale: the Wildcard at the Hollow Gate. Choose TRUST, STRENGTH or BALANCE, and see how the vale remembers you.
//   Post-game: daily rematches with every Arena Leader.
(function () {
const DOWN = 0, UP = 1, LEFT = 2, RIGHT = 3, TAU = Math.PI * 2;
const F = () => G.state.flags, says = l => G.worldApi.says(l), Q = G.quest;
const ASHEN = { hair: '#3a3440', skin: '#e8c0a0', shirt: '#4a4450', pants: '#2a2630', hat: '#8a3a3a' };
const VESPER = { hair: '#e8e8f0', skin: '#e8c8b0', shirt: '#2a2a3a', pants: '#1a1a24', hat: '#6a2a4a' };
const TAM = { hair: '#2a8a8a', skin: '#f0c8a0', shirt: '#f0a030', pants: '#3a3a50', hat: '#2a8a8a' };
const PYRRA = { hair: '#d03a20', skin: '#e8b890', shirt: '#e8502a', pants: '#3a2a30', hat: '#ffb040' };
const npc = (map, x, y, dir, style, o) => G.mk.npc(G.MAPS[map], x, y, dir, style, null, Object.assign({ still: true }, o));
const ashen = (map, id, x, y, dir, name, team, pre, win, post, hide) => npc(map, x, y, dir, 'boy', { style: ASHEN, hide,
  trainer: { id, style: ASHEN, name, cls: 'ASHEN WARDEN', sight: 3, team, pre, win, post, prize: 200 } });
const ask = async (q, items) => { await G.say(q, { auto: 1 }); const c = await G.choose(items, { right: 236, bottom: 108, cancel: false }); G.closeText(); return c; };
const join = (id, lvl, how) => { const S = G.state, c = G.makeCreature(id, lvl); c.befriended = true; S.dex[id] = 2; (S.party.length < 6 ? S.party : S.box).push(c); G.audio.sfx('caught'); return `${S.name} ${how} ${G.SPECIES[id].name.toUpperCase()}! ${S.party.includes(c) ? 'It joined your party.' : 'It went to your PC.'}`; };
const top = () => Math.max(...G.state.party.map(c => c.lvl));
const block = {};   // map -> ['x,y'] solid story objects
G.hooks.load.push(m => { if (!block[m.id]) return; m.block = m.block || new Set(); for (const k of block[m.id]) m.block.add(k); });
const solid = (map, x, y) => (block[map] = block[map] || []).push(x + ',' + y);

// The Mine shard is no longer Kade's to give (js/maps/ridge.js): the Ashen Wardens took it north.
G.SHARD_PLACES = Object.assign(G.SHARD_PLACES || {}, { mine: 'aurora' });

// ==== Chapter 5: Dust and Thunder ==========================================================================================
const siphons = S => (S.flags.ch5_sr ? 1 : 0) + (S.flags.ch5_cb ? 1 : 0);
Q.def({ id: 'ch5', cat: 'main', prio: 10, title: 'Chapter 5: Dust and Thunder', giver: 'Elder Wren',
  desc: 'Osha in Sandsreach and Rayne in Cobalt City both need help. The Ashen Wardens are draining something from their towns.',
  start: S => Q.done('ch4'),
  steps: [
    { id: 'first', text: 'Help Sandsreach or Cobalt City first (your choice)', at: 'sandsreach', count: S => [siphons(S), 1], done: S => siphons(S) >= 1 },
    { id: 'both', text: 'Help the other town too', at: S => S.flags.ch5_sr ? 'cobalt' : 'sandsreach', count: S => [siphons(S), 2], done: S => siphons(S) >= 2 },
    { id: 'machine', text: 'Follow the siphon lines into the Crimson Badlands', at: 'badlands', done: S => !!S.flags.ch5_machine },
    { id: 'badges', text: "Earn Osha's and Rayne's Badges", at: S => S.flags.badge_dune ? 'cobalt' : 'sandsreach', count: S => [(S.flags.badge_dune ? 1 : 0) + (S.flags.badge_circuit ? 1 : 0), 2], done: S => !!(S.flags.badge_dune && S.flags.badge_circuit) },
  ],
  reward: { money: 6000, rep: { east: 20 }, text: 'a Skyrant that can carry you', fn: () => { if (!F().ch5_sky) { F().ch5_sky = true; join(17, 30, 'was given'); } } } });
const SIPHON = { sr: ['sandsreach', 31, 24, 'Sandsreach', 'east', 'the oasis', 'OSHA'], cb: ['cobalt', 33, 26, 'Cobalt City', 'east', 'the power plant', 'RAYNE'] };
for (const [k, [map, x, y, town, region, what, leader]] of Object.entries(SIPHON)) {
  solid(map, x, y);
  G.MAPS[map].objs.push({ x, y, prompt: 'Look', hide: () => !!F()['ch5_' + k], fn: async () => {
    const f = F();
    if (!Q.active('ch5')) { await says('A grey metal machine hums here, its pipes running off toward the east.'); return; }
    if (!f['ashen_' + k]) { await says('An Ashen Warden is guarding the machine. Deal with them first!'); return; }
    if ((await ask(`An Ashen machine, drawing a pale glow out of ${what}. It feeds a pipe that runs east. Shut it down?`, ['SHUT IT DOWN', 'LEAVE IT'])) !== 0) return;
    const first = !f.ch5_sr && !f.ch5_cb; f['ch5_' + k] = true; f.ch5_first = f.ch5_first || k;
    G.audio.sfx('bump'); await G.fadeTo(.6, 6, '#fff'); await G.fadeTo(0, 10);
    await says(first
      ? [`The machine sputters and dies. All over ${town}, creatures lift their heads, wide awake again.`, `${leader}: You came to us first. ${town} will not forget it.`]
      : [`The machine sputters and dies. ${town} breathes again.`, `${leader}: You got here in the end. We held on, but only just.`]);
    G.rep.add(region, first ? 20 : 10);
    if (f.ch5_sr && f.ch5_cb) await says('Both pipes ran east, toward the Crimson Badlands. Something out there is collecting the calm.');
  } });
}
ashen('sandsreach', 'ashen_sr', 37, 24, LEFT, 'DUNMORE', [[121, 30], [22, 31], [20, 32]], 'DUNMORE: The desert creatures are finally quiet. Leave the machine alone.', 'DUNMORE: The siphon is yours.', 'DUNMORE: It does not matter. Vesper has more machines than you have days.', () => !Q.state('ch5'));
ashen('cobalt', 'ashen_cb', 39, 28, LEFT, 'VOLTA', [[80, 31], [77, 32], [20, 32]], 'VOLTA: The city hums along nicely without all that noisy creature energy.', 'VOLTA: Short-circuited!', 'VOLTA: The Badlands machine runs on a hundred siphons. Good luck.', () => !Q.state('ch5'));
solid('badlands', 46, 20);
G.MAPS.badlands.objs.push({ x: 46, y: 20, prompt: 'Look', fn: async () => {
  const f = F();
  if (!Q.active('ch5') || siphons(G.state) < 2) { await says('Strange pipes come out of the rock here and run north, toward Emberfall.'); return; }
  if (f.ch5_machine) { await says('The pipes run north into Emberfall. The machine must be under the volcano.'); return; }
  f.ch5_machine = true; G.audio.sfx('exclaim');
  await says(['A huge iron valve, warm to the touch. Dozens of pipes meet here and run north, into the volcano.', 'A torn page is stuck in the valve wheel:', '"...the calm of a hundred towns, gathered under Emberfall. With it, the Wildcard can be bound to the Lantern forever. No more fear. No more wild. - V."']);
} });

// ==== Chapter 6: Cold Resolve ===========================================================================================
Q.def({ id: 'ch6', cat: 'main', prio: 10, title: 'Chapter 6: Cold Resolve', giver: 'Elder Wren',
  desc: "Kade's Mine shard was stolen and taken north. Isolde guards the cold road there.",
  start: S => Q.done('ch5'),
  steps: [
    { id: 'pass', text: 'Cross Glacier Pass', at: 'glacier', done: S => !!S.visited.glacier },
    { id: 'tam', text: 'Find Tam on Glacier Pass', at: 'glacier', done: S => !!S.flags.ch6_tam },
    { id: 'badge', text: "Earn Isolde's Rime Badge in Frostmere", at: 'frostmere', done: S => !!S.flags.badge_rime },
    { id: 'aurora', text: 'Reach the Aurora Isles (ferry from Frostmere)', at: 'aurora', done: S => !!S.visited.aurora },
    { id: 'shard', text: "Earn the Aurora guardian's trust, with Tam beside you", at: 'aurora', done: S => !!S.flags.shard_mine },
  ],
  reward: { money: 7000, rep: { north: 20 } } });
npc('glacier', 30, 23, LEFT, 'boy', { style: TAM, hide: () => !Q.state('ch6') || !!F().ch6_tam, talk: async () => {
  const f = F(); f.ch6_tam = true; G.audio.sfx('exclaim');
  await says(['TAM: There you are. I came up here to think.', 'TAM: I went back to Vesper after Verdant. I saw the machine in the volcano, full of stolen calm. Creatures in cages, too quiet to cry.', "TAM: I'm done with Vesper. The Ashen Wardens took Kade's shard to the Aurora Isles. Let me come with you. Whatever guards it might listen to two of us."]);
  await says(f.tamWon ? 'TAM: And this time I am on your side, so you had better not lose.' : 'TAM: You beat me back in Lanternrest, remember? I trust your way now.');
} });
npc('aurora', 24, 16, LEFT, 'boy', { style: TAM, hide: () => !F().ch6_tam || !!F().shard_mine || !Q.state('ch6'), talk: async () => says('TAM: Look, there by the ice. It has been guarding the shard all alone. Go gently.') });
npc('aurora', 22, 19, UP, 'boy', { creature: 154, hide: () => !F().ch6_tam || !!F().shard_mine, talk: async () => {
  await says(['A Glacitan, old as the ice. The Mine Ember Shard glows inside its frozen shell.', 'TAM: The Ashen Wardens tried to take it by force. It froze their boats. Be gentle.']);
  if (!(await G.trust('Glacitan'))) return;
  const S = G.state; S.flags.shard_mine = true; G.audio.sfx('levelup');
  await says(['The Glacitan cracks its shell open and offers you the shard.', `${S.name} received the MINE EMBER SHARD!`, 'TAM: All three. You did it. Now we stop Vesper.']);
  G.rep.add('north', 10);
} });

// ==== Chapter 7: Fire at the Heart ========================================================================================
Q.def({ id: 'ch7', cat: 'main', prio: 10, title: 'Chapter 7: Fire at the Heart', giver: 'Elder Wren',
  desc: "Vesper's machine is under Emberfall, filled with the calm stolen from every town.",
  start: S => Q.done('ch6'),
  steps: [
    { id: 'go', text: 'Travel to Emberfall', at: 'emberfall', done: S => !!S.visited.emberfall },
    { id: 'pyrra', text: 'Ask Pyrra for a way in', at: 'emberfall', done: S => !!S.flags.ch7_pyrra },
    { id: 'elite', text: "Beat Vesper's elite guard", at: 'emberfall', done: S => !!S.flags.ashen_ef },
    { id: 'machine', text: 'Shut down the machine under the volcano', at: 'emberfall', done: S => !!S.flags.ch7_machine },
  ],
  reward: { money: 8000, rep: { east: 20 } } });
npc('emberfall', 26, 17, RIGHT, 'boy', { style: PYRRA, hide: () => !Q.state('ch7'), talk: async () => {
  const f = F();
  if (f.ch7_machine) { await says('PYRRA: The mountain is quiet again. The good kind of quiet.'); return; }
  if (!f.ch7_pyrra) { f.ch7_pyrra = true; await says(['PYRRA: You are the Warden the whole vale is talking about. Good. I need you.', "PYRRA: Vesper's people sealed the old lava tunnel. I have opened it for you. Their elite guard waits at the machine.", 'PYRRA: Break it, and every town gets back what was taken.']); return; }
  await says('PYRRA: The machine is right there. Go!');
} });
ashen('emberfall', 'ashen_ef', 32, 19, LEFT, 'CINDRA', [[119, 42], [134, 43], [22, 43], [20, 44]], ['CINDRA: Not one step closer to the heart of the machine.', 'CINDRA: Vesper chose me to guard it. I will not fail.'], 'CINDRA: ...The machine. It is yours.', 'CINDRA: Vesper has gone to Cloudpeak. You will never reach the castle in time.', () => !F().ch7_pyrra);
solid('emberfall', 29, 16);
G.MAPS.emberfall.objs.push({ x: 29, y: 16, prompt: 'Look', fn: async () => {
  const f = F();
  if (f.ch7_machine) { await says('The machine lies cold and broken. Warm air drifts out of it, smelling of every town in the vale.'); return; }
  if (!Q.active('ch7')) { await says('A sealed iron hatch in the rock, warm to the touch.'); return; }
  if (!f.ashen_ef) { await says('CINDRA is guarding the machine.'); return; }
  f.ch7_machine = true; G.audio.sfx('bump'); await G.fadeTo(1, 10, '#fff'); await G.wait(20); await G.fadeTo(0, 20);
  await says(['You throw the great lever. The machine shudders, groans, and bursts open.', 'A warm wind rushes out and away over the mountains: the calm of every town, going home.', '???: ENOUGH!', 'VESPER (from the ridge above): You have ruined years of work. Fine. I will bind the Wildcard myself, at Cloudpeak.', 'Vesper is gone in a swirl of grey cloak.']);
} });

// ==== Chapter 8: The Great Lantern ======================================================================================
Q.def({ id: 'ch8', cat: 'main', prio: 10, title: 'Chapter 8: The Great Lantern', giver: 'Elder Wren',
  desc: 'Vesper waits at the castle on Cloudpeak. End it, then bring the Lantern back to life.',
  start: S => Q.done('ch7'),
  steps: [
    { id: 'climb', text: 'Climb Cloudpeak to the castle', at: 'cloudpeak', done: S => !!S.visited.cloudpeak },
    { id: 'vesper', text: 'Defeat Vesper', at: 'cloudpeak', count: S => [Math.min(3, S.flags.ch8_stage || 0), 3], done: S => !!S.flags.ch8_vesper },
    { id: 'light', text: 'Place the three shards in the Great Lantern', at: 'lanternrest', done: S => !!S.flags.lanternLit },
  ],
  reward: { money: 10000, rep: { vale: 30 } } });
const VESPER_STAGES = [
  { say: ['VESPER: You came all this way to tell me I was wrong.', "VESPER: Then show me. Let's see if your kindness can stand against my order."], team: [[22, 3], [78, 4], [20, 4]] },
  { say: ['VESPER: Again? You and your partners just... keep standing.', 'VESPER: I trained these creatures to be still. Why are yours not afraid?'], team: [[142, 4], [131, 5], [36, 5]] },
  { say: ['VESPER: Everything I built, I built to stop the fear. To make the vale safe.', 'VESPER: My last partner. The one that never left me. Show me what a bond really is!'], team: [[3, 6], [155, 7], [128, 7], [92, 8]] },
];
npc('cloudpeak', 32, 9, DOWN, 'boy', { style: VESPER, hide: () => !Q.state('ch8') || !!F().ch8_vesper, talk: async () => {
  const f = F();
  for (let s = f.ch8_stage || 0; s < 3; s++) {
    const st = VESPER_STAGES[s]; await says(st.say);
    const lv = Math.max(30, top() - 4);   // roughly your level: each stage adds a little
    const r = await G.storyBattle({ trainer: { name: 'VESPER', cls: 'ASHEN WARDEN', style: VESPER, prize: 1500, win: ['That is not possible...', 'Stop. Just stop.', '...'][s], team: st.team.map(([id, d]) => G.makeCreature(id, Math.min(100, lv + d))) } });
    if (r !== 'win') { await says('VESPER: Go home, apprentice. Come back when you are ready to lose properly.'); return; }
    f.ch8_stage = s + 1;
  }
  f.ch8_vesper = true;
  await says(['Vesper sinks to one knee. For a long moment, no one speaks.', 'VESPER: All this time, I thought the Wildcard left because the vale was too wild. Maybe it left because we stopped trusting it.', 'VESPER: Relight your Lantern. I... will go and open the cages.', 'TAM: Let\'s go home.']);
  G.rep.add('north', 15); G.rep.add('vale', 10);
} });

// ==== Finale: the Wildcard ================================================================================================
Q.def({ id: 'finale', cat: 'main', prio: 20, title: 'Finale: The Wildcard', giver: 'Elder Wren',
  desc: 'The Lantern is lit and the Hollow Gate is open. The Wildcard is waiting.',
  start: S => Q.done('ch8') || (!!S.flags.lanternLit && !S.flags.jokerGone && Q.done('ch7')),
  steps: [{ id: 'joker', text: 'Go through the Hollow Gate and meet the Wildcard', at: 'hollow', done: S => !!S.flags.finale }],
  reward: { money: 20000, rep: { vale: 20, west: 10, south: 10, north: 10, east: 10 } } });
const balanceScore = () => { const S = G.state, rep = G.REP_REGIONS.reduce((a, [r]) => a + G.rep.get(r), 0); const side = Q.all().filter(q => q.cat !== 'main' && Q.done(q.id)).length; return Math.floor(rep / 100) + side; };
G.onJoker = async function () {
  const S = G.state, f = S.flags;
  await says(['...', 'In the glow of the crystals, a creature stirs. Its shape shifts every time you blink.', 'The WILDCARD. It is not angry. It is tired, and it is watching you, the way the whole vale has been watching you.']);
  const c = await ask('How will you meet the Wildcard?', ['TRUST', 'STRENGTH', 'BALANCE']);
  let stance = null;
  if (c === 0) {
    await says('You set down your orbs and step forward, empty-handed.');
    if (await G.trust('Wildcard')) { stance = 'trust'; await says(['The Wildcard lowers its head, and the shifting stops. For a moment it looks like every creature you have ever met.', join(25, Math.max(50, top()), 'earned the trust of')]); }
  } else if (c === 1) {
    const r = await G.storyBattle({ wild: G.makeCreature(25, Math.max(40, top() + 2)) });
    if (r === 'caught') { stance = 'strength'; S.dex[25] = 2; await says('You caught the WILDCARD!'); }
    else if (r === 'win') { stance = 'strength'; await says('The Wildcard bows, then fades into the crystals. It will watch over the vale from here.'); }
  } else {
    const n = balanceScore();
    if (n >= 5) { stance = 'balance'; await says(['You tell the Wildcard about the towns you helped, the creatures you befriended, the people who know your name.', 'It listens to all of it. Then it curls up beside you, as calm as the Lantern light.', join(25, Math.max(50, top()), 'was joined by')]); }
    else await says(['You tell the Wildcard what you have done so far. It listens, but it is not convinced yet.', 'Help more of the vale, then come back. (Reputation and finished side quests count.)']);
  }
  if (!stance) return true;
  f.finale = stance; f.jokerGone = true; if (stance !== 'strength' || S.dex[25] === 2) f.jokerCaught = !!S.party.concat(S.box).some(c => c.id === 25);
  G.audio.music('town'); await epilogue(stance);
  return true;
};
async function epilogue(stance) {
  const S = G.state, f = S.flags, lines = [];
  lines.push({ trust: 'You met the Wildcard with open hands, and the vale learned that trust can be stronger than fear.', strength: 'You met the Wildcard head-on, and the vale learned that a Warden can stand firm and still be kind.', balance: 'You met the Wildcard with everything you had built, and the vale learned that it is stronger together.' }[stance]);
  lines.push(f.ch5_first === 'sr' ? 'Sandsreach still tells the story of the Warden who came to them first.' : f.ch5_first === 'cb' ? 'Cobalt City named a street after the Warden who came to them first.' : 'Sandsreach and Cobalt City both breathe easy again.');
  for (const id of ['ferry', 'orchard', 'trader', 'duel', 'tracks']) { const s = Q.state(id); if (s && s.outcome) lines.push(s.outcome); }
  lines.push('Tam became a Warden at the Hearth Shrine, and teaches the new trainees to listen first.');
  lines.push('Vesper opened every cage, and now walks the roads alone, learning the creatures\' names one by one.');
  const deed = (S.home && S.home.deed) || 1; lines.push(deed >= 5 ? 'Your homestead grew into a small village of its own.' : 'Your homestead is waiting to grow.');
  G.closeText(); await G.fadeTo(1, 20, '#000');
  const l = { draw(ctx) { ctx.fillStyle = '#0c0820'; ctx.fillRect(-300, -300, 900, 800); G.text(ctx, 'EPILOGUE', 120, 14, { align: 'center', font: G.FONT_B || G.FONT, color: '#ffe680', shadow: false }); } };
  G.ui.layers.push(l); await G.fadeTo(0, 20);
  await says(lines);
  await says(['THE END', 'The Great Lantern burns, the Wildcard is home, and Aurelis is yours to explore. Arena Leaders now accept rematches every day.']);
  await G.fadeTo(1, 16, '#000'); G.ui.layers.splice(G.ui.layers.indexOf(l), 1); await G.fadeTo(0, 16);
}

// ==== Post-game: Arena Leader rematches (once a day, at your team's level) ==========================================
G.hooks.load.push(m => {
  for (const n of m.npcs || []) if (n.trainer && n.trainer.leader && !n.rematch) n.rematch = async () => {
    const S = G.state, f = S.flags, key = 'rematch_' + n.trainer.leader;
    if (!f.finale) return false;
    if (f[key] === S.day) { await says(`${n.trainer.name}: We already had our rematch today. Come back tomorrow!`); return true; }
    if ((await ask(`${n.trainer.name}: The Warden who calmed the Wildcard! A rematch, at full strength?`, ['REMATCH', 'NOT NOW'])) !== 0) return true;
    const lv = top() + 3, r = await G.storyBattle({ trainer: { name: n.trainer.name, cls: 'ARENA LEADER', style: n.trainer.style, prize: 2500, win: 'Still the best Warden in Aurelis.', team: n.trainer.team.map(([id]) => G.makeCreature(id, Math.min(100, lv))) } });
    f[key] = S.day; if (r === 'win') G.rep.add(G.regionOf(m.id.replace('arena_', '')), 2);
    return true;
  };
});

// ---- Drawing: the siphon machines, the Badlands valve, the volcano machine -----------------------------------------
function machine(c, x, y, t, big, broken) {
  c.fillStyle = 'rgba(20,20,30,.25)'; c.beginPath(); c.ellipse(x + 8, y + 15, big ? 9 : 7, 2.5, 0, 0, TAU); c.fill();
  c.fillStyle = broken ? '#5a5a62' : '#6a6a78'; c.fillRect(x + 2, y + 3, 12, 12); c.fillStyle = '#8a8a98'; c.fillRect(x + 3, y + 4, 10, 3);
  c.fillStyle = broken ? '#3a3a40' : `rgba(200,220,255,${.6 + .3 * Math.sin(t / 8)})`; c.beginPath(); c.arc(x + 8, y + 10, 2.6, 0, TAU); c.fill();
  c.strokeStyle = '#4a4a54'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x + 14, y + 9); c.lineTo(x + 18, y + 9); c.stroke();
  if (!broken) { c.globalCompositeOperation = 'lighter'; G.kit.drawGlow(c, '#b0c8ff', x + 8, y + 10, 8, .35); c.globalCompositeOperation = 'source-over'; }
}
G.hooks.draw.push((items, cx, cy, t) => {
  const m = G.world.map, S = G.state; if (!m || !S || !S.flags) return; const f = S.flags;
  for (const [k, [map, x, y]] of Object.entries(SIPHON)) if (m.id === map && !f['ch5_' + k]) items.push({ y: y * 16 + 15, draw: c => machine(c, x * 16 - cx, y * 16 - cy, t, false, false) });
  if (m.id === 'badlands') items.push({ y: 20 * 16 + 15, draw: c => machine(c, 46 * 16 - cx, 20 * 16 - cy, t, true, false) });
  if (m.id === 'emberfall') items.push({ y: 16 * 16 + 15, draw: c => machine(c, 29 * 16 - cx, 16 * 16 - cy, t, true, !!f.ch7_machine) });
});

// Wren for each chapter
const WREN = { ch5: ['ELDER WREN: Letters from Osha in Sandsreach and Rayne in Cobalt City, both asking for help. Their creatures have gone strangely still.', 'ELDER WREN: You cannot be in two places at once. Choose who to help first.'],
  ch6: ['ELDER WREN: Kade writes from the mine: Ashen Wardens broke in and took the Mine shard north.', 'ELDER WREN: Cross Glacier Pass to Frostmere. And if you meet Tam up there... listen.'],
  ch7: ['ELDER WREN: You have all three shards. But Vesper still has the calm of a hundred towns, under Emberfall.', 'ELDER WREN: Pyrra knows the mountain. Go.'],
  ch8: ['ELDER WREN: Vesper has gone to the castle on Cloudpeak. This ends there.', 'ELDER WREN: Then come home, and light the Lantern.'],
  finale: ['ELDER WREN: The Lantern burns. I have not felt the vale this calm in my whole life.', 'ELDER WREN: The Hollow Gate is open. Go and meet the Wildcard, little Warden. Not so little any more.'] };
const wren0 = G.onWren;
G.onWren = async function () {
  if (wren0 && await wren0()) return true;
  for (const id of Object.keys(WREN)) if (Q.active(id) && !F()['wren_' + id]) { F()['wren_' + id] = true; await says(WREN[id]); return true; }
  return false;
};
G.storyFlags = (G.storyFlags || []).concat(['ashen_sr', 'ashen_cb', 'ch5_sr', 'ch5_cb', 'ch5_machine', 'ch5_sky', 'ch6_tam', 'ch7_pyrra', 'ashen_ef', 'ch7_machine', 'ch8_vesper', 'wren_ch5', 'wren_ch6', 'wren_ch7', 'wren_ch8', 'wren_finale', 'finale']);
})();
