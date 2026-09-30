/* [데이터] 아이템 · 장비 · 재료 · 단약 · 공양표 — 순수 정적 데이터 (로직 없음). 조합식은 recipes.js */

/* 아이템 */
const ITEMS = {
  // 돌파단 재료 (금고 약재 궤 · 두목)
  herb:         { name: '산약초',     icon: '🌿', kind: '재료', craftType: 'alchemy', price: 2, desc: '청풍산 어디서나 자라는 흔한 약초.' },
  lingzhi:      { name: '영지버섯',   icon: '🍄', kind: '재료', craftType: 'alchemy', price: 8, desc: '고목 그늘에서 드물게 자라는 버섯. 약성이 깊다.' },
  firegrass:    { name: '화령초',     icon: '🔥', kind: '재료', craftType: 'alchemy', price: 10, desc: '염화채 바위틈의 붉은 풀. 만지면 손끝이 뜨겁다.' },
  bloodginseng: { name: '혈삼',       icon: '🥕', kind: '재료', craftType: 'alchemy', price: 30, desc: '핏빛 뿌리를 가진 삼. 수룡방 습지에서 난다.' },
  lotus:        { name: '수련화',     icon: '🪷', kind: '재료', craftType: 'alchemy', price: 25, desc: '수룡방 수면에 피는 흰 꽃. 마음을 맑게 한다.' },
  // 청풍산 드랍 재료
  wildGinseng:  { name: '야생 삼채',     icon: '🌱', kind: '재료', craftType: 'alchemy', price: 4,  desc: '청풍산 비탈에서 자라는 들삼. 기운을 북돋는다.' },
  blackwood:    { name: '단단한 흑목',   icon: '🪵', kind: '재료', craftType: 'forge',   price: 4,  desc: '쇠처럼 단단한 검은 나무. 자루감으로 으뜸이다.' },
  boarMolar:    { name: '멧돼지 어금니', icon: '🦷', kind: '재료', craftType: 'forge',   price: 5,  desc: '사나운 멧돼지의 굵은 어금니. 갈면 날이 선다.' },
  wildcatHide:  { name: '살쾡이 가죽',   icon: '🟫', kind: '재료', craftType: 'forge',   price: 5,  desc: '얇지만 질긴 가죽.' },
  treeSap:      { name: '청령목 수액',   icon: '💧', kind: '재료', craftType: 'alchemy', price: 6,  desc: '청령목괴의 몸에서 흐르는 푸른 수액. 맑은 기운이 돈다.' },
  roughOre:     { name: '거친 철광석',   icon: '🪨', kind: '재료', craftType: 'forge',   price: 3,  desc: '청풍산에서 캔 거친 쇠돌.' },
  // 염화채 드랍 재료
  redStone:     { name: '적염석',         icon: '🔴', kind: '재료', craftType: 'forge',   price: 12, desc: '열기를 머금은 붉은 돌. 염화채 협곡에서 난다.' },
  scorpionSac:  { name: '화염 전갈 독낭', icon: '🦂', kind: '재료', craftType: 'alchemy', price: 14, desc: '뜨거운 독이 든 주머니. 약으로도 독으로도 쓴다.' },
  wolfSinew:    { name: '늑대 힘줄',       icon: '🧵', kind: '재료', craftType: 'forge',   price: 10, desc: '적토 늑대의 질긴 힘줄. 끈과 활시위로 쓴다.' },
  bladeShard:   { name: '염화 대도 파편', icon: '🗡️', kind: '재료', craftType: 'forge',   price: 14, desc: '부러진 대도의 조각. 불기운이 배어 있다.' },
  redClay:      { name: '적토 점토',       icon: '🟤', kind: '재료', craftType: 'alchemy', price: 8,  desc: '붉은 협곡의 끈끈한 흙. 약재를 뭉치는 데 쓴다.' },
  blackIngot:   { name: '정련된 흑철괴',   icon: '⬛', kind: '재료', craftType: 'forge',   price: 18, desc: '불순물을 걷어 낸 흑철 덩이.' },
  // 수룡방 드랍 재료
  silverOre:    { name: '수로 백은광',     icon: '🥈', kind: '재료', craftType: 'forge',   price: 25, desc: '수로 바닥에서 건진 흰 광석.' },
  crocHide:     { name: '악어 비늘 가죽',  icon: '🐊', kind: '재료', craftType: 'forge',   price: 28, desc: '뻘밭 흑악어의 두껍고 딱딱한 가죽.' },
  silentReed:   { name: '침묵의 수초',     icon: '🌾', kind: '재료', craftType: 'alchemy', price: 18, desc: '바람이 불어도 소리가 나지 않는 수초. 마음을 가라앉힌다.' },
  dragonScale:  { name: '교룡 유체 비늘',  icon: '🐉', kind: '재료', craftType: 'forge',   price: 40, desc: '어린 교룡의 비늘. 가볍고 단단하다.' },
  centipedeLeg: { name: '독지네 다리',     icon: '🦗', kind: '재료', craftType: 'alchemy', price: 20, desc: '소택지 독지네의 다리. 독을 다스리는 약이 된다.' },
  mistDew:      { name: '물안개 이슬',     icon: '💦', kind: '재료', craftType: 'alchemy', price: 22, desc: '새벽 호수 물안개에서 모은 이슬.' },
  kingTusk:     { name: '왕의 송곳니', icon: '🦷', kind: '증표', price: 0, desc: '옛 청풍산 두목 외눈 멧돼지왕의 거대한 송곳니. 지난 토벌의 증표.' },
  // 조합 실패물 (단조·단약 공통)
  slag:         { name: '검게 탄 찌꺼기', icon: '⚫', kind: '부산물', price: 0, desc: '화로 조합에 실패하면 남는 찌꺼기. 청풍문 › 무신상에 공양하면 무언가로 돌아온다.' },
  // 돌파단 (영단)
  pillLow:   { name: '소성 돌파단', icon: '🟢', kind: '영단', price: 40,  desc: '5성 비급을 6성 소성(小成)으로 올릴 때 경험치와 함께 복용한다. (상태 › 무공)' },
  pillHigh:  { name: '대성 돌파단', icon: '🟣', kind: '영단', price: 500, desc: '11성 비급을 12성 대성(大成)으로 올릴 때 경험치와 함께 복용한다. (상태 › 무공)' },
  // 8품(八品) 단약: 회복은 즉시, 증강은 다음 원정 동안 (탐험 중 위급하면 생혈고·소환단은 제자가 알아서 먹는다)
  potionMp:   { name: '소환단', hanja: '小還丹', icon: '💧', kind: '단약', grade: '8품', price: 20, use: { mp: 0.4 }, desc: '급격히 손상된 내력을 즉시 40% 회복시키는 기본 영약.' },
  saenghyeol: { name: '생혈고', hanja: '生血膏', icon: '🩸', kind: '단약', grade: '8품', price: 24, use: { hp: 0.5 }, desc: '깊은 상처를 아물게 하여 활력을 즉시 50% 회복시키는 고약. 탐험 중 활력이 바닥나면 제자가 알아서 바른다.' },
  golgye:     { name: '골계단', hanja: '骨啓丹', icon: '🦴', kind: '단약', grade: '8품', price: 40, use: { buff: { key: 'defFlat', val: 15, name: '골계단' } }, desc: '뼈와 근육을 강화하여 다음 원정 동안 방어력 +15.' },
  tongmaek:   { name: '통맥환', hanja: '通脈丸', icon: '🔆', kind: '단약', grade: '8품', price: 50, use: { buff: { key: 'qiDmg', val: 0.15, name: '통맥환' } }, desc: '굳어진 경락을 뚫어 다음 원정 동안 초식(기공) 피해 +15%.' },
  haedok:     { name: '해독산', hanja: '解毒散', icon: '🧪', kind: '단약', grade: '8품', price: 30, use: { buff: { key: 'antidote', val: 30, name: '해독산' } }, desc: '독충과 사파의 독기를 정화한다. 다음 원정에서 30합 동안 중독되지 않는다.' },
  clearPill:  { name: '청심단', hanja: '淸心丹', icon: '🤍', kind: '단약', grade: '8품', price: 45, use: { buff: { key: 'critGuard', val: 10, name: '청심단' } }, desc: '심신을 가라앉혀 다음 원정 동안 치명타를 맞을 확률 -10%.' },
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
  bk_paseok: { name: '《파석권》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'paseok' }, desc: '읽고 익히면 파석권(破石拳)을(를) 운용할 수 있다.' },
  bk_swaegol: { name: '《쇄골장》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'swaegol' }, desc: '읽고 익히면 쇄골장(碎骨掌)을(를) 운용할 수 있다.' },
  bk_yeonhwan: { name: '《연환통배권》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'yeonhwan' }, desc: '읽고 익히면 연환통배권(連環通背拳)을(를) 운용할 수 있다.' },
  bk_cpGeombeop: { name: '《청풍검법》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'cpGeombeop' }, desc: '읽고 익히면 청풍검법(淸風劍法)을(를) 운용할 수 있다.' },
  bk_nakyeop: { name: '《낙엽검법》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'nakyeop' }, desc: '읽고 익히면 낙엽검법(落葉劍法)을(를) 운용할 수 있다.' },
  bk_chupung: { name: '《추풍검》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'chupung' }, desc: '읽고 익히면 추풍검(追風劍)을(를) 운용할 수 있다.' },
  bk_ohodanmun: { name: '《오호단문도》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'ohodanmun' }, desc: '읽고 익히면 오호단문도(五虎斷門刀)을(를) 운용할 수 있다.' },
  bk_byeokryeok: { name: '《벽력도법》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'byeokryeok' }, desc: '읽고 익히면 벽력도법(霹靂刀法)을(를) 운용할 수 있다.' },
  bk_dansu: { name: '《단수도》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'dansu' }, desc: '읽고 익히면 단수도(斷水刀)을(를) 운용할 수 있다.' },
  bk_yukhap: { name: '《육합창법》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'yukhap' }, desc: '읽고 익히면 육합창법(六合槍法)을(를) 운용할 수 있다.' },
  bk_cheolgi: { name: '《철기창》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'cheolgi' }, desc: '읽고 익히면 철기창(鐵騎槍)을(를) 운용할 수 있다.' },
  bk_pungun: { name: '《풍운점혈창》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'pungun' }, desc: '읽고 익히면 풍운점혈창(風雲點穴槍)을(를) 운용할 수 있다.' },
  bk_biyeon: { name: '《비연표》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'biyeon' }, desc: '읽고 익히면 비연표(飛燕鏢)을(를) 운용할 수 있다.' },
  bk_sanhwa: { name: '《산화철질려》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'sanhwa' }, desc: '읽고 익히면 산화철질려(散花鐵蒺藜)을(를) 운용할 수 있다.' },
  bk_tugol: { name: '《투골정》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'tugol' }, desc: '읽고 익히면 투골정(透骨釘)을(를) 운용할 수 있다.' },
  bk_chosangbi: { name: '《초상비》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'chosangbi' }, desc: '읽고 익히면 초상비(草上飛)을(를) 운용할 수 있다.' },
  bk_dapsu: { name: '《답수보》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'dapsu' }, desc: '읽고 익히면 답수보(踏水步)을(를) 운용할 수 있다.' },
  bk_jihaeng: { name: '《지행보》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'jihaeng' }, desc: '읽고 익히면 지행보(地行步)을(를) 운용할 수 있다.' },
  bk_deungsu: { name: '《등수보》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'deungsu' }, desc: '읽고 익히면 등수보(登樹步)을(를) 운용할 수 있다.' },
  bk_mijong: { name: '《미종보》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'mijong' }, desc: '읽고 익히면 미종보(迷蹤步)을(를) 운용할 수 있다.' },
  bk_mokryeong: { name: '《목령진기》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'mokryeong' }, desc: '읽고 익히면 목령진기(木靈眞氣)을(를) 운용할 수 있다.' },
  bk_byeokhwa: { name: '《벽화공》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'byeokhwa' }, desc: '읽고 익히면 벽화공(碧火功)을(를) 운용할 수 있다.' },
  bk_huto: { name: '《후토공》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'huto' }, desc: '읽고 익히면 후토공(厚土功)을(를) 운용할 수 있다.' },
  bk_baekgeum: { name: '《백금결》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'baekgeum' }, desc: '읽고 익히면 백금결(白金訣)을(를) 운용할 수 있다.' },
  bk_yusu: { name: '《유수심법》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'yusu' }, desc: '읽고 익히면 유수심법(流水心法)을(를) 운용할 수 있다.' },
  bk_cpGwon: { name: '《청풍권》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'cpGwon' }, desc: '읽고 익히면 청풍권(淸風拳)을(를) 운용할 수 있다.' },
  bk_cpGeom: { name: '《청풍검》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'cpGeom' }, desc: '읽고 익히면 청풍검(淸風劍)을(를) 운용할 수 있다.' },
  bk_cpDo: { name: '《청풍도》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'cpDo' }, desc: '읽고 익히면 청풍도(淸風刀)을(를) 운용할 수 있다.' },
  bk_cpChang: { name: '《청풍창》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'cpChang' }, desc: '읽고 익히면 청풍창(淸風槍)을(를) 운용할 수 있다.' },
  bk_cpPyo: { name: '《청풍표》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'cpPyo' }, desc: '읽고 익히면 청풍표(淸風鏢)을(를) 운용할 수 있다.' },
  bk_cpSim: { name: '《청풍심법》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'cpSim' }, desc: '읽고 익히면 청풍심법(淸風心法)을(를) 운용할 수 있다.' },
  bk_cpGyeong: { name: '《청풍경공》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'cpGyeong' }, desc: '읽고 익히면 청풍경공(淸風輕功)을(를) 운용할 수 있다.' },
  bk_cpGi: { name: '《청풍기공》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'cpGi' }, desc: '읽고 익히면 청풍기공(淸風氣功)을(를) 운용할 수 있다.' },
};

/* 장비 등급: 하급 < 중급 < 상급 < 진품 < 명품 < 극품 (능력치 배율) */
const RARITY = [
  { name: '하급', hanja: '下級', mult: 1.0,  cls: 'r0' },
  { name: '중급', hanja: '中級', mult: 1.2,  cls: 'r1' },
  { name: '상급', hanja: '上級', mult: 1.45, cls: 'r2' },
  { name: '진품', hanja: '眞品', mult: 1.75, cls: 'r3' },
  { name: '명품', hanja: '名品', mult: 2.1,  cls: 'r4' },
  { name: '극품', hanja: '極品', mult: 2.5,  cls: 'r5' },
];

/* 장비 슬롯 */
const SLOTS = {
  weapon: { name: '무기',   desc: '5대 병기' },
  armor:  { name: '호갑',   desc: '활력·방어력' },
  helmet: { name: '투구',   desc: '치명 저항' },
  boots:  { name: '신발',   desc: '공격 속도·회피율' },
  belt:   { name: '허리띠', desc: '적재량·활력 보정' },
  jade:   { name: '옥대',   desc: '기공 위력·단전(내력) 보정' },
  ring:   { name: '가락지', desc: '내력·특수 보정' },
  badge:  { name: '신분패', desc: '경험치 획득' },
  mount:  { name: '탈것',   desc: '최대 기력' },
};

const SLOT_ORDER = ['weapon', 'armor', 'helmet', 'boots', 'belt', 'jade', 'ring', 'badge', 'mount'];

const STAT_NAMES = {
  atk: '공격력', def: '방어력', maxHp: '최대 활력', maxMp: '최대 내력', spd: '속도', eva: '회피율',
  crit: '치명타율', critRes: '치명 저항', mpRegen: '내력 회복', bag: '행낭 칸', mpCost: '내력 소모 감소',
  craft: '기예 보정', train: '경험치 획득', maxSta: '최대 기력', counter: '반격', combo: '초식 발동률',
  staSave: '기력 소모 감소', breathe: '승리 후 활력 회복', qiPct: '기공 위력', elemRes: '오행 내성', bleed: '출혈 확률', pierce: '관통력', acc: '명중',
};

const PCT_STATS = new Set(['eva', 'crit', 'critRes', 'mpCost', 'craft', 'train', 'counter', 'combo', 'staSave', 'breathe', 'qiPct', 'elemRes', 'bleed', 'acc']);

/* 장비 기본형: slot → names[tier-1], stats[tier-1] */

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
  jade  : { slot: 'jade', names: ['청옥대', '흑옥대', '한옥대'], stats: [{ maxMp: 15, mpCost: 3 }, { maxMp: 40, mpCost: 6 }, { maxMp: 90, mpCost: 10 }] },
  ring  : { slot: 'ring', names: ['철 가락지', '흑철 가락지', '한철 가락지'], stats: [{ crit: 3, craft: 3 }, { crit: 6, craft: 6 }, { crit: 10, craft: 10 }] },
};

/* 하급 장비 37종 (이름 있는 장비, 등급 하급 고정). 청풍산 드랍 · 무신상 공양 · 금고 · 전방에서 나온다.
   staSave: 탐험 기력 소모 -% · breathe: 승리 후 숨 고르기 활력 +%p · qiPct: 장착 기공 능력치 +% · elemRes: 오행 극당할 때 받는 피해 -%p */
const GEAR_DB = {
  // 권장
  g_bandage:   { slot: 'weapon', wtype: 'fist',   name: '무명 붕대',       stats: { atk: 4, spd: 1 },          desc: '주먹에 칭칭 감은 무명천. 손등 까지는 것만 막아 준다.' },
  g_hideTosu:  { slot: 'weapon', wtype: 'fist',   name: '거친 가죽 토수',   stats: { atk: 6, def: 1 },          desc: '팔뚝까지 덮는 거친 가죽 토시.' },
  g_studFist:  { slot: 'weapon', wtype: 'fist',   name: '무쇠 징 권갑',     stats: { atk: 8 },                  desc: '손마디마다 무쇠 징을 박은 권갑. 투박하지만 아프다.' },
  g_woodFist:  { slot: 'weapon', wtype: 'fist',   name: '목인갑',           stats: { atk: 6, counter: 2 },      desc: '목인장 수련용으로 나무를 덧댄 권갑. 받아치기 좋다.' },
  g_copperGlove:{ slot: 'weapon', wtype: 'fist',  name: '동선 장갑',        stats: { atk: 7, crit: 1 },         desc: '구리실을 촘촘히 엮은 장갑.' },
  // 검
  g_rustySword:{ slot: 'weapon', wtype: 'sword',  name: '녹슨 연습검',      stats: { atk: 5 },                  desc: '청풍문 연무장 구석에 굴러다니던 연습검.' },
  g_dullSword: { slot: 'weapon', wtype: 'sword',  name: '날 무딘 철검',     stats: { atk: 7 },                  desc: '날이 무뎌 베기보다 두드리기에 가깝다.' },
  g_bronzeRapier:{ slot: 'weapon', wtype: 'sword', name: '청동 세검',       stats: { atk: 7, crit: 2 },         desc: '가늘고 가벼운 청동 검. 찌르기에 좋다.' },
  g_mapleSword:{ slot: 'weapon', wtype: 'sword',  name: '단풍목 목검',      stats: { atk: 5, eva: 2 },          desc: '단풍나무를 깎은 목검. 가벼워 몸놀림이 산다.' },
  g_straightSword:{ slot: 'weapon', wtype: 'sword', name: '직도형 박검',    stats: { atk: 9, crit: 1 },         desc: '곧고 얇은 외날 검.' },
  // 도
  g_chippedBlade:{ slot: 'weapon', wtype: 'blade', name: '이가 빠진 마도',  stats: { atk: 7 },                  desc: '말 탄 병사가 쓰던 도. 날 곳곳이 이가 빠졌다.' },
  g_ironSaber: { slot: 'weapon', wtype: 'blade',  name: '무쇠 낭도',        stats: { atk: 9 },                  desc: '무쇠를 두드려 만든 두툼한 낭도.' },
  g_blackSaber:{ slot: 'weapon', wtype: 'blade',  name: '흑철 박도',        stats: { atk: 11 },                 desc: '흑철을 섞어 무겁고 단단한 박도.' },
  g_axeBlade:  { slot: 'weapon', wtype: 'blade',  name: '벌목용 벌채도',    stats: { atk: 10, crit: 1 },        desc: '나무 베던 벌채도. 한 번 박히면 깊다.' },
  g_shortBlade:{ slot: 'weapon', wtype: 'blade',  name: '두정 단도',        stats: { atk: 8, spd: 1 },          desc: '짧고 날렵한 단도. 칼끝이 둥글다.' },
  // 창
  g_bambooSpear:{ slot: 'weapon', wtype: 'spear', name: '대나무 죽창',      stats: { atk: 6, spd: 1 },          desc: '대나무 끝을 비스듬히 깎은 죽창.' },
  g_flailSpear:{ slot: 'weapon', wtype: 'spear',  name: '녹슨 편곤창',      stats: { atk: 8 },                  desc: '자루 끝에 쇠사슬이 달린 녹슨 창.' },
  g_waxSpear:  { slot: 'weapon', wtype: 'spear',  name: '백랍목 장창',      stats: { atk: 8, spd: 1, eva: 1 },  desc: '잘 휘는 백랍목 자루의 장창.' },
  g_needleSpear:{ slot: 'weapon', wtype: 'spear', name: '철침 단창',        stats: { atk: 9, crit: 1 },         desc: '바늘처럼 가는 쇠촉을 단 짧은 창.' },
  g_trident:   { slot: 'weapon', wtype: 'spear',  name: '사냥용 삼지창',    stats: { atk: 10 },                 desc: '멧돼지 사냥에 쓰던 세 갈래 창.' },
  // 암기
  g_dullStar:  { slot: 'weapon', wtype: 'hidden', name: '무딘 철표창',      stats: { atk: 5, eva: 1 },          desc: '끝이 무딘 쇠 표창 몇 자루.' },
  g_pebbles:   { slot: 'weapon', wtype: 'hidden', name: '자갈 주머니',      stats: { atk: 4, eva: 2 },          desc: '냇가에서 골라 담은 동글동글한 자갈.' },
  g_rustyKnife:{ slot: 'weapon', wtype: 'hidden', name: '녹슨 비도',        stats: { atk: 6, eva: 1 },          desc: '던지는 칼. 녹이 슬어 날이 무디다.' },
  g_caltrops:  { slot: 'weapon', wtype: 'hidden', name: '조잡한 철질려',    stats: { atk: 6, crit: 1 },         desc: '대충 벼린 쇠마름쇠 한 줌.' },
  g_woodNeedle:{ slot: 'weapon', wtype: 'hidden', name: '목제 비연침',      stats: { atk: 5, eva: 3 },          desc: '나무를 깎아 만든 가벼운 침.' },
  // 방어구
  g_hempRobe:  { slot: 'armor', name: '해진 삼베 도포',      stats: { maxHp: 15, def: 1 },            desc: '기본 의복. 겨우 살갗을 가린다.' },
  g_hunterCoat:{ slot: 'armor', name: '질긴 사냥꾼 가죽옷',  stats: { maxHp: 35, def: 4 },            desc: '짐승 가죽을 겹쳐 지은 겉옷. 물리 공격에 강하다.' },
  g_cpRobe:    { slot: 'armor', name: '청풍문 규격 도포',    stats: { maxHp: 30, def: 3, maxMp: 8 },  desc: '청풍문 수련생의 기본 도포. 단전을 편하게 한다.' },
  // 가락지
  g_ironRing:  { slot: 'ring', name: '무쇠 가락지',  stats: { atk: 2 },      desc: '단단하게 두드려 만든 쇠반지.' },
  g_hornRing:  { slot: 'ring', name: '흑각 가락지',  stats: { staSave: 2 },  desc: '흑우 뿔을 깎아 만든 반지. 발걸음이 가볍다.' },
  g_bronzeRing:{ slot: 'ring', name: '청동 가락지',  stats: { maxMp: 8 },    desc: '조잡한 구리 반지. 내력이 조금 더 고인다.' },
  // 허리띠
  g_hempBelt:  { slot: 'belt', name: '거친 삼베 허리띠',   stats: { bag: 4 },          desc: '매듭으로 묶는 기본 허리띠.' },
  g_leatherBelt:{ slot: 'belt', name: '무두질한 가죽 요대', stats: { def: 3, bag: 6 },  desc: '질긴 소가죽 끈.' },
  g_silkBelt:  { slot: 'belt', name: '흑사 편직 요대',     stats: { breathe: 2 },      desc: '검은 비단실을 꼬아 만든 요대. 숨이 빨리 돌아온다.' },
  // 옥대
  g_dullJade:  { slot: 'jade', name: '탁한 청옥대',   stats: { qiPct: 3 },   desc: '빛이 바랜 청옥 조각을 박은 띠. 기공이 조금 더 잘 돈다.' },
  g_whiteJade: { slot: 'jade', name: '투박한 백옥대', stats: { maxMp: 15 },  desc: '조각이 거친 백옥 장식 띠.' },
  g_cloudJade: { slot: 'jade', name: '운문 연옥대',   stats: { elemRes: 5 }, desc: '구름 무늬가 새겨진 연옥 띠. 상극의 기운을 조금 누그러뜨린다.' },
};
/* 입문 무공(병기)별 첫 무기 · 첫 옷 */
const STARTER_GEAR = { fist: 'g_hideTosu', sword: 'g_dullSword', blade: 'g_ironSaber', spear: 'g_flailSpear', hidden: 'g_rustyKnife', armor: 'g_hempRobe' };

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

/* 화로 기예: 단조(장비) · 단약(영약). 실패하면 재료가 전소되고 검게 탄 찌꺼기 1개 */
const CRAFTS = {
  forge:   { name: '단조', hanja: '鍛造', fail: 'slag', desc: '재료를 달구고 두드려 병기·방어구·장신구를 벼린다.' },
  alchemy: { name: '단약', hanja: '丹藥', fail: 'slag', desc: '약재와 요수의 독낭·수액을 달여 단약을 빚는다.' },
};

/* 단조 전용 중급 장비 9종 (이류급 · 등급 중급 고정). 비밀 조합식은 recipes.js
   bleed: 적중 시 출혈 확률(%) · pierce: 관통력(적 방어 무시) · acc: 명중 보정(%p) */
const CRAFT_GEAR = {
  c_fist:   { slot: 'weapon', wtype: 'fist',   name: '흑철 권갑',     hanja: '黑鐵拳匣',   stats: { atk: 22, def: 8 },            desc: '흑철을 겹겹이 두드려 만든 권갑. 막고 치기에 모두 좋다.' },
  c_sword:  { slot: 'weapon', wtype: 'sword',  name: '청강검',        hanja: '靑鋼劍',     stats: { atk: 28, crit: 3 },           desc: '푸른빛이 도는 강철 검. 날이 쉽게 무뎌지지 않는다.' },
  c_blade:  { slot: 'weapon', wtype: 'blade',  name: '혈문도',        hanja: '血紋刀',     stats: { atk: 32, bleed: 20 },         desc: '핏빛 무늬가 새겨진 도. 베인 상처가 쉬이 아물지 않는다 (출혈).' },
  c_spear:  { slot: 'weapon', wtype: 'spear',  name: '벽파 삼지창',   hanja: '碧波三枝槍', stats: { atk: 30, pierce: 5 },         desc: '물결을 가르는 세 갈래 창. 갑옷 틈을 꿰뚫는다 (관통).' },
  c_hidden: { slot: 'weapon', wtype: 'hidden', name: '칠성 투골정',   hanja: '七星透骨釘', stats: { atk: 25, spd: 2, acc: 8 },    desc: '북두칠성처럼 흩어져 날아가는 일곱 개의 쇠못.' },
  c_armor:  { slot: 'armor',                   name: '청강 사슬갑',   hanja: '靑鋼鎖子甲', stats: { def: 24, maxHp: 80 },         desc: '청강 고리를 촘촘히 엮은 사슬갑.' },
  c_ring:   { slot: 'ring',                    name: '벽옥환',        hanja: '碧玉環',     stats: { maxMp: 40, atk: 5 },          desc: '짙푸른 옥으로 깎은 고리. 단전에 기운이 고인다.' },
  c_belt:   { slot: 'belt',                    name: '웅모 포대',     hanja: '熊毛布帶',   stats: { def: 10, bag: 20 },           desc: '곰털을 덧댄 두툼한 허리띠. 짐을 잔뜩 걸 수 있다.' },
  c_jade:   { slot: 'jade',                    name: '수정 영옥대',   hanja: '水晶靈玉帶', stats: { qiPct: 6, elemRes: 5 },       desc: '수정과 영옥을 박은 띠. 기공이 맑게 돌고 상극의 기운을 누그러뜨린다.' },
};

/* 보조 기예 (캐릭터 생성 때 하나): craft의 솜씨가 lv부터 시작하고 고유 효과가 붙는다 */
const TALENTS = {
  gather: { name: '채집', hanja: '採集', desc: '요수의 재료를 떨굴 확률 +15%p · 금고 재료 +1', drop: 0.15, vault: 1 },
  smelt:  { name: '제련', hanja: '製鍊', desc: '단조 솜씨 3단계로 시작 · 단조 성공률 +5%', craft: 'forge', lv: 3, rate: 5 },
  medic:  { name: '의술', hanja: '醫術', desc: '단약 솜씨 3단계로 시작 · 생혈고 회복량 +30%', craft: 'alchemy', lv: 3, potion: 0.3 },
};

/* 무신상 공양 (가챠): 검게 탄 찌꺼기 cost개를 바칠 때마다 표에서 하나. 기대값은 일부러 낮다 (조합 실패를 노리지 않도록).
   pool: [아이템, 최소, 최대] · gear: 열린 구역의 최고 티어 장비 · book: 아직 없는 공양 비급 */
const GACHA = {
  cost: 3, multi: 10,
  table: [
    { k: 'herb',   w: 36, name: '약재',   pool: [['herb', 2, 3], ['lingzhi', 1, 2], ['wildGinseng', 2, 3], ['treeSap', 1, 2]] },
    { k: 'supply', w: 32, name: '단약',   pool: [['saenghyeol', 1, 1], ['potionMp', 1, 1], ['golgye', 1, 1], ['haedok', 1, 1], ['clearPill', 1, 1]] },
    { k: 'ore',    w: 16, name: '광석',   pool: [['roughOre', 2, 3], ['blackwood', 1, 2], ['blackIngot', 1, 1]] },
    { k: 'gear',   w: 9,  name: '장비' },
    { k: 'pill',   w: 4,  name: '돌파단', pool: [['pillLow', 1, 1]] },
    { k: 'book',   w: 3,  name: '비급' },
  ],
  books: ['paseok', 'swaegol', 'yeonhwan', 'cpGeombeop', 'nakyeop', 'chupung', 'ohodanmun', 'byeokryeok', 'dansu', 'yukhap', 'cheolgi', 'pungun', 'biyeon', 'sanhwa', 'tugol',
          'chosangbi', 'dapsu', 'jihaeng', 'deungsu', 'mijong', 'mokryeong', 'byeokhwa', 'huto', 'baekgeum', 'yusu', 'samjaeGwon', 'samjaeGeom', 'samjaeDo', 'samjaeChang', 'samjaePyo'],
};

/* 화로 한 번에 넣을 수 있는 재료 수 · 연구 노트에 남기는 시도 수 */
const POT_MAX = 10;
const CRAFT_NOTE_MAX = 80;

/* 장비 강화: +1마다 기본 능력치 10% 상승, 최대 +10. 실패해도 등급은 떨어지지 않고 은자만 사라진다. */
/* 장비 강화 한도 (+10) */
const ENH_MAX = 10;
