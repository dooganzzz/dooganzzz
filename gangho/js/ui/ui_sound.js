/* [화면] 소리: 배경음악 · 효과음 · 날씨 소리를 여기서만 낸다. 크기는 설정(S.settings.bgmVol · sfxVol 0~100, bgmOff · sfxOff로 끔).
   · 배경음악: 장면마다 곡(data/assets.js BGM_TRACKS, 없으면 정청 곡). 곡 끝과 처음을 SND.xf초 겹쳐 끊김 없이 되풀이하고,
     장면이 바뀌면 2초에 걸쳐 바꿔 튼다.
   · 효과음: 녹음 묶음(audio/sfx.mp3 · SFX_SPRITE — 누르기 · 발소리 · 칼 · 주먹 · 피격 · 모루 · 장착 · 비급 · 엽전 · 유리)이 있으면 녹음으로,
     녹음이 없는 소리(대사 도트음 · 포탈 · 휘익 · 물약 · 오의 징 · 두목 북 · 날씨)와 묶음을 받기 전에는 그 자리에서 합성한다.
   · 날씨: 강호행 산길에서 바람(늘 낮게) · 비 · 눈(바람이 세짐) · 안개(먹먹한 바람).
   · 브라우저는 사람이 한 번 누르거나 글자를 쳐야 소리를 내 주므로 첫 손길(로그인 화면의 아이디 입력 등)에 시작한다.
     아이폰은 audio.volume이 듣지 않아 Web Audio 크기 마디(gain)로 줄인다. 화면을 내리면 쉰다 */
/* 소리 전체 스위치 (10월 3일 유저: 효과음 · 배경음악 일단 전부 뺌). false면 소리 · 날씨 소리 · 소리 파일 받기 · 설정 칸 · 행동 감시가 모두 꺼진다 */
const SOUND_ON = true;   // 10월 3일 밤 유저: 배경음악 · 효과음 · 설정 칸 다시 켬
const SND = { ctx: null, bgmBus: null, sfxBus: null, noise: null, deck: null, track: null, last: {}, amb: null, xf: 4, userAt: 0, hover: null };
const SND_DEF = { bgmVol: 5, sfxVol: 5 };   // 처음 크기 (10월 3일 유저: 둘 다 5)
function sndVol(k) {
  const s = typeof S !== 'undefined' && S && S.settings;
  if (s && s[k.replace('Vol', 'Off')]) return 0;
  const v = s && s[k] != null ? s[k] : SND_DEF[k];
  return Math.max(0, Math.min(100, +v || 0)) / 100;
}
function sndInit() {
  if (!SOUND_ON) return;
  SND.userAt = performance.now();
  if (SND.ctx) { if (SND.ctx.state === 'suspended' && !document.hidden) SND.ctx.resume().catch(() => {}); if (SND.deck && SND.deck.el.paused) SND.deck.el.play().catch(() => {}); return; }   // 첫 화면에서 막혔던 배경음악을 첫 손길에 이어 튼다
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  const c = SND.ctx = new AC();
  SND.bgmBus = c.createGain(); SND.sfxBus = c.createGain();
  SND.bgmBus.connect(c.destination);
  // 효과음을 둥글게 (10월 3일 유저 '소리가 너무 튄다'): 높은 소리를 깎고(저역 통과) · 갑자기 큰 소리를 눌러 고르게(압축) · 방 울림을 살짝(잔향)
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200; lp.Q.value = .5;
  const cmp = c.createDynamicsCompressor(); cmp.threshold.value = -26; cmp.knee.value = 12; cmp.ratio.value = 4; cmp.attack.value = .004; cmp.release.value = .18;
  const rv = c.createConvolver(), rvG = c.createGain(), n = Math.floor(c.sampleRate * .9), ir = c.createBuffer(2, n, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); }
  rv.buffer = ir; rvG.gain.value = .14;
  SND.sfxBus.connect(lp); lp.connect(cmp); cmp.connect(c.destination); cmp.connect(rv); rv.connect(rvG); rvG.connect(c.destination);
  const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = nb.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  SND.noise = nb;
  if (location.protocol !== 'file:') fetch(ASSET.audio('sfx')).then(r => r.arrayBuffer()).then(b => c.decodeAudioData(b)).then(buf => { SND.rec = buf; }).catch(() => {});   // 녹음 효과음 묶음 (파일로 바로 연 화면에서는 받지 못하므로 합성음만)
  sndApply(true); sndTick();
}
['pointerdown', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, sndInit, true));
// 첫 화면에서 바로 틀어 본다 (10월 3일 유저). 브라우저가 손길 전 소리를 막으면 조용히 기다렸다가 첫 손길에 시작한다
if (SOUND_ON) addEventListener('load', () => { try { sndInit(); } catch (e) {} });
document.addEventListener('visibilitychange', () => { const c = SND.ctx; if (!c) return; if (document.hidden) c.suspend(); else c.resume().catch(() => {}); });
function sndApply(now) {
  const c = SND.ctx; if (!c) return;
  for (const [bus, k] of [[SND.bgmBus, 'bgmVol'], [SND.sfxBus, 'sfxVol']]) {
    const v = sndVol(k);
    if (bus._v !== v) { bus._v = v; bus.gain.cancelScheduledValues(c.currentTime); bus.gain.setTargetAtTime(v, c.currentTime, now ? .01 : .15); }
  }
}
function sndToggle(kind) {
  const k = kind + 'Off';
  S.settings = { ...(S.settings || {}), [k]: !(S.settings && S.settings[k]) };
  sndApply(); toast(`${kind === 'bgm' ? '배경음악' : '효과음'}을 ${S.settings[k] ? '껐' : '켰'}습니다.`); notify.save(); render();
}

