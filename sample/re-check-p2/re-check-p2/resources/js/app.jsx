import './bootstrap'
import '../css/app.css'

import { createRoot } from 'react-dom/client'
import { createInertiaApp } from '@inertiajs/react'
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers'
import { router } from '@inertiajs/react'
import { Toaster } from 'sonner';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel'

// Color map for theme (HSL format for Tailwind)
const colorMap = {
    'black': '0 0% 9%',
    'blue': '217 91% 60%',
    'purple': '271 81% 66%',
    'pink': '330 81% 60%',
    'red': '0 72% 51%',
    'orange': '25 95% 53%',
    'amber': '38 92% 50%',
    'green': '142 71% 45%',
    'emerald': '160 84% 39%',
    'teal': '173 80% 40%',
    'cyan': '189 94% 43%',
    'indigo': '239 84% 67%',
    'slate': '215 16% 47%',
};

// Helper to convert HSL to hex
const hslToHex = (h, s, l) => {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
};

// Configure Inertia progress bar with dynamic color
const updateProgressBarColor = (themeColor) => {
    const hslValue = colorMap[themeColor] || '0 0% 9%';
    const [h, s, l] = hslValue.split(' ').map(v => parseFloat(v));
    const hexColor = hslToHex(h, s, l);
    
    router.on('start', () => {
        const style = document.createElement('style');
        style.id = 'inertia-progress-style';
        style.innerHTML = `
            #nprogress .bar {
                background: ${hexColor} !important;
            }
            #nprogress .peg {
                box-shadow: 0 0 10px ${hexColor}, 0 0 5px ${hexColor} !important;
            }
            #nprogress .spinner-icon {
                border-top-color: ${hexColor} !important;
                border-left-color: ${hexColor} !important;
            }
        `;
        const existingStyle = document.getElementById('inertia-progress-style');
        if (existingStyle) {
            existingStyle.remove();
        }
        document.head.appendChild(style);
    });
};

createInertiaApp({
  title: (title) => `${title} - ${appName}`,
  resolve: (name) =>
    resolvePageComponent(
      `./Pages/${name}.jsx`,
      import.meta.glob('./Pages/**/*.jsx', { eager: true }),
    ),
  setup({ el, App, props }) {
    const themeColor = props.initialPage?.props?.auth?.user?.theme_color || 'black';
    
    if (props.initialPage?.props?.auth?.user?.theme_color) {
      document.documentElement.style.setProperty(
        '--primary',
        colorMap[themeColor] || '0 0% 9%'
      );
    }
    
    // Update progress bar color
    updateProgressBarColor(themeColor);
    
    createRoot(el).render(    
    <>
      <Toaster richColors position="top-right" />
      <App {...props} />
    </>
    );
  },
})
