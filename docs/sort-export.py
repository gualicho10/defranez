#!/usr/bin/env python3
"""Ordena el export de Figma en _export-figma/<seccion>/.

El export cae plano y con los nombres de capa del Figma; algunas piezas son
frames enteros con nombre generico (Container, Frame-2). Este script los mueve
a la carpeta de cada seccion renombrados como <grupo>-<orden>-<slug>.png, que
es de donde build-more-work.py saca la composicion.

La correspondencia salio de cruzar los nombres de capa del nodo 3001-7050 con
las relaciones de aspecto del export (hecho a 2x).

Uso:  python3 docs/sort-export.py [--move]      (por defecto copia)
"""
import pathlib
import re
import shutil
import sys
import unicodedata

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "img" / "otras cosas"
DST = ROOT / "_export-figma"
MOVE = "--move" in sys.argv

# (seccion, [(grupo, [nombres de archivo sin extension, en orden del Figma])])
# Un grupo es una columna (cards), una fila (branding, press) o un bloque.
PLAN = {
    "1_cards-flyers": {
        "c1": ["1-front 1", "1463093_754507931231219_946672623_n 1", "Feed 2 2",
               "28-NOV-2013 1", "Fecha-1_Feed_OP1 1"],
        "c2": ["flyer-14-nov 1", "15-feb-ONYX 1", "2-back 1", "Poster Image"],
        "c3": ["1-back 1", "488013_754507951231217_1259368847_n 1",
               "FLORA-1-AÑO-jazzdoit 1", "Poster Image-1"],
        "c4": ["Baltu 2 años-OP2 1", "flyer 1", "Poster", "Story 1"],
        "c5": ["2-front 1", "flyer2 1", "flyer-01-07 1", "flyer_sol-liebeskind 1",
               "Flyer-story_OID-MORTALES 2 1"],
        # c6 no vino en el export (4 piezas). Al agregarla entra sola.
        "c7": ["Baltu 2años-OP1 1", "muestra 1", "Pairol 1"],
        "c8": ["marito 1", "flyer 2", "retoqueImagen2 1",
               "PHOTO-2026-05-19-09-27-44 (1) 1", "Event Poster",
               "Flyer_4Abril_Lucille_feed 2"],
        "c9": ["Flyer_Save the Date 1", "flyer-tobias-1-año_2 1", "22JUN-BURLESQUE 1"],
    },
    "2_branding": {
        "g1": ["logo-defranez 1", "logos 1", "logos 3", "logos 2", "logo-adaptaciones 1"],
        "g2": ["Frame", "Frame 131", "Frame 129", "logo_OID-MORTALES 1"],
    },
    "3_illustration": {
        # Un grupo por parada del carrusel: BOLA, My Tribe, todo lo de zombies
        # junto (es un solo proyecto) y los autos.
        # game-iOS 1 no vino en el export.
        "g1": ["game-ipad1 1"],
        "g2": ["game-ipad2 1"],
        "g3": ["Building Illustrations", "Screen", "Frame-1"],
        "g4": ["Frame 144"],
    },
    "4_photo-ai": {
        # Mundos_Story-sin-fecha 1 y Previsualizacion 1 no vinieron.
        "g1": ["tapa 1", "Tapa_baja 1", "Contratapa_baja 1"],
        "g2": ["Container", "Frame-2", "retoqueImagen 3"],
    },
    "5_press-packaging": {
        "g1": ["Container-1", "Frame-3"],
        "g2": ["Container-2"],
    },
}


def slug(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return re.sub(r"-+", "-", s)[:44]


def main():
    if not SRC.exists():
        sys.exit(f"no existe {SRC}")

    missing, moved = [], 0
    for section, groups in PLAN.items():
        out = DST / section
        out.mkdir(parents=True, exist_ok=True)
        for group, names in groups.items():
            for i, name in enumerate(names, 1):
                hits = [p for p in SRC.iterdir()
                        if p.stem == name and p.suffix.lower() in {".png", ".jpg", ".jpeg"}]
                if not hits:
                    missing.append(f"{section}/{group}: {name}")
                    continue
                src = hits[0]
                dst = out / f"{group}-{i:02d}-{slug(name)}{src.suffix.lower()}"
                if MOVE:
                    shutil.move(str(src), dst)
                else:
                    shutil.copy2(src, dst)
                moved += 1
        n = len(list(out.iterdir()))
        print(f"  {section}: {n} archivos")

    print(f"\n{'movidos' if MOVE else 'copiados'}: {moved}")
    if missing:
        print(f"\nNO ENCONTRADOS ({len(missing)}):")
        for m in missing:
            print(f"  {m}")

    leftover = [p.name for p in SRC.iterdir()
                if p.suffix.lower() in {".png", ".jpg", ".jpeg"}]
    if leftover:
        print(f"\nquedan en 'img/otras cosas' ({len(leftover)}): {', '.join(sorted(leftover))}")


if __name__ == "__main__":
    main()
