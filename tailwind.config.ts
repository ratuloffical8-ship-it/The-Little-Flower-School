// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#102A43',
          dark: '#081B2D',
        },
        royal: '#1D4ED8',
        gold: {
          DEFAULT: '#D6AD60',
          soft: '#F1D79B',
        },
        surface: '#F5F7FB',
        ink: {
          DEFAULT: '#172B4D',
          light: '#64748B',
        },
        success: '#15803D',
        warning: '#D97706',
        error: '#DC2626',
        border: '#E2E8F0',
      },
      fontFamily: {
        bengali: ['"Hind Siliguri"', '"Noto Sans Bengali"', 'sans-serif'],
        sans: ['Inter', '"Hind Siliguri"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(16,42,67,0.08), 0 1px 2px rgba(16,42,67,0.06)',
        'card-hover': '0 4px 12px rgba(16,42,67,0.10), 0 2px 4px rgba(16,42,67,0.06)',
        modal: '0 20px 60px rgba(8,27,45,0.25)',
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