/* ───────── 배경음악: 곡 하나 = 데크 하나 (audio → 크기 마디 → 배경음악 버스) ───────── */
function bgmDeck(track, fadeIn) {
  const c = SND.ctx, el = new Audio(ASSET.audio(track)); el.preload = 'auto';
  const src = c.createMediaElementSource(el), g = c.createGain(); src.connect(g); g.connect(SND.bgmBus);
  g.gain.setValueAtTime(0, c.currentTime); g.gain.linearRampToValueAtTime(1, c.currentTime + fadeIn);
  const dk = { el, g, src, track, xf: false };
  el.addEventListener('timeupdate', () => {          // 끝나기 SND.xf초 전에 같은 곡을 처음부터 겹쳐 튼다
    if (!dk.xf && SND.deck === dk && el.duration && el.duration - el.currentTime < SND.xf) { dk.xf = true; bgmSwap(track, SND.xf); }
  });
  el.play().catch(() => {});
  return dk;
}
function bgmDrop(dk, fade) {
  if (!dk) return;
  const c = SND.ctx, t = c.currentTime;
  dk.g.gain.cancelScheduledValues(t); dk.g.gain.setValueAtTime(dk.g.gain.value, t); dk.g.gain.linearRampToValueAtTime(0, t + fade);
  setTimeout(() => { try { dk.el.pause(); dk.src.disconnect(); dk.g.disconnect(); } catch (e) {} }, fade * 1000 + 100);
}
function bgmSwap(track, fade) { const old = SND.deck; SND.track = track; SND.deck = bgmDeck(track, fade); bgmDrop(old, fade); }
function bgmScene() {
  const sc = document.getElementById('liveScene');
  if (!sc || !sc.isConnected) return 'hall';
  return sc.classList.contains('boss') ? 'boss' : sc.classList.contains('fight') ? 'fight' : 'live';
}
const bgmTrackOf = scene => BGM_TRACKS[scene] || (scene === 'boss' && BGM_TRACKS.fight) || BGM_TRACKS.hall;

/* ───────── 날씨 소리: 강호행 산길에서만 (바람은 늘 낮게, 비 · 눈 · 안개는 그날 날씨대로) ───────── */
function ambBuild() {
  const c = SND.ctx, mk = (type, f, q) => { const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(); s.buffer = SND.noise; s.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(SND.sfxBus); s.start(0, Math.random()); return { fl, g }; };
  const wind = mk('bandpass', 420, .9), rain = mk('highpass', 1200, .5), hiss = mk('bandpass', 5200, .7);
  const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = .09; lg.gain.value = 180; lfo.connect(lg); lg.connect(wind.fl.frequency); lfo.start();   // 바람이 일었다 잦아든다
  SND.amb = { wind, rain, hiss };
}
function ambSet() {
  const c = SND.ctx; if (!c) return;
  const sc = document.getElementById('liveScene'), on = !!(sc && sc.isConnected && !document.hidden);
  if (!on && !SND.amb) return;
  if (!SND.amb) ambBuild();
  const W = on && typeof liveWeather === 'function' ? liveWeather(now()) : { rain: 0, snow: 0, fog: 0 };
  const t = c.currentTime, A = SND.amb, set = (n, v) => n.g.gain.setTargetAtTime(v, t, 1.2);
  set(A.wind, on ? .05 + W.snow * .14 + W.fog * .05 : 0);
  set(A.rain, on ? W.rain * .07 : 0); set(A.hiss, on ? W.rain * .025 + W.snow * .01 : 0);
  A.wind.fl.Q.value = W.fog > .3 ? .6 : .9;
}
function sndTick() { if (!SND.ctx) return; sndApply(); const tr = bgmTrackOf(bgmScene()); if (tr !== SND.track) bgmSwap(tr, SND.deck ? 2 : 1.5); ambSet(); }
setInterval(sndTick, 1000);

