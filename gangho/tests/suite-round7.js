/* 조합 단서 폐지, 전방 구매, 장비 강화 */
'use strict';
const { ok, GAME_URL, watchErrors, startEquipped, VIEWPORTS, newPage } = require('./lib');

module.exports = async (b) => {
  for (const [w, h] of VIEWPORTS) {
    console.log(`\n=== ${w}px ===`);
    const p = await newPage(b, w, h);
    const errs = watchErrors(p);
    await p.goto(GAME_URL);
    await startEquipped(p);

    // 2. 단서 없음: 성공해도 다른 조합식의 재료를 알려 주지 않는다
    const clue = await p.evaluate(() => {
      S.crafts.cook.lv = 99; ui.tab = 'sect'; ui.sectSub = 'forge'; ui.craft = 'cook';
      for (let i = 0; i < 20 && !S.codex.includes('c_rabbit'); i++) { Object.assign(S.inv, { rabbitMeat: 1, salt: 1 }); ui.pot = { rabbitMeat: 1, salt: 1 }; doCraft(ui.craft, ui.pot); }   // 성공률 상한 98%
      ui.tab = 'codex'; render();
      return { known: 'knownMats' in S, clues: document.querySelectorAll('.ctile.clue, .hidden-mat').length, crafted: S.codex.includes('c_rabbit'), note: (S.craftNotes || []).some(n => n.ok && n.out === RECIPES.find(r => r.id === 'c_rabbit').out) };
    });
    ok('2 조합 성공 → 도감 등록 · 연구 노트에 성공 기록', clue.crafted && clue.note, JSON.stringify(clue));
    ok('2 재료 단서는 더 이상 없음', !clue.known && clue.clues === 0, JSON.stringify(clue));
    await p.click('.ctile.known');
    const cm = await p.evaluate(() => ({ title: document.querySelector('.sheet h2').textContent, hidden: !!document.querySelector('.hidden-mat'), mats: [...document.querySelectorAll('.mats-list li span')].map(e => e.textContent).join(' | ') }));
    ok('2 발견한 조합식 창: 재료 전부 공개', !cm.hidden && /소금/.test(cm.mats), `${cm.title} — ${cm.mats}`);
    await p.click('[data-act="closemodal"]');
    await p.click('.ctile.locked');
    ok('2 미발견 칸은 안내만', (await p.$$eval('.toast', e => e[e.length - 1].textContent)).includes('아직 발견하지 못한 비전'));

    // 4. 전방 구매, 장비 강화
    const shop = await p.evaluate(() => { S.silver = 1000; const n0 = count('potionHp'); buyItem('potionHp'); return { spent: 1000 - S.silver, got: count('potionHp') - n0 }; });
    ok('4 전방에서 은자로 구매', shop.spent === 15 && shop.got === 1, JSON.stringify(shop));
    const enh = await p.evaluate(() => {
      S.silver = 99999; const atk0 = calcStats().atk, w = S.equip.weapon;
      for (let i = 0; i < 40 && (w.enh || 0) < 3; i++) enhanceGear('weapon');
      return { enh: w.enh, atk0, atk1: calcStats().atk, spent: 99999 - S.silver };
    });
    ok('4 장비 강화: 단계·공격력 상승, 은자 소모', enh.enh === 3 && enh.atk1 > enh.atk0 && enh.spent > 0, JSON.stringify(enh));
    await p.evaluate(() => { ui.tab = 'status'; ui.statusSub = 'gear'; ui.slotSel = 'weapon'; render(); });
    ok('4 무장 화면 강화 버튼', !!(await p.$('[data-enhance="weapon"]')));
    await p.evaluate(() => { ui.tab = 'sect'; ui.sectSub = 'shop'; render(); });
    ok('4 청풍문 › 전방 진열', (await p.$$('[data-buy]')).length >= 10);

    const ow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    ok('오류/가로스크롤 없음', !errs.length && !ow, errs.join(';'));
    await p.close();
  }
};
