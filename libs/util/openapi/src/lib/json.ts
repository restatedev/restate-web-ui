function isJsonWhitespace(char: string) {
  return char === ' ' || char === '\n' || char === '\r' || char === '\t';
}

export function formatJson(text: string, spaces = 2) {
  try {
    JSON.parse(text);
  } catch {
    return undefined;
  }
  const unit = ' '.repeat(spaces);
  let out = '';
  let depth = 0;
  let inString = false;
  let isEscaped = false;
  for (let index = 0; index < text.length; index++) {
    const char = text.charAt(index);
    if (inString) {
      out += char;
      if (isEscaped) {
        isEscaped = false;
      } else if (char === '\\') {
        isEscaped = true;
      } else if (char === '"') {
        inString = false;
      }
    } else if (char === '{' || char === '[') {
      const closing = char === '{' ? '}' : ']';
      let next = index + 1;
      while (next < text.length && isJsonWhitespace(text.charAt(next))) {
        next++;
      }
      if (text.charAt(next) === closing) {
        out += `${char}${closing}`;
        index = next;
      } else {
        depth++;
        out += `${char}\n${unit.repeat(depth)}`;
      }
    } else if (char === '}' || char === ']') {
      depth--;
      out += `\n${unit.repeat(depth)}${char}`;
    } else if (char === ',') {
      out += `,\n${unit.repeat(depth)}`;
    } else if (char === ':') {
      out += ': ';
    } else if (!isJsonWhitespace(char)) {
      inString = char === '"';
      out += char;
    }
  }
  return out;
}
