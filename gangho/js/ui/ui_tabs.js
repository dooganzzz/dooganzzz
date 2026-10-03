/* [화면] 탭 전환, 상단 상태줄, 정청 아코디언 접기/펼치기, 전체 다시 그리기 */

/* 화면 상태 (저장하지 않음): 탭·접힘·화로 투입·창·행낭 필터·선택 슬롯 */
let ui = { fold: { hq: true, missions: true, library: true },   // 아코디언은 모두 접힌 채로 시작 (true = 접힘)
  tab: 'sect', sectSub: 'grounds', pot: {}, potGear: [], craft: 'forge', codexTab: 'monster', modal: null, bagFilter: 'all', slotSel: null, statusSub: 'observe', shopMode: 'buy', chronFilter: 'all', gachaResult: null, sim: null, libTab: 'equipment', skillTab: 'attack' };

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
  if (a.tagName === 'IMG' && a.getAttribute('src') !== b.getAttribute('src')) { a.replaceWith(b); return; }   // 그림이 바뀌면 옛 그림을 걷어 내고 새로 붙인다 (src만 바꾸면 새 그림이 뜰 때까지 옛 그림이 남는다)
  morphAttrs(a, b);
  if (a.tagName !== 'TEXTAREA') morphChildren(a, b);
}
function morphChildren(a, b) {
  const live = [...a.children].filter(c => c.dataset && c.dataset.live);   // 무대에 실시간으로 붙인 것(기믹 · 숫자 · 이펙트 · 소품)은 다시 그려도 그대로
  for (const c of live) c.remove();
  morphChildrenCore(a, b);
  for (const c of live) a.appendChild(c);
}
function morphChildrenCore(a, b) {
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
  ['status', '관조', '觀照'],      // 하위: 무장 · 무공
  ['bag', '행낭', '行囊'],
  ['field', '강호행', '江湖行'],
  ['chronicle', '견문록', '見聞錄'],
  ['encounter', '기연', '奇緣'],
  ['codex', '도감', '圖鑑'],
  ['settings', '설정', '設定'],
];
/* 2차 탭 (청풍문 시설 · 상태) */
const SECT_SUBS = [['grounds', '전경', '全景'], ['hall', '정청', '正廳'], ['forge', '화로', '火爐'], ['yeonmu', '연무장', '演武場'], ['shrine', '무신상', '武神像'], ['shop', '전방', '廛房']];
const STATUS_SUBS = [['observe', '상태', '狀態'], ['martial', '무공', '武功']];   // 1차 탭 이름은 관조, 그 안 갈래는 상태 · 무공 (10월 3일 유저: 이름을 서로 바꿈)   // 관조: 능력치(왼쪽) + 무장(오른쪽) — 무장 탭은 관조에 합침 (10월 3일)
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
  if (SUB_KEY[tab]) ui[SUB_KEY[tab]] = sub || (tab === 'sect' ? 'grounds' : ui[SUB_KEY[tab]]);
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

