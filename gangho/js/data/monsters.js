/* [데이터] 요수 · 적 능력치 · 고유 드랍 · 기척 지문 — 순수 정적 데이터 (로직 없음) */

/* 적 */
const ENEMIES = {
  rabbit:   { name: '들토끼',     hp: 30,   atk: 5,   def: 0,  spd: 12, eva: 8,  xp: 6,   silver: [1, 3],   drops: [['rabbitMeat', 0.7], ['rabbitHide', 0.6]] },
  dog:      { name: '들개',       hp: 60,   atk: 9,   def: 2,  spd: 11, eva: 5,  xp: 11,  silver: [2, 5],   drops: [['dogFang', 0.65], ['roughHide', 0.5]] },
  boar:     { name: '멧돼지',     hp: 140,  atk: 16,  def: 6,  spd: 8,  eva: 2,  xp: 20,  silver: [4, 8],   drops: [['boarMeat', 0.7], ['boarTusk', 0.4], ['boarHide', 0.55]], gear: [1, 0.06] },
  boarKing: { name: '외눈 멧돼지왕', hp: 600, atk: 32, def: 10, spd: 9,  eva: 3,  xp: 70,  silver: [30, 50], drops: [['kingTusk', 1], ['blackiron', 1], ['emberStone', 0.8]], gear: [1, 1], boss: 'boss1' },

  bandit:   { name: '화적 졸개',   hp: 380,  atk: 60,  def: 18, spd: 11, eva: 6,  xp: 38,  silver: [10, 20], drops: [['bandanaSilk', 0.4], ['rice', 0.3], ['salt', 0.3]], gear: [2, 0.05] },
  axeman:   { name: '화적 도부수', hp: 560,  atk: 72,  def: 26, spd: 9,  eva: 3,  xp: 52,  silver: [15, 28], drops: [['bandanaSilk', 0.5], ['boarTusk', 0.3], ['emberStone', 0.2]], gear: [2, 0.07] },
  archer:   { name: '화적 궁수',   hp: 340,  atk: 80,  def: 14, spd: 14, eva: 15, xp: 48,  silver: [14, 26], drops: [['bandanaSilk', 0.4], ['dogFang', 0.4], ['wood', 0.5]], gear: [2, 0.06] },
  jeokyeom: { name: '채주 적염도', hp: 1900, atk: 88,  def: 34, spd: 12, eva: 8,  xp: 220, silver: [150, 220], drops: [['emberStone', 1], ['firegrass', 1], ['lingzhi', 1], ['blackiron', 1]], gear: [2, 1], boss: 'boss2' },

  pirate:   { name: '수적',       hp: 1000, atk: 125, def: 50, spd: 12, eva: 6,  xp: 80,  silver: [30, 50], drops: [['fish', 0.5], ['scale', 0.3], ['salt', 0.3]], gear: [3, 0.05] },
  harpoon:  { name: '수적 작살수', hp: 850,  atk: 145, def: 40, spd: 15, eva: 12, xp: 88,  silver: [32, 55], drops: [['fish', 0.5], ['scale', 0.35], ['wood', 0.4]], gear: [3, 0.06] },
  hyangju:  { name: '적룡방 향주', hp: 1500, atk: 150, def: 62, spd: 13, eva: 8,  xp: 120, silver: [50, 80], drops: [['scale', 0.6], ['bloodginseng', 0.25], ['coldiron', 0.4]], gear: [3, 0.1] },
  ronin:    { name: '떠돌이 낭인', hp: 240, atk: 23, def: 9,  spd: 12, eva: 10, xp: 0, silver: [10, 20], drops: [['potionHp', 0.5]] },
  galcheon: { name: '방주 갈천',   hp: 5200, atk: 165, def: 80, spd: 14, eva: 10, xp: 500, silver: [500, 700], drops: [['scale', 1], ['bloodginseng', 1], ['lotus', 1], ['coldiron', 1]], gear: [3, 1], boss: 'boss3' },
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
