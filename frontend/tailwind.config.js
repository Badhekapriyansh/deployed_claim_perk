/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FBFAF6",
        ink: "#1C2321",
        forest: {
          DEFAULT: "#1B4332",
          light: "#2D6A4F",
          dark: "#0F2B20"
        },
        coral: {
          DEFAULT: "#D64545",
          light: "#F1C6C6"
        },
        line: "#D8D3C7",
        muted: "#6B7280"
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"]
      }
    }
  },
  plugins: []
};
