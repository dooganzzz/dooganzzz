/* [화면] 탭 화면의 공용 도우미(그림 · 등급 · 상성 표식 · 투력 카드)와 상태(무장 · 무공) · 행낭 화면. 청풍문 화면(정청 · 연무장 · 무신상 · 전방)은 ui_views_sect.js */

/* ───────── 이미지 (없으면 대체 그림) ───────── */
const IMG = {
  portrait: ASSET.portrait('character_default'),
  merchant: ASSET.portrait('npc_wang'),
  master: ASSET.portrait('npc_nobyeoksong'),
  joun: ASSET.portrait('npc_joun'),
  arin: ASSET.portrait('npc_arin'),
};

const brokenImg = new Set();

function imgOr(src, cls, fallback, alt = '') {
  if (brokenImg.has(src)) return fallback;
  return `<img src="${src}" class="${cls}" alt="${alt}" data-fb="${encodeURIComponent(fallback)}">`;
}

function wireImages() {
  for (const im of document.querySelectorAll('img[data-fb]:not([data-wired])')) {
    im.dataset.wired = '1';
    const fail = () => { brokenImg.add(im.getAttribute('src')); im.outerHTML = decodeURIComponent(im.dataset.fb); };
    if (im.complete && im.naturalWidth === 0) fail(); else im.addEventListener('error', fail, { once: true });
  }
}

/* 상태 › 무장: 제자 일러스트 카드 (3:4). 기본 이미지를 못 읽으면 먹빛 플레이스홀더 */
const PORTRAIT_FALLBACK = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400"><rect width="300" height="400" fill="#1b1612"/><g fill="none" stroke="#5d4a3a" stroke-width="3" opacity=".8"><circle cx="150" cy="120" r="44"/><path d="M70 360c6-92 40-150 80-150s74 58 80 150"/></g><text x="150" y="380" font-size="22" text-anchor="middle" fill="#7a6552" font-family="serif">形</text></svg>');
function portraitCard() {
  return `<div class="character-portrait-card">
    <img src="${IMG.portrait}" alt="제자의 형상" class="portrait-img" onerror="this.onerror=null;this.src='${PORTRAIT_FALLBACK}'">
    <div class="portrait-name-tag">청풍문 제자 (${esc(S.name || '무명')})</div>
  </div>`;
}

function portrait(who, seal, name) {
  return imgOr(IMG[who], 'npc-portrait', `<div class="npc-portrait fallback ${who}" role="img" aria-label="${name}">${seal}</div>`, name);
}

/* ───────── 등급 표기: 6단계 등급(하급·중급·상급·진품·명품·극품)마다 고유 색 (회·초·파·노·보·빨) ─────────
   무공 등급(삼류·이류)은 가까운 아이템 등급 색을 빌린다 */
const GRADE_CLASS_MAP = { '하급': 'grade-low', '중급': 'grade-mid', '상급': 'grade-high', '진품': 'grade-rare', '명품': 'grade-epic', '극품': 'grade-legend', '삼류': 'grade-low', '이류': 'grade-mid', '일류': 'grade-high', '절정': 'grade-rare', '초절정': 'grade-epic' };
const gradeClass = g => GRADE_CLASS_MAP[g] || 'grade-low';
const gradeBadge = g => `<span class="item-grade-badge">${g}</span>`;
/* 카드 머리: 이름(등급 색)과 등급 원형 뱃지를 양 끝에 */
const itemCardHead = (name, g, ico = '') => `<div class="item-card-header">${ico}<b class="item-name">${name}</b>${gradeBadge(g)}</div>`;

/* 상성 표식: 기공의 오행 · 경공의 지형 · 적의 오행/병기 */
const elemTag = e => e ? `<span class="aff-tag ${ELEMENTS[e].cls}" title="오행 ${ELEMENTS[e].name}(${ELEMENTS[e].hanja})">${ELEMENTS[e].hanja}</span>` : '';
const terrainTag = t => t ? `<span class="aff-tag tr" title="지형 ${TERRAINS[t].name}(${TERRAINS[t].hanja})">${TERRAINS[t].hanja}</span>` : '';
const manualAffTag = id => elemTag(MANUALS[id].elem) + terrainTag(MANUALS[id].terrain);
const weaponTag = w => w ? `<span class="aff-tag wp">${WEAPON_CLASS_NAME[WEAPON_CLASS[w]]}</span>` : '';

