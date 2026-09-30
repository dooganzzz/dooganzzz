/* [데이터] 요수 · 적 능력치 · 피격 문구 · 기척 지문 — 순수 정적 데이터 (로직 없음)
   elem: 고유 오행 · wtype: 병기 계열 · tier: 구역 안 4단계(1 최약체 · 2 일반 · 3 정예 · 4 위험 강적). 조우 비율은 maps.js TIER_WEIGHT
   atkText: 공격 지문 · trait: 특성 설명(도감) · 드랍 표는 drops.js
   특수 규칙: hits 연격 횟수 · poison [확률, 턴당 최대 활력 비율, 턴] 중독 · bleed [확률, 비율, 턴] 출혈/열상
             crit 치명 확률(기본 8) · acc 명중 보정 · weak { elem, mult } 그 오행 기공에 추가로 취약
             first 선공 고정 · pierce 제자의 방어력을 이만큼 무시 */

const ENEMIES = {
  // ───── 청풍산 (초급 · 흙/풀/나무) ─────
  wildcat:  { name: '살쾡이', elem: 'wood', wtype: 'fist', tier: 2, hp: 260, atk: 26, def: 2, spd: 14, eva: 16, xp: 20, bleed: [0.2, 0.02, 2], silver: [2, 4],
    atkText: '낮게 웅크렸다가 발톱을 세우고 덮쳐 든다', trait: '높은 회피율 · 찰과상 출혈' },
  boar:     { name: '사나운 멧돼지', elem: 'earth', wtype: 'spear', tier: 2, hp: 340, atk: 29, def: 5, spd: 8, eva: 2, xp: 22, silver: [4, 8], gear: [1, 0.06],
    atkText: '콧김을 뿜으며 창날 같은 엄니를 앞세워 돌진한다', trait: '돌진 공격 · 높은 체력' },
  viper:    { name: '흑비단독사', elem: 'water', wtype: 'hidden', tier: 2, hp: 330, atk: 27, def: 2, spd: 13, eva: 12, xp: 20, silver: [2, 5], poison: [0.35, 0.02, 3],
    atkText: '풀숲에서 몸을 튕겨 독니를 꽂아 온다', trait: '타격 시 경미한 독' },
  rabbit:   { name: '청풍산 산토끼', elem: 'wood', wtype: 'fist', tier: 1, hp: 60, atk: 10, def: 0, spd: 12, eva: 8, xp: 8, silver: [1, 3],
    atkText: '뒷발로 땅을 차고 날아올라 앞발을 휘두른다', trait: '식자재와 가죽' },
  scout:    { name: '흑풍채 척후병', elem: 'metal', wtype: 'blade', tier: 3, hp: 220, atk: 20, def: 7, spd: 13, eva: 14, xp: 34, silver: [4, 8], gear: [1, 0.06], hits: 2,
    atkText: '허리춤의 단도를 뽑아 순식간에 두 번 그어 온다', trait: '빠른 2연격 · 높은 회피 [정예]' },
  deserter: { name: '흑풍채 탈영병', elem: 'earth', wtype: 'spear', tier: 3, hp: 260, atk: 33, def: 9, spd: 10, eva: 4, xp: 36, pierce: 6, silver: [6, 12], gear: [1, 0.1],
    atkText: '녹슨 창을 길게 내뻗어 거리를 두고 견제한다', trait: '긴 사거리 견제 · 방어 관통 [정예]' },
  slinger:  { name: '흑풍채 투석수', elem: 'fire', wtype: 'hidden', tier: 4, hp: 135, atk: 22, def: 6, spd: 11, eva: 6, xp: 55, hits: 2, first: true, pierce: 8, silver: [4, 8], gear: [1, 0.05],
    atkText: '투석끈을 빙빙 돌려 자갈을 날린다', trait: '선공 고정 · 자갈 2연투 · 방어 관통 [위험 강적]' },
  turtle:   { name: '바위 등껍질 거북', elem: 'earth', wtype: 'fist', tier: 3, hp: 265, atk: 18, def: 14, spd: 5, eva: 0, xp: 34, silver: [4, 9],
    atkText: '바위 같은 등껍질을 앞세워 굴러 들어온다', trait: '방어력 특화 [정예]' },
  treant:   { name: '청령목괴', elem: 'wood', wtype: 'spear', tier: 3, hp: 400, atk: 40, def: 10, spd: 7, eva: 2, xp: 36, silver: [5, 10], weak: { elem: 'fire', mult: 0.25 },
    atkText: '뾰족한 가지를 창처럼 꼬아 내찌른다', trait: '화(火) 속성 기공에 취약' },
  redTiger: { name: '적염 호랑이', elem: 'fire', wtype: 'fist', hp: 400, atk: 20, def: 11, spd: 13, eva: 6, xp: 90, silver: [40, 60], gear: [1, 1], boss: 'boss1', hits: 2,
    atkText: '붉은 갈기를 곤두세우고 화염 발톱을 연달아 휘두른다', trait: '강맹한 화염 발톱 연타' },

  // ───── 염화채 (중급 · 흙/일반) ─────
  fireViper:  { name: '화염 살모사', elem: 'fire', wtype: 'hidden', tier: 2, hp: 247, atk: 49, def: 12, spd: 14, eva: 14, xp: 32, silver: [8, 16], bleed: [0.3, 0.03, 3], gear: [2, 0.04],
    atkText: '달아오른 독니를 번개처럼 박아 넣는다', trait: '피격 시 열상' },
  redWolf:    { name: '적토 늑대', elem: 'earth', wtype: 'fist', tier: 1, hp: 225, atk: 32, def: 14, spd: 13, eva: 8, xp: 32, silver: [8, 16], hits: 2, gear: [2, 0.04],
    atkText: '무리와 함께 좌우에서 번갈아 물어뜯는다', trait: '떼 지어 협공 (2연격)' },
  eagle:      { name: '단애 독수리', elem: 'metal', wtype: 'fist', tier: 2, hp: 228, atk: 57, def: 10, spd: 16, eva: 16, xp: 34, silver: [8, 16], crit: 20, gear: [2, 0.04],
    atkText: '절벽 위에서 날개를 접고 급강하해 발톱으로 내리찍는다', trait: '공중 급강하 강타 (높은 치명)' },
  logger:     { name: '염화채 벌목수', elem: 'wood', wtype: 'blade', tier: 3, hp: 399, atk: 61, def: 18, spd: 10, eva: 4, xp: 40, silver: [10, 20], gear: [2, 0.05],
    atkText: '육중한 벌채도를 마구잡이로 휘두른다', trait: '육중한 벌채도 난무' },
  cannoneer:  { name: '염화채 화포수', elem: 'fire', wtype: 'hidden', tier: 2, hp: 285, atk: 66, def: 12, spd: 12, eva: 8, xp: 40, silver: [10, 20], bleed: [0.25, 0.03, 2], gear: [2, 0.05],
    atkText: '기름병에 불을 붙여 던지고 폭발탄을 굴린다', trait: '기름병·폭발탄 투척 (화상)' },
  charger:    { name: '염화채 강행 돌격병', elem: 'earth', wtype: 'spear', tier: 3, hp: 441, atk: 65, def: 20, spd: 9, eva: 3, xp: 42, silver: [10, 20], gear: [2, 0.05],
    atkText: '몸을 숙이고 묵직하게 돌진하며 창을 찔러 넣는다', trait: '묵직한 돌진 찌르기' },
  eliteAxe:   { name: '염화채 정예 도부수', elem: 'fire', wtype: 'blade', tier: 3, hp: 546, atk: 76, def: 24, spd: 10, eva: 4, xp: 50, silver: [14, 26], bleed: [0.25, 0.03, 2], gear: [2, 0.07],
    atkText: '화염을 두른 대도를 크게 휘둘러 벤다', trait: '화염을 두른 대도 베기 (화상)' },
  armored:    { name: '열화 장갑병', elem: 'metal', wtype: 'fist', tier: 3, hp: 588, atk: 63, def: 36, spd: 7, eva: 2, xp: 50, silver: [14, 26], gear: [2, 0.07],
    atkText: '철갑을 두른 주먹으로 정면에서 밀고 들어온다', trait: '두터운 철갑' },
  magmaGolem: { name: '염화석괴', elem: 'fire', wtype: 'fist', tier: 4, hp: 780, atk: 86, first: true, def: 30, spd: 6, eva: 0, xp: 52, silver: [12, 24], weak: { elem: 'water', mult: 0.5 },
    atkText: '불타는 바위 팔을 내리쳐 불똥을 튀긴다', trait: '불타는 바위 요수 · 수(水) 속성에 극도로 취약' },
  jeokpaecheon: { name: '염화채주 적패천', elem: 'fire', wtype: 'blade', hp: 1900, atk: 84, def: 34, spd: 12, eva: 8, xp: 220, silver: [150, 220], gear: [2, 1], boss: 'boss2', crit: 18,
    atkText: '패도(覇刀)의 기세로 대지를 가르며 내려친다', trait: '파괴적인 패도 초식 (높은 치명)' },

  // ───── 수룡방 (상급 · 물/일반) ─────
  scaleFish:  { name: '수로 청어귀', elem: 'water', wtype: 'hidden', tier: 1, hp: 600, atk: 88, def: 36, spd: 15, eva: 14, xp: 76, silver: [28, 48], gear: [3, 0.04],
    atkText: '수면 위로 튀어 올라 날카로운 비늘을 쏘아 낸다', trait: '수면에서 비늘 발사' },
  crocodile:  { name: '뻘밭 흑악어', elem: 'earth', wtype: 'fist', tier: 3, hp: 1155, atk: 131, def: 55, spd: 8, eva: 2, xp: 82, silver: [28, 48], crit: 15, gear: [3, 0.04],
    atkText: '뻘 속에서 튀어나와 턱으로 물고 비튼다', trait: '뼈를 부수는 턱 힘 (높은 치명)' },
  raftScout:  { name: '수룡방 뗏목 척후', elem: 'water', wtype: 'spear', tier: 2, hp: 855, atk: 124, def: 42, spd: 13, eva: 8, xp: 80, silver: [30, 50], gear: [3, 0.04],
    atkText: '좁은 뗏목 위에서 긴 작살을 내지른다', trait: '긴 작살질' },
  netter:     { name: '수룡방 투망수', elem: 'metal', wtype: 'hidden', tier: 2, hp: 836, atk: 114, def: 40, spd: 12, eva: 8, xp: 84, silver: [30, 50], acc: 30, gear: [3, 0.05],
    atkText: '그물을 넓게 던져 몸을 옭아맨다', trait: '그물 투척 (피하기 어려움)' },
  raider:     { name: '수룡방 강습대원', elem: 'water', wtype: 'blade', tier: 2, hp: 950, atk: 104, def: 46, spd: 15, eva: 12, xp: 90, silver: [32, 55], hits: 2, gear: [3, 0.05],
    atkText: '미끄러지듯 파고들며 곡도를 연달아 휘두른다', trait: '미끄러지듯 파고드는 곡도술 (2연격)' },
  diver:      { name: '수룡방 수중 잠영수', elem: 'water', wtype: 'hidden', tier: 3, hp: 892, atk: 152, def: 38, spd: 16, eva: 16, xp: 88, silver: [32, 55], gear: [3, 0.05],
    atkText: '물속에서 솟구치며 비도를 날린다', trait: '물속 기습' },
  anchor:     { name: '수룡방 철퇴수', elem: 'metal', wtype: 'fist', tier: 4, hp: 1820, atk: 195, first: true, def: 60, spd: 9, eva: 3, xp: 110, silver: [40, 70], gear: [3, 0.07],
    atkText: '무거운 닻을 휘둘러 내리찍는다', trait: '닻을 휘두르는 완력가' },
  centipede:  { name: '소택지 독지네', elem: 'wood', wtype: 'spear', tier: 3, hp: 1260, atk: 147, def: 50, spd: 12, eva: 8, xp: 105, silver: [36, 64], poison: [0.35, 0.02, 3], gear: [3, 0.06],
    atkText: '긴 몸으로 휘감으며 독 다리를 박는다', trait: '휘감는 요수 (중독)' },
  iceSpirit:  { name: '빙화수요', elem: 'water', wtype: 'hidden', tier: 3, hp: 1365, atk: 142, def: 75, spd: 10, eva: 10, xp: 115, silver: [40, 70], weak: { elem: 'earth', mult: 0.25 }, gear: [3, 0.06],
    atkText: '냉기 장막 너머에서 얼음 바늘을 흩뿌린다', trait: '냉기 장막(높은 방어) · 토(土) 기공에 취약' },
  byeokhaeryong: { name: '수룡방주 벽해룡', elem: 'water', wtype: 'spear', hp: 5200, atk: 150, def: 80, spd: 14, eva: 10, xp: 500, silver: [500, 700], gear: [3, 1], boss: 'boss3', hits: 2,
    atkText: '삼지창을 용처럼 휘몰아쳐 물기둥째 찔러 온다', trait: '용처럼 휘몰아치는 삼지창술 (2연격)' },

  // 기연
  ronin:    { name: '떠돌이 낭인', elem: 'metal', wtype: 'sword', hp: 240, atk: 23, def: 9,  spd: 12, eva: 10, xp: 0, silver: [10, 20] },
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
