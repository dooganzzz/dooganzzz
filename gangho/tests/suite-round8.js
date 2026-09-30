/* 소성·대성 2대 경계(경험치 + 돌파단), 몬스터별 드랍, 탐험 조우(요수 가중치·금고 다섯 종·함정) */
'use strict';
const { ok, GAME_URL, watchErrors, startEquipped, VIEWPORTS, newPage } = require('./lib');

module.exports = async (b) => {
  for (const [w, h] of VIEWPORTS) {
    console.log(`\n=== ${w}px ===`);
    const p = await newPage(b, w, h);
    const errs = watchErrors(p);
    await p.goto(GAME_URL);
    await startEquipped(p);

    // 1. 2대 경계: 1~5성은 경험치만, 5→6성은 소성 돌파단, 11→12성은 대성 돌파단
    const realm = await p.evaluate(() => {
      const r = {};
      r.gates = Object.keys(GATES).join(',');
      r.names = [1, 5, 6, 11, 12].map(st => realmOf(st).name).join(',');
      const id = S.active.mugong, m = S.manuals[id];
      S.exp = 1e6;
      for (let i = 0; i < 4; i++) starUp(id);
      r.at5 = m.star;
      r.block5 = starUpBlock(id);
      r.try5 = starUp(id); r.still5 = m.star;
      const atkBefore = calcStats().atk;
      S.inv.pillLow = 1; const e0 = S.exp;
      r.up6 = starUp(id);
      r.after = { star: m.star, realm: realmOf(m.star).name, atkUp: calcStats().atk - atkBefore, pill: count('pillLow'), spent: e0 - S.exp, cost: Math.round(STAR_EXP[4] * GRADES[MANUALS[id].grade].mult) };
      for (let i = 0; i < 5; i++) starUp(id);
      r.at11 = m.star; r.block11 = starUpBlock(id);
      S.inv.pillHigh = 1; starUp(id); r.at12 = m.star; r.max = starUpBlock(id);
      // 대성: 12성 패시브
      const gi = S.active.gigong, gm = S.manuals[gi]; const hp11 = (gm.star = 11, calcStats().maxHp);
      gm.star = 12; r.passiveHp = calcStats().maxHp - hp11; r.passiveText = DAESUNG_PASSIVE.gigong.text;
      return r;
    });
    ok('1 경계는 5성(소성)·11성(대성) 두 곳뿐', realm.gates === '5,11', realm.gates);
    ok('1 경계 이름 1·5성 입문, 6·11성 소성, 12성 대성', realm.names === '입문,입문,소성,소성,대성', realm.names);
    ok('1 1~4성은 경험치만으로 → 5성', realm.at5 === 5);
    ok('1 5→6성에는 소성 돌파단 필요 (없으면 막힘)', realm.block5 === '소성 돌파단 필요' && !realm.try5 && realm.still5 === 5, realm.block5);
    ok('1 소성 돌파 → 6성 소성, 돌파단 소모, 경험치 차감, 위력 상향', realm.up6 && realm.after.star === 6 && realm.after.realm === '소성' && realm.after.pill === 0 && realm.after.spent === realm.after.cost && realm.after.atkUp > 0, JSON.stringify(realm.after));
    ok('1 11→12성에는 대성 돌파단', realm.at11 === 11 && realm.block11 === '대성 돌파단 필요' && realm.at12 === 12 && realm.max === '대성', JSON.stringify([realm.at11, realm.block11, realm.at12]));
    ok('1 대성 극의 패시브', realm.passiveHp > 0, realm.passiveText);
    await p.evaluate(() => { ui.tab = 'status'; ui.statusSub = 'martial'; render(); });
    ok('1 무공 탭에 경계 표시', (await p.$$('.mslot .realm')).length === 4);

    // 2. 전투는 즉시 계산되고 타이머가 없다
    const one = await p.evaluate(() => { S.hp = 99999; const b0 = fightSync('rabbit'); return { over: b0.over, win: b0.win, rt: RT.battle === null, cmds: document.querySelectorAll('[data-bact], [data-bitem], [data-act="closebattle"]').length }; });
    ok('2 전투는 즉시 끝까지 계산 · 남는 타이머/전투 창 없음', one.over && one.win && one.rt && one.cmds === 0, JSON.stringify(one));

    // 3. 몬스터별 드랍
    const drops = await p.evaluate(() => {
      const seen = {};
      for (const eid of ['rabbit', 'wildcat', 'viper', 'boar', 'redTiger']) {
        seen[eid] = new Set();
        for (let i = 0; i < 25; i++) { const before = { ...S.inv }; S.hp = 1e9; fightSync(eid); for (const k of Object.keys(S.inv)) if ((S.inv[k] || 0) > (before[k] || 0)) seen[eid].add(k); }
        seen[eid] = [...seen[eid]].filter(k => ITEMS[k].kind !== '비급').sort();
      }
      return seen;
    });
    const allowed = await p.evaluate(() => Object.fromEntries(Object.entries(DROPS).map(([e, t]) => [e, t.map(([id]) => id)])));   // 드랍 표(drops.js)만
    for (const [eid, got] of Object.entries(drops)) ok(`3 ${eid} 드랍은 고유 테이블만`, got.every(k => allowed[eid].includes(k)) && got.length > 0, got.join(','));
    ok('3 살쾡이는 토끼 재료를 떨구지 않음', !drops.wildcat.some(k => /rabbit/.test(k)));

    // 5. 탐험 조우: 요수 가중치(후반일수록 강한 요수), 금고 네 종류, 함정
    const enc = await p.evaluate(() => {
      const Z = ZONES.cheongpung, pick = depth => { const c = {}; for (let i = 0; i < 2000; i++) { const e = pickBeast(Z, depth); c[e] = (c[e] || 0) + 1; } return c; };
      const early = pick(0.1), late = pick(0.9);
      const kinds = new Set();
      for (let i = 0; i < 400; i++) kinds.add(openVault(Z).name);
      const st = calcStats(); S.hp = st.maxHp; S.stamina = 50;
      const tr = stepTrap();
      const strong = c => Object.entries(c).filter(([e]) => ENEMIES[e].tier >= 3).reduce((a, [, n]) => a + n, 0);
      return { pool: Z.enemies, early, late, s0: strong(early), s1: strong(late), kinds: [...kinds].sort(), trap: { hp: st.maxHp - S.hp, sta: 50 - S.stamina, t: tr.t } };
    });
    ok('5 요수는 지역 풀(청풍산 9종)에서 가중치로', Object.keys(enc.early).length === 9 && Object.keys(enc.early).every(e => enc.pool.includes(e)), JSON.stringify(enc.early));
    ok('5 정예·위험 강적(3·4단계)은 조우의 약 25% (18% + 7%)', Math.abs(enc.s0 / 2000 - 0.25) < 0.04 && Math.abs(enc.s1 / 2000 - 0.25) < 0.04, `${enc.s0} · ${enc.s1} / 2000`);
    ok('5 금고 네 종류가 무작위로 (식재 궤 없음)', enc.kinds.length === 4 && !enc.kinds.includes('식재 궤'), enc.kinds.join(','));
    ok('6 함정: 활력·기력 감소', enc.trap.hp > 0 && enc.trap.sta === 5 && /덫/.test(enc.trap.t), JSON.stringify(enc.trap));
    ok('6 청풍산 드랍은 청풍산 재료 6종 (두목은 돌파단 재료도)', await p.evaluate(() => ZONES.cheongpung.enemies.every(e => DROPS[e].every(([id]) => ZONES.cheongpung.mats.includes(id)))));

    const ow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    ok('오류/가로스크롤 없음', !errs.length && !ow, errs.join(';'));
    await p.close();
  }
};
