/* [화면] 배경음악: 로그인(아이디 입력) 화면부터 잔잔하게 되풀이한다 (옥루관 금소합주).
   브라우저는 사람이 한 번 누르거나 글자를 쳐야 소리를 내 주므로, 바로 틀어 보고 막히면 첫 손길(아이디 입력 등)에 시작한다.
   화면을 내려 두면 쉬고, 돌아오면 이어서 튼다 */
const BGM = { el: null, vol: 0.35, on: false };
const BGM_EVENTS = ['pointerdown', 'keydown', 'touchstart'];
function bgmStart() {
  if (!BGM.el) { BGM.el = new Audio(ASSET.bgm('teahouse')); BGM.el.loop = true; BGM.el.volume = BGM.vol; BGM.el.preload = 'auto'; }
  BGM.el.play().then(() => { BGM.on = true; BGM_EVENTS.forEach(ev => removeEventListener(ev, bgmStart, true)); }).catch(() => {});
}
BGM_EVENTS.forEach(ev => addEventListener(ev, bgmStart, true));
document.addEventListener('visibilitychange', () => { if (!BGM.el || !BGM.on) return; if (document.hidden) BGM.el.pause(); else BGM.el.play().catch(() => {}); });
bgmStart();
