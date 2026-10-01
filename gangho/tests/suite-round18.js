/* 자동 탐험: 탐험지 선택 · 한 시간 주기 · 최대 8번 누적/보관 · 견문록 [관찰하기] 리플레이 · 결산 · 성장 · 저장 이전 */
'use strict';
const { ok, GAME_URL, watchErrors, VIEWPORTS, newPage, startEquipped } = require('./lib');

module.exports = async (b) => {
  for (const [w, h] of VIEWPORTS) {
    console.log(`\n=== ${w}px ===`);
    const p = await newPage(b, w, h);
    const errs = watchErrors(p);
    await p.goto(GAME_URL);
    await startEquipped(p);

    // 1. 강호행: 지도 없이 탐험지만 고른다
    await p.click('[data-tab="field"]');
    const f0 = await p.evaluate(() => ({ map: !!document.querySelector('.map, .cell, .dpad, .standoff'), zones: document.querySelectorAll('.zone').length, open: [...document.querySelectorAll('[data-dest]')].map(e => e.dataset.dest), cd: document.querySelector('[data-countdown]').textContent, header: document.querySelector('#status .sect').textContent }));
    ok('1 지도 없음 · 구역 카드 3개 · 처음엔 청풍산만 고를 수 있음', !f0.map && f0.zones === 3 && f0.open.join() === 'cheongpung', JSON.stringify(f0));
    ok('1 탐험지 미정 표시', f0.cd === '탐험지 미정' && /탐험지 미정/.test(f0.header));
    await p.click('[data-dest="cheongpung"]');
    const f1 = await p.evaluate(() => { const r = S.expeditions[0]; return { recs: S.expeditions.length, modal: ui.modal, settle: !!document.querySelector('.settle-sheet'), zone: S.expedition.zone, next: nextExpeditionIn(), at: (d => d.getMinutes() * 60 + d.getSeconds())(new Date(S.expedition.nextAt)), stamina: S.stamina, steps: r.steps.length, battles: r.battles.length, kinds: [...new Set(r.steps.map(s => s.k))] }; });
    ok('1 처음 고르면 첫 탐험이 곧바로 → 결산 창', f1.recs === 1 && f1.settle && /^settle:/.test(f1.modal), JSON.stringify(f1));
    ok('1 다음 출발은 다음 정각 · 기력은 모두 소모', f1.next > 0 && f1.next <= 3600000 && f1.at === 0 && f1.stamina === 0, JSON.stringify(f1));
    ok('1 한 번의 탐험에 여러 조우 (전투 포함, 10걸음 안팎)', f1.steps >= 5 && f1.steps <= 18 && f1.battles >= 2 && f1.kinds.includes('beast'), JSON.stringify(f1));
    await p.click('.settle-sheet [data-act="closemodal"]');

    // 2. 견문록: 걸음마다 한 줄, 전투에는 [관찰하기]
    await p.click('[data-tab="chronicle"]');
    const lg = await p.evaluate(() => {
      const r = S.expeditions[0], top = document.querySelector('.chron .chron-row');
      const watch = [...document.querySelectorAll('.chron .watch')];
      return { head: top.className.includes('exp-head') && /청풍산 탐험/.test(top.textContent), watch: watch.length, battles: r.battles.length, sample: watch[0] && watch[0].closest('.chron-text').textContent, time: top.querySelector('time').textContent === hhmm(r.at), sep: !S.log.some(l => /모습을 드러냈습니다/.test(l.text)) };
    });
    ok('2 견문록 맨 위에 탐험 요약', lg.head, JSON.stringify(lg));
    ok('2 전투마다 "…와 전투에서 승리/패배 [관찰하기]"', lg.watch === lg.battles && /(과|와) 전투에서 (승리|패배|무승부)( — [^관]+)?\s*관찰하기/.test(lg.sample), lg.sample);
    ok('2 전투 대사는 견문록에 쏟아지지 않음 (관찰하기에서만)', lg.sep);

    // 3. 관찰하기 → 그 전투만 리플레이
    await p.click('.chron .watch');
    await p.waitForTimeout(1600);
    const rp = await p.evaluate(() => { const bx = document.querySelector('#rpBox'); return { open: !!bx && /^replay:/.test(ui.modal), i: RP.i, lines: document.querySelectorAll('#rpLog p').length, intro: RP.key && replayData(RP.key).b.intro.length, prog: document.querySelector('#rpProg').textContent }; });
    ok('3 [관찰하기] → 관찰 창에서 합마다 재생', rp.open && rp.i >= 0 && rp.lines > rp.intro, JSON.stringify(rp));
    await p.click('[data-rp="speed"][data-x="4"]');
    ok('3 배속 전환', await p.evaluate(() => RP.speed === 4 && document.querySelector('[data-rp="speed"][data-x="4"]').classList.contains('on')));
    await p.click('[data-rp="end"]');
    const end = await p.evaluate(() => { const d = replayData(RP.key); return { last: RP.i === d.b.rounds.length - 1, cls: document.querySelector('#rpBox').className, win: d.b.win, round: document.querySelector('#rpRound').textContent }; });
    ok('3 [끝까지] → 결과(勝/敗) 표시', end.last && (end.win ? /won/.test(end.cls) && end.round === '勝' : /lost/.test(end.cls)), JSON.stringify(end));
    await p.evaluate(() => { const t0 = S.log.length; notify.refresh(); });          // 다시 그려져도 관찰 창은 그대로
    ok('3 화면이 다시 그려져도 관찰 창 유지', await p.evaluate(() => !!document.querySelector('#rpBox') && RP.i >= 0));
    await p.click('#rpBox [data-act="closemodal"]');
    ok('3 닫으면 재생 멈춤', await p.evaluate(() => !ui.modal && RP.timer === null));

    // 4. 한 시간마다 (틱) · 최대 8번 누적 · 기록은 최근 8번
    const hr = await p.evaluate(() => {
      const n0 = S.expeditions.length; S.expedition.nextAt = now() - 1; tick();
      const r = { hourly: S.expeditions.length === n0 + 1, toast: [...document.querySelectorAll('.toast')].some(t => /탐험에서 돌아왔습니다/.test(t.textContent)) };
      S.expedition.nextAt = now() - 10 * 3600000 - 1; const log0 = S.log.length;
      const recs = settleExpeditions();
      r.ran = recs.length; r.skipped = S.log.slice(log0).some(l => /탐험 3번이 그냥 지나갔습니다/.test(l.text));
      r.kept = S.expeditions.length; r.oldestGone = !S.expeditions.some(x => x.id === 1) && S.expeditions[0].at < S.expeditions[7].at;
      r.times = recs.map(x => x.at).every((t, i, a) => !i || t - a[i - 1] === 3600000);
      r.next = nextExpeditionIn() > 0 && nextExpeditionIn() <= 3600000;
      return r;
    });
    ok('4 출발 시각이 되면 틱에서 탐험 1번 + 알림', hr.hourly && hr.toast, JSON.stringify(hr));
    ok('4 11시간 밀리면 8번만 결산 (3번은 지나감)', hr.ran === 8 && hr.skipped, JSON.stringify(hr));
    ok('4 탐험은 한 시간 간격 시각으로 기록', hr.times && hr.next, JSON.stringify(hr));
    ok('4 기록은 최근 8번만 (오래된 것부터 삭제)', hr.kept === 8 && hr.oldestGone, JSON.stringify(hr));
    const gone = await p.evaluate(() => { const b0 = document.querySelector('.chron .watch[data-watch^="1:"]'); if (b0) b0.click(); else openReplay('1:0'); return { modal: ui.modal, toast: [...document.querySelectorAll('.toast')].some(t => /기록이 지워졌습니다/.test(t.textContent)) }; });
    ok('4 지워진 탐험의 [관찰하기] → 안내만', !/^replay:/.test(gone.modal || '') && gone.toast, JSON.stringify(gone));

    // 5. 강호행 탭의 탐험 기록 · 카운트다운
    await p.evaluate(() => { ui.modal = null; goTab('field'); render(); });
    const fr = await p.evaluate(() => ({ recs: document.querySelectorAll('.exp-rec').length, watch: document.querySelectorAll('.exp-rec .watch').length, cd: document.querySelector('[data-countdown]').textContent, here: document.querySelector('.zone.here h3 .ko').textContent }));
    ok('5 탐험 기록 8개 (펼치면 걸음·관찰하기)', fr.recs === 8 && fr.watch > 0 && fr.here === '청풍산', JSON.stringify(fr));
    await p.waitForTimeout(2100);
    ok('5 다음 출발 카운트다운이 1초마다 갱신', await p.evaluate(cd => { const t = document.querySelector('[data-countdown]').textContent; return /^(\d+:)?\d+:\d\d$/.test(t) && t !== cd; }, fr.cd));

    // 6. 기력(숨김) · 증강 단약 · 자동 생혈고 · 마을 치료 · 패배 후 재출전
    const sta = await p.evaluate(() => {
      const r = {}, st = calcStats();
      S.stamina = 0; lastFrame = now() - 5000; tick(); r.noRegen = S.stamina === 0;                 // 틱으로는 차오르지 않는다
      r.noFood = !Object.values(ITEMS).some(I => I.use && I.use.stamina) && !document.querySelector('#status .bar.sta');
      give('golgye', 1, true); const d0 = calcStats().def; useItem('golgye'); r.buff = S.buffs.some(x => x.key === 'defFlat') && calcStats().def === d0 + 15;
      S.stamina = 7; S.expedition.nextAt = now() - 1; const rec = settleExpeditions()[0];
      r.full = rec.budget === calcStats().maxSta;                       // 정각 출발 때만 가득
      r.cleared = S.buffs.length === 0;
      // 생혈고가 없고 활력이 바닥나면 마을로 내려가 치료하고 (기력 소모) 다시 사냥
      delete S.inv.saenghyeol;
      const va = EXPEDITION.villageAt; EXPEDITION.villageAt = 2;          // 곧바로 마을로
      S.stamina = 100; const r2 = runExpedition(now()); EXPEDITION.villageAt = va;
      r.village = r2.villages > 0 && r2.steps.some(x => x.k === 'village') && r2.end === 'tired';
      // 쓰러지면 기력을 크게 잃고 활력·내력을 회복해 다시 사냥 (은자는 잃지 않는다)
      for (const e of ZONES.cheongpung.enemies) ENEMIES[e].atk *= 60;
      const s0 = S.silver; S.stamina = 100; const r3 = runExpedition(now());
      for (const e of ZONES.cheongpung.enemies) ENEMIES[e].atk /= 60;
      r.defeat = r3.defeats >= 2 && r3.end === 'tired' && !('lost' in r3.gain) && r3.steps.filter(x => x.b !== undefined).length >= 2;
      r.defeatLog = r3.steps.some(x => (x.d || []).some(l => /다시 길을 나섭니다/.test(l.text)));
      // 자동 생혈고
      S.inv.saenghyeol = 3; S.hp = 1; const bt = { eid: 'rabbit', e: { ...ENEMIES.rabbit, hpNow: 30 }, lines: [], fx: [], st: calcStats(), over: false }; RT.battle = bt; autoPotion(bt); RT.battle = null;
      r.potion = count('saenghyeol') === 2 && S.hp > 1 && bt.lines.some(l => /생혈고/.test(l.text));
      return r;
    });
    ok('6 기력은 숨겨진 능력치: 틱·음식으로 차오르지 않고 화면에 없음', sta.noRegen && sta.noFood, JSON.stringify(sta));
    ok('6 정각 출발 때만 기력이 가득', sta.full, JSON.stringify(sta));
    ok('6 증강 단약(철골단)은 다음 탐험 한 번 뒤 사라짐', sta.buff && sta.cleared, JSON.stringify(sta));
    ok('6 생혈고 없이 활력 바닥 → 마을 치료(기력 소모) 후 다시 사냥', sta.village, JSON.stringify(sta));
    ok('6 쓰러지면 기력을 잃고 회복해 다시 사냥 (기력이 다할 때까지)', sta.defeat && sta.defeatLog, JSON.stringify(sta));
    ok('6 위급하면 생혈고 자동 사용', sta.potion, JSON.stringify(sta));

    // 7. 두목: 피하지 않고 맞선다, 쓰러뜨리면 다음 구역이 열림
    const boss = await p.evaluate(() => {
      const W = EXPEDITION, keep = { from: W.bossFrom, ch: W.bossChance, mx: W.bossMax };
      W.bossFrom = 0; W.bossChance = 1; W.bossMax = 1;
      const hpK = ENEMIES.redTiger.hp; ENEMIES.redTiger.hp = 999999;
      S.stamina = 100; const a = runExpedition(now());
      ENEMIES.redTiger.hp = 1;
      S.stamina = 100; S.inv.saenghyeol = 9; const k = runExpedition(now());
      ENEMIES.redTiger.hp = hpK; W.bossFrom = keep.from; W.bossChance = keep.ch; W.bossMax = keep.mx;
      return { noAvoid: !a.steps.some(s => s.k === 'avoid') && a.battles.some(x => x.boss), won: k.battles.some(x => x.boss && x.win), flag: !!S.flags.boss1, open: zoneUnlocked('yeomhwa') };
    });
    ok('7 두목은 기척이 무거워도 회피 없이 맞선다', boss.noAvoid, JSON.stringify(boss));
    ok('7 두목 토벌 → 다음 구역(염화채) 열림', boss.won && boss.flag && boss.open, JSON.stringify(boss));
    await p.evaluate(() => { goTab('field'); render(); });
    await p.click('[data-dest="yeomhwa"]');
    ok('7 탐험지 바꾸기 (일정은 그대로)', await p.evaluate(() => S.expedition.zone === 'yeomhwa' && !/^settle:/.test(ui.modal || '') && nextExpeditionIn() > 0));

    // 8. 성장: 헤더 수련치 · 상태 › 무공 성급 올리기
    const g = await p.evaluate(() => { S.exp = 12345; render(); const el = document.querySelector('#status .status-chip.exp'); const r = { badge: el.querySelector('.chip-badge').textContent, value: el.querySelector('#header-exp').textContent, title: el.title }; S.exp = 1234567; render(); r.big = document.querySelector('#header-exp').textContent; r.bigTitle = document.querySelector('#status .status-chip.exp').title; S.exp = 12345; render(); return r; });
    ok('8 헤더에 수련치 ([수련치] 한글 뱃지 · 10만 이상은 만 단위)', g.badge === '수련치' && g.value === '12,345' && g.big === '123.5만' && /1,234,567/.test(g.bigTitle), JSON.stringify(g));
    await p.click('[data-tab="status"]'); await p.click('[data-sub="martial"]');
    const m0 = await p.evaluate(() => ({ purse: document.querySelector('.exp-purse b').textContent, btn: document.querySelectorAll('.mslot [data-starup]:not([disabled])').length }));
    await p.click('.mslot [data-starup]:not([disabled])'); await p.click('[data-act="confirmok"]');
    ok('8 상태 › 무공: 수련치 표시 · [▲ 성급] → 올라가고 수련치 줄어듦', m0.purse === '12,345' && m0.btn === 4 && await p.evaluate(() => S.exp < 12345 && Object.values(S.manuals).some(m => m.star >= 2)), JSON.stringify(m0));
    await p.click('.mcard[data-mart]');
    const md = await p.evaluate(() => ({ btn: !!document.querySelector('.sheet [data-starup]'), kv: document.querySelector('.sheet').textContent.includes('필요 수련치') }));
    ok('8 무공 상세 창에도 성급 올리기', md.btn && md.kv, JSON.stringify(md));
    await p.evaluate(() => { ui.modal = null; render(); });

    // 9. 돌아왔을 때 한꺼번에 결산 (다시 불러오기)
    await p.evaluate(() => { S.expedition.nextAt = now() - 3 * 3600000 + 5000; save(); });
    await p.reload(); await p.waitForTimeout(300);
    const back = await p.evaluate(() => ({ modal: ui.modal, n: (ui.modal || '').split(',').length, sheet: !!document.querySelector('.settle-sheet'), title: document.querySelector('.settle-sheet h2') && document.querySelector('.settle-sheet h2').textContent }));
    ok('9 자리를 비운 동안의 탐험(3번)을 돌아오면 한꺼번에 결산 창', back.sheet && back.n === 3 && /탐험 3번의 결산/.test(back.title), JSON.stringify(back));
    await p.click('.settle-sheet .settle-watch .watch');
    ok('9 결산 창에서 바로 관찰하기', await p.evaluate(() => /^replay:/.test(ui.modal) && !!document.querySelector('#rpBox')));
    await p.evaluate(() => { replayStop(); ui.modal = null; render(); });

    // 10. 예전 저장(v7: 지도·연무장·비급별 수련치) → v8
    const mig = await p.evaluate(() => {
      const old = JSON.parse(JSON.stringify(S)); old.v = 7; old.zone = { id: 'cheongpung', layout: ['o'] }; old.seen = {}; old.activeTrainingSkillId = 'sm1a';
      old.manuals.sm1a = { star: 3, txp: 4 * 3600, cxp: 5, gate: false };           // 3성 절반
      old.manuals.gi1a = { star: 5, txp: 0, cxp: 0, gate: true };                  // 소성 관문에 막힘 → 한 성 몫
      delete old.expedition; delete old.expeditions; old.exp = 0; old.buffs = [{ key: 'atk', val: 0.1, until: 1 }];
      const st = migrate(JSON.parse(JSON.stringify(old)));
      const g = id => GRADES[MANUALS[id].grade].mult;
      return { v: st.v, noZone: !('zone' in st) && !('seen' in st) && !('activeTrainingSkillId' in st), noXp: !Object.values(st.manuals).some(m => 'txp' in m || 'cxp' in m || 'gate' in m),
        exp: st.exp, expect: Math.round(0.5 * STAR_EXP[2] * g('sm1a')) + Math.round(STAR_EXP[4] * g('gi1a')), exped: st.expedition && st.expedition.zone === null && Array.isArray(st.expeditions), buffs: st.buffs.length };
    });
    ok('10 저장 이전 v7→v8: 지도·연무장·수련치 제거', mig.v === 8 && mig.noZone && mig.noXp && mig.exped && mig.buffs === 0, JSON.stringify(mig));
    ok('10 쌓아 둔 진행 비율만큼 수련치로 돌려받음', mig.exp >= mig.expect, JSON.stringify(mig));

    ok('오류/가로스크롤 없음', errs.length === 0 && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), errs.join(' | '));
    await p.close();
  }
};
