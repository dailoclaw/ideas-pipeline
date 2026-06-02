/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent: '#5254d6',
        surface: '#ffffff',
        bg: '#f5f5fb',
        card: '#ffffff',
        card2: '#f0f0f8',
        border: '#e0e0ec',
        txt: '#1a1a2e',
        'txt-m': '#55557a',
        'txt-f': '#9090b8',
        success: '#059669',
        warning: '#d97706',
        danger: '#dc2626',
        info: '#2563eb',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
