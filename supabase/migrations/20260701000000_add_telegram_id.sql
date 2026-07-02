ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_id TEXT;

CREATE POLICY IF NOT EXISTS "admin update profiles" ON public.profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
