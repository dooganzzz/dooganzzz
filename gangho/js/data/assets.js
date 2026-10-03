/* [SSOT] 그림 목록: 게임이 쓰는 모든 그림의 폴더 · 확장자는 여기서만 정한다.
   화면 코드는 ui/ui_assets.js의 ASSET.종류(이름)으로만 그림 경로를 얻는다 ('assets/' 직접 쓰기는 check-layers가 막는다).
   폴더 규칙: assets/art/ 아래 sprites(전투 · 걷기 시트) · stages(전투 무대) · travel(강호행 산길) · zones(탐험지) · props(길가 소품)
   · fx(이펙트) · ui(수묵 아이콘) · portraits(얼굴) · beasts(요수) · items(아이템) · 루트(배너 · 무신상 같은 장면 그림)
   · common(모든 무공이 함께 쓰는 그림: 두루마리 외침 scroll_* · 평타 strike_hit · strike_crit). 공용 초식 · 공용 오의는 없다
   · manual/무공id/(그 무공만의 그림: cut_1 · cut_2 초식 컷, ougi 오의). 무공 폴더 그림은 그 무공에만 쓴다 —
     ASSET.manual(mid, 이름)은 MANUAL_ART에 올린 것만, 부르는 무공 자신의 폴더에서만 돌려준다 (다른 무공이 빌려 쓸 수 없음) */
const ASSET_ROOT = 'assets/art/';
const ASSET_KIND = {
  hero:     { dir: 'sprites/hero_', ext: 'webp' },   // 병기별 제자 전투 시트
  foe:      { dir: 'sprites/foe_', ext: 'webp' },    // 요수 숨쉬기 시트 (공격 시트는 이름_atk)
  run:      { dir: 'sprites/run_', ext: 'webp' },    // 병기별 달리기 16컷 (강호행)
  walk:     { dir: 'sprites/walk_', ext: 'webp' },   // 병기별 걷기 16컷 (기력이 다해 걸을 때)
  stage:    { dir: 'stages/', ext: 'jpg' },
  travel:   { dir: 'travel/', ext: 'jpg' },
  ground:   { dir: 'travel/ground_', ext: 'webp' },
  skymask:  { dir: 'travel/sky_', ext: 'webp' },     // 먼 겹의 하늘 가리개: 하늘은 불투명, 산 · 나무 · 연기는 투명 (달이 지형 뒤로 숨게)  // 강호행 앞 겹: 산길 그림의 땅만 (윗선은 둔덕 모양, 위는 투명)
  prop:     { dir: 'props/', ext: 'webp' },
  building: { dir: 'buildings/', ext: 'webp' },        // 청풍문 전경 위 건물 (forge · shrine · shop · yeonmu, 정청 · 산문은 배경에)
  fx:       { dir: 'fx/', ext: 'webp' },
  zone:     { dir: 'zones/', ext: 'jpg' },
  beast:    { dir: 'beasts/', ext: 'webp' },
  item:     { dir: 'items/', ext: 'webp' },
  ui:       { dir: 'ui/', ext: 'webp' },
  font:     { dir: 'fonts/', ext: 'woff' },   // rank_hanja는 woff2 (ASSET_EXT)           // 붓글씨 폰트 gangho_brush_537 — 글자를 늘리면 이름도 바꿔 브라우저 캐시를 피한다 (지역 이름 · 1장 비급 글자 477자, tools/brush-font.py로 만듦)
  common:   { dir: 'common/', ext: 'webp' },         // 공용: scroll_초식(두루마리 종이) · _hz(기운 12컷) · scroll_ax(도는 축 16컷) · scroll_face(제자 얼굴) · strike_hit · strike_crit(평타 타격 · 치명)
  portrait: { dir: 'portraits/', ext: 'webp' },
  audio:    { dir: 'audio/', ext: 'mp3' },          // 소리: teahouse(배경음악 옥루관 금소합주) · gangho_road(강호행 배경음악) · sfx(녹음 효과음 묶음 — SFX_SPRITE)
  scene:    { dir: '', ext: 'webp' },                 // banner · shrine · shrine_awake · meditation · forge_scene · alchemy_scene · yeonhon_hall · rankup_2(이류무사 승급)
};
/* 배경음악: 장면 → 곡 (assets/art/audio/곡.mp3). 곡이 없는 장면은 hall 곡을 이어 튼다.
   장면: hall(정청 · 그 밖 모든 화면 · 로그인) · live(강호행 산길) · fight(강호행 전투) · boss(두목) */
const BGM_TRACKS = { hall: 'teahouse', live: 'gangho_road', fight: 'gangho_road' };   // 강호행(산길 · 전투 · 두목) = gangho_road (10월 3일 유저가 뽑은 곡)
/* 맞힐 때 소리: 병기 → 녹음 파일 (assets/art/audio/이름.mp3, 10월 3일 유저가 보낸 소리에서 맞는 순간만 잘라 냄) */
const HIT_SFX = { fist: 'hit_fist', sword: 'hit_sword', blade: 'hit_blade', spear: 'hit_spear', hidden: 'hit_hidden' };
/* 녹음 파일로 내는 효과음: 효과음 이름 → 파일 (10월 3일 유저가 보낸 소리 — 대사 도트음은 울림을 끊고 작게, 지도 위 마우스는 음을 조금 올려 가볍게) */
const SFX_FILES = { type: 'talk_dot', buy: 'coin', sell: 'coin', portal: 'hover', hurt: 'hit_foe', kiai: 'kiai', scroll: 'scroll_snap', poem: 'poem_beat' };   // kiai = 초식을 쓰러 들어가기 직전 기합 · scroll = 두루마리 외침 (닫히는 '탁') · poem = 시문이 뜰 때 한 번 둥   // hurt = 요수가 제자를 칠 때 (권장 타격음을 낮춰 눌러 담음)
/* 녹음 효과음 묶음(audio/sfx.mp3 한 파일): 이름 → [[시작 초, 길이 초], …] 여러 벌이면 번갈아 쓴다.
   출처: Kenney RPG Audio · Impact Sounds (CC0, 출처 표시 없이 써도 됨). 다시 만들기: tools/sfx-sprite.py (묶음을 바꾸면 이 표도 함께) */
