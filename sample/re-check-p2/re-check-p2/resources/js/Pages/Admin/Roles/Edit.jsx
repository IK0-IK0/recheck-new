import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import PermissionSelector from '@/Components/PermissionSelector';
import { ArrowLeft, Shield } from 'lucide-react';

export default function Edit({ role, permissions }) {
    const { data, setData, patch, processing, errors } = useForm({
        name: role.name,
        description: role.description || '',
        permissions: role.permission_ids || [],
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        patch(route('roles.update', role.id));
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center gap-4">
                    <Link href={route('roles.index')}>
                        <SecondaryButton>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </SecondaryButton>
                    </Link>
                    <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                        Edit Role: {role.name}
                    </h2>
                    {role.is_protected && (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                            <Shield className="mr-1 h-3 w-3" />
                            Protected Role
                        </span>
                    )}
                </div>
            }
        >
            <Head title={`Edit Role: ${role.name}`} />

            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    {/* Info Banner for Protected Roles */}
                    {role.is_protected && (
                        <div className="mb-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                            <div className="flex items-start gap-3">
                                <Shield className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400" />
                                <div className="flex-1">
                                    <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                                        Protected Role
                                    </h3>
                                    <p className="mt-1 text-sm text-blue-700 dark:text-blue-400">
                                        This is a system role. You can modify permissions but cannot change the role name or delete it.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Users Assigned Info */}
                    {role.users_count > 0 && (
                        <div className="mb-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                <span className="font-medium">{role.users_count}</span> user{role.users_count !== 1 ? 's' : ''} currently assigned to this role.
                            </p>
                        </div>
                    )}

                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg dark:bg-gray-800">
                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="space-y-6">
                                {/* Role Name */}
                                <div>
                                    <InputLabel htmlFor="name" value="Role Name" />
                                    <TextInput
                                        id="name"
                                        type="text"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        className="mt-1 block w-full"
                                        required
                                        disabled={role.is_protected}
                                    />
                                    {role.is_protected && (
                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            Protected role names cannot be changed
                                        </p>
                                    )}
                                    <InputError message={errors.name} className="mt-2" />
                                </div>

                                {/* Description */}
                                <div>
                                    <InputLabel htmlFor="description" value="Description" />
                                    <textarea
                                        id="description"
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:focus:border-indigo-600 dark:focus:ring-indigo-600"
                                        rows="3"
                                        placeholder="Brief description of this role..."
                                    />
                                    <InputError message={errors.description} className="mt-2" />
                                </div>

                                {/* Permissions */}
                                <div>
                                    <PermissionSelector
                                        permissions={permissions}
                                        selectedPermissions={data.permissions}
                                        onChange={(selected) => setData('permissions', selected)}
                                    />
                                    <InputError message={errors.permissions} className="mt-2" />
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center justify-end gap-4 border-t border-gray-200 pt-6 dark:border-gray-700">
                                    <Link href={route('roles.index')}>
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
