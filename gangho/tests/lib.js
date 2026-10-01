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
  p.on('pageerror', e => errs.push(e.message + ((e.stack || '').match(/at [^\n]*/) ? ' @ ' + (e.stack.match(/at ([^\n]*)/)[1]).replace(/.*\/gangho\//, '') : '')));   // 어디서 났는지 한 줄
  p.on('console', m => m.type() === 'error' && !/ERR_CERT|ERR_FILE_NOT_FOUND|ERR_NAME|ERR_INTERNET|net::|CORS policy/.test(m.text()) && errs.push(m.text()));
  return errs;
}
// 새 게임을 시작하고 행낭의 비급을 모두 익혀 장착한다
async function startEquipped(p) {
  await p.click('#begin');
  await p.evaluate(() => { for (const k of Object.keys(S.inv).filter(k => ITEMS[k].kind === '비급')) learnManual(k); for (const id of Object.keys(S.manuals)) equipManual(id); ui.tab = 'sect'; ui.sectSub = 'hall'; render(); });
}
const VIEWPORTS = [[1280, 900], [390, 844]];
// 전투는 fight()가 한 판을 끝까지 계산한다. 검사에서는 fightSync(eid)로 부른다 (탐험 밖에서 전투 하나만 시험할 때).
// 강호행 한 번을 바로 치를 때는 runExpedition(t, 걸음 수)
async function newPage(browser, w, h) {
  const p = await browser.newPage({ viewport: { width: w, height: h } });
  await testHelpers(p);
  return p;
}
/* 검사용 함수를 페이지에 심는다 (fightSync · runExpedition) */
async function testHelpers(p) {
  await p.addInitScript(() => {
    window.fightSync = eid => fight(eid);
    // 강호행 한 번을 바로 끝까지: 출발 → 걸음 steps번 → 살아 있으면 귀환. 끝난 기록을 돌려준다
    window.runExpedition = (t = now(), steps = 8) => {
      const rec = startRun(t); if (!rec) return null;
      while (rec.live && rec.steps.length < steps) advanceRun(rec.next);
      if (rec.live) endRun(rec, rec.next, 'recall');
      return rec;
    };
  });
}
module.exports = { playwright, GAME_URL, ok, result, watchErrors, startEquipped, VIEWPORTS, newPage, testHelpers };
