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
/* 카드 머리: 그림과 이름 (등급은 이름 색으로만 — 하급·중급 같은 글자 뱃지는 두지 않는다) */
const itemCardHead = (name, g, ico = '') => `<div class="item-card-header">${ico ? inkBox(ico) : ''}<b class="item-name">${name}</b></div>`;

/* 상성 표식: 기공의 오행 · 경공의 지형 · 적의 오행/병기 */
const elemTag = e => e ? `<span class="aff-tag ${ELEMENTS[e].cls}" title="오행 ${ELEMENTS[e].name}(${ELEMENTS[e].hanja})">${ELEMENTS[e].hanja}</span>` : '';
const terrainTag = t => t ? `<span class="aff-tag tr" title="지형 ${TERRAINS[t].name}(${TERRAINS[t].hanja})">${TERRAINS[t].hanja}</span>` : '';
const manualAffTag = id => elemTag(MANUALS[id].elem) + terrainTag(MANUALS[id].terrain);
/* 파 표식 (正 · 魔 · 邪): 정마사 상성과 파의 고유 효과 */
const schoolTag = id => { const k = schoolOf(id), P = SCHOOLS[k]; return `<span class="school-tag s-${k}" title="${P.name}(${P.hanja}) — ${P.desc} ${P.bonus}. ${P.hanja}는 ${SCHOOLS[P.beats].hanja}를 이긴다">${P.hanja}</span>`; };
const weaponTag = w => w ? `<span class="aff-tag wp">${WEAPON_CLASS_NAME[WEAPON_CLASS[w]]}</span>` : '';

const realmTag = star => { const r = realmOf(star); return `<span class="realm ${r.cls}">${r.name} <small>${r.hanja}</small></span>`; };

