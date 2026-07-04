-- ============================================================
-- ROW LEVEL SECURITY — my-site
-- ============================================================

-- Helper : est-ce que l'utilisateur est admin ?
create or replace function public.is_admin(uid uuid)
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = uid and role = 'admin'
  );
$$ language sql stable security definer;

-- Helper : est-ce que l'utilisateur a un produit actif ?
create or replace function public.has_product(uid uuid, prod_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.user_products
    where user_id = uid and product_id = prod_id and status = 'active'
  );
$$ language sql stable security definer;

-- ============================================================
-- PROFILES
-- ============================================================
alter table public.profiles enable row level security;

create policy "Profiles visibles par tous" on public.profiles
  for select using (true);

create policy "Utilisateur modifie son propre profil" on public.profiles
  for update using (auth.uid() = id);

create policy "Admin peut modifier tous les profils" on public.profiles
  for update using (public.is_admin(auth.uid()));

-- ============================================================
-- POSTS
-- ============================================================
alter table public.posts enable row level security;

create policy "Posts publics visibles par tous" on public.posts
  for select using (
    (visibility = 'public' and status = 'published')
    or auth.uid() = author_id
    or public.is_admin(auth.uid())
  );

create policy "Posts membres visibles si connecté" on public.posts
  for select using (
    visibility = 'members' and status = 'published' and auth.uid() is not null
  );

create policy "Créer un post si connecté" on public.posts
  for insert with check (auth.uid() = author_id);

create policy "Modifier son propre post" on public.posts
  for update using (
    auth.uid() = author_id or public.is_admin(auth.uid())
  );

create policy "Supprimer son propre post" on public.posts
  for delete using (
    auth.uid() = author_id or public.is_admin(auth.uid())
  );

-- post_authors, post_tags
alter table public.post_authors enable row level security;
create policy "Post authors visible par tous" on public.post_authors for select using (true);
create policy "Auteur gère ses co-auteurs"   on public.post_authors
  for all using (
    exists (select 1 from public.posts where id = post_id and author_id = auth.uid())
    or public.is_admin(auth.uid())
  );

alter table public.post_tags enable row level security;
create policy "Post tags visibles par tous" on public.post_tags for select using (true);
create policy "Auteur gère ses tags" on public.post_tags
  for all using (
    exists (select 1 from public.posts where id = post_id and author_id = auth.uid())
    or public.is_admin(auth.uid())
  );

-- ============================================================
-- COMMENTS
-- ============================================================
alter table public.comments enable row level security;

create policy "Commentaires visibles si post visible" on public.comments
  for select using (
    exists (
      select 1 from public.posts
      where id = post_id
        and status = 'published'
        and (visibility = 'public' or (visibility = 'members' and auth.uid() is not null))
    )
    or public.is_admin(auth.uid())
  );

create policy "Commenter si connecté" on public.comments
  for insert with check (auth.uid() = author_id);

create policy "Modifier son commentaire" on public.comments
  for update using (auth.uid() = author_id or public.is_admin(auth.uid()));

create policy "Supprimer son commentaire" on public.comments
  for delete using (auth.uid() = author_id or public.is_admin(auth.uid()));

-- ============================================================
-- FILES
-- ============================================================
alter table public.files enable row level security;

create policy "Fichiers publics visibles par tous" on public.files
  for select using (
    (visibility = 'public')
    or auth.uid() = uploader_id
    or public.is_admin(auth.uid())
  );

create policy "Fichiers membres si connecté" on public.files
  for select using (
    visibility = 'members' and auth.uid() is not null
  );

create policy "Uploader un fichier si connecté" on public.files
  for insert with check (auth.uid() = uploader_id);

create policy "Modifier son fichier" on public.files
  for update using (auth.uid() = uploader_id or public.is_admin(auth.uid()));

create policy "Supprimer son fichier" on public.files
  for delete using (auth.uid() = uploader_id or public.is_admin(auth.uid()));

alter table public.file_tags enable row level security;
create policy "File tags visibles par tous" on public.file_tags for select using (true);
create policy "Uploader gère ses file tags" on public.file_tags
  for all using (
    exists (select 1 from public.files where id = file_id and uploader_id = auth.uid())
    or public.is_admin(auth.uid())
  );

alter table public.file_purchases enable row level security;
create policy "Voir ses propres achats" on public.file_purchases
  for select using (auth.uid() = buyer_id or public.is_admin(auth.uid()));
