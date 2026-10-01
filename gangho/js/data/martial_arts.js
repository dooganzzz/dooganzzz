/* [데이터] 비급 · 경계 · 계수 — 순수 정적 데이터 (로직 없음) */

/* 강호견문록 — 정적 데이터 (비급·아이템·레시피·구역·적) */
'use strict';
const GRADES = {
  '삼류': { mult: 1.0, cls: 'g3' },
  '이류': { mult: 1.6, cls: 'g2' },
  '일류': { mult: 2.4, cls: 'g1' },
  '절정': { mult: 3.4, cls: 'g0' },
  '초절정': { mult: 4.6, cls: 'gs' },
};
/* 1장: 이류까지만 공개. 일류 · 절정 · 초절정 비급은 봉인 (얻을 수도 익힐 수도 없고, 장경각에도 나오지 않는다) */
const OPEN_GRADES = ['삼류', '이류'];

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


const STARTERS = ['fs1a', 'sw1a', 'bd1a', 'sp1a', 'hd1a'];   // 병기별 첫 삼류 (입문)
const WEAPON_SHORT = { fist: '권장', sword: '검', blade: '도', spear: '창', hidden: '암기' };
/* 성급을 올리는 데 드는 수련치: STAR_EXP[s - 1] = s성 → s+1성 (삼류 기준, 등급 계수를 곱한다).
   5→6성(소성), 11→12성(대성)은 GATES의 돌파단도 함께 든다. 수련치는 탐험에서 적을 쓰러뜨려 얻는다. */
const STAR_EXP = [60, 90, 130, 180, 260, 340, 430, 540, 660, 800, 1200];

/* 투력(鬪力): 능력치 합이 아니라 '기준 상대와 겨뤘을 때 쓰러지기 전까지 넣는 피해'로 잰다.
   공세(합당 기대 피해: 명중 · 관통 · 치명 · 초식 발현 · 내력 지속 · 반격 · 오행) × 수세(버티는 합: 활력 ÷ 합당 받는 피해, 회피 · 방어 · 치명 저항 · 흡혈 · 충격) + 선공.
   hp는 참고값(계산에는 쓰지 않음). 기준 상대는 세 단계(청풍산 · 염화채 · 수룡방 정예 수준) — 세 값을 기하평균해 한쪽만 높은 몸은 오르지 않게 한다. scale은 보기 좋은 크기로 키우는 값 */
const CP_REF = [
  { name: '청풍산 정예', hp: 260, atk: 30, def: 8, eva: 10, spd: 12, crit: 8, hits: 1.3 },
  { name: '염화채 정예', hp: 480, atk: 75, def: 25, eva: 6, spd: 10, crit: 10, hits: 1.2 },
  { name: '수룡방 정예', hp: 1250, atk: 150, def: 60, eva: 10, spd: 12, crit: 10, hits: 1.2 },
];
const CP_SCALE = 10;

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

/* 지형(地形) 5대: 구역마다 하나 이상(복합 지형). 장착 경공의 지형이 구역 지형 중 하나라도 맞으면 그 탐험의 기력 소모 -20%,
   하나도 맞지 않으면 +20%. 경공이 없으면 보정 없음. */
const TERRAINS = {
  grass: { name: '풀', hanja: '草' },
  water: { name: '물', hanja: '水' },
  earth: { name: '흙', hanja: '土' },
  wood:  { name: '나무', hanja: '木' },
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
/* 전투 보정: minDmg 적 공격의 최소 피해(공격력 대비, 방어로도 못 막는 몫) · elemPenalty 오행 역상성일 때 받는 피해 추가
   powerBase 초식 피해 배율의 기준(장경각 무공의 power가 이 값보다 크면 그만큼 초식이 세다) · weakenMax 기세 깎기 상한 */
/* 초식 피해 배율 (제1초식 · 제2초식 · 오의) · 이어질 확률(%): 제1초식은 초식 발동(35% + 연환) 때, 제2초식 · 오의는 앞 초식에 이어서 */
const MOVE_MULT = [1.4, 2.4, 3.6];
const MOVE_CHAIN = [100, 50, 35];
const COMBAT_RULES = { minDmg: 0.2, elemPenalty: 0.15, powerBase: 1.5, weakenMax: 0.2 };
/* 쓰러졌을 때 남기는 패배 원인 (관찰·탐험 기록) */
const DEFEAT_CAUSE = {
  crit: '상대의 날카로운 기습에 호흡이 흐트러졌습니다.',
  heavy: '적의 묵직한 일격에 기세가 꺾였습니다.',
  combo: '몰아치는 연격을 끝내 받아내지 못했습니다.',
  dot: '독과 상처가 쌓여 끝내 버티지 못했습니다.',
  elem: '상성이 맞지 않는 기운에 내력이 흩어졌습니다.',
  grind: '길어진 싸움에 힘이 다했습니다.',
};

/* 4대 기본 스탯 (캐릭터 생성 때 배분).
   per: ATTR_BASE를 기준으로 한 점마다 더하거나 뺀다 (per.elem: 오행 극 보정 %p)
   abs: 수치 그대로 곱해 더한다 — 민첩: 회피율 민첩×0.5% · 치명타율 민첩×0.4% · 탐험 기력 소모 민첩×1% 감소.
        선공은 '속도 + 민첩'과 요수의 속도를 비교한다. 투력에는 선공(속도 + 민첩 ≥ 기준 상대 속도)으로 들어간다 */
const ATTRS = {
  str: { name: '근력', hanja: '筋力', desc: '공격력 · 적재량', per: { atk: 2, bag: 6 } },
  con: { name: '체력', hanja: '體力', desc: '생명력 · 방어', per: { maxHp: 12, def: 0.8 } },
  agi: { name: '민첩', hanja: '敏捷', desc: '회피 · 치명타 · 경공 효율', per: {}, abs: { eva: 0.5, crit: 0.4, staSave: 1 } },
  int: { name: '지력', hanja: '智力', desc: '내력 · 오행술 위력', per: { maxMp: 6, elem: 2 } },
};
const ATTR_BASE = 6, ATTR_MIN = 3, ATTR_MAX = 10, ATTR_TOTAL = 24;
