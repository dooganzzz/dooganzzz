/* [화면] 운영자 통합 디버그 콘솔 (GM): 유저 상태 · 행동 추적 · 아이템 DB · 조합법 · 쾌속 치트
   두 가지로 띄운다.
   ① 별도 창 (admin.html): 우측 하단 [GM] 버튼이 새 창으로 연다 (admin.html을 직접 열어도 됨). 같은 출처의 게임 창과
      BroadcastChannel로 이어져 게임이 1초마다 상태·추적을 보내고, 관리자 창은 명령만 보낸다.
      게임을 새로고침·초기화해도 관리자 창과 추적 기록은 남고 다시 이어진다.
   ② 게임 안 오버레이: 새 창이 막혔을 때(팝업 차단 등)만 대신 띄운다. 게임 안 단축키는 없다 (유저 요청)
   값 주입은 언제나 게임 쪽에서 기존 시스템 함수(give·startRun·advanceRun·clampVitals·doReset …)로 실행한다 (GM_CMDS). */

/* 출시 때 false로 두면 버튼·단축키가 모두 사라진다 */
const GM_ENABLED = true;
/* admin.html(별도 창)에서 읽히면 true: 상태는 받은 복사본, 조작은 게임에 명령으로 보낸다 */
const GM_REMOTE = !!window.GM_REMOTE;
const GM_CHANNEL = 'gangho-gm';

const GM = { open: false, tab: 'users', trace: [], itemQ: '', itemKind: 'all', recipeCraft: 'all', resetArm: false, aiPattern: 'life', aiReport: null, aiBusy: false, dbTab: 'monsters' };
const GM_TABS = [['users', '유저'], ['ai', 'AI 자동 플레이'], ['trace', '행동 추적'], ['items', '아이템 DB'], ['db', '게임 DB'], ['recipes', '조합법'], ['cheat', '쾌속 치트']];
const GM_TRACE_MAX = 300;
const GM_KIND = { tab: '탭', view: '화면', click: '클릭', battle: '전투', 'item+': '획득', 'item-': '소모', warn: '경고', notice: '알림', error: '예외', gm: 'GM', sys: '시스템' };

/* ───────── 행동 추적: 견문록과 완전히 분리된 기록 (최신이 위, 저장하지 않음) ───────── */
function gmTrace(kind, text) {
  GM.trace.unshift({ t: Date.now(), kind, text: String(text) });
  if (GM.trace.length > GM_TRACE_MAX) GM.trace.length = GM_TRACE_MAX;
  if (!GM_REMOTE) gmPost({ type: 'trace', entry: GM.trace[0] });
  if (GM.open && GM.tab === 'trace') gmRenderTrace();
}
const gmTime = t => { const d = new Date(t); return `${hhmm(t)}:${String(d.getSeconds()).padStart(2, '0')}.${String(d.getMilliseconds()).padStart(3, '0')}`; };
Bus.on('trace', (kind, text) => gmTrace(kind, text));
Bus.on('view', patch => { if (patch.tab) gmTrace('view', `화면 전환 → ${patch.tab}${patch.sectSub ? ' › ' + patch.sectSub : ''}`); if ('modal' in patch) gmTrace('view', `창 ${patch.modal ? '열기 → ' + patch.modal : '닫기'}`); });
Bus.on('toast', text => gmTrace('notice', text));
Bus.on('log', e => { if (/\bbad\b/.test(e.cls)) gmTrace('warn', e.text.replace(/<[^>]+>/g, '')); });


/* ───────── 여닫기 ───────── */
/* 인터넷에 올린 게임(claude.ai 아티팩트 등)에서는 주인·편집자에게만 콘솔을 연다. 파일로 직접 연 개발 화면은 늘 연다 */
const gmLocked = () => document.body.classList.contains('gm-locked');
function gmToggle(force) {
  if (gmLocked() && force !== false) return;
  GM.open = force === undefined ? !GM.open : force;
  GM.resetArm = false;
  const panel = $('#gmPanel'); if (!panel) return;
  panel.hidden = !GM.open;
  $('#gmToggle').setAttribute('aria-expanded', String(GM.open));
  if (GM.open) gmRender();
  gmTrace('gm', GM.open ? '콘솔 열기' : '콘솔 닫기');
}

