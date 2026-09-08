#!/usr/bin/env python3
"""Genera more-work.html desde img/more-work/manifest.json.

El markup se genera en vez de escribirse a mano por una razon concreta: cada
<img> necesita su width/height real para que el browser reserve el espacio y la
pagina no salte mientras entran ~75 imagenes (CLS). A mano, alguno sale mal.

La composicion de cada seccion sale de LAYOUT, que replica el Figma
(node 3001-7050). Uso:  python3 docs/build-more-work.py
"""
import json
import math
import pathlib
import random
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "img" / "more-work" / "manifest.json"
OUT = ROOT / "more-work.html"

# ---------------------------------------------------------------------------
# Composicion por seccion, calcada del Figma. Cada seccion es una lista de
# bloques y cada bloque tiene su modo, porque el Figma mezcla: Illustration
# arranca con dos piezas a sangre y sigue con un mosaico de tres columnas.
#
#   masonry  columnas de 157px en una tira que se arrastra (Cards & Flyers)
#   marquee  cinta infinita, una fila por grupo, sentidos alternados
#   reel     tira horizontal donde cada parada entra completa en la pantalla:
#            la imagen se achica al alto util y se arrastra de a una
#
#   groups   "*" = todos los grupos del manifest, o una lista de prefijos
#   sizes    el atributo sizes del srcset: manda cuanto baja el browser
#   join     en reel, grupos que van juntos en una sola parada
#   repack   en masonry, rearma las columnas ignorando las del Figma para que
#            la tira sea mas ancha y mas baja (ver comentario en repack())
# ---------------------------------------------------------------------------
LAYOUT = {
    "1_cards-flyers": {
        "title": "Cards &amp; Flyers",
        "anchor": "cards-flyers",
        "blocks": [
            # Columnas mas cortas que las del Figma: la tira se hace mas ancha
            # y el arrastre pasa a tener sentido (antes casi no desbordaba).
            {"mode": "masonry", "groups": "*", "repack": 600,
             "sizes": "(max-width: 900px) 100vw, 157px"},
        ],
    },
    "2_branding": {
        "title": "Branding",
        "anchor": "branding",
        "blocks": [
            # Dos filas en sentidos opuestos. Duraciones distintas para que no
            # queden sincronizadas y se lea como una sola cinta.
            {"mode": "marquee", "groups": "*", "duration": [46, 54],
             "sizes": "(max-width: 900px) 100vw, 380px"},
        ],
    },
    "3_illustration": {
        "title": "Illustration &amp; Art Direction",
        "anchor": "illustration",
        "blocks": [
            # Cuatro paradas: BOLA, My Tribe, todo lo de zombies junto (mismo
            # proyecto) y los autos.
            {"mode": "reel", "groups": "*", "join": ["g3"],
             "sizes": "(max-width: 900px) 100vw, 90vh"},
        ],
    },
    "4_photo-ai": {
        "title": "Photo Editing + AI",
        "anchor": "photo-ai",
        "blocks": [
            {"mode": "reel", "groups": "*",
             "sizes": "(max-width: 900px) 100vw, 90vh"},
        ],
    },
    "5_press-packaging": {
        "title": "Press &amp; Packaging",
        "anchor": "press-packaging",
        "blocks": [
            # Estas dos son muy verticales: con la altura fija de las demas
            # entraban enteras pero angostas, con aire a los costados. A ancho
            # completo se leen, a cambio de un poco de scroll vertical.
            {"mode": "reel", "groups": "*", "mobile_full": ["m1-03", "m1-04"],
             "sizes": "(max-width: 900px) 100vw, 90vh"},
        ],
    },
}

GAP = 10
COL_W = 157
ROW_H = 300       # alto de las piezas en la cinta (ver .mw-row en el CSS)
PERIODO_MIN = 2400  # ancho minimo de media pista, para que no se vea el fondo


