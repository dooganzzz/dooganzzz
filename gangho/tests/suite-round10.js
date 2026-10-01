/* 사냥터 사건(기연): 데이터 무결성, 기연 탭에 쌓임, 조건·소모, 전투 연결 */
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
        const FX = new Set(['silver', 'items', 'hpPct', 'stamina', 'contrib', 'exp', 'buff', 'perm', 'book', 'gear']);
        for (const ev of EVENTS) {
          if (!(ev.zones === 'all' || ev.zones.every(z => ZONES[z]))) bad.push(ev.id + ':zone');
          if (ev.choices.length < (ev.wares ? 1 : 2)) bad.push(ev.id + ':choices');   // 약장수는 등짐 물건이 선택지로 끼어든다
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

    // 기연: 강호행에서 만나면 기연 탭에 쌓이고, 유저가 고른다 (조건 미달은 거절 · 조건 아이템은 소모 · 싸움으로 이어지기도)
    const enc = await p.evaluate(() => {
      const r = {}, meet = id => { const n0 = (S.encounters || []).length; stepEncounter({ battles: [] }, 'cheongpung', new Set(EVENTS.filter(e => e.id !== id).map(e => e.id))); r.piled = (r.piled || 0) + (S.encounters.length - n0); return S.encounters[S.encounters.length - 1]; };
      // 공격력 조건 미달 선택지는 거절된다
      S.equip.weapon = null; S.shrine.atk = 0;
      const tree = meet('oldtree'), gi = EVENTS.find(e => e.id === 'oldtree').choices.findIndex(c => c.req && c.req.stat);
      r.gated = gi >= 0 ? !!(resolveEncounter(tree.uid, gi) || {}).fail && !tree.done : 'no-gated-choice';
      // 조건 아이템(생혈고)을 거는 선택지는 소모
      const herb = meet('herbalist'), hi = EVENTS.find(e => e.id === 'herbalist').choices.findIndex(c => c.take && c.req && c.req.item);
      S.inv.saenghyeol = 5; const p0 = count('saenghyeol'); resolveEncounter(herb.uid, hi);
      r.took = count('saenghyeol') < p0 && !!herb.done;
      // 싸움으로 이어지는 선택 → 결과에 싸움이 적힌다
      S.equip.weapon = makeGear(MANUALS[S.active.mugong].weapon, 2, 3, false);
      const ri = EVENTS.find(e => e.id === 'ronin').choices.findIndex(c => c.out.some(o => o.fight));
      for (let i = 0; i < 10 && !r.fight; i++) { S.hp = 1e9; const E = meet('ronin'); const d = resolveEncounter(E.uid, ri); if (d && d.fight) r.fight = d.fight; }
      return r;
    });
    ok('기연은 기연 탭에 쌓인다', enc.piled >= 3, JSON.stringify(enc));
    ok('조건 미달 선택지는 고를 수 없음', enc.gated === true, String(enc.gated));
    ok('조건 아이템을 거는 선택지는 소모', enc.took);
    ok('싸움으로 이어지는 선택 → 결과에 싸움', /낭인/.test(enc.fight || ''), enc.fight || '');

    const ow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    ok('오류/가로스크롤 없음', !errs.length && !ow, errs.join(';'));
    await p.close();
  }
};
