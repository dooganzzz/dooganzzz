/* 종합 전투력: 연산 공식 · 거울 값 갱신(장비·능력치·돌파) · 헤더 표기와 변화량 · 상태 탭 카드 */
'use strict';
const { ok, GAME_URL, watchErrors, VIEWPORTS, newPage, startEquipped } = require('./lib');

module.exports = async (b) => {
  for (const [w, h] of VIEWPORTS) {
    console.log(`\n=== ${w}px ===`);
    const p = await newPage(b, w, h);
    const errs = watchErrors(p);
    await p.goto(GAME_URL);
    await startEquipped(p);

    // 1. 공식
    const f = await p.evaluate(() => {
      const st = calcStats();
      const arts = CAT_ORDER.reduce((a, c) => { const id = S.active[c]; return a + (id ? GRADES[MANUALS[id].grade].mult * S.manuals[id].star * 10 : 0); }, 0);
      const expect = Math.round(st.maxHp * 1.0 + st.maxMp * 1.5 + st.atk * 5.0 + st.def * 3.0 + arts);
      const parts = combatPowerParts(S);
      return { cp: calculateCombatPower(S), expect, sum: parts.base + parts.gear + parts.arts, total: parts.total, int: Number.isInteger(calculateCombatPower()) };
    });
    ok('1 calculateCombatPower = 활력×1 + 내력×1.5 + 공격×5 + 방어×3 + Σ(등급 계수×성×10)', f.cp === f.expect && f.int, JSON.stringify(f));
    ok('1 내역 합 ≈ 전투력 (반올림 차 ≤ 2)', Math.abs(f.sum - f.total) <= 2, JSON.stringify(f));
    ok('1 다른 상태 객체도 계산 · 전역 S는 그대로', await p.evaluate(() => { const copy = JSON.parse(JSON.stringify(S)); copy.manuals[copy.active.mugong].star = 12; const a = calculateCombatPower(copy), b0 = calculateCombatPower(S); return a > b0 && S.manuals[S.active.mugong].star !== 12; }));

    // gameState 거울 값 갱신: 장비 탈착 · 능력치 변동 · 돌파
    const m = await p.evaluate(() => {
      render(); const r = {}; r.sync0 = S.combatPower === calculateCombatPower(S);
      const cp0 = S.combatPower; unequip('weapon'); r.unequip = S.combatPower < cp0 && S.combatPower === calculateCombatPower(S);
      const cp1 = S.combatPower; const uid = S.gear[S.gear.length - 1].uid; equipItem(uid); r.equip = S.combatPower > cp1;
      const cp2 = S.combatPower; S.perm.maxHp += 40; useItem('potionHp'); r.perm = S.combatPower === cp2 + 40 || S.combatPower > cp2;
      return r;
    });
    ok('1 S.combatPower: 처음부터 계산값과 같음', m.sync0);
    ok('1 장비 해제 → 즉시 감소 · 착용 → 증가', m.unequip && m.equip, JSON.stringify(m));
    ok('1 능력치 변동(최대 활력 +40) → 반영', m.perm, JSON.stringify(m));
    const br = await p.evaluate(() => {
      const id = S.active.simbeop, mm = S.manuals[id], before = S.combatPower, g = GRADES[MANUALS[id].grade].mult;
      toggleTraining('simbeop'); mm.txp = need(mm.star); mm.cxp = needC(mm.star); tryStar(id);
      return { before, after: S.combatPower, star: mm.star, g };
    });
    await p.waitForTimeout(1100);                                  // 돌파 뒤 다음 틱까지
    const br2 = await p.evaluate(() => ({ now: S.combatPower, calc: calculateCombatPower(S) }));
    ok('1 성급 돌파 → 틱 안에 거울 값 갱신', br2.now === br2.calc && br2.now > br.before, JSON.stringify({ br, br2 }));

    // 2. 상단 헤더 · 변화량
    const hd = await p.evaluate(() => { const el = document.querySelector('#status .cp'); return { text: el.textContent, title: el.title, cp: fmt(calculateCombatPower(S)) }; });
    ok('2 헤더 상시 표기 (은자 옆 소형)', hd.text.startsWith('戰' + hd.cp) && hd.title === '종합 전투력', JSON.stringify(hd));
    const dl = await p.evaluate(() => { unequip('weapon'); const d = document.querySelector('#status .cp-delta'); const r = { down: d && d.classList.contains('down') && d.textContent.startsWith('▼') }; equipItem(S.gear[S.gear.length - 1].uid); const u = document.querySelector('#status .cp-delta'); r.up = u && u.classList.contains('up'); return r; });
    ok('2 전투력이 바뀌면 ▲/▼ 변화량 잠깐 표시', dl.down && dl.up, JSON.stringify(dl));
    ok('2 변화량은 잠시 뒤 사라짐 (2.5초)', await p.waitForFunction(() => !document.querySelector('#status .cp-delta'), null, { timeout: 4500 }).then(() => true, () => false));

    // 2. 상태 탭 맨 위 카드
    await p.click('[data-tab="status"]');
    const card = await p.evaluate(() => { const c = document.querySelector('#main > .cp-card'); return c && { first: document.querySelector('#main').firstElementChild === c, value: c.querySelector('.cp-value').textContent, cp: fmt(calculateCombatPower(S)), parts: c.querySelectorAll('.cp-parts span').length, label: c.querySelector('.cp-label .ko').textContent }; });
    ok('2 상태 탭 최상단 전투력 카드 (내역 3가지)', card && card.first && card.value === card.cp && card.parts === 3 && card.label === '전투력', JSON.stringify(card));
    await p.click('[data-sub="martial"]');
    ok('2 무공 하위 탭에서도 카드 유지', await p.evaluate(() => document.querySelector('#main').firstElementChild.classList.contains('cp-card')));
    await p.click('[data-tab="bag"]');
    ok('2 다른 탭에는 카드 없음', await p.evaluate(() => !document.querySelector('.cp-card')));

    ok('오류/가로스크롤 없음', errs.length === 0 && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), errs.join(' | '));
    await p.close();
  }
};
