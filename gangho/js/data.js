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
const GATES = { 3: 'pillLow', 7: 'pillMid', 11: 'pillHigh' };
const GATE_NAME = { 3: '소관문(小關門)', 7: '중관문(中關門)', 11: '대관문(大關門)' };
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
  pocheolsak:  { name: '포철삭', hanja: '抛鐵索', desc: '쇠사슬을 던져 몸을 끌어당기듯 발을 옮기는 기이한 보법. 청풍문 선대가 산을 타며 만들었다.', cat: 'gyeonggong', grade: '삼류' },
  cheolpo:     { name: '철포삼', hanja: '鐵布衫', desc: '온몸에 기를 돌려 무쇠 옷을 두른 듯 단단해지는 외문 기공. 맞을수록 강해진다.', cat: 'gigong',     grade: '삼류' },
  // 장경각: 청풍문 세트 (문파 공헌도로 교환)
  cpGwon:   { name: '청풍권',   hanja: '淸風拳',   desc: '청풍문의 바람을 주먹에 실은 비전 권법. 세 번째 권에 이르면 폭풍이 인다.', cat: 'mugong', grade: '이류', weapon: 'fist',   moves: ['청풍일권', '회풍이권', '광풍삼권'], cost: 300 },
  cpGeom:   { name: '청풍검',   hanja: '淸風劍',   desc: '바람처럼 가볍고 빠른 청풍문의 비전 검법. 검 끝이 만 리를 달린다.', cat: 'mugong', grade: '이류', weapon: 'sword',  moves: ['청풍출검', '회풍검', '청풍만리'], cost: 300 },
  cpDo:     { name: '청풍도',   hanja: '淸風刀',   desc: '회오리치는 바람으로 적의 혼을 끊는다는 청풍문의 비전 도법.', cat: 'mugong', grade: '이류', weapon: 'blade',  moves: ['청풍일도', '선풍참', '광풍단혼'], cost: 300 },
  cpChang:  { name: '청풍창',   hanja: '淸風槍',   desc: '바람을 등에 업고 뚫고 들어가는 청풍문의 비전 창법.', cat: 'mugong', grade: '이류', weapon: 'spear',  moves: ['청풍돌', '회풍창', '광풍천돌'], cost: 300 },
  cpPyo:    { name: '청풍표',   hanja: '淸風鏢',   desc: '하늘 가득 바람에 실린 비표를 흩뿌리는 청풍문의 비전 표법.', cat: 'mugong', grade: '이류', weapon: 'hidden', moves: ['청풍비표', '회풍표', '만천청풍'], cost: 300 },
  cpSim:    { name: '청풍심법', hanja: '淸風心法', desc: '청풍산의 맑은 바람을 단전에 담는 청풍문 내문 심법. 내력통이 크게 넓어진다.', cat: 'simbeop',    grade: '이류', cost: 250 },
  cpGyeong: { name: '청풍경공', hanja: '淸風輕功', desc: '바람을 밟고 나아가는 청풍문의 비전 경공. 몸이 깃털처럼 가벼워진다.', cat: 'gyeonggong', grade: '이류', cost: 250 },
  cpGi:     { name: '청풍기공', hanja: '淸風氣功', desc: '바람의 장막을 몸에 두르는 청풍문의 비전 기공. 칼끝이 살에 닿기 전에 흘러내린다.', cat: 'gigong',     grade: '이류', cost: 250 },
};
const STARTERS = ['samjaeGwon', 'samjaeGeom', 'samjaeDo', 'samjaeChang', 'samjaePyo'];
const WEAPON_SHORT = { fist: '권장', sword: '검', blade: '도', spear: '창', hidden: '암기' };

