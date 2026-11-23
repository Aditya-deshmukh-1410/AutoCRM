/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {
      colors: {
        /* =========================
           AUTH COLORS
        ========================= */

        ink: "rgb(var(--text-primary-rgb) / <alpha-value>)",
        "ink-soft": "var(--text-muted)",

        brand: {
          50: "#f7eef8",
          300: "#d8a0d8",
          600: "rgb(var(--brand-primary-rgb) / <alpha-value>)",
          700: "rgb(var(--brand-hover-rgb) / <alpha-value>)",
          800: "var(--plum)",
        },

        /* =========================
           PLUM COLORS
           Auth + Landing
        ========================= */

        plum: {
          DEFAULT: "var(--plum)",
          800: "#3a0640",
          900: "#2a0030",
          950: "#200024",
        },

        /* Landing semantic colors */
        background: "rgb(var(--page-background-rgb) / <alpha-value>)",
        foreground: "rgb(var(--text-primary-rgb) / <alpha-value>)",

        card: "rgb(var(--surface-rgb) / <alpha-value>)",
        "card-foreground": "rgb(var(--text-primary-rgb) / <alpha-value>)",

        primary: "rgb(var(--brand-primary-rgb) / <alpha-value>)",
        "primary-foreground": "var(--brand-foreground)",

        secondary: "oklch(0.94 0.022 335)",
        "secondary-foreground": "oklch(0.2 0.035 245)",

        muted: "oklch(0.95 0.012 330)",
        "muted-foreground": "var(--text-muted)",

        accent: "oklch(0.9 0.04 335)",
        "accent-foreground": "oklch(0.2 0.035 245)",

        border: "rgb(var(--border-color-rgb) / <alpha-value>)",
        input: "rgb(var(--border-color-rgb) / <alpha-value>)",
        ring: "rgb(var(--brand-primary-rgb) / <alpha-value>)",

        "plum-foreground": "var(--plum-foreground)",
        "plum-muted": "var(--plum-muted)",
        "plum-border": "var(--plum-border)",
        "plum-panel": "var(--plum-panel)",
        "plum-accent": "var(--plum-accent)",
      },

      /* =========================
         FONTS
      ========================= */

      fontFamily: {
        sans: ["Plus Jakarta Sans", "sans-serif"],
        display: ["Plus Jakarta Sans", "sans-serif"],
      },
    },
  },

  plugins: [],
};
