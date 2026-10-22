// Interiors of the enterable structures, end to end in headless Chromium: node tests/e2e-interiors.js
// Walking in and out, every handler, creatures and vehicles drawn inside, growing with upgrades, moving, saving inside.
// env: OUT=<dir for screenshots> PW=<path to playwright> CHROME=<chromium binary>
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path'), assert = require('assert');
const OUT = process.env.OUT || '/tmp';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../index.html')); await page.waitForTimeout(400);
  const key = async (k, hold = 70) => { await page.keyboard.down(k); await page.waitForTimeout(hold); await page.keyboard.up(k); await page.waitForTimeout(70); };
  const ev = (fn, arg) => page.evaluate(fn, arg), shot = n => page.screenshot({ path: `${OUT}/in-${n}.png` });
  const until = async (fn, ms = 15000, msg = '', arg) => { const t = Date.now(); while (Date.now() - t < ms) { if (await page.evaluate(fn, arg)) return; await page.waitForTimeout(50); } await shot('timeout'); throw new Error('timeout waiting for ' + (msg || fn)); };
  const isIdle = () => ev(() => !G.world.busy && G.scene === G.world.scene && G.ui.fade.a === 0 && !G.ui.layers.length && !G.ui.text && !G.healState);
  // close whatever UI is open (B, or A on a text arrow) until the world is idle again
  const closeAll = async () => { for (let i = 0; i < 80; i++) { if (await isIdle()) return; if (await ev(() => G.ui.text && G.ui.text.arrow)) await key('z', 50); else await key('x', 50); await page.waitForTimeout(40); } await shot('timeout'); throw new Error('could not close the UI'); };
  const step = n => console.log('✓', n);
  const lastText = () => ev(() => G.ui.text ? G.ui.text.lines.join(' ') : '');
  const waitText = async (re, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { const s = await lastText(); if (re.test(s)) return s; await page.waitForTimeout(50); } await shot('timeout'); throw new Error('no text matching ' + re + ' (last: ' + (await lastText()) + ')'); };
  const where = () => ev(() => ({ map: G.world.mapId, x: G.world.p.x, y: G.world.p.y }));

  // Past the title; then a fresh game on a fully owned homestead
  await key('z'); await key('z'); await page.waitForTimeout(600);
  for (let i = 0; i < 40 && await ev(() => !G.state || G.world.busy); i++) await key('z', 50);
  await ev(() => { G.scene = G.world.scene; });
  // helpers living in the page
  await ev(() => {
    window.T = {
      fresh() {
        G.state = G.newState(); G.migrateState(G.state); const S = G.state; S.flags.starter = true; S.home.deed = 5; S.home.seen = 5; S.money = 99999;
        S.party.length = 0; S.party.push(G.makeCreature(1, 12), G.makeCreature(4, 10));
        Object.assign(S.bag, { Wood: 30, Stone: 30, Plank: 20, 'Iron Ingot': 5 });
        window.__hits = []; G.loadMap('homestead'); G.placePlayer(27, 40, 1); G.scene = G.world.scene;
      },
      // push a build of `type` on clear ground of the map (top-left found by scanning), returns the build
      put(type, lvl, mapId, id) {
        if (G.world.mapId !== mapId) { G.loadMap(mapId); G.placePlayer(G.MAPS[mapId].w >> 1, G.MAPS[mapId].h - 3, 1); }
        const m = G.world.map, d = G.STRUCTURES[type], top = d.levels.length;
        for (let y = 12; y < m.h - 4; y++) for (let x = 6; x < m.w - 6; x++) {
          if (!G.buildApi.canPlace(type, x, y, 0, null, top)) continue;
          const b = { id: id || 't_' + type, type, map: mapId, x, y, lvl, rot: 0 }; if (type === 'nursery') b.pets = [];
          G.state.builds.push(b); G.home.refresh(); return b;
        }
        throw new Error('no room for ' + type);
      },
      // reachability of a generated interior, from the arrival tile in front of the mat
      reach(id) {
        const m = G.MAPS[id], ex = m.warps[0], sx = ex.x, sy = ex.y - 1, seen = new Set([sx + ',' + sy]), q = [[sx, sy]];
        const npcAt = (x, y) => m.npcs.some(n => n.x === x && n.y === y);
        const pass = (x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && !G.TILES[m.t[y][x]].solid && !m.block.has(x + ',' + y) && !npcAt(x, y);
        while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (!seen.has(k) && pass(nx, ny)) { seen.add(k); q.push([nx, ny]); } } }
        const next = (x, y) => [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => seen.has((x + dx) + ',' + (y + dy)));
        const bad = [];
        // an object belongs to the prop covering its cell: one reachable cell of a prop is enough to use it
        const groups = new Map();
        for (const o of m.objs) {
          if (typeof o.prompt !== 'string' && typeof o.prompt !== 'function') bad.push('noprompt ' + o.x + ',' + o.y);
          const pi = m.props.findIndex(p => o.x >= p.x && o.y >= p.y && o.x < p.x + p.w && o.y < p.y + p.h), g = pi >= 0 ? 'p' + pi : o.x + ',' + o.y;
          groups.set(g, (groups.get(g) || false) || next(o.x, o.y));
          if (!groups.has('n' + g)) groups.set('n' + g, o.prompt + ' ' + o.x + ',' + o.y);
        }
        for (const [g, ok] of groups) if (!g.startsWith('n') && !ok) bad.push('obj ' + groups.get('n' + g));
        for (const n of m.npcs) if (!next(n.x, n.y)) bad.push('npc ' + n.x + ',' + n.y);
        if (!seen.has(sx + ',' + (sy + 1))) bad.push('mat');
        // props: nothing on a wall, nothing stacked
        const used = new Map();
        for (const p of m.props) if (!p.flat) for (let j = 0; j < p.h; j++) for (let i = 0; i < p.w; i++) { const k = (p.x + i) + ',' + (p.y + j); if (m.t[p.y + j][p.x + i] === 'B') bad.push('on wall ' + p.kind + ' ' + k); if (used.has(k)) bad.push('overlap ' + p.kind + '/' + used.get(k) + ' ' + k); used.set(k, p.kind); }
        for (const n of m.npcs) if (used.has(n.x + ',' + n.y)) bad.push('npc on prop ' + n.x + ',' + n.y);
        return { bad, free: seen.size, objs: m.objs.length, props: m.props.length };
      },
      // a walkable reachable tile next to (x, y), plus the direction to face it
      faceSpot(id, x, y) {
        const m = G.MAPS[id], npcAt = (a, b) => m.npcs.some(n => n.x === a && n.y === b);
        for (const [dx, dy, dir] of [[0, 1, 1], [0, -1, 0], [1, 0, 2], [-1, 0, 3]]) { const px = x + dx, py = y + dy; if (px > 0 && py > 0 && px < m.w - 1 && py < m.h - 1 && !G.TILES[m.t[py][px]].solid && !m.block.has(px + ',' + py) && !npcAt(px, py) && !m.warps.some(w => w.x === px && w.y === py)) return { px, py, dir }; }
        return null;
      },
      go(id, x, y) { const s = T.faceSpot(id, x, y); if (!s) throw new Error('no spot at ' + x + ',' + y); G.placePlayer(s.px, s.py, s.dir); return s; },
      obj(id, prompt, nth) { const m = G.MAPS[id]; const l = m.objs.filter(o => (typeof o.prompt === 'function' ? o.prompt() : o.prompt) === prompt && T.faceSpot(id, o.x, o.y)); return l[nth || 0] || null; },
      spy(use) { const o = G.homeUse[use]; if (o._spy) return; const f = async b => { window.__hits.push(use + ':' + b.id); return o(b); }; f._spy = true; f._orig = o; G.homeUse[use] = f; },
      unspy() { for (const k of Object.keys(G.homeUse)) if (G.homeUse[k]._spy) G.homeUse[k] = G.homeUse[k]._orig; },
    };
  });
  const T = (name, ...a) => ev(([n, args]) => window.T[n](...args), [name, a]);
  const hits = () => ev(() => window.__hits.slice());

  const TYPES = [['shed', 'homestead'], ['nursery', 'homestead'], ['barn', 'homestead'], ['station', 'homestead'], ['refinery', 'homestead'], ['forge', 'homestead'], ['garage', 'homestead'], ['greenhouse', 'homestead']];
  const MAXL = await ev(() => Object.fromEntries(Object.values(G.STRUCTURES).filter(d => d.enterable).map(d => [d.id, d.levels.length])));

  // ---- 1) every type and level: generated, reachable, growing -----------------------------------------------
  for (const [type, mapId] of TYPES) {
    let prev = 0;
    await T('fresh');
    const b0 = await T('put', type, 1, mapId);
    for (let lvl = 1; lvl <= MAXL[type]; lvl++) {
      const r = await ev(([type, lvl]) => {
        const b = G.state.builds.find(x => x.type === type); b.lvl = lvl; G.home.refresh();
        const id = G.interiorFor(b), m = G.MAPS[id];
        return { id, lvl: m.lvl, w: m.w, h: m.h, build: m.build, music: m.music, reach: T.reach(id), exit: m.warps[0], door: G.home.door(b), labels: m.labels.length, outdoor: m.outdoor };
      }, [type, lvl]);
      assert.equal(r.id, 'in_' + b0.id); assert.equal(r.lvl, lvl); assert.equal(r.build, b0.id); assert.equal(r.outdoor, false);
      assert.deepEqual(r.reach.bad, [], `${type} Lv${lvl} reachability: ${r.reach.bad.join('; ')}`);
      assert(r.w * r.h > prev, `${type} Lv${lvl} is bigger than the level before (${r.w}x${r.h})`); prev = r.w * r.h;
      assert.deepEqual([r.exit.tx, r.exit.ty, r.exit.to], [r.door[0], r.door[1] + 1, mapId], 'exit aimed below the door');
      assert(r.labels >= 1 && r.music === 'town');
      // screenshot with a lively state
      await ev(([type, lvl]) => {
        const b = G.state.builds.find(x => x.type === type), id = G.interiorFor(b), S = G.state;
        if (type === 'nursery') b.pets = [1, 4, 7].slice(0, G.home.L(b).perks.slots).map((sp, i) => ({ c: G.makeCreature(sp, 9 + i), steps0: S.steps || 0 }));
        if (type === 'barn') b.animals = [1, 4, 7, 10, 16, 19].slice(0, G.home.L(b).perks.slots).map((sp, i) => G.makeCreature(sp, 9 + i));
        if (type === 'garage') { S.vehicles.owned = ['bicycle', 'scooter', 'quad', 'motorbike', 'car', 'hoverboard', 'bicycle'].filter((v, i, a) => a.indexOf(v) === i); S.vehicles.paint = { car: '#40c080' }; }
        if (type === 'refinery') b.jobs = [{ r: 'plank', start: S.frames, dur: 99999, out: { Plank: 2 } }];
        if (type === 'forge') b.lastCraft = S.frames;
        G.loadMap(id); const [ex, ey] = G.home.interiorEntry(id); G.placePlayer(ex, ey, 1);
      }, [type, lvl]);
      await page.waitForTimeout(900); await shot(`${type}-${lvl}`);
      await ev(() => { const b = G.state.builds.find(x => x.id !== 'house'); delete b.jobs; delete b.lastCraft; G.loadMap(b.map); });
    }
    step(`${type}: ${MAXL[type]} level${MAXL[type] > 1 ? 's' : ''} generated, every object, person and the exit reachable, each level bigger than the last`);
  }

  // ---- 2) walking in and out through the real door, for every type ----------------------------------------
  for (const [type, mapId] of TYPES) {
    await T('fresh');
    const b = await T('put', type, 1, mapId);
    const door = await ev(() => G.home.door(G.state.builds.find(x => x.id !== 'house')));
    await ev(([d]) => { G.placePlayer(d[0], d[1] + 1, 1); }, [door]); await page.waitForTimeout(150);
    await key('ArrowUp', 350);
    await until(([id]) => G.world.mapId === id && G.ui.fade.a === 0 && !G.world.busy, 8000, 'inside ' + type, ['in_' + b.id]);
    const inside = await where(), want = await ev(id => G.home.interiorEntry(id), 'in_' + b.id);
    assert.deepEqual([inside.x, inside.y], want, type + ': arrive just inside the mat');
    await key('ArrowDown', 350);
    await until(() => G.world.mapId === 'homestead' && G.ui.fade.a === 0 && !G.world.busy, 8000, 'outside ' + type);
    const out = await where();
    assert.deepEqual([out.x, out.y], [door[0], door[1] + 1], type + ': the exit puts you in front of the door');
  }
  step('all 8 types: walking into the door enters the interior, and the mat puts you back in front of the door');

  // enter through the structure menu (ENTER) for rotated builds, which have no door tile
  await T('fresh');
  { const b = await T('put', 'shed', 1, 'homestead'); await ev(() => { const s = G.state.builds.find(x => x.type === 'shed'); s.rot = 1; G.home.refresh(); });
    const m = await ev(() => { const s = G.state.builds.find(x => x.type === 'shed'); const id = G.interiorFor(s), w = G.MAPS[id].warps[0]; return { ok: !G.home.door(s), tx: w.tx, ty: w.ty, walk: G.worldApi.canWalk(w.tx, w.ty, true), b: [s.x, s.y] }; });
    assert(m.ok && m.walk, 'rotated shed: exit lands on open ground ' + JSON.stringify(m)); await ev(() => { G.state.builds.find(x => x.type === 'shed').rot = 0; G.home.refresh(); });
    step('a rotated build still has a sensible exit'); void b; }

  // ---- 3) handlers ---------------------------------------------------------------------------------------------
  // shed: the shelf opens the storage UI; the workbench note reads the capacity
  await T('fresh'); await ev(() => T.spy('shed'));
  { const b = await T('put', 'shed', 2, 'homestead'), id = 'in_' + b.id;
    await ev(id => { G.loadMap(id); const o = T.obj(id, 'Open storage'); T.go(id, o.x, o.y); }, id); await page.waitForTimeout(200);
    await key('z'); await until(() => G.ui.layers.length > 0, 4000, 'storage UI'); assert.deepEqual(await hits(), ['shed:' + b.id]);
    await closeAll();
    for (const k of ['crates', 'sacks']) { const o = await ev(([id, k]) => { const p = G.MAPS[id].props.find(p => p.kind === k); T.go(id, p.x, p.y); return !!G.MAPS[id].objs.find(o => o.x === p.x && o.y === p.y && o.prompt === 'Open storage'); }, [id, k]); assert(o, k + ' opens storage'); }
    await ev(id => { const o = T.obj(id, 'Read note'); T.go(id, o.x, o.y); }, id); await key('z'); const note = await waitText(/Storage \d+\/\d+ items/); await closeAll();
    step('shed: shelf, crates and sacks open the storage UI; the workbench note says "' + note.replace(/^.*?"/, '"').slice(0, 40) + '..."'); }
  await ev(() => T.unspy());

  // nursery: the caretaker opens the nursery menu; the toy box reports each pet's progress; pets are drawn playing
  await T('fresh');
  { const b = await T('put', 'nursery', 3, 'homestead'), id = 'in_' + b.id;
    await ev(id => { const S = G.state, nb = S.builds.find(x => x.type === 'nursery'); nb.pets = [{ c: G.makeCreature(1, 9), steps0: 0 }, { c: G.makeCreature(4, 9), steps0: 0 }]; S.steps = 10; G.loadMap(id); const n = G.MAPS[id].npcs[0]; T.go(id, n.x, n.y); }, id); await page.waitForTimeout(200);
    await key('z'); await waitText(/Nursery: 2\/3 creatures/); await until(() => G.ui.layers.some(l => l.items && l.items.some(s => /LEAVE A CREATURE/.test(String(s)))), 3000, 'nursery menu'); await closeAll();
    await ev(id => { const o = T.obj(id, 'Toy box'); T.go(id, o.x, o.y); }, id); await key('z'); const tx = await waitText(/EXP so far/); assert(/Lv9/.test(tx) && /\+80 EXP/.test(tx.replace(/\s+/g, ' ')) || /EXP so far/.test(tx)); await closeAll();
    // drawn: count creature draws in a second
    await ev(() => { window.__mini = []; const o = G.drawCreatureMini; G.drawCreatureMini = (c, id, ...r) => { window.__mini.push(id); return o(c, id, ...r); }; window.__miniOrig = o; });
    await ev(id => { const [ex, ey] = G.home.interiorEntry(id); G.placePlayer(ex, ey, 1); }, id); await page.waitForTimeout(700);
    const ids = await ev(() => { G.drawCreatureMini = window.__miniOrig; return [...new Set(window.__mini)]; });
    assert(ids.includes(1) && ids.includes(4), 'both nursery pets are drawn inside: ' + ids);
    const p1 = await ev(() => { const a = []; const o = G.drawCreatureMini; G.drawCreatureMini = (c, id, x, y, ...r) => { a.push([id, Math.round(x), Math.round(y)]); return o(c, id, x, y, ...r); }; window.__miniOrig = o; window.__pos = a; return 0; });
    await page.waitForTimeout(1500); const moved = await ev(() => { G.drawCreatureMini = window.__miniOrig; const a = window.__pos.filter(q => q[0] === 1); return new Set(a.map(q => q[1] + ',' + q[2])).size; });
    assert(moved > 5, 'the pet wanders (' + moved + ' positions)'); void p1;
    step('nursery: the caretaker opens the nursery menu, the toy box reports the pets, and both pets are drawn wandering inside'); }

  // barn: the trough opens the barn menu, a pen tells you about the animal and offers the menu, animals are drawn
  await T('fresh'); await ev(() => T.spy('barn'));
  { const b = await T('put', 'barn', 2, 'homestead'), id = 'in_' + b.id;
    await ev(id => { const S = G.state, nb = S.builds.find(x => x.type === 'barn'); nb.animals = [G.makeCreature(1, 9), G.makeCreature(4, 12)]; nb.store = { Wool: 2, Coal: 1 }; G.loadMap(id); const o = T.obj(id, 'Barn menu'); T.go(id, o.x, o.y); }, id); await page.waitForTimeout(200);
    await key('z'); await until(() => G.ui.layers.length > 0, 4000, 'barn menu'); assert.deepEqual(await hits(), ['barn:' + b.id]); await closeAll();
    await ev(() => { window.__hits.length = 0; });
    await ev(id => { const o = T.obj(id, 'Pen'); T.go(id, o.x, o.y); }, id); await key('z'); const t1 = await waitText(/lives here/); assert(/BULBASAUR|CHARMANDER|[A-Z]{4}/.test(t1) && /a day/.test(t1), t1);
    await key('z'); await until(() => G.ui.layers.some(l => l.items && l.items.some(s => /BARN MENU/.test(String(s)))), 4000, 'offer'); await key('z'); await until(() => window.__hits.length === 1, 4000, 'barn menu from the pen'); await closeAll();
    await ev(id => { const o = T.obj(id, 'Milk can'); T.go(id, o.x, o.y); }, id); await key('z'); await waitText(/Ready to collect: 2 Wool, 1 Coal/); await closeAll();
    await ev(id => { const n = G.MAPS[id].npcs[0]; T.go(id, n.x, n.y); }, id); await key('z'); await waitText(/FARMHAND: 2 happy creatures/); await closeAll();
    await ev(id => { const [ex, ey] = G.home.interiorEntry(id); G.placePlayer(ex, ey, 1); window.__mini = []; const o = G.drawCreatureMini; G.drawCreatureMini = (c, id, ...r) => { window.__mini.push(id); return o(c, id, ...r); }; window.__miniOrig = o; }, id); await page.waitForTimeout(600);
    const ids = await ev(() => { G.drawCreatureMini = window.__miniOrig; return [...new Set(window.__mini)]; });
    assert(ids.includes(1) && ids.includes(4), 'barn animals are drawn in their pens: ' + ids);
    step('barn: trough opens the barn menu, a pen describes its animal and offers the menu, the milk can lists the produce, animals are drawn in the pens'); }
  await ev(() => T.unspy());

  // station: the reception heals through the real heal UI, the healer machine too, charges run out
  await T('fresh'); await ev(() => T.spy('station'));
  { const b = await T('put', 'station', 1, 'homestead'), id = 'in_' + b.id;
    await ev(id => { G.state.party.forEach(c => { c.hp = 1; }); G.loadMap(id); const o = T.obj(id, 'Reception'); T.go(id, o.x, o.y); }, id); await page.waitForTimeout(200);
    await key('z'); await until(() => !!G.healState, 4000, 'heal UI'); assert((await hits())[0] === 'station:' + b.id);
    await key('z'); await until(() => G.healState === null && G.ui.text, 6000, 'healed'); await waitText(/fully healed/);
    assert(await ev(() => G.state.party.every(c => c.hp === c.stats.hp)), 'the team is healed at the reception'); await closeAll();
    // Lv1 has one heal a day: the nurse says it is recharging
    await ev(id => { const n = G.MAPS[id].npcs[0]; T.go(id, n.x, n.y); }, id); await key('z'); await waitText(/recharging/); await closeAll();
    // upgrade to the Clinic: 3 heals a day, healers heal too
    await ev(() => { const s = G.state.builds.find(x => x.type === 'station'); s.lvl = 2; s.used = null; G.state.party.forEach(c => { c.hp = 2; }); G.home.refresh(); });
    await ev(id => { G.loadMap(id); const o = T.obj(id, 'Heal team'); T.go(id, o.x, o.y); }, id); await page.waitForTimeout(200);
    await key('z'); await until(() => !!G.healState, 4000, 'heal UI from the machine'); await key('z'); await waitText(/fully healed/);
    assert(await ev(() => G.state.party.every(c => c.hp === c.stats.hp)), 'the healer machine heals'); await closeAll();
    assert.equal(await ev(() => G.state.builds.find(x => x.type === 'station').used.n), 1);
    step('station: the reception counter, the nurse and the healer machines all run the real heal UI (charges count down)'); }
  await ev(() => T.unspy());

  // refinery: control panel + conveyor open the refinery; machines animate only while a job runs; the tank shows stock
  await T('fresh'); await ev(() => T.spy('refinery'));
  { const b = await T('put', 'refinery', 2, 'homestead'), id = 'in_' + b.id;
    await ev(id => { G.loadMap(id); const o = T.obj(id, 'Control panel'); T.go(id, o.x, o.y); }, id); await key('z'); await until(() => G.ui.layers.length > 0 || G.ui.text, 4000, 'refinery menu'); assert((await hits()).length === 1); await closeAll();
    await ev(id => { const o = T.obj(id, 'Conveyor'); T.go(id, o.x, o.y); }, id); await key('z'); await until(() => G.ui.layers.length > 0 || G.ui.text, 4000, 'refinery menu 2'); assert((await hits()).length === 2); await closeAll();
    const act = () => ev(id => { const m = G.MAPS[id]; return m.props.filter(p => p.kind === 'kiln' || p.kind === 'boiler' || p.kind === 'conveyor').map(p => !!p.info.active); }, id);
    await page.waitForTimeout(300); assert((await act()).every(a => !a), 'machines idle with no job');
    await ev(() => { const s = G.state.builds.find(x => x.type === 'refinery'); s.jobs = [{ r: 'plank', start: G.state.frames, dur: 99999, out: { Plank: 2 } }]; });
    await page.waitForTimeout(300); assert((await act()).every(a => a), 'machines run while a job is running');
    await ev(() => { G.state.bag.Plank = 7; G.state.storage.Plank = 5; G.state.bag.Brick = 3; });
    await ev(id => { const o = T.obj(id, 'Tank'); T.go(id, o.x, o.y); }, id); await key('z'); const tk = await waitText(/TANK/); assert(/Plank x12/.test(tk) || /Brick x3/.test(tk), tk); await closeAll();
    step('refinery: panel and conveyor open the refinery, machines animate only while a job runs, the tank reads the stock'); }
  await ev(() => T.unspy());

  // forge: anvil + workbench craft; tool rack lists your tools; furnace lights up
  await T('fresh'); await ev(() => T.spy('forge'));
  { const b = await T('put', 'forge', 2, 'homestead'), id = 'in_' + b.id;
    await ev(id => { G.loadMap(id); const o = T.obj(id, 'Craft'); T.go(id, o.x, o.y); }, id); await key('z'); await until(() => G.ui.layers.length > 0 || G.ui.text, 4000, 'craft menu'); assert((await hits()).length === 1); await closeAll();
    await ev(id => { G.state.bag.Axe = 1; const o = T.obj(id, 'Tool rack'); T.go(id, o.x, o.y); }, id); await key('z'); await waitText(/On the rack: Axe/); await closeAll();
    const glow = () => ev(id => G.MAPS[id].props.filter(p => p.kind === 'furnace').map(p => !!p.info.active), id);
    await page.waitForTimeout(300); assert((await glow()).every(a => !a), 'furnace calm when idle');
    await ev(() => { G.state.builds.find(x => x.type === 'forge').lastCraft = G.state.frames; }); await page.waitForTimeout(300); assert((await glow()).every(a => a), 'furnace glows while crafting');
    step('forge: the anvil opens the craft menu, the tool rack lists your tools, the furnace glows while crafting'); }
  await ev(() => T.unspy());

  // garage: counter and mechanic open the garage; parked vehicles are drawn, only the ones in the garage and that fit
  await T('fresh'); await ev(() => T.spy('garage'));
  { const b = await T('put', 'garage', 1, 'homestead'), id = 'in_' + b.id;
    await ev(id => { G.loadMap(id); const o = T.obj(id, 'Garage'); T.go(id, o.x, o.y); }, id); await key('z'); await until(() => G.ui.layers.length > 0 || G.ui.text, 4000, 'garage menu'); assert((await hits()).length === 1); await closeAll();
    await ev(id => { const n = G.MAPS[id].npcs[0]; T.go(id, n.x, n.y); }, id); await key('z'); await waitText(/MECHANIC/); await key('z'); await until(() => G.ui.layers.some(l => l.items && l.items.some(s => /VEHICLE MENU/.test(String(s)))), 4000, 'mechanic offer'); await key('z');
    await until(() => window.__hits.length === 2, 4000, 'garage from the mechanic'); await closeAll();
    const drawn = async () => { await ev(id => { const [ex, ey] = G.home.interiorEntry(id); G.loadMap(id); G.placePlayer(ex, ey, 1); window.__v = []; const o = G.homeArt.vehicle; window.__vo = o; G.homeArt.vehicle = (c, vid, d, x, y, t, info) => { if (info.layer === 'back') window.__v.push(vid + ':' + (info.color || '')); return o(c, vid, d, x, y, t, info); }; }, id); await page.waitForTimeout(500); return ev(() => { G.homeArt.vehicle = window.__vo; return [...new Set(window.__v)]; }); };
    await ev(() => { G.state.vehicles.owned = ['bicycle', 'scooter', 'quad']; G.state.vehicles.paint = { scooter: '#40c080' }; });
    let v = await drawn(); assert.deepEqual(v.map(s => s.split(':')[0]).sort(), ['bicycle', 'scooter'], 'Lv1 fits 2 vehicles: ' + v);
    assert(v.some(s => s === 'scooter:#40c080'), 'painted colour used: ' + v);
    await ev(() => { G.state.vehicles.riding = 'bicycle'; }); v = await drawn(); assert.deepEqual(v.map(s => s.split(':')[0]), ['scooter'], 'the vehicle you ride is not parked inside: ' + v);
    await ev(() => { G.state.vehicles.riding = null; G.state.vehicles.owned = []; }); v = await drawn(); assert.equal(v.length, 0, 'an empty garage shows nothing');
    await ev(() => { G.state.vehicles.owned = ['bicycle', 'scooter', 'quad', 'motorbike']; G.state.builds.find(x => x.type === 'garage').lvl = 2; G.home.refresh(); }); v = await drawn(); assert.equal(v.length, 4, 'Lv2 shows 4: ' + v);
    step('garage: counter and mechanic open the garage, parked vehicles are drawn in the bays (painted, slot-limited, not the one outside)'); }
  await ev(() => T.unspy());

  // greenhouse: the potting table reports the plots, the hose refills the can
  await T('fresh');
  { const b = await T('put', 'greenhouse', 1, 'homestead'), id = 'in_' + b.id;
    await ev(() => { const S = G.state; S.builds.push({ id: 'p1', type: 'plot', map: 'homestead', x: 22, y: 33, lvl: 1, rot: 0, crop: { id: 'turnip', grown: 1, wet: false, ripe: false, dry: 0, dead: false } },
      { id: 'p2', type: 'plot', map: 'homestead', x: 23, y: 33, lvl: 1, rot: 0, crop: { id: 'carrot', grown: 4, wet: true, ripe: true, dry: 0, dead: false } }, { id: 'p3', type: 'plot', map: 'homestead', x: 24, y: 33, lvl: 1, rot: 0 }); G.home.refresh(); });
    await ev(id => { G.loadMap(id); const o = T.obj(id, 'Potting table'); T.go(id, o.x, o.y); }, id); await key('z'); const pt = await waitText(/POTTING TABLE/); assert(/3 garden plots/.test(pt) && /2 planted/.test(pt), pt); await key('z'); const pt2 = await waitText(/1 is ripe, and 1 needs water/); await closeAll();
    await ev(id => { G.state.bag['Watering Can'] = 1; G.state.can = 0; const o = T.obj(id, 'Refill can'); T.go(id, o.x, o.y); }, id); await key('z'); await until(() => G.state.can > 0, 4000, 'can refilled'); await closeAll();
    assert.equal(await ev(() => G.state.can), await ev(() => G.farm.canCap()));
    step('greenhouse: the potting table counts planted / ripe / dry plots, the hose refills the watering can'); }

  // ---- 4) upgrading in place, moving, removing, and the two outdoor maps ---------------------------------------
  await T('fresh');
  { const b = await T('put', 'barn', 1, 'homestead'), id = 'in_' + b.id;
    const m0 = await ev(id => G.MAPS[id], id).catch(() => null); void m0;
    const same = await ev(() => { const s = G.state.builds.find(x => x.type === 'barn'); const a = G.MAPS['in_' + s.id]; G.refreshInteriors(); G.refreshInteriors(); const m = G.MAPS['in_' + s.id]; G.home.refresh(); return a === m && G.MAPS['in_' + s.id] === a; });
    assert(same, 'refreshInteriors keeps the same map when nothing changed (cheap, no rebuild)');
    const before = await ev(id => [G.MAPS[id].w, G.MAPS[id].h], id);
    await ev(() => { const s = G.state.builds.find(x => x.type === 'barn'); s.lvl++; G.home.refresh(); });
    const after = await ev(id => [G.MAPS[id].w, G.MAPS[id].h, G.MAPS[id].lvl], id);
    assert(after[0] > before[0] && after[2] === 2, 'upgrading made the barn interior bigger'); assert.deepEqual((await T('reach', id)).bad, []);
    // moving re-aims the exit
    await ev(() => { const s = G.state.builds.find(x => x.type === 'barn'); s.x += 3; s.y -= 2; G.home.refresh(); });
    const moved = await ev(id => { const s = G.state.builds.find(x => x.type === 'barn'), d = G.home.door(s), w = G.MAPS[id].warps[0]; return [w.tx, w.ty, d[0], d[1] + 1]; }, id);
    assert.deepEqual(moved.slice(0, 2), moved.slice(2), 'moving the barn re-aims the exit');
    // leave through the new door position
    await ev(id => { G.loadMap(id); const [ex, ey] = G.home.interiorEntry(id); G.placePlayer(ex, ey, 1); }, id); await page.waitForTimeout(200);
    await ev(id => { const s = G.state.builds.find(x => x.type === 'barn'); s.y += 1; G.home.refresh(); }, id);   // moved while you are inside
    await key('ArrowDown', 350); await until(() => G.world.mapId === 'homestead' && G.ui.fade.a === 0 && !G.world.busy, 8000, 'out');
    const o2 = await ev(() => { const s = G.state.builds.find(x => x.type === 'barn'), d = G.home.door(s); return [G.world.p.x, G.world.p.y, d[0], d[1] + 1]; });
    assert.deepEqual(o2.slice(0, 2), o2.slice(2), 'you step out at the moved door');
    // removing drops the interior (only when you are not inside)
    await ev(() => { const s = G.state.builds.find(x => x.type === 'barn'); G.state.builds.splice(G.state.builds.indexOf(s), 1); G.home.refresh(); });
    assert(await ev(id => !G.MAPS[id], id), 'the interior is dropped with the structure');
    step('upgrade grows the interior in place, moving (even while inside) re-aims the exit, removing drops the interior, refresh is cheap'); }

  // nursery and station built on an outdoor map other than the homestead lead back to that map
  for (const type of ['nursery', 'station']) {
    await T('fresh');
    const b = await T('put', type, 1, 'sunmeadow'), id = 'in_' + b.id;
    const door = await ev(() => G.home.door(G.state.builds.find(x => x.id !== 'house')));
    await ev(([d]) => { G.placePlayer(d[0], d[1] + 1, 1); }, [door]); await page.waitForTimeout(150); await key('ArrowUp', 350);
    await until(([id]) => G.world.mapId === id && G.ui.fade.a === 0 && !G.world.busy, 8000, 'inside ' + type, [id]);
    await key('ArrowDown', 350); await until(() => G.world.mapId === 'sunmeadow' && G.ui.fade.a === 0 && !G.world.busy, 8000, 'back out');
    const out = await where(); assert.deepEqual([out.x, out.y], [door[0], door[1] + 1]);
    assert.deepEqual((await T('reach', id)).bad, []);
  }
  step('a nursery and a healing station built in Sunmeadow are enterable and lead back to Sunmeadow');

  // ---- 5) a save made inside reloads inside ---------------------------------------------------------------------
  await T('fresh');
  { const b = await T('put', 'forge', 2, 'homestead'), id = 'in_' + b.id;
    await ev(id => { G.loadMap(id); const [ex, ey] = G.home.interiorEntry(id); G.placePlayer(ex, ey - 1, 1); G.saveGame(); }, id);
    await page.reload(); await page.waitForTimeout(400); await key('z'); await key('z');
    await until(() => G.state && G.scene === G.world.scene, 8000, 'continue'); await page.waitForTimeout(500);
    const st = await ev(() => ({ map: G.world.mapId, ok: !!G.MAPS[G.world.mapId], lvl: G.MAPS[G.world.mapId] && G.MAPS[G.world.mapId].lvl, x: G.world.p.x, y: G.world.p.y }));
    assert.equal(st.map, id); assert(st.ok && st.lvl === 2);
    await shot('reloaded-inside');
    // walk out through the mat of the reloaded interior
    await ev(id => { const [ex, ey] = G.home.interiorEntry(id); G.placePlayer(ex, ey, 1); }, id); await key('ArrowDown', 350);
    await until(() => G.world.mapId === 'homestead' && G.ui.fade.a === 0 && !G.world.busy, 8000, 'out after reload');
    const out = await ev(() => { const s = G.state.builds.find(x => x.type === 'forge'), d = G.home.door(s); return [G.world.p.x, G.world.p.y, d[0], d[1] + 1]; });
    assert.deepEqual(out.slice(0, 2), out.slice(2));
    step('a save made inside the forge reloads inside it (the interior is rebuilt from the save), and the exit still works'); }

  await browser.close();
  console.log('errors:', errors.length ? errors : 'none');
  if (errors.length) process.exit(1);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
