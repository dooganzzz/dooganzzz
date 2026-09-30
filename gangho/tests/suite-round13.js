/* 청풍문(淸風門) 1차 탭: 문파 시설을 2차 탭으로 통합, 행낭 독립 */
'use strict';
const { ok, GAME_URL, watchErrors, VIEWPORTS, newPage, startEquipped } = require('./lib');

module.exports = async (b) => {
  for (const [w, h] of VIEWPORTS) {
    console.log(`\n=== ${w}px ===`);
    const p = await newPage(b, w, h);
    const errs = watchErrors(p);
    await p.goto(GAME_URL);
    await startEquipped(p);

    // 1. 1차 탭
    const tabs = await p.$$eval('#tabs .tab', els => els.map(e => `${e.querySelector('.ko').textContent}(${e.querySelector('.hj').textContent})`).join(' | '));
    ok('1 1차 탭: 청풍문 | 상태 | 행낭 | 강호행 | 도감', tabs === '청풍문(淸風門) | 상태(狀態) | 행낭(行囊) | 강호행(江湖行) | 도감(圖鑑)', tabs);
    ok('1 정청·화로·뒷마당·무신상 1차 탭 없음', await p.evaluate(() => !['hall', 'yeonmu', 'forge', 'yard', 'shrine'].some(t => document.querySelector(`#tabs [data-tab="${t}"]`))));
    const bar = await p.evaluate(() => { const t = document.querySelector('#tabs'); return { over: t.scrollWidth - t.clientWidth, rows: new Set([...t.querySelectorAll('.tab')].map(e => Math.round(e.getBoundingClientRect().top))).size }; });
    ok('1 탭 바 한 줄 · 가로 스크롤 없음', bar.over <= 0 && bar.rows === 1, JSON.stringify(bar));

    // 2. 청풍문 2차 탭
    await p.click('[data-tab="status"]'); await p.click('[data-tab="sect"]');
    const s0 = await p.evaluate(() => ({ subs: [...document.querySelectorAll('.subtabs .subtab .ko')].map(e => e.textContent).join(','), on: document.querySelector('.subtab.on .ko').textContent, top: document.querySelector('.tab.on .ko').textContent, hall: !!document.querySelector('.npc-head') }));
    ok('2 하위 탭 [ 정청 ][ 화로 ][ 뒷마당 ][ 무신상 ][ 전방 ] (연무장 없음)', s0.subs === '정청,화로,뒷마당,무신상,전방', s0.subs);
    ok('2 기본 진입은 정청', s0.top === '청풍문' && s0.on === '정청' && s0.hall, JSON.stringify(s0));
    const views = { forge: '.forge', yard: '[data-act="rest"]', shrine: '.altar', shop: '.shop-panel', hall: '[data-fold="hq"]' };
    for (const [sub, sel] of Object.entries(views)) {
      await p.click(`.subtabs [data-sub="${sub}"]`);
      const r = await p.evaluate(s => ({ view: !!document.querySelector(s), top: document.querySelector('.tab.on').dataset.tab, on: document.querySelector('.subtab.on').dataset.sub, bar: document.querySelectorAll('.subtabs:not(.shop-mode)').length }), sel);
      ok(`2 [${sub}] 누르면 해당 시설 화면으로 교체`, r.view && r.top === 'sect' && r.on === sub && r.bar === 1, JSON.stringify(r));
    }
    await p.click('.subtabs [data-sub="forge"]'); await p.click('[data-tab="codex"]'); await p.click('[data-tab="sect"]');
    ok('2 다른 탭에 갔다 오면 다시 정청부터', await p.$eval('.subtab.on', e => e.dataset.sub) === 'hall');

    // 행낭 독립 / 상태 › 무장에는 행낭 목록 없음
    await p.click('[data-tab="bag"]');
    const bag = await p.evaluate(() => ({ head: document.querySelector('.panel-head .ko').textContent, filters: document.querySelectorAll('[data-filter]').length, doll: !!document.querySelector('.paperdoll'), sub: !!document.querySelector('.subtabs') }));
    ok('행낭 탭: 소지품 목록·분류, 장비 인형 없음', bag.head === '행낭' && bag.filters >= 8 && !bag.doll && !bag.sub, JSON.stringify(bag));
    await p.click('[data-tab="status"]'); await p.click('[data-sub="gear"]');
    ok('상태 › 무장: 장비 슬롯만', await p.evaluate(() => !!document.querySelector('.paperdoll') && !document.querySelector('[data-filter]')));

    // 탐험 중에도 문파 시설은 언제든 쓸 수 있다 (제자가 알아서 다녀온다)
    await p.evaluate(() => { S.expedition.zone = 'cheongpung'; S.expedition.nextAt = now() + 60000; render(); });
    await p.click('[data-tab="sect"]'); await p.click('.subtabs [data-sub="shop"]');
    ok('탐험지가 정해져 있어도 시설은 그대로 (귀환 안내 없음)', await p.evaluate(() => !!document.querySelector('.shop-panel') && !document.querySelector('[data-act="leave"]')));

    // 도감 → 화로 채우기는 청풍문 › 화로로
    await p.evaluate(() => { S.codex.push('a_hp'); openRecipe('a_hp'); });
    await p.click('[data-fill="a_hp"]');
    ok('도감 [화로 채우기] → 청풍문 › 화로', await p.evaluate(() => ui.tab === 'sect' && document.querySelector('.subtab.on').dataset.sub === 'forge' && !!document.querySelector('.forge')));

    ok('오류/가로스크롤 없음', errs.length === 0 && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), errs.join(' | '));
    await p.close();
  }
};
