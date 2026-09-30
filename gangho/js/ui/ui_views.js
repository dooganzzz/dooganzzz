/* [화면] 탭 화면: 청풍문(정청·화로·뒷마당·무신상·전방) · 상태(무장·무공) · 행낭 · 도감 */

/* ───────── 이미지 (없으면 대체 그림) ───────── */
const IMG = {
  doll: 'assets/character_silhouette.png',
  merchant: 'assets/portraits/npc_wang.png',
  master: 'assets/portraits/npc_nobyeoksong.png',
  joun: 'assets/portraits/npc_joun.png',
  arin: 'assets/portraits/npc_arin.png',
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

function portrait(who, seal, name) {
  return imgOr(IMG[who], 'npc-portrait', `<div class="npc-portrait fallback ${who}" role="img" aria-label="${name}">${seal}</div>`, name);
}

const realmTag = star => { const r = realmOf(star); return `<span class="realm ${r.cls}">${r.name} <small>${r.hanja}</small></span>`; };

/* 상태 탭 맨 위: 종합 전투력과 내역 */
function cpCard() {
  const p = combatPowerParts(S), W = CP_WEIGHTS;
  return `<section class="cp-card" aria-label="종합 전투력">
    <div class="cp-main"><span class="cp-label">${label('전투력', '戰鬪力')}</span><b class="cp-value">${fmt(p.total)}</b></div>
    <div class="cp-parts">
      <span title="최대 활력 × ${W.maxHp} + 최대 내력 × ${W.maxMp}">체력·내력 <b>${fmt(p.base)}</b></span>
      <span title="공격력 × ${W.atk} + 방어력 × ${W.def}">공격·방어 <b>${fmt(p.gear)}</b></span>
      <span title="장착 무공 4종: 등급 계수 × 성 × ${W.art}">무공 <b>${fmt(p.arts)}</b></span>
    </div>
  </section>`;
}

/* 상태 › 무공 */
function viewMartial() {
  const slots = CAT_ORDER.map(cat => {
    const id = S.active[cat], C = CATS[cat];
    if (!id) return `<div class="mslot empty"><div class="mslot-cat">${label(C.name, C.hanja)}</div><small class="muted">${C.desc}</small><p class="muted">비어 있음</p></div>`;
    const M = MANUALS[id], m = S.manuals[id];
    return `<div class="mslot" data-mart="${id}" role="button" tabindex="0">
      <div class="mslot-cat">${label(C.name, C.hanja)}</div>
      <b class="mslot-name">《${M.name}》</b>${realmTag(m.star)}
      <span class="art-star">${m.star}<small>성</small></span>
      ${m.star < MAX_STAR ? (() => { const why = starUpBlock(id), pill = GATES[m.star]; return `<button class="btn ${why ? '' : 'primary'} sm starup" data-starup="${id}" ${why ? 'disabled' : ''} title="${why || `경험치 ${fmt(starCost(id))}${pill ? ' + ' + ITEMS[pill].name : ''}`}">▲ ${m.star + 1}성 <small>${fmt(starCost(id))}${pill ? ' + ' + ITEMS[pill].name.replace(' 돌파단', '단') : ''}</small></button>`; })() : '<span class="daesung">大成</span>'}
      <button class="btn ghost sm" data-unequipm="${cat}">장착 해제</button>
    </div>`;
  }).join('');
  const learned = Object.keys(S.manuals).sort((a, b) => CAT_ORDER.indexOf(MANUALS[a].cat) - CAT_ORDER.indexOf(MANUALS[b].cat));
  const books = Object.keys(S.inv).filter(k => ITEMS[k].kind === '비급');
  const cards = learned.map(id => {
    const M = MANUALS[id], m = S.manuals[id], worn = S.active[M.cat] === id;
    return `<button class="mcard ${worn ? 'worn' : ''}" data-mart="${id}"><small>${CATS[M.cat].name} · ${M.grade}</small><b>《${M.name}》</b>${realmTag(m.star)}<span class="art-star">${m.star}<small>성</small></span>${worn ? '<span class="pill">운용 중</span>' : ''}</button>`;
  }).join('');
  return `<section class="panel">
    ${head('무공', '武功', `<span class="exp-purse" title="탐험에서 적을 쓰러뜨려 모은 경험치">경험치 <b>${fmt(S.exp)}</b></span>`)}
    <p class="muted exp-help">탐험에서 모은 경험치로 원하는 무공의 성급을 올립니다. 5→6성(소성)·11→12성(대성)에는 돌파단도 듭니다.</p>
    <div class="mslots">${slots}</div>
  </section>
  <section class="panel">
    ${head('익힌 무공', '習得', `<span class="num muted">${learned.length}종</span>`)}
    ${learned.length ? `<div class="mcards">${cards}</div>` : `<p class="story">아직 익힌 무공이 없습니다. ${books.length ? `비급 ${books.length}권을 가지고 있습니다. 아래에서 [ 익히기 ] 하십시오.` : ''}</p>`}
    ${books.length ? `<div class="chips">${books.map(k => `<button class="chip" data-use="${k}">📘 ${ITEMS[k].name} 익히기</button>`).join('')}</div>` : ''}
  </section>`;
}

/* 무신상 */
function viewShrine() {
  const offers = Object.entries(OFFER).map(([id, o]) => `
    <div class="offer"><span class="offer-icon">${ITEMS[id].icon}</span><b>${ITEMS[id].name}</b><span class="num">${count(id)}개</span><small>봉헌 1회 · ${o.text}</small>
      <div class="btns"><button class="btn sm" data-offer="${id}" ${has(id) ? '' : 'disabled'}>봉헌</button><button class="btn sm ghost" data-offerall="${id}" ${count(id) < 2 ? 'disabled' : ''}>모두</button></div></div>`).join('');
  return `<section class="panel altar">
    ${head('무신상', '武神像')}
    <p class="story">이름도 전해지지 않는 무신의 석상. 화로에서 실패하고 남은 부산물을 바치면, 석상은 말없이 힘을 내려줍니다. 열 번 바칠 때마다 눈빛이 한 번씩 밝아집니다.</p>
    <div class="blessings">
      <div><small>공격력</small><b>+${S.shrine.atk}</b></div><div><small>최대 내력</small><b>+${S.shrine.mp}</b></div>
      <div><small>회피율</small><b>+${S.shrine.eva}%</b></div><div><small>치명타율</small><b>+${Math.floor(S.shrine.total / 10) * 2}%</b></div>
      <div><small>누적 봉헌</small><b>${S.shrine.total}회</b></div>
    </div>
    <div class="offers">${offers}</div>
  </section>`;
}

/* 화로 */
function viewForge() {
  const C = CRAFTS[ui.craft];
  const ctype = CRAFT_TYPE[ui.craft];
  const mats = Object.keys(S.inv).filter(id => ITEMS[id].craftType === ctype).sort((a, b) => ITEMS[a].name.localeCompare(ITEMS[b].name));
  const flat = Object.entries(ui.pot).filter(([, n]) => n > 0).flatMap(([id, n]) => Array(n).fill(id));
  const res = ui.craftResult;
  return `<section class="panel">
    ${head('화로', '火爐')}
    <div class="crafts">${Object.entries(CRAFTS).map(([k, c]) => `<button class="craft-pick ${ui.craft === k ? 'on' : ''}" data-craft="${k}">${label(c.name, `(${c.hanja})`)}</button>`).join('')}</div>
    <div class="forge">
      <div class="pot">
        <p class="story flame">${fireText(ui.craft)}</p>
        <div class="pot-slots">${Array.from({ length: POT_MAX }, (_, i) => flat[i] ? `<button class="slot full" data-rem="${flat[i]}" title="${ITEMS[flat[i]].name} 빼기">${ITEMS[flat[i]].icon}<small>${ITEMS[flat[i]].name}</small></button>` : '<div class="slot"></div>').join('')}</div>
        <div class="btns"><button class="btn primary" data-act="craft" ${flat.length ? '' : 'disabled'}>${C.name}</button><button class="btn ghost" data-act="clearpot" ${flat.length ? '' : 'disabled'}>비우기</button></div>
        ${(() => { const n = flat.length && craftNoteFor(ui.craft, ui.pot); return n ? `<p class="note-warn ${n.ok ? 'ok' : ''}">📓 연구 노트: 이미 해 본 조합입니다 — ${n.ok ? `성공 (${recipeName({ out: n.out })})` : n.near ? '실패했지만 불길이 크게 일렁였습니다' : '실패'}</p>` : ''; })()}
        ${res ? `<div class="result ${res.ok ? 'ok' : 'fail'}"><b class="${res.cls || ''}">${res.ok ? '성공' : '실패'} — ${res.text}</b>${res.first ? '<span class="new">도감 등재</span>' : ''}<small>${esc(res.sub || '')}</small></div>` : ''}
      </div>
      <div class="mats">
        <h4>${C.name} 재료</h4>
        <div class="chips">${mats.map(id => { const left = count(id) - (ui.pot[id] || 0); return `<button class="chip" data-add="${id}" ${left <= 0 ? 'disabled' : ''}>${ITEMS[id].icon} ${ITEMS[id].name} <b>${left}</b></button>`; }).join('')}</div>
      </div>
    </div>
  </section>
  ${researchNotes(ui.craft)}`;
}

/* 뒷마당 */
function viewYard() {
  const foods = Object.keys(S.inv).filter(id => ITEMS[id].use && ITEMS[id].kind !== '비급');
  const restReady = S.restCd <= now();
  return `<section class="panel">
    ${head('뒷마당', '後院')}
    <div class="row">
      <div class="card">
        <h3>평상에 누워 휴식</h3>
        <p class="story">${restReady ? '햇볕이 좋습니다. 한숨 자고 나면 활력·내력·기력이 모두 돌아올 것 같습니다.' : `아직 눈이 말똥말똥합니다. 활력·내력은 채울 수 있지만, 기력은 ${Math.ceil((S.restCd - now()) / 60000)}분쯤 더 지나야 돌아옵니다.`}</p>
        <div><button class="btn primary" data-act="rest">휴식</button></div>
      </div>
      <div class="card">
        <h3>음식·영약 먹기</h3>
        <div class="chips">${foods.map(id => `<button class="chip" data-use="${id}" title="${esc(ITEMS[id].desc)}">${ITEMS[id].icon} ${ITEMS[id].name} <b>${count(id)}</b></button>`).join('')}</div>
        ${S.buffs.length ? `<div class="chips">${S.buffs.map(b => `<span class="pill">${b.name} ${Math.ceil((b.until - now()) / 60000)}분</span>`).join('')}</div>` : ''}
      </div>
    </div>
  </section>
  <section class="panel npc">
    <div class="npc-head">${portrait('arin', '璘', '아린')}<div><h3>${label('아린', '사매')}</h3><p class="story" data-tw="npc">붉은 댕기를 휘날리며 뛰어옵니다. "사형! 사형! 오늘은 뭐 해요?"</p></div></div>
    <div class="btns">
      <button class="btn" data-act="snack" ${S.arin.snack === today() ? 'disabled' : ''}>🍪 ${S.arin.snack === today() ? '약과는 내일 또' : '일일 약과 받기'}</button>
      <button class="btn" data-act="talk">💬 이야기 나누기</button>
    </div>
  </section>`;
}

/* 정청 */
function viewHall() {
  const qi = questIndex(), q = QUESTS[qi];
  const shopManuals = Object.entries(MANUALS).filter(([, M]) => M.cost);
  const ownsBook = id => !!S.manuals[id] || has('bk_' + id);
  const badges = SHOP_GEAR.filter(g => g.cost);
  const supplied = S.supplyDay === today();
  const hq = `
    <div class="npc-head">${portrait('master', '松', '노벽송')}<div><h3>${label('노벽송', '장문인')}</h3><p class="story" data-tw="npc">의자에 기대 반쯤 졸고 있습니다. 가끔 실눈을 뜨고 제자를 훑어봅니다.</p></div><button class="btn ghost sm" data-act="masterhint">말 걸기</button></div>
    <div class="quest">
      ${q ? `<small class="muted">지금 할 일 · ${qi + 1}/${QUESTS.length}</small><b>${q[0]}</b><p class="story">${q[2]}</p>` : '<b>제1장 완결</b><p class="story">낙양으로 가는 길이 열려 있습니다.</p>'}
      ${canHasan() ? '<div><button class="btn primary" data-act="hasan">하산 허가를 청한다</button></div>' : ''}
    </div>
    <div class="npc-head">${portrait('joun', '雲', '조운')}<div><h3>${label('조운', '대사형')}</h3><p class="story" data-tw="npc">장작을 패다 말고 이마의 땀을 훔칩니다. "왔냐. 모르는 게 있으면 물어라. 물건은 전방 왕 가한테 가고."</p></div>
      <div class="npc-acts"><button class="btn ghost sm" data-act="jounguide">문파 안내</button><button class="btn ${supplied ? 'ghost' : 'primary'} sm" data-act="supply" ${supplied ? 'disabled' : ''}>${supplied ? '오늘은 받았음' : '[ 오늘의 보급품 ]'}</button></div></div>`;
  const missions = `
    <div class="btns"><button class="btn ghost sm" data-act="reroll">새 임무 (은자 5냥)</button></div>
    <ul class="missions">${S.missions.map((m, i) => {
      const tname = m.type === 'kill' ? ENEMIES[m.target].name : ITEMS[m.target].name;
      const prog = m.type === 'kill' ? m.prog : Math.min(count(m.target), m.n);
      return `<li><div><b>${m.type === 'kill' ? '토벌' : '납품'}</b> ${tname} ${m.n}${m.type === 'kill' ? '마리' : '개'} <small class="muted">${ZONES[m.zone].name}</small></div><div class="mprog"><span style="width:${prog / m.n * 100}%"></span></div><span class="num">${prog}/${m.n}</span><span class="reward">공헌 ${m.contrib}</span><button class="btn sm" data-mission="${i}" ${missionReady(m) ? '' : 'disabled'}>완료</button></li>`;
    }).join('')}</ul>`;
  const library = `
    <div class="shop">${shopManuals.map(([id, M]) => { const own = ownsBook(id); return `<div class="shop-item"><b>${M.name}</b><small>${CATS[M.cat].name}${M.weapon ? ' · ' + WEAPON_SHORT[M.weapon] : ''}</small><button class="btn sm" data-buymanual="${id}" ${own || S.contrib < M.cost ? 'disabled' : ''}>${own ? '보유' : `공헌 ${M.cost}`}</button></div>`; }).join('')}
    ${badges.map(g => { const own = ownsShop(g.id); return `<div class="shop-item"><b class="r${g.rarity}">${g.name}</b><small>신분패 · 경험치 획득 +${g.stats.train}%</small><button class="btn sm" data-buybadge="${g.id}" ${own || S.contrib < g.cost ? 'disabled' : ''}>${own ? '보유' : `공헌 ${g.cost}`}</button></div>`; }).join('')}</div>`;
  return `<section class="panel npc fold">${foldHead('hq', '정청 본부', '正廳')}${foldBody('hq', hq)}</section>
  <section class="panel fold">${foldHead('missions', '문파 임무', '門派任務', `<span class="num muted">${S.missions.filter(missionReady).length}건 완료 가능</span>`)}${foldBody('missions', missions)}</section>
  <section class="panel fold">${foldHead('library', '장경각', '藏經閣', `<span class="num gold">공헌도 ${fmt(S.contrib)}</span>`)}${foldBody('library', library)}</section>`;
}

/* 무장 · 행낭 */
function statLine(it) { return Object.entries(gearStats(it)).map(([k, v]) => `${STAT_NAMES[k]} +${v}${PCT_STATS.has(k) ? '%' : ''}`).join(' · '); }

const DOLL_SVG = `<svg class="martial-artist-img fallback" viewBox="0 0 240 360" role="img" aria-label="무인 실루엣">
  <defs><linearGradient id="dollInk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a5361"/><stop offset="1" stop-color="#1b2027"/></linearGradient></defs>
  <g fill="url(#dollInk)" stroke="rgba(212,175,55,.35)" stroke-width="1.2" stroke-linejoin="round">
    <path d="M58 22 L66 18 L196 318 L188 322 Z"/>
    <path d="M52 16 h22 v8 h-22z"/>
    <ellipse cx="120" cy="34" rx="10" ry="8"/>
    <path d="M128 36 q22 4 30 22 q-14 -8 -28 -10z"/>
    <circle cx="120" cy="62" r="22"/>
    <path d="M110 82 h20 v14 h-20z"/>
    <path d="M86 98 q34 -12 68 0 l10 70 l-6 12 l14 146 h-104 l14 -146 l-6 -12z"/>
    <path d="M86 100 q-22 18 -30 70 q-4 32 -2 50 l30 6 q-2 -40 10 -86z"/>
    <path d="M154 100 q22 18 30 70 q4 32 2 50 l-30 6 q2 -40 -10 -86z"/>
    <path d="M86 170 h68 v14 h-68z"/>
    <path d="M100 184 q-6 30 -16 44 l8 2 q10 -16 16 -44z"/>
    <path d="M94 326 h22 v18 h-26z M124 326 h22 l4 18 h-26z"/>
  </g>
</svg>`;

/* 청풍문 › 전방(廛房): 왕 가의 구매 / 판매 */
function viewShop() {
  const mode = ui.shopMode === 'sell' ? 'sell' : 'buy';
  const toggle = `<div class="subtabs shop-mode" role="tablist" aria-label="거래" style="--n:2">${[['buy', '구매', '買'], ['sell', '판매', '賣']].map(([id, ko, hj]) =>
    `<button class="subtab ${mode === id ? 'on' : ''}" role="tab" aria-selected="${mode === id}" data-shopmode="${id}">${label(ko, hj)}</button>`).join('')}</div>`;
  const price = n => `<span class="price">${fmt(n)}<small>냥</small></span>`;
  let body;
  if (mode === 'buy') {
    const wares = SHOP_STOCK.map(([id, pr]) => { const I = ITEMS[id]; return `<div class="ware"><span class="icon">${I.icon}</span><div><b>${I.name}</b> <span class="num muted">보유 ${count(id)}</span><small>${I.desc}</small></div>${price(pr)}<button class="btn sm ${S.silver < pr ? 'short' : ''}" data-buy="${id}">사기</button></div>`; }).join('');
    const gear = SHOP_GEAR_STOCK.map(([base, t, pr]) => { const B = EQUIP_BASES[base]; const st = Object.entries(B.stats[t - 1]).map(([k, v]) => `${STAT_NAMES[k]} +${v}${PCT_STATS.has(k) ? '%' : ''}`).join(' · ');
      return `<div class="ware"><span class="icon">${B.slot === 'weapon' ? '🗡️' : '🛡️'}</span><div><b class="r0">[하품] ${B.names[t - 1]}</b> <span class="num muted">${SLOTS[B.slot].name}${B.wtype ? ' · ' + WEAPON_SHORT[B.wtype] : ''}</span><small>${st}</small></div>${price(pr)}<button class="btn sm ${S.silver < pr ? 'short' : ''}" data-buygear="${base}:${t}">사기</button></div>`; }).join('');
    body = `<h4 class="ware-head">소모품 · 재료</h4><div class="wares">${wares}</div><h4 class="ware-head">기본 장비</h4><div class="wares">${gear}</div>`;
  } else {
    const items = Object.keys(S.inv).filter(id => itemSellPrice(id) > 0);
    const gears = S.gear.filter(it => gearSellPrice(it) > 0);
    const rowI = id => { const I = ITEMS[id], n = count(id), pr = itemSellPrice(id); return `<div class="ware"><span class="icon">${I.icon}</span><div><b>${I.name}</b> <span class="num">×${n}</span><small>한 개 ${fmt(pr)}냥</small></div>${price(pr * n)}<div class="btns"><button class="btn sm" data-sell="${id}">1개 팔기</button>${n > 1 ? `<button class="btn ghost sm" data-sellall="${id}">전부</button>` : ''}</div></div>`; };
    const rowG = it => `<div class="ware"><span class="icon">${it.slot === 'weapon' ? '🗡️' : '🛡️'}</span><div><b class="r${it.rarity}">[${RARITY[it.rarity].name}] ${gearName(it)}</b> <span class="num muted">${SLOTS[it.slot].name}</span><small>${statLine(it)}</small></div>${price(gearSellPrice(it))}<button class="btn sm" data-sellgear="${it.uid}">팔기</button></div>`;
    body = items.length || gears.length
      ? `${gears.length ? `<h4 class="ware-head">보관 장비 <small class="muted">착용 중인 장비는 팔 수 없습니다</small></h4><div class="wares">${gears.map(rowG).join('')}</div>` : ''}
         ${items.length ? `<h4 class="ware-head">소지품</h4><div class="wares">${items.map(rowI).join('')}</div>` : ''}`
      : '<p class="story muted">팔 만한 물건이 없습니다. 비급·증표·신분패·탈것은 사고팔 수 없습니다.</p>';
  }
  return `<section class="panel npc shop-panel">
    ${head('청풍전방', '淸風廛房', `<span class="purse num">${hlSilver(S.silver)}</span>`)}
    <div class="npc-head">${portrait('merchant', MERCHANT.seal, MERCHANT.name)}<div><h3>${label(MERCHANT.name, MERCHANT.title)}</h3><p class="story" data-tw="npc">${MERCHANT.greet}</p></div></div>
    ${toggle}
    ${body}
  </section>`;
}

/* 상태 › 무장: 착용 장비 슬롯 · 선택 장비 강화 · 능력치 */
function viewGear() {
  const st = calcStats();
  const slot = s => {
    const it = S.equip[s];
    return `<button class="dslot ${ui.slotSel === s ? 'sel' : ''} ${it ? 'r' + it.rarity : 'empty'}" data-slot="${s}" style="grid-area:${s}"><small>${SLOTS[s].name}</small>${it ? `<b>${gearName(it)}</b>` : ''}</button>`;
  };
  const acc = s => {
    const it = S.equip[s];
    return `<button class="dslot ${ui.slotSel === s ? 'sel' : ''} ${it ? 'r' + it.rarity : 'empty'}" data-slot="${s}"><small>${SLOTS[s].name}</small>${it ? `<b>${gearName(it)}</b>` : ''}</button>`;
  };
  const sel = ui.slotSel && S.equip[ui.slotSel];
  const statList = ['atk', 'def', 'maxHp', 'maxMp', 'spd', 'eva', 'crit', 'critRes', 'counter', 'mpRegen', 'mpCost', 'train', 'craft', 'maxSta'].map(k => `<div><span>${STAT_NAMES[k]}</span><b>${st[k]}${PCT_STATS.has(k) ? '%' : ''}</b></div>`).join('');
  return `<section class="panel">
    ${head('무장', '武裝')}
    <div class="bag-top">
      <div class="armory">
        <div class="paperdoll">
          ${['helmet', 'weapon', 'jade', 'armor'].map(slot).join('')}
          <div class="doll-wrap" style="grid-area:doll">${imgOr(IMG.doll, 'martial-artist-img', DOLL_SVG, '무인 실루엣')}</div>
        </div>
        <div class="acc-row">${['boots', 'belt', 'ring', 'badge', 'mount'].map(acc).join('')}</div>
      </div>
      <div class="side-col">
        ${sel ? `<div class="gear r${sel.rarity}"><div class="gtop"><span class="grade r${sel.rarity}">${RARITY[sel.rarity].name}</span><b>${gearName(sel)}</b></div><small>${statLine(sel)}</small>${sel.unique ? `<small class="uniq">✦ ${sel.unique.text}</small>` : ''}
          <div class="btns"><button class="btn sm" data-enhance="${sel.slot}" ${(sel.enh || 0) >= ENH_MAX || S.zone || S.silver < enhCost(sel) ? 'disabled' : ''}>🔨 ${(sel.enh || 0) >= ENH_MAX ? '강화 완료' : `강화 +${(sel.enh || 0) + 1} · ${hlSilver(enhCost(sel))} · ${enhChance(sel)}%`}</button><button class="btn ghost sm" data-unequip="${sel.slot}">해제</button></div></div>` : ''}
        <div class="statsheet">${statList}</div>
      </div>
    </div>
  </section>`;
}

/* 행낭: 보관 장비 · 소지품 */
function viewBag() {
  const kinds = ['all', '비급', '재료', '영약', '영단', '음식', '부산물', '증표'];
  const items = Object.keys(S.inv).filter(id => ui.bagFilter === 'all' || ITEMS[id].kind === ui.bagFilter);
  return `<section class="panel">
    ${head('행낭', '行囊', `<span class="num muted">${bagUsed()} / ${bagCap()}칸</span>`)}
    ${S.gear.length ? `<div class="gears">${S.gear.map(it => `<div class="gear r${it.rarity}"><div class="gtop"><span class="grade r${it.rarity}">${RARITY[it.rarity].name}</span><b>${it.name}</b><small class="muted">${SLOTS[it.slot].name}</small></div><small>${statLine(it)}</small>${it.unique ? `<small class="uniq">✦ ${it.unique.text}</small>` : ''}<div class="btns"><button class="btn sm" data-equip="${it.uid}">착용</button><button class="btn ghost sm" data-discard="${it.uid}">버리기</button></div></div>`).join('')}</div>` : ''}
    <div class="chips">${kinds.map(k => `<button class="chip ${ui.bagFilter === k ? 'on' : ''}" data-filter="${k}">${k === 'all' ? '전체' : k}</button>`).join('')}</div>
    <div class="items">${items.map(id => { const I = ITEMS[id]; return `<div class="item"><span class="icon">${I.icon}</span><div><b>${I.name}</b> <span class="num">×${count(id)}</span><small>${I.desc}</small></div>${I.use ? `<button class="btn sm" data-use="${id}">${I.kind === '비급' ? '익히기' : '사용'}</button>` : '<span></span>'}</div>`; }).join('')}</div>
  </section>`;
}

/* 도감 */
/* 화로 연구 노트: 이 기예로 해 본 조합(최근 순). 성공/실패와 '조합은 맞았던 것 같은' 실패만 알려 준다 */
function researchNotes(craft) {
  const notes = (S.craftNotes || []).filter(n => n.craft === craft).slice().reverse();
  const row = n => `<li class="${n.ok ? 'ok' : n.near ? 'near' : 'fail'}"><span class="note-mats">${Object.entries(n.mats).map(([id, k]) => `${ITEMS[id].icon}${ITEMS[id].name}${k > 1 ? `×${k}` : ''}`).join(' + ')}</span><b>${n.ok ? `성공 → ${recipeName({ out: n.out })}` : n.near ? '실패 · 불길이 크게 일렁임' : '실패'}</b></li>`;
  return `<section class="panel">${head('연구 노트', '硏究', `<span class="num muted">${notes.length}건</span>`)}
    ${notes.length ? `<ol class="notes">${notes.map(row).join('')}</ol>` : '<p class="story muted">아직 해 본 조합이 없습니다. 재료를 넣고 불을 지펴 보십시오. 해 본 조합과 결과가 여기에 남습니다.</p>'}
  </section>`;
}

function viewCodex() {
  const cols = Object.keys(CRAFTS).map(c => {
    const all = RECIPES.filter(r => r.craft === c);
    const known = all.filter(r => S.codex.includes(r.id)).length;
    const tiles = all.map(r => S.codex.includes(r.id)
      ? `<button class="ctile known" data-recipe="${r.id}"><span>${recipeIcon(r)}</span><b>${recipeName(r)}</b></button>`
      : `<button class="ctile locked" data-recipe="${r.id}" aria-label="미발견"><span>？</span></button>`).join('');
    return `<article class="codex-col"><h3>${label(CRAFTS[c].name, CRAFTS[c].hanja)} <span class="num muted">${known}/${all.length}</span></h3><div class="ctiles">${tiles}</div></article>`;
  }).join('');
  return `<section class="panel">${head('도감', '圖鑑')}<p class="muted">조합법은 스스로 찾아내야 합니다. 화로에서 성공한 조합만 이곳에 적힙니다. 해 본 조합은 화로의 연구 노트에 남습니다.</p><div class="codex">${cols}</div></section>`;
}
