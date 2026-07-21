import { useState } from 'react';
import { Shield, ChevronDown } from 'lucide-react';

export default function RoleSelector({ roles, selectedRoles, onChange, multiple = true }) {
    const [isOpen, setIsOpen] = useState(false);

    const handleRoleToggle = (roleId) => {
        if (multiple) {
            const newSelected = selectedRoles.includes(roleId)
                ? selectedRoles.filter((id) => id !== roleId)
                : [...selectedRoles, roleId];
            onChange(newSelected);
        } else {
            onChange(selectedRoles.includes(roleId) ? [] : [roleId]);
            setIsOpen(false);
        }
    };

    const selectedRoleNames = roles
        .filter((role) => selectedRoles.includes(role.id))
        .map((role) => role.name);

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="relative w-full cursor-pointer rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 sm:text-sm"
            >
                <span className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-gray-400" />
                    {selectedRoleNames.length > 0 ? (
                        <span className="block truncate">
                            {selectedRoleNames.join(', ')}
                        </span>
                    ) : (
                        <span className="block truncate text-gray-400">
                            Select roles...
                        </span>
                    )}
                </span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                </span>
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-800 sm:text-sm">
                        {roles.length === 0 ? (
                            <div className="px-3 py-2 text-gray-500 dark:text-gray-400">
                                No roles available
                            </div>
                        ) : (
                            roles.map((role) => (
                                <label
                                    key={role.id}
                                    className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedRoles.includes(role.id)}
                                        onChange={() => handleRoleToggle(role.id)}
                                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                                    />
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {role.name}
                                        </div>
                                        {role.description && (
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {role.description}
                                            </div>
                                        )}
                                    </div>
                                </label>
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
