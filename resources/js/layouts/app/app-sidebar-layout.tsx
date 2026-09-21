import { usePage } from '@inertiajs/react';
import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import Silk from '@/components/Silk';
import type { AppLayoutProps } from '@/types';

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

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    const { auth } = usePage<{ auth?: { user?: { theme_color?: string | null } } }>().props;
    const silkColor = THEME_COLORS[auth?.user?.theme_color ?? 'zinc'] ?? THEME_COLORS.zinc;

    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar" className="relative overflow-x-hidden bg-black">
                <Silk
                    speed={10}
                    scale={0.35}
                    color={silkColor}
                    noiseIntensity={0.15}
                    rotation={0}
                    className="pointer-events-none absolute inset-0 z-0 opacity-50"
                />
                <div className="relative z-10 flex min-h-0 flex-1 flex-col">
                    <AppSidebarHeader breadcrumbs={breadcrumbs} />
                    {children}
                </div>
            </AppContent>
        </AppShell>
    );
}