/* 아이템 */
const ITEMS = {
  // 채집 재료
  herb:         { name: '산약초',     icon: '🌿', kind: '재료', craftType: 'alchemy', price: 2, desc: '청풍산 어디서나 자라는 흔한 약초.' },
  lingzhi:      { name: '영지버섯',   icon: '🍄', kind: '재료', craftType: 'alchemy', price: 8, desc: '고목 그늘에서 드물게 자라는 버섯. 약성이 깊다.' },
  firegrass:    { name: '화령초',     icon: '🔥', kind: '재료', craftType: 'alchemy', price: 10, desc: '염화채 바위틈의 붉은 풀. 만지면 손끝이 뜨겁다.' },
  bloodginseng: { name: '혈삼',       icon: '🥕', kind: '재료', craftType: 'alchemy', price: 30, desc: '핏빛 뿌리를 가진 삼. 적룡방 습지에서 난다.' },
  lotus:        { name: '수련화',     icon: '🪷', kind: '재료', craftType: 'alchemy', price: 25, desc: '적룡방 수면에 피는 흰 꽃. 마음을 맑게 한다.' },
  iron:         { name: '철광석',     icon: '🪨', kind: '재료', craftType: 'forge', price: 3, desc: '청풍산에서 캐는 거친 쇠돌.' },
  blackiron:    { name: '흑철',       icon: '⬛', kind: '재료', craftType: 'forge', price: 12, desc: '염화채 광맥의 검은 쇠. 무겁고 단단하다.' },
  coldiron:     { name: '한철',       icon: '🧊', kind: '재료', craftType: 'forge', price: 35, desc: '적룡방 물밑에서 건진 차가운 쇠.' },
  jadeStone:    { name: '옥돌',       icon: '💠', kind: '재료', craftType: 'forge', price: 15, desc: '광맥 사이에 박힌 푸른 옥.' },
  wood:         { name: '목재',       icon: '🪵', kind: '재료', craftType: 'forge', price: 1, desc: '땔감이자 자루감.' },
  rabbitMeat:   { name: '토끼고기',   icon: '🍖', kind: '재료', craftType: 'cooking', price: 2, desc: '들토끼에게서 얻은 고기.' },
  rabbitHide:   { name: '토끼가죽',   icon: '🟫', kind: '재료', craftType: 'forge', price: 2, desc: '부드럽고 얇은 가죽.' },
  dogFang:      { name: '들개 이빨',  icon: '🦷', kind: '재료', craftType: 'forge', price: 3, desc: '날카로운 송곳니.' },
  boarMeat:     { name: '멧돼지고기', icon: '🥩', kind: '재료', craftType: 'cooking', price: 4, desc: '기름진 멧돼지 고기.' },
  boarHide:     { name: '멧돼지 가죽', icon: '🟤', kind: '재료', craftType: 'forge', price: 5, desc: '두껍고 질긴 가죽.' },
  boarTusk:     { name: '멧돼지 엄니', icon: '🦴', kind: '재료', craftType: 'forge', price: 6, desc: '휘어진 엄니. 도(刀)의 코등이로 쓰인다.' },
  bandanaSilk:  { name: '화적 비단',  icon: '🧣', kind: '재료', craftType: 'forge', price: 12, desc: '화적들이 약탈한 붉은 비단.' },
  emberStone:   { name: '불씨석',     icon: '🔴', kind: '재료', craftType: 'forge', price: 15, desc: '열기를 머금은 돌. 염화채 광맥에서 난다.' },
  fish:         { name: '잉어',       icon: '🐟', kind: '재료', craftType: 'cooking', price: 8, desc: '적룡방 강물의 살진 잉어.' },
  scale:        { name: '교룡 비늘',  icon: '🐉', kind: '재료', craftType: 'forge', price: 30, desc: '수적들이 부적처럼 지니고 다니는 비늘.' },
  water:        { name: '맑은 물',   icon: '💧', kind: '재료', craftType: 'cooking', price: 1, desc: '계곡에서 길어 온 찬물.' },
  wildGreens:   { name: '산나물',   icon: '🥬', kind: '재료', craftType: 'cooking', price: 2, desc: '산기슭에서 뜯은 나물.' },
  chili:        { name: '산초',     icon: '🌶️', kind: '재료', craftType: 'cooking', price: 6, desc: '염화채 바위틈의 매운 열매.' },
  rice:         { name: '쌀',         icon: '🍚', kind: '재료', craftType: 'cooking', price: 3, desc: '아린이 몰래 챙겨둔 쌀.' },
  salt:         { name: '소금',       icon: '🧂', kind: '재료', craftType: 'cooking', price: 3, desc: '간을 맞추는 데 필수.' },
  // 실패 부산물
  twistedIron:  { name: '뒤틀린 쇳덩이', icon: '⚙️', kind: '부산물', price: 0, desc: '주조 실패의 흔적. 무신상에 봉헌할 수 있다.' },
  burntAsh:     { name: '탄 약초재',     icon: '🌫️', kind: '부산물', price: 0, desc: '연단 실패의 흔적. 무신상에 봉헌할 수 있다.' },
  dregs:        { name: '찌꺼기',        icon: '🫗', kind: '부산물', price: 0, desc: '조리 실패의 흔적. 무신상에 봉헌할 수 있다.' },
  // 연단
  pillLow:   { name: '하급 돌파단', icon: '🟢', kind: '영단', price: 40,  use: { gate: 3 }, desc: '복용하면 소관문(3성→4성)에 막힌 비급이 돌파한다.' },
  pillMid:   { name: '중급 돌파단', icon: '🔵', kind: '영단', price: 150, use: { gate: 7 }, desc: '복용하면 중관문(7성→8성)에 막힌 비급이 돌파한다.' },
  pillHigh:  { name: '상급 돌파단', icon: '🟣', kind: '영단', price: 500, use: { gate: 11 }, desc: '복용하면 대관문(11성→12성)에 막힌 비급이 대성한다.' },
  potionHp:  { name: '금창약',   icon: '🩹', kind: '영약', price: 8,  use: { hp: 0.4 }, desc: '활력을 40% 회복한다. 전투 중 사용 가능.' },
  potionMp:  { name: '소환단',   icon: '💧', kind: '영약', price: 12, use: { mp: 0.5 }, desc: '내력을 50% 회복한다. 전투 중 사용 가능.' },
  clearPill: { name: '청심단',   icon: '🤍', kind: '영약', price: 60, use: { hp: 1, mp: 1 }, desc: '활력과 내력을 모두 회복한다.' },
  fireElixir:{ name: '화령단',   icon: '♨️', kind: '영약', price: 80, use: { perm: { maxMp: 15 } }, desc: '복용 시 최대 내력이 영구히 15 오른다.' },
  bloodPill: { name: '혈삼환',   icon: '❤️', kind: '영약', price: 120, use: { perm: { maxHp: 40 } }, desc: '복용 시 최대 활력이 영구히 40 오른다.' },
  // 조리
  jumeokbap: { name: '주먹밥',       icon: '🍙', kind: '음식', price: 5,  use: { stamina: 20 }, desc: '기력 +20.' },
  rabbitRoast:{ name: '토끼구이',    icon: '🍗', kind: '음식', price: 6,  use: { stamina: 25 }, desc: '기력 +25.' },
  boarSuyuk: { name: '멧돼지 수육', icon: '🍲', kind: '음식', price: 20, use: { stamina: 50, buff: { key: 'atk', val: 0.1, dur: 600, name: '수육의 힘' } }, desc: '기력 +50, 10분간 공격력 +10%.' },
  lingzhiBap:{ name: '산채밥', icon: '🍛', kind: '음식', price: 25, use: { stamina: 40, buff: { key: 'train', val: 0.25, dur: 900, name: '산채밥 기운' } }, desc: '기력 +40, 15분간 수련 효율 +25%.' },
  fireStew:  { name: '화룡 전골',   icon: '🥘', kind: '음식', price: 40, use: { stamina: 70, buff: { key: 'atk', val: 0.2, dur: 900, name: '화룡의 열기' } }, desc: '기력 +70, 15분간 공격력 +20%.' },
  fishRoast: { name: '잉어 구이',   icon: '🍢', kind: '음식', price: 18, use: { stamina: 45 }, desc: '기력 +45.' },
  fishCongee:{ name: '잉어 어죽',   icon: '🥣', kind: '음식', price: 50, use: { stamina: 100, buff: { key: 'def', val: 0.2, dur: 900, name: '어죽의 온기' } }, desc: '기력 +100, 15분간 방어력 +20%.' },
  arinSnack: { name: '아린표 약과', icon: '🍪', kind: '음식', price: 0,  use: { stamina: 40 }, desc: '아린이 몰래 구운 약과. 기력 +40.' },
  // 증표
  hasanryeong: { name: '낙양성 하산령', icon: '📜', kind: '증표', price: 0, desc: '청풍문 장문인이 내린 하산 허가증. 제2장 낙양성으로 가는 길이 열린다.' },
};

