/* [화면] 창(모달): 무공 상세·기연 사건·도감 레시피·처음부터 다시·시작 화면 */

function manualModal(cat) {
  return martialModal(S.active[cat]);
}

function martialModal(id) {
  const M = MANUALS[id], m = S.manuals[id], cat = M.cat;
  const worn = S.active[cat] === id;
  const bonus = Object.entries(manualBonus(id, m.star)).map(([k, v]) => `<div class="kv"><span>${STAT_NAMES[k]}</span><b>+${PCT_STATS.has(k) || k === 'mpRegen' ? Math.round(v * 10) / 10 : Math.round(v)}${PCT_STATS.has(k) ? '%' : ''}</b></div>`).join('');
  const moves = M.weapon && M.stances ? `<h4>초식</h4><ol class="moves">${M.stances.map(({ name: mv }, i) => { const open = i < unlockedMoves(m.star); return `<li class="${open ? 'open' : 'lock'}"><b>${mv}</b><small>${['제1초식 · 시동', '제2초식 · 연계', '제3초식 · 결착'][i]}${open ? '' : ` — ${i === 1 ? '4성' : '8성'} 돌파 시 해금`}</small></li>`; }).join('')}</ol>
    <p class="${M.weapon === weaponType() ? 'muted' : 'warn'}">필요 병기: ${WEAPON_TYPES[M.weapon]}${M.weapon === weaponType() ? '' : ' (지금 병기로는 초식이 나가지 않습니다)'}</p>` : '';
  const pill = GATES[m.star];
  let gateInfo;
  if (m.star < MAX_STAR) {
    const cost = starCost(id), why = starUpBlock(id);
    gateInfo = `<h4>${m.star}성 → ${m.star + 1}성</h4>
      <div class="kv"><span>필요 경험치</span><b class="${S.exp >= cost ? 'gold' : ''}">${fmt(S.exp)} / ${fmt(cost)}</b></div>
      ${pill ? `<div class="kv"><span>${GATE_NAME[m.star]}</span><b class="${has(pill) ? 'gold' : 'warn'}">${ITEMS[pill].name} ${has(pill) ? '보유' : '없음'}</b></div>` : ''}
      <div><button class="btn primary" data-starup="${id}" ${why ? 'disabled' : ''}>▲ 성급 올리기${why ? ` <small>(${why})</small>` : ` <small>경험치 ${fmt(cost)}${pill ? ` + ${ITEMS[pill].name}` : ''}</small>`}</button></div>`;
  } else gateInfo = '<p class="daesung">12성 대성(大成)</p>';
  return `<div class="sheet">
    <div class="sheet-head"><div><small class="muted">${CATS[cat].name} ${CATS[cat].hanja}</small><h2>《${M.name}》 <small class="grade-tag">[${M.grade} ${CATS[cat].name}]</small></h2>${realmTag(m.star)}</div><div class="art-star">${m.star}<small>/12성</small></div></div>
    <p class="num muted">현재 ${m.star}성${m.star < MAX_STAR ? ` / 다음 성까지 경험치 ${fmt(starCost(id))} (보유 ${fmt(S.exp)})` : ' / 대성'}</p>
    <p class="story">${M.desc}</p>
    ${M.elem ? `<p class="aff-line">${elemTag(M.elem)} 오행 ${ELEMENTS[M.elem].name}(${ELEMENTS[M.elem].hanja}) — ${ELEMENTS[ELEM_BEATS[M.elem]].hanja} 속성 적에게 피해 +25%, ${ELEMENTS[Object.keys(ELEM_BEATS).find(k => ELEM_BEATS[k] === M.elem)].hanja} 속성 적에게는 -25%</p>` : ''}
    ${M.terrain ? `<p class="aff-line">${terrainTag(M.terrain)} ${TERRAINS[M.terrain].name} 지형에서 기력 소모 -20%, 다른 지형에서는 +20%</p>` : ''}
    <h4>보너스 효과 (장착 시)</h4>${bonus}
    <p class="${m.star >= MAX_STAR ? 'gold' : 'muted'}">${m.star >= MAX_STAR ? '🌟 ' : '대성 시 개방 — '}${DAESUNG_PASSIVE[cat].text}</p>
    ${m.star < 6 ? '<p class="muted">소성(6성)에 이르면 장착 능력치가 30% 오릅니다.</p>' : ''}
    ${moves}${gateInfo}
    <div class="btns">${worn ? `<button class="btn danger" data-unequipm="${cat}">[ 장착 해제 ]</button>` : `<button class="btn primary" data-equipm="${id}">[ 장착하기 ]</button>`}<button class="btn ghost" data-act="closemodal">닫기</button></div>
  </div>`;
}


