/* [화면] 창(모달): 무공 상세·기연 사건·도감 레시피·처음부터 다시·시작 화면 */

function manualModal(cat) {
  return martialModal(S.active[cat]);
}

function martialModal(id) {
  const M = MANUALS[id], m = S.manuals[id], nc = needC(m.star), nt = need(m.star), cat = M.cat;
  const worn = S.active[cat] === id;
  const bonus = Object.entries(manualBonus(id, m.star)).map(([k, v]) => `<div class="kv"><span>${STAT_NAMES[k]}</span><b>+${PCT_STATS.has(k) || k === 'mpRegen' ? Math.round(v * 10) / 10 : Math.round(v)}${PCT_STATS.has(k) ? '%' : ''}</b></div>`).join('');
  const pc = Math.min(100, Math.floor(m.cxp / nc * 100)), pt = Math.min(100, Math.floor(m.txp / nt * 100));
  const moves = M.moves ? `<h4>초식</h4><ol class="moves">${M.moves.map((mv, i) => { const open = i < unlockedMoves(m.star); return `<li class="${open ? 'open' : 'lock'}"><b>${mv}</b><small>${['제1초식 · 시동', '제2초식 · 연계', '제3초식 · 결착'][i]}${open ? '' : ` — ${i === 1 ? '4성' : '8성'} 돌파 시 해금`}</small></li>`; }).join('')}</ol>
    <p class="${M.weapon === weaponType() ? 'muted' : 'warn'}">필요 병기: ${WEAPON_TYPES[M.weapon]}${M.weapon === weaponType() ? '' : ' (지금 병기로는 초식이 나가지 않습니다)'}</p>` : '';
  const pill = GATES[m.star];
  let gateInfo;
  if (m.star < MAX_STAR) {
    const over = (v, n) => Math.max(0, Math.floor(v - n));
    gateInfo = `<h4>${m.star}성 → ${m.star + 1}성</h4>
      <div class="kv"><span>실전 (전투 승리)</span><b>${Math.floor(m.cxp)} / ${nc}승</b></div>
      <div class="kv"><span>수련 (기본 효율 성당 ${fmtDur(trainHours(m.star) * 3600)})</span><b>${Math.floor(m.txp)} / ${nt}</b></div>
      <div class="kv"><span>이월 예정</span><b>실전 +${over(m.cxp, nc)} · 수련 +${over(m.txp, nt)}</b></div>
      ${pill ? `<p class="${m.gate ? 'warn' : 'muted'}">${GATE_NAME[m.star]} — ${ITEMS[pill].name} 필요${m.gate && !has(pill) ? ' (가지고 있지 않습니다)' : ''}</p>` : ''}
      ${m.gate && has(pill) ? `<div><button class="btn primary" data-pill="${pill}">${ITEMS[pill].icon} ${ITEMS[pill].name} 복용</button></div>` : ''}`;
  } else gateInfo = '<p class="daesung">12성 대성(大成)</p>';
  return `<div class="sheet">
    <div class="sheet-head"><div><small class="muted">${CATS[cat].name} ${CATS[cat].hanja}</small><h2>《${M.name}》 <small class="grade-tag">[${M.grade} ${CATS[cat].name}]</small></h2>${realmTag(m.star)}</div><div class="art-star">${m.star}<small>/12성</small></div></div>
    <p class="num muted">현재 ${m.star}성 / 실전 ${pc}% / 수련 ${pt}%</p>
    ${xpRows(id)}
    <p class="story">${M.desc}</p>
    <h4>보너스 효과 (장착 시)</h4>${bonus}
    <p class="${m.star >= MAX_STAR ? 'gold' : 'muted'}">${m.star >= MAX_STAR ? '🌟 ' : '대성 시 개방 — '}${DAESUNG_PASSIVE[cat].text}</p>
    ${m.star < 6 ? '<p class="muted">소성(6성)에 이르면 장착 능력치가 30% 오릅니다.</p>' : ''}
    ${moves}${gateInfo}
    <div class="btns">${worn ? `<button class="btn danger" data-unequipm="${cat}">[ 장착 해제 ]</button>` : `<button class="btn primary" data-equipm="${id}">[ 장착하기 ]</button>`}<button class="btn ghost" data-act="closemodal">닫기</button></div>
  </div>`;
}

