/* [데이터] 요수별 드랍 표 — 순수 정적 데이터 (로직 없음)
   [아이템, 확률]. 각 사냥터의 핵심 재료 6종(areas.js의 mats)을 요수에 나눠 둔다.
   두목은 돌파단 재료(영지 · 화령초 · 혈삼 · 수련화)도 떨군다. */

const DROPS = {
  // 청풍산: 산삼 잔뿌리 · 흑단목 · 멧돼지 어금니 · 살쾡이 가죽 · 청령목 진액 · 조철광
  rabbit:   [['wildGinseng', 0.5], ['wildcatHide', 0.2]],
  wildcat:  [['wildcatHide', 0.7], ['wildGinseng', 0.2]],
  viper:    [['wildGinseng', 0.5], ['treeSap', 0.2], ['viperScale', 0.5], ['viperSac', 0.3]],
  scout:    [['roughOre', 0.5], ['blackwood', 0.3]],
  slinger:  [['roughOre', 0.6], ['wildGinseng', 0.2]],
  boar:     [['boarMolar', 0.7], ['wildcatHide', 0.2]],
  deserter: [['roughOre', 0.5], ['blackwood', 0.4], ['blackIngot', 0.3]],
  turtle:   [['roughOre', 0.5], ['treeSap', 0.3]],
  treant:   [['blackwood', 0.8], ['treeSap', 0.6]],
  redTiger: [['wildcatHide', 1], ['boarMolar', 1], ['blackwood', 1], ['lingzhi', 1], ['blackIngot', 1]],

  // 염화채: 적염석 · 화염 전갈 독낭 · 늑대 힘줄 · 염화 대도 파편 · 적토 · 정련 흑철괴
  fireViper:  [['scorpionSac', 0.5], ['redStone', 0.3]],
  redWolf:    [['wolfSinew', 0.7], ['redClay', 0.3]],
  eagle:      [['wolfSinew', 0.3], ['redStone', 0.4]],
  logger:     [['bladeShard', 0.4], ['redClay', 0.4]],
  cannoneer:  [['redStone', 0.6], ['scorpionSac', 0.2]],
  charger:    [['redClay', 0.5], ['blackIngot', 0.3]],
  eliteAxe:   [['bladeShard', 0.6], ['blackIngot', 0.3]],
  armored:    [['blackIngot', 0.6], ['bladeShard', 0.2]],
  magmaGolem: [['redStone', 0.7], ['redClay', 0.5]],
  jeokpaecheon: [['bladeShard', 1], ['blackIngot', 1], ['redStone', 1], ['firegrass', 1]],

  // 수룡방: 백은광석 · 악어 갑피 · 무성초 · 교룡 비늘 · 오공족 · 수무로
  scaleFish:  [['dragonScale', 0.3], ['mistDew', 0.4]],
  crocodile:  [['crocHide', 0.7], ['silentReed', 0.2]],
  raftScout:  [['silentReed', 0.5], ['silverOre', 0.3]],
  netter:     [['silverOre', 0.5], ['silentReed', 0.3]],
  raider:     [['silverOre', 0.4], ['mistDew', 0.3]],
  diver:      [['dragonScale', 0.4], ['mistDew', 0.4]],
  anchor:     [['silverOre', 0.6], ['crocHide', 0.2]],
  centipede:  [['centipedeLeg', 0.7], ['silentReed', 0.3]],
  iceSpirit:  [['mistDew', 0.7], ['dragonScale', 0.3]],
  byeokhaeryong: [['dragonScale', 1], ['silverOre', 1], ['bloodginseng', 1], ['lotus', 1]],

  // 기연
  ronin: [['saenghyeol', 0.5]],
};
