/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Nunito', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 20px 45px -20px rgba(15, 23, 42, 0.35)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(1.15rem)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'float-glow': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '40%': { transform: 'translate(12px, -14px) scale(1.04)' },
          '70%': { transform: 'translate(-10px, 10px) scale(0.97)' },
        },
        'grid-pulse': {
          '0%, 100%': { opacity: '0.28' },
          '50%': { opacity: '0.42' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'fade-in': 'fade-in 0.85s ease-out forwards',
        'float-glow': 'float-glow 22s ease-in-out infinite',
        'grid-pulse': 'grid-pulse 14s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
