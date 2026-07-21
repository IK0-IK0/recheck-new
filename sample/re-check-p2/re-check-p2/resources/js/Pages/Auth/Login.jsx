import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestNavbar from '@/Components/GuestNavbar';
import { Head, useForm } from '@inertiajs/react';
import { Link } from '@inertiajs/react';

export default function Login({ status, canResetPassword, auth }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <>
            <Head title="Log in" />
            <div className="min-h-screen bg-background text-foreground">
                {/* ===== NAVBAR: GuestNavbar component ===== */}
                <GuestNavbar auth={auth} />

                {/* ===== MAIN CONTENT: Login form with shadcn design - handlers untouched ===== */}
                <main className="pt-20 min-h-screen bg-background flex items-center justify-center px-4 py-10 md:px-8 md:py-16">
                    <div className="flex flex-1 flex-col justify-center sm:mx-auto sm:w-full sm:max-w-sm">
                        {/* Status message - visual change only */}
                        {status && (
                            <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 text-sm font-medium">
                                {status}
                            </div>
                        )}

                        {/* Card wrapper with shadcn styling - visual change only */}
                        <div className="bg-card border border-border rounded-lg shadow-sm p-6 md:p-8">
                            {/* Header section - visual change only */}
                            <h3 className="text-center text-lg font-semibold text-foreground">
                                Welcome Back
                            </h3>
                            <p className="text-center text-sm text-muted-foreground mt-2">
                                Enter your credentials to access your account.
                            </p>

                            {/* Form - handlers UNCHANGED */}
                            <form onSubmit={submit} className="mt-6 space-y-4">
                                {/* Email field - visual change only */}
                                <div>
                                    <InputLabel htmlFor="email" value="Email" />
                                    <TextInput
                                        id="email"
                                        type="email"
                                        name="email"
                                        value={data.email}
                                        className="mt-2 block w-full px-3 py-2"
                                        autoComplete="username"
                                        isFocused={true}
                                        onChange={(e) => setData('email', e.target.value)}
                                        placeholder="you@example.com"
                                    />
                                    <InputError message={errors.email} className="mt-2" />
                                </div>

                                {/* Password field - visual change only */}
                                <div>
                                    <InputLabel htmlFor="password" value="Password" />
                                    <TextInput
                                        id="password"
                                        type="password"
                                        name="password"
                                        value={data.password}
                                        className="mt-2 block w-full px-3 py-2"
                                        autoComplete="current-password"
                                        onChange={(e) => setData('password', e.target.value)}
                                        placeholder="••••••••"
                                    />
                                    <InputError message={errors.password} className="mt-2" />
                                </div>

                                {/* Remember me checkbox - visual change only, handler UNCHANGED */}
                                <div className="flex items-center">
                                    <Checkbox
                                        id="remember"
                                        name="remember"
                                        checked={data.remember}
                                        onChange={(e) =>
                                            setData('remember', e.target.checked)
                                        }
                                    />
                                    <label htmlFor="remember" className="ms-2 text-sm text-muted-foreground cursor-pointer">
                                        Remember me
                                    </label>
                                </div>

                                {/* Submit button - visual change only */}
                                <PrimaryButton
                                    disabled={processing}
                                    className="mt-6 w-full py-2 font-medium"
                                >
                                    {processing ? 'Signing in...' : 'Sign in'}
                                </PrimaryButton>
                            </form>

                            {/* Footer links - visual change only, handlers UNCHANGED */}
                            <div className="mt-6 text-center">
                                <p className="text-sm text-muted-foreground">
                                    <>
                                        <Link
                                            href="/forgot-pass"
                                            className="font-medium text-primary hover:text-primary/90 transition"
                                        >
                                            Forgot your password?
                                        </Link>
                                    </>
                                </p>
                                <p className="text-sm text-muted-foreground mt-4">
                                    Don't have an account?{' '}
                                    <Link
                                        href={route('register')}
                                        className="font-medium text-primary hover:text-primary/90 transition"
                                    >
                                        Sign up
                                    </Link>
                                </p>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </>
    )
}