/* 비급서: 모든 비급마다 '비급' 아이템이 있다. 행낭에서 [ 익히기 ]로 소모하면 습득한 무공 목록에 오른다. */
for (const [id, M] of Object.entries(MANUALS)) {
  ITEMS['bk_' + id] = { name: `《${M.name}》 비급`, icon: '📘', kind: '비급', price: 0, use: { learn: id }, desc: `읽고 익히면 ${M.name}(${M.hanja})을(를) 운용할 수 있다.` };
}

/* 희귀도 */
const RARITY = [
  { name: '하품', hanja: '下品', mult: 1.0,  cls: 'r0' },
  { name: '중품', hanja: '中品', mult: 1.2,  cls: 'r1' },
  { name: '상품', hanja: '上品', mult: 1.45, cls: 'r2' },
  { name: '진품', hanja: '珍品', mult: 1.75, cls: 'r3' },
  { name: '극품', hanja: '極品', mult: 2.1,  cls: 'r4' },
];

/* 장비 슬롯 */
const SLOTS = {
  weapon: { name: '무기',   desc: '5대 병기' },
  armor:  { name: '호갑',   desc: '활력·방어력' },
  helmet: { name: '투구',   desc: '치명 저항' },
  boots:  { name: '신발',   desc: '공격 속도·회피율' },
  belt:   { name: '요대',   desc: '내력 회복·행낭 확장' },
  jade:   { name: '옥패',   desc: '최대 내력·내력 소모 감소' },
  ring:   { name: '가락지', desc: '치명타율·기예 보정' },
  badge:  { name: '신분패', desc: '방치 수련 효율' },
  mount:  { name: '탈것',   desc: '최대 기력' },
};
const SLOT_ORDER = ['weapon', 'armor', 'helmet', 'boots', 'belt', 'jade', 'ring', 'badge', 'mount'];

