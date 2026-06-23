/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand palette — deep navy + saffron (GST/India-inspired)
        brand: {
          50:  '#fff8f0',
          100: '#ffecd4',
          200: '#ffd4a0',
          300: '#ffb860',
          400: '#ff9a28',
          500: '#f07d00',
          600: '#c46000',
          700: '#9a4800',
          800: '#7a3800',
          900: '#5e2a00',
        },
        navy: {
          50:  '#f0f4ff',
          100: '#dce6ff',
          200: '#b8ccff',
          300: '#8aabff',
          400: '#5582ff',
          500: '#2d5bff',
          600: '#1a3ff5',
          700: '#1030d8',
          800: '#0d24ae',
          900: '#091b87',
          950: '#050e4a',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      }
    }
  },
  plugins: [],
}