const realmTag = star => { const r = realmOf(star); return `<span class="realm ${r.cls}">${r.name} <small>${r.hanja}</small></span>`; };

/* 상태 탭 맨 위: 투력. 공세 · 수세 같은 내역은 보여 주지 않는다 (유저가 직접 찾아가도록) */
function cpCard() {
  const p = combatPowerParts(S);
  return `<section class="cp-card" aria-label="투력">
    <div class="cp-main" title="실제 전투 규칙으로 잰 종합 지수. 어디가 모자란지는 직접 겨뤄 보며 찾아가십시오."><span class="cp-label">${label('투력', '鬪力')}</span><b class="cp-value">${fmt(p.total)}</b>${cpDeltaHtml(calculateCombatPower(S))}</div>
    <div class="cp-attr">${Object.entries(ATTRS).map(([k, A]) => `<span title="${A.desc}">${A.name} <b>${attrOf(k)}</b></span>`).join('')}${S.talent ? `<span title="${TALENTS[S.talent].desc}">기예 <b>${TALENTS[S.talent].name}</b></span>` : ''}</div>
  </section>`;
}

/* 상태 › 무공 */
function viewMartial() {
  // 기운이 도는 고리 위에 비스듬히: 11시 심법 → 2시 기공 → 5시 경공 → 8시 무공 (십자 대칭을 버리고 흐름대로, 각도는 CSS --a)
  const POS = { simbeop: 'pos-12 slot-heart', mugong: 'pos-9 slot-attack', gigong: 'pos-3 slot-aura', gyeonggong: 'pos-6 slot-agility' };
  // 장착 칸: 네모 칸 안의 표지 · 갈래 이름 · 비급 이름 · 성급 (속성은 상세 창에서만). 누르면 그 비급 상세, 빈 칸은 그 갈래 창
  const card = cat => {
    const id = S.active[cat], C = CATS[cat];
    if (!id) return `<div class="slot-pos ${POS[cat]}"><div class="mslot skill-card-compact slot-lite empty" data-artslot="${cat}" role="button" tabindex="0" aria-haspopup="dialog"><span class="mslot-box"></span><div class="mslot-head-txt"><div class="mslot-cat slot-type-label">${label(C.name, C.hanja)}</div><small class="muted">비어 있음</small></div></div></div>`;
    const m = S.manuals[id];
    return `<div class="slot-pos ${POS[cat]}"><div class="mslot skill-card-compact slot-lite" data-mart="${id}" role="button" tabindex="0" aria-haspopup="dialog" title="《${MANUALS[id].name}》 — 눌러서 상세">
      <span class="mslot-box">${manualIco(id, 'mslot-cover')}</span><div class="mslot-head-txt"><div class="mslot-cat slot-type-label">${label(C.name, C.hanja)}</div><b class="mslot-name">《${MANUALS[id].name}》</b><span class="art-star skill-level">${m.star}<small>성</small></span></div>
    </div></div>`;
  };
  // 습득 비급 한 줄 (A안): 표지 · 이름 · 등급 · 경지 · 장착 중 · 성급 구슬 12개(돌파단 자리 표시) · 효과 한 줄 · 단추
  const starBtn = id => { const m = S.manuals[id]; if (m.star >= MAX_STAR) return '<span class="daesung">大成</span>';
    const why = starUpBlock(id), pill = GATES[m.star];
    return `<button class="btn ${why ? '' : 'primary'} sm starup btn-upgrade" data-starup="${id}" ${why ? 'disabled' : ''} title="${why || `수련치 ${fmt(starCost(id))}${pill ? ' + ' + ITEMS[pill].name : ''}`}">▲ ${m.star + 1}성 <small>${fmt(starCost(id))}${pill ? ' + ' + ITEMS[pill].name.replace(' 돌파단', '단') : ''}</small></button>`; };
  const pips = star => `<span class="star-pips" aria-label="${star} / ${MAX_STAR}성">${Array.from({ length: MAX_STAR }, (_, i) => `<i class="${i < star ? 'on' : ''} ${GATES[i] ? 'gate' : ''}"></i>`).join('')}</span>`;
  // 기운 순환 고리(확정본 그림 qi_ring): 천천히 돌고, 빛 한 점이 고리를 따라 돌며 비급 칸을 지날 때 칸이 환해진다 (칸은 고리 선 위에 꿰여 있음)
  const orbit = `<img class="qi-orbit qi-ring" src="${ASSET.ui('qi_ring')}" alt="" aria-hidden="true"><div class="qi-comet" aria-hidden="true"><i></i></div>`;
  const rp = rankProgress(), R = warriorRank();   // 좌선 테두리: 삼류 무공 성급만큼 파랗게 타오르는 게이지
  const slots = `${orbit}${card('simbeop')}${card('mugong')}<div class="meditation-center-frame ${rp.frac >= 1 ? 'full' : ''}" style="--rk:${(rp.lit / WARRIOR_RANK.lamps * 100).toFixed(3)}%" data-lit="${rp.lit}" title="${R.name} — 삼류 무공 성급 ${rp.per.reduce((a, v) => a + v, 0)} / ${CAT_ORDER.length * MAX_STAR}${rp.frac < 1 ? ' (네 갈래 모두 대성하면 이류무사)' : ''}"><img class="rank-ring off" src="${ASSET.ui('rank_ring_off')}" alt="" aria-hidden="true"><img class="rank-ring on" src="${ASSET.ui('rank_ring_on')}" alt="" aria-hidden="true"><div class="meditation-aura-ring"></div><div class="meditation-silhouette">${meditationArt()}</div><div class="meditation-caption">운기조식 (運氣調息)<small class="rank-name ${rp.frac >= 1 && S.rank ? 'up' : ''}">${R.name}</small></div></div>${card('gigong')}${card('gyeonggong')}`;
  const learned = Object.keys(S.manuals).sort((a, b) => CAT_ORDER.indexOf(MANUALS[a].cat) - CAT_ORDER.indexOf(MANUALS[b].cat) || Object.keys(GRADES).indexOf(MANUALS[b].grade) - Object.keys(GRADES).indexOf(MANUALS[a].grade) || koCmp(MANUALS[a].name, MANUALS[b].name));
  const books = itemSort(Object.keys(S.inv).filter(k => ITEMS[k].kind === '비급'));
  // 습득 비급: [무공] [심법] [경공] [기공] 탭으로 거른다 (카드를 누르면 상세·성급 창)
  const SKILL_TABS = [['attack', 'mugong', '무공'], ['heart', 'simbeop', '심법'], ['agility', 'gyeonggong', '경공'], ['aura', 'gigong', '기공']];
  const tab = SKILL_TABS.find(t => t[0] === ui.skillTab) || SKILL_TABS[0];
  const shown = learned.filter(id => MANUALS[id].cat === tab[1]);
  const cards = shown.map(id => {
    const M = MANUALS[id], m = S.manuals[id], worn = S.active[M.cat] === id;
    return `<div class="mrow ${worn ? 'worn is-equipped' : ''}">
      <button class="mrow-cover" data-mart="${id}" aria-label="《${M.name}》 자세히">${manualIco(id)}</button>
      <div class="mrow-main"><b class="mrow-name" data-mart="${id}" role="button" tabindex="0">《${M.name}》${manualAffTag(id)}</b>
        <div class="mrow-meta">${gradeBadge(M.grade)}${realmTag(m.star)}${worn ? '<span class="card-status-tag active">장착 중</span>' : ''}</div>
        ${pips(m.star)}<small class="mrow-eff">${bonusText(manualBonus(id, m.star)) || esc(M.desc || '')}</small></div>
      <div class="mrow-btns">${starBtn(id)}${worn ? `<button class="btn ghost sm btn-unequip" data-unequipm="${M.cat}">장착 해제</button>` : `<button class="btn sm" data-equipm="${id}">장착</button>`}</div>
    </div>`;
  }).join('');
  const skillTabs = `<div class="skill-category-tabs" role="tablist" aria-label="습득 비급 분류">${SKILL_TABS.map(([k, , n]) => `<button class="tab-btn ${tab[0] === k ? 'active' : ''}" role="tab" aria-selected="${tab[0] === k}" data-skilltab="${k}">${n} <small>${learned.filter(id => MANUALS[id].cat === SKILL_TABS.find(t => t[0] === k)[1]).length}</small></button>`).join('')}</div>`;
  return `<section class="panel martial-slots">
    ${head('무공', '武功', `<span class="exp-purse" title="탐험에서 적을 쓰러뜨려 모은 수련치">수련치 <b>${fmt(S.exp)}</b></span>`)}
    <p class="muted exp-help">탐험에서 모은 수련치로 원하는 무공의 성급을 올립니다. 5→6성(소성)·11→12성(대성)에는 돌파단도 듭니다.</p>
    <div class="mslots martial-arts-core-layout">${slots}</div>
  </section>
  <section class="panel martial-learned acquired-skills-section">
    <div class="section-header-row">
      <div class="section-title-wrap"><h3 class="section-title">${label('습득 비급', '習得秘笈')}</h3><span class="total-count-badge" id="total-acquired-count">${learned.length}종</span></div>
      ${skillTabs}
    </div>
    ${!learned.length ? `<p class="story">아직 익힌 비급이 없습니다. ${books.length ? `비급 ${books.length}권을 가지고 있습니다. 아래에서 [ 익히기 ] 하십시오.` : ''}</p>`
      : shown.length ? `<div class="mrows acquired-cards-grid" id="acquired-cards-container">${cards}</div>` : '<div class="empty-notice">해당 계열에 익힌 비급이 없습니다.</div>'}
    ${books.length ? `<div class="chips">${books.map(k => `<button class="chip" data-use="${k}">📘 ${ITEMS[k].name} 익히기</button>`).join('')}</div>` : ''}
  </section>`;
}

