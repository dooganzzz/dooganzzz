/* [데이터] 요수 · 적 능력치 · 고유 드랍 · 기척 지문 — 순수 정적 데이터 (로직 없음) */

/* 적. elem: 고유 오행 · wtype: 병기 계열(짐승은 발톱·엄니를 병기 계열로 본다. 없으면 상성 없음) · rank: 구역 안 강약 · atkText: 공격 지문 */
const ENEMIES = {
  // 청풍산 (지형 흙·풀·나무). rank: 1 약함 · 2 중간 · 3 강함 — 탐험 후반일수록 높은 rank가 잦다
  rabbit:   { name: '청풍산 산토끼', elem: 'wood', wtype: 'fist', rank: 1, hp: 30, atk: 5, def: 0, spd: 12, eva: 8, xp: 6, silver: [1, 3], drops: [['rabbitMeat', 0.7], ['rabbitHide', 0.6]],
    atkText: '뒷발로 땅을 차고 날아올라 앞발을 휘두른다' },
  wildcat:  { name: '살쾡이', elem: 'wood', wtype: 'fist', rank: 1, hp: 45, atk: 8, def: 1, spd: 14, eva: 10, xp: 9, silver: [2, 4], drops: [['roughHide', 0.55], ['dogFang', 0.45]],
    atkText: '낮게 웅크렸다가 발톱을 세우고 덮쳐 든다' },
  viper:    { name: '흑비단독사', elem: 'water', wtype: 'hidden', rank: 1, hp: 40, atk: 10, def: 1, spd: 13, eva: 12, xp: 10, silver: [2, 5], drops: [['viperFang', 0.5], ['herb', 0.4]],
    atkText: '풀숲에서 몸을 튕겨 독니를 꽂아 온다' },
  scout:    { name: '흑풍채 척후병', elem: 'metal', wtype: 'blade', rank: 2, hp: 90, atk: 12, def: 4, spd: 12, eva: 6, xp: 15, silver: [4, 8], drops: [['iron', 0.4], ['bandanaSilk', 0.3]], gear: [1, 0.06],
    atkText: '허리춤의 단도를 뽑아 비스듬히 그어 온다' },
  slinger:  { name: '흑풍채 투석수', elem: 'fire', wtype: 'hidden', rank: 2, hp: 75, atk: 14, def: 3, spd: 11, eva: 5, xp: 14, silver: [4, 8], drops: [['iron', 0.3], ['emberStone', 0.1], ['wood', 0.4]], gear: [1, 0.05],
    atkText: '투석끈을 빙빙 돌려 불붙은 돌멩이를 날린다' },
  boar:     { name: '사나운 멧돼지', elem: 'earth', wtype: 'spear', rank: 2, hp: 140, atk: 16, def: 6, spd: 8, eva: 2, xp: 20, silver: [4, 8], drops: [['boarMeat', 0.7], ['boarTusk', 0.4], ['boarHide', 0.55]], gear: [1, 0.06],
    atkText: '콧김을 뿜으며 창날 같은 엄니를 앞세워 들이받는다' },
  deserter: { name: '흑풍채 탈영병', elem: 'earth', wtype: 'spear', rank: 3, hp: 150, atk: 15, def: 7, spd: 10, eva: 4, xp: 24, silver: [6, 12], drops: [['iron', 0.5], ['rice', 0.3], ['wood', 0.3]], gear: [1, 0.1],
    atkText: '녹슨 창을 거칠게 내지르며 악을 쓴다' },
  turtle:   { name: '바위 등껍질 거북', elem: 'earth', wtype: 'fist', rank: 3, hp: 150, atk: 9, def: 11, spd: 5, eva: 0, xp: 22, silver: [4, 9], drops: [['jadeStone', 0.3], ['water', 0.5]],
    atkText: '바위 같은 등껍질을 앞세워 굴러 들어온다' },
  treant:   { name: '청령목괴', elem: 'wood', wtype: 'spear', rank: 3, hp: 160, atk: 14, def: 8, spd: 7, eva: 2, xp: 24, silver: [5, 10], drops: [['wood', 0.8], ['lingzhi', 0.3], ['herb', 0.5]],
    atkText: '뾰족한 가지를 창처럼 꼬아 내찌른다' },
  redTiger: { name: '적염 호랑이', elem: 'fire', wtype: 'fist', hp: 700, atk: 34, def: 11, spd: 13, eva: 6, xp: 90, silver: [40, 60], drops: [['tigerBone', 1], ['blackiron', 1], ['emberStone', 0.8]], gear: [1, 1], boss: 'boss1',
    atkText: '붉은 갈기를 곤두세우고 앞발로 대기를 찢으며 덮친다' },

  // 염화채
  bandit:   { name: '화적 졸개',   elem: 'fire', wtype: 'blade', rank: 1, hp: 380,  atk: 60,  def: 18, spd: 11, eva: 6,  xp: 38,  silver: [10, 20], drops: [['bandanaSilk', 0.4], ['rice', 0.3], ['salt', 0.3]], gear: [2, 0.05] },
  axeman:   { name: '화적 도부수', elem: 'metal', wtype: 'blade', rank: 3, hp: 560,  atk: 72,  def: 26, spd: 9,  eva: 3,  xp: 52,  silver: [15, 28], drops: [['bandanaSilk', 0.5], ['boarTusk', 0.3], ['emberStone', 0.2]], gear: [2, 0.07] },
  archer:   { name: '화적 궁수',   elem: 'wood', wtype: 'hidden', rank: 2, hp: 340,  atk: 80,  def: 14, spd: 14, eva: 15, xp: 48,  silver: [14, 26], drops: [['bandanaSilk', 0.4], ['dogFang', 0.4], ['wood', 0.5]], gear: [2, 0.06] },
  jeokyeom: { name: '채주 적염도', elem: 'fire', wtype: 'blade', hp: 1900, atk: 88,  def: 34, spd: 12, eva: 8,  xp: 220, silver: [150, 220], drops: [['emberStone', 1], ['firegrass', 1], ['lingzhi', 1], ['blackiron', 1]], gear: [2, 1], boss: 'boss2' },

  pirate:   { name: '수적',       elem: 'water', wtype: 'blade', rank: 1, hp: 1000, atk: 125, def: 50, spd: 12, eva: 6,  xp: 80,  silver: [30, 50], drops: [['fish', 0.5], ['scale', 0.3], ['salt', 0.3]], gear: [3, 0.05] },
  harpoon:  { name: '수적 작살수', elem: 'metal', wtype: 'spear', rank: 2, hp: 850,  atk: 145, def: 40, spd: 15, eva: 12, xp: 88,  silver: [32, 55], drops: [['fish', 0.5], ['scale', 0.35], ['wood', 0.4]], gear: [3, 0.06] },
  hyangju:  { name: '적룡방 향주', elem: 'water', wtype: 'hidden', rank: 3, hp: 1500, atk: 150, def: 62, spd: 13, eva: 8,  xp: 120, silver: [50, 80], drops: [['scale', 0.6], ['bloodginseng', 0.25], ['coldiron', 0.4]], gear: [3, 0.1] },
  ronin:    { name: '떠돌이 낭인', elem: 'metal', wtype: 'sword', hp: 240, atk: 23, def: 9,  spd: 12, eva: 10, xp: 0, silver: [10, 20], drops: [['potionHp', 0.5]] },
  galcheon: { name: '방주 갈천',   elem: 'water', wtype: 'spear', hp: 5200, atk: 165, def: 80, spd: 14, eva: 10, xp: 500, silver: [500, 700], drops: [['scale', 1], ['bloodginseng', 1], ['lotus', 1], ['coldiron', 1]], gear: [3, 1], boss: 'boss3' },
};

