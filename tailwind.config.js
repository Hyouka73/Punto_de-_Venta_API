/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paleteria: {
          agua: '#38BDF8',
          crema: '#FDE047',
          sandwich: '#F59E0B',
          nieve: '#FB7185',
          combo: '#A855F7',
          bg: '#FFFDF9',
          cream: '#FEF7EE',
          dark: '#1C1917',
          waffle: '#D97706',
          chocolate: '#451A03',
          mint: '#10B981',
          strawberry: '#F43F5E',
        },
      },
      minHeight: {
        'touch-btn': '80px',
        'touch-card': '88px',
      },
      borderRadius: {
        'touch': '20px',
        'counter': '24px',
      },
      keyframes: {
        aurora: {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '50%': { transform: 'translate(20px, 15px) scale(1.05)' },
        },
      },
      animation: {
        aurora: 'aurora 15s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
