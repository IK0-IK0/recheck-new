import { Link, usePage } from '@inertiajs/react';
import { cn } from '@/lib/utils';

export default function SettingsTabs() {
    const { url } = usePage();

    const tabs = [
        { name: 'Institution', href: '/settings/institution', current: url.startsWith('/settings/institution') },
        { name: 'Database', href: '/settings/database', current: url.startsWith('/settings/database') },
        { name: 'Storage', href: '/settings/storage', current: url.startsWith('/settings/storage') },
        { name: 'Security', href: '/settings/security', current: url.startsWith('/settings/security') },
        { name: 'Subscription', href: '/settings/subscription', current: url.startsWith('/settings/subscription') },
        { name: 'Notifications', href: '/settings/notifications', current: url.startsWith('/settings/notifications') },
    ];

    return (
        <div className="grid grid-cols-2 px-4 sm:grid-cols-3 sm:px-6 lg:grid-cols-6">
            {tabs.map((tab) => (
                <Link
                    key={tab.name}
                    href={tab.href}
                    className={cn(
                        'relative flex items-center justify-center px-2 py-2.5 text-center text-sm font-medium transition-colors sm:px-3',
                        tab.current
                            ? 'text-primary'
                            : 'text-muted-foreground hover:text-foreground'
                    )}
                >
                    {tab.name}
                    {tab.current && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                </Link>
            ))}
        </div>
    );
}
