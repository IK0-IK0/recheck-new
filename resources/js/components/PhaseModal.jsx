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

const defaultPhaseInitialValues = { name: '' };

export default function PhaseModal({
    title = 'Create phase',
    description = 'Add a phase to your process.',
    trigger,
    open,
    onOpenChange,
    submitLabel = 'Save',
    initialValues = defaultPhaseInitialValues,
    onSubmit,
}) {
    const [internalOpen, setInternalOpen] = useState(false);
    const [values, setValues] = useState(initialValues);
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState(false);

    const dialogOpen = open === undefined ? internalOpen : open;
    const setDialogOpen = onOpenChange ?? setInternalOpen;

    useEffect(() => {
        setValues(initialValues);
        setError('');
    }, [dialogOpen]);

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!values.name.trim()) {
            setError('Phase name is required.');
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
                        <Label htmlFor="phase-name">Name</Label>
                        <Input
                            id="phase-name"
                            value={values.name}
                            onChange={(event) => setValues({ ...values, name: event.target.value })}
                            placeholder="Phase name"
                        />
                        {error ? <p className="text-sm text-destructive">{error}</p> : null}
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
