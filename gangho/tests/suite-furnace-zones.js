/* 화로 조합식·탭, 구역 해금, 전투 수련치, 초기화 */
'use strict';
const { ok, GAME_URL, watchErrors, startEquipped, VIEWPORTS, newPage } = require('./lib');

module.exports = async (b) => {
  for (const [w, h] of VIEWPORTS) {
  console.log(`\n=== ${w}px ===`);
  const p = await newPage(b, w, h);
  const errs = watchErrors(p);
  await p.goto(GAME_URL);
  await startEquipped(p);
  if (w === 1280) {
    const rc = await p.evaluate(() => RECIPES.filter(r => !CRAFTS[r.craft] || Object.keys(r.in).some(id => !ITEMS[id] || ITEMS[id].kind !== '재료') || !(r.out.startsWith('gear:') ? CRAFT_GEAR[r.out.slice(5)] : ITEMS[r.out])).map(r => r.id));
    ok('6 조합식의 재료·결과가 모두 존재 (단조·연단만)', rc.length === 0 && (await p.evaluate(() => Object.keys(CRAFTS).join())) === 'forge,alchemy', rc.join(','));
    const dup = await p.evaluate(() => { const k = RECIPES.map(r => r.craft + ':' + potKey(r.in)); return k.length - new Set(k).size; });
    ok('6 같은 재료 구성의 조합식이 둘 이상 없음', dup === 0, String(dup));
  }
  // 1
  await p.click('[data-tab="sect"]'); await p.click('[data-sub="hall"]');
  const yard = await p.$eval('#main', e => e.textContent);
  ok('1 아린 조합법 물어보기 제거', !/조합법 물어보기|레시피 힌트/.test(yard) && !(await p.$('[data-act="hint"]')));
  ok('1 약과 없음 · 대화만', !(await p.$('[data-act="snack"]')) && !!(await p.$('[data-act="talk"]')));
  // 5
  await p.click('[data-tab="field"]');   // 강호행 탭은 강호 지도부터
  const openZones = () => p.$$eval('.map-spot:not(.locked)', e => e.map(x => x.getAttribute('aria-label')).join(','));
  const z1 = await openZones();
  ok('5 초기에는 청풍산만 열림', z1 === '청풍산', z1);
  await p.evaluate(() => { S.flags[ZONES.yeomhwa.unlock.boss] = true; render(); });
  ok('5 청풍산 두목 처치 후 염화채 열림', (await openZones()) === '청풍산,염화채');
  await p.evaluate(() => { S.flags[ZONES.yeomhwa.unlock.boss] = false; render(); });
  // 지도는 화면이라 닫을 것이 없다
  // 2 전투 승리 → 수련치 (적의 xp × 수련치 획득 보정)
  const xp = await p.evaluate(() => {
    const e0 = S.exp; S.hp = 99999; const b = fightSync('boar');
    return { win: b.win, got: S.exp - e0, expect: Math.round(expGain(ENEMIES.boar.xp) * EXPEDITION.expMult), rec: b.exp };
  });
  ok('2 승리 시 수련치 = 적 수련치 × 보정 × 강호행 수련치 배율', xp.win && xp.got === xp.expect && xp.rec === xp.expect && xp.expect > 0, JSON.stringify(xp));
  // 6 화로: [단조] | [연단] 두 탭, 탭마다 그 기예의 조합식에 쓰이는 재료만 보인다
  await p.evaluate(() => { ITEMS.testMat = { name: '시험재', icon: '❔', kind: '재료' }; Object.assign(S.inv, { roughOre: 2, wildGinseng: 2, treeSap: 1, herb: 2, testMat: 1 }); ui.tab = 'sect'; ui.sectSub = 'forge'; render(); });
  const f = {};
  f.tabs = await p.$$eval('.furnace-tabs [data-craft]', e => e.map(x => x.textContent).join('|'));
  for (const c of ['forge', 'alchemy']) { await p.click(`[data-craft="${c}"]`); f[c] = await p.$$eval('[data-add]', e => e.map(x => x.dataset.add).sort().join(',')); }
  ok('6 화로 탭: 단조 | 연단 | 연혼각', /단조/.test(f.tabs) && /연단/.test(f.tabs) && /연혼각/.test(f.tabs) && f.tabs.split('|').length === 3, f.tabs);
  const fl = f.forge.split(','), al = f.alchemy.split(',');
  ok('6 단조 탭은 단조 재료만', fl.includes('roughOre') && fl.includes('treeSap') && !fl.includes('wildGinseng') && !fl.includes('herb'), JSON.stringify(f));
  ok('6 연단 탭은 연단 재료만', al.includes('wildGinseng') && al.includes('herb') && al.includes('treeSap') && !al.includes('roughOre'), JSON.stringify(f));
  ok('6 조합식에 없는 재료는 두 탭 모두 숨김', !fl.includes('testMat') && !al.includes('testMat'));
  await p.evaluate(() => { delete S.inv.testMat; delete ITEMS.testMat; render(); });
  await p.click('[data-add="herb"]'); await p.click('[data-craft="forge"]');
  ok('6 탭 전환 시 슬롯 초기화', await p.evaluate(() => potTotal(ui.pot) === 0));
  // 3 reset: native confirm accept
  p.once('dialog', d => { d.accept(); });
  await p.evaluate(() => { ui.modal = null; ui.tab = 'settings'; render(); }); await Promise.all([p.waitForNavigation(), p.evaluate(() => document.querySelector('#main [data-act="reset"]').click())]);
  await p.waitForSelector('#begin');
  const st = await p.evaluate(() => ({ S, ls: localStorage.length }));
  ok('3 처음부터 다시 → 입문 화면', st.S === null, `localStorage ${st.ls}건`);
  // 3b dismissed confirm keeps data
  await p.click('#begin'); await p.evaluate(() => save());
  p.once('dialog', d => { d.dismiss(); });
  await p.evaluate(() => { ui.modal = null; ui.tab = 'settings'; render(); document.querySelector('#main [data-act="reset"]').click(); }); await p.waitForTimeout(300);
  ok('3 취소하면 유지', await p.evaluate(() => S !== null && !!localStorage.getItem(saveKey())));
  const ow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  ok('오류/가로스크롤 없음', !errs.length && !ow, errs.join(';'));
  }
};
