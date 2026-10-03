/* 청풍문(淸風門) 1차 탭: 문파 시설은 전경 그림의 이름표로 옮겨 다님, 행낭 독립 */
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
    ok('1 1차 탭: 청풍문 | 관조 | 행낭 | 강호행 | 견문록 | 기연 | 도감 | 설정', tabs === '청풍문(淸風門) | 관조(觀照) | 행낭(行囊) | 강호행(江湖行) | 견문록(見聞錄) | 기연(奇緣) | 도감(圖鑑) | 설정(設定)', tabs);
    ok('1 정청·화로·뒷마당·무신상 1차 탭 없음', await p.evaluate(() => !['hall', 'yeonmu', 'forge', 'yard', 'shrine'].some(t => document.querySelector(`#tabs [data-tab="${t}"]`))));
    const bar = await p.evaluate(() => { const t = document.querySelector('#tabs'); return { over: t.scrollWidth - t.clientWidth, rows: new Set([...t.querySelectorAll('.tab')].map(e => Math.round(e.getBoundingClientRect().top))).size }; });
    ok('1 탭 바 가로 스크롤 없음 · PC 한 줄 (모바일은 두 줄까지)', bar.over <= 0 && bar.rows <= (w < 600 ? 2 : 1), JSON.stringify(bar));

    // 2. 청풍문: 갈래 메뉴 없이 전경 그림의 이름표로만 옮겨 다닌다 (10월 3일)
    await p.click('[data-tab="status"]'); await p.click('[data-tab="sect"]');
    const s0 = await p.evaluate(() => ({ bar: document.querySelectorAll('.subtabs:not(.lib-tabs)').length, tags: [...document.querySelectorAll('.ground-tag')].map(e => e.getAttribute('aria-label')).join(','), top: document.querySelector('.tab.on .ko').textContent }));
    ok('2 갈래 메뉴 없음 · 전경 이름표 [정청 화로 무신상 전방 연무장 산문]', s0.bar === 0 && s0.tags === '정청,화로,무신상,전방,연무장,산문' && s0.top === '청풍문', JSON.stringify(s0));
    const views = { forge: '.furnace', yeonmu: '.yeonmu', shrine: '.altar', shop: '.shop-panel', hall: '.npc-head' };
    for (const [sub, sel] of Object.entries(views)) {
      await p.click('[data-tab="sect"]'); await p.click(`.ground-tag[data-sub="${sub}"]`);
      const r = await p.evaluate(s => ({ view: !!document.querySelector(s), top: document.querySelector('.tab.on').dataset.tab, scr: screen() }), sel);
      ok(`2 [${sub}] 이름표를 누르면 해당 시설 화면으로`, r.view && r.top === 'sect' && r.scr === sub, JSON.stringify(r));
    }
    await p.click('[data-tab="codex"]'); await p.click('[data-tab="sect"]');
    ok('2 청풍문 탭을 누르면 다시 전경', await p.evaluate(() => screen() === 'grounds' && !!document.querySelector('.map-box.grounds')));

    // 행낭 독립 / 상태 › 무장에는 행낭 목록 없음
    await p.click('[data-tab="bag"]');
    const bag = await p.evaluate(() => ({ head: document.querySelector('.panel-head .ko').textContent, filters: document.querySelectorAll('[data-filter]').length, doll: !!document.querySelector('.paperdoll'), sub: !!document.querySelector('.subtabs') }));
    ok('행낭 탭: 소지품 목록·분류, 장비 인형 없음', bag.head === '행낭' && bag.filters === 6 && !bag.doll && !bag.sub, JSON.stringify(bag));
    await p.click('[data-tab="status"]'); await p.click('[data-sub="observe"]');
    ok('상태 › 관조: 장비 슬롯 (행낭 목록 없음)', await p.evaluate(() => !!document.querySelector('.paperdoll') && !document.querySelector('[data-filter]')));

    // 탐험 중에도 문파 시설은 언제든 쓸 수 있다 (제자가 알아서 다녀온다)
    await p.evaluate(() => { S.expedition.zone = 'cheongpung'; S.expedition.nextAt = now() + 60000; render(); });
    await p.click('[data-tab="sect"]'); await p.click('.ground-tag[data-sub="shop"]');
    ok('탐험지가 정해져 있어도 시설은 그대로 (귀환 안내 없음)', await p.evaluate(() => !!document.querySelector('.shop-panel') && !document.querySelector('[data-act="leave"]')));

    // 도감 → 화로 채우기는 청풍문 › 화로로
    await p.evaluate(() => { S.codex.push('a_saeng'); openRecipe('a_saeng'); });
    await p.click('[data-fill="a_saeng"]');
    ok('도감 [화로 채우기] → 청풍문 › 화로', await p.evaluate(() => ui.tab === 'sect' && screen() === 'forge' && !!document.querySelector('.forge')));

    ok('오류/가로스크롤 없음', errs.length === 0 && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), errs.join(' | '));
    await p.close();
  }
};
