"""Extract the ElyShield mark from the supplied JPEG and build every asset the
web app needs, all with a transparent background.

The source is the aqua ribbon-knot mark on a near-black navy field. It is a
glossy 3D gradient (near-white mint highlights down to deep teal shadow), so the
cut-out is done by distance from the flat background colour rather than by
luminance: lum thresholding would keep the dark teal shadow and drop nothing,
because the shadow is darker than the background is bright.

Outputs (all RGBA, transparent):
  src/app/icon.png            512  app icon
  src/app/apple-icon.png      180  iOS home screen
  src/app/favicon.ico         multi-size 16..256
  public/brand/logo-mark.png  512  plain mark for README / header / animation
  public/seo/opengraph-image.png   1200x630 share card
  public/seo/twitter-image.png     same art
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SRC = Path("/mnt/c/Users/bobby/Downloads/photo_2026-11-08_21-44-43.jpg")

# Palette sampled from the logo itself.
AQUA = (105, 250, 233)        # #69fae9  base accent
AQUA_LIGHT = (212, 255, 250)  # #d4fffa  gradient light
AQUA_MID = (45, 217, 209)     # #2dd9d1  progress / secondary step
NAVY = (0, 5, 19)             # #000513  logo field == site background
TEXT = (230, 233, 239)
MUTED = (120, 130, 148)

TITLE = "ElyShield"
TAGLINE = "Post-quantum envelopes for files, messages and agents."
FOOTER = "elyshield.xyz"


def load_mark() -> Image.Image:
    """Return the mark as RGBA with a transparent background.

    Alpha comes from the colour distance to the flat background, sampled off
    the border ring. A soft ramp (7th..99th percentile of that distance) keeps
    the antialiased edges instead of producing a hard, jagged cutout.
    """
    im = Image.open(SRC).convert("RGB")
    a = np.asarray(im).astype(np.float32)

    ring = np.concatenate([
        a[:20].reshape(-1, 3), a[-20:].reshape(-1, 3),
        a[:, :20].reshape(-1, 3), a[:, -20:].reshape(-1, 3),
    ])
    bg = np.median(ring, axis=0)

    dist = np.sqrt(((a - bg) ** 2).sum(axis=2))
    lo, hi = np.percentile(dist, 70), np.percentile(dist, 99)
    alpha = np.clip((dist - lo) / (hi - lo), 0, 1) * 255

    rgba = np.dstack([a, alpha]).astype(np.uint8)
    out = Image.fromarray(rgba, "RGBA")

    # Crop to the mark, then pad a little so nothing touches the frame.
    ys, xs = np.where(alpha > 8)
    pad = int(max(xs.max() - xs.min(), ys.max() - ys.min()) * 0.04)
    out = out.crop((
        int(max(0, xs.min() - pad)), int(max(0, ys.min() - pad)),
        int(min(out.width, xs.max() + pad)), int(min(out.height, ys.max() + pad)),
    ))
    return out


def square(mark: Image.Image, size: int, pad_ratio: float = 0.10) -> Image.Image:
    """Centre the mark in a square canvas, transparent, with padding."""
    inner = int(size * (1 - 2 * pad_ratio))
    scale = min(inner / mark.width, inner / mark.height)
    w, h = max(1, int(mark.width * scale)), max(1, int(mark.height * scale))
    resized = mark.resize((w, h), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(resized, ((size - w) // 2, (size - h) // 2), resized)
    return canvas


def load_font(size: int, bold: bool = False):
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold
        else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold
        else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for c in candidates:
        if Path(c).exists():
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()


def make_og(mark: Image.Image, w: int = 1200, h: int = 630) -> Image.Image:
    """Share card: mark on the left, name + tagline on the right."""
    card = Image.new("RGB", (w, h), NAVY)

    # soft aqua glow behind the mark
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((70, h // 2 - 190, 470, h // 2 + 190), fill=(*AQUA, 46))
    glow = glow.filter(ImageFilter.GaussianBlur(70))
    card = Image.alpha_composite(card.convert("RGBA"), glow).convert("RGB")
    d = ImageDraw.Draw(card)

    m = square(mark, 300, pad_ratio=0.04)
    card.paste(m, (110, (h - 300) // 2), m)

    d.text((480, 214), TITLE, font=load_font(76, bold=True), fill=AQUA)
    d.text((480, 310), TAGLINE.split(" and ")[0], font=load_font(30), fill=TEXT)
    d.text((480, 348), "and " + TAGLINE.split(" and ", 1)[1], font=load_font(30), fill=TEXT)
    d.text((480, 420), FOOTER, font=load_font(24), fill=MUTED)
    d.text((480, 452), "Built for Elysium", font=load_font(24), fill=MUTED)
    return card


def main() -> None:
    mark = load_mark()
    print(f"mark diekstrak: {mark.size[0]}x{mark.size[1]}, background transparan")

    # Sanity: the corners must be fully transparent.
    corner = mark.getpixel((2, 2))
    assert corner[3] == 0, f"corner not transparent: {corner}"
    print(f"  piksel sudut: {corner}  (alpha 0 = transparan)")

    (ROOT / "src/app").mkdir(parents=True, exist_ok=True)
    (ROOT / "public/seo").mkdir(parents=True, exist_ok=True)
    (ROOT / "public/brand").mkdir(parents=True, exist_ok=True)

    square(mark, 512, 0.08).save(ROOT / "src/app/icon.png")
    print("  src/app/icon.png            512x512")

    square(mark, 180, 0.08).save(ROOT / "src/app/apple-icon.png")
    print("  src/app/apple-icon.png      180x180")

    square(mark, 512, 0.06).save(ROOT / "public/brand/logo-mark.png")
    print("  public/brand/logo-mark.png  512x512")

    ico_sizes = [(s, s) for s in (16, 32, 48, 64, 128, 256)]
    square(mark, 256, 0.06).save(ROOT / "src/app/favicon.ico", sizes=ico_sizes)
    print(f"  src/app/favicon.ico         {len(ico_sizes)} ukuran")

    og = make_og(mark)
    og.save(ROOT / "public/seo/opengraph-image.png")
    og.save(ROOT / "public/seo/twitter-image.png")
    print("  public/seo/opengraph-image.png + twitter-image.png  1200x630")


if __name__ == "__main__":
    main()
