/* 진행 속도, 재료 단서, 자동 공격, 조운의 창고, 장비 강화 */
'use strict';
const { ok, GAME_URL, watchErrors, startEquipped, VIEWPORTS } = require('./lib');

module.exports = async (b) => {
  for (const [w, h] of VIEWPORTS) {
    console.log(`\n=== ${w}px ===`);
    const p = await b.newPage({ viewport: { width: w, height: h } });
    const errs = watchErrors(p);
    await p.goto(GAME_URL);
    await startEquipped(p);

    // 1. 진행 속도: 소관문까지 수련 4시간 + 승리 30회
    const pace = await p.evaluate(() => {
      const r = {};
      r.wins = [[1, 3], [4, 7], [8, 11]].map(([a, z]) => { let n = 0; for (let st = a; st <= z; st++) n += needC(st); return n; });
      toggleTraining('mugong');
      const id = S.active.mugong;
      advance(4 * 3600 / trainBonus() - 60, true);
      r.beforeWins = { star: S.manuals[id].star, gate: S.manuals[id].gate };
      for (let i = 0; i < 30; i++) addXp(id, 'cxp', 1);
      advance(120, true);
      r.after = { star: S.manuals[id].star, gate: S.manuals[id].gate };
      return r;
    });
    ok('1 관문 구간 승리 수 30/80/160', pace.wins.join('/') === '30/80/160', pace.wins.join('/'));
    ok('1 수련만으로는 성이 오르지 않음', pace.beforeWins.star === 1, JSON.stringify(pace.beforeWins));
    ok('1 수련 4시간 + 승리 30회 → 소관문 도달', pace.after.star === 3 && pace.after.gate, JSON.stringify(pace.after));

    // 2. 재료 단서
    const clue = await p.evaluate(() => {
      Object.assign(S.inv, { rabbitMeat: 1, salt: 1 }); S.crafts.cook.lv = 99;
      ui.tab = 'forge'; ui.craft = 'cook'; ui.pot = { rabbitMeat: 1, salt: 1 }; doCraft();
      ui.tab = 'codex'; render();
      const clues = [...document.querySelectorAll('.ctile.clue')].map(e => e.dataset.recipe);
      const saltUses = RECIPES.filter(r => r.in.salt && r.id !== 'c_rabbit').map(r => r.id);
      return { known: Object.keys(S.knownMats || {}).sort().join(','), clues, saltUses, crafted: S.codex.includes('c_rabbit') };
    });
    ok('2 조합 성공 → 쓴 재료가 단서로 등록', clue.crafted && clue.known === 'rabbitMeat,salt', clue.known);
    ok('2 소금이 들어가는 조합식이 모두 단서로 표시', clue.saltUses.every(id => clue.clues.includes(id)), `${clue.clues.length}칸`);
    await p.click('.ctile.clue');
    const cm = await p.evaluate(() => ({ title: document.querySelector('.sheet h2').textContent, hidden: !!document.querySelector('.hidden-mat'), mats: [...document.querySelectorAll('.mats-list li span')].map(e => e.textContent).join(' | ') }));
    ok('2 단서 창: 완성품 + 아는 재료 + 가려진 재료', cm.hidden && /소금/.test(cm.mats), `${cm.title} — ${cm.mats}`);
    await p.click('[data-act="closemodal"]');
    await p.click('.ctile.locked');
    ok('2 단서 없는 칸은 미발견 안내', (await p.$$eval('.toast', e => e[e.length - 1].textContent)).includes('아직 발견하지 못한 비전'));

    // 3. 자동 공격
    const auto = await p.evaluate(() => {
      enterZone('cheongpung'); S.hp = 99999; startBattle('boar');
      const btn = !!document.querySelector('[data-act="auto"]');
      autoFight(); const over = ui.battle.over, win = ui.battle.win; closeBattle();
      S.hp = 99999; startBattle('boarKing'); const bossBtn = !!document.querySelector('[data-act="auto"]');
      ui.battle.over = true; closeBattle(); if (S.zone) leaveZone();
      return { btn, over, win, bossBtn };
    });
    ok('3 일반 몹 자동 공격으로 전투 종료', auto.btn && auto.over && auto.win);
    ok('3 두목전에는 자동 공격 없음', !auto.bossBtn);
    const stop = await p.evaluate(() => {
      enterZone('cheongpung'); startBattle('boar'); S.hp = Math.floor(calcStats().maxHp * 0.2);
      autoFight(); const r = { over: ui.battle.over, stopped: ui.battle.lines.some(l => l.text.includes('자동 공격을 멈춥니다')) };
      ui.battle.over = true; closeBattle(); if (S.zone) leaveZone(); S.hp = calcStats().maxHp; return r;
    });
    ok('3 활력 25% 미만이면 자동 공격 멈춤', !stop.over && stop.stopped);

    // 4. 조운의 창고, 장비 강화
    const shop = await p.evaluate(() => { S.silver = 1000; const n0 = count('potionHp'); buyStore('potionHp'); return { spent: 1000 - S.silver, got: count('potionHp') - n0 }; });
    ok('4 조운의 창고에서 은자로 구매', shop.spent === 15 && shop.got === 1, JSON.stringify(shop));
    const enh = await p.evaluate(() => {
      S.silver = 99999; const atk0 = calcStats().atk, w = S.equip.weapon;
      for (let i = 0; i < 40 && (w.enh || 0) < 3; i++) enhanceGear('weapon');
      return { enh: w.enh, atk0, atk1: calcStats().atk, spent: 99999 - S.silver };
    });
    ok('4 장비 강화: 단계·공격력 상승, 은자 소모', enh.enh === 3 && enh.atk1 > enh.atk0 && enh.spent > 0, JSON.stringify(enh));
    await p.evaluate(() => { ui.tab = 'bag'; ui.slotSel = 'weapon'; render(); });
    ok('4 무장 화면 강화 버튼', !!(await p.$('[data-enhance="weapon"]')));
    await p.evaluate(() => { ui.tab = 'hall'; render(); });
    ok('4 정청에 조운의 창고', (await p.$$('[data-store]')).length >= 10);

    const ow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    ok('오류/가로스크롤 없음', !errs.length && !ow, errs.join(';'));
    await p.close();
  }
};
