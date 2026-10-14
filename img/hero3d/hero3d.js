// defranez.com — Hero 3D (vidrio). three.js + GSAP ScrollTrigger.
// Valores fijos en DEF / LOOKS. Requiere el import map de three y GSAP+ScrollTrigger cargados antes.
(async () => {
// dynamic imports resolve through the page's import map
const THREE = await import('three');
const { SVGLoader } = await import('three/addons/loaders/SVGLoader.js');

const LOOKS = {
  clear:    { label: 'Cristal',    tint: '#ffffff', clarity: 10,  thick: 0.7, ior: 1.5,  dispersion: 3,  roughness: 0.05, reflections: 0.85, mint: 0.7, sheen: 0.3 },
  prism:    { label: 'Prisma',     tint: '#ffffff', clarity: 10,  thick: 1.6, ior: 1.85, dispersion: 10, roughness: 0.04, reflections: 0.95, mint: 0.9, sheen: 0.25 },
  mint:     { label: 'Menta',      tint: '#7dffd2', clarity: 3,   thick: 0.9, ior: 1.55, dispersion: 4,  roughness: 0.02, reflections: 1.0, mint: 1.4, sheen: 0.3 },
  frosted:  { label: 'Esmerilado', tint: '#e6fff6', clarity: 6,   thick: 0.8, ior: 1.45, dispersion: 1,  roughness: 0.25, reflections: 0.9, mint: 1.0, sheen: 0.7 },
  obsidian: { label: 'Obsidiana',  tint: '#04110d', clarity: 0.55,thick: 0.85,ior: 1.6,  dispersion: 5,  roughness: 0.04, reflections: 1.6, mint: 1.2, sheen: 0 }
};
const DEF = Object.assign({ composition:'center', look:'clear', depth:0.38, bevel:0.03, textOpacity:0.85, float:1, hole:0, spin:1, track:220, bulge:1.4, glow:1, soft:0.5 }, LOOKS.clear);
delete DEF.label;
const P = Object.assign({}, DEF);

const canvas = document.getElementById('hero3dCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#080a0c');
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.set(0, 0, 10);
const BACK_Z = -6;

// Environment: dark studio with white softboxes + mint/cyan strips -> obsidian reflections
const pmrem = new THREE.PMREMGenerator(renderer);
function updateEnv() {
  const s = new THREE.Scene();
  s.background = new THREE.Color('#030405');
  const g = new THREE.PlaneGeometry(1, 1);
  const add = (hex, k, w, h, pos) => {
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), side: THREE.DoubleSide }));
    m.scale.set(w, h, 1); m.position.set(...pos); m.lookAt(0, 0, 0); s.add(m);
  };
  add('#ffffff', 2.4, 10, 1.6, [0, 7, 3]);
  add('#ffffff', 1, 1.4, 9, [-8, 0, 2]);
  add('#00f5a0', 2.6 * P.mint, 2.2, 11, [8, 0, 1]);
  add('#00c8ff', 1.6 * P.mint, 11, 1.6, [0, -7, 2]);
  add('#00f5a0', 1.2 * P.mint, 7, 7, [0, 0, -9]);
  if (P.sheen > 0) { add('#ffffff', 1.2 * P.sheen, 14, 4, [0, 9, 4]); add('#dfe9ff', 0.6 * P.sheen, 6, 10, [-9, 2, -2]); }
  const rt = pmrem.fromScene(s, 0.04);
  if (scene.environment) scene.environment.dispose();
  scene.environment = rt.texture;
}

// Backdrop: giant name drawn to a canvas, rendered as an opaque plane so the glass refracts it
const bd = document.createElement('canvas');
const bdx = bd.getContext('2d');
const bdTex = new THREE.CanvasTexture(bd);
bdTex.colorSpace = THREE.SRGBColorSpace;
const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: bdTex, toneMapped: false }));
backdrop.position.z = BACK_Z;
scene.add(backdrop);

// El "stage" es el .hero3d-stick (100lvh), no la ventana: en celular innerHeight cambia al
// esconderse la barra de URL y estiraba/aplastaba el canvas. offsetTop ignora transforms de GSAP.
const stick = document.querySelector('.hero3d-stick');
const copyEl = document.querySelector('.hero3d-copy');
const stage = () => ({ w: stick.clientWidth || innerWidth, h: stick.clientHeight || innerHeight });
const copyTop = () => copyEl.offsetTop;
// vertical: escala del logo, y el borde superior (px) que ocupa, para apoyar el nombre encima
const portraitScale = aspect => Math.min(0.95, aspect * 1.7);
const logoPxH = (w, h) => 3.2 * portraitScale(w / h) * h / (2 * 10 * Math.tan(Math.PI / 180 * 17.5)); // camara z=10, fov 35
const logoTopPx = (w, h) => (70 + copyTop()) / 2 - logoPxH(w, h) / 2;

