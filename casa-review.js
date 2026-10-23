// Review / storyboard tool for the walkthrough. Open casa.html?review
// Scrub the timeline or fly freely, freeze a frame, draw on it, drop numbered pins (each remembers the mesh/group/material under it)
// and save. Notes land in ./review (see review-server.mjs) where they can be read back.
// Calibration row: lay a still render over the 3D view (in a box with the render's own aspect), match the camera to it and save it to assets/casa/cameras.json.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const A = window.__app, R = window.__review;
const { scene, camera, renderer, G, KEYS, END } = A;
document.documentElement.style.overflow = 'hidden'; document.body.style.overflow = 'hidden';
document.getElementById('content')?.remove(); document.getElementById('scroll')?.remove();

// ── Named jump points ──────────────────────────────────────────────────────────
const NAMES = A.NAMES;

// ── UI ─────────────────────────────────────────────────────────────────────────
const css = document.createElement('style');
css.textContent = `
#rv{position:fixed;left:0;right:0;bottom:0;z-index:30;background:rgba(8,10,12,.92);border-top:1px solid rgba(255,255,255,.1);color:#e8eaed;font:13px system-ui;padding:10px 14px;display:flex;flex-direction:column;gap:8px;backdrop-filter:blur(6px)}
#rv .row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
#rv button,#rv select{background:#13171c;color:#e8eaed;border:1px solid rgba(255,255,255,.14);border-radius:6px;padding:6px 10px;font:inherit;cursor:pointer}
#rv button:hover{border-color:#00f5a0} #rv button.on{background:#00f5a0;color:#06100b;border-color:#00f5a0}
#rv button.cap{background:#00f5a0;color:#06100b;font-weight:600;border-color:#00f5a0}
#rv input[type=range]{flex:1;min-width:200px;accent-color:#00f5a0}
#rv .t{font:12px ui-monospace,monospace;color:#8b93a1;min-width:70px}
#rv .grp{display:flex;gap:10px;flex-wrap:wrap;font-size:12px;color:#b9c0cb} #rv .grp label{display:flex;gap:4px;align-items:center;cursor:pointer}
#rv .lbl{color:#8b93a1;font-size:12px}
#rvnotes{position:fixed;right:10px;top:10px;z-index:30;width:250px;max-height:40vh;overflow:auto;background:rgba(8,10,12,.92);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#e8eaed;font:12px system-ui;padding:8px}
#rvnotes h4{margin:0 0 6px;font-size:12px;color:#00f5a0;letter-spacing:.08em;text-transform:uppercase}
#rvnotes .n{display:flex;justify-content:space-between;gap:6px;padding:4px 0;border-top:1px solid rgba(255,255,255,.07)} #rvnotes .n span{color:#8b93a1}
#rvnotes .n a{color:#ff6b6b;cursor:pointer}
#rvtoast{position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:60;background:#00f5a0;color:#06100b;padding:8px 14px;border-radius:6px;font:600 13px system-ui;display:none}
#rvann{position:fixed;inset:0;z-index:40;background:#080a0c;display:none}
#rvann canvas{position:absolute;left:0;top:0;cursor:crosshair}
#rvside{position:absolute;right:0;top:0;bottom:0;width:340px;background:rgba(8,10,12,.96);border-left:1px solid rgba(255,255,255,.12);color:#e8eaed;font:13px system-ui;padding:12px;display:flex;flex-direction:column;gap:8px;overflow:auto}
#rvside input,#rvside textarea{width:100%;background:#13171c;color:#e8eaed;border:1px solid rgba(255,255,255,.14);border-radius:6px;padding:6px 8px;font:inherit}
#rvside textarea{min-height:70px;resize:vertical}
#rvside .tools{display:flex;gap:6px;flex-wrap:wrap}
#rvside button{background:#13171c;color:#e8eaed;border:1px solid rgba(255,255,255,.14);border-radius:6px;padding:6px 10px;font:inherit;cursor:pointer}
#rvside button.on{background:#00f5a0;color:#06100b;border-color:#00f5a0}
#rvside .save{background:#00f5a0;color:#06100b;font-weight:600;border-color:#00f5a0}
#rvside .pin{border:1px solid rgba(255,255,255,.1);border-radius:6px;padding:6px;display:flex;flex-direction:column;gap:4px}
#rvside .pin b{color:#00f5a0} #rvside .pin small{color:#8b93a1;font-size:11px;word-break:break-all}
#rvside .sw{width:22px;height:22px;border-radius:50%;border:2px solid transparent;padding:0}
#rvside .sw.on{border-color:#fff}
#rvhelp{color:#8b93a1;font-size:11px;line-height:1.4}
#rvfr{position:fixed;z-index:5;display:none;pointer-events:none;outline:1px solid #00f5a0}
#rvfr img{position:absolute;inset:0;width:100%;height:100%;opacity:.5}
#rv .calib{border-top:1px solid rgba(255,255,255,.08);padding-top:8px}
#rv .sav{color:#00f5a0}
`;
document.head.appendChild(css);

