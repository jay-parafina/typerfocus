-- invite_codes: table-based invite/waitlist flow.
-- Replaces the env-var INVITE_CODE approach used by /api/validate-invite.
-- The legacy route stays intact for now and will be cut over in a follow-up.

CREATE TABLE public.invite_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'redeemed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  redeemed_at TIMESTAMPTZ,
  notes TEXT
);

CREATE INDEX idx_invite_codes_email ON public.invite_codes(email);
CREATE INDEX idx_invite_codes_code ON public.invite_codes(code);

-- One active (non-redeemed) request per email.
CREATE UNIQUE INDEX idx_invite_codes_active_email
  ON public.invite_codes(email)
  WHERE status != 'redeemed';

ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can request access"
  ON public.invite_codes FOR INSERT
  WITH CHECK (status = 'pending' AND code IS NULL);

CREATE POLICY "Users can read own invite"
  ON public.invite_codes FOR SELECT
  USING (true);
