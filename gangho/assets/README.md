# 그림 자산

게임이 읽는 경로입니다. 파일이 없으면 대체 그림이 대신 나옵니다. 무장 화면에는 인라인 실루엣이, 초상화 자리에는 한자 낙관이 나옵니다.

| 경로 | 쓰는 곳 | 권장 크기 |
| --- | --- | --- |
| `character_silhouette.png` | 무장(武裝) 중앙 인형 | 세로형, 투명 배경 (현재 480×720 임시 실루엣) |
| `portraits/npc_nobyeoksong.png` | 정청 · 노벽송 (장문인) | 정사각 144×144 이상 |
| `portraits/npc_joun.png` | 정청 · 조운 (대사형) | 정사각 144×144 이상 |
| `portraits/npc_arin.png` | 뒷마당 · 아린 (사매) | 정사각 144×144 이상 |
| `portraits/npc_wang.png` | 전방 · 왕 가 (청풍전방 주인) | 정사각 144×144 이상 |

초상화는 68px 칸에 `object-fit: cover`로 잘려 들어가니, 얼굴을 가운데에 두면 됩니다.

## 일러스트 자리 (선택)

아래 파일을 넣으면 게임이 그린 SVG 그림 위에 덮어 보여 줍니다. 파일이 없으면 SVG 그대로 나옵니다. 코드는 고치지 않아도 됩니다.

| 경로 | 쓰는 곳 | 권장 크기 |
| --- | --- | --- |
| `art/zones/cheongpung.jpg` · `yeomhwa.jpg` · `suryong.jpg` | 강호행 탐험지 카드 머리 · 관찰 창 배경 | 가로형 1200×420 (카드에서는 위아래가 잘림) |
| `art/beasts/<요수 id>.png` | 도감 · 심상수련장 · 관찰 창 인장 | 정사각 256×256, 가운데 정렬 |
| `art/shrine.png` | 청풍문 › 무신상 | 세로형 360×414 |

요수 id는 `js/data/monsters.js`의 키입니다 (예: `wildcat`, `redTiger`, `byeokhaeryong`).

