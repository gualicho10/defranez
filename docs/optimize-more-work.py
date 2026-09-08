#!/usr/bin/env python3
"""Optimiza el export de Figma para more-work.html.

Lee  _export-figma/<seccion>/*.{png,jpg,jpeg}
Deja img/more-work/<seccion>/<nombre>-<ancho>.webp  + manifest.json

De cada original saca los anchos del srcset. El chico alimenta el masonry de
157px del desktop; el grande, la vista mobile donde la misma imagen ocupa el
100% del viewport (a 3x de densidad son ~1200px reales). Nunca agranda: si el
original es mas chico que el objetivo, ese ancho se saltea.

Uso:  python3 docs/optimize-more-work.py [--force]
"""
import json
import pathlib
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "_export-figma"
DST = ROOT / "img" / "more-work"
QUALITY = "80"

# Las secciones con piezas a todo el ancho necesitan un tercer ancho.
WIDTHS = {
    "1_cards-flyers": [400, 1200],
    "2_branding": [400, 1200],
    "3_illustration": [400, 1200, 1600],
    "4_photo-ai": [400, 1200, 1600],
    "5_press-packaging": [400, 1200, 1600],
}
FORCE = "--force" in sys.argv


def need(binary):
    if not shutil.which(binary):
        sys.exit(f"falta {binary} (brew install webp)")


def dimensions(path):
    """Ancho y alto via sips, que lee todo lo que abre macOS."""
    out = subprocess.run(
        ["sips", "-g", "pixelWidth", "-g", "pixelHeight", str(path)],
        capture_output=True, text=True,
    ).stdout
    w = h = None
    for line in out.splitlines():
        if "pixelWidth:" in line:
            w = int(line.split(":")[1])
        elif "pixelHeight:" in line:
            h = int(line.split(":")[1])
    if not w or not h:
        raise RuntimeError(f"no pude leer dimensiones de {path.name}")
    return w, h


def to_webp(src, dst, width=None):
    """cwebp, con un rescate para los JPEG en CMYK que libjpeg no convierte."""
    cmd = ["cwebp", "-quiet", "-q", QUALITY]
    if width:
        cmd += ["-resize", str(width), "0"]
    r = subprocess.run(cmd + [str(src), "-o", str(dst)], capture_output=True, text=True)
    if r.returncode == 0:
        return "ok"

    # Origen de imprenta: se pasa a sRGB y se reintenta.
    if "color conversion" not in (r.stderr or ""):
        raise RuntimeError(f"cwebp fallo en {src.name}: {r.stderr.strip()}")
    tmp = dst.with_suffix(".rgb.png")
    subprocess.run(
        ["sips", "-s", "format", "png", "--matchTo",
         "/System/Library/ColorSync/Profiles/sRGB Profile.icc",
         str(src), "--out", str(tmp)],
        capture_output=True, check=True,
    )
    r2 = subprocess.run(cmd + [str(tmp), "-o", str(dst)], capture_output=True, text=True)
    tmp.unlink(missing_ok=True)
    if r2.returncode != 0:
        raise RuntimeError(f"cwebp fallo en {src.name} tambien en RGB: {r2.stderr.strip()}")
    return "cmyk"


def main():
    need("cwebp")
    if not SRC.exists():
        sys.exit(f"no existe {SRC}")

    manifest, totals, cmyk_fixed = {}, [0, 0], []

    for section in sorted(p for p in SRC.iterdir() if p.is_dir()):
        widths = WIDTHS.get(section.name, [400, 1200])
        outdir = DST / section.name
        outdir.mkdir(parents=True, exist_ok=True)
        entries = []

        files = sorted(
            f for f in section.iterdir()
            if f.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}
        )
        if not files:
            print(f"  {section.name}: vacia, salteo")
            continue

        for f in files:
            w, h = dimensions(f)
            totals[0] += f.stat().st_size
            variants = []

            # Sin upscaling: cada objetivo se recorta al ancho nativo y se
            # deduplica, asi un original chico no genera variantes identicas.
            for eff in sorted({min(t, w) for t in widths}):
                out = outdir / f"{f.stem}-{eff}.webp"
                if out.exists() and not FORCE:
                    variants.append({"w": eff, "file": out.name,
                                     "bytes": out.stat().st_size})
                    totals[1] += out.stat().st_size
                    continue
                if to_webp(f, out, eff if eff < w else None) == "cmyk":
                    cmyk_fixed.append(f.name)
                variants.append({"w": eff, "file": out.name,
                                 "bytes": out.stat().st_size})
                totals[1] += out.stat().st_size

            entries.append({
                "name": f.stem,
                "src_w": w,
                "src_h": h,
                "ratio": round(w / h, 4),
                "variants": variants,
            })

        manifest[section.name] = entries
        kb = sum(v["bytes"] for e in entries for v in e["variants"]) / 1024
        print(f"  {section.name}: {len(entries)} imagenes -> {kb:.0f}KB")

    (DST / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    # Borra los webp que ya no corresponden a ningun origen. Sin esto, un
    # renombre en _export-figma deja la version vieja publicada para siempre:
    # paso una vez y se fueron 12MB al repo sin que nadie los use.
    keep = {f"{s}/{v['file']}" for s, es in manifest.items()
            for e in es for v in e["variants"]}
    pruned = 0
    for d in DST.iterdir():
        if not d.is_dir():
            continue
        for f in d.iterdir():
            if f.suffix == ".webp" and f"{d.name}/{f.name}" not in keep:
                totals[1] -= f.stat().st_size
                f.unlink()
                pruned += 1
    if pruned:
        print(f"\nhuerfanos borrados: {pruned}")

    print()
    if cmyk_fixed:
        print(f"CMYK reparados: {', '.join(sorted(set(cmyk_fixed)))}")
    print(f"origen : {totals[0]/1024/1024:.1f}MB")
    print(f"webp   : {totals[1]/1024/1024:.2f}MB")
    if totals[0]:
        print(f"ahorro : {100 - totals[1]/totals[0]*100:.0f}%")
    print(f"\nmanifest: {DST / 'manifest.json'}")


if __name__ == "__main__":
    main()
