const { createGlobPatternsForDependencies } = require('@nx/react/tailwind');
const { join } = require('path');
const defaultTheme = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
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
        sans: ['InterVariable', ...defaultTheme.fontFamily.sans],
        mono: ['JetBrainsMonoVariable', ...defaultTheme.fontFamily.mono],
      },
      fontSize: {
        '3xs': '0.625rem',
        '2xs': '0.6875rem',
        code: '0.8125rem',
      },
      screens: {
        '3xl': '1950px',
      },
      keyframes: {
        moveAndGrow: {
          '0%': {
            right: '0',
          },
          '100%': {
            right: '-23px',
          },
        },
      },
      animation: {
        moveAndGrow: 'moveAndGrow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [
    require('tailwindcss-react-aria-components'),
    require('tailwindcss-animate'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
};
