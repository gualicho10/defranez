import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { textureCompress } from '@gltf-transform/functions';
import { specToStd, fixNormals } from './conv.mjs';
import sharp from 'sharp';
const D = '/Users/ezedefran/Library/CloudStorage/GoogleDrive-ezequiel.defrancisco@gmail.com/My Drive/2_Laburos/PORTFOLIO/WEB_EZE/3D/';
const OUT = '/Users/ezedefran/Library/CloudStorage/GoogleDrive-ezequiel.defrancisco@gmail.com/My Drive/2_Laburos/web/defranez/review/_orig/';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
for (const [src, dst] of [['07-completo.glb', 'orig-07-completo.glb'], ['casa pacho_sketchup.glb', 'orig-completo-sketchup.glb']]) {
  const doc = await io.read(D + src);
  // geometry, nodes and meshes are left exactly as exported; only the material model (spec/gloss → metal/rough) and texture size change
  await doc.transform(specToStd, fixNormals, textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024] }));
  await io.write(OUT + dst, doc);
  console.log('wrote', dst);
}
