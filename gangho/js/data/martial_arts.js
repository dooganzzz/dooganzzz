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

/* 3대 기본 스탯 (캐릭터 생성 때 배분). ATTR_BASE를 기준으로 한 점마다 per만큼 더하거나 뺀다. per.elem: 오행 극 보정 %p */
const ATTRS = {
  str: { name: '근력', hanja: '筋力', desc: '공격력 · 적재량', per: { atk: 2, bag: 6 } },
  con: { name: '체력', hanja: '體力', desc: '생명력 · 방어', per: { maxHp: 12, def: 0.8 } },
  int: { name: '지력', hanja: '智力', desc: '내력 · 오행술 위력', per: { maxMp: 6, elem: 2 } },
};
const ATTR_BASE = 6, ATTR_MIN = 3, ATTR_MAX = 10, ATTR_TOTAL = 18;
