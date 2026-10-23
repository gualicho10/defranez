// Local dev server for the walkthrough review tool: static files + POST /api/review (saves notes into ./review).
// Run: node review-server.mjs   (127.0.0.1:8765; LAN=1 to expose it on the network)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const ROOT = process.cwd(), ROOT_REAL = fs.realpathSync(ROOT), PORT = 8765, DIR = path.join(ROOT, 'review');
// Loopback only by default (this server can write files). To test from a phone on the same Wi-Fi: LAN=1 node review-server.mjs
const HOST = process.env.LAN ? '0.0.0.0' : '127.0.0.1';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css',
  '.glb': 'model/gltf-binary', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };
fs.mkdirSync(DIR, { recursive: true });
const send = (res, code, body, type = 'application/json') => { res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(body); };
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'POST' && url.pathname === '/api/review') {
    const chunks = []; let n = 0;
    req.on('data', c => { n += c.length; if (n > 60e6) req.destroy(); else chunks.push(c); });
    req.on('end', () => {
      try {
        const note = JSON.parse(Buffer.concat(chunks).toString());
        const id = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14) + '-' + String(Math.floor(Math.random() * 900 + 100));
        const save = (k, ext) => { if (note[k]) { fs.writeFileSync(path.join(DIR, `${id}.${ext}`), Buffer.from(note[k].split(',')[1], 'base64')); delete note[k]; } };
        save('annotated', 'png'); save('clean', 'clean.png');
        note.id = id; fs.writeFileSync(path.join(DIR, `${id}.json`), JSON.stringify(note, null, 2));
        send(res, 200, JSON.stringify({ ok: true, id }));
      } catch (e) { send(res, 400, JSON.stringify({ ok: false, error: String(e) })); }
    });
    return;
  }
  // Camera calibration for the render keyframes: merged into assets/casa/cameras.json (committed, unlike ./review)
  if (req.method === 'POST' && url.pathname === '/api/calib') {
    const chunks = []; let n = 0;
    req.on('data', c => { n += c.length; if (n > 20e3) req.destroy(); else chunks.push(c); });
    req.on('end', () => {
      try {
        const b = JSON.parse(Buffer.concat(chunks).toString());
        const vec = v => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);
        if (!/^\d{2}-[a-z0-9-]{1,40}$/.test(b.id) || !vec(b.p) || !vec(b.q) || !Number.isFinite(b.fov) || !Number.isFinite(b.aspect)) throw new Error('bad calibration');
        const file = path.join(ROOT, 'assets', 'casa', 'cameras.json');
        let all = {}; try { all = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
        all[b.id] = { p: b.p, q: b.q, fov: b.fov, aspect: b.aspect, savedAt: new Date().toISOString() };
        fs.writeFileSync(file + '.tmp', JSON.stringify(all, null, 2)); fs.renameSync(file + '.tmp', file);
        send(res, 200, JSON.stringify({ ok: true }));
      } catch (e) { send(res, 400, JSON.stringify({ ok: false, error: String(e) })); }
    });
    return;
  }
  // Frames of a guide video rendered in the browser (casa-guide.js): review/guide/<name>/<kind>-<nnnn>.<png|jpg>
  if (req.method === 'POST' && url.pathname === '/api/frame') {
    const name = url.searchParams.get('name') || '', kind = url.searchParams.get('kind') || '', i = url.searchParams.get('i') || '', ext = url.searchParams.get('ext') || 'png';
    if (!/^[a-z0-9-]{1,40}$/.test(name) || !/^(rgb|depth)$/.test(kind) || !/^\d{1,4}$/.test(i) || !/^(png|jpg)$/.test(ext)) return send(res, 400, '{"ok":false}');
    const chunks = []; let n = 0;
    req.on('data', c => { n += c.length; if (n > 20e6) req.destroy(); else chunks.push(c); });
    req.on('end', () => {
      try {
        const dir = path.join(DIR, 'guide', name); fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, `${kind}-${i.padStart(4, '0')}.${ext}`), Buffer.from(Buffer.concat(chunks).toString().split(',')[1], 'base64'));
        send(res, 200, '{"ok":true}');
      } catch (e) { send(res, 400, JSON.stringify({ ok: false, error: String(e) })); }
    });
    return;
  }
  if (url.pathname === '/api/review/list') {
    const files = fs.readdirSync(DIR).filter(f => f.endsWith('.json')).sort().reverse();
    return send(res, 200, JSON.stringify(files.map(f => { try { const j = JSON.parse(fs.readFileSync(path.join(DIR, f))); return { id: j.id, title: j.title, t: j.t, mode: j.mode, pins: (j.pins || []).length }; } catch { return null; } }).filter(Boolean)));
  }
  if (req.method === 'DELETE' && url.pathname.startsWith('/api/review/')) {
    const id = path.basename(url.pathname); if (!/^\d{14}-\d{3}$/.test(id)) return send(res, 400, '{"ok":false}');
    for (const e of ['.json', '.png', '.clean.png']) fs.rmSync(path.join(DIR, id + e), { force: true });
    return send(res, 200, '{"ok":true}');
  }
  let p; try { p = decodeURIComponent(url.pathname); } catch { return send(res, 400, 'bad path', 'text/plain'); }
  if (p.endsWith('/')) p += 'index.html';
  if (p.includes('\0') || p.split(/[\\/]/).includes('..')) return send(res, 400, 'bad path', 'text/plain');
  // resolve symlinks and require the real path to live inside ROOT (compare with a trailing separator, not a bare prefix)
  let file; try { file = fs.realpathSync(path.resolve(ROOT, '.' + p)); } catch { return send(res, 404, 'not found', 'text/plain'); }
  if (file !== ROOT_REAL && !file.startsWith(ROOT_REAL + path.sep)) return send(res, 404, 'not found', 'text/plain');
  if (fs.statSync(file).isDirectory()) return send(res, 404, 'not found', 'text/plain');
  const st = fs.statSync(file), type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const range = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
  if (range) { const s = range[1] ? +range[1] : 0, e = range[2] ? +range[2] : st.size - 1;
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${s}-${e}/${st.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': e - s + 1, 'Cache-Control': 'no-store' });
    return fs.createReadStream(file, { start: s, end: e }).pipe(res); }
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': st.size, 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, HOST, () => console.log('review server on http://' + (HOST === '0.0.0.0' ? '<your-lan-ip>' : 'localhost') + ':' + PORT));
