/* [데이터] 탐험 규칙 · 조우 가중치 · 금고 보상 풀 · 사건(기연) 표 — 순수 정적 데이터 (로직 없음) */

/* 자동 탐험: 매시 정각(현지 시각)마다, 제자가 고른 구역으로 나가 기력을 모두 쓸 때까지 조우를 겪는다.
   interval: 탐험 간격(ms) · maxQueue: 자리를 비운 동안 쌓이는 최대 횟수 · keep: 보관하는 탐험 기록 수
   weights: 한 걸음마다 무엇을 만날지 · bossFrom: 기력을 이만큼 쓴 뒤부터 두목이 나올 수 있음
   potionAt: 활력이 이 비율 아래면 생혈고를 바름 · breathe: 이길 때마다 숨을 고르며 되찾는 활력 비율
   retreatAt: 생혈고가 없고 활력이 이 비율 아래면 스스로 발길을 돌림 (벌칙 없음)
   defeatLoss: 쓰러지면 이번 탐험에서 번 은자 중 잃는 비율 */
const EXPEDITION = {
  interval: 3600000, maxQueue: 8, keep: 8,
  weights: { beast: 60, vault: 20, event: 6, trap: 7, gimmick: 7 },
  bossFrom: 0.6, bossChance: 0.3, potionAt: 0.35, breathe: 0.08, retreatAt: 0.3, defeatLoss: 0.5, minStamina: 3, maxRounds: 60,
};
/* 탐험 중 조우 문구 */
const EXP_TEXT = {
  depart: ['짐을 꾸려 산문을 나섭니다.', '새벽 안개를 헤치고 길을 떠납니다.', '조운 사형의 배웅을 받으며 출발합니다.'],
  avoid: '멀리서 느껴지는 기척이 너무 무겁습니다. 몸을 낮춰 조용히 물러났습니다.',
  tired: '기력이 다해 발걸음을 돌립니다.',
  retreat: '상처가 깊고 생혈고도 떨어졌습니다. 무리하지 않고 발길을 돌립니다.',
  defeat: '눈앞이 캄캄해집니다… 지나던 약초꾼이 청풍문까지 업어다 주었습니다.',
};

/* 요수 출현 가중치: 적의 rank(1 약함 · 2 중간 · 3 강함)별 — 탐험 후반(기력 절반 이상 쓴 뒤)일수록 강한 요수가 잦다 */
const BEAST_WEIGHT = { shallow: { 1: 50, 2: 35, 3: 15 }, deep: { 1: 30, 2: 30, 3: 40 } };

/* 금고(金庫): 열면 네 가지 중 하나 */
const VAULTS = [
  { name: '약재 궤', icon: '🌿', w: 30 },        // 연단 재료 (옛 약초 군락)
  { name: '철물 궤', icon: '⛓️', w: 30 },        // 주조 재료 (옛 광맥)
  { name: '은자 궤', icon: '💰', w: 18 },
  { name: '비급/장비 궤', icon: '📘', w: 4 },    // 희귀
];

const TRAP = { text: '숨겨진 덫을 밟았습니다!', stamina: 5, hpPct: 0.08 };

/* 걸음마다 드는 기력 (기력은 숨겨진 능력치. 매 정각 출발 때 가득 차고, 아이템으로는 회복되지 않는다) */
const STAMINA_COST = { battle: 4, herb: 3, mine: 3, chest: 3, gimmick: 5, boss: 12 };

/* ───────── 사냥터 사건 (기연 奇緣) ─────────
   zones: 나오는 지역 ('all'이면 어디서나). 선택지 req는 조건(부족하면 고를 수 없음),
   take: true면 조건으로 건 아이템·은자를 소모. out은 가중치(w)로 하나를 고른다.
   fx 효과: silver, items, hpPct, stamina, contrib, exp, buff, perm, book, gear:[tier, rarity]
   자동 탐험에서는 제자가 조건을 채운 선택지 중 하나를 스스로 고른다
   fight: 적 id → 전투, bonus: 이기면 추가로 받는 fx */
