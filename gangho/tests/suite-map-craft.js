/* 사냥터 생성, 기예 재료 분류, 실전 경험치, 초기화 */
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
  // 7·8 generator stats
  if (w === 1280) {
    const g = await p.evaluate(() => {
      const agg = { runs: 0, bad: [] , min: {}, max: {}, pathPct: [] };
      for (const zid of ZONE_ORDER) for (let i = 0; i < 300; i++) {
        const { layout, start } = generateLayout(ZONES[zid]); agg.runs++;
        const cnt = {}; let nodes = 0, adjBad = 0, kpos;
        layout.forEach((r, y) => [...r].forEach((c, x) => { if (c !== '_') nodes++; cnt[c] = (cnt[c] || 0) + 1; if (c === 'K') kpos = `${x},${y}`;
          if ('YHMCG'.includes(c)) { const n = neighbors8(x, y).filter(([nx, ny]) => 'YHMCG'.includes(layout[ny][nx])).length; if (n > 3) adjBad++; } }));
        const seen = reachable(layout, ...start);
        if (layout.length !== 10 || layout.some(r => r.length !== 12)) agg.bad.push('size');
        if (seen.size !== nodes) agg.bad.push('disconnected');
        if (kpos !== '11,0') agg.bad.push('boss@' + kpos);
        if (!(start[0] <= 1 && start[1] >= 7)) agg.bad.push('start@' + start);
        if (adjBad) agg.bad.push('clumped');
        const c = { beast: cnt.Y || 0, herb: cnt.H || 0, mine: cnt.M || 0, chest: cnt.C || 0, trap: cnt.T || 0, boss: cnt.K || 0 };
        for (const [k, v] of Object.entries(c)) { agg.min[k] = Math.min(agg.min[k] ?? 99, v); agg.max[k] = Math.max(agg.max[k] ?? 0, v); }
        agg.pathPct.push(((cnt.o || 0) + (cnt.T || 0)) / 120 * 100);
      }
      agg.pmin = Math.min(...agg.pathPct).toFixed(1); agg.pmax = Math.max(...agg.pathPct).toFixed(1); agg.pavg = (agg.pathPct.reduce((a, b) => a + b) / agg.pathPct.length).toFixed(1);
      delete agg.pathPct; agg.bad = [...new Set(agg.bad)];
      return agg;
    });
    ok('7 12×10 / 입구 좌하 / 두목 우상 / 전 노드 연결 (900회 생성)', g.bad.length === 0, g.bad.join(','));
    ok('8 수량: 요수 23~27, 금고 19~23 (약초·광맥 통합), 숨은 함정 4~6, 두목 1', g.min.beast >= 23 && g.max.beast <= 27 && g.max.herb === 0 && g.max.mine === 0 && g.min.chest >= 19 && g.max.chest <= 23 && g.min.trap >= 4 && g.max.trap <= 6 && g.min.boss === 1 && g.max.boss === 1, JSON.stringify({ min: g.min, max: g.max }));
    ok('8 보이는 산길 약 50% (120칸 대비, 함정 포함)', g.pavg >= 45 && g.pavg <= 55, `평균 ${g.pavg}% (최소 ${g.pmin}, 최대 ${g.pmax})`);
    ok('8 이벤트가 한곳에 몰리지 않음 (주변 8칸 중 이벤트 3개 이하)', !g.bad.includes('clumped'));
    const rc = await p.evaluate(() => RECIPES.filter(r => Object.keys(r.in).some(id => ITEMS[id].craftType !== CRAFT_TYPE[r.craft])).map(r => r.id));
    ok('6 레시피 재료가 한 분류뿐', rc.length === 0, rc.join(','));
    const un = await p.evaluate(() => Object.entries(ITEMS).filter(([, I]) => I.kind === '재료' && !I.craftType).map(([id]) => id));
    ok('6 모든 재료에 craftType', un.length === 0, un.join(','));
  }
  // 1
  await p.click('[data-tab="yard"]');
  const yard = await p.$eval('#main', e => e.textContent);
  ok('1 아린 조합법 물어보기 제거', !/조합법 물어보기|레시피 힌트/.test(yard) && !(await p.$('[data-act="hint"]')));
  ok('1 약과·대화만', !!(await p.$('[data-act="snack"]')) && !!(await p.$('[data-act="talk"]')));
  // 5
  await p.click('[data-tab="field"]');
  const z1 = await p.$$eval('.zone h3 .ko', e => e.map(x => x.textContent).join(','));
  ok('5 초기 청풍산만', z1 === '청풍산', z1);
  await p.evaluate(() => { S.flags.boss1 = true; render(); });
  ok('5 멧돼지왕 처치 후 염화채 등장', (await p.$$eval('.zone h3 .ko', e => e.map(x => x.textContent).join(','))) === '청풍산,염화채');
  await p.evaluate(() => { S.flags.boss1 = false; render(); });
  // 2
  await p.click('[data-zone="cheongpung"]');
  const cen = await p.evaluate(() => { const box = document.querySelector('#mapScroll'), h = box.querySelector('.cell.here'); const b = box.getBoundingClientRect(), r = h.getBoundingClientRect(); return { fits: box.scrollWidth <= box.clientWidth + 1 || Math.abs((r.left + r.width / 2) - (b.left + b.width / 2)) < b.width / 2, cell: Math.round(r.width) }; });
  ok('8 노드 크기 유지 + 현재 위치 보임', cen.cell >= 40 && cen.fits, `칸 ${cen.cell}px`);
  const xp = await p.evaluate(() => {
    const before = CAT_ORDER.map(c => S.manuals[S.active[c]].cxp);
    S.hp = 99999; const win = fightSync('boar').win; closeBattle();
    const after = CAT_ORDER.map(c => S.manuals[S.active[c]].cxp);
    return { win, diff: after.map((v, i) => v - before[i]) };
  });
  ok('2 승리당 실전 +1 고정', xp.win && xp.diff.every(d => d === 1), JSON.stringify(xp));
  // 6 forge filter
  await p.evaluate(() => { leaveZone(); Object.assign(S.inv, { iron: 2, herb: 2, rabbitMeat: 2, wood: 1, salt: 1 }); ui.tab = 'forge'; render(); });
  const ITEMS_CT = await p.evaluate(() => Object.fromEntries(Object.entries(ITEMS).map(([k, v]) => [k, v.craftType])));
  const f = {};
  for (const c of ['forge', 'alchemy', 'cook']) { await p.click(`[data-craft="${c}"]`); f[c] = await p.$$eval('[data-add]', e => e.map(x => x.dataset.add).join(',')); }
  ok('6 주조 재료만', f.forge.split(',').every(id => ['iron','wood','boarHide','boarTusk','rabbitHide','dogFang'].includes(id)) && !/herb|rabbitMeat|salt/.test(f.forge), f.forge);
  ok('6 연단 재료만', f.alchemy.split(',').every(id => ITEMS_CT[id] === 'alchemy'), f.alchemy);
  ok('6 조리 재료만', f.cook.split(',').every(id => ITEMS_CT[id] === 'cooking'), f.cook);
  await p.click('[data-craft="cook"]'); await p.click('[data-add="salt"]'); await p.click('[data-craft="forge"]');
  ok('6 탭 전환 시 슬롯 초기화', await p.evaluate(() => potTotal() === 0));
  // 4
  await p.evaluate(() => { toggleTraining('gigong'); ui.tab = 'yeonmu'; render(); });
  const sh = await p.evaluate(() => { const a = document.querySelectorAll('.progress-fill.training-active'); return { n: a.length, anim: a[0] && getComputedStyle(a[0]).animationName, inTraining: a[0] && !!a[0].closest('.art.training') }; });
  ok('4 수련 중 1개 바만 애니메이션', sh.n === 1 && sh.anim === 'trainingFlow' && sh.inTraining, JSON.stringify(sh));
  await p.evaluate(() => { toggleTraining('gigong'); });
  ok('4 정지 시 해제', (await p.$$('.progress-fill.training-active')).length === 0);
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
