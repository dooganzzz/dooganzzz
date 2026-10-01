/* [데이터] 탐험 규칙 · 조우 가중치 · 금고 보상 풀 · 사건(기연) 표 — 순수 정적 데이터 (로직 없음) */

/* 강호행: [강호행 시작]을 누르면 제자가 고른 탐험지의 고른 단계(스테이지)에서, 쓰러지거나 귀환할 때까지 걸음을 이어 간다.
   stepMs: 걸음 하나의 간격(ms) · firstMs: 출발 뒤 첫 걸음까지
   catchUp: 자리를 비운 동안 따라잡아 치르는 최대 시간 · keep: 보관하는 강호행 기록 수
   weights: 한 걸음마다 무엇을 만날지 (금고는 전리품이 크므로 드물게)
   potionAt: 활력이 이 비율 아래면 생혈고를 바름 (한 전투에 potionPerFight개까지) · breathe: 이길 때마다 숨을 고르며 되찾는 활력 비율 (걸음 사이에 활력은 차지 않는다)
   run: 기력(달리기 · 걷기) · 전투에서 지면 쓰러지고 강호행은 끝난다 */
const EXPEDITION = {
  stepMs: 30000, firstMs: 3000,
  // 기력: 달리면 drainMs에 걸쳐 다 닳고, 다 닳으면 걸으며 regenMs에 걸쳐 차오른다. 걷는 동안은 걸음 간격이 walkStep배
  run: { drainMs: 20 * 60000, regenMs: 10 * 60000, walkStep: 2 },
  stepGrade: { '삼류': 0.95, '이류': 0.9, '일류': 0.85, '절정': 0.8 },   // 장착 경공 경지가 높을수록 걸음 간격이 짧아져 요수를 조금 더 빨리 만난다
  catchUp: 8 * 3600000, keep: 8,
  weights: { beast: 70, vault: 8, event: 6, trap: 8, gimmick: 8 },
  // 기연은 하루 1~2번: 기연을 만나면 다음 기연까지 encounterGap(ms) 사이의 시간이 지나야 다시 만난다
  encounterGap: [12 * 3600000, 24 * 3600000],
  potionAt: 0.35, potionPerFight: 3, breathe: 0.06, maxRounds: 60,
  rewardMult: 0.1,   // 원정 은자 획득 배율 (인플레이션 억제, 반올림)
  expMult: 0.2,      // 원정 수련치 획득 배율 (무공 성급이 강호행 진행을 따라가도록 은자보다 후하게)
  dropMult: 0.1,     // 요수 전리품·채집 재료 드랍 확률 배율 (1회 1개). 두목의 확정 드랍은 그대로
};
/* 탐험 중 조우 문구 */
const EXP_TEXT = {
  depart: ['짐을 꾸려 산문을 나섭니다.', '새벽 안개를 헤치고 길을 떠납니다.', '조운 사형의 배웅을 받으며 출발합니다.'],
  rest: '기력이 다해 바위 그늘에 앉아 숨을 고릅니다.',
  defeat: '눈앞이 캄캄해집니다… 지나던 약초꾼이 쓰러진 제자를 업어 산문까지 데려다주었습니다. 강호행은 여기까지입니다.',
};

/* 스테이지: 탐험지마다 10단계. 1~9단계는 그 탐험지 요수를 약한 순서로 하나씩 새로 만나고(바로 앞 단계 요수도 섞여 나옴), 10단계는 두목.
   kills: 한 단계를 돌파하려면 이겨야 하는 전투 수 (10단계는 두목 1번) · 처음 돌파하면 은자 · 수련치 · 생혈고를 받는다 (first*: 단계 × 탐험지 티어 배)
   돌파하면 다음 단계가 열린다. [자동 진행]이면 곧바로 올라가고, 끄면 그 단계에 머물며 계속 사냥한다 */
const STAGE = { count: 10, kills: 5, newFoe: 0.65, firstSilver: 8, firstExp: 15, firstPot: 1 };
const STAGE_NAMES = {
  cheongpung: ['초입', '돌바위', '솔숲길', '약초 비탈', '흑풍채 초소', '외나무다리', '멧돼지 골', '안개 골짜기', '청령목 숲', '적염호 굴'],
  yeomhwa: ['어귀', '붉은 협곡', '벼랑길', '화포 진지', '벌목장', '돌격대 막사', '도부수 연병장', '열화 성문', '염화석 갱도', '채주의 대청'],
  suryong: ['갈대 나루', '투망 어장', '강습대 초소', '뗏목 선착장', '잠영 수로', '뻘밭', '독지네 소택', '얼음 동굴', '철퇴 망루', '수룡방 본채'],
};

/* 금고(金庫): 열면 네 가지 중 하나 */
const VAULTS = [
  { name: '약재 궤', icon: '🌿', w: 30 },        // 연단 재료 (옛 약초 군락)
  { name: '철물 궤', icon: '⛓️', w: 30 },        // 주조 재료 (옛 광맥)
  { name: '은자 궤', icon: '💰', w: 18 },
  { name: '비급/장비 궤', icon: '📘', w: 4 },    // 희귀
];