const STAT_NAMES = {
  atk: '공격력', def: '방어력', maxHp: '최대 활력', maxMp: '최대 내력', spd: '속도', eva: '회피율',
  crit: '치명타율', critRes: '치명 저항', mpRegen: '내력 회복', bag: '행낭 칸', mpCost: '내력 소모 감소',
  craft: '기예 보정', train: '수련 효율', maxSta: '최대 기력', counter: '반격',
};
const PCT_STATS = new Set(['eva', 'crit', 'critRes', 'mpCost', 'craft', 'train', 'counter']);

/* 장비 기본형: slot → tier(1~3) → {name, stats} */
const TIER_ORE = { 1: 'iron', 2: 'blackiron', 3: 'coldiron' };
const EQUIP_BASES = {
  fist:   { slot: 'weapon', wtype: 'fist',   names: ['철권갑', '흑철 권갑', '한철 권갑'],       stats: t => ({ atk: [7, 20, 42][t - 1] }) },
  sword:  { slot: 'weapon', wtype: 'sword',  names: ['철검', '흑철검', '한철검'],               stats: t => ({ atk: [8, 22, 45][t - 1], crit: t }) },
  blade:  { slot: 'weapon', wtype: 'blade',  names: ['박도', '흑철도', '한철 귀두도'],          stats: t => ({ atk: [10, 26, 52][t - 1] }) },
  spear:  { slot: 'weapon', wtype: 'spear',  names: ['철창', '흑철창', '한철 장창'],            stats: t => ({ atk: [9, 24, 48][t - 1], spd: t }) },
  hidden: { slot: 'weapon', wtype: 'hidden', names: ['철비표통', '흑철 비표통', '한철 매화통'], stats: t => ({ atk: [6, 18, 38][t - 1], eva: t * 2 }) },
  armor:  { slot: 'armor',  names: ['가죽 호갑', '흑철 경갑', '한철 어린갑'], stats: t => ({ maxHp: [40, 120, 280][t - 1], def: [4, 12, 25][t - 1] }) },
  helmet: { slot: 'helmet', names: ['가죽 두건', '흑철 투구', '한철 투구'],   stats: t => ({ critRes: [5, 10, 16][t - 1], def: [2, 5, 10][t - 1], counter: [2, 4, 6][t - 1] }) },
  boots:  { slot: 'boots',  names: ['짚신', '흑철 징신', '한철 운혜'],        stats: t => ({ spd: [2, 4, 6][t - 1], eva: [2, 4, 6][t - 1] }) },
  belt:   { slot: 'belt',   names: ['가죽 요대', '흑철 요대', '한철 요대'],   stats: t => ({ mpRegen: [1, 2, 4][t - 1], bag: [5, 10, 15][t - 1] }) },
  jade:   { slot: 'jade',   names: ['청옥패', '흑옥패', '한옥패'],           stats: t => ({ maxMp: [15, 40, 90][t - 1], mpCost: [3, 6, 10][t - 1] }) },
  ring:   { slot: 'ring',   names: ['철 가락지', '흑철 가락지', '한철 가락지'], stats: t => ({ crit: [3, 6, 10][t - 1], craft: [3, 6, 10][t - 1] }) },
};

