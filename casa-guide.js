// Guide video for an AI video-to-video pass between two render keyframes (open ranchorelaxo.html?review&lamps=all, then in the console:
//   (await import('./casa-guide.js')).renderGuide('03-cocina-living', '04-ventanal')
// The camera travels from one calibrated pose (assets/casa/cameras.json) to the other. Each frame is saved twice through
// review-server.mjs → review/guide/<name>/: the 3D as seen (rgb, to judge the move) and a depth map (depth: near = white),
// which is what the video model follows. First and last frames are framed like the renders cropped to the video's aspect.
import * as THREE from 'three';

const A = window.__app, R = window.__review;
const { scene, camera, renderer } = A;
const rad = THREE.MathUtils.degToRad, deg = THREE.MathUtils.radToDeg;
const smooth = v => v * v * (3 - 2 * v);

const depthMat = new THREE.ShaderMaterial({
  uniforms: { near: { value: 0.2 }, far: { value: 18 } },   // the whole house reads as surfaces; only what is outside, beyond the glass, is black
  vertexShader: 'varying float vZ; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); vZ = -mv.z; gl_Position = projectionMatrix * mv; }',
  fragmentShader: 'uniform float near, far; varying float vZ; void main(){ gl_FragColor = vec4(vec3(1. - clamp((vZ - near) / (far - near), 0., 1.)), 1.); }',
  side: THREE.DoubleSide,
});
const seeThrough = o => o === A.skyDome || o.isSprite || o.isPoints || o.isLine || (o.isMesh && (Array.isArray(o.material) ? o.material : [o.material])
  .some(x => /glass|vidrio|translucent/i.test(x?.name || '') || (x?.transparent && x.opacity < 0.98 && x.opacity > 0.02)));
// outside the house is left out of the depth: seen through a window it stays black (= far), so windows read as windows
const OUTSIDE = /^(terreno|paisaje|proxies|deck\w*|techodeck|techogarage|svc\d|lucesext|solar|chapas|chapa-\w|piedras|base)$/;
// depth is blurred near both ends so the model leans on the two renders there instead of on the 3D's own furniture
const blurred = (src, px) => { if (px < 0.3) return src.toDataURL('image/png');
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; const g = c.getContext('2d');
  g.filter = `blur(${px}px)`; g.drawImage(src, 0, 0); return c.toDataURL('image/png'); };
const frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

async function save(name, kind, i, data, ext = 'png') {
  const r = await fetch(`/api/frame?name=${name}&kind=${kind}&i=${i}&ext=${ext}`, { method: 'POST', body: data });
  if (!r.ok) throw new Error('frame not saved: ' + kind + ' ' + i);
}

