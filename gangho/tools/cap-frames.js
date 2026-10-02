/* 연출 미리보기용 컷 뜨기 (예: 단조 강화 연출). 게임을 띄워 연출을 멈춘 뒤 애니메이션 시간을 40ms씩 옮기며 그 영역을 찍는다.
   다른 연출은 상태를 만드는 evaluate와 찍을 영역(clip)만 바꿔 쓴다. 컷을 10열 시트(webp)로 붙여 연출 미리보기(SCENES)에 넣는다 */
const { playwright, GAME_URL, testHelpers } = require('../tests/lib.js');
const OUT = process.argv[2] || '.', N = +process.argv[3] || 75, STEP = 40;   // 쓰는 법: node gangho/tools/cap-frames.js <출력 폴더> [컷 수]
(async () => { const br = await playwright.chromium.launch(); const p = await br.newPage({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2 }); await testHelpers(p);
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(GAME_URL); await p.waitForTimeout(400); await p.click('#begin'); await p.waitForTimeout(300);
  await p.evaluate(() => { S.silver = 5000; const base = Object.keys(GEAR_DB).find(k => GEAR_DB[k].slot === 'weapon');
    for (let i = 0; i < 3; i++) giveGear(makeNamedGear(base), true); window._m = S.gear.find(g => g.named === base); window._m.enh = 7; });
  await p.evaluate(() => { ui.tab='sect'; ui.sectSub='forge'; render(); }); await p.waitForTimeout(800);
  for (const kind of ['ok', 'same', 'boom']) {
    await p.evaluate(k => { const m = window._m; ui.tab = 'sect'; ui.sectSub = 'forge'; ui.craft = 'forge'; ui.forgeMode = 'gear';
      ui.enhMain = k === 'boom' ? null : m.uid; ui.enhResult = { kind: k, name: gearName({ ...m, enh: k === 'ok' ? 8 : 7 }), cost: 120, ico: gearIco(m, 'enh-ico'), enh: k === 'ok' ? 8 : 7, at: Date.now() }; render();
      window._anims = document.getAnimations().filter(a => a.effect && a.effect.target && a.effect.target.closest('.enh-stage, .result.enh-late')); window._anims.forEach(a => a.pause()); }, kind);
    await p.waitForTimeout(400);
    await p.evaluate(() => document.querySelector('.enh-stage').scrollIntoView({ block: 'center' }));
    for (let i = 0; i < N; i++) {
      await p.evaluate(t => window._anims.forEach(a => a.currentTime = t), i * STEP);
      const box = await p.evaluate(() => { const a = document.querySelector('.enh-stage').getBoundingClientRect(), b = document.querySelector('.forge-gear .result').getBoundingClientRect(); return { x: a.x, y: a.y, width: a.width, height: b.bottom - a.y }; });
      await p.screenshot({ path: `${OUT}/${kind}_${String(i).padStart(3, '0')}.png`, clip: box });
    }
  }
  console.log('errs', errs); await br.close(); })();
