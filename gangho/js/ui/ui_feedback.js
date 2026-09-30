/* [화면] 연출: 성취 현판·토스트·플로팅 대미지·섬광·셰이크·타자기·지도 도착 */

Bus.on('toast', text => toast(text));
Bus.on('banner', (title, sub, tone) => banner(title, sub, tone));

/* 성취 현판: 경계 돌파·두목 토벌 같은 큰 순간에 화면 위쪽에 잠시 뜬다 */
function banner(title, sub = '', tone = '') {
  let el = $('#banner');
  if (!el) { el = document.createElement('div'); el.id = 'banner'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.className = 'banner ' + tone;
  el.innerHTML = `<b>${title}</b>${sub ? `<small>${sub}</small>` : ''}`;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(banner.t); banner.t = setTimeout(() => el.classList.remove('show'), 2600);
}

function toast(text) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  const box = $('#toasts');
  while (box.children.length >= 2) box.firstChild.remove();
  box.appendChild(el);
  setTimeout(() => el.classList.add('out'), 2600);
  setTimeout(() => el.remove(), 3200);
}

/* 한 합의 연출: 체력 잔상이 따라 줄고, 맞은 쪽이 흔들리고, 피해 숫자가 떠오르며, 초식 이름이 현판처럼 뜬다 */
function playFx(fx) {
  requestAnimationFrame(() => { for (const g of document.querySelectorAll('.bar-ghost[data-to]')) g.style.width = g.dataset.to + '%'; });
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  fx.forEach((f, i) => {
    if (f.side === 'banner') {
      const el = $('#moveBanner'); if (!el) return;
      el.innerHTML = `<span class="${f.k}">${f.t}</span>`; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
      const ar = el.closest('.arena'); if (ar) { ar.classList.remove('flash'); void ar.offsetWidth; ar.classList.add('flash'); }
      return;
    }
    const pl = document.getElementById(f.side === 'me' ? 'pl-me' : 'pl-foe'); if (!pl) return;
    const n = document.createElement('span');
    n.className = `fx-num ${f.k}`; n.textContent = f.t;
    // 피해 숫자는 인장 쪽 위에 띄워 이름과 겹치지 않게 한다
    n.style[f.side === 'me' ? 'left' : 'right'] = (4 + Math.random() * 14) + 'px'; n.style.animationDelay = (i * 120) + 'ms';
    pl.appendChild(n); setTimeout(() => n.remove(), 1600 + i * 120);
    if (f.k === 'miss' || f.k === 'dodge' || reduce) return;
    // 적중: 0.1초 섬광 / 치명·강타: 0.15초 잔떨림
    setTimeout(() => {
      if (!pl.isConnected) return;
      pl.classList.remove('flash-hit'); void pl.offsetWidth; pl.classList.add('flash-hit');
      if (f.big) { pl.classList.remove('shake'); void pl.offsetWidth; pl.classList.add('shake'); }
    }, i * 120);
  });
}

/* 타자기 연출: 인물의 첫 대사와 기연 문구를 한 글자씩. 누르면 곧바로 전부 보인다 */
const typedOnce = new Set(), typing = new Set();

function typewriteAll() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  for (const el of document.querySelectorAll('[data-tw]')) {
    const full = el.textContent, key = el.dataset.tw + '|' + full;
    const live = [...typing].find(j => j.key === key);
    if (live) { live.el = el; el.textContent = full.slice(0, live.i); el.classList.add('typing'); continue; }   // 다시 그려져도 이어 친다
    if (typedOnce.has(key)) continue;
    typedOnce.add(key);
    if (reduce || el.children.length || !full.trim()) continue;
    el.textContent = ''; el.classList.add('typing');
    const job = { el, full, key, i: 0, t0: performance.now() };
    job.done = () => { clearInterval(job.t); typing.delete(job); job.el.textContent = full; job.el.classList.remove('typing'); };
    job.t = setInterval(() => {
      if (!job.el.isConnected) { clearInterval(job.t); typing.delete(job); return; }
      job.i += 1; job.el.textContent = full.slice(0, job.i);
      if (job.i >= full.length) job.done();
    }, 28);
    typing.add(job);
  }
}

function skipTyping(at = Infinity) { for (const job of [...typing]) if (job.t0 < at) job.done(); }   // 이 클릭으로 막 시작된 연출은 남긴다

/* 이동 직후 도착 칸이 살짝 튀어 오른다 */
function stepFx() {
  if (!ui.stepTo) return;
  const el = document.querySelector(`.map-scroll .cell.here[data-xy="${ui.stepTo}"]`);
  ui.stepTo = null;
  if (el) { el.classList.add('step'); setTimeout(() => el.classList.remove('step'), 260); }
}
