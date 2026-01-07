import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  title?: string;
  description?: string;
  className?: string;
}

export function LoadingState({ 
  title = 'Loading', 
  description,
  className 
}: LoadingStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <h3 className="text-lg font-medium text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
