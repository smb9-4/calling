/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'pulse-ring': 'ripple 2s cubic-bezier(0.24, 0, 0.38, 1) infinite',
        'pulse-ring-delayed': 'ripple 2s cubic-bezier(0.24, 0, 0.38, 1) infinite 1s',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        ripple: {
          '0%': { transform: 'scale(0.95)', opacity: '0.8' },
          '50%': { transform: 'scale(1.15)', opacity: '0.3' },
          '100%': { transform: 'scale(1.35)', opacity: '0' },
        }
      }
    },
  },
  plugins: [],
}