/* 신분패·탈것 (구매) */
const SHOP_GEAR = [
  { id: 'badge1', slot: 'badge', name: '청풍문 제자패',     rarity: 0, stats: { train: 10 } },
  { id: 'badge2', slot: 'badge', name: '청풍문 정식제자패', rarity: 1, stats: { train: 30 }, cost: 120 },
  { id: 'badge3', slot: 'badge', name: '청풍문 내문제자패', rarity: 2, stats: { train: 60 }, cost: 400 },
  { id: 'mount1', slot: 'mount', name: '늙은 나귀', rarity: 0, stats: { maxSta: 30 },  boss: 'boss1' },
  { id: 'mount2', slot: 'mount', name: '조랑말',   rarity: 1, stats: { maxSta: 70 },  boss: 'boss2' },
  { id: 'mount3', slot: 'mount', name: '청총마',   rarity: 3, stats: { maxSta: 120 }, boss: 'boss3' },
];

/* 제작 고유 옵션 */
const UNIQUES = [
  { key: 'combo',     val: 5, text: '초식 발동률 +5%' },
  { key: 'lifesteal', val: 4, text: '적중 시 활력 흡수 4%' },
  { key: 'atkPct',    val: 8, text: '공격력 +8%' },
  { key: 'hpPct',     val: 8, text: '최대 활력 +8%' },
  { key: 'mpSave',    val: 8, text: '초식 내력 소모 -8%' },
  { key: 'evaFlat',   val: 3, text: '회피율 +3%' },
  { key: 'counter',   val: 6, text: '반격 +6%' },
];

/* 기예 */
const CRAFTS = {
  forge:   { name: '주조', hanja: '鑄造', fail: 'twistedIron', desc: '병기와 장비를 벼린다.' },
  alchemy: { name: '연단', hanja: '煉丹', fail: 'burntAsh',    desc: '돌파단과 영약을 달인다.' },
  cook:    { name: '조리', hanja: '調理', fail: 'dregs',       desc: '기력을 채우는 음식을 만든다.' },
};

