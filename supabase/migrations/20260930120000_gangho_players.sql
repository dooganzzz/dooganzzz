-- 강호견문록: 웹(GitHub Pages 등)에서 플레이하는 유저 기록
-- 게임은 공개 키(anon)로 아래 함수만 부른다. 표를 직접 읽거나 쓸 수는 없다 (RLS 켜고 정책 없음).
-- 운영자 암호는 이 파일에 넣지 않는다 (공개 저장소). 설치 뒤 SQL 편집기에서 따로 정한다 (맨 아래 안내).

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.players (
  id          text primary key,                 -- 브라우저 저장마다 만든 익명 id
  token_hash  text not null,                    -- 그 저장만 아는 비밀값의 해시 (남의 기록을 덮어쓰지 못하게)
  name text, cp int, silver bigint, exp bigint, contrib bigint,
  zone text, mugong text, star int, best_star int, runs int, bosses int, weapon text,
  device text, source text, ip text,
  save jsonb,
  created_at  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  synced_at   timestamptz
);
alter table public.players enable row level security;

create table if not exists public.gm_secret (id int primary key default 1 check (id = 1), pass_hash text not null);
alter table public.gm_secret enable row level security;

-- 게임 → 기록: p_data가 없으면 접속 신호(last_seen)만, 있으면 요약(과 저장)을 갱신
create or replace function public.gangho_sync(p_id text, p_token text, p_data jsonb default null, p_save jsonb default null)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  v_ip text := nullif(split_part(coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''), ',', 1), '');
  v_hash text;
begin
  if p_id is null or length(p_id) < 16 or length(p_id) > 64 or p_token is null or length(p_token) < 16 then raise exception 'bad id'; end if;
  select token_hash into v_hash from players where id = p_id;
  if v_hash is null then
    insert into players (id, token_hash, ip) values (p_id, crypt(p_token, gen_salt('bf', 6)), v_ip);
  elsif v_hash <> crypt(p_token, v_hash) then
    raise exception 'token mismatch';
  end if;
  update players set last_seen = now(), ip = coalesce(v_ip, ip) where id = p_id;
  if p_data is not null then
    update players set
      name = p_data ->> 'name', cp = (p_data ->> 'cp')::int, silver = (p_data ->> 'silver')::bigint, exp = (p_data ->> 'exp')::bigint,
      contrib = (p_data ->> 'contrib')::bigint, zone = p_data ->> 'zone', mugong = p_data ->> 'mugong', star = (p_data ->> 'star')::int,
      best_star = (p_data ->> 'bestStar')::int, runs = (p_data ->> 'runs')::int, bosses = (p_data ->> 'bosses')::int, weapon = p_data ->> 'weapon',
      device = p_data ->> 'device', source = p_data ->> 'source', synced_at = now(),
      save = coalesce(p_save, save)
    where id = p_id;
  end if;
end $$;

-- 운영자: 암호가 맞으면 유저 목록 (저장 본문은 빼고)
create or replace function public.gangho_players(p_pass text)
returns setof json language plpgsql security definer set search_path = public, extensions as $$
declare v_hash text;
begin
  select pass_hash into v_hash from gm_secret where id = 1;
  if v_hash is null or v_hash <> crypt(p_pass, v_hash) then raise exception 'denied'; end if;
  return query select to_json(t) from (
    select id, name, cp, silver, exp, contrib, zone, mugong, star, best_star, runs, bosses, weapon, device, source, ip,
           created_at, last_seen, synced_at, (save is not null) as has_save
    from players order by last_seen desc limit 500) t;
end $$;

-- 운영자: 한 유저의 저장
create or replace function public.gangho_player_save(p_pass text, p_id text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_hash text; v_save jsonb;
begin
  select pass_hash into v_hash from gm_secret where id = 1;
  if v_hash is null or v_hash <> crypt(p_pass, v_hash) then raise exception 'denied'; end if;
  select save into v_save from players where id = p_id;
  return v_save;
end $$;

revoke all on function public.gangho_sync(text, text, jsonb, jsonb) from public;
revoke all on function public.gangho_players(text) from public;
revoke all on function public.gangho_player_save(text, text) from public;
grant execute on function public.gangho_sync(text, text, jsonb, jsonb) to anon, authenticated;
grant execute on function public.gangho_players(text) to anon, authenticated;
grant execute on function public.gangho_player_save(text, text) to anon, authenticated;

-- ▼ 설치 뒤 한 번, SQL 편집기에서 운영자 암호를 정한다 ('내암호'를 바꿔서 실행):
-- insert into public.gm_secret (id, pass_hash) values (1, extensions.crypt('내암호', extensions.gen_salt('bf')))
--   on conflict (id) do update set pass_hash = excluded.pass_hash;
