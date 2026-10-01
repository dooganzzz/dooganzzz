from PIL import Image, ImageFilter
import numpy as np, potrace, sys
from scipy import ndimage
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.t2CharStringPen import T2CharStringPen
SP=sys.argv[1]   # 사용: python3 tools/brush-font.py <syl0~6.png가 있는 폴더> — 글자 시트(5x3, seq 순서)를 따서 폰트를 만든다
seq='청풍산염화채수룡방초입돌바위솔숲길약비탈흑소외나무다리멧돼지골안개짜기령목적호굴어귀붉은협곡벼랑포진벌장격대막사도부연병열성문석갱주의갈루투망강습뗏선착잠영로뻘밭독네택얼음동철퇴본견록제편전정단서공경각신상회원'
UPM=1000; BOX=820; ASC=880; DESC=120   # 글자 칸 820, 밑선 위 880 · 아래 120
names=['.notdef','space']; cmap={32:'space'}; chars={}
SPECK=0.025   # 획에서 떨어진 먹물 점: 글자 먹 전체의 2.5%보다 작은 덩어리는 지운다
def glyph_from(g):
    g=ndimage.grey_opening(g, footprint=np.array([[0,1,1,1,0],[1,1,1,1,1],[1,1,1,1,1],[1,1,1,1,1],[0,1,1,1,0]]))   # 획 가장자리의 가는 먹 튐 · 실오라기를 깎는다
    lab,n=ndimage.label(g>110, structure=np.ones((3,3)))
    if n>1:
        area=ndimage.sum(np.ones_like(lab),lab,range(1,n+1))
        small=np.isin(lab, 1+np.nonzero(area<area.sum()*SPECK)[0])
        g=np.where(small,0,g)
    rows=(g>60).sum(1); cols=(g>60).sum(0)
    rr=np.nonzero(rows>rows.max()*.08)[0]; cc=np.nonzero(cols>cols.max()*.08)[0]
    g=g[rr.min():rr.max()+1, cc.min():cc.max()+1]
    im=Image.fromarray(g.astype(np.uint8),'L').filter(ImageFilter.MinFilter(3))
    s=BOX/max(im.height, im.width*.92); W=max(1,round(im.width*s/2)); H=max(1,round(im.height*s/2))
    im=im.resize((W,H),Image.LANCZOS)   # 2단위 = 1픽셀
    bm=potrace.Bitmap(np.asarray(im)<=110)   # potracer: False = 먹
    path=bm.trace(turdsize=6, alphamax=1.0, opticurve=True, opttolerance=0.3)
    adv=round(W*2+70)
    pen=T2CharStringPen(adv,None)
    ox=35; oy=round((ASC-DESC)/2 - H)   # 칸 가운데(세로)에 세운다
    def P(p): return (ox+p.x*2, oy+(H-p.y)*2)
    for curve in path:
        pen.moveTo(P(curve.start_point))
        for seg in curve.segments:
            if seg.is_corner: pen.lineTo(P(seg.c)); pen.lineTo(P(seg.end_point))
            else: pen.curveTo(P(seg.c1),P(seg.c2),P(seg.end_point))
        pen.closePath()
    return pen.getCharString(), adv
cs={}; adv={'.notdef':500,'space':260}
cs['.notdef']=T2CharStringPen(500,None).getCharString(); cs['space']=T2CharStringPen(260,None).getCharString()
for k in range(len(seq) // 15):
    a=255-np.asarray(Image.open(f'{SP}/syl{k}.png').convert('L')).astype(float)
    a=np.clip((a-14)*255/(255-14),0,255); h,w=a.shape
    for i in range(15):
        ch=seq[k*15+i]; r,c=divmod(i,5); cell=a[r*h//3:(r+1)*h//3, c*w//5:(c+1)*w//5]
        m=cell>40; rr=np.nonzero(m.sum(1)>2)[0]; cc=np.nonzero(m.sum(0)>2)[0]
        g=cell[rr.min():rr.max()+1, cc.min():cc.max()+1]
        n=f'uni{ord(ch):04X}'; c_,ad=glyph_from(g); cs[n]=c_; adv[n]=ad; names.append(n); cmap[ord(ch)]=n
fb=FontBuilder(UPM,isTTF=False); fb.setupGlyphOrder(names); fb.setupCharacterMap(cmap)
fb.setupCFF('GanghoBrush',{'FullName':'Gangho Brush'},cs,{})
fb.setupHorizontalMetrics({n:(adv[n],0) for n in names}); fb.setupHorizontalHeader(ascent=ASC,descent=-DESC)
fb.setupNameTable({'familyName':'Gangho Brush','styleName':'Regular'}); fb.setupOS2(sTypoAscender=ASC,sTypoDescender=-DESC,usWinAscent=ASC,usWinDescent=DESC); fb.setupPost()
fb.save(f'{SP}/font/GanghoBrush.otf'); fb.font.flavor='woff'; fb.save(f'{SP}/font/GanghoBrush.woff')
print(len(names)-2,'glyphs')
