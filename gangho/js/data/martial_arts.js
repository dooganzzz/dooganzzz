/* [데이터] 비급 · 경계 · 계수 — 순수 정적 데이터 (로직 없음) */

/* 강호견문록 — 정적 데이터 (비급·아이템·레시피·구역·적) */
'use strict';
const GRADES = {
  '삼류': { mult: 1.0, cls: 'g3' },
  '이류': { mult: 1.6, cls: 'g2' },
};

const CATS = {
  mugong:     { name: '무공', hanja: '武功', desc: '초식 발동과 순간 피해' },
  simbeop:    { name: '심법', hanja: '心法', desc: '최대 내력과 기본 능력치' },
  gyeonggong: { name: '경공', hanja: '輕功', desc: '공격 속도와 회피율' },
  gigong:     { name: '기공', hanja: '氣功', desc: '최대 활력과 방어력' },
};

const CAT_ORDER = ['mugong', 'simbeop', 'gyeonggong', 'gigong'];

const WEAPON_TYPES = {
  fist:   '권장완대',
  sword:  '검',
  blade:  '도',
  spear:  '창',
  hidden: '암기통',
};

/* 관문: 이 성(星)에서 다음 성으로 넘어갈 때 돌파단이 필요 */
/* 2대 경계: 5성이 차면 소성(小成) 관문, 11성이 차면 대성(大成) 관문. 돌파단을 복용해 넘는다. */
const GATES = { 5: 'pillLow', 11: 'pillHigh' };
const GATE_NAME = { 5: '소성 관문(小成)', 11: '대성 관문(大成)' };

/* 경계 이름: 1~5성 입문, 6~11성 소성, 12성 대성 */
const REALMS = [
  { min: 1,  name: '입문', hanja: '入門', cls: 'realm-0' },
  { min: 6,  name: '소성', hanja: '小成', cls: 'realm-1' },
  { min: 12, name: '대성', hanja: '大成 / 極意', cls: 'realm-2' },
];

/* 대성 패시브: 12성에 이르면 분류별로 영구 고유 효과가 열린다 */
const DAESUNG_PASSIVE = {
  mugong:     { text: '극의(極意): 초식 발동률 +15%, 치명타율 +5%', stats: { combo: 15, crit: 5 } },
  simbeop:    { text: '극의(極意): 최대 내력 +20%, 내력 회복 +3', stats: { mpPct: 20, mpRegen: 3 } },
  gyeonggong: { text: '극의(極意): 속도 +3, 회피율 +8%', stats: { spd: 3, eva: 8 } },
  gigong:     { text: '극의(極意): 최대 활력 +15%, 반격 +10%', stats: { hpPct: 15, counter: 10 } },
};

const MAX_STAR = 12;

