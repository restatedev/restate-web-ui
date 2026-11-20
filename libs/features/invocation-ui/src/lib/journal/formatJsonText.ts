const MAX_FORMAT_LENGTH = 1_000_000;
const MAX_DEPTH = 200;
const INDENT = '  ';

function isWhitespace(char: string | undefined) {
  return char === ' ' || char === '\n' || char === '\t' || char === '\r';
}

function isJson(text: string) {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

export function formatJsonText(text: string) {
  if (text.length > MAX_FORMAT_LENGTH || !isJson(text)) {
    return text;
  }

  const parts: string[] = [];
  let depth = 0;
  let index = 0;
  let addedLength = 0;
  const newLine = () => {
    addedLength += 1 + INDENT.length * depth;
    return `\n${INDENT.repeat(depth)}`;
  };

  while (index < text.length) {
    if (index + addedLength > MAX_FORMAT_LENGTH) {
      return text;
    }
    const char = text[index];

    if (char === '"') {
      let end = index + 1;
      while (text[end] !== '"') {
        end += text[end] === '\\' ? 2 : 1;
      }
      parts.push(text.slice(index, end + 1));
      index = end + 1;
    } else if (char === '{' || char === '[') {
      let next = index + 1;
      while (isWhitespace(text[next])) {
        next += 1;
      }
      const closing = char === '{' ? '}' : ']';
      if (text[next] === closing) {
        parts.push(char, closing);
        index = next + 1;
      } else {
        depth += 1;
        if (depth > MAX_DEPTH) {
          return text;
        }
        parts.push(char, newLine());
        index += 1;
      }
    } else if (char === '}' || char === ']') {
      depth -= 1;
      parts.push(newLine(), char);
      index += 1;
    } else if (char === ',') {
      parts.push(',', newLine());
      index += 1;
    } else if (char === ':') {
      parts.push(': ');
      index += 1;
    } else if (isWhitespace(char)) {
      index += 1;
    } else {
      let end = index;
      while (end < text.length && !/[\s,:\]}]/.test(text[end] ?? '')) {
        end += 1;
      }
      parts.push(text.slice(index, end));
      index = end;
    }
  }

  return parts.join('');
}