/* ───────── 효과음 합성 ───────── */
function sOsc(type, f0, f1, t0, dur, vol) {
  const c = SND.ctx, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t0); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + .015);   // 첫머리를 부드럽게 (딱 소리 없이) g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
  o.connect(g); g.connect(SND.sfxBus); o.start(t0); o.stop(t0 + dur + .02);
}
function sNoise(t0, dur, vol, type, f0, f1, q = 1, att = .004) {
  const c = SND.ctx, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
  s.buffer = SND.noise; s.loop = true; fl.type = type; fl.frequency.setValueAtTime(f0, t0); if (f1 !== f0) fl.frequency.exponentialRampToValueAtTime(f1, t0 + dur); fl.Q.value = q;
  g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + att); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
  s.connect(fl); fl.connect(g); g.connect(SND.sfxBus); s.start(t0, Math.random() * 1.5); s.stop(t0 + dur + .02);
}
const coin = (t, f) => { sOsc('sine', f, f, t, .25, .07); sOsc('sine', f * 2.7, f * 2.7, t, .12, .03); };
const bell = (t, f, v = .08, d = 1.4) => { [1, 2.76, 5.4].forEach((r, i) => sOsc('sine', f * r, f * r, t, d / (1 + i), v / (1 + i * 1.5))); };
const SFX = {
  type: t => { const f = 760 + Math.random() * 180; sOsc('square', f, f, t, .035, .025); },                                    // 대사 도트음
  click: t => { sOsc('sine', 1400, 800, t, .05, .1); sNoise(t, .025, .04, 'bandpass', 3000, 3000, 2); },                    // 나무 딱
  portal: t => { [0, .06, .12].forEach((d, i) => sOsc('sine', 420 * (1 + i * .5), 900 * (1 + i * .5), t + d, .6, .035)); sNoise(t, .7, .03, 'bandpass', 900, 3800, 3, .25); },
  step: (t, o) => {                                                                                                         // 발소리: 흙 · 젖은 땅 · 눈
    const v = o.run ? 1 : .7;
    if (o.ground === 'snow') sNoise(t, .1, .14 * v, 'bandpass', 2400, 1500, 1.5);
    else if (o.ground === 'rain') { sNoise(t, .08, .12 * v, 'bandpass', 1500, 800, 1.2); sOsc('sine', 320, 160, t, .05, .03 * v); }
    else sNoise(t, .07, .12 * v, 'lowpass', 900, 400, .7);
    sOsc('sine', 110, 60, t, .07, .08 * v);
  },
  slash: (t, o) => { const k = o.crit ? 1.3 : 1; sNoise(t, .16, .4 * k, 'bandpass', 7000, 1300, 1.4); sOsc('sine', 2900, 2800, t + .01, .3, .03 * k); sOsc('sine', 4300, 4200, t + .01, .2, .02 * k); },
  pierce: (t, o) => { const k = o.crit ? 1.3 : 1; sNoise(t, .1, .35 * k, 'bandpass', 3200, 1800, 1.6); sOsc('sine', 180, 70, t + .03, .12, .3 * k); },
  punch: (t, o) => { const k = o.crit ? 1.3 : 1; sOsc('sine', 160, 45, t, .16, .45 * k); sNoise(t, .05, .25 * k, 'lowpass', 1800, 600, .7); },
  dart: t => { sNoise(t, .08, .15, 'highpass', 4000, 6000, .7); sOsc('triangle', 1700, 900, t + .02, .06, .1); },
  crit: t => { sOsc('sine', 90, 40, t, .35, .3); bell(t + .02, 1320, .04, .6); },
  miss: t => sNoise(t, .28, .12, 'bandpass', 700, 2600, 1.2, .1),                                                          // 휘익
  hurt: t => { sOsc('sine', 120, 50, t, .2, .4); sNoise(t, .08, .2, 'lowpass', 900, 300, .7); },
  salve: t => { sNoise(t, .2, .08, 'bandpass', 1800, 900, .8, .05); sNoise(t + .22, .2, .07, 'bandpass', 1600, 800, .8, .05); sOsc('sine', 660, 660, t + .45, .5, .04); sOsc('sine', 990, 990, t + .57, .6, .035); },   // 생혈고를 바름 · 기운이 돎
  heal: t => { sOsc('sine', 660, 660, t, .5, .05); sOsc('sine', 990, 990, t + .12, .6, .04); },
  ko: t => { sOsc('sine', 90, 35, t, .6, .4); sNoise(t, .3, .15, 'lowpass', 500, 150, .7); },
  boss: t => { sOsc('sine', 65, 38, t, 1.4, .55); sNoise(t, .5, .2, 'lowpass', 300, 80, .7); sOsc('sine', 65, 38, t + .38, 1.2, .45); },   // 큰북 두 번
  ougi: t => { [1, 1.48, 2, 2.73, 3.6].forEach((r, i) => sOsc('sine', 98 * r, 97 * r, t, 2.8 - i * .35, .11 / (1 + i * .6))); sNoise(t, .9, .08, 'bandpass', 500, 3000, .8, .3); },   // 징
  scroll: t => sNoise(t, .4, .07, 'bandpass', 2500, 3500, .6, .05),                                                        // 두루마리 펼침
  drink: t => { [0, .13, .26].forEach(d => { sOsc('sine', 300, 520, t + d, .09, .08); sNoise(t + d, .06, .04, 'bandpass', 900, 600, 2); }); sOsc('sine', 880, 880, t + .45, .4, .03); },   // 꿀꺽꿀꺽 · 맑은 기운
  forge: (t, o) => { for (let i = 0; i < 3; i++) { const d = i * .22; sOsc('sine', 1900, 1850, t + d, .5, .07); sOsc('sine', 2950, 2900, t + d, .35, .04); sNoise(t + d, .05, .2, 'bandpass', 4000, 2000, 1); }
    if (o.ok) sNoise(t + .7, .6, .06, 'highpass', 3000, 6000, .5, .1); else sNoise(t + .7, .8, .08, 'lowpass', 600, 200, .7, .2); },   // 모루 망치 세 번 · 불똥 / 꺼지는 연기
  alchemy: (t, o) => { for (let i = 0; i < 6; i++) { const f = 300 + Math.random() * 400; sOsc('sine', f, f * 1.6, t + i * .09, .08, .04); }   // 보글보글
    if (o.ok) bell(t + .6, 880, .06, 1.6); else sNoise(t + .6, .9, .07, 'lowpass', 500, 150, .7, .2); },
  merge: t => { sNoise(t, .35, .07, 'bandpass', 2200, 3200, .7, .05); sNoise(t + .3, .3, .06, 'bandpass', 2600, 3600, .7, .05); bell(t + .7, 660, .06, 1.4); },   // 종이를 엮고 · 되살아남
  enhance: (t, o) => { sOsc('sine', 1900, 1850, t, .5, .07); sNoise(t, .05, .18, 'bandpass', 4000, 2000, 1);
    if (o.kind === 'ok') { sOsc('sine', 523, 523, t + .3, .5, .05); sOsc('sine', 784, 784, t + .42, .7, .05); } else sOsc('sine', 220, 140, t + .3, .6, .08); },   // 오르면 위로 · 실패는 아래로
  starup: t => { [523, 659, 784, 1047].forEach((f, i) => sOsc('sine', f, f, t + i * .11, .9 - i * .1, .045)); bell(t + .5, 1047, .05, 1.8); },   // 무공 승급
  equip: t => { sOsc('sine', 2400, 2300, t, .25, .05); sNoise(t, .05, .15, 'bandpass', 3500, 2000, 1); sOsc('sine', 180, 90, t + .02, .08, .15); },   // 철컥
  unequip: t => { sNoise(t, .18, .08, 'bandpass', 1500, 600, .9, .02); sOsc('sine', 1600, 1400, t + .08, .15, .025); },
  book: t => { sNoise(t, .25, .08, 'bandpass', 2000, 3200, .6, .03); sOsc('sine', 220, 180, t + .05, .1, .06); },             // 비급을 꽂고 빼기
  learn: t => { sNoise(t, .3, .07, 'bandpass', 2000, 3200, .6, .03); bell(t + .25, 784, .05, 1.4); },
  buy: t => { coin(t, 2100); coin(t + .07, 2500); },                                                                           // 엽전 짤랑
  sell: t => { for (let i = 0; i < 5; i++) coin(t + i * .05, 1800 + Math.random() * 900); },                                   // 엽전 쏟아짐
  pray: t => bell(t, 330, .1, 2.6),
  mirror_crack: t => { sNoise(t, .06, .25, 'highpass', 3000, 5000, .7); sOsc('sine', 3200, 2400, t, .12, .04); },   // 거울에 금 가는 소리
  mirror_break: t => { for (let i = 0; i < 9; i++) { const f = 2500 + Math.random() * 4000; sOsc('sine', f, f, t + i * .03, .3, .03); } sNoise(t, .5, .2, 'highpass', 2500, 6000, .7, .01); },                                                                                            // 무신상 공양 · 풍경
};
/* 녹음 효과음: 묶음에서 한 벌을 골라(바로 앞과 다른 것) 낸다. 묶음을 아직 못 받았으면 false → 합성음으로 */
function rec(name, t, vol = .7, o = {}) {
  const L = SND.rec && SFX_SPRITE[name]; if (!L) return false;
  let i = Math.floor(Math.random() * L.length); if (L.length > 1 && i === SND.last['#' + name]) i = (i + 1) % L.length; SND.last['#' + name] = i;
  const [at, len] = L[i], dur = Math.min(len, o.max || len), c = SND.ctx, s = c.createBufferSource(), g = c.createGain();
  s.buffer = SND.rec; s.playbackRate.value = (o.rate || 1) * (1 + (Math.random() - .5) * .06);
  g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(.012, dur / 4)); g.gain.setValueAtTime(vol, t + Math.max(0, dur - .06)); g.gain.linearRampToValueAtTime(.0001, t + dur);   // 녹음도 첫머리 · 끝을 부드럽게
  s.connect(g); g.connect(SND.sfxBus); s.start(t, at, dur + .01);
  return true;
}
const REC = {
  click: t => rec('click', t, .3),
  step: (t, o) => rec(o.ground === 'snow' ? 'step_snow' : o.ground === 'rain' ? 'step_wet' : 'step_dirt', t, o.run ? .45 : .32, { max: .3 }),
  slash: (t, o) => rec('slash', t, o.crit ? .9 : .7),
  pierce: (t, o) => rec('pierce', t, o.crit ? .9 : .7) && rec('soft', t + .03, .5),
  punch: (t, o) => rec(o.crit ? 'punch_heavy' : 'punch', t, .8),
  dart: t => rec('soft', t, .6) && (sOsc('triangle', 1700, 900, t, .05, .06), true),
  crit: t => rec('punch_heavy', t, .5) && (bell(t + .02, 1320, .04, .6), true),
  hurt: t => rec('hurt', t, .7),
  ko: t => rec('hurt', t, .8, { rate: .7 }),
  forge: (t, o) => [0, .24, .48].every(d => rec('anvil', t + d, .55)) && (o.ok ? sNoise(t + .7, .6, .06, 'highpass', 3000, 6000, .5, .1) : sNoise(t + .7, .8, .08, 'lowpass', 600, 200, .7, .2), true),
  alchemy: (t, o) => rec('pot', t, .5) && (SFX.alchemy(t + .15, o), true),
  enhance: (t, o) => rec('metal', t, .7) && (o.kind === 'ok' ? (sOsc('sine', 523, 523, t + .3, .5, .05), sOsc('sine', 784, 784, t + .42, .7, .05)) : sOsc('sine', 220, 140, t + .3, .6, .08), true),
  equip: t => rec('equip', t, .7), unequip: t => rec('unequip', t, .7),
  book: t => rec('book', t, .7), learn: t => rec('bookOpen', t, .7) && (bell(t + .3, 784, .05, 1.4), true),
  scroll: t => rec('bookFlip', t, .45),
  merge: t => rec('bookFlip', t, .6) && rec('bookClose', t + .35, .6) && (bell(t + .7, 660, .06, 1.4), true),
  buy: t => rec('coins', t, .7), sell: t => rec('coins2', t, .75),
  mirror_crack: t => rec('glassCrack', t, .6), mirror_break: t => rec('glassBreak', t, .7),
  pray: t => rec('bellHit', t, .55),
  salve: t => rec('unequip', t, .35) && rec('unequip', t + .22, .3) && (sOsc('sine', 660, 660, t + .45, .5, .04), sOsc('sine', 990, 990, t + .57, .6, .035), true),
};
const SFX_GAP = { type: 45, step: 80, click: 40, portal: 200, equip: 150, unequip: 150, book: 150, buy: 120, sell: 150 };
function sfx(name, o = {}) {
  const c = SND.ctx; if (!c || c.state !== 'running' || !SFX[name] || !sndVol('sfxVol')) return;
  const n = performance.now(); if (n - (SND.last[name] || 0) < (SFX_GAP[name] || 25)) return; SND.last[name] = n;
  const t = c.currentTime + .005;
  try { if (!(REC[name] && REC[name](t, o))) SFX[name](t, o); } catch (e) {}
}
/* 맞힐 때: 병기마다 다른 소리 (검 · 도 = 베기, 창 = 찌르기, 권장 = 주먹, 암기 = 박힘) · 치명타는 쿵 소리를 더한다 */
function sfxHit(w, crit) { sfx(w === 'fist' ? 'punch' : w === 'hidden' ? 'dart' : w === 'spear' ? 'pierce' : 'slash', { crit }); if (crit) sfx('crit'); }
const sfxGround = () => { const W = typeof liveWeather === 'function' ? liveWeather(now()) : {}; return W.snow > .4 ? 'snow' : W.rain > .4 ? 'rain' : 'dirt'; };

