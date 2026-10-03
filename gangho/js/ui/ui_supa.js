/* [화면] 웹 유저 기록 (Supabase): 어디서 플레이하든(GitHub Pages · claude.ai · 파일) 캐릭터 요약을 한 표에 모은다.
   게임은 공개 키(anon)로 gangho_sync 함수만 부른다: 1분마다 접속 신호, 내용이 바뀌면 요약(과 저장)까지.
   운영자는 GM 콘솔 유저 탭에서 암호를 넣어 gangho_players로 목록을 본다 (IP는 서버가 요청에서 기록).
   SUPA.url · SUPA.key가 비어 있으면 아무것도 하지 않는다. 설정 방법: supabase/migrations/…_gangho_players.sql */
const SUPA = {
  url: 'https://fcyoqshwtvynfqxmgbrc.supabase.co',
  key: 'sb_publishable_mAeTFtAFaAiTOA9z5XGSSQ_GAsQMGw5',   // publishable 키: 공개해도 되는 키 (표는 함수로만 열린다)
};
const SUPA_ST = { lastSig: '', lastSave: '', busy: false, syncedAt: 0, err: '', pass: '', list: null, listErr: '', loading: false };
const supaOn = () => !!(SUPA.url && SUPA.key);
async function supaRpc(fn, body) {
  const r = await fetch(`${SUPA.url.replace(/\/$/, '')}/rest/v1/rpc/${fn}`, {
    method: 'POST', headers: { apikey: SUPA.key, ...(/^sb_/.test(SUPA.key) ? {} : { Authorization: `Bearer ${SUPA.key}` }), 'Content-Type': 'application/json' }, body: JSON.stringify(body),   // 새 publishable 키는 apikey 머리글만
  });
  const text = await r.text();
  if (!r.ok) throw new Error((() => { try { return JSON.parse(text).message; } catch (e) { return text || r.status; } })());
  return text ? JSON.parse(text) : null;
}
const supaSource = () => /claude|claudeusercontent/.test(location.hostname) ? 'claude.ai' : location.protocol === 'file:' ? '파일' : location.hostname;

/* 계정: 회원가입 · 로그인 · 저장 불러오기/하기 (gangho_accounts, 비밀번호는 서버에서 bcrypt) */
const accountSignup = (id, pass) => supaRpc('gangho_signup', { p_id: id, p_pass: pass });
const accountLogin = (id, pass) => supaRpc('gangho_login', { p_id: id, p_pass: pass }).then(r => { if (r && r.error) throw new Error(r.error); return r; });   // 틀리면 서버가 {error}를 돌려준다 (오류를 던지면 틀린 횟수 기록까지 되돌려지므로)
const accountLoad = (id, token) => supaRpc('gangho_load', { p_id: id, p_token: token });
const accountSave = (id, token, save) => supaRpc('gangho_save', { p_id: id, p_token: token, p_save: save });
const accountLogoutAll = pass => supaRpc('gangho_logout_all', { p_pass: pass });
const accountResetPass = (pass, id, np) => supaRpc('gangho_reset_pass', { p_pass: pass, p_id: id, p_new: np });   // 운영자: 유저 비밀번호를 임시 비밀번호로

/* 게임 → 기록 (index.html에서만) */
async function supaSync() {
  if (!supaOn() || typeof S === 'undefined' || !S || !S.cloudId || SUPA_ST.busy || document.hidden) return;
  const sum = typeof cloudSummary === 'function' ? cloudSummary() : null; if (!sum) return;
  const data = { ...sum, device: cloudUA(), source: supaSource() + (typeof AUTH !== 'undefined' && AUTH.id ? ` · ${AUTH.id}` : '') }, sig = JSON.stringify(data);
  let save = null;
  if (sig !== SUPA_ST.lastSig) {
    const blob = cloudSaveBlob();
    if (blob && blob !== SUPA_ST.lastSave) save = blob;
  }
  SUPA_ST.busy = true;
  try {
    await supaRpc('gangho_sync', { p_id: S.cloudId, p_token: S.cloudToken, p_data: sig !== SUPA_ST.lastSig ? data : null, p_save: save ? JSON.parse(save) : null });
    SUPA_ST.lastSig = sig; if (save) SUPA_ST.lastSave = save; SUPA_ST.syncedAt = Date.now(); SUPA_ST.err = '';
  } catch (e) { SUPA_ST.err = String(e.message || e); }
  SUPA_ST.busy = false;
}
// 데스크톱판(스팀)은 서버에 아무것도 보내지 않는다
if (!window.GM_REMOTE && !DESKTOP) { setTimeout(supaSync, 4000); setInterval(supaSync, 60000); document.addEventListener('visibilitychange', () => { if (!document.hidden) supaSync(); }); }

