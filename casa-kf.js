// Render-keyframe test (ranchorelaxo.html?kf[=04-ventanal]). The still render is projected onto the house from the camera it was
// matched to (assets/casa/cameras.json), like a slide projector standing where the photographer stood. At that pose the
// screen shows the render exactly; as the camera moves the image stays glued to walls and furniture (real parallax),
// and it hands over to the live 3D a metre or so later. Surfaces the render never saw keep the 3D.
// The hand-over is a front sweeping through depth, not a dissolve: each pixel is either render or 3D (no double image),
// near things change first, the view through the window right after the room.
import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const A = window.__app, R = window.__review;
const { scene, camera, renderer } = A;
const ID = new URLSearchParams(location.search).get('kf') || '04-ventanal';
const $ = id => document.getElementById(id);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = v => (v = clamp(v), v * v * (3 - 2 * v));

// ── page: our own scroll, nothing else on screen ───────────────────────────────
for (const id of ['content', 'cap', 'screen', 'hint']) $(id)?.remove();
$('scroll').style.height = '700vh';
const css = document.createElement('style');
css.textContent = `@import url('https://fonts.googleapis.com/css2?family=Jost:wght@200;300;600&display=swap');
#kfcopy{position:fixed;z-index:4;right:clamp(20px,5vw,72px);bottom:clamp(40px,9vh,110px);width:min(520px,calc(100vw - 40px));font:300 clamp(16px,1.4vw,21px)/1.55 Jost,system-ui;color:#e8eaed;opacity:0;pointer-events:none;text-shadow:0 1px 16px rgba(0,0,0,.6)}
#kfcopy .l{font:600 13px/1 Jost;letter-spacing:.14em;text-transform:uppercase;color:#00f5a0;margin:0 0 14px}
#kfcopy .t{font:300 clamp(40px,5.6vw,88px)/1 Jost;letter-spacing:-.025em;margin:0 0 18px}
#kfdev{position:fixed;z-index:5;left:10px;bottom:10px;font:12px ui-monospace,Menlo,monospace;color:#9fb;background:rgba(0,0,0,.6);padding:4px 8px;border-radius:4px}
@media(max-width:760px){#kfcopy{left:20px;right:auto}}`;
document.head.appendChild(css);
const copy = document.createElement('div'); copy.id = 'kfcopy';
copy.innerHTML = '<p class="l">_ Ground floor</p><h2 class="t">The window<br>to the range</h2><p>Full-height glazing frames the mountains and pulls the afternoon light deep into the room.</p>';
document.body.appendChild(copy);
const dev = document.createElement('div'); dev.id = 'kfdev'; document.body.appendChild(dev);

// ── keyframe data ──────────────────────────────────────────────────────────────
const [cams, man] = await Promise.all(['assets/casa/cameras.json', 'assets/casa/manifest.json'].map(u => fetch(u, { cache: 'no-store' }).then(r => r.json())));
const KF = cams[ID], aspect = man[ID].aspect;
const mobile = Math.min(innerWidth, innerHeight) < 700;
const img = await new THREE.TextureLoader().loadAsync(`assets/casa/${ID}${mobile ? '-m' : ''}.webp`);
img.colorSpace = THREE.NoColorSpace;          // sampled as stored: it is mixed into the already-encoded final image
img.minFilter = THREE.LinearFilter; img.generateMipmaps = false;

// the projector = the camera the render was matched to
const P0 = new THREE.Vector3(...KF.p), Q0 = new THREE.Vector3(...KF.q);
const proj = new THREE.PerspectiveCamera(KF.fov, aspect, 0.05, 80);
proj.position.copy(P0); proj.lookAt(Q0); proj.updateMatrixWorld(); proj.updateProjectionMatrix();

// vertical FOV that shows the render "cover"-fitted in this viewport (wider screen → cropped top/bottom)
const coverFov = () => { const va = innerWidth / innerHeight; return va > aspect ? 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(KF.fov) / 2) * aspect / va) * 180 / Math.PI : KF.fov; };

