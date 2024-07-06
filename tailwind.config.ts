import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [require('@tailwindcss/forms')],
} satisfies Config;