// hide: boxes [x0, y0, z0, x1, y1, z1]; meshes whose centre falls inside are left out of the guide (e.g. a 3D lamp that is not the render's)
export async function renderGuide(fromId, toId, { frames = 121, w = 853, h = 480, via = null, fovIn = 0.4, blurStart = [20, 6], blurEnd = [40, 9], hide = [],
  name = `${fromId.slice(0, 2)}-${toId.slice(0, 2)}` } = {}) {
  const cams = await (await fetch('assets/casa/cameras.json', { cache: 'no-store' })).json();
  const man = await (await fetch('assets/casa/manifest.json', { cache: 'no-store' })).json();
  const va = w / h, cover = (fov, ar) => (va > ar ? deg(2 * Math.atan(Math.tan(rad(fov) / 2) * ar / va)) : fov);   // render "cover"-cropped to the video
  const end = id => { const c = cams[id], o = new THREE.PerspectiveCamera(); o.position.set(...c.p); o.lookAt(...c.q);   // a camera: lookAt aims -z (a plain Object3D aims +z)
    return { p: o.position.clone(), q: o.quaternion.clone(), fov: cover(c.fov, man[id].aspect) }; };
  const a = end(fromId), b = end(toId);
  const mid = via ? new THREE.Vector3(...via) : a.p.clone().lerp(b.p, 0.5);    // optional waypoint to steer around furniture
  const curve = new THREE.QuadraticBezierCurve3(a.p, mid, b.p);

  const gone = []; if (hide.length) scene.traverse(o => { if (!o.isMesh || o === A.skyDome) return;
    const c = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
    if (hide.some(([x0, y0, z0, x1, y1, z1]) => c.x > x0 && c.x < x1 && c.y > y0 && c.y < y1 && c.z > z0 && c.z < z1)) gone.push(o); });
  // page: finished house, daylight, the 3D drawn into a w×h box, nothing on top
  R.free = true; A.setT(A.tOf('03-cocina-living'));
  for (const id of ['rv', 'rvnotes', 'cap', 'hint', 'count', 'back', 'bar', 'prog']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; }
  const stage = document.getElementById('stage'); stage.style.cssText = `inset:auto;left:0;top:0;width:${w}px;height:${h}px`;
  renderer.domElement.style.width = renderer.domElement.style.height = '';
  A.resize(w, h);
  await frame(); await frame();

  for (let i = 0; i < frames; i++) {
    gone.forEach(o => o.visible = false);             // ranchorelaxo.html may switch pieces back on as the frame advances
    const u = smooth(i / (frames - 1));
    const f = Math.min(1, u / fovIn), lens = a.fov > b.fov ? smooth(f) : u;   // a wide start lens narrows early, so its curvature doesn't linger
    const pose = () => { camera.position.copy(curve.getPoint(u)); camera.quaternion.copy(a.q).slerp(b.q, u);
      camera.fov = a.fov + (b.fov - a.fov) * lens; camera.updateProjectionMatrix(); camera.updateMatrixWorld(); };
    pose(); await frame();                            // let ranchorelaxo.html update doors and lamps for this camera position
    pose();                                           // again: the review tool's orbit controls re-aim the camera every frame
    A.render(); const rgb = renderer.domElement.toDataURL('image/png');   // both captures before any await: the controls move the camera between frames
    const hidden = Object.entries(A.G).filter(([k, g]) => OUTSIDE.test(k) && g.visible).map(([, g]) => g); hidden.forEach(g => g.visible = false);
    scene.traverse(o => { if (o.visible && seeThrough(o)) { hidden.push(o); o.visible = false; } });
    const bg = scene.background, tm = renderer.toneMapping;
    scene.background = new THREE.Color(0); scene.overrideMaterial = depthMat; renderer.toneMapping = THREE.NoToneMapping;
    renderer.render(scene, camera);
    const k = Math.max(blurStart[1] * (1 - i / blurStart[0]), blurEnd[1] * (1 - (frames - 1 - i) / blurEnd[0]), 0);
    const depth = blurred(renderer.domElement, k * renderer.getPixelRatio());
    scene.overrideMaterial = null; scene.background = bg; renderer.toneMapping = tm; hidden.forEach(o => o.visible = true);
    await save(name, 'rgb', i, rgb); await save(name, 'depth', i, depth);
  }
  return { name, frames, fovs: [a.fov, b.fov], hidden: gone.length };
}

// A stretch of ranchorelaxo.html's own walkthrough (t0 → t1 on its timeline), rendered as video frames for an AI video-to-video pass.
// The house and the light stay at envT (daylight, finished, interior on); only the camera follows the path. Frames are JPEG
// (review/guide/<name>/rgb-<nnnn>.jpg). sky: show the site panorama and drop the fog (outside shots; otherwise the sky is the page colour).
export async function renderPath({ t0, t1, seconds, fps = 16, envT, name, w = 1280 / 1.5, h = 720 / 1.5, sky = false, hide = [] }) {
  const frames = Math.round(seconds * fps) + 1;
  R.free = true; A.setT(envT);
  for (const id of ['rv', 'rvnotes', 'cap', 'hint', 'count', 'back', 'bar', 'prog']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; }
  const stage = document.getElementById('stage'); stage.style.cssText = `inset:auto;left:0;top:0;width:${w}px;height:${h}px`;
  renderer.domElement.style.width = renderer.domElement.style.height = '';
  A.resize(w, h);
  const gone = []; if (hide.length) scene.traverse(o => { if (!o.isMesh || o === A.skyDome) return;
    const c = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
    if (hide.some(([x0, y0, z0, x1, y1, z1]) => c.x > x0 && c.x < x1 && c.y > y0 && c.y < y1 && c.z > z0 && c.z < z1)) gone.push(o); });
  const fog = scene.fog; if (sky) scene.fog = null;
  await frame(); await frame();
  for (let i = 0; i < frames; i++) {
    const t = t0 + (t1 - t0) * i / (frames - 1);
    gone.forEach(o => o.visible = false);
    A.cameraAt(t, 0); await frame();                 // doors and lamps follow this camera position
    A.cameraAt(t, 0);                                 // again: the review tool's orbit controls re-aim the camera every frame
    if (sky) A.skyDome.material.uniforms.alpha.value = 1;
    A.render(); await save(name, 'rgb', i, renderer.domElement.toDataURL('image/jpeg', 0.92), 'jpg');
  }
  scene.fog = fog;
  return { name, frames, seconds };
}
