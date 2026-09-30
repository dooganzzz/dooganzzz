/* [화면] 운영자 통합 디버그 콘솔 (GM): 유저 상태 · 행동 추적 · 아이템 DB · 조합법 · 쾌속 치트
   우측 하단 [GM] 버튼, 또는 F1 / ` / ~ 키로 여닫는다. 게임 화면과 겹치지 않는 독립 오버레이다.
   값 주입은 기존 시스템 함수(give·advance·clampVitals·doReset …)를 그대로 불러 상태와 화면을 맞춘다. */

/* 출시 때 false로 두면 버튼·단축키가 모두 사라진다 */
const GM_ENABLED = true;

const GM = { open: false, tab: 'state', trace: [], itemQ: '', itemKind: 'all', recipeCraft: 'all', resetArm: false };
const GM_TABS = [['state', '유저 상태'], ['trace', '행동 추적'], ['items', '아이템 DB'], ['recipes', '조합법'], ['cheat', '쾌속 치트']];
const GM_TRACE_MAX = 300;
const GM_KIND = { tab: '탭', view: '화면', click: '클릭', battle: '전투', 'item+': '획득', 'item-': '소모', warn: '경고', notice: '알림', error: '예외', gm: 'GM', sys: '시스템' };

/* ───────── 행동 추적: 견문록과 완전히 분리된 기록 (최신이 위, 저장하지 않음) ───────── */
function gmTrace(kind, text) {
  GM.trace.unshift({ t: Date.now(), kind, text: String(text) });
  if (GM.trace.length > GM_TRACE_MAX) GM.trace.length = GM_TRACE_MAX;
  if (GM.open && GM.tab === 'trace') gmRenderTrace();
}
const gmTime = t => { const d = new Date(t); return `${hhmm(t)}:${String(d.getSeconds()).padStart(2, '0')}.${String(d.getMilliseconds()).padStart(3, '0')}`; };
Bus.on('trace', (kind, text) => gmTrace(kind, text));
Bus.on('view', patch => { if (patch.tab) gmTrace('view', `화면 전환 → ${patch.tab}${patch.sectSub ? ' › ' + patch.sectSub : ''}`); if ('modal' in patch) gmTrace('view', `창 ${patch.modal ? '열기 → ' + patch.modal : '닫기'}`); });
Bus.on('toast', text => gmTrace('notice', text));
Bus.on('log', e => { if (/\bbad\b/.test(e.cls)) gmTrace('warn', e.text.replace(/<[^>]+>/g, '')); });
Bus.on('tick', () => { if (GM.open && GM.tab === 'state') gmRenderLive(); });

