/* 재료 단서, 조운의 창고, 장비 강화 */
'use strict';
const { ok, GAME_URL, watchErrors, startEquipped, VIEWPORTS, newPage } = require('./lib');

module.exports = async (b) => {
  for (const [w, h] of VIEWPORTS) {
    console.log(`\n=== ${w}px ===`);
    const p = await newPage(b, w, h);
    const errs = watchErrors(p);
    await p.goto(GAME_URL);
    await startEquipped(p);

    // 2. 재료 단서
    const clue = await p.evaluate(() => {
      S.crafts.cook.lv = 99; ui.tab = 'sect'; ui.sectSub = 'forge'; ui.craft = 'cook';
      for (let i = 0; i < 20 && !S.codex.includes('c_rabbit'); i++) { Object.assign(S.inv, { rabbitMeat: 1, salt: 1 }); ui.pot = { rabbitMeat: 1, salt: 1 }; doCraft(ui.craft, ui.pot); }   // 성공률 상한 98%
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

    // 4. 조운의 창고, 장비 강화
    const shop = await p.evaluate(() => { S.silver = 1000; const n0 = count('potionHp'); buyStore('potionHp'); return { spent: 1000 - S.silver, got: count('potionHp') - n0 }; });
    ok('4 조운의 창고에서 은자로 구매', shop.spent === 15 && shop.got === 1, JSON.stringify(shop));
    const enh = await p.evaluate(() => {
      S.silver = 99999; const atk0 = calcStats().atk, w = S.equip.weapon;
      for (let i = 0; i < 40 && (w.enh || 0) < 3; i++) enhanceGear('weapon');
      return { enh: w.enh, atk0, atk1: calcStats().atk, spent: 99999 - S.silver };
    });
    ok('4 장비 강화: 단계·공격력 상승, 은자 소모', enh.enh === 3 && enh.atk1 > enh.atk0 && enh.spent > 0, JSON.stringify(enh));
    await p.evaluate(() => { ui.tab = 'status'; ui.statusSub = 'gear'; ui.slotSel = 'weapon'; render(); });
    ok('4 무장 화면 강화 버튼', !!(await p.$('[data-enhance="weapon"]')));
    await p.evaluate(() => { ui.tab = 'sect'; ui.sectSub = 'hall'; render(); });
    ok('4 정청에 조운의 창고', (await p.$$('[data-store]')).length >= 10);

    const ow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    ok('오류/가로스크롤 없음', !errs.length && !ow, errs.join(';'));
    await p.close();
  }
};
