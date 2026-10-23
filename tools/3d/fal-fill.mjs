// Remove things from a keyframe render on fal.ai, at full resolution: only a crop goes to the model
// (Bria Eraser by default — made for removal; FILL_MODEL=flux uses FLUX Pro Fill, which tends to put a new picture in a rectangle)
// and the result is pasted back through the (feathered) mask.
// Input:  review/edits/<id>/crop.png + mask.png (white = fill), and the crop's box in the source render
// Run:    node tools/3d/fal-fill.mjs 03 "<source render>" 1850,300 "<prompt>" → review/edits/<id>/result-<seed>.png (+ filled crop)
// Cost:   a few US cents (billed per megapixel; the crop is ~0.5 MP).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const [id, source, at, prompt] = process.argv.slice(2);
const KEY = process.env.FAL_KEY;
if (!KEY || !id || !source || !at || !prompt) { console.error('usage: FAL_KEY=… node tools/3d/fal-fill.mjs <id> <source.png> <x,y> "<prompt>"'); process.exit(1); }
const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'review', 'edits', id);
const [ox, oy] = at.split(',').map(Number);
const uri = f => `data:image/png;base64,${fs.readFileSync(path.join(DIR, f)).toString('base64')}`;

const H = { Authorization: `Key ${KEY}`, 'Content-Type': 'application/json' };
const flux = process.env.FILL_MODEL === 'flux';
const body = flux ? { prompt, image_url: uri('crop.png'), mask_url: uri('mask.png'), output_format: 'png', safety_tolerance: '5', sync_mode: true }
  : { image_url: uri('crop.png'), mask_url: uri('mask.png'), mask_type: 'manual', sync_mode: true };
const res = await (await fetch(`https://fal.run/fal-ai/${flux ? 'flux-pro/v1/fill' : 'bria/eraser'}`, { method: 'POST', headers: H, body: JSON.stringify(body) })).json();
const img = res.images?.[0] || res.image; res.seed ??= flux ? res.seed : 'eraser-' + Date.now().toString(36);
if (!img) { console.error('fill failed:', JSON.stringify(res).slice(0, 500)); process.exit(1); }
const filled = img.url.startsWith('data:') ? Buffer.from(img.url.split(',')[1], 'base64') : Buffer.from(await (await fetch(img.url)).arrayBuffer());
fs.writeFileSync(path.join(DIR, `filled-${res.seed}.png`), filled);

// paste back: the fill only where the mask is (edges feathered), the untouched render everywhere else
const crop = sharp(path.join(DIR, 'crop.png')); const { width, height } = await crop.metadata();
const fillRaw = await sharp(filled).resize(width, height).removeAlpha().raw().toBuffer();
const alpha = await sharp(path.join(DIR, 'mask.png')).resize(width, height).blur(6).extractChannel(0).raw().toBuffer();
const patch = await sharp(fillRaw, { raw: { width, height, channels: 3 } }).joinChannel(alpha, { raw: { width, height, channels: 1 } }).png().toBuffer();
const out = path.join(DIR, `result-${res.seed}.png`);
await sharp(source).composite([{ input: patch, left: ox, top: oy }]).png().toFile(out);
console.log('saved', path.relative(process.cwd(), out), `(fill ${img.width}x${img.height})`);
