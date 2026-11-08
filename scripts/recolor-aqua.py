#!/usr/bin/env python3
"""
Recolor ElyShield from the gold palette to the aqua logo palette.

Source of truth is public/brand/logo-mark.png:
  background  #000513   (deep navy)
  base        #69fae9   (aqua)
  light       #a4fbf3 / #d4fffa
  mid         #2dd9d1
  shadow      #0f9e97 / #075b64

Two families are rewritten:
  gold   (brand / CTA / accent)   -> aqua
  amber  (progress)               -> aqua-mid, keeping it one step away

Progress deliberately maps to #2dd9d1, not #69fae9: the semantic split the
codebase documents (action vs progress must be tellable apart at a glance)
breaks if both become the same hue.

Run from the repo root. Every replacement is asserted; the script fails loudly
if a token it expects is missing.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# ---- exact colour map (lowercase keys; matching is case-insensitive) --------
HEX = {
    # gold family -> aqua family
    "d1a413": "69fae9",   # base brand gold -> base aqua
    "f5daa2": "d4fffa",   # gradient light
    "e9c35f": "b3fdf4",   # gradient light-mid
    "b68708": "0f9e97",   # gradient dark
    "7a5f0a": "075b64",   # gradient darkest
    "f5e3b3": "d4fffa",   # ::selection text on aqua tint
    "f6b621": "69fae9",   # logo gradient mid
    "f2b526": "69fae9",   # logo gradient mid (brand asset generator)
    "ffd86b": "d4fffa",   # logo gradient light
    "c98a10": "0f9e97",   # logo gradient dark
    "bf8e25": "0f9e97",
    # amber family -> aqua-mid (progress stays distinguishable)
    "f0a13a": "2dd9d1",
    "e5a23c": "2dd9d1",
    # brand ink -> the logo's own navy
    "031020": "000513",
}

# ---- rgba() triples ---------------------------------------------------------
# key = the three numbers in order, value = the replacement triple
RGB_TRIPLE = {
    (209, 164, 19): (105, 250, 233),   # gold -> aqua
    (240, 161, 58): (45, 217, 209),    # amber -> aqua-mid
    (246, 182, 33): (105, 250, 233),   # logo mid -> aqua
}
RGB_TRIPLE_COMPACT = {
    "105,250,233": "105,250,233",
    "45,217,209": "45,217,209",
    "105,250,233": "105,250,233",
}

# ---- HSL tokens (globals.css :root) ----------------------------------------
# #69fae9 -> 173 94% 70%   (aqua, the logo base)
# #2dd9d1 -> 176 69% 51%   (aqua-mid, progress)
# #000513 -> 224 100% 4%   (logo navy, replaces the old gold-tinted ink)
HSL_VALUES = {
    "46 83% 45%": "173 94% 70%",     # gold -> aqua
    "225 88% 3%": "224 100% 4%",     # old navy bg -> logo navy
}

SKIP_DIRS = {"node_modules", ".git", ".next", "out", ".next/types"}
EXTS = {".ts", ".tsx", ".css", ".py", ".mjs", ".json", ".svg"}


def files():
    for p in ROOT.rglob("*"):
        if not p.is_file() or p.suffix not in EXTS:
            continue
        if any(part in SKIP_DIRS for part in p.parts):
            continue
        if "package-lock.json" in p.name:
            continue
        if "brand-mark.ts" in p.name:      # old traced path: replaced wholesale
            continue
        if p.name == "recolor-aqua.py":    # this script's own colour map
            continue
        yield p


def transform(text: str):
    """Return (new_text, n_hex, n_rgb, n_hsl)."""
    n_hex = n_rgb = n_hsl = 0

    # hex — preserve the original's case style (upper stays upper)
    def hex_sub(m):
        nonlocal n_hex
        raw = m.group(1)
        low = raw.lower()
        if low not in HEX:
            return m.group(0)
        new = HEX[low]
        n_hex += 1
        if raw.isupper():
            return m.group(0)[:1] if False else "#" + new.upper()
        return "#" + new

    text = re.sub(r"#([0-9a-fA-F]{6})\b", hex_sub, text)

    # rgba/rgb with spaces, e.g. rgba(105, 250, 233, 0.18
    # Capture the three channels separately and keep whatever trails them
    # (the alpha, including a leading comma) verbatim.
    def rgb_sub2(m):
        nonlocal n_rgb
        key = (int(m.group(2)), int(m.group(3)), int(m.group(4)))
        if key not in RGB_TRIPLE:
            return m.group(0)
        new = RGB_TRIPLE[key]
        n_rgb += 1
        return f"{m.group(1)}{new[0]}, {new[1]}, {new[2]}{m.group(5)})"

    text = re.sub(
        r"(rgba?\()\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})([0-9.,\s]*)\)",
        rgb_sub2, text)

    # compact rgba with no spaces
    for old, new in RGB_TRIPLE_COMPACT.items():
        if old in text:
            n_rgb += text.count(old)
            text = text.replace(old, new)

    # HSL tokens in :root — match the token name, rewrite its value in place.
    # (Matching the whole "name: value" pair as one key does not work: the
    # string still exists at match time, so the guard passes for the first
    # replacement and silently misses on re-runs.)
    def hsl_sub(m):
        nonlocal n_hsl
        name, val = m.group(1), m.group(2)
        if val not in HSL_VALUES:
            return m.group(0)
        n_hsl += 1
        return f"{name}: {HSL_VALUES[val]};"

    text = re.sub(r"(--[a-z-]+):\s*(\d{1,3}\s+\d{1,3}%\s+\d{1,3}%);", hsl_sub, text)

    return text, n_hex, n_rgb, n_hsl


def main():
    changed = []
    total = [0, 0, 0]
    for p in files():
        try:
            src = p.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        new, a, b, c = transform(src)
        if new != src:
            p.write_text(new, encoding="utf-8")
            changed.append((p.relative_to(ROOT), a, b, c))
            total[0] += a
            total[1] += b
            total[2] += c

    print(f"files changed : {len(changed)}")
    print(f"hex replaced  : {total[0]}")
    print(f"rgb replaced  : {total[1]}")
    print(f"hsl token     : {total[2]}")
    print()
    for rel, a, b, c in sorted(changed, key=lambda x: -(x[1] + x[2] + x[3]))[:25]:
        print(f"  {str(rel):55} hex={a:3} rgb={b:3} hsl={c}")

    # ---- assertions --------------------------------------------------------
    print("\n=== assertions ===")
    bad = []
    for p in files():
        try:
            t = p.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        if re.search(r"#(d1a413|f0a13a|e5a23c|b68708|7a5f0a)\b", t, re.I):
            bad.append((p.relative_to(ROOT), "gold/amber hex still present"))
        if "46 83% 45%" in t:
            bad.append((p.relative_to(ROOT), "gold HSL token still present"))
    if bad:
        for f, why in bad:
            print(f"  FAIL {f}: {why}")
        sys.exit(1)
    print("  OK: no gold/amber hex, no gold HSL token")


if __name__ == "__main__":
    main()
