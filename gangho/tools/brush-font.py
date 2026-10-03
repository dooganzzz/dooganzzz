from PIL import Image, ImageFilter
import numpy as np, potrace, sys
from scipy import ndimage
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.t2CharStringPen import T2CharStringPen
SP=sys.argv[1]   # 사용: python3 tools/brush-font.py <syl0~33.png가 있는 폴더> — 글자 시트(5x3, seq 순서)를 따서 폰트를 만든다
seq='청풍산염화채수룡방초입돌바위솔숲길약비탈흑소외나무다리멧돼지골안개짜기령목적호굴어귀붉은협곡벼랑포진벌장격대막사도부연병열성문석갱주의갈루투망강습뗏선착잠영로뻘밭독네택얼음동철퇴본견록제편전정단서공경각신상회원천권축인삼재일검평합창표복토고납운간섬보환팔종형체피불금유타광만출벽력횡혼붕양파식관추엽흔우심명월념답행능허참뇌한십완분근맥쇄통배백헌과래낙빈하질맹림미오균뢰멸세류역봉황점두난육마군이폭혈자칠저번등당곤변생춘순승후여덕물괴겁현해술법결력극예'
more='가감갑갗같객갯거걸게겨겹계곧괘구국굽궁그글긋긴깃깊깜깥꺾꽂꽃꿇꿈꿰끄끊끌끓끝끼날낭내낸너넋넘노높눈는늘니닥닦닫달닿더던데뎌되된둔둘둠둥드들듯디땅떠떡떨뚫뜨라락란람랫러럼려련렬르른를름릉릎린릴립릿맑매맺머먹멈며모몸못묵묻박밖반발밝밟밤뱀버벗베벨별볍붓붙빔빙빛빠빡뻗뼈뽑뿌뿜삭살삿새샘속손솟쇠쇳숨스슬시싸쏟씨아악앉않암앗애야억없에엔온올옷와왕요용울워윤으을응잃잎잡잦절져조좀좌죽준줄중쥐쥔직짊집짓짖째찍쪽쫓찌찍차찰처척첨쳐춤췌취치침카칼켜키탁탄태털텅톱튕틀틈티패퍼펼폐푸풀품할함항향험헤혹홀홍휘흉흐흡흩히힌힘쩍가감'   # syl15~31
NAMES='건곽교규김남년담득량례륜률말몽민범봄설섭송숙숭실언엄옥옹욱웅율융익임작잔찬촌총최충판팽필학핵혁혜활효훈휴흠흥희겸늠렴녕밀'   # 10월 3일: 호패 성명 · 별호에 자주 쓰는 이름 글자 60자 (syl34~37)
FIX=[(32, 5, 3, '같거게갗꿇끓니둘디묻져짖벨잦올'), (33, 3, 1, '같꿇짖'), (38, 1, 1, '렴'), (39, 1, 1, '륜'), (40, 1, 1, '늠')]   # 오자 고침: 칸마다 이 글자로 덮어쓴다
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
# 시트 목록: (번호, 칸 배치 가로x세로, 글자). 뒤 시트가 같은 글자를 다시 쓰면 그것으로 고친다 (오자 고침 시트)
SHEETS = [(k, 5, 3, seq[k*15:(k+1)*15]) for k in range(len(seq) // 15)]
SHEETS += [(15 + k, 5, 3, more[k*15:(k+1)*15]) for k in range(len(more) // 15)]   # 10월: 비급 이름 · 초식 · 시구 글자 252자
SHEETS += [(34 + k, 5, 3, NAMES[k*15:(k+1)*15]) for k in range(len(NAMES) // 15)]   # 이름 글자
SHEETS += FIX
for k, C, R, chars in SHEETS:
    a=255-np.asarray(Image.open(f'{SP}/syl{k}.png').convert('L')).astype(float)
    a=np.clip((a-14)*255/(255-14),0,255); h,w=a.shape
    for i, ch in enumerate(chars):
        r,c=divmod(i,C); cell=a[r*h//R:(r+1)*h//R, c*w//C:(c+1)*w//C]
        m=cell>40; rr=np.nonzero(m.sum(1)>2)[0]; cc=np.nonzero(m.sum(0)>2)[0]
        g=cell[rr.min():rr.max()+1, cc.min():cc.max()+1]
        n=f'uni{ord(ch):04X}'; c_,ad=glyph_from(g); cs[n]=c_; adv[n]=ad
        if n not in names: names.append(n)
        cmap[ord(ch)]=n
fb=FontBuilder(UPM,isTTF=False); fb.setupGlyphOrder(names); fb.setupCharacterMap(cmap)
fb.setupCFF('GanghoBrush',{'FullName':'Gangho Brush'},cs,{})
fb.setupHorizontalMetrics({n:(adv[n],0) for n in names}); fb.setupHorizontalHeader(ascent=ASC,descent=-DESC)
fb.setupNameTable({'familyName':'Gangho Brush','styleName':'Regular'}); fb.setupOS2(sTypoAscender=ASC,sTypoDescender=-DESC,usWinAscent=ASC,usWinDescent=DESC); fb.setupPost()
fb.save(f'{SP}/font/GanghoBrush.otf'); fb.font.flavor='woff'; fb.save(f'{SP}/font/GanghoBrush.woff')
print(len(names)-2,'glyphs')
