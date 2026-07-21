import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import ThemeToggle from './Partials/ThemeToggle';

export default function Edit({ mustVerifyEmail, status }) {
    return (
        <AuthenticatedLayout>
            <Head title="Profile" />

            <div className="space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Profile Settings</h1>
                    <p className="mt-2 text-sm text-muted-foreground">Manage your account settings and preferences</p>
                </div>

                {/* Profile Card */}
                <div className="bg-card border border-border rounded-lg p-6">
                    <UpdateProfileInformationForm
                        mustVerifyEmail={mustVerifyEmail}
                        status={status}
                    />
                </div>

                {/* Password Card */}
                <div className="bg-card border border-border rounded-lg p-6">
                    <UpdatePasswordForm />
                </div>

                {/* Theme Card */}
                <div className="bg-card border border-border rounded-lg p-6">
                    <ThemeToggle />
                </div>

                {/* Delete Card */}
                <div className="bg-card border border-border rounded-lg p-6">
                    <DeleteUserForm />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
