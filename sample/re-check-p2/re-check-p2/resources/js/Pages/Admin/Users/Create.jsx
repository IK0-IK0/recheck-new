import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import RoleSelector from '@/Components/RoleSelector';
import { ArrowLeft } from 'lucide-react';

export default function Create({ roles }) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        theme_color: 'blue',
        roles: [],
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('users.store'));
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
                        Create New User
                    </h2>
                </div>
            }
        >
            <Head title="Create User" />

            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
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
                                        placeholder="John Doe"
                                        required
                                        autoFocus
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
                                        placeholder="john@example.com"
                                        required
                                    />
                                    <InputError message={errors.email} className="mt-2" />
                                </div>

                                {/* Password */}
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                    <div>
                                        <InputLabel htmlFor="password" value="Password" />
                                        <TextInput
                                            id="password"
                                            type="password"
                                            value={data.password}
                                            onChange={(e) => setData('password', e.target.value)}
                                            className="mt-1 block w-full"
                                            placeholder="••••••••"
                                            required
                                        />
                                        <InputError message={errors.password} className="mt-2" />
                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            Minimum 8 characters
                                        </p>
                                    </div>

                                    <div>
                                        <InputLabel htmlFor="password_confirmation" value="Confirm Password" />
                                        <TextInput
                                            id="password_confirmation"
                                            type="password"
                                            value={data.password_confirmation}
                                            onChange={(e) => setData('password_confirmation', e.target.value)}
                                            className="mt-1 block w-full"
                                            placeholder="••••••••"
                                            required
                                        />
                                        <InputError message={errors.password_confirmation} className="mt-2" />
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
                                        {processing ? 'Creating...' : 'Create User'}
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