const MANUALS = {
  // 입문 무공 (삼재 계열)
  samjaeGwon:  { name: '삼재권장법', hanja: '三才拳掌法', desc: '하늘·땅·사람의 이치를 주먹과 손바닥에 담은 입문 권장법. 투박하지만 기본기가 단단해진다.', cat: 'mugong', grade: '삼류', weapon: 'fist',   moves: ['천권', '지장', '인각'] },
  samjaeGeom:  { name: '삼재검법',   hanja: '三才劍法',   desc: '강호의 검객이라면 누구나 한 번은 거쳐 가는 입문 검법. 세 초식이 천지인(天地人)의 순서로 이어진다.', cat: 'mugong', grade: '삼류', weapon: 'sword',  moves: ['천재', '지재', '인재'] },
  samjaeDo:    { name: '삼재도법',   hanja: '三才刀法',   desc: '무게를 실어 내려치는 데 집중한 입문 도법. 한 번 휘두를 때마다 바위가 쪼개지는 기세를 흉내 낸다.', cat: 'mugong', grade: '삼류', weapon: 'blade',  moves: ['천참', '지참', '인참'] },
  samjaeChang: { name: '삼재창법',   hanja: '三才槍法',   desc: '찌르고, 쓸고, 돌리는 창술의 기초. 긴 자루로 거리를 지배하는 법을 익힌다.', cat: 'mugong', grade: '삼류', weapon: 'spear',  moves: ['천돌', '지소', '인선'] },
  samjaePyo:   { name: '삼재표법',   hanja: '三才鏢法',   desc: '돌멩이 하나로 새를 떨어뜨리는 법에서 시작하는 입문 표법. 손목과 눈이 함께 자란다.', cat: 'mugong', grade: '삼류', weapon: 'hidden', moves: ['천표', '지표', '인표'] },
  // 입문 보조 비급
  tonap:       { name: '토납법', hanja: '吐納法', desc: '들숨과 날숨으로 천지의 기운을 받아들이는 가장 오래된 호흡법. 내력의 뿌리가 된다.', cat: 'simbeop',    grade: '삼류' },
  pocheolsak:  { name: '포철삭', hanja: '抛鐵索', desc: '쇠사슬을 던져 몸을 끌어당기듯 발을 옮기는 기이한 보법. 청풍문 선대가 산을 타며 만들었다.', cat: 'gyeonggong', grade: '삼류', terrain: 'earth' },
  cheolpo:     { name: '철포삼', hanja: '鐵布衫', desc: '온몸에 기를 돌려 무쇠 옷을 두른 듯 단단해지는 외문 기공. 맞을수록 강해진다.', cat: 'gigong',     grade: '삼류', elem: 'metal' },
  // 무신상 공양으로만 얻는 삼류 비급: 오행 기공 · 지형 경공
  yeolhwa:     { name: '열화기공', hanja: '烈火氣功', desc: '단전의 불씨를 온몸으로 끌어올리는 기공. 몸이 뜨거워지고 쇠붙이가 무르게 느껴진다.', cat: 'gigong', grade: '삼류', elem: 'fire' },
  suryu:       { name: '수류기공', hanja: '水流氣功', desc: '흐르는 물처럼 기를 돌려 충격을 흘려보내는 기공. 불길 앞에서 특히 차분해진다.', cat: 'gigong', grade: '삼류', elem: 'water' },
  hwangto:     { name: '황토기공', hanja: '黃土氣功', desc: '발밑의 흙기운을 빨아올려 몸을 무겁고 단단하게 만드는 기공. 물의 기세를 막아선다.', cat: 'gigong', grade: '삼류', elem: 'earth' },
  chosangbi:   { name: '초상비', hanja: '草上飛', desc: '풀잎 끝을 밟고 달린다는 경공. 수풀 속에서는 발소리조차 나지 않는다.', cat: 'gyeonggong', grade: '삼류', terrain: 'grass' },
  deungpyeong: { name: '등평도수', hanja: '登萍渡水', desc: '부평초를 딛고 물을 건넌다는 경공. 물가와 늪에서 기력을 아낀다.', cat: 'gyeonggong', grade: '삼류', terrain: 'water' },
  // 장경각: 청풍문 세트 (문파 공헌도로 교환)
  cpGwon:   { name: '청풍권',   hanja: '淸風拳',   desc: '청풍문의 바람을 주먹에 실은 비전 권법. 세 번째 권에 이르면 폭풍이 인다.', cat: 'mugong', grade: '이류', weapon: 'fist',   moves: ['청풍일권', '회풍이권', '광풍삼권'], cost: 300 },
  cpGeom:   { name: '청풍검',   hanja: '淸風劍',   desc: '바람처럼 가볍고 빠른 청풍문의 비전 검법. 검 끝이 만 리를 달린다.', cat: 'mugong', grade: '이류', weapon: 'sword',  moves: ['청풍출검', '회풍검', '청풍만리'], cost: 300 },
  cpDo:     { name: '청풍도',   hanja: '淸風刀',   desc: '회오리치는 바람으로 적의 혼을 끊는다는 청풍문의 비전 도법.', cat: 'mugong', grade: '이류', weapon: 'blade',  moves: ['청풍일도', '선풍참', '광풍단혼'], cost: 300 },
  cpChang:  { name: '청풍창',   hanja: '淸風槍',   desc: '바람을 등에 업고 뚫고 들어가는 청풍문의 비전 창법.', cat: 'mugong', grade: '이류', weapon: 'spear',  moves: ['청풍돌', '회풍창', '광풍천돌'], cost: 300 },
  cpPyo:    { name: '청풍표',   hanja: '淸風鏢',   desc: '하늘 가득 바람에 실린 비표를 흩뿌리는 청풍문의 비전 표법.', cat: 'mugong', grade: '이류', weapon: 'hidden', moves: ['청풍비표', '회풍표', '만천청풍'], cost: 300 },
  cpSim:    { name: '청풍심법', hanja: '淸風心法', desc: '청풍산의 맑은 바람을 단전에 담는 청풍문 내문 심법. 내력통이 크게 넓어진다.', cat: 'simbeop',    grade: '이류', cost: 250 },
  cpGyeong: { name: '청풍경공', hanja: '淸風輕功', desc: '바람을 밟고 나아가는 청풍문의 비전 경공. 몸이 깃털처럼 가벼워진다.', cat: 'gyeonggong', grade: '이류', cost: 250, terrain: 'plain' },
  cpGi:     { name: '청풍기공', hanja: '淸風氣功', desc: '바람의 장막을 몸에 두르는 청풍문의 비전 기공. 칼끝이 살에 닿기 전에 흘러내린다.', cat: 'gigong',     grade: '이류', cost: 250, elem: 'wood' },
};

