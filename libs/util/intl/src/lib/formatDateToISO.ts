export function formatDateToISO(value: Date) {
  if (isNaN(value.valueOf())) {
    return '';
  }
  return value.toISOString();
}
