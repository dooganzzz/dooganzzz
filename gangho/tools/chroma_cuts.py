"""초록(크로마) 바탕 그림 → 투명 컷 시트. 먹빛이 살도록 초록과 얼마나 다른지로 알파를 만든다 (검은 먹은 남는다).
   python3 tools/chroma_cuts.py 1 in.png out.webp     제1초식 컷 시트 (10컷, 640x200)
   python3 tools/chroma_cuts.py 2 in.png out.webp     제2초식 컷 시트 (10컷, 640x360)
   python3 tools/chroma_cuts.py ougi in.png out.webp  오의 시트 (16컷, 240x240)
   결과 webp를 assets/art/manual/<무공id>/(cut_1 · cut_2 · ougi)에 넣는다. 먹 그림은 게임에서 screen 겹치기로는 지워지므로 그 무공만 normal 겹치기가 필요하다."""
from PIL import Image
import numpy as np, sys
def key(im):
    a=np.asarray(im.convert('RGB')).astype(float); r,g,b=a[...,0],a[...,1],a[...,2]
    gd=g-np.maximum(r,b)                                  # 초록 우세
    al=np.clip(1-(gd-30)/120,0,1)                         # 초록이면 0, 먹 · 흰빛이면 1
    # 가장자리 초록 번짐 제거 (despill)
    g2=np.minimum(g,np.maximum(r,b)+10); out=np.dstack([r,g2,b,al*255]).clip(0,255).astype('uint8')
    return Image.fromarray(out,'RGBA')
def sheet(src,out,n):
    im=key(Image.open(src)); W,H=im.size
    fw,fh=(640,200) if n==1 else (640,360); ar=fw/fh; ch=min(H,int(W/ar)); cw=int(ch*ar)
    im=im.crop(((W-cw)//2,(H-ch)//2,(W-cw)//2+cw,(H-ch)//2+ch)).resize((fw,fh),Image.LANCZOS)
    a=np.asarray(im).astype(float); al=a[...,3]/255; xs=np.arange(fw)[None,:]/fw; frames=[]
    for f in range(10):
        reach=min(1,(f+1)/5)**.6; edge=np.clip((reach+.06-xs)/.12,0,1); fade=1 if f<5 else max(0,1-(f-4)/5.5)
        frames.append(np.dstack([a[...,:3],al*edge*fade*255]))
    Image.fromarray(np.concatenate(frames,1).astype('uint8'),'RGBA').save(out,'WEBP',quality=82,method=6)
def ougi(src,out):
    base=key(Image.open(src)).resize((240,240),Image.LANCZOS); fr=[]
    for f in range(16):
        s=.35+.65*min(1,f/5)**.7 if f<6 else 1+.06*(f-5); o=1 if f<10 else max(0,1-(f-9)/6.5)
        t=base.resize((max(1,int(240*s)),)*2,Image.LANCZOS); c=Image.new('RGBA',(240,240)); x=(240-t.size[0])//2
        if s<=1: c.alpha_composite(t,(x,x))
        else: c=t.crop((-x,-x,-x+240,-x+240))
        A=np.asarray(c).astype(float); A[...,3]*=o; fr.append(A)
    Image.fromarray(np.concatenate(fr,1).astype('uint8'),'RGBA').save(out,'WEBP',quality=82,method=6)

if __name__ == "__main__":
    a = sys.argv[1:]
    if len(a) == 3 and a[0] in ("1", "2"): sheet(a[1], a[2], int(a[0]))
    elif len(a) == 3 and a[0] == "ougi": ougi(a[1], a[2])
    else: print(__doc__)
