/* [데이터] 별호(別號): 강호에서 얻는 이름. 입수 난이도 최하 · 하 · 중 · 상 · 최상 (10월 3일 유저).
   1장에서는 최하 · 하만 얻을 수 있다 — 중 · 상 · 최상은 이름만 두고 2장 이후에 연다.
   wear: 호패에 새겨 쓰고 있을 때만 주는 능력치 · gain: 한 번 얻으면 영구히 주는 능력치 (습득 보너스)
   school: 그 별호의 결 (정 · 마 · 사, 없으면 어느 쪽도 아님)
   cond: 얻는 조건 — k: start(처음부터) · runs(강호행 마친 횟수) · kills(요수 처치 합계) · killOf(그 요수 처치) · manuals(익힌 비급 수)
         school(그 파 비급 수) · craft(기예 품계) · shrine(무신상 공양 횟수) · star(가장 높은 무공 성급) · attr(단련 스탯) · silver(지닌 은자) */
const TITLE_TIERS = [
  { name: '최하', hanja: '最下', cls: 't0' },
  { name: '하', hanja: '下', cls: 't1' },
  { name: '중', hanja: '中', cls: 't2' },
  { name: '상', hanja: '上', cls: 't3' },
  { name: '최상', hanja: '最上', cls: 't4' },
];
const TITLE_OPEN_TIER = 1;   // 1장: 최하(0) · 하(1)까지만 얻는다

