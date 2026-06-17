import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#ebf6fb',
          100: '#d3ecf7',
          200: '#9dd5ec',
          300: '#5cb5da',
          400: '#2a9ac4',
          500: '#127faf',
          600: '#0e6a95',
          700: '#0b567a',
          800: '#08425e',
          900: '#052f43',
          950: '#031c29',
        },
        accent: {
          50:  '#fef2ed',
          100: '#fde0d2',
          200: '#f9b49a',
          300: '#f58965',
          400: '#f2703e',
          500: '#ef5e2f',
          600: '#d44d22',
          700: '#b03d18',
          800: '#8d2e11',
          900: '#6a210c',
        },
      },
    },
  },
  plugins: [],
};

export default config;
