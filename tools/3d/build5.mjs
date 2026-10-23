// Build v5 — TAG-DRIVEN. Every exported piece is matched (by bounding box) to the SketchUp entity it came from
// (casa-tags.json, exported from SketchUp with tools/sketchup-export-tags.rb) and grouped by its TAG.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { transformMesh, mergeDocuments, unpartition, join, dedup, prune, textureCompress, quantize, reorder, meshopt, weld, simplifyPrimitive, getBounds } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import { specToStd, fixNormals } from './conv.mjs';
import sharp from 'sharp';
import fs from 'fs';
await MeshoptEncoder.ready; await MeshoptDecoder.ready; await MeshoptSimplifier.ready;
const D = '/Users/ezedefran/Library/CloudStorage/GoogleDrive-ezequiel.defrancisco@gmail.com/My Drive/2_Laburos/PORTFOLIO/WEB_EZE/3D/';
const OUT = '/Users/ezedefran/Library/CloudStorage/GoogleDrive-ezequiel.defrancisco@gmail.com/My Drive/2_Laburos/web/defranez/models/';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });

// ── SketchUp tag map ───────────────────────────────────────────────────────────
const TJ = JSON.parse(fs.readFileSync('/Users/ezedefran/Desktop/casa-tags.json'));
const DEF = new Set(['Layer0', 'Untagged']);
const effTag = it => !DEF.has(it.face_tag) ? it.face_tag : ([...it.path].reverse().find(t => !DEF.has(t)) || 'Layer0');
const ITEMS = TJ.items.map((it, i) => ({ i, tag: effTag(it), path: it.path, names: it.names, min: it.b.slice(0, 3), max: it.b.slice(3, 6) }));
const vol = it => (it.max[0] - it.min[0] + .01) * (it.max[1] - it.min[1] + .01) * (it.max[2] - it.min[2] + .01);
// the item whose box contains this piece most tightly; viol = how far the piece sticks out of it (0 = fully inside)
function matchItem(mn, mx) {
  let best = null, bs = Infinity, bv = 0;
  for (const it of ITEMS) {
    let viol = 0, slack = 0;
    for (let k = 0; k < 3; k++) { viol += Math.max(0, it.min[k] - mn[k]) + Math.max(0, mx[k] - it.max[k]); slack += Math.max(0, mn[k] - it.min[k]) + Math.max(0, it.max[k] - mx[k]); }
    const s = viol * 60 + slack;
    if (s < bs) { bs = s; best = it; bv = viol; }
  }
  return { it: best, viol: bv };
}
const inItem = (it, p, tol = 0.06) => [0, 1, 2].every(k => it.min[k] - tol <= p[k] && p[k] <= it.max[k] + tol);
const smallestAt = (tag, p) => ITEMS.filter(it => it.tag === tag && inItem(it, p)).sort((a, b) => vol(a) - vol(b))[0];

// Pieces that get replaced by other models in the page (positions go to replacements.json)
const OVEN = smallestAt('Artefactos', [1.82, 0.75, -6.52]);
const FRIDGE = ITEMS.filter(it => it.tag === 'Artefactos' && it.names.some(n => /helader/i.test(n)));
const REPLACED_ITEMS = new Set([OVEN?.i, ...FRIDGE.map(f => f.i)].filter(v => v !== undefined));

