-- Run this in the Supabase SQL Editor if you get "permission denied for table".
-- The tables and RLS policies exist, but the API roles need base privileges.

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.folders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stories TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_encryption_keys TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_shares TO authenticated;

-- Anonymous visitors open public share links (read, and edit when allowed).
GRANT SELECT, UPDATE ON public.story_shares TO anon;