const TRAP = { text: '숨겨진 덫을 밟았습니다!', stamina: 5, hpPct: 0.08 };

/* 걸음마다 드는 기력 (기력은 숨겨진 능력치. 출발 때와 쉬어 가는 걸음에서 가득 차고, 아이템으로는 회복되지 않는다) */

/* ───────── 사냥터 사건 (기연 奇緣) ─────────
   zones: 나오는 지역 ('all'이면 어디서나). 선택지 req는 조건(부족하면 고를 수 없음),
   take: true면 조건으로 건 아이템·은자를 소모. out은 가중치(w)로 하나를 고른다.
   fx 효과: silver, items, hpPct, stamina, contrib, exp, buff, perm, book, gear:[tier, rarity], named: 하급 장비 id
   자동 탐험에서는 제자가 조건을 채운 선택지 중 하나를 스스로 고른다
   fight: 적 id → 전투, bonus: 이기면 추가로 받는 fx */

/* 떠돌이 약장수의 등짐: 만날 때마다 이 가운데 pick개를 골라 정가에서 off만큼 싸게 판다 (제작 장비는 없다)
   [아이템 또는 하급 장비 id, 정가(냥)] · 이미 익힌 비급 · 가진 비급은 내놓지 않는다 */
const PEDDLER_WARES = {
  pick: 2, off: 0.2,
  items: [
    ['pillLow', 80],
    ['bk_samjaeGwon', 60], ['bk_samjaeGeom', 60], ['bk_samjaeDo', 60], ['bk_samjaeChang', 60], ['bk_samjaePyo', 60], ['bk_tonap', 150],
    ['bk_pocheolsak', 150], ['bk_cheolpo', 150], ['bk_paseok', 150], ['bk_swaegol', 150], ['bk_yeonhwan', 150], ['bk_cpGeombeop', 150],
    ['bk_nakyeop', 150], ['bk_chupung', 150], ['bk_ohodanmun', 150], ['bk_byeokryeok', 150], ['bk_dansu', 150], ['bk_yukhap', 150],
    ['bk_cheolgi', 150], ['bk_pungun', 150], ['bk_biyeon', 150], ['bk_sanhwa', 150], ['bk_tugol', 150], ['bk_chosangbi', 150],
    ['bk_dapsu', 150], ['bk_jihaeng', 150], ['bk_deungsu', 150], ['bk_mijong', 150], ['bk_mokryeong', 150], ['bk_byeokhwa', 150],
    ['bk_huto', 150], ['bk_baekgeum', 150], ['bk_yusu', 150],
  ],
  gear: [
    ['g_bandage', 30], ['g_hideTosu', 35], ['g_woodFist', 35], ['g_copperGlove', 40], ['g_studFist', 40], ['g_rustySword', 30],
    ['g_mapleSword', 35], ['g_dullSword', 35], ['g_bronzeRapier', 40], ['g_straightSword', 45], ['g_chippedBlade', 35], ['g_shortBlade', 40],
    ['g_ironSaber', 45], ['g_axeBlade', 50], ['g_blackSaber', 50], ['g_bambooSpear', 30], ['g_flailSpear', 40], ['g_waxSpear', 45],
    ['g_trident', 45], ['g_needleSpear', 50], ['g_pebbles', 30], ['g_dullStar', 30], ['g_rustyKnife', 35], ['g_woodNeedle', 40],
    ['g_caltrops', 40], ['g_hempRobe', 25], ['g_hunterCoat', 55], ['g_cpRobe', 60], ['g_ironRing', 40], ['g_bronzeRing', 35],
    ['g_hornRing', 40], ['g_hempBelt', 20], ['g_leatherBelt', 45], ['g_silkBelt', 45], ['g_whiteJade', 50], ['g_dullJade', 45],
    ['g_cloudJade', 50],
  ],
};

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
  { id: 'peddler', zones: 'all', title: '떠돌이 약장수', wares: true,
    // 행상인: 전방 물건을 20% 싸게 판다 (기력단 50 → 40냥, 생혈고 5통 25 → 20냥) + 등짐(PEDDLER_WARES)에서 고른 물건 2가지
    text: '등짐을 멘 약장수가 손짓합니다. "청풍문 도령! 전방보다 두 푼 싸게 드리리다. 산길엔 이게 제일이오!"',
    choices: [
      { label: '기력단을 40냥에 산다 (전방가 50냥)', req: { silver: 40 }, take: true, out: [{ w: 1, text: '약장수가 기력단 한 알을 종이에 싸 건넵니다.', fx: { items: { gigeokdan: 1 } } }] },
      { label: '생혈고 다섯 통을 20냥에 산다 (전방가 25냥)', req: { silver: 20 }, take: true, out: [{ w: 1, text: '약장수가 생혈고 다섯 통을 끈으로 묶어 줍니다.', fx: { items: { saenghyeol: 5 } } }] },
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
