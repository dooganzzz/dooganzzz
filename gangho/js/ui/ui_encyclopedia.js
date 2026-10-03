/* [화면] 도감: [ 강적 ] | [ 비급 ] | [ 별호 ] | [ 단조 ] | [ 연단 ]
   만난 요수 · 독파한 비급(영구 보너스) · 화로에서 한 번이라도 성공한 비법만 적힌다. 총 몇 개인지, 못 찾은 것은 드러내지 않는다 */

const CODEX_TABS = [['monster', '강적', '强敵'], ['martial', '비급', '秘笈'], ['title', '별호', '別號'], ['forge', '단조', '鍛造'], ['alchemy', '연단', '煉丹']];

function viewCodex() {
  const tab = CODEX_TABS.some(([k]) => k === ui.codexTab) ? ui.codexTab : 'monster';
  const bar = `<div class="subtabs codex-tabs" role="tablist" aria-label="도감" style="--n:${CODEX_TABS.length}">${CODEX_TABS.map(([k, ko, hj]) =>
    `<button class="subtab ${tab === k ? 'on' : ''}" role="tab" aria-selected="${tab === k}" data-codextab="${k}">${label(ko, hj)}</button>`).join('')}</div>`;
  const body = tab === 'monster' ? codexMonsters() : tab === 'martial' ? codexMartial() : tab === 'title' ? codexTitles() : codexRecipes(tab);
  return `<section class="panel codex-panel">${head('도감', '圖鑑')}${bar}${body}</section>`;
}

/* 능력치 묶음 → "근력 +1 · 공격력 +3 · 회심 +0.5%" */
const bonusText = o => Object.entries(o || {}).filter(([, v]) => v).map(([k, v]) => `${STAT_NAMES[k] || k} +${Math.round(v * 10) / 10}${PCT_STATS.has(k) ? '%' : ''}`).join(' · ');

const CODEX_EMPTY = '<p class="story muted">아직 강호에서 견문을 넓히지 못했습니다.</p>';

/* 몬스터: 사냥터별 탭. 요수를 하나라도 만난 사냥터만 탭으로 띄우고, 만난 요수만 적는다 (총 몇 종인지·못 만난 요수는 드러내지 않는다).
   다 만나면 받은 영구 보너스를 [강적 영혼흡수 효과]로 적는다 */
function codexMonsters() {
  const bs = S.bestiary || {};
  const zones = ZONE_ORDER.filter(z => [...ZONES[z].enemies, ZONES[z].boss].some(e => bs[e]));
  const intro = '<p class="muted">강호에서 직접 마주친 상대만 기록됩니다. 오행과 병기는 겨뤄 본 자만이 알 수 있습니다.</p>';
  if (!zones.length) return intro + CODEX_EMPTY;
  const z = zones.includes(ui.codexZone) ? ui.codexZone : zones[0];
  const zbar = `<div class="subtabs codex-zones" role="tablist" aria-label="사냥터" style="--n:${zones.length}">${zones.map(k =>
    `<button class="subtab ${k === z ? 'on' : ''}" role="tab" aria-selected="${k === z}" data-codexzone="${k}">${label(ZONES[k].name, ZONES[k].hanja)}</button>`).join('')}</div>`;
  const Z = ZONES[z], met = [...Z.enemies, Z.boss].filter(e => bs[e]);
  const done = (S.codexRewards || {})[z], R = CODEX_REWARDS[z];
  const rows = met.map(e => { const E = ENEMIES[e];
    return `<li>${beastArt(e, 'mini')}<b>${E.name}</b>${E.boss ? ' <span class="pill warn">두목</span>' : ''}${elemTag(E.elem)}${weaponTag(E.wtype)}<small class="muted">만남 ${bs[e].met} · 처치 ${bs[e].kills}</small>${E.trait ? `<em class="trait">${E.trait}</em>` : ''}</li>`; }).join('');
  return `${intro}${zbar}<div class="codex"><article class="codex-col">
    ${done ? `<p class="codex-bonus"><b class="cb-label">강적 영혼흡수 효과</b>${R.text}</p>` : ''}<p class="muted zone-terrain">지형 ${Z.terrain.map(terrainTag).join('')}</p><ul class="beasts">${rows}</ul></article></div>`;
}

