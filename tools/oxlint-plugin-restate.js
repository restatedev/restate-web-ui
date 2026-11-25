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
  /(?:^|[\s"'`(,:=_[])(#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])|(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\([^()]*\))/;

function findPaletteColor(value) {
  return value.match(PALETTE_CLASS)?.[1] ?? value.match(PALETTE_VAR)?.[1];
}

const NAMED_COLOR =
  /(?:color-mix\(in [a-z]+,\s*|%,\s*|,\s*)((?:white|black)\b(?:\s+\d+%)?)/;

function findLiteralColor(value) {
  const unmasked = value.replace(/mask-\[[^\]]*\]/g, '');
  return (
    unmasked.match(LITERAL_COLOR)?.[1] ??
    (/(?:color-mix|gradient)\(|%,/.test(unmasked)
      ? unmasked.match(NAMED_COLOR)?.[1]
      : undefined)
  );
}

const UI_LAYER_EXCEPTIONS = {
  dialog: ['@restate/features-user-preference'],
  'issue-banner': ['@restate/features-system-health'],
};

function uiLibOf(filename) {
  return filename
    .replaceAll('\\', '/')
    .match(/\/libs\/ui\/([^/]+)\/src\//)?.[1];
}

function attributeOf(node, name) {
  return node.attributes.find(
    (attribute) =>
      attribute.type === 'JSXAttribute' && attribute.name?.name === name,
  );
}

const ICON_ELEMENTS = new Set(['Icon', 'Spinner', 'StatusDot', 'svg']);
const ICON_CONTROLS = new Set(['Button', 'Link']);
const NAMED_SLOTS = new Set([
  'chevron',
  'increment',
  'decrement',
  'remove',
  'previous',
  'next',
]);

function isIconOnly(children) {
  let icons = 0;
  for (const child of children) {
    if (child.type === 'JSXText') {
      if (child.value.trim() !== '') return false;
      continue;
    }
    if (child.type !== 'JSXElement') return false;
    const name = child.openingElement.name;
    if (name.type !== 'JSXIdentifier' || !ICON_ELEMENTS.has(name.name)) {
      return false;
    }
    icons++;
  }
  return icons > 0;
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
            "'{{ color }}' is a hardcoded color. Use a theme token (var(--…)) from @restate/util-styles/theme.css; canvas code can read one with getComputedStyle(element).getPropertyValue('--…').",
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
    'ui-layer-imports': {
      meta: {
        type: 'problem',
        messages: {
          layer:
            '{{source}} is a {{layer}} lib. libs/ui takes plain props and imports only ui and util libs; see DESIGN.md.',
        },
      },
      create(context) {
        const lib = uiLibOf(context.filename ?? context.getFilename());
        if (!lib) return {};
        return {
          ImportDeclaration(node) {
            const source = node.source.value;
            const layer = source.match(
              /^@restate\/(features|data-access)-/,
            )?.[1];
            if (!layer || UI_LAYER_EXCEPTIONS[lib]?.includes(source)) return;
            context.report({
              node,
              messageId: 'layer',
              data: { source, layer },
            });
          },
        };
      },
    },
    'icon-button-label': {
      meta: {
        type: 'problem',
        messages: {
          label:
            'An icon button or link needs a name: add aria-label (or aria-labelledby) that says what it does.',
        },
      },
      create(context) {
        return {
          JSXElement(node) {
            const opening = node.openingElement;
            if (opening.name.type !== 'JSXIdentifier') return;
            if (!ICON_CONTROLS.has(opening.name.name)) return;
            const variant = attributeOf(opening, 'variant');
            if (variant?.value?.value !== 'icon') return;
            const slot = attributeOf(opening, 'slot');
            if (
              attributeOf(opening, 'aria-label') ||
              attributeOf(opening, 'aria-labelledby') ||
              (slot &&
                (slot.value?.type !== 'Literal' ||
                  NAMED_SLOTS.has(slot.value.value))) ||
              opening.attributes.some(
                (attribute) => attribute.type === 'JSXSpreadAttribute',
              )
            ) {
              return;
            }
            if (!isIconOnly(node.children)) return;
            context.report({ node: opening, messageId: 'label' });
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