/* ───────── 그리기 ───────── */
function gmRender() {
  const panel = $('#gmPanel'); if (!panel) return;
  const tabs = GM_TABS.map(([id, name]) => `<button class="gm-tab ${GM.tab === id ? 'on' : ''}" data-gmtab="${id}" role="tab" aria-selected="${GM.tab === id}">${name}</button>`).join('');
  const body = !S && !['trace', 'cheat', 'users', 'db'].includes(GM.tab) ? '<p class="gm-muted">게임을 시작하면 볼 수 있습니다.</p>'
    : ({ users: gmViewUsers, ai: gmViewAI, trace: gmViewTrace, items: gmViewItems, db: gmViewDB, recipes: gmViewRecipes, cheat: gmViewCheat })[GM.tab]();
  panel.innerHTML = `<div class="gm-box" role="dialog" aria-label="운영자 콘솔">
    <div class="gm-top"><b>GM 콘솔</b>${GM_REMOTE ? `<small id="gmConn" class="gm-conn">연결 중…</small>` : `<small>새 창이 막혀 게임 안에 띄웠습니다</small><button class="gm-btn gm-pop" data-gm="popout" title="관리자 창을 따로 띄웁니다">새 창 ↗</button><button class="gm-x" data-gm="close" aria-label="닫기">✕</button>`}</div>
    <div class="gm-tabs" role="tablist">${tabs}</div>
    <div class="gm-body">${body}</div>
  </div>`;
  if (GM.tab === 'trace') gmRenderTrace();
  if (GM.tab === 'items') gmRenderItems();
}

/* ───────── 명령: 오버레이에선 바로, 별도 창에선 게임에 보내 게임 쪽에서 실행 ───────── */
const GM_CMDS = {
  apply(vals) {
    if (!S) return;
    const changed = [];
    for (const [k, n] of GM_FIELDS) {
      if (!(k in vals) || Math.round(S[k]) === vals[k]) continue;
      S[k] = Math.max(0, vals[k]); changed.push(`${n} ${S[k]}`);
    }
    clampVitals();
    gmTrace('gm', changed.length ? `상태 적용: ${changed.join(', ')}` : '상태 적용: 바뀐 값 없음');
  },
  spawn(id, n) {
    if (!S || !ITEMS[id]) return;
    const ok = give(id, n, true);
    gmTrace('gm', ok ? `소환: ${id} ×${n} → 보유 ${count(id)}` : `소환 실패 (행낭 가득): ${id}`);
  },
  mats(rid) {
    const r = RECIPES.find(x => x.id === rid); if (!S || !r) return;
    for (const [id, n] of Object.entries(r.in)) give(id, n, true);
    gmTrace('gm', `재료 지급: ${rid} ← ${Object.entries(r.in).map(([id, n]) => `${id}×${n}`).join(', ')}`);
  },
  ai(days, pattern) {
    if (!S) return;
    backupSave('ai');
    GM.aiReport = aiRun(days, pattern);
    gmTrace('gm', `AI 자동 플레이 ${days}일: 투력 ${GM.aiReport.before.cp} → ${GM.aiReport.after.cp} (${GM.aiReport.ms}ms)`);
  },
  airestore() { if (restoreSave('ai')) { GM.aiReport = null; gmTrace('gm', 'AI 실행 전 저장으로 되돌림'); } else gmTrace('warn', '되돌릴 백업이 없습니다'); },
  importplayer(pid) {
    const p = (CLOUD.players || []).find(x => x.id === pid); if (!p || !p.save) return gmTrace('warn', '이 유저의 저장이 DB에 없습니다');
    if (importSave(JSON.parse(p.save))) gmTrace('gm', `DB 저장 불러오기: ${p.name} (지금 저장은 백업해 둠)`);
  },
  importobj(st) { if (importSave(st)) gmTrace('gm', `웹 유저 저장 불러오기: ${st.name} (지금 저장은 백업해 둠)`); else gmTrace('warn', '저장 형식이 맞지 않습니다'); },
  importundo() { if (restoreSave('import')) gmTrace('gm', '불러오기 전 저장으로 되돌림'); },
  cheat(what) {
    if (what === 'reset') { gmTrace('gm', '데이터 완전 초기화'); doReset(); return; }
    if (!S) return;
    if (what === 'silver') { S.silver += 1000; gmTrace('gm', `은자 +1000 → ${S.silver}`); }
    if (what === 'heal') { const st = calcStats(); S.hp = st.maxHp; S.mp = st.maxMp; gmTrace('gm', `활력·내력 회복 → ${st.maxHp} / ${st.maxMp}`); }
    if (what === 'stamina') { S.stamina = calcStats().maxSta; gmTrace('gm', `기력 → ${S.stamina}`); }
    if (what === 'exp') { S.exp += 1000; gmTrace('gm', `수련치 +1000 → ${S.exp}`); }
    if (what.startsWith('move_')) {                         // 초식 100%: 끔 · 섞어서 · 한 초식만
      const k = what.slice(5); if (k === 'off') delete S.gmMove; else S.gmMove = k === 'mix' ? 'mix' : +k;
      gmTrace('gm', `초식 100%: ${k === 'off' ? '끔 (35% · 60/30/10)' : k === 'mix' ? '매번 발동 · 60/30/10' : MOVE_NAME[+k] + '만 매번'} — 내력이 모자라도 펼침`);
    }
    if (what === 'expedite') {                               // 강호행이 없으면 지금 떠나고, 있으면 다음 걸음을 곧바로 치른다
      if (!S.expedition.zone) S.expedition.zone = 'cheongpung';
      let r = activeRun();
      if (!r) { r = startRun(now()); gmTrace('gm', `강호행 시작: ${r.zone}`); }
      r.next = now(); advanceRun();
      gmTrace('gm', `걸음 ${r.steps.length} · ${r.live ? '진행 중' : r.end}`);
      notify.view({ tab: 'field' });
    }
    if (what === 'hour' || what === 'hours8') {               // 다음 걸음 시각을 앞당겨 실제 진행 경로(advanceRun)를 그대로 탄다
      const h = what === 'hour' ? 1 : 8, r = activeRun();
      if (!r) { gmTrace('warn', '강호행 중이 아닙니다'); return; }
      const n0 = r.steps.length; r.next -= h * 3600000; advanceRun();
      gmTrace('gm', `${h}시간 경과: 걸음 ${r.steps.length - n0} · ${r.live ? '진행 중' : `끝 (${r.end})`}`);
      notify.view({ tab: 'field' });
    }
  },
};
function gmDo(cmd, ...args) {
  if (GM_REMOTE) { gmPost({ type: 'cmd', cmd, args }); gmTrace('sys', `명령 보냄: ${cmd} ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}`); return; }
  gmRunCmd(cmd, args);
}
function gmRunCmd(cmd, args) {
  if (!GM_CMDS[cmd]) return;
  GM_CMDS[cmd](...args);
  if (cmd === 'cheat' && args[0] === 'reset') return;
  notify.refresh(); notify.save();
  if (GM.open) gmRender();
  gmBroadcast();
}

