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
/* 비급이 장착 시 주는 능력치의 크기 (성급은 같은 등급 안에서 작게, 등급이 바뀔 때는 확실하게):
   값 = (성급 1 기준값) × K × 등급 배율(grade) × (1 + star × (성-1)/11) × (소성 6성부터 soseong).
   등급 배율이 ×2.2 이상이고 성급 효과는 최대 ×1.5라, 새 등급의 비급은 1성부터 옛 등급 12성보다 낫다. passive: 독파한 모든 비급이 영구히 주는 보너스(passiveBonus)의 배율 */
const MANUAL_POWER = { K: 1.8, star: 0.5, soseong: 1.08, grade: { '삼류': 1, '이류': 2.4, '일류': 5, '절정': 9, '초절정': 16 }, passive: 0.5 };
/* 무사 품계: 네 갈래(심법 · 무공 · 기공 · 경공) 삼류 비급을 모두 12성(대성)하고 속기단(續氣丹)을 pill.n알 삼키면 이류무사로 돌파 — 공격 · 방어 · 활력 · 내력 · 속도 +20%
   (돌파는 삼류의 좁은 경맥으로 이류의 기를 돌리는 일이라 운공 내내 내력이 샌다. 속기단이 바닥나려는 기를 조금씩 이어 운공이 끊기지 않게 버틴다) */
const WARRIOR_RANK = { promoteGrade: '삼류', lamps: 24, pill: { id: 'sokgidan', n: 3 },   // 게이지 24칸: 성급 2마다 불 하나
  ranks: [{ name: '삼류무사', hanja: '三流武士', mult: 1 }, { name: '이류무사', hanja: '二流武士', mult: 1.2 }] };


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
/* 투력 = CP_SCALE × (기준 상대들에게 넣는 피해 곱의 기하평균)^CP_EXP. 공세 × 수세는 능력치가 두 배면 네 배 이상 커져 숫자가 폭주하므로 0.38제곱으로 눌러 '보수적으로' 오르게 한다
   (청풍산 두목 ≈ 1000 · 염화채 두목 ≈ 3000 · 수룡방 두목 ≈ 9000이 되도록 맞춘 값). 요수 투력도 같은 식 */
const CP_SCALE = 170, CP_EXP = 0.38;

/* ───────── 3대 상성 ───────── */
/* 오행(五行): 장착 기공의 오행과 적의 오행. 극(剋)하는 쪽이 피해 +25%, 극당하는 쪽이 -25%. 상생(相生)은 보정 없음.
   오성은 내가 극할 때의 오행술 위력을 더한다 (APTS.wit.per.elem). */
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
/* 초식 피해 배율 (제1초식 · 제2초식 · 오의) · 공격마다 MOVE_START%(+ 연환 combo)로 초식이 발동하고, 발동하면 MOVE_PICK 비율로 셋 중 하나를 펼친다
   (아직 안 열린 초식은 빼고 남은 비율로 나눔: 1~5성은 제1초식만, 6~11성은 제1 · 제2초식 6:3) */
const MOVE_MULT = [1.4, 2.4, 3.6];
const MOVE_START = 35;
const MOVE_PICK = [60, 30, 10];   // 제1초식 · 제2초식 · 오의 (%)
/* 정 · 마 · 사 (正 · 魔 · 邪): 비급의 파(派). 정은 마를, 마는 사를, 사는 정을 이긴다 (이기는 쪽이 주는 피해 +edge · 받는 피해 -edge).
   요수는 이 셋 밖의 독립 무리라 상성이 없다 (적에게 school이 있을 때만 걸린다). 장착한 공격 무공의 파에 따라 고유 효과가 붙는다 (대가 없음, 유저 확정 10월 2일).
   비급 표지 색: 정 = 지금 표지 (삼류 양피지 → 초절정 빨강) · 마 = 연보라부터 · 사 = 연빨강부터 (표지 그림은 시안 중) */
