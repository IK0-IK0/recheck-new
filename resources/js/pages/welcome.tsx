import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Check,
    FileCheck2,
    GitBranch,
    LogIn,
    Scale,
    ShieldCheck,
} from 'lucide-react';
import Silk from '@/components/Silk';

import { dashboard, login, register } from '@/routes';

type WorkflowNodeProps = {
    className?: string;
    eyebrow: string;
    icon: React.ReactNode;
    title: string;
    detail: string;
    status?: string;
    statusTone?: 'primary' | 'secondary' | 'ink';
};

function WorkflowNode({
    className = '',
    eyebrow,
    icon,
    title,
    detail,
    status,
    statusTone = 'primary',
}: WorkflowNodeProps) {
    const iconTone = {
        primary: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        ink: 'bg-foreground text-background',
    }[statusTone];

    return (
        <div
            className={`absolute z-10 w-[150px] rounded-[8px] border border-border bg-card p-3 shadow-[0_8px_22px_rgba(24,24,27,0.1)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_14px_28px_rgba(24,24,27,0.16)] sm:w-[178px] sm:p-3.5 ${className}`}
        >
            <div className="mb-2 flex items-start justify-between gap-2">
                <div
                    className={`flex size-7 shrink-0 items-center justify-center rounded-[5px] ${iconTone}`}
                >
                    {icon}
                </div>
                {status && (
                    <span
                        className="rounded-full bg-secondary px-2 py-1 text-[8px] font-bold tracking-[0.03em] text-secondary-foreground"
                    >
                        {status}
                    </span>
                )}
            </div>
            <p className="mb-1 text-[8px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
                {eyebrow}
            </p>
            <p className="text-[11px] leading-[1.25] font-bold text-foreground sm:text-[12px]">
                {title}
            </p>
            <p className="mt-1 text-[9px] leading-[1.35] text-muted-foreground">
                {detail}
            </p>
        </div>
    );
}