/* ───────── 별도 창과의 연결 (BroadcastChannel) ───────── */
let gmChan = null;
function gmPost(msg) { if (gmChan) try { gmChan.postMessage(msg); } catch (e) { /* 복제할 수 없는 값 */ } }
function gmOpenChannel(onMessage) {
  if (!('BroadcastChannel' in window)) return false;
  try { gmChan = new BroadcastChannel(GM_CHANNEL); gmChan.onmessage = e => onMessage(e.data || {}); return true; } catch (e) { gmChan = null; return false; }
}
/* 게임 → 관리자 창: 저장 상태 S 전체와 전투 요약 */
function gmBroadcast() {
  if (GM_REMOTE || !gmChan) return;
  const b = RT.battle;
  gmPost({ type: 'state', S, ai: GM.aiReport, battle: b ? { eid: b.eid, round: b.round, over: b.over, win: b.win } : null, at: Date.now() });
}
function gmPopout() {
  const w = window.open('admin.html', 'ganghoGM', 'width=880,height=940');
  if (!w) { notify.toast('새 창이 막혀 게임 안에 띄웁니다. 브라우저에서 팝업을 허용하거나 admin.html을 직접 여십시오.'); gmTrace('warn', '관리자 창 팝업 차단'); if (!GM.open) gmToggle(true); return; }
  gmTrace('gm', '관리자 창 열기 (admin.html)');
  gmToggle(false);
}

