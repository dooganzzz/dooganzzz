/* [시스템] 화로 제작 엔진: 단조(장비) · 단약(영약) 이원화, 비밀 조합식(성공 시 도감 등재), 연구 노트, 무신상 공양(가챠) (DOM 조작 금지) */

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
  return Object.keys(S.inv).filter(id => ITEMS[id] && ITEMS[id].kind === '재료' && valid.has(id) && count(id) > 0)
    .sort((a, b) => ITEMS[a].name.localeCompare(ITEMS[b].name));
}

function potTotal(pot) { return Object.values(pot).reduce((a, b) => a + b, 0); }

function fireText(craft) {
  const lv = S.crafts[craft].lv;
  const t = {
    forge: ['풀무질이 서툴러 불길이 들쭉날쭉합니다.', '쇳물이 제법 붉게 달아오릅니다.', '불꽃이 하얗게 달아 망치 소리가 맑습니다.', '쇠가 먼저 제 모양을 알려 줍니다.'],
    alchemy: ['약탕 아래 불이 이리저리 흔들립니다.', '약향이 고르게 피어오릅니다.', '푸른 불꽃이 안정적으로 넘실댑니다.', '단로의 불이 손끝처럼 말을 듣습니다.'],
  }[craft];
  return t[lv >= 8 ? 3 : lv >= 5 ? 2 : lv >= 2 ? 1 : 0];
}

/* craft: 고른 기예, pot: 화로에 넣은 재료 {itemId: 개수}. 결과는 화면에 신호로 넘긴다 */
function doCraft(craft, pot) {
  const total = potTotal(pot);
  if (!total) { notify.toast('화로에 재료를 넣으십시오.'); return; }
  for (const [id, n] of Object.entries(pot)) if (!has(id, n)) { notify.toast('재료가 부족합니다.'); return; }
  const C = CRAFTS[craft], lvl = S.crafts[craft];
  for (const [id, n] of Object.entries(pot)) take(id, n);
  const recipe = RECIPE_BY_KEY[craft + ':' + potKey(pot)];
  const st = calcStats();
  const chance = Math.min(98, 78 + lvl.lv * 3 + st.craft + (talentOf().craft === craft ? talentOf().rate || 0 : 0));
  const ok = recipe && Math.random() * 100 < chance;
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

/* 누적 300개: 무신이 깨어나 영구 능력치(4대 스탯 하나 +1 · 최대 활력 +20)와 삼류~이류 완제품 하나를 하사한다 */
function triggerStatueAwakeningReward() {
  S.statueResidueCount -= GACHA.awaken;
  const stat = pick(Object.keys(ATTRS));
  S.perm.attr = S.perm.attr || {}; S.perm.attr[stat] = (S.perm.attr[stat] || 0) + 1;
  S.perm.maxHp += GACHA.awakenHp;
  const item = rollGrade3To2Product();
  clampVitals();
  log(`[무신의 응답] 석상이 탁기를 모두 삼켜 눈을 떴습니다! ${ATTRS[stat].name} 영구 +1 · 최대 활력 영구 +${GACHA.awakenHp}, ${hlItem(`《${item.name}》`)}${jo(item.name, '을를')} 하사받았습니다.`, 'gold');
  notify.banner('무신의 응답', `${ATTRS[stat].name} +1 · 활력 +${GACHA.awakenHp} · ${item.name}`, '');
  return { stat, statName: ATTRS[stat].name, statVal: 1, hp: GACHA.awakenHp, item };
}
/* 삼류~이류 완제품: 장비(단조 중급·장경각 이류) 또는 아직 없는 비급(삼류·청풍 이류). 행낭이 차면 비급으로 */
function rollGrade3To2Product() {
  const books = [...GACHA.books, ...GACHA.awakenBooks].filter(id => !S.manuals[id] && !has('bk_' + id));
  if (Math.random() < 0.5 || !books.length) {
    const ids = [...Object.keys(CRAFT_GEAR), ...Object.keys(LIBRARY_GEAR)], id = pick(ids);
    const it = LIBRARY_GEAR[id] ? libraryGear(id) : makeNamedGear(id);
    if (LIBRARY_GEAR[id]) delete it.shop;                                   // 하사품은 장경각 교환과 별개
    if (giveGear(it, true)) return { type: 'equipment', name: it.name, grade: LIBRARY_GEAR[id] ? '이류' : '중급' };
    if (!books.length) { const n = rint(2, 3); give('saenghyeol', n, true); return { type: 'supply', name: `생혈고 ×${n}`, grade: '' }; }
  }
  const id = pick(books); give('bk_' + id, 1, true);
  return { type: 'skillBook', name: `${MANUALS[id].name} 비급`, grade: MANUALS[id].grade };
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