/* 투력이 바뀌면 헤더에 잠깐 ▲/▼ 변화량을 붙인다 */
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
/* 머리: 이름 줄만. 활력 · 내력 · 수련치 · 은자 · 공헌 · 투력은 상태 › 관조 탭(#vitals · 투력 카드)에 (유저 요청). 매초 다시 그린다 */
function renderHeader() {
  const st = calcStats(), cp = calculateCombatPower(S), dl = cpDeltaHtml(cp);
  setHTML($('#status'), '');   // 머리 배너 아래 '이름 · 청풍문 제자 · 탐험지' 줄은 뺐다 (10월 3일 유저) — 이름은 관조 › 호패에
  const v = $('#vitals'); if (v) setHTML(v, vitalsHtml(st));
  const g = $('#obsGauge'); if (g) setHTML(g, gaugeHtml(st));
  const c = $('#obsCp'); if (c) setHTML(c, cpCardHtml());
  const cm = document.querySelector('.cp-card .cp-main');            // 투력이 바뀌면 투력 카드에 잠깐 ▲/▼
  if (cm) { const old = cm.querySelector('.cp-delta'); if (old) old.remove(); if (dl) cm.insertAdjacentHTML('beforeend', dl); }
}
/* 상태 탭 맨 위: 활력 · 내력 막대와 수련치 · 은자 · 공헌 */
/* 관조 › 메인 능력치 (#vitals, 매초 갱신): 투력 · 활력 · 내력 막대 · 4대 스탯(아이콘). 수련치는 무공 탭, 은자는 행낭, 공헌은 장보각에 */
function vitalsHtml(st = calcStats()) {
  return `<div class="obs-main"><div class="obs-attrs"><h5 class="obs-col">선천 <small>先天</small></h5><h5 class="obs-col">후천 <small>後天</small></h5>${Object.entries(APTS).map(([q, P]) => { const A = ATTRS[P.pair], tile = (k, N, v, cls) => `<div class="obs-attr ${cls}" title="${N.desc}">${uiIco('st_' + k, 'obs-ico')}<span>${N.name}<small>${N.hanja}</small></span><b>${v}</b></div>`;
      return tile(q, P, aptOf(q), 'apt') + tile(P.pair, A, attrOf(P.pair), 'drill'); }).join('')}</div></div>`;   // 왼쪽 선천(자질) · 오른쪽 후천(단련) (10월 3일 유저)
}
/* 관조 › 호패 패널의 활력 · 내력 막대 (#obsGauge, 매초 갱신) — 투력 위, 자리 · 크기는 유저 슬라이더 값 */
const gaugeHtml = (st = calcStats()) => `<div class="gauge-group">${gauge('hp', S.hp, st.maxHp, '활력')}${gauge('mp', S.mp, st.maxMp, '내력')}</div>`;
/* 관조 › 호패 옆 투력 카드 (#obsCp, 매초 갱신) — 자리는 유저가 슬라이더로 정한 값 */
const cpCardHtml = () => `<div class="cp-main" title="실제 전투 규칙으로 잰 종합 지수">${uiIco('h_cp', 'obs-ico')}<span class="cp-label">${label('투력', '鬪力')}</span><b class="cp-value">${fmt(combatPowerParts(S).total)}</b></div>`;
/* 수묵 아이콘 (ASSET.ui). 헤더는 매초 다시 그리므로 깜빡이지 않게 배경 그림으로 얹는다 (파일이 없으면 빈칸) */
const uiIco = (id, cls = '') => `<i class="ui-ico ${cls}" style="background-image:url('${ASSET.ui(id)}')" aria-hidden="true"></i>`;
/* 헤더 게이지: [아이콘·활력] 뱃지 + 막대(수치는 막대 안). 활력 위 · 내력 아래로 쌓는다 */
function gauge(cls, cur, max, name) {
  const p = max ? clamp(cur / max * 100, 0, 100) : 0;
  return `<div class="stat-gauge ${cls}-gauge">${uiIco('h_' + cls)}<span class="gauge-badge">${name}</span><div class="gauge-bar-track"><div class="gauge-bar-fill" style="width:${p}%"></div><span class="gauge-text">${fmt(cur)} / ${fmt(max)}</span></div></div>`;
}

/* 받을 보상 알림: 장문인 가르침을 이루었거나 토벌 임무를 채웠으면 청풍문 탭 · 정청에, 끝난 강호행의 보상이 남았으면 강호행 탭에 빨간 점 */
const questAlert = () => !!S && (tutorReady() || subqReadyCount() > 0);
const alertDot = on => on ? '<i class="alert-dot" aria-label="받을 보상 있음"></i>' : '';
function renderTabs() {
  const qa = questAlert();
  setHTML($('#tabs'), TABS.map(([id, ko, hj]) => `<button class="tab ${ui.tab === id ? 'on' : ''}" data-tab="${id}">${label(ko, hj)}${id === 'sect' ? alertDot(qa) : id === 'encounter' ? alertDot(!!S && encountersWaiting().length > 0) : ''}</button>`).join(''));
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

/* 이름 글씨 자동 맞춤: 칸보다 길면 두 줄 안에 들고 단어가 쪼개지지 않을 때까지 글씨를 조금씩 줄인다 (최소 70%) */
function fitNames(root = document) {
  for (const el of root.querySelectorAll('.bag-tile .item-name')) {
    el.style.fontSize = '';
    const base = parseFloat(getComputedStyle(el).fontSize), lh = parseFloat(getComputedStyle(el).lineHeight) || base * 1.25;
    for (let f = base; f > base * 0.7 && (el.scrollHeight > lh / base * f * 2 + 2 || el.scrollWidth > el.clientWidth + 1); f -= base * 0.05) el.style.fontSize = (f - base * 0.05) + 'px';
  }
}
addEventListener('resize', () => fitNames());
function render() {
  if (!S) return;
  renderHeader(); renderTabs();
  const main = $('#main');
  const scr = screen(), bar = SUBS[ui.tab] && ui.tab !== 'sect' ? subtabBar(ui.tab) : '';   // 청풍문은 갈래 메뉴 없이 전경 그림으로만 옮겨 다닌다
  setHTML(main, bar + ({ observe: viewObserve, gear: viewObserve, martial: viewMartial, bag: viewBag, shrine: viewShrine, yeonmu: viewYeonmu, forge: viewFurnace, grounds: viewGrounds, hall: viewHall, shop: viewShop, field: () => ui.fieldMap !== false && !activeRun() ? mapScreen() : viewField(), chronicle: viewChronicle, codex: viewCodex, settings: viewSettings, encounter: viewEncounters })[scr]());
  renderModal();
  typewriteAll();
  wireImages();
  fitNames();
  artAfterRender();
  saveSoon();
}