/* 운영자: 목록 불러오기 · 한 사람 저장 */
async function supaLoadPlayers(pass) {
  if (!supaOn()) return;
  SUPA_ST.pass = pass; SUPA_ST.loading = true; SUPA_ST.listErr = ''; gmSupaChanged();
  try { SUPA_ST.list = await supaRpc('gangho_players', { p_pass: pass }); }
  catch (e) { SUPA_ST.list = null; SUPA_ST.listErr = /denied/.test(e.message) ? '암호가 맞지 않습니다.'
    : /fetch|network|NetworkError/i.test(e.message) && supaSource() === 'claude.ai' ? 'claude.ai 안에서는 바깥 DB 연결이 막혀 있습니다. GitHub Pages 게임에서 바닥글을 다섯 번 누르고 운영자 암호를 넣으면 이 목록이 보입니다.'
    : `불러오지 못했습니다: ${e.message}`; }
  SUPA_ST.loading = false; gmSupaChanged();
  if (SUPA_ST.list && !SUPA_ST.timer) SUPA_ST.timer = setInterval(() => { if (typeof GM !== 'undefined' && GM.open && GM.tab === 'users' && !SUPA_ST.loading) supaLoadPlayers(SUPA_ST.pass); }, 30000);   // 유저 탭을 보는 동안 30초마다 새로
}
/* GitHub Pages 등 claude.ai 밖에서는 GM이 잠겨 있다: 바닥글을 다섯 번 누르면 운영자 암호를 묻고, 맞으면 관리자 창을 연다 (암호는 메모리에만) */
function gmUnlockAsk() {
  if (document.getElementById('gmUnlock')) return;
  const box = document.createElement('form'); box.id = 'gmUnlock'; box.className = 'gm-unlock';
  box.innerHTML = '<b>운영자 확인</b><input type="password" name="pass" placeholder="운영자 암호" autocomplete="current-password" aria-label="운영자 암호"><button class="gm-btn primary" type="submit">열기</button><button class="gm-btn" type="button" data-x>닫기</button><small></small>';
  document.body.appendChild(box); box.pass.focus();
  box.querySelector('[data-x]').onclick = () => box.remove();
  box.onsubmit = async e => {
    e.preventDefault(); const msg = box.querySelector('small'); msg.textContent = '확인 중…';
    await supaLoadPlayers(box.pass.value);
    if (!SUPA_ST.list) { msg.textContent = SUPA_ST.listErr || '열 수 없습니다.'; return; }
    box.remove(); document.body.classList.remove('gm-locked');
    if (typeof GM !== 'undefined') { GM.tab = 'users'; if (typeof gmPopout === 'function') gmPopout(); }
  };
}
async function supaPlayerSave(id) { return supaRpc('gangho_player_save', { p_pass: SUPA_ST.pass, p_id: id }); }
function gmSupaChanged() { if (typeof GM !== 'undefined' && GM.open && GM.tab === 'users') gmRender(); }

