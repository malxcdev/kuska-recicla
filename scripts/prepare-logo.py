"""Prepara el logo de KUSKA Recicla: recorte, emblema circular y derivados web.

Genera en `public/`:
  - brand/kuska-mark.png       emblema sobre disco crema, fondo transparente (512 px)
  - brand/kuska-logo.png       logotipo completo con el nombre (900 px de ancho)
  - brand/og-image.png         imagen para compartir en redes (1200×630)
  - favicon.png                icono de pestaña (256 px)
  - apple-touch-icon.png       icono para iOS (180 px)
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

SRC = Path(
    r"C:\Users\USUARIO\.dsh\attachments\v1\objects\00\00ea4c4d9327a396f3fd0ced71c7ed435fcd1cea98255681dad3b4189e7c656f"
)
OUT = Path(r"D:\Kuska\kuska-recicla\public")
BRAND = OUT / "brand"
BRAND.mkdir(parents=True, exist_ok=True)

CREAM = (251, 250, 245)

img = Image.open(SRC).convert("RGB")
W, H = img.size
arr = np.asarray(img).astype(np.int16)

lum = arr.mean(axis=2)
sat = arr.max(axis=2) - arr.min(axis=2)
# El fondo es crema casi neutro; el dibujo es colorido o navy oscuro.
mask = (sat > 40) | (lum < 140)

counts = mask.sum(axis=1)
# Hueco entre el emblema y el texto: primera banda vacía del tercio inferior.
text_top = H
for y in range(int(H * 0.70), H):
    if counts[y] <= 5:
        for y2 in range(y, H):
            if counts[y2] > 5:
                text_top = y2
                break
        break
print(f"origen {W}x{H}; el texto empieza en y={text_top}")

emblem = mask[:text_top]
rows = np.where(emblem.sum(axis=1) > 5)[0]
cols = np.where(emblem.sum(axis=0) > 5)[0]
ex0, ey0, ex1, ey1 = int(cols[0]), int(rows[0]), int(cols[-1]) + 1, int(rows[-1]) + 1
print(f"emblema: x {ex0}-{ex1}, y {ey0}-{ey1} ({ex1 - ex0}×{ey1 - ey0})")

text = mask[text_top:]
trows = np.where(text.sum(axis=1) > 5)[0]
tcols = np.where(text.sum(axis=0) > 5)[0]
tx0, tx1 = int(tcols[0]), int(tcols[-1]) + 1
ty1 = int(trows[-1]) + 1 + text_top
print(f"texto: x {tx0}-{tx1}, y {text_top}-{ty1}")

# --- Emblema sobre disco crema, transparente por fuera -------------------------
piece = img.crop((ex0, ey0, ex1, ey1))
side = max(piece.size)
disc_size = int(side * 1.10)
disc = Image.new("RGBA", (disc_size, disc_size), CREAM + (255,))
disc.paste(piece, ((disc_size - piece.width) // 2, (disc_size - piece.height) // 2))

circle = Image.new("L", (disc_size * 4, disc_size * 4), 0)
ImageDraw.Draw(circle).ellipse((0, 0, circle.width - 1, circle.height - 1), fill=255)
disc.putalpha(circle.resize((disc_size, disc_size), Image.LANCZOS))

mark = disc.resize((256, 256), Image.LANCZOS)
mark.save(BRAND / "kuska-mark.png", optimize=True)
print("brand/kuska-mark.png", (BRAND / "kuska-mark.png").stat().st_size, "bytes")

# --- Logotipo completo ---------------------------------------------------------
logo = img.crop((min(ex0, tx0), ey0, max(ex1, tx1), ty1))
logo = logo.resize((760, round(logo.height * 760 / logo.width)), Image.LANCZOS)
logo.quantize(colors=256, method=Image.MEDIANCUT, dither=Image.FLOYDSTEINBERG).save(BRAND / "kuska-logo.png", optimize=True)
print("brand/kuska-logo.png", logo.size, (BRAND / "kuska-logo.png").stat().st_size, "bytes")


def badge(size: int) -> Image.Image:
    return mark.resize((size, size), Image.LANCZOS)


badge(128).save(OUT / "favicon.png", optimize=True)
badge(180).save(OUT / "apple-touch-icon.png", optimize=True)
print("favicon.png", (OUT / "favicon.png").stat().st_size, "bytes")
print("apple-touch-icon.png", (OUT / "apple-touch-icon.png").stat().st_size, "bytes")

# --- Imagen para compartir (1200×630) ------------------------------------------
og = Image.new("RGB", (1200, 630), CREAM)
art = logo.convert("RGB").resize((int(logo.width * 520 / logo.height), 520), Image.LANCZOS)
og.paste(art, ((1200 - art.width) // 2, (630 - art.height) // 2), art if art.mode == "RGBA" else None)
og.save(BRAND / "og-image.jpg", quality=88, optimize=True, progressive=True)
print("brand/og-image.png", (BRAND / "og-image.png").stat().st_size, "bytes")