function openRecipe(rid) {
  if (!S.codex.includes(rid)) { toast('아직 발견하지 못한 비법입니다. 화로에서 직접 찾아내십시오.'); return; }
  ui.modal = 'recipe:' + rid; renderModal();
}

function recipeModal(rid) {
  const r = RECIPES.find(x => x.id === rid), C = CRAFTS[r.craft];
  let body;
  const G = recipeGear(r);
  if (G) {
    const stats = Object.entries(G.stats).map(([k, v]) => `<div class="kv"><span>${STAT_NAMES[k]}</span><b>+${v}${PCT_STATS.has(k) ? '%' : ''}</b></div>`).join('');
    body = `<p class="story">${G.desc}</p><div class="kv"><span>분류</span><b>${SLOTS[G.slot].name}${G.wtype ? ' · ' + WEAPON_TYPES[G.wtype] : ''} · [${RARITY[1].name}]</b></div><h4>능력치</h4>${stats}`;
  } else {
    const I = ITEMS[r.out];
    body = `<p class="story">${I.desc}</p><div class="kv"><span>분류</span><b>${I.kind}${I.grade ? ' · ' + I.grade : ''}</b></div><div class="kv"><span>보유</span><b>${count(r.out)}개</b></div>`;
  }
  const mats = Object.entries(r.in).map(([id, n]) => `<li><span>${ITEMS[id].icon} ${ITEMS[id].name} × ${n}</span><b class="${count(id) >= n ? '' : 'warn'}">보유 ${count(id)}</b></li>`).join('');
  return `<div class="sheet">
    <div class="sheet-head"><div><small class="muted">${C.name} ${C.hanja}</small><h2>${recipeIcon(r)} ${recipeName(r)}</h2></div></div>
    ${body}
    <h4>필요 재료</h4><ul class="mats-list">${mats}</ul>
    <div class="btns"><button class="btn primary" data-fill="${r.id}">[ 화로로 가기 ]</button><button class="btn ghost" data-act="closemodal">닫기</button></div>
  </div>`;
}

function fillPot(rid) {
  const r = RECIPES.find(x => x.id === rid);
  if (!S.codex.includes(r.id)) return;
  ui.craft = r.craft; ui.pot = { ...r.in }; goTab('sect', 'forge'); ui.modal = null; render();
}

