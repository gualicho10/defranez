"""Web versions of the casa keyframe renders. Reads from Drive, writes only to assets/casa/."""
import json, os, sys, unicodedata
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
SRC = "/Users/ezedefran/Library/CloudStorage/GoogleDrive-ezequiel.defrancisco@gmail.com/My Drive/2_Laburos/PORTFOLIO/WEB_EZE/3D/Renders estaticos"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "assets", "casa")

# name -> (source file, desktop width, mobile width)
KEYFRAMES = {
    "01-plano":        ("Render-Plano-planta.png",        3200, 1600),
    "02-exterior":     ("Render-fuera-casa-entera.png",   2560, 1280),
    "03-cocina-living":("Render-living-comedor1.png",     2560, 1280),
    "04-ventanal":     ("Render-living-comedor2.png",     2560, 1280),
    "05-cuarto":       ("Render-dormitorio.png",          2560, 1280),
    "06-bano":         ("Render-baño-top.png",            2560, 1280),
    "07-entrepiso1":   ("Render-Entrepiso1.png",          2560, 1280),
    "08-entrepiso2":   ("Render-Entrepiso2.png",          2560, 1280),
}

EDITED = os.path.join(OUT, "src")   # edited versions of a render (e.g. objects removed) win over the Drive original

def find(name):
    # Drive on macOS may store ñ decomposed; match on normalized names
    for f in os.listdir(SRC):
        if unicodedata.normalize("NFC", f) == unicodedata.normalize("NFC", name):
            return os.path.join(SRC, f)
    raise FileNotFoundError(name)

os.makedirs(OUT, exist_ok=True)
manifest = {}
for name, (src, wd, wm) in KEYFRAMES.items():
    own = os.path.join(EDITED, name + ".png")
    im = Image.open(own if os.path.exists(own) else find(src)).convert("RGB")
    if os.path.exists(own): src = "src/" + name + ".png (edited from " + src + ")"
    w, h = im.size
    manifest[name] = {"source": src, "sourceSize": [w, h], "aspect": round(w / h, 4)}
    for tag, tw in (("", wd), ("-m", wm)):
        tw = min(tw, w)  # never upscale
        out = im.resize((tw, round(h * tw / w)), Image.LANCZOS)
        path = os.path.join(OUT, f"{name}{tag}.webp")
        out.save(path, "WEBP", quality=82, method=6)
        manifest[name]["mobile" if tag else "desktop"] = {"file": f"{name}{tag}.webp", "size": list(out.size), "kb": os.path.getsize(path) // 1024}
        print(f"{name}{tag}.webp {out.size} {os.path.getsize(path)//1024} KB")
with open(os.path.join(OUT, "manifest.json"), "w") as f:
    json.dump(manifest, f, indent=2, ensure_ascii=False)
