import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import {
    BookOpen,
    CheckCircle2,
    FileText,
    FolderGit2,
    FolderKanban,
    LayoutGrid,
    AlertCircle,
    Building2,
    Shield,
    Settings2,
    Users,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Processes',
        href: '/tenant/processes',
        icon: FolderKanban,
    },
    {
        title: 'Documents',
        href: '/tenant/documents',
        icon: FileText,
    },
    {
        title: 'Users',
        href: '/tenant/users',
        icon: Users,
    },
    {
        title: 'Roles',
        href: '/tenant/roles',
        icon: Shield,
    },
];

const footerNavItems: NavItem[] = [
    {
        title: 'Repository',
        href: 'https://github.com/laravel/react-starter-kit',
        icon: FolderGit2,
    },
    {
        title: 'Documentation',
        href: 'https://laravel.com/docs/starter-kits#react',
        icon: BookOpen,
    },
];

export function AppSidebar() {
    const { auth, setupStatus } = usePage().props as {
        auth?: { user?: { role?: string } };
        setupStatus?: { database: boolean; storage: boolean; complete: boolean };
    };
    const isAdmin = auth?.user?.role === 'admin';
    const [showSetupDialog, setShowSetupDialog] = useState(false);
    const navigationItems = isAdmin
        ? [
            { title: 'Dashboard', href: dashboard(), icon: LayoutGrid },
            { title: 'Institutions', href: '/admin', icon: Building2 },
        ]
        : mainNavItems;
    const requiresSetup = setupStatus?.complete !== true;

    const openSetupDialog = () => {
        setShowSetupDialog(true);
    };

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <SidebarMenu>
                    {navigationItems.map((item) => (
                        <SidebarMenuItem key={item.title}>
                            {!isAdmin && requiresSetup && item.title !== 'Dashboard' ? (
                                <SidebarMenuButton
                                    type="button"
                                    onClick={openSetupDialog}
                                    tooltip={{ children: item.title }}
                                    className="text-muted-foreground/50 hover:text-muted-foreground/70"
                                >
                                    {item.icon && <item.icon />}
                                    <span>{item.title}</span>
                                </SidebarMenuButton>
                            ) : (
                                <SidebarMenuButton asChild isActive={false} tooltip={{ children: item.title }}>
                                    <Link href={item.href} prefetch>
                                        {item.icon && <item.icon />}
                                        <span>{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                            )}
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>

            <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
                <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
                    <DialogHeader className="border-b border-border bg-surface px-6 py-5">
                        <div className="flex items-start gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                <Settings2 className="size-5 text-primary" />
                            </div>
                            <div className="space-y-1">
                                <DialogTitle className="text-base">Finish workspace setup</DialogTitle>
                                <DialogDescription className="text-xs leading-relaxed">
                                    Connect both services to unlock your workspace tools.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="space-y-2 px-6 py-5">
                        <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-3">
                            <div className="flex items-center gap-3">
                                {setupStatus?.database ? <CheckCircle2 className="size-4 text-emerald-600" /> : <AlertCircle className="size-4 text-amber-600" />}
                                <div>
                                    <p className="text-sm font-medium">Database</p>
                                    <p className="text-xs text-muted-foreground">{setupStatus?.database ? 'Connected and ready' : 'Connection and migrations required'}</p>
                                </div>
                            </div>
                            {setupStatus?.database && <span className="text-xs font-medium text-emerald-600">Ready</span>}
                            {!setupStatus?.database && <Button variant="outline" size="sm" asChild><Link href="/settings/database" onClick={() => setShowSetupDialog(false)}>Configure</Link></Button>}
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-3">
                            <div className="flex items-center gap-3">
                                {setupStatus?.storage ? <CheckCircle2 className="size-4 text-emerald-600" /> : <AlertCircle className="size-4 text-amber-600" />}
                                <div>
                                    <p className="text-sm font-medium">Storage</p>
                                    <p className="text-xs text-muted-foreground">{setupStatus?.storage ? 'Connected and ready' : 'File storage configuration required'}</p>
                                </div>
                            </div>
                            {setupStatus?.storage && <span className="text-xs font-medium text-emerald-600">Ready</span>}
                            {!setupStatus?.storage && <Button size="sm" asChild><Link href="/settings/storage" onClick={() => setShowSetupDialog(false)}>Configure</Link></Button>}
                        </div>
                    </div>

                    <DialogFooter className="border-t border-border bg-surface px-6 py-4 sm:justify-between">
                        <Button type="button" variant="ghost" onClick={() => setShowSetupDialog(false)}>Cancel</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Sidebar>
    );
}