def srcset(entry):
    vs = sorted(entry["variants"], key=lambda v: v["w"])
    return ", ".join(f'img/more-work/{entry["_section"]}/{v["file"]} {v["w"]}w' for v in vs)


def largest(entry):
    return max(entry["variants"], key=lambda v: v["w"])


def tile(entry, sizes, clone=False, extra=""):
    """Una pieza. Si tiene variante mobile (sufijo @m en el export), sale como
    <picture>: en mobile no alcanza con achicar la de desktop, la composicion
    es otra."""
    v = largest(entry)
    attrs = ' data-clone aria-hidden="true"' if clone else ""
    m = entry.get("_mobile")
    fuente = ""
    if m:
        # width/height en el <source>: la version mobile tiene otra relacion de
        # aspecto que la de desktop, y sin esto el browser reserva la caja con
        # la proporcion equivocada y la pagina salta al cargar.
        fuente = (f'<source media="(max-width: 900px)" '
                  f'srcset="{srcset(m)}" sizes="100vw" '
                  f'width="{m["src_w"]}" height="{m["src_h"]}">')
    img = (
        f'<img src="img/more-work/{entry["_section"]}/{v["file"]}" '
        f'srcset="{srcset(entry)}" sizes="{sizes}" '
        f'width="{entry["src_w"]}" height="{entry["src_h"]}" '
        f'alt="" loading="lazy" decoding="async">'
    )
    cuerpo = f"<picture>{fuente}{img}</picture>" if m else img
    return f'<figure class="mw-tile{extra}"{attrs}>{cuerpo}</figure>'


def group_by_prefix(entries):
    """c1-01-foo, c1-02-bar, c2-01-baz -> {'c1': [...], 'c2': [...]}."""
    out = {}
    for e in entries:
        out.setdefault(e["name"].split("-")[0], []).append(e)
    for g in out.values():
        g.sort(key=lambda e: e["name"])
    return out


def repack(entries, target_h):
    """Rearma las columnas del masonry ignorando las del Figma.

    Con las columnas originales (~1058px) la tira medía menos que una pantalla
    ancha y el arrastre no tenia nada que arrastrar. Con columnas mas cortas
    entran mas, la seccion baja de alto y la tira se va a la derecha.

    El orden se mezcla con semilla fija: queda organico pero estable entre
    builds, para que el diff no cambie solo.
    """
    shuffled = list(entries)
    random.Random(20260908).shuffle(shuffled)

    cols, cur, h = [], [], 0.0
    for e in shuffled:
        eh = COL_W / e["ratio"] + GAP
        # Cierra la columna cuando pasarse queda mas lejos del objetivo que
        # cortar aca; asi ninguna queda mucho mas larga que el resto.
        if cur and abs(h + eh - target_h) > abs(h - target_h):
            cols.append(cur)
            cur, h = [], 0.0
        cur.append(e)
        h += eh
    if cur:
        cols.append(cur)
    return cols


