import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        "mono-brand": [
          "ui-monospace",
          "'Cascadia Code'",
          "'Fira Code'",
          "Menlo",
          "Monaco",
          "monospace",
        ],
        display: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "Roboto",
          "sans-serif",
        ],
      },
      animation: {
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "border-glow": "border-glow 3s ease infinite",
        "text-shimmer": "text-shimmer 4s linear infinite",
        float: "float 3s ease-in-out infinite",
        "scan-line": "scan-line 4s linear infinite",
        "typing-cursor": "typing-cursor 0.8s step-end infinite",
        "slide-up": "slide-up 0.4s ease-out both",
        "fade-in-up": "fade-in-up 0.5s ease-out both",
        "rank-up": "rank-up 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)",
        fall: "fall 3s ease-in forwards",
        "solve-flash": "solve-flash 1s ease-out",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "gradient-cyber":
          "linear-gradient(135deg, hsl(var(--accent-cyan) / 0.15), hsl(var(--accent-magenta) / 0.15))",
        "gradient-cyber-strong":
          "linear-gradient(135deg, hsl(var(--accent-cyan) / 0.3), hsl(var(--accent-magenta) / 0.3))",
      },
      boxShadow: {
        "glow-cyan":
          "0 0 10px hsl(190 95% 55% / 0.3), 0 0 30px hsl(190 95% 55% / 0.15)",
        "glow-cyan-lg":
          "0 0 15px hsl(190 95% 55% / 0.4), 0 0 45px hsl(190 95% 55% / 0.2)",
        "glow-magenta":
          "0 0 10px hsl(320 85% 55% / 0.3), 0 0 30px hsl(320 85% 55% / 0.15)",
        "glow-magenta-lg":
          "0 0 15px hsl(320 85% 55% / 0.4), 0 0 45px hsl(320 85% 55% / 0.2)",
        "glow-green":
          "0 0 10px hsl(150 80% 50% / 0.3), 0 0 30px hsl(150 80% 50% / 0.15)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
