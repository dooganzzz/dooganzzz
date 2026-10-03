/* [화면] 청풍문 › 화로: [ 단조(鍛造) ] | [ 연단(煉丹) ] 두 탭. 재료를 슬롯에 올려 불을 지피고, 해 본 조합은 연구 노트에 남는다.
   단조는 대장간 풍경 한가운데(모루 위)에, 연단은 수묵 단로(丹爐) 몸통 위에 재료 칸이 놓인다.
   조합식은 모두 비공개. 성공하면 도감 › 단조/연단 비법에 영구 등재된다. 실패하면 재료가 전소되고 검게 탄 찌꺼기 1개 */

function furnaceTabs() {
  const tabs = [...Object.entries(CRAFTS).map(([k, c]) => [k, c.name, c.hanja]), ['study', '연혼', '煉魂']];   // 연혼: 찢어진 비급 조각을 명경이 끌어온 넋으로 엮는다
  return `<div class="subtabs furnace-tabs" role="tablist" aria-label="화로" style="--n:${tabs.length}">${tabs.map(([k, ko, hj]) =>
    `<button class="subtab ${ui.craft === k ? 'on' : ''}" role="tab" aria-selected="${ui.craft === k}" data-craft="${k}">${label(ko, hj)}</button>`).join('')}</div>`;
}

/* 화로 › 연혼(煉魂): 장면 그림 한 장. 가운데 명경 속 초절정 비급이 흐릿하게 깜박인다(같은 그림의 거울 안쪽을 잘라 그 자리에서만).
   명경을 누르면 엮을 수 있는 조각 창이 뜬다 (같은 등급 조각 STUDY.need장이 다 모여야 엮임 · 등급끼리 섞이지 않음) */
