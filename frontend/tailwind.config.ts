import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Narrow phones (iPhone SE and similar) need one breakpoint below `sm`
      // to drop non-essential nav text before it wraps.
      screens: { xs: '400px' },
    },
  },
  plugins: [],
};
export default config;
