-- ============================================================
-- SCHEMA INITIAL — my-site
-- Next.js + Supabase stack
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";
create extension if not exists "unaccent";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table public.profiles (
  id             uuid references auth.users(id) on delete cascade primary key,
  username       text unique not null,
  display_name   text,
  bio            text,
  avatar_url     text,
  website        text,
  role           text default 'member' check (role in ('admin', 'moderator', 'member')),
  stripe_customer_id text,
  is_verified    boolean default false,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- ============================================================
-- TAGS (global, reused across features)
-- ============================================================
create table public.tags (
  id         uuid default uuid_generate_v4() primary key,
  name       text unique not null,
  slug       text unique not null,
  color      text default '#6B5FE4',
  created_at timestamptz default now()
);

-- ============================================================
-- POSTS (blog + discussions — multi-auteur)
-- ============================================================
create table public.posts (
  id             uuid default uuid_generate_v4() primary key,
  title          text not null,
  slug           text unique not null,
  content        jsonb,           -- TipTap JSON
  excerpt        text,
  cover_image    text,
  type           text default 'blog'       check (type in ('blog', 'discussion', 'note')),
  status         text default 'draft'      check (status in ('draft', 'published', 'archived')),
  visibility     text default 'public'     check (visibility in ('public', 'members', 'private')),
  author_id      uuid references public.profiles(id) on delete set null,
  views          int default 0,
  reading_time   int,             -- minutes, calculé côté app
  allow_comments boolean default true,
  is_featured    boolean default false,
  published_at   timestamptz,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- Co-auteurs pour les discussions multi-auteur
create table public.post_authors (
  post_id    uuid references public.posts(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  role       text default 'co-author' check (role in ('co-author', 'contributor', 'editor')),
  primary key (post_id, profile_id)
);

-- Tags des posts
create table public.post_tags (
  post_id uuid references public.posts(id) on delete cascade,
  tag_id  uuid references public.tags(id) on delete cascade,
  primary key (post_id, tag_id)
);

-- ============================================================
-- COMMENTS (threaded)
-- ============================================================
create table public.comments (
  id          uuid default uuid_generate_v4() primary key,
  post_id     uuid references public.posts(id) on delete cascade,
  author_id   uuid references public.profiles(id) on delete set null,
  parent_id   uuid references public.comments(id) on delete cascade,
  content     text not null,
  is_approved boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ============================================================
-- FILES (hébergement libre/payant)
-- ============================================================
create table public.files (
  id             uuid default uuid_generate_v4() primary key,
  uploader_id    uuid references public.profiles(id) on delete set null,
  title          text not null,
  description    text,
  file_path      text not null,     -- chemin Supabase Storage
  file_name      text not null,
  file_size      bigint not null,   -- octets
  mime_type      text,
  cover_image    text,
  visibility     text default 'public' check (visibility in ('public', 'members', 'private')),
  pricing_type   text default 'free' check (pricing_type in ('free', 'paid', 'pwyw')),
  price          int default 0,     -- centimes
  currency       text default 'EUR',
  stripe_product_id text,
  stripe_price_id   text,
  download_count int default 0,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create table public.file_tags (
  file_id uuid references public.files(id) on delete cascade,
  tag_id  uuid references public.tags(id) on delete cascade,
  primary key (file_id, tag_id)
);

create table public.file_purchases (
  id                       uuid default uuid_generate_v4() primary key,
  file_id                  uuid references public.files(id) on delete cascade,
  buyer_id                 uuid references public.profiles(id) on delete set null,
  stripe_payment_intent_id text,
  amount_paid              int,
  created_at               timestamptz default now()
);

-- ============================================================
-- POLLS (sondages)
-- ============================================================
create table public.polls (
  id               uuid default uuid_generate_v4() primary key,
  creator_id       uuid references public.profiles(id) on delete set null,
  title            text not null,
  description      text,
  visibility       text default 'public' check (visibility in ('public', 'members', 'private')),
  allow_multiple   boolean default false,
  is_anonymous     boolean default false,
  show_results     text default 'after_vote' check (show_results in ('always', 'after_vote', 'after_close', 'never')),
  ends_at          timestamptz,
  status           text default 'active' check (status in ('active', 'closed')),
  created_at       timestamptz default now()
);

create table public.poll_options (
  id       uuid default uuid_generate_v4() primary key,
  poll_id  uuid references public.polls(id) on delete cascade,
  text     text not null,
  position int not null,
  created_at timestamptz default now()
);

create table public.poll_votes (
  id        uuid default uuid_generate_v4() primary key,
  poll_id   uuid references public.polls(id) on delete cascade,
  option_id uuid references public.poll_options(id) on delete cascade,
  voter_id  uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (poll_id, voter_id, option_id)
);

-- ============================================================
-- CROWDFUNDING — PROJETS
-- ============================================================
create table public.projects (
  id             uuid default uuid_generate_v4() primary key,
  creator_id     uuid references public.profiles(id) on delete set null,
  title          text not null,
  slug           text unique not null,
  short_desc     text,
  content        jsonb,            -- TipTap
  cover_image    text,
  goal_amount    int not null,     -- centimes
  current_amount int default 0,
  currency       text default 'EUR',
  status         text default 'draft' check (status in ('draft', 'active', 'funded', 'closed', 'cancelled')),
  visibility     text default 'public' check (visibility in ('public', 'private')),
  ends_at        timestamptz,
  stripe_product_id text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- Paliers de récompense
create table public.project_tiers (
  id          uuid default uuid_generate_v4() primary key,
  project_id  uuid references public.projects(id) on delete cascade,
  title       text not null,
  description text,
  amount      int not null,     -- montant minimum, centimes
  max_backers int,              -- null = illimité
  stripe_price_id text,
  created_at  timestamptz default now()
);

-- Contributions
create table public.project_contributions (
  id                       uuid default uuid_generate_v4() primary key,
  project_id               uuid references public.projects(id) on delete cascade,
  tier_id                  uuid references public.project_tiers(id) on delete set null,
  contributor_id           uuid references public.profiles(id) on delete set null,
  amount                   int not null,
  stripe_payment_intent_id text,
  stripe_charge_id         text,
  is_anonymous             boolean default false,
  message                  text,
  created_at               timestamptz default now()
);

-- ============================================================
-- PRODUITS (offres groupées, abonnements)
-- ============================================================
create table public.products (
  id               uuid default uuid_generate_v4() primary key,
  creator_id       uuid references public.profiles(id) on delete set null,
  title            text not null,
  description      text,
  type             text default 'one_time' check (type in ('one_time', 'subscription', 'bundle')),
  price            int not null,   -- centimes
  currency         text default 'EUR',
  billing_interval text check (billing_interval in ('month', 'year')),  -- pour abonnements
  stripe_product_id text,
  stripe_price_id   text,
  max_members      int,            -- pour offres groupées
  is_active        boolean default true,
  metadata         jsonb,          -- liste des fonctionnalités incluses
  created_at       timestamptz default now()
);

-- Accès utilisateurs (abonnements actifs)
create table public.user_products (
  id                      uuid default uuid_generate_v4() primary key,
  user_id                 uuid references public.profiles(id) on delete cascade,
  product_id              uuid references public.products(id) on delete cascade,
  stripe_subscription_id  text,
  stripe_customer_id      text,
  status                  text default 'active' check (status in ('active', 'cancelled', 'expired', 'past_due', 'trialing')),
  current_period_end      timestamptz,
  created_at              timestamptz default now(),
  unique (user_id, product_id)
);

-- ============================================================
-- CHAT — MESSAGES DIRECTS
-- ============================================================
create table public.direct_messages (
  id          uuid default uuid_generate_v4() primary key,
  sender_id   uuid references public.profiles(id) on delete cascade,
  receiver_id uuid references public.profiles(id) on delete cascade,
  content     text not null,
  attachments jsonb,           -- [{url, name, type, size}]
  is_read     boolean default false,
  created_at  timestamptz default now()
);

-- ============================================================
-- CHAT — GROUPES
-- ============================================================
create table public.group_chats (
  id          uuid default uuid_generate_v4() primary key,
  name        text not null,
  description text,
  avatar_url  text,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table public.group_chat_members (
  chat_id    uuid references public.group_chats(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  role       text default 'member' check (role in ('admin', 'member')),
  joined_at  timestamptz default now(),
  primary key (chat_id, profile_id)
);

create table public.group_messages (
  id          uuid default uuid_generate_v4() primary key,
  chat_id     uuid references public.group_chats(id) on delete cascade,
  sender_id   uuid references public.profiles(id) on delete cascade,
  content     text,
  attachments jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ============================================================
-- REQUÊTES (demandes personnalisées)
-- ============================================================
create table public.requests (
  id            uuid default uuid_generate_v4() primary key,
  requester_id  uuid references public.profiles(id) on delete cascade,
  title         text not null,
  description   text not null,
  type          text default 'general' check (type in ('general', 'collaboration', 'content', 'technical', 'commercial')),
  status        text default 'pending' check (status in ('pending', 'reviewing', 'accepted', 'declined', 'completed')),
  is_public     boolean default false,
  budget_min    int,    -- centimes
  budget_max    int,
  response      text,   -- réponse de l'admin/propriétaire
  responded_at  timestamptz,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ============================================================
-- RÉACTIONS (likes, etc.)
-- ============================================================
create table public.reactions (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade,
  entity_type text not null check (entity_type in ('post', 'comment', 'file', 'project')),
  entity_id   uuid not null,
  type        text default 'like' check (type in ('like', 'heart', 'celebrate', 'insightful')),
  created_at  timestamptz default now(),
  unique (user_id, entity_type, entity_id)
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table public.notifications (
  id         uuid default uuid_generate_v4() primary key,
  user_id    uuid references public.profiles(id) on delete cascade,
  type       text not null,  -- 'comment', 'mention', 'purchase', 'contribution', 'message', etc.
  title      text not null,
  body       text,
  link       text,
  is_read    boolean default false,
  data       jsonb,
  created_at timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_posts_author    on public.posts(author_id);
create index idx_posts_slug      on public.posts(slug);
create index idx_posts_status    on public.posts(status, visibility, published_at desc);
create index idx_posts_type      on public.posts(type);
create index idx_post_tags_post  on public.post_tags(post_id);
create index idx_post_tags_tag   on public.post_tags(tag_id);
create index idx_comments_post   on public.comments(post_id);
create index idx_files_uploader  on public.files(uploader_id);
create index idx_files_pricing   on public.files(pricing_type, visibility);
create index idx_polls_status    on public.polls(status, visibility);
create index idx_projects_slug   on public.projects(slug);
create index idx_projects_status on public.projects(status, visibility);
create index idx_dm_sender       on public.direct_messages(sender_id, created_at desc);
create index idx_dm_receiver     on public.direct_messages(receiver_id, created_at desc);
create index idx_gm_chat         on public.group_messages(chat_id, created_at desc);
create index idx_notifs_user     on public.notifications(user_id, is_read, created_at desc);
create index idx_reactions       on public.reactions(entity_type, entity_id);

-- Full-text search sur les posts
create index idx_posts_fts on public.posts
  using gin(to_tsvector('french', coalesce(title,'') || ' ' || coalesce(excerpt,'')));

-- ============================================================
-- TRIGGERS — updated_at automatique
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at   before update on public.profiles   for each row execute procedure public.handle_updated_at();
create trigger trg_posts_updated_at      before update on public.posts      for each row execute procedure public.handle_updated_at();
create trigger trg_comments_updated_at   before update on public.comments   for each row execute procedure public.handle_updated_at();
create trigger trg_files_updated_at      before update on public.files      for each row execute procedure public.handle_updated_at();
create trigger trg_projects_updated_at   before update on public.projects   for each row execute procedure public.handle_updated_at();
create trigger trg_group_chats_updated   before update on public.group_chats for each row execute procedure public.handle_updated_at();
create trigger trg_group_msg_updated     before update on public.group_messages for each row execute procedure public.handle_updated_at();
create trigger trg_requests_updated      before update on public.requests   for each row execute procedure public.handle_updated_at();

-- Création automatique du profil à l'inscription
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Mise à jour du current_amount des projets après contribution
create or replace function public.update_project_amount()
returns trigger as $$
begin
  update public.projects
  set current_amount = (
    select coalesce(sum(amount), 0)
    from public.project_contributions
    where project_id = new.project_id
  )
  where id = new.project_id;
  return new;
end;
$$ language plpgsql;

create trigger trg_update_project_amount
  after insert on public.project_contributions
  for each row execute procedure public.update_project_amount();

-- Incrément du download_count
create or replace function public.increment_download_count(file_id uuid)
returns void as $$
begin
  update public.files set download_count = download_count + 1 where id = file_id;
end;
$$ language plpgsql security definer;

-- Vue vues + lecture rapide
create or replace function public.increment_post_views(post_id uuid)
returns void as $$
begin
  update public.posts set views = views + 1 where id = post_id;
end;
$$ language plpgsql security definer;
