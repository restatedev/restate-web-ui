export function convertToUTC(date?: string) {
  if (date && !date.endsWith('Z')) {
    return date + 'Z';
  }
  return date;
}
