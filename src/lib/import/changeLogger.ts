import type { ChangeLogEntry } from '@/types/database';

/**
 * Create a new change log entry
 */
export function createChangeLogEntry(
  description: string,
  author: string = 'CSV Import'
): ChangeLogEntry {
  return {
    date: new Date().toISOString(),
    author,
    description,
  };
}

/**
 * Append a new entry to an existing change log
 */
export function appendToChangeLog(
  existingLog: ChangeLogEntry[] | null | unknown,
  newEntry: ChangeLogEntry
): ChangeLogEntry[] {
  const log = Array.isArray(existingLog) ? existingLog : [];
  return [...log, newEntry];
}

/**
 * Format an import summary for change log
 */
export function formatImportSummary(
  importType: string,
  rowsCreated: number,
  rowsUpdated: number,
  changeNote?: string
): string {
  const parts: string[] = [];
  
  if (rowsCreated > 0) {
    parts.push(`${rowsCreated} created`);
  }
  if (rowsUpdated > 0) {
    parts.push(`${rowsUpdated} updated`);
  }
  
  const summary = `[${importType.toUpperCase()} Import] ${parts.join(', ')}`;
  
  if (changeNote) {
    return `${summary}: ${changeNote}`;
  }
  
  return summary;
}
