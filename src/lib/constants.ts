export const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

// Helper to format month string (YYYY-MM) to Hebrew
export function formatMonthHebrew(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  return `${HEBREW_MONTHS[parseInt(month) - 1]} ${year}`;
}
