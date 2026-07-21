import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestNavbar from '@/Components/GuestNavbar';
import { Head, useForm } from '@inertiajs/react';
import { Link } from '@inertiajs/react';

export default function Register({ auth }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <>
            <Head title="Register" />
            <div className="min-h-screen bg-background text-foreground">
                {/* ===== NAVBAR: GuestNavbar component ===== */}
                <GuestNavbar auth={auth} />

                {/* ===== MAIN CONTENT: Register form with shadcn design - handlers untouched ===== */}
                <main className="pt-20 min-h-screen bg-background flex items-center justify-center px-4 py-10 md:px-8 md:py-16">
                    <div className="flex flex-1 flex-col justify-center sm:mx-auto sm:w-full sm:max-w-sm">
                        {/* Card wrapper with shadcn styling - visual change only */}
                        <div className="bg-card border border-border rounded-lg shadow-sm p-6 md:p-8">
                            {/* Header section - visual change only */}
                            <h3 className="text-center text-lg font-semibold text-foreground">
                                Create Account
                            </h3>
                            <p className="text-center text-sm text-muted-foreground mt-2">
                                Join RECheck and start verifying research instantly.
                            </p>

                            {/* Form - handlers UNCHANGED */}
                            <form onSubmit={submit} className="mt-6 space-y-4">
                                {/* Name field - visual change only */}
                                <div>
                                    <InputLabel htmlFor="name" value="Full Name" />
                                    <TextInput
                                        id="name"
                                        name="name"
                                        value={data.name}
                                        className="mt-2 block w-full px-3 py-2"
                                        autoComplete="name"
                                        isFocused={true}
                                        onChange={(e) => setData('name', e.target.value)}
                                        placeholder="John Doe"
                                        required
                                    />
                                    <InputError message={errors.name} className="mt-2" />
                                </div>

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
                                        onChange={(e) => setData('email', e.target.value)}
                                        placeholder="you@example.com"
                                        required
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
                                        autoComplete="new-password"
                                        onChange={(e) => setData('password', e.target.value)}
                                        placeholder="••••••••"
                                        required
                                    />
                                    <InputError message={errors.password} className="mt-2" />
                                </div>

                                {/* Confirm Password field - visual change only */}
                                <div>
                                    <InputLabel
                                        htmlFor="password_confirmation"
                                        value="Confirm Password"
                                    />
                                    <TextInput
                                        id="password_confirmation"
                                        type="password"
                                        name="password_confirmation"
                                        value={data.password_confirmation}
                                        className="mt-2 block w-full px-3 py-2"
                                        autoComplete="new-password"
                                        onChange={(e) =>
                                            setData('password_confirmation', e.target.value)
                                        }
                                        placeholder="••••••••"
                                        required
                                    />
                                    <InputError
                                        message={errors.password_confirmation}
                                        className="mt-2"
                                    />
                                </div>

                                {/* Submit button - visual change only */}
                                <PrimaryButton 
                                    disabled={processing}
                                    className="mt-6 w-full py-2 font-medium"
                                >
                                    {processing ? 'Creating account...' : 'Sign up'}
                                </PrimaryButton>
                            </form>

                            {/* Footer links - visual change only, handlers UNCHANGED */}
                            <div className="mt-6 text-center">
                                <p className="text-sm text-muted-foreground">
                                    Already have an account?{' '}
                                    <Link
                                        href={route('login')}
                                        className="font-medium text-primary hover:text-primary/90 transition"
                                    >
                                        Log in
                                    </Link>
                                </p>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}
