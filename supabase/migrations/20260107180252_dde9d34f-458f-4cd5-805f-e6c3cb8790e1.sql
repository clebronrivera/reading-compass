-- Add ORF-specific columns to session_responses table
ALTER TABLE session_responses 
ADD COLUMN IF NOT EXISTS token_state_map JSONB,
ADD COLUMN IF NOT EXISTS elapsed_seconds NUMERIC,
ADD COLUMN IF NOT EXISTS discontinue_flag BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS discontinue_reason TEXT,
ADD COLUMN IF NOT EXISTS computed_scores JSONB;