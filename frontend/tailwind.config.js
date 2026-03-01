/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
            // Financial/Aladdin-inspired Palette
            brand: {
                black: "#111111",
                dark: "#1a1a1a",
                gray: "#2d2d2d",
                blue: "#0070f3",  // Aladdin blueish
                accent: "#00c853", // Positive
                danger: "#ff3d00", // Negative
                text: "#ffffff",
                muted: "#a0a0a0"
            }
        }
      },
    },
    plugins: [],
  }
