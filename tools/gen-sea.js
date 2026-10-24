// Generates js/maps/zz_sea.js: the playable Aurelian Sea, built from the same geometry as the illustrated map
// (G.WORLD.geo in js/worldmap.js). One tile = 8 pixels of the 1536x1024 reference map, so a boat on this map
// sails past exactly what the map shows. Run: PW=<playwright path> node tools/gen-sea.js
const { chromium } = require(process.env.PW || 'playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage(); await page.goto('file://' + ROOT + '/index.html'); await page.waitForTimeout(400);
  const out = await page.evaluate(() => {
    G.state = G.newState(); G.migrateState(G.state);
    const geo = G.WORLD.geo, T = 8, OX = 64, OY = 48, C = 192 + 2 * OX, R = 128 + 2 * OY, P = G.WORLD.places, B = G.WORLD.byId;
    const ci0 = []; const hash = (i, j, s) => { let h = (i * 374761393 + j * 668265263 + (s || 0) * 2246822519) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
    const inP = (x, y, poly) => geo.inPoly(x, y, poly);
    // the uncharted ocean around the illustrated map: outer islands (reference pixels, which run past the picture's edges)
    const OUTER = [
      { n: 'PALM ATOLL', c: [-250, 220], r: 70, k: 'sand' }, { n: 'GULL ROCK', c: [-330, 560], r: 55, k: 'rock' }, { n: 'LONE PINE', c: [-210, 880], r: 85, k: 'wood' },
      { n: 'SHIPWRECK CAY', c: [330, 1230], r: 75, k: 'sand' }, { n: 'KELP ISLE', c: [760, 1300], r: 95, k: 'wood' }, { n: 'BLACK REEF', c: [1180, 1250], r: 60, k: 'rock' },
      { n: 'SUNKEN ARCH', c: [1700, 1110], r: 70, k: 'sand' }, { n: 'MIST HOLM', c: [1810, 700], r: 90, k: 'wood' }, { n: 'ICE TOOTH', c: [1760, 250], r: 60, k: 'rock' },
      { n: 'NORTH STAR CAY', c: [1000, -250], r: 80, k: 'sand' }, { n: 'WHALE BACK', c: [400, -300], r: 65, k: 'rock' }, { n: 'FAR ARBOR', c: [-120, -190], r: 75, k: 'wood' },
    ].map((o, i) => { const pts = []; for (let a = 0; a < 12; a++) { const t = a / 12 * Math.PI * 2, w = .72 + hash(i, a, 11) * .5; pts.push([o.c[0] + Math.cos(t) * o.r * w * 1.15, o.c[1] + Math.sin(t) * o.r * w]); } return Object.assign(o, { pts }); });
    const isl = [...Object.values(geo.ISLANDS), ...OUTER.map(o => o.pts)];
    const water = [], land = [];
    for (let j = 0; j < R; j++) { water.push([]); for (let i = 0; i < C; i++) {
      const cx = (i - OX + .5) * T, cy = (j - OY + .5) * T;
      const inland = inP(cx, cy, geo.CONT) || isl.some(p => inP(cx, cy, p));
      const lake = inP(cx, cy, geo.LAKE);
      const river = geo.RIVERS.some(([w, pts]) => pts.some((p, k) => k && geo.distSeg(cx, cy, pts[k - 1][0], pts[k - 1][1], p[0], p[1]) < w * .55));
      water[j].push(!inland || lake || (river && inland)); } }
    // the sea: water connected to the map border
    const sea = water.map(r => r.map(() => false)), q = [];
    for (let j = 0; j < R; j++) for (let i = 0; i < C; i++) if ((i === 0 || j === 0 || i === C - 1 || j === R - 1) && water[j][i]) { sea[j][i] = true; q.push([i, j]); }
    while (q.length) { const [i, j] = q.pop(); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = i + a, y = j + b; if (x >= 0 && y >= 0 && x < C && y < R && water[y][x] && !sea[y][x]) { sea[y][x] = true; q.push([x, y]); } } }
    const near = (i, j, f, r) => { for (let b = -r; b <= r; b++) for (let a = -r; a <= r; a++) { const x = i + a, y = j + b; if (x >= 0 && y >= 0 && x < C && y < R && f(x, y)) return true; } return false; };
    // distance to land (4-neighbour BFS from every land tile)
    const dl = water.map(r => r.map(() => 99)); let fr = [];
    for (let j = 0; j < R; j++) for (let i = 0; i < C; i++) if (!water[j][i]) { dl[j][i] = 0; fr.push([i, j]); }
    while (fr.length) { const nx = []; for (const [i, j] of fr) for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = i + a, y = j + b; if (x >= 0 && y >= 0 && x < C && y < R && dl[y][x] > dl[j][i] + 1) { dl[y][x] = dl[j][i] + 1; nx.push([x, y]); } } fr = nx; }
    // harbours: where each sea-connected place meets the sea
    const SEA_IDS = ['sunhaven', 'driftwood', 'verdant', 'shore', 'tidefall', 'moonlit', 'cobalt', 'frostmere', 'aurora'];
    const block3 = (i, j) => { for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) { const x = i + a, y = j + b; if (x < 1 || y < 1 || x >= C - 1 || y >= R - 1 || !sea[y][x]) return false; } return true; };
    const gates = [];
    for (const id of SEA_IDS) {
      const p = B[id], want = p.port || [p.x, p.y], wi = Math.round(want[0] / T) + OX, wj = Math.round(want[1] / T) + OY;
      let best = null, bd = 1e9;
      for (let j = 2; j < R - 2; j++) for (let i = 2; i < C - 2; i++) if (block3(i, j) && dl[j][i] >= 2 && dl[j][i] <= 5) { const d = Math.hypot(i - wi, j - wj); if (d < bd) { bd = d; best = [i, j]; } }
      gates.push({ id, gx: best[0], gy: best[1] });
    }
    const inGate = (i, j, r) => gates.some(g => Math.abs(i - g.gx) <= r && Math.abs(j - g.gy) <= r);
    // launch tiles (where a boat enters the sea from the town): open water a few tiles out from the harbour
    for (const g of gates) {
      let best = null, bs = -1;
      for (let r = 4; r <= 9; r++) for (let b = -r; b <= r; b++) for (let a = -r; a <= r; a++) {
        if (Math.max(Math.abs(a), Math.abs(b)) !== r) continue; const x = g.gx + a, y = g.gy + b;
        if (!block3(x, y) || gates.some(o => Math.abs(x - o.gx) <= 2 && Math.abs(y - o.gy) <= 2)) continue;
        const s = dl[y][x] * 10 - r; if (s > bs) { bs = s; best = [x, y]; } }
      g.lx = best[0]; g.ly = best[1];
    }
    // tiles
    const grid = [];
    for (let j = 0; j < R; j++) { let row = ''; for (let i = 0; i < C; i++) {
      const cx = (i - OX + .5) * T, cy = (j - OY + .5) * T, h = hash(i, j), h2 = hash(i, j, 7), bio = geo.biomeAt(cx, cy);
      let ch;
      if (water[j][i]) {
        ch = 'w';
        if (sea[j][i] && dl[j][i] >= 3 && h < .011 && !gates.some(g => Math.abs(i - g.gx) <= 6 && Math.abs(j - g.gy) <= 6) && !gates.some(g => Math.abs(i - g.lx) <= 5 && Math.abs(j - g.ly) <= 5)) ch = 'r';
      } else {
        const coast = near(i, j, (x, y) => sea[y][x], 1);
        if (bio === 'volcano' && Math.hypot((cx - 1310) / 70, (cy - 250) / 44) < 1 && h < .72) ch = '!';
        else if (coast) ch = (bio === 'mountain' || bio === 'volcano') ? 'E' : bio === 'badlands' ? 'E' : 'y';
        else if (bio === 'mountain') ch = h < .6 ? 'C' : h < .85 ? 'n' : 'r';
        else if (bio === 'snow') ch = h < .7 ? 'y' : h < .95 ? 'n' : 'r';
        else if (bio === 'volcano') ch = h < .55 ? 'C' : h < .8 ? 'r' : 'E';
        else if (bio === 'badlands') ch = h < .45 ? 'E' : h < .72 ? 'r' : 'p';
        else if (bio === 'desert') ch = h < .8 ? 'y' : h < .88 ? 'u' : h < .94 ? 'r' : 'd';
        else if (bio === 'swamp') ch = h < .4 ? 'g' : h < .75 ? '#' : h < .9 ? 'u' : 'w';
        else if (bio === 'hollow') ch = h < .4 ? 'f' : h < .8 ? 'g' : 'i';
        else ch = h < .3 ? '#' : h < .38 ? 'n' : h < .44 ? 'u' : h2 < .04 ? 'f' : 'g';
      }
      row += ch; } grid.push(row.split('')); }
    // outer islands: a beach ring, palms or pines, rocks, and one treasure spot on the shore
    const treasure = [];
    OUTER.forEach((o, n) => {
      const ci = Math.round(o.c[0] / T) + OX, cj = Math.round(o.c[1] / T) + OY, shore = [];
      for (let j = cj - 16; j <= cj + 16; j++) for (let i = ci - 20; i <= ci + 20; i++) {
        if (i < 2 || j < 2 || i >= C - 2 || j >= R - 2 || water[j][i]) continue;
        const h = hash(i, j, 5), coast = near(i, j, (x, y) => water[y][x], 1);
        grid[j][i] = coast ? 'y' : o.k === 'rock' ? (h < .5 ? 'C' : h < .8 ? 'n' : 'r') : o.k === 'sand' ? (h < .7 ? 'y' : h < .85 ? 'u' : 'f') : (h < .45 ? '#' : h < .6 ? 'n' : h < .66 ? 'f' : 'g');
        if (coast && sea[j][i - 1] && grid[j][i + 1] !== 'w') shore.push([i, j]);
      }
      // treasure: a west-facing beach tile with sea on its left
      shore.sort((a, b) => a[1] - b[1]); const t = shore[shore.length >> 1]; if (t) treasure.push({ n: o.n, x: t[0], y: t[1], id: n });
      ci0.push([o.n, ci, cj]);
    });
    // harbour surroundings: sand and a clear gate block
    for (const g of gates) for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) { const x = g.gx + a, y = g.gy + b; if (grid[y][x] === 'r') grid[y][x] = 'w'; if (Math.abs(a) <= 1 && Math.abs(b) <= 1) grid[y][x] = 'w'; }
    for (const g of gates) for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) { const x = g.lx + a, y = g.ly + b; if (grid[y][x] === 'r') grid[y][x] = 'w'; }
    // little towns: a few roofs and towers where the places are (on land, near the centre)
    const free = (x, y) => x > 1 && y > 1 && x < C - 2 && y < R - 2 && 'gy#nuf'.includes(grid[y][x]);
    const stamp = (x, y, w, rows) => { for (let b = 0; b < rows.length; b++) for (let a = 0; a < w; a++) if (!free(x + a, y + b)) return false; for (let b = 0; b < rows.length; b++) for (let a = 0; a < w; a++) grid[y + b][x + a] = rows[b]; return true; };
    for (const p of P) {
      if (!['city', 'town'].includes(p.kind)) continue;
      const ci = Math.round(p.x / T) + OX, cj = Math.round(p.y / T) + OY; let n = 0;
      const city = p.kind === 'city';
      for (let r = 0; r <= 5 && n < (city ? 6 : 4); r++) for (let b = -r; b <= r && n < (city ? 6 : 4); b++) for (let a = -r; a <= r && n < (city ? 6 : 4); a++) {
        if (Math.max(Math.abs(a), Math.abs(b)) !== r || (Math.abs(a) + Math.abs(b)) % 2) continue;
        const k = hash(ci + a, cj + b, 3);
        if (city && k < .5) { if (stamp(ci + a - 1, cj + b - 1, 2, ['+', '+'])) n++; }
        else if (stamp(ci + a - 1, cj + b - 1, 3, [k < .75 ? 'R' : 'Q', k < .75 ? 'R' : 'Q', 'W'])) n++;
      }
    }
    // lighthouses on the coast nearest their ports
    for (const id of ['driftwood', 'shore', 'cobalt']) { const p = B[id], wi = Math.round((p.port || [p.x, p.y])[0] / T) + OX, wj = Math.round((p.port || [p.x, p.y])[1] / T) + OY; let best = null, bd = 1e9; for (let j = 4; j < R - 4; j++) for (let i = 4; i < C - 4; i++) if (grid[j][i] === 'y' && grid[j - 1][i] === 'y' && near(i, j, (x, y) => sea[y][x], 1)) { const d = Math.hypot(i - wi, j - wj); if (d < bd) { bd = d; best = [i, j]; } } if (best) { grid[best[1]][best[0]] = '|'; grid[best[1] - 1][best[0]] = '|'; } }
    return { rows: grid.map(r => r.join('')), gates, treasure, labels: ci0, stats: { sea: sea.flat().filter(Boolean).length, land: water.flat().filter(v => !v).length } };
  });
  const body = fs.readFileSync(path.join(__dirname, 'sea-template.js'), 'utf8')
    .replace('/*ROWS*/', JSON.stringify(out.rows, null, 0).replace(/","/g, '",\n  "'))
    .replace('/*GATES*/', JSON.stringify(out.gates)).replace('/*TREASURE*/', JSON.stringify(out.treasure)).replace('/*OX*/', '64').replace('/*OY*/', '48');
  fs.writeFileSync(path.join(ROOT, 'js/maps/zz_sea.js'), body);
  console.log('sea map written', out.stats, 'gates:', out.gates.map(g => `${g.id}@${g.gx},${g.gy}->launch ${g.lx},${g.ly}`).join(' '));
  await browser.close();
})();