create policy "Créer un achat" on public.file_purchases
  for insert with check (auth.uid() = buyer_id);

-- ============================================================
-- POLLS
-- ============================================================
alter table public.polls enable row level security;

create policy "Sondages publics visibles" on public.polls
  for select using (
    visibility = 'public'
    or auth.uid() = creator_id
    or public.is_admin(auth.uid())
  );

create policy "Sondages membres si connecté" on public.polls
  for select using (visibility = 'members' and auth.uid() is not null);

create policy "Créer un sondage si connecté" on public.polls
  for insert with check (auth.uid() = creator_id);

create policy "Modifier son sondage" on public.polls
  for update using (auth.uid() = creator_id or public.is_admin(auth.uid()));

alter table public.poll_options enable row level security;
create policy "Options visibles pour les sondages accessibles" on public.poll_options
  for select using (
    exists (select 1 from public.polls where id = poll_id)
  );
create policy "Créateur gère ses options" on public.poll_options
  for all using (
    exists (select 1 from public.polls where id = poll_id and creator_id = auth.uid())
    or public.is_admin(auth.uid())
  );

alter table public.poll_votes enable row level security;
create policy "Vote non-anonyme visible" on public.poll_votes
  for select using (
    auth.uid() = voter_id
    or public.is_admin(auth.uid())
    or exists (select 1 from public.polls where id = poll_id and is_anonymous = false)
  );
create policy "Voter si connecté" on public.poll_votes
  for insert with check (auth.uid() = voter_id);

-- ============================================================
-- PROJECTS (crowdfunding)
-- ============================================================
alter table public.projects enable row level security;

create policy "Projets publics visibles" on public.projects
  for select using (
    (visibility = 'public' and status != 'draft')
    or auth.uid() = creator_id
    or public.is_admin(auth.uid())
  );

create policy "Créer un projet si connecté" on public.projects
  for insert with check (auth.uid() = creator_id);

create policy "Modifier son projet" on public.projects
  for update using (auth.uid() = creator_id or public.is_admin(auth.uid()));

alter table public.project_tiers enable row level security;
create policy "Paliers visibles si projet visible" on public.project_tiers
  for select using (
    exists (select 1 from public.projects where id = project_id and (visibility = 'public' or creator_id = auth.uid()))
  );
create policy "Créateur gère ses paliers" on public.project_tiers
  for all using (
    exists (select 1 from public.projects where id = project_id and creator_id = auth.uid())
    or public.is_admin(auth.uid())
  );

alter table public.project_contributions enable row level security;
create policy "Voir les contributions d'un projet" on public.project_contributions
  for select using (
    (not is_anonymous and auth.uid() is not null)
    or auth.uid() = contributor_id
    or public.is_admin(auth.uid())
  );
create policy "Contribuer si connecté" on public.project_contributions
  for insert with check (auth.uid() = contributor_id);

-- ============================================================
-- PRODUCTS & SUBSCRIPTIONS
-- ============================================================
alter table public.products enable row level security;
create policy "Produits actifs visibles par tous" on public.products
  for select using (is_active = true or public.is_admin(auth.uid()));
create policy "Admin gère les produits" on public.products
  for all using (public.is_admin(auth.uid()));

alter table public.user_products enable row level security;
create policy "Voir ses propres abonnements" on public.user_products
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "Créer un abonnement" on public.user_products
  for insert with check (auth.uid() = user_id);
create policy "Admin gère les abonnements" on public.user_products
  for update using (public.is_admin(auth.uid()));

-- ============================================================
-- DIRECT MESSAGES
-- ============================================================
alter table public.direct_messages enable row level security;

create policy "Voir ses messages" on public.direct_messages
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Envoyer un message si connecté" on public.direct_messages
  for insert with check (auth.uid() = sender_id);

create policy "Marquer ses messages comme lus" on public.direct_messages
  for update using (auth.uid() = receiver_id)
  with check (auth.uid() = receiver_id);

-- ============================================================
-- GROUP CHATS
-- ============================================================
alter table public.group_chats enable row level security;

create policy "Voir les groupes dont on est membre" on public.group_chats
  for select using (
    exists (
      select 1 from public.group_chat_members
      where chat_id = id and profile_id = auth.uid()
    )
    or public.is_admin(auth.uid())
  );

