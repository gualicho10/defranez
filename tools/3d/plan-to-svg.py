"""Floor plan PDF (the single top-left drawing, exported from Illustrator) -> layered SVG for the plan->3D transition.
Needs PyMuPDF (not in the repo deps): python -m venv env && env/bin/pip install pymupdf && env/bin/python tools/3d/plan-to-svg.py
Layers come from the drawing's own pens: black split by width into walls / dims / section marks / posts; squares with a cross = columns; greys = furniture and detail; orange = cladding."""
import json, os, sys
import fitz

SRC = sys.argv[1] if len(sys.argv) > 1 else "/Users/ezedefran/Library/CloudStorage/GoogleDrive-ezequiel.defrancisco@gmail.com/My Drive/2_Laburos/PORTFOLIO/WEB_EZE/3D/Renders estaticos/Plano Planta.pdf"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "assets", "casa")

page = fitz.open(SRC)[0]
import re
NUMS = [fitz.Rect(w[:4]) for w in page.get_text("words") if re.fullmatch(r"[Ø]?\d+[.,]\d+", w[4])]
def on_dimension(g):
    """True if every segment of g is a straight line with a dimension number sitting on it (or in its gap)."""
    segs = [it for it in g["items"] if it[0] == "l"]
    if not segs or len(segs) != len(g["items"]): return False
    for _, a, b in segs:
        horiz = abs(a.y - b.y) < 0.5; vert = abs(a.x - b.x) < 0.5
        if not (horiz or vert): return False
        hit = False
        for r in NUMS:
            c = fitz.Point((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2)
            if horiz and abs(c.y - a.y) < 9 and min(a.x, b.x) - 30 < c.x < max(a.x, b.x) + 30: hit = True
            if vert and abs(c.x - a.x) < 9 and min(a.y, b.y) - 30 < c.y < max(a.y, b.y) + 30: hit = True
        if not hit: return False
    return True
def layer(g):
    c = g.get("color") or g.get("fill") or (0, 0, 0)
    if g["type"] == "fs" or (g.get("fill") and not g.get("color")): return "fills"
    if c[0] > 0.5 and c[2] < 0.1: return "cladding"
    if max(c) < 0.05:   # black pen: split by stroke width (measured on this drawing)
        w = round(g.get("width") or 0, 2)
        if w <= 0.36 or on_dimension(g): return "dims"   # dimension and extension lines (some share the wall pen)
        r = g["rect"]
        if w >= 1.0 and 9 < r.width < 10.5 and 9 < r.height < 10.5: return "columns"   # 15 cm column: square + cross
        if w >= 1.0: return "posts" if any(i[0] == "c" for i in g["items"]) else "marks"   # deck/garage posts; section markers A-D
        return "walls"                                   # walls, columns outlines, window and door frames
    return "furniture" if (g.get("width") or 0) > 0.3 else "detail"

def path_d(items):
    d, f = [], lambda p: f"{p.x:.2f} {p.y:.2f}"
    for it in items:
        k = it[0]
        if k == "l": d.append(f"M{f(it[1])}L{f(it[2])}")
        elif k == "c": d.append(f"M{f(it[1])}C{f(it[2])} {f(it[3])} {f(it[4])}")
        elif k == "re": r = it[1]; d.append(f"M{r.x0:.2f} {r.y0:.2f}H{r.x1:.2f}V{r.y1:.2f}H{r.x0:.2f}Z")
        elif k == "qu": q = it[1]; d.append(f"M{f(q.ul)}L{f(q.ur)}L{f(q.lr)}L{f(q.ll)}Z")
    return "".join(d)

# The model is newer than the plan. Discarded in the design (PDF-point boxes): the kitchen bar and its two stools,
# and the column on the kitchen's outer wall. Added from the model: the column next to the stair (model x, z).
DISCARD = [(fitz.Rect(374, 168, 436, 324), ("detail", "furniture", "fills")), (fitz.Rect(459, 161, 472, 174), ("columns",))]
ADD_COLUMNS = [(8.035, -7.674)]
def discarded(g, k): return any(k in layers and r.contains(g["rect"]) for r, layers in DISCARD)

groups = {k: [] for k in ("fills", "detail", "furniture", "dims", "marks", "cladding", "posts", "walls", "columns")}
for g in page.get_drawings():
    d, k = path_d(g["items"]), layer(g)
    if d and not discarded(g, k): groups[k].append((d, g.get("width") or 0))

# Plan -> model: the outer slab rectangle is 7.80 x 11.50 m. In the PDF it spans x 200.70…643.02, y 132.72…784.80 (pt), 56.7 pt per metre on both axes.
# The model's slab: x 0.5…12 along the plan's vertical, z -2.8…-10.6 along the plan's horizontal (deck on the left = +z).
SLAB = {"pdf": [200.70, 132.72, 643.02, 784.80], "m": [7.80, 11.50]}
ptm = ((SLAB["pdf"][2] - SLAB["pdf"][0]) / SLAB["m"][0] + (SLAB["pdf"][3] - SLAB["pdf"][1]) / SLAB["m"][1]) / 2

W, H = page.rect.width, page.rect.height
style = {"walls": 'stroke="#111" stroke-width="0.6"', "columns": 'stroke="#111" stroke-width="1.08"', "fills": 'fill="#fff"', "cladding": 'stroke="#8d4c01" stroke-width="0.5"',
         "furniture": 'stroke="#808080" stroke-width="0.4"', "dims": 'stroke="#111" stroke-width="0.24"',
         "marks": 'stroke="#111" stroke-width="1.08"', "posts": 'stroke="#111" stroke-width="1.08"', "detail": 'stroke="#999" stroke-width="0.24"'}
svg = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.2f} {H:.2f}" width="{W:.0f}" height="{H:.0f}" fill="none" stroke-linecap="round" stroke-linejoin="round">',
       f'<!-- Rancho Relaxo floor plan. Units: PDF points, {ptm:.3f} pt = 1 m. Mapping to the 3D model in planta.json -->']
