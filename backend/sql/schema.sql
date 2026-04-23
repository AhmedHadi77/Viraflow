create extension if not exists "uuid-ossp";

create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  username text not null unique,
  email text not null unique,
  password_hash text not null,
  profile_image text,
  bio text default '',
  headline text default '',
  language text not null default 'en',
  created_at timestamptz not null default now()
);

create table if not exists reels (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  video_url text not null,
  caption text not null,
  thumbnail_url text,
  created_at timestamptz not null default now()
);

create table if not exists likes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  reel_id uuid not null references reels(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, reel_id)
);

create table if not exists comments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  reel_id uuid not null references reels(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists followers (
  id uuid primary key default uuid_generate_v4(),
  follower_id uuid not null references users(id) on delete cascade,
  following_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, following_id)
);

create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  description text not null,
  price numeric(10, 2) not null default 0,
  image_url text,
  category text default 'Services',
  created_at timestamptz not null default now()
);

create table if not exists subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  plan_type text not null,
  status text not null,
  stripe_customer_id text,
  started_at timestamptz not null default now(),
  ends_at timestamptz
);

create index if not exists idx_reels_user_id on reels(user_id);
create index if not exists idx_likes_reel_id on likes(reel_id);
create index if not exists idx_comments_reel_id on comments(reel_id);
create index if not exists idx_followers_following_id on followers(following_id);
create index if not exists idx_products_user_id on products(user_id);
create index if not exists idx_subscriptions_user_id on subscriptions(user_id);

-- Future tables
-- reposts
-- saved_posts
-- ai_generations
-- templates
-- notifications
-- chat_threads

