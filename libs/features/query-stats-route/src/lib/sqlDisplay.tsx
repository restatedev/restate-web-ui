import { useMemo, type CSSProperties } from 'react';

// Display-only SQL helpers for the query-stats page. They handle both real
// SQL (the recorded slowest executions) and the pseudo-SQL shapes from the
// catalog (placeholders like <filters>, […], ≤1001 pass through untouched).

const BREAK_KEYWORDS =
  /^(GROUP BY|ORDER BY|CROSS JOIN|LEFT JOIN|INNER JOIN|FULL JOIN|SELECT|FROM|WHERE|HAVING|LIMIT|UNION|EXCEPT|JOIN|WITH)\b/i;
const AND_OR = /^(AND|OR)\b/i;
const STRING_LITERAL = /^'(?:[^']|'')*'/;

// Heuristic pretty-printer: collapses the statement to one line, then breaks
// before major clauses (indented by paren/bracket depth), puts AND/OR on
// their own indented lines, and starts subqueries and optional […] groups on
// new lines. String literals are never split.
export function formatSql(sql: string): string {
  const collapsed = sql.replaceAll(/\s+/g, ' ').trim();
  let out = '';
  let depth = 0;
  let index = 0;
  const breakBefore = (indent: number) => {
    out = `${out.trimEnd()}\n${'  '.repeat(Math.max(0, Math.min(indent, 8)))}`;
  };
  while (index < collapsed.length) {
    const rest = collapsed.slice(index);
    const literal = rest.match(STRING_LITERAL);
    if (literal) {
      out += literal[0];
      index += literal[0].length;
      continue;
    }
    const char = rest[0];
    const before = index === 0 ? ' ' : (collapsed[index - 1] ?? ' ');
    if (char === '(') {
      if (/^\(\s*SELECT\b/i.test(rest) && out.trim()) {
        breakBefore(depth + 1);
      }
      depth += 1;
      out += '(';
      index += 1;
      continue;
    }
    if (char === ')') {
      depth = Math.max(0, depth - 1);
      out += ')';
      index += 1;
      continue;
    }
    if (char === '[') {
      if (out.trim()) {
        breakBefore(depth);
      }
      depth += 1;
      out += '[';
      index += 1;
      continue;
    }
    if (char === ']') {
      depth = Math.max(0, depth - 1);
      out += ']';
      index += 1;
      continue;
    }
    if (/[\s(]/.test(before)) {
      const keyword = rest.match(BREAK_KEYWORDS);
      if (keyword && out.trim() && before !== '(') {
        breakBefore(depth);
        out += keyword[0];
        index += keyword[0].length;
        continue;
      }
      const andOr = rest.match(AND_OR);
      if (andOr && out.trim()) {
        breakBefore(depth + 1);
        out += andOr[0];
        index += andOr[0].length;
        continue;
      }
    }
    out += char;
    index += 1;
  }
  return out;
}

type TokenType = 'keyword' | 'string' | 'number' | 'table' | 'placeholder';

interface Token {
  text: string;
  type?: TokenType;
}

const KEYWORDS = new Set([
  'SELECT',
  'FROM',
  'WHERE',
  'GROUP',
  'ORDER',
  'BY',
  'HAVING',
  'LIMIT',
  'AND',
  'OR',
  'IN',
  'ON',
  'AS',
  'NOT',
  'NULLS',
  'LAST',
  'FIRST',
  'LIKE',
  'ILIKE',
  'IS',
  'NULL',
  'CASE',
  'WHEN',
  'THEN',
  'ELSE',
  'END',
  'DISTINCT',
  'UNION',
  'EXCEPT',
  'JOIN',
  'LEFT',
  'CROSS',
  'INNER',
  'FULL',
  'WITH',
  'INTERVAL',
  'FILTER',
  'OVER',
  'BETWEEN',
  'ASC',
  'DESC',
  'TRUE',
  'FALSE',
  'EXISTS',
  'TIMESTAMP',
  'SUM',
  'COUNT',
  'MIN',
  'MAX',
  'COALESCE',
  'GREATEST',
  'CAST',
  'ROW_NUMBER',
]);

const TOKEN_PATTERN =
  /('(?:[^']|'')*')|(<[^>\n]*>)|(≤\s?[\d,]+|\b\d[\d,.]*\b)|([A-Za-z_][\w]*)|(…|\?|\[|\])|(\s+|.)/g;

function tokenize(sql: string, tables: ReadonlySet<string>): Token[] {
  const tokens: Token[] = [];
  for (const match of sql.matchAll(TOKEN_PATTERN)) {
    const [text, literal, angled, number, word, placeholder] = match;
    let type: TokenType | undefined;
    if (literal) {
      type = 'string';
    } else if (angled || placeholder) {
      type = 'placeholder';
    } else if (number) {
      type = 'number';
    } else if (word) {
      if (tables.has(word)) {
        type = 'table';
      } else if (KEYWORDS.has(word.toUpperCase())) {
        type = 'keyword';
      }
    }
    const previous = tokens.at(-1);
    if (type === undefined && previous && previous.type === undefined) {
      previous.text += text;
    } else {
      tokens.push({ text, type });
    }
  }
  return tokens;
}

// Token colors come from the theme CSS variables via inline styles because
// the tooltip content styles repaint every descendant with `**:text-gray-200`,
// which would override utility classes.
const TOKEN_STYLES: Record<
  'light' | 'dark' | 'neutral',
  Record<TokenType, CSSProperties>
> = {
  // Monochrome variant for table cells: hierarchy via shade and weight only,
  // so the highlighting doesn't compete with the rest of the table.
  neutral: {
    keyword: { color: 'var(--color-gray-500)' },
    string: { color: 'var(--color-gray-600)' },
    number: { color: 'var(--color-gray-700)' },
    table: { color: 'var(--color-gray-800)', fontWeight: 500 },
    placeholder: { color: 'var(--color-gray-400)', fontStyle: 'italic' },
  },
  light: {
    keyword: { color: 'var(--color-blue-700)' },
    string: { color: 'var(--color-amber-700)' },
    number: { color: 'var(--color-emerald-700)' },
    table: { color: 'var(--color-sky-700)', fontWeight: 500 },
    placeholder: { color: 'var(--color-gray-400)', fontStyle: 'italic' },
  },
  dark: {
    keyword: { color: 'var(--color-blue-300)' },
    string: { color: 'var(--color-amber-300)' },
    number: { color: 'var(--color-emerald-300)' },
    table: { color: 'var(--color-sky-300)', fontWeight: 500 },
    placeholder: { color: 'var(--color-gray-400)', fontStyle: 'italic' },
  },
};

export function SqlText({
  sql,
  tables = [],
  surface,
}: {
  sql: string;
  tables?: readonly string[];
  surface: 'light' | 'dark' | 'neutral';
}) {
  const tokens = useMemo(() => tokenize(sql, new Set(tables)), [sql, tables]);
  return (
    <>
      {tokens.map((token, index) =>
        token.type === undefined ? (
          token.text
        ) : (
          <span key={index} style={TOKEN_STYLES[surface][token.type]}>
            {token.text}
          </span>
        ),
      )}
    </>
  );
}
