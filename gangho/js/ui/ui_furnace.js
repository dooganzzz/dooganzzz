/* [화면] 청풍문 › 화로: [ 단조(鍛造) ] | [ 연단(煉丹) ] 두 탭. 재료를 슬롯에 올려 불을 지피고, 해 본 조합은 연구 노트에 남는다.
   단조는 대장간 풍경 한가운데(모루 위)에, 연단은 수묵 단로(丹爐) 몸통 위에 재료 칸이 놓인다.
   조합식은 모두 비공개. 성공하면 도감 › 단조/연단 비법에 영구 등재된다. 실패하면 재료가 전소되고 검게 탄 찌꺼기 1개 */

function furnaceTabs() {
  return `<div class="subtabs furnace-tabs" role="tablist" aria-label="화로" style="--n:${Object.keys(CRAFTS).length}">${Object.entries(CRAFTS).map(([k, c]) =>
    `<button class="subtab ${ui.craft === k ? 'on' : ''}" role="tab" aria-selected="${ui.craft === k}" data-craft="${k}">${label(c.name, c.hanja)}</button>`).join('')}</div>`;
}

function viewFurnace() {
  if (!CRAFTS[ui.craft]) ui.craft = 'forge';
  const C = CRAFTS[ui.craft], lv = S.crafts[ui.craft] || { lv: 1, xp: 0 };
  // 탭(기예)마다 그 기예의 조합식에 쓰이는 재료만 보인다
  const mats = getFilteredMaterials(ui.craft);
  const flat = Object.entries(ui.pot).filter(([, n]) => n > 0).flatMap(([id, n]) => Array(n).fill(id));
  const res = ui.craftResult;
  return `<section class="panel furnace">
    ${head('화로', '火爐', `<span class="num muted">${C.name} ${craftGrade(lv.lv)}${S.talent === ui.craft ? ' · 주력' : ''}</span>`)}
    ${furnaceTabs()}
    <p class="muted furnace-desc">${C.desc} 조합식은 알려져 있지 않습니다. 성공하면 도감에 적힙니다.</p>
    <div class="forge">
      <div class="pot furnace-stage ${ui.craft}">
        ${ui.craft === 'forge'
          ? `<div class="stage-bg">${artPic(ART_SRC.forgeScene(), '<svg viewBox="0 0 16 9"></svg>', 'scene-art')}</div>`
          : `<div class="stage-bg ink"></div><div class="cauldron-wrap">${artPic(ART_SRC.cauldron(), '<svg viewBox="0 0 10 10"></svg>', 'cauldron-art')}</div>`}
        <div class="stage-ui">
          ${ui.craft === 'forge' ? '' : furnaceFire(ui.craft)}
          <div class="pot-slots">${Array.from({ length: POT_MAX }, (_, i) => flat[i] ? `<button class="slot full" data-rem="${flat[i]}" title="${ITEMS[flat[i]].name} 빼기">${itemIco(flat[i])}<small>${ITEMS[flat[i]].name}</small></button>` : `<div class="slot">${i === 0 && !flat.length ? '<small class="slot-hint">재료</small>' : ''}</div>`).join('')}</div>
          <p class="story flame">${fireText(ui.craft)}</p>
          <div class="btns plaque-btns"><button class="btn plaque primary" data-act="craft" ${flat.length ? '' : 'disabled'}>${ui.craft === 'forge' ? '불 지펴 두드리기' : '단로에 불 넣기'}</button><button class="btn plaque" data-act="clearpot" ${flat.length ? '' : 'disabled'}>비우기</button></div>
        </div>
        ${(() => { const n = flat.length && craftNoteFor(ui.craft, ui.pot); return n ? `<p class="note-warn ${n.ok ? 'ok' : ''}">📓 연구 노트: 이미 해 본 조합입니다 — ${n.ok ? `성공 (${recipeName({ out: n.out })})` : n.near ? '실패했지만 불길이 크게 일렁였습니다' : '실패'}</p>` : ''; })()}
        ${res ? `<div class="result ${res.ok ? 'ok' : 'fail'}"><b class="${res.cls || ''}">${res.ok ? '성공' : '실패'} — ${res.text}</b>${res.first ? '<span class="new">도감 등재</span>' : ''}<small>${esc(res.sub || '')}</small></div>` : ''}
      </div>
      <div class="mats">
        <h4>재료</h4>
        ${mats.length ? `<div class="chips">${mats.map(id => { const left = count(id) - (ui.pot[id] || 0); return `<button class="chip" data-add="${id}" ${left <= 0 ? 'disabled' : ''} title="${esc(ITEMS[id].desc)}">${itemIco(id, 'sm')} ${ITEMS[id].name} <b>${left}</b></button>`; }).join('')}</div>` : `<p class="muted">${C.name}에 쓸 재료가 없습니다. 사냥터의 요수와 금고에서 모아 오십시오.</p>`}
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

