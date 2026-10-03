/* [화면] 로그인 · 회원가입: 인터넷에 올린 게임을 처음 열면 나온다 (아이디 · 비밀번호 · 비밀번호 확인).
   캐릭터는 명첩에 묶여 서버에 저장된다. 계정 서버를 쓸 수 없으면 '이 기기에서만 하기'로 예전처럼 할 수 있다.
   세션 보관 · 게임 열기는 app.js(authSignedIn · startGuest)가 맡는다 */
const AUTH_ID_RE = /^[a-z0-9_]{3,16}$/;
const AUTH_ERR = {
  'bad login': '아이디 또는 암호가 맞지 않습니다.',
  'id taken': '이미 쓰고 있는 아이디입니다.',
  'bad id': '아이디는 영문 소문자 · 숫자 · _ 로 3~16자입니다.',
  'bad pass': '암호는 4~64자입니다.',
  'locked': '암호를 여러 번 틀려 10분 동안 입문이 막혔습니다. 잠시 뒤 다시 시도하십시오.',
};
let authUi = { mode: 'login', busy: false, err: '', notice: '', id: '', offline: false };
function authErrText(e) {
  const m = String((e && e.message) || e);
  for (const [k, v] of Object.entries(AUTH_ERR)) if (m.includes(k)) return v;
  if (/Could not find the function|schema cache|404/.test(m)) { authUi.offline = true; return '계정 서버가 아직 준비되지 않았습니다. 잠시 뒤 다시 시도하거나, 이 기기에서만 하십시오.'; }
  if (/Failed to fetch|NetworkError|Load failed/.test(m)) { authUi.offline = true; return '서버에 닿지 않습니다. 인터넷 연결을 확인하십시오.'; }
  return `실패했습니다: ${m}`;
}
function showAuth(notice = '', id = '') {
  authUi = { ...authUi, notice, id: id || authUi.id, busy: false, err: '' };
  drawAuth();
}
function showAuthBusy(text) {
  const m = $('#modal'); m.hidden = false; m.dataset.intro = '1';
  m.innerHTML = `<div class="sheet intro auth-sheet"><p class="eyebrow">江湖見聞錄</p><h1>강호견문록</h1><p class="muted auth-busy">${esc(text)}</p></div>`;
}
function hideAuth() { const m = $('#modal'); if (m && m.querySelector('.auth-sheet')) { m.innerHTML = ''; m.hidden = true; delete m.dataset.intro; m.onclick = null; m.onsubmit = null; } }
function drawAuth() {
  const m = $('#modal'), A = authUi, join = A.mode === 'join';
  m.hidden = false; m.dataset.intro = '1';
  m.innerHTML = `<div class="sheet intro auth-sheet">
    <div class="intro-hero" aria-hidden="true"><img src="${ASSET.scene('banner')}" alt="" onerror="this.remove()"></div>
    <p class="eyebrow">江湖見聞錄 · ${join ? '入門' : '歸門'}</p>
    <h1>강호견문록</h1>
    ${A.notice ? `<p class="auth-notice">${esc(A.notice)}</p>` : ''}
    <div class="chips auth-tabs"><button type="button" class="chip ${join ? '' : 'on'}" data-authmode="login">입문</button><button type="button" class="chip ${join ? 'on' : ''}" data-authmode="join">가입하기</button></div>
    <form class="auth-form" data-authform autocomplete="on">
      <label class="field-l" for="authId">아이디 <small class="muted">영문 소문자 · 숫자 · _ 3~16자</small></label>
      <input id="authId" name="username" autocomplete="username" autocapitalize="off" spellcheck="false" maxlength="16" value="${esc(A.id)}" required>
      <label class="field-l" for="authPw">암호 <small class="muted">4자 이상</small></label>
      <input id="authPw" name="password" type="password" autocomplete="${join ? 'new-password' : 'current-password'}" maxlength="64" required>
      ${join ? `<label class="field-l" for="authPw2">암호 확인</label>
      <input id="authPw2" name="password2" type="password" autocomplete="new-password" maxlength="64" required>` : ''}
      ${A.err ? `<p class="auth-err" role="alert">${esc(A.err)}</p>` : ''}
      <button class="btn primary big" type="submit" ${A.busy ? 'disabled' : ''}>${A.busy ? '잠시만…' : join ? '가입하고 시작' : '입문'}</button>
    </form>
    <p class="muted auth-note">${join ? '캐릭터는 이 아이디에 저장되어 어느 기기에서든 이어서 할 수 있습니다. 암호는 암호화해서만 보관합니다.' : '처음이면 [가입하기]로 아이디를 만드세요.'}</p>
    ${A.offline ? '<button type="button" class="btn ghost sm" data-authguest>이 기기에서만 하기 (입문 없이)</button>' : ''}
  </div>`;
  m.onclick = e => {
    const t = e.target.closest('[data-authmode]');
    if (t) { authUi.mode = t.dataset.authmode; authUi.err = ''; authUi.id = ($('#authId') || {}).value || authUi.id; drawAuth(); return; }
    if (e.target.closest('[data-authguest]')) startGuest();
  };
  m.onsubmit = async e => {
    e.preventDefault(); if (authUi.busy) return;
    const id = ($('#authId').value || '').trim().toLowerCase(), pw = $('#authPw').value, pw2 = join ? $('#authPw2').value : pw;
    authUi.id = id;
    const bad = !AUTH_ID_RE.test(id) ? AUTH_ERR['bad id'] : pw.length < 4 || pw.length > 64 ? AUTH_ERR['bad pass'] : pw !== pw2 ? '암호 확인이 다릅니다.' : '';
    if (bad) { authUi.err = bad; drawAuth(); return; }
    authUi.busy = true; authUi.err = ''; drawAuth();
    try { const res = await (join ? accountSignup(id, pw) : accountLogin(id, pw)); authUi.busy = false; authSignedIn(res); }
    catch (err) { authUi.busy = false; authUi.err = authErrText(err); drawAuth(); }
  };
  const f = $(authUi.id ? '#authPw' : '#authId'); if (f && !('ontouchstart' in window)) f.focus();
}
/* 로그인 전 이 기기에서 하던 캐릭터가 있으면, 처음 들어온 아이디로 옮길지 묻는다 */
function authLegacyOffer(st, yes, no) {
  const m = $('#modal'); m.hidden = false; m.dataset.intro = '1';
  m.innerHTML = `<div class="sheet intro auth-sheet"><p class="eyebrow">江湖見聞錄</p><h2>이 기기에 있던 캐릭터</h2>
    <p class="story">입문하기 전에 이 기기에서 하던 제자 <b>${esc(st.name || '무명')}</b>이 있습니다. 이 아이디로 옮겨 이어서 하시겠습니까?</p>
    <p class="muted">옮기면 이 기기의 예전 저장은 아이디 쪽으로 넘어갑니다. 새로 시작하면 예전 저장은 그대로 남습니다.</p>
    <div class="btns"><button class="btn primary" data-legacy="yes">옮겨서 이어 하기</button><button class="btn ghost" data-legacy="no">새로 시작</button></div></div>`;
  m.onsubmit = null;
  m.onclick = e => {
    const b = e.target.closest('[data-legacy]'); if (!b) return;
    m.onclick = null; m.innerHTML = ''; m.hidden = true; delete m.dataset.intro;
    (b.dataset.legacy === 'yes' ? yes : no)();
  };
}
/* 로그인한 아이디와 로그아웃 단추는 설정 탭에 (viewSettings). 로그인 상태가 바뀌면 설정 화면을 다시 그린다 */
function authFooter() { if (typeof S !== 'undefined' && S && typeof ui !== 'undefined' && ui.tab === 'settings') render(); }
