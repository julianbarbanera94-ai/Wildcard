const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs = require('fs'); const PX = +(process.env.PX || 4);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage(); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file:///home/user/Wildcard/index.html'); await p.waitForTimeout(1500);
  const out = await p.evaluate(PX => {
    G.state = G.newState(); G.migrateState(G.state);
    const cells = { cloudpeak: [2, 0], glacier: [3, 0], road_frostmere: [4, 0], frostmere: [5, 0], evergreen: [1, 1], ridge: [2, 1], lakeside: [3, 1], emberfall: [4, 1],
      sunhaven: [0, 2], sunmeadow: [1, 2], lanternrest: [2, 2], sandsreach: [3, 2], badlands: [4, 2], road_coast: [0, 3], mirewood: [1, 3], road_stonebridge: [2, 3], whispering: [3, 3], road_cobalt: [4, 3],
      driftwood: [0, 4], tidefall: [1, 4], stonebridge: [2, 4], cobalt: [4, 4], shore: [2, 5] };
    const links = [['lanternrest','sunmeadow'],['lanternrest','sandsreach'],['lanternrest','ridge'],['lanternrest','road_stonebridge'],['road_stonebridge','stonebridge'],['sunhaven','sunmeadow'],['evergreen','sunmeadow'],['mirewood','sunmeadow'],['sunhaven','road_coast'],['road_coast','driftwood'],['mirewood','tidefall'],['cloudpeak','ridge'],['lakeside','ridge'],['stonebridge','shore'],['sandsreach','whispering'],['cloudpeak','glacier'],['lakeside','glacier'],['glacier','road_frostmere'],['road_frostmere','frostmere'],['badlands','emberfall'],['badlands','sandsreach'],['badlands','road_cobalt'],['road_cobalt','cobalt']];
    const changed = [['mirewood','road_stonebridge'],['road_stonebridge','whispering'],['lakeside','emberfall'],['whispering','road_cobalt']];
    const colW = [], rowH = []; for (const [id, [c, r]] of Object.entries(cells)) { const m = G.MAPS[id]; colW[c] = Math.max(colW[c] || 0, m.w); rowH[r] = Math.max(rowH[r] || 0, m.h); }
    const GAP = 14, cx = [], cy = []; let a = 2; colW.forEach((w, i) => { cx[i] = a; a += w + GAP; }); const TW = a; a = 8; rowH.forEach((h, i) => { cy[i] = a; a += h + GAP; }); const TH = a + 30;
    const pos = {}; for (const [id, [c, r]] of Object.entries(cells)) { const m = G.MAPS[id]; pos[id] = [cx[c] + (colW[c] - m.w) / 2, cy[r] + (rowH[r] - m.h) / 2]; }
    const big = document.createElement('canvas'); big.width = TW * PX; big.height = TH * PX; const bx = big.getContext('2d');
    bx.fillStyle = '#2a86cc'; bx.fillRect(0, 0, big.width, big.height);
    const mid = id => { const m = G.MAPS[id]; return [(pos[id][0] + m.w / 2) * PX, (pos[id][1] + m.h / 2) * PX]; };
    const road = (a, b2, col) => { const [x1, y1] = mid(a), [x2, y2] = mid(b2); bx.lineCap = 'round'; bx.strokeStyle = 'rgba(40,30,50,.5)'; bx.lineWidth = PX * 7; bx.beginPath(); bx.moveTo(x1, y1); bx.lineTo(x2, y2); bx.stroke(); bx.strokeStyle = col; bx.lineWidth = PX * 5; bx.beginPath(); bx.moveTo(x1, y1); bx.lineTo(x2, y2); bx.stroke(); };
    links.forEach(([a, b2]) => road(a, b2, '#e8cf98')); changed.forEach(([a, b2]) => road(a, b2, '#ffb648'));
    const fw = G.W, fh = G.H;
    for (const id of Object.keys(cells)) {
      const m = G.MAPS[id], c = document.createElement('canvas'); c.width = m.w * 16; c.height = m.h * 16; const x = c.getContext('2d'); G.W = c.width; G.H = c.height;
      G.terrain.drawGround(x, m, 0, 0, m.w - 1, m.h - 1, 0, 0, 0); const items = []; G.terrain.collectProps(m, 0, 0, m.w - 1, m.h - 1, 0, 0, 0, items); items.sort((u, v) => u.y - v.y); items.forEach(o => o.draw(x)); if (G.terrain.drawOverlay) G.terrain.drawOverlay(x, m, 0, 0, m.w - 1, m.h - 1, 0, 0, 0);
      const [px, py] = pos[id]; bx.fillStyle = 'rgba(20,30,50,.35)'; bx.fillRect(px * PX + PX, py * PX + PX, m.w * PX, m.h * PX); bx.drawImage(c, px * PX, py * PX, m.w * PX, m.h * PX);
      bx.strokeStyle = id.startsWith('road_') ? '#ffb648' : '#fff'; bx.lineWidth = PX; bx.strokeRect(px * PX, py * PX, m.w * PX, m.h * PX);
      const nm = (G.WORLD.byId[id] ? G.WORLD.byId[id].name : m.name).toUpperCase(), fz = PX * 3.2; bx.font = `900 ${fz}px sans-serif`; const tw = bx.measureText(nm).width + 12, lx = (px + m.w / 2) * PX, ly = py * PX + fz * 1.1;
      bx.fillStyle = 'rgba(40,30,60,.8)'; bx.fillRect(lx - tw / 2, ly - fz, tw, fz * 1.35); bx.fillStyle = '#fff'; bx.textAlign = 'center'; bx.fillText(nm, lx, ly);
    }
    G.W = fw; G.H = fh;
    const fz = PX * 4.2; bx.font = `900 ${fz}px sans-serif`; bx.textAlign = 'left'; bx.fillStyle = '#fff';
    bx.fillText('PROPOSED: every exit leads straight to the map beside it. North is up. Orange roads = links that change.', 4 * PX, (TH - 12) * PX);
    bx.fillText('By sea, unchanged: Verdant Isle, Moonlit Island, Aurora Isles. Starlit Hollow stays behind Lanternrest\'s gate.', 4 * PX, (TH - 4) * PX);
    return big.toDataURL('image/jpeg', .88);
  }, PX);
  fs.writeFileSync(`/tmp/claude-0/prop/proposed-maps-${PX}.jpg`, Buffer.from(out.split(',')[1], 'base64')); await b.close();
})();
