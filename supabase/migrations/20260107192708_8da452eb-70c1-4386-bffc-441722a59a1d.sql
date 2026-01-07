-- Drop existing constraint and add letter-name as valid type
ALTER TABLE items DROP CONSTRAINT items_item_type_check;

ALTER TABLE items ADD CONSTRAINT items_item_type_check 
CHECK (item_type = ANY (ARRAY[
  'passage'::text, 
  'letter-sound'::text, 
  'letter-name'::text,
  'phoneme'::text, 
  'word'::text, 
  'sentence'::text, 
  'multiple-choice'::text, 
  'constructed-response'::text
]));