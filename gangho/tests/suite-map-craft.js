/* 화로 조합식·탭, 구역 해금, 전투 경험치, 초기화 */
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
    const rc = await p.evaluate(() => RECIPES.filter(r => !CRAFTS[r.craft] || Object.keys(r.in).some(id => !ITEMS[id] || ITEMS[id].kind !== '재료') || !(r.out.startsWith('gear:') ? CRAFT_GEAR[r.out.slice(5)] : ITEMS[r.out])).map(r => r.id));
    ok('6 조합식의 재료·결과가 모두 존재 (단조·단약만)', rc.length === 0 && (await p.evaluate(() => Object.keys(CRAFTS).join())) === 'forge,alchemy', rc.join(','));
    const dup = await p.evaluate(() => { const k = RECIPES.map(r => r.craft + ':' + potKey(r.in)); return k.length - new Set(k).size; });
    ok('6 같은 재료 구성의 조합식이 둘 이상 없음', dup === 0, String(dup));
  }
  // 1
  await p.click('[data-tab="sect"]'); await p.click('[data-sub="yard"]');
  const yard = await p.$eval('#main', e => e.textContent);
  ok('1 아린 조합법 물어보기 제거', !/조합법 물어보기|레시피 힌트/.test(yard) && !(await p.$('[data-act="hint"]')));
  ok('1 약과 없음 · 대화만', !(await p.$('[data-act="snack"]')) && !!(await p.$('[data-act="talk"]')));
  // 5
  await p.click('[data-tab="field"]');
  const z1 = await p.$$eval('.zone:not(.locked) h3 .ko', e => e.map(x => x.textContent).join(','));
  ok('5 초기에는 청풍산만 열림', z1 === '청풍산', z1);
  await p.evaluate(() => { S.flags.boss1 = true; render(); });
  ok('5 청풍산 두목 처치 후 염화채 열림', (await p.$$eval('.zone:not(.locked) h3 .ko', e => e.map(x => x.textContent).join(','))) === '청풍산,염화채');
  await p.evaluate(() => { S.flags.boss1 = false; render(); });
  // 2 전투 승리 → 경험치 (적의 xp × 경험치 획득 보정)
  const xp = await p.evaluate(() => {
    const e0 = S.exp; S.hp = 99999; const b = fightSync('boar');
    return { win: b.win, got: S.exp - e0, expect: expGain(ENEMIES.boar.xp), rec: b.exp };
  });
  ok('2 승리 시 경험치 = 적 경험치 × 보정 (신분패 +10%)', xp.win && xp.got === xp.expect && xp.rec === xp.expect && xp.expect === 22, JSON.stringify(xp));
  // 6 화로: [단조] | [단약] 두 탭, 두 탭 모두 모든 재료가 보인다
  await p.evaluate(() => { Object.assign(S.inv, { roughOre: 2, wildGinseng: 2, treeSap: 1, herb: 2 }); ui.tab = 'sect'; ui.sectSub = 'forge'; render(); });
  const f = {};
  f.tabs = await p.$$eval('.furnace-tabs [data-craft]', e => e.map(x => x.textContent).join('|'));
  for (const c of ['forge', 'alchemy']) { await p.click(`[data-craft="${c}"]`); f[c] = await p.$$eval('[data-add]', e => e.map(x => x.dataset.add).sort().join(',')); }
  ok('6 화로 탭: 단조 | 단약', /단조/.test(f.tabs) && /단약/.test(f.tabs) && f.tabs.split('|').length === 2, f.tabs);
  ok('6 두 탭 모두 모든 재료', f.forge === f.alchemy && ['roughOre', 'wildGinseng', 'treeSap', 'herb'].every(id => f.forge.includes(id)), JSON.stringify(f));
  await p.click('[data-add="herb"]'); await p.click('[data-craft="forge"]');
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
