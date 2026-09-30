# 그림 자산

게임이 읽는 경로입니다. 파일이 없으면 대체 그림이 대신 나옵니다. 무장 화면에는 인라인 실루엣이, 초상화 자리에는 한자 낙관이, 아이템 자리에는 이모지가 나옵니다.

지금 들어 있는 그림은 모두 한 화풍(컬러 수묵담채 · 투명 배경)으로 맞췄습니다.

| 경로 | 쓰는 곳 | 권장 크기 |
| --- | --- | --- |
| `images/character_default.png` | 무장(武裝) 가운데 제자 일러스트 카드 | 3:4 세로형, 투명 배경 (현재 600×800 수묵담채 · 남색 도포 · 붉은 요대) |
| `character_silhouette.png` | (예비) 예전 무장 중앙 인형 | 세로형, 투명 배경 (지금 화면에서는 쓰지 않음) |
| `portraits/npc_nobyeoksong.png` | 정청 · 노벽송 (장문인) | 정사각 144×144 이상 |
| `portraits/npc_joun.png` | 정청 · 조운 (대사형) | 정사각 144×144 이상 |
| `portraits/npc_arin.png` | 뒷마당 · 아린 (사매) | 정사각 144×144 이상 |
| `portraits/npc_wang.png` | 전방 · 왕 가 (청풍전방 주인) | 정사각 144×144 이상 |

초상화는 68px 칸에 `object-fit: cover`로 잘려 들어가니, 얼굴을 가운데에 두면 됩니다.

## 아이템 그림 (`art/items/`)

| 파일 | 쓰는 곳 |
| --- | --- |
| `<아이템 id>.png` (예: `herb.png`, `pillLow.png`) | 재료·단약·영단·증표·부산물. 행낭·전방·화로·뒷마당·도감 |
| `w_sword` · `w_blade` · `w_spear` · `w_fist` · `w_hidden` | 무기 (병기 종류별 한 장) |
| `s_armor` · `s_helmet` · `s_boots` · `s_belt` · `s_jade` · `s_ring` · `s_badge` · `s_mount` | 무기 외 장비 (부위별 한 장, 두 번째 가락지도 `s_ring`) |
| `book_g3` · `book_g2` · `book_g1` | 비급 표지: 삼류 · 이류 · 일류 (등급이 높을수록 화려) |
| `emb_sword` · `emb_blade` · `emb_spear` · `emb_fist` · `emb_hidden` · `emb_simbeop` · `emb_gyeonggong` · `emb_gigong` | 비급 표지 가운데 문양 (먹선 · 투명). 무공은 병기, 심법·경공(두 발)·기공(가부좌와 보호막)은 분류 |

아이템 그림은 128×128, 비급 표지는 150×200, 요수는 320×320, 초상은 256×256(얼굴이 가운데·아래 정렬)입니다.

## 일러스트 자리 (선택)

아래 파일을 넣으면 게임이 그린 SVG 그림 위에 덮어 보여 줍니다. 파일이 없으면 SVG 그대로 나옵니다. 코드는 고치지 않아도 됩니다.

| 경로 | 쓰는 곳 | 권장 크기 |
| --- | --- | --- |
| `art/zones/cheongpung.jpg` · `yeomhwa.jpg` · `suryong.jpg` | 강호행 탐험지 카드 머리 · 관찰 창 배경 (세 곳 모두 들어 있음) | 가로형 1200×420 (카드에서는 위아래가 잘림) |
| `art/beasts/<요수 id>.png` | 도감 · 심상수련장 · 관찰 창 인장 (31종 모두 들어 있음) | 정사각 320×320, 투명 배경, 가운데 정렬 |
| `art/shrine.png` | 청풍문 › 무신상 (옥좌에 앉은 이끼 낀 석상 · 향로) | 세로형 540×720, 투명 배경 |
| `art/shrine_awake.png` | 무신상 300회 각성 창 (눈을 뜨고 금빛이 터지는 석상) | 세로형 540×720, 투명 배경 |
| `art/forge_scene.jpg` | 화로 › 단조 배경 (대장간 · 모루 위에 재료 칸) | 가로형 1280×716 |
| `art/alchemy_cauldron.png` | 화로 › 연단 단로(丹爐) (그 아래에 재료 칸) | 정사각 560×560, 투명 배경 |
| `art/meditation.png` | 상태 › 무공 가운데 운기조식 (가부좌 · 단전의 금빛 기운) | 정사각 400×400, 투명 배경 |

요수 id는 `js/data/monsters.js`의 키입니다 (예: `wildcat`, `redTiger`, `byeokhaeryong`).

