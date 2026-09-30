/* [데이터] 화로 비밀 조합식 — 순수 정적 데이터 (로직 없음)
   craft: forge(단조) · alchemy(연단) · in: {재료: 개수} (정확히 같아야 한다) · out: 아이템 id 또는 'gear:장비 id'(CRAFT_GEAR)
   처음엔 모두 비공개(???). 한 번이라도 성공하면 도감 › 단조/연단 비법에 영구 등재된다.
   hint: 인물에게 들을 수 있는 귀띔 (돌파단만) */

const RECIPES = [
  // ───── 단조 (중급 장비) ─────
  { id: 'f_c_sword',  craft: 'forge', in: { roughOre: 3, boarMolar: 2, blackIngot: 1 },   out: 'gear:c_sword' },
  { id: 'f_c_blade',  craft: 'forge', in: { bladeShard: 2, redStone: 2, wolfSinew: 1 },   out: 'gear:c_blade' },
  { id: 'f_c_armor',  craft: 'forge', in: { wildcatHide: 2, crocHide: 2, blackIngot: 2 }, out: 'gear:c_armor' },
  { id: 'f_c_jade',   craft: 'forge', in: { treeSap: 2, mistDew: 2, silverOre: 1 },       out: 'gear:c_jade' },
  { id: 'f_c_fist',   craft: 'forge', in: { roughOre: 4, blackIngot: 2 },                 out: 'gear:c_fist' },
  { id: 'f_c_spear',  craft: 'forge', in: { blackwood: 2, silverOre: 2, dragonScale: 1 }, out: 'gear:c_spear' },
  { id: 'f_c_hidden', craft: 'forge', in: { boarMolar: 2, scorpionSac: 1, roughOre: 2 },  out: 'gear:c_hidden' },
  { id: 'f_c_ring',   craft: 'forge', in: { silverOre: 1, mistDew: 2 },                   out: 'gear:c_ring' },
  // 청풍문 단조 — 2재료(저난이도) · 3재료(고난이도)
  { id: 'f_t2_sword',  craft: 'forge', in: { roughOre: 3, blackwood: 2 },                  out: 'gear:t2_sword' },
  { id: 'f_t2_blade',  craft: 'forge', in: { roughOre: 4, blackwood: 1 },                  out: 'gear:t2_blade' },
  { id: 'f_t2_fist',   craft: 'forge', in: { wildcatHide: 2, roughOre: 2 },                out: 'gear:t2_fist' },
  { id: 'f_t2_spear',  craft: 'forge', in: { blackwood: 4, roughOre: 2 },                  out: 'gear:t2_spear' },
  { id: 'f_t2_hidden', craft: 'forge', in: { roughOre: 4, treeSap: 1 },                    out: 'gear:t2_hidden' },
  { id: 'f_t2_armor',  craft: 'forge', in: { wildcatHide: 3, treeSap: 2 },                 out: 'gear:t2_armor' },
  { id: 'f_t3_sword',  craft: 'forge', in: { blackIngot: 3, blackwood: 3, treeSap: 2 },    out: 'gear:t3_sword' },
  { id: 'f_t3_blade',  craft: 'forge', in: { blackIngot: 4, boarMolar: 2, blackwood: 2 },  out: 'gear:t3_blade' },
  { id: 'f_t3_fist',   craft: 'forge', in: { wildcatHide: 4, blackIngot: 2, viperScale: 2 }, out: 'gear:t3_fist' },
  { id: 'f_t3_spear',  craft: 'forge', in: { blackwood: 5, blackIngot: 3, boarMolar: 2 },  out: 'gear:t3_spear' },
  { id: 'f_t3_hidden', craft: 'forge', in: { blackIngot: 3, viperSac: 2, treeSap: 2 },     out: 'gear:t3_hidden' },
  { id: 'f_t3_jade',   craft: 'forge', in: { wildcatHide: 3, treeSap: 3, blackIngot: 1 },  out: 'gear:t3_jade' },
  { id: 'f_c_belt',   craft: 'forge', in: { wildcatHide: 3, wolfSinew: 2 },               out: 'gear:c_belt' },

  // ───── 연단: 단약 (8품) ─────
  { id: 'a_sohwan',   craft: 'alchemy', in: { wildGinseng: 2, treeSap: 1 },                  out: 'potionMp' },
  { id: 'a_saeng',    craft: 'alchemy', in: { wildGinseng: 1, wildcatHide: 1, treeSap: 1 },  out: 'saenghyeol' },
  { id: 'a_golgye',   craft: 'alchemy', in: { boarMolar: 2, redClay: 1 },                    out: 'golgye' },
  { id: 'a_tongmaek', craft: 'alchemy', in: { wildGinseng: 2, redStone: 1 },                 out: 'tongmaek' },
  { id: 'a_haedok',   craft: 'alchemy', in: { silentReed: 2, centipedeLeg: 1 },              out: 'haedok' },
  { id: 'a_cheongsim',craft: 'alchemy', in: { silentReed: 1, treeSap: 2 },                   out: 'clearPill' },

  // ───── 돌파단 (기존 조합식 유지) ─────
  { id: 'a_low',  craft: 'alchemy', in: { herb: 2, lingzhi: 1 }, out: 'pillLow', hint: '노벽송: "소성 돌파단이라… 산약초 둘에 영지 하나. 불은 약하게, 마음은 급하게 먹지 말고."' },
  { id: 'a_high', craft: 'alchemy', in: { bloodginseng: 1, lotus: 1, firegrass: 1 }, out: 'pillHigh', hint: '노벽송: "대성… 피(혈삼), 물(수련화), 불(화령초). 셋이 서로를 다스려야 한다."' },
];
