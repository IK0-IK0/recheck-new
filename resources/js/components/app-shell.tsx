import { usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import Silk from '@/components/Silk';
import { applyUserTheme } from '@/hooks/use-appearance';
import type { AppVariant } from '@/types';

const THEME_COLORS: Record<string, string> = {
    zinc: '#71717a',
    slate: '#64748b',
    stone: '#78716c',
    gray: '#6b7280',
    neutral: '#737373',
    red: '#dc2626',
    rose: '#e11d48',
    orange: '#ea580c',
    amber: '#f59e0b',
    yellow: '#eab308',
    lime: '#84cc16',
    green: '#16a34a',
    teal: '#0d9488',
};

type Props = {
    children: ReactNode;
    variant?: AppVariant;
};

export function AppShell({ children, variant = 'sidebar' }: Props) {
    const { auth, sidebarOpen: isOpen } = usePage().props;
    const silkColor = THEME_COLORS[auth?.user?.theme_color ?? 'zinc'] ?? THEME_COLORS.zinc;

    useEffect(() => {
        applyUserTheme(auth?.user?.theme_color);
    }, [auth?.user?.theme_color]);

    if (variant === 'header') {
        return (
            <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#27272a]">
                <Silk
                    speed={3}
                    scale={0.35}
                    color={silkColor}
                    noiseIntensity={1.15}
                    rotation={0}
                    className="pointer-events-none absolute inset-0 z-0"
                />
                <div className="relative z-10 flex min-h-screen w-full flex-col">{children}</div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#27272a]">
            <Silk
                speed={3}
                scale={0.35}
                color={silkColor}
                noiseIntensity={1.15}
                rotation={0}
                className="pointer-events-none absolute inset-0 z-0"
            />
            <div className="relative z-10 min-h-screen">
                <SidebarProvider defaultOpen={isOpen}>{children}</SidebarProvider>
            </div>
        </div>
    );
}