function renderModal() {
  const m = $('#modal');
  if (!ui.modal) { if (!m.dataset.intro) m.hidden = true; return; }
  m.hidden = false;
  if (ui.modal.startsWith('manual:')) m.innerHTML = S.active[ui.modal.slice(7)] ? manualModal(ui.modal.slice(7)) : (ui.modal = null, '');
  if (ui.modal && ui.modal.startsWith('mart:')) m.innerHTML = martialModal(ui.modal.slice(5));
  if (!ui.modal) { m.hidden = true; return; }
  if (ui.modal.startsWith('recipe:')) m.innerHTML = recipeModal(ui.modal.slice(7));
  if (ui.modal.startsWith('settle:')) { const h = settleModal(ui.modal.slice(7).split(',').map(Number)); if (!h) { ui.modal = null; m.hidden = true; return; } m.innerHTML = h; }
  if (ui.modal.startsWith('replay:')) {
    const key = ui.modal.slice(7), box = $('#rpBox');
    if (!box || box.dataset.key !== key) {                   // 다른 이유로 다시 그려져도 재생 중인 관찰 창은 그대로 둔다
      const h = replayModal(key); if (!h) { ui.modal = null; m.hidden = true; return; }
      m.innerHTML = h;
      if (RP.playing) RP.timer = setTimeout(replayStep, 500);
    }
  }
  if (ui.modal === 'ending') m.innerHTML = `<div class="sheet ending"><p class="eyebrow">제1장 완결</p><h2>${label('청풍문 편', '淸風門')}</h2><p class="story">시골 하급 문파의 밑바닥 제자였던 ${esc(S.name)}. 청풍산의 산토끼를 쫓던 손이 이제 수룡방주를 꺾었습니다.</p><p class="story">장문인 노벽송이 건넨 누런 종이 한 장, <b>낙양성 하산령</b>. 산문 밖으로 난 길은 낙양으로 이어집니다.</p><p class="muted">제2장 [낙양성 편]은 준비 중입니다.</p><div><button class="btn primary" data-act="closemodal">산문을 바라본다</button></div></div>`;
  wireImages();
  if (ui.modal === 'reset') m.innerHTML = `<div class="sheet"><h2>처음부터 다시</h2><p>${RESET_MSG}</p><div class="btns"><button class="btn danger" data-act="doreset">새로 시작</button><button class="btn ghost" data-act="closemodal">그만두기</button></div></div>`;
}

/* 처음부터 다시: 브라우저 확인창을 먼저 쓰고, 확인창이 막힌 환경(즉시 false 반환)에서는 화면 안 확인창으로 대신한다.
   이전에는 저장을 지운 뒤 새로고침 직전 beforeunload가 현재 상태를 다시 저장해 초기화가 되지 않았다. */
const RESET_MSG = '모든 강호의 기록을 지우고 처음부터 다시 시작하시겠습니까?';

function askReset() {
  const t0 = performance.now();
  let ok = false;
  try { ok = window.confirm(RESET_MSG); } catch (e) { ok = false; }
  if (ok) return doReset();
  if (performance.now() - t0 < 30) { ui.modal = 'reset'; renderModal(); }
}

