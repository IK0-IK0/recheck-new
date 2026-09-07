import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

const defaultProcessInitialValues = { name: '', description: '' };

export default function ProcessModal({
    title = 'Create process',
    description = 'Add a new process to your workflow.',
    trigger,
    open,
    onOpenChange,
    submitLabel = 'Save',
    initialValues = defaultProcessInitialValues,
    onSubmit,
}) {
    const [internalOpen, setInternalOpen] = useState(false);
    const [values, setValues] = useState(initialValues);
    const [errors, setErrors] = useState({ name: '' });
    const [processing, setProcessing] = useState(false);

    const dialogOpen = open === undefined ? internalOpen : open;
    const setDialogOpen = onOpenChange ?? setInternalOpen;

    useEffect(() => {
        setValues(initialValues);
        setErrors({ name: '' });
    }, [dialogOpen]);

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!values.name.trim()) {
            setErrors({ name: 'Process name is required.' });
            return;
        }

        setProcessing(true);

        try {
            await onSubmit?.(values);
            setDialogOpen(false);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            {trigger ? (
                <DialogTrigger asChild>{trigger}</DialogTrigger>
            ) : open === undefined ? (
                <DialogTrigger asChild>
                    <Button type="button">{title}</Button>
                </DialogTrigger>
            ) : null}
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="grid gap-2">
                        <Label htmlFor="process-name">Name</Label>
                        <Input
                            id="process-name"
                            value={values.name}
                            onChange={(event) => setValues({ ...values, name: event.target.value })}
                            placeholder="Process name"
                        />
                        {errors.name ? (
                            <p className="text-sm text-destructive">{errors.name}</p>
                        ) : null}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="process-description">Description</Label>
                        <textarea
                            id="process-description"
                            value={values.description}
                            onChange={(event) => setValues({ ...values, description: event.target.value })}
                            className="min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-ring/50"
                            placeholder="Optional description"
                        />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="secondary" type="button">
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button type="submit" disabled={processing}>
                            {submitLabel}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
