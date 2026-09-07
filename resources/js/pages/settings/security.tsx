import { Form, Head } from '@inertiajs/react';
import { useRef } from 'react';
import SecurityController from '@/actions/App/Http/Controllers/Settings/SecurityController';
import DeleteUser from '@/components/delete-user';
import InputError from '@/components/input-error';
import type { Props as ManageTwoFactorProps } from '@/components/manage-two-factor';
import ManageTwoFactor from '@/components/manage-two-factor';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

type Props = {
    passwordRules: string;
} & ManageTwoFactorProps;

export default function Security(props: Props) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    return (
        <>
            <Head title="Security Settings" />
            
            <div className="p-4">
                <div className="mx-auto max-w-2xl space-y-3">
                <Dialog>
                    <div className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3 shadow-sm">
                        <div>
                            <h2 className="text-sm font-semibold">Update Password</h2>
                            <p className="mt-0.5 text-xs text-muted-foreground">Change your account password.</p>
                        </div>
                        <DialogTrigger asChild>
                            <Button size="sm" className="h-8 text-xs">Update</Button>
                        </DialogTrigger>
                    </div>
                    <DialogContent>
                        <DialogTitle>Update password</DialogTitle>
                        <DialogDescription>Enter your current password and choose a new one.</DialogDescription>
                    <Form
                        {...SecurityController.update.form()}
                        options={{
                            preserveScroll: true,
                        }}
                        resetOnError={[
                            'password',
                            'password_confirmation',
                            'current_password',
                        ]}
                        resetOnSuccess
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
                        {({ errors, processing }) => (
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
                                    <InputError message={errors.current_password} />
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
                                        passwordrules={props.passwordRules}
                                    />
                                    <InputError message={errors.password} />
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
                                        passwordrules={props.passwordRules}
                                    />
                                    <InputError message={errors.password_confirmation} />
                                </div>

                                <div className="flex items-center gap-3 pt-2">
                                    <Button
                                        disabled={processing}
                                        data-test="update-password-button"
                                        size="sm"
                                        className="h-8 text-xs"
                                    >
                                        {processing ? 'Updating...' : 'Update Password'}
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>
                    </DialogContent>
                </Dialog>

                <Dialog>
                    <div className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3 shadow-sm">
                        <div>
                            <h2 className="text-sm font-semibold">Two-Factor Authentication</h2>
                            <p className="mt-0.5 text-xs text-muted-foreground">Manage your login verification settings.</p>
                        </div>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 text-xs">Manage</Button>
                        </DialogTrigger>
                    </div>
                    <DialogContent className="max-w-2xl">
                        <DialogTitle>Two-factor authentication</DialogTitle>
                        <DialogDescription>Manage your two-factor authentication settings.</DialogDescription>
                        <ManageTwoFactor
                            canManageTwoFactor={props.canManageTwoFactor}
                            requiresConfirmation={props.requiresConfirmation}
                            twoFactorEnabled={props.twoFactorEnabled}
                        />
                    </DialogContent>
                </Dialog>
                <DeleteUser />
                </div>
            </div>
        </>
    );
}