/* 비급: 분류별 탭. 독파한 비급이 있는 분류만 탭으로 띄운다. 비급마다 몸에 새겨진 영구 보너스(장착 여부 무관)와 그 합계 */
function codexMartial() {
  const cats = CAT_ORDER.filter(cat => Object.keys(MANUALS).some(id => MANUALS[id].cat === cat && S.manuals[id]));
  const P = manualPassive(), sum = bonusText({ ...P.attr, ...P.stats });
  const intro = `<p class="muted">독파하여 깨우친 비급의 비결이 온전히 기록되며, 몸에 영구히 각인됩니다.</p>${sum ? `<p class="passive-sum">몸에 새겨진 각인의 효과: <b>${sum}</b></p>` : ''}`;
  if (!cats.length) return intro + CODEX_EMPTY;
  const cat = cats.includes(ui.codexCat) ? ui.codexCat : cats[0];
  const cbar = `<div class="subtabs codex-zones" role="tablist" aria-label="비급 분류" style="--n:${cats.length}">${cats.map(k =>
    `<button class="subtab ${k === cat ? 'on' : ''}" role="tab" aria-selected="${k === cat}" data-codexcat="${k}">${label(CATS[k].name, CATS[k].hanja)}</button>`).join('')}</div>`;
  const got = Object.keys(MANUALS).filter(id => MANUALS[id].cat === cat && S.manuals[id]);
  const rows = got.map(id => { const M = MANUALS[id], m = S.manuals[id];
    return `<li>${manualIco(id, 'mini')}<button class="linkish" data-mart="${id}"><b>《${M.name}》</b></button>${manualAffTag(id)}${M.weapon ? weaponTag(M.weapon) : ''}<small class="muted">${M.grade} · ${m.star}성</small>${M.passiveBonus ? `<small class="passive">각인 ${bonusText(M.passiveBonus)}</small>` : ''}${M.stances && M.weapon ? `<em class="trait">${M.stances.map(x => x.name).join(' · ')}</em>` : ''}</li>`; }).join('');
  return `${intro}${cbar}<div class="codex"><article class="codex-col"><ul class="beasts">${rows}</ul></article></div>`;
}

/* 단조·연단 비법: 화로에서 한 번이라도 성공한 비법만. 필요 재료와 결과물을 모두 공개 */
function codexRecipes(craft) {
  const found = RECIPES.filter(r => r.craft === craft && S.codex.includes(r.id));
  const rows = found.map(r => {
    const G = recipeGear(r), I = !G && ITEMS[r.out];
    const eff = G ? Object.entries(G.stats).map(([k, v]) => `${STAT_NAMES[k]} +${v}${PCT_STATS.has(k) ? '%' : ''}`).join(' · ') : I.desc;
    const grade = G ? `[${G.rank || RARITY[G.rarity || 1].name}]` : I.grade ? `[${I.grade}]` : '';
    return `<li class="recipe-row"><button class="r-out linkish" data-recipe="${r.id}">${recipeIcon(r)} <b>${recipeName(r)}</b> <small class="muted">${grade}</small></button>
      <span class="r-in">${Object.entries(r.in).map(([id, n]) => `${itemIco(id, 'sm')} ${ITEMS[id].name} ×${n}`).join(' + ')}</span><small class="muted r-eff">${eff}</small></li>`;
  }).join('');
  return `<p class="muted">화로를 통해 스스로 깨우친 제조 비법만 기록됩니다.</p>${rows ? `<ul class="recipes">${rows}</ul>` : CODEX_EMPTY}`;
}

/* 별호: 입수 난이도(최하 · 하 · 중 · 상 · 최상)별로 전시. 얻은 별호는 [호패에 새기기], 아직이면 조건과 진행. 중 이상은 이름만 (2장 이후) */
function codexTitles() {
  const own = S.titles || {};
  const card = id => {
    const T = TITLES[id], has = !!own[id], worn = S.title === id;
    if (T.sealed) return `<div class="title-card sealed ${T.school ? 's-' + T.school : ''}"><b class="tc-name">${T.name}<small>${T.hanja}</small></b>${T.school ? schoolBadge(T.school) : ''}<small class="muted">2장 이후에 열립니다</small></div>`;
    const p = titleProgress(id);
    return `<div class="title-card ${has ? 'own' : ''} ${worn ? 'worn' : ''} ${T.school ? 's-' + T.school : ''}">
      <b class="tc-name">${T.name}<small>${T.hanja}</small></b>${T.school ? schoolBadge(T.school) : ''}
      ${T.desc ? `<small class="tc-desc">${T.desc}</small>` : ''}<small class="tc-cond">${T.text}${has ? '' : ` <span class="num">(${fmt(p.cur)} / ${fmt(p.need)})</span>`}</small>
      <div class="tc-bonus"><span>착용</span>${bonusText(T.wear)}</div><div class="tc-bonus"><span>습득</span>${bonusText(T.gain)}</div>
      ${has ? (worn ? '<span class="tc-worn">호패에 새김</span>' : `<button class="btn sm" data-titleuse="${id}">호패에 새기기</button>`) : '<span class="muted tc-lock">아직</span>'}
    </div>`;
  };
  // 얻은 별호만 보인다 (못 얻은 것 · 봉인된 것은 숨김, 10월 3일 유저)
  return TITLE_TIERS.map((R, t) => { const ids = Object.keys(TITLES).filter(id => TITLES[id].tier === t && own[id]); return ids.length ? `<h4 class="title-tier ${R.cls}">${R.name} <small>${R.hanja}</small></h4><div class="title-grid">${ids.map(card).join('')}</div>` : ''; }).join('');
}
const schoolBadge = k => `<span class="school-tag s-${k}">${SCHOOLS[k].hanja}</span>`;
