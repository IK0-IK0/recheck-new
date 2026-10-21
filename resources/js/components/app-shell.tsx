import { usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import Silk from '@/components/Silk';
import { SidebarProvider } from '@/components/ui/sidebar';
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
    const page = usePage<{ auth?: { user?: { theme_color?: string | null } }; sidebarOpen?: boolean }>();
    const { auth, sidebarOpen: isOpen } = page.props;
    const silkColor = THEME_COLORS[auth?.user?.theme_color ?? 'zinc'] ?? THEME_COLORS.zinc;
    const isProposalsIndex = page.url.split('?')[0] === '/tenant/proposals';

    useEffect(() => {
        applyUserTheme(auth?.user?.theme_color);
    }, [auth?.user?.theme_color]);

    if (variant === 'header') {
        return (
            <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#27272a]">
                <Silk
                    speed={0.1}
                    scale={1}
                    color={silkColor}
                    noiseIntensity={7.8}
                    rotation={0}
                    className="pointer-events-none absolute inset-0 z-0"
                />
                <div className="relative z-10 flex min-h-screen w-full flex-col">{children}</div>
            </div>
        );
    }

    return (
        <div className={`relative bg-[#27272a] ${isProposalsIndex ? 'min-h-svh overflow-x-hidden lg:h-svh lg:overflow-hidden' : 'min-h-screen overflow-hidden'}`}>
            <Silk
                speed={0.1}
                scale={0.35}
                color={silkColor}
                noiseIntensity={7.8}
                rotation={0}
                className="pointer-events-none absolute inset-0 z-0"
            />
            <div className={`relative z-10 ${isProposalsIndex ? 'min-h-svh lg:h-full lg:min-h-0' : 'min-h-screen'}`}>
                <SidebarProvider
                    defaultOpen={isOpen}
                    className={isProposalsIndex ? 'lg:h-full lg:min-h-0 lg:overflow-hidden' : undefined}
                >
                    {children}
                </SidebarProvider>
            </div>
        </div>
    );
}