/* 장비를 끼면 투력이 얼마나 바뀌는지 (▲ 오름 · ▼ 내림). 공세 · 수세 방향은 알려 주지 않는다 */
function cpDiffTag(it, slot) {
  const d = cpTryGear(it, slot).cp;
  return `<small class="cp-diff ${d > 0 ? 'up' : d < 0 ? 'down' : ''}">끼면 투력 ${d > 0 ? '▲' : d < 0 ? '▼' : ''}${fmt(Math.abs(d))}</small>`;
}

/* 무장 · 행낭 */
function statLine(it) { return Object.entries(gearStats(it)).map(([k, v]) => `${STAT_NAMES[k]} +${v}${PCT_STATS.has(k) ? '%' : ''}`).join(' · '); }


/* 상태 › 무장: 착용 장비 슬롯 · 선택 장비 강화 · 능력치 */
/* 상태 › 관조: 활력 · 내력 · 수련치 · 은자 · 공헌(#vitals, 매초 갱신) + 투력 카드 + 세부 능력치표 */
function viewObserve() {
  const st = calcStats();
  const statList = ['atk', 'def', 'maxHp', 'maxMp', 'spd', 'eva', 'crit', 'critRes', 'counter', 'critDmg', 'block', 'shield', 'aura', 'luck', 'mpRegen', 'mpCost', 'train', 'craft', 'maxSta'].map(k => `<div><span>${STAT_NAMES[k]}</span><b>${st[k]}${PCT_STATS.has(k) ? '%' : ''}</b></div>`).join('');
  return `<section class="vitals" id="vitals">${vitalsHtml(st)}</section>${cpCard()}
  <section class="panel observe">${head('능력치', '能力')}<div class="statsheet">${statList}</div></section>`;
}
function viewGear() {
  const st = calcStats();
  // 장착 칸 카드: 부위 아이콘 · 칸 이름 · 장착한 장비(없으면 비어있음) · 행낭에 이 칸에 맞는 장비 수
  const slot = (s, cls = '') => {
    const it = S.equip[s];
    return `<button class="equip-slot-card dslot ${cls} ${it ? 'r' + it.rarity : 'empty'}" data-slot="${s}" aria-haspopup="dialog">${slotIcon(s)}<small class="slot-label">${SLOTS[s].name}</small><span class="slot-item-name ${it ? 'equipped' : 'empty'}">${it ? gearName(it) : '비어있음'}</span>${slotCount(s)}</button>`;
  };
  const slotCount = s => { const n = S.gear.filter(g => g.slot === slotAccepts(s)).length; return n ? `<em class="slot-n" title="행낭에 이 칸에 맞는 장비 ${n}점">+${n}</em>` : ''; };
  return `<section class="panel">
    ${head('무장', '武裝', `<button class="btn primary sm auto-equip" data-act="autoequip" title="행낭 장비 가운데 투력이 가장 많이 오르는 것으로 한 번에 바꿉니다">⚡ 자동 장착</button>`)}
    <div class="bag-top">
      <div class="armory">
        <!-- 왼쪽: 가락지 · 무기 · 요대 / 가운데: 투구 + 제자 초상 / 오른쪽: 옥대 · 호갑 · 가락지 -->
        <div class="equipment-view-layout paperdoll">
          <div class="equip-column equip-left">${slot('ring')}${slot('weapon')}${slot('belt')}</div>
          <div class="character-center-frame">${slot('helmet', 'slot-top')}<div class="char-illustration-container doll-wrap">${portraitCard()}</div></div>
          <div class="equip-column equip-right">${slot('jade')}${slot('armor')}${slot('ring2')}</div>
        </div>
        <div class="equipment-bottom-bar acc-row">${['boots', 'badge'].map(s => slot(s, 'small')).join('')}</div>
      </div>
      <div class="side-col">
        <p class="muted slot-help">장비 칸을 누르면 그 부위에 맞는 행낭 장비가 떠서 바로 장착·교체·해제·강화할 수 있습니다.</p>
      </div>
    </div>
  </section>`;
}

