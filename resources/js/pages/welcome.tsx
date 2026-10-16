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

import { dashboard, login, register } from '@/routes';

type WorkflowNodeProps = {
    className?: string;
    eyebrow: string;
    icon: React.ReactNode;
    title: string;
    detail: string;
    status?: string;
    statusTone?: 'blue' | 'mint' | 'ink';
};

function WorkflowNode({
    className = '',
    eyebrow,
    icon,
    title,
    detail,
    status,
    statusTone = 'blue',
}: WorkflowNodeProps) {
    const iconTone = {
        blue: 'bg-[#5b4cf4]',
        mint: 'bg-[#7b72f4]',
        ink: 'bg-[#182338]',
    }[statusTone];

    return (
        <div
            className={`absolute z-10 w-[150px] rounded-[8px] border border-[#dce3ec] bg-white p-3 shadow-[0_8px_22px_rgba(32,57,86,0.1)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_14px_28px_rgba(32,57,86,0.16)] sm:w-[178px] sm:p-3.5 ${className}`}
        >
            <div className="mb-2 flex items-start justify-between gap-2">
                <div
                    className={`flex size-7 shrink-0 items-center justify-center rounded-[5px] text-white ${iconTone}`}
                >
                    {icon}
                </div>
                {status && (
                    <span
                        className={`rounded-full px-2 py-1 text-[8px] font-bold tracking-[0.03em] ${statusTone === 'mint' ? 'bg-[#eeecff] text-[#5148d8]' : 'bg-[#eeecff] text-[#5148d8]'}`}
                    >
                        {status}
                    </span>
                )}
            </div>
            <p className="mb-1 text-[8px] font-bold tracking-[0.08em] text-[#8090a1] uppercase">
                {eyebrow}
            </p>
            <p className="text-[11px] leading-[1.25] font-bold text-[#182338] sm:text-[12px]">
                {title}
            </p>
            <p className="mt-1 text-[9px] leading-[1.35] text-[#7c8b9b]">
                {detail}
            </p>
        </div>
    );
}

