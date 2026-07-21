export default function DocumentLabelSelector({ value, onChange, className = '' }) {
    const options = [
        { value: 'forms', label: 'Forms' },
        { value: 'docs', label: 'Docs' },
    ];

    return (
        <div className={`inline-flex rounded-md shadow-sm ${className}`} role="group">
            {options.map((option) => {
                const isSelected = value === option.value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => onChange(option.value)}
                        className={`
                            px-3 sm:px-4 py-2 text-xs font-semibold uppercase tracking-widest
                            transition duration-150 ease-in-out
                            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                            ${option.value === 'forms' ? 'rounded-l-md' : 'rounded-r-md border-l-0'}
                            ${
                                isSelected
                                    ? 'bg-primary text-primary-foreground border border-transparent hover:bg-primary/90'
                                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'
                            }
                        `}
                        aria-pressed={isSelected}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}
