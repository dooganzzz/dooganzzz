/* [화면] 연출: 성취 현판·토스트·플로팅 대미지·섬광·셰이크·타자기 */

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
  if (text.includes('「')) el.innerHTML = el.innerHTML.replace(/「([^」]+)」/g, '<b class="kw-place">「$1」</b>');   // 가야 할 곳 강조 (글은 먼저 textContent로 이스케이프)
  const box = $('#toasts');
  while (box.children.length >= 2) box.firstChild.remove();
  box.appendChild(el);
  setTimeout(() => el.classList.add('out'), 2600);
  setTimeout(() => el.remove(), 3200);
}

/* 한 합의 연출: 체력 잔상이 따라 줄고, 맞은 쪽이 흔들리고, 피해 숫자가 떠오르며, 초식 이름이 현판처럼 뜬다 */
function playFx(fx) {
  requestAnimationFrame(() => { for (const g of document.querySelectorAll('.bar-ghost[data-to]')) g.style.width = g.dataset.to + '%'; });
  const reduce = reduceMotion();
  fx.forEach((f, i) => {
    if (f.side === 'banner') {
      const el = $('#moveBanner'); if (!el) return;
      el.innerHTML = `<span class="${f.k}${f.n >= 3 ? ' ougi' : ''}${String(f.t).length > 9 ? ' long' : ''}">${f.t}</span>`;   // 오의는 금빛 · 긴 초식명은 글씨를 줄인다 el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
      const ar = el.closest('.arena'); if (ar) { ar.classList.remove('flash'); void ar.offsetWidth; ar.classList.add('flash'); if (!reduce) stanceAnim(ar, f); }
      return;
    }
    const pl = document.getElementById(f.side === 'me' ? 'pl-me' : 'pl-foe'); if (!pl) return;
    const n = document.createElement('span');
    n.className = `fx-num ${f.k}`; n.textContent = f.t;
    // 피해 숫자는 인장 쪽 위에 띄워 이름과 겹치지 않게 한다
    n.style[f.side === 'me' ? 'left' : 'right'] = (4 + Math.random() * 14) + 'px'; n.style.animationDelay = (i * 120) + 'ms';
    pl.appendChild(n); setTimeout(() => n.remove(), 1600 + i * 120);
    if (f.k === 'miss' || f.k === 'dodge' || reduce) return;
    // 적중: 0.1초 섬광 + 칼바람 / 치명·강타: 0.15초 잔떨림 + 먹물 번짐 / 내가 맞으면 가장자리가 붉게
    setTimeout(() => {
      if (!pl.isConnected) return;
      pl.classList.remove('flash-hit'); void pl.offsetWidth; pl.classList.add('flash-hit');
      if (f.big) { pl.classList.remove('shake'); void pl.offsetWidth; pl.classList.add('shake'); }
      hitMark(pl, f);
      if (f.side === 'me') { const ar = pl.closest('.arena'); if (ar) { ar.classList.remove('hurt'); void ar.offsetWidth; ar.classList.add('hurt'); } }
    }, i * 120);
  });
}

/* 초식 연출: 초식이 터지면 요수 쪽 허공에 병기마다 다른 먹선 동작이 그려진다.
   검 = 가는 세 줄 베기 · 도 = 두꺼운 초승달 내려치기 · 창 = 곧은 찌르기와 파문 · 권장 = 겹겹 충격파와 장인(掌印) · 암기 = 날아가는 비표들.
   반격 등 무공 그림이 없는 연출에 쓴다. 초식 이름으로 기울기를 바꿔 초식마다 모양이 조금씩 다르다 */
