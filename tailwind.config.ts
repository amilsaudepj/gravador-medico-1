import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta principal - Design System Visual
        brand: {
          DEFAULT: "#16A085", // Teal Primary (CTA/Ações)
          50: "#E8F8F5",    // Teal muito claro (fundos)
          100: "#D1F0EB",   // Teal claro
          200: "#A3E1D7",   // Teal claro médio
          300: "#5BC9B1",   // Teal médio claro
          400: "#2EAE9A",   // Teal Accent
          500: "#16A085",   // Teal Primary (principal)
          600: "#138F72",   // Teal escuro
          700: "#0F6B56",   // Teal mais escuro
          800: "#0B4A3C",   // Teal muito escuro
          900: "#062A23",   // Teal quase preto
        },
        blue: {
          DEFAULT: "#0066FF", // Azul Confiança
          50: "#E6F0FF",     // Azul Claro (fundos)
        },
        white: "#FFFFFF",      // Branco Clínico
        gray: {
          900: "#1A2E38",    // Cinza escuro (textos principais)
          600: "#5C7080",    // Cinza médio (textos secundários)
          200: "#D8DEE4",    // Cinza claro (bordas/divisores)
        },
        success: "#16A34A",    // Verde sucesso
        warning: "#F59E0B",    // Laranja atenção
        error: "#EF4444",      // Vermelho erro
        
        // Cores semânticas usando CSS variables
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        card: {
          DEFAULT: "rgb(var(--card) / <alpha-value>)",
          foreground: "rgb(var(--card-foreground) / <alpha-value>)"
        },
        primary: {
          DEFAULT: "rgb(var(--primary) / <alpha-value>)",
          foreground: "rgb(var(--primary-foreground) / <alpha-value>)"
        },
        secondary: {
          DEFAULT: "rgb(var(--secondary) / <alpha-value>)",
          foreground: "rgb(var(--secondary-foreground) / <alpha-value>)"
        },
        muted: {
          DEFAULT: "rgb(var(--muted) / <alpha-value>)",
          foreground: "rgb(var(--muted-foreground) / <alpha-value>)"
        },
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          foreground: "rgb(var(--accent-foreground) / <alpha-value>)"
        },
        border: "rgb(var(--border) / <alpha-value>)",
        input: "rgb(var(--input) / <alpha-value>)",
        ring: "rgb(var(--ring) / <alpha-value>)",
      },
      borderRadius: {
        lg: "0.75rem",   // Cards grandes: 12px (Design System)
        md: "0.625rem",  // Botões: 10px (Design System)
        sm: "0.5rem",    // Inputs: 8px (Design System)
      },
      fontFamily: {
        sans: ["var(--font-plus-jakarta)", "Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 2px 8px -2px rgba(26, 46, 56, 0.08)",
        md: "0 4px 16px -4px rgba(26, 46, 56, 0.12)",
        strong: "0 8px 24px -4px rgba(26, 46, 56, 0.16)",
        medical: "0 4px 20px -4px rgba(22, 160, 133, 0.15)",
        cta: "0 4px 16px rgba(22, 160, 133, 0.24)",
        ctaHover: "0 8px 24px rgba(22, 160, 133, 0.32)",
      },
    },
  },
  plugins: [],
}

export default config
