/**
 * Parse CSV text into a 2D array of strings.
 * Handles quoted fields and escaped characters.
 */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.trim().split('\n');

  for (const line of lines) {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    // Push last cell
    cells.push(current.trim());
    rows.push(cells);
  }

  return rows;
}

/**
 * Convert CSV rows (with header row) to typed objects.
 */
export function csvToObjects<T extends Record<string, string>>(rows: string[][]): T[] {
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.toLowerCase().replace(/\s+/g, '_'));
  
  return rows.slice(1).map(row => {
    const obj: Record<string, string> = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] || '';
    });
    return obj as T;
  });
}

/**
 * Convert objects back to CSV string.
 */
export function objectsToCSV<T extends Record<string, unknown>>(objects: T[]): string {
  if (objects.length === 0) return '';

  const headers = Object.keys(objects[0]);
  const lines: string[] = [];

  // Header row
  lines.push(headers.join(','));

  // Data rows
  for (const obj of objects) {
    const values = headers.map(h => {
      const value = String(obj[h] ?? '');
      // Quote if contains comma, quote, or newline
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    lines.push(values.join(','));
  }

  return lines.join('\n');
}
