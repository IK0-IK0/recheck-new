import { Head } from '@inertiajs/react';
import { CalendarDays, CheckCircle2 } from 'lucide-react';

const details = [
    { label: 'Plan', value: 'Not connected' },
    { label: 'Status', value: 'Not connected' },
    { label: 'Next billing date', value: 'Not available' },
];

export default function Subscription() {
    return (
        <>
            <Head title="Subscription Settings" />

            <div className="p-3">
                <div className="mx-auto max-w-2xl">
                    <section className="overflow-hidden rounded-lg border border-border bg-background shadow-sm">
                        <div className="border-b border-border px-4 py-3">
                            <div>
                                <h2 className="text-sm font-semibold">Subscription</h2>
                                <p className="text-xs text-muted-foreground">Track your institution&apos;s plan and billing status.</p>
                            </div>
                        </div>

                        <div className="grid gap-px bg-border sm:grid-cols-3">
                            {details.map((detail) => (
                                <div key={detail.label} className="bg-background px-4 py-3">
                                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{detail.label}</p>
                                    <p className="mt-1 text-sm font-medium">{detail.value}</p>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-start gap-2 border-t border-border px-4 py-3">
                            <CheckCircle2 className="mt-0.5 size-4 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-medium">Subscription tracking is ready</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    Connect billing to display your live plan, status, and renewal date here.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
                            <CalendarDays className="size-3.5" />
                            Billing details will appear once a subscription is configured.
                        </div>
                    </section>
                </div>
            </div>
        </>
    );
}