"""Site panorama → background JPEG + light HDR for casa.html.
Input:  the user's 360° panorama with its wrap seam already filled (review/edits/pano/result-*.png, half-turn rolled).
Output: assets/casa/site-pano-4k.jpg / -2k.jpg (background, sRGB) and assets/casa/site-env.hdr (1024×512 Radiance RGBE, lighting:
        the sun is pushed to HDR values so it casts light and highlights). Prints the sun's position for the page.
Needs numpy + Pillow: python tools/3d/make-site-hdri.py review/edits/pano/result-eraser-….png"""
import sys, os, json
import numpy as np
from PIL import Image

src = sys.argv[1]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "assets", "casa")
r = np.asarray(Image.open(src).convert("RGB"))
W = r.shape[1]; h2 = W // 2
pano = np.concatenate([r[:, W - h2:], r[:, :W - h2]], axis=1)          # undo the half turn used to put the seam in the middle

img = Image.fromarray(pano).resize((4096, 2048), Image.LANCZOS)        # 360° × 180° → exact 2:1
a = np.asarray(img).astype(np.float32) / 255

# poles: an equirect row near the top/bottom is one direction smeared across; ease it to the row average so the zenith has no pinch
H = a.shape[0]
for band, rows in (("top", range(0, int(H * 0.07))), ("bottom", range(H - 1, H - 1 - int(H * 0.07), -1))):
    n = len(rows)
    for k, y in enumerate(rows):
        w = (1 - k / n) ** 2
        a[y] = a[y] * (1 - w) + a[y].mean(axis=0) * w

def lin(c): return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
L = lin(a)
# sun: brightest blob in the sky half
lum = L[:H // 2].dot([0.2126, 0.7152, 0.0722])
small = np.asarray(Image.fromarray((lum / lum.max() * 255).astype(np.uint8)).filter(__import__("PIL.ImageFilter", fromlist=["x"]).GaussianBlur(6))).astype(float)
sy, sx = np.unravel_index(small.argmax(), small.shape)
u, v = (sx + 0.5) / a.shape[1], (sy + 0.5) / H
el = (0.5 - v) * 180
# turn the panorama so its sun sits where casa.html's sun light comes from (three.js equirect: u = atan2(z, x)/2π + 0.5)
SUN_DIR = (-21, 10.5, 17)                                                # casa.html: sun.position − sun.target
target_u = (np.arctan2(SUN_DIR[2], SUN_DIR[0]) / (2 * np.pi) + 0.5) % 1
shift = int(round((target_u - u) * a.shape[1])) % a.shape[1]
a = np.roll(a, shift, axis=1); L = np.roll(L, shift, axis=1); u = target_u
print(json.dumps({"sun_u": round(u, 4), "sun_v": round(v, 4), "elevation_deg": round(el, 2), "rolled_px": shift}))

Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8)).save(os.path.join(OUT, "site-pano-4k.jpg"), quality=90)
Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8)).resize((2048, 1024), Image.LANCZOS).save(os.path.join(OUT, "site-pano-2k.jpg"), quality=88)

# light HDR at 1024×512: the photo in linear light, plus a sun disk (~0.6°) and a soft corona pushed well above 1
E = np.asarray(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).resize((1024, 512), Image.LANCZOS)).astype(np.float32) / 255
E = lin(E)
yy, xx = np.mgrid[0:512, 0:1024]
cx, cy = u * 1024, v * 512
dx = np.minimum(np.abs(xx - cx), 1024 - np.abs(xx - cx)) * np.cos(np.radians(el))   # degrees ≈ px * 360/1024
d = np.hypot(dx, yy - cy) * 360 / 1024
E += (np.exp(-(d / 0.9) ** 2) * 60 + np.exp(-(d / 6) ** 2) * 1.5)[..., None] * np.array([1.0, 0.93, 0.8])

def write_hdr(path, rgb):
    m = rgb.max(axis=2); e = np.where(m > 1e-32, np.ceil(np.log2(np.maximum(m, 1e-32))), -128)
    scale = np.where(m > 1e-32, 256.0 / np.exp2(e), 0)
    rgbe = np.zeros(rgb.shape[:2] + (4,), np.uint8)
    rgbe[..., :3] = np.clip(rgb * scale[..., None], 0, 255).astype(np.uint8); rgbe[..., 3] = np.where(m > 1e-32, e + 128, 0).astype(np.uint8)
    with open(path, "wb") as f:
        f.write(b"#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n" + f"-Y {rgb.shape[0]} +X {rgb.shape[1]}\n".encode()); f.write(rgbe.tobytes())
write_hdr(os.path.join(OUT, "site-env.hdr"), E)
for f in ("site-pano-4k.jpg", "site-pano-2k.jpg", "site-env.hdr"): print(f, os.path.getsize(os.path.join(OUT, f)) // 1024, "KB")
