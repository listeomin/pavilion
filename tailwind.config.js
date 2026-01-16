import { heroui } from "@heroui/theme";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/components/**/*.{js,jsx,ts,tsx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  darkMode: "class",
  plugins: [heroui({
    themes: {
      light: {
        colors: {
          primary: {
            DEFAULT: "#6366F1",
            foreground: "#FFFFFF",
          },
          focus: "#6366F1",
        },
      },
      dark: {
        colors: {
          primary: {
            DEFAULT: "#818CF8",
            foreground: "#FFFFFF",
          },
          focus: "#818CF8",
        },
      },
    },
  })],
};