function eventModal(key) {
  const ev = eventAt(key), res = (S.zone.evResult || {})[key];
  const body = res
    ? `<div class="ev-result"><p class="ev-choice">▸ ${res.choice}</p><p class="story" data-tw="ev">${res.text}</p>
        ${res.gains.length ? `<ul class="ev-gains">${res.gains.map(g => `<li class="${/(^|\s)-\d/.test(g) ? 'neg' : ''}">${g}</li>`).join('')}</ul>` : '<p class="muted">얻은 것도 잃은 것도 없습니다.</p>'}</div>
       <div class="btns"><button class="btn primary" data-act="closemodal">계속</button></div>`
    : `<div class="ev-choices">${ev.choices.map((c, i) => { const why = reqFail(c.req); return `<button class="ev-opt" data-evkey="${key}" data-evchoice="${i}" ${why ? 'disabled' : ''}><b>${c.label}</b>${c.req ? `<small class="${why ? 'warn' : 'muted'}">${why || reqLabel(c.req)}${c.take ? ' · 소모' : ''}</small>` : ''}</button>`; }).join('')}</div>`;
  return `<div class="sheet event-sheet">
    <p class="eyebrow">奇緣 · 기연</p>
    <h2>${ev.title}</h2>
    <p class="story ev-text" data-tw="ev">${ev.text}</p>
    ${body}
  </div>`;
}

function openRecipe(rid) {
  const r = RECIPES.find(x => x.id === rid);
  if (!S.codex.includes(rid) && !isClue(r)) { toast('아직 발견하지 못한 비전입니다.'); return; }
  ui.modal = 'recipe:' + rid; renderModal();
}

function recipeModal(rid) {
  const r = RECIPES.find(x => x.id === rid), C = CRAFTS[r.craft];
  let body;
  if (r.out.startsWith('eq:')) {
    const [, base, tier] = r.out.split(':'), B = EQUIP_BASES[base];
    const stats = Object.entries(B.stats[+tier - 1]).map(([k, v]) => `<div class="kv"><span>${STAT_NAMES[k]}</span><b>+${PCT_STATS.has(k) ? Math.round(v * RARITY[2].mult * 10) / 10 + '%' : Math.round(v * RARITY[2].mult)}</b></div>`).join('');
    body = `<p class="story">${SLOTS[B.slot].name}${B.wtype ? ' · ' + WEAPON_TYPES[B.wtype] : ''}. 제작하면 상품 이상으로 나오고, 고유 옵션이 하나 붙습니다.</p><h4>능력치 (상품 기준)</h4>${stats}`;
  } else {
    const I = ITEMS[r.out];
    body = `<p class="story">${I.desc}</p><div class="kv"><span>분류</span><b>${I.kind}</b></div><div class="kv"><span>보유</span><b>${count(r.out)}개</b></div>`;
  }
  const full = S.codex.includes(r.id);
  const knownIn = Object.entries(r.in).filter(([id]) => full || (S.knownMats || {})[id]);
  const hidden = Object.keys(r.in).length - knownIn.length;
  const mats = knownIn.map(([id, n]) => `<li><span>${ITEMS[id].icon} ${ITEMS[id].name} × ${n}</span><b class="${count(id) >= n ? '' : 'warn'}">보유 ${count(id)}</b></li>`).join('')
    + (hidden ? `<li class="hidden-mat"><span>？ 아직 모르는 재료 ${hidden}가지</span><b class="muted">강호의 소문을 모아 보십시오</b></li>` : '');
  return `<div class="sheet">
    <div class="sheet-head"><div><small class="muted">${C.name} ${C.hanja}</small><h2>${recipeIcon(r)} ${recipeName(r)}</h2></div></div>
    ${body}
    <h4>${full ? '필요 재료' : '재료 단서'}</h4><ul class="mats-list">${mats}</ul>
    <div class="btns"><button class="btn primary" data-fill="${r.id}" ${S.zone ? 'disabled' : ''}>[ 화로로 가기 ]</button><button class="btn ghost" data-act="closemodal">닫기</button></div>
    ${S.zone ? '<small class="muted">화로는 청풍문에 돌아가야 쓸 수 있습니다.</small>' : ''}
  </div>`;
}

