/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      fontFamily: {
        primary: ['"Cormorant Garamond"', 'serif'],
        secondary: ['Manrope', 'sans-serif'],
      },
      colors: {
        bg: '#FDFBF7',
        surface: '#FFFFFF',
        ink: '#1A1A1A',
        muted: '#5C5C5C',
        line: '#E5E5E5',
        terasa: {
          primary: '#005B60',
          accent: '#00838F',
          soft: '#E0F2F1',
          softText: '#004D40',
          tint: '#F5FAFA',
        },
        restaurant: {
          primary: '#4E342E',
          accent: '#6D4C41',
          soft: '#EFEBE9',
          softText: '#3E2723',
          tint: '#FBF9F8',
        },
      },
      borderRadius: {
        card: '1rem',
        pill: '9999px',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'blur-in': {
          '0%': { filter: 'blur(10px)', opacity: '0' },
          '100%': { filter: 'blur(0)', opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out both',
        'blur-in': 'blur-in 0.5s ease-out both',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
