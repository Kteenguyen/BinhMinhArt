/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mustard: {
          50: '#FDF9EE',
          100: '#FAF3DD',
          200: '#F4E5B8',
          300: '#EBD18D',
          400: '#DBB958',
          DEFAULT: '#C58C00', // Envelope flap gold
          600: '#A97500',
          700: '#885D00',
          800: '#684500',
          900: '#483000',
        },
        burgundy: {
          50: '#FAF0F0',
          100: '#F4DCDC',
          200: '#EAB9B9',
          DEFAULT: '#7D1818', // Envelope logo red
          600: '#691212',
          700: '#550D0D',
          800: '#420808',
          900: '#300404',
        },
        gallery: {
          50: '#FAF7F0',
          100: '#F5F0E4',
          200: '#EAE1CE',
          300: '#DFCBAA',
          400: '#C5B08C',
          500: '#A6906C',
          600: '#7E6B4D',
          700: '#5A4C34',
          800: '#382F1F',
          900: '#1C170E',
        }
      },
      fontFamily: {
        serif: ['"Times New Roman"', '"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