// Tag → group. Order of the assembly lives in the page; here it's only "what belongs together".
const GROUP_OF = {};
const G = (g, tags) => tags.forEach(t => GROUP_OF[t] = g);
G('terreno', ['TERRENO']);
G('base', ['PLATEA', 'TALUD', 'Camino', 'Piso tanque']);
G('columnas', ['Columnas']);
G('ext', ['Norte', 'Sur', 'Traslape Este', 'Traslape Oeste']);
G('int', ['Paredes internas', 'Paredes durloc', 'Pisos PB', 'Sala de estar']);
G('entrepiso', ['Piso']); G('escalera', ['escalera1', 'soporte escalera']); G('baranda', ['Pared balconeo']);   // escalera2/3: older versions stacked on the same spot (dropped)
G('tanque', ['Paredes tanque']); G('tanqueeq', ['Tanque y bomba', 'Sosten Tanque']);   // tank room walls, then the tank and its support
G('chapa-e', ['Chapa Este']); G('chapa-o', ['Chapa Oeste']); G('chapa-s', ['Chapa Sur']); G('chapas', ['CHAPAS']);
G('piedras', ['Piedras']);
G('techo', ['TECHOS']);
G('solar', ['Paneles solares', 'Tablero paneles solares']);
G('lucesext', ['Luces exteriores']);
G('deck', ['DECK', 'Garage']);                                        // split below into posts / slab / steps
G('techodeck', ['Techo_deck']);
G('aberturas', ['Aberturas', 'Marcos', 'Puerta Cedro', 'Puerta Metal lista', 'Puerta madera', 'Entrada']);   // split below by facade
G('paisaje', ['Arboles', 'Alambrado', 'Luces camino', 'deck y jardin']);
G('svc', ['Caseta grupo', 'Caseta bomba', 'Caseta gas', 'Garrafas', 'Puerta generador y garrafa', 'Servicios', 'Obrador', 'Con casetas y obrador']);
G('interior', ['Mobiliario EP', 'Mobiliario PB', 'Muebles cocina', 'Muebles estar', 'Muebles Baño', 'Muebles dormitorio', 'Artefactos baño', 'Artefactos', 'Bacha',
  'Mesada cocina hormigon', 'Mesada cocina hormigon OP1', 'Mesada cocina hormigon OP2', 'estantes', 'Placard pasillo', 'Placard cuarto PB', 'toallas', 'cortina', 'mampara',
  'lavarropas', 'bañitori madera', 'bañitori hormigon', 'Salamandra', 'Tomas y fichas PB', 'Tomas y fichas EP', 'Giladas PB', 'Puertas alacena', 'Layer0']);
G('doors', ['Puertas baño y dormi']);
// dropped: drawings/photos/dimensions, a future door, discarded stair versions and kitchen bar, the mezzanine wardrobe, Enscape lamps (→ real lights), heaters & plants (→ replacement models)
G('drop', ['Plano PB', 'Plano refe', 'Fotos bkgd', 'Foto ESTE', 'Foto OSTE', 'Foto NORTE', 'Medidas', 'Puerta futura', 'Placard EP', 'Estufas', 'Plantas',
  'escalera2', 'escalera3', 'Barra']);   // stair versions 2/3 and the kitchen bar were discarded in the design
G('interior', ['Luminaria PB', 'Luminaria EP']);   // lamp fixtures (their light is recreated in the page)
// ('Medidas' is not here: the kitchen counter lives inside that group in SketchUp; the tag itself is dropped above)
const DROP_PATH = new Set(['Placard EP', 'Plano PB', 'Plano refe', 'Fotos bkgd', 'Puerta futura', 'Estufas', 'Plantas']);
// groups whose SketchUp elements stay separate pieces, so the page can bring them in one by one
const PIECES = new Set(['columnas', 'deckstairs']);
// house footprint (outer faces of the columns): openings are grouped by the facade they sit on, or 'ab-in' when inside
const FP = { x0: 1.05, x1: 11.45, z0: -9.76, z1: -3.35 };
function facade(c) {
  const d = { 'ab-x0': c[0] - FP.x0, 'ab-x1': FP.x1 - c[0], 'ab-z0': c[2] - FP.z0, 'ab-z1': FP.z1 - c[2] };
  const [side, dist] = Object.entries(d).sort((a, b) => a[1] - b[1])[0];
  return dist > 0.45 ? 'ab-in' : side;
}

