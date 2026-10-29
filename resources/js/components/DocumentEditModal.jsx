import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
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

/**
 * @param {{
 *   document: { id: number, name: string, label: string, file_path?: string },
 *   trigger?: import('react').ReactNode,
 * }} props
 */
export default function DocumentEditModal({ document, trigger }) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState(document.name);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (open) {
            setName(document.name);
        }
    }, [open, document.name]);

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!name.trim()) {
            toast.error('Document name is required.');
            return;
        }

        setProcessing(true);

        router.put(
            `/tenant/documents/${document.id}`,
            { name: name.trim() },
            {
                onSuccess: () => {
                    toast.success('Document updated.');
                    setOpen(false);
                },
                onError: (errors) => {
                    const message =
                        errors.name ||
                        'Unable to update document. Please try again.';
                    toast.error(message);
                },
                onFinish: () => {
                    setProcessing(false);
                },
            },
        );
    };

    const isForm = document.label === 'form';

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ?? <Button type="button">Edit</Button>}
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {isForm ? 'Configure Form' : 'Edit Document'}
                    </DialogTitle>
                    <DialogDescription>
                        {isForm
                            ? 'Configure the form name and settings.'
                            : 'Update the document name.'}
                    </DialogDescription>
                </DialogHeader>
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="grid gap-2">
                        <Label htmlFor="document-name">
                            {isForm ? 'Form name' : 'Document name'}
                        </Label>
                        <Input
                            id="document-name"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder={
                                isForm
                                    ? 'e.g. Client intake form'
                                    : 'e.g. Project proposal'
                            }
                            disabled={processing}
                        />
                    </div>

                    {isForm && !document.file_path && (
                        <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                            This form has no file attached. Forms can be filled
                            out during the workflow process.
                        </div>
                    )}

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button
                                variant="secondary"
                                type="button"
                                disabled={processing}
                            >
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button
                            type="submit"
                            disabled={processing}
                            aria-busy={processing}
                        >
                            {processing ? (
                                <>
                                    <Spinner />
                                    Saving...
                                </>
                            ) : (
                                'Save changes'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
