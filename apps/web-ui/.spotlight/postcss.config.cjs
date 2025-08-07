// Note: If you use library-specific PostCSS/Tailwind configuration then you should remove the `postcssConfig` build
// option from your application's configuration (i.e. project.json).
//
// See: https://nx.dev/guides/using-tailwind-css-in-react#step-4:-applying-configuration-to-libraries

// 🔧 Custom plugin to remove global rules
function removeGlobalSelectors() {
  return {
    postcssPlugin: 'remove-global-selectors',
    Rule(rule) {
      if (!rule.selectors) return;

      const banned = ['html', 'body'];
      const shouldRemove = rule.selectors.some((sel) =>
        banned.some((ban) => sel.trim().startsWith(ban))
      );

      if (shouldRemove) {
        console.log('❌ Removing rule for selector:', rule.selector);
        rule.remove();
      }
    },
  };
}
removeGlobalSelectors.postcss = true;

module.exports = {
  plugins: [
    removeGlobalSelectors,
    require('postcss-prefix-selector')({
      prefix: ':where(.spotlight)',
    }),
  ],
};
