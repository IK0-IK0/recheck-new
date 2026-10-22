import { usePage } from '@inertiajs/react';

import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    const { name } = usePage().props;

    return (
        <>
            <div className="flex aspect-square size-11 items-center justify-center text-sidebar-foreground">
                <AppLogoIcon className="size-8 fill-current" />
            </div>
            <div className="mx-3 h-8 w-px bg-sidebar-border" />
            <div className="grid flex-1 text-left text-base">
                <span className="mb-0.5 truncate leading-tight font-semibold">
                    {name}
                </span>
            </div>
        </>
    );
}