const EVENTS = [
  { id: 'herbalist', zones: ['cheongpung'], title: '부상당한 약초꾼',
    text: '비탈 아래에서 신음 소리가 들립니다. 바구니를 쏟은 약초꾼이 발목을 부여잡고 있습니다. "젊은이… 약이 있으면 좀…"',
    choices: [
      { label: '생혈고를 건넨다', req: { item: ['saenghyeol', 1] }, take: true, out: [
        { w: 1, text: '약초꾼이 고개를 숙이며 바구니 속 귀한 것을 내어 줍니다. "영지는 이 산 북쪽 고목 밑에서 난다오."', fx: { items: { lingzhi: 2, herb: 3 }, exp: 40 } }] },
      { label: '업고 산 아래까지 데려다준다', req: { stamina: 12 }, out: [
        { w: 1, text: '땀이 비 오듯 흐르지만 약초꾼의 집 앞까지 무사히 내려왔습니다. 마을 사람들이 청풍문 제자를 칭찬합니다.', fx: { stamina: -12, contrib: 15, silver: 15 } }] },
      { label: '못 본 척 지나친다', out: [{ w: 1, text: '등 뒤로 신음 소리가 멀어집니다. 마음 한구석이 무겁습니다.', fx: {} }] },
    ] },
  { id: 'ronin', zones: ['cheongpung', 'yeomhwa'], title: '떠돌이 낭인',
    text: '삿갓을 깊게 눌러쓴 낭인이 길 한가운데 앉아 술병을 기울입니다. "청풍문 도복이군. 한 수 겨뤄 보겠나? 지면 술값은 네가 내라."',
    choices: [
      { label: '검을 뽑는다', out: [{ w: 1, text: '낭인이 술병을 내려놓고 천천히 일어섭니다.', fight: 'ronin', bonus: { text: '"허, 제법이군." 낭인이 술값이라며 은자 주머니를 던져 줍니다.', fx: { silver: 40, exp: 40 } } }] },
      { label: '술값을 대신 치르고 이야기를 듣는다', req: { silver: 15 }, take: true, out: [
        { w: 1, text: '낭인이 강호를 떠돌며 본 것들을 늘어놓습니다. 듣다 보니 수련의 요령이 머리에 스며듭니다.', fx: { buff: { key: 'train', val: 0.3, dur: 1800, name: '낭인의 이야기' }, exp: 40 } }] },
      { label: '정중히 사양한다', out: [{ w: 1, text: '"분수를 아는 것도 재주지." 낭인이 껄껄 웃으며 길을 비켜 줍니다.', fx: {} }] },
    ] },
  { id: 'stele', zones: ['cheongpung'], title: '이끼 낀 비석',
    text: '덩굴에 휘감긴 낡은 비석이 서 있습니다. 반쯤 지워진 글자 사이로 희미한 검결(劍訣)이 새겨져 있습니다.',
    choices: [
      { label: '내공으로 비문을 읽어 낸다', req: { stat: ['maxMp', 60] }, out: [
        { w: 3, text: '글자가 눈앞에서 살아 움직입니다. 수련 중이던 무공의 한 대목이 환하게 풀립니다.', fx: { exp: 120 } },
        { w: 1, text: '글자를 쫓다 머리가 어지러워집니다. 기혈이 잠시 뒤틀렸습니다.', fx: { hpPct: -0.1 } }] },
      { label: '이끼를 걷어 내고 탁본을 뜬다', out: [{ w: 1, text: '탁본을 챙겼습니다. 장경각 노인이 반길 것 같습니다.', fx: { contrib: 20 } }] },
      { label: '지나친다', out: [{ w: 1, text: '비석은 말없이 이끼 속으로 다시 잠깁니다.', fx: {} }] },
    ] },
  { id: 'oldtree', zones: ['cheongpung'], title: '쓰러진 고목',
    text: '벼락 맞아 쓰러진 거대한 고목이 길을 막고 있습니다. 갈라진 틈 사이로 무언가 반짝입니다.',
    choices: [
      { label: '장력으로 쪼갠다', req: { stat: ['atk', 22] }, out: [
        { w: 1, text: '고목이 쩍 갈라지자 누군가 숨겨 둔 주머니가 굴러 나옵니다!', fx: { items: { lingzhi: 2, roughOre: 3 }, silver: 40 } }] },
      { label: '틈에 손을 넣어 더듬는다', out: [
        { w: 2, text: '손끝에 차가운 은자가 걸립니다.', fx: { silver: 20 } },
        { w: 1, text: '앗! 틈 속에 숨어 있던 독사에게 물렸습니다.', fx: { hpPct: -0.15 } }] },
      { label: '돌아간다', out: [{ w: 1, text: '고목을 뒤로하고 발길을 돌립니다.', fx: {} }] },
    ] },
  { id: 'captive', zones: ['yeomhwa'], title: '포로가 된 상인',
    text: '산적들의 천막 뒤, 기둥에 묶인 비단 상인이 눈짓으로 도움을 청합니다. 파수꾼 한 명이 꾸벅꾸벅 졸고 있습니다.',
    choices: [
      { label: '파수꾼을 쓰러뜨리고 구한다', out: [{ w: 1, text: '파수꾼이 눈을 번쩍 뜹니다!', fight: 'logger', bonus: { text: '상인이 연신 절을 하며 숨겨 둔 은자 주머니를 건넵니다.', fx: { silver: 80, contrib: 30 } } }] },
      { label: '몸값을 대신 치른다', req: { silver: 60 }, take: true, out: [
        { w: 1, text: '산적들은 은자를 세더니 상인을 풀어 줍니다. 상인은 청풍문의 이름을 꼭 기억하겠다며 짐 속 늑대 힘줄을 건넵니다.', fx: { contrib: 50, items: { wolfSinew: 2 } } }] },
      { label: '못 본 척한다', out: [{ w: 1, text: '상인의 눈빛이 등에 박힙니다.', fx: {} }] },
    ] },
  { id: 'deserter', zones: ['yeomhwa'], title: '산적 탈영병',
    text: '찢어진 두건을 쓴 어린 산적이 칼을 버리고 무릎을 꿇습니다. "살려만 주십시오. 채주에게 돌아가면 죽습니다."',
    choices: [
      { label: '보내 준다', out: [{ w: 1, text: '소년이 떠나며 속삭입니다. "이 소굴의 길은… 이렇게 나 있습니다." 채의 구조를 알게 되었습니다.', fx: { exp: 30 } }] },
      { label: '붙잡아 문파에 넘긴다', out: [{ w: 1, text: '소년을 청풍문으로 보냈습니다. 장문인이 산적 소굴의 사정을 캐물을 것입니다.', fx: { contrib: 40 } }] },
      { label: '가진 것을 내놓게 한다', out: [{ w: 1, text: '소년이 떨리는 손으로 주머니를 내밉니다. 은자 몇 냥과 적염석 하나.', fx: { silver: 25, items: { redStone: 1 } } }] },
    ] },
  { id: 'palisade', zones: ['yeomhwa'], title: '잠긴 목책 기관',
    text: '산적들의 비밀 창고를 둘러싼 높은 목책. 안쪽 빗장만 풀면 창고가 열릴 것 같습니다.',
    choices: [
      { label: '목책 위로 몸을 날린다', req: { stat: ['spd', 17] }, out: [
        { w: 1, text: '가볍게 목책을 넘어 빗장을 풀었습니다. 창고 안은 약탈품으로 가득합니다!', fx: { items: { redStone: 2, firegrass: 3 }, silver: 100 } }] },
      { label: '도끼로 부순다', req: { stamina: 8 }, out: [
        { w: 1, text: '목책이 부서지며 창고 문이 드러납니다.', fx: { stamina: -8, items: { blackIngot: 1 }, silver: 50 } },
        { w: 1, text: '요란한 소리에 도부수가 뛰쳐나옵니다!', fx: { stamina: -8 }, fight: 'eliteAxe' }] },
      { label: '돌아간다', out: [{ w: 1, text: '목책 너머로 산적들의 웃음소리가 들립니다.', fx: {} }] },
    ] },
  { id: 'altar', zones: ['yeomhwa'], title: '불씨 제단',
    text: '붉은 바위 위, 꺼지지 않는 불꽃이 타오르는 작은 제단이 있습니다. 산적들이 섬기는 화신(火神)의 것입니다.',
    choices: [
      { label: '화령초 두 포기를 바친다', req: { item: ['firegrass', 2] }, take: true, out: [
        { w: 1, text: '불꽃이 크게 일렁이더니 열기가 온몸으로 스며듭니다.', fx: { buff: { key: 'atk', val: 0.2, dur: 900, name: '화신의 가호' } } }] },
      { label: '불꽃에 손을 넣고 버틴다', out: [
        { w: 1, text: '살이 타는 고통을 견디자 단전 깊은 곳이 뜨거워집니다. 내력통이 넓어졌습니다!', fx: { hpPct: -0.2, perm: { maxMp: 8 } } },
        { w: 2, text: '참지 못하고 손을 뺐습니다. 화상만 남았습니다.', fx: { hpPct: -0.15 } }] },
      { label: '침을 뱉고 떠난다', out: [{ w: 1, text: '등 뒤에서 불꽃이 쉿 하고 소리를 냅니다.', fx: {} }] },
    ] },
  { id: 'fisherman', zones: ['suryong'], title: '강가의 노인',
    text: '안개 낀 강가에 낚싯대 하나만 드리운 노인이 미동도 없이 앉아 있습니다. 물고기가 그의 낚싯바늘 주위만 맴돕니다.',
    choices: [
      { label: '가르침을 청한다', req: { star: 6 }, out: [
        { w: 1, text: '"칼끝이 아니라 물결을 보거라." 노인의 한마디에 막혔던 무리(武理)가 트입니다.', fx: { exp: 300 } }] },
      { label: '말없이 곁에 앉는다', out: [
        { w: 1, text: '해가 기울도록 물결만 바라보았습니다. 마음이 잔잔해집니다.', fx: { buff: { key: 'train', val: 0.5, dur: 1800, name: '고요한 물결' } } }] },
      { label: '망태기를 들여다본다', out: [{ w: 1, text: '노인이 망태기 속 수초 뭉치를 통째로 내밉니다. "물가에서 쓸모가 있을 게다."', fx: { items: { silentReed: 3 } } }] },
    ] },
  { id: 'wreck', zones: ['suryong'], title: '난파선 잔해',
    text: '갈대숲에 반쯤 가라앉은 수적의 배가 보입니다. 부서진 선창 사이로 궤짝 모서리가 비칩니다.',
    choices: [
      { label: '물속으로 들어가 뒤진다', req: { stamina: 8 }, out: [
        { w: 2, text: '차가운 물속에서 백은광과 비늘을 건져 올렸습니다.', fx: { stamina: -8, items: { silverOre: 3, dragonScale: 1 } } },
        { w: 1, text: '녹슬지 않은 장비 궤가 나왔습니다!', fx: { stamina: -8, gear: [3, 2] } },
        { w: 1, text: '숨어 있던 수적이 물속에서 덮칩니다!', fx: { stamina: -8 }, fight: 'diver' }] },
      { label: '물가에서 갈고리로 건진다', out: [{ w: 1, text: '흑목 조각과 수초 몇 뭉치를 건졌습니다.', fx: { items: { blackwood: 2, silentReed: 1 } } }] },
      { label: '떠난다', out: [{ w: 1, text: '배는 천천히 강물 아래로 가라앉습니다.', fx: {} }] },
    ] },
  { id: 'sluice', zones: ['suryong'], title: '수문 기관',
    text: '녹슨 수문이 물길을 막고 있습니다. 수문 너머 물밑에 수적들이 숨긴 궤짝이 어른거립니다.',
    choices: [
      { label: '내력을 쏟아 수문을 들어 올린다', req: { stat: ['maxMp', 260] }, out: [
        { w: 1, text: '끼익, 수문이 열리자 수적들의 보물 궤가 떠오릅니다!', fx: { items: { bloodginseng: 1, lotus: 2 }, silver: 180 } }] },
      { label: '돌로 기관을 내리친다', out: [
        { w: 1, text: '기관 한쪽이 부서지며 백은광 조각이 떨어집니다.', fx: { items: { silverOre: 2 } } },
        { w: 1, text: '튕겨 나온 쇳조각에 맞았습니다.', fx: { hpPct: -0.1 } }] },
      { label: '돌아간다', out: [{ w: 1, text: '수문은 여전히 굳게 닫혀 있습니다.', fx: {} }] },
    ] },
  { id: 'offer', zones: ['suryong'], title: '향주의 제안',
    text: '붉은 비늘 갑옷의 향주가 칼을 내려놓습니다. "청풍문 애송이, 수룡방에 들어오면 은자 궤를 통째로 주지."',
    choices: [
      { label: '거절하고 칼을 뽑는다', out: [{ w: 1, text: '"어리석군." 향주가 손짓하자 강습대원이 곡도를 뽑아 듭니다.', fight: 'raider', bonus: { text: '쓰러진 강습대원의 품에서 수룡방의 밀서가 나왔습니다. 장문인이 기뻐할 것입니다.', fx: { contrib: 60 } } }] },
      { label: '은자만 받고 달아난다', out: [
        { w: 1, text: '은자 궤를 끌어안고 몸을 날렸습니다! 향주의 욕설이 강을 울립니다.', fx: { silver: 150 } },
        { w: 1, text: '궤짝을 잡는 순간 향주의 칼등이 등을 후려칩니다!', fx: { hpPct: -0.3 } }] },
      { label: '못 들은 척한다', out: [{ w: 1, text: '"겁쟁이 같으니." 향주가 코웃음을 칩니다.', fx: {} }] },
    ] },
  { id: 'peddler', zones: 'all', title: '떠돌이 약장수',
    text: '등짐을 멘 약장수가 손짓합니다. "청풍문 도령! 산에서 캔 귀한 단약이 있소. 오늘만 반값이오!"',
    choices: [
      { label: '은자 60냥에 산다', req: { silver: 60 }, take: true, out: [
        { w: 2, text: '진짜 소성 돌파단입니다! 운이 좋았습니다.', fx: { items: { pillLow: 1 } } },
        { w: 2, text: '열어 보니 생혈고 한 통. 반값은 아니었지만 쓸모는 있습니다.', fx: { items: { saenghyeol: 1 } } },
        { w: 1, text: '밀가루 덩어리였습니다. 약장수는 이미 사라졌습니다.', fx: {} }] },
      { label: '약재를 사겠다고 한다', req: { silver: 10 }, take: true, out: [{ w: 1, text: '약장수가 등짐을 풀어 약재를 한 줌 덜어 줍니다.', fx: { items: { herb: 3, lingzhi: 1 } } }] },
      { label: '손사래 친다', out: [{ w: 1, text: '"후회할 거요!" 약장수가 투덜대며 멀어집니다.', fx: {} }] },
    ] },
  { id: 'monk', zones: 'all', title: '행각승의 수수께끼',
    text: '낡은 가사를 걸친 행각승이 합장합니다. "시주, 발 없는 것이 천 리를 가고, 입 없는 것이 만인을 울리는 것이 무엇이오?"',
    choices: [
      { label: '"소문입니다."', out: [{ w: 1, text: '"허허, 강호를 아는구려." 스님이 염주 한 알을 건넵니다. 손에 쥐자 기운이 맑아집니다.', fx: { buff: { key: 'def', val: 0.2, dur: 1200, name: '염주의 가호' }, silver: 10 } }] },
      { label: '"바람입니다."', out: [{ w: 1, text: '"틀리지는 않았으나 맞지도 않소." 스님이 빙그레 웃고 떠납니다.', fx: {} }] },
      { label: '"칼입니다."', out: [{ w: 1, text: '"칼은 입이 없어도 사람을 울리지. 허나 발이 없으니 천 리는 못 가오." 스님이 혀를 찹니다.', fx: {} }] },
    ] },
];
