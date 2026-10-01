/* [화면] 탭 전환, 상단 상태줄, 정청 아코디언 접기/펼치기, 전체 다시 그리기 */

/* 화면 상태 (저장하지 않음): 탭·접힘·화로 투입·창·행낭 필터·선택 슬롯 */
let ui = { fold: { hq: true, missions: true, library: true },   // 아코디언은 모두 접힌 채로 시작 (true = 접힘)
  tab: 'sect', sectSub: 'hall', pot: {}, craft: 'forge', codexTab: 'monster', modal: null, bagFilter: 'all', slotSel: null, statusSub: 'gear', shopMode: 'buy', chronFilter: 'all', gachaResult: null, sim: null, libTab: 'equipment', skillTab: 'attack' };

/* 시스템 신호 → 화면. 한 동작에서 신호가 여러 번 와도 한 번만 다시 그린다 (그리기 전에 모아 처리) */
let renderQueued = false;
Bus.on('refresh', () => { if (renderQueued) return; renderQueued = true; queueMicrotask(() => { renderQueued = false; render(); }); });
Bus.on('view', patch => Object.assign(ui, patch));
Bus.on('tick', () => renderHeader());

/* ───────── 바뀐 곳만 고쳐 그리기 (morph) ─────────
   innerHTML로 통째로 갈아 끼우면 그림이 다시 뜨고(깜빡임) 애니메이션·스크롤이 처음으로 돌아간다.
   새 HTML을 한 번 해석해 지금 DOM과 견주고, 달라진 속성·글자·노드만 바꾼다. id나 data-key가 같은 노드는 자리를 옮겨 재사용한다 */
const MORPH_KEEP = new Set(['data-wired']);            // 그린 뒤 스크립트가 붙이는 속성은 지우지 않는다
const morphKey = n => n.nodeType === 1 ? (n.id || n.getAttribute('data-key') || null) : null;
function morphAttrs(a, b) {
  const anim = a.hasAttribute('data-anim');                // 스크립트가 매 프레임 움직이는 노드: style · class · 칸 번호는 건드리지 않는다
  const own = n => anim && (n === 'style' || n === 'class' || n === 'data-f');
  for (const { name } of [...a.attributes]) if (own(name)) continue; else if (!b.hasAttribute(name) && !MORPH_KEEP.has(name) && !(name === 'open' && a.tagName === 'DETAILS')) a.removeAttribute(name);
  for (const { name, value } of b.attributes) if (!own(name) && a.getAttribute(name) !== value) a.setAttribute(name, value);
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && document.activeElement !== a) {
    if (a.type === 'checkbox' || a.type === 'radio') a.checked = b.checked; else if (a.value !== b.value) a.value = b.value;
  }
}
function morphNode(a, b) {
  if (a.nodeType !== b.nodeType || a.nodeName !== b.nodeName) { a.replaceWith(b); return; }
  if (a.nodeType !== 1) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
  if (a.isEqualNode(b)) return;
  morphAttrs(a, b);
  if (a.tagName !== 'TEXTAREA') morphChildren(a, b);
}
function morphChildren(a, b) {
  const keyed = new Map();
  for (const c of a.childNodes) { const k = morphKey(c); if (k) keyed.set(k, c); }
  let cur = a.firstChild;
  for (const nc of [...b.childNodes]) {
    const k = morphKey(nc);
    if (k && keyed.has(k)) {
      const old = keyed.get(k); keyed.delete(k);
      if (old === cur) cur = cur.nextSibling; else a.insertBefore(old, cur);
      morphNode(old, nc); continue;
    }
    if (cur && !morphKey(cur)) { const next = cur.nextSibling; morphNode(cur, nc); cur = next; continue; }
    a.insertBefore(nc, cur);
  }
  while (cur) { const next = cur.nextSibling; cur.remove(); cur = next; }
}
const morphTpl = document.createElement('template');
function setHTML(el, html) {
  if (!el) return;
  if (!el.firstChild) { el.innerHTML = html; return; }
  morphTpl.innerHTML = html;
  morphChildren(el, morphTpl.content);
  morphTpl.innerHTML = '';
}

/* DOM 선택 도우미 */
const $ = sel => document.querySelector(sel);
const label = (ko, hj) => `<b class="ko">${ko}</b><small class="hj">${hj}</small>`;

