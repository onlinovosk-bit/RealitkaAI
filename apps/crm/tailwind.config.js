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
          DEFAULT: '#8b22ff',
          light:   '#cf25d9',
          soft:    '#f3e8ff',
          deep:    '#5513c5',
        },
        brand: {
          bg:     '#fbf7ff',
          line:   '#eee6f7',
          muted:  '#756b83',
          deep:   '#171321',
        },
      },
      backgroundImage: {
        'rail': 'linear-gradient(180deg, #e12dea, #8b22ff 58%, #5513c5)',
        'hero': 'linear-gradient(120deg, #130526 0%, #3b0f80 42%, #174ea6 78%, #052842 100%)',
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
