/* [화면] 청풍문 탭 화면: 무신상(공양) · 연무장(심상수련장) · 정청 · 전방 (공용 도우미와 상태 · 행낭 화면은 ui_views.js) */
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
      <small class="muted">검게 탄 찌꺼기 ${GACHA.awaken}개를 삼켜 정화하면, 무신의 권능이 깨어나 찢어진 비급 조각 한 장(이류 90% · 일류 10%)을 하사합니다. 조각 ${STUDY.need}장은 화로 › 연혼에서 온전한 비급으로 엮습니다.</small>
    </div>
    ${res && res.length ? `<div class="gacha-res"><h4>돌아온 것</h4><ul>${res.map((g, i) => `<li class="${g.cls}" style="--i:${i}">${g.text}</li>`).join('')}</ul></div>` : ''}
    ${old}
  </section>`;
}

/* 연무장 › 심상수련장: 만나 본 요수와 기력 소모 없이 가상으로 겨룬다 */
function viewYeonmu() {
  const bs = S.bestiary || {}, sim = ui.sim;
  // 지역별 탭 (도감과 같은 짜임): 마주친 상대가 있는 탐험지만
  const zones = ZONE_ORDER.filter(z => [...ZONES[z].enemies, ZONES[z].boss].some(e => bs[e]));
  const zc = zones.includes(ui.simZone) ? ui.simZone : zones[0];
  const ids = zc ? [...ZONES[zc].enemies, ZONES[zc].boss].filter(e => bs[e]) : [];
  const zbar = zones.length > 0 ? `<div class="subtabs sim-zones" role="tablist" aria-label="탐험지" style="--n:${zones.length}">${zones.map(k =>
    `<button class="subtab ${k === zc ? 'on' : ''}" role="tab" aria-selected="${k === zc}" data-simzone="${k}">${label(ZONES[k].name, ZONES[k].hanja)}</button>`).join('')}</div>` : '';
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
    ${ids.length ? `${zbar}<ul class="sim-list">${rows}</ul>` : '<p class="story muted">아직 강호에서 마주친 상대가 없습니다. 강호행에서 탐험을 다녀오십시오.</p>'}
  </section>`;
}