const SCHOOLS = {
  jeong: { name: '정', hanja: '正', words: '정의 · 수호 · 집단 · 협의 · 인내', beats: 'ma', desc: '바른 길을 걷는 협객의 무공. 문파와 함께 커 간다.', bonus: '문파 공헌도 · 토벌 임무 보상 +10%' },
  ma:    { name: '마', hanja: '魔', words: '순수 · 힘 · 독단 · 광기 · 패도', beats: 'sa', desc: '홀로 극에 이르려는 순수한 힘의 무공.', bonus: '초식 위력 +10%' },
  sa:    { name: '사', hanja: '邪', words: '피 · 육체 · 파괴 · 금기 · 갈증', beats: 'jeong', desc: '피와 육체를 탐하는 금기의 무공.', bonus: '싸움에 이기면 활력 3% 회복' },
};
const SCHOOL_RULES = { edge: 0.15, jeongReward: 0.1, maStance: 0.1, saHeal: 0.03 };
const COMBAT_RULES = { minDmg: 0.2, elemPenalty: 0.15, powerBase: 1.5, weakenMax: 0.2,
  critBase: 1.6,          // 제자 치명 배율 기본 (+ 치명 피해 %)
  blockCut: 0.4,          // 막기: 막으면 받는 피해 -40%
  realm: { step: 0.1, cap: 3 },   // 경지 압제: 제자 품계(삼류 0 · 이류 1) − 요수 경지(탐험지 단계 − 1)마다 주는 피해 +10% · 받는 피해 -10% (최대 3단계)
  aura: { base: 10, perRank: 10, foeTier: 5, foeZone: 10, foeBoss: 15, cut: 0.5, max: 15 },   // 기세: 차이의 절반(%)만큼 약한 쪽 공격력이 꺾인다 (최대 15%)
};
/* 쓰러졌을 때 남기는 패배 원인 (관찰·탐험 기록) */
const DEFEAT_CAUSE = {
  crit: '상대의 날카로운 기습에 호흡이 흐트러졌습니다.',
  heavy: '적의 묵직한 일격에 기세가 꺾였습니다.',
  combo: '몰아치는 연격을 끝내 받아내지 못했습니다.',
  dot: '독과 상처가 쌓여 끝내 버티지 못했습니다.',
  elem: '상성이 맞지 않는 기운에 내력이 흩어졌습니다.',
  grind: '길어진 싸움에 힘이 다했습니다.',
};

/* 단련 스탯 4종 (캐릭터 생성 때 배분 · 비급 독파와 성장으로 자주 오른다). 계열마다 짝이 되는 자질(APTS)이 한 점당 증가량의 계수가 된다.
   per: ATTR_BASE를 기준으로 한 점마다 더하거나 뺀다 · abs: 수치 그대로 곱해 더한다 — 민첩: 회피율 민첩×0.5% · 탐험 기력 소모 민첩×1% 감소.
   선공은 '속도 + 민첩 + 선공(안력)'과 요수의 속도를 비교한다. 투력에는 선공(≥ 기준 상대 속도)으로 들어간다 */
const ATTRS = {
  str: { name: '근력', hanja: '筋力', desc: '공격력 · 적재량', per: { atk: 2, bag: 6 } },
  con: { name: '체력', hanja: '體力', desc: '최대 활력 · 방어력', per: { maxHp: 12, def: 0.8 } },
  agi: { name: '민첩', hanja: '敏捷', desc: '속도 · 회피 · 경공 효율', per: {}, abs: { eva: 0.5, staSave: 1 } },
  int: { name: '심력', hanja: '心力', desc: '최대 내력 · 내력 회복 · 막기 · 호신강기', per: { maxMp: 6, mpRegen: 0.1, block: 0.4, shield: 0.5 } },
};
/* 자질 4종 (資質, 타고난 바탕): 서장에서 주사위로 정한다 — 넷 모두 APT_MIN~APT_MAX, 합계는 늘 APT_TOTAL이라 제자끼리 공평하다.
   영약 · 기연 · 경지 돌파 때만 조금씩 오른다 (획득처는 차차). 가운데 값(APT_MID)이 지금까지의 기준이라 평균 제자는 수치가 그대로다.
   pair: 짝 단련 스탯 · scale: 짝 스탯 한 점당 증가량에 곱하는 몫(1 + scale × (자질 - APT_MID)) · per: 자질이 가운데 값에서 한 점 벗어날 때마다 */
const APTS = {
  bone: { name: '근골', hanja: '筋骨', desc: '타고난 뼈대와 힘줄 — 근력 1당 공격력 · 치명 피해 · 기세', pair: 'str', scale: { atk: 0.05 }, per: { critDmg: 1, aura: 0.5 } },
  phys: { name: '체질', hanja: '體質', desc: '타고난 몸의 바탕 — 체력 1당 활력 · 치명 저항 · 최대 기력', pair: 'con', scale: { maxHp: 0.05 }, per: { critRes: 1, maxSta: 2 } },
  eye:  { name: '안력', hanja: '眼力', desc: '상대의 움직임을 읽는 눈 — 선공 판정 · 치명타율 · 반격', pair: 'agi', scale: {}, per: { first: 0.6, crit: 0.5, counter: 0.6 } },
  wit:  { name: '오성', hanja: '悟性', desc: '초식을 깨닫는 자질 — 초식 위력 · 수련치 · 내력 소모 감소 · 기예 · 오행술 위력', pair: 'int', scale: {}, per: { qiDmg: 0.012, train: 1.5, mpSave: 1.5, craft: 1, elem: 2 } },
};
const APT_MIN = 1, APT_MAX = 12, APT_TOTAL = 26, APT_MID = 6.5;
const ATTR_BASE = 6, ATTR_MIN = 3, ATTR_MAX = 10, ATTR_TOTAL = 24;
