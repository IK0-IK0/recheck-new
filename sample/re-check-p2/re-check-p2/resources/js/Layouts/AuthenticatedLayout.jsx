import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import { Link, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Menu, X, LogOut, User } from 'lucide-react';

export default function AuthenticatedLayout({ header, children }) {
    const { user, permissions = [] } = usePage().props.auth;
    const hasPermission = (p) => permissions.includes(p);

    const [showingNavigationDropdown, setShowingNavigationDropdown] =
        useState(false);

    useEffect(() => {
        if (user?.theme_color) {
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

            document.documentElement.style.setProperty(
                '--primary',
                colorMap[user.theme_color] || '0 0% 9%'
            );
        }
    }, [user?.theme_color]);

    return (
        <div className="min-h-screen bg-background">
            {/* Navigation Bar */}
            <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        <div className="flex items-center gap-8">
                            {/* Logo */}
                            <Link href="/" className="flex shrink-0 items-center">
                                <ApplicationLogo className="block h-9 w-auto fill-current text-foreground" />
                            </Link>

                            {/* Desktop Navigation */}
                            <div className="hidden sm:flex sm:gap-8">
                                <NavLink
                                    href={route('dashboard')}
                                    active={route().current('dashboard')}
                                >
                                    Dashboard
                                </NavLink>
                                <NavLink
                                    href={route('processes')}
                                    active={route().current('processes')}
                                >
                                    Process Management
                                </NavLink>
                                <NavLink
                                    href={route('documents')}
                                    active={route().current('documents')}
                                >
                                    Document Management
                                </NavLink>
                                {hasPermission('view_users') && (
                                    <NavLink
                                        href={route('users.index')}
                                        active={route().current('users.*')}
                                    >
                                        Users
                                    </NavLink>
                                )}
                                {hasPermission('view_roles') && (
                                    <NavLink
                                        href={route('roles.index')}
                                        active={route().current('roles.*')}
                                    >
                                        Roles
                                    </NavLink>
                                )}
                            </div>
                        </div>

                        {/* Desktop User Menu */}
                        <div className="hidden sm:flex sm:items-center">
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <button className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors focus:outline-none">
                                        <span className="truncate max-w-[180px]">{user.name}</span>
                                        <svg
                                            className="h-4 w-4 text-muted-foreground"
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </button>
                                </Dropdown.Trigger>

                                <Dropdown.Content align="right" width="48" contentClasses="py-1 bg-card border border-border rounded-lg shadow-lg">
                                    <Dropdown.Link href={route('profile.edit')} className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted">
                                        <User className="w-4 h-4" />
                                        Profile
                                    </Dropdown.Link>
                                    <Dropdown.Link
                                        href={route('logout')}
                                        method="post"
                                        as="button"
                                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted border-t border-border"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Log Out
                                    </Dropdown.Link>
                                </Dropdown.Content>
                            </Dropdown>
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() =>
                                setShowingNavigationDropdown((previousState) => !previousState)
                            }
                            className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-muted focus:bg-muted focus:outline-none sm:hidden transition-colors"
                        >
                            {showingNavigationDropdown ? (
                                <X className="h-6 w-6" />
                            ) : (
                                <Menu className="h-6 w-6" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Navigation */}
                {showingNavigationDropdown && (
                    <div className="border-t border-border bg-background sm:hidden">
                        <div className="space-y-1 px-4 py-3">
                            <ResponsiveNavLink
                                href={route('dashboard')}
                                active={route().current('dashboard')}
                            >
                                Dashboard
                            </ResponsiveNavLink>
                            <ResponsiveNavLink
                                href={route('processes')}
                                active={route().current('processes')}
                            >
                                Process Management
                            </ResponsiveNavLink>
                            <ResponsiveNavLink
                                href={route('documents')}
                                active={route().current('documents')}
                            >
                                Document Management
                            </ResponsiveNavLink>
                        </div>

                        <div className="border-t border-border px-4 py-3">
                            <div className="mb-3 min-w-0">
                                <div className="text-sm font-semibold text-foreground truncate max-w-[200px]">
                                    {user.name}
                                </div>
                                <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                    {user.email}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <ResponsiveNavLink href={route('profile.edit')} className="flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    Profile
                                </ResponsiveNavLink>
                                <ResponsiveNavLink
                                    method="post"
                                    href={route('logout')}
                                    as="button"
                                    className="flex w-full items-center gap-2 text-red-600 hover:text-red-700"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Log Out
                                </ResponsiveNavLink>
                            </div>
                        </div>
                    </div>
                )}
            </nav>
            {header && (
                <header className="border-b border-border bg-background">
                    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                        {header}
                    </div>
                </header>
            )}

            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {children}
            </main>
        </div>
    );
}
