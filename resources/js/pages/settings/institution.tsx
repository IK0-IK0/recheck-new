import { Form, Head } from '@inertiajs/react';
import { Upload } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import SetupController from '@/actions/App/Http/Controllers/Settings/SetupController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { THEME_COLORS } from '@/constants/workflowConstants';
import { cn } from '@/lib/utils';

type Props = {
    institutionName?: string;
    institutionEmail?: string;
    themeColor: string;
};

const THEME_COLOR_CLASSES: Record<string, string> = {
    zinc: 'bg-zinc-600',
    slate: 'bg-slate-600',
    stone: 'bg-stone-600',
    gray: 'bg-gray-600',
    neutral: 'bg-neutral-600',
    red: 'bg-red-600',
    rose: 'bg-rose-600',
    orange: 'bg-orange-500',
    amber: 'bg-amber-500',
    yellow: 'bg-yellow-400',
    lime: 'bg-lime-500',
    green: 'bg-emerald-600',
    teal: 'bg-teal-600',
};

export default function Institution({ institutionName, institutionEmail, themeColor }: Props) {
    const [selectedThemeColor, setSelectedThemeColor] = useState(themeColor);
    const [hoveredColor, setHoveredColor] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubmit = () => {
        const form = document.getElementById('institution-form') as HTMLFormElement;
        if (form) {
            form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
    };

    return (
        <>
            <Head title="Institution Settings" />
            
            <div className="flex h-full flex-col">
                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="mx-auto max-w-3xl">
                        <div className="rounded-lg border border-border bg-background p-6 shadow-sm">
                            <Form
                                id="institution-form"
                                {...SetupController.update.form()}
                                options={{
                                    preserveScroll: true,
                                }}
                                onBefore={() => {
                                    setIsProcessing(true);
                                }}
                                onSuccess={() => {
                                    toast.success('Institution settings updated.');
                                    // Reload the page to apply theme changes
                                    window.location.reload();
                                }}
                                onError={() => {
                                    setIsProcessing(false);
                                }}
                                onFinish={() => {
                                    setIsProcessing(false);
                                }}
                                className="space-y-6"
                            >
                                {({ processing, errors }) => (
                                    <>
                                        {/* Logo and Institution Details - Side by Side */}
                                        <div className="flex items-start gap-6">
                                            <div className="flex-shrink-0">
                                                <Label className="mb-2 block text-xs font-medium">Logo</Label>
                                                <div className="flex size-24 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted">
                                                    <Upload className="size-6 text-muted-foreground" />
                                                </div>
                                                <Button type="button" variant="outline" size="sm" disabled className="mt-2 w-full h-7 text-xs">
                                                    Upload Logo
                                                </Button>
                                                <p className="mt-1 text-xs text-muted-foreground">PNG, JPG up to 2MB</p>
                                            </div>
                                            
                                            {/* Vertical separator */}
                                            <div className="h-auto w-px bg-border self-stretch" />
                                            
                                            <div className="flex-1 space-y-3">
                                                <div>
                                                    <Label htmlFor="institution_name" className="text-xs font-medium">Name</Label>
                                                    <Input
                                                        id="institution_name"
                                                        defaultValue={institutionName}
                                                        name="institution_name"
                                                        required
                                                        placeholder="Your Institution Name"
                                                        className="mt-1 h-9 text-sm"
                                                    />
                                                    <InputError message={errors.institution_name} />
                                                </div>
                                                
                                                <div>
                                                    <Label htmlFor="institution_email" className="text-xs font-medium">Email</Label>
                                                    <Input
                                                        id="institution_email"
                                                        name="institution_email"
                                                        type="email"
                                                        defaultValue={institutionEmail}
                                                        placeholder="contact@institution.com"
                                                        className="mt-1 h-9 text-sm"
                                                    />
                                                    <InputError message={errors.institution_email} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Divider */}
                                        <div className="border-t border-border" />

                                        {/* Theme Color Section */}
                                        <div className="space-y-2">
                                            <div>
                                                <Label className="text-xs font-medium">Theme Color</Label>
                                                <p className="mt-0.5 text-xs text-muted-foreground">Choose a color that represents your institution</p>
                                            </div>
                                            
                                            <div className="flex w-full gap-1">
                                                {THEME_COLORS.map((color) => {
                                                    const selected = selectedThemeColor === color;
                                                    const isHovered = hoveredColor === color;
                                                    const shouldExpand = isHovered || (selected && !hoveredColor);

                                                    return (
                                                        <label
                                                            key={color}
                                                            onMouseEnter={() => setHoveredColor(color)}
                                                            onMouseLeave={() => setHoveredColor(null)}
                                                            className={cn(
                                                                'relative cursor-pointer overflow-hidden rounded-md transition-all duration-300 ease-in-out',
                                                                'h-24',
                                                                shouldExpand ? 'basis-16 flex-shrink-0 flex-grow-0' : 'basis-4 flex-grow flex-shrink'
                                                            )}
                                                        >
                                                            <input
                                                                type="radio"
                                                                name="theme_color"
                                                                value={color}
                                                                checked={selected}
                                                                onChange={() => setSelectedThemeColor(color)}
                                                                className="sr-only"
                                                            />
                                                            <div className={cn(
                                                                'relative flex h-full w-full flex-col items-center justify-center gap-2 rounded-md px-1 py-2 transition-all duration-300',
                                                                THEME_COLOR_CLASSES[color] ?? 'bg-muted',
                                                                selected && 'ring-2 ring-inset ring-foreground'
                                                            )}>
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Hidden submit button for external trigger */}
                                        <button type="submit" id="submit-institution-btn" className="hidden">
                                            Submit
                                        </button>
                                    </>
                                )}
                            </Form>
                        </div>
                    </div>
                </div>

                {/* Sticky Footer */}
                <div className="flex-shrink-0 border-t border-border bg-surface px-6 py-2">
                    <div className="mx-auto flex max-w-3xl items-center justify-end">
                        <Button 
                            type="button"
                            onClick={() => document.getElementById('submit-institution-btn')?.click()}
                            disabled={isProcessing}
                            size="sm"
                            className="h-7 px-4 text-xs"
                        >
                            {isProcessing ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}