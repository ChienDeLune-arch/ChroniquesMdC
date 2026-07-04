-- ============================================================
-- MIGRATION 003 — Auth & Subscription access
-- ============================================================

-- Ajouter l'email dans profiles (pour login par pseudo)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS private_access BOOLEAN DEFAULT false;

-- Index pour lookup rapide par email
CREATE INDEX IF NOT EXISTS idx_profiles_email    ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Mettre à jour le trigger de création de profil pour stocker l'email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url, email)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    new.email
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction RPC sécurisée : pseudo → email (appelée côté serveur uniquement)
-- Retourne NULL si le pseudo n'existe pas (ne révèle rien)
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
RETURNS TEXT AS $$
  SELECT email FROM public.profiles
  WHERE lower(username) = lower(p_username)
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Vérifier si un pseudo est disponible (public, utilisé côté client)
CREATE OR REPLACE FUNCTION public.is_username_available(p_username TEXT)
RETURNS BOOLEAN AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE lower(username) = lower(p_username)
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Vérifier si un email est disponible (public, utilisé côté client)  
CREATE OR REPLACE FUNCTION public.is_email_available(p_email TEXT)
RETURNS BOOLEAN AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE lower(email) = lower(p_email)
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Accorder l'accès privé à un utilisateur (appelé par admin ou webhook Stripe)
CREATE OR REPLACE FUNCTION public.grant_private_access(p_user_id UUID)
RETURNS VOID AS $$
  UPDATE public.profiles SET private_access = true WHERE id = p_user_id;
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.revoke_private_access(p_user_id UUID)
RETURNS VOID AS $$
  UPDATE public.profiles SET private_access = false WHERE id = p_user_id;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Table pour les codes promo personnalisés (hors Stripe)
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code        TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_pct INT NOT NULL CHECK (discount_pct BETWEEN 0 AND 100),
  max_uses    INT,      -- null = illimité
  used_count  INT DEFAULT 0,
  valid_until TIMESTAMPTZ,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Qui a utilisé quel code promo
CREATE TABLE IF NOT EXISTS public.promo_code_uses (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code_id       UUID REFERENCES public.promo_codes(id),
  user_id       UUID REFERENCES public.profiles(id),
  used_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE (code_id, user_id)
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin gère les promos" ON public.promo_codes
  FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Codes actifs visibles" ON public.promo_codes
  FOR SELECT USING (is_active = true);

-- Mettre à jour la RLS profiles pour private_access
-- Les admins peuvent modifier private_access
DROP POLICY IF EXISTS "Admin peut modifier tous les profils" ON public.profiles;
CREATE POLICY "Admin peut modifier tous les profils" ON public.profiles
  FOR UPDATE USING (public.is_admin(auth.uid()));
