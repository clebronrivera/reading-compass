import type { CanonicalGradeTag } from '@/types/database';

/**
 * Human-readable display names for canonical grade tags.
 * Change these labels to update terminology across the entire app.
 * e.g., "Grade 1" → "Level 1" or "Phase 1"
 */
export const GRADE_DISPLAY_NAMES: Record<CanonicalGradeTag, string> = {
  // Numeric Levels
  'K': 'Kindergarten',
  '1': 'Grade 1', 
  '2': 'Grade 2', 
  '3': 'Grade 3',
  '4': 'Grade 4', 
  '5': 'Grade 5', 
  '6': 'Grade 6',
  '7': 'Grade 7', 
  '8': 'Grade 8', 
  '9': 'Grade 9',
  '10': 'Grade 10', 
  '11': 'Grade 11', 
  '12': 'Grade 12',

  // Ranges
  'K-1': 'Grades K-1', 
  '1-2': 'Grades 1-2', 
  '2-3': 'Grades 2-3',
  '3-4': 'Grades 3-4', 
  '4-5': 'Grades 4-5', 
  '5-6': 'Grades 5-6',
  '6-7': 'Grades 6-7', 
  '6-8': 'Grades 6-8', 
  '7-8': 'Grades 7-8',
  '9-12': 'High School (9-12)',

  // Specific Assessment Bands
  'G1': 'Grade 1 (Band)', 
  'G2': 'Grade 2 (Band)', 
  'G3': 'Grade 3 (Band)',
  'G4': 'Grade 4 (Band)',
  'G5': 'Grade 5 (Band)',
  'G6': 'Grade 6 (Band)',
  'G7': 'Grade 7 (Band)',
  'G8': 'Grade 8 (Band)',
  'G2_3': 'Grades 2-3 (Combined)',
  
  // Universal
  'all': 'All Grades'
};

/**
 * Get human-readable label for a grade tag.
 * Falls back to the raw tag if no mapping exists.
 */
export function getGradeLabel(tag: string | null | undefined): string {
  if (!tag) return 'Unknown';
  return GRADE_DISPLAY_NAMES[tag as CanonicalGradeTag] || tag;
}
