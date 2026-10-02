import { Link, usePage } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import Silk from '@/components/Silk';
import { Button } from '@/components/ui/button';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

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

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const { auth } = usePage<{ auth?: { user?: { theme_color?: string | null } } }>().props;
    const silkColor = THEME_COLORS[auth?.user?.theme_color ?? 'zinc'] ?? THEME_COLORS.zinc;

    return (
        <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 overflow-hidden bg-[#27272a] p-6 md:p-10">
            <Silk
                speed={3}
                scale={0.35}
                color={silkColor}
                noiseIntensity={1.15}
                rotation={0}
                className="pointer-events-none absolute inset-0 z-0"
            />
            <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/15 bg-black/20 p-6 shadow-2xl backdrop-blur-md md:p-8">
                {title === 'Confirm password' && (
                    <div className="mb-6 flex justify-start">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Go back"
                            title="Go back"
                            onClick={() => window.history.back()}
                        >
                            <ArrowLeft className="size-4" />
                        </Button>
                    </div>
                )}
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col items-center gap-4">
                        <Link
                            href={home()}
                            className="flex flex-col items-center gap-2 font-medium"
                        >
                            <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-md">
                                <AppLogoIcon className="size-9 fill-current text-[var(--foreground)] dark:text-white" />
                            </div>
                            <span className="sr-only">{title}</span>
                        </Link>

                        <div className="space-y-2 text-center">
                            <h1 className="text-xl font-medium">{title}</h1>
                            <p className="text-center text-sm text-muted-foreground">
                                {description}
                            </p>
                        </div>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
