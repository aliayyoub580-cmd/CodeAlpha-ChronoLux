create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  username text unique not null check (username ~ '^[A-Za-z0-9_]{3,30}$'),
  bio text,
  profile_image_url text,
  cover_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  image_url text,
  pdf_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  comment_text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint likes_post_user_unique unique (post_id, user_id)
);

create table if not exists public.followers (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint followers_pair_unique unique (follower_id, following_id),
  constraint followers_no_self_follow check (follower_id <> following_id)
);

create table if not exists public.shares (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.reposts (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint reposts_post_user_unique unique (post_id, user_id)
);

create index if not exists posts_user_created_idx on public.posts(user_id, created_at desc);
create index if not exists posts_created_idx on public.posts(created_at desc);
create index if not exists comments_post_created_idx on public.comments(post_id, created_at asc);
create index if not exists likes_post_idx on public.likes(post_id);
create index if not exists followers_follower_idx on public.followers(follower_id);
create index if not exists followers_following_idx on public.followers(following_id);
create index if not exists shares_post_idx on public.shares(post_id);
create index if not exists reposts_post_idx on public.reposts(post_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
begin
  base_username := lower(regexp_replace(
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1), 'vyntra_user'),
    '[^A-Za-z0-9_]',
    '',
    'g'
  ));

  if char_length(base_username) < 3 then
    base_username := 'user_' || substring(replace(new.id::text, '-', '') from 1 for 8);
  end if;

  insert into public.profiles (id, full_name, username, profile_image_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'Vyntra User'),
    substring(base_username from 1 for 21) || '_' || substring(replace(new.id::text, '-', '') from 1 for 8),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.followers enable row level security;
alter table public.shares enable row level security;
alter table public.reposts enable row level security;

drop policy if exists "Profiles are readable by everyone" on public.profiles;
create policy "Profiles are readable by everyone"
on public.profiles for select
using (true);

drop policy if exists "Users can create own profile" on public.profiles;
create policy "Users can create own profile"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Posts are readable by everyone" on public.posts;
create policy "Posts are readable by everyone"
on public.posts for select
using (true);

drop policy if exists "Users can create own posts" on public.posts;
create policy "Users can create own posts"
on public.posts for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own posts" on public.posts;
create policy "Users can update own posts"
on public.posts for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own posts" on public.posts;
create policy "Users can delete own posts"
on public.posts for delete
using (auth.uid() = user_id);

drop policy if exists "Comments are readable by everyone" on public.comments;
create policy "Comments are readable by everyone"
on public.comments for select
using (true);

drop policy if exists "Users can create own comments" on public.comments;
create policy "Users can create own comments"
on public.comments for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own comments" on public.comments;
create policy "Users can delete own comments"
on public.comments for delete
using (auth.uid() = user_id);

drop policy if exists "Likes are readable by everyone" on public.likes;
create policy "Likes are readable by everyone"
on public.likes for select
using (true);

drop policy if exists "Users can create own likes" on public.likes;
create policy "Users can create own likes"
on public.likes for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own likes" on public.likes;
create policy "Users can delete own likes"
on public.likes for delete
using (auth.uid() = user_id);

drop policy if exists "Follows are readable by everyone" on public.followers;
create policy "Follows are readable by everyone"
on public.followers for select
using (true);

drop policy if exists "Users can create own follows" on public.followers;
create policy "Users can create own follows"
on public.followers for insert
with check (auth.uid() = follower_id);

drop policy if exists "Users can delete own follows" on public.followers;
create policy "Users can delete own follows"
on public.followers for delete
using (auth.uid() = follower_id);

drop policy if exists "Shares are readable by everyone" on public.shares;
create policy "Shares are readable by everyone"
on public.shares for select
using (true);

drop policy if exists "Users can create own shares" on public.shares;
create policy "Users can create own shares"
on public.shares for insert
with check (auth.uid() = user_id);

drop policy if exists "Reposts are readable by everyone" on public.reposts;
create policy "Reposts are readable by everyone"
on public.reposts for select
using (true);

drop policy if exists "Users can create own reposts" on public.reposts;
create policy "Users can create own reposts"
on public.reposts for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own reposts" on public.reposts;
create policy "Users can delete own reposts"
on public.reposts for delete
using (auth.uid() = user_id);
