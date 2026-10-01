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
  viperScale:   { name: '독사 비늘',     icon: '🐍', kind: '재료', craftType: 'forge',   price: 6,  desc: '흑비단독사의 검은 비늘. 얇지만 칼날이 미끄러진다.' },
  viperSac:     { name: '독사 독낭',     icon: '🟢', kind: '재료', craftType: 'forge',   price: 8,  desc: '흑비단독사의 독주머니. 암기 끝에 바르면 상처가 곪는다.' },
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
  // 조합 실패물 (단조·연단 공통)
  slag:         { name: '검게 탄 찌꺼기', icon: '⚫', kind: '부산물', price: 0, desc: '화로 조합에 실패하면 남는 찌꺼기. 청풍문 › 무신상에 공양하면 무언가로 돌아온다.' },
  // 돌파단 (영단)
  pillLow:   { name: '소성 돌파단', icon: '🟢', kind: '영단', price: 40,  desc: '5성 비급을 6성 소성(小成)으로 올릴 때 수련치와 함께 복용한다. (상태 › 무공)' },
  pillHigh:  { name: '대성 돌파단', icon: '🟣', kind: '영단', price: 500, desc: '11성 비급을 12성 대성(大成)으로 올릴 때 수련치와 함께 복용한다. (상태 › 무공)' },
  // 8품(八品) 단약: 회복은 즉시, 증강은 다음 원정 동안 (탐험 중 위급하면 생혈고·소환단은 제자가 알아서 먹는다)
  potionMp:   { name: '소환단', hanja: '小還丹', icon: '💧', kind: '단약', grade: '8품', price: 20, use: { mp: 0.4 }, desc: '급격히 손상된 내력을 즉시 40% 회복시키는 기본 영약.' },
  saenghyeol: { name: '생혈고', hanja: '生血膏', icon: '🩸', kind: '단약', grade: '8품', price: 5, use: { hp: 0.5 }, desc: '깊은 상처를 아물게 하여 활력을 즉시 50% 회복시키는 고약. 탐험 중 활력이 바닥나면 제자가 알아서 바른다.' },
  gigeokdan:  { name: '기력단', hanja: '氣力丹', icon: '💨', kind: '단약', grade: '8품', price: 50, use: { sta: 1 }, desc: '숨이 턱까지 찬 몸에 기운을 불어넣는 환약. 먹으면 기력이 가득 차고 곧바로 다시 달린다.' },
  golgye:     { name: '골계단', hanja: '骨啓丹', icon: '🦴', kind: '단약', grade: '8품', price: 40, use: { buff: { key: 'defFlat', val: 15, name: '골계단' } }, desc: '뼈와 근육을 강화하여 다음 원정 동안 방어력 +15.' },
  tongmaek:   { name: '통맥환', hanja: '通脈丸', icon: '🔆', kind: '단약', grade: '8품', price: 50, use: { buff: { key: 'qiDmg', val: 0.15, name: '통맥환' } }, desc: '굳어진 경락을 뚫어 다음 원정 동안 초식(기공) 피해 +15%.' },
  haedok:     { name: '해독산', hanja: '解毒散', icon: '🧪', kind: '단약', grade: '8품', price: 30, use: { buff: { key: 'antidote', val: 30, name: '해독산' } }, desc: '독충과 사파의 독기를 정화한다. 다음 원정에서 30합 동안 중독되지 않는다.' },
  clearPill:  { name: '청심단', hanja: '淸心丹', icon: '🤍', kind: '단약', grade: '8품', price: 45, use: { buff: { key: 'critGuard', val: 10, name: '청심단' } }, desc: '심신을 가라앉혀 다음 원정 동안 치명타를 맞을 확률 -10%.' },
  // 증표
  hasanryeong: { name: '낙양성 하산령', icon: '📜', kind: '증표', price: 0, desc: '청풍문 장문인이 내린 하산 허가증. 제2장 낙양성으로 가는 길이 열린다.' },
  // 비급서: 모든 비급마다 '비급' 아이템이 있다. 행낭에서 [ 익히기 ]로 소모하면 습득한 무공 목록에 오른다.
  bk_samjaeGwon: { name: '《삼재권》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'samjaeGwon' }, desc: '읽고 익히면 삼재권(三才拳)을(를) 운용할 수 있다.' },
  bk_samjaeGeom: { name: '《삼재검법》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'samjaeGeom' }, desc: '읽고 익히면 삼재검법(三才劍法)을(를) 운용할 수 있다.' },
  bk_samjaeDo: { name: '《삼재도법》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'samjaeDo' }, desc: '읽고 익히면 삼재도법(三才刀法)을(를) 운용할 수 있다.' },
  bk_samjaeChang: { name: '《삼재창법》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'samjaeChang' }, desc: '읽고 익히면 삼재창법(三才槍法)을(를) 운용할 수 있다.' },
  bk_samjaePyo: { name: '《삼재표법》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'samjaePyo' }, desc: '읽고 익히면 삼재표법(三才鏢法)을(를) 운용할 수 있다.' },
  bk_tonap: { name: '《토납법》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'tonap' }, desc: '읽고 익히면 토납법(吐納法)을(를) 운용할 수 있다.' },
  bk_pocheolsak: { name: '《팔보간섬》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'pocheolsak' }, desc: '읽고 익히면 팔보간섬(八步趕蟾)을(를) 운용할 수 있다.' },
  bk_cheolpo: { name: '《철포삼》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'cheolpo' }, desc: '읽고 익히면 철포삼(鐵布衫)을(를) 운용할 수 있다.' },
  bk_paseok: { name: '《나한권》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'paseok' }, desc: '읽고 익히면 나한권(羅漢拳)을(를) 운용할 수 있다.' },
  bk_swaegol: { name: '《분근착골수》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'swaegol' }, desc: '읽고 익히면 분근착골수(分筋錯骨手)을(를) 운용할 수 있다.' },
  bk_yeonhwan: { name: '《통배권》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'yeonhwan' }, desc: '읽고 익히면 통배권(通背拳)을(를) 운용할 수 있다.' },
  bk_cpGeombeop: { name: '《청풍검법》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'cpGeombeop' }, desc: '읽고 익히면 청풍검법(淸風劍法)을(를) 운용할 수 있다.' },
  bk_nakyeop: { name: '《낙영검법》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'nakyeop' }, desc: '읽고 익히면 낙영검법(落英劍法)을(를) 운용할 수 있다.' },
  bk_chupung: { name: '《추풍쾌검》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'chupung' }, desc: '읽고 익히면 추풍쾌검(追風快劍)을(를) 운용할 수 있다.' },
  bk_ohodanmun: { name: '《오호단문도》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'ohodanmun' }, desc: '읽고 익히면 오호단문도(五虎斷門刀)을(를) 운용할 수 있다.' },
  bk_byeokryeok: { name: '《벽력도법》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'byeokryeok' }, desc: '읽고 익히면 벽력도법(霹靂刀法)을(를) 운용할 수 있다.' },
  bk_dansu: { name: '《추도단수》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'dansu' }, desc: '읽고 익히면 추도단수(抽刀斷水)을(를) 운용할 수 있다.' },
  bk_yukhap: { name: '《육합창법》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'yukhap' }, desc: '읽고 익히면 육합창법(六合槍法)을(를) 운용할 수 있다.' },
  bk_cheolgi: { name: '《양가창법》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'cheolgi' }, desc: '읽고 익히면 양가창법(楊家槍法)을(를) 운용할 수 있다.' },
  bk_pungun: { name: '《이화창》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'pungun' }, desc: '읽고 익히면 이화창(梨花槍)을(를) 운용할 수 있다.' },
  bk_biyeon: { name: '《비연표》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'biyeon' }, desc: '읽고 익히면 비연표(飛燕鏢)을(를) 운용할 수 있다.' },
  bk_sanhwa: { name: '《산화철질려》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'sanhwa' }, desc: '읽고 익히면 산화철질려(散花鐵蒺藜)을(를) 운용할 수 있다.' },
  bk_tugol: { name: '《투골정》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'tugol' }, desc: '읽고 익히면 투골정(透骨釘)을(를) 운용할 수 있다.' },
  bk_chosangbi: { name: '《초상비》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'chosangbi' }, desc: '읽고 익히면 초상비(草上飛)을(를) 운용할 수 있다.' },
  bk_dapsu: { name: '《등평도수》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'dapsu' }, desc: '읽고 익히면 등평도수(登萍渡水)을(를) 운용할 수 있다.' },
  bk_jihaeng: { name: '《지당보》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'jihaeng' }, desc: '읽고 익히면 지당보(地堂步)을(를) 운용할 수 있다.' },
  bk_deungsu: { name: '《제운종》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'deungsu' }, desc: '읽고 익히면 제운종(梯雲縱)을(를) 운용할 수 있다.' },
  bk_mijong: { name: '《미종보》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'mijong' }, desc: '읽고 익히면 미종보(迷蹤步)을(를) 운용할 수 있다.' },
  bk_mokryeong: { name: '《청목공》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'mokryeong' }, desc: '읽고 익히면 청목공(靑木功)을(를) 운용할 수 있다.' },
  bk_byeokhwa: { name: '《열양공》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'byeokhwa' }, desc: '읽고 익히면 열양공(烈陽功)을(를) 운용할 수 있다.' },
  bk_huto: { name: '《후토공》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'huto' }, desc: '읽고 익히면 후토공(厚土功)을(를) 운용할 수 있다.' },
  bk_baekgeum: { name: '《금종조》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'baekgeum' }, desc: '읽고 익히면 금종조(金鐘罩)을(를) 운용할 수 있다.' },
  bk_yusu: { name: '《현수공》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'yusu' }, desc: '읽고 익히면 현수공(玄水功)을(를) 운용할 수 있다.' },
  bk_cpGwon: { name: '《청풍유운권》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'cpGwon' }, desc: '읽고 익히면 청풍유운권(淸風流雲拳)을(를) 운용할 수 있다.' },
  bk_cpGeom: { name: '《청풍유수검》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'cpGeom' }, desc: '읽고 익히면 청풍유수검(淸風流水劍)을(를) 운용할 수 있다.' },
  bk_cpDo: { name: '《청풍벽력도법》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'cpDo' }, desc: '읽고 익히면 청풍벽력도법(淸風霹靂刀法)을(를) 운용할 수 있다.' },
  bk_cpChang: { name: '《청풍선풍창법》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'cpChang' }, desc: '읽고 익히면 청풍선풍창법(淸風旋風槍法)을(를) 운용할 수 있다.' },
  bk_cpPyo: { name: '《청풍추영표》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'cpPyo' }, desc: '읽고 익히면 청풍추영표(淸風追影鏢)을(를) 운용할 수 있다.' },
  bk_cpSim: { name: '《청풍심법》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'cpSim' }, desc: '읽고 익히면 청풍심법(淸風心法)을(를) 운용할 수 있다.' },
  bk_cpGyeong: { name: '《청풍보》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'cpGyeong' }, desc: '읽고 익히면 청풍보(淸風步)을(를) 운용할 수 있다.' },
  bk_cpGi: { name: '《청풍신공》 비급', icon: '📘', kind: '비급', price: 0, use: { learn: 'cpGi' }, desc: '읽고 익히면 청풍신공(淸風神功)을(를) 운용할 수 있다.' },
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
  belt:   { name: '요대',   desc: '적재량·활력 보정' },
  jade:   { name: '옥대',   desc: '기공 위력·단전(내력) 보정' },
  ring:   { name: '가락지', desc: '내력·특수 보정' },
  ring2:  { name: '가락지', desc: '내력·특수 보정 (두 번째 손)' },
  badge:  { name: '신분패', desc: '수련치 획득' },
  mount:  { name: '탈것',   desc: '최대 기력' },
};

const SLOT_ORDER = ['weapon', 'armor', 'helmet', 'boots', 'belt', 'jade', 'ring', 'ring2', 'badge', 'mount'];
/* 장착 칸이 받는 장비 부위 (가락지는 두 손에 하나씩) */
const SLOT_ACCEPTS = { ring2: 'ring' };

const STAT_NAMES = {
  atk: '공격력', def: '방어력', maxHp: '최대 활력', maxMp: '최대 내력', spd: '속도', eva: '회피율',
  crit: '치명타율', critRes: '치명 저항', mpRegen: '내력 회복', bag: '행낭 칸', mpCost: '내력 소모 감소',
  craft: '기예 보정', train: '수련치 획득', maxSta: '최대 기력', counter: '반격', combo: '초식 발동률',
  staSave: '기력 소모 감소', breathe: '승리 후 활력 회복', qiPct: '기공 위력', elemRes: '오행 내성', bleed: '출혈 확률', pierce: '관통력', acc: '명중',
  shock: '충격 확률', first: '선공', mpRegenPct: '내력 회복률', armorPen: '방어 무시', elem: '오행 위력',
  str: '근력', con: '체력', agi: '민첩', int: '지력',
};

const PCT_STATS = new Set(['eva', 'crit', 'critRes', 'mpCost', 'craft', 'train', 'counter', 'combo', 'staSave', 'breathe', 'qiPct', 'elemRes', 'bleed', 'acc', 'shock', 'mpRegenPct', 'armorPen', 'elem']);

/* 장비 기본형: slot → names[tier-1], stats[tier-1] */

/* 이름은 고전 무협의 병장기 이름을 따른다 (수투 · 호수 · 지환 · 운혜 · 피갑 · 어린갑 · 환도 · 귀두도 · 점강창 · 유엽표 · 매화침 등) */
const EQUIP_BASES = {
  fist  : { slot: 'weapon', wtype: 'fist', names: ['철수투', '흑철 수투', '한철 수투'], stats: [{ atk: 12 }, { atk: 20 }, { atk: 42 }] },
  sword : { slot: 'weapon', wtype: 'sword', names: ['철검', '흑철검', '한철 보검'], stats: [{ atk: 13, crit: 1 }, { atk: 22, crit: 2 }, { atk: 45, crit: 3 }] },
  blade : { slot: 'weapon', wtype: 'blade', names: ['박도', '흑철 환도', '한철 귀두도'], stats: [{ atk: 14 }, { atk: 26 }, { atk: 52 }] },
  spear : { slot: 'weapon', wtype: 'spear', names: ['점강창', '흑철 장창', '한철 대창'], stats: [{ atk: 14, spd: 1 }, { atk: 24, spd: 2 }, { atk: 48, spd: 3 }] },
  hidden: { slot: 'weapon', wtype: 'hidden', names: ['유엽표', '흑철 비표', '한철 매화침'], stats: [{ atk: 11, eva: 2 }, { atk: 18, eva: 4 }, { atk: 38, eva: 6 }] },
  armor : { slot: 'armor', names: ['피갑', '흑철 경갑', '한철 어린갑'], stats: [{ maxHp: 40, def: 5 }, { maxHp: 120, def: 12 }, { maxHp: 280, def: 25 }] },
  helmet: { slot: 'helmet', names: ['방건', '흑철 두회', '한철 투구'], stats: [{ critRes: 5, def: 3, counter: 2 }, { critRes: 10, def: 5, counter: 4 }, { critRes: 16, def: 10, counter: 6 }] },
  boots : { slot: 'boots', names: ['짚신', '흑철 전혜', '한철 운혜'], stats: [{ spd: 2, eva: 2 }, { spd: 4, eva: 4 }, { spd: 6, eva: 6 }] },
  belt  : { slot: 'belt', names: ['가죽 요대', '흑철 요대', '한철 요대'], stats: [{ mpRegen: 1, bag: 5 }, { mpRegen: 2, bag: 10 }, { mpRegen: 4, bag: 15 }] },
  jade  : { slot: 'jade', names: ['청옥대', '흑옥대', '한옥대'], stats: [{ maxMp: 15, mpCost: 3 }, { maxMp: 40, mpCost: 6 }, { maxMp: 90, mpCost: 10 }] },
  ring  : { slot: 'ring', names: ['철지환', '흑철 지환', '한철 지환'], stats: [{ crit: 3, craft: 3 }, { crit: 6, craft: 6 }, { crit: 10, craft: 10 }] },
};

/* 하급 장비 37종 (이름 있는 장비, 등급 하급 고정). 청풍산 드랍 · 무신상 공양 · 금고 · 전방에서 나온다.
   staSave: 탐험 기력 소모 -% · breathe: 승리 후 숨 고르기 활력 +%p · qiPct: 장착 기공 능력치 +% · elemRes: 오행 극당할 때 받는 피해 -%p */
const GEAR_DB = {
  // 권장
  g_bandage:   { slot: 'weapon', wtype: 'fist',   name: '무명 박수포',       stats: { atk: 10, spd: 1 },          desc: '주먹에 칭칭 감은 무명천. 손등 까지는 것만 막아 준다.' },
  g_hideTosu:  { slot: 'weapon', wtype: 'fist',   name: '가죽 호완',   stats: { atk: 11, def: 1 },          desc: '팔뚝까지 덮는 거친 가죽 토시.' },
  g_studFist:  { slot: 'weapon', wtype: 'fist',   name: '징 박은 철수투',     stats: { atk: 13 },                  desc: '손마디마다 무쇠 징을 박은 권갑. 투박하지만 아프다.' },
  g_woodFist:  { slot: 'weapon', wtype: 'fist',   name: '목인장 수투',           stats: { atk: 11, counter: 2 },      desc: '목인장 수련용으로 나무를 덧댄 권갑. 받아치기 좋다.' },
  g_copperGlove:{ slot: 'weapon', wtype: 'fist',  name: '동사 수투',        stats: { atk: 12, crit: 1 },         desc: '구리실을 촘촘히 엮은 장갑.' },
  // 검
  g_rustySword:{ slot: 'weapon', wtype: 'sword',  name: '녹슨 수련검',      stats: { atk: 11 },                  desc: '청풍문 연무장 구석에 굴러다니던 연습검.' },
  g_dullSword: { slot: 'weapon', wtype: 'sword',  name: '날 무딘 철검',     stats: { atk: 12 },                  desc: '날이 무뎌 베기보다 두드리기에 가깝다.' },
  g_bronzeRapier:{ slot: 'weapon', wtype: 'sword', name: '청동 세검',       stats: { atk: 12, crit: 2 },         desc: '가늘고 가벼운 청동 검. 찌르기에 좋다.' },
  g_mapleSword:{ slot: 'weapon', wtype: 'sword',  name: '도목검',      stats: { atk: 11, eva: 2 },          desc: '단풍나무를 깎은 목검. 가벼워 몸놀림이 산다.' },
  g_straightSword:{ slot: 'weapon', wtype: 'sword', name: '협봉검',    stats: { atk: 14, crit: 1 },         desc: '곧고 얇은 외날 검.' },
  // 도
  g_chippedBlade:{ slot: 'weapon', wtype: 'blade', name: '이 빠진 마도',  stats: { atk: 12 },                  desc: '말 탄 병사가 쓰던 도. 날 곳곳이 이가 빠졌다.' },
  g_ironSaber: { slot: 'weapon', wtype: 'blade',  name: '무쇠 안령도',        stats: { atk: 14 },                  desc: '무쇠를 두드려 만든 두툼한 낭도.' },
  g_blackSaber:{ slot: 'weapon', wtype: 'blade',  name: '흑철 박도',        stats: { atk: 15 },                 desc: '흑철을 섞어 무겁고 단단한 박도.' },
  g_axeBlade:  { slot: 'weapon', wtype: 'blade',  name: '산채 벌도',    stats: { atk: 14, crit: 1 },        desc: '나무 베던 벌채도. 한 번 박히면 깊다.' },
  g_shortBlade:{ slot: 'weapon', wtype: 'blade',  name: '요도',        stats: { atk: 13, spd: 1 },          desc: '짧고 날렵한 단도. 칼끝이 둥글다.' },
  // 창
  g_bambooSpear:{ slot: 'weapon', wtype: 'spear', name: '대나무 죽창',      stats: { atk: 11, spd: 1 },          desc: '대나무 끝을 비스듬히 깎은 죽창.' },
  g_flailSpear:{ slot: 'weapon', wtype: 'spear',  name: '녹슨 구겸창',      stats: { atk: 13 },                  desc: '자루 끝에 쇠사슬이 달린 녹슨 창.' },
  g_waxSpear:  { slot: 'weapon', wtype: 'spear',  name: '백랍목 장창',      stats: { atk: 13, spd: 1, eva: 1 },  desc: '잘 휘는 백랍목 자루의 장창.' },
  g_needleSpear:{ slot: 'weapon', wtype: 'spear', name: '점강 단창',        stats: { atk: 14, crit: 1 },         desc: '바늘처럼 가는 쇠촉을 단 짧은 창.' },
  g_trident:   { slot: 'weapon', wtype: 'spear',  name: '사냥꾼 삼고차',    stats: { atk: 14 },                 desc: '멧돼지 사냥에 쓰던 세 갈래 창.' },
  // 암기
  g_dullStar:  { slot: 'weapon', wtype: 'hidden', name: '무딘 유엽표',      stats: { atk: 11, eva: 1 },          desc: '끝이 무딘 쇠 표창 몇 자루.' },
  g_pebbles:   { slot: 'weapon', wtype: 'hidden', name: '비황석 주머니',      stats: { atk: 10, eva: 2 },          desc: '냇가에서 골라 담은 동글동글한 자갈.' },
  g_rustyKnife:{ slot: 'weapon', wtype: 'hidden', name: '녹슨 비도',        stats: { atk: 11, eva: 1 },          desc: '던지는 칼. 녹이 슬어 날이 무디다.' },
  g_caltrops:  { slot: 'weapon', wtype: 'hidden', name: '거친 철질려',    stats: { atk: 11, crit: 1 },         desc: '대충 벼린 쇠마름쇠 한 줌.' },
  g_woodNeedle:{ slot: 'weapon', wtype: 'hidden', name: '목제 매화침',      stats: { atk: 11, eva: 3 },          desc: '나무를 깎아 만든 가벼운 침.' },
  // 방어구
  g_hempRobe:  { slot: 'armor', name: '해진 삼베 도포',      stats: { maxHp: 15, def: 3 },            desc: '기본 의복. 겨우 살갗을 가린다.' },
  g_hunterCoat:{ slot: 'armor', name: '사냥꾼 피의',  stats: { maxHp: 35, def: 5 },            desc: '짐승 가죽을 겹쳐 지은 겉옷. 물리 공격에 강하다.' },
  g_cpRobe:    { slot: 'armor', name: '청풍문 수련 도포',    stats: { maxHp: 30, def: 4, maxMp: 8 },  desc: '청풍문 수련생의 기본 도포. 단전을 편하게 한다.' },
  // 가락지
  g_ironRing:  { slot: 'ring', name: '무쇠 지환',  stats: { atk: 2 },      desc: '단단하게 두드려 만든 쇠반지.' },
  g_hornRing:  { slot: 'ring', name: '흑각 지환',  stats: { staSave: 2 },  desc: '흑우 뿔을 깎아 만든 반지. 발걸음이 가볍다.' },
  g_bronzeRing:{ slot: 'ring', name: '청동 지환',  stats: { maxMp: 8 },    desc: '조잡한 구리 반지. 내력이 조금 더 고인다.' },
  // 요대
  g_hempBelt:  { slot: 'belt', name: '삼베 요대',   stats: { bag: 4 },          desc: '매듭으로 묶는 기본 허리띠.' },
  g_leatherBelt:{ slot: 'belt', name: '우피 요대', stats: { def: 3, bag: 6 },  desc: '질긴 소가죽 끈.' },
  g_silkBelt:  { slot: 'belt', name: '흑사 요대',     stats: { breathe: 2 },      desc: '검은 비단실을 꼬아 만든 요대. 숨이 빨리 돌아온다.' },
  // 옥대
  g_dullJade:  { slot: 'jade', name: '탁한 청옥대',   stats: { qiPct: 3 },   desc: '빛이 바랜 청옥 조각을 박은 띠. 기공이 조금 더 잘 돈다.' },
  g_whiteJade: { slot: 'jade', name: '백옥대', stats: { maxMp: 15 },  desc: '조각이 거친 백옥 장식 띠.' },
  g_cloudJade: { slot: 'jade', name: '운문 옥대',   stats: { elemRes: 5 }, desc: '구름 무늬가 새겨진 연옥 띠. 상극의 기운을 조금 누그러뜨린다.' },
};
/* 입문 무공(병기)별 첫 무기 · 첫 옷 */
const STARTER_GEAR = { fist: 'g_hideTosu', sword: 'g_dullSword', blade: 'g_ironSaber', spear: 'g_flailSpear', hidden: 'g_rustyKnife', armor: 'g_hempRobe' };

/* 신분패·탈것 (구매) */
const SHOP_GEAR = [
  { id: 'badge1', slot: 'badge', name: '청풍문 제자패',     rarity: 0, stats: { train: 10 } },
  { id: 'badge2', slot: 'badge', name: '청풍문 정식제자패', rarity: 1, stats: { train: 5 }, cost: 120, desc: '신분패 · 수련치 획득 +5%' },
  { id: 'badge3', slot: 'badge', name: '청풍문 내문제자패', rarity: 2, stats: { train: 10 }, cost: 350, desc: '신분패 · 수련치 획득 +10%' },
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

/* 화로 기예: 단조(장비) · 연단(단약). 실패하면 재료가 전소되고 검게 탄 찌꺼기 1개 */
const CRAFTS = {
  forge:   { name: '단조', hanja: '鍛造', fail: 'slag', desc: '재료를 달구고 두드려 병기·방어구·장신구를 벼린다.' },
  alchemy: { name: '연단', hanja: '煉丹', fail: 'slag', desc: '약재와 요수의 독낭·수액을 단로(丹爐)에 달여 단약을 빚는다.' },
};

/* 단조 전용 중급 장비 9종 (이류급 · 등급 중급 고정). 비밀 조합식은 recipes.js
   bleed: 적중 시 출혈 확률(%) · pierce: 관통력(적 방어 무시) · acc: 명중 보정(%p) */
/* 장경각 이류(二流) 장비: 문파 공헌도로 교환. 이름은 '청풍문 ~'(문파 하사품)으로 단조 장비와 구분한다. 중급(녹색)·2티어. str/con/agi/int는 4대 스탯에 더해진다
   shock 충격(적이 한 합 움직이지 못함) · first 선공 보정 · bleed 적에게 출혈 · staSave 원정 기력 소모 감소 */
const LIBRARY_GEAR = {
  lg_fist:   { slot: 'weapon', wtype: 'fist',   name: '청풍문 호수', hanja: '淸風門護手',   stats: { atk: 18, def: 6, shock: 5 },       cost: 280, desc: '바람결처럼 가벼운 권갑. 제대로 박히면 적의 몸이 굳는다 (충격).' },
  lg_sword:  { slot: 'weapon', wtype: 'sword',  name: '청풍문 패검', hanja: '淸風門佩劍',   stats: { atk: 22, crit: 3, agi: 1 },        cost: 300, desc: '날아가듯 가벼운 청풍문의 검. 쥔 손이 절로 빨라진다.' },
  lg_blade:  { slot: 'weapon', wtype: 'blade',  name: '청풍문 환도', hanja: '淸風門環刀',   stats: { atk: 25, pierce: 4, str: 1 },      cost: 300, desc: '고리가 달린 묵직한 도. 갑옷 틈을 파고든다.' },
  lg_spear:  { slot: 'weapon', wtype: 'spear',  name: '청풍문 장창', hanja: '淸風門長槍',   stats: { atk: 26, counter: 4, con: 1 },     cost: 320, desc: '긴 자루로 거리를 지배하는 창. 되받아치기에 좋다.' },
  lg_hidden: { slot: 'weapon', wtype: 'hidden', name: '청풍문 비표', hanja: '淸風門飛鏢', stats: { atk: 20, first: 8, bleed: 6 },     cost: 280, desc: '버들잎 모양의 비표. 먼저 날아가 상처를 벌린다 (선공 · 출혈).' },
  lg_armor:  { slot: 'armor',                   name: '청풍문 내문 도포', hanja: '淸風門內門道袍',   stats: { maxHp: 60, def: 12, staSave: 3 },  cost: 250, desc: '청풍문 내문 제자의 도포. 몸이 가벼워 원정 기력을 아낀다.' },
  lg_jade:   { slot: 'jade',                    name: '청풍문 옥대', hanja: '淸風門玉帶', stats: { maxHp: 40, maxMp: 30, bag: 10 },   cost: 220, desc: '푸른 옥을 박은 허리 옥대. 단전이 넉넉해지고 짐도 더 진다.' },
};

/* 단조 장비: 재료 수로 위계를 나눈다 (필드 드랍템 < 2재료 조합템 < 3재료 조합템)
   2재료(초급 단조 · 삼류 상급~이류 하급, 중급): 공격 18~22 · 방어 7~9 · 4대 스탯 +1
   3재료(중급 단조 · 정통 이류, 상급): 공격 26~32 · 방어 12~15 · 4대 스탯 +2 · 고유 특수 옵션
   rarity: RARITY 번호(1 중급 · 2 상급) · rank: 등급 표기 */
const CRAFT_GEAR = {
  // ── 2재료 조합 ──
  c_fist:   { slot: 'weapon', wtype: 'fist',   name: '흑철 호수',     hanja: '黑鐵護手',   rarity: 1, rank: '삼류 상급', stats: { atk: 20, def: 8, str: 1 },     desc: '흑철을 겹겹이 두드려 만든 권갑. 막고 치기에 모두 좋다.' },
  c_ring:   { slot: 'ring',                    name: '벽옥 지환',        hanja: '碧玉環',     rarity: 1, rank: '삼류 상급', stats: { maxMp: 40, atk: 5, int: 1 },   desc: '짙푸른 옥으로 깎은 고리. 단전에 기운이 고인다.' },
  c_belt:   { slot: 'belt',                    name: '웅모 포대',     hanja: '熊毛布帶',   rarity: 1, rank: '삼류 상급', stats: { def: 8, bag: 20, con: 1 },     desc: '곰털을 덧댄 두툼한 허리띠. 짐을 잔뜩 걸 수 있다.' },
  t2_sword: { slot: 'weapon', wtype: 'sword',  name: '청풍 단련검',   hanja: '淸風鍛鍊劍', rarity: 1, rank: '삼류 상급', stats: { atk: 19, agi: 1 },             desc: '거친 쇠와 흑목 자루로 두드려 낸 청풍문 수련검.' },
  t2_blade: { slot: 'weapon', wtype: 'blade',  name: '청풍 단련도',   hanja: '淸風鍛鍊刀', rarity: 1, rank: '삼류 상급', stats: { atk: 21, str: 1 },             desc: '쇠를 넉넉히 먹여 묵직한 수련도.' },
  t2_fist:  { slot: 'weapon', wtype: 'fist',   name: '청풍 단련수투', hanja: '淸風鍛鍊手套', rarity: 1, rank: '삼류 상급', stats: { atk: 16, def: 7 },           desc: '살쾡이 가죽 위에 쇠판을 덧댄 권갑.' },
  t2_spear: { slot: 'weapon', wtype: 'spear',  name: '청풍 수련창',   hanja: '淸風修鍊槍', rarity: 1, rank: '삼류 상급', stats: { atk: 20, con: 1 },             desc: '흑목 자루가 긴 수련창. 휘두를수록 몸이 단단해진다.' },
  t2_hidden:{ slot: 'weapon', wtype: 'hidden', name: '청풍 철표',     hanja: '淸風鐵鏢',   rarity: 1, rank: '삼류 상급', stats: { atk: 18, crit: 2 },            desc: '수액으로 담금질한 쇠 표창.' },
  t2_armor: { slot: 'armor',                   name: '청풍 도포',     hanja: '淸風道袍',   rarity: 1, rank: '삼류 상급', stats: { def: 8, maxHp: 30 },           desc: '가죽을 수액으로 무두질해 지은 수련 도포.' },
  // ── 3재료 조합 ──
  c_sword:  { slot: 'weapon', wtype: 'sword',  name: '청강검',        hanja: '靑鋼劍',     rarity: 2, rank: '이류', stats: { atk: 28, crit: 3, agi: 2 },          desc: '푸른빛이 도는 강철 검. 날이 쉽게 무뎌지지 않는다.' },
  c_blade:  { slot: 'weapon', wtype: 'blade',  name: '혈문도',        hanja: '血紋刀',     rarity: 2, rank: '이류', stats: { atk: 32, bleed: 20, str: 2 },        desc: '핏빛 무늬가 새겨진 도. 베인 상처가 쉬이 아물지 않는다 (출혈).' },
  c_spear:  { slot: 'weapon', wtype: 'spear',  name: '벽파 삼지창',   hanja: '碧波三枝槍', rarity: 2, rank: '이류', stats: { atk: 30, pierce: 5, con: 2 },        desc: '물결을 가르는 세 갈래 창. 갑옷 틈을 꿰뚫는다 (관통).' },
  c_hidden: { slot: 'weapon', wtype: 'hidden', name: '칠성 투골정',   hanja: '七星透骨釘', rarity: 2, rank: '이류', stats: { atk: 26, spd: 2, acc: 8, agi: 2 },   desc: '북두칠성처럼 흩어져 날아가는 일곱 개의 쇠못.' },
  c_armor:  { slot: 'armor',                   name: '청강 사슬갑',   hanja: '靑鋼鎖子甲', rarity: 2, rank: '이류', stats: { def: 15, maxHp: 80, con: 2 },        desc: '청강 고리를 촘촘히 엮은 사슬갑.' },
  c_jade:   { slot: 'jade',                    name: '수정 영옥대',   hanja: '水晶靈玉帶', rarity: 2, rank: '이류', stats: { qiPct: 6, elemRes: 5, int: 2 },      desc: '수정과 영옥을 박은 띠. 기공이 맑게 돌고 상극의 기운을 누그러뜨린다.' },
  t3_sword: { slot: 'weapon', wtype: 'sword',  name: '청풍비검',      hanja: '淸風飛劍',   rarity: 2, rank: '이류', stats: { atk: 28, crit: 5, agi: 2 },          desc: '정련 철괴에 흑목 자루, 수액 담금질까지 거친 청풍문 정품 검.' },
  t3_blade: { slot: 'weapon', wtype: 'blade',  name: '청풍벽력도',    hanja: '淸風霹靂刀', rarity: 2, rank: '이류', stats: { atk: 32, pierce: 6, str: 2 },        desc: '멧돼지 어금니를 갈아 날에 박은 벼락 같은 도.' },
  t3_fist:  { slot: 'weapon', wtype: 'fist',   name: '청풍유운수투',  hanja: '淸風流雲手套', rarity: 2, rank: '이류', stats: { atk: 25, def: 12, counter: 4 },   desc: '독사 비늘을 겹친 권갑. 맞받아치기 좋다.' },
  t3_spear: { slot: 'weapon', wtype: 'spear',  name: '청풍선풍창',    hanja: '淸風旋風槍', rarity: 2, rank: '이류', stats: { atk: 30, armorPen: 5, con: 2 },      desc: '회오리처럼 파고드는 장창. 적의 방어를 흘려 넘긴다.' },
  t3_hidden:{ slot: 'weapon', wtype: 'hidden', name: '청풍유엽표',    hanja: '淸風柳葉鏢', rarity: 2, rank: '이류', stats: { atk: 26, bleed: 10, agi: 2 },        desc: '독사 독낭을 먹인 버들잎 비표. 상처가 곪아 든다.' },
  t3_jade:  { slot: 'jade',                    name: '청풍보옥대',    hanja: '淸風寶玉帶', rarity: 2, rank: '이류', stats: { def: 10, maxMp: 40, maxHp: 40 },     desc: '가죽 띠에 수액으로 굳힌 옥을 박은 청풍문 정품 옥대.' },
};


/* 기예 (캐릭터 생성 때 주력 하나): 단조·연단 모두 9품에서 시작하고, 주력 기예에만 고유 효과가 붙는다.
   rate: 주력 기예 성공률 +%p · slag: 단조 실패 시 찌꺼기 개수 · pill: 단약 섭취 효과 배율 보너스.
   솜씨 품계: 솜씨 단계(lv) 1 = 9품, 올라갈수록 8품 … 1품 (CRAFT_GRADE_TOP 단계 이상은 1품) */
const CRAFT_GRADE_TOP = 9;
const TALENTS = {
  forge:   { name: '단조', hanja: '鍛造', sub: '장비 제작 · 제련 특화', desc: '단조 9품에서 시작 · 장비 제작 성공률 +10% · 단조 시 검게 탄 찌꺼기 획득량 2배', craft: 'forge', rate: 10, slag: 2 },
  alchemy: { name: '연단', hanja: '煉丹', sub: '영약 제조 · 연단 특화', desc: '연단 9품에서 시작 · 연단 성공률 +10% · 단약 섭취 효과 +15%', craft: 'alchemy', rate: 10, pill: 0.15 },
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
  awaken: 300,                                             // 누적 공양 찌꺼기가 이만큼 차면 무신이 깨어난다 (초과분 보존)
  awakenHp: 20,                                            // 각성마다 최대 활력 영구 +20
  awakenBooks: ['cpGwon', 'cpGeom', 'cpDo', 'cpChang', 'cpPyo', 'cpSim', 'cpGyeong', 'cpGi'],   // 각성 하사품 비급 (이류) — 삼류는 books
  books: ['paseok', 'swaegol', 'yeonhwan', 'cpGeombeop', 'nakyeop', 'chupung', 'ohodanmun', 'byeokryeok', 'dansu', 'yukhap', 'cheolgi', 'pungun', 'biyeon', 'sanhwa', 'tugol',
          'chosangbi', 'dapsu', 'jihaeng', 'deungsu', 'mijong', 'mokryeong', 'byeokhwa', 'huto', 'baekgeum', 'yusu', 'samjaeGwon', 'samjaeGeom', 'samjaeDo', 'samjaeChang', 'samjaePyo'],
};

/* 화로 한 번에 넣을 수 있는 재료 수 · 연구 노트에 남기는 시도 수 */
const POT_MAX = 10;
const CRAFT_NOTE_MAX = 80;

/* 장비 강화: +1마다 기본 능력치 10% 상승, 최대 +10. 실패해도 등급은 떨어지지 않고 은자만 사라진다. */
/* 장비 강화 한도 (+10) */
const ENH_MAX = 10;
