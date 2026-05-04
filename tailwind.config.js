/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: '#0B1628',
        'navy-mid': '#111f3a',
        card: '#152038',
        'card-alt': '#1c2d4a',
        border: '#243556',
        gold: '#C9A84C',
        'gold-light': '#E2C068',
        'gold-muted': '#8a7035',
      },
      fontFamily: {
        sans: ['Inter', 'DM Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