def build_block(block, by_group, grupo_movil=None, set_movil=None):
    """Devuelve el markup de un bloque segun su modo."""
    mode, sizes = block["mode"], block["sizes"]
    grupo_movil = grupo_movil or {}
    set_movil = set_movil or []
    keys = sorted(by_group) if block["groups"] == "*" else block["groups"]
    groups = [by_group[k] for k in keys if k in by_group]
    if not groups:
        return "", 0

    n = sum(len(g) for g in groups)
    rows = []
    # Si la seccion trae set mobile propio, todo lo del modo es solo-desktop.
    solo_desk = " mw-only-desktop" if set_movil else ""

    if mode == "reel":
        # Cada grupo es una parada; los de "join" van juntos en una sola.
        join = set(block.get("join", []))
        slides = []
        for k in keys:
            if k not in by_group:
                continue
            if k in join:
                slides.append((by_group[k], grupo_movil.get(k)))
            else:
                slides.extend(([e], None) for e in by_group[k])
        n = len(slides)
        for piezas, movil in slides:
            # Un grupo con reemplazo mobile muestra sus piezas solo en desktop:
            # en mobile el envoltorio se disuelve y cada pieza seria un slide
            # aparte, cuando en realidad son una sola composicion.
            marca = solo_desk or (" mw-only-desktop" if movil else "")
            inner = "".join(tile(e, sizes, extra=marca) for e in piezas)
            if movil:
                inner += tile(movil, "100vw", extra=" mw-only-mobile")
            rows.append(f'      <div class="mw-slide">{inner}</div>')

    elif mode == "marquee":
        durs = block.get("duration", [50])
        for i, g in enumerate(groups):
            rev = " mw-row--rev" if i % 2 else ""

            # Una fila corta deja un hueco: la animacion corre media pista, asi
            # que si media pista no cubre la pantalla se ve el fondo detras.
            # Se repite el set hasta pasar PERIODO_MIN y recien ahi se duplica.
            ancho = sum(ROW_H * e["ratio"] + GAP for e in g)
            reps = max(1, math.ceil(PERIODO_MIN / ancho)) if ancho else 1

            tiles = "".join(tile(e, sizes, extra=solo_desk) for e in g)
            # Repeticiones y segunda vuelta van marcadas como clones: en mobile
            # esto es un carrusel y cada pieza tiene que aparecer una sola vez.
            relleno = "".join(tile(e, sizes, clone=True, extra=solo_desk)
                              for e in g * (reps - 1))
            vuelta = "".join(tile(e, sizes, clone=True, extra=solo_desk)
                             for e in g * reps)
            rows.append(f'      <div class="mw-row{rev}" '
                        f'style="--mw-dur:{durs[i % len(durs)] * reps}s">'
                        f'{tiles}{relleno}{vuelta}</div>')

    elif mode == "masonry":
        cols = repack([e for g in groups for e in g], block["repack"]) \
            if block.get("repack") else groups
        for g in cols:
            rows.append('      <div class="mw-col">'
                        + "".join(tile(e, sizes, extra=solo_desk) for e in g)
                        + "</div>")

    # El set mobile va al final y en cualquier modo: abajo de 900px los
    # envoltorios se disuelven y estas pasan a ser las unicas paradas.
    full = tuple(block.get("mobile_full", []))
    for e in set_movil:
        ancho = " mw-tile--full" if full and e["name"].startswith(full) else ""
        rows.append('      <div class="mw-slide">'
                    + tile(e, "100vw", extra=" mw-only-mobile" + ancho)
                    + "</div>")

    drag = ' data-drag="1"' if mode in ("masonry", "reel") else ""
    # El contador vive con su bloque: en mobile cada bloque es un carrusel.
    # El total lo pone el JS contando piezas visibles: desktop y mobile pueden
    # tener distinta cantidad de paradas en la misma seccion.
    return (
        f'    <div class="mw-block">\n'
        f'      <div class="mw-counter" hidden>'
        f'<b>01</b> / <span class="mw-total">{n:02d}</span>'
        f'<span class="mw-bar"><span></span></span></div>\n'
        f'      <div class="mw-flow mw-flow--{mode}"{drag}>\n'
        + "\n".join(rows)
        + "\n      </div>\n    </div>"
    ), n


