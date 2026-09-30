/* [화면] 탭 전환, 상단 상태줄, 정청 아코디언 접기/펼치기, 전체 다시 그리기 */

/* 화면 상태 (저장하지 않음): 탭·접힘·화로 투입·창·행낭 필터·선택 슬롯 */
let ui = { fold: { hq: false, missions: false, library: true }, tab: 'sect', sectSub: 'hall', pot: {}, craft: 'alchemy', modal: null, bagFilter: 'all', slotSel: null, statusSub: 'gear', shopMode: 'buy' };

/* 시스템 신호 → 화면 */
Bus.on('refresh', () => render());
Bus.on('view', patch => Object.assign(ui, patch));
Bus.on('tick', () => renderHeader());

/* 강호견문록 — 게임 로직 & 화면 */
'use strict';
/* DOM 선택 도우미 */
const $ = sel => document.querySelector(sel);
const label = (ko, hj) => `<b class="ko">${ko}</b><small class="hj">${hj}</small>`;

/* ───────── 화면 ───────── */
/* 1차 탭 */
const TABS = [
  ['sect', '청풍문', '淸風門'],    // 하위: 정청 · 연무장 · 화로 · 뒷마당 · 무신상 · 전방
  ['status', '상태', '狀態'],      // 하위: 무장 · 무공
  ['bag', '행낭', '行囊'],
  ['field', '강호행', '江湖行'],
  ['codex', '도감', '圖鑑'],
];
/* 2차 탭 (청풍문 시설 · 상태) */
const SECT_SUBS = [['hall', '정청', '正廳'], ['yeonmu', '연무장', '演武場'], ['forge', '화로', '火爐'], ['yard', '뒷마당', '後院'], ['shrine', '무신상', '武神像'], ['shop', '전방', '廛房']];
const STATUS_SUBS = [['gear', '무장', '武裝'], ['martial', '무공', '武功']];
const SUBS = { sect: SECT_SUBS, status: STATUS_SUBS };
const SUB_KEY = { sect: 'sectSub', status: 'statusSub' };

/* 사냥터에 나가 있으면 쓸 수 없는 시설 (연무장은 어디서나 볼 수 있다) */
const BASE_TABS = new Set(['shrine', 'forge', 'yard', 'hall', 'shop']);

/* 지금 보이는 화면: 1차 탭이 하위 탭을 가지면 고른 하위 탭 */
function screen() {
  const subs = SUBS[ui.tab]; if (!subs) return ui.tab;
  const cur = ui[SUB_KEY[ui.tab]];
  return subs.some(([id]) => id === cur) ? cur : subs[0][0];
}
/* 탭 이동. 청풍문은 들어올 때마다 첫 하위 탭(정청)부터, 상태는 마지막 하위 탭을 기억한다 */
function goTab(tab, sub) {
  ui.tab = tab;
  if (SUB_KEY[tab]) ui[SUB_KEY[tab]] = sub || (tab === 'sect' ? 'hall' : ui[SUB_KEY[tab]]);
  ui.craftResult = null;
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

function renderHeader() {
  const st = calcStats();
  $('#status').innerHTML = `
    <div class="who"><span class="name">${esc(S.name)}</span><span class="sect">청풍문 제자 · ${S.zone ? ZONES[S.zone.id].name : '청풍문'}</span></div>
    <div class="bars">${bar('hp', S.hp, st.maxHp, '활력')}${bar('mp', S.mp, st.maxMp, '내력')}${bar('sta', S.stamina, st.maxSta, '기력')}</div>
    <div class="purse"><span title="은자"><i class="coin">銀</i>${fmt(S.silver)}</span><span title="문파 공헌도"><i class="coin c2">功</i>${fmt(S.contrib)}</span></div>`;
}

function renderTabs() {
  $('#tabs').innerHTML = TABS.map(([id, ko, hj]) => `<button class="tab ${ui.tab === id ? 'on' : ''}" data-tab="${id}" ${RT.battle && id !== 'field' ? 'disabled' : ''}>${label(ko, hj)}</button>`).join('');
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
  const scr = screen(), bar = SUBS[ui.tab] ? subtabBar(ui.tab) : '';
  if (BASE_TABS.has(scr) && S.zone) {
    const [, ko, hj] = SECT_SUBS.find(t => t[0] === scr);
    main.innerHTML = bar + `<section class="panel">${head(ko, hj)}<p class="story">지금은 ${ZONES[S.zone.id].name}에 나와 있습니다. 청풍문으로 돌아가야 이곳을 쓸 수 있습니다.</p><div><button class="btn" data-act="leave">청풍문으로 귀환</button></div></section>`;
  } else {
    main.innerHTML = bar + ({ gear: viewGear, martial: viewMartial, bag: viewBag, yeonmu: viewYeonmu, shrine: viewShrine, forge: viewForge, yard: viewYard, hall: viewHall, shop: viewShop, field: viewField, codex: viewCodex })[scr]();
  }
  renderLog();
  renderModal();
  typewriteAll();
  stepFx();
  wireImages();
  drawMapLinks();
  centerMap();
  save();
}
