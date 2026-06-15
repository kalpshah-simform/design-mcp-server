import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    colors: {
      primary: '#0052CC',
      secondary: '#172B4D',
      'gray-100': '#F7F8FA',
      'gray-600': '#61646C',
      'gray-900': '#161A1D',
      surface: '#FFFFFF',
      background: '#F7F8FA',
      success: '#216E4E',
      warning: '#974F0C',
      error: '#AE2A19',
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px',
      '2xl': '48px',
      '3xl': '64px',
    },
    breakpoints: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    borderRadius: {
      none: '0',
      sm: '4px',
      md: '8px',
      lg: '12px',
      xl: '16px',
      full: '9999px',
    },
    boxShadow: {
      none: 'none',
      sm: '0 1px 2px rgba(9, 30, 66, 0.16)',
      md: '0 4px 8px rgba(9, 30, 66, 0.24)',
      lg: '0 8px 16px rgba(9, 30, 66, 0.32)',
    },
  },
  plugins: [],
};

export default config;
