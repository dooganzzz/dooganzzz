/* [화면] 운영자 통합 디버그 콘솔 (GM): 유저 상태 · 행동 추적 · 아이템 DB · 조합법 · 쾌속 치트
   두 가지로 띄운다.
   ① 게임 안 오버레이: 우측 하단 [GM] 버튼, 또는 F1 / ` / ~ 키로 여닫는다.
   ② 별도 창 (admin.html): 오버레이의 [새 창 ↗] 또는 admin.html을 직접 연다. 같은 출처의 게임 창과
      BroadcastChannel로 이어져 게임이 1초마다 상태·추적을 보내고, 관리자 창은 명령만 보낸다.
      게임을 새로고침·초기화해도 관리자 창과 추적 기록은 남고 다시 이어진다.
   값 주입은 언제나 게임 쪽에서 기존 시스템 함수(give·startRun·advanceRun·clampVitals·doReset …)로 실행한다 (GM_CMDS). */

/* 출시 때 false로 두면 버튼·단축키가 모두 사라진다 */
const GM_ENABLED = true;
/* admin.html(별도 창)에서 읽히면 true: 상태는 받은 복사본, 조작은 게임에 명령으로 보낸다 */
const GM_REMOTE = !!window.GM_REMOTE;
const GM_CHANNEL = 'gangho-gm';

