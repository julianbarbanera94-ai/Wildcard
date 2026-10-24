// Stylised 3D creatures (three.js, js/vendor/three.min.js) rendered into the 2D game.
// A species registers a model builder and its animation clips with G.c3d.def(id, spec). The battle asks for an actor per side
// (G.c3d.actor(id, 'front' | 'back')), steps it every game tick, draws actor.frame() where the sprite used to go, and plays
// clips on real battle events (enter, anticipate, attack, cast, hit, faint, victory). Anything missing falls back to the 2D
// sprite, and the 2D sprite of a 3D species is a still render of the model, so menus match battles.
//
// Rig: every model is a tree of named joints (THREE.Object3D). A pose is a flat object of numbers ('head.ry', 'body.y',
// 'face.blink', 'paw.FL.y', ...) applied on top of the rest pose, so clips are easy to blend and override per species.
// Legs use two-bone IK towards paw targets on the ground, so paws stay planted while the body moves (no foot sliding).
(function () {
const G = globalThis.G, T = globalThis.THREE, C3 = G.c3d = { specs: {}, has: () => false, actor: () => null };
if (!T) return;
const TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
const ease = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, easeOut = k => 1 - Math.pow(1 - k, 3), easeIn = k => k * k * k;
// smooth bump: 0 before a, rises to 1 at b, holds, falls to 0 by d
const bump = (t, a, b, c, d) => t <= a || t >= d ? 0 : t < b ? ease((t - a) / (b - a)) : t <= c ? 1 : 1 - ease((t - c) / (d - c));
C3.math = { clamp, lerp, ease, easeOut, easeIn, bump, TAU };

// ---- Renderer (one shared WebGL canvas; each actor copies its frame into its own 2D canvas) ------------------------------
let renderer;
function gl() {
  if (renderer !== undefined) return renderer;
  try {
    renderer = new T.WebGLRenderer({ alpha: true, antialias: true, premultipliedAlpha: false, preserveDrawingBuffer: true, powerPreference: 'low-power' });
    renderer.setClearColor(0x000000, 0); renderer.outputEncoding = T.sRGBEncoding; renderer.setPixelRatio(1);
    // Software-only WebGL (no GPU: SwiftShader, llvmpipe) is far too slow for live creatures; use the 2D art instead,
    // unless forced (localStorage 'wildcard-force3d' = '1', used by the 3D tests).
    const g = renderer.getContext(), info = g.getExtension('WEBGL_debug_renderer_info'), name = info ? String(g.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
    let force = false; try { force = localStorage.getItem('wildcard-force3d') === '1'; } catch (e) {}
    if (/swiftshader|llvmpipe|softpipe|software/i.test(name) && !force) { console.info('3D creatures off: software renderer', name); renderer.dispose(); renderer = null; }
  } catch (e) { console.warn('3D creatures off (no WebGL)', e); renderer = null; }
  return renderer;
}
C3.available = () => !!gl() && !(G.pref && G.pref('system.graphics') === 'balanced' && G.pref('system.no3d'));

// ---- Materials and shape helpers ------------------------------------------------------------------------------------------
const col = c => new T.Color(c).convertSRGBToLinear();
// Vertex colours graded along one axis: stops = [[t, '#hex'], ...] with t from 0 (min) to 1 (max) of that axis.
function grade(geo, stops, axis = 'y', soft = .06) {
  geo.computeBoundingBox(); const bb = geo.boundingBox, lo = bb.min[axis], hi = bb.max[axis], pos = geo.attributes.position, out = new Float32Array(pos.count * 3);
  const cs = stops.map(([t, c]) => [t, col(c)]), tmp = new T.Color();
  for (let i = 0; i < pos.count; i++) {
    const v = (pos['get' + axis.toUpperCase()](i) - lo) / ((hi - lo) || 1);
    let k = 0; while (k < cs.length - 1 && v > cs[k + 1][0]) k++;
    const [t0, c0] = cs[k], [t1, c1] = cs[Math.min(k + 1, cs.length - 1)];
    const f = t1 === t0 ? 0 : clamp((v - (t1 - soft)) / (soft * 2 || 1), 0, 1);   // sharp-ish bands with a soft edge
    tmp.copy(c0).lerp(c1, k === cs.length - 1 ? 0 : f);
    out[i * 3] = tmp.r; out[i * 3 + 1] = tmp.g; out[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new T.BufferAttribute(out, 3)); return geo;
}
const matCache = {};
function mat(c, o = {}) {
  const key = c + JSON.stringify(o); if (matCache[key]) return matCache[key];
  const m = new T.MeshStandardMaterial({ color: o.vc ? 0xffffff : col(c), roughness: o.rough ?? .78, metalness: 0, vertexColors: !!o.vc, emissive: o.emissive ? col(o.emissive) : 0x000000, emissiveIntensity: o.ei ?? 1, side: o.side || T.FrontSide, flatShading: false, transparent: !!o.opacity, opacity: o.opacity ?? 1 });
  return matCache[key] = m;
}
const sphere = (r, ws = 28, hs = 20) => new T.SphereGeometry(r, ws, hs);
function mesh(geo, m, p, s, r) { const o = new T.Mesh(geo, m); if (p) o.position.set(...p); if (s) o.scale.set(...s); if (r) o.rotation.set(...r); return o; }
function joint(name, parent, p, J) { const o = new T.Object3D(); o.name = name; if (p) o.position.set(...p); parent.add(o); o.userData.rest = { p: o.position.clone(), r: o.rotation.clone(), s: o.scale.clone() }; if (J) J[name] = o; return o; }
// A soft tapered "tuft" (fur lock / cheek fluff): a cone with a rounded base, pointing along +y.
function tuft(len, rad, m) { const g = new T.ConeGeometry(rad, len, 10, 1); g.translate(0, len / 2, 0); const o = new T.Group(); o.add(new T.Mesh(g, m)); o.add(mesh(sphere(rad, 12, 8), m)); return o; }
// A lathe from a profile of [radius, height] pairs (smooth organic shapes: ears, tail segments, horns).
function lathe(profile, seg = 24) { return new T.LatheGeometry(profile.map(([r, y]) => new T.Vector2(r, y)), seg); }
// Canvas texture for an eye: iris gradient, pupil and catch-lights. Drawn once per colour set.
const eyeTex = {};
function irisTexture(o) {
  const key = JSON.stringify(o); if (eyeTex[key]) return eyeTex[key];
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  const g = x.createRadialGradient(128, 150, 10, 128, 128, 128); g.addColorStop(0, o.c2); g.addColorStop(.55, o.c1); g.addColorStop(.9, o.c0); g.addColorStop(1, o.ring || o.c0);
  x.fillStyle = g; x.beginPath(); x.arc(128, 128, 126, 0, TAU); x.fill();
  if (o.slit) { x.fillStyle = o.pupil; x.beginPath(); x.ellipse(128, 128, 22, 84, 0, 0, TAU); x.fill(); }
  else { const pg = x.createRadialGradient(128, 128, 10, 128, 128, o.pr || 62); pg.addColorStop(0, o.pupil); pg.addColorStop(.85, o.pupil); pg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = pg; x.beginPath(); x.arc(128, 128, o.pr || 62, 0, TAU); x.fill(); }
  // iris streaks
  x.globalAlpha = .25; x.strokeStyle = o.c2; x.lineWidth = 3; for (let i = 0; i < 28; i++) { const a = i / 28 * TAU; x.beginPath(); x.moveTo(128 + Math.cos(a) * 70, 128 + Math.sin(a) * 70); x.lineTo(128 + Math.cos(a) * 118, 128 + Math.sin(a) * 118); x.stroke(); }
  x.globalAlpha = 1; x.fillStyle = '#fff'; x.beginPath(); x.ellipse(92, 82, 34, 30, -.5, 0, TAU); x.fill(); x.beginPath(); x.arc(166, 176, 14, 0, TAU); x.fill();
  const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return eyeTex[key] = t;
}
// An eye rig: white ball, iris disc that moves with gaze, upper and lower lids (fur-coloured shells that rotate to close),
// and a dark lash line on the upper lid. Returns { group, set(blink, squint, gx, gy) }.
function eye(o) {
  const r = o.r, g = new T.Group(), sq = o.flat || .55;
  const sc = new T.Group(); sc.scale.set(1, 1, sq); g.add(sc);   // the whole eye (ball, iris, lids) is squashed as one, so lids always fit
  sc.add(mesh(sphere(r, 28, 20), mat(o.white || '#fffaf4', { rough: .35 })));
  const irisM = new T.MeshStandardMaterial({ map: irisTexture(o.iris), roughness: .25, metalness: 0, emissive: o.glow ? col(o.glow) : 0x000000, emissiveIntensity: o.glow ? .8 : 0, emissiveMap: o.glow ? irisTexture(o.iris) : null });
  // iris: a cap on the eyeball's front (so lids always cover it), textured by its projection onto the eye's front plane
  const ir = o.irisR || .82, capA = Math.asin(Math.min(.99, ir)), capG = new T.SphereGeometry(r * 1.004, 32, 12, 0, TAU, 0, capA);
  capG.rotateX(Math.PI / 2); { const P = capG.attributes.position, uv = capG.attributes.uv; for (let i = 0; i < P.count; i++) uv.setXY(i, .5 + P.getX(i) / (r * ir * 2), .5 + P.getY(i) / (r * ir * 2)); uv.needsUpdate = true; }
  const iris = new T.Mesh(capG, irisM); const irisPivot = new T.Object3D(); irisPivot.add(iris); sc.add(irisPivot);
  // lids: half-domes in skin colour; at rotation.x = 0 the two meet across the middle (shut), negative tilts each one open
  const lidM = mat(o.lid, { side: T.DoubleSide }), mk = up => { const p = new T.Object3D(); if (!up) p.rotation.z = Math.PI; const h = new T.Object3D(); h.add(new T.Mesh(new T.SphereGeometry(r * 1.06, 28, 14, 0, TAU, 0, Math.PI / 2), lidM)); p.add(h); sc.add(p); return h; };
  const upper = mk(true), lower = mk(false);
  // lash: a dark arc along the upper lid's front edge (a closed eye reads as a curved line)
  upper.add(mesh(new T.TorusGeometry(r * 1.06, r * (o.lashW || .09), 8, 28, Math.PI), mat(o.lash || '#2a1410', { rough: .5 }), null, null, [Math.PI / 2, 0, 0]));
  const openU = o.openU ?? .95, openL = o.openL ?? 1.1;
  const set = (blink, squint, gx, gy) => {
    const b = clamp(blink, 0, 1), s = clamp(squint, 0, 1);
    // closed = both lids meet across the middle (the lash becomes the closed-eye line); squint raises the lower lid
    upper.rotation.x = lerp(-openU, .04, b);
    lower.rotation.x = lerp(lerp(-openL, -.42, s), .04, b);
    irisPivot.rotation.y = clamp(gx, -1, 1) * .32; irisPivot.rotation.x = -clamp(gy, -1, 1) * .25;   // gaze: the iris rolls over the ball
  };
  set(0, 0, 0, 0);
  return { group: g, set };
}

// ---- Stylised flames: a teardrop mesh with a shader that sways, flickers and fades from deep orange to a pale tip ---------
const flameUniforms = { uTime: { value: 0 } };
const FLAME_VS = `uniform float uTime; uniform float uSeed; uniform float uAmp; varying float vH; varying vec3 vN; varying vec3 vV;
void main(){ vec3 p = position; float h = clamp(p.y / 1.0, 0.0, 1.0); vH = h;
  float w = sin(uTime*5.2 + uSeed*6.0 + h*4.0)*0.09 + sin(uTime*8.3 + uSeed*3.0 + h*7.0)*0.05;
  p.x += w * h * h * uAmp * 1.6; p.z += cos(uTime*4.1 + uSeed*5.0 + h*5.0)*0.06*h*h*uAmp;
  p.xz *= 1.0 + sin(uTime*9.0 + uSeed*9.0 + h*10.0)*0.06*(1.0-h);
  p.y *= 1.0 + sin(uTime*6.0 + uSeed*4.0)*0.07*uAmp;
  vec4 mv = modelViewMatrix * vec4(p,1.0); vV = normalize(-mv.xyz); vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }`;
const FLAME_FS = `uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3; uniform float uAlpha; varying float vH; varying vec3 vN; varying vec3 vV;
void main(){ float f = clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);
  vec3 c = mix(uC0, uC1, smoothstep(0.0, 0.35, vH)); c = mix(c, uC2, smoothstep(0.3, 0.75, vH)); c = mix(c, uC3, smoothstep(0.7, 1.0, vH) * 0.8);
  c = mix(c, uC3, pow(f, 2.5) * 0.35 * (1.0 - vH * 0.5));   // hot core facing the camera
  float a = uAlpha * (0.6 + 0.4 * smoothstep(0.0, 0.45, f)) * (1.0 - smoothstep(0.88, 1.0, vH) * 0.4);
  gl_FragColor = vec4(c, a); }`;
let flameGeo = null;
function flameGeometry() {
  if (flameGeo) return flameGeo;
  const prof = []; for (let i = 0; i <= 18; i++) { const h = i / 18; prof.push([Math.max(.001, Math.pow(Math.sin(Math.min(1, h * 1.15) * Math.PI * .5 + .0), .6) * (1 - h) * .5 + (h < .1 ? h * 1.5 : 0) * 0), h]); }
  prof[0][0] = .001;
  // teardrop: round base, pointed tip
  const p2 = []; for (let i = 0; i <= 20; i++) { const h = i / 20, y = h, r = h < .25 ? Math.sin(h / .25 * Math.PI / 2) * .32 : .32 * Math.pow(1 - (h - .25) / .75, 1.3); p2.push([Math.max(.0005, r), y]); }
  return flameGeo = lathe(p2, 18);
}
function flameMaterial(o = {}) {
  return new T.ShaderMaterial({ vertexShader: FLAME_VS, fragmentShader: FLAME_FS, transparent: true, depthWrite: false, side: T.DoubleSide,
    uniforms: { uTime: flameUniforms.uTime, uSeed: { value: o.seed ?? Math.random() }, uAmp: { value: o.amp ?? 1 }, uAlpha: { value: o.alpha ?? .95 },
      uC0: { value: new T.Color(o.c0 || '#e8401c') }, uC1: { value: new T.Color(o.c1 || '#ff7a1e') }, uC2: { value: new T.Color(o.c2 || '#ffc040') }, uC3: { value: new T.Color(o.c3 || '#fff3b0') } } });   // shader writes sRGB directly
}
// A flame cluster: several tongues fanned around a centre, growing from a joint. size = height of the main tongue.
function flames(size, o = {}) {
  const g = new T.Group(), n = o.n || 3; g.userData.upright = o.tilt ?? 0;
  for (let i = 0; i < n; i++) {
    const k = i === 0 ? 1 : .55 + ((i * 37) % 10) / 30, m = new T.Mesh(flameGeometry(), flameMaterial({ ...o, seed: (o.seed || 0) + i * .37 }));
    m.scale.set(size * k * (o.w || .9), size * k, size * k * (o.w || .9));
    const a = i === 0 ? 0 : (i % 2 ? 1 : -1) * (.35 + i * .12); m.rotation.z = a * (o.fan ?? 1); m.rotation.x = ((i * 53) % 7 - 3) * .06;
    m.position.set(Math.sin(a) * size * .12, 0, ((i * 29) % 5 - 2) * size * .05); m.renderOrder = 2;
    g.add(m);
    if (o.core !== false) { const c = new T.Mesh(flameGeometry(), flameMaterial({ seed: (o.seed || 0) + i * .37, amp: 1, alpha: 1, c0: o.k0 || '#ff9a1e', c1: o.k1 || '#ffc23a', c2: o.k2 || '#ffe680', c3: o.k3 || '#fffbe6' }));
      c.scale.set(m.scale.x * .55, m.scale.y * .62, m.scale.z * .55); c.rotation.copy(m.rotation); c.position.copy(m.position); c.position.z += size * .04; c.renderOrder = 3; g.add(c); }
  }
  return g;
}
// Sparks: a few glowing points that rise from an emitter joint and fade (CPU, at most `max`).
const sparkTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,250,210,1)'); g.addColorStop(.35, 'rgba(255,190,70,.9)'); g.addColorStop(1, 'rgba(255,90,20,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); return new T.CanvasTexture(c); })();
function sparks(max, size) {
  const geo = new T.BufferGeometry(), pos = new Float32Array(max * 3), alpha = new Float32Array(max);
  geo.setAttribute('position', new T.BufferAttribute(pos, 3));
  const m = new T.PointsMaterial({ map: sparkTex, size, transparent: true, depthWrite: false, blending: T.AdditiveBlending, sizeAttenuation: true, opacity: .9 });
  const pts = new T.Points(geo, m); pts.frustumCulled = false; pts.renderOrder = 3;
  const P = []; for (let i = 0; i < max; i++) { P.push({ life: 0, max: 1, x: 0, y: -99, z: 0, vx: 0, vy: 0, vz: 0 }); }
  pts.userData.emit = (x, y, z, k = 1) => { const p = P.find(p => p.life <= 0); if (!p) return; Object.assign(p, { life: 1, max: 40 + Math.random() * 30, x, y, z, vx: (Math.random() - .5) * .01 * k, vy: (.012 + Math.random() * .014) * k, vz: (Math.random() - .5) * .01 * k }); };
  pts.userData.step = () => { P.forEach((p, i) => { if (p.life > 0) { p.x += p.vx; p.y += p.vy; p.z += p.vz; p.vx += (Math.random() - .5) * .002; p.life -= 1 / p.max; } pos[i * 3] = p.x; pos[i * 3 + 1] = p.life > 0 ? p.y : -99; pos[i * 3 + 2] = p.z; }); geo.attributes.position.needsUpdate = true; };
  return pts;
}
// ---- Imported models (a modelling tool's mesh, simplified and auto-rigged by tools/import-creature-glb) -----------------
// asset: { n, lo, hi, pos (u16 x3), nrm (i8 x3), uv (u16 x2), idx (u16), scale, off, bones: [{ name, parent, head, tip }],
// skinIndex/skinWeight (u8 x4), fire (u8, glow mask), eyes: [[x, y, z] ...], base/normal (texture data URLs) }.
// Bones get the rig's standard names (body, chest, neck, head, earL, tail0.., hipFL/kneeFL/pawFL..), so a species' clips
// drive an imported model exactly like a built one. Painted eyes get skin-coloured lids so the model can blink and squint.
const b64 = s => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u.buffer; };
const texCache = {}; let pending = 0; const readyFns = [];
C3.whenReady = fn => { if (!pending) fn(); else readyFns.push(fn); };   // after every embedded texture has decoded
function dataTexture(url, srgb) { if (texCache[url]) return texCache[url]; const img = new Image(), t = new T.Texture(img); pending++;
  img.onload = img.onerror = () => { t.needsUpdate = true; if (--pending === 0) readyFns.splice(0).forEach(f => { try { f(); } catch (e) { console.warn(e); } }); }; img.src = url; t.flipY = false; if (srgb) t.encoding = T.sRGBEncoding; return texCache[url] = t; }
