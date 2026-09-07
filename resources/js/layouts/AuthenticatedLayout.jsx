import { Link, router, usePage } from '@inertiajs/react';
import { logout } from '@/routes';

export default function AuthenticatedLayout({ children }) {
    const { auth = {} } = usePage().props;
    const userName = auth?.user?.name ?? 'User';
    const themeColor = auth?.user?.theme_color ?? 'zinc';

    return (
        <div className={`${themeColor} min-h-screen bg-background text-foreground`}> 
            <div className="grid min-h-screen grid-cols-[260px_1fr]">
                <aside className="flex min-h-screen flex-col border-r border-border bg-surface px-4 py-6">
                    <div className="mb-8 flex flex-col gap-2">
                        <h1 className="text-lg font-semibold">Recheck</h1>
                        <p className="text-sm text-muted-foreground">Workflow management</p>
                    </div>

                    <nav className="space-y-2">
                        <Link href="/" className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted">
                            Dashboard
                        </Link>
                    </nav>

                    <div className="mt-8 rounded-2xl border border-border bg-background p-4">
                        <p className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">Tenant</p>
                        <nav className="space-y-2">
                            <Link href="/tenant/processes" className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted">
                                Process Management
                            </Link>
                            <Link href="/tenant/documents" className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted">
                                Document Management
                            </Link>
                            <Link href="/tenant/users" className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted">
                                Users
                            </Link>
                            <Link href="/tenant/roles" className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted">
                                Roles
                            </Link>
                        </nav>
                    </div>

                    <div className="mt-auto rounded-2xl border border-border bg-background p-4">
                        <p className="text-sm text-muted-foreground">Signed in as</p>
                        <p className="mt-2 text-base font-semibold">{userName}</p>
                        <button
                            type="button"
                            onClick={() => router.post(logout())}
                            className="mt-4 w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
                        >
                            Logout
                        </button>
                    </div>
                </aside>

                <main className="min-h-screen overflow-x-hidden bg-background p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