function drawBackdrop() {
  const { w, h } = stage(), r = Math.min(devicePixelRatio, 2);
  bd.width = Math.round(w * r); bd.height = Math.round(h * r);
  bdx.setTransform(r, 0, 0, r, 0, 0);
  bdx.fillStyle = '#080a0c'; bdx.fillRect(0, 0, w, h);
  bdx.strokeStyle = 'rgba(255,255,255,0.03)'; bdx.lineWidth = 1;
  bdx.beginPath();
  for (let x = 0.5; x < w; x += 80) { bdx.moveTo(x, 0); bdx.lineTo(x, h); }
  for (let y = 0.5; y < h; y += 80) { bdx.moveTo(0, y); bdx.lineTo(w, y); }
  bdx.stroke();
  if (P.glow > 0) {
    const R = Math.max(w, h) * 0.42, gy = (70 + copyTop()) / 2;
    const g = bdx.createRadialGradient(w / 2, gy, 0, w / 2, gy, R);
    g.addColorStop(0, `rgba(0,245,160,${0.32 * P.glow})`); g.addColorStop(0.45, `rgba(0,200,255,${0.12 * P.glow})`); g.addColorStop(1, 'rgba(0,200,255,0)');
    bdx.fillStyle = g; bdx.fillRect(0, 0, w, h);
  }
  // vertical/angosto: "EZE / DEFRAN" arriba del logo (que queda centrado); apaisado: nombre completo en dos lineas
  const portrait = w / h < 0.9;
  const lines = portrait ? ['EZE', 'DEFRAN'] : ['EZEQUIEL', 'DE FRANCISCO'];
  bdx.font = '800 100px Syne';
  if ('letterSpacing' in bdx) bdx.letterSpacing = '-3px';
  const widest = Math.max(...lines.map(l => bdx.measureText(l).width));
  const top = 70 + (portrait ? 16 : 24), bottom = Math.max(top + 80, copyTop() - 24);
  const band = bottom - top, cy = top + band / 2;
  const step = portrait ? 0.9 : 0.94;
  let size = Math.min(100 * (w * (portrait ? 0.9 : 0.94)) / widest, band / (lines.length * step + 0.16));
  // vertical: el tamaño sale solo del ancho (llena la pantalla) y el nombre se apoya sobre el logo:
  // DEFRAN queda tapado ~21% de la altura del logo por debajo de su borde superior, EZE justo arriba
  let nameY = null;
  if (portrait) {
    size = 100 * (w * 0.9) / widest;
    const dc = logoTopPx(w, h) + 0.21 * logoPxH(w, h);
    size = Math.min(size, (dc - top) / (step + 0.5));
    nameY = i => dc + (i - (lines.length - 1)) * size * step;
  }
  bdx.font = `800 ${size}px Syne`;
  if ('letterSpacing' in bdx) bdx.letterSpacing = `${-0.03 * size}px`;
  bdx.textAlign = 'center'; bdx.textBaseline = 'middle';
  bdx.globalAlpha = P.textOpacity;
  bdx.fillStyle = '#e8eaed';
  lines.forEach((l, i) => bdx.fillText(l, w / 2, nameY ? nameY(i) : cy + (i - (lines.length - 1) / 2) * size * step));
  bdx.globalAlpha = 1;
  // el canvas cambia de tamaño en cada resize pero WebGL2 reserva la textura con el tamaño de la
  // primera subida: sin dispose() solo se actualiza un rectangulo viejo (corte vertical + basura)
  bdTex.dispose();
  bdTex.needsUpdate = true;
}

