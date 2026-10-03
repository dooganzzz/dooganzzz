-- 강호견문록: 아이디 · 비밀번호 계정과, 계정에 묶인 캐릭터 저장
-- 게임은 공개 키(anon)로 아래 함수만 부른다. 표를 직접 읽거나 쓸 수는 없다 (RLS 켜고 정책 없음).
-- 비밀번호는 bcrypt 해시로만 남는다. 로그인할 때마다 새 접속 토큰을 내주고(해시만 저장), 저장 · 불러오기는 그 토큰으로만 된다.
-- 전체 로그아웃: gangho_meta.epoch를 올리면 그 전에 받은 토큰은 모두 무효가 된다 (운영자 암호 필요).

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.gangho_accounts (
  id          text primary key,                 -- 아이디 (영문 소문자 · 숫자 · _ 3~16자)
  pass_hash   text not null,                    -- 비밀번호 bcrypt 해시
  token_hash  text,                             -- 마지막 로그인 토큰의 해시 (한 계정은 한 기기 · 한 창에서만)
  token_epoch int not null default 0,           -- 토큰을 받을 때의 전체 로그아웃 차수
  save        jsonb,                            -- 캐릭터 저장
  save_at     timestamptz,
  created_at  timestamptz not null default now(),
  login_at    timestamptz
);
alter table public.gangho_accounts enable row level security;

create table if not exists public.gangho_meta (id int primary key default 1 check (id = 1), epoch int not null default 0);
alter table public.gangho_meta enable row level security;
insert into public.gangho_meta (id, epoch) values (1, 0) on conflict (id) do nothing;

-- 토큰 확인: 맞으면 아무 일 없음, 틀리거나 전체 로그아웃 뒤면 'logged out'
create or replace function public.gangho_auth_check(p_id text, p_token text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare a record; v_epoch int;
begin
  select epoch into v_epoch from gangho_meta where id = 1;
  select token_hash, token_epoch into a from gangho_accounts where id = lower(p_id);
  if a.token_hash is null or p_token is null or a.token_hash <> crypt(p_token, a.token_hash) or a.token_epoch <> coalesce(v_epoch, 0) then
    raise exception 'logged out';
  end if;
end $$;

-- 회원가입: 새 계정을 만들고 곧바로 로그인 토큰을 돌려준다
create or replace function public.gangho_signup(p_id text, p_pass text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare v_id text := lower(coalesce(p_id, '')); v_token text := encode(gen_random_bytes(24), 'hex'); v_epoch int;
begin
  if v_id !~ '^[a-z0-9_]{3,16}$' then raise exception 'bad id'; end if;
  if p_pass is null or length(p_pass) < 4 or length(p_pass) > 64 then raise exception 'bad pass'; end if;
  if exists (select 1 from gangho_accounts where id = v_id) then raise exception 'id taken'; end if;
  select epoch into v_epoch from gangho_meta where id = 1;
  insert into gangho_accounts (id, pass_hash, token_hash, token_epoch, login_at)
    values (v_id, crypt(p_pass, gen_salt('bf', 8)), crypt(v_token, gen_salt('bf', 6)), coalesce(v_epoch, 0), now());
  return json_build_object('id', v_id, 'token', v_token, 'save', null);
end $$;

-- 로그인: 비밀번호가 맞으면 새 토큰과 저장을 돌려준다 (다른 기기의 예전 토큰은 무효가 된다)
create or replace function public.gangho_login(p_id text, p_pass text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare v_id text := lower(coalesce(p_id, '')); a record; v_token text := encode(gen_random_bytes(24), 'hex'); v_epoch int;
begin
  select pass_hash, save into a from gangho_accounts where id = v_id;
  if a.pass_hash is null or p_pass is null or a.pass_hash <> crypt(p_pass, a.pass_hash) then raise exception 'bad login'; end if;
  select epoch into v_epoch from gangho_meta where id = 1;
  update gangho_accounts set token_hash = crypt(v_token, gen_salt('bf', 6)), token_epoch = coalesce(v_epoch, 0), login_at = now() where id = v_id;
  return json_build_object('id', v_id, 'token', v_token, 'save', a.save);
end $$;

-- 저장 불러오기 · 저장하기 (토큰이 맞을 때만)
create or replace function public.gangho_load(p_id text, p_token text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_save jsonb;
begin
  perform gangho_auth_check(p_id, p_token);
  select save into v_save from gangho_accounts where id = lower(p_id);
  return v_save;
end $$;

create or replace function public.gangho_save(p_id text, p_token text, p_save jsonb)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform gangho_auth_check(p_id, p_token);
  if p_save is null or pg_column_size(p_save) > 3000000 then raise exception 'bad save'; end if;
  update gangho_accounts set save = p_save, save_at = now() where id = lower(p_id);
end $$;

-- 운영자: 전체 로그아웃 (지금까지 내준 모든 토큰 무효)
create or replace function public.gangho_logout_all(p_pass text)
returns int language plpgsql security definer set search_path = public, extensions as $$
declare v_hash text; v_epoch int;
begin
  select pass_hash into v_hash from gm_secret where id = 1;
  if v_hash is null or v_hash <> crypt(p_pass, v_hash) then raise exception 'denied'; end if;
  update gangho_meta set epoch = epoch + 1 where id = 1 returning epoch into v_epoch;
  return v_epoch;
end $$;

-- 운영자: 계정 목록 (저장 본문은 빼고)
create or replace function public.gangho_accounts_list(p_pass text)
returns setof json language plpgsql security definer set search_path = public, extensions as $$
declare v_hash text;
begin
  select pass_hash into v_hash from gm_secret where id = 1;
  if v_hash is null or v_hash <> crypt(p_pass, v_hash) then raise exception 'denied'; end if;
  return query select to_json(t) from (
    select id, created_at, login_at, save_at, save ->> 'name' as name, (save is not null) as has_save
    from gangho_accounts order by coalesce(save_at, login_at, created_at) desc limit 500) t;
end $$;

revoke all on function public.gangho_auth_check(text, text) from public;
revoke all on function public.gangho_signup(text, text) from public;
revoke all on function public.gangho_login(text, text) from public;
revoke all on function public.gangho_load(text, text) from public;
revoke all on function public.gangho_save(text, text, jsonb) from public;
revoke all on function public.gangho_logout_all(text) from public;
revoke all on function public.gangho_accounts_list(text) from public;
grant execute on function public.gangho_signup(text, text) to anon, authenticated;
grant execute on function public.gangho_login(text, text) to anon, authenticated;
grant execute on function public.gangho_load(text, text) to anon, authenticated;
grant execute on function public.gangho_save(text, text, jsonb) to anon, authenticated;
grant execute on function public.gangho_logout_all(text) to anon, authenticated;
grant execute on function public.gangho_accounts_list(text) to anon, authenticated;
