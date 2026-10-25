// Renders every outdoor map with the game's own tile art and lays them out by their edge exits: PX=4 node tools/render-world.js (writes /tmp/claude-0/wm/world-PX.jpg)
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs = require('fs');
const PX = +(process.env.PX || 4);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage(); p.on('pageerror', e => console.log('ERR', e.message)); p.on('console', m => { if (/^LOG/.test(m.text())) console.log(m.text()); });
  await p.goto('file:///home/user/Wildcard/index.html'); await p.waitForTimeout(1500);
  const out = await p.evaluate(async PX => {
    G.state = G.newState(); G.migrateState(G.state); G.state.flags.starter = true;
    const outdoor = id => { const m = G.MAPS[id]; return m && m.outdoor && !m.sea; };
    const sideOf = (m, w) => w.y === 0 ? 'N' : w.y === m.h - 1 ? 'S' : w.x === 0 ? 'W' : w.x === m.w - 1 ? 'E' : null;
    // lay the maps out by their edge exits, starting from Lanternrest
    const pos = { lanternrest: [0, 0] }, q = ['lanternrest'], rects = [];
    const R = id => { const m = G.MAPS[id], [x, y] = pos[id]; return [x, y, x + m.w, y + m.h]; };
    const hit = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
    const free = (id, x, y) => { const m = G.MAPS[id], r = [x, y, x + m.w, y + m.h]; return Object.keys(pos).every(o => o === id || !hit(r, R(o))); };
    while (q.length) {
      const a = q.shift(), A = G.MAPS[a], [ax, ay] = pos[a];
      for (const w of A.warps) {
        const bId = w.to; if (!outdoor(bId) || pos[bId] || bId === 'homestead') continue;
        const B = G.MAPS[bId], s = sideOf(A, w); if (!s) continue;
        let x, y;
        if (s === 'S') { x = ax + w.x - w.tx; y = ay + A.h; } else if (s === 'N') { x = ax + w.x - w.tx; y = ay - B.h; }
        else if (s === 'E') { x = ax + A.w; y = ay + w.y - w.ty; } else { x = ax - B.w; y = ay + w.y - w.ty; }
        let ok = false; for (let k = 0; k < 200 && !ok; k++) for (const d of [k, -k]) { const nx = s === 'N' || s === 'S' ? x + d : x, ny = s === 'E' || s === 'W' ? y + d : y; if (free(bId, nx, ny)) { x = nx; y = ny; ok = true; break; } }
        pos[bId] = [x, y]; q.push(bId);
      }
    }
    const placed = Object.keys(pos);
    const minX = Math.min(...placed.map(id => pos[id][0])), minY = Math.min(...placed.map(id => pos[id][1]));
    const maxX = Math.max(...placed.map(id => pos[id][0] + G.MAPS[id].w)), maxY = Math.max(...placed.map(id => pos[id][1] + G.MAPS[id].h));
    // islands and other places you only reach by sea, on a strip below
    const extra = Object.values(G.MAPS).filter(m => m.outdoor && !m.sea && !pos[m.id] && m.id !== 'homestead' && G.WORLD.byId[m.id]).map(m => m.id);
    let ex = minX; const ey = maxY + 6; for (const id of extra) { pos[id] = [ex, ey]; ex += G.MAPS[id].w + 4; }
    const W = (Math.max(maxX, ex) - minX + 4) * PX, H = (ey + Math.max(0, ...extra.map(id => G.MAPS[id].h)) - minY + 4) * PX;
    const big = document.createElement('canvas'); big.width = W; big.height = H; const bx = big.getContext('2d');
    bx.fillStyle = '#2a86cc'; bx.fillRect(0, 0, W, H);
    const fw = G.W, fh = G.H;
    for (const id of [...placed, ...extra]) {
      const m = G.MAPS[id], c = document.createElement('canvas'); c.width = m.w * 16; c.height = m.h * 16; const x = c.getContext('2d');
      G.W = m.w * 16; G.H = m.h * 16;
      try {
        G.terrain.drawGround(x, m, 0, 0, m.w - 1, m.h - 1, 0, 0, 0);
        const items = []; G.terrain.collectProps(m, 0, 0, m.w - 1, m.h - 1, 0, 0, 0, items); items.sort((a, b) => a.y - b.y); for (const o of items) o.draw(x);
        if (G.terrain.drawOverlay) G.terrain.drawOverlay(x, m, 0, 0, m.w - 1, m.h - 1, 0, 0, 0);
      } catch (e) { console.log('LOG fail ' + id + ' ' + e.message); }
      const [px, py] = pos[id];
      bx.drawImage(c, (px - minX + 2) * PX, (py - minY + 2) * PX, m.w * PX, m.h * PX);
      // name plate
      const nm = (G.WORLD.byId[id] ? G.WORLD.byId[id].name : m.name).toUpperCase(), fsz = Math.max(10, PX * 3);
      bx.font = `900 ${fsz}px sans-serif`; const tw = bx.measureText(nm).width + 12, cx = (px - minX + 2 + m.w / 2) * PX, cy = (py - minY + 2) * PX + fsz * .9;
      bx.fillStyle = 'rgba(40,30,60,.75)'; bx.fillRect(cx - tw / 2, cy - fsz, tw, fsz * 1.35); bx.fillStyle = '#fff'; bx.textAlign = 'center'; bx.fillText(nm, cx, cy);
    }
    G.W = fw; G.H = fh;
    bx.font = `900 ${PX * 4}px sans-serif`; bx.fillStyle = '#fff'; bx.textAlign = 'left'; bx.fillText('BY SEA (Verdant, Moonlit, Aurora) AND THE STARLIT HOLLOW (through the gate in Lanternrest)', (minX - minX + 2) * PX, (ey - minY + 1) * PX);
    return { url: big.toDataURL('image/jpeg', .88), W, H, placed: placed.length, extra };
  }, PX);
  fs.writeFileSync(`/tmp/claude-0/wm/world-${PX}.jpg`, Buffer.from(out.url.split(',')[1], 'base64'));
  console.log(out.W, out.H, out.placed, out.extra.join(','));
  await b.close();
})();
