import { Form, Head, usePage } from '@inertiajs/react';
import { Link } from '@inertiajs/react';
import { useRef, useState } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import SecurityController from '@/actions/App/Http/Controllers/Settings/SecurityController';
import DeleteUser from '@/components/delete-user';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { THEME_COLORS } from '@/constants/workflowConstants';
import { cn } from '@/lib/utils';
import { send } from '@/routes/verification';
import type { Auth } from '@/types';

type PageProps = {
    auth: Auth;
};

const THEME_COLOR_CLASSES: Record<string, string> = {
    zinc: 'bg-zinc-600',
    slate: 'bg-slate-600',
    stone: 'bg-stone-600',
    gray: 'bg-gray-600',
    neutral: 'bg-neutral-600',
    red: 'bg-red-600',
    rose: 'bg-rose-600',
    orange: 'bg-orange-500',
    amber: 'bg-amber-500',
    yellow: 'bg-yellow-400',
    lime: 'bg-lime-500',
    green: 'bg-emerald-600',
    teal: 'bg-teal-600',
};

export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth } = usePage<PageProps>().props;
    const isAdmin = auth.user.role === 'admin';
    const [themeColor, setThemeColor] = useState(
        auth.user.theme_color ?? 'zinc'
    );
    const [themeColorChanged, setThemeColorChanged] = useState(false);
    const [hoveredColor, setHoveredColor] = useState<string | null>(null);
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    return (
        <>
            <Head title="Profile Settings" />
            
            <div className="p-6">
                <div className="mx-auto max-w-2xl space-y-4">
                <div className="rounded-lg border border-border bg-background/60 p-4 shadow-sm">
                    <h2 className="text-sm font-semibold mb-3">Profile Information</h2>
                    <Form
                        {...ProfileController.update.form()}
                        options={{
                            preserveScroll: true,
                        }}
                        onSuccess={() => {
                            if (themeColorChanged) {
                                window.location.reload();
                            }
                        }}
                        className="space-y-4"
                    >
                        {({ processing, errors, isDirty }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="name" className="text-xs">Name</Label>
                                    <Input
                                        id="name"
                                        className="h-9 text-sm"
                                        defaultValue={auth.user.name}
                                        name="name"
                                        required
                                        autoComplete="name"
                                        placeholder="Full name"
                                    />
                                    <InputError className="mt-1" message={errors.name} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="email" className="text-xs">Email address</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        className="h-9 text-sm"
                                        defaultValue={auth.user.email}
                                        name="email"
                                        required
                                        autoComplete="username"
                                        placeholder="Email address"
                                    />
                                    <InputError className="mt-1" message={errors.email} />
                                </div>

                                <div className="grid gap-2">
                                    <Label className="text-xs">Theme color</Label>
                                    <div className="flex w-full gap-1">
                                        {THEME_COLORS.map((color) => {
                                            const selected = themeColor === color;
                                            const isHovered = hoveredColor === color;
                                            const shouldExpand = isHovered || (selected && !hoveredColor);

                                            return (
                                                <label
                                                    key={color}
                                                    onMouseEnter={() => setHoveredColor(color)}
                                                    onMouseLeave={() => setHoveredColor(null)}
                                                    className={cn(
                                                        'relative cursor-pointer overflow-hidden rounded-md transition-all duration-300 ease-in-out',
                                                        'h-24',
                                                        shouldExpand ? 'basis-16 flex-shrink-0 flex-grow-0' : 'basis-4 flex-grow flex-shrink'
                                                    )}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="theme_color"
                                                        value={color}
                                                        checked={selected}
                                                        onChange={() => {
                                                            setThemeColor(color);
                                                            setThemeColorChanged(color !== (auth.user.theme_color ?? 'zinc'));
                                                        }}
                                                        className="sr-only"
                                                    />
                                                    <div className={cn(
                                                        'relative flex h-full w-full flex-col items-center justify-center rounded-md transition-all duration-300',
                                                        THEME_COLOR_CLASSES[color] ?? 'bg-muted',
                                                        selected && 'ring-2 ring-inset ring-foreground'
                                                    )} />
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>

                                {mustVerifyEmail && auth.user.email_verified_at === null && (
                                    <div>
                                        <p className="text-xs text-muted-foreground">
                                            Your email address is unverified.{' '}
                                            <Link
                                                href={send()}
                                                as="button"
                                                className="text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500"
                                            >
                                                Click here to re-send the verification email.
                                            </Link>
                                        </p>

                                        {status === 'verification-link-sent' && (
                                            <div className="mt-2 text-xs font-medium text-green-600">
                                                A new verification link has been sent to your email address.
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex items-center gap-3 pt-2">
                                    <Button
                                        disabled={processing || !isDirty}
                                        data-test="update-profile-button"
                                        size="sm"
                                        variant={isDirty ? 'default' : 'outline'}
                                        className="h-8 text-xs"
                                    >
                                        Save Changes
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>
                </div>

                {!isAdmin && <div className="rounded-lg border border-border bg-background/60 p-4 shadow-sm">
                    <h2 className="text-sm font-semibold mb-3">Update Password</h2>
                    <Form
                        {...SecurityController.update.form()}
                        options={{
                            preserveScroll: true,
                        }}
                        resetOnError={['password', 'password_confirmation', 'current_password']}
                        onError={(errors) => {
                            if (errors.password) {
                                passwordInput.current?.focus();
                            }

                            if (errors.current_password) {
                                currentPasswordInput.current?.focus();
                            }
                        }}
                        className="space-y-4"
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="current_password" className="text-xs">
                                        Current password
                                    </Label>
                                    <PasswordInput
                                        id="current_password"
                                        ref={currentPasswordInput}
                                        name="current_password"
                                        className="h-9 text-sm"
                                        autoComplete="current-password"
                                        placeholder="Current password"
                                    />
                                    <InputError className="mt-1" message={errors.current_password} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="password" className="text-xs">New password</Label>
                                    <PasswordInput
                                        id="password"
                                        ref={passwordInput}
                                        name="password"
                                        className="h-9 text-sm"
                                        autoComplete="new-password"
                                        placeholder="New password"
                                    />
                                    <InputError className="mt-1" message={errors.password} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="password_confirmation" className="text-xs">
                                        Confirm password
                                    </Label>
                                    <PasswordInput
                                        id="password_confirmation"
                                        name="password_confirmation"
                                        className="h-9 text-sm"
                                        autoComplete="new-password"
                                        placeholder="Confirm password"
                                    />
                                    <InputError className="mt-1" message={errors.password_confirmation} />
                                </div>

                                <div className="flex items-center gap-3 pt-2">
                                    <Button
                                        disabled={processing}
                                        data-test="update-password-button"
                                        size="sm"
                                        className="h-8 text-xs"
                                    >
                                        Update Password
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>
                </div>}

                {!isAdmin && <DeleteUser />}
                </div>
            </div>
        </>
    );
}
