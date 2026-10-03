/* 그림 겹침 검사: 모든 탭 · 하위 탭을 PC · 모바일로 띄워, 같은 자리에 그림이 둘 이상 겹쳐 보이는 곳을 찾는다.
   (옛 그림을 지우지 않고 새 그림을 얹는 실수를 잡는다 — CLAUDE.md '그림을 바꿀 때' 3번)
   그림 = 보이는 <img> · 그림 배경(background-image: url) · 큰 <svg>. 둘의 겹친 넓이가 작은 쪽의 60% 이상이면 의심으로 적는다.
   배경 무대 위의 인물 · 이펙트처럼 일부러 겹친 것은 ALLOW에 이유와 함께 적는다.
   실행: node gangho/tools/overlap-check.js  (찾은 것이 있으면 종료 코드 1) */
'use strict';
const { playwright, GAME_URL, testHelpers } = require('../tests/lib.js');
const VIEWS = [['sect', 'grounds'], ['sect', 'hall'], ['sect', 'forge'], ['sect', 'yeonmu'], ['sect', 'shrine'], ['sect', 'shop'], ['status', 'observe'], ['status', 'martial'], ['bag'], ['field'], ['chronicle'], ['encounter'], ['codex'], ['settings']];
// 일부러 겹친 짝 (선택자 둘 중 하나라도 맞으면 넘어감): [아래 그림, 위 그림, 이유]
const ALLOW = [
  ['.live-scene', '*', '강호행 무대: 산길 배경 위에 제자 · 요수 · 소품 · 날씨가 올라감'],
  ['.furnace-stage', '*', '화로: 장면 그림 위에 불꽃 · 버튼'],
  ['.main-header', '*', '머리 배너 그림 위에 제목 글자'],
  ['.meditation-center-frame', '*', '무공 탭 좌선 그림 뒤에 무사 품계 불꽃 고리(같은 고리 그림의 불 꺼진 판 · 켜진 판)'],
  ['.map-box', '*', '강호 지도 화면: 지도 그림 위에 붓글씨 지역 이름 · 황금 기둥'],
  ['.ink-frame', '*', '네모칸: 수묵 칸 테두리(slot_frame) 안에 아이템 · 비급 그림이 들어감 (10월 확정 네모칸)'],
  ['.qi-orbit', '*', '무공 탭: 네 무공 칸을 잇는 큰 기운 고리(선만, 가운데는 비어 있음)가 카드 · 가부좌 그림 뒤에 깔림'],
];
const allowed = (a, b) => ALLOW.some(([x]) => a.closest && (a.closest(x) || b.closest(x)));
(async () => {
  const br = await playwright.chromium.launch(); let found = 0;
  for (const [w, h, tag] of [[1280, 900, 'PC'], [390, 844, '모바일']]) {
    const p = await br.newPage({ viewport: { width: w, height: h } }); await testHelpers(p);
    await p.goto(GAME_URL); await p.waitForTimeout(400); await p.click('#begin'); await p.waitForTimeout(300);
    for (const [tab, sub] of VIEWS) {
      await p.evaluate(([tab, sub]) => { ui.tab = tab; if (sub) { if (tab === 'sect') ui.sectSub = sub; else ui.statusSub = sub; } render(); }, [tab, sub]);
      await p.waitForTimeout(700);
      const hits = await p.evaluate(ALLOW_SEL => {
        const vis = e => { for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const s = getComputedStyle(x); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; } const r = e.getBoundingClientRect(); return r.width > 24 && r.height > 24; };
        const pics = [...document.querySelectorAll('body *')].filter(e => {
          if (e.tagName === 'IMG') return e.complete && e.naturalWidth > 0;
          if (e.tagName.toLowerCase() === 'svg') return !e.closest('button') && e.getBoundingClientRect().width > 48;
          return /url\(/.test(getComputedStyle(e).backgroundImage);
        }).filter(vis);
        const name = e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).join('.') : e.className && e.className.baseVal ? '.' + e.className.baseVal : '') + (e.tagName === 'IMG' ? ` [${e.getAttribute('src').split('/').pop()}]` : '');
        const out = [];
        for (let i = 0; i < pics.length; i++) for (let j = i + 1; j < pics.length; j++) {
          const a = pics[i], b = pics[j]; if (a.contains(b) && a.tagName !== 'IMG' && !/url\(/.test(getComputedStyle(a).backgroundImage)) continue;
          if (ALLOW_SEL.some(s => a.closest(s) || b.closest(s))) continue;
          const r = a.getBoundingClientRect(), q = b.getBoundingClientRect();
          const ix = Math.max(0, Math.min(r.right, q.right) - Math.max(r.left, q.left)), iy = Math.max(0, Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top));
          const small = Math.min(r.width * r.height, q.width * q.height);
          if (ix * iy > small * .6) out.push(`${name(a)}  ×  ${name(b)}  (${Math.round(ix * iy / small * 100)}%)`);
        }
        return out;
      }, ALLOW.map(a => a[0]));
      if (hits.length) { found += hits.length; console.log(`\n[${tag}] ${tab}${sub ? ' › ' + sub : ''}`); hits.slice(0, 12).forEach(x => console.log('  ' + x)); if (hits.length > 12) console.log(`  … 외 ${hits.length - 12}건`); }
    }
    // 강호행 무대 · 관찰 창 무대는 배경 위에 겹치는 게 정상이라 위에서 건너뛰었다. 대신 초식 하나에 초식 그림이 하나만 뜨는지 따로 본다
    await p.evaluate(() => { ui.tab = 'field'; render(); }); await p.waitForTimeout(400);
    const n = await p.evaluate(() => { const sc = document.getElementById('liveScene'); if (!sc || typeof liveSkill !== 'function') return -1;
      liveSkill(sc, { mid: 'sw1a', n: 1, tier: 1, name: '시험', noName: true }); return sc.querySelectorAll('.stance-cut, .live-skill, .live-vfx').length; });
    if (n > 1) { found++; console.log(`\n[${tag}] 강호행 무대: 초식 하나에 초식 그림이 ${n}개 겹침`); }
    await p.close();
  }
  await br.close();
  console.log(found ? `\n겹침 의심 ${found}건 — 옛 그림이 남았는지 확인 (일부러 겹친 것이면 ALLOW에 이유와 함께 추가)` : '겹친 그림 없음');
  process.exit(found ? 1 : 0);
})();
