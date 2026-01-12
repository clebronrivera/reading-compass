-- Create import_history table for tracking CSV imports
CREATE TABLE IF NOT EXISTS import_history (
  import_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id TEXT,
  import_type TEXT NOT NULL CHECK (import_type IN ('items', 'forms', 'banks', 'asr', 'scoring')),
  rows_processed INTEGER NOT NULL DEFAULT 0,
  rows_created INTEGER NOT NULL DEFAULT 0,
  rows_updated INTEGER NOT NULL DEFAULT 0,
  rows_failed INTEGER NOT NULL DEFAULT 0,
  change_note TEXT,
  file_name TEXT,
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  imported_by TEXT DEFAULT 'system'
);

-- Enable RLS
ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for authenticated users
CREATE POLICY "Authenticated users can read import_history"
  ON import_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert import_history"
  ON import_history FOR INSERT TO authenticated WITH CHECK (true);