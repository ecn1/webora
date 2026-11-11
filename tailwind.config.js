/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#07070c',
          900: '#0a0a12',
          850: '#0e0e18',
          800: '#12121e',
          750: '#171726',
          700: '#1d1d2e',
          600: '#262638',
        },
        body: '#a3a3b8',
        accent: {
          DEFAULT: '#7c5cff',
          soft: '#9b82ff',
          deep: '#5b3ae6',
          50: '#f1edff',
        },
      },
      boxShadow: {
        panel: '0 20px 60px -20px rgba(0,0,0,.65)',
        glow: '0 0 40px -8px rgba(124,92,255,.45)',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