const HIT_TEXT = [
  [0.8, '기혈이 모조리 뒤흔들려 형체조차 유지하기 힘들 만큼 박살이 났습니다!', 'h5'],
  [0.5, '피를 한 움큼 토해내며 바닥에 무릎을 꿇고 비틀거립니다!', 'h4'],
  [0.25, '뼈마디가 삐걱거리며 고통 섞인 비명을 지릅니다!', 'h3'],
  [0.1, '피부를 가르며 붉은 핏물이 배어 나옵니다.', 'h2'],
  [0, '옷깃만 스치며 살짝 긁히는 정도의 상처만 남겼습니다.', 'h1'],
];

/* 적 조우 감지 지문 (전투력 비 기준, 높을수록 내가 유리) */
const SENSE_TEXT = [
  [1.8, '상대의 숨소리가 거칠고 움직임이 둔합니다. 손쉽게 제압할 수 있을 것 같습니다.', 'weak'],
  [0.9, '팽팽한 살기가 감돕니다. 방심하지 않는다면 충분히 승산이 있습니다.', 'even'],
  [0, '뼛속까지 시린 위압감이 전신을 짓누릅니다! 상대하기 벅찬 상대입니다.', 'strong'],
];

/* 병기 계열별 기본 공격 지문 (atkText가 없는 적) */
const FOE_ATK_TEXT = { fist: '주먹을 휘두르며 달려든다', sword: '검을 뽑아 곧게 찔러 온다', blade: '칼을 치켜들고 내려친다', spear: '창을 길게 내지른다', hidden: '소매 속에서 암기를 날린다', none: '이빨을 드러내고 덤벼든다' };
