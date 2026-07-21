import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import PrimaryButton from '@/Components/PrimaryButton';
import DangerButton from '@/Components/DangerButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import { Search, Plus, Edit, Trash2, Shield, Mail } from 'lucide-react';

export default function Index({ users, roles, filters }) {
    const { permissions = [] } = usePage().props.auth;
    const can = (p) => permissions.includes(p);
    const [search, setSearch] = useState(filters.search || '');
    const [roleFilter, setRoleFilter] = useState(filters.role || '');

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('users.index'), { search, role: roleFilter }, { preserveState: true });
    };

    const handleDelete = (user) => {
        if (confirm(`Are you sure you want to delete user "${user.name}"?`)) {
            router.delete(route('users.destroy', user.id));
        }
    };

    const handleRoleFilterChange = (roleId) => {
        setRoleFilter(roleId);
        router.get(route('users.index'), { search, role: roleId }, { preserveState: true });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                        User Management
                    </h2>
                    {can('create_users') && (
                        <Link href={route('users.create')}>
                            <PrimaryButton>
                                <Plus className="mr-2 h-4 w-4" />
                                Add User
                            </PrimaryButton>
                        </Link>
                    )}
                </div>
            }
        >
            <Head title="Users" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg dark:bg-gray-800">
                        {/* Search and Filter Bar */}
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <TextInput
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search by name or email..."
                                        className="pl-10 w-full"
                                    />
                                </div>
                                <select
                                    value={roleFilter}
                                    onChange={(e) => handleRoleFilterChange(e.target.value)}
                                    className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                                >
                                    <option value="">All Roles</option>
                                    {roles.map((role) => (
                                        <option key={role.id} value={role.id}>
                                            {role.name}
                                        </option>
                                    ))}
                                </select>
                                <PrimaryButton type="submit">Search</PrimaryButton>
                                {(search || roleFilter) && (
                                    <SecondaryButton
                                        onClick={() => {
                                            setSearch('');
                                            setRoleFilter('');
                                            router.get(route('users.index'));
                                        }}
                                    >
                                        Clear
                                    </SecondaryButton>
                                )}
                            </form>
                        </div>

                        {/* Users Table */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                                            User
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                                            <div className="flex items-center gap-1">
                                                <Mail className="h-4 w-4" />
                                                Email
                                            </div>
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                                            <div className="flex items-center gap-1">
                                                <Shield className="h-4 w-4" />
                                                Roles
                                            </div>
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                                            Joined
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                                    {users.data.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                                No users found.
                                            </td>
                                        </tr>
                                    ) : (
                                        users.data.map((user) => (
                                            <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                <td className="whitespace-nowrap px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 flex-shrink-0">
                                                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                                                                {user.name.charAt(0).toUpperCase()}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-gray-900 dark:text-gray-100">
                                                                {user.name}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                                    {user.email}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        {user.roles.length > 0 ? (
                                                            user.roles.map((role) => (
                                                                <span
                                                                    key={role.id}
                                                                    className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300"
                                                                >
                                                                    {role.name}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs text-gray-400 dark:text-gray-500">
                                                                No roles
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                                    {user.created_at}
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {can('edit_users') && (
                                                            <Link href={route('users.edit', user.id)}>
                                                                <SecondaryButton className="text-xs">
                                                                    <Edit className="mr-1 h-3 w-3" />
                                                                    Edit
                                                                </SecondaryButton>
                                                            </Link>
                                                        )}
                                                        {can('delete_users') && (
                                                            <DangerButton
                                                                onClick={() => handleDelete(user)}
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
                        {users.links.length > 3 && (
                            <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-gray-700 dark:text-gray-300">
                                        Showing <span className="font-medium">{users.from}</span> to{' '}
                                        <span className="font-medium">{users.to}</span> of{' '}
                                        <span className="font-medium">{users.total}</span> results
                                    </div>
                                    <div className="flex gap-2">
                                        {users.links.map((link, index) => (
                                            <button
                                                key={index}
                                                onClick={() => link.url && router.get(link.url)}
                                                disabled={!link.url}
                                                className={`px-3 py-1 rounded text-sm ${
                                                    link.active
                                                        ? 'bg-indigo-600 text-white'
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
