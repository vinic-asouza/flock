/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: '#090725',
        background: '#f5f6fa',
        // Substituir azul antigo por primary
        blue: '#090725',
      },
      textColor: {
        primary: '#090725',
        muted: '#6b7280',
        input: '#222', // Para texto dos inputs
      },
      backgroundColor: {
        primary: '#090725',
        muted: '#f5f6fa',
      },
      borderColor: {
        primary: '#090725',
      },
      ringColor: {
        primary: '#090725',
      },
      placeholderColor: {
        input: '#888',
      },
      cursor: {
        pointer: 'pointer',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
} 