const SFX_SPRITE = {"click":[[0.2,0.123],[0.523,0.266],[0.989,0.127]],"step_dirt":[[1.316,0.158],[1.675,0.148],[2.022,0.151],[2.374,0.139],[2.712,0.12]],"step_snow":[[3.033,0.18],[3.413,0.18],[3.793,0.186],[4.179,0.184],[4.563,0.181]],"step_wet":[[4.944,0.106],[5.25,0.108],[5.557,0.113]],"slash":[[5.87,0.373],[6.443,0.441]],"pierce":[[7.084,0.24]],"punch":[[7.524,0.284],[8.008,0.268],[8.476,0.355]],"punch_heavy":[[9.031,0.501],[9.731,0.419],[10.351,0.369]],"soft":[[10.919,0.118],[11.237,0.183]],"hurt":[[11.621,0.505],[12.326,0.572],[13.098,0.572]],"anvil":[[13.87,0.168],[14.238,0.359],[14.797,0.117]],"metal":[[15.114,0.272]],"equip":[[15.586,0.374],[16.161,0.206],[16.566,0.229]],"unequip":[[16.995,0.586],[17.781,0.364],[18.345,0.698]],"book":[[19.243,0.207],[19.651,0.26]],"bookOpen":[[20.11,0.152]],"bookFlip":[[20.463,0.635],[21.298,0.393]],"bookClose":[[21.891,0.231]],"coins":[[22.321,0.703]],"coins2":[[23.225,0.318]],"glassCrack":[[23.742,0.147]],"glassBreak":[[24.089,0.241]],"pot":[[24.53,1.318]],"bellHit":[[26.048,1.276]]};
/* 무공 고유 그림 목록: assets/art/manual/무공id/ 에 실제로 있는 파일 (check-layers가 폴더와 맞는지 본다).
   그림이 없는 초식 · 오의는 비워 두고, 그때는 평타(common/strike_*)가 나간다 */
const MANUAL_ART = {
  sw1a: ['cut_1', 'cut_2', 'ougi'],    // 한상검법: 제1 · 2초식 컷 · 오의
  sw1b: ['cut_1', 'cut_2', 'ougi'],    // 추상검법: 제1 · 2초식 컷 · 오의 서리 별
  sw1c: ['cut_1', 'cut_2', 'ougi'],    // 유묵검법: 제1 · 2초식 컷 · 오의 큰 붓 한 점 (먹빛 수묵화)
  fs1a: ['cut_1', 'cut_2', 'ougi'],
  fs1b: ['cut_1', 'cut_2'],           // 통비권: 제1초식 축경(바짝 붙어 세 번 연타 — 흰 먹빛 연타가 몸 위에서 터짐) · 제2초식 진비출(고요한 물 위 파문이 주먹에서 뻗어 금빛으로 터짐). 오의는 아직 없음 → 평타    // 철사장: 취기(장풍) · 박쇄석(갈라지는 바위판) · 철장쇄흉골(금빛 충격파)
};
/* 먹빛(검은) 그림의 무공: 밝게 섞기(screen)로는 먹이 지워지므로 그대로 겹치고, 테두리 빛 · 오의 막도 종이빛으로 (CSS .ink) */
const MANUAL_INK = ['sw1c'];
/* 돌 · 쇠빛처럼 꽉 찬 그림의 무공: 밝게 섞기(screen)로는 바위가 비쳐 사라지므로 초식 컷을 그대로 겹치고 따뜻한 테두리 빛 (CSS .solid). 오의는 기본 그대로 */
const MANUAL_SOLID = ['fs1a'];
/* 권장(연속 때리기)처럼 맞는 자리에서 터지는 초식: 제1초식 그림이 허공을 가르지 않고 요수 몸 위에 얹힌다 (크기 · 자리는 ui_sprite.js HIT_GEO) */
const MANUAL_HIT = { fs1b: 3, fs1a: 1 };   // 무공 → 맞붙어 치는 횟수 (통비권: 세 번 연타 · 철사장: 한 번 깊게 찌르기)
/* 검은 바탕에 빛과 기운으로 그린 무공(유저 확정 화풍): 칼 그림용 파란 테두리 빛 없이 그대로 스며들게 (CSS .stance-cut.glow) */
const MANUAL_GLOW = ['fs1b'];
/* 확장자가 기본과 다른 파일 (종류:이름) */
const ASSET_EXT = { 'scene:banner': 'jpg', 'scene:forge_scene': 'jpg', 'font:rank_hanja': 'woff2' };
/* PNG는 모두 무손실 WebP로 바꿨다 (픽셀 동일, 약 37% 작음). 이미 손실 압축된 WebP · JPG는 다시 압축하지 않는다 */
