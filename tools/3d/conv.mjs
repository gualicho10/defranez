// KHR_materials_pbrSpecularGlossiness → plain metal/rough WITHOUT the energy-conservation darkening of the stock converter.
// SimLab writes specular 0.5 / glossiness 0.5 on almost every material; the stock conversion halves the diffuse colour for that.
export function specToStd(doc) {
  let n = 0;
  for (const m of doc.getRoot().listMaterials()) {
    const e = m.listExtensions().find(x => x.extensionName === 'KHR_materials_pbrSpecularGlossiness');
    if (!e) continue;
    m.setBaseColorFactor(e.getDiffuseFactor());
    const tex = e.getDiffuseTexture();
    if (tex) m.setBaseColorTexture(tex);
    const name = m.getName() || '';
    let metal = 0, rough = 0.62;
    if (/mirror|espejo/i.test(name)) { metal = 0; rough = 0.04; }
    else if (/chrome|cromo/i.test(name)) { metal = 1; rough = 0.15; }
    else if (/aluminum|aluminio|galvan|steel|acero|inox|metal_rough|rusted|corrog/i.test(name)) { metal = 0.75; rough = 0.4; }
    else if (/glass|vidrio|translucent/i.test(name)) { rough = 0.05; }
    if (name === 'damero-cocina') rough = 0.35;   // must differ from the bath-floor material or dedup() merges them back together
    m.setMetallicFactor(metal); m.setRoughnessFactor(rough);
    m.setExtension('KHR_materials_pbrSpecularGlossiness', null);
    n++;
  }
  return doc;
}

// SketchUp draws both sides of a face alike, so ~27% of this export has vertex normals pointing AGAINST their triangle winding
// (white bath fixtures 100%, bed linen 72%…). With doubleSided materials those faces light up black. Align each vertex normal with the
// winding of the triangles that use it (keeps the smoothing, only flips the inverted ones).
export function fixNormals(doc) {
  let flipped = 0, total = 0;
  for (const mesh of doc.getRoot().listMeshes()) for (const p of mesh.listPrimitives()) {
    const P = p.getAttribute('POSITION'), N = p.getAttribute('NORMAL'); if (!P || !N) continue;
    const pa = P.getArray(), na = N.getArray(), I = p.getIndices(), ia = I ? I.getArray() : null, nv = P.getCount();
    const score = new Float64Array(nv), nt = Math.floor((ia ? ia.length : nv) / 3);
    for (let t = 0; t < nt; t++) {
      const a = ia ? ia[t*3] : t*3, b = ia ? ia[t*3+1] : t*3+1, c = ia ? ia[t*3+2] : t*3+2;
      const ux = pa[b*3]-pa[a*3], uy = pa[b*3+1]-pa[a*3+1], uz = pa[b*3+2]-pa[a*3+2], vx = pa[c*3]-pa[a*3], vy = pa[c*3+1]-pa[a*3+1], vz = pa[c*3+2]-pa[a*3+2];
      const fx = uy*vz-uz*vy, fy = uz*vx-ux*vz, fz = ux*vy-uy*vx;
      for (const v of [a, b, c]) score[v] += fx*na[v*3] + fy*na[v*3+1] + fz*na[v*3+2];
    }
    let any = false; const out = new Float32Array(na.length);
    for (let v = 0; v < nv; v++) { const s = score[v] < 0 ? -1 : 1; if (s < 0) { any = true; flipped++; } out[v*3] = na[v*3]*s; out[v*3+1] = na[v*3+1]*s; out[v*3+2] = na[v*3+2]*s; }
    total += nv; if (any) N.setArray(out);
  }
  console.log(`fixNormals: flipped ${flipped} of ${total} vertex normals (${(100*flipped/Math.max(1,total)).toFixed(1)}%)`);
  return doc;
}
