/* [화면] 초식 외침: 말린 두루마리가 무대 왼쪽 바깥에서 굴러 들어오며 풀리고 → 무공 · 초식 이름과 시구 → 다시 말아 거둔다.
   두루마리 · 기운은 한 그림(확정본)에서 나눈 것: 종이(고정) + 기운만 12컷으로 일렁임 · 축은 굴러간 거리만큼 비단 무늬가 돈다(16컷).
   그림이 있는 초식만 외친다 (CALLOUT). 실시간 전투(ui_live_fight.js)에서 전투마다 그 초식을 처음 쓸 때 한 번. */
const CALLOUT = {
  'sw1a:1': { art: 'sw1a_1', ax: 'sw1a_ax', t: .384, b: .783, glow: '90, 160, 255' },   // 한상검법 제1초식 — 푸른 불띠 (t · b: 그림 속 종이 띠 위 · 아래)
};
const CO_TL = { inEnd: 900, poem: 1000, outStart: 2500, outEnd: 2950, end: 3050 };   // ms
const CO_AX = { w: .5, len: .75, start: 1.5, h0: 2.2, c0: .38, aspect: 135 / 505, frames: 16, turn: 4.6 };   // 축 굵기 · 길이 · 다 감겼을 때 굵기 배율 · 그림 비율 · 무늬 한 바퀴(라디안)
const calloutOf = (mid, n) => CALLOUT[`${mid}:${n}`] || null;
function calloutPreload(mid, n) {
  const C = calloutOf(mid, n); if (C) preloadImgs([ASSET.callout(C.art), ASSET.callout(C.art + '_hz'), ASSET.callout(C.ax), ASSET.callout('face')]);
}
function calloutPlay(sc, mid, n) {
  const C = calloutOf(mid, n), M = MANUALS[mid];
  if (!C || !M || !sc) return Promise.resolve();
  const st = M.stances[n - 1], hj = (st.name.match(/\(([^)]*)\)/) || [])[1] || '', line = (M.poem && M.poem.lines[n - 1]) || '';
  const box = document.createElement('div'); box.className = 'co'; box.dataset.live = 1;
  box.innerHTML = `<div class="co-paper"><i class="co-base"></i><i class="co-hz"></i>
      <div class="co-body"><i class="co-face"></i><div class="co-txt"><div class="co-art">${M.name}<small>${M.hanja || ''}</small></div>
      <div class="co-move"><span class="ord">${MOVE_NAME[n - 1]}</span><b>${stanceShort(st.name)}</b><span class="hj">${hj}</span></div></div></div></div>
    <i class="co-ax"></i>`;
  const poem = document.createElement('p'); poem.className = 'co-poem'; poem.dataset.live = 1; poem.style.setProperty('--glow', C.glow);
  poem.innerHTML = [...line].map(c => `<span>${c === ' ' ? '&nbsp;' : c}</span>`).join('');
  sc.append(box, poem);
  const paper = box.querySelector('.co-paper'), ax = box.querySelector('.co-ax'), body = box.querySelector('.co-body'), chars = [...poem.children];
  box.querySelector('.co-base').style.backgroundImage = `url('${ASSET.callout(C.art)}')`;
  box.querySelector('.co-hz').style.backgroundImage = `url('${ASSET.callout(C.art + '_hz')}')`;
  box.querySelector('.co-face').style.backgroundImage = `url('${ASSET.callout('face')}')`;
  ax.style.backgroundImage = `url('${ASSET.callout(C.ax)}')`;
  // 크기: 종이 띠 높이를 무대 높이로 정하고, 그림 전체(위아래 기운 포함)를 거꾸로 잡는다. 종이 길이는 글자 길이에 맞춘다
  const S = sc.offsetHeight || 200, band = S * .23, wh = band / (C.b - C.t);
  box.style.fontSize = band + 'px'; poem.style.fontSize = (band * .24) + 'px';   // 글자 크기는 종이 띠 높이 기준
  box.style.height = wh + 'px'; box.style.top = (Math.min(S * .3, Math.max(S * .2, C.t * wh + S * .01)) - C.t * wh) + 'px';
  body.style.top = C.t * 100 + '%'; body.style.height = (C.b - C.t) * 100 + '%';
  body.style.paddingLeft = Math.round((sc.offsetWidth || 400) * .045) + 'px';
  box.style.width = (body.offsetWidth * 1.04) + 'px';
  poem.style.left = (box.offsetLeft + box.offsetWidth + (sc.offsetWidth || 400) * .03) + 'px'; poem.style.top = (box.offsetTop + C.t * wh) + 'px';
  const axH = CO_AX.h0 * CO_AX.len * band; ax.style.height = axH + 'px'; ax.style.top = (C.t * wh + CO_AX.c0 * band - axH / 2) + 'px';   // 축 크기 · 자리는 종이 띠 기준
  const W = box.offsetWidth, rr = axH * CO_AX.aspect * (CO_AX.w / CO_AX.len) / 2;   // 다 풀린 축의 반지름 (px)
  const easeOut = x => 1 - Math.pow(1 - x, 3), easeIn = x => x * x * x;
  const gap = Math.min(75, 1300 / Math.max(1, chars.length));
  return new Promise(done => {
    const t0 = performance.now();
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
      else { box.remove(); poem.remove(); done(); }
    };
    requestAnimationFrame(step);
  });
}
