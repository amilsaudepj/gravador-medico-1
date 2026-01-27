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
  			brand: {
  				'50': '#E8F8F5',
  				'100': '#D1F0EB',
  				'200': '#A3E1D7',
  				'300': '#5BC9B1',
  				'400': '#2EAE9A',
  				'500': '#16A085',
  				'600': '#138F72',
  				'700': '#0F6B56',
  				'800': '#0B4A3C',
  				'900': '#062A23',
  				DEFAULT: '#16A085'
  			},
  			blue: {
  				'50': '#E6F0FF',
  				DEFAULT: '#0066FF'
  			},
  			white: '#FFFFFF',
  			gray: {
  				'200': '#D8DEE4',
  				'600': '#5C7080',
  				'900': '#1A2E38'
  			},
  			success: '#16A34A',
  			warning: '#F59E0B',
  			error: '#EF4444',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		fontFamily: {
  			sans: [
  				'var(--font-plus-jakarta)',
  				'Plus Jakarta Sans',
  				'system-ui',
  				'sans-serif'
  			]
  		},
  		boxShadow: {
  			soft: '0 2px 8px -2px rgba(26, 46, 56, 0.08)',
  			md: '0 4px 16px -4px rgba(26, 46, 56, 0.12)',
  			strong: '0 8px 24px -4px rgba(26, 46, 56, 0.16)',
  			medical: '0 4px 20px -4px rgba(22, 160, 133, 0.15)',
  			cta: '0 4px 16px rgba(22, 160, 133, 0.24)',
  			ctaHover: '0 8px 24px rgba(22, 160, 133, 0.32)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
