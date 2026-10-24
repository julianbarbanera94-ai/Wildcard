# Builds the app icon set from the supplied artwork: python3 tools/make-icon.py <artwork.png>
# The artwork (a rounded square on white) is cut out with its own mask and given a thin white line around it.
# Android adaptive icon: background = the artwork enlarged and blurred, foreground = the outlined design in the safe zone.
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageChops
src = Image.open(sys.argv[1]).convert('RGB')
W, H = src.size
px = src.load()
# bounding box of the coloured square (the white backdrop and soft shadow are very light)
xs, ys = [], []
for y in range(0, H, 2):
    for x in range(0, W, 2):
        r, g, b = px[x, y]
        if min(r, g, b) < 200: xs.append(x); ys.append(y)
x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
side = max(x1 - x0, y1 - y0); cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
box = (cx - side // 2, cy - side // 2, cx + side // 2, cy + side // 2)
art = src.crop(box)
def rounded(size, radius_frac, inset=0, ss=4):
    m = Image.new('L', (size * ss, size * ss), 0)
    ImageDraw.Draw(m).rounded_rectangle((inset * ss, inset * ss, (size - inset) * ss - 1, (size - inset) * ss - 1), radius=int(size * ss * radius_frac), fill=255)
    return m.resize((size, size), Image.LANCZOS)
R = 0.25
def outlined(size, line):
    """The design at `size` px square with a thin white line just inside its edge, on transparent."""
    a = art.resize((size, size), Image.LANCZOS).convert('RGBA')
    outer = rounded(size, R); inner = rounded(size, R, inset=line)
    ring = ImageChops.subtract(outer, inner)
    white = Image.new('RGBA', (size, size), (255, 255, 255, 255))
    a = Image.composite(white, a, ring)
    a.putalpha(outer)
    return a
def adaptive(n, fg_path, bg_path):
    safe = round(n * 288 / 432)
    fg = Image.new('RGBA', (n, n), (0, 0, 0, 0)); d = outlined(safe, max(2, round(safe * .012)))
    fg.paste(d, ((n - safe) // 2, (n - safe) // 2), d); fg.save(fg_path)
    bg = art.resize((n, n), Image.LANCZOS).filter(ImageFilter.GaussianBlur(n * .06)).convert('RGBA')
    bg = Image.blend(bg, Image.new('RGBA', (n, n), (14, 40, 96, 255)), .35); bg.save(bg_path)
for d, n, leg in (('xxhdpi', 324, 144), ('xxxhdpi', 432, 192)):
    adaptive(n, f'android/res/mipmap-{d}/ic_launcher_fg.png', f'android/res/mipmap-{d}/ic_launcher_bg.png')
    outlined(leg, max(2, round(leg * .014))).save(f'android/res/mipmap-{d}/ic_launcher.png')
outlined(512, 7).save('icon.png')
print('icons written; artwork box', box)
