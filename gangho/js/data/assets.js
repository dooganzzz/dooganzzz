/* [SSOT] 그림 목록: 게임이 쓰는 모든 그림의 폴더 · 확장자는 여기서만 정한다.
   화면 코드는 ui/ui_assets.js의 ASSET.종류(이름)으로만 그림 경로를 얻는다 ('assets/' 직접 쓰기는 check-layers가 막는다).
   폴더 규칙: assets/art/ 아래 sprites(전투 · 걷기 시트) · stages(전투 무대) · travel(강호행 산길) · zones(탐험지) · props(길가 소품)
   · fx(이펙트) · ui(수묵 아이콘) · portraits(얼굴) · beasts(요수) · items(아이템) · 루트(배너 · 무신상 같은 장면 그림) */
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
  fx:       { dir: 'fx/', ext: 'webp' },
  zone:     { dir: 'zones/', ext: 'jpg' },
  beast:    { dir: 'beasts/', ext: 'webp' },
  item:     { dir: 'items/', ext: 'webp' },
  ui:       { dir: 'ui/', ext: 'webp' },
  font:     { dir: 'fonts/', ext: 'woff' },           // 붓글씨 폰트 gangho_brush_477 — 글자를 늘리면 이름도 바꿔 브라우저 캐시를 피한다 (지역 이름 · 1장 비급 글자 477자, tools/brush-font.py로 만듦)
  callout:  { dir: 'callout/', ext: 'webp' },        // 초식 외침 두루마리: 무공_초식(종이) · _hz(기운 12컷) · 무공_ax(도는 축 16컷) · face(제자 얼굴)
  portrait: { dir: 'portraits/', ext: 'webp' },
  scene:    { dir: '', ext: 'webp' },                 // banner · shrine · shrine_awake · meditation · forge_scene · alchemy_scene
};
/* 확장자가 기본과 다른 파일 (종류:이름) */
const ASSET_EXT = { 'scene:banner': 'jpg', 'scene:forge_scene': 'jpg' };
/* PNG는 모두 무손실 WebP로 바꿨다 (픽셀 동일, 약 37% 작음). 이미 손실 압축된 WebP · JPG는 다시 압축하지 않는다 */
