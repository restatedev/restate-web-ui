const baseConfig = require('../../eslint.config.js');

module.exports = [
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    // Override or add rules here
    rules: {},
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    // Override or add rules here
    rules: {},
  },
  {
    files: ['**/*.js', '**/*.jsx'],
    // Override or add rules here
    rules: {},
  },
  {
    ignores: [
      'build',
      'public/build',
      '.react-router',
      'public/elements-web-components.min.js',
      'public/elements-web-components.min.css',
      'public/inter.css',
    ],
  },
];