const ui = document.createElement('div'); ui.id = 'rv';
ui.innerHTML = `
<div class="row">
  <button id="rvPlay">▶ Reproducir</button><button id="rvPrev">⏮</button><button id="rvNext">⏭</button>
  <input id="rvT" type="range" min="0" max="${END}" step="0.05" value="0"><span class="t" id="rvTt">t 0.0</span>
  <select id="rvJump"><option value="">Ir a…</option>${NAMES.map(([t, n]) => `<option value="${t}">${n}</option>`).join('')}</select>
</div>
<div class="row">
  <span class="lbl">Cámara</span><button id="rvCine" class="on">Recorrido</button><button id="rvFree">Libre (mouse)</button>
  <span class="lbl">Modelo</span>
  <button id="rvM0" class="on">Procesado</button><button id="rvM1">Original 07</button><button id="rvM2">Original completo (SketchUp)</button>
  <span class="lbl" id="rvLoad"></span>
  <span style="flex:1"></span>
  <button id="rvCap" class="cap">📷 Capturar y marcar (C)</button>
</div>
<div class="row"><span class="lbl">Grupos</span><div class="grp" id="rvGrp"></div></div>
<div class="row calib">
  <span class="lbl">Calibrar</span><select id="rvKf"><option value="">Keyframe…</option></select>
  <span class="lbl">Opacidad</span><input id="rvOp" type="range" min="0" max="1" step="0.02" value="0.5" style="flex:0 0 120px;min-width:80px">
  <button id="rvDiff" title="Resta el render al 3D: lo que coincide queda negro">Diferencia</button>
  <span class="lbl">FOV</span><input id="rvFov" type="range" min="15" max="110" step="0.1" value="55" style="flex:0 0 140px;min-width:80px"><span class="t" id="rvFovT">55°</span>
  <button id="rvGoSaved">Ir a la guardada</button><button id="rvSaveCam" class="cap">Guardar cámara</button><span class="lbl" id="rvCalSt"></span>
  <span style="flex:1"></span>
  <button id="rvPlan" title="Planta (assets/casa/planta.svg) apoyada sobre la platea">Planta</button>
</div>`;
document.body.appendChild(ui);
const notes = document.createElement('div'); notes.id = 'rvnotes'; notes.innerHTML = '<h4>Notas guardadas</h4><div id="rvlist"></div>'; document.body.appendChild(notes);
const toast = document.createElement('div'); toast.id = 'rvtoast'; document.body.appendChild(toast);
const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const say = (m) => { toast.textContent = m; toast.style.display = 'block'; clearTimeout(say.t); say.t = setTimeout(() => toast.style.display = 'none', 2600); };

// group toggles (unchecked = forced hidden; checked = follows the animation)
(async () => { while (!A.getModel()) await new Promise(r => setTimeout(r, 200)); await new Promise(r => setTimeout(r, 600));
  $('rvGrp').innerHTML = A.GROUPS.map(k => `<label><input type="checkbox" data-g="${k}" checked>${k}</label>`).join(''); })();
$('rvGrp').addEventListener('change', e => { const k = e.target.dataset.g; if (e.target.checked) delete R.force[k]; else R.force[k] = false; });