/* 관리자 창(admin.html) 쪽 시작: 받은 복사본으로 같은 화면을 그린다 */
/* GM 창(admin.html)도 새 버전을 알아채면 스스로 다시 연다 (옛 GM 창이 남아 옛 탭 · 옛 코드로 도는 일이 없게) */
function gmCheckVersion() {
  if (!/^https?:$/.test(location.protocol) || /claude/.test(location.hostname) || typeof fetch !== 'function') return;
  const meta = document.querySelector('meta[name="game-ver"]'), cur = meta && meta.content; if (!cur) return;
  fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(j => {
    if (!j || !j.v || j.v === cur || new URLSearchParams(location.search).get('v') === j.v) return;
    location.replace(`${location.pathname}?v=${j.v}${location.hash}`);
  }).catch(() => {});
}
function gmRemoteInit() {
  gmCheckVersion(); setInterval(gmCheckVersion, 60000);
  GM.open = true;
  const panel = $('#gmPanel');
  let lastSeen = 0, drawn = false, hadS = null;
  gmBindPanel(panel);
  const status = () => { const el = $('#gmConn'); if (!el) return; const live = Date.now() - lastSeen < 2500;
    el.textContent = live ? (S ? `● 연결됨 · ${S.name}` : '● 연결됨 · 시작 화면') : '○ 게임 창을 기다리는 중'; el.classList.toggle('off', !live); };
  const ok = gmOpenChannel(msg => {
    lastSeen = Date.now();
    if (msg.type === 'trace') { GM.trace.unshift(msg.entry); if (GM.trace.length > GM_TRACE_MAX) GM.trace.length = GM_TRACE_MAX; if (GM.tab === 'trace') gmRenderTrace(); }
    if (msg.type === 'backlog' && !GM.trace.length) { GM.trace = msg.trace.slice(0, GM_TRACE_MAX); if (GM.tab === 'trace') gmRenderTrace(); }
    if (msg.type === 'state') {
      S = msg.S; RT.battle = msg.battle; if (msg.ai !== undefined && msg.ai !== GM.aiReport) { GM.aiReport = msg.ai; if (GM.tab === 'ai') gmRender(); }
      if (!drawn || hadS !== !!S) { gmRender(); drawn = true; hadS = !!S; }
      else if (GM.tab === 'items') gmRenderItems();
      else if (GM.tab === 'cheat') gmRender();
    }
    status();
  });
  gmRender(); status();
  if (!ok) { $('#gmConn').textContent = '이 브라우저는 창 사이 연결(BroadcastChannel)을 지원하지 않습니다'; return; }
  gmPost({ type: 'hello' });
  setInterval(() => { if (Date.now() - lastSeen > 2500) gmPost({ type: 'hello' }); status(); }, 1000);
}

/* ───────── 입력 ───────── */
function gmInit() {
  if (!GM_ENABLED || $('#gmPanel')) return;
  document.body.insertAdjacentHTML('beforeend', `<button id="gmToggle" class="gm-toggle" aria-expanded="false" aria-controls="gmPanel" title="운영자 콘솔 (새 창)">GM</button><div id="gmPanel" class="gm-panel" hidden></div>`);
  $('#gmToggle').addEventListener('click', () => (GM.open ? gmToggle(false) : gmPopout()));   // 새 창으로 (막히면 게임 안에)
  gmBindPanel($('#gmPanel'));
  // 관리자 창(admin.html)과 연결: 인사가 오면 추적 기록을 넘기고, 명령이 오면 게임 쪽에서 실행한다
  gmOpenChannel(msg => {
    if (msg.type === 'hello') { gmPost({ type: 'backlog', trace: GM.trace }); gmBroadcast(); }
    if (msg.type === 'cmd') { gmTrace('gm', `관리자 창 명령: ${msg.cmd}`); gmRunCmd(msg.cmd, msg.args || []); }
  });
  setInterval(gmBroadcast, 1000);
  // 게임 안 단축키는 없다 (유저 요청). 게임 안에 띄운 콘솔만 Esc로 닫는다. 캡처 단계에서 먼저 받아 게임의 Esc 처리와 겹치지 않게 한다.
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && GM.open) { e.stopPropagation(); gmToggle(false); }
  }, true);
  gmBindGameTrace();
}

