/* [화면] 초식 외침: 말린 두루마리가 무대 왼쪽 바깥에서 굴러 들어오며 풀리고 → 무공 · 초식 이름과 시구 → 다시 말아 거둔다.
   두루마리 · 기운은 한 그림(확정본)에서 나눈 것: 종이(고정) + 기운만 12컷으로 일렁임 · 축은 굴러간 거리만큼 비단 무늬가 돈다(16컷).
   병기 무공의 모든 초식이 외친다 (CALLOUT: 초식 번호마다 같은 두루마리). 실시간 전투(ui_live_fight.js)에서 초식을 펼칠 때마다 · 오의는 오의 막이 내려오기 전에 (설정 탭에서 끌 수 있음). */
/* 두루마리는 모든 비급이 같다 (유저 확정): 초식 번호마다 한 그림, 안의 글(무공 · 초식 이름)과 시구만 그 비급 것으로 바뀐다 */
const CALLOUT = {
  1: { art: 'scroll_1', ax: 'scroll_ax', t: .384, b: .783, glow: '90, 160, 255' },   // 제1초식 — 푸른 불띠 (t · b: 그림 속 종이 띠 위 · 아래)
  2: { art: 'scroll_2', ax: 'scroll_ax', t: .413, b: .711, glow: '255, 190, 80', tone: 'gold' },   // 제2초식 — 금박 연기 (GPT Image 2.5 확정본)
  3: { art: 'scroll_3', ax: 'scroll_ax', t: .394, b: .694, glow: '255, 90, 60', tone: 'red' },   // 오의 — 봉황 날개 (GPT Image 2.5 확정본)
};
const CO_TL = { inEnd: 900, poem: 1000, outStart: 2500, outEnd: 2950, end: 3050 };   // ms — 두루마리 시계 (두루마리 자신의 움직임)
/* 무공 시계: 두루마리가 뜬 뒤 몇 ms에 무공(초식 · 오의)이 시작하는가. 두루마리 시계와 따로 센다 (서로 기다리지 않는다) */
const CO_MOVE_AT = { move: 2500, ougi: 3050 };   // 초식: 감기기 시작할 때 · 오의: 다 거둬진 뒤
const CO_AX = { w: .5, len: .75, start: 1.5, h0: 2.2, c0: .38, aspect: 135 / 505, frames: 16, turn: 4.6 };   // 축 굵기 · 길이 · 다 감겼을 때 굵기 배율 · 그림 비율 · 무늬 한 바퀴(라디안)
/* [SSOT] 무공의 시: 검법은 비급마다 제 시(poem), 그 밖의 갈래는 갈래별 시(CAT_POEMS) 중 등급에 맞는 한 편. 두루마리 외침과 비급 상세 창이 함께 쓴다 (한쪽만 고쳐 시구가 비는 일이 없게) */
const POEM_TIER = { '삼류': 0, '이류': 0, '일류': 1, '절정': 1, '초절정': 2 };
const manualPoem = M => M.poem || (CAT_POEMS[M.weapon || M.cat] && { title: '', lines: CAT_POEMS[M.weapon || M.cat][POEM_TIER[M.grade] || 0] }) || null;
const calloutOf = (mid, n) => (MANUALS[mid] && MANUALS[mid].weapon && MANUALS[mid].stances && MANUALS[mid].stances[n - 1] && CALLOUT[n]) || null;   // 병기 무공이면 모두
/* 시구 크기 · 자리 (유저가 미리보기에서 맞춤): one = 한 줄 시구(제1 · 제2초식) · two = 두 줄 시구(오의), pc · mo(폭 640px 이하)
   k 종이 띠 높이 대비 글자 크기(%) · min 최소 글자(px) · w 한 줄 폭(무대 너비 %) · dx · dy 두루마리 오른쪽 · 종이 띠 위끝에서 옮긴 거리(무대 너비 · 높이 %) */
