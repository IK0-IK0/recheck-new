import { useState } from 'react';
import { Shield } from 'lucide-react';

export default function PermissionSelector({ permissions, selectedPermissions, onChange }) {
    const categoryLabels = {
        user_management: 'User Management',
        role_management: 'Role Management',
        process_management: 'Process Management',
        general: 'General',
        system: 'System Settings',
    };

    const handlePermissionToggle = (permissionId) => {
        const newSelected = selectedPermissions.includes(permissionId)
            ? selectedPermissions.filter((id) => id !== permissionId)
            : [...selectedPermissions, permissionId];
        onChange(newSelected);
    };

    const handleCategoryToggle = (category, categoryPermissions) => {
        const categoryIds = categoryPermissions.map((p) => p.id);
        const allSelected = categoryIds.every((id) => selectedPermissions.includes(id));

        if (allSelected) {
            // Deselect all in category
            onChange(selectedPermissions.filter((id) => !categoryIds.includes(id)));
        } else {
            // Select all in category
            const newSelected = [...new Set([...selectedPermissions, ...categoryIds])];
            onChange(newSelected);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Shield className="h-4 w-4" />
                <span>Permissions</span>
            </div>

            {Object.entries(permissions).map(([category, categoryPermissions]) => {
                const categoryIds = categoryPermissions.map((p) => p.id);
                const allSelected = categoryIds.every((id) => selectedPermissions.includes(id));
                const someSelected = categoryIds.some((id) => selectedPermissions.includes(id));

                return (
                    <div
                        key={category}
                        className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900"
                    >
                        <div className="mb-3 flex items-center justify-between">
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                {categoryLabels[category] || category}
                            </h4>
                            <button
                                type="button"
                                onClick={() => handleCategoryToggle(category, categoryPermissions)}
                                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                                {allSelected ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>

                        <div className="space-y-2">
                            {categoryPermissions.map((permission) => (
                                <label
                                    key={permission.id}
                                    className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedPermissions.includes(permission.id)}
                                        onChange={() => handlePermissionToggle(permission.id)}
                                        className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                                    />
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {permission.display_name}
                                        </div>
                                        {permission.description && (
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {permission.description}
                                            </div>
                                        )}
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                );
            })}

            <div className="text-sm text-gray-500 dark:text-gray-400">
                {selectedPermissions.length} permission{selectedPermissions.length !== 1 ? 's' : ''} selected
            </div>
        </div>
    );
}
