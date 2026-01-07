import { WordToken } from './WordToken';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { TokenState, FontSize } from '@/types/orf';
import { FONT_SIZE_CLASSES } from '@/types/orf';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PassageDisplayProps {
  tokens: string[];
  tokenStates: Record<number, TokenState>;
  onTokenClick: (index: number) => void;
  disabled?: boolean;
  fontSize: FontSize;
  onFontSizeChange: (size: FontSize) => void;
}

export function PassageDisplay({
  tokens,
  tokenStates,
  onTokenClick,
  disabled,
  fontSize,
  onFontSizeChange,
}: PassageDisplayProps) {
  return (
    <div className="space-y-4">
      {/* Font Size Control */}
      <div className="flex items-center gap-3">
        <Label htmlFor="font-size" className="text-sm text-muted-foreground">
          Font Size:
        </Label>
        <Select value={fontSize} onValueChange={(v) => onFontSizeChange(v as FontSize)}>
          <SelectTrigger id="font-size" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="small">Small</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="large">Large</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Token Grid */}
      <ScrollArea className="h-[400px] rounded-lg border bg-card p-6">
        <div className="flex flex-wrap gap-2 leading-relaxed">
          {tokens.map((word, index) => (
            <WordToken
              key={index}
              word={word}
              index={index}
              state={tokenStates[index] || 'unmarked'}
              onClick={onTokenClick}
              disabled={disabled}
              fontSize={FONT_SIZE_CLASSES[fontSize]}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded border-2 bg-background border-border" />
          <span className="text-muted-foreground">Unmarked</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded border-2 bg-red-100 border-red-500 dark:bg-red-950" />
          <span className="text-muted-foreground">Incorrect</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded border-2 bg-amber-100 border-amber-500 dark:bg-amber-950" />
          <span className="text-muted-foreground">Self-correction</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded border-2 bg-green-100 border-green-500 dark:bg-green-950" />
          <span className="text-muted-foreground">Correct</span>
        </div>
      </div>
    </div>
  );
}
