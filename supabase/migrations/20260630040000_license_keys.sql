CREATE TABLE public.license_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  plan_id TEXT NOT NULL REFERENCES public.plans(id),
  user_id UUID REFERENCES auth.users(id),
  redeemed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.license_keys ENABLE ROW LEVEL SECURITY;

-- No direct read access. Only redeem_license_key (SECURITY DEFINER) can read/update.
-- Admins can manage keys directly via Supabase dashboard (bypasses RLS).

CREATE OR REPLACE FUNCTION public.redeem_license_key(_key TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _lk RECORD; _sub RECORD; _new_expires TIMESTAMPTZ;
BEGIN
  SELECT * INTO _lk FROM public.license_keys WHERE key = _key AND active = true AND user_id IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    SELECT * INTO _lk FROM public.license_keys WHERE key = _key AND active = true FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','invalid_key'); END IF;
    RETURN jsonb_build_object('ok',false,'error','already_redeemed');
  END IF;

  -- Check for existing active subscription to extend
  SELECT expires_at INTO _new_expires FROM public.subscriptions
   WHERE user_id = auth.uid() AND status='active' AND expires_at > now()
   ORDER BY expires_at DESC LIMIT 1;
  IF _new_expires IS NULL THEN _new_expires := now(); END IF;
  _new_expires := _new_expires + (_lk.expires_at - now());

  INSERT INTO public.subscriptions (user_id, plan_id, status, expires_at)
  VALUES (auth.uid(), _lk.plan_id, 'active', _new_expires);

  UPDATE public.license_keys SET user_id = auth.uid(), redeemed_at = now() WHERE id = _lk.id;

  RETURN jsonb_build_object('ok',true,'plan_id',_lk.plan_id,'expires_at',_new_expires);
END $$;

REVOKE EXECUTE ON FUNCTION public.redeem_license_key(TEXT) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_license_key(TEXT) TO authenticated;
