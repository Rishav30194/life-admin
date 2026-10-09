"""Draws the app icons into public/. Run from the repo root: python3 scripts/make-icons.py

Needs Pillow. The icons are generated rather than drawn by hand so a colour change is
one edit here, not four image files.
"""
from PIL import Image, ImageDraw

RED = (217, 58, 38)        # --crit in src/index.css
INK = (255, 246, 243)      # --crit-ink
SCALE = 4                  # draw large, then downsample, for smooth edges


def icon(size: int, mark: float) -> Image.Image:
    """A full-bleed red square with a check mark spanning `mark` of the width.

    Full bleed because iOS and Android round or mask the corners themselves; a
    transparent margin shows as a white border on the home screen.
    """
    s = size * SCALE
    img = Image.new("RGB", (s, s), RED)
    d = ImageDraw.Draw(img)
    w = s * mark
    x0, y0 = (s - w) / 2, (s - w * 0.78) / 2
    points = [
        (x0, y0 + w * 0.42),
        (x0 + w * 0.36, y0 + w * 0.76),
        (x0 + w, y0),
    ]
    d.line(points, fill=INK, width=round(s * 0.11), joint="curve")
    r = s * 0.055
    for x, y in (points[0], points[2]):
        d.ellipse((x - r, y - r, x + r, y + r), fill=INK)
    return img.resize((size, size), Image.LANCZOS)


icon(180, 0.56).save("public/apple-touch-icon.png")
icon(192, 0.56).save("public/icon-192.png")
icon(512, 0.56).save("public/icon-512.png")
# Maskable icons can be cropped to a circle, so the mark keeps inside the inner 80%.
icon(512, 0.44).save("public/icon-maskable-512.png")
