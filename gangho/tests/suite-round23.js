/* 12개 지시서 후속 · 화로 탭별 재료 필터: 신분패 +5/+10 · 도감 완성 보상 · 무장/무공 슬롯 팝업 · 관찰 3초 · 화로 재료는 그 기예 조합식 재료만 */
'use strict';
const { ok, GAME_URL, watchErrors, startEquipped, VIEWPORTS, newPage } = require('./lib');

module.exports = async (b) => {
  for (const [w, h] of VIEWPORTS) {
    console.log(`\n=== ${w}px ===`);
    const p = await newPage(b, w, h);
    const errs = watchErrors(p);
    await p.goto(GAME_URL);
    await startEquipped(p);

    // 1. 신분패 · 관찰 템포
    const bd = await p.evaluate(() => ({ b2: SHOP_GEAR.find(g => g.id === 'badge2').stats.train, b3: SHOP_GEAR.find(g => g.id === 'badge3').stats.train, rp: RP_MS }));
    ok('1 신분패: 정식제자패 +5% · 내문제자패 +10%', bd.b2 === 5 && bd.b3 === 10, JSON.stringify(bd));
    ok('1 관찰하기 기본 템포 한 합 3초', bd.rp === 3000, JSON.stringify(bd));

    // 2. 도감 완성 보상: 청풍산 요수를 모두 만나면 체력 +1 · 활력 +20
    const cr = await p.evaluate(() => {
      delete S.codexRewards.cheongpung;
      const hp0 = calcStats().maxHp, con0 = attrOf('con');
      for (const e of [...ZONES.cheongpung.enemies, ZONES.cheongpung.boss]) S.bestiary[e] = S.bestiary[e] || { met: 1, kills: 0 };
      checkAreaEncyclopediaCompletion('cheongpung');
      return { got: !!S.codexRewards.cheongpung, hp: calcStats().maxHp - hp0, con: attrOf('con') - con0, log: S.log.some(l => /도감 완성/.test(l.text)) };
    });
    ok('2 청풍산 도감 완성 → 체력 +1 · 활력 +20 이상 · 견문록 기록', cr.got && cr.con === 1 && cr.hp >= 20 && cr.log, JSON.stringify(cr));
    await p.click('[data-tab="codex"]');
    ok('2 도감에 [도감 완성] 표시', !!(await p.$('.codex-col.complete .codex-done')));

    // 3. 무장 · 무공 슬롯 팝업
    await p.click('[data-tab="status"]'); await p.click('[data-sub="gear"]');
    await p.click('[data-slot="weapon"]');
    ok('3 무장 슬롯 누르면 장비 팝업', await p.evaluate(() => ui.modal === 'equip:weapon' && !!document.querySelector('.sheet')));
    await p.click('.sheet [data-act="closemodal"]');
    await p.click('[data-sub="martial"]');
    await p.click('[data-artslot]');
    ok('3 무공 슬롯 누르면 무공 팝업', await p.evaluate(() => /^artslot:/.test(ui.modal) && !!document.querySelector('.sheet')));
    await p.click('.sheet [data-act="closemodal"]');

    // 4. 화로 탭별 재료 필터
    const fm = await p.evaluate(() => {
      Object.assign(S.inv, { herb: 2, roughOre: 2, treeSap: 2 });
      const valid = c => getFilteredMaterials(c).every(id => RECIPES.some(r => r.craft === c && r.in[id]));
      const r = { forge: getFilteredMaterials('forge'), alchemy: getFilteredMaterials('alchemy'), vf: valid('forge'), va: valid('alchemy') };
      // 단조 탭에서 단약 재료를 억지로 넣으려 해도 막힌다
      ui.tab = 'sect'; ui.sectSub = 'forge'; ui.craft = 'forge'; ui.pot = {}; render();
      const btn = document.createElement('button'); btn.dataset.add = 'herb'; document.querySelector('#main').appendChild(btn); btn.click();
      r.blocked = !ui.pot.herb; render();
      return r;
    });
    ok('4 getFilteredMaterials: 탭마다 그 기예 조합식 재료만', fm.vf && fm.va && fm.forge.includes('roughOre') && !fm.forge.includes('herb') && fm.alchemy.includes('herb') && !fm.alchemy.includes('roughOre') && fm.forge.includes('treeSap') && fm.alchemy.includes('treeSap'), JSON.stringify(fm));
    ok('4 다른 기예의 재료는 화로에 넣을 수 없음', fm.blocked);

    const ow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    ok('오류/가로스크롤 없음', !errs.length && !ow, errs.join(';'));
    await p.close();
  }
};
