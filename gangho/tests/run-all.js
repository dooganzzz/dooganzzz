/* 모든 검사 묶음을 차례로 실행한다. 실패가 하나라도 있으면 종료 코드 1. */
'use strict';
const { playwright, result } = require('./lib');
const SUITES = ['suite-core', 'suite-map-craft', 'suite-martial', 'suite-round7', 'suite-round8', 'suite-round9', 'suite-round10', 'suite-round11'];

(async () => {
  const browser = await playwright.chromium.launch();
  const only = process.argv[2];
  for (const name of SUITES) {
    if (only && !name.includes(only)) continue;
    console.log(`\n##### ${name} #####`);
    try { await require('./' + name)(browser); }
    catch (e) { result.fail++; result.failed.push(`${name}: ${e.message.split('\n')[0]}`); console.log('ERROR ' + e.message.split('\n')[0]); }
  }
  await browser.close();
  console.log(`\n통과 ${result.pass} · 실패 ${result.fail}`);
  if (result.fail) { console.log('실패 항목:\n- ' + result.failed.join('\n- ')); process.exit(1); }
})();