function viewStudy() {
  const yi = ui.yhIn, need = STUDY.need, full = !!yi && yi.n >= need;
  const chips = Object.entries(STUDY.scraps).filter(([id]) => has(id)).map(([id]) => `<button class="chip ${yi && yi.id === id ? 'on' : ''}" data-yhpick="${id}" style="--gc:${STUDY.color[id]}" title="${esc(ITEMS[id].desc)}">${itemIco(id, 'sm')} ${ITEMS[id].name} <small class="muted">${count(id) - (yi && yi.id === id ? yi.n : 0)}</small></button>`).join('');
  return `<section class="panel furnace study">
    ${head('화로', '火爐')}
    ${furnaceTabs()}
    <p class="muted furnace-desc">연혼각(煉魂閣). 무신상이 내린 찢어진 비급 조각을 명경(明鏡)이 끌어온 넋으로 다시 잇는 곳입니다.</p>
    <div class="forge">
      <div class="forge-left">
        <div class="pot furnace-stage study ${full ? 'yh-ready' : ''}"><div class="stage-bg">${artPic(ART_SRC.yeonhonScene(), '<svg viewBox="0 0 16 9"></svg>', 'scene-art')}</div>
          <img class="yh-book" src="${ART_SRC.yeonhonBook()}" alt="" aria-hidden="true">${yhScraps(yi)}
          <button class="yh-burner" data-act="yeonhon" ${full ? '' : 'disabled'} aria-label="단로 — 연혼 주입" title="${full ? '단로를 눌러 넋을 불어넣습니다' : `팔괘 거울 여덟 자리에 같은 등급 조각을 모두 채우면 단로에 불이 듭니다`}"></button></div>
      </div>
      <div class="mats">
        <h4>조각 재료</h4>
        ${chips ? `<div class="chips">${chips}</div>` : '<p class="muted">가진 조각이 없습니다.</p>'}
      </div>
    </div>
  </section>`;
}
/* 팔괘 거울 자리(YH_MIRRORS)에 넣은 조각 — 한 장씩 (최대 STUDY.need장). 누르면 한 장 뺀다. 칸 테두리 · 배경 없이 조각 그림만 */
function yhScraps(yi) {
  if (!yi) return '';
  return YH_MIRRORS.slice(0, yi.n).map(([x, y]) => `<button class="yh-scrap" data-yhout="1" style="left:${x}%;top:${y}%" title="${ITEMS[yi.id].name} 빼기"><img src="${ITEM_ART(yi.id)}" alt=""></button>`).join('');
}
/* 엮기 연출: 여덟 거울(자리 %) → 넋이 명경(50%, 35.2%)으로 모임 → 비급이 또렷해지며 번쩍. 끝나면 resolve */
const YH_MIRRORS = [[50, 8.4], [60.93, 18], [64.65, 34.4], [60.5, 51.6], [50, 57.1], [39.3, 51.8], [35.35, 34.4], [39.07, 18.2]];   // 작은 거울 여덟의 한가운데 (그림에서 잰 값, 10월 3일)
function studyBindFx(stage, scrap, id) {
  if (!stage || reduceMotion()) return Promise.resolve();
  const fx = document.createElement('div'); fx.className = 'yh-fx';
  stage.style.setProperty('--gc', STUDY.color[scrap]); stage.style.setProperty('--gtint', STUDY.tint[scrap]);
  // 깨진 명경 조각: 같은 그림의 명경 안쪽을 삼각형으로 잘라 바깥으로 흩뿌린다
  const SH = [[0, 0, 50, 0, 50, 50], [50, 0, 100, 0, 50, 50], [100, 0, 100, 50, 50, 50], [100, 50, 100, 100, 50, 50], [100, 100, 50, 100, 50, 50], [50, 100, 0, 100, 50, 50], [0, 100, 0, 50, 50, 50], [0, 50, 0, 0, 50, 50]];
  const shards = SH.map((p, i) => { const a = (i + .5) / SH.length * Math.PI * 2;
    return `<i class="shard" style="clip-path:polygon(${p[0]}% ${p[1]}%,${p[2]}% ${p[3]}%,${p[4]}% ${p[5]}%);--dx:${(Math.sin(a) * 120).toFixed(0)}%;--dy:${(-Math.cos(a) * 120).toFixed(0)}%;--rot:${(i % 2 ? 1 : -1) * (25 + i * 7)}deg"></i>`; }).join('');
  fx.innerHTML = YH_MIRRORS.map(([x, y], i) => `<i class="glow" style="left:${x}%;top:${y}%;animation-delay:${i * .05}s"></i><i class="soul" style="--x0:${x}%;--y0:${y}%;left:${x}%;top:${y}%;animation-delay:${.45 + i * .04}s"></i>`).join('')
    + `<i class="core"></i><img class="crack" src="${ART_SRC.yeonhonCrack()}" alt=""><div class="shards" style="--bg:url('${ART_SRC.yeonhonCrack()}')">${shards}</div>`
    + (id ? `<div class="burst">${manualIco(id, 'burst-book')}</div>` : '');
  stage.appendChild(fx); stage.classList.add('binding');
  // 효과음 자리 (지금은 소리 없음 — 나중에 Bus.on('sfx')로 받아 재생): 금 가는 순간 · 깨져 비급이 튀어나오는 순간
  const sfx = [setTimeout(() => Bus.emit('sfx', 'mirror_crack'), 2000), setTimeout(() => Bus.emit('sfx', 'mirror_break'), 2500)];
  return new Promise(done => setTimeout(() => { sfx.forEach(clearTimeout); fx.remove(); stage.classList.remove('binding'); done(); }, 3900));
}
/* 단조의 장비 재료: 같은 장비 강화. 본템을 고르면 행낭의 같은 이름 · 같은 등급 · 강화 안 된 장비를 재료로 쓴다 */
/* 강화 연출 (모루 무대): 망치 세 번 → 불똥 → 결과(성공 금빛 고리 · 그대로 연기 · 파괴 파편). 화면이 다시 그려져도 처음부터 되풀이되지 않게
   지난 시간만큼 애니메이션을 당겨(--el) 이어서 재생한다. 5초가 지나면 연출 없이 멈춘 모루만 */
