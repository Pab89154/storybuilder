-- StoryBuilder: encrypted stories, user keys, and public sharing

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_payload TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
  encrypted_payload TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_shared BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_encryption_keys (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  salt TEXT NOT NULL,
  encrypted_master_key TEXT NOT NULL,
  encrypted_master_key_recovery TEXT NOT NULL,
  recovery_key_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.story_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL UNIQUE,
  access_mode TEXT NOT NULL CHECK (access_mode IN ('view', 'edit')),
  encrypted_payload TEXT NOT NULL,
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stories_user_id_idx ON public.stories(user_id);
CREATE INDEX IF NOT EXISTS stories_folder_id_idx ON public.stories(folder_id);
CREATE INDEX IF NOT EXISTS folders_user_id_idx ON public.folders(user_id);
CREATE INDEX IF NOT EXISTS story_shares_token_idx ON public.story_shares(share_token);
CREATE INDEX IF NOT EXISTS story_shares_story_id_idx ON public.story_shares(story_id);

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS folders_select ON public.folders;
CREATE POLICY folders_select ON public.folders FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS folders_insert ON public.folders;
CREATE POLICY folders_insert ON public.folders FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS folders_update ON public.folders;
CREATE POLICY folders_update ON public.folders FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS folders_delete ON public.folders;
CREATE POLICY folders_delete ON public.folders FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS stories_select ON public.stories;
CREATE POLICY stories_select ON public.stories FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS stories_insert ON public.stories;
CREATE POLICY stories_insert ON public.stories FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS stories_update ON public.stories;
CREATE POLICY stories_update ON public.stories FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS stories_delete ON public.stories;
CREATE POLICY stories_delete ON public.stories FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_keys_select ON public.user_encryption_keys;
CREATE POLICY user_keys_select ON public.user_encryption_keys FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS user_keys_insert ON public.user_encryption_keys;
CREATE POLICY user_keys_insert ON public.user_encryption_keys FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS user_keys_update ON public.user_encryption_keys;
CREATE POLICY user_keys_update ON public.user_encryption_keys FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS story_shares_owner_select ON public.story_shares;
CREATE POLICY story_shares_owner_select ON public.story_shares FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS story_shares_owner_insert ON public.story_shares;
CREATE POLICY story_shares_owner_insert ON public.story_shares FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS story_shares_owner_update ON public.story_shares;
CREATE POLICY story_shares_owner_update ON public.story_shares FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS story_shares_owner_delete ON public.story_shares;
CREATE POLICY story_shares_owner_delete ON public.story_shares FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS story_shares_public_select ON public.story_shares;
CREATE POLICY story_shares_public_select ON public.story_shares FOR SELECT USING (is_revoked = false);
DROP POLICY IF EXISTS story_shares_public_update ON public.story_shares;
CREATE POLICY story_shares_public_update ON public.story_shares
  FOR UPDATE USING (is_revoked = false AND access_mode = 'edit');