/* ───────── 여닫기 ───────── */
function gmToggle(force) {
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
  const body = !S && GM.tab !== 'trace' && GM.tab !== 'cheat' ? '<p class="gm-muted">게임을 시작하면 볼 수 있습니다.</p>'
    : ({ state: gmViewState, trace: gmViewTrace, items: gmViewItems, recipes: gmViewRecipes, cheat: gmViewCheat })[GM.tab]();
  panel.innerHTML = `<div class="gm-box" role="dialog" aria-label="운영자 콘솔">
    <div class="gm-top"><b>GM 콘솔</b><small>F1 · \` 로 여닫기</small><button class="gm-x" data-gm="close" aria-label="닫기">✕</button></div>
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
    return `<tr><td>${CATS[c].name}</td><td><code>${id || '—'}</code></td><td>${id ? MANUALS[id].name : ''}</td><td>${m ? m.star + '성' + (m.gate ? ' 관문' : '') : ''}</td><td>${m ? `실전 ${Math.floor(m.cxp)}/${needC(m.star)} · 수련 ${Math.floor(m.txp)}/${need(m.star)}${S.activeTrainingSkillId === id ? ' ▶' : ''}` : ''}</td></tr>`; }).join('');
  const inv = Object.entries(S.inv).map(([id, n]) => `<span class="gm-chip"><code>${id}</code> ×${n}</span>`).join('') || '<span class="gm-muted">비어 있음</span>';
  box.innerHTML = `<div class="gm-kv">${row('활력', `${Math.round(S.hp)} / ${st.maxHp}`)}${row('내력', `${Math.round(S.mp)} / ${st.maxMp}`)}${row('기력', `${Math.round(S.stamina)} / ${st.maxSta}`)}${row('은자', fmt(S.silver))}${row('공헌도', fmt(S.contrib))}${row('위치', S.zone ? `${S.zone.id} (${S.zone.x},${S.zone.y})` : '청풍문')}${row('전투', RT.battle ? `${RT.battle.eid} ${RT.battle.round}합${RT.battle.over ? ' 끝' : ''}` : '—')}${row('행낭', `${bagUsed()} / ${bagCap()}칸`)}</div>
    <table class="gm-table"><thead><tr><th>분류</th><th>ID</th><th>무공</th><th>성</th><th>경험치</th></tr></thead><tbody>${arts}</tbody></table>
    <div class="gm-chips">${inv}</div>
    ${S.gear.length ? `<div class="gm-chips">${S.gear.map(g => `<span class="gm-chip">uid ${g.uid} · ${g.name}${g.enh ? ' +' + g.enh : ''}</span>`).join('')}</div>` : ''}`;
  const keep = raw.scrollTop;
  raw.textContent = JSON.stringify({ ...S, log: `[견문록 ${S.log.length}줄 생략]` }, null, 2);
  raw.scrollTop = keep;
}
function gmApplyState(form) {
  const changed = [];
  for (const [k, n] of GM_FIELDS) {
    const v = Number(form.elements[k].value);
    if (!Number.isFinite(v) || Math.round(S[k]) === v) continue;
    S[k] = Math.max(0, v); changed.push(`${n} ${S[k]}`);
  }
  clampVitals();
  gmTrace('gm', changed.length ? `상태 적용: ${changed.join(', ')}` : '상태 적용: 바뀐 값 없음');
  notify.refresh(); notify.save(); gmRender();
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
function gmSpawn(id, n) {
  if (!ITEMS[id]) return;
  const ok = give(id, n, true);
  gmTrace('gm', ok ? `소환: ${id} ×${n} → 보유 ${count(id)}` : `소환 실패 (행낭 가득): ${id}`);
  notify.refresh(); gmRenderItems();
}

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
function gmGiveMats(rid) {
  const r = RECIPES.find(x => x.id === rid); if (!r) return;
  for (const [id, n] of Object.entries(r.in)) give(id, n, true);
  gmTrace('gm', `재료 지급: ${rid} ← ${Object.entries(r.in).map(([id, n]) => `${id}×${n}`).join(', ')}`);
  notify.refresh(); gmRender();
}

/* 5. 쾌속 치트 */
function gmViewCheat() {
  const tid = S && S.activeTrainingSkillId, m = tid && S.manuals[tid];
  return `<div class="gm-cheats">
    <button class="gm-btn big" data-gm="silver" ${S ? '' : 'disabled'}>[은자 +1,000냥]</button>
    <button class="gm-btn big" data-gm="heal" ${S ? '' : 'disabled'}>[활력/내력 100% 회복]</button>
    <button class="gm-btn big" data-gm="stamina" ${S ? '' : 'disabled'}>[기력 가득]</button>
    <button class="gm-btn big" data-gm="train" ${m ? '' : 'disabled'}>[수련 1시간 경과]</button>
    <button class="gm-btn big danger ${GM.resetArm ? 'armed' : ''}" data-gm="reset">${GM.resetArm ? '[정말 초기화 — 한 번 더 누르기]' : '[데이터 완전 초기화]'}</button>
  </div>
  <p class="gm-muted">${m ? `수련 중: 《${MANUALS[tid].name}》 ${m.star}성 · 수련 ${Math.floor(m.txp)} / ${need(m.star)}초` : '수련 중인 비급이 없습니다. 연무장에서 [ 수련하기 ]를 먼저 누르십시오.'}</p>`;
}
function gmCheat(what) {
  if (what === 'reset') {
    if (!GM.resetArm) { GM.resetArm = true; gmRender(); return; }
    gmTrace('gm', '데이터 완전 초기화'); doReset(); return;
  }
  GM.resetArm = false;
  if (!S) return;
  if (what === 'silver') { S.silver += 1000; gmTrace('gm', `은자 +1000 → ${S.silver}`); }
  if (what === 'heal') { const st = calcStats(); S.hp = st.maxHp; S.mp = st.maxMp; gmTrace('gm', `활력·내력 회복 → ${st.maxHp} / ${st.maxMp}`); }
  if (what === 'stamina') { S.stamina = calcStats().maxSta; gmTrace('gm', `기력 → ${S.stamina}`); }
  if (what === 'train') {
    const id = S.activeTrainingSkillId; if (!id) return;
    const before = S.manuals[id].star;
    advance(3600, false);                                  // 연무장 시간 흐름을 그대로 1시간 돌린다 (관문·돌파 판정 포함)
    const m = S.manuals[id];
    gmTrace('gm', `수련 +1시간: ${id} ${before}성 → ${m.star}성${m.gate ? ' (관문)' : ''} · 수련 ${Math.floor(m.txp)}/${need(m.star)}`);
  }
  notify.refresh(); notify.save(); gmRender();
}

/* ───────── 입력 ───────── */
function gmInit() {
  if (!GM_ENABLED || $('#gmPanel')) return;
  document.body.insertAdjacentHTML('beforeend', `<button id="gmToggle" class="gm-toggle" aria-expanded="false" aria-controls="gmPanel" title="운영자 콘솔 (F1 · \`)">GM</button><div id="gmPanel" class="gm-panel" hidden></div>`);
  $('#gmToggle').addEventListener('click', () => gmToggle());
  const panel = $('#gmPanel');
  panel.addEventListener('click', e => {
    if (e.target === panel) return gmToggle(false);          // 바깥(어두운 막) 누르면 닫기
    const t = e.target.closest('button'); if (!t) return;
    const d = t.dataset;
    if (d.gmtab) { GM.tab = d.gmtab; GM.resetArm = false; return gmRender(); }
    if (d.gm === 'close') return gmToggle(false);
    if (d.gm === 'cleartrace') { GM.trace = []; return gmRenderTrace(); }
    if (d.gmspawn) return gmSpawn(d.gmspawn, +d.n);
    if (d.gmcraft) { GM.recipeCraft = d.gmcraft; return gmRender(); }
    if (d.gmmats) return gmGiveMats(d.gmmats);
    if (d.gm) return gmCheat(d.gm);
  });
  panel.addEventListener('submit', e => { e.preventDefault(); if (e.target.dataset.gmform === 'state' && S) gmApplyState(e.target); });
  panel.addEventListener('input', e => { const k = e.target.dataset.gminput; if (k) { GM[k] = e.target.value; gmRenderItems(); } });
  // 단축키: 게임 입력칸에 글자를 치는 중이면 ` ~ 는 무시한다. 캡처 단계에서 먼저 받아 게임의 Esc 처리와 겹치지 않게 한다.
  window.addEventListener('keydown', e => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
    if (e.key === 'F1' || (!typing && (e.key === '`' || e.key === '~'))) { e.preventDefault(); e.stopPropagation(); gmToggle(); return; }
    if (e.key === 'Escape' && GM.open) { e.stopPropagation(); gmToggle(false); }
  }, true);
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
