import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { usePage } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import PrimaryButton from '@/Components/PrimaryButton';

export default function ThemeToggle() {
    const { auth } = usePage().props;
    const [selectedColor, setSelectedColor] = useState(auth.user.theme_color || 'black');
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const colors = [
        { value: 'black', label: 'Black', hex: '#000000' },
        { value: 'blue', label: 'Blue', hex: '#3b82f6' },
        { value: 'purple', label: 'Purple', hex: '#a855f7' },
        { value: 'pink', label: 'Pink', hex: '#ec4899' },
        { value: 'red', label: 'Red', hex: '#ef4444' },
        { value: 'orange', label: 'Orange', hex: '#f97316' },
        { value: 'amber', label: 'Amber', hex: '#f59e0b' },
        { value: 'green', label: 'Green', hex: '#22c55e' },
        { value: 'emerald', label: 'Emerald', hex: '#10b981' },
        { value: 'teal', label: 'Teal', hex: '#14b8a6' },
        { value: 'cyan', label: 'Cyan', hex: '#06b6d4' },
        { value: 'indigo', label: 'Indigo', hex: '#6366f1' },
        { value: 'slate', label: 'Slate', hex: '#64748b' },
    ];

    const selectedColorObj = colors.find((c) => c.value === selectedColor);

    const handleColorChange = (color) => {
        setSelectedColor(color);
        setIsOpen(false);
        console.log('Color changed to:', color);
    };

    const handleApply = () => {
        setIsSaving(true);
        router.patch(route('profile.update-theme'), { theme_color: selectedColor }, {
            preserveState: false, // Force reload of props
            onSuccess: () => {
                setIsSaving(false);
                console.log('Color applied and saved:', selectedColor);
                
                // Apply the color immediately to CSS variables
                const colorMap = {
                    'black': '0 0% 9%',
                    'blue': '217 91% 60%',
                    'purple': '271 81% 66%',
                    'pink': '330 81% 60%',
                    'red': '0 72% 51%',
                    'orange': '25 95% 53%',
                    'amber': '38 92% 50%',
                    'green': '142 71% 45%',
                    'emerald': '160 84% 39%',
                    'teal': '173 80% 40%',
                    'cyan': '189 94% 43%',
                    'indigo': '239 84% 67%',
                    'slate': '215 16% 47%',
                };
                
                document.documentElement.style.setProperty(
                    '--primary',
                    colorMap[selectedColor] || '0 0% 9%'
                );
            },
            onError: () => {
                setIsSaving(false);
            },
        });
    };

    return (
        <section className="space-y-6">
            <header>
                <h2 className="text-lg font-semibold text-foreground">
                    Color Preference
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                    Choose your preferred accent color for the application.
                </p>
            </header>

            <div className="relative w-full sm:w-64">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between px-4 py-2 rounded-lg border border-border bg-background text-foreground hover:bg-muted transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <div
                            className="w-5 h-5 rounded-md"
                            style={{ backgroundColor: selectedColorObj?.hex }}
                        />
                        <span className="text-sm font-medium">{selectedColorObj?.label}</span>
                    </div>
                    <ChevronDown
                        className={`w-4 h-4 text-muted-foreground transition-transform ${
                            isOpen ? 'rotate-180' : ''
                        }`}
                    />
                </button>

                {isOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                        />
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border rounded-lg shadow-lg">
                            <div className="p-2 space-y-1 max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-ring/20 scrollbar-track-transparent">
                                {colors.map((color) => (
                                    <button
                                        key={color.value}
                                        onClick={() => handleColorChange(color.value)}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            selectedColor === color.value
                                                ? 'bg-primary/10 text-foreground'
                                                : 'text-muted-foreground hover:bg-muted text-foreground'
                                        }`}
                                    >
                                        <div
                                            className="w-4 h-4 rounded-md"
                                            style={{ backgroundColor: color.hex }}
                                        />
                                        <span>{color.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="flex items-center gap-3 pt-2">
                <PrimaryButton
                    onClick={handleApply}
                    disabled={isSaving}
                    className="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
                >
                    {isSaving ? 'Saving...' : 'Apply'}
                </PrimaryButton>
            </div>

            <p className="text-xs text-muted-foreground">
                Your color preference will be saved and applied across all devices.
            </p>
        </section>
    );
}
