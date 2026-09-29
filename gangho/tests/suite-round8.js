/* 소성·대성 2대 경계, 3초 자동 공방, 몬스터별 드랍, 요수·금고, 숨은 함정 */
'use strict';
const { ok, GAME_URL, watchErrors, startEquipped, VIEWPORTS, newPage } = require('./lib');

module.exports = async (b) => {
  for (const [w, h] of VIEWPORTS) {
    console.log(`\n=== ${w}px ===`);
    const p = await newPage(b, w, h);
    const errs = watchErrors(p);
    await p.goto(GAME_URL);
    await startEquipped(p);

    // 1. 2대 경계
    const realm = await p.evaluate(() => {
      const r = {};
      r.gates = Object.keys(GATES).join(',');
      r.names = [1, 5, 6, 11, 12].map(st => realmOf(st).name).join(',');
      const id = S.active.mugong, m = S.manuals[id];
      toggleTraining('mugong');
      // 1~4성: 관문 없이 자연 승성
      for (let i = 0; i < 4; i++) { for (let k = 0; k < needC(m.star); k++) addXp(id, 'cxp', 1); advance(8 * 3600 / trainBonus() + 5, true); }
      r.at5 = { star: m.star, gate: m.gate };
      for (let k = 0; k < needC(5); k++) addXp(id, 'cxp', 1); advance(8 * 3600 / trainBonus() + 5, true);
      r.gate5 = { star: m.star, gate: m.gate };
      const atkBefore = calcStats().atk;
      S.inv.pillLow = 1; useItem('pillLow', false);
      r.after = { star: m.star, gate: m.gate, realm: realmOf(m.star).name, atkUp: calcStats().atk - atkBefore };
      r.tag = !!document.querySelector('.realm');
      // 대성: 12성 패시브
      const gi = S.active.gigong, gm = S.manuals[gi]; const hp11 = (gm.star = 11, calcStats().maxHp);
      gm.star = 12; r.passiveHp = calcStats().maxHp - hp11; r.passiveText = DAESUNG_PASSIVE.gigong.text;
      return r;
    });
    ok('1 경계는 5성(소성)·11성(대성) 두 곳뿐', realm.gates === '5,11', realm.gates);
    ok('1 경계 이름 1·5성 입문, 6·11성 소성, 12성 대성', realm.names === '입문,입문,소성,소성,대성', realm.names);
    ok('1 1~4성은 관문 없이 승성 → 5성', realm.at5.star === 5 && !realm.at5.gate, JSON.stringify(realm.at5));
    ok('1 5성이 차면 소성 관문', realm.gate5.star === 5 && realm.gate5.gate, JSON.stringify(realm.gate5));
    ok('1 소성 돌파 → 6성 소성, 위력 상향', realm.after.star === 6 && realm.after.realm === '소성' && realm.after.atkUp > 0, JSON.stringify(realm.after));
    ok('1 대성 극의 패시브', realm.passiveHp > 0, realm.passiveText);
    await p.evaluate(() => { ui.tab = 'yeonmu'; render(); });
    ok('1 카드에 경계 표시', (await p.$$('.art .realm')).length === 4);
    await p.evaluate(() => { ui.tab = 'martial'; render(); });
    ok('1 무공 탭에 경계 표시', (await p.$$('.mslot .realm')).length === 4);

    // 2. 3초 자동 공방
    const timing = await p.evaluate(async () => {
      enterZone('cheongpung'); S.hp = 99999;
      const t0 = performance.now(); startBattle('boar'); ui.battle.e.hpNow = 1e9;
      const cmds = document.querySelectorAll('[data-bact], [data-act="auto"]').length;
      const rounds = [];
      await new Promise(res => { const iv = setInterval(() => { rounds.push([ui.battle.round, Math.round(performance.now() - t0)]); if (performance.now() - t0 > 7000) { clearInterval(iv); res(); } }, 250); });
      const first = rounds.find(([r]) => r >= 1), second = rounds.find(([r]) => r >= 2);
      const logged = S.log.slice(-8).some(l => /평타|초식|공격/.test(l.text));
      ui.battle.over = true; ui.battle.win = true; closeBattle();
      return { cmds, first: first && first[1], second: second && second[1], logged };
    });
    ok('2 선택지 버튼 없음', timing.cmds === 0);
    ok('2 3초마다 한 합씩 진행', timing.first >= 2800 && timing.first <= 3500 && timing.second >= 5800 && timing.second <= 6500, `1합 ${timing.first}ms · 2합 ${timing.second}ms`);
    ok('2 공방이 견문록에 기록', timing.logged);
    const end = await p.evaluate(() => { S.hp = 99999; const bt = fightSync('rabbit'); const r = { over: bt.over, win: bt.win, timer: ui.btimer }; closeBattle(); return r; });
    ok('2 승리 시 인터벌 정리', end.over && end.win && !end.timer);

    // 3. 몬스터별 드랍
    const drops = await p.evaluate(() => {
      const seen = {};
      for (const eid of ['rabbit', 'dog', 'boar', 'boarKing']) {
        seen[eid] = new Set();
        for (let i = 0; i < 25; i++) { const before = { ...S.inv }; S.hp = 1e9; fightSync(eid); for (const k of Object.keys(S.inv)) if ((S.inv[k] || 0) > (before[k] || 0)) seen[eid].add(k); closeBattle(); }
        seen[eid] = [...seen[eid]].filter(k => ITEMS[k].kind !== '비급').sort();
      }
      return seen;
    });
    const allowed = { rabbit: ['rabbitHide', 'rabbitMeat'], dog: ['dogFang', 'roughHide'], boar: ['boarHide', 'boarMeat', 'boarTusk'], boarKing: ['blackiron', 'emberStone', 'kingTusk'] };
    for (const [eid, got] of Object.entries(drops)) ok(`3 ${eid} 드랍은 고유 테이블만`, got.every(k => allowed[eid].includes(k)) && got.length > 0, got.join(','));
    ok('3 들개는 토끼 재료를 떨구지 않음', !drops.dog.some(k => /rabbit/.test(k)));

    // 5. 요수·금고
    const enc = await p.evaluate(() => {
      if (S.zone) leaveZone(); enterZone('cheongpung'); S.stamina = 999;
      const lay = S.zone.layout;
      const names = new Set([...document.querySelectorAll('.cell small')].map(e => e.textContent));
      const monsterName = [...names].some(n => ['들토끼', '들개', '멧돼지'].includes(n));
      // 입구 옆 칸을 요수로 바꿔 밟아 본다
      const [sx, sy] = S.zone.start; const [tx, ty] = DIRS.map(([dx, dy]) => [sx + dx, sy + dy]).find(([x, y]) => passable('cheongpung', x, y));
      S.zone.layout = S.zone.layout.map((row, y) => y === ty ? row.slice(0, tx) + 'Y' + row.slice(tx + 1) : row);
      const picked = {};
      for (let i = 0; i < 200; i++) { const e = pickBeast(); picked[e] = (picked[e] || 0) + 1; }
      move(tx - sx, ty - sy);
      interact();   // 대치 패널의 [ 결투 시작 ]
      const started = !!ui.battle; stopBattleTimer(); const enemy = ui.battle && ui.battle.eid;
      ui.battle.over = true; ui.battle.win = true; closeBattle();
      // 금고
      S.zone.layout = S.zone.layout.map((row, y) => y === ty ? row.slice(0, tx) + 'C' + row.slice(tx + 1) : row); delete S.zone.done[`${tx},${ty}`];
      const kinds = new Set();
      for (let i = 0; i < 60; i++) { delete S.zone.done[`${tx},${ty}`]; const last = S.log[S.log.length - 1]; interact(); const l = S.log.slice(S.log.lastIndexOf(last) + 1).find(x => x.text.includes('금고를 열자')); if (l) kinds.add(VAULTS.find(v => l.text.includes(v.name)).name); }
      const label = nodeInfo('cheongpung', tx, ty).label;
      return { monsterName, started, enemy, picked, kinds: [...kinds].sort(), chestLabel: ZONES && '금고(金庫)', label };
    });
    ok('5 지도에 개별 몬스터명 없음', !enc.monsterName);
    ok('5 요수 칸에서 결투 시작 → 지역 요수와 전투', enc.started && ['rabbit', 'dog', 'boar'].includes(enc.enemy), enc.enemy);
    ok('5 요수는 지역 풀에서 가중치로 선택', Object.keys(enc.picked).length === 3, JSON.stringify(enc.picked));
    ok('5 금고 네 종류가 무작위로', enc.kinds.length === 4, enc.kinds.join(','));

    // 6. 숨은 함정
    const trap = await p.evaluate(() => {
      if (S.zone) leaveZone(); enterZone('cheongpung'); S.stamina = 100; S.hp = calcStats().maxHp;
      const [sx, sy] = S.zone.start; const [tx, ty] = DIRS.map(([dx, dy]) => [sx + dx, sy + dy]).find(([x, y]) => passable('cheongpung', x, y));
      S.zone.layout = S.zone.layout.map((row, y) => y === ty ? row.slice(0, tx) + 'T' + row.slice(tx + 1) : row);
      delete S.zone.done[`${tx},${ty}`];
      render();
      const cell = [...document.querySelectorAll('.cell')].find(c => c.dataset.move === `${tx - sx},${ty - sy}`);
      const path = [...document.querySelectorAll('.cell.path')].find(c => c !== cell);
      const same = cell && path && cell.className === path.className && cell.innerHTML === path.innerHTML && cell.title === path.title;
      const hp0 = S.hp, st0 = S.stamina;
      move(tx - sx, ty - sy);
      const r = { same, hpLoss: hp0 - S.hp, staLoss: st0 - S.stamina, logged: S.log.slice(-3).some(l => l.text.includes('숨겨진 덫을 밟았습니다')), after: tileAt('cheongpung', tx, ty) };
      move(sx - tx, sy - ty); const hp1 = S.hp; move(tx - sx, ty - sy); r.once = S.hp === hp1;
      return r;
    });
    ok('6 함정 칸은 산길과 똑같이 보임', trap.same);
    ok('6 밟으면 발동 (로그·활력·기력 감소)', trap.logged && trap.hpLoss > 0 && trap.staLoss > 0, JSON.stringify(trap));
    ok('6 발동 후 산길로 바뀌고 다시 밟아도 안전', trap.after === 'o' && trap.once);

    const ow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    ok('오류/가로스크롤 없음', !errs.length && !ow, errs.join(';'));
    await p.close();
  }
};
