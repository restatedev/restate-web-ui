const { createGlobPatternsForDependencies } = require('@nx/react/tailwind');
const { join } = require('path');
const defaultTheme = require('tailwindcss/defaultTheme');
const { withTV } = require('tailwind-variants/transformer');

/** @type {import('tailwindcss').Config} */
module.exports = withTV({
  content: [
    join(
      __dirname,
      '{src,pages,components,app}/**/*!(*.stories|*.spec).{ts,tsx,html}'
    ),
    ...createGlobPatternsForDependencies(__dirname),
  ],
  darkMode: 'selector',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter var', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [
    require('tailwindcss-react-aria-components'),
    require('tailwindcss-animate'),
    require('@tailwindcss/forms'),
  ],
});