/* 레시피 (블라인드). in: {itemId: count} */
const RECIPES = [];
(function buildRecipes() {
  const R = (id, craft, input, out, hint) => RECIPES.push({ id, craft, in: input, out, hint });
  // 연단
  R('a_hp',    'alchemy', { herb: 2 }, 'potionHp', '아린: "사형이 다치면 산약초 두 뿌리를 빻아서 발라주던데? 그냥 그것만!"');
  R('a_mp',    'alchemy', { herb: 1, lingzhi: 1 }, 'potionMp', '아린: "산약초 하나에 영지버섯 하나. 기운이 확 돈대!"');
  R('a_low',   'alchemy', { herb: 2, lingzhi: 1 }, 'pillLow', '노벽송: "하급 돌파단이라… 산약초 둘에 영지 하나. 불은 약하게, 마음은 급하게 먹지 말고."');
  R('a_mid',   'alchemy', { firegrass: 2, lingzhi: 1 }, 'pillMid', '노벽송: "중관문은 불로 뚫는 게야. 화령초 둘, 영지 하나. 산약초는 빼라, 불기운이 흐려진다."');
  R('a_high',  'alchemy', { bloodginseng: 1, lotus: 1, firegrass: 1 }, 'pillHigh', '노벽송: "대관문… 피(혈삼), 물(수련화), 불(화령초). 셋이 서로를 다스려야 한다."');
  R('a_clear', 'alchemy', { lotus: 1, herb: 1 }, 'clearPill', '아린: "수련화에 산약초를 곁들이면 머리가 맑아진대요."');
  R('a_fire',  'alchemy', { firegrass: 1, lingzhi: 2 }, 'fireElixir', '노벽송: "화령초 하나를 영지 둘로 감싸 달이면 내력통이 넓어진다."');
  R('a_blood', 'alchemy', { bloodginseng: 1, herb: 2 }, 'bloodPill', '아린: "혈삼 하나에 산약초 둘! 조운 사형이 옛날에 그렇게 먹었대요."');
  // 조리
  R('c_bap',    'cook', { rice: 1, salt: 1 }, 'jumeokbap', '아린: "쌀에 소금만 쳐도 주먹밥이지!"');
  R('c_rabbit', 'cook', { rabbitMeat: 1, salt: 1 }, 'rabbitRoast', '아린: "토끼고기는 소금만 쳐서 구우면 끝~"');
  R('c_suyuk',  'cook', { boarMeat: 1, water: 1, salt: 1 }, 'boarSuyuk', '아린: "멧돼지고기는 맑은 물에 소금 쳐서 삶아야 누린내가 안 나요."');
  R('c_lingzhi','cook', { rice: 1, wildGreens: 2 }, 'lingzhiBap', '아린: "쌀 하나에 산나물 두 줌! 이거 먹고 수련하면 머리가 팽팽 돌아요."');
  R('c_fire',   'cook', { chili: 1, boarMeat: 1, water: 1 }, 'fireStew', '아린: "산초를 멧돼지고기랑 물에 넣고 끓이면 입에서 불 나요!"');
  R('c_fishr',  'cook', { fish: 1, salt: 1 }, 'fishRoast', '아린: "잉어도 토끼처럼 소금 쳐서 구우면 돼요."');
  R('c_congee', 'cook', { fish: 1, rice: 1, salt: 1 }, 'fishCongee', '아린: "잉어에 쌀이랑 소금 넣고 푹~ 끓이면 어죽!"');
  // 주조: 같은 틀에 쇠만 바꾼다
  const forge = {
    fist:   o => ({ [o]: 1, boarHide: 2 }),
    sword:  o => ({ [o]: 2, wood: 1 }),
    blade:  o => ({ [o]: 2, boarTusk: 1 }),
    spear:  o => ({ [o]: 1, wood: 2 }),
    hidden: o => ({ [o]: 1, dogFang: 2 }),
    armor:  o => ({ [o]: 2, boarHide: 1, rabbitHide: 1 }),
    helmet: o => ({ [o]: 1, rabbitHide: 2 }),
    boots:  o => ({ [o]: 1, rabbitHide: 1, boarHide: 1 }),
    belt:   o => ({ [o]: 1, boarHide: 1 }),
    jade:   o => ({ [o]: 1, jadeStone: 1 }),
    ring:   o => ({ [o]: 1, jadeStone: 2 }),
  };
  const forgeHint = {
    fist:   '조운: "권갑은 쇠 한 덩이에 멧돼지 가죽 두 장을 감으면 된다."',
    sword:  '조운: "검은 쇠 두 덩이를 두드려 펴고, 목재로 자루를 대라."',
    blade:  '조운: "도는 쇠 둘에 멧돼지 엄니로 코등이를 박는다."',
    spear:  '조운: "창은 쇠 하나로 날을 만들고 목재 둘로 긴 자루를 잇지."',
    hidden: '조운: "비표는 쇠 하나에 들개 이빨 두 개를 갈아 촉을 세운다."',
    armor:  '조운: "호갑은 쇠 둘, 멧돼지 가죽 하나, 토끼가죽 하나."',
    helmet: '조운: "두건이든 투구든 쇠 하나에 토끼가죽 둘이면 충분하다."',
    boots:  '조운: "신발은 쇠 하나, 토끼가죽 하나, 멧돼지 가죽 하나."',
    belt:   '조운: "요대는 쇠 하나에 멧돼지 가죽 한 장. 간단하지."',
    jade:   '아린: "옥패는 옥돌 하나에 쇠 하나로 테를 두르면 돼요!"',
    ring:   '아린: "가락지는 옥돌 두 개에 쇠 하나! 예쁘게!"',
  };
  for (const [base, fn] of Object.entries(forge)) {
    for (const t of [1, 2, 3]) {
      const hint = forgeHint[base] + (t > 1 ? ` (쇠를 ${ITEMS[TIER_ORE[t]].name}(으)로 바꾸면 더 좋은 물건이 나온다.)` : '');
      R(`f_${base}_${t}`, 'forge', fn(TIER_ORE[t]), `eq:${base}:${t}`, hint);
    }
  }
})();

