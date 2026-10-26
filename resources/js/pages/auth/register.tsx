import { Form, Head } from '@inertiajs/react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { login } from '@/routes';
import { store } from '@/routes/register';

type Props = {
    passwordRules: string;
    institutions: Institution[];
};

type Institution = {
    id: number;
    name: string;
};

export default function Register({ passwordRules, institutions }: Props) {
    const [selectedInstitutionId, setSelectedInstitutionId] = useState<number | null>(null);
    const [formValues, setFormValues] = useState({
        name: '',
        email: '',
        password: '',
        passwordConfirmation: '',
    });
    const [institutionSearch, setInstitutionSearch] = useState('');
    const [isInstitutionPickerOpen, setIsInstitutionPickerOpen] = useState(false);
    const institutionPickerRef = useRef<HTMLDivElement>(null);
    const selectedInstitution = institutions.find(
        (institution) => institution.id === selectedInstitutionId,
    );
    const filteredInstitutions = useMemo(() => {
        const normalizedSearch = institutionSearch.trim().toLowerCase();

        return institutions.filter((institution) =>
            institution.name.toLowerCase().includes(normalizedSearch),
        );
    }, [institutionSearch, institutions]);

    useEffect(() => {
        const closePickerOnOutsideClick = (event: MouseEvent) => {
            if (!institutionPickerRef.current?.contains(event.target as Node)) {
                setIsInstitutionPickerOpen(false);
                setInstitutionSearch('');
            }
        };

        document.addEventListener('mousedown', closePickerOnOutsideClick);

        return () => document.removeEventListener('mousedown', closePickerOnOutsideClick);
    }, []);

    return (
        <>
            <Head title="Register" />
            <Form
                {...store.form()}
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="name"
                                    name="name"
                                    onChange={(event) =>
                                        setFormValues((values) => ({ ...values, name: event.target.value }))
                                    }
                                    placeholder="Full name"
                                />
                                <InputError
                                    message={errors.name}
                                    className="mt-2"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="institution-picker">Institution</Label>
                                <input
                                    type="hidden"
                                    name="institution_id"
                                    value={selectedInstitutionId ?? ''}
                                />
                                <div className="relative" ref={institutionPickerRef}>
                                    <Button
                                        type="button"
                                        id="institution-picker"
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={isInstitutionPickerOpen}
                                        aria-controls="institution-options"
                                        aria-label="Choose your institution"
                                        aria-required="true"
                                        disabled={processing || institutions.length === 0}
                                        onClick={() => {
                                            setInstitutionSearch('');
                                            setIsInstitutionPickerOpen((isOpen) => !isOpen);
                                        }}
                                        className="w-full justify-between font-normal"
                                    >
                                        <span className={selectedInstitution ? 'truncate' : 'truncate text-muted-foreground'}>
                                            {selectedInstitution?.name ?? 'Select your institution'}
                                        </span>
                                        <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden="true" />
                                    </Button>
                                    {isInstitutionPickerOpen && (
                                        <div className="absolute top-full z-50 mt-1 w-full rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md">
                                            <div className="relative p-1">
                                                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                                                <Input
                                                    aria-label="Search institutions"
                                                    autoFocus
                                                    className="pl-9"
                                                    onChange={(event) => setInstitutionSearch(event.target.value)}
                                                    onKeyDown={(event) => {
                                                        if (event.key === 'Escape') {
                                                            setIsInstitutionPickerOpen(false);
                                                            setInstitutionSearch('');
                                                        }
                                                    }}
                                                    placeholder="Search institutions..."
                                                    value={institutionSearch}
                                                />
                                            </div>
                                            <div
                                                id="institution-options"
                                                aria-label="Institutions"
                                                role="listbox"
                                                className="max-h-40 overflow-y-auto"
                                            >
                                                {filteredInstitutions.length > 0 ? (
                                                    filteredInstitutions.map((institution) => (
                                                        <button
                                                            key={institution.id}
                                                            type="button"
                                                            role="option"
                                                            aria-selected={institution.id === selectedInstitutionId}
                                                            onClick={() => {
                                                                setSelectedInstitutionId(institution.id);
                                                                setIsInstitutionPickerOpen(false);
                                                                setInstitutionSearch('');
                                                            }}
                                                            className="flex h-10 w-full items-center justify-between gap-2 rounded-sm px-2 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground"
                                                        >
                                                            <span className="truncate">{institution.name}</span>
                                                            {institution.id === selectedInstitutionId && (
                                                                <Check className="size-4 shrink-0" aria-hidden="true" />
                                                            )}
                                                        </button>
                                                    ))
                                                ) : (
                                                    <p className="px-2 py-3 text-sm text-muted-foreground">
                                                        No institutions found.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <InputError message={errors.institution_id} />
                                {institutions.length === 0 && (
                                    <p className="text-sm text-muted-foreground">
                                        No institutions are available for registration.
                                    </p>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    tabIndex={2}
                                    autoComplete="email"
                                    name="email"
                                    onChange={(event) =>
                                        setFormValues((values) => ({ ...values, email: event.target.value }))
                                    }
                                    placeholder="email@example.com"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password">Password</Label>
                                <PasswordInput
                                    id="password"
                                    required
                                    tabIndex={3}
                                    autoComplete="new-password"
                                    name="password"
                                    onChange={(event) =>
                                        setFormValues((values) => ({ ...values, password: event.target.value }))
                                    }
                                    placeholder="Password"
                                    passwordrules={passwordRules}
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password_confirmation">
                                    Confirm password
                                </Label>
                                <PasswordInput
                                    id="password_confirmation"
                                    required
                                    tabIndex={4}
                                    autoComplete="new-password"
                                    name="password_confirmation"
                                    onChange={(event) =>
                                        setFormValues((values) => ({
                                            ...values,
                                            passwordConfirmation: event.target.value,
                                        }))
                                    }
                                    placeholder="Confirm password"
                                    passwordrules={passwordRules}
                                />
                                {formValues.passwordConfirmation
                                    && formValues.password !== formValues.passwordConfirmation && (
                                        <p className="text-sm text-destructive">Passwords do not match.</p>
                                    )}
                                <InputError
                                    message={errors.password_confirmation}
                                />
                            </div>

                            <Button
                                type="submit"
                                className="mt-2 w-full"
                                tabIndex={5}
                                disabled={
                                    processing
                                    || selectedInstitutionId === null
                                    || !formValues.name.trim()
                                    || !formValues.email.trim()
                                    || !formValues.password
                                    || !formValues.passwordConfirmation
                                    || formValues.password !== formValues.passwordConfirmation
                                }
                                data-test="register-user-button"
                            >
                                {processing && <Spinner />}
                                Create account
                            </Button>
                        </div>

                        <div className="text-center text-sm text-muted-foreground">
                            Already have an account?{' '}
                            <TextLink href={login()} tabIndex={6}>
                                Log in
                            </TextLink>
                        </div>
                    </>
                )}
            </Form>
        </>
    );
}

Register.layout = {
    title: 'Create an account',
    description: 'Create a tenant account and choose your institution.',
};
