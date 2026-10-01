# 강호견문록 작업 규칙 (gangho/)

## 비용 관리 (가장 중요)
- 토큰: 큰 파일은 통째로 읽지 말고 grep으로 찾아 필요한 줄만 읽는다. 작은 수정은 모아 한 번에 배포한다. 보고는 짧게.
- 테스트(`npm test`)는 유저가 요청할 때만. 배포 전에는 `node gangho/tests/check-layers.js`만.
- Higgsfield 이미지 작업은 단계를 나눈다 (퀄리티는 유지, 비용은 최소):
  1. 먼저 유저에게 "시안이 필요한지" 묻는다.
  2. 시안 필요 → 가장 싼 엔진(get_cost로 비교, 예: GPT Image 2 저화질 1k = 0.5크레딧)으로 시안 → 유저가 고르면 좋은 엔진(예: Nano Banana Pro 1k = 2크레딧)으로 확정본 → 삽입.
  3. 시안 불필요 → 좋은 엔진으로 바로 만들어 삽입.
  무료(무제한) 생성이 되면 그걸 먼저 쓴다. 게임에는 확정본만 webp로 줄여 넣고, 시안은 저장소에 넣지 않는다.

## 유저 규칙
- 수정사항은 건의만 하고 임의로 고치지 않는다 (명백한 모순은 판단해서 고친다).
- 보고는 한국어, 끝에 "제가 판단해서 정한 것"과 "건의". 건의는 바로 고를 수 있게 보기(AskUserQuestion, 여러 개 선택)로 내고, 마지막에 추가 입력 칸을 둔다.
- 비밀값을 붙여 넣게 하지 않는다. GM 암호는 환경변수 GANGHO_GM_PASS로만. 필요한 SQL은 `supabase/pending/`에 모아 둔다.

## 코드 구조 (관심사 분리 · 계층형)
- 읽는 순서 core → data → systems → ui → app. `gangho/tests/check-layers.js`가 지킨다.
- data/: 순수 데이터만. systems/: 규칙, DOM 금지. ui/: 화면, localStorage 금지. app.js: 상태 · 저장 · 틱.
- 그림 경로는 `js/data/assets.js`(목록) + `js/ui/ui_assets.js`(`ASSET.종류(이름)`)에서만. 그 밖에 'assets/' 직접 쓰기 금지.
  새 그림은 `assets/art/<종류>/`에 넣고(PNG는 무손실 WebP로 바꿔서, 손실 WebP · JPG는 다시 압축하지 않음), 안 쓰는 그림은 `node gangho/tools/assets-check.js`로 찾는다.
- 강호행 화면: ui_field.js(패널 · 기록) · ui_live.js(무대 · 걷기 · 실시간 전투) · ui_replay.js(관찰 창).

## 배포 순서
1. `node gangho/tools/stamp.js` (?v= 버전 · version.json 갱신)
2. 번들 · 검사 → 커밋 → `git push -u origin <작업 브랜치>` → 아티팩트 갱신 → PR 설명 갱신
