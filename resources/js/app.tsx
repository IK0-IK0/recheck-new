import { createInertiaApp } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

const progressColor = typeof document === 'undefined'
        ? '#71717a'
        : document.documentElement.classList.contains('theme-zinc') ? '#71717a' :
            document.documentElement.classList.contains('theme-slate') ? '#64748b' :
            document.documentElement.classList.contains('theme-stone') ? '#78716c' :
            document.documentElement.classList.contains('theme-gray') ? '#6b7280' :
            document.documentElement.classList.contains('theme-neutral') ? '#737373' :
            document.documentElement.classList.contains('theme-red') ? '#dc2626' :
            document.documentElement.classList.contains('theme-rose') ? '#e11d48' :
            document.documentElement.classList.contains('theme-orange') ? '#ea580c' :
            document.documentElement.classList.contains('theme-amber') ? '#f59e0b' :
            document.documentElement.classList.contains('theme-yellow') ? '#eab308' :
            document.documentElement.classList.contains('theme-lime') ? '#84cc16' :
            document.documentElement.classList.contains('theme-green') ? '#16a34a' :
            document.documentElement.classList.contains('theme-teal') ? '#0d9488' :
            '#71717a';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            case name === 'welcome':
                return null;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
            </TooltipProvider>
        );
    },
    defaults: {
        visitOptions: () => {
            return { viewTransition: true };
        },
    },
    progress: {
        delay: 250, // Only show if request takes longer than 250ms
        color: progressColor,
        showSpinner: true,
        includeCSS: true,
    },
    // Enable visit caching for instant back/forward navigation
    swapGracefully: true,
});

// This will set light / dark mode on load...
initializeTheme();
