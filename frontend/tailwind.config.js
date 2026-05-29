/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}', './lib/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#171717',
        paper: '#f7f5ef',
        line: '#dedbd0',
        moss: '#4f6f52',
        clay: '#b85c38',
        saffron: '#d4a017'
      },
      boxShadow: {
        soft: '0 18px 55px rgba(23, 23, 23, 0.08)'
      }
    }
  },
  plugins: []
};
