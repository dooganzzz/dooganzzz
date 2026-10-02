"""cap-stance.js가 찍은 컷 폴더 → 10열 시트(webp). 연출 미리보기(SCENES)의 n · ar에 맞춘다.
   python3 tools/frames-sheet.py <컷 폴더> <출력.webp> [가로 502] [세로 285]   (게임 무대 컷은 837x476 → 502x285)"""
import sys, glob
from PIL import Image
src, out = sys.argv[1], sys.argv[2]; W = int(sys.argv[3]) if len(sys.argv) > 3 else 502; H = int(sys.argv[4]) if len(sys.argv) > 4 else 285
fs = sorted(glob.glob(src + '/f*.png')); cols = 10; rows = (len(fs) + cols - 1) // cols
sh = Image.new('RGB', (W * cols, H * rows))
for i, f in enumerate(fs): sh.paste(Image.open(f).convert('RGB').resize((W, H), Image.LANCZOS), ((i % cols) * W, (i // cols) * H))
sh.save(out, 'WEBP', quality=60, method=4); print(len(fs), 'cuts ->', out)
