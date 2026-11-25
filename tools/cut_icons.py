"""Cuts the five material icons out of the author's picture (dark plain background, icons in a row).

Usage: python3 tools/cut_icons.py <picture> public/icons
Writes wood.png, plastic.png, rope.png, metal.png, glow.png: 128 px, transparent.
"""
import sys

import numpy as np
from PIL import Image

NAMES = ["wood", "plastic", "rope", "metal", "glow"]
SIZE = 128
SOFT = 70.0  # colour distance from the background that counts as fully opaque


def main(src: str, out: str) -> None:
    im = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
    bg = np.median(im.reshape(-1, 3), axis=0)
    dist = np.linalg.norm(im - bg, axis=2)
    alpha = np.clip((dist - 8) / SOFT, 0, 1)
    # Undo the blend with the background so edges keep their own colour.
    a = np.maximum(alpha, 1e-3)[..., None]
    rgb = np.clip((im - bg * (1 - a)) / a, 0, 255)

    cols = np.where((alpha > 0.5).sum(axis=0) > 2)[0]
    groups, start = [], cols[0]
    for p, q in zip(cols, cols[1:]):
        if q - p > 20:
            groups.append((start, p))
            start = q
    groups.append((start, cols[-1]))
    if len(groups) != len(NAMES):
        sys.exit(f"found {len(groups)} icons, expected {len(NAMES)}")

    for name, (x0, x1) in zip(NAMES, groups):
        rows = np.where((alpha[:, x0 : x1 + 1] > 0.5).sum(axis=1) > 0)[0]
        y0, y1 = rows[0], rows[-1]
        # Square crop around the icon, with room for a soft glow.
        cx, cy, half = (x0 + x1) / 2, (y0 + y1) / 2, max(x1 - x0, y1 - y0) / 2 * 1.12
        box = [int(round(v)) for v in (cx - half, cy - half, cx + half, cy + half)]
        col = rgb
        if name == "glow":
            # The halo was drawn as a dark blend on navy; give it the crystal's own light colour.
            halo = ((alpha < 0.85) | (rgb.mean(axis=2) < 150))[..., None]
            col = np.where(halo, np.array([150, 255, 215], np.float32), rgb)
        rgba = np.dstack([col, alpha * 255]).astype(np.uint8)
        tile = Image.fromarray(rgba, "RGBA").crop(box).resize((SIZE, SIZE), Image.LANCZOS)
        tile.save(f"{out}/{name}.png", optimize=True)
        print(name, box)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
