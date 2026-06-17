/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#FFF4ED',
          100: '#FFE6D5',
          300: '#FED7AA',
          400: '#FB923C',
          500: '#EA580C',
          600: '#C2410C',
          700: '#9A3412',
          900: '#431407',
        },
        ink: {
          900: '#1C1917',
          800: '#1F1B17',
          700: '#292524',
          600: '#57534E',
          500: '#78716C',
          400: '#A8A29E',
        },
        surface: {
          0:    '#FFFFFF',
          50:   '#FAFAF9',
          100:  '#F5F5F4',
          150:  '#EFEDE9',
          line: '#E7E5E4',
        },
        kds: {
          bg:   '#0F172A',
          card: '#1E293B',
          line: '#334155',
          text: '#F1F5F9',
          dim:  '#94A3B8',
        },
        status: {
          pending:   '#3B82F6',
          accepted:  '#8B5CF6',
          preparing: '#F59E0B',
          ready:     '#22C55E',
          completed: '#737373',
          cancelled: '#EF4444',
          expired:   '#A8A29E',
        },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        xs:   ['0.75rem',  { lineHeight: '1rem' }],
        sm:   ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem',     { lineHeight: '1.5rem' }],
        lg:   ['1.125rem', { lineHeight: '1.625rem' }],
        xl:   ['1.25rem',  { lineHeight: '1.75rem' }],
        '2xl':['1.5rem',   { lineHeight: '2rem' }],
        '4xl':['2.25rem',  { lineHeight: '2.5rem' }],
      },
      borderRadius: {
        lg:   '8px',
        xl:   '12px',
        '2xl':'16px',
        '3xl':'20px',
      },
      boxShadow: {
        sm:     '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 1px 0 rgb(0 0 0 / 0.03)',
        md:     '0 4px 12px -2px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
        lg:     '0 12px 32px -8px rgb(0 0 0 / 0.18), 0 4px 12px -4px rgb(0 0 0 / 0.08)',
        brand:  '0 12px 28px -8px rgb(234 88 12 / 0.45)',
        glow:   '0 0 0 4px rgb(234 88 12 / 0.18)',
        ring:   'inset 0 0 0 1px rgb(231 229 228 / 1)',
      },
      backgroundImage: {
        'brand-hot':  'linear-gradient(135deg, #FB923C 0%, #EA580C 60%, #C2410C 100%)',
        'brand-soft': 'linear-gradient(135deg, #FFF4ED 0%, #FFE6D5 100%)',
        'kds-fade':   'linear-gradient(180deg, rgba(15,23,42,0) 0%, #0F172A 90%)',
        'grain':      'url("data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%27160%27 height=%27160%27><filter id=%27n%27><feTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%272%27 stitchTiles=%27stitch%27/><feColorMatrix values=%270 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.045 0%27/></filter><rect width=%27160%27 height=%27160%27 filter=%27url(%23n)%27/></svg>")',
      },
      keyframes: {
        'sheet-up': {
          from: { transform: 'translateY(100%)' },
          to:   { transform: 'translateY(0)' },
        },
        'modal-in': {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
          to:   { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(-12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        'cart-bump': {
          '0%':   { transform: 'scale(1)' },
          '40%':  { transform: 'scale(1.18)' },
          '100%': { transform: 'scale(1)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'tap-pulse': {
          '0%':   { boxShadow: '0 0 0 0 rgb(234 88 12 / 0.55)' },
          '70%':  { boxShadow: '0 0 0 12px rgb(234 88 12 / 0)' },
          '100%': { boxShadow: '0 0 0 0 rgb(234 88 12 / 0)' },
        },
        marquee: {
          from: { transform: 'translateX(0%)' },
          to:   { transform: 'translateX(-50%)' },
        },
        'drawer-in-right': {
          from: { transform: 'translateX(100%)' },
          to:   { transform: 'translateX(0)' },
        },
        'drawer-in-left': {
          from: { transform: 'translateX(-100%)' },
          to:   { transform: 'translateX(0)' },
        },
      },
      animation: {
        'sheet-up': 'sheet-up 280ms cubic-bezier(0.16, 1, 0.3, 1)',
        'modal-in': 'modal-in 250ms cubic-bezier(0.16, 1, 0.3, 1)',
        'toast-in': 'toast-in 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        'cart-bump': 'cart-bump 280ms ease-out',
        'fade-in':   'fade-in 180ms ease-out',
        'tap-pulse': 'tap-pulse 1.6s ease-out infinite',
        'shimmer':   'shimmer 1.6s linear infinite',
        'marquee':   'marquee 28s linear infinite',
        'drawer-in-right': 'drawer-in-right 280ms cubic-bezier(0.16, 1, 0.3, 1)',
        'drawer-in-left':  'drawer-in-left 280ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