function WorkflowPreview() {
    return (
        <div className="relative mx-auto w-full max-w-[660px] animate-[preview-in_850ms_ease-out_both]">
            <div className="absolute -inset-10 rounded-[48px] bg-[radial-gradient(circle_at_70%_45%,rgba(196,198,255,0.72),rgba(239,241,255,0)_66%)] blur-2xl" />
            <div className="relative overflow-hidden rounded-[10px] border border-white bg-white shadow-[0_28px_70px_rgba(47,67,109,0.2)] transition duration-500 hover:shadow-[0_34px_80px_rgba(47,67,109,0.25)]">
                <div className="flex h-9 items-center gap-1.5 border-b border-[#e9edf3] bg-[#fafbfd] px-3.5">
                    <span className="size-2.5 rounded-full bg-[#cad5e2]" />
                    <span className="size-2.5 rounded-full bg-[#adbdcf]" />
                    <span className="size-2.5 rounded-full bg-[#71869e]" />
                    <div className="ml-3 flex h-5.5 max-w-[290px] flex-1 items-center gap-1.5 rounded-[4px] border border-[#e5eaf1] bg-white px-2.5 text-[8px] text-[#8997a7] shadow-sm">
                        <ShieldCheck className="size-3 text-[#5b4cf4]" />
                        <span>app.recheck.com / review</span>
                    </div>
                    <span className="ml-auto size-3 rounded-[3px] border border-[#c4d0dc]" />
                </div>
                <div className="flex h-[390px] bg-[#f8f8ff] sm:h-[445px]">
                    <aside className="hidden w-[118px] shrink-0 border-r border-[#e9edf3] bg-white p-3 sm:block">
                        <div className="mb-7 flex items-center gap-1.5 text-[9px] font-bold text-[#182338]">
                            <span className="flex size-5 items-center justify-center text-[#182338]">
                                <Scale className="size-3" />
                            </span>
                            RECheck
                        </div>
                        <p className="mb-2 text-[7px] font-bold tracking-[0.1em] text-[#a0adbb] uppercase">
                            Workspace
                        </p>
                        <div className="mb-1 flex items-center gap-2 rounded-[5px] bg-[#eeecff] px-2 py-2 text-[9px] font-semibold text-[#5b4cf4]">
                            <GitBranch className="size-3" />
                            Workflows
                        </div>
                        <div className="flex items-center gap-2 px-2 py-2 text-[9px] text-[#8391a1]">
                            <FileCheck2 className="size-3" />
                            Submissions
                        </div>
                        <div className="flex items-center gap-2 px-2 py-2 text-[9px] text-[#8391a1]">
                            <Check className="size-3" />
                            Reports
                        </div>
                        <div className="mt-12 border-t border-[#eef1f5] pt-3 text-[8px] leading-[1.4] text-[#9aa7b5]">
                            Committee workspace
                            <br />
                            <span className="font-semibold text-[#52657a]">
                                UIC Research Office
                            </span>
                        </div>
                    </aside>
                    <div className="relative min-w-0 flex-1 overflow-hidden">
                        <div className="flex h-12 items-center justify-between border-b border-[#e9edf3] bg-white px-4 sm:px-5">
                            <div>
                                <p className="text-[8px] text-[#8b99a9]">
                                    Workflow
                                </p>
                                <p className="text-[13px] font-bold tracking-[-0.03em] text-[#182338]">
                                    Protocol review pipeline
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="hidden rounded-full bg-[#eeecff] px-2 py-1 text-[8px] font-bold text-[#5148d8] sm:inline-flex">
                                    Synced just now
                                </span>
                                <span className="size-6 rounded-full bg-[#e9efff]" />
                            </div>
                        </div>
                        <div className="relative h-[338px] overflow-hidden bg-[#fbfcff] sm:h-[393px]">
                            <div className="absolute inset-0 [background-image:radial-gradient(#cbd8e7_1px,transparent_1px)] [background-size:16px_16px] opacity-55" />
                            <div className="absolute top-[80px] left-[18%] h-px w-[59%] bg-[#5b6e84]" />
                            <div className="absolute top-[80px] left-[46%] h-[109px] w-[28%] rounded-br-[45px] border-r border-b border-[#5b6e84]" />
                            <div className="absolute top-[188px] left-[26%] h-px w-[20%] bg-[#5b6e84]" />
                            <div className="absolute top-[255px] left-[42%] h-px w-[25%] rotate-[-25deg] bg-[#5b4cf4]" />
                            <span className="absolute top-[76px] left-[45.5%] size-2 rounded-full bg-[#182338] ring-4 ring-[#edf1f6]" />
                            <span className="absolute top-[76px] left-[73.5%] size-2 rounded-full bg-[#5b4cf4] ring-4 ring-[#eeecff]" />
                            <span className="absolute top-[185px] left-[64%] size-2 rounded-full bg-[#5b4cf4] ring-4 ring-[#eeecff]" />
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
                                statusTone="mint"
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
                            <div className="absolute right-[-35px] bottom-[-36px] size-44 rounded-full border border-[#dfe7f2] bg-white/70" />
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
            <main className="min-h-[100dvh] overflow-hidden bg-[#f3f3ff] p-4 text-[#111c2c] sm:p-6 lg:p-10">
                <div className="mx-auto grid min-h-[calc(100dvh-2rem)] w-full max-w-[1320px] overflow-hidden rounded-[12px] bg-white shadow-[0_22px_70px_rgba(71,66,155,0.12)] sm:min-h-[calc(100dvh-3rem)] lg:min-h-[calc(100dvh-5rem)] lg:grid-cols-[0.92fr_1.08fr]">
                    <section className="flex min-h-[620px] flex-col px-7 pt-7 pb-7 sm:px-12 sm:pt-10 lg:min-h-0 lg:px-[10%] lg:pt-9 lg:pb-8">
                        <header className="flex items-center justify-between">
                            <Link
                                href="/"
                                className="flex items-center gap-3"
                                aria-label="RECHECK home"
                            >
                                <span className="flex size-11 items-center justify-center text-[#182338]">
                                    <Scale
                                        className="size-6"
                                        strokeWidth={1.8}
                                    />
                                </span>
                                <span className="text-[15px] font-bold tracking-[-0.04em] text-[#182338]">
                                    RECheck
                                </span>
                            </Link>
                        </header>
                        <div className="my-auto max-w-[490px] py-10 lg:py-8">
                            <h1 className="max-w-[465px] text-[clamp(2.65rem,5vw,4.5rem)] leading-[0.97] font-semibold tracking-[-0.07em] text-[#182338]">
                                Research ethics workflows,
                                <br />
                                all in one platform.
                            </h1>
                            <p className="mt-7 max-w-[430px] text-[15px] leading-[1.58] text-[#62738a] sm:text-[16px]">
                                Simplify protocol submissions, reviews,
                                approvals, and documentation with a platform
                                that adapts to your Research Ethics
                                Committee&apos;s workflow.
                            </p>
                            <div className="mt-8 flex flex-wrap items-center gap-3">
                                <Link
                                    href={auth.user ? dashboard() : register()}
                                    className="group inline-flex h-11 items-center gap-3 rounded-[6px] bg-[#5b4cf4] px-5 text-[13px] font-semibold text-white shadow-[0_9px_18px_rgba(91,76,244,0.2)] transition hover:-translate-y-0.5 hover:bg-[#4a3be5] active:translate-y-0"
                                >
                                    {auth.user ? 'Open dashboard' : 'Register'}
                                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                                </Link>
                                <Link
                                    href={auth.user ? dashboard() : login()}
                                    className="inline-flex h-11 items-center gap-2 rounded-[6px] border border-[#d9e1eb] bg-white px-5 text-[13px] font-semibold text-[#40536a] transition hover:border-[#aebdce] hover:bg-[#f8fafc] active:scale-[0.98]"
                                >
                                    <LogIn className="size-3.5" />
                                    {auth.user ? 'Dashboard' : 'Login'}
                                </Link>
                            </div>
                        </div>
                    </section>
                    <section
                        id="workflow"
                        className="relative flex min-h-[520px] items-center overflow-hidden bg-[#f3f3ff] px-5 py-14 sm:px-10 lg:min-h-0 lg:px-[4%]"
                    >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_30%,rgba(226,225,255,0.96),transparent_46%),linear-gradient(145deg,#fbfbff_0%,#f5f4ff_48%,#efefff_100%)]" />
                        <div className="absolute top-[12%] right-[7%] size-28 rounded-full border border-white/90 bg-white/20" />
                        <div className="absolute bottom-[4%] left-[4%] size-24 rounded-full border border-white/90 bg-white/20" />
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
