// AI pass for one segment between two render keyframes: Wan VACE 14B on fal.ai, depth-guided.
// Input:  review/guide/<name>/guide-depth.mp4 (from casa-guide.js), first.jpg / last.jpg (the two renders cropped to 16:9)
// Output: review/guide/<name>/ai-<res>-<seed>.mp4 + .json with the request settings
// Run:    FAL_KEY must be set (export in ~/.zshrc). node tools/3d/fal-vace.mjs 03-04 [480p|580p|720p] [seed]
//         (frame count = the depth frames in the folder: 81 ≈ 5 s, 121 ≈ 7.5 s)
// Cost:   billed per output second at 16 fps — USD 0.04/s at 480p, 0.06 at 580p, 0.08 at 720p (121 frames at 480p ≈ 0.30).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [name = '03-04', resolution = '480p', seedArg] = process.argv.slice(2);
const KEY = process.env.FAL_KEY;
if (!KEY) { console.error('FAL_KEY is not set (add `export FAL_KEY=...` to ~/.zshrc and open a new terminal)'); process.exit(1); }
const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'review', 'guide', name);
const FRAMES = fs.readdirSync(DIR).filter(f => /^depth-\d+\.png$/.test(f)).length || 81;
const dataUri = (f, type) => `data:${type};base64,${fs.readFileSync(path.join(DIR, f)).toString('base64')}`;

const input = {
  prompt: 'Photorealistic architectural interior of a timber cabin in Patagonia, smooth steady camera move through the open-plan kitchen and living room, '
    + 'pine wall panelling, wood ceiling, concrete kitchen counter, black and white checkered floor, white sofa, wood stove, large window to the mountains, '
    + 'warm afternoon sunlight, natural soft shadows, consistent materials and lighting, straight vertical lines, rectilinear lens, architectural photography, sharp, high detail',
  negative_prompt: 'people, text, watermark, fisheye, barrel distortion, curved straight lines, bending walls, distorted geometry, warped walls, morphing furniture, '
    + 'paintings, artwork on walls, blankets, flicker, blur, low quality, cartoon, 3d render look',
  task: 'depth',
  video_url: dataUri('guide-depth.mp4', 'video/mp4'),
  first_frame_url: dataUri('first.jpg', 'image/jpeg'),
  last_frame_url: dataUri('last.jpg', 'image/jpeg'),
  ref_image_urls: [dataUri('first.jpg', 'image/jpeg'), dataUri('last.jpg', 'image/jpeg')],
  num_frames: FRAMES, frames_per_second: 16, resolution, aspect_ratio: '16:9',
  ...(seedArg ? { seed: +seedArg } : {}),
};

const H = { Authorization: `Key ${KEY}`, 'Content-Type': 'application/json' };
const submit = await (await fetch('https://queue.fal.run/fal-ai/wan-vace-14b', { method: 'POST', headers: H, body: JSON.stringify(input) })).json();
if (!submit.request_id) { console.error('submit failed:', JSON.stringify(submit).slice(0, 500)); process.exit(1); }
console.log('queued', submit.request_id);
for (;;) {
  await new Promise(r => setTimeout(r, 5000));
  const st = await (await fetch(submit.status_url, { headers: H })).json();
  process.stdout.write(`\r${st.status}${st.queue_position != null ? ' #' + st.queue_position : ''}        `);
  if (st.status === 'COMPLETED') break;
  if (st.status === 'FAILED' || st.error) { console.error('\nfailed:', JSON.stringify(st).slice(0, 500)); process.exit(1); }
}
const out = await (await fetch(submit.response_url, { headers: H })).json();
if (!out.video?.url) { console.error('\nno video in response:', JSON.stringify(out).slice(0, 500)); process.exit(1); }
const file = path.join(DIR, `ai-${resolution}-${out.seed}.mp4`);
fs.writeFileSync(file, Buffer.from(await (await fetch(out.video.url)).arrayBuffer()));
const { video_url, first_frame_url, last_frame_url, ref_image_urls, ...settings } = input;
fs.writeFileSync(file.replace(/\.mp4$/, '.json'), JSON.stringify({ request_id: submit.request_id, seed: out.seed, settings, video: out.video }, null, 2));
console.log('\nsaved', path.relative(process.cwd(), file), `${out.video.width}x${out.video.height}`, out.video.num_frames, 'frames');
