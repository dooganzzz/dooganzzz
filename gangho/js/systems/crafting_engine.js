/* [시스템] 화로 제작 엔진: 단조(장비) · 연단(단약) 이원화, 비밀 조합식(성공 시 도감 등재), 연구 노트, 무신상 공양(가챠) (DOM 조작 금지) */

/* ───────── 기예 ───────── */
function potKey(pot) { return Object.entries(pot).filter(([, v]) => v > 0).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}*${v}`).join('|'); }
const RECIPE_BY_KEY = {};
for (const r of RECIPES) RECIPE_BY_KEY[r.craft + ':' + potKey(r.in)] = r;

/* 기예별 유효 재료: 그 기예의 조합식에 한 번이라도 쓰이는 재료 id 집합 (조합식에 없는 재료는 어느 탭에도 뜨지 않는다) */
const CRAFT_MATS = {};
for (const r of RECIPES) for (const id of Object.keys(r.in)) (CRAFT_MATS[r.craft] = CRAFT_MATS[r.craft] || new Set()).add(id);
const getValidForgeMaterials = () => CRAFT_MATS.forge || new Set();
const getValidAlchemyMaterials = () => CRAFT_MATS.alchemy || new Set();
/* 화로 탭(기예)에 올릴 수 있는 재료: 행낭에 1개 이상 있고, 그 기예의 유효 재료인 것 */
function getFilteredMaterials(craft) {
  const valid = craft === 'forge' ? getValidForgeMaterials() : getValidAlchemyMaterials();
  return itemSort(Object.keys(S.inv).filter(id => ITEMS[id] && ITEMS[id].kind === '재료' && valid.has(id) && count(id) > 0));
}

function potTotal(pot) { return Object.values(pot).reduce((a, b) => a + b, 0); }

/* 한 번 만들 때 드는 값: 단조는 최대 체력의 10%, 연단은 최대 내력의 10% */
function craftCost(craft, st = calcStats()) { return Math.ceil((craft === 'forge' ? st.maxHp : st.maxMp) * 0.1); }

/* craft: 고른 기예, pot: 화로에 넣은 재료 {itemId: 개수}. 결과는 화면에 신호로 넘긴다 */
function doCraft(craft, pot) {
  const total = potTotal(pot);
  if (!total) { notify.toast('화로에 재료를 넣으십시오.'); return; }
  for (const [id, n] of Object.entries(pot)) if (!has(id, n)) { notify.toast('재료가 부족합니다.'); return; }
  const C = CRAFTS[craft], lvl = S.crafts[craft], st = calcStats(), cost = craftCost(craft, st);
  if (craft === 'forge' ? S.hp <= cost : S.mp < cost) { notify.toast(craft === 'forge' ? '체력이 모자라 망치를 들 수 없습니다.' : '내력이 모자라 단로에 주입할 수 없습니다.'); return; }
  if (craft === 'forge') S.hp -= cost; else S.mp -= cost;
  for (const [id, n] of Object.entries(pot)) take(id, n);
  const recipe = RECIPE_BY_KEY[craft + ':' + potKey(pot)];
  const ok = !!recipe;   // 조합이 맞으면 반드시 이룬다 — 어려운 것은 조합식을 알아내는 일 (10월 3일 유저)
  lvl.xp += ok ? 10 : 6;
  while (lvl.xp >= lvl.lv * 30) { lvl.xp -= lvl.lv * 30; lvl.lv++; log(`${C.name} 솜씨가 ${craftGrade(lvl.lv)}으로 올랐습니다.`, 'good'); }
  let result;
  if (ok) {
    const first = !S.codex.includes(recipe.id);
    if (first) S.codex.push(recipe.id);
    if (recipe.out.startsWith('gear:')) {                   // 단조: 중급 장비 (등급 고정)
      const it = makeNamedGear(recipe.out.slice(5));
      if (!giveGear(it, true)) S.gear.push(it);                // 행낭이 가득 차도 만든 장비는 잃지 않는다
      result = { ok: true, first, text: `[${RARITY[it.rarity].name}] ${it.name}`, sub: CRAFT_GEAR[it.named].desc, cls: 'r' + it.rarity };
    } else {
      give(recipe.out, 1, true);
      result = { ok: true, first, text: `${ITEMS[recipe.out].icon} ${ITEMS[recipe.out].name}`, sub: ITEMS[recipe.out].desc };
    }
    log(`${C.name} 성공: ${hlItem(result.text)}${first ? ` — 도감 › ${C.name} 비법에 새로 기록!` : ''}`, 'good');
  } else {
    const fail = C.fail, nFail = craft === 'forge' ? (talentOf().slag || 1) : 1;   // 기예 단조: 찌꺼기 2배
    S.inv[fail] = (S.inv[fail] || 0) + nFail;
    result = { ok: false, text: `${ITEMS[fail].icon} ${ITEMS[fail].name}${nFail > 1 ? ` ×${nFail}` : ''}`, sub: recipe ? '불길이 한순간 크게 일렁였습니다. 조합은 맞았던 것 같습니다…' : '재료들이 서로 어울리지 못하고 엉겨 붙었습니다.' };
    log(`${C.name} 실패… ${ITEMS[fail].name}${jo(ITEMS[fail].name, '이가')} 남았습니다.`, 'bad');
  }
  noteCraft(craft, pot, recipe, ok);
  notify.view({ craftResult: result, pot: {} });
  notify.refresh();
  return result;
}

/* 연구 노트: 해 본 조합(기예 + 재료 구성)과 결과를 남긴다. 답을 알려 주지 않고, 내가 해 본 것만 기억해 준다 */
function noteCraft(craft, pot, recipe, ok) {
  S.craftNotes = S.craftNotes || [];
  const key = craft + ':' + potKey(pot);
  S.craftNotes = S.craftNotes.filter(n => n.key !== key);
  S.craftNotes.push({ key, craft, mats: { ...pot }, ok, near: !ok && !!recipe, out: ok ? recipe.out : null, t: now() });
  if (S.craftNotes.length > CRAFT_NOTE_MAX) S.craftNotes.splice(0, S.craftNotes.length - CRAFT_NOTE_MAX);
}
const craftNoteFor = (craft, pot) => (S.craftNotes || []).find(n => n.key === craft + ':' + potKey(pot));
/* 조합식 결과물 이름·아이콘 (장비는 'gear:id') */
const recipeGear = r => r.out.startsWith('gear:') ? CRAFT_GEAR[r.out.slice(5)] : null;
function recipeName(r) { const G = recipeGear(r); return G ? G.name : ITEMS[r.out].name; }
function recipeIcon(r) { const G = recipeGear(r); return G ? ({ weapon: '🗡️', armor: '🛡️', ring: '💍', belt: '🎗️', jade: '🟩' }[G.slot] || '🛡️') : ITEMS[r.out].icon; }

/* 무신상 공양 (가챠): 검게 탄 찌꺼기 GACHA.cost개마다 한 번. times번 (찌꺼기가 모자라면 되는 만큼) */
function pray(times = 1) {
  const n = Math.min(times, Math.floor(count('slag') / GACHA.cost));
  if (n < 1) { notify.toast(`검게 탄 찌꺼기 ${GACHA.cost}개가 있어야 공양할 수 있습니다.`); return null; }
  take('slag', n * GACHA.cost);
  const got = [];
  for (let i = 0; i < n; i++) got.push(gachaRoll());
  S.shrine.pulls = (S.shrine.pulls || 0) + n;
  S.statueResidueCount = (S.statueResidueCount || 0) + n * GACHA.cost;   // 탁기 정화 누적
  log(`🗿 무신상에 검게 탄 찌꺼기 ${n * GACHA.cost}개를 공양했습니다. 돌아온 것: ${got.map(g => hlItem(g.text)).join(', ')}`, 'gold');
  notify.view({ gachaResult: got });
  let aw = null;
  while (S.statueResidueCount >= GACHA.awaken) aw = triggerStatueAwakeningReward();
  if (aw) notify.view({ modal: 'awaken', awaken: aw });
  notify.refresh();
  return got;
}

/* 누적 300개: 무신이 깨어나 찢어진 비급 조각 1장을 하사한다 (이류 90% · 일류 10%) */
function triggerStatueAwakeningReward() {
  S.statueResidueCount -= GACHA.awaken;
  const id = weighted(GACHA.awakenScrap), I = ITEMS[id];
  give(id, 1, true);
  log(`[무신의 응답] 석상이 탁기를 모두 삼켜 눈을 떴습니다! ${hlItem(I.name)}${jo(I.name, '을를')} 하사받았습니다. (${count(id)} / ${STUDY.need}장 — 화로 › 연혼에서 엮습니다)`, 'gold');
  notify.banner('무신의 응답', I.name, '');
  let pill = null, r = Math.random() * 100;   // 낮은 확률로 돌파단도 함께
  for (const [pid, p] of Object.entries(GACHA.awakenPill)) { if (r < p) { pill = pid; break; } r -= p; }
  if (pill) { give(pill, 1, true); log(`[무신의 응답] 석상의 손바닥에서 ${hlItem(ITEMS[pill].name)}${jo(ITEMS[pill].name, '이가')} 함께 굴러떨어졌습니다!`, 'gold'); }
  return { item: { id, name: I.name, grade: STUDY.scraps[id] }, pill };
}
/* 화로 › 연혼: 조각 8장을 엮어 그 등급의 비급 한 권 (아직 없는 것 가운데 무작위, 다 있으면 아무거나) */
function studyBind(scrap) {
  const grade = STUDY.scraps[scrap]; if (!grade || count(scrap) < STUDY.need) return null;
  const all = Object.keys(MANUALS).filter(id => MANUALS[id].grade === grade && ITEMS['bk_' + id]);
  const fresh = all.filter(id => !S.manuals[id] && !has('bk_' + id)), id = pick(fresh.length ? fresh : all);
  take(scrap, STUDY.need); give('bk_' + id, 1, true);
  log(`📚 연혼에서 찢어진 ${grade} 비급 조각 ${STUDY.need}장을 엮어 ${hlItem(`《${MANUALS[id].name}》 비급`)}을 되살렸습니다.`, 'gold');
  notify.refresh();
  return id;
}
function gachaRoll() {
  const T = Object.fromEntries(GACHA.table.map(e => [e.k, e.w]));
  const k = weighted(T);
  let e = GACHA.table.find(x => x.k === k);
  if (e.k === 'book') {
    const pool = GACHA.books.filter(id => !S.manuals[id] && !has('bk_' + id));
    if (pool.length) { const id = pick(pool); give('bk_' + id, 1, true); return { k: 'book', text: `📘 ${ITEMS['bk_' + id].name}`, cls: 'r3' }; }
    e = GACHA.table.find(x => x.k === 'pill');               // 비급을 다 모았으면 영단으로
  }
  if (e.k === 'gear') {
    const tier = Math.max(...ZONE_ORDER.filter(zoneUnlocked).map(z => ZONES[z].tier));
    const it = dropGear(tier, rollDropRarity(false));
    if (giveGear(it, true)) return { k: 'gear', text: `🗡️ [${RARITY[it.rarity].name}] ${it.name}`, cls: 'r' + it.rarity };
    e = GACHA.table.find(x => x.k === 'supply');             // 행낭이 가득 차면 소모품으로
  }
  const [id, a, b] = pick(e.pool), n = rint(a, b);
  give(id, n, true);
  return { k: e.k, text: `${ITEMS[id].icon} ${ITEMS[id].name} ×${n}`, cls: e.k === 'pill' ? 'r2' : '' };
}