/* 적 */
const ENEMIES = {
  rabbit:   { name: '들토끼',     hp: 30,   atk: 5,   def: 0,  spd: 12, eva: 8,  xp: 6,   silver: [1, 3],   drops: [['rabbitMeat', 0.7], ['rabbitHide', 0.6]] },
  dog:      { name: '들개',       hp: 60,   atk: 9,   def: 2,  spd: 11, eva: 5,  xp: 11,  silver: [2, 5],   drops: [['dogFang', 0.65], ['rabbitHide', 0.1]] },
  boar:     { name: '멧돼지',     hp: 140,  atk: 16,  def: 6,  spd: 8,  eva: 2,  xp: 20,  silver: [4, 8],   drops: [['boarMeat', 0.7], ['boarHide', 0.55], ['boarTusk', 0.35]], gear: [1, 0.06] },
  boarKing: { name: '외눈 멧돼지왕', hp: 600, atk: 32, def: 10, spd: 9,  eva: 3,  xp: 70,  silver: [30, 50], drops: [['lingzhi', 1], ['lingzhi', 0.6], ['boarTusk', 1], ['boarHide', 1]], gear: [1, 1], boss: 'boss1' },

  bandit:   { name: '화적 졸개',   hp: 380,  atk: 60,  def: 18, spd: 11, eva: 6,  xp: 38,  silver: [10, 20], drops: [['bandanaSilk', 0.4], ['rice', 0.3], ['salt', 0.3]], gear: [2, 0.05] },
  axeman:   { name: '화적 도부수', hp: 560,  atk: 72,  def: 26, spd: 9,  eva: 3,  xp: 52,  silver: [15, 28], drops: [['bandanaSilk', 0.5], ['boarTusk', 0.3], ['emberStone', 0.2]], gear: [2, 0.07] },
  archer:   { name: '화적 궁수',   hp: 340,  atk: 80,  def: 14, spd: 14, eva: 15, xp: 48,  silver: [14, 26], drops: [['bandanaSilk', 0.4], ['dogFang', 0.4], ['wood', 0.5]], gear: [2, 0.06] },
  jeokyeom: { name: '채주 적염도', hp: 1900, atk: 88,  def: 34, spd: 12, eva: 8,  xp: 220, silver: [150, 220], drops: [['emberStone', 1], ['firegrass', 1], ['lingzhi', 1], ['blackiron', 1]], gear: [2, 1], boss: 'boss2' },

  pirate:   { name: '수적',       hp: 1000, atk: 125, def: 50, spd: 12, eva: 6,  xp: 80,  silver: [30, 50], drops: [['fish', 0.5], ['scale', 0.3], ['salt', 0.3]], gear: [3, 0.05] },
  harpoon:  { name: '수적 작살수', hp: 850,  atk: 145, def: 40, spd: 15, eva: 12, xp: 88,  silver: [32, 55], drops: [['fish', 0.5], ['scale', 0.35], ['wood', 0.4]], gear: [3, 0.06] },
  hyangju:  { name: '적룡방 향주', hp: 1500, atk: 150, def: 62, spd: 13, eva: 8,  xp: 120, silver: [50, 80], drops: [['scale', 0.6], ['bloodginseng', 0.25], ['coldiron', 0.4]], gear: [3, 0.1] },
  galcheon: { name: '방주 갈천',   hp: 5200, atk: 165, def: 80, spd: 14, eva: 10, xp: 500, silver: [500, 700], drops: [['scale', 1], ['bloodginseng', 1], ['lotus', 1], ['coldiron', 1]], gear: [3, 1], boss: 'boss3' },
};

/* 사냥터 지도: 가로 12 × 세로 10. 입장할 때마다 새로 생성한다 (game.js의 generateLayout).
   입구는 좌측 하단, 두목은 우측 상단 끝. 인접(대각 포함)한 노드끼리 연결된다. */
