
ALTER TABLE public.mend_signals 
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'companion_chat',
  ADD COLUMN IF NOT EXISTS source_id text,
  ADD COLUMN IF NOT EXISTS theme text,
  ADD COLUMN IF NOT EXISTS trigger_signal text,
  ADD COLUMN IF NOT EXISTS stabilizer text,
  ADD COLUMN IF NOT EXISTS extracted_at timestamptz DEFAULT now();

-- Backfill existing rows: set source_id from message_id
UPDATE public.mend_signals SET source_id = message_id::text WHERE source_id IS NULL AND message_id IS NOT NULL;
