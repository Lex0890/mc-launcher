// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{js,jsx,ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        // Core palette — dark gaming aesthetic
        bg: {
          base: '#0a0a0e',
          surface: '#111118',
          elevated: '#18181f',
          overlay: '#1e1e28',
          border: '#2a2a38',
        },
        accent: {
          DEFAULT: '#22c55e',
          hover: '#16a34a',
          dim: '#15803d',
          glow: 'rgba(34,197,94,0.2)',
        },
        danger: '#ef4444',
        warn: '#f59e0b',
        info: '#3b82f6',
        muted: '#6b7280',
        text: {
          DEFAULT: '#e8e8f0',
          secondary: '#9494a8',
          muted: '#5a5a70',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 20px rgba(34,197,94,0.15)',
        'glow-lg': '0 0 40px rgba(34,197,94,0.2)',
        panel: '0 4px 24px rgba(0,0,0,0.4)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E\")",
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
    },
  },
  plugins: [],
};