// ── Timeline ───────────────────────────────────────────────────────────────────
let playing = false, last = performance.now();
const setT = v => { A.setT(Math.max(0, Math.min(END, v))); };
$('rvT').addEventListener('input', e => { playing = false; $('rvPlay').textContent = '▶ Reproducir'; setT(+e.target.value); });
$('rvJump').addEventListener('change', e => { if (e.target.value !== '') { playing = false; setT(+e.target.value); } e.target.value = ''; });
$('rvPlay').onclick = () => { playing = !playing; $('rvPlay').textContent = playing ? '⏸ Pausa' : '▶ Reproducir'; };
const keyTimes = [...new Set([...NAMES.map(n => n[0]), ...KEYS.map(k => k.t)])].sort((a, b) => a - b);
$('rvNext').onclick = () => { const t = A.getT(); setT(keyTimes.find(k => k > t + 0.05) ?? END); };
$('rvPrev').onclick = () => { const t = A.getT(); setT([...keyTimes].reverse().find(k => k < t - 0.05) ?? 0); };
(function tick(now) {
  const dt = (now - last) / 1000; last = now;
  if (playing) setT(A.getT() + dt * 4);
  $('rvT').value = A.getT(); $('rvTt').textContent = 't ' + A.getT().toFixed(1);
  if (R.free) controls.update();
  requestAnimationFrame(tick);
})(performance.now());

// ── Free camera ────────────────────────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement);
controls.enabled = false; controls.enableDamping = true; controls.zoomToCursor = true; controls.minDistance = 0.001; controls.maxDistance = 400;
controls.screenSpacePanning = true;
window.__rvLook = (pos, tgt, fov = 55) => { setFree(true); camera.position.set(...pos); controls.target.set(...tgt); camera.fov = fov; camera.updateProjectionMatrix(); controls.update(); };   // dev: frame a spot
const setFree = on => {
  R.free = on; controls.enabled = on;
  $('rvFree').classList.toggle('on', on); $('rvCine').classList.toggle('on', !on);
  if (on) { const d = new THREE.Vector3(); camera.getWorldDirection(d); controls.target.copy(camera.position).addScaledVector(d, 2.5); controls.update(); }
};
$('rvFree').onclick = () => setFree(true); $('rvCine').onclick = () => setFree(false);

// ── Model switch: processed vs. untouched exports ──────────────────────────────
const origCache = {};
async function showModel(which) {
  ['rvM0', 'rvM1', 'rvM2'].forEach((id, i) => $(id).classList.toggle('on', i === which));
  const model = A.getModel();
  if (R.orig) { R.orig.visible = false; R.orig = null; }
  if (which === 0) { model.visible = true; if (G.proxies) G.proxies.visible = true; $('rvLoad').textContent = ''; return; }
  const file = which === 1 ? 'review/_orig/orig-07-completo.glb' : 'review/_orig/orig-completo-sketchup.glb';
  $('rvLoad').textContent = 'cargando original…';
  if (!origCache[file]) {
    const g = await new GLTFLoader().loadAsync(file);
    g.scene.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; for (const m of (Array.isArray(o.material) ? o.material : [o.material])) { m.emissive?.set(0); } } });
    scene.add(g.scene); origCache[file] = g.scene;
  }
  model.visible = false; if (G.proxies) G.proxies.visible = false;
  Object.values(origCache).forEach(o => o.visible = false);
  R.orig = origCache[file]; R.orig.visible = true;
  $('rvLoad').textContent = which === 1 ? 'original 07 (sin procesar)' : 'original completo (sin procesar)';
}
$('rvM0').onclick = () => showModel(0); $('rvM1').onclick = () => showModel(1); $('rvM2').onclick = () => showModel(2);

// ── Picking ────────────────────────────────────────────────────────────────────
const isShown = o => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
function pickAt(cx, cy) {
  const meshes = []; scene.traverse(o => { if (o.isMesh && o.material?.type !== 'ShaderMaterial' && isShown(o)) meshes.push(o); });
  const rc = new THREE.Raycaster(); rc.setFromCamera(new THREE.Vector2(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1), camera);
  const h = rc.intersectObjects(meshes, false)[0]; if (!h) return null;
  const chain = []; for (let p = h.object; p && p !== scene; p = p.parent) if (p.name) chain.push(p.name);
  const mat = Array.isArray(h.object.material) ? h.object.material[h.face?.materialIndex ?? 0] : h.object.material;
  return { group: chain.find(n => /^g-/.test(n)) || chain.slice(0, 2).join(' < ') || '(sin grupo)', material: mat?.name || '(sin nombre)', node: h.object.name || '', point: h.point.toArray().map(v => +v.toFixed(2)), dist: +h.distance.toFixed(2) };
}

