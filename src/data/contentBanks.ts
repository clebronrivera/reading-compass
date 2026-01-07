import { ContentBank } from '@/types/registry';

export const contentBanks: ContentBank[] = [
  {
    content_bank_id: 'PH-ALPH.bank1',
    linked_assessment_id: 'PH-ALPH',
    name: 'Alphabet Knowledge Primary Bank',
    differentiation_keys: ['uppercase', 'lowercase', 'letter-sounds'],
    equivalence_set_required: true,
    target_bank_size: 78,
    current_size: 78,
    status: 'ready',
  },
];

export function getContentBankById(bankId: string): ContentBank | undefined {
  return contentBanks.find(bank => bank.content_bank_id === bankId);
}

export function getContentBanksByAssessment(assessmentId: string): ContentBank[] {
  return contentBanks.filter(bank => bank.linked_assessment_id === assessmentId);
}

export function getAllContentBanks(): ContentBank[] {
  return contentBanks;
}
