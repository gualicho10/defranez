// AI pass over a stretch of the 3D walkthrough: Wan 2.2 A14B video-to-video on fal.ai. It repaints the input video, keeping its
// layout, colours and camera move; `strength` says how far it may go (0 = the input back, 1 = only the prompt).
// Run:  FAL_KEY set (~/.zshrc). node tools/3d/fal-v2v.mjs <input.mp4> <out-dir> <480p|580p|720p> <strength> [<strength> …] [--prompt=ext|int]
//       several strengths are submitted at once; each result is saved as <out-dir>/v2v-<res>-s<strength>-<seed>.mp4 (+ .json)
// Cost: billed per output second at 16 fps — USD 0.04/s at 480p, 0.06 at 580p, 0.08 at 720p.
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2), opt = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => a.slice(2).split('=')));
const [input, outDir, resolution, ...strengths] = args.filter(a => !a.startsWith('--'));
const KEY = process.env.FAL_KEY;
if (!KEY || !input || !outDir || !resolution || !strengths.length) { console.error('usage: node tools/3d/fal-v2v.mjs <input.mp4> <out-dir> <res> <strength…> [--prompt=ext|int]'); process.exit(1); }

const PROMPTS = {
  ext: 'Photorealistic aerial drone shot of a modern timber cabin with a black metal roof, larch cladding and a wooden deck, in a green Patagonian mountain valley. '
    + 'The mown lawn around the house blends seamlessly into the surrounding natural meadow, shrubs and forest, mountains in the distance, one continuous landscape. '
    + 'Real trees and bushes, soft natural sunlight, realistic shadows, architectural photography, sharp, high detail, steady smooth camera.',
  int: 'Photorealistic architectural interior of a timber cabin in Patagonia: pine wall panelling, wood ceiling, concrete kitchen counter, black and white checkered floor, '
    + 'white sofa, wood stove, large windows to the mountains, warm natural daylight, lamps glowing softly, architectural photography, sharp, high detail, steady smooth camera.',
};
const prompt = PROMPTS[opt.prompt || 'ext'];
const negative = 'cartoon, 3d render, CGI, low poly, video game, plastic, blurry, distorted geometry, warped walls, morphing objects, flicker, text, watermark, people';
const frames = +(opt.frames || 81);
const H = { Authorization: `Key ${KEY}`, 'Content-Type': 'application/json' };
const video_url = `data:video/mp4;base64,${fs.readFileSync(input).toString('base64')}`;
fs.mkdirSync(outDir, { recursive: true });

const jobs = await Promise.all(strengths.map(async s => {
  const body = { video_url, prompt, negative_prompt: negative, strength: +s, resolution, num_frames: frames, frames_per_second: 16, aspect_ratio: '16:9' };
  const r = await (await fetch('https://queue.fal.run/fal-ai/wan/v2.2-a14b/video-to-video', { method: 'POST', headers: H, body: JSON.stringify(body) })).json();
  if (!r.request_id) throw new Error('submit failed: ' + JSON.stringify(r).slice(0, 300));
  console.log('queued strength', s, r.request_id);
  return { s, r, body };
}));
await Promise.all(jobs.map(async ({ s, r, body }) => {
  for (;;) {
    await new Promise(z => setTimeout(z, 6000));
    const st = await (await fetch(r.status_url, { headers: H })).json();
    if (st.status === 'COMPLETED') break;
    if (st.status === 'FAILED' || st.error) throw new Error(`strength ${s} failed: ` + JSON.stringify(st).slice(0, 300));
  }
  const out = await (await fetch(r.response_url, { headers: H })).json();
  if (!out.video?.url) throw new Error(`strength ${s}: no video ` + JSON.stringify(out).slice(0, 300));
  const file = path.join(outDir, `v2v-${resolution}-s${s}-${out.seed}.mp4`);
  fs.writeFileSync(file, Buffer.from(await (await fetch(out.video.url)).arrayBuffer()));
  const { video_url: _, ...settings } = body;
  fs.writeFileSync(file.replace(/\.mp4$/, '.json'), JSON.stringify({ request_id: r.request_id, seed: out.seed, input: path.basename(input), settings }, null, 2));
  console.log('saved', file);
}));
