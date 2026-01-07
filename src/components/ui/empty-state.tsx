import { Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ 
  title, 
  description,
  icon,
  actionLabel,
  onAction,
  className 
}: EmptyStateProps) {
  return (
    <Card className={cn('border-dashed', className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-3 mb-4">
          {icon || <Inbox className="h-6 w-6 text-muted-foreground" />}
        </div>
        <h3 className="text-lg font-medium text-foreground">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground max-w-md">{description}</p>
        )}
        {actionLabel && onAction && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onAction}
            className="mt-4"
          >
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
