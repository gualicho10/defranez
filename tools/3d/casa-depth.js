// Depth maps for the render keyframes (?look=depth in ranchorelaxo.html): each render's calibrated camera (assets/casa/cameras.json)
// renders the 3D as depth (near = white). Open ranchorelaxo.html with the review server, then in the console:
//   (await import('./tools/3d/casa-depth.js')).renderDepths()
// Frames land in review/guide/depth-maps/depth-<n>.png; tools/3d/make-depth-assets.py turns them into assets/casa/depth/<id>.webp.
import * as THREE from 'three';

const A = window.__app, R = window.__review, { scene, camera, renderer } = A;
const frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
const RANGE = { '02-exterior': [6, 45] };   // metres mapped white → black; interiors use [0.3, 12]
const seeThrough = o => o === A.skyDome || o.isSprite || o.isPoints || o.isLine || /^plan-lines/.test(o.name) || (o.isMesh && (Array.isArray(o.material) ? o.material : [o.material])
  .some(x => /glass|vidrio|translucent/i.test(x?.name || '') || (x?.transparent && x.opacity < 0.98)));

export async function renderDepths(ids = ['02-exterior', '03-cocina-living', '04-ventanal', '05-cuarto', '06-bano', '07-entrepiso1', '08-entrepiso2'], width = 1024) {
  const cams = await (await fetch('assets/casa/cameras.json', { cache: 'no-store' })).json();
  const mat = new THREE.ShaderMaterial({ uniforms: { near: { value: 0.3 }, far: { value: 12 } }, side: THREE.DoubleSide,
    vertexShader: 'varying float vZ; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); vZ = -mv.z; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float near, far; varying float vZ; void main(){ gl_FragColor = vec4(vec3(1. - clamp((vZ - near) / (far - near), 0., 1.)), 1.); }' });
  R.free = true; const out = [];
  for (const [i, id] of ids.entries()) {
    const c = cams[id], h = Math.round(width / c.aspect);
    A.setT(A.tOf(id)); A.resize(width, h); await frame(); await frame();
    camera.position.set(...c.p); camera.up.set(0, 1, 0); camera.lookAt(...c.q); camera.fov = c.fov; camera.aspect = c.aspect; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    [mat.uniforms.near.value, mat.uniforms.far.value] = RANGE[id] || [0.3, 12];
    const hidden = []; scene.traverse(o => { if (o.visible && seeThrough(o)) { hidden.push(o); o.visible = false; } });
    const bg = scene.background, tm = renderer.toneMapping, fog = scene.fog;
    scene.background = new THREE.Color(0); scene.overrideMaterial = mat; scene.fog = null; renderer.toneMapping = THREE.NoToneMapping;
    renderer.render(scene, camera); const png = renderer.domElement.toDataURL('image/png');
    scene.overrideMaterial = null; scene.background = bg; scene.fog = fog; renderer.toneMapping = tm; hidden.forEach(o => o.visible = true);
    const r = await fetch(`/api/frame?name=depth-maps&kind=depth&i=${i}&ext=png`, { method: 'POST', body: png });
    if (!r.ok) throw new Error('depth not saved: ' + id);
    out.push(`${i} ${id} ${width}x${h}`);
  }
  R.free = false; A.resize(innerWidth, innerHeight);
  return out;
}