// ── Capture + annotate ─────────────────────────────────────────────────────────
const ann = document.createElement('div'); ann.id = 'rvann';
ann.innerHTML = `<canvas id="rvc"></canvas>
<div id="rvside">
  <b style="color:#00f5a0;letter-spacing:.08em">MARCAR EN PANTALLA</b>
  <div class="tools" id="rvTools">
    <button data-tool="pin" class="on">📍 Pin (1)</button><button data-tool="pen">✏️ Lápiz (2)</button><button data-tool="arrow">➜ Flecha (3)</button>
    <button data-tool="ellipse">◯ Círculo (4)</button><button data-tool="rect">▭ Recuadro (5)</button><button id="rvUndo">↶ Deshacer</button>
  </div>
  <div class="tools"><button class="sw on" data-col="#ff3b3b" style="background:#ff3b3b"></button><button class="sw" data-col="#ffd400" style="background:#ffd400"></button><button class="sw" data-col="#00e5ff" style="background:#00e5ff"></button><button class="sw" data-col="#00f5a0" style="background:#00f5a0"></button></div>
  <input id="rvTitle" placeholder="Título corto (ej: piso verde en el dormitorio)">
  <textarea id="rvText" placeholder="Qué está mal / qué querés que pase… (podés escribir todo lo que quieras)"></textarea>
  <div id="rvPins"></div>
  <div id="rvhelp">Pin: clic sobre el elemento y escribí qué es. Cada pin guarda qué pieza, grupo y material hay debajo. Con lápiz/flecha/círculo marcás zonas.</div>
  <button class="save" id="rvSave">Guardar nota</button><button id="rvCancel">Cancelar (Esc)</button>
</div>`;
document.body.appendChild(ann);
const cv = $('rvc'), ctx = cv.getContext('2d');
let clean = null, cleanImg = null, shapes = [], pins = [], tool = 'pin', color = '#ff3b3b', drawing = null, snap = null;

function openAnnotate() {
  playing = false; $('rvPlay').textContent = '▶ Reproducir';
  A.render();
  clean = renderer.domElement.toDataURL('image/png');
  snap = { t: +A.getT().toFixed(2), mode: R.free ? 'free' : 'cinematic', model: !R.orig ? 'processed' : (R.orig === origCache['review/_orig/orig-07-completo.glb'] ? 'orig-07' : 'orig-completo'),
    camera: { pos: camera.position.toArray().map(v => +v.toFixed(3)), quat: camera.quaternion.toArray().map(v => +v.toFixed(5)), fov: +camera.fov.toFixed(2) },
    force: { ...R.force }, viewport: [innerWidth, innerHeight] };
  cleanImg = new Image();
  cleanImg.onload = () => { cv.width = cleanImg.width; cv.height = cleanImg.height; cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px'; shapes = []; pins = []; $('rvTitle').value = ''; $('rvText').value = ''; redraw(); renderPins(); ann.style.display = 'block'; };
  cleanImg.src = clean;
}
const sc = () => cv.width / innerWidth;
function redraw() {
  ctx.drawImage(cleanImg, 0, 0);
  const k = sc(); ctx.lineWidth = 3 * k; ctx.lineJoin = ctx.lineCap = 'round';
  for (const s of [...shapes, ...(drawing ? [drawing] : [])]) {
    ctx.strokeStyle = ctx.fillStyle = s.color;
    if (s.type === 'pen') { ctx.beginPath(); s.pts.forEach((p, i) => i ? ctx.lineTo(p[0] * k, p[1] * k) : ctx.moveTo(p[0] * k, p[1] * k)); ctx.stroke(); }
    else if (s.type === 'rect') ctx.strokeRect(s.a[0] * k, s.a[1] * k, (s.b[0] - s.a[0]) * k, (s.b[1] - s.a[1]) * k);
    else if (s.type === 'ellipse') { ctx.beginPath(); ctx.ellipse((s.a[0] + s.b[0]) / 2 * k, (s.a[1] + s.b[1]) / 2 * k, Math.abs(s.b[0] - s.a[0]) / 2 * k, Math.abs(s.b[1] - s.a[1]) / 2 * k, 0, 0, 7); ctx.stroke(); }
    else if (s.type === 'arrow') { const [x1, y1] = s.a.map(v => v * k), [x2, y2] = s.b.map(v => v * k), a = Math.atan2(y2 - y1, x2 - x1), h = 16 * k;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - h * Math.cos(a - .45), y2 - h * Math.sin(a - .45)); ctx.lineTo(x2 - h * Math.cos(a + .45), y2 - h * Math.sin(a + .45)); ctx.closePath(); ctx.fill(); }
  }
  for (const p of pins) { const x = p.x * innerWidth * k, y = p.y * innerHeight * k, r = 14 * k;
    ctx.fillStyle = '#00f5a0'; ctx.strokeStyle = '#06100b'; ctx.lineWidth = 2 * k; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#06100b'; ctx.font = `700 ${15 * k}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.n, x, y + k); }
}
function renderPins() {
  $('rvPins').innerHTML = pins.map(p => `<div class="pin"><b>Pin ${p.n}</b><input data-pin="${p.n}" placeholder="¿Qué es / qué pasa acá?" value="${esc(p.text)}"><small>${p.hit ? esc(`${p.hit.group} · ${p.hit.material} · ${p.hit.dist} m`) : 'sin geometría debajo'}</small></div>`).join('');
}
$('rvPins').addEventListener('input', e => { const p = pins.find(x => x.n == e.target.dataset.pin); if (p) p.text = e.target.value; });
$('rvTools').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.id === 'rvUndo') return undo();
  tool = b.dataset.tool; [...$('rvTools').querySelectorAll('button[data-tool]')].forEach(x => x.classList.toggle('on', x === b)); });
