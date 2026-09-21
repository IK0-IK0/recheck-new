import { Form, Head } from '@inertiajs/react';
import { CheckCircle2, KeyRound, ShieldCheck } from 'lucide-react';
import InputError from '@/components/input-error';
import PdfApiConnectionTest from '@/components/PdfApiConnectionTest';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
    iloveApiConfigured: {
        publicKey: boolean;
        secretKey: boolean;
    };
};

export default function ApiSettings({ iloveApiConfigured }: Props) {
    const isConfigured = iloveApiConfigured.publicKey && iloveApiConfigured.secretKey;

    return (
        <>
            <Head title="Documents" />
            <div className="p-6">
                <div className="mx-auto max-w-3xl space-y-5">
                    <div className="rounded-lg border border-border bg-background/60 p-5 shadow-sm">
                        <div className="mb-5 flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="flex size-9 items-center justify-center rounded-md bg-muted/50 text-muted-foreground">
                                    <KeyRound className="size-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold">iLovePDF credentials</h3>
                                    <p className="text-xs text-muted-foreground">Public and secret keys</p>
                                </div>
                            </div>
                            <Badge variant={isConfigured ? 'default' : 'outline'} className="mt-1 gap-1.5">
                                <span className={`size-1.5 rounded-full ${isConfigured ? 'bg-primary-foreground' : 'bg-muted-foreground'}`} />
                                {isConfigured ? 'Configured' : 'Not configured'}
                            </Badge>
                        </div>

                        <div className="flex items-start justify-between gap-4 border-b border-border mb-5">
                        </div>

                        <Form action="/settings/api" method="post" options={{ preserveScroll: true }} className="space-y-5">
                            {({ processing, errors }) => (
                                <>
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="ilove_public_key" className="text-sm">Public key</Label>
                                        <Input id="ilove_public_key" name="ilove_public_key" type="password" className="h-9 text-sm" placeholder={iloveApiConfigured.publicKey ? 'Configured - enter a new key to replace it' : 'Enter public key'} autoComplete="off" />
                                        <InputError message={errors.ilove_public_key} />
                                    </div>
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="ilove_secret_key" className="text-sm">Secret key</Label>
                                        <Input id="ilove_secret_key" name="ilove_secret_key" type="password" className="h-9 text-sm" placeholder={iloveApiConfigured.secretKey ? 'Configured - enter a new key to replace it' : 'Enter secret key'} autoComplete="off" />
                                        <InputError message={errors.ilove_secret_key} />
                                    </div>
                                    <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <ShieldCheck className="size-4" />
                                            Keys are encrypted before storage.
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button disabled={processing} size="sm">
                                                <CheckCircle2 className="size-4" />
                                                Save credentials
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </Form>
                    </div>

                    <PdfApiConnectionTest configured={isConfigured} />

                </div>
            </div>
        </>
    );
}