/* 행낭: 보관 장비 · 소지품 */
function viewBag() {
  // 분류: 전체 · 무기 · 방어구 · 장신구(장비 부위는 전방 장비 탭과 같음) · 기타(장비 밖의 모든 소지품)
  const tabs = [['all', '전체'], ['weapon', '무기'], ['armor', '방어구'], ['acc', '장신구'], ['etc', '기타']], f = tabs.some(t => t[0] === ui.bagFilter) ? ui.bagFilter : 'all';
  const gear = f === 'etc' ? [] : gearSort(S.gear.filter(it => f === 'all' || SHOP_GEAR_TABS[f].slots.includes(it.slot)));
  const items = f === 'all' || f === 'etc' ? itemSort(Object.keys(S.inv)) : [];
  return `<section class="panel">
    ${head('행낭', '行囊', `<span class="num muted">${bagUsed()} / ${bagCap()}칸</span>`)}
    <div class="chips">${tabs.map(([k, n]) => `<button class="chip ${f === k ? 'on' : ''}" data-filter="${k}">${n}</button>`).join('')}</div>
    ${gear.length ? `<div class="gears">${gear.map(it => `<div class="gear item-card r${it.rarity} ${gradeClass(RARITY[it.rarity].name)}">${itemCardHead(it.name, RARITY[it.rarity].name, gearIco(it, 'card'))}<small class="muted item-category">${SLOTS[it.slot].name}${it.wtype ? ' · ' + WEAPON_SHORT[it.wtype] : ''}</small><small>${statLine(it)}</small>${it.unique ? `<small class="uniq">✦ ${it.unique.text}</small>` : ''}${cpDiffTag(it)}<div class="btns"><button class="btn sm" data-equip="${it.uid}">착용</button><button class="btn ghost sm" data-discard="${it.uid}">버리기</button></div></div>`).join('')}</div>` : ''}
    <div class="items">${items.map(id => { const I = ITEMS[id]; return `<div class="item"><span class="icon">${itemIco(id)}</span><div><b>${I.name}</b> <span class="num">×${count(id)}</span><small>${I.desc}</small></div>${I.use ? `<button class="btn sm" data-use="${id}">${I.kind === '비급' ? '익히기' : '사용'}</button>` : '<span></span>'}</div>`; }).join('')}</div>
    ${gear.length || items.length ? '' : '<p class="muted">이 갈래에 든 것이 없습니다.</p>'}
  </section>`;
}
