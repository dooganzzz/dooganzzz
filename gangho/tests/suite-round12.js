/* 상태(狀態) 탭: 1차 탭 재구성, [ 무장 ] / [ 무공 ] 하위 탭, 안내 지문, 좁은 화면 탭 바 */
'use strict';
const { ok, GAME_URL, watchErrors, VIEWPORTS, newPage } = require('./lib');

module.exports = async (b) => {
  for (const [w, h] of VIEWPORTS) {
    console.log(`\n=== ${w}px ===`);
    const p = await newPage(b, w, h);
    const errs = watchErrors(p);
    await p.goto(GAME_URL);
    await p.click('#begin');

    // 1. 1차 탭 (청풍문 개편 뒤: 청풍문 · 상태 · 행낭 · 강호행 · 도감)
    const tabs = await p.$$eval('#tabs .tab', els => els.map(e => [e.dataset.tab, e.querySelector('.ko').textContent, e.querySelector('.hj').textContent]));
    ok('1 상태 탭은 청풍문 바로 오른쪽', tabs[0][0] === 'sect' && tabs[1][0] === 'status' && tabs[1][2] === '狀態', tabs.map(t => t[1]).join(','));
    ok('1 무공·무장 독립 탭 없음', !tabs.some(t => ['martial', 'gear'].includes(t[0]) || ['무공', '무장'].includes(t[1])));
    const bar = await p.evaluate(() => { const t = document.querySelector('#tabs'); const r = [...t.querySelectorAll('.tab')].map(e => e.getBoundingClientRect()); return { over: t.scrollWidth - t.clientWidth, inView: r.every(x => x.left >= 0 && x.right <= innerWidth + 0.5) }; });
    ok('1 탭 바 가로 스크롤 없음 · 모두 화면 안', bar.over <= 0 && bar.inView, JSON.stringify(bar));

    // 3. 안내 지문
    const arin = await p.evaluate(() => S.log.map(l => l.text).find(t => t.startsWith('아린:')));
    ok('3 아린: 상태 탭의 무공 안내', /비급부터 익혀요\. 상태 탭의 무공에 있어요/.test(arin), arin);
    ok('3 옛 안내(무장 탭 행낭·무공 탭) 없음', await p.evaluate(() => !document.body.textContent.match(/무장 탭|무공 탭/)));

    // 2. 하위 탭
    await p.click('[data-tab="status"]');
    const s1 = await p.evaluate(() => ({ subs: [...document.querySelectorAll('.subtabs .subtab .ko')].map(e => e.textContent).join(','), on: document.querySelector('.subtab.on .ko').textContent, sel: document.querySelector('.subtab.on').getAttribute('aria-selected'), doll: !!document.querySelector('.paperdoll'), slots: document.querySelectorAll('.dslot').length, mslots: document.querySelectorAll('.mslot').length, bagList: !!document.querySelector('.items, [data-filter]') }));
    ok('2 하위 탭 [ 무장 ] / [ 무공 ]', s1.subs === '무장,무공', s1.subs);
    ok('2 처음엔 무장: 착용 장비 슬롯 (행낭 목록은 따로)', s1.on === '무장' && s1.sel === 'true' && s1.doll && s1.slots >= 9 && s1.mslots === 0 && !s1.bagList, JSON.stringify(s1));
    await p.click('[data-sub="martial"]');
    const s2 = await p.evaluate(() => ({ on: document.querySelector('.subtab.on .ko').textContent, tab: document.querySelector('.tab.on .ko').textContent, mslots: [...document.querySelectorAll('.mslot .mslot-cat .ko')].map(e => e.textContent).join(','), books: document.querySelectorAll('.chips [data-use^="bk_"]').length, doll: !!document.querySelector('.paperdoll') }));
    ok('2 무공: 4대 무공 슬롯 + 보유 비급', s2.on === '무공' && s2.tab === '상태' && s2.mslots === '무공,심법,경공,기공' && s2.books === 4 && !s2.doll, JSON.stringify(s2));
    for (const k of ['bk_samjaeGeom', 'bk_tonap', 'bk_pocheolsak', 'bk_cheolpo']) await p.click(`[data-use="${k}"]`);
    const s3 = await p.evaluate(() => ({ learned: document.querySelectorAll('.mcard').length, on: document.querySelector('.subtab.on .ko').textContent }));
    ok('2 무공에서 바로 익히기 → 익힌 무공 목록, 하위 탭 유지', s3.learned === 4 && s3.on === '무공', JSON.stringify(s3));

    // 다른 탭에 다녀와도 마지막 하위 탭 기억
    await p.click('[data-tab="sect"]'); await p.click('[data-sub="hall"]'); await p.click('[data-tab="status"]');
    ok('2 마지막 하위 탭 기억', await p.$eval('.subtab.on .ko', e => e.textContent) === '무공');
    await p.click('[data-sub="gear"]');
    ok('2 무장으로 전환', await p.evaluate(() => !!document.querySelector('.paperdoll') && ui.statusSub === 'gear'));

    // 탐험 결산 창의 [성급 올리러 가기] → 상태 › 무공
    await p.evaluate(() => { S.expedition.zone = 'cheongpung'; S.stamina = 100; const r = runExpedition(now()); ui.modal = 'settle:' + r.id; render(); });
    await p.click('.settle-sheet [data-tab="status"][data-sub="martial"]');
    ok('2 결산 창 [성급 올리러 가기] → 상태 › 무공 (창 닫힘)', await p.evaluate(() => ui.tab === 'status' && document.querySelector('.subtab.on .ko').textContent === '무공' && !ui.modal));

    ok('오류/가로스크롤 없음', errs.length === 0 && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), errs.join(' | '));
    await p.close();
  }
};