// ── Read + fix the two exports ─────────────────────────────────────────────────
const doc = await io.read(D + '07-completo.glb');
const sk = await io.read(D + 'casa pacho_sketchup.glb');
fixNormals(doc); fixNormals(sk);
function splitKitchenFloor(d) {   // the kitchen floor was exported with the bathroom-floor material: split it off (page gives it the checker texture)
  let moved = 0;
  for (const n of d.getRoot().listNodes()) {
    const mesh = n.getMesh(); if (!mesh) continue;
    for (const prim of mesh.listPrimitives()) {
      const mat = prim.getMaterial(); if (!mat || !/revestimiento-ba/i.test(mat.getName())) continue;
      const P = prim.getAttribute('POSITION'), I = prim.getIndices(); if (!P || !I) continue;
      const pa = P.getArray(), ia = I.getArray(), keep = [], take = [], M = n.getWorldMatrix();
      for (let t = 0; t < ia.length; t += 3) {
        const a = ia[t], b = ia[t+1], c = ia[t+2];
        const lx = (pa[a*3]+pa[b*3]+pa[c*3])/3, ly = (pa[a*3+1]+pa[b*3+1]+pa[c*3+1])/3, lz = (pa[a*3+2]+pa[b*3+2]+pa[c*3+2])/3;
        const wx = M[0]*lx + M[4]*ly + M[8]*lz + M[12], wy = M[1]*lx + M[5]*ly + M[9]*lz + M[13], wz = M[2]*lx + M[6]*ly + M[10]*lz + M[14];
        (wx > 1.3 && wx < 4.95 && wz > -8.5 && wz < -5.05 && wy < 0.3 ? take : keep).push(a, b, c);
      }
      if (!take.length) continue;
      const mk = arr => d.createAccessor().setType('SCALAR').setArray(P.getCount() > 65535 ? new Uint32Array(arr) : new Uint16Array(arr)).setBuffer(I.getBuffer());
      const np = d.createPrimitive().setMode(prim.getMode()).setMaterial(mat.clone().setName('damero-cocina')).setIndices(mk(take));
      for (const sem of prim.listSemantics()) np.setAttribute(sem, prim.getAttribute(sem));
      prim.setIndices(mk(keep)); mesh.addPrimitive(np); moved += take.length / 3;
    }
  }
  console.log('kitchen floor triangles →', moved);
}
splitKitchenFloor(doc);

// pieces of the full export that the stage exports don't have (furniture, fixtures…) join the 07 export
const missing = new Set(JSON.parse(fs.readFileSync('missing_in_07.json')));
sk.getRoot().listNodes().forEach((n, i) => { if (n.getMesh() && !missing.has(i)) n.setMesh(null); });
const from07 = new Set(doc.getRoot().listNodes());
mergeDocuments(doc, sk);
{ const scenes = doc.getRoot().listScenes(); for (const extra of scenes.slice(1)) { for (const c of extra.listChildren()) { extra.removeChild(c); scenes[0].addChild(c); } extra.dispose(); } }