/* ───────── 시작 화면 ───────── */
/* 시작 화면: 프롤로그(석상에 빙의한 나) + 제자 만들기(이름 · 3대 스탯 · 입문 무공 · 보조 기예) */
const PROLOGUE = [
  '밤새 읽던 무협 소설 《강호견문록》의 마지막 장을 덮고 눈을 감았다. 다시 눈을 떴을 때, 몸이 움직이지 않았다.',
  '이끼 낀 돌 손, 금이 간 돌 어깨. 나는 소설 속 몰락한 하급 문파 <b>청풍문</b>, 그 마당 한가운데 선 <b>무신상(武神像)</b>이 되어 있었다.',
  '원작에서 청풍문은 제1장이 끝나기도 전에 멸문한다. 아무도 기억하지 않는 엑스트라 문파다. 그런데 오늘 아침, 산문을 두드린 풋내기 하나가 석상 앞에 무릎을 꿇었을 때 — 내 목소리가 그 아이의 머릿속에 닿았다.',
  '움직일 수 없는 나 대신, 이 제자가 강호를 걷는다. 나는 원작을 안다. 이 아이는 모른다.',
];
function showIntro() {
  let chosen = 'samjaeGeom', talent = 'gather';
  const attr = Object.fromEntries(Object.keys(ATTRS).map(k => [k, ATTR_BASE]));
  const m = $('#modal'); m.hidden = false; m.dataset.intro = '1';
  const left = () => ATTR_TOTAL - Object.values(attr).reduce((a, b) => a + b, 0);
  const eff = k => { const d = attr[k] - ATTR_BASE, P = ATTRS[k].per, sg = v => (v > 0 ? '+' : '') + (Math.round(v * 10) / 10);
    return d === 0 ? '기본' : Object.entries(P).map(([s, v]) => `${s === 'elem' ? '오행 극' : STAT_NAMES[s] || s} ${sg(v * d)}${s === 'elem' ? '%p' : ''}`).join(' · '); };
  const draw = () => {
    const name = $('#pname') ? $('#pname').value : '이름 없는 제자';
    m.innerHTML = `<div class="sheet intro">
      <p class="eyebrow">江湖見聞錄 · 序章</p>
      <h1>강호견문록</h1>
      <div class="prologue">${PROLOGUE.map(p => `<p class="story">${p}</p>`).join('')}</div>
      <h3 class="intro-h">제자 만들기</h3>
      <label class="field-l" for="pname">제자의 이름</label>
      <input id="pname" maxlength="8" value="${esc(name)}" autocomplete="off">
      <p class="field-l">3대 기본 스탯 <small class="muted">합계 ${ATTR_TOTAL} · 한 스탯 ${ATTR_MIN}~${ATTR_MAX} · 남은 점수 <b id="attrLeft">${left()}</b></small></p>
      <div class="attrs">${Object.entries(ATTRS).map(([k, A]) => `<div class="attr-row" data-attrrow="${k}">
        <span class="attr-name">${label(A.name, A.hanja)}<small class="muted">${A.desc}</small></span>
        <button class="btn sm ghost" data-attr="${k}" data-d="-1" ${attr[k] <= ATTR_MIN ? 'disabled' : ''} aria-label="${A.name} 내리기">−</button>
        <b class="attr-val">${attr[k]}</b>
        <button class="btn sm ghost" data-attr="${k}" data-d="1" ${attr[k] >= ATTR_MAX || left() <= 0 ? 'disabled' : ''} aria-label="${A.name} 올리기">＋</button>
        <small class="attr-eff">${eff(k)}</small></div>`).join('')}</div>
      <p class="field-l">입문 무공</p>
      <div class="starters">${STARTERS.map(id => { const M = MANUALS[id]; return `<button class="starter ${chosen === id ? 'on' : ''}" data-starter="${id}"><b>${M.name}</b><small>[${WEAPON_SHORT[M.weapon]}]</small></button>`; }).join('')}</div>
      <p class="field-l">보조 기예</p>
      <div class="starters talents">${Object.entries(TALENTS).map(([k, T]) => `<button class="starter ${talent === k ? 'on' : ''}" data-talent="${k}"><b>${T.name} <small>${T.hanja}</small></b><small>${T.desc}</small></button>`).join('')}</div>
      <p class="muted">${left() ? `남은 점수 ${left()}점을 모두 나눠야 시작할 수 있습니다.` : '병기 상성: 권장 › 검/도 › 창·암기 › 권장 … 입문 무공이 곧 첫 병기입니다.'}</p>
      <button class="btn primary big" id="begin" ${left() ? 'disabled' : ''}>제자에게 말을 건다</button>
    </div>`;
  };
  draw();
  m.onclick = e => {
    const s = e.target.closest('[data-starter]');
    if (s) { chosen = s.dataset.starter; draw(); return; }
    const t = e.target.closest('[data-talent]');
    if (t) { talent = t.dataset.talent; draw(); return; }
    const a = e.target.closest('[data-attr]');
    if (a && !a.disabled) { const k = a.dataset.attr, d = +a.dataset.d; if (attr[k] + d >= ATTR_MIN && attr[k] + d <= ATTR_MAX && (d < 0 || left() > 0)) attr[k] += d; draw(); return; }
    if (e.target.closest('#begin') && !left()) {
      const name = ($('#pname').value || '').trim().slice(0, 8) || '무명';
      m.onclick = null; delete m.dataset.intro; m.hidden = true;
      startNewGame(name, chosen, { attr: { ...attr }, talent });
      goTab('sect', 'hall');
      render();
    }
  };
}