// ── path: come in sideways, hold (small drift = parallax), leave towards the glazing ──
const dir = Q0.clone().sub(P0).setY(0).normalize(), up = new THREE.Vector3(0, 1, 0), right = new THREE.Vector3().crossVectors(dir, up).normalize();
const at = (dx, dz, dy = 0) => P0.clone().addScaledVector(right, dx).addScaledVector(dir, dz).add(new THREE.Vector3(0, dy, 0));
const look = (dx, dz, dy = 0) => Q0.clone().addScaledVector(right, dx).addScaledVector(dir, dz).add(new THREE.Vector3(0, dy, 0));
// scroll s 0…1 → [camera, target]; phases: 0–.32 arrive · .32–.68 hold · .68–1 leave
const ARRIVE = [at(-1.6, -0.5, 0.05), look(-0.6, 0)], HOLD_END = [at(0.18, 0.3, 0.02), look(0.1, 0.3)], LEAVE = [at(0.5, 1.9, 0.1), look(0.2, 2.4, 0.15)];
const lerp3 = (a, b, u) => a.clone().lerp(b, u);
function pose(s) {
  if (s < 0.32) { const u = smooth(s / 0.32); return [lerp3(ARRIVE[0], P0, u), lerp3(ARRIVE[1], Q0, u), u]; }
  if (s < 0.68) { const u = smooth((s - 0.32) / 0.36); return [lerp3(P0, HOLD_END[0], u), lerp3(Q0, HOLD_END[1], u), 1]; }
  const u = smooth((s - 0.68) / 0.32); return [lerp3(HOLD_END[0], LEAVE[0], u), lerp3(HOLD_END[1], LEAVE[1], u), 1];
}
// how much of the render is on screen: fades in over the last stretch of the arrival, out over the first metre of the leave
const amount = s => Math.min(smooth((s - 0.12) / 0.18), 1 - smooth((s - 0.72) / 0.2));

// ── depth targets: the live camera's view (every frame while projecting) and the projector's view (once) ──
const depthOnly = new THREE.MeshBasicMaterial({ colorWrite: false });
const mkDepthRT = (w, h) => { const rt = new THREE.WebGLRenderTarget(w, h); rt.depthTexture = new THREE.DepthTexture(w, h, THREE.UnsignedIntType); return rt; };
const dpr = () => renderer.getPixelRatio();
let mainRT = mkDepthRT(innerWidth * dpr(), innerHeight * dpr());
const projRT = mkDepthRT(2048, Math.round(2048 / aspect));
// glass, the sky dome, flares: not surfaces to project on. Everything outside the house goes too, so whatever the render shows
// through a window (its own, AI-painted landscape) is treated as far away and stays put behind the glass.
const OUTSIDE = /^(terreno|paisaje|proxies|deck\w*|techodeck|techogarage|svc\d|lucesext|solar|chapas|chapa-\w|piedras)$/;
const outside = Object.entries(A.G).filter(([k]) => OUTSIDE.test(k)).map(([, g]) => g);
// checked at pass time: the interior fades in through opacity, so a wall can look "transparent" for a moment
const seeThrough = o => o === A.skyDome || o.isSprite || o.isPoints || o.isLine || (o.isMesh && (Array.isArray(o.material) ? o.material : [o.material])
  .some(x => /glass|vidrio|translucent/i.test(x?.name || '') || (x?.transparent && x.opacity < 0.98 && x.opacity > 0.02)));
function depthPass(cam, rt) {
  const skip = [...outside]; scene.traverse(o => { if (o.visible && seeThrough(o)) skip.push(o); });
  const vis = skip.map(o => o.visible); skip.forEach(o => o.visible = false);
  const auto = renderer.shadowMap.autoUpdate; renderer.shadowMap.autoUpdate = false;
  scene.overrideMaterial = depthOnly; renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, cam); renderer.setRenderTarget(null); scene.overrideMaterial = null;
  renderer.shadowMap.autoUpdate = auto; skip.forEach((o, i) => o.visible = vis[i]);
}