// ── Classify every mesh node ───────────────────────────────────────────────────
const isLeaf = (sz) => sz[1] > 1.8 && Math.min(sz[0], sz[2]) < 0.12 && Math.max(sz[0], sz[2]) > 0.6 && Math.max(sz[0], sz[2]) < 1.05;
const matsOf = n => n.getMesh().listPrimitives().map(p => p.getMaterial()?.getName() || '');
const counts = {}, tally = { tiny: 0, orphan: 0, dropTag: 0, replaced: 0, frontGlass: 0, lamp: 0, dup: 0 }, covered = new Set(), orphans = [], proxies = [], svcCand = [], doorLeaves = [], tagSeen = {};
const HC = [6.2, -6.8];
for (const n of doc.getRoot().listNodes()) {
  if (!n.getMesh()) continue;
  const b = getBounds(n), sz = [0, 1, 2].map(k => b.max[k] - b.min[k]), c = [0, 1, 2].map(k => (b.min[k] + b.max[k]) / 2), diag = Math.hypot(...sz);
  const drop = why => { n.setExtras({ drop: true }); tally[why]++; };
  if (diag < 0.06) { drop('tiny'); continue; }
  const { it, viol } = matchItem(b.min, b.max);
  if (process.env.DEBUG_BOXES) for (const [lbl, x0, x1, y0, y1, z0, z1] of JSON.parse(process.env.DEBUG_BOXES)) if (c[0]>x0&&c[0]<x1&&c[1]>y0&&c[1]<y1&&c[2]>z0&&c[2]<z1) console.log('DBG', lbl, from07.has(n) ? '07' : 'SK', 'c', c.map(v=>v.toFixed(2)).join(','), 'sz', sz.map(v=>v.toFixed(2)).join(','), matsOf(n)[0]?.slice(0,22), '→', it?.tag, (it?.names||[]).slice(-2).join('>').slice(0,50), 'viol', viol.toFixed(3));
  if (!it || viol > (from07.has(n) ? 0.15 : 0.04)) { drop('orphan'); orphans.push({ c: c.map(v => +v.toFixed(2)), sz: sz.map(v => +v.toFixed(2)), mat: matsOf(n)[0] }); continue; }   // not in the current SketchUp model
  // an element already exported by the stage export must not come in twice from the full export (it may be shifted there: the amp panel)
  if (from07.has(n)) covered.add(it.i); else if (covered.has(it.i)) { drop('dup'); continue; }
  if (REPLACED_ITEMS.has(it.i)) { drop('replaced'); continue; }
  // the glazed entrance door stands open (the camera walks in through it): drop its glass pane
  if (c[0] > 5.4 && c[0] < 7.4 && c[2] > -3.65 && c[2] < -3.15 && sz[1] > 1.5 && Math.min(sz[0], sz[2]) < 0.12 && matsOf(n).some(m => /glass|vidrio|translucent/i.test(m))) { drop('frontGlass'); continue; }
  // lamp fixtures (Enscape lights and the sconce/floor/bedside lamp models): removed, their light is recreated invisibly in the page
  if (it.names.some(nm => /enscape/i.test(nm))) { drop('lamp'); continue; }                        // Enscape light objects (the fixtures stay)
  if (it.names.some(nm => /^luz .*omni$/i.test(nm))) { drop('lamp'); continue; }                     // a light helper modelled as a visible blob ('Luz living OMNI')
  if (it.path.some(t => DROP_PATH.has(t))) { drop('dropTag'); continue; }                              // whole groups tagged to drop (e.g. the mezzanine wardrobe)
  let g = GROUP_OF[it.tag] || 'interior';
  tagSeen[it.tag] = (tagSeen[it.tag] || 0) + 1;
  if (g === 'drop') { drop('dropTag'); continue; }
  if (g === 'tanqueeq' && b.max[1] < 2) g = 'interior';                                               // the washing machine shares the tank tag
  if (g === 'techodeck' && c[2] < -8) g = 'techogarage';
  if (g === 'deck') g = it.names.includes('Grupo#126') ? 'deckstairs' : (sz[1] > 0.4 && sz[1] > 1.4 * Math.max(sz[0], sz[2])) ? 'deckposts' : 'deckboards';
  if (g === 'base' && it.tag === 'PLATEA' && b.min[2] > FP.z1) g = 'deckstairs';                     // the deck step treads are tagged PLATEA
  if (g === 'base' && b.min[1] > 2) g = 'entrepiso';                                                // mezzanine floor boards over the bathroom, tagged with the slab
  if (g === 'base' && c[0] > 7.5 && matsOf(n).some(m => /revestimiento-ba/i.test(m))) { drop('dropTag'); continue; }   // bedroom slab block in the bath tile material (the floor above covers it)
  if (g === 'aberturas' && c[2] > FP.z1 + 0.3 && b.min[1] > 1.8) g = 'techodeck';                     // the deck pergola slats are tagged Marcos
  if (g === 'aberturas') g = facade(c);
  if (g === 'doors') { if (isLeaf(sz)) { doorLeaves.push({ n, c, b }); continue; } g = 'int'; }   // frames go with the interior walls
  if (g === 'svc') { svcCand.push({ n, c, i: it.i }); continue; }
  if (g === 'paisaje' && matsOf(n).every(x => !x)) {   // Enscape-library tree/shrub blob: re-drawn in the page
    proxies.push({ c: c.map(v => +v.toFixed(2)), size: sz.map(v => +v.toFixed(2)), base: +b.min[1].toFixed(2) }); n.setExtras({ drop: true }); continue;
  }
  n.setExtras(PIECES.has(g) ? { g, piece: it.i } : { g }); counts[g] = (counts[g] || 0) + 1;
}
// service cabinets: one group per cabinet, numbered clockwise (seen from above, from north) around the house
{
  const cl = []; for (const o of svcCand) { const hit = cl.find(k => k.some(p => Math.hypot(p.c[0]-o.c[0], p.c[2]-o.c[2]) < 3.5)); if (hit) hit.push(o); else cl.push([o]); }
  const ang = k => { const cx = k.reduce((a, p) => a + p.c[0], 0) / k.length, cz = k.reduce((a, p) => a + p.c[2], 0) / k.length; let a = Math.atan2(cz - HC[1], cx - HC[0]) + Math.PI / 2; return a < 0 ? a + 2 * Math.PI : a; };
  // each SketchUp element stays its own piece: a cabinet's roof shares the wall material, and the page brings roofs down from above
  cl.sort((a, b) => ang(a) - ang(b)).forEach((k, idx) => k.forEach(o => { o.n.setExtras({ g: 'svc' + idx, piece: o.i }); counts['svc' + idx] = (counts['svc' + idx] || 0) + 1; }));
  console.log('service cabinets', cl.length, cl.map(k => k.length));
}
// interior door leaves: one group each (the page swings them open as the camera arrives)
const doorsOut = [];
{
  const cl = []; for (const o of doorLeaves) { const hit = cl.find(k => k.some(p => Math.hypot(p.c[0]-o.c[0], p.c[2]-o.c[2]) < 0.6)); if (hit) hit.push(o); else cl.push([o]); }
  let idx = 0;
  for (const k of cl) {
    const mn = [0, 1, 2].map(j => Math.min(...k.map(o => o.b.min[j]))), mx = [0, 1, 2].map(j => Math.max(...k.map(o => o.b.max[j])));
    const alongX = mx[0] - mn[0] > mx[2] - mn[2], pad = [alongX ? 0.02 : 0.12, 0.02, alongX ? 0.12 : 0.02];
    const handles = doc.getRoot().listNodes().filter(n => { const ex = n.getExtras(); if (!n.getMesh() || ex?.drop || !/^(int|interior|ab-\w+)$/.test(ex?.g || '')) return false;
      const b = getBounds(n), c = [0, 1, 2].map(j => (b.min[j] + b.max[j]) / 2); return Math.hypot(...[0, 1, 2].map(j => b.max[j] - b.min[j])) < 0.35 && [0, 1, 2].every(j => c[j] > mn[j] - pad[j] && c[j] < mx[j] + pad[j]); });
    const bath = (mn[2] + mx[2]) / 2 < -7.3;
    if (bath) { k.forEach(o => o.n.setExtras({ drop: true })); handles.forEach(h => h.setExtras({ drop: true })); console.log('bathroom door removed (+', handles.length, 'handle pieces)'); continue; }
    const name = 'door' + idx++;
    k.forEach(o => o.n.setExtras({ g: name })); handles.forEach(h => h.setExtras({ g: name })); counts[name] = k.length + handles.length;
    doorsOut.push({ g: name, min: mn.map(v => +v.toFixed(3)), max: mx.map(v => +v.toFixed(3)) });
    console.log(name, 'leaf pieces', k.length, 'handle pieces', handles.length);
  }
  console.log('door leaves', doorsOut.length);
}
console.log('groups', counts); console.log('tally', tally);
console.log('largest orphans (in the old export, not in SketchUp now):', orphans.sort((a, b) => Math.hypot(...b.sz) - Math.hypot(...a.sz)).slice(0, 8));

