"""녹음 효과음 묶음 만들기: Kenney CC0 소리 묶음 3개(rpg-audio · impact-sounds · interface-sounds, kenney.nl에서 받아 푼 폴더)에서
   골라 한 파일(assets/art/audio/sfx.mp3)로 잇고, 자리 표를 찍는다 → js/data/assets.js의 SFX_SPRITE에 붙여 넣는다.
   쓰는 법: python3 gangho/tools/sfx-sprite.py <Kenney 묶음을 푼 폴더> <출력 폴더>   (mp3로 줄이기는 ffmpeg: imageio-ffmpeg)"""
import sys, json, numpy as np, soundfile as sf
from scipy.signal import resample_poly
src, out = sys.argv[1], sys.argv[2]
R, P = f'{src}/rpg-audio/Audio/', f'{src}/impact-sounds/Audio/'
PICK = {
 'click': [P + f'impactWood_light_00{i}.ogg' for i in range(3)],
 'step_dirt': [P + f'footstep_grass_00{i}.ogg' for i in range(5)], 'step_snow': [P + f'footstep_snow_00{i}.ogg' for i in range(5)],
 'step_wet': [P + f'footstep_concrete_00{i}.ogg' for i in range(3)],
 'slash': [R + 'knifeSlice.ogg', R + 'knifeSlice2.ogg'], 'pierce': [R + 'chop.ogg'],
 'punch': [P + f'impactPunch_medium_00{i}.ogg' for i in range(3)], 'punch_heavy': [P + f'impactPunch_heavy_00{i}.ogg' for i in range(3)],
 'soft': [P + f'impactSoft_medium_00{i}.ogg' for i in range(2)], 'hurt': [P + f'impactSoft_heavy_00{i}.ogg' for i in range(3)],
 'anvil': [P + f'impactMetal_heavy_00{i}.ogg' for i in range(3)], 'metal': [P + 'impactMetal_medium_000.ogg'],
 'equip': [R + 'metalClick.ogg', R + 'metalLatch.ogg', R + 'beltHandle1.ogg'], 'unequip': [R + 'cloth1.ogg', R + 'cloth2.ogg', R + 'clothBelt.ogg'],
 'book': [R + 'bookPlace1.ogg', R + 'bookPlace2.ogg'], 'bookOpen': [R + 'bookOpen.ogg'], 'bookFlip': [R + 'bookFlip1.ogg', R + 'bookFlip2.ogg'], 'bookClose': [R + 'bookClose.ogg'],
 'coins': [R + 'handleCoins.ogg'], 'coins2': [R + 'handleCoins2.ogg'],
 'glassCrack': [P + 'impactGlass_light_000.ogg'], 'glassBreak': [P + 'impactGlass_heavy_000.ogg'],
 'pot': [R + 'metalPot1.ogg'], 'bellHit': [P + 'impactBell_heavy_000.ogg'],
}
SR = 44100; gap = np.zeros(int(SR * .2)); parts = [gap]; pos = len(gap) / SR; table = {}
for k, fs in PICK.items():
    table[k] = []
    for f in fs:
        x, sr = sf.read(f); x = x.mean(1) if x.ndim > 1 else x
        if sr != SR: x = resample_poly(x, SR, sr)
        e = np.abs(x); nz = np.where(e > e.max() * .003)[0]; x = x[max(0, nz[0] - 20):nz[-1] + 1] / (e.max() + 1e-9) * .8   # 앞뒤 빈 소리를 자르고 크기를 고름
        table[k].append([round(pos, 3), round(len(x) / SR, 3)]); parts += [x, gap]; pos += (len(x) + len(gap)) / SR
sf.write(f'{out}/sfx.wav', np.concatenate(parts).astype(np.float32), SR)
print(json.dumps(table, separators=(',', ':')))
