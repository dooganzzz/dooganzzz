/* 출정 준비 · 조합 단서 폐지(연구 노트) · 견문록 1차 탭 */
'use strict';
const { ok, GAME_URL, watchErrors, startEquipped, VIEWPORTS, newPage } = require('./lib');

module.exports = async (b) => {
  for (const [w, h] of VIEWPORTS) {
    console.log(`\n=== ${w}px ===`);
    const p = await newPage(b, w, h);
    const errs = watchErrors(p);
    await p.goto(GAME_URL);
    await startEquipped(p);

    // 2. 출정 준비 점검표
    const prep0 = await p.evaluate(() => { ui.tab = 'field'; ui.fieldMap = false; render(); return [...document.querySelectorAll('.prep li')].map(li => `${li.className}:${li.querySelector('.prep-k').textContent}`); });
    ok('2 출정 준비 8줄 (탐험지·무공·병기·장비·생혈고·경공·기공·단약)', prep0.length === 8 && prep0.map(s => s.split(':')[1]).join() === '탐험지,무공,병기,장비,생혈고,경공 · 지형,기공 · 오행,준비한 단약', prep0.join(' | '));
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

    // 5. 견문록 1차 탭 (강호행 두 번을 다녀와 보상을 받은 뒤)
    await p.evaluate(() => { S.expedition.zone = 'cheongpung'; for (let i = 0; i < 2; i++) { S.hp = 1e9; runExpedition(now(), 10); } ui.modal = null; render(); });
    await p.click('[data-tab="chronicle"]');
    const ch = await p.evaluate(() => {
      const t = document.querySelector('#tabs');
      return { on: document.querySelector('.tab.on').dataset.tab, tabs: t.querySelectorAll('.tab').length, over: t.scrollWidth - t.clientWidth, rows: new Set([...t.querySelectorAll('.tab')].map(e => Math.round(e.getBoundingClientRect().top))).size,
        filters: [...document.querySelectorAll('[data-chron]')].map(e => e.textContent).join(','), days: document.querySelectorAll('.chron-day').length, rows2: document.querySelectorAll('.chron-row').length, total: S.log.length };
    });
    ok('5 1차 탭 8개가 한 줄 · 가로 스크롤 없음', ch.on === 'chronicle' && ch.tabs === 8 && ch.over <= 0 && ch.rows === 1, JSON.stringify(ch));
    ok('5 분류: 전체·탐험·전투·획득·인물·경고', ch.filters === '전체,탐험,전투,획득,인물,경고', ch.filters);
    ok('5 날짜별로 묶어 전부 표시', ch.days >= 1 && ch.rows2 === ch.total, JSON.stringify(ch));
    await p.click('[data-chron="battle"]');
    const fb = await p.evaluate(() => { const rows = [...document.querySelectorAll('.chron-row')]; return { n: rows.length, all: rows.every(r => r.querySelector('.watch')), on: document.querySelector('[data-chron].on').dataset.chron }; });
    ok('5 [전투] 거르기 → 관찰하기 줄만', fb.n > 0 && fb.all && fb.on === 'battle', JSON.stringify(fb));
    await p.click('.chron-row .watch');
    await p.waitForFunction(() => /^replay:/.test(ui.modal || ''), null, { timeout: 3000 }).catch(() => {});   // 무대 그림을 풀고 열린다
    ok('5 견문록에서 관찰하기 → 다시 보기', await p.evaluate(() => /^replay:/.test(ui.modal)));
    await p.evaluate(() => { replayStop(); ui.modal = null; render(); });
    await p.click('[data-chron="exp"]');
    await p.click('.chron-more summary');
    const dt = await p.evaluate(() => { const d = document.querySelector('.chron-more[open]'); return d && d.textContent; });
    ok('5 [결산 보기]/[자세히] 펼치기', !!dt && /(은자|수련치|요수|전투|승)/.test(dt), (dt || '').replace(/\s+/g, ' ').slice(0, 80));
    const gone = await p.evaluate(() => { S.expeditions = []; render(); return document.querySelectorAll('.chron-gone').length; });
    ok('5 지워진 탐험은 “상세 기록은 지워졌습니다”', gone > 0, String(gone));
    ok('5 옆 견문록은 없음 (견문록 탭 하나로)', await p.evaluate(() => !document.querySelector('#log') && document.querySelectorAll('.chron .chron-row').length > 0));

    // 6. 저장 이전: 단서 제거
    const mig = await p.evaluate(() => {
      const old = JSON.parse(JSON.stringify(S)); old.knownMats = { salt: 1 }; delete old.zoneLog; delete old.craftNotes;
      const st = migrate(old);
      return { km: 'knownMats' in st, zl: typeof st.zoneLog === 'object' && !!st.zoneLog, cn: Array.isArray(st.craftNotes) };
    });
    ok('6 이전 저장: 단서 삭제 · 구역 경험/연구 노트 기본값', !mig.km && mig.zl && mig.cn, JSON.stringify(mig));

    ok('오류/가로스크롤 없음', !errs.length && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), errs.join(';'));
    await p.close();
  }
};
