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
      const parts = combatPowerParts(S);
      const geo = Math.round(CP_SCALE * Math.pow(Math.exp(parts.vs.reduce((a, v) => a + Math.log(v.value), 0) / parts.vs.length), CP_EXP));
      return { cp: calculateCombatPower(S), geo, total: parts.total, n: parts.vs.length, int: Number.isInteger(calculateCombatPower()), each: parts.vs.every(v => Math.abs(v.value - v.offense * Math.max(0.5, v.rounds + v.first)) < 1e-6) };
    });
    ok('1 투력 = 기준 상대 3명에게 (공세 × 수세) 기하평균 × CP_SCALE', f.cp === f.geo && f.n === 3 && f.each && f.int, JSON.stringify(f));
    ok('1 활력만 키우면 공수를 함께 키울 때보다 덜 오른다', await p.evaluate(() => { const c1 = JSON.parse(JSON.stringify(S)), c2 = JSON.parse(JSON.stringify(S)); c1.perm.maxHp += 400; c2.perm.maxHp += 200; c2.shrine.atk = (c2.shrine.atk || 0) + 30; return calculateCombatPower(c2) > calculateCombatPower(c1); }));
    ok('1 다른 상태 객체도 계산 · 전역 S는 그대로', await p.evaluate(() => { const copy = JSON.parse(JSON.stringify(S)); copy.manuals[copy.active.mugong].star = 12; const a = calculateCombatPower(copy), b0 = calculateCombatPower(S); return a > b0 && S.manuals[S.active.mugong].star !== 12; }));

    // gameState 거울 값 갱신: 장비 탈착 · 능력치 변동 · 돌파
    const m = await p.evaluate(() => {
      render(); const r = {}; r.sync0 = S.combatPower === calculateCombatPower(S);
      const cp0 = S.combatPower; unequip('weapon'); r.unequip = S.combatPower < cp0 && S.combatPower === calculateCombatPower(S);
      const cp1 = S.combatPower; const uid = S.gear[S.gear.length - 1].uid; equipItem(uid); r.equip = S.combatPower > cp1;
      const cp2 = S.combatPower; S.perm.maxHp += 40; useItem('saenghyeol'); r.perm = S.combatPower === cp2 + 40 || S.combatPower > cp2;
      return r;
    });
    ok('1 S.combatPower: 처음부터 계산값과 같음', m.sync0);
    ok('1 장비 해제 → 즉시 감소 · 착용 → 증가', m.unequip && m.equip, JSON.stringify(m));
    ok('1 능력치 변동(최대 활력 +40) → 반영', m.perm, JSON.stringify(m));
    const br = await p.evaluate(() => {
      const id = S.active.simbeop, mm = S.manuals[id], before = S.combatPower, g = GRADES[MANUALS[id].grade].mult;
      S.exp = starCost(id); starUp(id);
      return { before, after: S.combatPower, star: mm.star, g };
    });
    await p.waitForTimeout(1100);                                  // 돌파 뒤 다음 틱까지
    const br2 = await p.evaluate(() => ({ now: S.combatPower, calc: calculateCombatPower(S) }));
    ok('1 성급 올리기 → 거울 값 갱신', br2.now === br2.calc && br2.now > br.before, JSON.stringify({ br, br2 }));

    // 2. 상단 헤더 · 변화량
    const hd = await p.evaluate(() => { ui.tab = 'status'; ui.statusSub = 'observe'; render(); const el = document.querySelector('.cp-card .cp-main'); return { badge: el.querySelector('.cp-label').textContent.slice(0, 2), value: el.querySelector('.cp-value').textContent, title: el.closest('.cp-card').getAttribute('aria-label'), cp: fmt(calculateCombatPower(S)) }; });
    ok('2 상태 탭 투력 카드 ([투력] 한글)', hd.badge === '투력' && hd.value === hd.cp && hd.title.startsWith('투력'), JSON.stringify(hd));
    const dl = await p.evaluate(async () => { const tick = () => new Promise(r => setTimeout(r, 0)); unequip('weapon'); await tick(); const d = document.querySelector('.cp-card .cp-delta'); const r = { down: d && d.classList.contains('down') && d.textContent.startsWith('▼') }; equipItem(S.gear[S.gear.length - 1].uid); await tick(); const u = document.querySelector('.cp-card .cp-delta'); r.up = u && u.classList.contains('up'); return r; });   // 다시 그리기는 마이크로태스크로 모아서 한다
    ok('2 투력이 바뀌면 ▲/▼ 변화량 잠깐 표시', dl.down && dl.up, JSON.stringify(dl));
    ok('2 변화량은 잠시 뒤 사라짐 (2.5초)', await p.waitForFunction(() => !document.querySelector('.cp-card .cp-delta'), null, { timeout: 4500 }).then(() => true, () => false));

    // 2. 상태 › 관조: 수치 아래 투력 카드
    await p.click('[data-tab="status"]'); await p.click('[data-sub="observe"]');
    const card = await p.evaluate(() => { const c = document.querySelector('#main > .cp-card'); return c && { first: !!c.previousElementSibling && c.previousElementSibling.id === 'vitals', value: c.querySelector('.cp-value').textContent, cp: fmt(calculateCombatPower(S)), parts: c.querySelectorAll('.cp-parts span').length, label: c.querySelector('.cp-label .ko').textContent }; });
    ok('2 관조 탭: 수치 바로 아래 투력 카드 (공세 · 수세 같은 내역은 보여 주지 않음)', card && card.first && card.value === card.cp && card.parts === 0 && card.label === '투력', JSON.stringify(card));
    await p.click('[data-sub="martial"]');
    ok('2 무공 하위 탭에는 수치 · 투력 카드 없음', await p.evaluate(() => !document.querySelector('#main #vitals') && !document.querySelector('#main .cp-card')));
    await p.click('[data-tab="bag"]');
    ok('2 다른 탭에는 카드 없음', await p.evaluate(() => !document.querySelector('.cp-card')));

    ok('오류/가로스크롤 없음', errs.length === 0 && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), errs.join(' | '));
    await p.close();
  }
};
