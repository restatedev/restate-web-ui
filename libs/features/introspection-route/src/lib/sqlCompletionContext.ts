export type SqlCompletionContext =
  | { type: 'none' }
  | { type: 'keyword' }
  | { type: 'table' }
  | { type: 'column'; table?: string; isQualified: boolean };

const IDENTIFIER = '[A-Za-z_][A-Za-z0-9_]*';

const TABLE_KEYWORDS = new Set(['FROM', 'JOIN', 'INTO', 'UPDATE', 'TABLE']);

const COLUMN_KEYWORDS = new Set([
  'SELECT',
  'DISTINCT',
  'WHERE',
  'AND',
  'OR',
  'NOT',
  'ON',
  'BY',
  'HAVING',
  'CASE',
  'WHEN',
  'THEN',
  'ELSE',
  'LIKE',
  'ILIKE',
  'BETWEEN',
  'IN',
  'SET',
  'USING',
]);

const CLAUSE_KEYWORDS = new Set([
  'SELECT',
  'FROM',
  'JOIN',
  'WHERE',
  'GROUP',
  'ORDER',
  'HAVING',
  'LIMIT',
  'ON',
  'SET',
]);

const NON_ALIAS_KEYWORDS = new Set([
  ...TABLE_KEYWORDS,
  ...COLUMN_KEYWORDS,
  ...CLAUSE_KEYWORDS,
  'AS',
  'LEFT',
  'RIGHT',
  'INNER',
  'OUTER',
  'FULL',
  'CROSS',
  'NATURAL',
  'LATERAL',
  'UNION',
  'EXCEPT',
  'INTERSECT',
  'OFFSET',
  'WINDOW',
]);

const OPERATOR_TOKEN = /^(=|<>|!=|<=|>=|<|>|\+|-|\*|\/|%|\|\||\()$/;
const VALUE_TOKEN = new RegExp(`^(${IDENTIFIER}|\\d+(?:\\.\\d+)?|\\))$`);

const STRING_OR_COMMENT =
  /'(?:[^']|'')*'?|"(?:[^"]|"")*"?|--[^\n]*|\/\*[\s\S]*?(?:\*\/|$)/g;

function maskStringsAndComments(text: string) {
  return text.replace(STRING_OR_COMMENT, (match) =>
    match.startsWith('"') ? match : ' '.repeat(match.length),
  );
}

function endsInsideStringOrComment(text: string) {
  const last = [...text.matchAll(STRING_OR_COMMENT)].at(-1);
  if (!last || last.index + last[0].length !== text.length) {
    return false;
  }
  const match = last[0];
  if (match.startsWith('--')) {
    return true;
  }
  if (match.startsWith('/*')) {
    return !match.endsWith('*/') || match.length < 4;
  }
  const quote = match.charAt(0);
  return match.length < 2 || !match.endsWith(quote);
}

function getTableAliases(text: string) {
  const aliases = new Map<string, string>();
  const pattern = new RegExp(
    `\\b(?:FROM|JOIN)\\s+(${IDENTIFIER})(?:\\s+(?:AS\\s+)?(${IDENTIFIER}))?`,
    'gi',
  );
  for (const [, table, alias] of text.matchAll(pattern)) {
    if (!table) {
      continue;
    }
    aliases.set(table.toLowerCase(), table);
    if (alias && !NON_ALIAS_KEYWORDS.has(alias.toUpperCase())) {
      aliases.set(alias.toLowerCase(), table);
    }
  }
  return aliases;
}

function tokenize(text: string) {
  return (
    text.match(
      new RegExp(`${IDENTIFIER}|\\d+(?:\\.\\d+)?|<>|!=|<=|>=|\\|\\||\\S`, 'g'),
    ) ?? []
  );
}

export function getSqlCompletionContext(
  textBeforeCursor: string,
  fullText = textBeforeCursor,
): SqlCompletionContext {
  if (fullText.trim() === '') {
    return { type: 'none' };
  }

  if (endsInsideStringOrComment(textBeforeCursor)) {
    return { type: 'none' };
  }

  const before = maskStringsAndComments(textBeforeCursor);
  const qualified = before.match(new RegExp(`(${IDENTIFIER})\\.\\w*$`));
  if (qualified?.[1]) {
    const qualifier = qualified[1];
    const aliases = getTableAliases(maskStringsAndComments(fullText));
    return {
      type: 'column',
      table: aliases.get(qualifier.toLowerCase()) ?? qualifier,
      isQualified: true,
    };
  }

  const withoutPartialWord = before.replace(/\w*$/, '');
  const tokens = tokenize(withoutPartialWord);
  const previous = tokens.at(-1);
  if (!previous) {
    return { type: 'keyword' };
  }

  const previousUpper = previous.toUpperCase();
  if (previousUpper === 'AS') {
    return { type: 'none' };
  }
  if (TABLE_KEYWORDS.has(previousUpper)) {
    return { type: 'table' };
  }
  if (COLUMN_KEYWORDS.has(previousUpper)) {
    return { type: 'column', isQualified: false };
  }
  if (previous === ',') {
    const clause = tokens.findLast((token) =>
      CLAUSE_KEYWORDS.has(token.toUpperCase()),
    );
    return clause && TABLE_KEYWORDS.has(clause.toUpperCase())
      ? { type: 'table' }
      : { type: 'column', isQualified: false };
  }
  if (previous === '*') {
    const beforeStar = tokens.at(-2);
    return beforeStar &&
      VALUE_TOKEN.test(beforeStar) &&
      !NON_ALIAS_KEYWORDS.has(beforeStar.toUpperCase())
      ? { type: 'column', isQualified: false }
      : { type: 'keyword' };
  }
  if (OPERATOR_TOKEN.test(previous)) {
    return { type: 'column', isQualified: false };
  }

  return { type: 'keyword' };
}
