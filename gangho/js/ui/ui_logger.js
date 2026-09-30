/* [화면] 견문록: 최신 기록을 맨 위에 붙이는 역순 로그, 본문 높이 맞춤 */

/* 새 기록은 맨 위에 붙인다 (최신이 항상 위) */
Bus.on('log', entry => {
  const el = $('#log'); if (!el) return;
  const p = document.createElement('p');
  p.className = entry.cls; p.innerHTML = entry.text; p.dataset.time = hhmm(entry.t);
  el.prepend(p);
  while (el.children.length > 60) el.lastElementChild.remove();
  el.scrollTop = 0;
});

function renderLog() {
  const el = $('#log'); if (!el || !S) return;
  el.innerHTML = S.log.slice(-60).reverse().map(l => `<p class="${l.cls}" data-time="${hhmm(l.t)}">${l.text}</p>`).join('');
  el.scrollTop = 0;
}

/* 견문록 높이를 왼쪽 본문 패널과 1:1로 맞춘다 (넓은 화면에서만) */
function syncSide() {
  const main = $('#main'), side = $('.side');
  const apply = () => {
    if (innerWidth <= 960) { side.style.height = ''; return; }
    side.style.height = Math.max(320, main.offsetHeight) + 'px';
    const el = $('#log'); if (el) el.scrollTop = 0;
  };
  if (window.ResizeObserver) new ResizeObserver(apply).observe(main);
  addEventListener('resize', apply);
  apply();
}
