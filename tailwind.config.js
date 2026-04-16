/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
    './prototypes/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0a0908',
        surface: '#161513',
        text: '#e8e6e0',
        'text-dim': 'rgba(232, 230, 224, 0.54)',
        gold: '#c9a961',
        'gold-light': '#e4c57e',
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
        num: ['"Geist Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