const GM = { open: false, tab: 'state', trace: [], itemQ: '', itemKind: 'all', recipeCraft: 'all', resetArm: false, aiPattern: 'life', aiReport: null, aiBusy: false, dbTab: 'monsters' };
const GM_TABS = [['state', '유저 상태'], ['users', '유저'], ['ai', 'AI 자동 플레이'], ['trace', '행동 추적'], ['items', '아이템 DB'], ['db', '게임 DB'], ['recipes', '조합법'], ['cheat', '쾌속 치트']];
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
Bus.on('tick', () => { if (GM.open && GM.tab === 'state') gmRenderLive(); });

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
    : ({ state: gmViewState, users: gmViewUsers, ai: gmViewAI, trace: gmViewTrace, items: gmViewItems, db: gmViewDB, recipes: gmViewRecipes, cheat: gmViewCheat })[GM.tab]();
  panel.innerHTML = `<div class="gm-box" role="dialog" aria-label="운영자 콘솔">
    <div class="gm-top"><b>GM 콘솔</b>${GM_REMOTE ? `<small id="gmConn" class="gm-conn">연결 중…</small>` : `<small>F1 · \` 로 여닫기</small><button class="gm-btn gm-pop" data-gm="popout" title="관리자 창을 따로 띄웁니다">새 창 ↗</button><button class="gm-x" data-gm="close" aria-label="닫기">✕</button>`}</div>
    <div class="gm-tabs" role="tablist">${tabs}</div>
    <div class="gm-body">${body}</div>
  </div>`;
  if (GM.tab === 'state') gmRenderLive();
  if (GM.tab === 'trace') gmRenderTrace();
  if (GM.tab === 'items') gmRenderItems();
}

/* 1. 유저 상태: 요약·장착 무공·행낭·원시 데이터는 1초마다 갱신, 입력 칸은 그대로 둔다 */
const GM_FIELDS = [['silver', '은자'], ['hp', '활력'], ['mp', '내력'], ['stamina', '기력'], ['contrib', '공헌도']];
function gmViewState() {
  return `<form class="gm-edit" data-gmform="state">${GM_FIELDS.map(([k, n]) => `<label>${n}<input type="number" name="${k}" value="${Math.round(S[k])}" step="1"></label>`).join('')}<button class="gm-btn primary" type="submit">[적용]</button></form>
    <div id="gmLive"></div>
    <details class="gm-raw" open><summary>원시 데이터 (S)</summary><pre id="gmRaw"></pre></details>`;
}
function gmRenderLive() {
  const box = $('#gmLive'), raw = $('#gmRaw'); if (!box || !S) return;
  const st = calcStats();
  const row = (k, v) => `<div><span>${k}</span><b>${v}</b></div>`;
  const arts = CAT_ORDER.map(c => { const id = S.active[c], m = id && S.manuals[id];
    return `<tr><td>${CATS[c].name}</td><td><code>${id || '—'}</code></td><td>${id ? MANUALS[id].name : ''}</td><td>${m ? m.star + '성' : ''}</td><td>${m ? (m.star >= MAX_STAR ? '대성' : `다음 ${fmt(starCost(id))}${GATES[m.star] ? ' + ' + GATES[m.star] : ''}${starUpBlock(id) ? '' : ' ✔'}`) : ''}</td></tr>`; }).join('');
  const X = S.expedition, run = activeRun();
  const inv = Object.entries(S.inv).map(([id, n]) => `<span class="gm-chip"><code>${id}</code> ×${n}</span>`).join('') || '<span class="gm-muted">비어 있음</span>';
  box.innerHTML = `<div class="gm-kv">${row('전투력', fmt(calculateCombatPower(S)))}${row('활력', `${Math.round(S.hp)} / ${st.maxHp}`)}${row('내력', `${Math.round(S.mp)} / ${st.maxMp}`)}${row('기력', `${Math.round(S.stamina)} / ${st.maxSta}`)}${row('은자', fmt(S.silver))}${row('공헌도', fmt(S.contrib))}${row('수련치', fmt(S.exp))}${row('탐험지', X.zone || '미정')}${row('강호행', run ? `${Math.floor((now() - run.at) / 60000)}분째 · ${run.steps.length}걸음` : '대기')}${row('기록', `${S.expeditions.length} / ${EXPEDITION.keep}`)}${row('행낭', `${bagUsed()} / ${bagCap()}칸`)}</div>
    <table class="gm-table"><thead><tr><th>분류</th><th>ID</th><th>무공</th><th>성</th><th>다음 성급</th></tr></thead><tbody>${arts}</tbody></table>
    <div class="gm-chips">${inv}</div>
    ${S.gear.length ? `<div class="gm-chips">${S.gear.map(g => `<span class="gm-chip">uid ${g.uid} · ${g.name}${g.enh ? ' +' + g.enh : ''}</span>`).join('')}</div>` : ''}`;
  const keep = raw.scrollTop;
  raw.textContent = JSON.stringify({ ...S, log: `[견문록 ${S.log.length}줄 생략]` }, null, 2);
  raw.scrollTop = keep;
}
function gmApplyState(form) {
  const vals = {};
  for (const [k] of GM_FIELDS) { const v = Number(form.elements[k].value); if (Number.isFinite(v)) vals[k] = v; }
  gmDo('apply', vals);
}

/* 2. 행동 추적 */
function gmViewTrace() {
  const kinds = Object.keys(GM_KIND);
  return `<div class="gm-bar"><button class="gm-btn" data-gm="cleartrace">[로그 비우기]</button><small class="gm-muted">최신이 위 · 최대 ${GM_TRACE_MAX}줄 · 견문록과 별개</small></div>
    <div class="gm-legend">${kinds.map(k => `<span class="gm-k k-${k.replace(/\W/g, '')}">${GM_KIND[k]}</span>`).join('')}</div>
    <ol class="gm-trace" id="gmTrace"></ol>`;
}
function gmRenderTrace() {
  const el = $('#gmTrace'); if (!el) return;
  el.innerHTML = GM.trace.length ? GM.trace.map(r => `<li><time>${gmTime(r.t)}</time><span class="gm-k k-${r.kind.replace(/\W/g, '')}">${GM_KIND[r.kind] || r.kind}</span><span>${esc(r.text)}</span></li>`).join('') : '<li class="gm-muted">기록 없음</li>';
}

/* 3. 아이템 DB · 소환 */
function gmViewItems() {
  const kinds = ['all', ...new Set(Object.values(ITEMS).map(I => I.kind))];
  return `<div class="gm-bar"><input type="search" placeholder="ID·이름 검색" value="${esc(GM.itemQ)}" data-gminput="itemQ" aria-label="아이템 검색">
    <select data-gminput="itemKind" aria-label="분류">${kinds.map(k => `<option value="${k}" ${GM.itemKind === k ? 'selected' : ''}>${k === 'all' ? '전체 분류' : k}</option>`).join('')}</select></div>
    <table class="gm-table"><thead><tr><th>ID</th><th>이름</th><th>분류</th><th>가치</th><th>보유</th><th></th></tr></thead><tbody id="gmItemRows"></tbody></table>`;
}
function gmRenderItems() {
  const el = $('#gmItemRows'); if (!el) return;
  const q = GM.itemQ.trim().toLowerCase();
  const rows = Object.entries(ITEMS).filter(([id, I]) => (GM.itemKind === 'all' || I.kind === GM.itemKind) && (!q || id.toLowerCase().includes(q) || I.name.includes(q)));
  el.innerHTML = rows.map(([id, I]) => `<tr><td><code>${id}</code></td><td>${I.icon} ${I.name}</td><td>${I.kind}${I.craftType ? ' · ' + I.craftType : ''}</td><td class="gm-num">${I.price}</td><td class="gm-num">${count(id)}</td>
    <td class="gm-acts"><button class="gm-btn" data-gmspawn="${id}" data-n="1">+1 소환</button><button class="gm-btn" data-gmspawn="${id}" data-n="10">+10 소환</button></td></tr>`).join('')
    || '<tr><td colspan="6" class="gm-muted">맞는 아이템이 없습니다.</td></tr>';
}
function gmSpawn(id, n) { if (ITEMS[id]) gmDo('spawn', id, n); }

/* 4. 조합법 */
function gmViewRecipes() {
  const crafts = ['all', ...Object.keys(CRAFTS)];
  const list = RECIPES.filter(r => GM.recipeCraft === 'all' || r.craft === GM.recipeCraft);
  return `<div class="gm-bar">${crafts.map(c => `<button class="gm-btn ${GM.recipeCraft === c ? 'on' : ''}" data-gmcraft="${c}">${c === 'all' ? '전체' : CRAFTS[c].name}</button>`).join('')}<small class="gm-muted">${list.length}종</small></div>
    <table class="gm-table"><thead><tr><th>ID</th><th>기예</th><th>재료</th><th>결과</th><th>도감</th><th></th></tr></thead><tbody>${list.map(r => `<tr>
      <td><code>${r.id}</code></td><td>${CRAFTS[r.craft].name}</td>
      <td>${Object.entries(r.in).map(([id, n]) => `${ITEMS[id].name} ×${n}`).join(', ')}</td>
      <td>${recipeIcon(r)} ${recipeName(r)}</td><td>${S.codex.includes(r.id) ? '해금' : '—'}</td>
      <td class="gm-acts"><button class="gm-btn" data-gmmats="${r.id}">필요 재료 지급</button></td></tr>`).join('')}</tbody></table>`;
}
function gmGiveMats(rid) { gmDo('mats', rid); }

/* 5. 쾌속 치트 */
function gmViewCheat() {
  const zone = S && S.expedition.zone;
  return `<div class="gm-cheats">
    <button class="gm-btn big" data-gm="silver" ${S ? '' : 'disabled'}>[은자 +1,000냥]</button>
    <button class="gm-btn big" data-gm="exp" ${S ? '' : 'disabled'}>[수련치 +1,000]</button>
    <button class="gm-btn big" data-gm="heal" ${S ? '' : 'disabled'}>[활력/내력 100% 회복]</button>
    <button class="gm-btn big" data-gm="stamina" ${S ? '' : 'disabled'}>[기력 가득]</button>
    <button class="gm-btn big" data-gm="expedite" ${S ? '' : 'disabled'}>[강호행 시작 · 다음 걸음 즉시]</button>
    <button class="gm-btn big" data-gm="hour" ${zone ? '' : 'disabled'}>[1시간 경과 (강호행 중)]</button>
    <button class="gm-btn big" data-gm="hours8" ${zone ? '' : 'disabled'}>[8시간 경과 (강호행 중)]</button>
    <button class="gm-btn big danger ${GM.resetArm ? 'armed' : ''}" data-gm="reset">${GM.resetArm ? '[정말 초기화 — 한 번 더 누르기]' : '[데이터 완전 초기화]'}</button>
  </div>
  <p class="gm-muted">${zone ? `탐험지 ${zone} · 기력 ${Math.round(S.stamina)}` : '탐험지가 없으면 [탐험 즉시 1회]는 청풍산으로 보냅니다.'}</p>`;
}
function gmCheat(what) {
  if (what === 'reset' && !GM.resetArm) { GM.resetArm = true; gmRender(); return; }
  GM.resetArm = false;
  gmDo('cheat', what);
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
    gmTrace('gm', `AI 자동 플레이 ${days}일: 전투력 ${GM.aiReport.before.cp} → ${GM.aiReport.after.cp} (${GM.aiReport.ms}ms)`);
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
  if (!w) { notify.toast('팝업이 막혔습니다. 브라우저에서 팝업을 허용하거나 admin.html을 직접 여십시오.'); gmTrace('warn', '관리자 창 팝업 차단'); return; }
  gmTrace('gm', '관리자 창 열기 (admin.html)');
  gmToggle(false);
}

/* 관리자 창(admin.html) 쪽 시작: 받은 복사본으로 같은 화면을 그린다 */
function gmRemoteInit() {
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
      else if (GM.tab === 'state') gmRenderLive();
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
  document.body.insertAdjacentHTML('beforeend', `<button id="gmToggle" class="gm-toggle" aria-expanded="false" aria-controls="gmPanel" title="운영자 콘솔 (F1 · \`)">GM</button><div id="gmPanel" class="gm-panel" hidden></div>`);
  $('#gmToggle').addEventListener('click', () => gmToggle());
  gmBindPanel($('#gmPanel'));
  // 관리자 창(admin.html)과 연결: 인사가 오면 추적 기록을 넘기고, 명령이 오면 게임 쪽에서 실행한다
  gmOpenChannel(msg => {
    if (msg.type === 'hello') { gmPost({ type: 'backlog', trace: GM.trace }); gmBroadcast(); }
    if (msg.type === 'cmd') { gmTrace('gm', `관리자 창 명령: ${msg.cmd}`); gmRunCmd(msg.cmd, msg.args || []); }
  });
  setInterval(gmBroadcast, 1000);
  // 단축키: 게임 입력칸에 글자를 치는 중이면 ` ~ 는 무시한다. 캡처 단계에서 먼저 받아 게임의 Esc 처리와 겹치지 않게 한다.
  window.addEventListener('keydown', e => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
    if (e.key === 'F1' || (!typing && (e.key === '`' || e.key === '~'))) { e.preventDefault(); e.stopPropagation(); gmToggle(); return; }
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

/* 6. 유저: 접속 중인 사람(room) · DB에 동기화된 모든 캐릭터(db). 게임 창 오버레이에서만 (별도 창은 아티팩트 기능이 없다) */
function gmViewUsers() {
  if (GM_REMOTE || typeof CLOUD === 'undefined') return '<p class="gm-muted">claude.ai 접속자 · DB는 게임 창의 GM 오버레이에서만 보입니다.</p>' + gmSupaSection();
  const nm = id => (id && CLOUD.names[id]) || '이름 비공개';
  const since = t => { if (!t) return '—'; const m = Math.round((Date.now() - t) / 60000); return m < 1 ? '방금' : m < 60 ? `${m}분 전` : m < 1440 ? `${Math.floor(m / 60)}시간 전` : `${Math.floor(m / 1440)}일 전`; };
  const onlineIds = new Set(CLOUD.peers.map(p => p.by || p.presence.uid).filter(Boolean));
  const ZN = z => (z && ZONES[z] ? ZONES[z].name : '—');
  const peers = CLOUD.peers.map((p, i) => `<tr><td>${i + 1}</td><td>${esc(nm(p.by || p.presence.uid))}${p.isMe ? ' <b class="gm-me">나</b>' : ''}${p.guest ? ' <small>(외부)</small>' : ''}</td><td>${esc(p.presence.char || '—')}</td><td class="gm-num">${p.presence.cp ? fmt(p.presence.cp) : '—'}</td><td>${ZN(p.presence.zone)}</td><td>${esc(p.presence.tab || '—')}</td><td>${esc(p.presence.device || '—')}</td></tr>`).join('');
  const players = [...CLOUD.players].sort((a, b) => (b.syncedAt || 0) - (a.syncedAt || 0)).map((p, i) => `<tr>
    <td>${i + 1}</td><td>${onlineIds.has(p.id) ? '<b class="gm-on">●</b>' : '<span class="gm-off">○</span>'} ${esc(nm(p.id))}${p.id === CLOUD.uid ? ' <b class="gm-me">나</b>' : ''}</td>
    <td>${esc(p.name || '—')}</td><td class="gm-num">${p.cp ? fmt(p.cp) : '—'}</td><td>${esc(p.mugong || '—')} ${p.star || 0}성</td><td class="gm-num">${fmt(p.silver || 0)}</td><td>${ZN(p.zone)}</td>
    <td class="gm-num">${p.runs || 0}번 · 두목 ${p.bosses || 0}</td><td>${esc(p.device || '—')}</td><td>${since(p.syncedAt)}</td>
    <td class="gm-acts">${p.save && p.id !== CLOUD.uid ? `<button class="gm-btn" data-gmimport="${esc(p.id)}" title="이 유저의 저장을 지금 게임으로 가져옵니다 (지금 저장은 백업)">저장 불러오기</button>` : ''}</td></tr>`).join('');
  return `<div class="gm-kv"><div><span>접속 중</span><b>${CLOUD.peers.length}명</b></div><div><span>DB 유저</span><b>${CLOUD.admin ? CLOUD.players.length + '명' : '권한 없음'}</b></div><div><span>내 동기화</span><b>${since(CLOUD.syncedAt)}</b></div></div>
    <div class="gm-bar"><button class="gm-btn primary" data-gm="cloudsync" ${CLOUD.db ? '' : 'disabled'}>[지금 DB 동기화]</button>${typeof backupInfo === 'function' && backupInfo('import') ? '<button class="gm-btn" data-gm="importundo">[불러오기 전으로 되돌리기]</button>' : ''}<small class="gm-muted">${esc(CLOUD.note || '저장이 바뀔 때마다(1분 간격 확인) players DB에 올라갑니다.')}</small></div>
    <h4 class="gm-h">지금 접속 중</h4>
    <table class="gm-table"><thead><tr><th>#</th><th>유저</th><th>캐릭터</th><th>전투력</th><th>탐험지</th><th>보는 화면</th><th>기기</th></tr></thead><tbody>${peers || '<tr><td colspan="7" class="gm-muted">접속자 정보가 없습니다.</td></tr>'}</tbody></table>
    <h4 class="gm-h">전체 유저 (DB)</h4>
    <table class="gm-table"><thead><tr><th>#</th><th>유저</th><th>캐릭터</th><th>전투력</th><th>무공</th><th>은자</th><th>탐험지</th><th>탐험</th><th>기기</th><th>마지막 동기화</th><th></th></tr></thead><tbody>${players || `<tr><td colspan="11" class="gm-muted">${CLOUD.admin ? '아직 동기화된 유저가 없습니다.' : '주인·편집자만 전체 유저를 볼 수 있습니다.'}</td></tr>`}</tbody></table>
    <p class="gm-muted">claude.ai 유저 ID는 익명 토큰이라 화면에는 이름으로 풀어 보입니다 (claude.ai는 IP를 알려 주지 않습니다). IP는 아래 웹 유저(Supabase) 기록에만 남습니다.</p>
    ${gmSupaSection()}`;
}

/* 7. AI 자동 플레이: 지금 캐릭터로 1 · 2 · 3일을 미리 살아 본다 (실행 전 저장은 백업) */
function gmViewAI() {
  const R = GM.aiReport, bk = typeof backupInfo === 'function' ? backupInfo('ai') : null;
  const pats = Object.entries(AI_PATTERNS).map(([k, P]) => `<button class="gm-btn ${GM.aiPattern === k ? 'on' : ''}" data-gmaipat="${k}">${P.name}</button>`).join('');
  const d = (a, b, f = fmt) => `${f(a)} → <b>${f(b)}</b>`;
  const rep = !R ? '<p class="gm-muted">아직 돌린 기록이 없습니다.</p>' : `
    <div class="gm-kv"><div><span>기간</span><b>${R.days}일</b></div><div><span>패턴</span><b>${R.pattern.split(' (')[0]}</b></div><div><span>전투력</span><b>${d(R.before.cp, R.after.cp)}</b></div><div><span>무공 성</span><b>${R.before.star} → ${R.after.star}</b></div><div><span>은자</span><b>${d(R.before.silver, R.after.silver)}</b></div><div><span>공헌도</span><b>${d(R.before.contrib, R.after.contrib)}</b></div><div><span>탐험지</span><b>${ZONES[R.before.zone] ? ZONES[R.before.zone].name : '—'} → ${ZONES[R.after.zone] ? ZONES[R.after.zone].name : '—'}</b></div><div><span>계산 시간</span><b>${R.ms}ms</b></div></div>
    <table class="gm-table"><thead><tr><th>날</th><th>탐험</th><th>승</th><th>패</th><th>쓰러짐</th><th>두목</th><th>전투력</th><th>무공</th><th>심법·경공·기공</th><th>은자</th><th>수련치</th><th>탐험지</th></tr></thead><tbody>${R.daily.map(x => `<tr><td>${x.label}</td><td class="gm-num">${x.runs}</td><td class="gm-num">${x.wins}</td><td class="gm-num">${x.losses}</td><td class="gm-num">${x.defeats}</td><td class="gm-num">${x.bosses}</td><td class="gm-num">${fmt(x.end.cp)}</td><td>${x.end.stars.mugong}성</td><td>${x.end.stars.simbeop}·${x.end.stars.gyeonggong}·${x.end.stars.gigong}성</td><td class="gm-num">${fmt(x.end.silver)}</td><td class="gm-num">${fmt(x.end.exp)}</td><td>${ZONES[x.end.zone] ? ZONES[x.end.zone].name : '—'}</td></tr>`).join('')}</tbody></table>
    <h4 class="gm-h">있었던 일</h4><ol class="gm-notes">${R.notes.map(n => `<li><time>${n.day}일 ${hhmm(n.t)}</time><span>${esc(n.text)}</span></li>`).join('') || '<li class="gm-muted">특별한 일이 없었습니다.</li>'}</ol>`;
  return `<p class="gm-muted">지금 캐릭터로 며칠을 미리 살아 봅니다. 시계를 그만큼 앞당겨 강호행이 실제 규칙 그대로 이어지고(쓰러지면 AI가 보상을 받고 다시 떠남), 접속한 시각마다 AI가 보상 받기 · 성급 · 돌파단 · 생혈고 · 장비 · 무공 · 임무 · 공양 · 탐험지를 스스로 고릅니다. 실행 전 저장은 백업됩니다.</p>
    <div class="gm-bar">${pats}</div>
    <div class="gm-cheats">${[1, 2, 3].map(n => `<button class="gm-btn big primary" data-gmai="${n}" ${S && !GM.aiBusy ? '' : 'disabled'}>[${n}일 돌리기]</button>`).join('')}
      <button class="gm-btn big" data-gm="airestore" ${bk ? '' : 'disabled'}>[AI 실행 전으로 되돌리기]${bk ? ` <small>${hhmm(bk)} 백업</small>` : ''}</button></div>
    ${GM.aiBusy ? '<p class="gm-muted">AI가 강호를 누비는 중…</p>' : ''}
    ${rep}`;
}

/* 8. 게임 DB: 지금 게임에 들어 있는 데이터 전체 (요수 · 무공 · 탐험지 · 그림 연결) */
function gmViewDB() {
  const tabs = [['monsters', `요수 ${Object.keys(ENEMIES).length}`], ['manuals', `무공 ${Object.keys(MANUALS).length}`], ['zones', `탐험지 ${ZONE_ORDER.length}`]];
  const bar = `<div class="gm-bar">${tabs.map(([k, n]) => `<button class="gm-btn ${GM.dbTab === k ? 'on' : ''}" data-gmdbtab="${k}">${n}</button>`).join('')}<small class="gm-muted">데이터 파일(js/data)을 그대로 읽어 보여 줍니다</small></div>`;
  if (GM.dbTab === 'manuals') return bar + `<table class="gm-table"><thead><tr><th>ID</th><th>이름</th><th>분류</th><th>등급</th><th>병기·속성</th><th>초식 (소성 · 대성)</th><th>초식 그림</th></tr></thead><tbody>${Object.entries(MANUALS).map(([id, M]) => `<tr><td><code>${id}</code></td><td>${M.name}</td><td>${CATS[M.cat].name}</td><td>${M.grade}</td><td>${M.weapon ? WEAPON_TYPES[M.weapon] : M.terrain || M.elem || '—'}</td><td>${(M.stances || []).map(x => x.name).join(' · ')}</td><td>${M.cat === 'mugong' && M.weapon ? `<code>fx/${id}_1 · _2</code>` : '—'}</td></tr>`).join('')}</tbody></table>`;
  if (GM.dbTab === 'zones') return bar + `<table class="gm-table"><thead><tr><th>ID</th><th>이름</th><th>단계</th><th>요수</th><th>두목</th><th>열림 조건</th><th>무대 · 산길</th></tr></thead><tbody>${ZONE_ORDER.map(z => { const Z = ZONES[z]; return `<tr><td><code>${z}</code></td><td>${Z.name}</td><td>${Z.tier}</td><td>${Z.enemies.map(e => ENEMIES[e].name).join(', ')}</td><td>${ENEMIES[Z.boss] ? ENEMIES[Z.boss].name : '—'}</td><td>${Z.unlock ? Z.unlock.boss : '처음부터'}</td><td><code>stages/${z}.jpg · travel/${z}.jpg</code></td></tr>`; }).join('')}</tbody></table>`;
  return bar + `<table class="gm-table"><thead><tr><th>ID</th><th>이름</th><th>단계</th><th>탐험지</th><th>활력</th><th>공격</th><th>방어</th><th>수련치</th><th>스프라이트</th></tr></thead><tbody>${Object.entries(ENEMIES).map(([id, E]) => `<tr><td><code>${id}</code></td><td>${E.boss ? '👹 ' : ''}${E.name}</td><td>${E.tier || '—'}</td><td>${(ZONES[zoneOfEnemy(id)] || {}).name || '—'}</td><td class="gm-num">${fmt(E.hp || 0)}</td><td class="gm-num">${fmt(E.atk || 0)}</td><td class="gm-num">${fmt(E.def || 0)}</td><td class="gm-num">${fmt(E.xp || 0)}</td><td><code>foe_${id}</code></td></tr>`).join('')}</tbody></table>`;
}