// Obsidian glass
const glass = new THREE.MeshPhysicalMaterial({
  color: '#ffffff', metalness: 0, transmission: 1, thickness: 1,
  clearcoat: 1, clearcoatRoughness: 0.12, specularIntensity: 0.8
});
function applyGlass() {
  // softness samples blurrier PMREM mips via roughness (no clipped sigma)
  glass.roughness = Math.min(1, P.roughness + P.soft * 0.12); glass.ior = P.ior; glass.dispersion = P.dispersion;
  glass.clearcoatRoughness = 0.04 + P.soft * 0.45;
  glass.attenuationColor.set(P.tint); glass.attenuationDistance = P.clarity;
  glass.envMapIntensity = P.reflections; glass.thickness = P.thick;
  glass.normalScale.set(P.bulge, P.bulge);
}

const logo = new THREE.Group();
scene.add(logo);
let mesh = null, shapes = null;
const SVG_H = 890.917, LOGO_H = 3.2;

function flipWinding(g) {
  for (const a of Object.values(g.attributes)) {
    const n = a.itemSize, arr = a.array;
    for (let i = 0; i < a.count; i += 3) for (let k = 0; k < n; k++) {
      const p = (i + 1) * n + k, q = (i + 2) * n + k, t = arr[p]; arr[p] = arr[q]; arr[q] = t;
    }
    a.needsUpdate = true;
  }
}
function buildLogo() {
  if (!shapes) return;
  const s = LOGO_H / SVG_H;
  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth: P.depth / s, curveSegments: 24,
    bevelEnabled: P.bevel > 0, bevelThickness: P.bevel / s, bevelSize: (P.bevel * 0.6) / s, bevelSegments: 5
  });
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  svgBox = { cx: (bb.min.x + bb.max.x) / 2, cy: (bb.min.y + bb.max.y) / 2 };
  geo.center();
  geo.scale(s, s, s);
  geo.rotateX(Math.PI); // flip SVG y-down without a negative scale (keeps winding + normals valid)
  if (mesh) { mesh.geometry.dispose(); logo.remove(mesh); }
  mesh = new THREE.Mesh(geo, glass);
  logo.add(mesh);
  pivotOnHole();
}

// Find the logo's "huecos": rasterise the outline, distance-transform the empty
// pixels, keep local maxima that are enclosed by the mark (not open background).
let holes = [], svgBox = null;
function findHoles(d) {
  const W = 360, k = W / 817.923, H = Math.round(890.917 * k);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.setTransform(k, 0, 0, k, 0, 0); x.fill(new Path2D(d));
  const a = x.getImageData(0, 0, W, H).data;
  const INF = 1e9, dist = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) dist[i] = a[i * 4 + 3] > 40 ? 0 : INF;
  const D = 1, DD = Math.SQRT2;
  for (let y = 0; y < H; y++) for (let x2 = 0; x2 < W; x2++) {
    const i = y * W + x2; let v = dist[i]; if (!v) continue;
    if (x2 > 0) v = Math.min(v, dist[i - 1] + D);
    if (y > 0) { v = Math.min(v, dist[i - W] + D); if (x2 > 0) v = Math.min(v, dist[i - W - 1] + DD); if (x2 < W - 1) v = Math.min(v, dist[i - W + 1] + DD); }
    dist[i] = v;
  }
  for (let y = H - 1; y >= 0; y--) for (let x2 = W - 1; x2 >= 0; x2--) {
    const i = y * W + x2; let v = dist[i]; if (!v) continue;
    if (x2 < W - 1) v = Math.min(v, dist[i + 1] + D);
    if (y < H - 1) { v = Math.min(v, dist[i + W] + D); if (x2 < W - 1) v = Math.min(v, dist[i + W + 1] + DD); if (x2 > 0) v = Math.min(v, dist[i + W - 1] + DD); }
    dist[i] = v;
  }
  // enclosed = filled pixels exist in at least 3 of 4 directions
  const enclosed = (px, py) => {
    let n = 0;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      let qx = px, qy = py;
      while (qx >= 0 && qy >= 0 && qx < W && qy < H) { if (!dist[qy * W + qx]) { n++; break; } qx += dx; qy += dy; }
    }
    return n >= 3;
  };
  const cand = [];
  for (let y = 4; y < H - 4; y += 2) for (let x2 = 4; x2 < W - 4; x2 += 2) {
    const v = dist[y * W + x2]; if (v < 7) continue;
    let max = true;
    for (let dy = -4; dy <= 4 && max; dy += 2) for (let dx = -4; dx <= 4; dx += 2) if (dist[(y + dy) * W + x2 + dx] > v) { max = false; break; }
    if (max && enclosed(x2, y)) cand.push({ x: x2 / k, y: y / k, r: v / k });
  }
  const cx = W / 2 / k, cy = H / 2 / k, diag = Math.hypot(cx, cy);
  const score = c2 => c2.r * (1.4 - Math.hypot(c2.x - cx, c2.y - cy) / diag);
  cand.sort((p, q) => score(q) - score(p));
  const out = [];
  for (const c2 of cand) if (out.every(o => Math.hypot(o.x - c2.x, o.y - c2.y) > (o.r + c2.r) * 1.1)) out.push(c2);
  return out.slice(0, 5);
}
function holeLocal() {
  const hl = holes[Math.min(P.hole, holes.length - 1)];
  if (!hl || !svgBox) return { x: 0, y: 0 };
  const s = LOGO_H / SVG_H;
  return { x: (hl.x - svgBox.cx) * s, y: -(hl.y - svgBox.cy) * s };
}

