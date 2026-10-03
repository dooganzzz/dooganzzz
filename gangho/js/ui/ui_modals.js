/* [화면] 창(모달): 무공 상세·기연 사건·도감 레시피·처음부터 다시·시작 화면 */

/* 비급에 실린 과거 시: 검법은 비급마다 한 편, 나머지 갈래는 등급에 맞는 갈래 시 (짧은 시 · 보통 시 · 긴 시) */
function manualPoemHtml(id) {
  const M = MANUALS[id], P = manualPoem(M);
  return P ? `<blockquote class="manual-poem">${P.title ? `<b>${P.title}</b>` : ''}${P.lines.map(l => `<span>${l}</span>`).join('')}</blockquote>` : '';
}
function manualModal(cat) {
  return martialModal(S.active[cat]);
}

/* 아직 익히지 않은 비급의 상세 (장보각 카드 등): 시문 · 초식 · 상성 · 성급별 장착 능력치 · 독파 각인 · 공헌 */
function manualPreviewModal(id) {
  const M = MANUALS[id], cat = M.cat, lib = LIBRARY_BOOKS.includes(id) && M.cost, own = !!(S.manuals[id] || has('bk_' + id));
  const statTxt = st => Object.entries(manualBonus(id, st)).map(([k, v]) => `${STAT_NAMES[k]} +${PCT_STATS.has(k) || k === 'mpRegen' ? Math.round(v * 10) / 10 : Math.round(v)}${PCT_STATS.has(k) ? '%' : ''}`).join(' · ');
  const moves = M.stances ? `<h4>${M.weapon ? '초식' : '경지'}</h4><ol class="moves">${M.stances.map(({ name, desc }) => `<li><b>${name}</b> <small class="muted">${esc(desc || '')}</small></li>`).join('')}</ol>` : '';
  return `<div class="sheet">
    <div class="sheet-head"><div><small class="muted">${CATS[cat].name} ${CATS[cat].hanja}</small><h2>《${M.name}》 ${schoolTag(id)} <small class="grade-tag">[${M.grade} ${CATS[cat].name}]</small></h2></div></div>
    <p class="story">${M.desc}</p>
    ${manualPoemHtml(id)}
    ${M.weapon ? `<p class="${M.weapon === weaponType() ? 'muted' : 'warn'}">필요 병기: ${WEAPON_TYPES[M.weapon]}${M.weapon === weaponType() ? '' : ' (지금 병기로는 초식이 나가지 않습니다)'}</p>` : ''}
    ${M.elem ? `<p class="aff-line">${elemTag(M.elem)} 오행 ${ELEMENTS[M.elem].name}(${ELEMENTS[M.elem].hanja})</p>` : ''}
    ${M.terrain ? `<p class="aff-line">${terrainTag(M.terrain)} ${TERRAINS[M.terrain].name} 지형에서 기력 소모 -20%, 다른 지형에서는 +20%</p>` : ''}
    ${moves}
    <h4>장착 능력치</h4>
    <div class="kv"><span>1성</span><b>${statTxt(1)}</b></div><div class="kv"><span>6성 소성</span><b>${statTxt(6)}</b></div><div class="kv"><span>12성 대성</span><b>${statTxt(MAX_STAR)}</b></div>
    <p class="muted">대성 시 개방 — ${DAESUNG_PASSIVE[cat].text}</p>
    <p class="passive">독파 각인: ${bonusText(M.passiveBonus)}</p>
    <div class="btns">${lib ? `<button class="btn primary" data-buymanual="${id}" ${own || S.contrib < M.cost ? 'disabled' : ''}>${own ? '보유' : `공헌 ${M.cost}로 바꾸기`}</button>` : ''}<button class="btn ghost" data-act="closemodal">닫기</button></div>
  </div>`;
}
function martialModal(id) {
  if (!S.manuals[id]) return manualPreviewModal(id);   // 아직 익히지 않은 비급
  const M = MANUALS[id], m = S.manuals[id], cat = M.cat;
  const worn = S.active[cat] === id;
  const bonus = Object.entries(manualBonus(id, m.star)).map(([k, v]) => `<div class="kv"><span>${STAT_NAMES[k]}</span><b>+${PCT_STATS.has(k) || k === 'mpRegen' ? Math.round(v * 10) / 10 : Math.round(v)}${PCT_STATS.has(k) ? '%' : ''}</b></div>`).join('');
  const moves = M.stances ? `<h4>${M.weapon ? '초식' : '경지'}</h4><ol class="moves">${M.stances.map(({ name: mv }, i) => { const open = i < unlockedMoves(m.star); return `<li class="${open ? 'open' : 'lock'}"><b>${mv}</b><small>${['제1초식 · 습득', '제2초식 · 소성', '오의 · 대성'][i]}${open ? '' : ` — ${i === 1 ? '6성 소성 돌파' : '12성 대성 달성'} 시 해금`}</small></li>`; }).join('')}</ol>
    ${M.weapon ? `<p class="${M.weapon === weaponType() ? 'muted' : 'warn'}">필요 병기: ${WEAPON_TYPES[M.weapon]}${M.weapon === weaponType() ? '' : ' (지금 병기로는 초식이 나가지 않습니다)'}</p>` : ''}` : '';
  const pill = GATES[m.star];
  let gateInfo;
  if (m.star < MAX_STAR) {
    const cost = starCost(id), why = starUpBlock(id);
    gateInfo = `<h4>${m.star}성 → ${m.star + 1}성</h4>
      <div class="kv"><span>필요 수련치</span><b class="${S.exp >= cost ? 'gold' : ''}">${fmt(S.exp)} / ${fmt(cost)}</b></div>
      ${pill ? `<div class="kv"><span>${GATE_NAME[m.star]}</span><b class="${has(pill) ? 'gold' : 'warn'}">${ITEMS[pill].name} ${has(pill) ? '보유' : '없음'}</b></div>` : ''}
      <div><button class="btn primary" data-starup="${id}" ${why ? 'disabled' : ''}>▲ 성급 올리기${why ? ` <small>(${why})</small>` : ` <small>수련치 ${fmt(cost)}${pill ? ` + ${ITEMS[pill].name}` : ''}</small>`}</button></div>`;
  } else gateInfo = '<p class="daesung">12성 대성(大成)</p>';
  return `<div class="sheet">
    <div class="sheet-head"><div><small class="muted">${CATS[cat].name} ${CATS[cat].hanja}</small><h2>《${M.name}》 ${schoolTag(id)} <small class="grade-tag">[${M.grade} ${CATS[cat].name}]</small></h2>${realmTag(m.star)}</div><div class="art-star">${m.star}<small>/12성</small></div></div>
    <p class="num muted">현재 ${m.star}성${m.star < MAX_STAR ? ` / 다음 성까지 수련치 ${fmt(starCost(id))} (보유 ${fmt(S.exp)})` : ' / 대성'}</p>
    <p class="story">${M.desc}</p>
    ${manualPoemHtml(id)}
    ${cat === 'mugong' ? (P => `<p class="aff-line">${schoolTag(id)} ${P.name}(${P.hanja}) — ${P.words}. 성향(계열마다 가장 높은 비급) 한 칸마다 ${P.bonus}. ${P.hanja}는 ${SCHOOLS[P.beats].hanja}를 이기고 ${SCHOOLS[Object.keys(SCHOOLS).find(k => SCHOOLS[k].beats === schoolOf(id))].hanja}에게 진다 (요수에게는 상성 없음)</p>`)(SCHOOLS[schoolOf(id)]) : ''}
    ${M.elem ? `<p class="aff-line">${elemTag(M.elem)} 오행 ${ELEMENTS[M.elem].name}(${ELEMENTS[M.elem].hanja}) — ${ELEMENTS[ELEM_BEATS[M.elem]].hanja} 속성 적에게 피해 +25%, ${ELEMENTS[Object.keys(ELEM_BEATS).find(k => ELEM_BEATS[k] === M.elem)].hanja} 속성 적에게는 -25%</p>` : ''}
    ${M.terrain ? `<p class="aff-line">${terrainTag(M.terrain)} ${TERRAINS[M.terrain].name} 지형에서 기력 소모 -20%, 다른 지형에서는 +20%</p>` : ''}
    <h4>보너스 효과 (장착 시)</h4>${bonus}
    <p class="${m.star >= MAX_STAR ? 'gold' : 'muted'}">${m.star >= MAX_STAR ? '🌟 ' : '대성 시 개방 — '}${DAESUNG_PASSIVE[cat].text}</p>
    ${m.star < 6 ? '<p class="muted">소성(6성)에 이르면 장착 능력치가 30% 오릅니다.</p>' : ''}
    ${moves}${gateInfo}
    <div class="btns">${worn && Object.keys(S.manuals).some(k => k !== id && MANUALS[k].cat === cat) ? `<button class="btn ghost" data-artslot="${cat}">[ 다른 비급으로 바꾸기 ]</button>` : ''}${worn ? `<button class="btn danger" data-unequipm="${cat}">[ 장착 해제 ]</button>` : `<button class="btn primary" data-equipm="${id}">[ 장착하기 ]</button>`}<button class="btn ghost" data-act="closemodal">닫기</button></div>
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
    body = `<p class="story">${G.desc}</p><div class="kv"><span>분류</span><b>${SLOTS[G.slot].name}${G.wtype ? ' · ' + WEAPON_TYPES[G.wtype] : ''} · [${G.rank || RARITY[G.rarity || 1].name}]</b></div><h4>능력치</h4>${stats}`;
  } else {
    const I = ITEMS[r.out];
    body = `<p class="story">${I.desc}</p><div class="kv"><span>분류</span><b>${I.kind}${I.grade ? ' · ' + I.grade : ''}</b></div><div class="kv"><span>보유</span><b>${count(r.out)}개</b></div>`;
  }
  const mats = Object.entries(r.in).map(([id, n]) => `<li><span>${itemIco(id, 'sm')} ${ITEMS[id].name} × ${n}</span><b class="${count(id) >= n ? '' : 'warn'}">보유 ${count(id)}</b></li>`).join('');
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

/* ───────── 행낭: 칸을 누르면 그 물건의 세부정보 (장비: 부위 · 능력치 · 투력 · 착용/버리기, 소지품: 설명 · 사용) ───────── */
/* 호패 창: 관조의 호패를 누르면 — 별호 새기기 (호패는 행낭 물건이 아니라 늘 지닌 것) */
const hopaeModal = () => `<div class="sheet bag-sheet" role="dialog" aria-modal="true"><div class="sheet-head"><div><small class="muted">신분</small><h2>호패 <small class="muted">號牌</small></h2></div></div>${hopaeCard()}${titlePicker()}<div class="btns"><button class="btn ghost" data-act="closemodal">닫기</button></div></div>`;
function bagItemModal(key) {
  const [kind, id] = [key.slice(0, 1), key.slice(2)];
  if (kind === 'g') {
    const it = S.gear.find(g => g.uid === +id); if (!it) return '';
    return `<div class="sheet bag-sheet" role="dialog" aria-modal="true">
      <div class="sheet-head bag-detail ${gradeClass(RARITY[it.rarity].name)}">${inkBox(gearIco(it, 'card'))}<div><small class="muted">${SLOTS[it.slot].name}${it.wtype ? ' · ' + WEAPON_SHORT[it.wtype] : ''}</small><h2 class="item-name">${esc(gearName(it))}</h2></div></div>
      <p>${statLine(it)}</p>${it.unique ? `<p class="uniq">✦ ${it.unique.text}</p>` : ''}${cpDiffTag(it)}
      <div class="btns"><button class="btn primary" data-equip="${it.uid}">착용</button><button class="btn ghost" data-discard="${it.uid}">버리기</button><button class="btn ghost" data-act="closemodal">닫기</button></div>
    </div>`;
  }
  const I = ITEMS[id]; if (!I || !has(id)) return '';
  return `<div class="sheet bag-sheet" role="dialog" aria-modal="true">
    <div class="sheet-head bag-detail">${inkBox(itemIco(id))}<div><small class="muted">${I.kind || '소지품'}</small><h2 class="item-name">${esc(I.name)} <span class="num muted">×${count(id)}</span></h2></div></div>
    <p>${I.desc || ''}</p>
    <div class="btns">${I.use ? `<button class="btn primary" data-use="${id}">${I.kind === '비급' ? '익히기' : '사용'}</button>` : ''}<button class="btn ghost" data-act="closemodal">닫기</button></div>
  </div>`;
}

/* ───────── 상태 › 무장: 장비 칸을 누르면 그 부위 장비 목록 (장착·교체·해제·강화) ───────── */
function equipModal(slot) {
  const cur = S.equip[slot], list = gearSort(S.gear.filter(g => g.slot === slotAccepts(slot)));
  const mw = S.active.mugong && MANUALS[S.active.mugong].weapon;
  const card = (it, btns) => `<div class="gear item-card r${it.rarity} ${gradeClass(RARITY[it.rarity].name)}">${itemCardHead(gearName(it), RARITY[it.rarity].name, gearIco(it, 'card'))}${it.wtype ? `<small class="muted item-category">${WEAPON_SHORT[it.wtype]}</small>` : ''}
    <small>${statLine(it)}</small>${it.unique ? `<small class="uniq">✦ ${it.unique.text}</small>` : ''}${slot === 'weapon' && mw && it.wtype !== mw ? `<small class="warn">장착 무공은 ${WEAPON_TYPES[mw]} 무공이라 초식이 나가지 않습니다</small>` : ''}
    <div class="btns">${btns}</div></div>`;
  const curHtml = cur ? card(cur, `<small class="muted">🔨 강화: 화로 › 단조 › 장비에서 같은 장비를 재료로</small><button class="btn ghost sm" data-unequip="${slot}">해제</button>`) : '<p class="muted">비어 있습니다.</p>';
  const rows = list.map(it => card(it, `${cpDiffTag(it, slot)}<button class="btn primary sm" data-equip="${it.uid}" data-to="${slot}">${cur ? '교체' : '장착'}</button>`)).join('');
  return `<div class="sheet equip-sheet" role="dialog" aria-modal="true">
    <div class="sheet-head"><div><small class="muted">무장 武裝</small><h2>${SLOTS[slot].name} <small class="muted">${SLOTS[slot].desc}</small></h2></div></div>
    <h4>착용 중</h4>${curHtml}
    <h4>행낭의 ${SLOTS[slot].name} <span class="num muted">${list.length}점</span></h4>
    ${rows ? `<div class="gears">${rows}</div>` : '<p class="muted">행낭에 이 부위에 맞는 장비가 없습니다.</p>'}
    <div class="btns"><button class="btn ghost" data-act="closemodal">닫기</button></div>
  </div>`;
}

/* ───────── 관조 › 무공: 무공 칸을 누르면 그 계열의 익힌 무공 목록 (장착·교체·해제·상세) ───────── */
function artSlotModal(cat) {
  const cur = S.active[cat], C = CATS[cat];
  const list = Object.keys(S.manuals).filter(id => MANUALS[id].cat === cat && id !== cur);
  const card = (id, btns) => { const M = MANUALS[id], m = S.manuals[id];
    return `<div class="mcard-row ${cur === id ? 'worn' : ''}"><div><b>《${M.name}》</b>${schoolTag(id)}${manualAffTag(id)}${M.weapon ? weaponTag(M.weapon) : ''} ${realmTag(m.star)} <span class="num muted">${m.star}성 · ${M.grade}</span>
      ${M.weapon && M.weapon !== weaponType() ? `<small class="warn">지금 병기로는 초식이 나가지 않습니다 (${WEAPON_TYPES[M.weapon]})</small>` : ''}</div><div class="btns">${btns}</div></div>`; };
  const curHtml = cur ? card(cur, `<button class="btn ghost sm" data-mart="${cur}">상세·성급</button><button class="btn ghost sm" data-unequipm="${cat}">해제</button>`) : '<p class="muted">비어 있습니다.</p>';
  const rows = list.map(id => card(id, `<button class="btn ghost sm" data-mart="${id}">상세·성급</button><button class="btn primary sm" data-equipm="${id}">${cur ? '교체' : '장착'}</button>`)).join('');
  return `<div class="sheet artslot-sheet" role="dialog" aria-modal="true">
    <div class="sheet-head"><div><small class="muted">무공 武功</small><h2>${label(C.name, C.hanja)} <small class="muted">${C.desc}</small></h2></div></div>
    <h4>운용 중</h4>${curHtml}
    <h4>익힌 ${C.name}</h4>
    ${rows ? `<div class="mcard-list">${rows}</div>` : `<p class="muted">장착할 수 있는 다른 ${C.name}이(가) 없습니다. 비급을 익히면 여기에 나타납니다.</p>`}
    <div class="btns"><button class="btn ghost" data-act="closemodal">닫기</button></div>
  </div>`;
}

/* ───────── 공통 재확인 창: 판매·휴식처럼 실수로 누르면 곤란한 행동 앞에 ─────────
   showConfirmModal({ title, message, confirmText, cancelText, onConfirm }) */
let confirmCb = null;
function showConfirmModal({ title = '확인', message = '정말 진행하시겠습니까?', details = [], confirmText = '확인', cancelText = '취소', onConfirm } = {}) {
  confirmCb = typeof onConfirm === 'function' ? onConfirm : null;
  if (ui.modal !== 'confirm') ui.confirmBack = ui.modal || null;   // 무공 창 등 위에서 띄웠으면 닫은 뒤 그 창으로 돌아간다
  ui.confirm = { title, message, details, confirmText, cancelText };
  ui.modal = 'confirm'; renderModal();
}
/* 범용 행동 확인: 자원을 쓰거나 되돌릴 수 없는 행동 앞에서 무엇이 일어나는지 요약하고 동의를 받는다
   requestActionConfirm({ title, description, details: ['은자 -30냥', …], confirmText: '진행', onConfirm }) */
function requestActionConfirm({ title, description, details = [], confirmText = '진행', onConfirm }) {
  showConfirmModal({ title, message: description, details, confirmText, cancelText: '취소', onConfirm });
}
function confirmModal() {
  const c = ui.confirm || {};
  return `<div class="sheet confirm-sheet" role="alertdialog" aria-modal="true" aria-labelledby="confirmTitle">
    <h2 id="confirmTitle">${esc(c.title)}</h2>
    <p class="story">${c.message}</p>
    ${c.details && c.details.length ? `<ul class="confirm-details">${c.details.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}
    <div class="btns"><button class="btn primary" data-act="confirmok">${esc(c.confirmText)}</button><button class="btn ghost" data-act="closemodal">${esc(c.cancelText)}</button></div>
  </div>`;
}
function confirmAccept() { const cb = confirmCb; confirmCb = null; ui.modal = ui.confirmBack || null; ui.confirmBack = null; render(); if (cb) cb(); }
function confirmCancel() { confirmCb = null; ui.modal = ui.confirmBack || null; ui.confirmBack = null; render(); }

function renderModal() {
  const m = $('#modal');
  if (!ui.modal) { if (!m.dataset.intro) m.hidden = true; return; }
  m.hidden = false;
  if (ui.modal.startsWith('manual:')) setHTML(m, S.active[ui.modal.slice(7)] ? manualModal(ui.modal.slice(7)) : (ui.modal = null, ''));
  if (ui.modal && ui.modal.startsWith('mart:')) setHTML(m, martialModal(ui.modal.slice(5)));
  if (!ui.modal) { m.hidden = true; return; }
  if (ui.modal === 'confirm') setHTML(m, confirmModal());
  if (ui.modal.startsWith('mapgo:')) setHTML(m, mapGoModal(ui.modal.slice(6)));
  if (ui.modal.startsWith('equip:')) setHTML(m, equipModal(ui.modal.slice(6)));
  if (ui.modal === 'hopae') setHTML(m, hopaeModal());
  if (ui.modal.startsWith('bagitem:')) { const h = bagItemModal(ui.modal.slice(8)); if (!h) { ui.modal = null; m.hidden = true; return; } setHTML(m, h); }
  if (ui.modal.startsWith('artslot:')) setHTML(m, artSlotModal(ui.modal.slice(8)));
  if (ui.modal.startsWith('recipe:')) setHTML(m, recipeModal(ui.modal.slice(7)));
  if (ui.modal.startsWith('settle:')) { const h = settleModal(ui.modal.slice(7).split(',').map(Number)); if (!h) { ui.modal = null; m.hidden = true; return; } setHTML(m, h); }
  if (ui.modal.startsWith('replay:')) {
    const key = ui.modal.slice(7), box = $('#rpBox');
    if (!box || box.dataset.key !== key) {                   // 다른 이유로 다시 그려져도 재생 중인 관찰 창은 그대로 둔다
      const h = replayModal(key); if (!h) { ui.modal = null; m.hidden = true; return; }
      m.innerHTML = h;                                         // 관찰 창은 늘 새로 (무대·재생 상태를 처음부터)
      if (RP.playing) RP.timer = setTimeout(replayStep, 500);
    }
  }
  if (ui.modal === 'npc' && ui.npcTalk) {
    const W = { master: ['노벽송', '장문인', '松'], joun: ['조운', '대사형', '雲'], arin: ['아린', '사매', '璘'] }[ui.npcTalk.who] || ['', '', ''];
    const line = l => { const said = l.text.startsWith(W[0] + ':'); return `<p class="npc-line ${said ? 'said' : 'narr'} ${l.cls || ''}">${chronDecor(said ? l.text.slice(W[0].length + 1).trim() : l.text)}</p>`; };
    setHTML(m, `<div class="sheet npc-sheet" role="dialog" aria-modal="true" aria-label="${W[0]}와의 대화">
      <div class="npc-sheet-head">${portrait(ui.npcTalk.who, W[2], W[0])}<div><p class="eyebrow">對話 · 대화</p><h2>${label(W[0], W[1])}${ui.npcTalk.tag ? ` <small class="npc-mood">${ui.npcTalk.tag}</small>` : ''}</h2></div></div>
      <div class="npc-lines">${ui.npcTalk.lines.map(line).join('')}</div>
      <div class="btns">${ui.npcTalk.stages
        ? Array.from({ length: stageMax(ui.npcTalk.stages) }, (_, i) => `<button class="btn" data-subqstage="${ui.npcTalk.stages}:${i + 1}">${stageName(ui.npcTalk.stages, i + 1).replace(ZONES[ui.npcTalk.stages].name + ' ', '')} <small>${i + 1 >= STAGE.count ? '두목' : `${i + 1}단계`}</small></button>`).join('') + '<button class="btn ghost" data-act="subqask">← 다른 땅</button>'
        : ui.npcTalk.zones
        ? ZONE_ORDER.filter(zoneUnlocked).map(z => `<button class="btn" data-subqzone="${z}">${ZONES[z].name}</button>`).join('') + '<button class="btn ghost" data-act="closemodal">그만두기</button>'
        : ui.npcTalk.questView
        ? '<button class="btn primary" data-act="questaccept">수락</button><button class="btn ghost" data-act="closemodal">취소</button>'
        : ui.npcTalk.questOffer
        ? '<button class="btn primary" data-act="questshow">사명을 받는다</button><button class="btn ghost" data-act="closemodal">물러나기</button>'
        : ui.npcTalk.jounOffer
        ? `${subqReady() ? '<button class="btn primary" data-subq="1">토벌 임무 보고하기</button>' : ''}<button class="btn ${subqReady() ? '' : 'primary'}" data-act="subqask" ${subqLeft() ? '' : 'disabled'}>토벌 임무 받기 <small>(오늘 ${subqLeft()}/${SUBQ.daily})</small></button><button class="btn ghost" data-act="closemodal">물러나기</button>`
        : ui.npcTalk.offer
        ? `<button class="btn primary" data-act="arineat">죽 얻어먹기 <small>(${arinFree() ? '오늘 첫 죽 무료' : `은자 ${ARIN_CARE}냥`})</small></button><button class="btn ghost" data-act="arinno">다음에</button>`
        : '<button class="btn primary" data-act="closemodal">알겠습니다</button>'}</div></div>`);
  }
  if (ui.modal === 'rankup') { const R = warriorRank();   // 이류무사 승급: 24칸이 한 바퀴 켜지고 → 고리 폭발 → 번쩍 → 二流武士
    setHTML(m, `<div class="sheet rankup-sheet" role="dialog" aria-modal="true"><p class="eyebrow">武士 · 품계 승급</p><div class="rku-stage play"><img class="art" src="${ASSET.scene('rankup_2')}" alt=""><div class="rku"><img class="ring off" src="${ASSET.ui('rank_ring_off')}" alt=""><img class="ring on" src="${ASSET.ui('rank_ring_on')}" alt=""><i class="flash"></i><div class="title"><b>${R.hanja}</b><small>${R.name} · 전체 능력치 +${Math.round((R.mult - 1) * 100)}%</small></div></div></div>
      <div class="btns"><button class="btn primary" data-act="closemodal">받든다</button></div></div>`); }
  if (ui.modal === 'awaken' && ui.awaken) { const a = ui.awaken;
    setHTML(m, `<div class="sheet awaken-sheet" role="dialog" aria-modal="true"><p class="eyebrow">武神 · 무신의 응답</p><h2>석상이 눈을 떴습니다</h2>
      <div class="shrine-stage">${shrineArt(true)}</div>
      <p class="story">탁기 ${GACHA.awaken}개를 모두 삼킨 무신이 제자에게 권능의 한 조각을 내려 줍니다.</p>
      <ul class="awaken-list"><li>${itemIco(a.item.id)} 하사품 <b class="r1">${esc(a.item.name)}</b> <span class="pill grade-2">${a.item.grade}</span> <small class="muted">${count(a.item.id)} / ${STUDY.need}장 · 화로 › 연혼에서 엮음</small></li>${a.pill ? `<li>${itemIco(a.pill)} 덤 <b class="r2">${esc(ITEMS[a.pill].name)}</b></li>` : ''}</ul>
      <div class="btns"><button class="btn primary" data-act="closemodal">받든다</button></div></div>`); }
  if (ui.modal === 'ending') setHTML(m, `<div class="sheet ending"><p class="eyebrow">제1장 완결</p><h2>${label('청풍문 편', '淸風門')}</h2><p class="story">시골 하급 문파의 밑바닥 제자였던 ${esc(S.name)}. 청풍산의 산토끼를 쫓던 손이 이제 수룡방주를 꺾었습니다.</p><p class="story">장문인 노벽송이 건넨 누런 종이 한 장, <b>낙양성 하산령</b>. 산문 밖으로 난 길은 낙양으로 이어집니다.</p><p class="muted">제2장 [낙양성 편]은 준비 중입니다.</p><div><button class="btn primary" data-act="closemodal">산문을 바라본다</button></div></div>`);
  wireImages();
  if (ui.modal === 'reset') setHTML(m, `<div class="sheet"><h2>처음부터 다시</h2><p>${RESET_MSG}</p><div class="btns"><button class="btn danger" data-act="doreset">새로 시작</button><button class="btn ghost" data-act="closemodal">그만두기</button></div></div>`);
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
/* 시작 화면: 프롤로그(몰락한 청풍문의 새 제자) + 제자 만들기(이름 · 3대 스탯 · 입문 무공 · 보조 기예) */
const PROLOGUE = [
  '한때 강호에 이름을 떨쳤던 <b>청풍문</b>. 지금은 무너진 담장과 이끼 낀 <b>무신상(武神像)</b> 하나만 남은 하급 문파다.',
  '장문인은 늙었고, 사형들은 하나둘 산을 내려갔다. 사람들은 청풍문이 올겨울을 넘기지 못할 거라 수군댄다.',
  '그런데 오늘 아침, 봇짐 하나 멘 풋내기가 산문을 두드렸다. 무신상 앞에 무릎을 꿇은 그 아이의 눈빛만은 이상하리만치 맑았다.',
  '아무도 기억하지 않는 문파의 마지막 제자. 그 아이가 이제 강호를 걷는다.',
];
/* 서장은 한 단계씩 먹이 번지듯 드러난다: 서문 → [호패 만들기] 성명 → [확인] 능력치 → [이대로 정한다] 입문 무공 → 고르면 기예와 시작 단추.
   자동 검사(웹드라이버)에서는 한 번에 모두 펼친다 */
const INTRO_STEPS = 4;
const STARTER_LABEL = { fist: '권장법', sword: '검법', blade: '도법', spear: '창법', hidden: '암기술' };
function showIntro() {
  let chosen = 'sw1a', talent = 'forge', sealed = false, stampNow = false;   // sealed: 성명 [확인] → 강호견문록 낙관
  let stage = navigator.webdriver ? INTRO_STEPS : 0, fresh = 0;   // fresh: 방금 드러난 단계 (그 단계만 번지며 나타난다)
  let attr = rollAttr(), apt = rollApt();   // 후천 · 선천 모두 주사위 (합계는 늘 같다 · 다시 굴릴 수 있다)
  const m = $('#modal'); m.hidden = false; m.dataset.intro = '1';
  const step = (n, html) => stage >= n ? `<section class="intro-step ${fresh === n ? 'reveal' : ''}" data-step="${n}">${html}</section>` : '';
  // 입문 무공은 그 비급의 표지 그대로 (삼류: 회색 · 낡은 책)
  const starterIco = id => manualIco(id, 'starter-ico');
  const TALENT_ICO = { forge: ASSET.ui('c_hammer'), alchemy: ASSET.ui('c_cauldron') };
  const draw = () => {
    const name = $('#pname') ? $('#pname').value : '';
    m.innerHTML = `<div class="sheet intro stage-${stage}">
      <div class="intro-hero" aria-hidden="true"><img src="${ASSET.scene('banner')}" alt="" onerror="this.remove()"></div>
      <p class="eyebrow">江湖見聞錄 · 序章</p>
      <h1>강호견문록</h1>
      <div class="prologue ${stage === 0 && fresh === 0 ? 'reveal-lines' : ''}">${PROLOGUE.map((p, i) => `<p class="story" style="--i:${i}">${p}</p>`).join('')}</div>
      ${step(1, `<h3 class="intro-h">호패 만들기</h3>
      <div class="name-row ${sealed ? 'sealed' : ''}"><div class="name-box"><input id="pname" maxlength="20" placeholder="성명" value="${esc(name)}" autocomplete="off" aria-label="성명" ${sealed ? 'readonly title="눌러서 고치기"' : ''}><span class="name-ink" aria-hidden="true">${esc(name)}</span>${sealed ? `<img class="nakgwan name-seal ${stampNow ? 'stamp' : ''}" src="${ASSET.ui('nakgwan')}" alt="강호견문록 낙관">` : ''}</div>${sealed ? '' : '<button class="btn sm" data-namecheck>확인</button>'}</div>`)}
      ${step(2, `<p class="field-l">선천 <small class="muted">先天</small></p>
      <div class="attrs apts">${Object.entries(APTS).map(([k, A]) => `<div class="attr-row"><span class="attr-name">${label(A.name, A.hanja)}<small class="muted">${A.desc}</small></span><b class="attr-val">${apt[k]}</b></div>`).join('')}</div>
      <p class="field-l">후천 <small class="muted">後天</small></p>
      <div class="attrs">${Object.entries(ATTRS).map(([k, A]) => `<div class="attr-row" data-attrrow="${k}"><span class="attr-name">${label(A.name, A.hanja)}<small class="muted">${A.desc}</small></span><b class="attr-val">${attr[k]}</b></div>`).join('')}</div>
      <button class="btn sm" data-reroll>주사위 다시 굴리기</button>`)}
      ${step(3, `<p class="field-l">입문 무공 <small class="muted">입문 무공이 곧 첫 병기입니다</small></p>
      <div class="starters starter-books">${STARTERS.map(id => { const M = MANUALS[id]; return `<button class="starter ${chosen === id ? 'on' : ''}" data-starter="${id}">${starterIco(id)}<b>${STARTER_LABEL[M.weapon]}</b></button>`; }).join('')}</div>`)}
      ${step(4, `<p class="field-l">기예 <small class="muted">(技藝)</small></p>
      <div class="starters talents">${Object.entries(TALENTS).map(([k, T]) => `<button class="starter ${talent === k ? 'on' : ''}" data-talent="${k}"><span class="talent-ico" style="background-image:url('${TALENT_ICO[k]}')"></span><b>${T.name} <small>${T.hanja}</small></b><em class="talent-sub">${T.sub}</em></button>`).join('')}</div>
      <button class="btn primary big" id="begin">강호 출도</button>`)}
      ${stage === 0 ? `<button class="intro-next" data-intro-next>▼ 호패 만들기</button>` : stage === 2 ? `<button class="intro-next" data-intro-next>▼ 이대로 정한다</button>` : ''}
    </div>`;
    fresh = -1;
    { const ink = m.querySelector('.name-ink'), sl = m.querySelector('.name-seal'); if (ink && sl) sl.style.left = Math.max(0, ink.offsetWidth - 12) + 'px'; }   // 낙관: 성명 마지막 글자 오른쪽 위에 걸치게
    const nx = m.querySelector('[data-step="' + stage + '"]'); if (nx && stage > 0) nx.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };
  draw();
  m.onclick = e => {
    const s = e.target.closest('[data-starter]');
    if (s) { chosen = s.dataset.starter; if (stage === 3) { stage = 4; fresh = 4; } draw(); return; }   // 입문 무공을 고르면 기예가 드러난다
    const t = e.target.closest('[data-talent]');
    if (t) { talent = t.dataset.talent; draw(); return; }
    if (e.target.id === 'pname' && sealed) { sealed = false; draw(); const el = $('#pname'); if (el) el.focus(); return; }   // 찍은 이름을 누르면 다시 고친다
    if (e.target.closest('[data-namecheck]')) { const el = $('#pname'); if (el && [...el.value.trim()].length > 5) return toast('성명은 최대 5자까지만 가능합니다.'); if (el) el.value = el.value.trim() || '무명'; sealed = stampNow = true; if (stage < 2) { stage = 2; fresh = 2; } draw(); stampNow = false; return; }   // 낙관을 찍고 다음 단계로
    if (e.target.closest('[data-reroll]')) { attr = rollAttr(); apt = rollApt(); draw(); return; }
    if (e.target.closest('#begin')) {
      if ([...($('#pname').value || '').trim()].length > 5) return toast('성명은 최대 5자까지만 가능합니다.');
      if (!sealed && !navigator.webdriver) return toast('성명을 쓰고 [확인]을 눌러 호패에 새겨 주십시오.');   // 자동 검사는 서장을 한 번에 펼친다
      const name = ($('#pname').value || '').trim() || '무명';
      m.onclick = null; delete m.dataset.intro; m.hidden = true;
      startNewGame(name, chosen, { attr: { ...attr }, apt: { ...apt }, talent });
      goTab('sect', 'grounds');
      render();
      if (!reduceMotion()) replay(document.querySelector('.app'), 'app-reveal');   // 메인 화면이 먹 번지듯 서서히
      return;
    }
    // 다음 단계는 절차대로만 드러난다 (10월 3일 유저: 바깥을 잘못 눌러 넘어가지 않게) — 서문 [호패 만들기] → 성명 [확인] → 능력치 [이대로 정한다] → 입문 무공 고르기 → 기예 · [강호 출도]
    if ((stage === 0 || stage === 2) && e.target.closest('[data-intro-next]')) { stage++; fresh = stage; draw(); }
  };
}