for k, items in groups.items():
    svg.append(f'<g id="{k}" {style[k]}>' + "".join(f'<path d="{d}"/>' for d, _ in items) + "</g>")
# columns added from the model, drawn like the plan's own: 9.6 pt square with a cross, placed with the fitted mapping
try: fit = json.load(open(os.path.join(OUT, "planta.json")))["toModel"]
except Exception: fit = None
if fit and ADD_COLUMNS:
    h, d = 4.8, []
    for x, z in ADD_COLUMNS:
        px, py = (z - fit["z"]["offset"]) / fit["z"]["perPt"], (x - fit["x"]["offset"]) / fit["x"]["perPt"]
        d.append(f"M{px-h:.2f} {py-h:.2f}H{px+h:.2f}V{py+h:.2f}H{px-h:.2f}ZM{px-h:.2f} {py-h:.2f}L{px+h:.2f} {py+h:.2f}M{px+h:.2f} {py-h:.2f}L{px-h:.2f} {py+h:.2f}")
    svg.append(f'<g id="columns-added" {style["columns"]}>' + "".join(f'<path d="{x}"/>' for x in d) + "</g>")
svg.append("</svg>")
os.makedirs(OUT, exist_ok=True)
open(os.path.join(OUT, "planta.svg"), "w").write("\n".join(svg))
x0, y0 = SLAB["pdf"][0], SLAB["pdf"][1]
try: keep = json.load(open(os.path.join(OUT, "planta.json"))).get("toModel")
except Exception: keep = None
json.dump({
    "units": "pdf points", "pointsPerMetre": round(ptm, 4), "viewBox": [0, 0, round(W, 2), round(H, 2)], "slabPdf": SLAB["pdf"],
    "toModel": keep or "not fitted yet",
    "layers": {k: len(v) for k, v in groups.items()},
}, open(os.path.join(OUT, "planta.json"), "w"), indent=2)
print({k: len(v) for k, v in groups.items()}, "ppm", round(ptm, 3), os.path.getsize(os.path.join(OUT, "planta.svg")) // 1024, "KB")
