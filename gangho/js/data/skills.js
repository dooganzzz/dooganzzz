/* [데이터] 무공 DB — 순수 정적 데이터 (로직 없음)
   cat: 무공·심법·경공·기공 · grade: 삼류·이류 · weapon: 무공이 요구하는 병기 · terrain: 경공 지형 · elem: 기공 오행
   stances: 초식 템플릿. 무공은 3초식(제1·2·3초식), 경공은 회피 지문, 기공은 전투 시작 지문.
   desc의 {attacker}·{weapon}·{target} 뒤에 {이가}·{을를}·{은는}·{과와}를 붙이면 받침에 맞춰 조사를 고른다.
   desc가 없는 초식은 STANCE_DEFAULT의 병기별 지문을 쓴다. extra: 장착 시 덧붙는 작은 고유 능력치 */

const MANUALS = {
  // 입문 무공 (삼재 계열)
  samjaeGwon:  { name: '삼재권장법', hanja: '三才拳掌法', desc: '하늘·땅·사람의 이치를 주먹과 손바닥에 담은 입문 권장법. 투박하지만 기본기가 단단해진다.', cat: 'mugong', grade: '삼류', weapon: 'fist', stances: [{ name: '천권' }, { name: '지장' }, { name: '인각' }] },
  samjaeGeom:  { name: '삼재검법',   hanja: '三才劍法',   desc: '강호의 검객이라면 누구나 한 번은 거쳐 가는 입문 검법. 세 초식이 천지인(天地人)의 순서로 이어진다.', cat: 'mugong', grade: '삼류', weapon: 'sword', stances: [{ name: '천재' }, { name: '지재' }, { name: '인재' }] },
  samjaeDo:    { name: '삼재도법',   hanja: '三才刀法',   desc: '무게를 실어 내려치는 데 집중한 입문 도법. 한 번 휘두를 때마다 바위가 쪼개지는 기세를 흉내 낸다.', cat: 'mugong', grade: '삼류', weapon: 'blade', stances: [{ name: '천참' }, { name: '지참' }, { name: '인참' }] },
  samjaeChang: { name: '삼재창법',   hanja: '三才槍法',   desc: '찌르고, 쓸고, 돌리는 창술의 기초. 긴 자루로 거리를 지배하는 법을 익힌다.', cat: 'mugong', grade: '삼류', weapon: 'spear', stances: [{ name: '천돌' }, { name: '지소' }, { name: '인선' }] },
  samjaePyo:   { name: '삼재표법',   hanja: '三才鏢法',   desc: '돌멩이 하나로 새를 떨어뜨리는 법에서 시작하는 입문 표법. 손목과 눈이 함께 자란다.', cat: 'mugong', grade: '삼류', weapon: 'hidden', stances: [{ name: '천표' }, { name: '지표' }, { name: '인표' }] },
  // 입문 보조 비급
  tonap:       { name: '토납법', hanja: '吐納法', desc: '들숨과 날숨으로 천지의 기운을 받아들이는 가장 오래된 호흡법. 내력의 뿌리가 된다.', cat: 'simbeop',    grade: '삼류' },
  pocheolsak:  { name: '포철삭', hanja: '抛鐵索', desc: '쇠사슬을 던져 몸을 끌어당기듯 발을 옮기는 기이한 보법. 청풍문 선대가 산을 타며 만들었다.', cat: 'gyeonggong', grade: '삼류', terrain: 'earth' },
  cheolpo:     { name: '철포삼', hanja: '鐵布衫', desc: '온몸에 기를 돌려 무쇠 옷을 두른 듯 단단해지는 외문 기공. 맞을수록 강해진다.', cat: 'gigong',     grade: '삼류', elem: 'metal' },
  // 장경각: 청풍문 세트 (문파 공헌도로 교환)
  cpGwon:   { name: '청풍권',   hanja: '淸風拳',   desc: '청풍문의 바람을 주먹에 실은 비전 권법. 세 번째 권에 이르면 폭풍이 인다.', cat: 'mugong', grade: '이류', weapon: 'fist', stances: [{ name: '청풍일권' }, { name: '회풍이권' }, { name: '광풍삼권' }], cost: 300 },
  cpGeom:   { name: '청풍검',   hanja: '淸風劍',   desc: '바람처럼 가볍고 빠른 청풍문의 비전 검법. 검 끝이 만 리를 달린다.', cat: 'mugong', grade: '이류', weapon: 'sword', stances: [{ name: '청풍출검' }, { name: '회풍검' }, { name: '청풍만리' }], cost: 300 },
  cpDo:     { name: '청풍도',   hanja: '淸風刀',   desc: '회오리치는 바람으로 적의 혼을 끊는다는 청풍문의 비전 도법.', cat: 'mugong', grade: '이류', weapon: 'blade', stances: [{ name: '청풍일도' }, { name: '선풍참' }, { name: '광풍단혼' }], cost: 300 },
  cpChang:  { name: '청풍창',   hanja: '淸風槍',   desc: '바람을 등에 업고 뚫고 들어가는 청풍문의 비전 창법.', cat: 'mugong', grade: '이류', weapon: 'spear', stances: [{ name: '청풍돌' }, { name: '회풍창' }, { name: '광풍천돌' }], cost: 300 },
  cpPyo:    { name: '청풍표',   hanja: '淸風鏢',   desc: '하늘 가득 바람에 실린 비표를 흩뿌리는 청풍문의 비전 표법.', cat: 'mugong', grade: '이류', weapon: 'hidden', stances: [{ name: '청풍비표' }, { name: '회풍표' }, { name: '만천청풍' }], cost: 300 },
  cpSim:    { name: '청풍심법', hanja: '淸風心法', desc: '청풍산의 맑은 바람을 단전에 담는 청풍문 내문 심법. 내력통이 크게 넓어진다.', cat: 'simbeop',    grade: '이류', cost: 250 },
  cpGyeong: { name: '청풍경공', hanja: '淸風輕功', desc: '바람을 밟고 나아가는 청풍문의 비전 경공. 몸이 깃털처럼 가벼워진다.', cat: 'gyeonggong', grade: '이류', cost: 250, terrain: 'plain' },
  cpGi:     { name: '청풍기공', hanja: '淸風氣功', desc: '바람의 장막을 몸에 두르는 청풍문의 비전 기공. 칼끝이 살에 닿기 전에 흘러내린다.', cat: 'gigong',     grade: '이류', cost: 250, elem: 'wood' },

  // ───── 삼류 무공 25종 (공양 비급 · 금고 비급 궤) ─────
  // 권장
  paseok:    { name: '파석권', hanja: '破石拳', desc: '바위를 깨뜨린다는 이름 그대로, 주먹 끝 한 점에 힘을 모으는 외문 권법.', cat: 'mugong', grade: '삼류', weapon: 'fist', extra: { crit: 2 },
    stances: [{ name: '파석일권', desc: '{attacker}{이가} 허리를 비틀며 주먹 끝 한 점에 온 힘을 모아 내지른다!' }, { name: '붕산권', desc: '{attacker}{이가} 발을 굴러 땅을 울리고, 무너지는 산처럼 두 주먹을 쏟아붓는다!' }, { name: '쇄석연타', desc: '{attacker}{이가} 숨 한 번에 열두 번 주먹을 뻗어 바위 부수는 소리를 낸다!' }] },
  swaegol:   { name: '쇄골장', hanja: '碎骨掌', desc: '손바닥으로 뼈마디를 노리는 음험한 장법. 맞은 자리가 오래 저리다.', cat: 'mugong', grade: '삼류', weapon: 'fist', extra: { atk: 2 },
    stances: [{ name: '쇄골일장', desc: '{attacker}{이가} 손바닥을 비스듬히 세워 {target}의 어깻죽지를 후려친다!' }, { name: '탁골장', desc: '{attacker}{이가} 손목을 꺾어 뼈마디 사이를 파고드는 장력을 밀어 넣는다!' }, { name: '분근착골', desc: '{attacker}{이가} 두 손바닥을 맞비비더니 근육과 뼈를 동시에 비틀어 쥔다!' }] },
  yeonhwan:  { name: '연환통배권', hanja: '連環通背拳', desc: '등줄기에서 어깨로 힘을 꿰어 쉼 없이 이어 치는 권법. 멈추는 순간이 없다.', cat: 'mugong', grade: '삼류', weapon: 'fist', extra: { combo: 4 },
    stances: [{ name: '통배일권', desc: '{attacker}{이가} 등을 활처럼 휘었다 펴며 채찍 같은 주먹을 뿌린다!' }, { name: '연환쌍권', desc: '{attacker}{이가} 좌우 주먹을 고리처럼 이어 틈 없이 몰아친다!' }, { name: '통배연환', desc: '{attacker}{이가} 등줄기의 힘을 한꺼번에 풀어 연환의 주먹비를 쏟아낸다!' }] },
  // 검
  cpGeombeop:{ name: '청풍검법', hanja: '淸風劍法', desc: '청풍문 외문 제자들이 처음 배우는 검법. 바람처럼 가볍게 베고 물러선다.', cat: 'mugong', grade: '삼류', weapon: 'sword', extra: { spd: 1 },
    stances: [{ name: '청풍서래', desc: '{attacker}{이가} 서늘한 바람을 타듯 한 걸음 미끄러지며 {weapon}{을를} 흘려 벤다!' }, { name: '풍류검', desc: '{attacker}{이가} 검끝을 흔들어 바람결 같은 궤적을 그린다!' }, { name: '청풍낙일', desc: '{attacker}{이가} 해 지는 산마루처럼 비스듬히 {weapon}{을를} 내리긋는다!' }] },
  nakyeop:   { name: '낙엽검법', hanja: '落葉劍法', desc: '떨어지는 낙엽의 흔들림을 흉내 낸 검법. 궤적을 읽기 어렵다.', cat: 'mugong', grade: '삼류', weapon: 'sword', extra: { eva: 2 },
    stances: [{ name: '낙엽일검', desc: '{attacker}{이가} 낙엽이 흔들리듯 검끝을 떨구며 {target}의 눈을 속인다!' }, { name: '추엽참', desc: '{attacker}{이가} 몸을 반 바퀴 돌리며 가을 잎을 쓸 듯 {weapon}{을를} 휘두른다!' }, { name: '만엽귀근', desc: '{attacker}{이가} 수많은 잎이 뿌리로 돌아가듯 검광을 한 점으로 모은다!' }] },
  chupung:   { name: '추풍검', hanja: '追風劍', desc: '바람을 쫓는다는 쾌검. 한 번 베고 두 번째 칼이 먼저 닿는다.', cat: 'mugong', grade: '삼류', weapon: 'sword', extra: { crit: 2 },
    stances: [{ name: '추풍일섬', desc: '{attacker}{이가} 눈 깜짝할 사이 거리를 좁히며 {weapon}{을를} 번쩍 뽑아 긋는다!' }, { name: '질풍자', desc: '{attacker}{이가} 몸을 낮추고 질풍처럼 파고들어 곧게 찌른다!' }, { name: '추풍낙엽', desc: '{attacker}{이가} 바람을 쫓아 연달아 세 번 베어, 잎 떨어지듯 검광을 흩뿌린다!' }] },
  // 도
  ohodanmun: { name: '오호단문도', hanja: '五虎斷門刀', desc: '다섯 호랑이가 문을 끊는다는 사나운 도법. 한 칼 한 칼에 체중을 싣는다.', cat: 'mugong', grade: '삼류', weapon: 'blade', extra: { atk: 3 },
    stances: [{ name: '맹호출림', desc: '{attacker}{이가} 숲을 뛰쳐나오는 호랑이처럼 {weapon}{을를} 앞세워 덮친다!' }, { name: '호조단문', desc: '{attacker}{이가} 호랑이 발톱처럼 칼날을 세워 {target}의 앞길을 끊어 낸다!' }, { name: '오호쟁명', desc: '{attacker}{이가} 다섯 번 포효하듯 연달아 내려쳐 도기를 사방에 터뜨린다!' }] },
  byeokryeok:{ name: '벽력도법', hanja: '霹靂刀法', desc: '벼락이 떨어지듯 위에서 아래로만 내려치는 도법. 단순하지만 무겁다.', cat: 'mugong', grade: '삼류', weapon: 'blade', extra: { crit: 3 },
    stances: [{ name: '벽력일도', desc: '{attacker}{이가} 호흡을 깊이 들이마신 뒤 {weapon}{을를} 굳게 쥐고 벼락같이 내려친다!' }, { name: '뇌정참', desc: '{attacker}{이가} 천둥소리와 함께 칼등까지 울리는 참격을 떨군다!' }, { name: '벽력만천', desc: '{attacker}{이가} 하늘 가득 번개가 치듯 칼빛을 쏟아붓는다!' }] },
  dansu:     { name: '단수도', hanja: '斷水刀', desc: '흐르는 물을 끊는다는 쾌도. 베고 난 자리에 흔적이 남지 않는다.', cat: 'mugong', grade: '삼류', weapon: 'blade', extra: { spd: 1 },
    stances: [{ name: '단류', desc: '{attacker}{이가} 물줄기를 가르듯 {weapon}{을를} 수평으로 그어 낸다!' }, { name: '절파참', desc: '{attacker}{이가} 밀려오는 파도를 끊듯 칼을 되받아 친다!' }, { name: '단수무흔', desc: '{attacker}{이가} 소리조차 없이 칼을 지나가게 해, 벤 자리에 물결 하나 남기지 않는다!' }] },
  // 창
  yukhap:    { name: '육합창법', hanja: '六合槍法', desc: '안팎 여섯 가지가 하나로 맞아야 한다는 정통 창법. 기본 중의 기본.', cat: 'mugong', grade: '삼류', weapon: 'spear', extra: { def: 2 },
    stances: [{ name: '육합일창', desc: '{attacker}{이가} 발과 허리와 손을 하나로 맞춰 {weapon}{을를} 곧게 찔러 넣는다!' }, { name: '난나찰', desc: '{attacker}{이가} 창끝으로 원을 그려 막고, 감고, 찌르는 세 동작을 한 호흡에 잇는다!' }, { name: '육합귀원', desc: '{attacker}{이가} 여섯 방향의 힘을 창끝 한 점으로 되돌려 꿰뚫는다!' }] },
  cheolgi:   { name: '철기창', hanja: '鐵騎槍', desc: '말 위에서 쓰던 창술을 땅에 옮긴 것. 돌진의 기세가 거칠다.', cat: 'mugong', grade: '삼류', weapon: 'spear', extra: { atk: 3 },
    stances: [{ name: '철기돌진', desc: '{attacker}{이가} 기마병처럼 땅을 박차고 {weapon}{을를} 앞세워 돌진한다!' }, { name: '철마횡소', desc: '{attacker}{이가} 긴 자루를 크게 휘둘러 {target}의 다리를 쓸어 버린다!' }, { name: '만기돌파', desc: '{attacker}{이가} 만 명의 기병이 밀려들 듯 창을 연달아 내찌른다!' }] },
  pungun:    { name: '풍운점혈창', hanja: '風雲點穴槍', desc: '창끝으로 혈도를 짚는 기묘한 창법. 찌르기보다 짚기에 가깝다.', cat: 'mugong', grade: '삼류', weapon: 'spear', extra: { crit: 2 },
    stances: [{ name: '풍운일점', desc: '{attacker}{이가} 구름 사이로 번개가 스치듯 창끝으로 한 점을 짚는다!' }, { name: '점혈창', desc: '{attacker}{이가} 창끝을 떨어 {target}의 혈도 세 곳을 연달아 두드린다!' }, { name: '풍운만변', desc: '{attacker}{이가} 바람과 구름이 뒤바뀌듯 창끝의 방향을 쉴 새 없이 바꾼다!' }] },
  // 암기
  biyeon:    { name: '비연표', hanja: '飛燕鏢', desc: '제비처럼 휘어 날아가는 비표술. 날아오는 길을 짐작하기 어렵다.', cat: 'mugong', grade: '삼류', weapon: 'hidden', extra: { eva: 2 },
    stances: [{ name: '비연일표', desc: '{attacker}{이가} 손목을 튕겨 제비처럼 휘어 드는 표창을 날린다!' }, { name: '연자회선', desc: '{attacker}{이가} 두 개의 표창을 엇갈려 던져 공중에서 원을 그리게 한다!' }, { name: '군연비표', desc: '{attacker}{이가} 제비 떼가 날아오르듯 한 줌의 표창을 흩뿌린다!' }] },
  sanhwa:    { name: '산화철질려', hanja: '散花鐵蒺藜', desc: '쇠마름쇠를 꽃잎처럼 흩뿌리는 수법. 넓게 퍼지는 대신 한 발이 가볍다.', cat: 'mugong', grade: '삼류', weapon: 'hidden', extra: { combo: 4 },
    stances: [{ name: '산화일산', desc: '{attacker}{이가} 손바닥을 펼쳐 철질려를 꽃잎처럼 흩뿌린다!' }, { name: '철질려우', desc: '{attacker}{이가} 하늘로 한 움큼 던져 올려 쇠비를 쏟아지게 한다!' }, { name: '만천산화', desc: '{attacker}{이가} 온 하늘에 꽃이 흩날리듯 철질려를 사방에 뿌린다!' }] },
  tugol:     { name: '투골정', hanja: '透骨釘', desc: '뼈를 뚫는다는 가늘고 긴 쇠못을 던지는 수법. 한 발 한 발이 깊다.', cat: 'mugong', grade: '삼류', weapon: 'hidden', extra: { crit: 3 },
    stances: [{ name: '투골일정', desc: '{attacker}{이가} 숨을 멈추고 쇠못 하나를 {target}의 뼈마디를 향해 쏘아 보낸다!' }, { name: '관골정', desc: '{attacker}{이가} 두 개의 쇠못을 한 줄로 겹쳐 던져 같은 자리를 꿰뚫는다!' }, { name: '투골만정', desc: '{attacker}{이가} 손가락 사이마다 쇠못을 끼워 한꺼번에 튕겨 낸다!' }] },
  // 경공 (5대 지형)
  chosangbi: { name: '초상비', hanja: '草上飛', desc: '풀잎 끝을 밟고 달린다는 경공. 수풀에서는 발소리조차 나지 않는다.', cat: 'gyeonggong', grade: '삼류', terrain: 'grass',
    stances: [{ name: '초상비', desc: '{attacker}{이가} 풀잎 끝을 밟듯 몸을 띄워 공격을 흘려보낸다.' }] },
  dapsu:     { name: '답수보', hanja: '踏水步', desc: '물 위를 딛는 보법. 물가와 늪에서 기력을 아낀다.', cat: 'gyeonggong', grade: '삼류', terrain: 'water',
    stances: [{ name: '답수보', desc: '{attacker}{이가} 물 위를 딛듯 미끄러져 공격권 밖으로 빠진다.' }] },
  jihaeng:   { name: '지행보', hanja: '地行步', desc: '땅의 기복을 발바닥으로 읽는 보법. 험한 산길에서 지치지 않는다.', cat: 'gyeonggong', grade: '삼류', terrain: 'earth',
    stances: [{ name: '지행보', desc: '{attacker}{이가} 땅을 밀어내듯 낮게 한 걸음 비껴 선다.' }] },
  deungsu:   { name: '등수보', hanja: '登樹步', desc: '나무줄기를 타고 오르는 보법. 숲에서는 가지가 곧 길이다.', cat: 'gyeonggong', grade: '삼류', terrain: 'wood',
    stances: [{ name: '등수보', desc: '{attacker}{이가} 나뭇가지를 타듯 몸을 솟구쳐 머리 위로 넘긴다.' }] },
  mijong:    { name: '미종보', hanja: '迷蹤步', desc: '발자취를 흐리는 보법. 평탄한 길에서 가장 빠르다.', cat: 'gyeonggong', grade: '삼류', terrain: 'plain',
    stances: [{ name: '미종보', desc: '{attacker}{이가} 발자취를 흐리며 옆으로 흘러, 상대가 허공을 치게 만든다.' }] },
  // 기공 (오행 5종)
  mokryeong: { name: '목령진기', hanja: '木靈眞氣', desc: '나무의 생기를 단전에 기르는 기공. 흙의 기운을 뚫고 들어간다.', cat: 'gigong', grade: '삼류', elem: 'wood',
    stances: [{ name: '목령진기', desc: '{attacker}의 몸에서 푸른 생기가 뻗어 나와 뿌리처럼 발을 박는다.' }] },
  byeokhwa:  { name: '벽화공', hanja: '碧火功', desc: '푸른 불꽃을 경락에 돌리는 기공. 쇠붙이가 무르게 느껴진다.', cat: 'gigong', grade: '삼류', elem: 'fire',
    stances: [{ name: '벽화공', desc: '{attacker}의 경락을 따라 푸른 불꽃이 일렁이며 열기가 번진다.' }] },
  huto:      { name: '후토공', hanja: '厚土功', desc: '두터운 흙의 기운을 몸에 쌓는 기공. 물의 기세를 막아선다.', cat: 'gigong', grade: '삼류', elem: 'earth',
    stances: [{ name: '후토공', desc: '{attacker}의 발밑에서 누런 흙기운이 차올라 몸이 바위처럼 무거워진다.' }] },
  baekgeum:  { name: '백금결', hanja: '白金訣', desc: '살갗을 쇠처럼 벼리는 기공 구결. 나무의 기운을 베어 낸다.', cat: 'gigong', grade: '삼류', elem: 'metal',
    stances: [{ name: '백금결', desc: '{attacker}의 살갗 위로 흰 쇳빛이 번지며 금속성의 울림이 난다.' }] },
  yusu:      { name: '유수심법', hanja: '流水心法', desc: '흐르는 물처럼 기를 돌리는 심법이자 기공. 불길 앞에서 차분해진다.', cat: 'gigong', grade: '삼류', elem: 'water',
    stances: [{ name: '유수심법', desc: '{attacker}의 기운이 물처럼 고요히 흘러 몸을 감싼다.' }] },
};