function fillPot(rid) {
  if (S.zone) return;
  const r = RECIPES.find(x => x.id === rid);
  const full = S.codex.includes(r.id);
  ui.craft = r.craft; ui.pot = Object.fromEntries(Object.entries(r.in).filter(([id]) => full || (S.knownMats || {})[id])); goTab('sect', 'forge'); ui.modal = null; render();
}

function renderModal() {
  const m = $('#modal');
  if (!ui.modal) { if (!m.dataset.intro) m.hidden = true; return; }
  m.hidden = false;
  if (ui.modal.startsWith('manual:')) m.innerHTML = S.active[ui.modal.slice(7)] ? manualModal(ui.modal.slice(7)) : (ui.modal = null, '');
  if (ui.modal && ui.modal.startsWith('mart:')) m.innerHTML = martialModal(ui.modal.slice(5));
  if (!ui.modal) { m.hidden = true; return; }
  if (ui.modal.startsWith('recipe:')) m.innerHTML = recipeModal(ui.modal.slice(7));
  if (ui.modal.startsWith('event:')) { if (!S.zone) { ui.modal = null; m.hidden = true; return; } m.innerHTML = eventModal(ui.modal.slice(6)); }
  if (ui.modal === 'ending') m.innerHTML = `<div class="sheet ending"><p class="eyebrow">제1장 완결</p><h2>${label('청풍문 편', '淸風門')}</h2><p class="story">시골 하급 문파의 밑바닥 제자였던 ${esc(S.name)}. 청풍산의 들개를 쫓던 손이 이제 적룡방 방주를 꺾었습니다.</p><p class="story">장문인 노벽송이 건넨 누런 종이 한 장, <b>낙양성 하산령</b>. 산문 밖으로 난 길은 낙양으로 이어집니다.</p><p class="muted">제2장 [낙양성 편]은 준비 중입니다.</p><div><button class="btn primary" data-act="closemodal">산문을 바라본다</button></div></div>`;
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
function showIntro() {
  let chosen = 'samjaeGeom';
  const m = $('#modal'); m.hidden = false; m.dataset.intro = '1';
  const draw = () => {
    const name = $('#pname') ? $('#pname').value : '이름 없는 제자';
    m.innerHTML = `<div class="sheet intro">
      <p class="eyebrow">江湖見聞錄</p>
      <h1>강호견문록</h1>
      <p class="story">청풍산 기슭, 무너져 가는 하급 문파 <b>청풍문</b>. 장문인은 낮잠을 자고, 대사형은 장작을 패고, 사매는 약과를 굽는다. 그리고 오늘, 새 제자 한 명이 산문을 두드린다.</p>
      <label class="field-l" for="pname">이름</label>
      <input id="pname" maxlength="8" value="${esc(name)}" autocomplete="off">
      <p class="field-l">입문 비급</p>
      <div class="starters">${STARTERS.map(id => { const M = MANUALS[id]; return `<button class="starter ${chosen === id ? 'on' : ''}" data-starter="${id}"><b>${M.name}</b><small>[${WEAPON_SHORT[M.weapon]}]</small></button>`; }).join('')}</div>
      <button class="btn primary big" id="begin">산문에 들어선다</button>
    </div>`;
  };
  draw();
  m.onclick = e => {
    const s = e.target.closest('[data-starter]');
    if (s) { chosen = s.dataset.starter; draw(); return; }
    if (e.target.closest('#begin')) {
      const name = ($('#pname').value || '').trim().slice(0, 8) || '무명';
      m.onclick = null; delete m.dataset.intro; m.hidden = true;
      startNewGame(name, chosen);
      goTab('sect', 'hall');
      render();
    }
  };
}
