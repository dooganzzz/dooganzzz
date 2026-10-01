/* [SSOT] 그림 목록: 게임이 쓰는 모든 그림의 폴더 · 확장자는 여기서만 정한다.
   화면 코드는 ui/ui_assets.js의 ASSET.종류(이름)으로만 그림 경로를 얻는다 ('assets/' 직접 쓰기는 check-layers가 막는다).
   폴더 규칙: assets/art/ 아래 sprites(전투 · 걷기 시트) · stages(전투 무대) · travel(강호행 산길) · zones(탐험지) · props(길가 소품)
   · fx(이펙트) · ui(수묵 아이콘) · portraits(얼굴) · beasts(요수) · items(아이템) · 루트(배너 · 무신상 같은 장면 그림) */
const ASSET_ROOT = 'assets/art/';
const ASSET_KIND = {
  hero:     { dir: 'sprites/hero_', ext: 'webp' },   // 병기별 제자 전투 시트
  foe:      { dir: 'sprites/foe_', ext: 'webp' },    // 요수 숨쉬기 시트 (공격 시트는 이름_atk)
  walk:     { dir: 'sprites/walk_', ext: 'webp' },   // 병기별 걷기 16컷
  stage:    { dir: 'stages/', ext: 'jpg' },
  travel:   { dir: 'travel/', ext: 'jpg' },
  prop:     { dir: 'props/', ext: 'webp' },
  fx:       { dir: 'fx/', ext: 'webp' },
  zone:     { dir: 'zones/', ext: 'jpg' },
  beast:    { dir: 'beasts/', ext: 'png' },
  item:     { dir: 'items/', ext: 'png' },
  ui:       { dir: 'ui/', ext: 'png' },
  portrait: { dir: 'portraits/', ext: 'png' },
  scene:    { dir: '', ext: 'png' },                 // banner · shrine · shrine_awake · meditation · forge_scene · alchemy_cauldron
};
/* 확장자가 기본과 다른 파일 (종류:이름) */
const ASSET_EXT = { 'hero:sword': 'png', 'foe:viper': 'png', 'foe:viper_atk': 'png', 'scene:banner': 'jpg', 'scene:forge_scene': 'jpg' };