// ── Light positions, replacements, proxies (from the SketchUp side, not the mesh) ─────────────────────────
const clusterItems = (list, r) => { const cl = []; for (const it of list) { const c = [0, 1, 2].map(k => (it.min[k] + it.max[k]) / 2); const hit = cl.find(k => Math.hypot(k.c[0]-c[0], k.c[1]-c[1], k.c[2]-c[2]) < r); if (hit) { for (let k = 0; k < 3; k++) { hit.min[k] = Math.min(hit.min[k], it.min[k]); hit.max[k] = Math.max(hit.max[k], it.max[k]); } hit.c = [0, 1, 2].map(k => (hit.min[k] + hit.max[k]) / 2); } else cl.push({ c, min: [...it.min], max: [...it.max] }); } return cl; };
const r3 = a => a.map(v => +v.toFixed(3));
const lights = [];
for (const [tag, k, r] of [['Luminaria PB', 'int', 0.5], ['Luminaria EP', 'int', 0.5], ['Luces exteriores', 'ext', 0.4], ['Luces camino', 'path', 0.3]])
  for (const l of clusterItems(ITEMS.filter(it => it.tag === tag), r)) lights.push({ k, p: r3([l.c[0], k === 'int' ? l.min[1] + (l.max[1] - l.min[1]) * 0.35 : l.max[1] - 0.03, l.c[2]]) });