// Pillow normal map: flat extrusion caps don't bend light, so we fake an inflated
// lens surface from the inside-distance field of the mark. Caps use raw SVG coords as UVs.
function makePillow(d) {
  const W = 640, k = W / 817.923, H = Math.round(890.917 * k), R = 13;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'); x.setTransform(k, 0, 0, k, 0, 0); x.fill(new Path2D(d));
  const a = x.getImageData(0, 0, W, H).data;
  const dist = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) dist[i] = a[i * 4 + 3] > 127 ? 1e9 : 0;
  const S = Math.SQRT2;
  for (let y = 0; y < H; y++) for (let q = 0; q < W; q++) { const i = y * W + q; let v = dist[i]; if (!v) continue;
    if (q > 0) v = Math.min(v, dist[i - 1] + 1);
    if (y > 0) { v = Math.min(v, dist[i - W] + 1); if (q > 0) v = Math.min(v, dist[i - W - 1] + S); if (q < W - 1) v = Math.min(v, dist[i - W + 1] + S); }
    dist[i] = v; }
  for (let y = H - 1; y >= 0; y--) for (let q = W - 1; q >= 0; q--) { const i = y * W + q; let v = dist[i]; if (!v) continue;
    if (q < W - 1) v = Math.min(v, dist[i + 1] + 1);
    if (y < H - 1) { v = Math.min(v, dist[i + W] + 1); if (q < W - 1) v = Math.min(v, dist[i + W + 1] + S); if (q > 0) v = Math.min(v, dist[i + W - 1] + S); }
    dist[i] = v; }
  const ht = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) { const t = Math.min(dist[i] / R, 1); ht[i] = Math.sqrt(1 - (1 - t) * (1 - t)); }
  const tmp = new Float32Array(W * H);
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < H; y++) for (let q = 0; q < W; q++) { let s2 = 0, n2 = 0; for (let k2 = -2; k2 <= 2; k2++) { const qq = q + k2; if (qq >= 0 && qq < W) { s2 += ht[y * W + qq]; n2++; } } tmp[y * W + q] = s2 / n2; }
    for (let y = 0; y < H; y++) for (let q = 0; q < W; q++) { let s2 = 0, n2 = 0; for (let k2 = -2; k2 <= 2; k2++) { const yy = y + k2; if (yy >= 0 && yy < H) { s2 += tmp[yy * W + q]; n2++; } } ht[y * W + q] = s2 / n2; }
  }
  const img = x.createImageData(W, H), o = img.data;
  for (let y = 0; y < H; y++) for (let q = 0; q < W; q++) {
    const i = y * W + q;
    const dx = (ht[y * W + Math.min(W - 1, q + 1)] - ht[y * W + Math.max(0, q - 1)]) * 4;
    const dy = (ht[Math.min(H - 1, y + 1) * W + q] - ht[Math.max(0, y - 1) * W + q]) * 4;
    const n = 1 / Math.hypot(dx, dy, 1);
    o[i * 4] = (-dx * n * 0.5 + 0.5) * 255; o[i * 4 + 1] = (dy * n * 0.5 + 0.5) * 255; o[i * 4 + 2] = (n * 0.5 + 0.5) * 255; o[i * 4 + 3] = 255;
  }
  x.setTransform(1, 0, 0, 1, 0, 0); x.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.flipY = false; tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(1 / 817.923, 1 / 890.917);
  glass.normalMap = tex; glass.needsUpdate = true; applyGlass();
}
function pivotOnHole() { if (mesh) mesh.position.set(0, 0, 0); }