const STARTERS = ['samjaeGwon', 'samjaeGeom', 'samjaeDo', 'samjaeChang', 'samjaePyo'];
const WEAPON_SHORT = { fist: '권장', sword: '검', blade: '도', spear: '창', hidden: '암기' };
/* 성급을 올리는 데 드는 경험치: STAR_EXP[s - 1] = s성 → s+1성 (삼류 기준, 등급 계수를 곱한다).
   5→6성(소성), 11→12성(대성)은 GATES의 돌파단도 함께 든다. 경험치는 탐험에서 적을 쓰러뜨려 얻는다. */
const STAR_EXP = [60, 90, 130, 180, 260, 340, 430, 540, 660, 800, 1200];

/* 종합 전투력 가중치: 최대 활력·내력, 공격력·방어력(장비·무공·무신상·버프 합계),
   장착 무공 4종마다 등급 계수(GRADES.mult) × 현재 성 × art */
const CP_WEIGHTS = { maxHp: 1.0, maxMp: 1.5, atk: 5.0, def: 3.0, art: 10 };

/* ───────── 3대 상성 ───────── */
/* 오행(五行): 장착 기공의 오행과 적의 오행. 극(剋)하는 쪽이 피해 +25%, 극당하는 쪽이 -25%. 상생(相生)은 보정 없음.
   지력은 내가 극할 때의 오행술 위력을 더한다 (ATTRS.int.per.elem). */
const ELEMENTS = {
  wood:  { name: '목', hanja: '木', cls: 'el-wood' },
  fire:  { name: '화', hanja: '火', cls: 'el-fire' },
  earth: { name: '토', hanja: '土', cls: 'el-earth' },
  metal: { name: '금', hanja: '金', cls: 'el-metal' },
  water: { name: '수', hanja: '水', cls: 'el-water' },
};
const ELEM_BEATS = { wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' };   // 목극토 · 토극수 · 수극화 · 화극금 · 금극목
const ELEM_GEN = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };     // 상생 (표시용)

/* 지형(地形): 탐험 한 걸음마다 구역의 지형 비율로 뽑는다. 장착 경공의 지형과 같으면 기력 소모 -20%, 다르면 +20%. 경공이 없으면 보정 없음. */
const TERRAINS = {
  grass: { name: '풀', hanja: '草' },
  water: { name: '물', hanja: '水' },
  earth: { name: '흙', hanja: '土' },
  plain: { name: '일반', hanja: '平' },
};

/* 병기 상성: 병기 계열끼리의 가위바위보. 1 = 우세, -1 = 열세, 0 = 호각. 짐승처럼 병기가 없는 적과는 호각. */
const WEAPON_CLASS = { fist: 'fist', sword: 'blade', blade: 'blade', spear: 'spear', hidden: 'hidden' };
const WEAPON_CLASS_NAME = { fist: '권장', blade: '검/도', spear: '창', hidden: '암기' };
const WEAPON_ADV = {
  fist:   { blade: 1,  hidden: -1, spear: -1 },
  spear:  { fist: 1,   blade: -1,  hidden: 0 },
  blade:  { hidden: 1, spear: 1,   fist: -1 },
  hidden: { fist: 1,   blade: -1,  spear: 0 },
};

/* 상성 계수. elem: 오행 극 · weapAtk: 병기 우세 공격력 · weapHit: 병기 우세 명중 보정(%p) · weapDown: 병기 열세 피해 감소
   terrainMatch / terrainMiss: 지형 일치·불일치 기력 소모 배율 */
const AFFINITY = { elem: 0.25, weapAtk: 0.15, weapHit: 10, weapDown: 0.15, terrainMatch: 0.8, terrainMiss: 1.2 };

/* 3대 기본 스탯 (캐릭터 생성 때 배분). ATTR_BASE를 기준으로 한 점마다 per만큼 더하거나 뺀다. per.elem: 오행 극 보정 %p */
const ATTRS = {
  str: { name: '근력', hanja: '筋力', desc: '공격력 · 적재량', per: { atk: 2, bag: 6 } },
  con: { name: '체력', hanja: '體力', desc: '생명력 · 방어', per: { maxHp: 12, def: 0.8 } },
  int: { name: '지력', hanja: '智力', desc: '내력 · 오행술 위력', per: { maxMp: 6, elem: 2 } },
};
const ATTR_BASE = 6, ATTR_MIN = 3, ATTR_MAX = 10, ATTR_TOTAL = 18;