for (const l of clusterItems(ITEMS.filter(it => !/^Luminaria/.test(it.tag) && it.names.some(nm => /sconce|lamp floor|velador|lampara de pared/i.test(nm))), 0.5))
  if (!lights.some(o => o.k === 'int' && Math.hypot(o.p[0]-l.c[0], o.p[2]-l.c[2]) < 0.5)) lights.push({ k: 'int', p: r3([l.c[0], l.min[1] + (l.max[1] - l.min[1]) * 0.35, l.c[2]]) });
// Review notes (22/10 evening): Enscape helper lights that are not lamps go; lamps whose light sat outside the shade move in.
// omni: a bare-bulb kind of lamp (shade, globe) lit all round instead of a downward spot; i: intensity factor.
const FIX_LIGHTS = [
  { at: [10.07, 1.85, -7.44], drop: true },                                   // Enscape point light in the hall
  { at: [1.39, 0.92, -7.83], drop: true }, { at: [2.49, 0.92, -8.35], drop: true },   // Enscape linear strips under the kitchen counter
  { at: [1.23, 1.35, -6.45], drop: true },                                    // Enscape linear strip on the kitchen wall
  { at: [9.22, 1.49, -9.56], drop: true },                                    // bathroom wall: not a lamp
  { at: [2.55, 2.16, -7.81], drop: true },                                    // 'Luz living OMNI' (its geometry is dropped too)
  { at: [11.12, 0.78, -6.06], p: [11.11, 0.89, -6.06], omni: true, i: 0.3 },  // bedside lamps: inside the shade, soft
  { at: [11.11, 0.79, -3.93], p: [11.1, 0.89, -3.92], omni: true, i: 0.3 },
  { at: [8.36, 3.18, -3.79], p: [8.36, 3.93, -3.79], omni: true, i: 0.3 },    // mezzanine floor lamp: inside its fabric shade
  { at: [10.0, 1.92, -9.5], p: [10.0, 1.94, -9.5], omni: true, i: 0.4 },      // bathroom glass globe
  { at: [8.71, 4.65, -8.6], p: [8.71, 4.585, -8.6] },                         // sconce over the stair: at its cone's rim, like its siblings (above it the bulb showed)
  // second round: helpers floating with no lamp around them, and duplicates
  { at: [9.4, 2.255, -7.22], drop: true },                                    // Enscape point light in the hall
  { at: [11.22, 1.9, -5.98], drop: true }, { at: [11.22, 1.9, -4.0], drop: true },   // bedroom, high on the wall: only the bedside lamps stay
  { at: [2.8, 2.19, -4.99], drop: true },                                     // above the dining pendant (its own light is inside the shade)
  { at: [7.38, 0.18, -9.57], drop: true }, { at: [6.37, 0.16, -3.5], drop: true },   // Enscape linear strips on the floor
  { at: [7.83, 2.34, -6.15], drop: true }, { at: [7.84, 2.34, -3.94], drop: true },  // Enscape spots by the column, no sconce
  { at: [9.85, 4.43, -5.17], drop: true }, { at: [9.16, 4.84, -7.88], drop: true },  // mezzanine: 'Luz living OMNI' and an Enscape point light
  { at: [9.62, 3.39, -3.5], drop: true },                                     // mezzanine window: Enscape linear strip
];
for (const f of FIX_LIGHTS) {
  const i = lights.findIndex(l => Math.hypot(l.p[0] - f.at[0], l.p[1] - f.at[1], l.p[2] - f.at[2]) < 0.06);
  if (i < 0) { console.warn('light fix: nothing at', f.at); continue; }
  if (f.drop) { lights.splice(i, 1); continue; }
  if (f.p) lights[i].p = f.p; if (f.omni) lights[i].omni = true; if (f.i) lights[i].i = f.i;
}
const box = it => ({ min: r3(it.min), max: r3(it.max) });
const fridgeBox = FRIDGE.length ? { min: r3([0, 1, 2].map(k => Math.min(...FRIDGE.map(f => f.min[k])))), max: r3([0, 1, 2].map(k => Math.max(...FRIDGE.map(f => f.max[k])))) } : null;
const plants = clusterItems(ITEMS.filter(it => it.tag === 'Plantas'), 0.45).filter(p => p.max[1] - p.min[1] > 0.15).map(p => ({ min: r3(p.min), max: r3(p.max) }));
const heaters = clusterItems(ITEMS.filter(it => it.tag === 'Estufas'), 0.6).map(p => ({ min: r3(p.min), max: r3(p.max) }));
fs.writeFileSync(OUT + 'lights.json', JSON.stringify(lights));
fs.writeFileSync(OUT + 'replacements.json', JSON.stringify({ oven: OVEN ? box(OVEN) : null, fridge: fridgeBox, heaters, plants, doors: doorsOut }));
fs.writeFileSync(OUT + 'proxies.json', JSON.stringify(proxies));
console.log('lights', lights.length, '| plants', plants.length, '| heaters', heaters.length, '| oven', !!OVEN, '| fridge', !!fridgeBox, '| proxies', proxies.length);