const ENH_FX_MS = 5000, ENH_HIT = [234, 598, 1014];
const enhSparks = (n, dist, cls = '') => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2 + (i % 2) * .3, d = dist * (.6 + (i % 3) * .2); return `<i class="enh-spark ${cls}" style="--dx:${Math.round(Math.cos(a) * d)}px;--dy:${Math.round(Math.sin(a) * d * .7 - 8)}px"></i>`; }).join('');
function enhStage(main, res) {
  const t = res && res.at ? Date.now() - res.at : Infinity, live = t < ENH_FX_MS;
  if (!live && !main) return '';
  const ico = live ? res.ico : gearIco(main, 'enh-ico');
  if (!live) return `<div class="enh-stage"><div class="enh-anvil"></div><div class="enh-piece">${ico}</div></div>`;
  const k = res.kind, shards = k === 'boom' ? ['a', 'b', 'c', 'd'].map(q => `<div class="enh-shard q${q}">${ico}</div>`).join('') : '';
  const tag = k === 'ok' ? `+${res.enh}` : k === 'boom' ? '破' : '변화 없음';
  return `<div class="enh-stage fx-${k}" style="--el:${-t}ms" aria-hidden="true">
    <div class="enh-anvil"></div><div class="enh-piece">${ico}</div>${shards}
    ${ENH_HIT.map((d, i) => `<div class="enh-burst" style="--d:${d}ms">${enhSparks(8 + i * 2, 34 + i * 8)}</div>`).join('')}
    ${k === 'ok' ? `<div class="enh-ring"></div><div class="enh-burst" style="--d:1300ms">${enhSparks(14, 70, 'gold')}</div>` : ''}
    ${k === 'same' ? '<i class="enh-smoke s1"></i><i class="enh-smoke s2"></i><i class="enh-smoke s3"></i>' : ''}
    ${k === 'boom' ? '<div class="enh-flash"></div>' : ''}
    <svg class="enh-hammer" viewBox="0 0 110 44"><rect x="30" y="18" width="80" height="8" rx="3" fill="#6b4a2b"/><rect x="0" y="3" width="36" height="38" rx="3" fill="#3b3e45"/><rect x="2" y="5" width="32" height="7" rx="2" fill="#7c828c"/><rect x="0" y="34" width="36" height="7" rx="2" fill="#24262b"/></svg>
    <b class="enh-tag">${tag}</b>
  </div>`;
}
/* 단조의 장비 재료: 같은 장비 둘을 솥 칸에 올려 두드린다 (먼저 올린 것이 본템, 둘째가 재료). ui.potGear = [본템 uid, 재료 uid] */
const forgeGearList = () => gearSort([...Object.values(S.equip).filter(Boolean), ...S.gear].filter(it => !it.shop && !ui.potGear.includes(it.uid)));
function forgeGearInfo() {
  const main = ui.potGear[0] != null && gearByUid(ui.potGear[0]), res = ui.enhResult;
  let panel = '';
  if (main) {
    const r = enhRule(main), max = (main.enh || 0) >= ENH_MAX, cost = enhCost(main), next = { ...main, enh: (main.enh || 0) + 1 }, mat = ui.potGear[1] != null && gearByUid(ui.potGear[1]);
    panel = `<div class="enh-panel">
      <div class="enh-row"><span class="enh-lab">본템</span><b class="r${main.rarity}">${esc(gearName(main))}</b> <span class="pill">${RARITY[main.rarity].name}</span></div>
      <div class="enh-row"><span class="enh-lab">재료</span>${mat ? `<b>${esc(mat.name)}</b> <small class="muted">(부서져 본템에 흡수됩니다)</small>` : '<span class="warn">같은 장비(강화 안 된 것)를 하나 더 올리십시오</span>'}</div>
      ${max ? '<p class="muted">+10 — 더 이상 벼릴 수 없습니다.</p>' : `
      <div class="enh-row"><span class="enh-lab">능력치</span><small>${statLine(main)}</small></div>
      <div class="enh-row"><span class="enh-lab">+${next.enh} 되면</span><small class="good">${statLine(next)}</small></div>
      <div class="enh-row"><span class="enh-lab">성패</span><span>성공 <b class="good">${r.ok}%</b> · 그대로 <b>${100 - r.ok - r.boom}%</b>${r.boom ? ` · 파괴 <b class="warn">${r.boom}%</b>` : ''}</span></div>
      <div class="enh-row"><span class="enh-lab">은자</span><span>${hlSilver(cost)}</span></div>`}
    </div>`;
  }
  return `<div class="forge-gear">
    ${enhStage(main, res)}
    ${res ? `<div class="result enh-late ${res.kind === 'ok' ? 'ok' : 'fail'}" style="--el:${res.at ? Math.max(-ENH_FX_MS, res.at - Date.now()) : -ENH_FX_MS}ms"><b>${res.kind === 'ok' ? `강화 성공 — ${esc(res.name)}` : res.kind === 'boom' ? `${uiIco('c_forgefail', 'vit-ico')} 강화 실패 — 장비가 부서졌습니다` : '아무 일도 일어나지 않았습니다 (재료만 흡수)'}</b></div>` : ''}
    ${panel}
  </div>`;
}
/* 화로 칸: 행낭과 같은 수묵 네모칸 여덟 — 모루 · 단로 왼쪽 2×2, 오른쪽 2×2. 재료 한 개에 한 칸(누르면 뺌), 강화할 장비도 한 칸씩.
   [두드리기] · [내력주입] 버튼 대신 모루 · 단로를 누른다 (마우스를 올리면 환해짐, 재료가 없으면 꺼져 있음) */
