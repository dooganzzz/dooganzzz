/* [시스템] 화로 기예(주조·연단·조리), 연구 노트, 무신상 봉헌 (DOM 조작 금지) */

/* ───────── 기예 ───────── */
function potKey(pot) { return Object.entries(pot).filter(([, v]) => v > 0).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}*${v}`).join('|'); }
const RECIPE_BY_KEY = {};
for (const r of RECIPES) RECIPE_BY_KEY[r.craft + ':' + potKey(r.in)] = r;

function potTotal(pot) { return Object.values(pot).reduce((a, b) => a + b, 0); }

function fireText(craft) {
  const lv = S.crafts[craft].lv;
  const t = {
    forge: ['풀무질이 서툴러 불길이 들쭉날쭉합니다.', '쇳물이 제법 붉게 달아오릅니다.', '불꽃이 하얗게 달아 망치 소리가 맑습니다.', '쇠가 먼저 제 모양을 알려 줍니다.'],
    alchemy: ['약탕 아래 불이 이리저리 흔들립니다.', '약향이 고르게 피어오릅니다.', '푸른 불꽃이 안정적으로 넘실댑니다.', '단로의 불이 손끝처럼 말을 듣습니다.'],
    cook: ['장작이 덜 말라 연기만 자욱합니다.', '솥이 보글보글 제법 소리를 냅니다.', '불 조절이 능숙해져 냄새부터 다릅니다.', '아린이 침을 흘리며 기웃거립니다.'],
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
  const chance = Math.min(98, 78 + lvl.lv * 3 + st.craft);
  const ok = recipe && Math.random() * 100 < chance;
  lvl.xp += ok ? 10 : 6;
  while (lvl.xp >= lvl.lv * 30) { lvl.xp -= lvl.lv * 30; lvl.lv++; log(`${C.name} 솜씨가 한 단계 늘었습니다.`, 'good'); }
  let result;
  if (ok) {
    const first = !S.codex.includes(recipe.id);
    if (first) S.codex.push(recipe.id);
    if (recipe.out.startsWith('eq:')) {
      const [, base, tier] = recipe.out.split(':');
      const r = Math.random() * 100;
      const rar = r < 2 + st.craft / 3 ? 4 : r < 14 + st.craft + lvl.lv * 2 ? 3 : 2;
      const it = makeGear(base, +tier, rar, true);
      if (!giveGear(it, true)) S.gear.push(it);
      result = { ok: true, first, text: `[${RARITY[rar].name}] ${it.name}`, sub: it.unique.text, cls: 'r' + rar };
    } else {
      give(recipe.out, 1, true);
      result = { ok: true, first, text: `${ITEMS[recipe.out].icon} ${ITEMS[recipe.out].name}`, sub: ITEMS[recipe.out].desc };
    }
    log(`${C.name} 성공: ${hlItem(result.text)}${first ? ' — 도감에 새로 기록!' : ''}`, 'good');
  } else {
    const fail = C.fail;
    S.inv[fail] = (S.inv[fail] || 0) + 1;
    result = { ok: false, text: `${ITEMS[fail].icon} ${ITEMS[fail].name}`, sub: recipe ? '불길이 한순간 크게 일렁였습니다. 조합은 맞았던 것 같습니다…' : '재료들이 서로 어울리지 못하고 엉겨 붙었습니다.' };
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
function recipeName(r) { return r.out.startsWith('eq:') ? EQUIP_BASES[r.out.split(':')[1]].names[+r.out.split(':')[2] - 1] : ITEMS[r.out].name; }
function recipeIcon(r) { return r.out.startsWith('eq:') ? (EQUIP_BASES[r.out.split(':')[1]].slot === 'weapon' ? '🗡️' : '🛡️') : ITEMS[r.out].icon; }

function offer(id, all) {
  if (!has(id)) return;
  const n = all ? count(id) : 1;
  take(id, n);
  const o = OFFER[id];
  S.shrine[o.key] = Math.round((S.shrine[o.key] + o.val * n) * 10) / 10;
  const before = Math.floor(S.shrine.total / 10);
  S.shrine.total += n;
  log(`무신상에 ${ITEMS[id].name} ${n}개를 봉헌했습니다. ${o.text}${n > 1 ? ` ×${n}` : ''}`, 'gold');
  if (Math.floor(S.shrine.total / 10) > before) log('무신상의 눈이 희미하게 빛납니다… 치명타율 +2%', 'gold');
  notify.refresh();
}
