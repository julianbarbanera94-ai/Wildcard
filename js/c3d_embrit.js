// #1 Embrit: a chibi fire fox kit. Model: the Meshy model made from docs/reference/creatures_001-003_3d_style.png.
// Personality: playful, curious, energetic. Big head and ears, quick agile pounces, independent ear twitches, a swaying tail
// whose flame flickers and flares when it attacks.
(function () {
const C3 = G.c3d; if (!C3.kit) return;
const { lerp, ease, easeOut, bump, clamp } = C3.math;
C3.def(1, {
  view: { front: -.3, back: Math.PI - .55, height: 2.9, fov: 26 },
  build(K) {
    // The Meshy model (js/c3d_embrit_mesh.js): simplified, textured and auto-rigged; the clips below drive its bones.
    const { T, flames, sparks } = K, M = K.skinned(G.C3D_ASSETS[1], { lid: '#ff8634', eyeR: .1 }), { root, J } = M;
    // live flame tongues licking off the tail tip, and sparks
    const fire = new T.Group(); J.tail3.add(fire); fire.position.set(-.04, .18, -.05);
    fire.add(flames(.5, { n: 4, w: 1, fan: .7, tilt: .25, c0: '#f2400e', c1: '#ff7418', c2: '#ffb02a', c3: '#ffe680' }));
    const sp = sparks(14, .08); root.add(sp);
    const tmp = new T.Vector3();
    return {
      root, J, legs: M.legs,
      face(P) { const b = Math.max(P['face.blink'] || 0, (P['face.squint'] || 0) * .45); M.lids.forEach(l => l.set(b)); },
      fx(t, P, A) {
        const fl = P['fx.flare'] || 0; M.fireBoost.value = Math.max(-.6, fl * 1.2); fire.scale.setScalar(Math.max(.2, 1 + fl * .7 + Math.sin(t * 11) * .04));
        if (A.r() < .05 + fl * .4) { fire.getWorldPosition(tmp); root.worldToLocal(tmp); sp.userData.emit(tmp.x + (A.r() - .5) * .2, tmp.y + .15, tmp.z, 1 + fl); }
        sp.userData.step();
      },
    };
  },
  // ---- Idle: bouncy breathing, weight shifts, independent ear twitches, swaying tail, occasional head tilt -----------------
  idle(t, P, A) {
    const br = Math.sin(t * 2.7);
    P['body.sy'] = br * .025; P['body.y'] = br * .012; P['chest.s'] = br * .015;
    P['body.x'] = Math.sin(t * .8) * .025; P['body.rz'] = Math.sin(t * .8) * .03;
    P['head.rx'] = Math.sin(t * 1.4) * .035 - .02; P['head.ry'] = Math.sin(t * .6) * .07 + A.gaze[0] * .18; P['head.rz'] = bump((t % 7.3), 3, 3.4, 4.6, 5.1) * .22;   // a curious tilt now and then
    const tw = (p, o) => { const k = ((t + o) % p) / p; return k < .05 ? Math.sin(k / .05 * Math.PI) : 0; };
    P['earL.rz'] = tw(3.7, 0) * .3 + Math.sin(t * 1.1) * .03; P['earR.rz'] = -tw(5.1, 1.7) * .3 - Math.sin(t * 1.3) * .03;
    P['earL.rx'] = tw(6.3, 2.5) * -.25; P['earR.rx'] = tw(4.4, .4) * -.2;
    for (let i = 0; i <= 3; i++) { P[`tail${i}.rz`] = Math.sin(t * 2.4 - i * .55) * .12 * (1 + i * .25); P[`tail${i}.rx`] = Math.sin(t * 1.6 - i * .4) * .04; }
    P['face.mouth'] = .1 + Math.max(0, Math.sin(t * .5)) * .15; P['face.squint'] = .12;
  },
  clips: {
    look: { dur: 2.4, keepIdle: true, additive: true, fn(t, P) {
      const k = t / 2.4; P['head.ry'] = bump(k, 0, .15, .4, .5) * .5 - bump(k, .5, .62, .85, 1) * .45; P['face.gx'] = bump(k, 0, .1, .4, .5) * -.9 + bump(k, .5, .6, .85, 1) * .9;
      P['earL.rx'] = bump(k, .05, .15, .3, .4) * -.25; P['head.rz'] = bump(k, .55, .65, .85, .95) * .15; } },
    enter: { dur: .95, fn(t, P, A, k) {   // a bouncy hop onto the platform
      const h = Math.sin(clamp(k / .6, 0, 1) * Math.PI); P['root.y'] = h * .35; P['root.z'] = (1 - easeOut(Math.min(1, k / .6))) * .4;
      const land = bump(k, .55, .65, .7, .95); P['body.sy'] = -land * .14; P['body.y'] = -land * .08; P['earL.rz'] = land * .35; P['earR.rz'] = -land * .35;
      P['paw.FL.y'] = h * .1; P['paw.FR.y'] = h * .1; P['face.mouth'] = .6; P['face.squint'] = .4 + land * .4; } },
    anticipate: { dur: .42, hold: false, fn(t, P, A, k) {   // drop low, ears back, wiggle
      const c = easeOut(Math.min(1, k * 1.6)); P['body.y'] = -.13 * c; P['body.rx'] = .14 * c; P['head.rx'] = -.12 * c; P['body.ry'] = Math.sin(k * 30) * .04 * c;
      P['earL.rx'] = -.45 * c; P['earR.rx'] = -.45 * c; P['tail0.rx'] = .35 * c; P['face.squint'] = .55 * c; P['face.mouth'] = .15; P['fx.flare'] = .3 * c; } },
    attack: { dur: .9, events: { impact: .42 }, fn(t, P, A, k) {   // quick pounce with both front paws
      const up = bump(k, .12, .38, .42, .7), fw = bump(k, .1, .4, .5, .85);
      P['root.z'] = fw * .45; P['root.y'] = up * .26; P['body.rx'] = lerp(.15, -.25, Math.min(1, k * 2.5)) * (1 - ease(Math.max(0, (k - .5) * 2)));
      P['paw.FL.y'] = up * .32; P['paw.FR.y'] = up * .3; P['paw.FL.z'] = fw * .32; P['paw.FR.z'] = fw * .3; P['paw.BL.y'] = up * .15; P['paw.BR.y'] = up * .15;
      P['head.rx'] = -.15 * up; P['earL.rx'] = -.5 * fw; P['earR.rx'] = -.5 * fw; P['tail0.rx'] = .5 * fw;
      P['face.mouth'] = .2 + bump(k, .25, .4, .5, .75) * 1.1; P['face.squint'] = .5; P['fx.flare'] = bump(k, .2, .4, .5, .8) * .8; } },
    cast: { dur: 1, events: { impact: .55 }, fn(t, P, A, k) {   // rear up, puff a flame from the tail
      const r = bump(k, .05, .35, .55, .9); P['body.rx'] = -.28 * r; P['body.y'] = .08 * r; P['paw.FL.y'] = .22 * r; P['paw.FR.y'] = .18 * r; P['paw.FL.z'] = .1 * r;
      P['head.rx'] = -.2 * r; P['tail0.rx'] = -.4 * r; P['face.mouth'] = .2 + bump(k, .4, .52, .62, .85) * 1.2; P['face.squint'] = .3; P['fx.flare'] = bump(k, .3, .5, .65, 1) * 1.2;
      P['earL.rz'] = r * .25; P['earR.rz'] = -r * .25; } },
    status: { dur: .8, events: { impact: .35 }, fn(t, P, A, k) {   // a squeaky little growl: lean in, ears back, mouth wide
      const g = bump(k, .05, .25, .6, .95); P['body.rx'] = .12 * g; P['head.rx'] = .1 * g; P['root.z'] = .12 * g; P['earL.rx'] = -.5 * g; P['earR.rx'] = -.5 * g;
      P['face.mouth'] = .2 + g * 1.1; P['face.squint'] = .6 * g; P['head.rz'] = Math.sin(k * 40) * .04 * g; P['tail0.rx'] = .3 * g; P['fx.flare'] = .3 * g; } },
    hit: { dur: .55, fn(t, P, A, k) {   // a quick flinch backwards
      const h = bump(k, 0, .12, .25, 1); P['root.z'] = -.28 * h; P['body.rx'] = -.12 * h; P['head.rx'] = -.3 * h; P['head.rz'] = .2 * h; P['body.rz'] = -.1 * h;
      P['earL.rx'] = -.6 * h; P['earR.rx'] = -.6 * h; P['face.blink'] = .85 * h; P['face.mouth'] = .4 * h; P['paw.FL.z'] = -.1 * h; P['paw.FR.z'] = -.1 * h; } },
    hitHeavy: { dur: .75, fn(t, P, A, k) {
      const h = bump(k, 0, .1, .3, 1); P['root.z'] = -.42 * h; P['root.y'] = Math.sin(Math.min(1, k * 3) * Math.PI) * .12; P['body.rx'] = -.2 * h; P['head.rx'] = -.4 * h; P['head.rz'] = .3 * h;
      P['earL.rx'] = -.8 * h; P['earR.rx'] = -.8 * h; P['face.blink'] = h; P['face.mouth'] = .6 * h; P['body.sy'] = -.1 * bump(k, .3, .4, .45, .6); } },
    victory: { dur: 1.8, fn(t, P, A, k) {   // two happy hops and a spin of the tail
      const hop = Math.abs(Math.sin(Math.min(1, k / .7) * Math.PI * 2)) * (k < .7 ? 1 : 0); P['root.y'] = hop * .3; P['body.sy'] = (hop < .05 && k < .75 ? -.06 : 0);
      P['root.ry'] = bump(k, .7, .82, .9, 1) * .5; P['face.squint'] = .9; P['face.mouth'] = .9; P['earL.rz'] = hop * .3; P['earR.rz'] = -hop * .3;
      for (let i = 0; i <= 3; i++) P[`tail${i}.rz`] = Math.sin(t * 14 - i * .7) * .25; P['fx.flare'] = .5; P['head.rz'] = bump(k, .75, .85, .95, 1) * .2; } },
    faint: { dur: 1.3, hold: true, fn(t, P, A, k) {   // wobble, then flop over on its side
      const w = bump(k, 0, .15, .3, .45); P['body.rz'] = Math.sin(k * 25) * .08 * w; const f = ease(clamp((k - .35) / .5, 0, 1));
      P['root.rz'] = f * 1.2; P['root.y'] = f * .25; P['root.x'] = f * .55; P['face.blink'] = .5 + f * .5; P['face.mouth'] = .3; P['earL.rx'] = -.6 * f; P['earR.rx'] = -.6 * f; P['head.rx'] = .2 * f; P['fx.flare'] = -.6 * f; } },
    walk: { dur: 1.2, fn(t, P, A, k) {   // light trot in place (the battle slides it in)
      const p = k * Math.PI * 6; P['paw.FL.y'] = Math.max(0, Math.sin(p)) * .14; P['paw.BR.y'] = Math.max(0, Math.sin(p)) * .12; P['paw.FR.y'] = Math.max(0, -Math.sin(p)) * .14; P['paw.BL.y'] = Math.max(0, -Math.sin(p)) * .12;
      P['body.y'] = Math.abs(Math.sin(p)) * .04; P['head.rx'] = Math.sin(p * 2) * .03; P['face.mouth'] = .4; } },
  },
});
})();
