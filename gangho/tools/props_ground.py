# 길가 소품을 땅에 앉힌다 (python3 tools/props_ground.py <입력.webp> <이름> ...) → out/<이름>.webp: 발치를 땅으로 스미게 지우고, 발밑에 옅은 그림자를 그림 안에 함께 그린다 (아래로 PAD만큼 늘림 — ui_live.js PROP_PAD와 같게)
import numpy as np, sys
from PIL import Image, ImageFilter
PAD = .05
for src, name in zip(sys.argv[1::2], sys.argv[2::2]):
    im = Image.open(src).convert('RGBA'); w, h = im.size
    a = np.asarray(im).astype(float); A = a[..., 3] / 255
    # 1) 발치 스미기: 맨 아래 9%에서 알파를 0→1로, 좌우 끝도 아래쪽 띠에서만 둥글게
    y = np.linspace(0, 1, h)[:, None]; x = np.linspace(0, 1, w)[None, :]
    rows = np.where(A.max(1) > .1)[0]; base = rows.max() / h
    vfade = np.clip((base - y) / .09, 0, 1) ** .8
    band = np.clip((y - (base - .14)) / .14, 0, 1)
    cols = np.where(A[int(h * (base - .05)):int(h * base)].max(0) > .1)[0]; l, r = cols.min() / w, cols.max() / w
    hfade = np.clip(np.minimum(x - l, r - x) / max(.08 * (r - l), 1e-3), 0, 1)
    A2 = A * (vfade * (1 - band * (1 - hfade)) + (1 - band) * 0) ** 1
    A2 = np.maximum(A2, A * (1 - band))           # 위쪽(본체)은 그대로
    A2 = np.minimum(A2, A * vfade)
    # 2) 색: 무대 안개 쪽으로 살짝 (채도 ↓ · 따뜻한 회색 12%)
    rgb = a[..., :3]; L = rgb.mean(-1, keepdims=True); rgb = L + (rgb - L) * .82
    rgb = rgb * .88 + np.array([176, 164, 150]) * .12
    body = Image.fromarray(np.dstack([rgb, A2 * 255]).clip(0, 255).astype(np.uint8), 'RGBA')
    # 3) 그림자: 발치 너비만큼 납작한 타원, 흐리게
    ph = int(h * PAD); cw = Image.new('RGBA', (w, h + ph), (0, 0, 0, 0))
    sh = Image.new('L', (w, h + ph), 0); from PIL import ImageDraw
    cx, cy, rw, rh = (l + r) / 2 * w, base * h, (r - l) * w * .55, max(6, h * .035)
    ImageDraw.Draw(sh).ellipse([cx - rw, cy - rh, cx + rw, cy + rh], fill=105)
    sh = sh.filter(ImageFilter.GaussianBlur(max(4, h * .025)))
    cw.paste(Image.new('RGBA', cw.size, (38, 30, 24, 255)), (0, 0), sh)
    cw.alpha_composite(body, (0, 0))
    cw.save(f'out/{name}.webp', lossless=True); print(name, cw.size)
