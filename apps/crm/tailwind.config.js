module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}"
  ],
  safelist: [], // Pridaj sem dynamické triedy ak ich používaš
  theme: {
    extend: {
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