/* 초식 시안(또는 확정본)을 실제 강호행 무대에서 컷으로 뜬다. 두루마리 외침부터 타격 · 소멸까지 40ms 간격.
   쓰는 법: node gangho/tools/cap-stance.js <출력 폴더> <초식 1|2|3> <무공id> [컷 webp 경로 | real] [solid|ink|hit]
     - 컷 webp 경로: 아직 게임에 안 넣은 시안 컷(chroma_cuts.py로 만든 것)을 그 무공 그림 자리에 끼워 찍는다. real이면 게임에 있는 그림 그대로.
     - solid|ink|hit: 시안의 겹치기 방식(MANUAL_SOLID · MANUAL_INK)이나 맞는 자리에서 터지기(MANUAL_HIT · 달려가 때리기)를 임시로 켠다.
   찍은 컷은 tools/frames-sheet.py로 10열 시트(webp)로 붙여 연출 미리보기(SCENES)에 올린다. */
const fs = require('fs');
const { playwright, GAME_URL, testHelpers } = require('../tests/lib.js');
const [OUT, N, MID, FILE = 'real', BLEND = ''] = process.argv.slice(2), STEP = 40;
(async () => {
  const br = await playwright.chromium.launch(); const p = await br.newPage({ viewport: { width: 1280, height: 900 } }); await testHelpers(p);
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.clock.install({ time: new Date('2026-10-02T10:00:00') });
  await p.goto(GAME_URL); await p.clock.pauseAt(new Date('2026-10-02T10:00:05')); await p.clock.runFor(500); await p.click('#begin'); await p.clock.runFor(500);
  await p.evaluate(([n, mid, file, blend]) => {
    if (blend === 'solid' && !MANUAL_SOLID.includes(mid)) MANUAL_SOLID.push(mid);
    if (blend === 'ink' && !MANUAL_INK.includes(mid)) MANUAL_INK.push(mid);
    if (blend === 'hit') { if (!MANUAL_HIT[mid]) MANUAL_HIT[mid] = 1; const i = MANUAL_SOLID.indexOf(mid); if (i >= 0) MANUAL_SOLID.splice(i, 1); }   // 빛 그림은 꽉 찬 그림 처리 없이
    if (file !== 'real') { const orig = ASSET.manual, f = 'file://' + file; ASSET.manual = (m, name) => m === mid ? ((n === '3' && name === 'ougi') || (n !== '3' && name === 'cut_' + n) ? f : null) : orig(m, name); }
    S.manuals[mid] = { star: MAX_STAR }; S.active[MANUALS[mid].cat] = mid;
    const w = MANUALS[mid].weapon; if (w && weaponType() !== w) { giveGear(libraryGear('lg_' + w), true); equipItem(S.gear[S.gear.length - 1].uid); }
    S.gmMove = +n - 1; S.hp = calcStats().maxHp; S.mp = calcStats().maxMp; S.expedition.zone = 'cheongpung'; startRun(now()); ui.tab = 'field'; ui.fieldMap = false; render();
  }, [N, MID, FILE.startsWith('/') ? FILE : FILE, BLEND]);
  const SEL = N === '3' ? '#liveScene .og-layer' : '#liveScene .stance-cut';
  let t = 0; while (t < 240000 && !(await p.$('#liveScene .co'))) { await p.clock.runFor(20); t += 20; }
  await p.evaluate(() => { window.__vt = 0; window.__seen = new WeakMap(); window.__sync = () => { for (const a of document.getAnimations()) { if (!__seen.has(a)) { __seen.set(a, __vt - (a.currentTime || 0)); a.pause(); } a.currentTime = __vt - __seen.get(a); } }; });
  fs.mkdirSync(OUT, { recursive: true }); const sc = await p.$('#liveScene'); let n = 0, tail = -1, saw = false;
  for (; n < 260; n++) {
    await p.evaluate(v => { __vt = v; __sync(); }, n * STEP);
    await sc.screenshot({ path: `${OUT}/f${String(n).padStart(3, '0')}.png` });
    await p.clock.runFor(STEP);
    const on = !!(await p.$(SEL)); if (on) saw = true; if (saw && tail < 0 && !on) tail = n + 10; if (tail >= 0 && n >= tail) break;
  }
  console.log(OUT, 'frames', n + 1, 'saw', saw, errs); await br.close();
})();
