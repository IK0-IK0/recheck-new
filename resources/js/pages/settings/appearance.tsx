import { Head } from '@inertiajs/react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

type AppearanceMode = 'light' | 'dark' | 'system';

export default function Appearance() {
    const [appearance, setAppearance] = useState<AppearanceMode>('system');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Get current appearance from cookie
        const cookies = document.cookie.split('; ');
        const appearanceCookie = cookies.find((row) =>
            row.startsWith('appearance='),
        );
        if (appearanceCookie) {
            const value = appearanceCookie.split('=')[1] as AppearanceMode;
            setAppearance(value);
        }
    }, []);

    const handleAppearanceChange = (value: AppearanceMode) => {
        setIsLoading(true);
        setAppearance(value);

        // Set cookie
        document.cookie = `appearance=${value}; path=/; max-age=31536000; SameSite=Lax`;

        // Apply theme immediately
        const root = document.documentElement;
        if (value === 'system') {
            const systemPreference = window.matchMedia(
                '(prefers-color-scheme: dark)',
            ).matches
                ? 'dark'
                : 'light';
            root.classList.remove('light', 'dark');
            root.classList.add(systemPreference);
        } else {
            root.classList.remove('light', 'dark');
            root.classList.add(value);
        }

        // Show success message
        setTimeout(() => {
            setIsLoading(false);
            toast.success('Appearance updated successfully');
        }, 300);
    };

    const appearanceOptions = [
        {
            value: 'light' as AppearanceMode,
            label: 'Light',
            description: 'Always use light mode',
            icon: Sun,
        },
        {
            value: 'dark' as AppearanceMode,
            label: 'Dark',
            description: 'Always use dark mode',
            icon: Moon,
        },
        {
            value: 'system' as AppearanceMode,
            label: 'System',
            description: 'Use system preference',
            icon: Monitor,
        },
    ];

    return (
        <>
            <Head title="Appearance Settings" />

            <div className="p-6">
                <div className="mx-auto max-w-2xl space-y-4">
                    <div className="rounded-lg border border-border bg-background/60 p-4 shadow-sm">
                        <div className="mb-4">
                            <h2 className="text-sm font-semibold">Theme</h2>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Choose your preferred theme for the interface
                            </p>
                        </div>

                        <RadioGroup
                            value={appearance}
                            onValueChange={(value) =>
                                handleAppearanceChange(value as AppearanceMode)
                            }
                            disabled={isLoading}
                            className="grid gap-3"
                        >
                            {appearanceOptions.map((option) => {
                                const Icon = option.icon;
                                return (
                                    <div
                                        key={option.value}
                                        className={`relative flex items-start gap-3 rounded-lg border-2 p-4 transition-colors ${
                                            appearance === option.value
                                                ? 'border-primary bg-primary/5'
                                                : 'border-border hover:border-border/80'
                                        }`}
                                    >
                                        <RadioGroupItem
                                            value={option.value}
                                            id={option.value}
                                            className="mt-0.5"
                                        />
                                        <Label
                                            htmlFor={option.value}
                                            className="flex flex-1 cursor-pointer flex-col gap-1"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Icon className="size-4" />
                                                <span className="text-sm font-medium">
                                                    {option.label}
                                                </span>
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                                {option.description}
                                            </span>
                                        </Label>
                                    </div>
                                );
                            })}
                        </RadioGroup>

                        <div className="mt-4 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                            <p>
                                <strong>Note:</strong> Your theme preference is
                                saved locally and will persist across sessions.
                            </p>
                        </div>
                    </div>

                    <div className="rounded-lg border border-border bg-background/60 p-4 shadow-sm">
                        <h2 className="mb-3 text-sm font-semibold">
                            Preview
                        </h2>
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 rounded-md border border-border bg-background p-3">
                                <div className="size-8 rounded-full bg-primary" />
                                <div className="flex-1 space-y-1">
                                    <div className="h-3 w-24 rounded bg-foreground/80" />
                                    <div className="h-2 w-32 rounded bg-muted-foreground/50" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Button size="sm" className="w-full">
                                    Primary Button
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full"
                                >
                                    Secondary Button
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
