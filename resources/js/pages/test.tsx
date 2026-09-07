import { Head, Link, usePage } from '@inertiajs/react';
import { dashboard, test } from '@/routes';

export default function TestPage() {
    const { auth } = usePage().props;
    const name = auth?.user?.name ?? 'there';

    return (
        <>
            <Head title="Test Page" />

            <div className="space-y-6">
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
                    <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
                        Test Page
                    </p>
                    <h1 className="mt-3 text-3xl font-semibold text-foreground">
                        Hello, {name}
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                        This is a test page to verify routing and page rendering in the app.
                    </p>
                    <Link
                        href={dashboard()}
                        className="inline-flex mt-4 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
                    >
                        Back to dashboard
                    </Link>
                </div>
            </div>
        </>
    );
}

TestPage.layout = {
    breadcrumbs: [
        {
            title: 'Test Page',
            href: test(),
        },
    ],
};