const CO_POEM = {
  one: { pc: { k: 46, min: 2.5, w: 80, dx: -1, dy: 0 }, mo: { k: 49, min: 0, w: 46, dx: 0, dy: 0 } },
  two: { pc: { k: 46, min: 0, w: 46, dx: -1, dy: -2.5 }, mo: { k: 46, min: 0, w: 50, dx: 0, dy: -3 } },
};
function calloutPreload(mid, n) {
  const C = calloutOf(mid, n); if (C) preloadImgs([ASSET.common(C.art), ASSET.common(C.art + '_hz'), ASSET.common(C.ax), ASSET.common('scroll_face')]);
}
function calloutPlay(sc, mid, n) {
  const C = calloutOf(mid, n), M = MANUALS[mid];
  if (!C || !M || !sc) return Promise.resolve();
  const st = M.stances[n - 1], hj = (st.name.match(/\(([^)]*)\)/) || [])[1] || '', P = (manualPoem(M) || {}).lines || [];
  const lines = (n >= 3 ? P : [P[n - 1]]).filter(Boolean);   // 오의는 시 두 줄을 다
  const box = document.createElement('div'); box.className = 'co'; box.dataset.live = 1; if (C.tone) box.dataset.tone = C.tone;   // 기운 빛깔 (기본 푸름)
  box.innerHTML = `<div class="co-paper"><i class="co-base"></i><i class="co-hz"></i>
      <div class="co-body"><i class="co-face"></i><div class="co-txt"><div class="co-art">${M.name}<small>${M.hanja || ''}</small></div>
      <div class="co-move"><span class="ord">${MOVE_NAME[n - 1]}</span><b>${stanceShort(st.name)}</b><span class="hj">${hj}</span></div></div></div></div>
    <i class="co-ax"></i>`;
  const poem = document.createElement('p'); poem.className = 'co-poem'; poem.dataset.live = 1; poem.style.setProperty('--glow', C.glow);
  poem.innerHTML = lines.map(l => `<span class="co-line">${[...l].map(c => `<span>${c === ' ' ? '&nbsp;' : c}</span>`).join('')}</span>`).join('');
  sc.append(box, poem);
  const paper = box.querySelector('.co-paper'), ax = box.querySelector('.co-ax'), body = box.querySelector('.co-body'), chars = [...poem.querySelectorAll('.co-line > span')];
  paper.style.clipPath = 'inset(0 100% 0 0)';   // 첫 그림부터 말린 채로 (첫 rAF 전에 다 펼친 종이가 한 번 번쩍이지 않게)
  box.querySelector('.co-base').style.backgroundImage = `url('${ASSET.common(C.art)}')`;
  box.querySelector('.co-hz').style.backgroundImage = `url('${ASSET.common(C.art + '_hz')}')`;
  box.querySelector('.co-face').style.backgroundImage = `url('${ASSET.common('scroll_face')}')`;
  ax.style.backgroundImage = `url('${ASSET.common(C.ax)}')`;
  // 크기: 종이 띠 높이를 무대 높이로 정하고, 그림 전체(위아래 기운 포함)를 거꾸로 잡는다. 종이 길이는 글자 길이에 맞춘다
  const S = sc.offsetHeight || 200, band = Math.min(S * .23, (sc.offsetWidth || 400) * .1) * .7, wh = band / (C.b - C.t);   // 넓은 무대에서도 너무 커지지 않게 · 세로 30% 줄임 (유저 요청)
  const SW = sc.offsetWidth || 400, PV = CO_POEM[lines.length > 1 ? 'two' : 'one'][matchMedia('(max-width: 640px)').matches ? 'mo' : 'pc'];
  box.style.fontSize = band + 'px'; poem.style.fontSize = Math.max(PV.min, band * PV.k / 100) + 'px'; poem.style.maxWidth = PV.w + '%';   // 글자 크기는 종이 띠 높이 기준
  box.style.height = wh + 'px'; box.style.top = (Math.min(S * .38, Math.max(S * .28, C.t * wh + S * .01)) - C.t * wh) + 'px';   // 종이 띠 위끝: 무대 높이의 28~38% (왼쪽 위 활력 막대 · 글자와 덜 겹치게)
  body.style.top = C.t * 100 + '%'; body.style.height = (C.b - C.t) * 100 + '%';
  body.style.paddingLeft = Math.round((sc.offsetWidth || 400) * .045) + 'px';
  box.style.width = (body.offsetWidth * 1.04) + 'px';
  poem.style.left = (box.offsetLeft + box.offsetWidth + SW * (.03 + PV.dx / 100)) + 'px'; poem.style.top = (box.offsetTop + C.t * wh + S * PV.dy / 100) + 'px';
  const axH = CO_AX.h0 * CO_AX.len * band; ax.style.height = axH + 'px'; ax.style.top = (C.t * wh + CO_AX.c0 * band - axH / 2) + 'px';   // 축 크기 · 자리는 종이 띠 기준
  const W = box.offsetWidth, rr = axH * CO_AX.aspect * (CO_AX.w / CO_AX.len) / 2;   // 다 풀린 축의 반지름 (px)
  const easeOut = x => 1 - Math.pow(1 - x, 3), easeIn = x => x * x * x;
  const gap = Math.min(75, 1300 / Math.max(1, chars.length));
  return new Promise(done => {
    const t0 = performance.now();
    setTimeout(done, CO_MOVE_AT[n >= 3 ? 'ougi' : 'move']);   // 무공 시계: 두루마리와 따로 세어 그때 무공을 시작한다
    const step = now => {
      const ms = now - t0;
      const p = ms < CO_TL.inEnd ? easeOut(ms / CO_TL.inEnd) : ms < CO_TL.outStart ? 1 : ms < CO_TL.outEnd ? 1 - easeIn((ms - CO_TL.outStart) / (CO_TL.outEnd - CO_TL.outStart)) : 0;
      const x = W * p, grow = 1 + (CO_AX.start - 1) * (1 - p);              // 감긴 종이가 풀릴수록 축이 가늘어진다
      paper.style.clipPath = `inset(0 ${((1 - p) * 100).toFixed(2)}% 0 0)`;
      ax.style.left = x + 'px'; ax.style.transform = `translateX(-50%) scaleX(${(CO_AX.w / CO_AX.len * grow).toFixed(3)})`;
      const fr = ((-Math.floor(x / (CO_AX.turn * rr) * CO_AX.frames) % CO_AX.frames) + CO_AX.frames) % CO_AX.frames;   // 굴러간 거리 → 무늬가 돈 컷
      ax.style.backgroundPositionX = (fr / (CO_AX.frames - 1) * 100) + '%';
      chars.forEach((c, i) => c.classList.toggle('on', ms > CO_TL.poem + i * gap && ms < CO_TL.outStart + 200));
      box.style.opacity = ms > CO_TL.outEnd ? 0 : 1;
      if (ms < CO_TL.end && box.isConnected) requestAnimationFrame(step);
      else { box.remove(); poem.remove(); }
    };
    requestAnimationFrame(step);
  });
}
