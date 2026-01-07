import { Item } from '@/types/registry';

// Sample items for PH-ALPH Form 01
export const items: Item[] = [
  // Uppercase letters (first 5 as sample)
  {
    item_id: 'PH-ALPH.K.form01.item001',
    form_id: 'PH-ALPH.K.form01',
    item_type: 'letter',
    sequence_number: 1,
    content_payload: {
      stimulus: 'A',
      correct_answer: 'A',
      error_types: ['substitution', 'no-response'],
    },
    scoring_tags: ['uppercase', 'letter-name'],
  },
  {
    item_id: 'PH-ALPH.K.form01.item002',
    form_id: 'PH-ALPH.K.form01',
    item_type: 'letter',
    sequence_number: 2,
    content_payload: {
      stimulus: 'B',
      correct_answer: 'B',
      error_types: ['substitution', 'no-response'],
    },
    scoring_tags: ['uppercase', 'letter-name'],
  },
  {
    item_id: 'PH-ALPH.K.form01.item003',
    form_id: 'PH-ALPH.K.form01',
    item_type: 'letter',
    sequence_number: 3,
    content_payload: {
      stimulus: 'C',
      correct_answer: 'C',
      error_types: ['substitution', 'no-response'],
    },
    scoring_tags: ['uppercase', 'letter-name'],
  },
  // Letter sounds (sample)
  {
    item_id: 'PH-ALPH.K.form01.item053',
    form_id: 'PH-ALPH.K.form01',
    item_type: 'letter',
    sequence_number: 53,
    content_payload: {
      stimulus: 'A',
      correct_answer: '/æ/ or /eɪ/',
      rubric: 'Accept short a or long a sound',
      error_types: ['wrong-sound', 'no-response'],
    },
    scoring_tags: ['letter-sound', 'vowel'],
  },
  {
    item_id: 'PH-ALPH.K.form01.item054',
    form_id: 'PH-ALPH.K.form01',
    item_type: 'letter',
    sequence_number: 54,
    content_payload: {
      stimulus: 'B',
      correct_answer: '/b/',
      error_types: ['wrong-sound', 'no-response'],
    },
    scoring_tags: ['letter-sound', 'consonant'],
  },
];

export function getItemById(itemId: string): Item | undefined {
  return items.find(item => item.item_id === itemId);
}

export function getItemsByForm(formId: string): Item[] {
  return items.filter(item => item.form_id === formId);
}

export function getAllItems(): Item[] {
  return items;
}
