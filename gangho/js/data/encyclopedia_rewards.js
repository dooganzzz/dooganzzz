/* [데이터] 지역 도감 완성 보상 — 순수 정적 데이터 (로직 없음)
   그 사냥터의 요수 10종(두목 포함)을 모두 만나 도감에 올리면 한 번, 영구히 받는다.
   attr: 4대 기본 스탯 가산 · stats: 능력치 가산 · text: 도감에 보이는 설명 */

const CODEX_REWARDS = {
  cheongpung: { attr: { con: 1 }, stats: { maxHp: 20 }, text: '체력 +1 · 최대 활력 +20', flavor: '자연의 생기를 흡수했습니다' },
  yeomhwa:    { attr: { str: 1 }, stats: { atk: 5 },    text: '근력 +1 · 공격력 +5',    flavor: '강맹한 열기와 투기를 체득했습니다' },
  suryong:    { attr: { agi: 1 }, stats: { maxMp: 20 }, text: '민첩 +1 · 최대 내력 +20', flavor: '유려한 수로 보법과 흐름을 체득했습니다' },
};