const MAP_W = 12, MAP_H = 10;
const MAP_SPEC = { void: [0.08, 0.12], weak: [6, 8], mid: [3, 4], herb: [3, 5], mine: [3, 5], chest: [1, 2], gimmick: 1 };
const ZONES = {
  cheongpung: {
    name: '청풍산', hanja: '淸風山', tier: 1,
    desc: '청풍문 뒷산. 들토끼와 들개가 뛰놀고, 깊은 곳엔 외눈 멧돼지왕이 산다.',
    enemies: ['rabbit', 'dog', 'boar'], boss: 'boarKing',
    herb: [['herb', 1, 2, 1], ['lingzhi', 1, 1, 0.3], ['wildGreens', 1, 2, 0.5], ['water', 1, 1, 0.4]],
    mine: [['iron', 1, 2, 1], ['jadeStone', 1, 1, 0.15], ['wood', 1, 2, 0.6]],
    chest: [['silver', 20, 40], ['potionHp', 2, 3], ['lingzhi', 1, 2], ['iron', 2, 3]],
    gimmick: { name: '쓰러진 고목', stat: 'atk', need: 22, text: '쓰러진 고목을 내공으로 쪼개자 속에 숨겨진 약초 주머니가 드러났습니다!', reward: [['lingzhi', 1, 2], ['iron', 2, 3], ['silver', 30, 50]], fail: '고목이 꿈쩍도 하지 않습니다. (공격력 22 이상 필요)' },
    unlock: null,
  },
  yeomhwa: {
    name: '염화채', hanja: '炎火寨', tier: 2,
    desc: '화적패의 소굴. 붉은 바위산 곳곳에 불씨가 피어오른다. 채주 적염도가 다스린다.',
    enemies: ['bandit', 'axeman', 'archer'], boss: 'jeokyeom',
    herb: [['firegrass', 1, 2, 1], ['herb', 1, 2, 0.6], ['lingzhi', 1, 1, 0.35], ['chili', 1, 2, 0.5], ['water', 1, 1, 0.3]],
    mine: [['blackiron', 1, 2, 1], ['emberStone', 1, 1, 0.3], ['jadeStone', 1, 1, 0.25], ['wood', 1, 2, 0.4]],
    chest: [['silver', 80, 140], ['potionMp', 2, 3], ['firegrass', 2, 3], ['blackiron', 2, 3]],
    gimmick: { name: '잠긴 목책 기관', stat: 'spd', need: 17, text: '목책 위로 몸을 날려 화적들의 비밀 창고를 털었습니다!', reward: [['emberStone', 1, 2], ['firegrass', 2, 3], ['silver', 80, 120]], fail: '목책을 넘기엔 몸이 무겁습니다. (속도 17 이상 필요)' },
    unlock: { boss: 'boss1', text: '청풍산 두목을 꺾으면 길이 열린다' },
  },
  jeokryong: {
    name: '적룡방', hanja: '赤龍幇', tier: 3,
    desc: '강을 틀어쥔 수적 조직. 방주 갈천은 물 위를 걷는다는 소문이 있다.',
    enemies: ['pirate', 'harpoon', 'hyangju'], boss: 'galcheon',
    herb: [['lotus', 1, 1, 0.8], ['bloodginseng', 1, 1, 0.4], ['herb', 1, 2, 0.5], ['fish', 1, 1, 0.5], ['water', 1, 1, 0.3]],
    mine: [['coldiron', 1, 2, 1], ['jadeStone', 1, 1, 0.3]],
    chest: [['silver', 200, 320], ['clearPill', 1, 2], ['bloodginseng', 1, 1], ['coldiron', 2, 3]],
    gimmick: { name: '수문 기관', stat: 'maxMp', need: 260, text: '내력을 쏟아부어 녹슨 수문을 들어올리자 수적들의 보물이 떠올랐습니다!', reward: [['bloodginseng', 1, 1], ['lotus', 1, 2], ['silver', 150, 220]], fail: '수문이 요지부동입니다. (최대 내력 260 이상 필요)' },
    unlock: { boss: 'boss2', text: '염화채 채주를 꺾으면 길이 열린다' },
  },
};
const ZONE_ORDER = ['cheongpung', 'yeomhwa', 'jeokryong'];

const STAMINA_COST = { battle: 4, herb: 3, mine: 3, chest: 2, gimmick: 5, boss: 12 };

const HIT_TEXT = [
  [0.8, '기혈이 모조리 뒤흔들려 형체조차 유지하기 힘들 만큼 박살이 났습니다!', 'h5'],
  [0.5, '피를 한 움큼 토해내며 바닥에 무릎을 꿇고 비틀거립니다!', 'h4'],
  [0.25, '뼈마디가 삐걱거리며 고통 섞인 비명을 지릅니다!', 'h3'],
  [0.1, '피부를 가르며 붉은 핏물이 배어 나옵니다.', 'h2'],
  [0, '옷깃만 스치며 살짝 긁히는 정도의 상처만 남겼습니다.', 'h1'],
];

/* 조운의 오늘의 보급품: [아이템, 최소, 최대] 중 2~3가지 */
const SUPPLY = [
  ['potionHp', 1, 3], ['potionMp', 1, 2], ['rice', 2, 4], ['salt', 2, 4], ['herb', 2, 4],
  ['wood', 3, 5], ['water', 2, 3], ['wildGreens', 2, 3], ['iron', 2, 3], ['rabbitHide', 2, 3], ['boarHide', 1, 2], ['lingzhi', 1, 1], ['jumeokbap', 1, 2],
];

/* 적 조우 감지 지문 (전투력 비 기준, 높을수록 내가 유리) */
const SENSE_TEXT = [
  [3.0, '하찮은 기척입니다. 눈을 감고도 상대할 수 있을 듯합니다.', 's1'],
  [1.8, '제법 날이 선 기척이지만, 두렵지는 않습니다.', 's2'],
  [1.1, '팽팽한 긴장감이 감돕니다. 방심하면 크게 다칠 것입니다.', 's3'],
  [0.7, '등줄기로 식은땀이 흐릅니다. 목숨을 걸어야 할 상대입니다.', 's4'],
  [0, '숨이 턱 막힐 듯한 강한 위압감이 짓누릅니다!', 's5'],
];
