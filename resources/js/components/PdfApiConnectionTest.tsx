import { useState, type FormEvent } from 'react';
import { CheckCircle2, FileText, FormInput, LoaderCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Props = {
    configured: boolean;
};

export default function PdfApiConnectionTest({ configured }: Props) {
    const [files, setFiles] = useState<File[]>([]);
    const [processing, setProcessing] = useState(false);
    const [result, setResult] = useState<{ status: 'success' | 'error'; message: string }>();

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setProcessing(true);
        setResult(undefined);

        const formData = new FormData();
        formData.append('pdf', files[0]);

        try {
            const response = await fetch('/settings/api/forms-detect', {
                method: 'POST',
                body: formData,
                credentials: 'same-origin',
                headers: { Accept: 'application/pdf, application/json' },
            });

            if (!response.ok) {
                const payload = await response.json();
                throw new Error(payload.message ?? 'The form detection test failed.');
            }

            const download = document.createElement('a');
            download.href = URL.createObjectURL(await response.blob());
            download.download = 'forms-detected.pdf';
            download.click();
            URL.revokeObjectURL(download.href);
            setResult({ status: 'success', message: 'Form detection completed and the PDF was downloaded.' });
        } catch (error) {
            setResult({ status: 'error', message: error instanceof Error ? error.message : 'The form detection test failed.' });
        } finally {
            setProcessing(false);
        }
    }

    return (
        <div className="rounded-lg border border-border bg-background/60 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className="flex size-9 items-center justify-center rounded-md bg-muted/50 text-muted-foreground">
                        <FileText className="size-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold">PDF connectivity</h3>
                        <p className="text-xs text-muted-foreground">Upload a PDF to detect form fields and download the result.</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <Input
                    type="file"
                    accept="application/pdf,.pdf"
                    disabled={!configured || processing}
                    onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 1))}
                />
                <div className="flex items-center justify-between gap-4">
                    <p className="text-xs text-muted-foreground">Select one PDF file.</p>
                    <Button type="submit" variant="outline" size="sm" disabled={!configured || processing || files.length !== 1}>
                        {processing ? <LoaderCircle className="size-4 animate-spin" /> : <FormInput className="size-4" />}
                        Detect forms
                    </Button>
                </div>
            </form>

            {result && (
                <Alert variant={result.status === 'error' ? 'destructive' : 'default'} className="mt-4 bg-transparent">
                    {result.status === 'success' && <CheckCircle2 />}
                    <AlertDescription>{result.message}</AlertDescription>
                </Alert>
            )}
        </div>
    );
}