ann.querySelectorAll('.sw').forEach(b => b.onclick = () => { color = b.dataset.col; ann.querySelectorAll('.sw').forEach(x => x.classList.toggle('on', x === b)); });
function undo() { const last = [...shapes.map((s, i) => ['s', i]), ...pins.map((p, i) => ['p', i])]; if (drawing) { drawing = null; } else if (pins.length && (!shapes.length || (shapes._lastWasPin))) { pins.pop(); } else if (shapes.length) { shapes.pop(); } else if (pins.length) pins.pop(); redraw(); renderPins(); }
const pt = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
cv.addEventListener('pointerdown', e => {
  const p = pt(e);
  if (tool === 'pin') { const hit = pickAt(p[0], p[1]); pins.push({ n: pins.length + 1, x: +(p[0] / innerWidth).toFixed(4), y: +(p[1] / innerHeight).toFixed(4), text: '', hit }); shapes._lastWasPin = true; redraw(); renderPins(); setTimeout(() => $('rvPins').querySelector(`input[data-pin="${pins.length}"]`)?.focus(), 30); return; }
  cv.setPointerCapture(e.pointerId); shapes._lastWasPin = false;
  drawing = tool === 'pen' ? { type: 'pen', color, pts: [p] } : { type: tool, color, a: p, b: p };
});
cv.addEventListener('pointermove', e => { if (!drawing) return; const p = pt(e); if (drawing.type === 'pen') drawing.pts.push(p); else drawing.b = p; redraw(); });
cv.addEventListener('pointerup', () => { if (!drawing) return; shapes.push(drawing); drawing = null; redraw(); });
const close = () => { ann.style.display = 'none'; };
$('rvCancel').onclick = close;
$('rvSave').onclick = async () => {
  redraw();
  const body = { title: $('rvTitle').value.trim() || '(sin título)', text: $('rvText').value, ...snap, pins: pins.map(p => ({ n: p.n, x: p.x, y: p.y, text: p.text, hit: p.hit })),
    shapes: shapes.map(s => ({ type: s.type, color: s.color })), createdAt: new Date().toISOString(), annotated: cv.toDataURL('image/png'), clean };
  try { const r = await (await fetch('/api/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
    if (r.ok) { say('Nota guardada · ' + r.id); close(); loadList(); } else say('Error: ' + r.error); } catch (e) { say('No se pudo guardar: ' + e); }
};
$('rvCap').onclick = openAnnotate;
addEventListener('keydown', e => {
  if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) { if (e.key === 'Escape') document.activeElement.blur(); return; }
  if (ann.style.display === 'block') { if (e.key === 'Escape') close(); const m = { 1: 'pin', 2: 'pen', 3: 'arrow', 4: 'ellipse', 5: 'rect' }[e.key]; if (m) $('rvTools').querySelector(`[data-tool=${m}]`).click(); if ((e.metaKey || e.ctrlKey) && e.key === 'z') undo(); return; }
  if (e.key === 'c' || e.key === 'C') openAnnotate();
  if (e.key === ' ') { e.preventDefault(); $('rvPlay').click(); }
  if (e.key === 'ArrowRight') $('rvNext').click(); if (e.key === 'ArrowLeft') $('rvPrev').click();
});


// ── Camera calibration against the still renders ───────────────────────────────
// The 3D is drawn into a box with the render's own aspect so the saved vertical FOV means the same thing in both images.
const stageEl = $('stage'), frame = document.createElement('div'); frame.id = 'rvfr'; frame.innerHTML = '<img alt="">'; document.body.appendChild(frame);
let kfManifest = {}, kfSaved = {}, kfId = '';
const loadKf = async () => {
  try { kfManifest = await (await fetch('assets/casa/manifest.json', { cache: 'no-store' })).json(); } catch { say('Falta assets/casa/manifest.json'); }
  try { kfSaved = await (await fetch('assets/casa/cameras.json', { cache: 'no-store' })).json(); } catch { kfSaved = {}; }
  $('rvKf').innerHTML = '<option value="">Keyframe…</option>' + Object.keys(kfManifest).map(k => `<option value="${k}">${kfSaved[k] ? '✓ ' : ''}${k}</option>`).join('');
  $('rvKf').value = kfId;
};
const fitFrame = () => {
  renderer.domElement.style.width = renderer.domElement.style.height = '';   // casa.html's resize handler pins it to the window
  if (!kfId) { stageEl.style.cssText = ''; frame.style.display = 'none'; A.resize(innerWidth, innerHeight); return; }
  const asp = kfManifest[kfId].aspect, aw = innerWidth, ah = innerHeight - ui.offsetHeight - 12;
  const w = Math.floor(Math.min(aw, ah * asp)), h = Math.floor(w / asp), l = Math.floor((aw - w) / 2), tp = 6;
  stageEl.style.cssText = `inset:auto;left:${l}px;top:${tp}px;width:${w}px;height:${h}px`;
  frame.style.cssText = `display:block;left:${l}px;top:${tp}px;width:${w}px;height:${h}px`;
  A.resize(w, h);
};
const setFov = v => { camera.fov = v; camera.updateProjectionMatrix(); $('rvFov').value = v; $('rvFovT').textContent = v.toFixed(1) + '°'; };
const goSaved = id => {
  const c = kfSaved[id]; if (!c) return false;
  setFree(true); camera.position.set(...c.p); controls.target.set(...c.q); setFov(c.fov); controls.update(); return true;
};
$('rvKf').onchange = e => {
  kfId = e.target.value; playing = false; $('rvPlay').textContent = '▶ Reproducir';
  if (kfId) { frame.querySelector('img').src = `assets/casa/${kfId}.webp`; setFree(true); goSaved(kfId); setFov(camera.fov); }
  fitFrame(); $('rvCalSt').textContent = kfId && kfSaved[kfId] ? 'guardada ' + kfSaved[kfId].savedAt.slice(0, 16).replace('T', ' ') : '';
  $('rvCalSt').className = 'lbl sav';
};
$('rvOp').oninput = e => { frame.querySelector('img').style.opacity = e.target.value; };
$('rvDiff').onclick = e => { const on = e.currentTarget.classList.toggle('on'); frame.querySelector('img').style.mixBlendMode = on ? 'difference' : 'normal'; frame.querySelector('img').style.opacity = on ? 1 : $('rvOp').value; };
$('rvFov').oninput = e => setFov(+e.target.value);
$('rvGoSaved').onclick = () => { if (!kfId || !goSaved(kfId)) say('Todavía no hay cámara guardada para este keyframe'); };
$('rvSaveCam').onclick = async () => {
  if (!kfId) return say('Elegí un keyframe primero');
  const d = new THREE.Vector3(); camera.getWorldDirection(d); const q = camera.position.clone().addScaledVector(d, 3);   // look-at point 3 m ahead (the orbit target can sit anywhere)
  const r = v => +v.toFixed(4), body = { id: kfId, p: camera.position.toArray().map(r), q: q.toArray().map(r), fov: +camera.fov.toFixed(2), aspect: kfManifest[kfId].aspect };
  try { const res = await (await fetch('/api/calib', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
    if (res.ok) { kfSaved[kfId] = { ...body, savedAt: new Date().toISOString() }; say('Cámara guardada · ' + kfId); loadKf(); $('rvCalSt').textContent = 'guardada ahora'; } else say('Error: ' + res.error); } catch (e) { say('No se pudo guardar: ' + e); }
};
addEventListener('resize', () => { if (kfId) fitFrame(); });
addEventListener('keydown', e => { if (!kfId || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) return; if (e.key === 'o' || e.key === 'O') { const i = frame.querySelector('img'); i.style.visibility = i.style.visibility === 'hidden' ? 'visible' : 'hidden'; } });
loadKf();


// ── Floor plan over the model (assets/casa/planta.svg + the fitted mapping in planta.json) ──────────
let planMesh = null;
async function buildPlan() {
  const pj = await (await fetch('assets/casa/planta.json', { cache: 'no-store' })).json();
  const [, , W, H] = pj.viewBox, X = pj.toModel.x, Z = pj.toModel.z;
  const img = new Image(); img.src = 'assets/casa/planta.svg'; await img.decode();
  const cv = document.createElement('canvas'); cv.width = 4096; cv.height = Math.round(4096 * H / W); const c = cv.getContext('2d');
  c.drawImage(img, 0, 0, cv.width, cv.height); c.globalCompositeOperation = 'source-in'; c.fillStyle = '#ff00d4'; c.fillRect(0, 0, cv.width, cv.height);   // lines in magenta
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const P = (px, py) => [X.offset + X.perPt * py, 0.25, Z.offset + Z.perPt * px];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...P(0, 0), ...P(W, 0), ...P(W, H), ...P(0, H)], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0], 2)); g.setIndex([0, 1, 2, 0, 2, 3]);
  planMesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, side: THREE.DoubleSide }));
  planMesh.renderOrder = 999; scene.add(planMesh);
}
const ABOVE = ['techo', 'chapas', 'chapa-e', 'chapa-o', 'chapa-s', 'techodeck', 'techogarage', 'solar', 'entrepiso', 'baranda', 'interior', 'paisaje', 'proxies', 'lucesext'];
async function showPlan(on) {
  if (on && !planMesh) await buildPlan();
  if (planMesh) planMesh.visible = on;
  for (const k of ABOVE) if (on) R.force[k] = false; else delete R.force[k];
  $('rvPlan').classList.toggle('on', on);
  if (on) { setT(KEYS[0].t - 0.01); window.__rvLook([6.25, 60, -6.55], [6.25, 0, -6.551], 13.5); }
}
$('rvPlan').onclick = () => showPlan(!$('rvPlan').classList.contains('on'));

// ── Saved notes list ───────────────────────────────────────────────────────────
async function loadList() {
  try { const l = await (await fetch('/api/review/list')).json();
    $('rvlist').innerHTML = l.length ? l.map(n => `<div class="n"><div>${esc(n.title)}<br><span>t ${esc(n.t)} · ${esc(n.pins)} pin${n.pins === 1 ? '' : 'es'} · ${esc(n.mode)}</span></div><a data-del="${esc(n.id)}" title="Borrar">✕</a></div>`).join('') : '<span style="color:#8b93a1">Todavía no hay notas.</span>'; } catch { }
}
$('rvlist').addEventListener('click', async e => { const id = e.target.dataset.del; if (id && confirm('¿Borrar la nota?')) { await fetch('/api/review/' + id, { method: 'DELETE' }); loadList(); } });
loadList();
setT(0);
say('Modo revisión: C captura y marca · Espacio reproduce · ←/→ salta entre tomas');