// ── Group, optimise, write ─────────────────────────────────────────────────────
const scene = doc.getRoot().listScenes()[0];
await doc.transform(specToStd);
// Bake every kept mesh's WORLD matrix into its vertices (flatten() decomposes it into T·R·S, which cannot hold the shear of
// non-uniformly scaled SketchUp components inside rotated groups → skewed pieces such as the amp panel). Shared meshes are copied first.
{ const seen = new Set(), keep = doc.getRoot().listNodes().filter(n => n.getMesh() && n.getExtras()?.g && !n.getExtras()?.drop);
  const world = new Map(keep.map(n => [n, n.getWorldMatrix()]));
  for (const n of keep) { const m = n.getMesh(); if (seen.has(m)) n.setMesh(m.clone()); seen.add(n.getMesh()); }
  for (const n of keep) { transformMesh(n.getMesh(), world.get(n)); n.setTranslation([0, 0, 0]).setRotation([0, 0, 0, 1]).setScale([1, 1, 1]); }
  console.log('baked world transforms into', keep.length, 'meshes'); }
// The SketchUp model lacks the column by the living-room window (front wall, x 4.62 — it is on the floor plan).
// Copy its twin on the back wall: same row, so same height under the roof, which slopes along x only.
{ const centre = n => { const b = getBounds(n); return [(b.min[0] + b.max[0]) / 2, (b.min[2] + b.max[2]) / 2]; };
  const twin = doc.getRoot().listNodes().find(n => n.getMesh() && n.getExtras()?.g === 'columnas' && !n.getExtras()?.drop
    && (([x, z]) => Math.abs(x - 4.618) < 0.05 && Math.abs(z + 9.675) < 0.05)(centre(n)));
  if (!twin) throw new Error('column twin for the living-room window not found');
  const n = doc.createNode('').setMesh(twin.getMesh().clone()).setExtras({ g: 'columnas', piece: 'living' });
  transformMesh(n.getMesh(), [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -3.425 + 9.675, 1]);
  scene.addChild(n); counts.columnas++;
  console.log('added column at', centre(n).map(v => +v.toFixed(3))); }
