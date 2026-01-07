-- Drop existing check constraint and add new one with letter-sound type
ALTER TABLE public.items DROP CONSTRAINT IF EXISTS items_item_type_check;
ALTER TABLE public.items ADD CONSTRAINT items_item_type_check 
CHECK (item_type IN ('passage', 'letter-sound', 'phoneme', 'word', 'sentence', 'multiple-choice', 'constructed-response'));