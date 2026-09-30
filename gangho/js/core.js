/* 공용 도구: 난수·수치·문자 가공 · 조사 · 이벤트 버스 (DOM 조작 없음). 가장 먼저 읽힌다. */

const rnd = (a, b) => a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(rnd(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const tri = n => (n * (n + 1)) / 2;
/* 게임 시계. 평소엔 실제 시각, AI 자동 플레이 중에만 과거로 돌려 놓고 한 시간씩 앞으로 감는다 */
const CLOCK = { shift: 0 };
const now = () => Date.now() + CLOCK.shift;
const fmt = n => Math.floor(n).toLocaleString('ko-KR');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const today = () => new Date(now()).toISOString().slice(0, 10);
const hhmm = t => { const d = new Date(t || Date.now()); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const hlItem = t => `<span class="hl-item">${t}</span>`;
const hlSilver = n => `<span class="hl-silver">은자 ${fmt(n)}냥</span>`;
const hlContrib = n => `<span class="hl-contrib">문파 공헌도 ${typeof n === 'number' ? fmt(n) : n}</span>`;

function josa(word, pair) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const has = code >= 0 && code <= 11171 && code % 28 !== 0;
  const [a, b] = { 이가: ['이', '가'], 은는: ['은', '는'], 을를: ['을', '를'], 과와: ['과', '와'], 으로: ['으로', '로'] }[pair];
  if (pair === '으로' && code % 28 === 8) return word + '로';
  return word + (has ? a : b);
}

const jo = (word, pair) => josa(word, pair).slice(word.length);

function fmtDur(sec) {
  if (!isFinite(sec) || sec <= 0) return '0분';
  const h = Math.floor(sec / 3600), mnt = Math.ceil((sec % 3600) / 60);
  return h ? `${h}시간 ${mnt}분` : `${mnt}분`;
}

/* ───────── 이벤트 버스 ─────────
   시스템(규칙 엔진)은 DOM을 모른다. 상태를 바꾼 뒤 신호만 보내고, 화면 계층이 받아서 그린다.
   동기 호출이므로 신호를 보낸 줄에서 곧바로 처리된다. */
const Bus = (() => {
  const handlers = {};
  let muted = 0;                                              // AI 자동 플레이 중에는 화면 신호를 잠시 끈다
  return {
    on(type, fn) { (handlers[type] = handlers[type] || []).push(fn); },
    emit(type, ...args) { if (muted) return; for (const fn of handlers[type] || []) fn(...args); },
    mute(on) { muted = Math.max(0, muted + (on ? 1 : -1)); },
  };
})();
/* 시스템이 쓰는 신호 모음 */
const notify = {
  refresh: () => Bus.emit('refresh'),                          // 상태가 바뀌었다: 화면 전체를 다시 그린다
  battle: () => Bus.emit('battle'),                            // 전투 한 합이 끝났다: 전투 무대만 다시 그린다
  view: patch => Bus.emit('view', patch),                      // 화면 상태 전환 (tab·modal·slotSel·stepTo·craftResult·pot)
  toast: text => Bus.emit('toast', text),                      // 짧은 알림
  banner: (title, sub = '', tone = '') => Bus.emit('banner', title, sub, tone),   // 성취 현판
  save: () => Bus.emit('save'),                                // 지금 저장
  trace: (kind, text) => Bus.emit('trace', kind, text),        // 운영자 행동 추적 (견문록과 별개). kind: battle·item+·item-·warn·sys
};
