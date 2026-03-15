ALTER TABLE public.plays ADD COLUMN IF NOT EXISTS ip_address text;
ALTER TABLE public.plays ADD COLUMN IF NOT EXISTS fingerprint text;
