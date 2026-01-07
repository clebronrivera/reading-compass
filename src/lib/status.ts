// Status utility functions - single source of truth for status display logic

export type StatusVariant = 'stub' | 'draft' | 'active' | 'deprecated';

/**
 * Maps any status string to one of 4 semantic variants
 */
export function statusToVariant(status: string): StatusVariant {
  const normalized = status.toLowerCase().trim();
  
  // Stub/Empty/Incomplete variants
  if (['stub', 'empty', 'incomplete', 'placeholder'].includes(normalized)) {
    return 'stub';
  }
  
  // Draft/In-progress variants
  if (['draft', 'in-progress', 'needs-review', 'pending'].includes(normalized)) {
    return 'draft';
  }
  
  // Active/Ready/Valid variants
  if (['active', 'ready', 'valid', 'validated', 'complete'].includes(normalized)) {
    return 'active';
  }
  
  // Deprecated/Retired variants
  if (['deprecated', 'retired', 'archived', 'inactive'].includes(normalized)) {
    return 'deprecated';
  }
  
  // Default to stub for unknown statuses
  return 'stub';
}

/**
 * Normalizes status string for display (Title Case)
 */
export function normalizeStatus(status: string): string {
  const normalized = status.toLowerCase().trim();
  
  const displayMap: Record<string, string> = {
    'stub': 'Stub',
    'empty': 'Empty',
    'incomplete': 'Incomplete',
    'placeholder': 'Placeholder',
    'draft': 'Draft',
    'in-progress': 'In Progress',
    'needs-review': 'Needs Review',
    'pending': 'Pending',
    'active': 'Active',
    'ready': 'Ready',
    'valid': 'Valid',
    'validated': 'Validated',
    'complete': 'Complete',
    'deprecated': 'Deprecated',
    'retired': 'Retired',
    'archived': 'Archived',
    'inactive': 'Inactive',
  };
  
  return displayMap[normalized] || status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * Returns the Tailwind background class for a status variant
 */
export function getStatusBgClass(variant: StatusVariant): string {
  const classes: Record<StatusVariant, string> = {
    stub: 'bg-status-stub',
    draft: 'bg-status-draft',
    active: 'bg-status-active',
    deprecated: 'bg-status-deprecated',
  };
  return classes[variant];
}
