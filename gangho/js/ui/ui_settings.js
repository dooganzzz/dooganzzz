/* [화면] 설정: 유저가 고르는 플레이 방식 (S.settings에 저장 — 계정 저장에 함께 올라간다) */
const potionAtNow = () => Math.round(((S.settings && S.settings.potionAt != null) ? S.settings.potionAt : EXPEDITION.potionAt) * 100);
function viewSettings() {
  const pa = potionAtNow();
  return `<section class="panel settings-panel">
    ${head('설정', '設定')}
    <div class="set-row">
      <div class="set-label"><b>생혈고를 바를 때</b><small class="muted">전투 중 활력이 이만큼 아래로 떨어지면 생혈고를 바릅니다 (한 전투에 ${EXPEDITION.potionPerFight}개까지)</small></div>
      <label class="set-range"><input type="range" min="10" max="90" step="5" value="${pa}" data-setting="potionAt" aria-label="생혈고를 바를 활력 비율"><b class="set-val">활력 ${pa}% 이하</b></label>
    </div>
    <div class="set-row">
      <div class="set-label"><b>움직임 줄이기</b><small class="muted">화면의 움직임 · 흔들림 · 강호행 무대 연출을 멈춥니다</small></div>
      <button class="chip ${calmOn() ? 'on' : ''}" data-act="calm">${calmOn() ? '켜짐' : '꺼짐'}</button>
    </div>
    <div class="set-row">
      <div class="set-label"><b>초식 외침 두루마리</b><small class="muted">강호행 전투에서 초식을 펼칠 때마다 두루마리에 초식 이름과 시구를 띄웁니다 (그동안 전투가 잠깐 멈춤)</small></div>
      <button class="chip ${calloutOn() ? 'on' : ''}" data-act="callout">${calloutOn() ? '켜짐' : '꺼짐'}</button>
    </div>
    ${typeof AUTH !== 'undefined' && AUTH.id ? `<div class="set-row">
      <div class="set-label"><b>계정</b><small class="muted">${esc(AUTH.id)} 로그인 중</small></div>
      <button class="btn ghost sm" data-act="logout">로그아웃</button>
    </div>` : ''}
    <div class="set-row">
      <div class="set-label"><b>처음부터 다시</b><small class="muted">모든 강호의 기록을 지우고 새로 시작합니다</small></div>
      <button class="btn ghost sm danger" data-act="reset">처음부터 다시</button>
    </div>
  </section>`;
}