def build_section(key, cfg, entries):
    for e in entries:
        e["_section"] = key

    # Las piezas con sufijo @m no son tiles propias: son la version mobile de
    # la que lleva el mismo nombre sin el sufijo. El caso "<grupo>-00-group@m"
    # reemplaza al grupo entero (una composicion rearmada para vertical).
    moviles = {e["name"][:-2]: e for e in entries if e["name"].endswith("@m")}
    entries = [e for e in entries if not e["name"].endswith("@m")]

    grupo_movil = {}
    for base, e in moviles.items():
        m = re.match(r"^(g\d+)-00-group$", base)
        if m:
            grupo_movil[m.group(1)] = e
    for e in entries:
        if e["name"] in moviles:
            e["_mobile"] = moviles[e["name"]]

    # Prefijo m1- : set de paradas propio de mobile. No es una recomposicion
    # de las de desktop sino otra secuencia (Photo + AI suma dos piezas que en
    # desktop no estan). Reemplaza al bloque entero abajo de 900px.
    set_movil = sorted((e for e in entries if e["name"].startswith("m")),
                       key=lambda e: e["name"])
    entries = [e for e in entries if not e["name"].startswith("m")]

    by_group = group_by_prefix(entries)

    blocks, total = [], 0
    for b in cfg["blocks"]:
        markup, n = build_block(b, by_group, grupo_movil, set_movil)
        if markup:
            blocks.append(markup)
            total += n
        set_movil = []   # solo al primer bloque de la seccion

    # El contador solo tiene sentido si la seccion es un unico carrusel en
    # mobile; con varios bloques cada uno lleva el suyo, asi que va afuera.
    return f"""  <section class="mw-sec" id="{cfg['anchor']}">
    <h2 class="mw-title">{cfg['title']}</h2>
    <p class="mw-meta">{total} piezas</p>
{chr(10).join(blocks)}
  </section>""", total


def main():
    if not MANIFEST.exists():
        sys.exit(f"falta {MANIFEST}\ncorre primero: python3 docs/optimize-more-work.py")
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))

    sections, missing = [], []
    for key, cfg in LAYOUT.items():
        entries = manifest.get(key) or []
        if not entries:
            missing.append(key)
            continue
        markup, total = build_section(key, cfg, entries)
        sections.append(markup)
        print(f"  {cfg['anchor']}: {total} imagenes")

    if missing:
        print("\nsin imagenes todavia: " + ", ".join(missing))

    css = (ROOT / "docs" / "more-work.css").read_text(encoding="utf-8")
    js = (ROOT / "docs" / "more-work.js").read_text(encoding="utf-8")

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>More Work — Ezequiel De Francisco</title>
  <meta name="description" content="Cards &amp; flyers, branding, illustration, photo editing and packaging — the wider body of design work by Ezequiel De Francisco.">
  <meta name="author" content="Ezequiel De Francisco">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <link rel="canonical" href="https://defranez.com/more-work.html">

  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Ezequiel De Francisco">
  <meta property="og:url" content="https://defranez.com/more-work.html">
  <meta property="og:title" content="More Work — Ezequiel De Francisco">
  <meta property="og:description" content="Cards &amp; flyers, branding, illustration, photo editing and packaging.">
  <meta property="og:image" content="https://defranez.com/img/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="https://defranez.com/img/og-image.png">

  <link rel="icon" type="image/png" href="img/favicon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap" rel="stylesheet"/>

  <script type="text/javascript">
    (function(c,l,a,r,i,t,y){{
        c[a]=c[a]||function(){{(c[a].q=c[a].q||[]).push(arguments)}};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    }})(window, document, "clarity", "script", "xz8v92eisk");
  </script>
  <style>
{css}
  </style>
</head>
<body>

  <div class="mw-backbar">
    <a class="mw-back" href="index.html#work"><span aria-hidden="true">&#8592;</span> Back</a>
  </div>

  <header class="mw-head">
    <p class="mw-eyebrow">Selected work &middot; the rest of it</p>
    <h1 class="mw-h1">A little bit of this,<br>a little bit of that</h1>
  </header>

{chr(10).join(sections)}

  <footer class="mw-foot">
    <a href="index.html#work">&#8592; Back to defranez.com</a>
  </footer>

  <script>
{js}
  </script>
</body>
</html>
"""
    OUT.write_text(html, encoding="utf-8")
    print(f"\nescrito: {OUT}  ({OUT.stat().st_size/1024:.0f}KB)")


if __name__ == "__main__":
    main()
