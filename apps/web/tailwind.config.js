/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        "mint-slate": {
          100: "#f0f4f4",
          400: "#8fa3a3",
          900: "#0e1717",
        },
      },
    },
  },
  plugins: [],
};
