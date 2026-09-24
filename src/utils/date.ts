export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}