function WorkflowPreview() {
    return (
        <div className="relative mx-auto w-full max-w-[660px] animate-[preview-in_850ms_ease-out_both]">
            <div className="absolute -inset-10 rounded-[48px] bg-[radial-gradient(circle_at_70%_45%,rgba(161,161,170,0.24),rgba(244,244,245,0)_66%)] blur-2xl" />
            <div className="relative overflow-hidden rounded-[10px] border border-border bg-card shadow-[0_28px_70px_rgba(24,24,27,0.14)] transition duration-500 hover:shadow-[0_34px_80px_rgba(24,24,27,0.2)]">
                <div className="flex h-9 items-center gap-1.5 border-b border-border bg-muted px-3.5">
                    <span className="size-2.5 rounded-full bg-muted-foreground/25" />
                    <span className="size-2.5 rounded-full bg-muted-foreground/40" />
                    <span className="size-2.5 rounded-full bg-muted-foreground/60" />
                    <div className="ml-3 flex h-5.5 max-w-[290px] flex-1 items-center gap-1.5 rounded-[4px] border border-border bg-card px-2.5 text-[8px] text-muted-foreground shadow-sm">
                        <ShieldCheck className="size-3 text-primary" />
                        <span>app.recheck.com / review</span>
                    </div>
                    <span className="ml-auto size-3 rounded-[3px] border border-border" />
                </div>
                <div className="flex h-[390px] bg-muted/50 sm:h-[445px]">
                    <aside className="hidden w-[118px] shrink-0 border-r border-border bg-card p-3 sm:block">
                        <div className="mb-7 flex items-center gap-1.5 text-[9px] font-bold text-foreground">
                            <span className="flex size-5 items-center justify-center text-foreground">
                                <Scale className="size-3" />
                            </span>
                            RECheck
                        </div>
                        <p className="mb-2 text-[7px] font-bold tracking-[0.1em] text-muted-foreground uppercase">
                            Workspace
                        </p>
                        <div className="mb-1 flex items-center gap-2 rounded-[5px] bg-primary/10 px-2 py-2 text-[9px] font-semibold text-primary">
                            <GitBranch className="size-3" />
                            Workflows
                        </div>
                        <div className="flex items-center gap-2 px-2 py-2 text-[9px] text-muted-foreground">
                            <FileCheck2 className="size-3" />
                            Submissions
                        </div>
                        <div className="flex items-center gap-2 px-2 py-2 text-[9px] text-muted-foreground">
                            <Check className="size-3" />
                            Reports
                        </div>
                        <div className="mt-12 border-t border-border pt-3 text-[8px] leading-[1.4] text-muted-foreground">
                            Committee workspace
                            <br />
                            <span className="font-semibold text-foreground">
                                UIC Research Office
                            </span>
                        </div>
                    </aside>
                    <div className="relative min-w-0 flex-1 overflow-hidden">
                        <div className="flex h-12 items-center justify-between border-b border-border bg-card px-4 sm:px-5">
                            <div>
                                <p className="text-[8px] text-muted-foreground">
                                    Workflow
                                </p>
                                <p className="text-[13px] font-bold tracking-[-0.03em] text-foreground">
                                    Protocol review pipeline
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="hidden rounded-full bg-secondary px-2 py-1 text-[8px] font-bold text-secondary-foreground sm:inline-flex">
                                    Synced just now
                                </span>
                                <span className="size-6 rounded-full bg-primary/10" />
                            </div>
                        </div>
                        <div className="relative h-[338px] overflow-hidden bg-background sm:h-[393px]">
                            <div className="absolute inset-0 [background-image:radial-gradient(rgba(113,113,122,0.3)_1px,transparent_1px)] [background-size:16px_16px] opacity-55" />
                            <div className="absolute top-[80px] left-[18%] h-px w-[59%] bg-foreground/40" />
                            <div className="absolute top-[80px] left-[46%] h-[109px] w-[28%] rounded-br-[45px] border-r border-b border-foreground/40" />
                            <div className="absolute top-[188px] left-[26%] h-px w-[20%] bg-foreground/40" />
                            <div className="absolute top-[255px] left-[42%] h-px w-[25%] rotate-[-25deg] bg-primary" />
                            <span className="absolute top-[76px] left-[45.5%] size-2 rounded-full bg-foreground ring-4 ring-muted" />
                            <span className="absolute top-[76px] left-[73.5%] size-2 rounded-full bg-primary ring-4 ring-primary/10" />
                            <span className="absolute top-[185px] left-[64%] size-2 rounded-full bg-primary ring-4 ring-primary/10" />
                            <WorkflowNode
                                className="top-[38px] left-[6%]"
                                eyebrow="STEP 01 · INTAKE"
                                title="Student protocol submission"
                                detail="Documents and forms received"
                                status="Ready"
                                statusTone="ink"
                                icon={<FileCheck2 className="size-3.5" />}
                            />
                            <WorkflowNode
                                className="top-[38px] left-[51%]"
                                eyebrow="STEP 02 · CHECK"
                                title="Completeness review"
                                detail="Checklist validation in progress"
                                status="Verified"
                                statusTone="secondary"
                                icon={
                                    <Check
                                        className="size-3.5"
                                        strokeWidth={3}
                                    />
                                }
                            />
                            <WorkflowNode
                                className="top-[151px] left-[72%]"
                                eyebrow="STEP 03 · DECISION"
                                title="Chairperson classification"
                                detail="Review type is being assigned"
                                statusTone="ink"
                                icon={<GitBranch className="size-3.5" />}
                            />
                            <WorkflowNode
                                className="top-[255px] left-[26%]"
                                eyebrow="STEP 04 · ACTION"
                                title="Researcher follow-up"
                                detail="Next form is dispatched"
                                status="Next"
                                icon={<ArrowRight className="size-3.5" />}
                            />
                            <div className="absolute right-[-35px] bottom-[-36px] size-44 rounded-full border border-border bg-card/70" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Welcome() {
    const { auth } = usePage().props;

    return (
        <>
            <Head title="Research ethics workflows, all in one platform" />
            <main className="relative isolate min-h-[100dvh] overflow-hidden bg-[#27272a] p-4 text-white sm:p-6 lg:p-10">
                <Silk
                    speed={3}
                    scale={0.35}
                    color="#71717a"
                    noiseIntensity={1.15}
                    rotation={0}
                    className="pointer-events-none absolute inset-0 z-0"
                />
                <div className="relative z-10 mx-auto grid min-h-[calc(100dvh-2rem)] w-full max-w-[1320px] overflow-hidden rounded-[12px] border border-white/15 bg-black/20 shadow-[0_22px_70px_rgba(0,0,0,0.24)] backdrop-blur-md sm:min-h-[calc(100dvh-3rem)] lg:min-h-[calc(100dvh-5rem)] lg:grid-cols-[0.92fr_1.08fr]">
                    <section className="flex min-h-[620px] flex-col px-7 pt-7 pb-7 sm:px-12 sm:pt-10 lg:min-h-0 lg:px-[10%] lg:pt-9 lg:pb-8">
                        <header className="flex items-center justify-between">
                            <Link
                                href="/"
                                className="flex items-center gap-3"
                                aria-label="RECHECK home"
                            >
                                <span className="flex size-11 items-center justify-center text-white">
                                    <Scale
                                        className="size-6"
                                        strokeWidth={1.8}
                                    />
                                </span>
                                <span className="text-[15px] font-bold tracking-[-0.04em] text-white">
                                    RECheck
                                </span>
                            </Link>
                        </header>
                        <div className="my-auto max-w-[490px] py-10 lg:py-8">
                            <h1 className="max-w-[465px] text-[clamp(2.65rem,5vw,4.5rem)] leading-[0.97] font-semibold tracking-[-0.07em] text-white">
                                Research ethics workflows,
                                <br />
                                all in one platform.
                            </h1>
                            <p className="mt-7 max-w-[430px] text-[15px] leading-[1.58] text-white/70 sm:text-[16px]">
                                Simplify protocol submissions, reviews,
                                approvals, and documentation with a platform
                                that adapts to your Research Ethics
                                Committee&apos;s workflow.
                            </p>
                            <div className="mt-8 flex flex-wrap items-center gap-3">
                                <Link
                                    href={auth.user ? dashboard() : register()}
                                    className="group inline-flex h-11 items-center gap-3 rounded-[6px] bg-white px-5 text-[13px] font-semibold text-zinc-900 shadow-[0_9px_18px_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:bg-white/90 active:translate-y-0"
                                >
                                    {auth.user ? 'Open dashboard' : 'Register'}
                                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                                </Link>
                                <Link
                                    href={auth.user ? dashboard() : login()}
                                    className="inline-flex h-11 items-center gap-2 rounded-[6px] border border-white/25 bg-white/5 px-5 text-[13px] font-semibold text-white transition hover:border-white/40 hover:bg-white/10 active:scale-[0.98]"
                                >
                                    <LogIn className="size-3.5" />
                                    {auth.user ? 'Dashboard' : 'Login'}
                                </Link>
                            </div>
                        </div>
                    </section>
                    <section
                        id="workflow"
                        className="relative flex min-h-[520px] items-center overflow-hidden bg-white/5 px-5 py-14 sm:px-10 lg:min-h-0 lg:px-[4%]"
                    >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_30%,rgba(255,255,255,0.12),transparent_46%),linear-gradient(145deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.08)_100%)]" />
                        <div className="absolute top-[12%] right-[7%] size-28 rounded-full border border-white/15 bg-white/5" />
                        <div className="absolute bottom-[4%] left-[4%] size-24 rounded-full border border-white/15 bg-white/5" />
                        <div className="relative w-full">
                            <WorkflowPreview />
                        </div>
                    </section>
                </div>
            </main>
            <style>{`@keyframes preview-in { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } } @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }`}</style>
        </>
    );
}