create policy "Créer un groupe si connecté" on public.group_chats
  for insert with check (auth.uid() = created_by);

create policy "Admin groupe peut modifier" on public.group_chats
  for update using (
    exists (
      select 1 from public.group_chat_members
      where chat_id = id and profile_id = auth.uid() and role = 'admin'
    )
    or public.is_admin(auth.uid())
  );

alter table public.group_chat_members enable row level security;
create policy "Voir les membres de son groupe" on public.group_chat_members
  for select using (
    exists (
      select 1 from public.group_chat_members gcm
      where gcm.chat_id = chat_id and gcm.profile_id = auth.uid()
    )
  );
create policy "Rejoindre / quitter un groupe" on public.group_chat_members
  for all using (
    profile_id = auth.uid()
    or exists (
      select 1 from public.group_chat_members
      where chat_id = chat_id and profile_id = auth.uid() and role = 'admin'
    )
    or public.is_admin(auth.uid())
  );

alter table public.group_messages enable row level security;
create policy "Voir les messages de son groupe" on public.group_messages
  for select using (
    exists (
      select 1 from public.group_chat_members
      where chat_id = chat_id and profile_id = auth.uid()
    )
  );
create policy "Envoyer dans son groupe" on public.group_messages
  for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.group_chat_members
      where chat_id = chat_id and profile_id = auth.uid()
    )
  );
create policy "Modifier son message de groupe" on public.group_messages
  for update using (auth.uid() = sender_id);

-- ============================================================
-- REQUESTS
-- ============================================================
alter table public.requests enable row level security;

create policy "Voir ses propres requêtes" on public.requests
  for select using (
    auth.uid() = requester_id
    or (is_public = true)
    or public.is_admin(auth.uid())
  );

create policy "Créer une requête si connecté" on public.requests
  for insert with check (auth.uid() = requester_id);

create policy "Admin répond aux requêtes" on public.requests
  for update using (
    auth.uid() = requester_id or public.is_admin(auth.uid())
  );

-- ============================================================
-- REACTIONS
-- ============================================================
alter table public.reactions enable row level security;

create policy "Réactions visibles par tous" on public.reactions
  for select using (true);

create policy "Réagir si connecté" on public.reactions
  for insert with check (auth.uid() = user_id);

create policy "Supprimer sa réaction" on public.reactions
  for delete using (auth.uid() = user_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
alter table public.notifications enable row level security;

create policy "Voir ses notifications" on public.notifications
  for select using (auth.uid() = user_id);

create policy "Marquer comme lu" on public.notifications
  for update using (auth.uid() = user_id);

-- ============================================================
-- TAGS (public)
-- ============================================================
alter table public.tags enable row level security;
create policy "Tags visibles par tous" on public.tags for select using (true);
create policy "Admin gère les tags" on public.tags
  for all using (public.is_admin(auth.uid()));

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
-- À exécuter dans le dashboard Supabase ou via CLI :

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars',     'avatars',     true,  2097152,   array['image/jpeg','image/png','image/webp','image/gif']),
  ('covers',      'covers',      true,  5242880,   array['image/jpeg','image/png','image/webp']),
  ('files',       'files',       false, 104857600, null),         -- 100 MB, privé
  ('attachments', 'attachments', false, 52428800,  null)          -- 50 MB, privé
on conflict (id) do nothing;

-- Policies storage : avatars publics
create policy "Avatars lisibles par tous"
  on storage.objects for select using (bucket_id = 'avatars');
create policy "Upload avatar pour soi"
  on storage.objects for insert with check (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "Supprimer son avatar"
  on storage.objects for delete using (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Covers publics
create policy "Covers lisibles par tous"
  on storage.objects for select using (bucket_id = 'covers');
create policy "Upload cover si connecté"
  on storage.objects for insert with check (
    bucket_id = 'covers' and auth.uid() is not null
  );

-- Fichiers (privés — accès contrôlé par app)
create policy "Télécharger son fichier"
  on storage.objects for select using (
    bucket_id = 'files'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.is_admin(auth.uid())
    )
  );
create policy "Upload fichier si connecté"
  on storage.objects for insert with check (
    bucket_id = 'files' and auth.uid() is not null
  );
create policy "Supprimer son fichier storage"
  on storage.objects for delete using (
    bucket_id = 'files' and auth.uid()::text = (storage.foldername(name))[1]
  );
