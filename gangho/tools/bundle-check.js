/* 번들 점검: <폴더>/gangho.html이 오류 없이 뜨는지, GM 별도 창(admin.html)과 연결돼 명령이 게임에 닿는지.
   쓰는 법: node gangho/tools/bundle-check.js <bundle.py 출력 폴더> */
'use strict';
const { playwright } = require('../tests/lib');
(async () => {
  const d = require('path').resolve(process.argv[2] || '.');
  const b = await playwright.chromium.launch(); const ctx = await b.newContext(); const errs = [];
  const g = await ctx.newPage(); g.on('pageerror', e => errs.push(e.message));
  await g.goto(`file://${d}/gangho.html`); await g.click('#begin');
  const r = await g.evaluate(() => { setDestination('cheongpung'); return { tabs: document.querySelectorAll('.tabs .tab').length }; });
  await g.evaluate(() => { document.getElementById('gmToggle').hidden = false; });   // GM 단추는 일반 제자에게 숨김 (#gm · Ctrl+Shift+G)
  const [a] = await Promise.all([ctx.waitForEvent('page'), g.click('#gmToggle')]);
  await a.waitForFunction(() => S && /연결됨/.test(document.querySelector('#gmConn').textContent), null, { timeout: 5000 });
  await a.click('.gm-tab[data-gmtab="cheat"]'); await a.click('[data-gm="silver"]');
  await g.waitForFunction(() => S.silver === 1030, null, { timeout: 3000 });
  console.log(errs.length ? 'FAIL ' + errs.join('; ') : `bundle ok (탭 ${r.tabs}개, GM 연결 · 명령 확인)`); await b.close(); if (errs.length) process.exit(1);
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
