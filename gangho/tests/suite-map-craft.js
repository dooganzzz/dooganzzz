/* 기예 재료 분류, 구역 해금, 전투 경험치, 초기화 */
'use strict';
const { ok, GAME_URL, watchErrors, startEquipped, VIEWPORTS, newPage } = require('./lib');

module.exports = async (b) => {
  for (const [w, h] of VIEWPORTS) {
  console.log(`\n=== ${w}px ===`);
  const p = await newPage(b, w, h);
  const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type()==='error' && !/ERR_CERT|ERR_FILE_NOT_FOUND/.test(m.text()) && errs.push(m.text()));
  await p.goto(GAME_URL);
  await startEquipped(p);
  if (w === 1280) {
    const rc = await p.evaluate(() => RECIPES.filter(r => Object.keys(r.in).some(id => ITEMS[id].craftType !== CRAFT_TYPE[r.craft])).map(r => r.id));
    ok('6 레시피 재료가 한 분류뿐', rc.length === 0, rc.join(','));
    const un = await p.evaluate(() => Object.entries(ITEMS).filter(([, I]) => I.kind === '재료' && !I.craftType).map(([id]) => id));
    ok('6 모든 재료에 craftType', un.length === 0, un.join(','));
  }
  // 1
  await p.click('[data-tab="sect"]'); await p.click('[data-sub="yard"]');
  const yard = await p.$eval('#main', e => e.textContent);
  ok('1 아린 조합법 물어보기 제거', !/조합법 물어보기|레시피 힌트/.test(yard) && !(await p.$('[data-act="hint"]')));
  ok('1 약과·대화만', !!(await p.$('[data-act="snack"]')) && !!(await p.$('[data-act="talk"]')));
  // 5
  await p.click('[data-tab="field"]');
  const z1 = await p.$$eval('.zone:not(.locked) h3 .ko', e => e.map(x => x.textContent).join(','));
  ok('5 초기에는 청풍산만 열림', z1 === '청풍산', z1);
  await p.evaluate(() => { S.flags.boss1 = true; render(); });
  ok('5 멧돼지왕 처치 후 염화채 열림', (await p.$$eval('.zone:not(.locked) h3 .ko', e => e.map(x => x.textContent).join(','))) === '청풍산,염화채');
  await p.evaluate(() => { S.flags.boss1 = false; render(); });
  // 2 전투 승리 → 경험치 (적의 xp × 경험치 획득 보정)
  const xp = await p.evaluate(() => {
    const e0 = S.exp; S.hp = 99999; const b = fightSync('boar');
    return { win: b.win, got: S.exp - e0, expect: expGain(ENEMIES.boar.xp), rec: b.exp };
  });
  ok('2 승리 시 경험치 = 적 경험치 × 보정 (신분패 +10%)', xp.win && xp.got === xp.expect && xp.rec === xp.expect && xp.expect === 22, JSON.stringify(xp));
  // 6 forge filter
  await p.evaluate(() => { Object.assign(S.inv, { iron: 2, herb: 2, rabbitMeat: 2, wood: 1, salt: 1 }); ui.tab = 'sect'; ui.sectSub = 'forge'; render(); });
  const ITEMS_CT = await p.evaluate(() => Object.fromEntries(Object.entries(ITEMS).map(([k, v]) => [k, v.craftType])));
  const f = {};
  for (const c of ['forge', 'alchemy', 'cook']) { await p.click(`[data-craft="${c}"]`); f[c] = await p.$$eval('[data-add]', e => e.map(x => x.dataset.add).join(',')); }
  ok('6 주조 재료만', f.forge.split(',').every(id => ['iron','wood','boarHide','boarTusk','rabbitHide','dogFang'].includes(id)) && !/herb|rabbitMeat|salt/.test(f.forge), f.forge);
  ok('6 연단 재료만', f.alchemy.split(',').every(id => ITEMS_CT[id] === 'alchemy'), f.alchemy);
  ok('6 조리 재료만', f.cook.split(',').every(id => ITEMS_CT[id] === 'cooking'), f.cook);
  await p.click('[data-craft="cook"]'); await p.click('[data-add="salt"]'); await p.click('[data-craft="forge"]');
  ok('6 탭 전환 시 슬롯 초기화', await p.evaluate(() => potTotal(ui.pot) === 0));
  // 3 reset: native confirm accept
  p.once('dialog', d => { d.accept(); });
  await Promise.all([p.waitForNavigation(), p.click('.reset')]);
  await p.waitForSelector('#begin');
  const st = await p.evaluate(() => ({ S, ls: localStorage.length }));
  ok('3 처음부터 다시 → 입문 화면', st.S === null, `localStorage ${st.ls}건`);
  // 3b dismissed confirm keeps data
  await p.click('#begin');
  p.once('dialog', d => { d.dismiss(); });
  await p.click('.reset'); await p.waitForTimeout(300);
  ok('3 취소하면 유지', await p.evaluate(() => S !== null && !!localStorage.getItem(SAVE_KEY)));
  const ow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  ok('오류/가로스크롤 없음', !errs.length && !ow, errs.join(';'));
  }
};