const fireTime = { value: 0 }, fireBoost = { value: 0 };
function skinned(A, o = {}) {
  const J = {}, root = new T.Group(); root.userData.rest = { p: root.position.clone(), r: root.rotation.clone(), s: root.scale.clone() }; J.root = root;
  const q = new Uint16Array(b64(A.pos)), nq = new Int8Array(b64(A.nrm)), uq = new Uint16Array(b64(A.uv)), n = A.n, S = A.scale, off = A.off;
  const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { pos[i * 3 + k] = (A.lo[k] + q[i * 3 + k] / 65535 * (A.hi[k] - A.lo[k]) + off[k]) * S; nrm[i * 3 + k] = nq[i * 3 + k] / 127; }
  for (let i = 0; i < n * 2; i++) uv[i] = uq[i] / 65535;
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('normal', new T.BufferAttribute(nrm, 3)); g.setAttribute('uv', new T.BufferAttribute(uv, 2));
  g.setIndex(new T.BufferAttribute(new Uint16Array(b64(A.idx)), 1));
  g.setAttribute('skinIndex', new T.Uint16BufferAttribute(Array.from(new Uint8Array(b64(A.skinIndex))), 4));
  g.setAttribute('skinWeight', new T.BufferAttribute(Float32Array.from(new Uint8Array(b64(A.skinWeight)), v => v / 255), 4));
  if (A.fire) g.setAttribute('aFire', new T.BufferAttribute(Float32Array.from(new Uint8Array(b64(A.fire)), v => v / 255), 1));
  const m = new T.MeshStandardMaterial({ map: dataTexture(A.base, true), normalMap: A.normal ? dataTexture(A.normal) : null, roughness: o.rough ?? .72, metalness: 0, side: T.DoubleSide });
  if (A.fire) m.onBeforeCompile = sh => {   // the flame parts of the texture glow and flicker
    sh.uniforms.uFireT = fireTime; sh.uniforms.uFireB = fireBoost;
    sh.vertexShader = 'attribute float aFire; varying float vFire; varying vec3 vFP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vFire = aFire; vFP = position;');
    sh.fragmentShader = 'uniform float uFireT; uniform float uFireB; varying float vFire; varying vec3 vFP;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\n float fl = 0.55 + 0.25 * sin(uFireT * 9.0 + vFP.y * 14.0 + vFP.x * 6.0) + 0.2 * sin(uFireT * 15.0 - vFP.z * 11.0);\n float hot = smoothstep(0.35, 0.9, dot(diffuseColor.rgb, vec3(0.5, 0.4, 0.1)));\n totalEmissiveRadiance += diffuseColor.rgb * vFire * (0.35 + 0.45 * hot) * fl * (1.0 + uFireB);');
  };
  // bones
  const bones = [];
  for (const b of A.bones) {
    const bone = new T.Bone(); bone.name = b.name; const par = b.parent ? J[b.parent] : null, ph = b.parent ? A.bones.find(x => x.name === b.parent).head : [0, 0, 0];
    bone.position.set(b.head[0] - ph[0], b.head[1] - ph[1], b.head[2] - ph[2]); (par || root).add(bone);
    bone.userData.rest = { p: bone.position.clone(), r: bone.rotation.clone(), s: bone.scale.clone() }; J[b.name] = bone; bones.push(bone);
  }
  const mesh = new T.SkinnedMesh(g, m); mesh.frustumCulled = false; root.add(mesh);
  root.updateMatrixWorld(true); mesh.bind(new T.Skeleton(bones), mesh.matrixWorld);
  // legs for IK (bones are laid out vertically: knee straight below the hip, paw below the knee)
  const legs = [];
  for (const id of ['FL', 'FR', 'BL', 'BR']) { const hip = J['hip' + id], knee = J['knee' + id], paw = J['paw' + id]; if (!hip) continue;
    const r = new T.Vector3(); paw.getWorldPosition(r); root.worldToLocal(r); r.y = Math.max(.02, r.y - .04);
    legs.push({ id, hip, knee, paw, L1: knee.position.length(), L2: paw.position.length(), bend: id[0] === 'F' ? -1 : 1, rest: r, target: new T.Vector3() }); }
  // eyelids over painted eyes: a skin-coloured lens that slides down from the top of the eye, with a dark lash line at its edge
  const lids = (A.eyes || []).map(e => {
    const head = J.head, p = new T.Vector3(...e); const hw = new T.Vector3(); head.getWorldPosition(hw);
    let best = 1e9, nrmv = new T.Vector3(0, 0, 1); for (let i = 0; i < n; i += 1) { const dx = pos[i * 3] - p.x, dy = pos[i * 3 + 1] - p.y, dz = pos[i * 3 + 2] - p.z, d = dx * dx + dy * dy + dz * dz; if (d < best) { best = d; nrmv.set(nrm[i * 3], nrm[i * 3 + 1], nrm[i * 3 + 2]); } }
    const r = o.eyeR || .1, grp = new T.Group(); grp.position.copy(p).sub(hw).addScaledVector(nrmv, .012); grp.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), nrmv.normalize()); head.add(grp);
    const pivot = new T.Group(); pivot.position.y = r * .95; grp.add(pivot);
    const lens = new T.Mesh(new T.SphereGeometry(r, 24, 12, 0, TAU, 0, Math.PI / 2), mat(o.lid || '#ff8a3a', { rough: .85 })); lens.rotation.x = Math.PI / 2; lens.scale.set(1.08, .32, 1); lens.position.y = -r;
    const flap = new T.Group(); flap.add(lens); pivot.add(flap);
    const lash = new T.Mesh(new T.TorusGeometry(r * .95, r * .09, 6, 20, Math.PI), mat(o.lash || '#2a120c', { rough: .5 })); lash.rotation.z = Math.PI; lash.position.z = r * .06; pivot.add(lash);
    return { set(b) { b = clamp(b, 0, 1); flap.visible = lash.visible = b > .03; flap.scale.y = Math.max(.01, b); lash.position.y = -r * b; lash.scale.set(1.08, Math.max(.01, b), .6); } };
  });
  return { root, J, legs, mesh, lids, fireTime, fireBoost };
}
C3.kit = { T, col, grade, mat, sphere, mesh, joint, tuft, lathe, eye, flames, flameMaterial, sparks, irisTexture, skinned };

