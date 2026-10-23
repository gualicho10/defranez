# Depth maps for ?look=depth: review/guide/depth-maps/depth-<n>.png (tools/3d/casa-depth.js) → assets/casa/depth/<id>.webp,
# grayscale, softened so the parallax stretches gently at object edges instead of tearing.
import sys
from pathlib import Path
from PIL import Image, ImageFilter, ImageOps
IDS = ['02-exterior', '03-cocina-living', '04-ventanal', '05-cuarto', '06-bano', '07-entrepiso1', '08-entrepiso2']
src, out = Path('review/guide/depth-maps'), Path('assets/casa/depth')
out.mkdir(parents=True, exist_ok=True)
for i, id_ in enumerate(IDS):
    im = ImageOps.autocontrast(Image.open(src / f'depth-{i:04d}.png').convert('L'), cutoff=1).filter(ImageFilter.GaussianBlur(3))   # full range per view
    im.save(out / f'{id_}.webp', quality=82)
    print(id_, im.size, (out / f'{id_}.webp').stat().st_size // 1024, 'KB')
