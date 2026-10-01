-- 로그인 시도 제한: 같은 아이디로 비밀번호를 5번 틀리면 10분 동안 로그인을 막는다 (성공하면 초기화)
alter table public.gangho_accounts add column if not exists fail_count int not null default 0;
alter table public.gangho_accounts add column if not exists locked_until timestamptz;

create or replace function public.gangho_login(p_id text, p_pass text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare v_id text := lower(coalesce(p_id, '')); a record; v_token text := encode(gen_random_bytes(24), 'hex'); v_epoch int;
begin
  select pass_hash, save, fail_count, locked_until into a from gangho_accounts where id = v_id;
  if a.pass_hash is null then raise exception 'bad login'; end if;
  if a.locked_until is not null and a.locked_until > now() then raise exception 'locked'; end if;
  if p_pass is null or a.pass_hash <> crypt(p_pass, a.pass_hash) then
    update gangho_accounts set
      locked_until = case when fail_count + 1 >= 5 then now() + interval '10 minutes' else locked_until end,
      fail_count = case when fail_count + 1 >= 5 then 0 else fail_count + 1 end
    where id = v_id;
    raise exception 'bad login';
  end if;
  select epoch into v_epoch from gangho_meta where id = 1;
  update gangho_accounts set token_hash = crypt(v_token, gen_salt('bf', 6)), token_epoch = coalesce(v_epoch, 0), login_at = now(), fail_count = 0, locked_until = null where id = v_id;
  return json_build_object('id', v_id, 'token', v_token, 'save', a.save);
end $$;
