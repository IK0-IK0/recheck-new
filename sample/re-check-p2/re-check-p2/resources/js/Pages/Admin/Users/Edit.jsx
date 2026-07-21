import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import RoleSelector from '@/Components/RoleSelector';
import { ArrowLeft, Calendar } from 'lucide-react';

export default function Edit({ user, roles }) {
    const { data, setData, patch, processing, errors } = useForm({
        name: user.name,
        email: user.email,
        password: '',
        password_confirmation: '',
        theme_color: user.theme_color,
        roles: user.role_ids || [],
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        patch(route('users.update', user.id));
    };

    const themeColors = [
        { name: 'Black', value: 'black' },
        { name: 'Blue', value: 'blue' },
        { name: 'Purple', value: 'purple' },
        { name: 'Pink', value: 'pink' },
        { name: 'Red', value: 'red' },
        { name: 'Orange', value: 'orange' },
        { name: 'Amber', value: 'amber' },
        { name: 'Green', value: 'green' },
        { name: 'Emerald', value: 'emerald' },
        { name: 'Teal', value: 'teal' },
        { name: 'Cyan', value: 'cyan' },
        { name: 'Indigo', value: 'indigo' },
        { name: 'Slate', value: 'slate' },
    ];

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center gap-4">
                    <Link href={route('users.index')}>
                        <SecondaryButton>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </SecondaryButton>
                    </Link>
                    <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                        Edit User: {user.name}
                    </h2>
                </div>
            }
        >
            <Head title={`Edit User: ${user.name}`} />

            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    {/* User Info Card */}
                    <div className="mb-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
                        <div className="flex items-start gap-4">
                            <div className="h-16 w-16 flex-shrink-0">
                                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-semibold">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                            </div>
                            <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {user.name}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    {user.email}
                                </div>
                                <div className="mt-2 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                    <Calendar className="h-3 w-3" />
                                    Joined {user.created_at}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg dark:bg-gray-800">
                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="space-y-6">
                                {/* Name */}
                                <div>
                                    <InputLabel htmlFor="name" value="Full Name" />
                                    <TextInput
                                        id="name"
                                        type="text"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        className="mt-1 block w-full"
                                        required
                                    />
                                    <InputError message={errors.name} className="mt-2" />
                                </div>

                                {/* Email */}
                                <div>
                                    <InputLabel htmlFor="email" value="Email Address" />
                                    <TextInput
                                        id="email"
                                        type="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        className="mt-1 block w-full"
                                        required
                                    />
                                    <InputError message={errors.email} className="mt-2" />
                                </div>

                                {/* Password */}
                                <div>
                                    <div className="mb-2 flex items-center justify-between">
                                        <InputLabel value="Change Password (Optional)" />
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            Leave empty to keep current password
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <TextInput
                                                id="password"
                                                type="password"
                                                value={data.password}
                                                onChange={(e) => setData('password', e.target.value)}
                                                className="mt-1 block w-full"
                                                placeholder="New password"
                                            />
                                            <InputError message={errors.password} className="mt-2" />
                                        </div>

                                        <div>
                                            <TextInput
                                                id="password_confirmation"
                                                type="password"
                                                value={data.password_confirmation}
                                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                                className="mt-1 block w-full"
                                                placeholder="Confirm new password"
                                            />
                                            <InputError message={errors.password_confirmation} className="mt-2" />
                                        </div>
                                    </div>
                                </div>

                                {/* Theme Color */}
                                <div>
                                    <InputLabel htmlFor="theme_color" value="Theme Color" />
                                    <select
                                        id="theme_color"
                                        value={data.theme_color}
                                        onChange={(e) => setData('theme_color', e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                                    >
                                        {themeColors.map((color) => (
                                            <option key={color.value} value={color.value}>
                                                {color.name}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.theme_color} className="mt-2" />
                                </div>

                                {/* Roles */}
                                <div>
                                    <InputLabel htmlFor="roles" value="Assign Roles" />
                                    <div className="mt-1">
                                        <RoleSelector
                                            roles={roles}
                                            selectedRoles={data.roles}
                                            onChange={(selected) => setData('roles', selected)}
                                        />
                                    </div>
                                    <InputError message={errors.roles} className="mt-2" />
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        Select one or more roles for this user
                                    </p>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center justify-end gap-4 border-t border-gray-200 pt-6 dark:border-gray-700">
                                    <Link href={route('users.index')}>
                                        <SecondaryButton type="button">Cancel</SecondaryButton>
                                    </Link>
                                    <PrimaryButton type="submit" disabled={processing}>
                                        {processing ? 'Saving...' : 'Save Changes'}
                                    </PrimaryButton>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