const groups = {};
for (const g of Object.keys(counts)) { groups[g] = doc.createNode('g-' + g); scene.addChild(groups[g]); }
for (const n of doc.getRoot().listNodes()) {
  const ex = n.getExtras();
  if (ex?.drop) { n.getParentNode()?.removeChild(n); scene.removeChild(n); n.dispose(); }
  else if (ex?.g && n.getMesh()) { n.getParentNode()?.removeChild(n); scene.removeChild(n); groups[ex.g].addChild(n); }
  else if (/^(Escena|Active View|Living desde)/.test(n.getName())) { scene.removeChild(n); n.dispose(); }
}
// SketchUp components = one mesh shared by several nodes. join() bakes a node's transform into the mesh, so a shared mesh would get
// a second transform through its other instance (the tilted amp panel). Give every instance its own copy first.
{ let cloned = 0;
  for (const n of doc.getRoot().listNodes()) { const m = n.getMesh(); if (!m) continue;
    const users = m.listParents().filter(p => p.propertyType === 'Node');
    if (users.length > 1 && users[0] !== n) { n.setMesh(m.clone()); cloned++; } }
  console.log('instanced meshes made unique:', cloned); }
// columns and deck steps keep one node per SketchUp element (named p<item>), so the page can bring them in one by one;
// everything else is merged per material within its group
for (const node of Object.values(groups)) for (const ch of node.listChildren()) {
  const piece = ch.getExtras()?.piece, keep = piece !== undefined || (process.env.KEEP_BOX && (() => { const bb = getBounds(ch), c = [0,1,2].map(k => (bb.min[k]+bb.max[k])/2), B = JSON.parse(process.env.KEEP_BOX); return c[0]>B[0]&&c[0]<B[1]&&c[1]>B[2]&&c[1]<B[3]&&c[2]>B[4]&&c[2]<B[5]; })());
  ch.setName(piece !== undefined ? 'p' + piece : keep ? 'keep' + Math.random().toString(36).slice(2, 8) : '');
}
await doc.transform(unpartition(), join({ keepMeshes: false, keepNamed: true }), weld());
// simplify only what is seen from afar; the interior keeps its full detail (round guitars, undistorted textures)
const KEEP_DETAIL = /^(interior|door\d+|entrepiso|escalera|baranda|int|ab-\w+)$/;
let simplified = 0;
for (const [g, node] of Object.entries(groups)) {
  if (KEEP_DETAIL.test(g)) continue;
  for (const ch of node.listChildren()) for (const p of ch.getMesh()?.listPrimitives() || []) { simplifyPrimitive(p, { simplifier: MeshoptSimplifier, ratio: 0.5, error: 0.0015 }); simplified++; }
}
console.log('simplified primitives', simplified);
await doc.transform(
  dedup(), prune(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024] }),
  quantize(), reorder({ encoder: MeshoptEncoder }), meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
);
await io.write(OUT + 'casa.stages.glb', doc);
const st = {}; for (const [k, g] of Object.entries(groups)) st[k] = g.listChildren().length; console.log('children per group', st);
console.log('tags seen', Object.keys(tagSeen).length);
