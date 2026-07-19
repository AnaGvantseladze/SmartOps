/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Google Sans Text"', 'system-ui', 'sans-serif'],
        display: ['"Google Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f5f7ff',
          100: '#eef1ff',
          200: '#d6ddff',
          300: '#b7c3ff',
          400: '#8e9dff',
          500: '#6b7cff',
          600: '#4f5bdf',
          700: '#3b4496',
          800: '#262d5e',
          900: '#151829',
        },
        priority: {
          p1: '#dc2626',
          p2: '#f59e0b',
          p3: '#eab308',
          p4: '#64748b',
          p5: '#94a3b8',
        },
        status: {
          triggered: '#dc2626',
          acknowledged: '#2563eb',
          snoozed: '#7c3aed',
          resolved: '#16a34a',
          open: '#dc2626',
          in_progress: '#d97706',
          pir_pending: '#ea580c',
          action_items_pending: '#ca8a04',
          closed: '#64748b',
          submitted: '#64748b',
          reviewing: '#2563eb',
          approved: '#16a34a',
          scheduled: '#0891b2',
          completed: '#16a34a',
          rolled_back: '#d97706',
          failed: '#dc2626',
          rejected: '#dc2626',
        },
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        dropdown: '0 4px 16px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
}
