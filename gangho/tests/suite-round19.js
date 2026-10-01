/* 정각 출발 · 출정 준비 · 적정 전투력 폐지(구역 경험) · 조합 단서 폐지(연구 노트) · 견문록 1차 탭 */
'use strict';
const { ok, GAME_URL, watchErrors, startEquipped, VIEWPORTS, newPage } = require('./lib');

module.exports = async (b) => {
  for (const [w, h] of VIEWPORTS) {
    console.log(`\n=== ${w}px ===`);
    const p = await newPage(b, w, h);
    const errs = watchErrors(p);
    await p.goto(GAME_URL);
    await startEquipped(p);

    // 1. 정각 출발: 다음 정각 계산 · 첫 탐험만 곧바로 · 이후는 정각마다
    const top = await p.evaluate(() => {
      const d = new Date(2026, 0, 1, 13, 25, 40).getTime(), on = new Date(2026, 0, 1, 14, 0, 0).getTime();
      return { mid: nextTopOfHour(d) === on, exact: nextTopOfHour(on) === on + 3600000 };
    });
    ok('1 다음 정각: 13:25:40 → 14:00, 14:00 정각 → 15:00', top.mid && top.exact, JSON.stringify(top));
    await p.click('[data-tab="field"]');
    await p.click('[data-dest="cheongpung"]');
    await p.click('.settle-sheet [data-act="closemodal"]');
    const hd = await p.evaluate(() => { const d = new Date(S.expedition.nextAt); return { min: d.getMinutes(), sec: d.getSeconds(), ms: d.getMilliseconds(), head: document.querySelector('#status .sect').textContent, hm: clockHM(S.expedition.nextAt) }; });
    ok('1 첫 탐험 뒤 다음 출발은 정각 (분·초 0)', hd.min === 0 && hd.sec === 0 && hd.ms === 0, JSON.stringify(hd));
    ok('1 헤더에 “HH:00 출발” 시각', /^\d\d:00$/.test(hd.hm) && hd.head.includes(`${hd.hm} 출발`), hd.head);
    const late = await p.evaluate(() => {
      const n0 = S.expeditions.length, t = S.expedition.nextAt;
      S.expedition.nextAt = t - 3600000 * 2 - 1; settleExpeditions(); ui.modal = null;   // 정각 두 번이 지나감
      const recs = S.expeditions.slice(n0), nx = new Date(S.expedition.nextAt);
      return { n: recs.length, next: nx.getMinutes() === 0 && nx.getSeconds() === 0 && S.expedition.nextAt > now() };
    });
    ok('1 밀린 정각은 한꺼번에 결산 · 그다음도 정각', late.n === 2 && late.next, JSON.stringify(late));

    // 2. 출정 준비 점검표
    const prep0 = await p.evaluate(() => { render(); return [...document.querySelectorAll('.prep li')].map(li => `${li.className}:${li.querySelector('.prep-k').textContent}`); });
    ok('2 출정 준비 7줄 (탐험지·무공·병기·장비·생혈고·상성·단약)', prep0.length === 7 && prep0.map(s => s.split(':')[1]).join() === '탐험지,무공,병기,장비,생혈고,상성,준비한 단약', prep0.join(' | '));
    const warn = await p.evaluate(() => {
      const r = {}, cat = CAT_ORDER[0], keep = S.active[cat];
      S.active[cat] = null; S.inv.saenghyeol = 0; render();
      const li = k => [...document.querySelectorAll('.prep li')].find(l => l.querySelector('.prep-k').textContent === k);
      r.art = li('무공').classList.contains('warn') && /비어 있음/.test(li('무공').textContent);
      r.pot = li('생혈고').classList.contains('warn');
      r.link = !!li('무공').querySelector('[data-tab="status"][data-sub="martial"]');
      S.active[cat] = keep;
      const mu = S.active.mugong, wt = MANUALS[mu].weapon, other = Object.keys(WEAPON_TYPES).find(t => t !== wt);
      const w = S.equip.weapon, t0 = w && w.wtype; if (w) w.wtype = other; render();
      r.weapon = !w || (li('병기').classList.contains('warn') && /초식이 나가지 않음/.test(li('병기').textContent));
      if (w) w.wtype = t0; S.inv.saenghyeol = 5; render();
      r.fixed = li('무공').classList.contains('ok') && li('생혈고').classList.contains('ok');
      return r;
    });
    ok('2 빈 무공 칸·생혈고 부족 경고 + [무공] 바로가기', warn.art && warn.pot && warn.link, JSON.stringify(warn));
    ok('2 무공과 병기가 안 맞으면 경고', warn.weapon, JSON.stringify(warn));
    ok('2 갖추면 경고 해제', warn.fixed, JSON.stringify(warn));
    await p.click('.prep [data-tab="status"][data-sub="martial"]');
    ok('2 바로가기 → 상태 › 무공', await p.evaluate(() => ui.tab === 'status' && ui.statusSub === 'martial'));

    // 3. 적정 전투력 폐지: 별·권장 수치 없이 겪은 것만
    await p.click('[data-tab="field"]');
    const zc = await p.evaluate(() => {
      const cards = [...document.querySelectorAll('.zone')], txt = cards.map(c => c.textContent).join(' ');
      const zl = S.zoneLog.cheongpung, first = cards[0].textContent;
      return { stars: /★|☆|적정|권장|난이도/.test(txt), trips: zl.trips, shown: first.includes(`다녀옴 ${zl.trips}번`) && first.includes(`${zl.wins}승`), unknown: !zl.bossMet ? /두목: ？/.test(first) : true, never: cards[1].textContent.includes('🔒') };
    });
    ok('3 구역 카드에 별·적정 전투력 없음', !zc.stars, JSON.stringify(zc));
    ok('3 다녀온 횟수·승패·만난 요수 기록', zc.trips === 3 && zc.shown, JSON.stringify(zc));
    ok('3 두목은 만나기 전까지 ？', zc.unknown && zc.never, JSON.stringify(zc));
    const boss = await p.evaluate(() => { const zl = S.zoneLog.cheongpung; zl.bossMet = 1; render(); const c = document.querySelector('.zone').textContent; return c.includes(ENEMIES[ZONES.cheongpung.boss].name); });
    ok('3 두목을 만나면 이름이 드러남', boss);

    // 4. 조합: 단서 없음 · 연구 노트
    const nt = await p.evaluate(() => {
      const r = {};
      S.crafts.alchemy.lv = 1; S.craftNotes = []; goTab('sect', 'forge'); ui.craft = 'alchemy';
      const rec = RECIPES.find(x => x.craft === 'alchemy'), wrong = { herb: 2 };
      Object.assign(S.inv, { herb: 5 }); (S.hp = calcStats().maxHp, S.mp = calcStats().maxMp, doCraft)('alchemy', wrong);
      for (const [id, n] of Object.entries(rec.in)) S.inv[id] = (S.inv[id] || 0) + n * 30;
      for (let i = 0; i < 25 && !(S.craftNotes.find(n => n.ok)); i++) (S.hp = calcStats().maxHp, S.mp = calcStats().maxMp, doCraft)('alchemy', { ...rec.in });
      Object.assign(S.inv, { herb: 5 }); (S.hp = calcStats().maxHp, S.mp = calcStats().maxMp, doCraft)('alchemy', wrong);           // 같은 조합 다시 → 한 줄만
      r.notes = S.craftNotes.map(n => `${n.ok ? 'ok' : n.near ? 'near' : 'fail'}:${Object.keys(n.mats).join('+')}`);
      r.okOut = (S.craftNotes.find(n => n.ok) || {}).out === rec.out;
      r.nomats = !('knownMats' in S);
      ui.pot = { ...wrong }; render();
      r.warn = (document.querySelector('.note-warn') || {}).textContent || '';
      r.list = [...document.querySelectorAll('.notes li')].map(li => li.className);
      ui.pot = {}; render();
      return r;
    });
    ok('4 해 본 조합이 연구 노트에 (같은 조합은 한 줄)', nt.notes.filter(s => s === 'fail:herb').length === 1 && nt.notes.some(s => s.startsWith('ok:')) && nt.okOut, nt.notes.join(' | '));
    ok('4 재료 단서(knownMats) 없음', nt.nomats);
    ok('4 화로에 같은 조합을 넣으면 “이미 해 본 조합” 경고', /이미 해 본 조합/.test(nt.warn) && /실패/.test(nt.warn), nt.warn);
    ok('4 화로 아래 연구 노트 목록 (최신이 위)', nt.list.length === nt.notes.length && nt.list[0] === 'fail', nt.list.join(','));
    const near = await p.evaluate(() => {
      const rec = RECIPES.find(x => x.craft === 'forge' && !S.codex.includes(x.id)) || RECIPES[RECIPES.length - 1];
      for (const [id, n] of Object.entries(rec.in)) S.inv[id] = (S.inv[id] || 0) + n * 2;
      const R = Math.random; Math.random = () => 0.999; (S.hp = calcStats().maxHp, S.mp = calcStats().maxMp, doCraft)(rec.craft, { ...rec.in }); Math.random = R;   // 맞는 조합인데 운이 없어 실패
      const n = craftNoteFor(rec.craft, rec.in), wrongN = craftNoteFor('alchemy', { herb: 2 });
      return { near: n && n.near && !n.ok, wrong: wrongN && !wrongN.near, codex: S.codex.includes(rec.id) };
    });
    ok('4 맞는 조합이 운으로 실패하면 “불길이 크게 일렁임” (틀린 조합은 그냥 실패)', near.near && near.wrong && !near.codex, JSON.stringify(near));
    await p.evaluate(() => { ui.tab = 'codex'; ui.codexTab = 'alchemy'; render(); });
    ok('4 도감에 단서 칸 없음', await p.evaluate(() => !document.querySelector('.ctile.clue, .hidden-mat') && document.querySelectorAll('.recipe-row:not(.unknown)').length >= 1));
    ok('4 사건 보상의 단서 → 수련치', await p.evaluate(() => !JSON.stringify(EVENTS).includes('clue')));

    // 5. 견문록 1차 탭
    await p.click('[data-tab="chronicle"]');
    const ch = await p.evaluate(() => {
      const t = document.querySelector('#tabs');
      return { on: document.querySelector('.tab.on').dataset.tab, tabs: t.querySelectorAll('.tab').length, over: t.scrollWidth - t.clientWidth, rows: new Set([...t.querySelectorAll('.tab')].map(e => Math.round(e.getBoundingClientRect().top))).size,
        filters: [...document.querySelectorAll('[data-chron]')].map(e => e.textContent).join(','), days: document.querySelectorAll('.chron-day').length, rows2: document.querySelectorAll('.chron-row').length, total: S.log.length };
    });
    ok('5 견문록 탭: 6개 탭이 한 줄 · 가로 스크롤 없음', ch.on === 'chronicle' && ch.tabs === 6 && ch.over <= 0 && ch.rows === 1, JSON.stringify(ch));
    ok('5 분류: 전체·탐험·전투·획득·인물·경고', ch.filters === '전체,탐험,전투,획득,인물,경고', ch.filters);
    ok('5 날짜별로 묶어 전부 표시', ch.days >= 1 && ch.rows2 === ch.total, JSON.stringify(ch));
    await p.click('[data-chron="battle"]');
    const fb = await p.evaluate(() => { const rows = [...document.querySelectorAll('.chron-row')]; return { n: rows.length, all: rows.every(r => r.querySelector('.watch')), on: document.querySelector('[data-chron].on').dataset.chron }; });
    ok('5 [전투] 거르기 → 관찰하기 줄만', fb.n > 0 && fb.all && fb.on === 'battle', JSON.stringify(fb));
    await p.click('.chron-row .watch');
    ok('5 견문록에서 관찰하기 → 다시 보기', await p.evaluate(() => /^replay:/.test(ui.modal)));
    await p.evaluate(() => { replayStop(); ui.modal = null; render(); });
    await p.click('[data-chron="exp"]');
    await p.click('.chron-more summary');
    const dt = await p.evaluate(() => { const d = document.querySelector('.chron-more[open]'); return d && d.textContent; });
    ok('5 [결산 보기]/[자세히] 펼치기', !!dt && /(은자|수련치|요수|전투|승)/.test(dt), (dt || '').slice(0, 80));
    const gone = await p.evaluate(() => { S.expeditions = []; render(); return document.querySelectorAll('.chron-gone').length; });
    ok('5 지워진 탐험은 “상세 기록은 지워졌습니다”', gone > 0, String(gone));
    ok('5 옆 견문록은 없음 (견문록 탭 하나로)', await p.evaluate(() => !document.querySelector('#log') && document.querySelectorAll('.chron .chron-row').length > 0));

    // 6. 저장 이전: 단서 제거 · 정각 맞춤
    const mig = await p.evaluate(() => {
      const old = JSON.parse(JSON.stringify(S)); old.knownMats = { salt: 1 }; delete old.zoneLog; delete old.craftNotes;
      old.expedition.nextAt = now() + 25 * 60000 + 1234;
      const st = migrate(old), d = new Date(st.expedition.nextAt);
      return { km: 'knownMats' in st, zl: typeof st.zoneLog === 'object' && !!st.zoneLog, cn: Array.isArray(st.craftNotes), hour: d.getMinutes() === 0 && d.getSeconds() === 0 };
    });
    ok('6 이전 저장: 단서 삭제 · 구역 경험/연구 노트 기본값 · 출발 시각 정각으로', !mig.km && mig.zl && mig.cn && mig.hour, JSON.stringify(mig));

    ok('오류/가로스크롤 없음', !errs.length && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), errs.join(';'));
    await p.close();
  }
};
