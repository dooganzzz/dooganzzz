/* [화면] 탭 전환, 상단 상태줄, 정청 아코디언 접기/펼치기, 전체 다시 그리기 */

/* 화면 상태 (저장하지 않음): 탭·접힘·화로 투입·창·행낭 필터·선택 슬롯 */
let ui = { fold: { hq: false, missions: false, library: true }, tab: 'sect', sectSub: 'hall', pot: {}, craft: 'alchemy', modal: null, bagFilter: 'all', slotSel: null, statusSub: 'gear', shopMode: 'buy', chronFilter: 'all', gachaResult: null, sim: null };

/* 시스템 신호 → 화면 */
Bus.on('refresh', () => render());
Bus.on('view', patch => Object.assign(ui, patch));
Bus.on('tick', () => renderHeader());

/* DOM 선택 도우미 */
const $ = sel => document.querySelector(sel);
const label = (ko, hj) => `<b class="ko">${ko}</b><small class="hj">${hj}</small>`;

/* ───────── 화면 ───────── */
/* 1차 탭 */
const TABS = [
  ['sect', '청풍문', '淸風門'],    // 하위: 정청 · 화로 · 뒷마당 · 무신상 · 전방
  ['status', '상태', '狀態'],      // 하위: 무장 · 무공
  ['bag', '행낭', '行囊'],
  ['field', '강호행', '江湖行'],
  ['chronicle', '견문록', '見聞錄'],
  ['codex', '도감', '圖鑑'],
];
/* 2차 탭 (청풍문 시설 · 상태) */
const SECT_SUBS = [['hall', '정청', '正廳'], ['forge', '화로', '火爐'], ['yard', '뒷마당', '後院'], ['yeonmu', '연무장', '演武場'], ['shrine', '무신상', '武神像'], ['shop', '전방', '廛房']];
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
    `<button class="subtab ${cur === id ? 'on' : ''}" role="tab" aria-selected="${cur === id}" data-tab="${tab}" data-sub="${id}">${label(ko, hj)}</button>`).join('')}</div>`;
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
function renderHeader() {
  const st = calcStats(), cp = calculateCombatPower(S);
  $('#status').innerHTML = `
    <div class="who"><span class="name">${esc(S.name)}</span><span class="sect">청풍문 제자 · ${S.expedition.zone ? `⛰️ ${ZONES[S.expedition.zone].name} · ${S.expedition.nextAt ? clockHM(S.expedition.nextAt) : ''} 출발 <b>${countdownText()}</b>` : '탐험지 미정'}</span></div>
    <div class="bars">${bar('hp', S.hp, st.maxHp, '활력')}${bar('mp', S.mp, st.maxMp, '내력')}${bar('sta', Math.min(S.stamina, st.maxSta), st.maxSta, '기력')}</div>
    <div class="purse"><span class="cp" title="종합 전투력"><i class="coin cpi">戰</i>${fmt(cp)}${cpDeltaHtml(cp)}</span><span class="xp" title="경험치 (상태 › 무공에서 성급 올리기)"><i class="coin c3">經</i>${fmt(S.exp)}</span><span title="은자"><i class="coin">銀</i>${fmt(S.silver)}</span><span title="문파 공헌도"><i class="coin c2">功</i>${fmt(S.contrib)}</span></div>`;
}

function renderTabs() {
  $('#tabs').innerHTML = TABS.map(([id, ko, hj]) => `<button class="tab ${ui.tab === id ? 'on' : ''}" data-tab="${id}">${label(ko, hj)}</button>`).join('');
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
  main.innerHTML = bar + ({ gear: viewGear, martial: viewMartial, bag: viewBag, shrine: viewShrine, yeonmu: viewYeonmu, forge: viewForge, yard: viewYard, hall: viewHall, shop: viewShop, field: viewField, chronicle: viewChronicle, codex: viewCodex })[scr]();
  renderLog();
  renderModal();
  typewriteAll();
  wireImages();
  save();
}
