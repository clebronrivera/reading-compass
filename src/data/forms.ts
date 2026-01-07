import { Form } from '@/types/registry';

export const forms: Form[] = [
  {
    form_id: 'PH-ALPH.K.form01',
    content_bank_id: 'PH-ALPH.bank1',
    assessment_id: 'PH-ALPH',
    grade_or_level_tag: 'K',
    form_number: 1,
    equivalence_set_id: 'PH-ALPH.eqset1',
    status: 'active',
    metadata: {
      created_date: '2024-01-15',
      last_modified: '2024-01-20',
    },
  },
  {
    form_id: 'PH-ALPH.K.form02',
    content_bank_id: 'PH-ALPH.bank1',
    assessment_id: 'PH-ALPH',
    grade_or_level_tag: 'K',
    form_number: 2,
    equivalence_set_id: 'PH-ALPH.eqset1',
    status: 'active',
    metadata: {
      created_date: '2024-01-15',
      last_modified: '2024-01-20',
    },
  },
];

export function getFormById(formId: string): Form | undefined {
  return forms.find(form => form.form_id === formId);
}

export function getFormsByAssessment(assessmentId: string): Form[] {
  return forms.filter(form => form.assessment_id === assessmentId);
}

export function getFormsByContentBank(bankId: string): Form[] {
  return forms.filter(form => form.content_bank_id === bankId);
}

export function getAllForms(): Form[] {
  return forms;
}