const STANCE_SVG = {
  sword: (k) => Array.from({ length: 2 + k }, (_, i) => `<path class="stroke" style="--d:${i * 90}ms" d="M${18 + i * 14} ${104 - i * 10}Q${96 + i * 6} ${8 + i * 12} ${186 - i * 8} ${26 + i * 16}"/>`).join(''),
  blade: (k) => `<path class="fill" d="M24 22Q120 ${40 + k * 6} 178 112Q${118 - k * 4} 70 24 22Z"/><path class="stroke" style="--d:60ms" d="M24 22Q120 ${40 + k * 6} 178 112"/>` + (k > 1 ? `<path class="stroke" style="--d:200ms" d="M40 12Q132 36 190 96"/>` : ''),
  spear: (k) => `<path class="stroke thrust" d="M6 60H194"/><path class="fill" d="M194 60l-18-8v16z"/>` + Array.from({ length: k }, (_, i) => `<circle class="ring" style="--d:${120 + i * 110}ms" cx="180" cy="60" r="${10 + i * 6}"/>`).join(''),
  fist: (k) => Array.from({ length: 1 + k }, (_, i) => `<circle class="ring" style="--d:${i * 120}ms" cx="130" cy="60" r="${16 + i * 12}"/>`).join('') + `<path class="fill palm" d="M118 74c-6-10-4-26 2-34 2-6 8-4 8 2v-10c0-6 8-6 8 0v-4c0-6 8-6 8 0v6c0-6 8-6 8 0v24c0 12-8 22-20 22-6 0-10-2-14-6z"/>`,
  hidden: (k) => Array.from({ length: 3 + k * 2 }, (_, i) => `<path class="dart" style="--d:${i * 70}ms;--y:${(i % 5) * 18 - 36}px" d="M10 60h26m0 0l-7-4m7 4l-7 4"/>`).join(''),
};
const hashStr = t => [...String(t)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
function stanceAnim(ar, f) {
  if (f.mid && f.n) {                                     // 무공마다 다른 초식 그림 (제1 · 제2초식 = 먹빛 · 오의 = 광휘). 스프라이트 무대가 있으면 무대가 띄운다
    if ($('#spStage')) return;
    const v = document.createElement('div'); v.className = `stance-vfx n${f.n >= 3 ? 2 : 1}`; v.setAttribute('aria-hidden', 'true');
    const fx = stanceFxEl(v, f.mid, f.n, ''); if (!fx) return;
    ar.appendChild(v); v.appendChild(fx);   // 초식 그림은 ui_sprite.js stanceFxEl 한 곳에서 고른다
    setTimeout(() => v.remove(), 1500); return;
  }
  const w = STANCE_SVG[f.w] ? f.w : 'sword', n = f.k === 'counter' ? 1 : f.n >= 3 ? 3 : f.n >= 2 ? 2 : 1;   // 오의는 금빛
  const tilt = (hashStr(f.t) % 31) - 15;
  const el = document.createElement('div');
  el.className = `stance-anim w-${w} n${n} ${f.k === 'counter' ? 'counter' : ''}`;
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<svg viewBox="0 0 200 120" style="transform:rotate(${tilt}deg)">${STANCE_SVG[w](n)}</svg>`;
  ar.appendChild(el); setTimeout(() => el.remove(), 1500);
}

/* 적중 자국: 인장 위로 칼바람 한 줄, 회심면 먹물이 번진다 */
function hitMark(pl, f) {
  const av = pl.querySelector('.seal-av'); if (!av) return;
  const m = document.createElement('span');
  m.className = f.k === 'crit' ? 'fx-ink' : 'fx-slash';
  if (f.k === 'crit') m.innerHTML = '<svg viewBox="0 0 60 60"><path d="M30 6q8 10 18 6q-4 10 6 16q-10 4-6 14q-10-4-16 8q-4-10-16-8q4-10-8-16q10-4 6-14q10 4 16-6z"/></svg>';
  else m.style.setProperty('--rot', (f.side === 'me' ? 35 : -35) + (Math.random() * 20 - 10) + 'deg');
  av.appendChild(m); setTimeout(() => m.remove(), 700);
}

/* 타자기 연출: 인물의 첫 대사와 기연 문구를 한 글자씩. 누르면 곧바로 전부 보인다 */
const typedOnce = new Set(), typing = new Set();

function typewriteAll() {
  const reduce = reduceMotion();
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
      if (job.i % 2 && full[job.i - 1].trim()) sfx('type');           // 대사 도트음 (두 글자마다)
      if (job.i >= full.length) job.done();
    }, 28);
    typing.add(job);
  }
}

function skipTyping(at = Infinity) { for (const job of [...typing]) if (job.t0 < at) job.done(); }   // 이 클릭으로 막 시작된 연출은 남긴다

