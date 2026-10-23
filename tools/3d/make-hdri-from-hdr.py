"""A ready-made HDRI (e.g. Poly Haven's alps_field_4k.hdr) → the files casa.html loads, turned so its sun sits where the page's sun light is.
Output: assets/casa/site-pano-4k.jpg / -2k.jpg (tone-mapped background) and assets/casa/site-env.hdr (1024×512, real HDR values).
Prints the sun's elevation: casa.html's sun light height should match it.
Needs numpy + opencv-python-headless: python tools/3d/make-hdri-from-hdr.py "<file.hdr>" [exposure]"""
import sys, os, json
import numpy as np, cv2

src = sys.argv[1]; exposure = float(sys.argv[2]) if len(sys.argv) > 2 else 1.0
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "assets", "casa")
hdr = cv2.imread(src, cv2.IMREAD_UNCHANGED)[..., ::-1].astype(np.float32)          # BGR → RGB, linear
H, W = hdr.shape[:2]

lum = hdr[: H // 2].dot([0.2126, 0.7152, 0.0722])                                   # sun: brightest spot in the sky half
blur = cv2.GaussianBlur(lum, (0, 0), 3)
sy, sx = np.unravel_index(blur.argmax(), blur.shape)
u, v = (sx + 0.5) / W, (sy + 0.5) / H
el = (0.5 - v) * 180

SUN_DIR = (-21, 10.5, 17)                                                            # casa.html: sun.position − sun.target (azimuth only)
target_u = (np.arctan2(SUN_DIR[2], SUN_DIR[0]) / (2 * np.pi) + 0.5) % 1               # three.js equirect: u = atan2(z, x)/2π + 0.5
shift = int(round((target_u - u) * W)) % W
hdr = np.roll(hdr, shift, axis=1)

def tonemap(x):                                                                      # ACES (Narkowicz) + sRGB, for the visible sky
    x = x * exposure; x = np.clip((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0, 1)
    return np.where(x <= 0.0031308, 12.92 * x, 1.055 * np.power(x, 1 / 2.4) - 0.055)
ldr = (tonemap(hdr) * 255 + 0.5).astype(np.uint8)[..., ::-1]
cv2.imwrite(os.path.join(OUT, "site-pano-4k.jpg"), cv2.resize(ldr, (4096, 2048), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 90])
cv2.imwrite(os.path.join(OUT, "site-pano-2k.jpg"), cv2.resize(ldr, (2048, 1024), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 88])
cv2.imwrite(os.path.join(OUT, "site-env.hdr"), cv2.resize(hdr, (1024, 512), interpolation=cv2.INTER_AREA)[..., ::-1])   # area resize keeps the sun's energy
print(json.dumps({"source": os.path.basename(src), "sun_u_before": round(u, 4), "sun_v": round(v, 4), "elevation_deg": round(el, 2), "sun_peak": float(lum.max()), "rolled_px": shift}))
for f in ("site-pano-4k.jpg", "site-pano-2k.jpg", "site-env.hdr"): print(f, os.path.getsize(os.path.join(OUT, f)) // 1024, "KB")
