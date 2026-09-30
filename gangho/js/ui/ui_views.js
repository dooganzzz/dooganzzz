/* [화면] 문파 탭 화면: 정청·상태(무장/행낭·무공)·연무장·화로·뒷마당·무신상·도감 */

Bus.on('tick', () => renderLive());   // 연무장 수련 막대를 1초마다 갱신

/* ───────── 이미지 (없으면 대체 그림) ───────── */
const IMG = {
  doll: 'assets/character_silhouette.png',
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

/* 연무장 */
function xpRows(id) {
  const m = S.manuals[id], on = S.activeTrainingSkillId === id;
  if (m.star >= MAX_STAR) return '<div class="daesung">大成</div>';
  const pc = m.cxp / needC(m.star) * 100, pt = m.txp / need(m.star) * 100;
  return `<div class="xp" data-live="${id}">
    <div class="xprow"><span>실전</span><div class="xpbar c"><span style="width:${Math.min(100, pc)}%"></span></div><b>${Math.min(100, Math.floor(pc))}%</b></div>
    <div class="xprow"><span>수련</span><div class="xpbar t"><span class="progress-fill${on ? ' training-active' : ''}" style="width:${Math.min(100, pt)}%"></span></div><b>${Math.min(100, Math.floor(pt))}%</b></div>
  </div>`;
}

function starSig() { return Object.values(S.manuals).map(m => m.star + (m.gate ? 'g' : '')).join(); }

function renderLive() {
  if (ui.tab !== 'yeonmu' && !/^(manual|mart):/.test(ui.modal || '')) return;
  if (ui.tab === 'yeonmu' && S.activeTrainingSkillId && Math.floor(now() / 1000) % 30 === 0 && !ui.modal) { render(); return; }
  for (const el of document.querySelectorAll('[data-live]')) {
    const m = S.manuals[el.dataset.live]; if (!m || m.star >= MAX_STAR) continue;
    const rows = el.querySelectorAll('.xprow');
    [m.cxp / needC(m.star), m.txp / need(m.star)].forEach((r, i) => { const p = r * 100; rows[i].querySelector('.xpbar > span').style.width = Math.min(100, p) + '%'; rows[i].querySelector('b').textContent = Math.min(100, Math.floor(p)) + '%'; });
  }
  const sig = document.querySelector('[data-starsig]');
  if (sig && sig.dataset.starsig !== starSig()) render();
}

function viewYeonmu() {
  const tid = S.activeTrainingSkillId;
  const cards = CAT_ORDER.map(cat => {
    const id = S.active[cat], M = MANUALS[id], m = S.manuals[id], C = CATS[cat];
    if (!id) return `<div class="art empty-art">
      <div class="art-top"><span class="art-cat">${label(C.name, C.hanja)}</span></div>
      <p class="story muted">운용 중인 ${C.name}${jo(C.name, '이가')} 없습니다.</p>
      <div><button class="btn sm" data-tab="status" data-sub="martial">상태 › 무공에서 장착</button></div>
    </div>`;
    const on = tid === id;
    const left = on ? (need(m.star) - m.txp) / trainRate(id) : 0;
    return `<div class="art ${on ? 'training' : ''}" data-manual="${cat}" role="button" tabindex="0">
      ${on ? `<span class="qi-rise" aria-hidden="true">${'<i></i>'.repeat(9)}</span>` : ''}
      <div class="art-top"><span class="art-cat">${label(C.name, C.hanja)}</span><span class="art-star">${m.star}<small>성</small></span></div>
      <div class="art-name">《${M.name}》 ${realmTag(m.star)}${m.gate ? ' <span class="pill warn">관문</span>' : ''}</div>
      ${xpRows(id)}
      <div class="art-foot">
        <small class="muted">${m.star >= MAX_STAR ? '대성' : on ? (m.txp >= need(m.star) ? `수련 가득 참 · 실전 ${Math.max(0, needC(m.star) - Math.floor(m.cxp))}승 더` : `다음 성까지 약 ${fmtDur(left)}`) : `성당 수련 ${fmtDur(trainHours(m.star) * 3600)}`}</small>
        <button class="btn sm ${on ? 'primary' : ''}" data-train="${cat}" ${m.star >= MAX_STAR ? 'disabled' : ''}>${on ? '[ 수련 중지 ]' : '[ 수련하기 ]'}</button>
      </div>
    </div>`;
  }).join('');
  const tm = tid && MANUALS[tid];
  return `<section class="panel" data-starsig="${starSig()}">
    ${head('연무장', '演武場', `<span class="pill ${tid ? '' : 'idle'}">${tid ? '수련 중' : '수련 정지'}</span>`)}
    <p class="story">${tm ? `향이 타들어 갑니다. 《${tm.name}》 한 가지에만 온 정신을 모읍니다. 1~5성은 성마다 8시간, 소성 이후 6~11성은 16시간이 걸립니다.` : '연무장이 고요합니다. 수련할 비급 하나를 골라 [ 수련하기 ]를 누르십시오. 한 번에 한 비급만 수련할 수 있습니다.'}</p>
    <div class="arts">${cards}</div>
  </section>`;
}

/* 상태 탭: [ 무장 ] / [ 무공 ] 하위 탭 */
const STATUS_SUBS = [['gear', '무장', '武裝'], ['martial', '무공', '武功']];
function viewStatus() {
  const sub = STATUS_SUBS.some(([id]) => id === ui.statusSub) ? ui.statusSub : 'gear';
  const bar = `<div class="subtabs" role="tablist" aria-label="상태">${STATUS_SUBS.map(([id, ko, hj]) =>
    `<button class="subtab ${sub === id ? 'on' : ''}" role="tab" aria-selected="${sub === id}" data-sub="${id}">${label(ko, hj)}</button>`).join('')}</div>`;
  return bar + (sub === 'martial' ? viewMartial() : viewBag());
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
    ${head('무공', '武功')}
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
        ${res ? `<div class="result ${res.ok ? 'ok' : 'fail'}"><b class="${res.cls || ''}">${res.ok ? '성공' : '실패'} — ${res.text}</b>${res.first ? '<span class="new">도감 등재</span>' : ''}<small>${esc(res.sub || '')}</small></div>` : ''}
      </div>
      <div class="mats">
        <h4>${C.name} 재료</h4>
        <div class="chips">${mats.map(id => { const left = count(id) - (ui.pot[id] || 0); return `<button class="chip" data-add="${id}" ${left <= 0 ? 'disabled' : ''}>${ITEMS[id].icon} ${ITEMS[id].name} <b>${left}</b></button>`; }).join('')}</div>
      </div>
    </div>
  </section>`;
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
    <div class="npc-head">${portrait('joun', '雲', '조운')}<div><h3>${label('조운', '대사형')}</h3><p class="story" data-tw="npc">장작을 패다 말고 이마의 땀을 훔칩니다. "왔냐. 필요한 건 챙겨놨다."</p></div>
      <button class="btn ${supplied ? 'ghost' : 'primary'}" data-act="supply" ${supplied ? 'disabled' : ''}>${supplied ? '오늘은 받았음' : '[ 오늘의 보급품 받기 ]'}</button></div>
    <div class="store"><h4>조운의 창고 <small>은자로 삽니다</small></h4><div class="chips">${JOUN_SHOP.map(([id, pr]) => `<button class="chip" data-store="${id}" ${S.silver < pr ? 'disabled' : ''}>${ITEMS[id].icon} ${ITEMS[id].name} <b>${pr}냥</b></button>`).join('')}</div></div>`;
  const missions = `
    <div class="btns"><button class="btn ghost sm" data-act="reroll">새 임무 (은자 5냥)</button></div>
    <ul class="missions">${S.missions.map((m, i) => {
      const tname = m.type === 'kill' ? ENEMIES[m.target].name : ITEMS[m.target].name;
      const prog = m.type === 'kill' ? m.prog : Math.min(count(m.target), m.n);
      return `<li><div><b>${m.type === 'kill' ? '토벌' : '납품'}</b> ${tname} ${m.n}${m.type === 'kill' ? '마리' : '개'} <small class="muted">${ZONES[m.zone].name}</small></div><div class="mprog"><span style="width:${prog / m.n * 100}%"></span></div><span class="num">${prog}/${m.n}</span><span class="reward">공헌 ${m.contrib}</span><button class="btn sm" data-mission="${i}" ${missionReady(m) ? '' : 'disabled'}>완료</button></li>`;
    }).join('')}</ul>`;
  const library = `
    <div class="shop">${shopManuals.map(([id, M]) => { const own = ownsBook(id); return `<div class="shop-item"><b>${M.name}</b><small>${CATS[M.cat].name}${M.weapon ? ' · ' + WEAPON_SHORT[M.weapon] : ''}</small><button class="btn sm" data-buymanual="${id}" ${own || S.contrib < M.cost ? 'disabled' : ''}>${own ? '보유' : `공헌 ${M.cost}`}</button></div>`; }).join('')}
    ${badges.map(g => { const own = ownsShop(g.id); return `<div class="shop-item"><b class="r${g.rarity}">${g.name}</b><small>신분패 · 수련 효율 +${g.stats.train}%</small><button class="btn sm" data-buybadge="${g.id}" ${own || S.contrib < g.cost ? 'disabled' : ''}>${own ? '보유' : `공헌 ${g.cost}`}</button></div>`; }).join('')}</div>`;
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

function viewBag() {
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
  const kinds = ['all', '비급', '재료', '영약', '영단', '음식', '부산물', '증표'];
  const items = Object.keys(S.inv).filter(id => ui.bagFilter === 'all' || ITEMS[id].kind === ui.bagFilter);
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
  </section>
  <section class="panel">
    ${head('행낭', '行囊', `<span class="num muted">${bagUsed()} / ${bagCap()}칸</span>`)}
    ${S.gear.length ? `<div class="gears">${S.gear.map(it => `<div class="gear r${it.rarity}"><div class="gtop"><span class="grade r${it.rarity}">${RARITY[it.rarity].name}</span><b>${it.name}</b><small class="muted">${SLOTS[it.slot].name}</small></div><small>${statLine(it)}</small>${it.unique ? `<small class="uniq">✦ ${it.unique.text}</small>` : ''}<div class="btns"><button class="btn sm" data-equip="${it.uid}">착용</button><button class="btn ghost sm" data-discard="${it.uid}">버리기</button></div></div>`).join('')}</div>` : ''}
    <div class="chips">${kinds.map(k => `<button class="chip ${ui.bagFilter === k ? 'on' : ''}" data-filter="${k}">${k === 'all' ? '전체' : k}</button>`).join('')}</div>
    <div class="items">${items.map(id => { const I = ITEMS[id]; return `<div class="item"><span class="icon">${I.icon}</span><div><b>${I.name}</b> <span class="num">×${count(id)}</span><small>${I.desc}</small></div>${I.use ? `<button class="btn sm" data-use="${id}">${I.kind === '비급' ? '익히기' : '사용'}</button>` : '<span></span>'}</div>`; }).join('')}</div>
  </section>`;
}

/* 도감 */
function viewCodex() {
  const cols = Object.keys(CRAFTS).map(c => {
    const all = RECIPES.filter(r => r.craft === c);
    const known = all.filter(r => S.codex.includes(r.id)).length;
    const clues = all.filter(isClue).length;
    const tiles = all.map(r => S.codex.includes(r.id)
      ? `<button class="ctile known" data-recipe="${r.id}"><span>${recipeIcon(r)}</span><b>${recipeName(r)}</b></button>`
      : isClue(r)
        ? `<button class="ctile clue" data-recipe="${r.id}"><span>${recipeIcon(r)}</span><b>${recipeName(r)}</b><small>${Object.keys(r.in).map(m => S.knownMats[m] ? ITEMS[m].icon : '？').join(' ')}</small></button>`
        : `<button class="ctile locked" data-recipe="${r.id}" aria-label="미발견"><span>？</span></button>`).join('');
    return `<article class="codex-col"><h3>${label(CRAFTS[c].name, CRAFTS[c].hanja)} <span class="num muted">${known}/${all.length}${clues ? ` · 단서 ${clues}` : ''}</span></h3><div class="ctiles">${tiles}</div></article>`;
  }).join('');
  return `<section class="panel">${head('도감', '圖鑑')}<div class="codex">${cols}</div></section>`;
}
