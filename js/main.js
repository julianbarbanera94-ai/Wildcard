// Boot: title screen, new game / continue.
(function () {
const G = globalThis.G;

const title = {
  t: 0, prompt: true, ids: [1, 4, 7, 12, 10, 25],
  update() { this.t++; },
  draw(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, G.H); g.addColorStop(0, '#1c2a5a'); g.addColorStop(.6, '#5a6ab0'); g.addColorStop(1, '#f0b878');
    ctx.fillStyle = g; ctx.fillRect(0, 0, G.W, G.H);
    ctx.fillStyle = '#2f7a2a'; ctx.fillRect(0, 128, G.W, 32); ctx.fillStyle = '#4a9a38'; ctx.fillRect(0, 128, G.W, 3);
    for (let i = 0; i < 30; i++) { const x = (i * 97) % G.W, y = (i * 53) % 90; ctx.fillStyle = (i + (this.t >> 4)) % 3 ? '#fff' : '#ffd860'; ctx.fillRect(x, y, 1, 1); }
    // cycling creature parade
    const k = (this.t / 90 | 0) % this.ids.length;
    ctx.drawImage(G.creatureSprite(this.ids[k]), 88, 74 + Math.sin(this.t / 12) * 3, 64, 64);
    G.text(ctx, 'WILDCARD', 120, 22, { align: 'center', color: '#ffe060', shadow: '#a03020', font: 'bold 24px "Courier New", monospace' });
    if (this.prompt && (this.t >> 5) % 2) G.text(ctx, 'PRESS Z OR ENTER', 120, 140, { align: 'center', color: '#fff', shadow: '#102050' });
    G.text(ctx, 'A CREATURE-CATCHING ADVENTURE', 120, 52, { align: 'center', color: '#fff', shadow: '#102050', font: 'bold 7px "Courier New", monospace' });
  },
};

async function intro() {
  G.ui.style = 'light';
  await G.say('Welcome to the wild frontier!\nHere, creatures roam the tall grass, forests and caves.');
  await G.say('You live in PEBBLE TOWN. Today, Prof. Quill is waiting to hand you your very first partner.');
  G.closeText();
}

async function begin(S, fresh) {
  G.state = S; G.ui.fade.a = 1; G.ui.fade.color = '#000';
  G.loadMap(S.map); G.placePlayer(S.x, S.y, S.dir);
  G.scene = G.world.scene; G.world.banner = null; G.world.busy = true;
  await G.fadeTo(0, 20);
  if (fresh) await intro();
  G.world.busy = false;
}

// Called by the Android shell on the Back button: acts as B, or reports that the app should close from the title screen.
G.androidBack = function () {
  if (G.scene === title && !G.ui.layers.length) return 'exit';
  G.press('b'); setTimeout(() => G.release('b'), 60); return 'handled';
};

async function main() {
  G.scene = title; G.audio.music('town');
  const save = G.loadGame();
  for (;;) {
    await G.nextFrame();
    if (!(G.input.pressed.a || G.input.pressed.start)) continue;
    G.audio.sfx('select'); title.prompt = false;
    const items = save ? ['CONTINUE', 'NEW GAME'] : ['NEW GAME'];
    const c = await G.choose(items, { x: 84, y: 112, cancel: false, minW: 50 });
    if (save && c === 0) { await begin(save, false); return; }
    if (!save || c === 1) {
      if (save && !(await G.yesNo({ right: 236, bottom: 156 }))) { title.prompt = true; continue; }
      await begin(G.newState(), true); return;
    }
  }
}

addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('screen');
  G.start(canvas);
  main();
  // Touch / mouse controls.
  document.querySelectorAll('[data-k]').forEach(b => {
    const k = b.dataset.k;
    const down = e => { e.preventDefault(); b.classList.add('on'); G.press(k); };
    const up = e => { e.preventDefault(); b.classList.remove('on'); G.release(k); };
    b.addEventListener('pointerdown', down); ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, up));
    b.addEventListener('pointerup', () => G.audio.init());
  });
});
})();
