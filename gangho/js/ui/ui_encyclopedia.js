/* [화면] 도감: [ 몬스터 ] | [ 무공 ] | [ 단조 비법 ] | [ 단약 비법 ]
   만난 요수 · 익힌 무공 · 화로에서 한 번이라도 성공한 비법만 드러나고, 나머지는 ??? 로 남는다 */

const CODEX_TABS = [['monster', '몬스터', '妖獸'], ['martial', '무공', '武功'], ['forge', '단조 비법', '鍛造'], ['alchemy', '단약 비법', '丹藥']];

function viewCodex() {
  const tab = CODEX_TABS.some(([k]) => k === ui.codexTab) ? ui.codexTab : 'monster';
  const bar = `<div class="subtabs codex-tabs" role="tablist" aria-label="도감" style="--n:${CODEX_TABS.length}">${CODEX_TABS.map(([k, ko, hj]) =>
    `<button class="subtab ${tab === k ? 'on' : ''}" role="tab" aria-selected="${tab === k}" data-codextab="${k}">${label(ko, hj)}</button>`).join('')}</div>`;
  const body = tab === 'monster' ? codexMonsters() : tab === 'martial' ? codexMartial() : codexRecipes(tab);
  return `<section class="panel codex-panel">${head('도감', '圖鑑')}${bar}${body}</section>`;
}

/* 몬스터: 사냥터별. 만난 요수는 오행·병기·특성·만남/처치 */
function codexMonsters() {
  const bs = S.bestiary || {};
  const cols = ZONE_ORDER.map(z => {
    const Z = ZONES[z], list = [...Z.enemies, Z.boss];
    const rows = list.map(e => { const E = ENEMIES[e]; return bs[e]
      ? `<li><b>${E.name}</b>${E.boss ? ' <span class="pill warn">두목</span>' : ''}${elemTag(E.elem)}${weaponTag(E.wtype)}<small class="muted">만남 ${bs[e].met} · 처치 ${bs[e].kills}</small>${E.trait ? `<em class="trait">${E.trait}</em>` : ''}</li>`
      : '<li class="unknown">??? <small class="muted">만나 본 적 없음</small></li>'; }).join('');
    return `<article class="codex-col"><h3>${label(Z.name, Z.hanja)} <span class="num muted">${list.filter(e => bs[e]).length}/${list.length}</span></h3><p class="muted zone-terrain">지형 ${Z.terrain.map(terrainTag).join('')}</p><ul class="beasts">${rows}</ul></article>`;
  }).join('');
  return `<p class="muted">강호에서 마주친 상대만 적힙니다. 오행과 병기는 한 번 겨뤄 보면 드러납니다. 연무장 › 심상수련장에서 다시 불러낼 수 있습니다.</p><div class="codex">${cols}</div>`;
}

/* 무공: 분류별. 익힌 무공만 공개 */
function codexMartial() {
  const cols = CAT_ORDER.map(cat => {
    const all = Object.keys(MANUALS).filter(id => MANUALS[id].cat === cat);
    const rows = all.map(id => { const M = MANUALS[id], m = S.manuals[id]; return m
      ? `<li><button class="linkish" data-mart="${id}"><b>《${M.name}》</b></button>${manualAffTag(id)}${M.weapon ? weaponTag(M.weapon) : ''}<small class="muted">${M.grade} · ${m.star}성</small>${M.stances && M.weapon ? `<em class="trait">${M.stances.map(x => x.name).join(' · ')}</em>` : ''}</li>`
      : `<li class="unknown">??? <small class="muted">${M.grade}</small></li>`; }).join('');
    return `<article class="codex-col"><h3>${label(CATS[cat].name, CATS[cat].hanja)} <span class="num muted">${all.filter(id => S.manuals[id]).length}/${all.length}</span></h3><ul class="beasts">${rows}</ul></article>`;
  }).join('');
  return `<p class="muted">익힌 무공만 적힙니다. 비급은 무신상 공양과 금고의 비급 궤에서 얻습니다.</p><div class="codex">${cols}</div>`;
}

/* 단조·단약 비법: 발견한 비법은 필요 재료와 결과물을 모두 공개 */
function codexRecipes(craft) {
  const all = RECIPES.filter(r => r.craft === craft), C = CRAFTS[craft];
  const rows = all.map(r => {
    if (!S.codex.includes(r.id)) return '<li class="recipe-row unknown"><span class="r-out">???</span><span class="r-in muted">아직 찾아내지 못한 비법</span></li>';
    const G = recipeGear(r), I = !G && ITEMS[r.out];
    const eff = G ? Object.entries(G.stats).map(([k, v]) => `${STAT_NAMES[k]} +${v}${PCT_STATS.has(k) ? '%' : ''}`).join(' · ') : I.desc;
    const grade = G ? `[${RARITY[1].name}]` : I.grade ? `[${I.grade}]` : '';
    return `<li class="recipe-row"><button class="r-out linkish" data-recipe="${r.id}">${recipeIcon(r)} <b>${recipeName(r)}</b> <small class="muted">${grade}</small></button>
      <span class="r-in">${Object.entries(r.in).map(([id, n]) => `${ITEMS[id].icon} ${ITEMS[id].name} ×${n}`).join(' + ')}</span><small class="muted r-eff">${eff}</small></li>`;
  }).join('');
  return `<p class="muted">${C.name} 비법은 스스로 찾아내야 합니다. 화로에서 한 번이라도 성공한 비법만 필요 재료와 함께 적힙니다. <b>${all.filter(r => S.codex.includes(r.id)).length} / ${all.length}</b></p><ul class="recipes">${rows}</ul>`;
}
