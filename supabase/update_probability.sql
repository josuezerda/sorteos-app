ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS win_probability numeric NOT NULL DEFAULT 10;
