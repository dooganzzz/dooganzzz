/* [화면] 탭 화면: 청풍문(정청·화로·연무장·무신상·전방) · 상태(무장·무공) · 행낭 · 도감 */

/* ───────── 이미지 (없으면 대체 그림) ───────── */
const IMG = {
  doll: 'assets/character_silhouette.png',
  portrait: 'assets/images/character_default.png',
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
const GRADE_CLASS_MAP = { '하급': 'grade-low', '중급': 'grade-mid', '상급': 'grade-high', '진품': 'grade-rare', '명품': 'grade-epic', '극품': 'grade-legend', '삼류': 'grade-low', '이류': 'grade-mid', '일류': 'grade-high' };
const gradeClass = g => GRADE_CLASS_MAP[g] || 'grade-low';
const gradeBadge = g => `<span class="item-grade-badge">${g}</span>`;
/* 카드 머리: 이름(등급 색)과 등급 원형 뱃지를 양 끝에 */
const itemCardHead = (name, g, ico = '') => `<div class="item-card-header">${ico}<b class="item-name">${name}</b>${gradeBadge(g)}</div>`;

/* 상성 표식: 기공의 오행 · 경공의 지형 · 적의 오행/병기 */
const elemTag = e => e ? `<span class="aff-tag ${ELEMENTS[e].cls}" title="오행 ${ELEMENTS[e].name}(${ELEMENTS[e].hanja})">${ELEMENTS[e].hanja}</span>` : '';
const terrainTag = t => t ? `<span class="aff-tag tr" title="지형 ${TERRAINS[t].name}(${TERRAINS[t].hanja})">${TERRAINS[t].name}<small>${TERRAINS[t].hanja}</small></span>` : '';
const manualAffTag = id => elemTag(MANUALS[id].elem) + terrainTag(MANUALS[id].terrain);
const weaponTag = w => w ? `<span class="aff-tag wp">${WEAPON_CLASS_NAME[WEAPON_CLASS[w]]}</span>` : '';

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
      <span title="민첩 × ${W.agi}">민첩 <b>${fmt(p.agi)}</b></span>
    </div>
    <div class="cp-attr">${Object.entries(ATTRS).map(([k, A]) => `<span title="${A.desc}">${A.name} <b>${attrOf(k)}</b></span>`).join('')}${S.talent ? `<span title="${TALENTS[S.talent].desc}">기예 <b>${TALENTS[S.talent].name}</b></span>` : ''}</div>
  </section>`;
}

/* 상태 › 무공 */
function viewMartial() {
  // 방위 배치: 12시 심법 · 9시 무공 · 3시 기공 · 6시 경공, 가운데 운기조식 가부좌
  const POS = { simbeop: 'pos-12 slot-heart', mugong: 'pos-9 slot-attack', gigong: 'pos-3 slot-aura', gyeonggong: 'pos-6 slot-agility' };
  const card = cat => {
    const id = S.active[cat], C = CATS[cat];
    if (!id) return `<div class="slot-pos ${POS[cat]}"><div class="mslot skill-card-compact empty" data-artslot="${cat}" role="button" tabindex="0" aria-haspopup="dialog"><div class="mslot-cat slot-type-label">${label(C.name, C.hanja)}</div><small class="muted">${C.desc}</small><p class="muted">비어 있음 · 눌러서 장착</p></div></div>`;
    const M = MANUALS[id], m = S.manuals[id];
    return `<div class="slot-pos ${POS[cat]}"><div class="mslot skill-card-compact" data-artslot="${cat}" role="button" tabindex="0" aria-haspopup="dialog">
      <div class="mslot-cat slot-type-label">${label(C.name, C.hanja)}</div>
      <b class="mslot-name skill-title">《${M.name}》${manualAffTag(id)}</b>
      <div class="skill-level-row">${realmTag(m.star)}<span class="art-star skill-level">${m.star}<small>성</small></span></div>
      <div class="skill-btn-group">${m.star < MAX_STAR ? (() => { const why = starUpBlock(id), pill = GATES[m.star]; return `<button class="btn ${why ? '' : 'primary'} sm starup btn-upgrade" data-starup="${id}" ${why ? 'disabled' : ''} title="${why || `수련치 ${fmt(starCost(id))}${pill ? ' + ' + ITEMS[pill].name : ''}`}">▲ ${m.star + 1}성 <small>${fmt(starCost(id))}${pill ? ' + ' + ITEMS[pill].name.replace(' 돌파단', '단') : ''}</small></button>`; })() : '<span class="daesung">大成</span>'}
      <button class="btn ghost sm btn-unequip" data-unequipm="${cat}">장착 해제</button></div>
    </div></div>`;
  };
  // 기운 순환 궤적: 가운데 좌선과 네 방위를 잇는 먹선 고리 (격자 뒤에 깔린다)
  const orbit = `<svg class="qi-orbit" viewBox="0 0 600 600" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <defs><filter id="inkBlur"><feGaussianBlur stdDeviation="2.2"/></filter></defs>
    <circle cx="300" cy="300" r="238" class="orbit-ink" filter="url(#inkBlur)"/>
    <circle cx="300" cy="300" r="238" class="orbit-flow"/>
    <path class="orbit-spoke" d="M300 62v70M300 468v70M62 300h70M468 300h70"/>
  </svg>`;
  const slots = `${orbit}${card('simbeop')}${card('mugong')}<div class="meditation-center-frame" aria-hidden="true"><div class="meditation-aura-ring"></div><div class="meditation-silhouette">${meditationArt()}</div><div class="meditation-caption">운기조식 (運氣調息)</div></div>${card('gigong')}${card('gyeonggong')}`;
  const learned = Object.keys(S.manuals).sort((a, b) => CAT_ORDER.indexOf(MANUALS[a].cat) - CAT_ORDER.indexOf(MANUALS[b].cat));
  const books = Object.keys(S.inv).filter(k => ITEMS[k].kind === '비급');
  // 습득 비급: [무공] [심법] [경공] [기공] 탭으로 거른다 (카드를 누르면 상세·성급 창)
  const SKILL_TABS = [['attack', 'mugong', '무공'], ['heart', 'simbeop', '심법'], ['agility', 'gyeonggong', '경공'], ['aura', 'gigong', '기공']];
  const tab = SKILL_TABS.find(t => t[0] === ui.skillTab) || SKILL_TABS[0];
  const shown = learned.filter(id => MANUALS[id].cat === tab[1]);
  const cards = shown.map(id => {
    const M = MANUALS[id], m = S.manuals[id], worn = S.active[M.cat] === id;
    return `<button class="mcard skill-item-card ${worn ? 'worn is-equipped' : ''}" data-mart="${id}"><small class="card-meta">${CATS[M.cat].name} · ${M.grade}</small><b class="card-title">《${M.name}》${manualAffTag(id)}</b><span class="card-stage">${realmTag(m.star)}<span class="art-star skill-level">${m.star}<small>성</small></span></span><span class="card-status-tag ${worn ? 'active' : ''}">${worn ? '운용 중' : '미운용'}</span></button>`;
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
      : shown.length ? `<div class="mcards acquired-cards-grid" id="acquired-cards-container">${cards}</div>` : '<div class="empty-notice">해당 계열에 익힌 비급이 없습니다.</div>'}
    ${books.length ? `<div class="chips">${books.map(k => `<button class="chip" data-use="${k}">📘 ${ITEMS[k].name} 익히기</button>`).join('')}</div>` : ''}
  </section>`;
}