/* ───────── 화면 ───────── */
/* 1차 탭 */
const TABS = [
  ['sect', '청풍문', '淸風門'],    // 하위: 정청 · 화로 · 연무장 · 무신상 · 전방
  ['status', '상태', '狀態'],      // 하위: 무장 · 무공
  ['bag', '행낭', '行囊'],
  ['field', '강호행', '江湖行'],
  ['chronicle', '견문록', '見聞錄'],
  ['codex', '도감', '圖鑑'],
];
/* 2차 탭 (청풍문 시설 · 상태) */
const SECT_SUBS = [['hall', '정청', '正廳'], ['forge', '화로', '火爐'], ['yeonmu', '연무장', '演武場'], ['shrine', '무신상', '武神像'], ['shop', '전방', '廛房']];
const STATUS_SUBS = [['gear', '무장', '武裝'], ['martial', '무공', '武功']];
const SUBS = { sect: SECT_SUBS, status: STATUS_SUBS };
const SUB_KEY = { sect: 'sectSub', status: 'statusSub' };


/* 지금 보이는 화면: 1차 탭이 하위 탭을 가지면 고른 하위 탭 */
function screen() {
  const subs = SUBS[ui.tab]; if (!subs) return ui.tab;
  const cur = ui[SUB_KEY[ui.tab]];
  return subs.some(([id]) => id === cur) ? cur : subs[0][0];
}
/* 탭 이동. 청풍문은 들어올 때마다 첫 하위 탭(정청)부터, 상태는 마지막 하위 탭을 기억한다 */
function goTab(tab, sub) {
  ui.tab = tab;
  Bus.emit('trace', 'tab', `${tab}${sub ? ' › ' + sub : ''}`);
  if (SUB_KEY[tab]) ui[SUB_KEY[tab]] = sub || (tab === 'sect' ? 'hall' : ui[SUB_KEY[tab]]);
  ui.craftResult = null; ui.gachaResult = null;
}
function subtabBar(tab) {
  const subs = SUBS[tab], cur = screen(), name = TABS.find(t => t[0] === tab)[1];
  return `<div class="subtabs" role="tablist" aria-label="${name}" style="--n:${subs.length}">${subs.map(([id, ko, hj]) =>
    `<button class="subtab ${cur === id ? 'on' : ''}" role="tab" aria-selected="${cur === id}" data-tab="${tab}" data-sub="${id}">${label(ko, hj)}${tab === 'sect' && id === 'hall' ? alertDot(questAlert()) : ''}</button>`).join('')}</div>`;
}

function bar(cls, cur, max, name, hideNum) {
  const p = max ? clamp(cur / max * 100, 0, 100) : 0;
  return `<div class="bar ${cls}"><span class="bar-fill" style="width:${p}%"></span><span class="bar-text"><b>${name}</b>${hideNum ? '' : ` ${fmt(cur)} / ${fmt(max)}`}</span></div>`;
}

/* 전투력이 바뀌면 헤더에 잠깐 ▲/▼ 변화량을 붙인다 */
const cpMark = { last: null, delta: 0, until: 0 };
function cpDeltaHtml(cp) {
  const t = Date.now();
  if (cpMark.last !== null && cp !== cpMark.last) { cpMark.delta = cp - cpMark.last; cpMark.until = t + 2500; }
  cpMark.last = cp;
  return t < cpMark.until && cpMark.delta ? `<em class="cp-delta ${cpMark.delta > 0 ? 'up' : 'down'}">${cpMark.delta > 0 ? '▲' : '▼'}${fmt(Math.abs(cpMark.delta))}</em>` : '';
}
/* 헤더 수치: 10만 이상은 만·억 단위로 줄인다 (폰에서도 한 줄). 정확한 값은 툴팁에 */
const fmtShort = n => { n = Math.floor(n); const a = Math.abs(n);
  return a >= 1e8 ? `${+(n / 1e8).toFixed(1)}억` : a >= 1e5 ? `${+(n / 1e4).toFixed(1)}만` : fmt(n); };
