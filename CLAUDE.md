# 강호견문록 작업 규칙 (gangho/)

## 비용 관리 (가장 중요)
- 토큰: 큰 파일은 통째로 읽지 말고 grep으로 찾아 필요한 줄만 읽는다. 작은 수정은 모아 한 번에 배포한다. 보고는 짧게.
- 테스트(`npm test`)는 유저가 요청할 때만. 배포 전에는 `node gangho/tests/check-layers.js`만.
- Higgsfield: 먼저 무료 방법(기존 그림 + CSS/캔버스 효과, 무료 모델)으로 시안을 만들어 보여 주고 고르게 한다.
  유료 생성은 크레딧 예상치를 말하고 허락받은 뒤에만. 게임에는 고른 것만 webp 등으로 줄여 넣고, 시안은 저장소에 넣지 않는다.

## 유저 규칙
- 수정사항은 건의만 하고 임의로 고치지 않는다 (명백한 모순은 판단해서 고친다).
- 보고는 한국어, 끝에 "제가 판단해서 정한 것"과 "건의".
- 비밀값을 붙여 넣게 하지 않는다. GM 암호는 환경변수 GANGHO_GM_PASS로만. 필요한 SQL은 `supabase/pending/`에 모아 둔다.

## 코드 구조 (관심사 분리 · 계층형)
- 읽는 순서 core → data → systems → ui → app. `gangho/tests/check-layers.js`가 지킨다.
- data/: 순수 데이터만. systems/: 규칙, DOM 금지. ui/: 화면, localStorage 금지. app.js: 상태 · 저장 · 틱.
- 그림 경로는 `js/data/assets.js`(목록) + `js/ui/ui_assets.js`(`ASSET.종류(이름)`)에서만. 그 밖에 'assets/' 직접 쓰기 금지.
  새 그림은 `assets/art/<종류>/`에 넣고, 안 쓰는 그림은 `node gangho/tools/assets-check.js`로 찾는다.
- 강호행 화면: ui_field.js(패널 · 기록) · ui_live.js(무대 · 걷기 · 실시간 전투) · ui_replay.js(관찰 창).

## 배포 순서
1. `node gangho/tools/stamp.js` (?v= 버전 · version.json 갱신)
2. 번들 · 검사 → 커밋 → `git push -u origin <작업 브랜치>` → 아티팩트 갱신 → PR 설명 갱신
