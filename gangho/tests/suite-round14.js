/* 전방(廛房): 대사형 거래 분리, 청풍문 › 전방 상인, 구매/판매, 은자 부족 차단 */
'use strict';
const { ok, GAME_URL, watchErrors, VIEWPORTS, newPage, startEquipped } = require('./lib');

module.exports = async (b) => {
  for (const [w, h] of VIEWPORTS) {
    console.log(`\n=== ${w}px ===`);
    const p = await newPage(b, w, h);
    const errs = watchErrors(p);
    await p.goto(GAME_URL);
    await startEquipped(p);

    // 1. 대사형: 거래 없음, 안내 전담
    await p.click('[data-tab="sect"]');
    const hall = await p.evaluate(() => ({ store: document.querySelectorAll('[data-store], [data-buy], [data-sell], .store').length, guide: !!document.querySelector('[data-act="jounguide"]'), joun: [...document.querySelectorAll('.npc-head h3 .ko')].map(e => e.textContent).includes('조운') }));
    ok('1 정청 대사형: 매매 버튼·창고 없음', hall.store === 0 && hall.joun, JSON.stringify(hall));
    ok('1 시스템에 옛 창고 함수 없음', await p.evaluate(() => typeof buyStore === 'undefined' && typeof JOUN_SHOP === 'undefined'));
    await p.click('[data-act="jounguide"]');
    const g = await p.evaluate(() => S.log[S.log.length - 1].text);
    ok('1 [문파 안내] → 대사형이 할 일을 짚어 줌', /^조운: "/.test(g), g);
    const g2 = await p.evaluate(() => { give('bk_cpSim', 1, true); jounGuide(); const t = S.log[S.log.length - 1].text; take('bk_cpSim', 1); return t; });
    ok('1 안내는 상황에 맞게 (비급 있으면 익히기 안내)', /상태 탭의 무공에서 \[ 익히기 \]/.test(g2), g2);

    // 2. 청풍문 › 전방
    const subs = await p.$$eval('.subtabs .subtab', els => els.map(e => e.dataset.sub).join(','));
    ok('2 서브탭 순서: 정청 | 화로 | 뒷마당 | 연무장 | 무신상 | 전방', subs === 'hall,forge,yard,yeonmu,shrine,shop', subs);
    await p.click('.subtabs [data-sub="shop"]');
    const shop = await p.evaluate(() => ({ head: document.querySelector('.shop-panel .panel-head .ko').textContent, npc: document.querySelector('.shop-panel .npc-head h3').textContent, mode: document.querySelector('.shop-mode .subtab.on').dataset.shopmode, items: document.querySelectorAll('[data-buy]').length, gear: document.querySelectorAll('[data-buygear]').length, purse: document.querySelector('.shop-panel .purse').textContent }));
    ok('2 청풍전방 왕 가 인터페이스', shop.head === '청풍전방' && /왕 가/.test(shop.npc) && /청풍전방 주인/.test(shop.npc), JSON.stringify(shop));
    ok('3 구매 탭: 소모품·재료 + 기본 장비 진열, 소지 은자 표시', shop.mode === 'buy' && shop.items >= 10 && shop.gear >= 8 && /은자/.test(shop.purse), JSON.stringify(shop));

    // 3. 구매: 은자 차감 + 행낭 반영
    const buy = await p.evaluate(() => { S.silver = 100; const n0 = count('potionHp'); document.querySelector('[data-buy="potionHp"]').click(); return { silver: S.silver, got: count('potionHp') - n0, log: S.log[S.log.length - 1].text }; });
    ok('3 구매: 은자 -15, 금창약 +1', buy.silver === 85 && buy.got === 1 && /전방에서/.test(buy.log), JSON.stringify(buy));
    const bg = await p.evaluate(() => { S.silver = 100; const g0 = S.gear.length; document.querySelector('[data-buygear="g_straightSword:1"]').click(); const it = S.gear[S.gear.length - 1]; return { silver: S.silver, added: S.gear.length - g0, name: it.name, rarity: it.rarity, named: it.named }; });
    ok('3 하급 장비 구매 → 행낭 보관 장비', bg.silver === 55 && bg.added === 1 && bg.name === '직도형 박검' && bg.rarity === 0 && bg.named === 'g_straightSword', JSON.stringify(bg));

    // 은자 부족: 구매 차단 + 견문록 오류
    const poor = await p.evaluate(() => { S.silver = 3; const n0 = count('potionHp'), g0 = S.gear.length; document.querySelector('[data-buy="potionHp"]').click(); const l1 = S.log[S.log.length - 1]; document.querySelector('[data-buygear="g_hunterCoat:1"]').click(); const l2 = S.log[S.log.length - 1];
      return { silver: S.silver, got: count('potionHp') - n0, gear: S.gear.length - g0, l1: l1.text, c1: l1.cls, l2: l2.text, dom: document.querySelector('#log p').className, short: document.querySelector('[data-buy="potionHp"]').classList.contains('short') }; });
    ok('3 은자 부족 → 구매 차단 (은자·행낭 그대로)', poor.silver === 3 && poor.got === 0 && poor.gear === 0, JSON.stringify(poor));
    ok('3 은자 부족 → 견문록 오류 기록', /은자가 부족해 금창약/.test(poor.l1) && poor.c1 === 'bad' && /사냥꾼 가죽옷/.test(poor.l2) && poor.dom === 'bad', poor.l1);
    ok('3 모자란 품목은 흐리게 표시', poor.short);

    // 행낭이 가득 차면 은자를 받지 않음
    const full = await p.evaluate(() => { S.silver = 100; delete S.inv.salt; const g0 = S.gear.length; while (bagUsed() < bagCap()) S.gear.push({ uid: -1, slot: 'ring', name: 'x', rarity: 0, stats: {} }); const r = buyItem('salt'); const s = S.silver, bought = count('salt'); S.gear.length = g0; return { s, r, bought }; });
    ok('3 행낭이 가득 차면 (새 칸 필요한 물건) 은자 차감 없음', full.s === 100 && full.bought === 0, JSON.stringify(full));

    // 3. 판매
    await p.click('[data-shopmode="sell"]');
    const sell = await p.evaluate(() => {
      Object.assign(S.inv, { boarHide: 3 }); render();
      const rows = [...document.querySelectorAll('[data-sell]')].map(e => e.dataset.sell);
      const s0 = S.silver; document.querySelector('[data-sell="boarHide"]').click(); const one = S.silver - s0, left = count('boarHide');
      const s1 = S.silver; document.querySelector('[data-sellall="boarHide"]').click(); const all = S.silver - s1;
      return { rows, one, left, all, gone: !S.inv.boarHide, noBook: !rows.some(id => ITEMS[id].kind === '비급' || ITEMS[id].kind === '증표'), unit: ITEMS.boarHide.price };
    });
    ok('3 판매 탭: 행낭 소지품 목록 (비급·증표 제외)', sell.rows.includes('boarHide') && sell.noBook, sell.rows.join(','));
    ok('3 1개 팔기 → 은자 += 단가, 행낭 -1', sell.one === sell.unit && sell.left === 2, JSON.stringify(sell));
    ok('3 전부 팔기 → 남은 수량 모두 환전, 행낭에서 사라짐', sell.all === sell.unit * 2 && sell.gone, JSON.stringify(sell));
    const sg = await p.evaluate(() => { const it = makeGear('blade', 2, 3, false); it.enh = 2; S.gear.push(it); render(); const s0 = S.silver; document.querySelector(`[data-sellgear="${it.uid}"]`).click(); return { got: S.silver - s0, gone: !S.gear.includes(it), worn: !document.querySelector(`[data-sellgear="${S.equip.weapon.uid}"]`), badge: !S.gear.some(g => g.shop) || ![...document.querySelectorAll('[data-sellgear]')].some(b => S.gear.find(g => g.uid === +b.dataset.sellgear).shop) }; });
    ok('3 보관 장비 판매: 티어·희귀도·강화 반영 (25×1.75×1.3=57)', sg.got === 57 && sg.gone && sg.worn && sg.badge, JSON.stringify(sg));

    ok('오류/가로스크롤 없음', errs.length === 0 && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), errs.join(' | '));
    await p.close();
  }
};
