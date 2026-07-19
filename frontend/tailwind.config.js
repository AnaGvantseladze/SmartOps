/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ops: {
          bg: '#0f1419',
          surface: '#1a2332',
          border: '#2d3a4f',
          accent: '#3b82f6',
          p1: '#ef4444',
          p2: '#f59e0b',
          p3: '#eab308',
          p4: '#94a3b8',
          p5: '#64748b',
        },
      },
    },
  },
  plugins: [],
}
