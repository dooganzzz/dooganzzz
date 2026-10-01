-- 로그인 시도 제한 고침: 예전 판은 틀린 횟수를 저장한 뒤 오류를 던져서, 오류와 함께 저장까지 되돌려졌다 (잠금이 걸리지 않음).
-- 틀렸을 때는 오류 대신 {"error": "bad login"} / {"error": "locked"}를 돌려주고, 게임이 그걸 오류로 보여 준다.
create or replace function public.gangho_login(p_id text, p_pass text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare v_id text := lower(coalesce(p_id, '')); a record; v_token text := encode(gen_random_bytes(24), 'hex'); v_epoch int;
begin
  select pass_hash, save, fail_count, locked_until into a from gangho_accounts where id = v_id;
  if a.pass_hash is null then return json_build_object('error', 'bad login'); end if;
  if a.locked_until is not null and a.locked_until > now() then return json_build_object('error', 'locked'); end if;
  if p_pass is null or a.pass_hash <> crypt(p_pass, a.pass_hash) then
    update gangho_accounts set
      locked_until = case when fail_count + 1 >= 5 then now() + interval '10 minutes' else locked_until end,
      fail_count = case when fail_count + 1 >= 5 then 0 else fail_count + 1 end
    where id = v_id;
    return json_build_object('error', case when a.fail_count + 1 >= 5 then 'locked' else 'bad login' end);
  end if;
  select epoch into v_epoch from gangho_meta where id = 1;
  update gangho_accounts set token_hash = crypt(v_token, gen_salt('bf', 6)), token_epoch = coalesce(v_epoch, 0), login_at = now(), fail_count = 0, locked_until = null where id = v_id;
  return json_build_object('id', v_id, 'token', v_token, 'save', a.save);
end $$;

-- 확인용 시험 계정 지우기
delete from public.gangho_accounts where id like 'zztest%';
