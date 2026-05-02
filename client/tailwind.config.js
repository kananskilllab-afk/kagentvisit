/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    navy:   '#1E1B4B',  // Much deeper, more modern navy
                    blue:   '#3B82F6',  // Brighter, cleaner primary
                    sky:    '#0EA5E9',  // Vibrant sky blue
                    gold:   '#F59E0B',  // Warmer gold/amber
                    purple: '#8B5CF6',
                    lime:   '#84CC16',
                    orange: '#F97316',
                    green:  '#10B981',
                },
                kanan: {
                    navy:  '#1E1B4B',
                    blue:  '#3B82F6',
                    sky:   '#0EA5E9',
                    light: '#F8FAFC',
                    accent:'#F59E0B',
                },
                meridian: {
                    navy:      '#1E1B4B',
                    blue:      '#3B82F6',
                    gold:      '#F59E0B',
                    green:     '#10B981',
                    red:       '#EF4444',
                    sky:       '#0EA5E9',
                    purple:    '#8B5CF6',
                    bg:        '#F1F5F9',
                    white:     '#FFFFFF',
                    border:    '#E2E8F0',
                    text:      '#0F172A',
                    sub:       '#64748B',
                    muted:     '#94A3B8',
                    'row-hov': '#F8FAFC',
                },
            },
            fontFamily: {
                sans:    ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
                display: ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                'card':          '0 4px 6px -1px rgba(0, 0, 0, 0.03), 0 2px 4px -2px rgba(0, 0, 0, 0.03)',
                'card-hover':    '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
                'glass':         '0 4px 30px rgba(0, 0, 0, 0.05)',
                'sidebar':       '1px 0 20px rgba(0, 0, 0, 0.03)',
                'nav':           '0 4px 20px rgba(0, 0, 0, 0.04)',
                'glow':          '0 0 15px rgba(59, 130, 246, 0.5)',
                'meridian-card': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
            },
            backgroundImage: {
                'brand-gradient':   'linear-gradient(135deg, #3B82F6 0%, #0EA5E9 100%)',
                'gold-gradient':    'linear-gradient(135deg, #F59E0B 0%, #F97316 100%)',
                'soft-mesh':        'radial-gradient(at 40% 20%, hsla(210,100%,96%,1) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(189,100%,96%,1) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(210,100%,96%,1) 0px, transparent 50%)',
            },
            animation: {
                'fade-in':    'fadeIn 0.4s ease-out',
                'slide-up':   'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                'slide-down': 'slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            keyframes: {
                fadeIn:    { from: { opacity: '0' }, to: { opacity: '1' } },
                slideUp:   { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
                slideDown: { from: { opacity: '0', transform: 'translateY(-15px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
            },
        },
    },
    plugins: [],
}
