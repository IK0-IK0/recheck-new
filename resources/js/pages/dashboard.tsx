import { Head, usePage } from '@inertiajs/react';
import { LayoutDashboard } from 'lucide-react';

export default function Dashboard() {
    const { auth } = usePage().props;
    const name = auth?.user?.name ?? 'there';

    return (
        <>
            <Head title="Dashboard" />

            <div className="flex h-full flex-col">
                {/* Header */}
                <div className="flex items-center border-b border-border bg-surface px-6 py-3">
                    <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                            <LayoutDashboard className="size-4 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold">Dashboard</h1>
                            <p className="text-xs text-muted-foreground">Overview of your workspace</p>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-6xl p-4 space-y-4">
                        <div className="rounded-lg border border-border bg-background p-4 shadow-sm">
                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                Welcome back
                            </p>
                            <h2 className="mt-2 text-2xl font-semibold text-foreground">
                                Hello, {name}
                            </h2>
                            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                                Manage your processes, documents, and team settings from one place.
                            </p>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-2">
                            {/* Add dashboard widgets here if needed */}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
