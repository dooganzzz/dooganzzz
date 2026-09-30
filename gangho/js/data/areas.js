/* [데이터] 강호 3대 사냥터 — 순수 정적 데이터 (로직 없음)
   tier: 장비 드랍 티어 · cp: 권장 전투력 [최소, 최대] (화면에는 보이지 않는다. 요수 수치 설계·기척 판정의 기준)
   terrain: 지형 속성 (장착 경공이 이 중 하나라도 맞으면 기력 소모 -20%) · enemies: 일반 요수 · boss: 두목
   mats: 이 사냥터의 핵심 드랍 재료 (6종 이상) (요수별 확률은 drops.js) · herb/mine: 금고(약재 궤·철물 궤)에서 나오는 재료
   chest · gimmick: 탐험 중 조우 보상 · unlock: 열리는 조건 */

const ZONES = {
  cheongpung: {
    name: '청풍산', hanja: '淸風山', tier: 1, grade: '초급 · 입문', cp: [50, 300],
    desc: '청풍문 주변을 둘러싼 산림. 흙길과 풀숲, 빽빽한 숲이 뒤섞였다. 짐승과 흑풍채 잔당, 하급 요수가 서식하고, 깊은 곳엔 붉은 호랑이가 산다는 소문이 있다.',
    terrain: ['earth', 'grass', 'wood'],
    enemies: ['rabbit', 'wildcat', 'viper', 'scout', 'slinger', 'boar', 'deserter', 'turtle', 'treant'], boss: 'redTiger',
    mats: ['wildGinseng', 'blackwood', 'boarMolar', 'wildcatHide', 'treeSap', 'roughOre', 'viperScale', 'viperSac', 'blackIngot'],   // 독사 비늘·독낭, 드문 흑철괴(3재료 단조)
    herb: [['wildGinseng', 1, 2, 1], ['treeSap', 1, 1, 0.5], ['herb', 1, 2, 0.8], ['lingzhi', 1, 1, 0.3]],
    mine: [['roughOre', 1, 2, 1], ['blackwood', 1, 2, 0.6], ['blackIngot', 1, 1, 0.2]],   // 정련된 흑철괴: 청풍산에서도 드물게 (3재료 단조용)
    chest: [['silver', 20, 40], ['saenghyeol', 1, 2], ['lingzhi', 1, 2], ['roughOre', 2, 3]],
    gimmick: { name: '쓰러진 고목', stat: 'atk', need: 22, text: '쓰러진 고목을 내공으로 쪼개자 속에 숨겨진 약초 주머니가 드러났습니다!', reward: [['lingzhi', 1, 2], ['blackwood', 2, 3], ['silver', 30, 50]], fail: '고목이 꿈쩍도 하지 않습니다. (공격력 22 이상 필요)' },
    unlock: null,
  },
  yeomhwa: {
    name: '염화채', hanja: '炎火寨', tier: 2, grade: '중급 · 화공과 산적', cp: [300, 700],
    desc: '메마른 붉은 협곡에 세워진 사파 산적 연합의 채(寨). 화기(火氣)가 들끓고 강맹한 외공을 쓰는 자들이 모였다. 채주 적패천이 다스린다.',
    terrain: ['earth', 'plain'],
    enemies: ['fireViper', 'redWolf', 'eagle', 'logger', 'cannoneer', 'charger', 'eliteAxe', 'armored', 'magmaGolem'], boss: 'jeokpaecheon',
    mats: ['redStone', 'scorpionSac', 'wolfSinew', 'bladeShard', 'redClay', 'blackIngot'],
    herb: [['scorpionSac', 1, 1, 0.6], ['redClay', 1, 2, 1], ['firegrass', 1, 2, 0.8], ['herb', 1, 2, 0.5]],
    mine: [['redStone', 1, 2, 1], ['blackIngot', 1, 1, 0.5], ['bladeShard', 1, 1, 0.4]],
    chest: [['silver', 80, 140], ['potionMp', 1, 2], ['firegrass', 2, 3], ['blackIngot', 1, 2]],
    gimmick: { name: '잠긴 목책 기관', stat: 'spd', need: 17, text: '목책 위로 몸을 날려 산적들의 비밀 창고를 털었습니다!', reward: [['redStone', 1, 2], ['firegrass', 2, 3], ['silver', 80, 120]], fail: '목책을 넘기엔 몸이 무겁습니다. (속도 17 이상 필요)' },
    unlock: { boss: 'boss1', text: '청풍산 두목을 꺾으면 길이 열린다' },
  },
  suryong: {
    name: '수룡방', hanja: '水龍幇', tier: 3, grade: '상급 · 수로와 수적', cp: [700, 1200],
    desc: '거대한 호수와 수로를 장악한 강호의 거대 수적 방파. 음습한 수기(水氣)가 서렸고, 빠른 암기와 연환 참격을 쓴다. 방주 벽해룡은 용처럼 물을 가른다고 한다.',
    terrain: ['water', 'plain'],
    enemies: ['scaleFish', 'crocodile', 'raftScout', 'netter', 'raider', 'diver', 'anchor', 'centipede', 'iceSpirit'], boss: 'byeokhaeryong',
    mats: ['silverOre', 'crocHide', 'silentReed', 'dragonScale', 'centipedeLeg', 'mistDew'],
    herb: [['silentReed', 1, 2, 1], ['mistDew', 1, 2, 0.8], ['lotus', 1, 1, 0.6], ['bloodginseng', 1, 1, 0.35]],
    mine: [['silverOre', 1, 2, 1], ['dragonScale', 1, 1, 0.3]],
    chest: [['silver', 200, 320], ['clearPill', 1, 1], ['bloodginseng', 1, 1], ['silverOre', 2, 3]],
    gimmick: { name: '수문 기관', stat: 'maxMp', need: 260, text: '내력을 쏟아부어 녹슨 수문을 들어올리자 수적들의 보물이 떠올랐습니다!', reward: [['bloodginseng', 1, 1], ['lotus', 1, 2], ['silver', 150, 220]], fail: '수문이 요지부동입니다. (최대 내력 260 이상 필요)' },
    unlock: { boss: 'boss2', text: '염화채 채주를 꺾으면 길이 열린다' },
  },
};

const ZONE_ORDER = ['cheongpung', 'yeomhwa', 'suryong'];
