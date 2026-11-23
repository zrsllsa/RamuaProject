"""
Removes the white outline around the '?' in onboarding_2.json.

Figma baked the '?' drop-shadow images (asset_1 = dot, asset_3 = hook) as OPAQUE
white/gray pixels. Behind the vector '?', the white part shows as an outline.
This converts each pixel to black with alpha = darkness, so on white it looks
identical to the original shadow, but the white part becomes transparent.
Only those two images change; layers, movement and layout are untouched.

Run: python scripts/fix-onboarding2-shadow.py
"""
import base64, io, json, os
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'assets-backup', 'onboarding_2.original.json')
DST = os.path.join(ROOT, 'assets', 'ramuanimation', 'onboarding_2.json')
TARGETS = {'asset_1', 'asset_3'}

with open(SRC, encoding='utf-8') as f:
    anim = json.load(f)

for asset in anim['assets']:
    if asset.get('id') not in TARGETS:
        continue
    head, b64 = asset['p'].split(',', 1)
    im = Image.open(io.BytesIO(base64.b64decode(b64))).convert('RGBA')
    out = Image.new('RGBA', im.size)
    src, dst = im.load(), out.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = src[x, y]
            lum = (r * 299 + g * 587 + b * 114) / 1000
            alpha = round(a * (255 - lum) / 255)
            dst[x, y] = (0, 0, 0, alpha)
    buf = io.BytesIO()
    out.save(buf, 'PNG', optimize=True)
    asset['p'] = 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()
    print('fixed', asset['id'], im.size)

with open(DST, 'w', encoding='utf-8') as f:
    json.dump(anim, f, separators=(',', ':'), ensure_ascii=False)
print('wrote', DST)
