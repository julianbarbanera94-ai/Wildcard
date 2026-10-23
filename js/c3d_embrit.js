// #1 Embrit: a chibi fire fox kit (reference: docs/reference/creatures_001-003_3d_style.png, left column).
// Personality: playful, curious, energetic. Big head and ears, quick agile pounces, independent ear twitches, a swaying tail
// whose flame flickers and flares when it attacks.
(function () {
const C3 = G.c3d; if (!C3.kit) return;
const { lerp, ease, easeOut, bump, clamp } = C3.math;
const ORANGE = '#ff8530', ORANGE_D = '#f26a1e', CREAM = '#fff1de', BROWN = '#4a2a22', PINK = '#f5a08a', TIP = '#3c1c16';
C3.def(1, {
  view: { front: -.55, back: Math.PI - .6, height: 3.0, fov: 26 },
  build(K) {
    const { T, mat, mesh, sphere, joint, tuft, lathe, eye, flames, sparks, grade } = K, J = {};
    const root = new T.Group(); root.userData.rest = { p: root.position.clone(), r: root.rotation.clone(), s: root.scale.clone() }; J.root = root;
    const mO = mat(ORANGE), mC = mat(CREAM, { rough: .9 }), mB = mat(BROWN, { rough: .7 }), mP = mat(PINK, { rough: .8 });
    // body
    const body = joint('body', root, [0, .6, 0], J);
    body.add(mesh(sphere(.45), mO, [0, 0, -.06], [.92, .86, 1.12]));
    body.add(mesh(sphere(.36), mC, [0, -.1, .2], [.78, .72, .7]));
    const chest = joint('chest', body, [0, .1, .28], J);
    chest.add(mesh(sphere(.3), mC, [0, .04, .02], [1, .95, .72]));
    for (let i = 0; i < 5; i++) { const a = (i - 2) * .32, t = tuft(.2, .085, mC); t.position.set(Math.sin(a) * .2, -.12, .1 + Math.cos(a) * .06); t.rotation.set(2.6, 0, a * .6); chest.add(t); }
    // head
    const neck = joint('neck', chest, [0, .26, .02], J), head = joint('head', neck, [0, .44, .04], J);
    head.add(mesh(sphere(.62, 36, 28), mO, null, [1.08, .95, .92]));
    head.add(mesh(sphere(.5, 32, 24), mC, [0, -.24, .2], [1.02, .62, .82]));                       // cream lower face
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const t = tuft(.16 - i * .02, .13, mC); t.position.set(s * (.46 + i * .03), -.2 - i * .1, .1 - i * .03); t.rotation.set(0, 0, s * -(1.8 + i * .35)); head.add(t); }   // cheek fluff
        head.add(mesh(sphere(.2), mC, [0, -.2, .52], [1.2, .78, 1]));                                      // muzzle
    head.add(mesh(sphere(.062), mat('#1e1210', { rough: .28 }), [0, -.12, .72], [1.45, .9, 1]));     // nose
    const mouth = joint('mouth', head, [0, -.31, .63], J);
    mouth.add(mesh(sphere(.1), mat('#7a1c18', { rough: .6 }), null, [1.3, 1, .5]));
    mouth.add(mesh(sphere(.06), mat('#ff8a8a'), [0, -.04, .02], [1.3, .6, .6]));
    for (const s of [-1, 1]) mouth.add(mesh(new T.ConeGeometry(.022, .06, 8), mat('#ffffff', { rough: .3 }), [s * .085, .06, .04], null, [Math.PI, 0, 0]));
    J.mouthShape = mouth;
    const eyeOpt = s => ({ r: .205, flat: .5, irisR: .97, openU: 1.42, openL: 1.55, lid: ORANGE, lash: '#2a1008', lashW: .12, iris: { c0: '#3a1004', c1: '#c4421a', c2: '#ffb040', pupil: '#160402', pr: 60, ring: '#2a0a04' } });
    const eyes = [-1, 1].map(s => { const e = eye(eyeOpt(s)); e.group.position.set(s * .26, .0, .45); e.group.rotation.set(-.05, s * .3, 0); e.group.scale.set(1, 1.14, 1); head.add(e.group); return e; });
    // ears: tall, splayed, dark tips, pink inside with cream fluff
    const earGeo = grade(lathe([[.001, 0], [.2, .04], [.27, .22], [.25, .5], [.16, .8], [.04, 1.04], [.001, 1.08]], 20), [[0, ORANGE], [.7, ORANGE], [.78, TIP], [1, TIP]], 'y', .04);
    const innerGeo = lathe([[.001, 0], [.16, .06], [.2, .25], [.17, .5], [.1, .75], [.001, .9]], 16);
    for (const [s, n] of [[-1, 'earL'], [1, 'earR']]) {
      const e = joint(n, head, [s * .33, .42, -.04], J); e.rotation.set(-.08, 0, -s * .58); e.userData.rest.r = e.rotation.clone();
      e.add(mesh(earGeo, mat('#fff', { vc: true }), null, [1, 1, .34]));
      e.add(mesh(innerGeo, mP, [0, .06, .07], [.92, 1, .18]));
      for (let i = 0; i < 3; i++) { const t = tuft(.13 - i * .02, .045, mC); t.position.set((i - 1) * .06, .1, .09); t.rotation.set(.15, 0, (i - 1) * .35); e.add(t); }
    }
    // legs: orange upper, dark brown socks and paws; front legs slimmer
    const legs = [];
    const mkLeg = (id, x, y, z, front) => {
      const hip = joint('hip' + id, body, [x, y, z], J), L1 = front ? .2 : .2, L2 = front ? .2 : .19;
      if (!front) hip.add(mesh(sphere(.2), mO, [0, .02, -.02], [.85, 1, 1.1]));
      hip.add(mesh(new T.CapsuleGeometry(front ? .095 : .11, L1, 6, 12), mO, [0, -L1 / 2, 0]));
      const knee = joint('knee' + id, hip, [0, -L1, 0], J);
      knee.add(mesh(new T.CapsuleGeometry(front ? .088 : .095, L2, 6, 12), mB, [0, -L2 / 2, 0]));
      const paw = joint('paw' + id, knee, [0, -L2, 0], J);
      paw.add(mesh(sphere(.12), mB, [0, -.01, .05], [1, .62, 1.3]));
      legs.push({ id, hip, knee, paw, L1, L2, bend: front ? -1 : 1, rest: new T.Vector3(), target: new T.Vector3() });
    };
    mkLeg('FL', -.2, -.18, .28, true); mkLeg('FR', .2, -.18, .28, true); mkLeg('BL', -.25, -.14, -.32, false); mkLeg('BR', .25, -.14, -.32, false);
    root.updateMatrixWorld(true);
    for (const l of legs) { const p = new T.Vector3(); l.hip.getWorldPosition(p); root.worldToLocal(p); l.rest.set(p.x * 1.05, .075, p.z + .03); }
    // tail: a fluffy chain that ends in a flame
    let par = joint('tail0', body, [0, .02, -.46], J); par.rotation.x = -1.05; par.userData.rest.r = par.rotation.clone();
    const tailCols = [ORANGE, '#ff9036', '#ffa040'];
    for (let i = 0; i < 3; i++) {
      par.add(mesh(sphere(.19 + i * .06, 24, 18), mat(tailCols[i]), [0, .1, 0], [1, 1.25, 1]));
      const n = joint('tail' + (i + 1), par, [0, .2, 0], J); n.rotation.x = .32; n.userData.rest.r = n.rotation.clone(); par = n;
      if (i) par.add(flames(.6 + i * .25, { n: 4, w: 1.1, fan: .6, seed: i, tilt: .3, c0: '#f2400e', c1: '#ff7418', c2: '#ffb02a', c3: '#ffe680' }));
    }
    const fireBase = joint('tailFireBase', par, [0, .05, 0], J), fire = new T.Group(); fireBase.add(fire);
    fire.add(flames(1.45, { n: 7, w: 1.1, fan: .7, tilt: .2, c0: '#f2400e', c1: '#ff7418', c2: '#ffb02a', c3: '#ffe680' }));
    fire.add(mesh(sphere(.24, 20, 14), mat('#ffc050', { emissive: '#ffa030', ei: .9 }), [0, .05, 0], [1, .9, 1]));
    const sp = sparks(14, .09); J.sparks = sp;
    root.add(sp);
    const tmp = new T.Vector3(), q = new T.Quaternion(), qUp = new T.Quaternion().setFromEuler(new T.Euler(0, 0, .25));
    return {
      root, J, legs, eyes,
      face(P) {
        eyes.forEach(e => e.set(P['face.blink'] || 0, P['face.squint'] || 0, P['face.gx'] || 0, P['face.gy'] || 0));
        J.mouthShape.scale.y = clamp(.45 + (P['face.mouth'] || 0) * 1.2, .15, 1.9);
      },
      fx(t, P, A) {
        const fl = P['fx.flare'] || 0; fire.scale.setScalar(Math.max(.2, 1 + fl * .55 + Math.sin(t * 11) * .03));
        if (A.r() < .05 + fl * .4) { fire.getWorldPosition(tmp); root.worldToLocal(tmp); sp.userData.emit(tmp.x + (A.r() - .5) * .2, tmp.y + .3, tmp.z, 1 + fl); }
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
      P['root.z'] = fw * .7; P['root.y'] = up * .3; P['body.rx'] = lerp(.15, -.25, Math.min(1, k * 2.5)) * (1 - ease(Math.max(0, (k - .5) * 2)));
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
      P['root.rz'] = f * 1.25; P['root.y'] = f * .2; P['root.x'] = f * .35; P['face.blink'] = .5 + f * .5; P['face.mouth'] = .3; P['earL.rx'] = -.6 * f; P['earR.rx'] = -.6 * f; P['head.rx'] = .2 * f; P['fx.flare'] = -.6 * f; } },
    walk: { dur: 1.2, fn(t, P, A, k) {   // light trot in place (the battle slides it in)
      const p = k * Math.PI * 6; P['paw.FL.y'] = Math.max(0, Math.sin(p)) * .14; P['paw.BR.y'] = Math.max(0, Math.sin(p)) * .12; P['paw.FR.y'] = Math.max(0, -Math.sin(p)) * .14; P['paw.BL.y'] = Math.max(0, -Math.sin(p)) * .12;
      P['body.y'] = Math.abs(Math.sin(p)) * .04; P['head.rx'] = Math.sin(p * 2) * .03; P['face.mouth'] = .4; } },
  },
});
})();