// ---- Two-bone leg IK -------------------------------------------------------------------------------------------------------
// leg = { hip (joint on the body), knee (child of hip, at -L1 on y), paw (child of knee at -L2), target: Vector3 in root space,
// bend: +1 bends the knee forward (hind legs), -1 backward (front legs) }. Solved in the hip's parent space, in the y-z plane.
const _v = new T.Vector3(), _q = new T.Quaternion(), _q2 = new T.Quaternion(), _q3 = new T.Quaternion(), _e = new T.Euler();
function solveLeg(root, leg) {
  const parent = leg.hip.parent; root.updateMatrixWorld(true);
  _v.copy(leg.target).applyMatrix4(root.matrixWorld); parent.worldToLocal(_v);
  const dy = _v.y - leg.hip.position.y, dz = _v.z - leg.hip.position.z, L1 = leg.L1, L2 = leg.L2;
  const d = clamp(Math.hypot(dy, dz), Math.abs(L1 - L2) + 1e-3, L1 + L2 - 1e-3);
  const base = Math.atan2(-dz, -dy);   // rotation.x that points -y at the target
  const a1 = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1)), a2 = Math.acos(clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1));
  leg.hip.rotation.x = base + leg.bend * a1; leg.knee.rotation.x = -leg.bend * (Math.PI - a2);
  if (leg.paw) leg.paw.rotation.x = -(leg.hip.rotation.x + leg.knee.rotation.x) + (leg.pawTilt || 0);   // paw stays flat on the ground
}