function renderHeader() {
  const st = calcStats(), cp = calculateCombatPower(S);
  setHTML($('#status'), `
    <div class="character-meta-row who"><span class="char-name name">${esc(S.name)}</span><span class="char-sub sect">청풍문 제자 · ${S.expedition.zone ? `${uiIco('c_explore', 'inline')}${ZONES[S.expedition.zone].name} · ${activeRun() ? `강호행 중 <strong class="highlight-timer" data-runclock>${runClockText()}</strong>` : '대기 중'}` : '탐험지 미정'}</span></div>
    <div class="status-indicator-row">
      <div class="gauge-group">${gauge('hp', S.hp, st.maxHp, '활력')}${gauge('mp', S.mp, st.maxMp, '내력')}</div>
      <div class="currency-chips user-status-bar">
        <div class="status-chip combat combat-power" title="종합 전투력 ${fmt(cp)}">${uiIco('h_cp')}<span class="chip-badge badge-combat">전투력</span><span class="chip-value" id="header-cp">${fmtShort(cp)}</span>${cpDeltaHtml(cp)}</div>
        <div class="status-chip training exp" title="수련치 ${fmt(S.exp)} (탐험에서 쌓은 수련 · 상태 › 무공에서 성급 올리기)">${uiIco('h_xp')}<span class="chip-badge badge-training badge-exp">수련치</span><span class="chip-value" id="header-exp">${fmtShort(S.exp)}</span></div>
        <div class="status-chip silver" title="은자 ${fmt(S.silver)}냥">${uiIco('h_silver')}<span class="chip-badge badge-silver">은자</span><span class="chip-value" id="header-silver">${fmtShort(S.silver)}</span></div>
        <div class="status-chip contrib contribution" title="문파 공헌도 ${fmt(S.contrib)}">${uiIco('h_contrib')}<span class="chip-badge badge-contrib">공헌</span><span class="chip-value" id="header-contrib">${fmtShort(S.contrib)}</span></div>
      </div>
    </div>`);
}
/* 수묵 아이콘 (assets/art/ui). 헤더는 매초 다시 그리므로 깜빡이지 않게 배경 그림으로 얹는다 (파일이 없으면 빈칸) */
const uiIco = (id, cls = '') => `<i class="ui-ico ${cls}" style="background-image:url('assets/art/ui/${id}.png')" aria-hidden="true"></i>`;
/* 헤더 게이지: [아이콘·활력] 뱃지 + 막대(수치는 막대 안). 활력 위 · 내력 아래로 쌓는다 */
function gauge(cls, cur, max, name) {
  const p = max ? clamp(cur / max * 100, 0, 100) : 0;
  return `<div class="stat-gauge ${cls}-gauge">${uiIco('h_' + cls)}<span class="gauge-badge">${name}</span><div class="gauge-bar-track"><div class="gauge-bar-fill" style="width:${p}%"></div><span class="gauge-text">${fmt(cur)} / ${fmt(max)}</span></div></div>`;
}

/* 받을 보상 알림: 장문인 가르침을 이루었거나 토벌 임무를 채웠으면 청풍문 탭 · 정청에 빨간 점 */
const questAlert = () => !!S && (tutorReady() || subqReadyCount() > 0);
const alertDot = on => on ? '<i class="alert-dot" aria-label="받을 보상 있음"></i>' : '';
function renderTabs() {
  const qa = questAlert();
  setHTML($('#tabs'), TABS.map(([id, ko, hj]) => `<button class="tab ${ui.tab === id ? 'on' : ''}" data-tab="${id}">${label(ko, hj)}${id === 'sect' ? alertDot(qa) : ''}</button>`).join(''));
}

/* 접기/펼치기 구역: 헤더를 누르면 본문에 .collapsed가 토글된다 (다시 그리지 않아 전환이 부드럽다) */
function foldHead(key, ko, hj, extra = '') {
  const shut = ui.fold[key];
  return `<div class="panel-head fold-head" data-fold="${key}" role="button" tabindex="0" aria-expanded="${!shut}"><h2>${label(ko, hj)} <span class="fold-arrow">${shut ? '▼' : '▲'}</span></h2>${extra}</div>`;
}

const foldBody = (key, html) => `<div class="fold-body ${ui.fold[key] ? 'collapsed' : ''}" data-foldbody="${key}"><div class="fold-inner">${html}</div></div>`;

function toggleFold(key) {
  ui.fold[key] = !ui.fold[key];
  const body = document.querySelector(`[data-foldbody="${key}"]`), h = document.querySelector(`[data-fold="${key}"]`);
  if (body) body.classList.toggle('collapsed', ui.fold[key]);
  if (h) { h.setAttribute('aria-expanded', String(!ui.fold[key])); h.querySelector('.fold-arrow').textContent = ui.fold[key] ? '▼' : '▲'; }
}

function head(ko, hj, extra = '') { return `<div class="panel-head"><h2>${label(ko, hj)}</h2>${extra}</div>`; }

function render() {
  if (!S) return;
  renderHeader(); renderTabs();
  const main = $('#main');
  const scr = screen(), bar = (ui.tab === 'status' ? cpCard() : '') + (SUBS[ui.tab] ? subtabBar(ui.tab) : '');
  setHTML(main, bar + ({ gear: viewGear, martial: viewMartial, bag: viewBag, shrine: viewShrine, yeonmu: viewYeonmu, forge: viewFurnace, hall: viewHall, shop: viewShop, field: viewField, chronicle: viewChronicle, codex: viewCodex })[scr]());
  renderModal();
  typewriteAll();
  wireImages();
  artAfterRender();
  saveSoon();
}