/* 무신상 (조각상 · 나): 검게 탄 찌꺼기 공양 → 무작위 보상 */
function viewShrine() {
  const n = count('slag'), c = GACHA.cost;
  const res = ui.gachaResult;
  const old = S.shrine.total ? `<div class="blessings"><div><small>공격력</small><b>+${S.shrine.atk}</b></div><div><small>최대 내력</small><b>+${S.shrine.mp}</b></div><div><small>회피율</small><b>+${S.shrine.eva}%</b></div><div><small>치명타율</small><b>+${Math.floor(S.shrine.total / 10) * 2}%</b></div></div><p class="muted">예전 봉헌(${S.shrine.total}회)으로 받은 힘은 그대로 남아 있습니다.</p>` : '';
  return `<section class="panel altar">
    ${head('무신상', '武神像', `<span class="pill">나 · 我</span>`)}
    <div class="shrine-stage">${shrineArt()}</div>
    <p class="story">청풍문 마당의 이끼 낀 석상. 이 안에 갇힌 것이 바로 당신입니다. 제자가 화로에서 태워 먹은 찌꺼기를 바치면, 당신은 그 탁한 기운을 삼켜 쓸 만한 무언가로 돌려줍니다. 무엇이 나올지는 당신도 모릅니다.</p>
    <div class="gacha">
      <div class="gacha-have"><span class="offer-icon">${itemIco('slag')}</span><b>${ITEMS.slag.name}</b><span class="num">${fmt(n)}개</span></div>
      <div class="btns">
        <button class="btn primary" data-pray="1" ${n < c ? 'disabled' : ''}>공양 1회 <small>찌꺼기 ${c}개</small></button>
        <button class="btn" data-pray="${GACHA.multi}" ${n < c * 2 ? 'disabled' : ''}>공양 ${GACHA.multi}회 <small>찌꺼기 ${c * GACHA.multi}개${n < c * GACHA.multi && n >= c * 2 ? ` · 모자라면 ${Math.floor(n / c)}회` : ''}</small></button>
      </div>
      <p class="muted">화로에서 조합에 실패하면 (단조·연단 모두) 검게 탄 찌꺼기가 남습니다. 누적 공양 ${fmt(S.shrine.pulls || 0)}회.</p>
    </div>
    <div class="purify">
      <div class="purify-head"><span>탁기 정화(누적 공양)</span><b class="num">${fmt(S.statueResidueCount || 0)} / ${GACHA.awaken}</b></div>
      <div class="purify-bar"><span style="width:${Math.min(100, (S.statueResidueCount || 0) / GACHA.awaken * 100)}%"></span></div>
      <small class="muted">검게 탄 찌꺼기 ${GACHA.awaken}개를 삼켜 정화하면, 무신의 권능이 깨어나 영구 능력치와 진귀한 완제품을 하사합니다.</small>
    </div>
    ${res && res.length ? `<div class="gacha-res"><h4>돌아온 것</h4><ul>${res.map((g, i) => `<li class="${g.cls}" style="--i:${i}">${g.text}</li>`).join('')}</ul></div>` : ''}
    ${old}
  </section>`;
}

