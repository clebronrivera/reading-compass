import { cn } from '@/lib/utils';
import type { TokenState } from '@/types/orf';

interface WordTokenProps {
  word: string;
  index: number;
  state: TokenState;
  onClick: (index: number) => void;
  disabled?: boolean;
  fontSize: string;
}

const STATE_STYLES: Record<TokenState, string> = {
  unmarked: 'bg-background border-border text-foreground hover:bg-muted',
  correct: 'bg-green-100 border-green-500 text-green-800 dark:bg-green-950 dark:text-green-200',
  incorrect: 'bg-red-100 border-red-500 text-red-800 dark:bg-red-950 dark:text-red-200',
  self_correction: 'bg-amber-100 border-amber-500 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
};

export function WordToken({ word, index, state, onClick, disabled, fontSize }: WordTokenProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(index)}
      disabled={disabled}
      className={cn(
        'px-2 py-1 rounded border-2 transition-colors cursor-pointer select-none',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        fontSize,
        STATE_STYLES[state]
      )}
    >
      {word}
    </button>
  );
}