/* 초식 지문이 없을 때 병기별 기본 지문 (초식 순서별) */
const STANCE_DEFAULT = {
  fist:   ['{attacker}{이가} 허리를 낮추고 {weapon}에 온몸의 무게를 실어 내지른다!', '{attacker}{이가} 좌우 주먹을 번갈아 뻗어 {target}의 틈을 두드린다!', '{attacker}{이가} 숨을 끊어 쉬며 마지막 일격에 모든 힘을 싣는다!'],
  sword:  ['{attacker}{이가} 호흡을 깊이 들이마신 뒤 {weapon}{을를} 굳게 쥐고 벼락같이 휘두른다!', '{attacker}{이가} 검끝을 비틀어 {target}의 빈틈으로 파고든다!', '{attacker}{이가} 발을 끌어 몸을 돌리며 {weapon}{을를} 크게 긋는다!'],
  blade:  ['{attacker}{이가} 두 손으로 {weapon}{을를} 치켜들고 산을 가르듯 내려친다!', '{attacker}{이가} 칼등을 어깨에 걸쳤다가 비스듬히 베어 낸다!', '{attacker}{이가} 온몸을 실어 {weapon}{을를} 수평으로 휘몰아친다!'],
  spear:  ['{attacker}{이가} {weapon}의 자루를 길게 잡고 한 점을 향해 뚫고 들어간다!', '{attacker}{이가} 창끝으로 원을 그리며 {target}의 손목을 노린다!', '{attacker}{이가} 창대를 튕겨 올려 연달아 내찌른다!'],
  hidden: ['{attacker}{이가} 손목을 튕겨 {weapon}{을를} 소리 없이 흩뿌린다!', '{attacker}{이가} 몸을 틀며 소매 속에서 두 발을 연달아 쏘아 낸다!', '{attacker}{이가} 한 움큼을 쥐어 {target}의 사방을 막아 버린다!'],
  basic:  '{attacker}{이가} 호흡을 가다듬고 {weapon}{을를} 곧게 뻗는다.',
};
