// Token marking states for ORF fluency assessment
export type TokenState = 'unmarked' | 'incorrect' | 'self_correction' | 'correct';

// State cycle order for click toggling
export const TOKEN_STATE_CYCLE: TokenState[] = ['unmarked', 'incorrect', 'self_correction', 'correct'];

// Get next state in cycle
export function getNextTokenState(current: TokenState): TokenState {
  const currentIndex = TOKEN_STATE_CYCLE.indexOf(current);
  const nextIndex = (currentIndex + 1) % TOKEN_STATE_CYCLE.length;
  return TOKEN_STATE_CYCLE[nextIndex];
}

// Extended ItemContent for ORF passages
export interface ORFPassageContent {
  stimulus: string;
  word_tokens: string[];
  word_count: number;
  grade_target?: string;
  error_types?: string[];
}

// ORF computed scores
export interface ORFComputedScores {
  total_words_read: number;
  correct_word_count: number;
  total_errors: number;
  self_correction_count: number;
  words_correct_per_minute: number;
  accuracy_percentage: number;
}

// ORF session response data
export interface ORFResponseData {
  token_state_map: Record<number, TokenState>;
  elapsed_seconds: number;
  discontinue_flag: boolean;
  discontinue_reason?: string;
  computed_scores: ORFComputedScores;
  notes?: string;
}

// Discontinue reasons
export const DISCONTINUE_REASONS = [
  'Student requested to stop',
  'Student struggling significantly',
  'Environmental interruption',
  'Other',
] as const;

export type DiscontinueReason = typeof DISCONTINUE_REASONS[number];

// Font size options
export type FontSize = 'small' | 'medium' | 'large';

export const FONT_SIZE_CLASSES: Record<FontSize, string> = {
  small: 'text-lg',
  medium: 'text-2xl',
  large: 'text-4xl',
};

// Compute scores from token states
export function computeORFScores(
  tokenStates: Record<number, TokenState>,
  elapsedSeconds: number,
  totalTokens: number
): ORFComputedScores {
  const states = Object.values(tokenStates);
  const correct = states.filter(s => s === 'correct').length;
  const incorrect = states.filter(s => s === 'incorrect').length;
  const selfCorrections = states.filter(s => s === 'self_correction').length;
  
  // Words with any non-unmarked state = attempted/read
  const totalWordsRead = states.filter(s => s !== 'unmarked').length;
  
  // Correct includes self-corrections (they corrected themselves)
  const correctWordCount = correct + selfCorrections;
  const totalErrors = incorrect;
  
  const wcpm = elapsedSeconds > 0 
    ? (correctWordCount / elapsedSeconds) * 60 
    : 0;
  
  const accuracy = totalWordsRead > 0 
    ? (correctWordCount / totalWordsRead) * 100 
    : 0;
  
  return {
    total_words_read: totalWordsRead,
    correct_word_count: correctWordCount,
    total_errors: totalErrors,
    self_correction_count: selfCorrections,
    words_correct_per_minute: Math.round(wcpm * 10) / 10,
    accuracy_percentage: Math.round(accuracy * 10) / 10,
  };
}
