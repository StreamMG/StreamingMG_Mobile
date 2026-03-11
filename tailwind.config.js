/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: On a supprimé l'espace après le deuxième astérisque
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
};