const TITLES = {
  // ── 최하 (最下) ──
  chocheol:  { name: '강호초출', hanja: '江湖初出', tier: 0, cond: { k: 'start' }, text: '처음부터', wear: { maxHp: 10 }, gain: { train: 1 } },
  chohaeng:  { name: '초행객', hanja: '初行客', tier: 0, cond: { k: 'runs', n: 1 }, text: '강호행을 한 번 마친다', wear: { staSave: 3 }, gain: { maxSta: 5 } },
  yeopsu:    { name: '엽수수', hanja: '獵獸手', tier: 0, cond: { k: 'kills', n: 10 }, text: '요수 10마리를 쓰러뜨린다', wear: { atk: 3 }, gain: { atk: 1 } },
  bunhyang:  { name: '분향객', hanja: '焚香客', tier: 0, cond: { k: 'shrine', n: 10 }, text: '무신상에 10번 공양한다', wear: { luck: 2 }, gain: { maxMp: 5 } },
  seosaeng:  { name: '서생무사', hanja: '書生武士', tier: 0, cond: { k: 'manuals', n: 4 }, text: '비급 4권을 익힌다', wear: { train: 3 }, gain: { maxMp: 8 } },
  yajang:    { name: '견습 야장', hanja: '見習冶匠', tier: 0, cond: { k: 'craft', c: 'forge', n: 2 }, text: '단조를 8품까지 올린다', wear: { craft: 3 }, gain: { def: 1 } },
  chaeyak:   { name: '채약인', hanja: '採藥人', tier: 0, cond: { k: 'craft', c: 'alchemy', n: 2 }, text: '연단을 8품까지 올린다', wear: { mpRegen: 0.3 }, gain: { maxHp: 8 } },
  hyeopji:   { name: '협객지망', hanja: '俠客志望', tier: 0, school: 'jeong', cond: { k: 'school', s: 'jeong', n: 2 }, text: '정파 비급 2권을 익힌다', wear: { def: 2, block: 1 }, gain: { block: 0.5 } },
  madoip:    { name: '마도입문', hanja: '魔道入門', tier: 0, school: 'ma', cond: { k: 'school', s: 'ma', n: 1 }, text: '마공 비급 1권을 익힌다', wear: { atk: 4 }, gain: { critDmg: 2 } },
  sadoip:    { name: '사도입문', hanja: '邪道入門', tier: 0, school: 'sa', cond: { k: 'school', s: 'sa', n: 1 }, text: '사파 비급 1권을 익힌다', wear: { crit: 1.5 }, gain: { crit: 0.5 } },
  // ── 하 (下) ──
  baekin:    { name: '백인참', hanja: '百人斬', tier: 1, cond: { k: 'kills', n: 100 }, text: '요수 100마리를 쓰러뜨린다', wear: { atk: 8 }, gain: { atk: 3 } },
  pyeongjeong: { name: '청풍산 평정객', hanja: '淸風山平定客', tier: 1, cond: { k: 'killOf', e: 'redTiger', n: 1 }, text: '청풍산 두목 적염 호랑이를 쓰러뜨린다', wear: { maxHp: 40, def: 3 }, gain: { maxHp: 15 } },
  cheolgol:  { name: '철골', hanja: '鐵骨', tier: 1, cond: { k: 'attr', a: 'con', n: 10 }, text: '체력을 10까지 기른다', wear: { def: 5, critRes: 3 }, gain: { def: 2 } },
  kwaesu:    { name: '쾌수', hanja: '快手', tier: 1, cond: { k: 'attr', a: 'agi', n: 10 }, text: '민첩을 10까지 기른다', wear: { spd: 3, eva: 2 }, gain: { eva: 1 } },
  seochi:    { name: '서치', hanja: '書癡', tier: 1, cond: { k: 'manuals', n: 8 }, text: '비급 8권을 익힌다', wear: { train: 6, mpSave: 3 }, gain: { train: 2 } },
  soseong:   { name: '소성무인', hanja: '小成武人', tier: 1, cond: { k: 'star', n: 6 }, text: '무공 하나를 6성(소성)까지 올린다', wear: { counter: 3, crit: 1 }, gain: { counter: 1 } },
  jeonju:    { name: '포전객', hanja: '抱錢客', tier: 1, cond: { k: 'silver', n: 1000 }, text: '은자 1,000냥을 지닌다', wear: { luck: 4 }, gain: { luck: 1 } },
  hyeopgaek: { name: '청풍협객', hanja: '淸風俠客', tier: 1, school: 'jeong', cond: { k: 'school', s: 'jeong', n: 4 }, text: '정파 비급 4권을 익힌다', wear: { def: 4, block: 2, shield: 2 }, gain: { shield: 1 } },
  main:      { name: '마인', hanja: '魔人', tier: 1, school: 'ma', cond: { k: 'school', s: 'ma', n: 3 }, text: '마공 비급 3권을 익힌다', wear: { atk: 10, critDmg: 5 }, gain: { critDmg: 3 } },
  hyeolgwi:  { name: '혈귀', hanja: '血鬼', tier: 1, school: 'sa', cond: { k: 'school', s: 'sa', n: 3 }, text: '사파 비급 3권을 익힌다', wear: { crit: 3, critDmg: 3 }, gain: { crit: 1 } },
  // ── 중 (中) · 상 (上) · 최상 (最上): 이름만 (2장 이후) ──
  ilgeom:    { name: '일검표객', hanja: '一劍飄客', tier: 2, sealed: true },
  cheolhyeol: { name: '철혈수라', hanja: '鐵血修羅', tier: 2, school: 'sa', sealed: true },
  gwiyeong:  { name: '귀영무종', hanja: '鬼影無踪', tier: 2, sealed: true },
  yeomhwa:   { name: '염화파천', hanja: '炎火破天', tier: 2, school: 'ma', sealed: true },
  cheongpungkwae: { name: '청풍쾌검', hanja: '淸風快劍', tier: 2, school: 'jeong', sealed: true },
  geomhyeop: { name: '검협', hanja: '劍俠', tier: 3, school: 'jeong', sealed: true },
  doksu:     { name: '독수마군', hanja: '毒手魔君', tier: 3, school: 'ma', sealed: true },
  hyeolyeong: { name: '혈영수라', hanja: '血影修羅', tier: 3, school: 'sa', sealed: true },
  cheolli:   { name: '천리신행', hanja: '千里神行', tier: 3, sealed: true },
  geumgang:  { name: '금강불괴', hanja: '金剛不壞', tier: 3, sealed: true },
  cheonha:   { name: '천하제일검', hanja: '天下第一劍', tier: 4, sealed: true },
  maengju:   { name: '무림맹주', hanja: '武林盟主', tier: 4, school: 'jeong', sealed: true },
  cheonma:   { name: '천마', hanja: '天魔', tier: 4, school: 'ma', sealed: true },
  hyeolma:   { name: '혈마', hanja: '血魔', tier: 4, school: 'sa', sealed: true },
  musin:     { name: '무신', hanja: '武神', tier: 4, sealed: true },
};
