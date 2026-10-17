export default {
  meta: { name: 'restate' },
  rules: {
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
