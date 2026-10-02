"""초록(크로마) 바탕 그림 → 투명 컷 시트. 먹빛이 살도록 초록과 얼마나 다른지로 알파를 만든다 (검은 먹은 남는다).
   python3 tools/chroma_cuts.py 1 in.png out.webp     제1초식 컷 시트 (10컷, 640x200)
   python3 tools/chroma_cuts.py 2 in.png out.webp     제2초식 컷 시트 (10컷, 640x360)
   python3 tools/chroma_cuts.py ougi in.png out.webp  오의 시트 (16컷, 240x240)
   python3 tools/chroma_cuts.py hit in.png out.webp   맞는 자리에서 터지는 제1초식(MANUAL_HIT) 시트 (10컷, 480x360 · 그림을 자르지 않고 통째로 맞춤)
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
def fit(im,ar,w,h):
    """그림 영역(알파)만 잘라 ar 캔버스에 통째로 맞추고(자르지 않음), 사방 가장자리를 흐려 영역이 잘린 느낌을 없앤다"""
    a=np.asarray(im); ys,xs=np.where(a[...,3]>24)
    x0,x1,y0,y1=xs.min(),xs.max()+1,ys.min(),ys.max()+1; bw,bh=x1-x0,y1-y0
    m=int(max(bw,bh)*.06); cw=max(bw+2*m,int((bh+2*m)*ar)); ch=int(cw/ar)
    cv=Image.new('RGBA',(cw,ch)); cv.alpha_composite(im.crop((x0,y0,x1,y1)),((cw-bw)//2,(ch-bh)//2))
    cv=cv.resize((w,h),Image.LANCZOS); b=np.asarray(cv).astype(float)
    ex=np.clip(np.minimum(np.arange(w),np.arange(w)[::-1])/(w*.07),0,1)[None,:]; ey=np.clip(np.minimum(np.arange(h),np.arange(h)[::-1])/(h*.12),0,1)[:,None]
    b[...,3]*=ex*ey
    return Image.fromarray(b.clip(0,255).astype('uint8'),'RGBA')
def sheet(src,out,n):
    fw,fh=(640,200) if n==1 else (640,360)
    im=fit(key(Image.open(src)),fw/fh,fw,fh)
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

def hit(src,out):
    """연속 때리기: 그림 영역(알파)만 잘라 4:3 캔버스에 통째로 맞추고(가장자리가 잘리지 않게 여백), 퍽 하고 번졌다 흩어지는 10컷"""
    im=key(Image.open(src)); a=np.asarray(im); ys,xs=np.where(a[...,3]>24)
    x0,x1,y0,y1=xs.min(),xs.max()+1,ys.min(),ys.max()+1; bw,bh=x1-x0,y1-y0
    W,H=480,360; base=fit(im,W/H,W,H); fr=[]
    for f in range(10):
        s=.62+.38*min(1,f/3)**.6 if f<4 else 1+.025*(f-3); o=1 if f<6 else max(0,1-(f-5)/4.5)
        t=base.resize((max(1,int(W*s)),max(1,int(H*s))),Image.LANCZOS); c=Image.new('RGBA',(W,H))
        ox,oy=(W-t.size[0])//2,(H-t.size[1])//2
        if s<=1: c.alpha_composite(t,(ox,oy))
        else: c=t.crop((-ox,-oy,-ox+W,-oy+H))
        A=np.asarray(c).astype(float); A[...,3]*=o; fr.append(A)
    Image.fromarray(np.concatenate(fr,1).astype('uint8'),'RGBA').save(out,'WEBP',quality=82,method=6)

if __name__ == "__main__":
    a = sys.argv[1:]
    if len(a) == 3 and a[0] in ("1", "2"): sheet(a[1], a[2], int(a[0]))
    elif len(a) == 3 and a[0] == "ougi": ougi(a[1], a[2])
    elif len(a) == 3 and a[0] == "hit": hit(a[1], a[2])
    else: print(__doc__)
