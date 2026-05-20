module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}"
  ],
  safelist: [],
  theme: {
    extend: {
      colors: {
        purple: {
          DEFAULT: '#2563EB',
          light:   '#60A5FA',
          soft:    '#EFF6FF',
          deep:    '#1D4ED8',
        },
        brand: {
          DEFAULT: '#2563EB',
          light:  '#60A5FA',
          soft:   '#EFF6FF',
          deep:   '#1D4ED8',
          bg:     '#F8FAFC',
          line:   '#E2E8F0',
          muted:  '#64748B',
          text:   '#1E293B',
        },
        cta: {
          DEFAULT: '#F97316',
          light:   '#FB923C',
        },
      },
      backgroundImage: {
        'rail': 'linear-gradient(180deg, #60A5FA, #2563EB 58%, #1D4ED8)',
        'hero': 'linear-gradient(120deg, #172554 0%, #1E40AF 38%, #2563EB 72%, #1E3A8A 100%)',
      },
      animation: {
        shimmer:  "shimmer 5s infinite linear",
        gradient: "gradient 3s ease infinite",
      },
      keyframes: {
        shimmer: {
          "0%":   { transform: "translateX(-150%) translateY(-150%) rotate(45deg)" },
          "100%": { transform: "translateX(150%) translateY(150%) rotate(45deg)" },
        },
        gradient: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%":      { backgroundPosition: "100% 50%" },
        },
      },
    },
  },
  plugins: [],
};