// ---- Actor: model + rig + animation controller ----------------------------------------------------------------------------
// spec = { build(kit) -> { root, J (joints), legs, face(pose) }, clips: { name: { dur, loop, events: { impact: s }, fn(t, P, A) } },
//          idle: fn(t, P, A), view: { front: yaw, back: yaw, height, target } }
// Clip functions write pose values into P (additive on the rest pose; numbers default to 0). A = the actor (A.r() random etc.).
C3.def = (id, spec) => { C3.specs[id] = spec; };
C3.log = [];
// The 3D creatures are opt-in (localStorage 'wildcard-force3d' = '1'): by default every species, Embrit included, uses its painted 2D art.
const opted = () => { try { return localStorage.getItem('wildcard-force3d') === '1'; } catch (e) { return false; } };
C3.has = id => !!C3.specs[id] && opted() && C3.available();
const actors = {};
C3.actor = (id, side) => { if (!C3.has(id)) return null; const k = id + ':' + side; return actors[k] || (actors[k] = new Actor(id, side)); };
const SIZE = 320;
class Actor {
  constructor(id, side) {
    const spec = this.spec = C3.specs[id]; this.id = id; this.side = side;
    const M = spec.build(C3.kit); this.M = M; this.J = M.J; this.root = M.root;
    this.scene = new T.Scene();
    // stylised lighting: warm sky, key from the top front, a cool fill and a strong rim from behind
    this.scene.add(new T.HemisphereLight(0xfff4e6, 0x8a6a5a, .95));
    const key = new T.DirectionalLight(0xffffff, 1.25); key.position.set(-2.5, 5, 4); this.scene.add(key);
    const fill = new T.DirectionalLight(0xbfd8ff, .35); fill.position.set(4, 1.5, 2); this.scene.add(fill);
    const rim = new T.DirectionalLight(0xffd0a0, .9); rim.position.set(1, 3, -5); this.scene.add(rim);
    this.pivot = new T.Group(); this.pivot.add(this.root); this.scene.add(this.pivot);
    const v = spec.view; this.pivot.rotation.y = side === 'back' ? v.back : v.front;
    this.cam = new T.PerspectiveCamera(v.fov || 26, 1, .1, 50);
    const H = v.height, dist = H * .55 / Math.tan((v.fov || 26) * Math.PI / 360) * 1.02, ty = H * .47;
    this.cam.position.set(0, ty + H * .18, dist); this.cam.lookAt(0, ty, 0);
    this.canvas = document.createElement('canvas'); this.canvas.width = this.canvas.height = SIZE; this.cx = this.canvas.getContext('2d');
    this.seed = id * 97 + (side === 'back' ? 13 : 0); this.reset();
  }
  r() { this.seed = (this.seed * 16807) % 2147483647; return (this.seed % 10000) / 10000; }
  reset() { this.t = 0; this.cur = null; this.prev = null; this.fade = 1; this.hold = null; this.nextBlink = 60 + this.r() * 120; this.blinkT = -1; this.nextLook = 240 + this.r() * 240; this.gaze = [0, 0]; this.gazeTo = [0, 0]; this.mood = 'neutral'; this.dead = false; this.last = {}; }
  // Play a clip once. Returns a promise for the end, with .at(eventName) for a promise at a named moment (e.g. 'impact').
  play(name, o = {}) {
    C3.log.push(this.id + ':' + this.side + ':' + name); if (C3.log.length > 200) C3.log.shift();   // for tests and debugging
    const clip = this.spec.clips[name] || (C3.shared[name] && C3.shared[name]);
    let res; const done = new Promise(r => { res = r; }); const evs = {};
    if (!clip) { res(); done.at = () => Promise.resolve(); return done; }
    if (this.cur && this.cur.res) { this.cur.res(); Object.values(this.cur.evs).forEach(e => e.r()); }
    this.prev = this.lastPose ? { pose: this.lastPose } : null; this.fade = 0;
    this.cur = { name, clip, t: 0, res, evs, o }; if (name !== 'faint') this.dead = false;
    done.at = ev => { if (!evs[ev]) { let r; const p = new Promise(x => { r = x; }); evs[ev] = { p, r, fired: false }; } return evs[ev].p; };
    const cur = this.cur; setTimeout(() => { if (this.cur === cur && !cur.ended) { cur.ended = true; res(); Object.values(evs).forEach(e => e.r()); } }, (clip.dur * 3 + 2) * 1000);   // safety net
    return done;
  }
  // Resolve the current clip and its events now (an error, or the battle moving on).
  finish() { const c = this.cur; if (c && !c.ended) { c.ended = true; c.res(); Object.values(c.evs).forEach(e => e.r()); } }
  // One game tick (1/60 s).
  step() {
    const dt = 1 / 60; this.t += dt; const S = this.spec;
    // automatic face behaviour: blinks, occasional glances
    if (--this.nextBlink <= 0 && this.blinkT < 0) { this.blinkT = 0; this.nextBlink = 90 + this.r() * 200; if (this.r() < .2) this.doubleBlink = true; }
    if (this.blinkT >= 0) { this.blinkT += dt; if (this.blinkT > .16) { this.blinkT = this.doubleBlink ? -.08 : -1; this.doubleBlink = false; if (this.blinkT > -1) this.blinkT = -1, this.nextBlink = 8; } }
    if (--this.nextLook <= 0) { this.nextLook = 180 + this.r() * 260; this.gazeTo = [(this.r() - .5) * 1.6, (this.r() - .4) * .8]; if (!this.cur && S.clips.look && this.r() < .45) this.play('look'); }
    for (let i = 0; i < 2; i++) this.gaze[i] += (this.gazeTo[i] - this.gaze[i]) * .08;
    // pose: idle (always) blended with the current clip
    const P = {}; S.idle(this.t, P, this);
    if (this.cur) {
      const c = this.cur, d = c.clip.dur; c.t += dt;
      const Q = {}; c.clip.fn(Math.min(c.t, d), Q, this, c.t / d);
      const w = c.clip.additive ? 1 : ease(clamp(c.t / (c.clip.blendIn || .12), 0, 1)) * (c.t > d && !c.clip.hold ? 1 - clamp((c.t - d) / (c.clip.blendOut || .2), 0, 1) : 1);
      if (c.clip.additive) for (const k in Q) P[k] = (P[k] || 0) + Q[k] * w;
      else { const keys = new Set([...Object.keys(P), ...Object.keys(Q)]); for (const k of keys) P[k] = lerp(P[k] || 0, Q[k] ?? (c.clip.keepIdle ? P[k] || 0 : 0), w); }
      for (const [ev, at] of Object.entries(c.clip.events || {})) { const e = c.evs[ev]; if (c.t >= at) { if (!e) c.evs[ev] = { p: Promise.resolve(), r() {}, fired: true }; else if (!e.fired) { e.fired = true; e.r(); } } }
      if (c.t >= d && !c.ended) { c.ended = true; c.res(); Object.values(c.evs).forEach(e => e.r()); }
      if (c.t > d + (c.clip.blendOut || .2) && !c.clip.hold) this.cur = null;
    }
    // crossfade from the previous pose
    if (this.prev && this.fade < 1) { this.fade = Math.min(1, this.fade + dt / .14); const k = ease(this.fade); const keys = new Set([...Object.keys(P), ...Object.keys(this.prev.pose)]); for (const kk of keys) P[kk] = lerp(this.prev.pose[kk] || 0, P[kk] || 0, k); }
    // face: blink curve and gaze on top of the clip's values
    const bl = this.blinkT >= 0 ? Math.sin(clamp(this.blinkT / .16, 0, 1) * Math.PI) : 0;
    P['face.blink'] = Math.max(P['face.blink'] || 0, bl); P['face.gx'] = (P['face.gx'] || 0) + this.gaze[0]; P['face.gy'] = (P['face.gy'] || 0) + this.gaze[1];
    this.lastPose = P; this.apply(P);
    flameUniforms.uTime.value = G.frameNo / 60; fireTime.value = G.frameNo / 60;
    if (this.M.fx) this.M.fx(this.t, P, this);
  }
  apply(P) {
    for (const j of Object.values(this.J)) { const r = j.userData.rest; if (!r) continue; j.position.copy(r.p); j.rotation.copy(r.r); j.scale.copy(r.s); }
    for (const k in P) {
      const dot = k.lastIndexOf('.'), name = k.slice(0, dot), f = k.slice(dot + 1), j = this.J[name]; if (!j) continue; const v = P[k];
      if (f === 'x' || f === 'y' || f === 'z') j.position[f] += v; else if (f === 'rx') j.rotation.x += v; else if (f === 'ry') j.rotation.y += v; else if (f === 'rz') j.rotation.z += v;
      else if (f === 's') j.scale.multiplyScalar(1 + v); else if (f === 'sy') j.scale.y *= 1 + v; else if (f === 'sx') j.scale.x *= 1 + v; else if (f === 'sz') j.scale.z *= 1 + v;
    }
    // paws: rest target + clip offsets, then IK
    for (const leg of this.M.legs || []) { leg.target.copy(leg.rest); leg.target.x += P['paw.' + leg.id + '.x'] || 0; leg.target.y += P['paw.' + leg.id + '.y'] || 0; leg.target.z += P['paw.' + leg.id + '.z'] || 0; solveLeg(this.root, leg); }
    // flames stay upright (fire rises) however the joint they grow from is turned
    if (!this.upright) { this.upright = []; this.root.traverse(o => { if (o.userData.upright !== undefined) this.upright.push(o); }); }
    if (this.upright.length) { this.root.updateMatrixWorld(true); this.pivot.updateMatrixWorld(true); for (const o of this.upright) { o.parent.getWorldQuaternion(_q); _q.invert(); _q2.setFromEuler(_e.set(0, 0, o.userData.upright)); this.pivot.getWorldQuaternion(_q3); o.quaternion.copy(_q).multiply(_q3).multiply(_q2); } }
    if (this.M.face) this.M.face(P, this);
  }
  // Render into this actor's 2D canvas and return it.
  frame(size = SIZE) {
    const R = gl(); if (!R) return null;
    if (this.canvas.width !== size) { this.canvas.width = this.canvas.height = size; }
    if (R.domElement.width !== size) R.setSize(size, size, false);
    R.render(this.scene, this.cam);
    this.cx.clearRect(0, 0, size, size); this.cx.drawImage(R.domElement, 0, 0); return this.canvas;
  }
}
C3.Actor = Actor;
// Live actors are stepped from the engine's frame clock (not a scene's update), so a clip's promise always finishes even if
// the scene changes underneath; fast battles step twice. The battle adds its actors and clears the set when it ends.
C3.live = new Set();
let looping = false;
C3.watch = a => { C3.live.add(a); if (looping) return; looping = true; (async () => { for (;;) { await G.nextFrame(); const n = G.scene && G.scene.battle && G.battleFast && G.battleFast() ? 2 : 1; for (const x of C3.live) for (let i = 0; i < n; i++) try { x.step(); } catch (e) { if (!x.failed) console.warn('3D actor step failed', x.id, e); x.failed = true; x.finish(); } } })(); };
// Shared fallback clips (a species overrides any of them with its own personality).
C3.shared = {
  enter: { dur: .7, fn(t, P, A, k) { P['root.y'] = -(1 - easeOut(Math.min(1, k * 1.4))) * .15; P['body.sy'] = Math.sin(Math.min(1, k * 1.6) * Math.PI) * .08; } },
};
// A still render for the 2D sprite (menus, party, Dex, overworld): idle pose at t=0, eyes open.
C3.still = (id, back, size = 512) => { const a = new Actor(id, back ? 'back' : 'front'); a.blinkT = -1; a.nextBlink = 1e9; a.nextLook = 1e9; a.step(); const c = a.frame(size); const out = document.createElement('canvas'); out.width = out.height = size; if (c) out.getContext('2d').drawImage(c, 0, 0); return out; };
// White (or any colour) silhouette of a live frame, redrawn each call (frames change every tick, so no cache).
const tintC = document.createElement('canvas'), tintX = tintC.getContext('2d');
C3.tint = (img, colr) => { if (tintC.width !== img.width) { tintC.width = img.width; tintC.height = img.height; } tintX.globalCompositeOperation = 'source-over'; tintX.clearRect(0, 0, tintC.width, tintC.height); tintX.drawImage(img, 0, 0); tintX.globalCompositeOperation = 'source-atop'; tintX.fillStyle = colr; tintX.fillRect(0, 0, tintC.width, tintC.height); return tintC; };
})();
