# 실행 대기 중인 SQL (모아 두었다가 한 번에)

여기 있는 `.sql` 파일은 **아직 Supabase에 실행하지 않은 것**입니다. 운영자가 필요할 때 한꺼번에 실행합니다.

실행 방법: Supabase → SQL Editor → New query → 아래 파일 내용을 모두 붙여 넣고 → Run → `Success` 확인.
실행한 파일은 `supabase/migrations/`로 옮깁니다 (Claude에게 "대기 SQL 실행했어"라고 알려 주면 옮기고 기능을 켭니다).

| 파일 | 내용 | 이게 있어야 켜지는 기능 |
|---|---|---|
| `01_login_throttle.sql` | 같은 아이디로 비밀번호를 5번 틀리면 10분 잠금 | (서버만 바뀜 · 게임 쪽 변경 없음) |
| `02_gm_reset_password.sql` | 운영자가 유저 비밀번호를 임시 비밀번호로 바꿈 | GM 콘솔 유저 탭 [비밀번호 초기화] |