// Composition targets
const base = { x: 0, y: 0, s: 1 };
function layout() {
  const { w, h } = stage();
  const aspect = w / h;
  const hH = camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const hW = hH * aspect;
  const fit = Math.min(1, aspect * 1.25);
  if (P.composition === 'right' && aspect > 1) Object.assign(base, { x: hW * 0.42, y: 0, s: 1.05 });
  else if (P.composition === 'giant') Object.assign(base, { x: hW * (aspect > 1 ? 0.38 : 0.25), y: -hH * 0.2, s: 2.7 * fit });
  else {
    const ct = copyTop();
    const midPx = (70 + ct) / 2;
    const y = (0.5 - midPx / h) * 2 * hH;
    const avail = Math.max(0.4, (ct - 70) / h);
    // vertical: logo grande, centrado en el area libre
    const s = aspect < 0.9 ? portraitScale(aspect) : 1.1 * fit * Math.min(1, avail / 0.62);
    Object.assign(base, { x: 0, y, s });
  }
}

function resize() {
  const { w, h } = stage();
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  const dist = camera.position.z - BACK_Z;
  const vh = 2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  backdrop.scale.set(vh * camera.aspect, vh, 1);
  drawBackdrop(); layout();
}

// Scroll: while #hero's tall track scrolls, the camera dives through a hole in the logo;
// once through, About rises over the (now quiet) canvas.
let prog = 0, eased = 0;
gsap.registerPlugin(ScrollTrigger);
const hero = document.getElementById('main');
// P.track = vh de scroll con el hero fijo y la camara en movimiento; +100vh extra donde About lo tapa como cortina
function applyTrack() { hero.style.height = (P.track + 100) + 'vh'; }
applyTrack();
ScrollTrigger.create({ trigger: '#main', start: 'top top', end: () => '+=' + ((P.track - 100) / 100) * stage().h, scrub: true, invalidateOnRefresh: true, onUpdate: s => { prog = s.progress; } });
gsap.to('.hero3d-copy-inner', { y: -24, opacity: 0, ease: 'none', scrollTrigger: { trigger: '#main', start: 'top top', end: '+=35%', scrub: true } });
gsap.to('.scroll-hint', { opacity: 0, ease: 'none', scrollTrigger: { trigger: '#main', start: 'top top', end: '+=15%', scrub: true } });
const smooth = x => x * x * (3 - 2 * x);

const clock = new THREE.Clock();
function tick() {
  requestAnimationFrame(tick);
  if (scrollY > hero.offsetTop + hero.offsetHeight) return;
  const t = clock.getElapsedTime();
  eased += (prog - eased) * 0.08;
  const p = Math.min(1, eased / 0.82);            // dive finishes just before About arrives
  const aim = smooth(Math.min(1, p / 0.45));       // first: centre the hole and square up
  const dive = Math.pow(p, 2.2);                   // then: accelerate through it
  const calm = 1 - aim, f = P.float * calm;
  const sc = base.s;
  logo.scale.setScalar(sc);
  // whole turns on Y so the logo faces the camera again as we enter its centre
  const spin = smooth(p) * Math.PI * 2 * Math.round(P.spin);
  logo.rotation.set(Math.sin(t * 0.6) * 0.05 * f, Math.sin(t * 0.42) * 0.2 * f + spin, Math.sin(t * 0.5) * 0.02 * f);
  glass.dispersion = P.dispersion * (1 - smooth(Math.min(1, dive * 2.5)));
  logo.position.set(base.x * (1 - aim), base.y * (1 - aim) + Math.sin(t * 0.9) * 0.07 * f, dive * (camera.position.z + 1.5));
  backdrop.material.color.setScalar(1 - 0.75 * smooth(Math.min(1, eased)));
  renderer.render(scene, camera);
}

// Boot
updateEnv(); applyGlass(); resize();
addEventListener('resize', () => { resize(); ScrollTrigger.refresh(); });
document.fonts.load('800 100px Syne').then(drawBackdrop);
fetch('img/hero3d/logo-vector.svg').then(r => r.text()).then(txt => {
  const d = new DOMParser().parseFromString(txt, 'image/svg+xml').querySelector('path').getAttribute('d');
  const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 817.923 890.917"><path d="${d}"/></svg>`);
  shapes = data.paths.flatMap(p => SVGLoader.createShapes(p));
  holes = findHoles(d);
  makePillow(d);
  buildLogo();
});
tick();
})();
