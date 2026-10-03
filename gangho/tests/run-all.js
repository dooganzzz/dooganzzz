/* 모든 검사 묶음을 차례로 실행한다. 실패가 하나라도 있으면 종료 코드 1. */
'use strict';
const { playwright, result, ok } = require('./lib');
/* 기능별 묶음 (이름 일부로 골라 돌릴 수 있다: node tests/run-all.js gm) */
const SUITES = [
  // 기본 · 화면 틀
  'suite-core', 'suite-status-tab', 'suite-sect-tab', 'suite-compact-library',
  // 무공 · 성장
  'suite-manuals-db', 'suite-martial-slots', 'suite-growth-drops', 'suite-combat-power',
  // 전투
  'suite-combat-branches', 'suite-hit-feedback', 'suite-world-affinity',
  // 강호행 · 기연 · 견문록
  'suite-zones-rules', 'suite-prep-notes', 'suite-encounters', 'suite-chronicle-replay',
  // 화로 · 전방 · 도감
  'suite-furnace-zones', 'suite-shop', 'suite-shop-enhance', 'suite-codex-gear',
  // 운영자 콘솔
  'suite-gm-console', 'suite-gm-window',
];

(async () => {
  const only = process.argv[2];
  if (!only || 'layers'.includes(only)) {
    console.log('\n##### 계층 규칙 (data · systems · ui) #####');
    const bad = require('./check-layers')();
    ok('데이터는 로직 없음 · 시스템은 DOM/화면 무관 · 스크립트 순서', bad.length === 0, bad.slice(0, 5).join(' / '));
  }
  const browser = await playwright.chromium.launch();
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
