/* 강호견문록 브라우저 검사 공용 도구 */
'use strict';
const path = require('path');
let playwright;
try { playwright = require('playwright'); }
catch (e) { playwright = require(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'playwright')); }

const GAME_URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const result = { pass: 0, fail: 0, failed: [] };
function ok(name, cond, extra = '') {
  if (cond) result.pass++; else { result.fail++; result.failed.push(name); }
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  — ' + extra : ''));
}
// 게임 스크립트 밖에서 난 오류만 모은다 (폰트·초상화 파일 없음은 제외)
function watchErrors(p) {
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => m.type() === 'error' && !/ERR_CERT|ERR_FILE_NOT_FOUND|ERR_NAME|ERR_INTERNET|net::/.test(m.text()) && errs.push(m.text()));
  return errs;
}
// 새 게임을 시작하고 행낭의 비급을 모두 익혀 장착한다
async function startEquipped(p) {
  await p.click('#begin');
  await p.evaluate(() => { for (const k of Object.keys(S.inv).filter(k => ITEMS[k].kind === '비급')) learnManual(k); for (const id of Object.keys(S.manuals)) equipManual(id); ui.tab = 'hall'; render(); });
}
const VIEWPORTS = [[1280, 900], [390, 844]];
// 3초 주기 자동 전투를 검사에서는 즉시 끝까지 돌린다
async function newPage(browser, w, h) {
  const p = await browser.newPage({ viewport: { width: w, height: h } });
  await p.addInitScript(() => {
    window.fightSync = (eid, maxRounds = 300) => {
      startBattle(eid); stopBattleTimer();
      let n = 0; while (!ui.battle.over && n++ < maxRounds) battleRound();
      return ui.battle;
    };
  });
  return p;
}
module.exports = { playwright, GAME_URL, ok, result, watchErrors, startEquipped, VIEWPORTS, newPage };
