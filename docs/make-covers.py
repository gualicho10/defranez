#!/usr/bin/env python3
"""Genera los covers de las tarjetas del landing desde el export.

Las tarjetas van en escala de grises y con un panel negro al 81% encima, asi
que la eleccion prioriza forma y contraste, no color. Recorta al centro en la
relacion de la tarjeta (264/260) y sale WebP.

Uso:  python3 docs/make-covers.py
"""
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "_export-figma"
DST = ROOT / "img" / "less-rep"
RATIO = 264 / 260      # relacion de .lr-item
OUT_W = 600

PICKS = {
    # destino            origen                                        por que
    "cards-flyers": ("1_cards-flyers/c7-03-pairol-1.png",
                     "poster con figura y tipografia grandes, aguanta el gris"),
    "soft-branding": ("2_branding/g2-04-logo-oid-mortales-1.png",
                      "lettering suelto sobre negro, la marca mas reconocible"),
    "illustration": ("3_illustration/g4-01-frame-144.png",
                     "autos sobre blanco: maximo contraste y se lee ilustracion"),
    "misc": ("4_photo-ai/g1-01-tapa-1.png",
             "tapa de disco con tipografia grande, funciona en gris"),
    "packaging-press": ("5_press-packaging/g1-02-frame-3.png",
                        "latas y tapas: circulos repetidos, muy grafico"),
}


def dims(p):
    out = subprocess.run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", str(p)],
                         capture_output=True, text=True).stdout
    w = h = 0
    for line in out.splitlines():
        if "pixelWidth:" in line:
            w = int(line.split(":")[1])
        elif "pixelHeight:" in line:
            h = int(line.split(":")[1])
    return w, h


def main():
    if not shutil_which("cwebp"):
        sys.exit("falta cwebp")
    DST.mkdir(parents=True, exist_ok=True)

    for name, (rel, why) in PICKS.items():
        src = SRC / rel
        if not src.exists():
            print(f"  !! falta {rel}")
            continue
        w, h = dims(src)

        # Recorte centrado a la relacion de la tarjeta.
        if w / h > RATIO:
            cw, ch = int(round(h * RATIO)), h
        else:
            cw, ch = w, int(round(w / RATIO))

        tmp = DST / f"{name}.crop.png"
        subprocess.run(["sips", "-c", str(ch), str(cw), str(src), "--out", str(tmp)],
                       capture_output=True, check=True)
        out = DST / f"{name}.webp"
        subprocess.run(["cwebp", "-quiet", "-q", "82", "-resize", str(OUT_W), "0",
                        str(tmp), "-o", str(out)], capture_output=True, check=True)
        tmp.unlink(missing_ok=True)
        print(f"  {name:16} <- {rel.split('/')[1]:34} {out.stat().st_size//1024:>3}KB")
        print(f"  {'':16}    {why}")


def shutil_which(x):
    import shutil
    return shutil.which(x)


if __name__ == "__main__":
    main()
