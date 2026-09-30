/* 사냥터 사건(기연): 데이터 무결성, 자동 선택, 조건·소모, 전투 연결, 탐험당 1회 */
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
        const FX = new Set(['silver', 'items', 'hpPct', 'stamina', 'contrib', 'exp', 'buff', 'perm', 'clue', 'book', 'gear']);
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
        return { bad, perZone, total: EVENTS.length };
      });
      ok('데이터: 사건의 아이템·적·효과·조건이 모두 실재', lint.bad.length === 0, lint.bad.join(','));
      ok('지역마다 사건 6종 (고유 4 + 공용 2)', Object.values(lint.perZone).every(n => n >= 6), JSON.stringify(lint.perZone));
    }

    // 자동 탐험의 기연: 제자가 조건을 채운 선택지 가운데 하나를 스스로 고른다
    const auto = await p.evaluate(() => {
      const r = { picks: {}, gatedPicked: 0, took: true, fights: 0, bonusWins: 0 };
      const ev = EVENTS.find(e => e.id === 'oldtree'), orig = EVENTS.slice();
      EVENTS.length = 0; EVENTS.push(ev);                           // 한 사건만 나오게
      S.equip.weapon = null; S.shrine.atk = 0;                      // 공격력 조건 미달
      for (let i = 0; i < 40; i++) { const rec = { battles: [] }; RT.journal = []; stepEvent(rec, 'cheongpung', new Set()); const line = RT.journal.find(l => l.text.startsWith('▸ ')).text; RT.journal = null;
        const label = line.slice(2).split(' — ')[0]; r.picks[label] = (r.picks[label] || 0) + 1;
        if (ev.choices.find(c => c.label === label).req && reqFail(ev.choices.find(c => c.label === label).req)) r.gatedPicked++; }
      EVENTS.length = 0; EVENTS.push(...orig);
      // 조건 아이템 소모: 부상당한 약초꾼 첫 선택지(금창약)만 가능한 상황을 만들어 소모 확인
      const herb = EVENTS.find(e => e.id === 'herbalist'), pot0 = (S.inv.potionHp = 5);
      let tookSeen = false;
      for (let i = 0; i < 30 && !tookSeen; i++) { const p0 = count('potionHp'); RT.journal = []; stepEvent({ battles: [] }, 'cheongpung', new Set(EVENTS.filter(e => e.id !== 'herbalist').map(e => e.id))); const t = RT.journal.map(l => l.text).join('\n'); RT.journal = null; if (t.includes(herb.choices[0].label)) tookSeen = count('potionHp') === p0 - herb.choices[0].req.item[1]; S.inv.potionHp = 5; }
      r.took = tookSeen;
      // 전투로 이어지는 사건 + 승리 보너스
      S.equip.weapon = makeGear(MANUALS[S.active.mugong].weapon, 2, 3, false);
      for (let i = 0; i < 30; i++) { S.hp = 1e9; const rec = { battles: [] }; RT.journal = []; const res = stepEvent(rec, 'cheongpung', new Set(EVENTS.filter(e => e.id !== 'ronin').map(e => e.id))); RT.journal = null;
        if (rec.battles.length) { r.fights++; if (rec.battles[0].win && rec.battles[0].rounds.some(x => x.lines.some(l => l.text.includes('술값')))) r.bonusWins++; r.head = res.t; } }
      return r;
    });
    ok('조건 미달 선택지는 고르지 않음 (공격력 22 이상 필요)', auto.gatedPicked === 0 && Object.keys(auto.picks).length >= 1, JSON.stringify(auto.picks));
    ok('조건 아이템을 거는 선택지는 소모', auto.took);
    ok('전투로 이어지는 선택 → 기록된 전투 + 이기면 추가 보상', auto.fights > 0 && auto.bonusWins > 0 && /낭인/.test(auto.head || ''), JSON.stringify(auto));

    // 한 탐험 안에서는 기연이 한 번, 겹치지 않음
    const once = await p.evaluate(() => {
      const W = EXPEDITION.weights, w0 = { ...W }; Object.assign(W, { beast: 0, vault: 0, trap: 0, gimmick: 0, event: 100 });
      S.expedition.zone = 'cheongpung'; S.stamina = 100; const rec = runExpedition(now());
      Object.assign(W, w0);
      return { events: rec.steps.filter(s => s.k === 'event').length, vaults: rec.steps.filter(s => s.k === 'vault').length };
    });
    ok('탐험 한 번에 기연은 한 번 (나머지는 금고로)', once.events === 1 && once.vaults > 3, JSON.stringify(once));

    const ow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    ok('오류/가로스크롤 없음', !errs.length && !ow, errs.join(';'));
    await p.close();
  }
};