/* 콘솔 패널의 클릭·입력 (오버레이·별도 창 공용) */
function gmBindPanel(panel) {
  panel.addEventListener('click', e => {
    if (!GM_REMOTE && e.target === panel) return gmToggle(false);   // 바깥(어두운 막) 누르면 닫기
    const t = e.target.closest('button'); if (!t) return;
    const d = t.dataset;
    if (d.gmtab) { GM.tab = d.gmtab; GM.resetArm = false; return gmRender(); }
    if (d.gm === 'close') return gmToggle(false);
    if (d.gm === 'popout') return gmPopout();
    if (d.gm === 'cleartrace') { GM.trace = []; return gmRenderTrace(); }
    if (d.gmspawn) return gmSpawn(d.gmspawn, +d.n);
    if (d.gmcraft) { GM.recipeCraft = d.gmcraft; return gmRender(); }
    if (d.gmmats) return gmGiveMats(d.gmmats);
    if (d.gmai) { GM.aiBusy = true; gmRender(); setTimeout(() => { gmDo('ai', +d.gmai, GM.aiPattern); GM.aiBusy = false; gmRender(); }, 30); return; }
    if (d.gmaipat) { GM.aiPattern = d.gmaipat; return gmRender(); }
    if (d.gmdbtab) { GM.dbTab = d.gmdbtab; return gmRender(); }
    if (d.gmimport) return gmDo('importplayer', d.gmimport);
    if (t.closest('[data-gmresetpass]')) {                 // 운영자: 유저 비밀번호 초기화 (임시 비밀번호를 유저에게 따로 알려 준다)
      const f = t.closest('form'), id = (f.rid.value || '').trim().toLowerCase(), np = f.rpw.value || '';
      if (!SUPA_ST.pass) { gmTrace('warn', '운영자 암호를 먼저 넣으십시오'); return; }
      if (!id || np.length < 4) { gmTrace('warn', '아이디와 4자 이상의 임시 비밀번호를 넣으십시오'); return; }
      accountResetPass(SUPA_ST.pass, id, np).then(() => { gmTrace('gm', `${id} 비밀번호를 임시 비밀번호로 바꿨습니다 — 그 계정은 로그아웃됨`); f.rpw.value = ''; },
        e => gmTrace('warn', `초기화 실패: ${/no such id/.test(e.message) ? '없는 아이디' : /denied/.test(e.message) ? '운영자 암호가 틀림' : e.message}`));
      return;
    }
    if (t.closest('[data-gmlogoutall]')) { if (!SUPA_ST.pass) { gmTrace('warn', '운영자 암호를 먼저 넣으십시오'); return; } accountLogoutAll(SUPA_ST.pass).then(n => gmTrace('gm', `전체 로그아웃 (차수 ${n}) — 모든 유저가 다시 로그인해야 합니다`), e => gmTrace('warn', `전체 로그아웃 실패: ${e.message}`)); return; }
    if (d.gmsupa) { supaPlayerSave(d.gmsupa).then(st => st ? gmDo('importobj', st) : gmTrace('warn', '저장이 비어 있습니다'), e => gmTrace('warn', `저장을 받지 못했습니다: ${e.message}`)); return; }
    if (d.gm === 'airestore' || d.gm === 'importundo') return gmDo(d.gm);
    if (d.gm === 'cloudsync') { cloudSync(true); return; }
    if (d.gm) return gmCheat(d.gm);
  });
  panel.addEventListener('submit', e => { e.preventDefault(); if (e.target.dataset.gmform === 'state' && S) gmApplyState(e.target); if (e.target.dataset.gmform === 'supa') supaLoadPlayers(e.target.elements.pass.value); });
  panel.addEventListener('input', e => { const k = e.target.dataset.gminput; if (k) { GM[k] = e.target.value; gmRenderItems(); } });
}

/* 게임 화면의 클릭·예외 추적 (게임 창에서만) */
function gmBindGameTrace() {
  // 게임 화면의 클릭(버튼·탭)을 추적한다. GM 콘솔 안의 클릭은 제외
  document.addEventListener('click', e => {
    if (e.target.closest('#gmPanel, #gmToggle')) return;
    const t = e.target.closest('button, [data-tab], [data-manual], [data-mart], [data-fold]'); if (!t) return;
    const attrs = Object.entries(t.dataset).map(([k, v]) => `${k}=${v}`).join(' ');
    gmTrace('click', `${t.textContent.replace(/\s+/g, ' ').trim().slice(0, 30) || t.tagName}${attrs ? ` [${attrs}]` : ''}${t.disabled ? ' (비활성)' : ''}`);
  }, true);
  window.addEventListener('error', e => gmTrace('error', `${e.message} @ ${(e.filename || '').split('/').pop()}:${e.lineno}`));
  window.addEventListener('unhandledrejection', e => gmTrace('error', `Promise: ${e.reason && e.reason.message || e.reason}`));
  gmTrace('sys', '콘솔 준비');
}
