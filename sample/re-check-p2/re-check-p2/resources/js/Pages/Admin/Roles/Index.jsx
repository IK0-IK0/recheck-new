import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import PrimaryButton from '@/Components/PrimaryButton';
import DangerButton from '@/Components/DangerButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import { Search, Plus, Edit, Trash2, Users, Shield } from 'lucide-react';

export default function Index({ roles, filters }) {
    const { permissions = [] } = usePage().props.auth;
    const can = (p) => permissions.includes(p);
    const [search, setSearch] = useState(filters.search || '');
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('roles.index'), { search }, { preserveState: true });
    };

    const handleDelete = (role) => {
        if (role.users_count > 0) {
            alert(`This role has ${role.users_count} user(s) assigned. Please reassign users before deleting.`);
            return;
        }

        if (role.is_protected) {
            alert('This is a protected role and cannot be deleted.');
            return;
        }

        if (confirm(`Are you sure you want to delete the role "${role.name}"?`)) {
            router.delete(route('roles.destroy', role.id));
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                        Role Management
                    </h2>
                    {can('create_roles') && (
                        <Link href={route('roles.create')}>
                            <PrimaryButton>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Role
                            </PrimaryButton>
                        </Link>
                    )}
                </div>
            }
        >
            <Head title="Roles" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg dark:bg-gray-800">
                        {/* Search Bar */}
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <form onSubmit={handleSearch} className="flex gap-4">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <TextInput
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search roles..."
                                        className="pl-10 w-full"
                                    />
                                </div>
                                <PrimaryButton type="submit">Search</PrimaryButton>
                                {search && (
                                    <SecondaryButton
                                        onClick={() => {
                                            setSearch('');
                                            router.get(route('roles.index'));
                                        }}
                                    >
                                        Clear
                                    </SecondaryButton>
                                )}
                            </form>
                        </div>

                        {/* Roles Table */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                                            Role Name
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                                            Description
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                                            <div className="flex items-center gap-1">
                                                <Users className="h-4 w-4" />
                                                Users
                                            </div>
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                                            <div className="flex items-center gap-1">
                                                <Shield className="h-4 w-4" />
                                                Permissions
                                            </div>
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                                    {roles.data.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                                No roles found.
                                            </td>
                                        </tr>
                                    ) : (
                                        roles.data.map((role) => (
                                            <tr key={role.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                <td className="whitespace-nowrap px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-gray-900 dark:text-gray-100">
                                                            {role.name}
                                                        </span>
                                                        {role.is_protected && (
                                                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                                                Protected
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                                    {role.description || '-'}
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                                                    {role.users_count}
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                                                    {role.permissions_count}
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {can('edit_roles') && (
                                                            <Link href={route('roles.edit', role.id)}>
                                                                <SecondaryButton className="text-xs">
                                                                    <Edit className="mr-1 h-3 w-3" />
                                                                    Edit
                                                                </SecondaryButton>
                                                            </Link>
                                                        )}
                                                        {can('delete_roles') && !role.is_protected && (
                                                            <DangerButton
                                                                onClick={() => handleDelete(role)}
                                                                className="text-xs"
                                                            >
                                                                <Trash2 className="mr-1 h-3 w-3" />
                                                                Delete
                                                            </DangerButton>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {roles.links.length > 3 && (
                            <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-gray-700 dark:text-gray-300">
                                        Showing <span className="font-medium">{roles.from}</span> to{' '}
                                        <span className="font-medium">{roles.to}</span> of{' '}
                                        <span className="font-medium">{roles.total}</span> results
                                    </div>
                                    <div className="flex gap-2">
                                        {roles.links.map((link, index) => (
                                            <button
                                                key={index}
                                                onClick={() => link.url && router.get(link.url)}
                                                disabled={!link.url}
                                                className={`px-3 py-1 rounded text-sm ${
                                                    link.active
                                                        ? 'bg-blue-600 text-white'
                                                        : link.url
                                                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300'
                                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800'
                                                }`}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