/* 정청 */
function viewHall() {
  const qi = questIndex(), q = QUESTS[qi];
  const shopManuals = LIBRARY_BOOKS.filter(id => MANUALS[id] && !manualSealed(id)).map(id => [id, MANUALS[id]]);   // 이류 비급, 분류마다 하나씩
  const ownsBook = id => !!S.manuals[id] || has('bk_' + id);
  const badges = SHOP_GEAR.filter(g => g.cost);
  const supplied = S.supplyDay === today();
  const hq = `
    <div class="npc-head">${portrait('master', '松', '노벽송')}<div><h3>${label('노벽송', '장문인')}</h3><p class="story" data-tw="npc">의자에 기대 반쯤 졸고 있습니다. 가끔 실눈을 뜨고 제자를 훑어봅니다.</p></div><button class="btn talk-btn ${tutorReady() ? 'ready' : ''}" data-act="masterhint">${tutorReady() ? '보상 받기 <small>가르침을 이룸</small>' : '말 걸기'}</button><button class="btn talk-btn" data-act="subqask">토벌 지역 정하기 <small>(${ZONES[subqZone()].name})</small></button></div>
    <div class="quest main-quest ${tutorReady() ? 'ready' : ''}">
      ${!q ? '<b>제1장 완결</b><p class="story">낙양으로 가는 길이 열려 있습니다.</p>'
        : `<small class="muted">메인 퀘스트 · 장문인의 가르침 ${qi + 1}/${QUESTS.length}</small><b>${q.t}${tutorReady() ? ' <span class="good">— 이룸!</span>' : ''}</b><p class="story">${tutorReady() ? '장문인에게 [ 보상 받기 ]를 누르십시오.' : q.hint}</p>${q.reward ? `<p class="quest-reward">보상: <b>${questRewardText(q)}</b></p>` : ''}`}
      ${canHasan() ? '<div><button class="btn primary" data-act="hasan">하산 허가를 청한다</button></div>' : ''}
    </div>
    <!--subq-->
    <div class="npc-head">${portrait('joun', '雲', '조운')}<div><h3>${label('조운', '대사형')}</h3><p class="story" data-tw="npc">장작을 패다 말고 이마의 땀을 훔칩니다. "왔냐. 모르는 게 있으면 물어라. 물건은 전방 왕 가한테 가고."</p></div>
      <div class="npc-acts"><button class="btn talk-btn" data-act="jounguide">문파 안내</button><button class="btn talk-btn ${supplied ? '' : 'ready'}" data-act="supply" ${supplied ? 'disabled' : ''}>${supplied ? '오늘은 받았음' : '[ 오늘의 보급품 ]'}</button></div></div>
    <div class="npc-head">${portrait('arin', '璘', '아린')}<div><h3>${label('아린', '사매')}</h3><p class="story" data-tw="npc">붉은 댕기를 휘날리며 뛰어옵니다. "사형! 사형! 배고프죠? 죽 끓여 놨어요!"</p></div>
      <div class="npc-acts"><button class="btn talk-btn ${S.hp < calcStats().maxHp || S.mp < calcStats().maxMp ? 'ready' : ''}" data-act="talk" title="죽 한 그릇 · 활력·내력 모두 회복">말 걸기 <small>(${arinFree() ? '오늘 첫 죽 무료' : `죽 은자 ${ARIN_CARE}냥`})</small></button></div></div>`;
  // 서브 퀘스트: 열린 단계마다 반복 토벌 (지금 탐험지가 먼저, 받을 수 있는 것이 위로)
  const sq = subqList().sort((a, b) => (subqReady(b.zid, b.n) - subqReady(a.zid, a.n)) || ((b.zid === S.expedition.zone) - (a.zid === S.expedition.zone)) || ZONE_ORDER.indexOf(a.zid) - ZONE_ORDER.indexOf(b.zid) || a.n - b.n);
  const missions = `
    <div class="subq-box"><p class="subq-title"><small class="muted">보조 퀘스트 · 반복</small> <b>토벌 임무 · ${ZONES[subqZone()].name}</b> <small class="muted">장문인과 정한 탐험지에서만 셉니다. 단계마다 ${SUBQ.kills}번 이기면 보상 · 오늘 ${subqLeft()}/${SUBQ.daily}번 남음. 지역은 장문인에게 [토벌 지역 정하기].</small></p>
    <ul class="missions">${sq.map(({ zid, n }) => {
      const p = subqProg(zid, n), R = subqReward(zid, n), ok = subqReady(zid, n), left = subqLeft();
      return `<li class="${ok ? 'ready' : ''}"><div><b>토벌</b> ${stageName(zid, n)} <small class="muted">${n >= STAGE.count ? '두목' : `${n}단계`}</small></div><div class="mprog"><span style="width:${p / SUBQ.kills * 100}%"></span></div><span class="num">${p}/${SUBQ.kills}</span><span class="reward">공헌 ${R.contrib} · 은자 ${R.silver} · 수련치 ${R.exp} · 생혈고 ${R.pot}</span><button class="btn sm ${ok ? 'primary' : ''}" data-subq="${zid}:${n}" ${ok ? '' : 'disabled'}>${left ? '보상' : '내일'}</button></li>`;
    }).join('') || '<li class="muted">강호행에서 탐험지를 정하면 토벌 임무가 열립니다.</li>'}</ul></div>`;
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
  return `<section class="panel npc fold">${foldHead('hq', '정청 본부', '正廳', tutorReady() || subqReadyCount() ? `<span class="num gold">${[tutorReady() ? '가르침 보상' : '', subqReadyCount() ? `토벌 보상 ${subqReadyCount()}건` : ''].filter(Boolean).join(' · ')} ${alertDot(true)}</span>` : '')}${foldBody('hq', hq.replace('<!--subq-->', missions))}</section>
  <section class="panel fold">${foldHead('library', '장경각', '藏經閣', `<span class="num gold">공헌도 ${fmt(S.contrib)}</span>`)}${foldBody('library', library)}</section>`;
}

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