/* 누를 수 있는 곳을 누르면 딱 · 지도 탐험지에 마우스를 올리면 포탈 */
addEventListener('pointerdown', e => {
  const b = e.target.closest && e.target.closest('button, [data-tab], [data-manual], [data-mart], [data-artslot], [data-fold], a[href]');
  if (b && !b.disabled && b.getAttribute('aria-disabled') !== 'true') sfx('click');
}, true);
document.addEventListener('mouseover', e => {
  const m = e.target.closest && e.target.closest('.map-spot');
  if (m === SND.hover) return; SND.hover = m;
  if (m && !m.classList.contains('locked')) sfx('portal');
});

/* 행동 소리: 사람이 누른 직후(1.5초 안)에 게임 상태가 실제로 바뀌었을 때만 (실패한 구매 · 장착에는 소리 없음, AI · 자동 진행은 조용히) */
function sndHook(name, pick) {
  const f = window[name]; if (typeof f !== 'function') return;
  window[name] = function (...a) {
    if (performance.now() - SND.userAt > 1500 || !S) return f.apply(this, a);
    const before = JSON.stringify(S), r = f.apply(this, a);
    if (JSON.stringify(S) !== before) { const k = pick(r, a); if (k) sfx(k, typeof r === 'object' && r ? r : {}); }
    return r;
  };
}
if (SOUND_ON) [['equipItem', () => 'equip'], ['autoEquipBest', () => 'equip'], ['unequip', () => 'unequip'],
 ['equipManual', () => 'book'], ['unequipManual', () => 'book'], ['learnManual', () => 'learn'],
 ['useItem', (r, [id]) => (ITEMS[id] && ITEMS[id].use && ITEMS[id].use.learn ? 'learn' : id === 'saenghyeol' ? 'salve' : 'drink')],
 ['forgeEnhance', () => 'enhance'], ['starUp', () => 'starup'], ['studyBind', () => 'merge'], ['pray', () => 'pray'],
 ['buyItem', () => 'buy'], ['buyGear', () => 'buy'], ['buyManual', () => 'buy'], ['buyBadge', () => 'buy'], ['buyLibraryPill', () => 'buy'], ['buyLibraryGear', () => 'buy'],
 ['sellItem', () => 'sell'], ['sellGear', () => 'sell']].forEach(([n, p]) => sndHook(n, p));
Bus.on('sfx', name => sfx(name));
Bus.on('view', patch => { if (patch.craftResult && performance.now() - SND.userAt < 1500) sfx(ui.craft === 'forge' ? 'forge' : 'alchemy', { ok: patch.craftResult.ok }); });
