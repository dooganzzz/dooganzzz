/* [화면] 도감: [ 강적 ] | [ 비급 ] | [ 단조 비법 ] | [ 연단 비법 ]
   만난 요수 · 독파한 비급(영구 보너스) · 화로에서 한 번이라도 성공한 비법만 적힌다. 총 몇 개인지, 못 찾은 것은 드러내지 않는다 */

const CODEX_TABS = [['monster', '강적', '强敵'], ['martial', '비급', '秘笈'], ['forge', '단조 비법', '鍛造'], ['alchemy', '연단 비법', '煉丹']];

function viewCodex() {
  const tab = CODEX_TABS.some(([k]) => k === ui.codexTab) ? ui.codexTab : 'monster';
  const bar = `<div class="subtabs codex-tabs" role="tablist" aria-label="도감" style="--n:${CODEX_TABS.length}">${CODEX_TABS.map(([k, ko, hj]) =>
    `<button class="subtab ${tab === k ? 'on' : ''}" role="tab" aria-selected="${tab === k}" data-codextab="${k}">${label(ko, hj)}</button>`).join('')}</div>`;
  const body = tab === 'monster' ? codexMonsters() : tab === 'martial' ? codexMartial() : codexRecipes(tab);
  return `<section class="panel codex-panel">${head('도감', '圖鑑')}${bar}${body}</section>`;
}

/* 능력치 묶음 → "근력 +1 · 공격력 +3 · 치명타율 +0.5%" */
const bonusText = o => Object.entries(o || {}).filter(([, v]) => v).map(([k, v]) => `${STAT_NAMES[k] || k} +${Math.round(v * 10) / 10}${PCT_STATS.has(k) ? '%' : ''}`).join(' · ');

const CODEX_EMPTY = '<p class="story muted">아직 강호에서 견문을 넓히지 못했습니다.</p>';

/* 몬스터: 사냥터별. 만난 요수만 적는다 (총 몇 종인지·못 만난 요수는 드러내지 않는다). 다 만나면 [도감 완성] */
function codexMonsters() {
  const bs = S.bestiary || {};
  const cols = ZONE_ORDER.map(z => {
    const Z = ZONES[z], met = [...Z.enemies, Z.boss].filter(e => bs[e]);
    if (!met.length) return '';
    const done = (S.codexRewards || {})[z], R = CODEX_REWARDS[z];
    const rows = met.map(e => { const E = ENEMIES[e];
      return `<li>${beastArt(e, 'mini')}<b>${E.name}</b>${E.boss ? ' <span class="pill warn">두목</span>' : ''}${elemTag(E.elem)}${weaponTag(E.wtype)}<small class="muted">만남 ${bs[e].met} · 처치 ${bs[e].kills}</small>${E.trait ? `<em class="trait">${E.trait}</em>` : ''}</li>`; }).join('');
    return `<article class="codex-col ${done ? 'complete' : ''}"><h3>${label(Z.name, Z.hanja)}${done ? ' <span class="pill codex-done">도감 완성</span>' : ''}</h3>
      ${done ? `<p class="codex-bonus">✦ ${R.text}</p>` : ''}<p class="muted zone-terrain">지형 ${Z.terrain.map(terrainTag).join('')}</p><ul class="beasts">${rows}</ul></article>`;
  }).join('');
  return `<p class="muted">강호에서 직접 마주친 상대만 기록됩니다. 오행과 병기는 겨뤄 본 자만이 알 수 있습니다.</p>${cols ? `<div class="codex">${cols}</div>` : CODEX_EMPTY}`;
}

/* 비급: 분류별. 독파한 비급만. 비급마다 몸에 새겨진 영구 보너스(장착 여부 무관)와 그 합계 */
function codexMartial() {
  const cols = CAT_ORDER.map(cat => {
    const got = Object.keys(MANUALS).filter(id => MANUALS[id].cat === cat && S.manuals[id]);
    if (!got.length) return '';
    const rows = got.map(id => { const M = MANUALS[id], m = S.manuals[id];
      return `<li>${manualIco(id, 'mini')}<button class="linkish" data-mart="${id}"><b>《${M.name}》</b></button>${manualAffTag(id)}${M.weapon ? weaponTag(M.weapon) : ''}<small class="muted">${M.grade} · ${m.star}성</small>${M.passiveBonus ? `<small class="passive">각인 ${bonusText(M.passiveBonus)}</small>` : ''}${M.stances && M.weapon ? `<em class="trait">${M.stances.map(x => x.name).join(' · ')}</em>` : ''}</li>`; }).join('');
    return `<article class="codex-col"><h3>${label(CATS[cat].name, CATS[cat].hanja)}</h3><ul class="beasts">${rows}</ul></article>`;
  }).join('');
  const P = manualPassive(), sum = bonusText({ ...P.attr, ...P.stats });
  return `<p class="muted">독파하여 깨우친 비급의 비결이 온전히 기록되며, 몸에 영구히 각인됩니다.</p>${sum ? `<p class="passive-sum">몸에 새겨진 각인 합계: <b>${sum}</b></p>` : ''}${cols ? `<div class="codex">${cols}</div>` : CODEX_EMPTY}`;
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
