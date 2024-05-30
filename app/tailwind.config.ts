import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        wheat: "#f2ddb4",
        cornsilk: "#fef4dc",
        gray: {
          "100": "#2a201b",
          "200": "#291f1b",
          "300": "#261e1b",
          "400": "#241d1b",
          "500": "#231c1b",
          "600": "#201b1a",
          "700": "#370c0a",
          "800": "rgba(48, 34, 27, 0.65)",
          "900": "#8d7e68",
          "1600": "#1e1a1a",
          "1800": "#27120f",
        },
        whitesmoke: "#f5f5f5",
        darkgreen: "#346f01",
        black: "#000",
        burlywood: "rgba(205, 164, 115, 0.36)",
        maroon: "#610000",
        tan: {
          "100": "#e5c89d",
          "200": "#b3946b",
        },
        rosybrown: "#a17969",
      },
      spacing: {},
      fontFamily: {
        tahoma: "Tahoma",
      },
      borderRadius: {
        "3xs": "10px",
        "51xl": "70px",
      },
    },
    fontSize: {
      "3xs": "10px",
      xs: "12px",
      sm: "14px",
      base: "16px",
      "5xl": "24px",
      xl: "20px",
      lgi: "19px",
      inherit: "inherit",
    },
    screens: {
      md: "768px",
    },
  },
  corePlugins: {
    preflight: false,
  },
};
export default config;