function potCells(flat) {
  const kinds = [...flat.map(id => ({ id })), ...ui.potGear.map(uid => ({ g: gearByUid(uid) })).filter(k => k.g)];   // 재료 한 개에 한 칸 (POT_MAX = 8)
  const cell = i => { const k = kinds[i];
    if (k && k.id) return `<button class="fslot full" data-rem="${k.id}" title="${ITEMS[k.id].name} 빼기">${inkFrame()}${itemIco(k.id)}</button>`;
    if (k && k.g) return `<button class="fslot full gear r${k.g.rarity}" data-grem="${k.g.uid}" title="${esc(gearName(k.g))} 빼기">${inkFrame()}${gearIco(k.g, 'sm')}</button>`;
    return `<div class="fslot">${inkFrame()}<span class="slot-plus" aria-hidden="true">+</span></div>`; };   // 빈 칸: 금빛 +
  const ready = flat.length || ui.potGear.length, forge = ui.craft === 'forge';
  return `<div class="pot-side left">${[0, 1, 2, 3].map(cell).join('')}</div><div class="pot-side right">${[4, 5, 6, 7].map(cell).join('')}</div>
          <button class="pot-hot ${ui.craft}" data-act="craft" ${ready ? '' : 'disabled'} aria-label="${forge ? '모루 — 두드려 벼리기' : '단로 — 내력 주입'}" title="${ready ? (forge ? '모루를 눌러 두드립니다' : '단로를 눌러 내력을 불어넣습니다') : '재료를 먼저 칸에 올리십시오'}"></button>`;
}
function viewFurnace() {
  if (ui.craft === 'study') return viewStudy();
  if (!CRAFTS[ui.craft]) ui.craft = 'forge';
  const C = CRAFTS[ui.craft], lv = S.crafts[ui.craft] || { lv: 1, xp: 0 };
  // 탭(기예)마다 그 기예의 조합식에 쓰이는 재료만 보인다
  const mats = getFilteredMaterials(ui.craft);
  const flat = Object.entries(ui.pot).filter(([, n]) => n > 0).flatMap(([id, n]) => Array(n).fill(id));
  const res = ui.craftResult;
  return `<section class="panel furnace">
    ${head('화로', '火爐')}
    ${furnaceTabs()}
    <p class="muted furnace-desc">${C.desc}</p>
    <div class="forge">
      <div class="forge-left">
      <div class="pot furnace-stage ${ui.craft}">
        ${ui.craft === 'forge'
          ? `<div class="stage-bg">${artPic(ART_SRC.forgeScene(), '<svg viewBox="0 0 16 9"></svg>', 'scene-art')}</div>`
          : `<div class="stage-bg">${artPic(ART_SRC.alchemyScene(), '<svg viewBox="0 0 16 9"></svg>', 'scene-art')}</div>`}
        <div class="stage-ui">
          ${potCells(flat)}
        </div>
        ${(() => { const n = flat.length && craftNoteFor(ui.craft, ui.pot); return n ? `<p class="note-warn ${n.ok ? 'ok' : ''}">${uiIco('c_notes', 'vit-ico')} 연구 노트: 이미 해 본 조합입니다 — ${n.ok ? `성공 (${recipeName({ out: n.out })})` : n.near ? '실패했지만 불길이 크게 일렁였습니다' : '실패'}</p>` : ''; })()}
        ${res ? `<div class="result ${res.ok ? 'ok' : 'fail'}"><b class="${res.cls || ''}">${res.ok ? '성공' : '실패'} — ${chronDecor(res.text)}</b>${res.first ? '<span class="new">도감 등재</span>' : ''}<small>${esc(res.sub || '')}</small></div>` : ''}
      </div>
      ${ui.craft === 'forge' ? forgeGearInfo() : ''}
      </div>
      <div class="mats">
        <h4>${ui.craft === 'forge' ? '조합 가능 재료' : '재료'}</h4>
        ${mats.length ? `<div class="chips ${ui.craft === 'forge' ? 'forge-grid' : ''}">${mats.map(id => { const left = count(id) - (ui.pot[id] || 0); return `<button class="chip" data-add="${id}" ${left <= 0 ? 'disabled' : ''} title="${esc(ITEMS[id].desc)}">${itemIco(id, 'sm')} ${ITEMS[id].name} <b>${left}</b></button>`; }).join('')}</div>` : `<p class="muted">${C.name}에 쓸 재료가 없습니다. 사냥터의 요수와 금고에서 모아 오십시오.</p>`}
      ${ui.craft === 'forge' ? `<h4>장비 강화 재료</h4>
        <div class="chips forge-grid forge-gear">${forgeGearList().map(g => `<button class="chip gear r${g.rarity}" data-gadd="${g.uid}" title="${esc(gearName(g))}">${gearIco(g, 'sm')}<span class="fg-name">${esc(gearName(g))}</span>${Object.values(S.equip).includes(g) ? '<small class="fg-worn">착용</small>' : ''}</button>`).join('') || '<p class="muted">장비가 없습니다.</p>'}</div>` : ''}
      </div>
    </div>
  </section>
  ${researchNotes(ui.craft)}`;
}

/* 화로 연구 노트: 이 기예로 해 본 조합(최근 순). 성공/실패와 '조합은 맞았던 것 같은' 실패만 알려 준다 */
function researchNotes(craft) {
  const notes = (S.craftNotes || []).filter(n => n.craft === craft).slice().reverse();
  const row = n => `<li class="${n.ok ? 'ok' : n.near ? 'near' : 'fail'}"><span class="note-mats">${Object.entries(n.mats).map(([id, k]) => `${itemIco(id, 'sm')}${ITEMS[id].name}${k > 1 ? `×${k}` : ''}`).join(' + ')}</span><b>${n.ok ? `성공 → ${recipeName({ out: n.out })}` : n.near ? '실패 · 불길이 크게 일렁임' : '실패'}</b></li>`;
  return `<section class="panel">${head('연구 노트', '硏究', `<span class="num muted">${notes.length}건</span>`)}
    ${notes.length ? `<ol class="notes">${notes.map(row).join('')}</ol>` : '<p class="story muted">아직 해 본 조합이 없습니다. 재료를 넣고 불을 지펴 보십시오. 해 본 조합과 결과가 여기에 남습니다.</p>'}
  </section>`;
}

