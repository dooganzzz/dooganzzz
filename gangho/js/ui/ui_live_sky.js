/* [화면] 강호행 무대의 하늘: 하루의 빛(서울 시각) · 달의 위상 · 날씨 · 반딧불이 (무대는 ui_live.js) */
/* 산길 시간대: 지금 시각으로 새벽 · 낮 · 해 질 녘 · 밤 */
/* 하루의 빛: 서울 표준시(KST) 기준 — 새벽 · 낮 · 저녁 · 밤이 시각에 따라 서서히 바뀐다 (빛깔 마디 사이를 고르게 섞는다)
   마디: [KST 분, 위 · 가운데 · 아래 빛깔 rgba, 등불 빛] — 그림 위에 곱하기로 덧씌운다 */
// [위, 가운데, 아래 빛깔, 등불 빛, 햇살, 별 · 달 · 반딧불이]
const TOD_NIGHT = [[40, 52, 110, .78], [60, 70, 120, .62], [40, 45, 80, .7], .22, 0, 1];
const TOD_DAWN = [[255, 196, 200, .55], [255, 226, 200, .25], [255, 240, 225, .1], 0, .15, .1];
const TOD_DAY = [[255, 255, 255, 0], [255, 255, 255, 0], [255, 255, 255, 0], 0, .55, 0];
const TOD_NOON = [[255, 255, 255, 0], [255, 255, 255, 0], [255, 255, 255, 0], 0, 1, 0];
const TOD_DUSK = [[240, 130, 80, .6], [250, 175, 110, .4], [170, 110, 90, .3], .08, .2, .25];
const TOD_KEYS = [[0, TOD_NIGHT], [270, TOD_NIGHT], [360, TOD_DAWN], [450, TOD_DAY], [720, TOD_NOON], [990, TOD_DAY], [1110, TOD_DUSK], [1200, TOD_NIGHT], [1440, TOD_NIGHT]];
const kstMin = (t = now()) => { const d = new Date(t); return (d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60 + 540) % 1440; };
function liveTod(t = now()) { const m = kstMin(t); return m >= 300 && m < 420 ? 'dawn' : m >= 420 && m < 1050 ? 'day' : m >= 1050 && m < 1170 ? 'dusk' : 'night'; }
function liveTodVars(t = now()) {
  const m = kstMin(t), i = TOD_KEYS.findIndex(k => k[0] > m), [m0, A] = TOD_KEYS[i - 1], [m1, B] = TOD_KEYS[i], f = (m - m0) / (m1 - m0);
  const mix = (a, b) => `rgba(${a.map((v, j) => (j < 3 ? Math.round(v + (b[j] - v) * f) : +(v + (b[j] - v) * f).toFixed(3))).join(',')})`;
  const num = j => A[j] + (B[j] - A[j]) * f, W = liveWeather(t), clouded = Math.min(1, W.rain + W.snow * .8 + W.fog * .9);
  // 달: 실제 음력 위상 (0 그믐 → .5 보름 → 1 그믐). 가림 원을 옆으로 밀어 초승 · 반달 · 보름을 낸다
  const ph = moonPhase(t), mx = ph < .5 ? -ph * 200 : (1 - ph) * 200, lit = 1 - Math.abs(1 - ph * 2);
  return `--tt:${mix(A[0], B[0])};--tm:${mix(A[1], B[1])};--tb:${mix(A[2], B[2])};--glow:${num(3).toFixed(3)};--sun:${(num(4) * (1 - clouded)).toFixed(3)}`
    + `;--star:${(num(5) * (1 - clouded * .85)).toFixed(3)};--fly:${(num(5) * (1 - Math.max(W.rain, W.snow))).toFixed(3)};--moonx:${mx.toFixed(1)}%;--moonlit:${lit.toFixed(2)}`
    + `;--rain:${W.rain.toFixed(3)};--snow:${W.snow.toFixed(3)};--fog:${W.fog.toFixed(3)}`;
}
/* 달의 위상: 삭(2000-01-06 18:14 UTC)에서 지난 날 ÷ 삭망월 29.53일 */
const moonPhase = (t = now()) => (((t - Date.UTC(2000, 0, 6, 18, 14)) / 86400000 / 29.530589) % 1 + 1) % 1;
/* 날씨: 서울 시각 3시간마다 모두에게 같은 날씨(시각으로 정해진 주사위). 마디 앞뒤 40분 동안 서서히 들고 난다.
   겨울(12~2월)에는 비 대신 눈 */
const WEATHER = { blockH: 3, fadeMin: 40, odds: [['clear', 64], ['rain', 14], ['fog', 14], ['snow', 8]] };
function liveWeatherKind(block) {
  let x = Math.imul(block ^ 0x9e3779b9, 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16;
  let r = (x >>> 0) % 100, k = 'clear';
  for (const [w, n] of WEATHER.odds) { if (r < n) { k = w; break; } r -= n; }
  const mon = new Date(block * WEATHER.blockH * 3600000).getUTCMonth(), winter = mon === 11 || mon <= 1;
  return k === 'snow' && !winter ? 'rain' : k === 'rain' && winter ? 'snow' : k;
}
function liveWeather(t = now()) {
  const H = WEATHER.blockH * 3600000, k = t + 9 * 3600000, b = Math.floor(k / H), into = (k - b * H) / 60000, left = H / 60000 - into;
  const cur = liveWeatherKind(b), out = { rain: 0, snow: 0, fog: 0, kind: cur };
  const fade = WEATHER.fadeMin, edge = m => Math.min(1, m / fade);
  // 앞 · 뒤 마디도 같은 날씨면 그 경계에서는 끊기지 않고 이어진다
  if (cur !== 'clear') out[cur] = Math.min(liveWeatherKind(b - 1) === cur ? 1 : edge(into), liveWeatherKind(b + 1) === cur ? 1 : edge(left));
  return out;
}
/* 하루의 빛 값을 화면 뿌리(:root)에 둔다 — 강호행 무대와 상단 배너가 함께 쓴다 */
function liveTodApply(sc) {
  const v = liveTodVars(), root = document.documentElement;
  if (root._tod !== v) { root._tod = v; for (const kv of v.split(';')) { const [k, x] = kv.split(':'); root.style.setProperty(k, x); if (sc) sc.style.setProperty(k, x); } }
  if (sc && sc.dataset.tod !== liveTod()) sc.dataset.tod = liveTod();
}
/* 밤하늘 · 반딧불이: 자리는 고정(다시 그려도 튀지 않게) */
const LIVE_FLIES = [[18, 70, 0], [27, 80, 1.3], [36, 66, 2.6], [48, 76, .7], [57, 69, 3.4], [66, 82, 1.9], [74, 71, 4.1], [83, 78, 2.2], [90, 67, .4], [42, 85, 3]];