/* 연무장 › 심상수련장: 만나 본 요수와 기력 소모 없이 가상으로 겨룬다 */
function viewYeonmu() {
  const bs = S.bestiary || {}, ids = Object.keys(ENEMIES).filter(e => bs[e]);
  const sim = ui.sim;
  const rows = ids.map(e => {
    const E = ENEMIES[e], a = affinity(e), r = sim && sim.many && sim.many.eid === e ? sim.many : null;
    return `<li class="sim-row ${E.boss ? 'boss' : ''}">
      <div class="sim-foe">${beastArt(e, 'mini')}<b>${E.name}</b>${elemTag(E.elem)}${weaponTag(E.wtype)}<small class="muted">만남 ${bs[e].met} · 처치 ${bs[e].kills}</small></div>
      <div class="sim-aff">${affinityText(a)}</div>
      ${r ? `<div class="sim-stat">${r.n}판 모의: <b class="${r.wins / r.n >= 0.7 ? 'good' : r.wins / r.n >= 0.4 ? '' : 'warn'}">${r.wins}승</b> ${r.n - r.wins - r.draws}패${r.draws ? ` ${r.draws}무` : ''} · 평균 ${r.rounds}합${r.wins ? ` · 이겼을 때 남은 활력 ${r.hpLeft}%` : ''}</div>` : ''}
      <div class="btns"><button class="btn sm primary" data-sim="${e}">겨루기</button><button class="btn sm ghost" data-simx="${e}">10판 모의</button></div>
    </li>`;
  }).join('');
  return `<section class="panel yeonmu">
    ${head('심상수련장', '心象修練場')}
    <p class="story">연무장 한가운데 앉아 눈을 감으면, 석상의 목소리가 제자의 마음속에 싸움 하나를 그려 줍니다. 강호에서 한 번이라도 마주친 상대만 불러낼 수 있습니다. 기력은 들지 않고, 얻는 것도 잃는 것도 없습니다. 지금 차림(무공·병기·장비)과 상성이 그대로 반영됩니다.</p>
    ${ids.length ? `<ul class="sim-list">${rows}</ul>` : '<p class="story muted">아직 강호에서 마주친 상대가 없습니다. 강호행에서 탐험을 다녀오십시오.</p>'}
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
    <div class="npc-head">${portrait('master', '松', '노벽송')}<div><h3>${label('노벽송', '장문인')}</h3><p class="story" data-tw="npc">의자에 기대 반쯤 졸고 있습니다. 가끔 실눈을 뜨고 제자를 훑어봅니다.</p></div><button class="btn talk-btn ${tutorReady() ? 'ready' : ''}" data-act="masterhint">${tutorReady() ? '보상 받기 <small>가르침을 이룸</small>' : '말 걸기'}</button></div>
    <div class="quest main-quest ${tutorReady() ? 'ready' : ''}">
      ${!q ? '<b>제1장 완결</b><p class="story">낙양으로 가는 길이 열려 있습니다.</p>'
        : `<small class="muted">메인 퀘스트 · 장문인의 가르침 ${qi + 1}/${QUESTS.length}</small><b>${q.t}${tutorReady() ? ' <span class="good">— 이룸!</span>' : ''}</b><p class="story">${tutorReady() ? '장문인에게 [ 보상 받기 ]를 누르십시오.' : q.hint}</p>${q.reward ? `<p class="quest-reward">보상: <b>${questRewardText(q)}</b></p>` : ''}`}
      ${canHasan() ? '<div><button class="btn primary" data-act="hasan">하산 허가를 청한다</button></div>' : ''}
    </div>
    <div class="npc-head">${portrait('joun', '雲', '조운')}<div><h3>${label('조운', '대사형')}</h3><p class="story" data-tw="npc">장작을 패다 말고 이마의 땀을 훔칩니다. "왔냐. 모르는 게 있으면 물어라. 물건은 전방 왕 가한테 가고."</p></div>
      <div class="npc-acts"><button class="btn talk-btn" data-act="jounguide">문파 안내</button><button class="btn talk-btn ${supplied ? '' : 'ready'}" data-act="supply" ${supplied ? 'disabled' : ''}>${supplied ? '오늘은 받았음' : '[ 오늘의 보급품 ]'}</button></div></div>
    <div class="npc-head">${portrait('arin', '璘', '아린')}<div><h3>${label('아린', '사매')}</h3><p class="story" data-tw="npc">붉은 댕기를 휘날리며 뛰어옵니다. "사형! 사형! 배고프죠? 죽 끓여 놨어요!"</p></div>
      <div class="npc-acts"><button class="btn talk-btn ${S.hp < calcStats().maxHp || S.mp < calcStats().maxMp ? 'ready' : ''}" data-act="talk" title="죽 한 그릇 · 활력·내력 모두 회복">말 걸기 <small>(${arinFree() ? '오늘 첫 죽 무료' : `죽 은자 ${ARIN_CARE}냥`})</small></button></div></div>`;
  // 서브 퀘스트: 열린 단계마다 반복 토벌 (지금 탐험지가 먼저, 받을 수 있는 것이 위로)
  const sq = subqList().sort((a, b) => (subqReady(b.zid, b.n) - subqReady(a.zid, a.n)) || ((b.zid === S.expedition.zone) - (a.zid === S.expedition.zone)) || ZONE_ORDER.indexOf(a.zid) - ZONE_ORDER.indexOf(b.zid) || a.n - b.n);
  const missions = `
    <p class="muted subq-note">열린 단계마다 반복 토벌 임무가 있습니다. 그 단계에서 ${SUBQ.kills}번 이기면 보상을 받고, 몇 번이고 다시 할 수 있습니다.</p>
    <ul class="missions">${sq.map(({ zid, n }) => {
      const p = subqProg(zid, n), R = subqReward(zid, n), ok = subqReady(zid, n);
      return `<li class="${ok ? 'ready' : ''}"><div><b>토벌</b> ${stageName(zid, n)} <small class="muted">${n >= STAGE.count ? '두목' : `${n}단계`}</small></div><div class="mprog"><span style="width:${p / SUBQ.kills * 100}%"></span></div><span class="num">${p}/${SUBQ.kills}</span><span class="reward">공헌 ${R.contrib} · 은자 ${R.silver} · 수련치 ${R.exp} · 생혈고 ${R.pot}</span><button class="btn sm ${ok ? 'primary' : ''}" data-subq="${zid}:${n}" ${ok ? '' : 'disabled'}>보상</button></li>`;
    }).join('') || '<li class="muted">강호행에서 탐험지를 정하면 토벌 임무가 열립니다.</li>'}</ul>`;
  // 장경각: [장비] [무공] [제자패] 세 칸. 모두 이류(二流) 급, 문파 공헌도로 교환
  const LT = [['equipment', '장비', '裝備'], ['skills', '무공', '武功'], ['tokens', '제자패', '弟子牌']];
  const lt = LT.some(([k]) => k === ui.libTab) ? ui.libTab : 'equipment';
  const libCard = (name, grade, part, eff, cost, own, attr, ico = '') => `<div class="item-card shop-item lib-item ${gradeClass(grade)}">${itemCardHead(name, grade, ico)}
    <div class="item-card-body"><div class="item-category">${part}</div><div class="item-effect lib-eff">${eff}</div></div>
    <button class="btn sm btn-exchange" ${attr} ${own || S.contrib < cost ? 'disabled' : ''}>${own ? '보유' : `공헌 ${cost}`}</button></div>`;
  const libItems = lt === 'equipment' ? Object.entries(LIBRARY_GEAR).map(([id, G]) => libCard(G.name, RARITY[1].name, `${SLOTS[G.slot].name}${G.wtype ? ' · ' + WEAPON_SHORT[G.wtype] : ''}`, bonusText(G.stats), G.cost, ownsShop(id), `data-buylib="${id}"`, gearIco(G, 'card', 1)))
    : lt === 'skills' ? shopManuals.map(([id, M]) => libCard(M.name, M.grade, `${CATS[M.cat].name}${M.weapon ? ' · ' + WEAPON_SHORT[M.weapon] : ''}`, `${esc(M.desc)}<br><span class="passive">독파 각인: ${bonusText(M.passiveBonus)}</span>`, M.cost, ownsBook(id), `data-buymanual="${id}"`, manualIco(id, 'card')))
    : badges.map(g => libCard(g.name, RARITY[g.rarity].name, '신분패', `수련치 획득 +${g.stats.train}%`, g.cost, ownsShop(g.id), `data-buybadge="${g.id}"`, gearIco(g, 'card')));
  const library = `
    <div class="subtabs lib-tabs" role="tablist" aria-label="장경각" style="--n:${LT.length}">${LT.map(([k, ko, hj]) => `<button class="subtab ${lt === k ? 'on' : ''}" role="tab" aria-selected="${lt === k}" data-libtab="${k}">${label(ko, hj)}</button>`).join('')}</div>
    <div class="shop lib-grid">${libItems.join('')}</div>`;
  return `<section class="panel npc fold">${foldHead('hq', '정청 본부', '正廳', tutorReady() ? `<span class="num gold">가르침 보상 ${alertDot(true)}</span>` : '')}${foldBody('hq', hq)}</section>
  <section class="panel fold">${foldHead('missions', '토벌 임무', '討伐任務', `<span class="num ${subqReadyCount() ? 'gold' : 'muted'}">${subqReadyCount()}건 완료 가능${alertDot(subqReadyCount() > 0)}</span>`)}${foldBody('missions', missions)}</section>
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
/* 전방 장비 진열 분류 */
const SHOP_GEAR_TABS = { weapon: { ko: '무기', hj: '武器', slots: ['weapon'] }, armor: { ko: '갑옷', hj: '甲胄', slots: ['armor', 'helmet', 'boots'] }, acc: { ko: '장신구', hj: '裝身具', slots: ['belt', 'jade', 'ring', 'badge', 'mount'] } };
function viewShop() {
  const mode = ui.shopMode === 'sell' ? 'sell' : 'buy';
  const toggle = `<div class="subtabs shop-mode" role="tablist" aria-label="거래" style="--n:2">${[['buy', '구매', '買'], ['sell', '판매', '賣']].map(([id, ko, hj]) =>
    `<button class="subtab ${mode === id ? 'on' : ''}" role="tab" aria-selected="${mode === id}" data-shopmode="${id}">${label(ko, hj)}</button>`).join('')}</div>`;
  const price = n => `<span class="price">${fmt(n)}<small>냥</small></span>`;
  let body;
  if (mode === 'buy') {
    const wares = SHOP_STOCK.map(([id, pr]) => { const I = ITEMS[id]; return `<div class="ware"><span class="icon">${itemIco(id)}</span><div><b>${I.name}</b> <span class="num muted">보유 ${count(id)}</span><small>${I.desc}</small></div>${price(pr)}<button class="btn sm ${S.silver < pr ? 'short' : ''}" data-buy="${id}">사기</button></div>`; }).join('');
    const gearRow = ([base, t, pr]) => { const B = gearSpec(base, t); const st = Object.entries(B.stats).map(([k, v]) => `${STAT_NAMES[k]} +${v}${PCT_STATS.has(k) ? '%' : ''}`).join(' · ');
      return `<div class="ware"><span class="icon">${gearIco(B)}</span><div><b class="item-name grade-low">${B.name}</b> ${gradeBadge(RARITY[0].name)} <span class="num muted">${SLOTS[B.slot].name}${B.wtype ? ' · ' + WEAPON_SHORT[B.wtype] : ''}</span><small>${st}${B.desc ? ` — ${B.desc}` : ''}</small></div>${price(pr)}<button class="btn sm ${S.silver < pr ? 'short' : ''}" data-buygear="${base}:${t}">사기</button></div>`; };
    // 구매: [소모품] | [장비] → 장비는 [무기] | [갑옷] | [장신구]
    const tabs = (key, cur, list, cls) => `<div class="subtabs ${cls}" role="tablist" style="--n:${list.length}">${list.map(([id, ko, hj]) => `<button class="subtab ${cur === id ? 'on' : ''}" role="tab" aria-selected="${cur === id}" data-${key}="${id}">${label(ko, hj)}</button>`).join('')}</div>`;
    const bt = ui.shopBuy === 'gear' ? 'gear' : 'items';
    const gt = SHOP_GEAR_TABS[ui.shopGear] ? ui.shopGear : 'weapon';
    const gearRows = SHOP_GEAR_STOCK.filter(([base, t]) => SHOP_GEAR_TABS[gt].slots.includes(gearSpec(base, t).slot)).map(gearRow).join('');
    body = tabs('shopbuy', bt, [['items', '소모품', '消耗品'], ['gear', '장비', '裝備']], 'shop-buy-tabs')
      + (bt === 'items' ? `<div class="wares">${wares}</div>`
        : tabs('shopgear', gt, Object.entries(SHOP_GEAR_TABS).map(([id, g]) => [id, g.ko, g.hj]), 'shop-gear-tabs') + (gearRows ? `<div class="wares">${gearRows}</div>` : '<p class="story muted">지금은 들여놓은 물건이 없소.</p>'));
  } else {
    const items = Object.keys(S.inv).filter(id => itemSellPrice(id) > 0);
    const gears = S.gear.filter(it => gearSellPrice(it) > 0);
    const rowI = id => { const I = ITEMS[id], n = count(id), pr = itemSellPrice(id); return `<div class="ware"><span class="icon">${itemIco(id)}</span><div><b>${I.name}</b> <span class="num">×${n}</span><small>한 개 ${fmt(pr)}냥</small></div>${price(pr * n)}<div class="btns"><button class="btn sm" data-sell="${id}">1개 팔기</button>${n > 1 ? `<button class="btn ghost sm" data-sellall="${id}">전부</button>` : ''}</div></div>`; };
    const rowG = it => `<div class="ware"><span class="icon">${gearIco(it)}</span><div><b class="r${it.rarity}">[${RARITY[it.rarity].name}] ${gearName(it)}</b> <span class="num muted">${SLOTS[it.slot].name}</span><small>${statLine(it)}</small></div>${price(gearSellPrice(it))}<button class="btn sm" data-sellgear="${it.uid}">팔기</button></div>`;
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
  // 장착 칸 카드: 부위 아이콘 · 칸 이름 · 장착한 장비(없으면 비어있음) · 행낭에 이 칸에 맞는 장비 수
  const slot = (s, cls = '') => {
    const it = S.equip[s];
    return `<button class="equip-slot-card dslot ${cls} ${it ? 'r' + it.rarity : 'empty'}" data-slot="${s}" aria-haspopup="dialog">${slotIcon(s)}<small class="slot-label">${SLOTS[s].name}</small><span class="slot-item-name ${it ? 'equipped' : 'empty'}">${it ? gearName(it) : '비어있음'}</span>${slotCount(s)}</button>`;
  };
  const slotCount = s => { const n = S.gear.filter(g => g.slot === slotAccepts(s)).length; return n ? `<em class="slot-n" title="행낭에 이 칸에 맞는 장비 ${n}점">+${n}</em>` : ''; };
  const statList = ['atk', 'def', 'maxHp', 'maxMp', 'spd', 'eva', 'crit', 'critRes', 'counter', 'mpRegen', 'mpCost', 'train', 'craft', 'maxSta'].map(k => `<div><span>${STAT_NAMES[k]}</span><b>${st[k]}${PCT_STATS.has(k) ? '%' : ''}</b></div>`).join('');
  return `<section class="panel">
    ${head('무장', '武裝')}
    <div class="bag-top">
      <div class="armory">
        <!-- 왼쪽: 가락지 · 무기 · 요대 / 가운데: 투구 + 제자 초상 / 오른쪽: 옥대 · 호갑 · 가락지 -->
        <div class="equipment-view-layout paperdoll">
          <div class="equip-column equip-left">${slot('ring')}${slot('weapon')}${slot('belt')}</div>
          <div class="character-center-frame">${slot('helmet', 'slot-top')}<div class="char-illustration-container doll-wrap">${portraitCard()}</div></div>
          <div class="equip-column equip-right">${slot('jade')}${slot('armor')}${slot('ring2')}</div>
        </div>
        <div class="equipment-bottom-bar acc-row">${['boots', 'badge', 'mount'].map(s => slot(s, 'small')).join('')}</div>
      </div>
      <div class="side-col">
        <p class="muted slot-help">장비 칸을 누르면 그 부위에 맞는 행낭 장비가 떠서 바로 장착·교체·해제·강화할 수 있습니다.</p>
        <div class="statsheet">${statList}</div>
      </div>
    </div>
  </section>`;
}

/* 행낭: 보관 장비 · 소지품 */
function viewBag() {
  const kinds = ['all', '비급', '재료', '단약', '영단', '부산물', '증표'];
  const items = Object.keys(S.inv).filter(id => ui.bagFilter === 'all' || ITEMS[id].kind === ui.bagFilter);
  return `<section class="panel">
    ${head('행낭', '行囊', `<span class="num muted">${bagUsed()} / ${bagCap()}칸</span>`)}
    ${S.gear.length ? `<div class="gears">${S.gear.map(it => `<div class="gear item-card r${it.rarity} ${gradeClass(RARITY[it.rarity].name)}">${itemCardHead(it.name, RARITY[it.rarity].name, gearIco(it, 'card'))}<small class="muted item-category">${SLOTS[it.slot].name}${it.wtype ? ' · ' + WEAPON_SHORT[it.wtype] : ''}</small><small>${statLine(it)}</small>${it.unique ? `<small class="uniq">✦ ${it.unique.text}</small>` : ''}<div class="btns"><button class="btn sm" data-equip="${it.uid}">착용</button><button class="btn ghost sm" data-discard="${it.uid}">버리기</button></div></div>`).join('')}</div>` : ''}
    <div class="chips">${kinds.map(k => `<button class="chip ${ui.bagFilter === k ? 'on' : ''}" data-filter="${k}">${k === 'all' ? '전체' : k}</button>`).join('')}</div>
    <div class="items">${items.map(id => { const I = ITEMS[id]; return `<div class="item"><span class="icon">${itemIco(id)}</span><div><b>${I.name}</b> <span class="num">×${count(id)}</span><small>${I.desc}</small></div>${I.use ? `<button class="btn sm" data-use="${id}">${I.kind === '비급' ? '익히기' : '사용'}</button>` : '<span></span>'}</div>`; }).join('')}</div>
  </section>`;
}

