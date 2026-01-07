-- Drop and recreate the check constraint to include 'LK' for Letter Knowledge
ALTER TABLE public.assessments DROP CONSTRAINT IF EXISTS assessments_component_code_check;
ALTER TABLE public.assessments ADD CONSTRAINT assessments_component_code_check 
  CHECK (component_code IN ('PA', 'PH', 'FL', 'VO', 'RC', 'LK'));