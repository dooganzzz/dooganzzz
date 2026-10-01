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
  ['blackwood', 6], ['roughOre', 5], ['wildcatHide', 8], ['pillLow', 80],
  // 삼류 비급 (전방 [비급] 탭) — 입문 삼재 무공은 싸게
  ['bk_samjaeGwon', 60], ['bk_samjaeGeom', 60], ['bk_samjaeDo', 60], ['bk_samjaeChang', 60], ['bk_samjaePyo', 60], ['bk_tonap', 150],
  ['bk_pocheolsak', 150], ['bk_cheolpo', 150], ['bk_paseok', 150], ['bk_swaegol', 150], ['bk_yeonhwan', 150], ['bk_cpGeombeop', 150],
  ['bk_nakyeop', 150], ['bk_chupung', 150], ['bk_ohodanmun', 150], ['bk_byeokryeok', 150], ['bk_dansu', 150], ['bk_yukhap', 150],
  ['bk_cheolgi', 150], ['bk_pungun', 150], ['bk_biyeon', 150], ['bk_sanhwa', 150], ['bk_tugol', 150], ['bk_chosangbi', 150],
  ['bk_dapsu', 150], ['bk_jihaeng', 150], ['bk_deungsu', 150], ['bk_mijong', 150], ['bk_mokryeong', 150], ['bk_byeokhwa', 150],
  ['bk_huto', 150], ['bk_baekgeum', 150], ['bk_yusu', 150],
];
/* 전방 진열: [하급 장비 id(GEAR_DB) 또는 기본형(EQUIP_BASES), 티어, 은자] */
const SHOP_GEAR_STOCK = [
  // 무기 (하급 이름 있는 장비 전부 · 단조 장비는 팔지 않는다)
  ['g_bandage', 1, 30], ['g_hideTosu', 1, 35], ['g_woodFist', 1, 35], ['g_copperGlove', 1, 40], ['g_studFist', 1, 40],
  ['g_rustySword', 1, 30], ['g_mapleSword', 1, 35], ['g_dullSword', 1, 35], ['g_bronzeRapier', 1, 40], ['g_straightSword', 1, 45],
  ['g_chippedBlade', 1, 35], ['g_shortBlade', 1, 40], ['g_ironSaber', 1, 45], ['g_axeBlade', 1, 50], ['g_blackSaber', 1, 50],
  ['g_bambooSpear', 1, 30], ['g_flailSpear', 1, 40], ['g_waxSpear', 1, 45], ['g_trident', 1, 45], ['g_needleSpear', 1, 50],
  ['g_pebbles', 1, 30], ['g_dullStar', 1, 30], ['g_rustyKnife', 1, 35], ['g_woodNeedle', 1, 40], ['g_caltrops', 1, 40],
  // 갑옷
  ['g_hempRobe', 1, 25], ['g_hunterCoat', 1, 55], ['g_cpRobe', 1, 60], ['helmet', 1, 35], ['boots', 1, 30],
  // 장신구
  ['g_ironRing', 1, 40], ['g_bronzeRing', 1, 35], ['g_hornRing', 1, 40], ['g_hempBelt', 1, 20], ['g_leatherBelt', 1, 45],
  ['g_silkBelt', 1, 45], ['g_whiteJade', 1, 50], ['g_dullJade', 1, 45], ['g_cloudJade', 1, 50],
];
/* 장비 되팔기: 티어별 기본값 × 희귀도 배율 × (1 + 강화 × 0.15) */
const GEAR_SELL = { tier: [8, 25, 60], enh: 0.15 };

/* 아린과 이야기 나누기: 무작위 한 줄 */
const ARIN_TALK = [
  '사형, 조운 사형이 또 장작 패다 도끼 자루 부러뜨렸대요. 헤헤.',
  '장문인 할아버지 오늘도 낮잠이에요. 코 고는 소리가 연무장까지 들려요!',
  '청풍산 산토끼는 귀엽지만… 고기는 맛있어요.',
  '저도 언젠가 낙양 구경 가 보고 싶어요. 사형이 먼저 가면 얘기해 줘요!',
  '무신상 앞에 쇳덩이 놓고 절하는 사형 봤어요. 진짜 효과 있어요?',
  '화로 쓸 때 불 조심해요! 지난번에 조운 사형 눈썹 탔었어요.',
];

