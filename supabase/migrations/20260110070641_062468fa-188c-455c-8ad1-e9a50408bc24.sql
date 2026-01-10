-- 1. CLEANUP: Safety check to remove any non-canonical tags
-- (Based on audit, this will delete 0 rows)
DELETE FROM forms 
WHERE grade_or_level_tag NOT IN (
  'K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12',
  'K-1', '1-2', '2-3', '3-4', '4-5', '5-6', '6-7', '6-8', '7-8', '9-12',
  'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 
  'G2_3', 'all'
);

-- 2. APPLY CONSTRAINT: Lock down the column with the allowed list
ALTER TABLE forms 
  ADD CONSTRAINT check_canonical_grade_tag 
  CHECK (grade_or_level_tag IN (
    -- Numeric Single Grades (The "Levels")
    'K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12',
    
    -- Ranges (Hyphenated)
    'K-1', '1-2', '2-3', '3-4', '4-5', '5-6', '6-7', '6-8', '7-8', '9-12',
    
    -- Grade Bands / Levels (Prefixed) - Crucial for PH-LWID
    'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 
    'G2_3', 
    
    -- Universal
    'all'
  ));

-- 3. DOCUMENTATION
COMMENT ON CONSTRAINT check_canonical_grade_tag ON forms IS 
  'Enforces valid grade/difficulty tags. Includes numeric levels (1), ranges (2-3), and specific assessment bands (G1, G2_3).';