/* 상태 탭 맨 위: 투력. 공세 · 수세 같은 내역은 보여 주지 않는다 (유저가 직접 찾아가도록) */
/* 상태 › 무공 */
function viewMartial() {
  // 기운이 도는 고리 위에 비스듬히: 11시 심법 → 2시 기공 → 5시 경공 → 8시 무공 (십자 대칭을 버리고 흐름대로, 각도는 CSS --a)
  const POS = { simbeop: 'pos-12 slot-heart', mugong: 'pos-9 slot-attack', gigong: 'pos-3 slot-aura', gyeonggong: 'pos-6 slot-agility' };
  // 장착 칸: 네모 칸 안의 표지 · 갈래 이름 · 비급 이름 · 성급 (속성은 상세 창에서만). 누르면 그 비급 상세, 빈 칸은 그 갈래 창
  const card = cat => {
    const id = S.active[cat], C = CATS[cat];
    if (!id) return `<div class="slot-pos ${POS[cat]}"><div class="mslot skill-card-compact slot-lite empty" data-artslot="${cat}" role="button" tabindex="0" aria-haspopup="dialog"><span class="mslot-box">${inkFrame()}</span><div class="mslot-head-txt"><div class="mslot-cat slot-type-label">${label(C.name, C.hanja)}</div><small class="muted">비어 있음</small></div></div></div>`;
    const m = S.manuals[id];
    return `<div class="slot-pos ${POS[cat]}"><div class="mslot skill-card-compact slot-lite" data-mart="${id}" role="button" tabindex="0" aria-haspopup="dialog" title="《${MANUALS[id].name}》 — 눌러서 상세">
      <span class="mslot-box">${inkFrame()}${manualIco(id, 'mslot-cover')}</span><div class="mslot-head-txt"><div class="mslot-cat slot-type-label">${label(C.name, C.hanja)}</div><b class="mslot-name">《${MANUALS[id].name}》</b><span class="art-star skill-level">${m.star}<small>성</small></span></div>
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
  const slots = `${orbit}${card('simbeop')}${card('mugong')}<div class="meditation-center-frame ${rp.frac >= 1 ? 'full' : ''}" style="--rk:${(rp.lit / WARRIOR_RANK.lamps * 100).toFixed(3)}%" data-lit="${rp.lit}" title="${R.name} — 삼류 무공 성급 ${rp.per.reduce((a, v) => a + v, 0)} / ${CAT_ORDER.length * MAX_STAR}${rp.frac < 1 ? ` (네 갈래 모두 대성하고 ${ITEMS[WARRIOR_RANK.pill.id].name} ${WARRIOR_RANK.pill.n}알이면 이류무사)` : ''}"><img class="rank-ring off" src="${ASSET.ui('rank_ring_off')}" alt="" aria-hidden="true"><img class="rank-ring on" src="${ASSET.ui('rank_ring_on')}" alt="" aria-hidden="true"><div class="meditation-aura-ring"></div><div class="meditation-silhouette">${meditationArt()}</div><div class="meditation-caption">운기조식 (運氣調息)<small class="rank-name ${rp.frac >= 1 && S.rank ? 'up' : ''}">${R.name}</small>${rp.frac >= 1 && !S.rank ? `<small class="rank-pill">${ITEMS[WARRIOR_RANK.pill.id].name} ${Math.min(count(WARRIOR_RANK.pill.id), WARRIOR_RANK.pill.n)} / ${WARRIOR_RANK.pill.n}알이면 돌파</small>` : ''}</div></div>${card('gigong')}${card('gyeonggong')}`;
  const learned = Object.keys(S.manuals).sort((a, b) => CAT_ORDER.indexOf(MANUALS[a].cat) - CAT_ORDER.indexOf(MANUALS[b].cat) || Object.keys(GRADES).indexOf(MANUALS[b].grade) - Object.keys(GRADES).indexOf(MANUALS[a].grade) || koCmp(MANUALS[a].name, MANUALS[b].name));
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
  // 2단: 왼쪽 운기조식(80% 크기) · 오른쪽 습득 비급(운기조식 높이에 맞추고 안에서만 스크롤). 좁으면 아래로
  return `<div class="martial-duo">
  <section class="panel martial-slots">
    ${head('무공', '武功', `<span class="exp-purse" title="탐험에서 적을 쓰러뜨려 모은 수련치">수련치 <b>${fmt(S.exp)}</b></span>`)}
    <div class="mslots martial-arts-core-layout">${slots}</div>
  </section>
  <section class="panel martial-learned acquired-skills-section">
    <div class="section-header-row">
      <div class="section-title-wrap"><h3 class="section-title">${label('습득 비급', '習得秘笈')}</h3><span class="total-count-badge" id="total-acquired-count">${learned.length}종</span></div>
      ${skillTabs}
    </div>
    <div class="martial-learned-scroll">
    ${!learned.length ? '<p class="story">아직 익힌 비급이 없습니다.</p>'
      : shown.length ? `<div class="mrows acquired-cards-grid" id="acquired-cards-container">${cards}</div>` : '<div class="empty-notice">해당 계열에 익힌 비급이 없습니다.</div>'}
    </div>
  </section>
  </div>`;
}

/* 장비를 끼면 투력이 얼마나 바뀌는지 (▲ 오름 · ▼ 내림). 공세 · 수세 방향은 알려 주지 않는다 */
function cpDiffTag(it, slot) {
  const d = cpTryGear(it, slot).cp;
  return `<small class="cp-diff ${d > 0 ? 'up' : d < 0 ? 'down' : ''}">투력 ${d > 0 ? '▲' : d < 0 ? '▼' : ''}${fmt(Math.abs(d))}</small>`;
}

/* 무장 · 행낭 */
function statLine(it) { return Object.entries(gearStats(it)).map(([k, v]) => `${STAT_NAMES[k]} +${v}${PCT_STATS.has(k) ? '%' : ''}`).join(' · '); }


/* 상태 › 무장: 착용 장비 슬롯 · 선택 장비 강화 · 능력치 */
/* 상태 › 관조: 왼쪽 능력치(메인 #vitals 매초 갱신 · 성향 · 세부) · 오른쪽 무장 */
function viewObserve() {
  const st = calcStats();
  const statList = ['atk', 'def', 'maxHp', 'maxMp', 'spd', 'eva', 'crit', 'critRes', 'counter', 'critDmg', 'block', 'shield', 'aura', 'luck', 'mpRegen', 'mpCost', 'train', 'craft', 'maxSta'].map(k => `<div><span>${STAT_NAMES[k]}</span><b>${st[k] ?? 0}${PCT_STATS.has(k) ? '%' : ''}</b></div>`).join('')
    + (S.talent ? `<div><span>기예</span><b>${TALENTS[S.talent].name}</b></div>` : '');
  return `<div class="observe-duo"><div class="observe-left">
  <section class="panel hopae-panel">${head('호패', '號牌')}<button class="hopae-btn" data-act="hopae" title="눌러서 별호 새기기">${hopaeCard()}</button><div class="cp-card obs-cp" id="obsCp">${cpCardHtml()}</div></section>
  <section class="panel observe">${head('능력치', '能力')}
    <h4 class="obs-h">근본 능력치</h4><section class="vitals" id="vitals">${vitalsHtml(st)}</section>
    <button class="obs-h obs-toggle" data-act="obsdetail" aria-expanded="${!!ui.obsDetail}">세부 능력치 <span class="fold-arrow">${ui.obsDetail ? '▲' : '▼'}</span></button>${ui.obsDetail ? `<div class="statsheet">${statList}</div>` : ''}
  </section></div>
  ${viewGear()}
  </div>`;
}
/* 호패: 성명 · 별호 · 무공 경지를 패에 세로로 새기고 강호견문록 낙관을 찍는다. edit면 별호 새기기 칸을 곁에 둔다 (관조) */
function hopaeCard() {
  const R = WARRIOR_RANK.ranks[Math.min(S.rank || 0, WARRIOR_RANK.ranks.length - 1)];
  return `<div class="hopae-wrap"><div class="hopae"><img class="hopae-board" src="${ASSET.ui('hopae_big')}" alt="호패">
      ${S.alias ? `<span class="hp-col hp-alias">${esc(S.alias)}</span>` : ''}<b class="hp-col hp-name n${Math.min(8, [...S.name].length)}">${esc(S.name)}<img class="nakgwan hopae-seal" src="${ASSET.ui('nakgwan')}" alt="강호견문록 낙관"></b><span class="hp-col hp-rank">${R.name}</span></div></div>`;
}
/* 별호 새기기 칸 (호패를 누르면 뜨는 창에서만) */
const titlePicker = () => `<div class="alias-row"><select id="titleSel" aria-label="별호 고르기">${Object.keys(S.titles || {}).filter(id => TITLES[id]).map(id => `<option value="${id}" ${S.title === id ? 'selected' : ''}>${TITLES[id].name} (${TITLE_TIERS[TITLES[id].tier].name})</option>`).join('')}</select><button class="btn sm" data-act="setalias">새기기</button></div>`;
/* 성향: 익힌 비급의 정 · 마 · 사 수로 삼각형 안의 자리(무게 중심)를 정한다 — 정 2 · 마 1 · 사 1이면 정 쪽으로 치우친 점 */
const SCHOOL_TRI = { jeong: [50, 20], ma: [18.6, 73], sa: [83.6, 72.8] };   // 꼭짓점 (그림 school_tri 위 %)
function schoolTriangle() {
  const n = { jeong: 0, ma: 0, sa: 0 };
  for (const id of Object.keys(S.manuals)) if (MANUALS[id]) n[schoolOf(id)]++;
  const tot = n.jeong + n.ma + n.sa, w = k => tot ? n[k] / tot : 1 / 3, mx = Math.max(1, n.jeong, n.ma, n.sa);
  const x = Object.keys(n).reduce((a, k) => a + w(k) * SCHOOL_TRI[k][0], 0), y = Object.keys(n).reduce((a, k) => a + w(k) * SCHOOL_TRI[k][1], 0);
  const top = Object.keys(n).sort((a, b) => n[b] - n[a]), lead = tot && n[top[0]] > n[top[1]] ? top[0] : null;
  // 글 · 숫자 없이: 많이 익힌 쪽 구슬일수록 빛이 짙어지고(--w) 덜 익힌 쪽은 흐려진다. 손을 대면 장착한 비급과 그 파를 보인다
  const worn = CAT_ORDER.map(c => S.active[c]).filter(id => id && MANUALS[id]);
  const tip = worn.length ? worn.map(id => `<li><b class="s-${schoolOf(id)}">${SCHOOLS[schoolOf(id)].name}</b> 《${esc(MANUALS[id].name)}》</li>`).join('') : '<li class="muted">장착한 비급 없음</li>';
  return `<div class="school-tri" tabindex="0" aria-label="성향 — 장착한 비급 보기">
    <div class="st-board"><img src="${ASSET.ui('school_tri')}" alt="" aria-hidden="true">
      ${Object.entries(SCHOOL_TRI).map(([k, [cx, cy]]) => `<i class="st-glow s-${k}" style="left:${cx}%;top:${cy}%;--w:${(tot ? n[k] / mx : 0).toFixed(2)}"></i>`).join('')}
      <i class="st-dot ${lead ? 's-' + lead : ''}" style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%"></i></div>
    <ul class="st-tip" role="tooltip">${tip}</ul>
  </div>`;
}
function viewGear() {
  const st = calcStats();
  // 장착 칸 카드: 부위 아이콘 · 칸 이름 · 장착한 장비(없으면 비어있음) · 행낭에 이 칸에 맞는 장비 수
  const slot = (s, cls = '') => {
    const it = S.equip[s];
    return `<button class="equip-slot-card dslot ${cls} ${it ? 'r' + it.rarity : 'empty'}" data-slot="${s}" aria-haspopup="dialog">${inkBox(slotIcon(s))}<small class="slot-label">${SLOTS[s].name}</small><span class="slot-item-name ${it ? 'equipped' : 'empty'}">${it ? gearName(it) : '비어있음'}</span></button>`;
  };
  return `<section class="panel gear-panel">
    ${head('무장', '武裝')}
    <button class="btn primary sm auto-equip" data-act="autoequip" title="행낭 장비 가운데 투력이 가장 많이 오르는 것으로 한 번에 바꿉니다">채비</button>
    <div class="gear-tend"><h4 class="obs-h">성향 <small>性向</small></h4>${schoolTriangle()}</div>
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
      
    </div>
  </section>`;
}

/* 행낭: 보관 장비 · 소지품 */
function viewBag() {
  // 분류: 전체 · 무기 · 방어구 · 장신구(장비 부위는 전방 장비 탭과 같음) · 비급 · 기타(장비 · 비급 밖의 모든 소지품)
  const tabs = [['all', '전체'], ['weapon', '무기'], ['armor', '방어구'], ['acc', '장신구'], ['book', '비급'], ['etc', '기타']], f = tabs.some(t => t[0] === ui.bagFilter) ? ui.bagFilter : 'all';
  const gear = f === 'etc' || f === 'book' ? [] : gearSort(S.gear.filter(it => f === 'all' || SHOP_GEAR_TABS[f].slots.includes(it.slot)));
  const isBook = k => ITEMS[k] && ITEMS[k].kind === '비급';
  const items = f === 'all' ? itemSort(Object.keys(S.inv)) : f === 'book' ? itemSort(Object.keys(S.inv).filter(isBook)) : f === 'etc' ? itemSort(Object.keys(S.inv).filter(k => !isBook(k))) : [];
  return `<section class="panel bag-panel">
    ${head('행낭', '行囊', `<span class="bag-silver" title="은자 ${fmt(S.silver)}냥">${uiIco('h_silver')}은자 <b>${fmt(S.silver)}</b></span><span class="num muted bag-cap">${bagUsed()} / ${bagCap()}칸</span>`)}
    <div class="chips">${tabs.map(([k, n]) => `<button class="chip ${f === k ? 'on' : ''}" data-filter="${k}">${n}</button>`).join('')}</div>
    ${gear.length || items.length ? `<div class="bag-tiles">${gear.map(it => `<button class="bag-tile ${gradeClass(RARITY[it.rarity].name)}" data-bagitem="g:${it.uid}" title="${esc(it.name)}">${inkBox(gearIco(it, 'card'))}<b class="item-name">${it.name}</b></button>`).join('')}${items.map(id => `<button class="bag-tile" data-bagitem="i:${id}" title="${esc(ITEMS[id].name)}">${inkBox(itemIco(id))}<b class="item-name">${ITEMS[id].name}</b><span class="num bag-n">×${count(id)}</span></button>`).join('')}</div>` : ''}
    ${gear.length || items.length ? '' : '<p class="muted">이 갈래에 든 것이 없습니다.</p>'}
  </section>`;
}
