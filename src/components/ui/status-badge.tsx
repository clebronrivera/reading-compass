import { Badge } from '@/components/ui/badge';
import { statusToVariant, normalizeStatus, getStatusBgClass } from '@/lib/status';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Reusable status badge component with consistent styling across all pages
 */
export function StatusBadge({ status, size = 'md', className }: StatusBadgeProps) {
  const variant = statusToVariant(status);
  const label = normalizeStatus(status);
  const bgClass = getStatusBgClass(variant);
  
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-2.5 py-1',
  };
  
  return (
    <Badge 
      className={cn(bgClass, 'text-white', sizeClasses[size], className)}
      aria-label={`Status: ${label}`}
    >
      {label}
    </Badge>
  );
}
