import type { Config } from "tailwindcss"
import tailwindcssAnimate from "tailwindcss-animate"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			success: {
  				DEFAULT: 'hsl(var(--success))',
  				bg: 'hsl(var(--success-bg))'
  			},
  			warning: {
  				DEFAULT: 'hsl(var(--warning))',
  				bg: 'hsl(var(--warning-bg))'
  			},
  			danger: {
  				DEFAULT: 'hsl(var(--danger))',
  				bg: 'hsl(var(--danger-bg))'
  			},
  			archived: {
  				bg: 'hsl(var(--archived-bg))'
  			},
  			pdf: {
  				DEFAULT: 'hsl(var(--pdf))',
  				bg: 'hsl(var(--pdf-bg))'
  			},
  			xlsx: {
  				DEFAULT: 'hsl(var(--xlsx))',
  				bg: 'hsl(var(--xlsx-bg))'
  			},
  			doc: {
  				DEFAULT: 'hsl(var(--doc))',
  				bg: 'hsl(var(--doc-bg))'
  			},
  			cat: {
  				'1': 'hsl(var(--cat-1))',
  				'1-bg': 'hsl(var(--cat-1-bg))',
  				'2': 'hsl(var(--cat-2))',
  				'2-bg': 'hsl(var(--cat-2-bg))',
  				'3': 'hsl(var(--cat-3))',
  				'3-bg': 'hsl(var(--cat-3-bg))',
  				'4': 'hsl(var(--cat-4))',
  				'4-bg': 'hsl(var(--cat-4-bg))',
  				'5': 'hsl(var(--cat-5))',
  				'5-bg': 'hsl(var(--cat-5-bg))',
  				'6': 'hsl(var(--cat-6))',
  				'6-bg': 'hsl(var(--cat-6-bg))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [tailwindcssAnimate],
} satisfies Config

export default config