// ── the projection pass (last in the chain, so it sees the final graded image) ──
const pass = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, tImg: { value: img }, tDepth: { value: null }, tPDepth: { value: projRT.depthTexture },
    invProjView: { value: new THREE.Matrix4() }, pProjView: { value: new THREE.Matrix4() }, camPos: { value: new THREE.Vector3() }, pPos: { value: P0 },
    k: { value: 0 }, reach: { value: 14 }, band: { value: 0.6 }, pNear: { value: proj.near }, pFar: { value: proj.far } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
  fragmentShader: `
    uniform sampler2D tDiffuse, tImg, tDepth, tPDepth; uniform mat4 invProjView, pProjView; uniform vec3 camPos, pPos; uniform float k, reach, band, pNear, pFar;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    float linZ(float d){ float z = d * 2. - 1.; return 2. * pNear * pFar / (pFar + pNear - z * (pFar - pNear)); }
    void main(){
      vec4 base = texture2D(tDiffuse, vUv);
      if (k <= 0.001) { gl_FragColor = base; return; }
      float d = texture2D(tDepth, vUv).x; bool far = d > 0.99999;
      vec4 w = invProjView * vec4(vUv * 2. - 1., d * 2. - 1., 1.); w /= w.w;
      vec3 world = far ? pPos + normalize(w.xyz - camPos) * 1000. : w.xyz;     // sky / landscape: a direction, not a place
      vec4 pc = pProjView * vec4(world, 1.);
      if (pc.w <= 0.) { gl_FragColor = base; return; }
      vec3 pn = pc.xyz / pc.w; vec2 puv = pn.xy * .5 + .5;
      float e = .015, inside = smoothstep(0., e, puv.x) * smoothstep(0., e, 1. - puv.x) * smoothstep(0., e, puv.y) * smoothstep(0., e, 1. - puv.y);
      float pd = texture2D(tPDepth, clamp(puv, 0., 1.)).x, vis;
      if (far) vis = pd > 0.99999 ? 1. : 0.;
      else { float a = linZ(pn.z * .5 + .5), b = linZ(pd), tol = .025 + .015 * b; vis = 1. - smoothstep(tol, tol * 3., a - b); }   // hidden from the projector → keep the 3D
      // depth front: at k = 1 everything is render, at k = 0 nothing; in between, what lies beyond the front is render
      float dist = far ? 9. : length(world - camPos), front = (1. - k) * (1. - k) * reach;   // the view outside changes just after the room: closer up, more of it shows than the render has
      float grain = (hash(floor(gl_FragCoord.xy / 3.)) - .5) * band * .35;
      float r = k >= .999 ? 1. : smoothstep(front - band, front + band, dist + grain);
      vec3 im = texture2D(tImg, puv).rgb;
      gl_FragColor = vec4(mix(base.rgb, im, r * inside * vis), base.a);
    }`,
});
A.composer.addPass(pass);

// ── drive it ───────────────────────────────────────────────────────────────────
R.free = true;                                                            // ranchorelaxo.html stops driving the camera
A.setT(A.tOf('03-cocina-living'));                                                   // house finished, interior on, daylight
let frames = 0, projReady = 0;
addEventListener('resize', () => { mainRT.dispose(); mainRT = mkDepthRT(innerWidth * dpr(), innerHeight * dpr()); });
R.beforeRender = () => {
  if (++frames > 30 && projReady < 2) { depthPass(proj, projRT); projReady++; }   // once the interior has faded in and the doors have settled
  const max = document.documentElement.scrollHeight - innerHeight, s = clamp(scrollY / max);
  const [p, q] = pose(s), k = amount(s);
  camera.position.copy(p); camera.fov = coverFov(); camera.aspect = innerWidth / innerHeight; camera.lookAt(q); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  pass.uniforms.k.value = k;
  if (k > 0.001) {
    depthPass(camera, mainRT);
    pass.uniforms.tDepth.value = mainRT.depthTexture;
    pass.uniforms.invProjView.value.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).invert();
    pass.uniforms.pProjView.value.multiplyMatrices(proj.projectionMatrix, proj.matrixWorldInverse);
    pass.uniforms.camPos.value.copy(camera.position);
  }
  const c = smooth((s - 0.36) / 0.06) * (1 - smooth((s - 0.62) / 0.06));
  copy.style.opacity = c; copy.style.transform = `translateY(${(1 - c) * 24}px)`;
  dev.textContent = `${ID}  s ${s.toFixed(2)}  render ${(k * 100).toFixed(0)}%`;
};
