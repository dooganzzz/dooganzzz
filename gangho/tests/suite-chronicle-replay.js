/* 강호행 기록: 견문록 [관찰하기] 리플레이 · 두목과 구역 해금 · 성장 · 저장 이전 */
'use strict';
const { ok, GAME_URL, watchErrors, VIEWPORTS, newPage, startEquipped } = require('./lib');

module.exports = async (b) => {
  for (const [w, h] of VIEWPORTS) {
    console.log(`\n=== ${w}px ===`);
    const p = await newPage(b, w, h);
    const errs = watchErrors(p);
    await p.goto(GAME_URL);
    await startEquipped(p);

    // 1. 강호행 한 번 → 보상을 받으면 견문록에 걸음마다 한 줄, 전투에는 [관찰하기]
    await p.evaluate(() => { S.expedition.zone = 'cheongpung'; S.hp = 1e9; runExpedition(now(), 12); ui.modal = null; render(); });
    await p.click('[data-tab="chronicle"]');
    const lg = await p.evaluate(() => {
      const r = S.expeditions[S.expeditions.length - 1], watch = [...document.querySelectorAll('.chron .watch')];
      return { watch: watch.length, battles: r.battles.length, sample: watch[0] && watch[0].closest('.chron-text').textContent, sep: !S.log.some(l => /모습을 드러냈습니다/.test(l.text)) };
    });
    ok('2 전투마다 [관찰]', lg.battles > 0 && lg.watch === lg.battles && /(과|와) 전투에서 (승리|패배|무승부).*관찰/.test(lg.sample || ''), JSON.stringify(lg));
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


    // 7. 두목(10단계)을 쓰러뜨리면 다음 구역이 열린다
    const boss = await p.evaluate(() => {
      const hpK = ENEMIES.redTiger.hp; ENEMIES.redTiger.hp = 1;
      S.stages = S.stages || {}; S.stages.cheongpung = STAGE.count - 1; S.expedition.stage = STAGE.count; S.hp = 1e9;
      const k = runExpedition(now(), 3);
      ENEMIES.redTiger.hp = hpK;
      return { won: k.battles.some(x => x.boss && x.win), flag: !!S.flags[ZONES.yeomhwa.unlock.boss], open: zoneUnlocked('yeomhwa') };
    });
    ok('7 두목 토벌 → 다음 구역(염화채) 열림', boss.won && boss.flag && boss.open, JSON.stringify(boss));
    ok('7 탐험지 바꾸기', await p.evaluate(() => setDestination('yeomhwa') && S.expedition.zone === 'yeomhwa'));

    // 8. 성장: 헤더 수련치 · 관조 › 무공 성급 올리기
    // 수련치는 머리줄 칩이 없어지고 관조 › 무공 머리에만 보인다
    await p.evaluate(() => { S.exp = 12345; render(); });
    await p.click('[data-tab="status"]'); await p.click('[data-sub="martial"]');
    const m0 = await p.evaluate(() => ({ purse: document.querySelector('.exp-purse b').textContent, btn: document.querySelectorAll('.mrow [data-starup]:not([disabled])').length }));
    await p.click('.mrow [data-starup]:not([disabled])'); await p.click('[data-act="confirmok"]');
    ok('8 관조 › 무공: 수련치 표시 · [▲ 성급] → 올라가고 수련치 줄어듦', m0.purse === '12,345' && m0.btn >= 1 && await p.evaluate(() => S.exp < 12345 && Object.values(S.manuals).some(m => m.star >= 2)), JSON.stringify(m0));
    await p.click('.mrow-cover[data-mart]');
    const md = await p.evaluate(() => ({ btn: !!document.querySelector('.sheet [data-starup]'), kv: document.querySelector('.sheet').textContent.includes('필요 수련치') }));
    ok('8 무공 상세 창에도 성급 올리기', md.btn && md.kv, JSON.stringify(md));
    await p.evaluate(() => { ui.modal = null; render(); });

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
    ok('10 저장 이전 v7→: 지도·연무장·수련치 제거', mig.v >= 8 && mig.noZone && mig.noXp && mig.exped && mig.buffs === 0, JSON.stringify(mig));
    ok('10 쌓아 둔 진행 비율만큼 수련치로 돌려받음', mig.exp >= mig.expect, JSON.stringify(mig));

    ok('오류/가로스크롤 없음', errs.length === 0 && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), errs.join(' | '));
    await p.close();
  }
};
