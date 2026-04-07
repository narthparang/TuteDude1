/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cosmos: {
          bg: '#0f0f1a',
          panel: '#1a1a2e',
          border: '#2a2a4e',
          accent: '#4f46e5',
          highlight: '#818cf8',
          text: '#e2e8f0',
          muted: '#94a3b8',
          success: '#22c55e',
          danger: '#ef4444',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
