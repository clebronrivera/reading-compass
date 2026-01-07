/**
 * Route parameter validation utility.
 * Prevents invalid route params from triggering database queries.
 */
export function isValidRouteId(id: string | undefined): id is string {
  if (!id) return false;
  if (id.startsWith(':')) return false;
  if (id.includes('%3A') || id.includes('%3a')) return false;
  if (id.includes('/')) return false;
  return true;
}
