/* [데이터] 아이템 · 장비 · 재료 · 레시피 — 순수 정적 데이터 (로직 없음) */

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
  roughHide:    { name: '거친 가죽', icon: '🟫', kind: '재료', craftType: 'forge', price: 4, desc: '들개에게서 벗긴 뻣뻣한 가죽.' },
  kingTusk:     { name: '왕의 송곳니', icon: '🦷', kind: '증표', price: 0, desc: '외눈 멧돼지왕의 거대한 송곳니. 청풍산 두목을 쓰러뜨린 증표.' },
  boarHide:     { name: '두꺼운 가죽', icon: '🟤', kind: '재료', craftType: 'forge', price: 5, desc: '두껍고 질긴 가죽.' },
  boarTusk:     { name: '멧돼지 송곳니', icon: '🦴', kind: '재료', craftType: 'forge', price: 6, desc: '휘어진 송곳니. 도(刀)의 코등이로 쓰인다.' },
  bandanaSilk:  { name: '화적 비단',  icon: '🧣', kind: '재료', craftType: 'forge', price: 12, desc: '화적들이 약탈한 붉은 비단.' },
  emberStone:   { name: '불씨석',     icon: '🔴', kind: '재료', craftType: 'forge', price: 15, desc: '열기를 머금은 돌. 염화채 광맥에서 난다.' },
  fish:         { name: '잉어',       icon: '🐟', kind: '재료', craftType: 'cooking', price: 8, desc: '적룡방 강물의 살진 잉어.' },
  scale:        { name: '교룡 비늘',  icon: '🐉', kind: '재료', craftType: 'forge', price: 30, desc: '수적들이 부적처럼 지니고 다니는 비늘.' },
  water:        { name: '맑은 물',   icon: '💧', kind: '재료', craftType: 'cooking', price: 1, desc: '계곡에서 길어 온 찬물.' },
  wildGreens:   { name: '산나물',   icon: '🥬', kind: '재료', craftType: 'cooking', price: 2, desc: '산기슭에서 뜯은 나물.' },
  chili:        { name: '산초',     icon: '🌶️', kind: '재료', craftType: 'cooking', price: 6, desc: '염화채 바위틈의 매운 열매.' },
  rice:         { name: '쌀',         icon: '🍚', kind: '재료', craftType: 'cooking', price: 3, desc: '아린이 몰래 챙겨둔 쌀.' },
  salt:         { name: '소금',       icon: '🧂', kind: '재료', craftType: 'cooking', price: 3, desc: '간을 맞추는 데 필수.' },
  // 조합 실패물 (주조·연단·조리 공통)
  slag:         { name: '검게 탄 찌꺼기', icon: '⚫', kind: '부산물', price: 0, desc: '화로 조합에 실패하면 남는 찌꺼기. 청풍문 › 무신상에 공양하면 무언가로 돌아온다.' },
  // 연단
  pillLow:   { name: '소성 돌파단', icon: '🟢', kind: '영단', price: 40,  desc: '5성 비급을 6성 소성(小成)으로 올릴 때 경험치와 함께 복용한다. (상태 › 무공)' },
  pillMid:   { name: '청심정기단', icon: '🔵', kind: '영단', price: 150, use: { buff: { key: 'train', val: 0.5, dur: 1800, name: '정기 순환' } }, desc: '복용하면 다음 탐험 동안 경험치 획득 +50%.' },
  pillHigh:  { name: '대성 돌파단', icon: '🟣', kind: '영단', price: 500, desc: '11성 비급을 12성 대성(大成)으로 올릴 때 경험치와 함께 복용한다. (상태 › 무공)' },
  potionHp:  { name: '금창약',   icon: '🩹', kind: '영약', price: 8,  use: { hp: 0.4 }, desc: '활력을 40% 회복한다. 탐험 중 활력이 바닥나면 제자가 알아서 먹는다.' },
  potionMp:  { name: '소환단',   icon: '💧', kind: '영약', price: 12, use: { mp: 0.5 }, desc: '내력을 50% 회복한다. 전투 중 사용 가능.' },
  clearPill: { name: '청심단',   icon: '🤍', kind: '영약', price: 60, use: { hp: 1, mp: 1 }, desc: '활력과 내력을 모두 회복한다.' },
  fireElixir:{ name: '화령단',   icon: '♨️', kind: '영약', price: 80, use: { perm: { maxMp: 15 } }, desc: '복용 시 최대 내력이 영구히 15 오른다.' },
  bloodPill: { name: '혈삼환',   icon: '❤️', kind: '영약', price: 120, use: { perm: { maxHp: 40 } }, desc: '복용 시 최대 활력이 영구히 40 오른다.' },
  // 조리
  jumeokbap: { name: '주먹밥',       icon: '🍙', kind: '음식', price: 5,  use: { stamina: 20 }, desc: '다음 탐험 기력 +20 (최대치를 넘어 쌓인다).' },
  rabbitRoast:{ name: '토끼구이',    icon: '🍗', kind: '음식', price: 6,  use: { stamina: 25 }, desc: '다음 탐험 기력 +25 (최대치를 넘어 쌓인다).' },
  boarSuyuk: { name: '멧돼지 수육', icon: '🍲', kind: '음식', price: 20, use: { stamina: 50, buff: { key: 'atk', val: 0.1, dur: 600, name: '수육의 힘' } }, desc: '다음 탐험 기력 +50, 다음 탐험 동안 공격력 +10%.' },
  lingzhiBap:{ name: '산채밥', icon: '🍛', kind: '음식', price: 25, use: { stamina: 40, buff: { key: 'train', val: 0.25, dur: 900, name: '산채밥 기운' } }, desc: '다음 탐험 기력 +40, 다음 탐험 동안 경험치 획득 +25%.' },
  fireStew:  { name: '화룡 전골',   icon: '🥘', kind: '음식', price: 40, use: { stamina: 70, buff: { key: 'atk', val: 0.2, dur: 900, name: '화룡의 열기' } }, desc: '다음 탐험 기력 +70, 다음 탐험 동안 공격력 +20%.' },
  fishRoast: { name: '잉어 구이',   icon: '🍢', kind: '음식', price: 18, use: { stamina: 45 }, desc: '다음 탐험 기력 +45 (최대치를 넘어 쌓인다).' },
  fishCongee:{ name: '잉어 어죽',   icon: '🥣', kind: '음식', price: 50, use: { stamina: 100, buff: { key: 'def', val: 0.2, dur: 900, name: '어죽의 온기' } }, desc: '다음 탐험 기력 +100, 다음 탐험 동안 방어력 +20%.' },
  arinSnack: { name: '아린표 약과', icon: '🍪', kind: '음식', price: 0,  use: { stamina: 40 }, desc: '아린이 몰래 구운 약과. 다음 탐험 기력 +40.' },
  // 증표
  hasanryeong: { name: '낙양성 하산령', icon: '📜', kind: '증표', price: 0, desc: '청풍문 장문인이 내린 하산 허가증. 제2장 낙양성으로 가는 길이 열린다.' },
  // 비급서: 모든 비급마다 '비급' 아이템이 있다. 행낭에서 [ 익히기 ]로 소모하면 습득한 무공 목록에 오른다.
  bk_samjaeGwon: { name: '《삼재권장법》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'samjaeGwon' }, desc: '읽고 익히면 삼재권장법(三才拳掌法)을(를) 운용할 수 있다.' },
  bk_samjaeGeom: { name: '《삼재검법》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'samjaeGeom' }, desc: '읽고 익히면 삼재검법(三才劍法)을(를) 운용할 수 있다.' },
  bk_samjaeDo: { name: '《삼재도법》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'samjaeDo' }, desc: '읽고 익히면 삼재도법(三才刀法)을(를) 운용할 수 있다.' },
  bk_samjaeChang: { name: '《삼재창법》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'samjaeChang' }, desc: '읽고 익히면 삼재창법(三才槍法)을(를) 운용할 수 있다.' },
  bk_samjaePyo: { name: '《삼재표법》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'samjaePyo' }, desc: '읽고 익히면 삼재표법(三才鏢法)을(를) 운용할 수 있다.' },
  bk_tonap: { name: '《토납법》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'tonap' }, desc: '읽고 익히면 토납법(吐納法)을(를) 운용할 수 있다.' },
  bk_pocheolsak: { name: '《포철삭》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'pocheolsak' }, desc: '읽고 익히면 포철삭(抛鐵索)을(를) 운용할 수 있다.' },
  bk_cheolpo: { name: '《철포삼》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'cheolpo' }, desc: '읽고 익히면 철포삼(鐵布衫)을(를) 운용할 수 있다.' },
  bk_yeolhwa: { name: '《열화기공》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'yeolhwa' }, desc: '읽고 익히면 열화기공(烈火氣功)을(를) 운용할 수 있다.' },
  bk_suryu: { name: '《수류기공》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'suryu' }, desc: '읽고 익히면 수류기공(水流氣功)을(를) 운용할 수 있다.' },
  bk_hwangto: { name: '《황토기공》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'hwangto' }, desc: '읽고 익히면 황토기공(黃土氣功)을(를) 운용할 수 있다.' },
  bk_chosangbi: { name: '《초상비》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'chosangbi' }, desc: '읽고 익히면 초상비(草上飛)을(를) 운용할 수 있다.' },
  bk_deungpyeong: { name: '《등평도수》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'deungpyeong' }, desc: '읽고 익히면 등평도수(登萍渡水)을(를) 운용할 수 있다.' },
  bk_cpGwon: { name: '《청풍권》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'cpGwon' }, desc: '읽고 익히면 청풍권(淸風拳)을(를) 운용할 수 있다.' },
  bk_cpGeom: { name: '《청풍검》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'cpGeom' }, desc: '읽고 익히면 청풍검(淸風劍)을(를) 운용할 수 있다.' },
  bk_cpDo: { name: '《청풍도》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'cpDo' }, desc: '읽고 익히면 청풍도(淸風刀)을(를) 운용할 수 있다.' },
  bk_cpChang: { name: '《청풍창》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'cpChang' }, desc: '읽고 익히면 청풍창(淸風槍)을(를) 운용할 수 있다.' },
  bk_cpPyo: { name: '《청풍표》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'cpPyo' }, desc: '읽고 익히면 청풍표(淸風鏢)을(를) 운용할 수 있다.' },
  bk_cpSim: { name: '《청풍심법》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'cpSim' }, desc: '읽고 익히면 청풍심법(淸風心法)을(를) 운용할 수 있다.' },
  bk_cpGyeong: { name: '《청풍경공》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'cpGyeong' }, desc: '읽고 익히면 청풍경공(淸風輕功)을(를) 운용할 수 있다.' },
  bk_cpGi: { name: '《청풍기공》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'cpGi' }, desc: '읽고 익히면 청풍기공(淸風氣功)을(를) 운용할 수 있다.' },
};

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
  badge:  { name: '신분패', desc: '경험치 획득' },
  mount:  { name: '탈것',   desc: '최대 기력' },
};

const SLOT_ORDER = ['weapon', 'armor', 'helmet', 'boots', 'belt', 'jade', 'ring', 'badge', 'mount'];

const STAT_NAMES = {
  atk: '공격력', def: '방어력', maxHp: '최대 활력', maxMp: '최대 내력', spd: '속도', eva: '회피율',
  crit: '치명타율', critRes: '치명 저항', mpRegen: '내력 회복', bag: '행낭 칸', mpCost: '내력 소모 감소',
  craft: '기예 보정', train: '경험치 획득', maxSta: '최대 기력', counter: '반격',
};

const PCT_STATS = new Set(['eva', 'crit', 'critRes', 'mpCost', 'craft', 'train', 'counter']);

/* 장비 기본형: slot → names[tier-1], stats[tier-1] */
const TIER_ORE = { 1: 'iron', 2: 'blackiron', 3: 'coldiron' };

const EQUIP_BASES = {
  fist  : { slot: 'weapon', wtype: 'fist', names: ['철권갑', '흑철 권갑', '한철 권갑'], stats: [{ atk: 7 }, { atk: 20 }, { atk: 42 }] },
  sword : { slot: 'weapon', wtype: 'sword', names: ['철검', '흑철검', '한철검'], stats: [{ atk: 8, crit: 1 }, { atk: 22, crit: 2 }, { atk: 45, crit: 3 }] },
  blade : { slot: 'weapon', wtype: 'blade', names: ['박도', '흑철도', '한철 귀두도'], stats: [{ atk: 10 }, { atk: 26 }, { atk: 52 }] },
  spear : { slot: 'weapon', wtype: 'spear', names: ['철창', '흑철창', '한철 장창'], stats: [{ atk: 9, spd: 1 }, { atk: 24, spd: 2 }, { atk: 48, spd: 3 }] },
  hidden: { slot: 'weapon', wtype: 'hidden', names: ['철비표통', '흑철 비표통', '한철 매화통'], stats: [{ atk: 6, eva: 2 }, { atk: 18, eva: 4 }, { atk: 38, eva: 6 }] },
  armor : { slot: 'armor', names: ['가죽 호갑', '흑철 경갑', '한철 어린갑'], stats: [{ maxHp: 40, def: 4 }, { maxHp: 120, def: 12 }, { maxHp: 280, def: 25 }] },
  helmet: { slot: 'helmet', names: ['가죽 두건', '흑철 투구', '한철 투구'], stats: [{ critRes: 5, def: 2, counter: 2 }, { critRes: 10, def: 5, counter: 4 }, { critRes: 16, def: 10, counter: 6 }] },
  boots : { slot: 'boots', names: ['짚신', '흑철 징신', '한철 운혜'], stats: [{ spd: 2, eva: 2 }, { spd: 4, eva: 4 }, { spd: 6, eva: 6 }] },
  belt  : { slot: 'belt', names: ['가죽 요대', '흑철 요대', '한철 요대'], stats: [{ mpRegen: 1, bag: 5 }, { mpRegen: 2, bag: 10 }, { mpRegen: 4, bag: 15 }] },
  jade  : { slot: 'jade', names: ['청옥패', '흑옥패', '한옥패'], stats: [{ maxMp: 15, mpCost: 3 }, { maxMp: 40, mpCost: 6 }, { maxMp: 90, mpCost: 10 }] },
  ring  : { slot: 'ring', names: ['철 가락지', '흑철 가락지', '한철 가락지'], stats: [{ crit: 3, craft: 3 }, { crit: 6, craft: 6 }, { crit: 10, craft: 10 }] },
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
  forge:   { name: '주조', hanja: '鑄造', fail: 'slag', desc: '병기와 장비를 벼린다.' },
  alchemy: { name: '연단', hanja: '煉丹', fail: 'slag', desc: '돌파단과 영약을 달인다.' },
  cook:    { name: '조리', hanja: '調理', fail: 'slag', desc: '기력을 채우는 음식을 만든다.' },
};

/* 레시피 (블라인드). in: {itemId: count} */
const RECIPES = [
  // 연단
  { id: 'a_hp', craft: 'alchemy', in: { herb: 2 }, out: 'potionHp', hint: '아린: "사형이 다치면 산약초 두 뿌리를 빻아서 발라주던데? 그냥 그것만!"' },
  { id: 'a_mp', craft: 'alchemy', in: { herb: 1, lingzhi: 1 }, out: 'potionMp', hint: '아린: "산약초 하나에 영지버섯 하나. 기운이 확 돈대!"' },
  { id: 'a_low', craft: 'alchemy', in: { herb: 2, lingzhi: 1 }, out: 'pillLow', hint: '노벽송: "소성 돌파단이라… 산약초 둘에 영지 하나. 불은 약하게, 마음은 급하게 먹지 말고."' },
  { id: 'a_mid', craft: 'alchemy', in: { firegrass: 2, lingzhi: 1 }, out: 'pillMid', hint: '노벽송: "정기를 맑히려면 불이 필요하지. 화령초 둘, 영지 하나. 산약초는 빼라, 불기운이 흐려진다."' },
  { id: 'a_high', craft: 'alchemy', in: { bloodginseng: 1, lotus: 1, firegrass: 1 }, out: 'pillHigh', hint: '노벽송: "대성… 피(혈삼), 물(수련화), 불(화령초). 셋이 서로를 다스려야 한다."' },
  { id: 'a_clear', craft: 'alchemy', in: { lotus: 1, herb: 1 }, out: 'clearPill', hint: '아린: "수련화에 산약초를 곁들이면 머리가 맑아진대요."' },
  { id: 'a_fire', craft: 'alchemy', in: { firegrass: 1, lingzhi: 2 }, out: 'fireElixir', hint: '노벽송: "화령초 하나를 영지 둘로 감싸 달이면 내력통이 넓어진다."' },
  { id: 'a_blood', craft: 'alchemy', in: { bloodginseng: 1, herb: 2 }, out: 'bloodPill', hint: '아린: "혈삼 하나에 산약초 둘! 조운 사형이 옛날에 그렇게 먹었대요."' },
  // 조리
  { id: 'c_bap', craft: 'cook', in: { rice: 1, salt: 1 }, out: 'jumeokbap', hint: '아린: "쌀에 소금만 쳐도 주먹밥이지!"' },
  { id: 'c_rabbit', craft: 'cook', in: { rabbitMeat: 1, salt: 1 }, out: 'rabbitRoast', hint: '아린: "토끼고기는 소금만 쳐서 구우면 끝~"' },
  { id: 'c_suyuk', craft: 'cook', in: { boarMeat: 1, water: 1, salt: 1 }, out: 'boarSuyuk', hint: '아린: "멧돼지고기는 맑은 물에 소금 쳐서 삶아야 누린내가 안 나요."' },
  { id: 'c_lingzhi', craft: 'cook', in: { rice: 1, wildGreens: 2 }, out: 'lingzhiBap', hint: '아린: "쌀 하나에 산나물 두 줌! 이거 먹고 수련하면 머리가 팽팽 돌아요."' },
  { id: 'c_fire', craft: 'cook', in: { chili: 1, boarMeat: 1, water: 1 }, out: 'fireStew', hint: '아린: "산초를 멧돼지고기랑 물에 넣고 끓이면 입에서 불 나요!"' },
  { id: 'c_fishr', craft: 'cook', in: { fish: 1, salt: 1 }, out: 'fishRoast', hint: '아린: "잉어도 토끼처럼 소금 쳐서 구우면 돼요."' },
  { id: 'c_congee', craft: 'cook', in: { fish: 1, rice: 1, salt: 1 }, out: 'fishCongee', hint: '아린: "잉어에 쌀이랑 소금 넣고 푹~ 끓이면 어죽!"' },
  // 주조: 같은 틀에 쇠만 바꾼다
  { id: 'f_fist_1', craft: 'forge', in: { iron: 1, boarHide: 2 }, out: 'eq:fist:1', hint: '조운: "권갑은 쇠 한 덩이에 두꺼운 가죽 두 장을 감으면 된다."' },
  { id: 'f_fist_2', craft: 'forge', in: { blackiron: 1, boarHide: 2 }, out: 'eq:fist:2', hint: '조운: "권갑은 쇠 한 덩이에 두꺼운 가죽 두 장을 감으면 된다." (쇠를 흑철(으)로 바꾸면 더 좋은 물건이 나온다.)' },
  { id: 'f_fist_3', craft: 'forge', in: { coldiron: 1, boarHide: 2 }, out: 'eq:fist:3', hint: '조운: "권갑은 쇠 한 덩이에 두꺼운 가죽 두 장을 감으면 된다." (쇠를 한철(으)로 바꾸면 더 좋은 물건이 나온다.)' },
  { id: 'f_sword_1', craft: 'forge', in: { iron: 2, wood: 1 }, out: 'eq:sword:1', hint: '조운: "검은 쇠 두 덩이를 두드려 펴고, 목재로 자루를 대라."' },
  { id: 'f_sword_2', craft: 'forge', in: { blackiron: 2, wood: 1 }, out: 'eq:sword:2', hint: '조운: "검은 쇠 두 덩이를 두드려 펴고, 목재로 자루를 대라." (쇠를 흑철(으)로 바꾸면 더 좋은 물건이 나온다.)' },
  { id: 'f_sword_3', craft: 'forge', in: { coldiron: 2, wood: 1 }, out: 'eq:sword:3', hint: '조운: "검은 쇠 두 덩이를 두드려 펴고, 목재로 자루를 대라." (쇠를 한철(으)로 바꾸면 더 좋은 물건이 나온다.)' },
  { id: 'f_blade_1', craft: 'forge', in: { iron: 2, boarTusk: 1 }, out: 'eq:blade:1', hint: '조운: "도는 쇠 둘에 멧돼지 송곳니로 코등이를 박는다."' },
  { id: 'f_blade_2', craft: 'forge', in: { blackiron: 2, boarTusk: 1 }, out: 'eq:blade:2', hint: '조운: "도는 쇠 둘에 멧돼지 송곳니로 코등이를 박는다." (쇠를 흑철(으)로 바꾸면 더 좋은 물건이 나온다.)' },
  { id: 'f_blade_3', craft: 'forge', in: { coldiron: 2, boarTusk: 1 }, out: 'eq:blade:3', hint: '조운: "도는 쇠 둘에 멧돼지 송곳니로 코등이를 박는다." (쇠를 한철(으)로 바꾸면 더 좋은 물건이 나온다.)' },
  { id: 'f_spear_1', craft: 'forge', in: { iron: 1, wood: 2 }, out: 'eq:spear:1', hint: '조운: "창은 쇠 하나로 날을 만들고 목재 둘로 긴 자루를 잇지."' },
  { id: 'f_spear_2', craft: 'forge', in: { blackiron: 1, wood: 2 }, out: 'eq:spear:2', hint: '조운: "창은 쇠 하나로 날을 만들고 목재 둘로 긴 자루를 잇지." (쇠를 흑철(으)로 바꾸면 더 좋은 물건이 나온다.)' },
  { id: 'f_spear_3', craft: 'forge', in: { coldiron: 1, wood: 2 }, out: 'eq:spear:3', hint: '조운: "창은 쇠 하나로 날을 만들고 목재 둘로 긴 자루를 잇지." (쇠를 한철(으)로 바꾸면 더 좋은 물건이 나온다.)' },
  { id: 'f_hidden_1', craft: 'forge', in: { iron: 1, dogFang: 2 }, out: 'eq:hidden:1', hint: '조운: "비표는 쇠 하나에 들개 이빨 두 개를 갈아 촉을 세운다."' },
  { id: 'f_hidden_2', craft: 'forge', in: { blackiron: 1, dogFang: 2 }, out: 'eq:hidden:2', hint: '조운: "비표는 쇠 하나에 들개 이빨 두 개를 갈아 촉을 세운다." (쇠를 흑철(으)로 바꾸면 더 좋은 물건이 나온다.)' },
  { id: 'f_hidden_3', craft: 'forge', in: { coldiron: 1, dogFang: 2 }, out: 'eq:hidden:3', hint: '조운: "비표는 쇠 하나에 들개 이빨 두 개를 갈아 촉을 세운다." (쇠를 한철(으)로 바꾸면 더 좋은 물건이 나온다.)' },
  { id: 'f_armor_1', craft: 'forge', in: { iron: 2, boarHide: 1, rabbitHide: 1 }, out: 'eq:armor:1', hint: '조운: "호갑은 쇠 둘, 두꺼운 가죽 하나, 토끼가죽 하나."' },
  { id: 'f_armor_2', craft: 'forge', in: { blackiron: 2, boarHide: 1, rabbitHide: 1 }, out: 'eq:armor:2', hint: '조운: "호갑은 쇠 둘, 두꺼운 가죽 하나, 토끼가죽 하나." (쇠를 흑철(으)로 바꾸면 더 좋은 물건이 나온다.)' },
  { id: 'f_armor_3', craft: 'forge', in: { coldiron: 2, boarHide: 1, rabbitHide: 1 }, out: 'eq:armor:3', hint: '조운: "호갑은 쇠 둘, 두꺼운 가죽 하나, 토끼가죽 하나." (쇠를 한철(으)로 바꾸면 더 좋은 물건이 나온다.)' },
  { id: 'f_helmet_1', craft: 'forge', in: { iron: 1, rabbitHide: 2 }, out: 'eq:helmet:1', hint: '조운: "두건이든 투구든 쇠 하나에 토끼가죽 둘이면 충분하다."' },
  { id: 'f_helmet_2', craft: 'forge', in: { blackiron: 1, rabbitHide: 2 }, out: 'eq:helmet:2', hint: '조운: "두건이든 투구든 쇠 하나에 토끼가죽 둘이면 충분하다." (쇠를 흑철(으)로 바꾸면 더 좋은 물건이 나온다.)' },
  { id: 'f_helmet_3', craft: 'forge', in: { coldiron: 1, rabbitHide: 2 }, out: 'eq:helmet:3', hint: '조운: "두건이든 투구든 쇠 하나에 토끼가죽 둘이면 충분하다." (쇠를 한철(으)로 바꾸면 더 좋은 물건이 나온다.)' },
  { id: 'f_boots_1', craft: 'forge', in: { iron: 1, roughHide: 1, boarHide: 1 }, out: 'eq:boots:1', hint: '조운: "신발은 쇠 하나, 거친 가죽 하나, 두꺼운 가죽 하나."' },
  { id: 'f_boots_2', craft: 'forge', in: { blackiron: 1, roughHide: 1, boarHide: 1 }, out: 'eq:boots:2', hint: '조운: "신발은 쇠 하나, 거친 가죽 하나, 두꺼운 가죽 하나." (쇠를 흑철(으)로 바꾸면 더 좋은 물건이 나온다.)' },
  { id: 'f_boots_3', craft: 'forge', in: { coldiron: 1, roughHide: 1, boarHide: 1 }, out: 'eq:boots:3', hint: '조운: "신발은 쇠 하나, 거친 가죽 하나, 두꺼운 가죽 하나." (쇠를 한철(으)로 바꾸면 더 좋은 물건이 나온다.)' },
  { id: 'f_belt_1', craft: 'forge', in: { iron: 1, boarHide: 1 }, out: 'eq:belt:1', hint: '조운: "요대는 쇠 하나에 두꺼운 가죽 한 장. 간단하지."' },
  { id: 'f_belt_2', craft: 'forge', in: { blackiron: 1, boarHide: 1 }, out: 'eq:belt:2', hint: '조운: "요대는 쇠 하나에 두꺼운 가죽 한 장. 간단하지." (쇠를 흑철(으)로 바꾸면 더 좋은 물건이 나온다.)' },
  { id: 'f_belt_3', craft: 'forge', in: { coldiron: 1, boarHide: 1 }, out: 'eq:belt:3', hint: '조운: "요대는 쇠 하나에 두꺼운 가죽 한 장. 간단하지." (쇠를 한철(으)로 바꾸면 더 좋은 물건이 나온다.)' },
  { id: 'f_jade_1', craft: 'forge', in: { iron: 1, jadeStone: 1 }, out: 'eq:jade:1', hint: '아린: "옥패는 옥돌 하나에 쇠 하나로 테를 두르면 돼요!"' },
  { id: 'f_jade_2', craft: 'forge', in: { blackiron: 1, jadeStone: 1 }, out: 'eq:jade:2', hint: '아린: "옥패는 옥돌 하나에 쇠 하나로 테를 두르면 돼요!" (쇠를 흑철(으)로 바꾸면 더 좋은 물건이 나온다.)' },
  { id: 'f_jade_3', craft: 'forge', in: { coldiron: 1, jadeStone: 1 }, out: 'eq:jade:3', hint: '아린: "옥패는 옥돌 하나에 쇠 하나로 테를 두르면 돼요!" (쇠를 한철(으)로 바꾸면 더 좋은 물건이 나온다.)' },
  { id: 'f_ring_1', craft: 'forge', in: { iron: 1, jadeStone: 2 }, out: 'eq:ring:1', hint: '아린: "가락지는 옥돌 두 개에 쇠 하나! 예쁘게!"' },
  { id: 'f_ring_2', craft: 'forge', in: { blackiron: 1, jadeStone: 2 }, out: 'eq:ring:2', hint: '아린: "가락지는 옥돌 두 개에 쇠 하나! 예쁘게!" (쇠를 흑철(으)로 바꾸면 더 좋은 물건이 나온다.)' },
  { id: 'f_ring_3', craft: 'forge', in: { coldiron: 1, jadeStone: 2 }, out: 'eq:ring:3', hint: '아린: "가락지는 옥돌 두 개에 쇠 하나! 예쁘게!" (쇠를 한철(으)로 바꾸면 더 좋은 물건이 나온다.)' },
];

/* 기예 ↔ 재료 분류 */
const CRAFT_TYPE = { forge: 'forge', alchemy: 'alchemy', cook: 'cooking' };

/* 보조 기예 (캐릭터 생성 때 하나): craft의 솜씨가 lv부터 시작하고 고유 효과가 붙는다 */
const TALENTS = {
  gather: { name: '채집', hanja: '採集', desc: '요수의 재료를 떨굴 확률 +15%p · 금고 재료 +1', drop: 0.15, vault: 1 },
  smelt:  { name: '제련', hanja: '製鍊', desc: '주조 솜씨 3단계로 시작 · 주조 성공률 +5%', craft: 'forge', lv: 3, rate: 5 },
  medic:  { name: '의술', hanja: '醫術', desc: '연단 솜씨 3단계로 시작 · 금창약 회복량 +30%', craft: 'alchemy', lv: 3, potion: 0.3 },
  chef:   { name: '조리', hanja: '調理', desc: '조리 솜씨 3단계로 시작 · 음식 기력 +25%', craft: 'cook', lv: 3, food: 0.25 },
};

/* 무신상 공양 (가챠): 검게 탄 찌꺼기 cost개를 바칠 때마다 표에서 하나. 기대값은 일부러 낮다 (조합 실패를 노리지 않도록).
   pool: [아이템, 최소, 최대] · gear: 열린 구역의 최고 티어 장비 · book: 아직 없는 공양 비급 */
const GACHA = {
  cost: 3, multi: 10,
  table: [
    { k: 'herb',   w: 36, name: '약재',   pool: [['herb', 2, 3], ['lingzhi', 1, 2], ['firegrass', 1, 2], ['wildGreens', 2, 3]] },
    { k: 'supply', w: 32, name: '소모품', pool: [['potionHp', 1, 2], ['potionMp', 1, 1], ['jumeokbap', 1, 2], ['arinSnack', 1, 1]] },
    { k: 'ore',    w: 16, name: '광석',   pool: [['iron', 2, 3], ['blackiron', 1, 1], ['jadeStone', 1, 1]] },
    { k: 'gear',   w: 9,  name: '장비' },
    { k: 'pill',   w: 4,  name: '영단',   pool: [['pillLow', 1, 1], ['clearPill', 1, 1]] },
    { k: 'book',   w: 3,  name: '비급' },
  ],
  books: ['yeolhwa', 'suryu', 'hwangto', 'chosangbi', 'deungpyeong', 'samjaeGwon', 'samjaeGeom', 'samjaeDo', 'samjaeChang', 'samjaePyo'],
};

/* 화로 한 번에 넣을 수 있는 재료 수 · 연구 노트에 남기는 시도 수 */
const POT_MAX = 10;
const CRAFT_NOTE_MAX = 80;

/* 장비 강화: +1마다 기본 능력치 10% 상승, 최대 +10. 실패해도 등급은 떨어지지 않고 은자만 사라진다. */
/* 장비 강화 한도 (+10) */
const ENH_MAX = 10;
