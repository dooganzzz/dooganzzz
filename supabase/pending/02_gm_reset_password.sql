-- 운영자: 유저 비밀번호를 임시 비밀번호로 바꾸고, 그 계정의 접속 토큰을 무효로 한다 (운영자 암호 필요)
create or replace function public.gangho_reset_pass(p_pass text, p_id text, p_new text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare v_hash text;
begin
  select pass_hash into v_hash from gm_secret where id = 1;
  if v_hash is null or v_hash <> crypt(p_pass, v_hash) then raise exception 'denied'; end if;
  if p_new is null or length(p_new) < 4 or length(p_new) > 64 then raise exception 'bad pass'; end if;
  update gangho_accounts set pass_hash = crypt(p_new, gen_salt('bf', 8)), token_hash = null where id = lower(p_id);
  if not found then raise exception 'no such id'; end if;
end $$;
revoke all on function public.gangho_reset_pass(text, text, text) from public;
grant execute on function public.gangho_reset_pass(text, text, text) to anon, authenticated;