/* GM 유저 탭 안의 '웹 유저' 구역 */
function gmSupaSection() {
  if (!supaOn()) return '<h4 class="gm-h">웹 유저 (Supabase)</h4><p class="gm-muted">아직 연결되지 않았습니다. js/ui/ui_supa.js의 SUPA.url · SUPA.key를 채우면 켜집니다.</p>';
  const since = t => { if (!t) return '—'; const m = Math.round((Date.now() - new Date(t).getTime()) / 60000); return m < 1 ? '방금' : m < 60 ? `${m}분 전` : m < 1440 ? `${Math.floor(m / 60)}시간 전` : `${Math.floor(m / 1440)}일 전`; };
  const L = SUPA_ST.list, online = p => Date.now() - new Date(p.last_seen).getTime() < 150000;
  const ZN = z => (z && ZONES[z] ? ZONES[z].name : '—');
  const rows = (L || []).map((p, i) => `<tr><td>${i + 1}</td><td>${online(p) ? '<b class="gm-on">●</b>' : '<span class="gm-off">○</span>'} <code>${esc(p.id.slice(0, 8))}</code>${typeof S !== 'undefined' && S && p.id === S.cloudId ? ' <b class="gm-me">나</b>' : ''}</td>
    <td>${esc(p.name || '—')}</td><td class="gm-num">${p.cp ? fmt(p.cp) : '—'}</td><td>${esc(p.mugong || '—')} ${p.star || 0}성</td><td class="gm-num">${fmt(p.silver || 0)}</td><td>${ZN(p.zone)}</td>
    <td class="gm-num">${p.runs || 0}번 · 두목 ${p.bosses || 0}</td><td>${esc(p.ip || '—')}</td><td>${esc(p.device || '—')}</td><td>${esc(p.source || '—')}</td><td>${since(p.last_seen)}</td>
    <td class="gm-acts">${p.has_save ? `<button class="gm-btn" data-gmsupa="${esc(p.id)}">저장 불러오기</button>` : ''}</td></tr>`).join('');
  return `<h4 class="gm-h">웹 유저 (Supabase) ${L ? `· 접속 중 ${L.filter(online).length}명 / 전체 ${L.length}명` : ''}</h4>
    <form class="gm-bar" data-gmform="supa"><input type="password" name="pass" placeholder="운영자 암호" value="${esc(SUPA_ST.pass)}" autocomplete="current-password" aria-label="운영자 암호"><button class="gm-btn primary" type="submit">${SUPA_ST.loading ? '불러오는 중…' : '[목록 불러오기]'}</button>
      <button class="gm-btn" type="button" data-gmlogoutall title="모든 계정의 접속 토큰을 무효로 만든다 (새 버전 배포 때는 자동)">[전체 로그아웃]</button>
      <span class="gm-reset"><input name="rid" placeholder="유저 아이디" autocomplete="off" aria-label="비밀번호를 초기화할 아이디"><input name="rpw" placeholder="임시 비밀번호 (4자 이상)" autocomplete="off" aria-label="임시 비밀번호"><button class="gm-btn" type="button" data-gmresetpass title="그 아이디의 비밀번호를 임시 비밀번호로 바꾸고 접속을 끊는다">[비밀번호 초기화]</button></span>
      <small class="gm-muted">${SUPA_ST.listErr ? esc(SUPA_ST.listErr) : `내 기록: ${SUPA_ST.syncedAt ? since(SUPA_ST.syncedAt) : '아직'}${SUPA_ST.err ? ` · 오류 ${esc(SUPA_ST.err)}` : ''}`}</small></form>
    ${L ? `<table class="gm-table"><thead><tr><th>#</th><th>ID</th><th>캐릭터</th><th>투력</th><th>무공</th><th>은자</th><th>탐험지</th><th>탐험</th><th>IP</th><th>기기</th><th>접속 경로</th><th>마지막 접속</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="13" class="gm-muted">아직 기록이 없습니다.</td></tr>'}</tbody></table>` : ''}`;
}
/* 기록을 켜면 바닥글에 알린다 */
if (!window.GM_REMOTE && supaOn()) document.addEventListener('DOMContentLoaded', () => { const f = document.querySelector('.footer .muted'); if (f) f.insertAdjacentHTML('afterend', '<small class="muted supa-note">플레이 기록(캐릭터 요약 · 접속 IP)은 운영과 밸런스 확인에만 쓰입니다.</small>'); });
/* 잠긴 곳(PC · 휴대폰 모두): 바닥글을 2초 안에 다섯 번 누르면 운영자 암호를 묻는다 */
if (!window.GM_REMOTE && supaOn()) { let taps = []; document.addEventListener('click', e => {
  if (!document.body.classList.contains('gm-locked') || !e.target.closest || !e.target.closest('.footer')) return;
  const t = Date.now(); taps = taps.filter(x => t - x < 2000); taps.push(t); if (taps.length >= 5) { taps = []; gmUnlockAsk(); } }); }
