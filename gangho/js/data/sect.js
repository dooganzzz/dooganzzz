/* [데이터] 청풍문 인물 대사 · 보급품 · 전방(상점) 진열 — 순수 정적 데이터 (로직 없음) */

/* 조운의 오늘의 보급품: [아이템, 최소, 최대] 중 2~3가지 */
const SUPPLY = [
  ['saenghyeol', 1, 1], ['potionMp', 1, 2], ['herb', 2, 4], ['wildGinseng', 2, 3],
  ['blackwood', 2, 3], ['roughOre', 2, 3], ['wildcatHide', 1, 2], ['lingzhi', 1, 1],
];

/* 청풍전방(淸風廛房): 청풍문 전속 객주 */
const MERCHANT = {
  name: '왕 가', title: '청풍전방 주인', seal: '王',
  greet: '주판알을 튕기다 고개를 듭니다. "어서 오시오, 청풍문 도령. 싸게 드리리다. 팔 물건이 있으면 그것도 쳐 드리지."',
  buyLines: ['"좋은 물건 고르셨소."', '"다음에도 들르시오."', '"청풍산 들어가려면 그 정도는 챙겨야지."'],
  sellLines: ['"흠, 값은 제대로 쳐 드렸소."', '"이 정도면 후하게 쳐 드린 거요."', '"또 캐 오시오. 사 드리리다."'],
  poor: '"은자가 모자라구려. 외상은 안 되오."',
};
/* 전방 진열: [아이템, 은자] — 단약·재료 */
const SHOP_STOCK = [
  ['saenghyeol', 5], ['gigeokdan', 50], ['potionMp', 20], ['herb', 6], ['wildGinseng', 6],
  ['blackwood', 6], ['roughOre', 5], ['wildcatHide', 8],
];
/* 전방 진열: [하급 장비 id(GEAR_DB) 또는 기본형(EQUIP_BASES), 티어, 은자] */
const SHOP_GEAR_STOCK = [
  ['g_studFist', 1, 40], ['g_straightSword', 1, 45], ['g_blackSaber', 1, 50], ['g_trident', 1, 45], ['g_caltrops', 1, 40],
  ['g_hunterCoat', 1, 55], ['g_cpRobe', 1, 60], ['helmet', 1, 35], ['boots', 1, 30],
  ['g_ironRing', 1, 40], ['g_hempBelt', 1, 20], ['g_leatherBelt', 1, 45], ['g_whiteJade', 1, 50],
];
/* 장비 되팔기: 티어별 기본값 × 희귀도 배율 × (1 + 강화 × 0.15) */
const GEAR_SELL = { tier: [8, 25, 60], enh: 0.15, rar: [1, 1.2, 1.45, 1.75, 2.1, 2.5] };   // rar: 되팔 때의 등급 배율 (장비 능력치 배율 RARITY와는 따로)

/* 아린과 이야기 나누기: 무작위 한 줄 */
const ARIN_TALK = [
  '사형, 조운 사형이 또 장작 패다 도끼 자루 부러뜨렸대요. 헤헤.',
  '장문인 할아버지 오늘도 낮잠이에요. 코 고는 소리가 연무장까지 들려요!',
  '청풍산 산토끼는 귀엽지만… 고기는 맛있어요.',
  '저도 언젠가 낙양 구경 가 보고 싶어요. 사형이 먼저 가면 얘기해 줘요!',
  '무신상 앞에 쇳덩이 놓고 절하는 사형 봤어요. 진짜 효과 있어요?',
  '화로 쓸 때 불 조심해요! 지난번에 조운 사형 눈썹 탔었어요.',
];

