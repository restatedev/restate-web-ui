export interface PatternFields {
  scope: string;
  level1: string;
  level2: string;
}

export type RuleLevel = 'scope' | 'level1' | 'level2';

export function splitPattern(pattern: string): PatternFields {
  const [scope = '', level1 = '', level2 = ''] = pattern.split('/');
  return { scope, level1, level2 };
}

export function buildPattern({ scope, level1, level2 }: PatternFields): string {
  const root = scope.trim();
  if (!root) return '';
  const parts = [root];
  const first = level1.trim();
  const second = level2.trim();
  if (first) parts.push(first);
  if (first && second) parts.push(second);
  return parts.join('/');
}

export function getRuleLevel(pattern: string): RuleLevel {
  const { level1, level2 } = splitPattern(pattern);
  if (level2) return 'level2';
  if (level1) return 'level1';
  return 'scope';
}

export function parseConcreteKey(value: string): string[] | null {
  const parts = value.trim().split('/');
  if (
    parts.length < 1 ||
    parts.length > 3 ||
    parts.some((part) => !part.trim() || part.includes('*'))
  ) {
    return null;
  }
  return parts.map((part) => part.trim());
}

export function patternMatchesKey(
  pattern: string,
  keyParts: string[],
): boolean {
  const patternParts = pattern.split('/');
  if (patternParts.length > keyParts.length) return false;
  return patternParts.every(
    (part, index) => part === '*' || part === keyParts[index],
  );
}

export function patternPartError(
  value: string,
  required = false,
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return required ? 'Enter a value or use *.' : null;
  if (trimmed.includes('/')) return 'Enter one level without a slash.';
  return null;
}

export function concurrencyError(value: string): string | null {
  if (!value.trim()) return 'Enter a concurrency limit.';
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 2_147_483_647) {
    return 'Enter a whole number between 1 and 2,147,483,647.';
  }
  return null;
}
