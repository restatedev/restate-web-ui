const PALETTE =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const UTILITY =
  'bg|text|border(?:-[trblxyse])?|ring(?:-offset)?|fill|stroke|outline|from|via|to|shadow|divide|placeholder|decoration|accent|caret|inset-shadow|inset-ring|drop-shadow';
const PALETTE_CLASS = new RegExp(
  `(?:^|[\\s"'\`:!{(])((?:${UTILITY})-(?:(?:${PALETTE})-\\d{2,3}|white|black)(?:\\/[\\w.[\\]]+)?)(?=$|[\\s"'\`!)},\\]])`,
);
const PALETTE_VAR = new RegExp(
  `((?:var\\(|--theme\\()--color-(?:${PALETTE})-\\d{2,3}|theme\\(colors\\.(?:${PALETTE})\\.\\d{2,3})`,
);

const LITERAL_COLOR =
  /(?:^|[\s"'`(,:=_])(#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])|(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\([^()]*\))/;

function findPaletteColor(value) {
  return value.match(PALETTE_CLASS)?.[1] ?? value.match(PALETTE_VAR)?.[1];
}

function findLiteralColor(value) {
  return value.replace(/mask-\[[^\]]*\]/g, '').match(LITERAL_COLOR)?.[1];
}

export default {
  meta: { name: 'restate' },
  rules: {
    'no-palette-colors': {
      meta: {
        type: 'problem',
        messages: {
          useToken:
            "'{{ color }}' uses the Tailwind palette directly. Use a theme token from @restate/util-styles/theme.css instead.",
          useTokenForLiteral:
            "'{{ color }}' is a hardcoded color. Use a theme token (var(--…)) from @restate/util-styles/theme.css, and resolveColor from @restate/util-theme where a concrete value is required.",
        },
      },
      create(context) {
        const check = (node, value) => {
          const palette = findPaletteColor(value);
          if (palette) {
            context.report({
              node,
              messageId: 'useToken',
              data: { color: palette },
            });
            return;
          }
          const literal = findLiteralColor(value);
          if (literal) {
            context.report({
              node,
              messageId: 'useTokenForLiteral',
              data: { color: literal },
            });
          }
        };
        return {
          Literal(node) {
            if (typeof node.value === 'string') {
              check(node, node.value);
            }
          },
          TemplateElement(node) {
            check(node, node.value.raw);
          },
        };
      },
    },
    'no-classname-template-literal': {
      meta: {
        type: 'problem',
        messages: {
          useTv:
            'Do not use template literals in className. Use tv() with variants instead.',
        },
      },
      create(context) {
        return {
          'JSXAttribute[name.name="className"] TemplateLiteral'(node) {
            context.report({ node, messageId: 'useTv' });
          },
        };
      },
    },
  },
};
