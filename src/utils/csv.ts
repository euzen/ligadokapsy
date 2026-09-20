import { Platform } from 'react-native';

/** Escape a CSV cell value (handles commas, quotes, newlines) */
function escapeCell(value: string | number | null | undefined): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Convert rows to a CSV string with BOM for Excel UTF-8 support */
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const bom = '\uFEFF';
  const headerLine = headers.map(escapeCell).join(',');
  const dataLines = rows.map((row) => row.map(escapeCell).join(','));
  return bom + [headerLine, ...dataLines].join('\r\n');
}

/** Trigger a CSV file download on web */
export function downloadCsv(filename: string, csv: string) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Parse a CSV string into header + rows */
export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.replace(/\uFEFF/, '').replace(/\r\n/g, '\n').split('\n').filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const parse = (line: string): string[] => {
    const cells: string[] = [];
    let current = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuote) {
        if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
        else if (ch === '"') inQuote = false;
        else current += ch;
      } else if (ch === ',') { cells.push(current.trim()); current = ''; }
      else if (ch === '"') inQuote = true;
      else current += ch;
    }
    cells.push(current.trim());
    return cells;
  };
  const headers = parse(lines[0]);
  const rows = lines.slice(1).map(parse);
  return { headers, rows };
}
