/* 사냥터 사건(기연): 배치, 사건 창, 조건, 결과 적용, 전투 연결, 데이터 무결성 */
'use strict';
const { ok, GAME_URL, watchErrors, startEquipped, VIEWPORTS, newPage } = require('./lib');

module.exports = async (b) => {
  for (const [w, h] of VIEWPORTS) {
    console.log(`\n=== ${w}px ===`);
    const p = await newPage(b, w, h);
    const errs = watchErrors(p);
    await p.goto(GAME_URL);
    await startEquipped(p);

    if (w === 1280) {
      const lint = await p.evaluate(() => {
        const bad = [];
        const FX = new Set(['silver', 'items', 'hpPct', 'stamina', 'contrib', 'trainHours', 'buff', 'perm', 'reveal', 'clue', 'book', 'gear']);
        for (const ev of EVENTS) {
          if (!(ev.zones === 'all' || ev.zones.every(z => ZONES[z]))) bad.push(ev.id + ':zone');
          if (ev.choices.length < 2) bad.push(ev.id + ':choices');
          for (const c of ev.choices) {
            if (c.req && c.req.item && !ITEMS[c.req.item[0]]) bad.push(ev.id + ':req item');
            if (c.req && c.req.stat && !STAT_NAMES[c.req.stat[0]]) bad.push(ev.id + ':req stat');
            for (const o of c.out) {
              if (!o.text || !(o.w > 0)) bad.push(ev.id + ':out');
              if (o.fight && !ENEMIES[o.fight]) bad.push(ev.id + ':fight ' + o.fight);
              for (const fx of [o.fx || {}, (o.bonus || {}).fx || {}]) {
                for (const k of Object.keys(fx)) if (!FX.has(k)) bad.push(ev.id + ':fx ' + k);
                for (const id of Object.keys(fx.items || {})) if (!ITEMS[id]) bad.push(ev.id + ':item ' + id);
              }
            }
          }
        }
        const perZone = Object.fromEntries(ZONE_ORDER.map(z => [z, eventPool(z).length]));
        const counts = [];
        for (let i = 0; i < 200; i++) counts.push(generateLayout(ZONES.cheongpung).layout.join('').split('E').length - 1);
        return { bad, perZone, min: Math.min(...counts), max: Math.max(...counts), total: EVENTS.length };
      });
      ok('데이터: 사건의 아이템·적·효과·조건이 모두 실재', lint.bad.length === 0, lint.bad.join(','));
      ok('지역마다 사건 6종 (고유 4 + 공용 2)', Object.values(lint.perZone).every(n => n >= 6), JSON.stringify(lint.perZone));
      ok('사냥터마다 기연 칸 2~3개', lint.min >= 2 && lint.max <= 3, `${lint.min}~${lint.max}`);
    }

    // 기연 칸을 밟으면 사건 창
    const setup = async id => p.evaluate(id => {
      if (S.zone) leaveZone(); enterZone('cheongpung'); S.stamina = 100; S.hp = calcStats().maxHp;
      const [sx, sy] = S.zone.start; const [tx, ty] = DIRS.map(([dx, dy]) => [sx + dx, sy + dy]).find(([x, y]) => passable('cheongpung', x, y));
      S.zone.layout = S.zone.layout.map((row, y) => y === ty ? row.slice(0, tx) + 'E' + row.slice(tx + 1) : row);
      S.zone.events = { [`${tx},${ty}`]: id };
      render();
      return { key: `${tx},${ty}`, d: [tx - sx, ty - sy] };
    }, id);
    let t = await setup('herbalist');
    const icon = await p.evaluate(key => { const c = document.querySelector(`.cell[data-xy="${key}"]`); return c && c.classList.contains('event') && !!c.querySelector('.ico-event'); }, t.key);
    ok('기연 칸은 먹선 아이콘으로 표시', icon);
    await p.evaluate(d => move(d[0], d[1]), t.d);
    const m1 = await p.evaluate(() => ({ title: document.querySelector('.event-sheet h2') && document.querySelector('.event-sheet h2').textContent, opts: [...document.querySelectorAll('.ev-opt')].map(o => ({ t: o.querySelector('b').textContent, dis: o.disabled, why: (o.querySelector('small') || {}).textContent || '' })) }));
    ok('밟으면 사건 창 (제목·이야기·선택지)', m1.title === '부상당한 약초꾼' && m1.opts.length === 3, m1.title);
    ok('조건 있는 선택지에 필요 항목·소모 표시', m1.opts[0].dis === false && /금창약/.test(m1.opts[0].why), JSON.stringify(m1.opts[0]));
    const before = await p.evaluate(() => ({ pot: count('potionHp'), lz: count('lingzhi') }));
    await p.click('.ev-opt[data-evchoice="0"]');
    const r1 = await p.evaluate(key => ({ pot: count('potionHp'), lz: count('lingzhi'), result: !!document.querySelector('.ev-result'), gains: [...document.querySelectorAll('.ev-gains li')].map(l => l.textContent).join(' | '), tile: tileAt('cheongpung', ...key.split(',').map(Number)) }), t.key);
    ok('선택 → 조건 아이템 소모 + 결과 적용', r1.pot === before.pot - 1 && r1.lz === before.lz + 2, `금창약 ${before.pot}→${r1.pot}, 영지 ${before.lz}→${r1.lz}`);
    ok('결과 화면에 얻은 것 목록', r1.result && /영지버섯/.test(r1.gains), r1.gains);
    ok('사건이 끝난 칸은 산길', r1.tile === 'o');
    await p.click('[data-act="closemodal"]');

    // 조건 미달이면 고를 수 없음
    t = await setup('oldtree');
    await p.evaluate(() => { S.equip.weapon = null; S.shrine.atk = 0; });
    await p.evaluate(d => move(d[0], d[1]), t.d);
    const gated = await p.evaluate(() => { const o = document.querySelector('.ev-opt[data-evchoice="0"]'); return { dis: o.disabled, why: o.querySelector('small').textContent, atk: calcStats().atk }; });
    ok('능력치 조건 미달 → 비활성 + 필요 수치 표시', gated.dis && /공격력 22 이상/.test(gated.why), `${gated.why} (공격력 ${gated.atk})`);
    await p.evaluate(() => { ui.modal = null; render(); });

    // 전투로 이어지는 선택 + 승리 보너스
    t = await setup('ronin');
    await p.evaluate(d => move(d[0], d[1]), t.d);
    const fight = await p.evaluate(() => {
      const sil0 = S.silver;
      document.querySelector('.ev-opt[data-evchoice="0"]').click();
      const r = { battle: !!RT.battle, eid: RT.battle && RT.battle.eid, bonus: !!(RT.battle && RT.battle.bonus), modal: ui.modal };
      stopBattleTimer(); S.hp = 1e9; RT.battle.e.hpNow = 1; let n = 0; while (!RT.battle.over && n++ < 50) battleRound();   // 빗나갈 수 있으니 끝날 때까지
      r.win = RT.battle.win; r.bonusLine = RT.battle.lines.some(l => l.text.includes('술값')); r.silverGain = S.silver - sil0;
      closeBattle();
      return r;
    });
    ok('전투 선택 → 사건 창 닫히고 해당 적과 전투', fight.battle && fight.eid === 'ronin' && !fight.modal);
    ok('사건 전투 승리 시 추가 보상', fight.win && fight.bonusLine && fight.silverGain >= 40, `은자 +${fight.silverGain}`);

    // 같은 사냥터에서 사건이 겹치지 않음
    const uniq = await p.evaluate(() => {
      if (S.zone) leaveZone(); S.flags.boss1 = true; enterZone('yeomhwa');
      const keys = []; S.zone.layout.forEach((row, y) => [...row].forEach((c, x) => { if (c === 'o') keys.push(`${x},${y}`); }));
      const ids = keys.slice(0, 6).map(k => eventAt(k).id);
      leaveZone();
      return { ids, unique: new Set(ids).size === ids.length };
    });
    ok('한 사냥터 안에서는 사건이 겹치지 않음 (6칸 → 6종)', uniq.unique, uniq.ids.join(','));

    const ow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    ok('오류/가로스크롤 없음', !errs.length && !ow, errs.join(';'));
    await p.close();
  }
};
