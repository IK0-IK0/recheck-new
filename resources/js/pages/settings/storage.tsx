import { Form, Head } from '@inertiajs/react';
import { Plus, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import StorageController from '@/actions/App/Http/Controllers/Settings/StorageController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

type StorageDriver = 'local' | 's3';

type StorageConfig = {
    id?: number;
    driver: StorageDriver;
    root?: string;
    endpoint?: string;
    region?: string;
    bucket?: string;
    access_key?: string;
    secret_key?: string;
};

type Props = {
    currentConfig?: StorageConfig;
};

const drivers: { value: StorageDriver; label: string; description: string }[] = [
    { value: 'local', label: 'Local', description: 'Files stored on this server' },
    { value: 's3', label: 'S3 Compatible', description: 'AWS S3, Supabase, MinIO, etc.' },
];

export default function Storage({ currentConfig }: Props) {
    const [selectedDriver, setSelectedDriver] = useState<StorageDriver>(
        currentConfig?.driver ?? 'local'
    );
    const [isProcessing, setIsProcessing] = useState(false);
    const [buckets, setBuckets] = useState<Array<{ id: string; name: string; public: boolean }>>([]);
    const [loadingBuckets, setLoadingBuckets] = useState(false);
    const [showCreateBucketDialog, setShowCreateBucketDialog] = useState(false);
    const [newBucketName, setNewBucketName] = useState('');
    const [newBucketPublic, setNewBucketPublic] = useState(false);
    const [creatingBucket, setCreatingBucket] = useState(false);
    const [endpoint, setEndpoint] = useState(currentConfig?.endpoint || '');
    const [accessKey, setAccessKey] = useState(currentConfig?.access_key || '');
    const [region, setRegion] = useState(currentConfig?.region || 'us-east-1');
    const [bucket, setBucket] = useState(currentConfig?.bucket || '');
    const [secretKey, setSecretKey] = useState(currentConfig?.secret_key || '');
    const [root, setRoot] = useState(currentConfig?.root || '');

    const selectDriver = (driver: StorageDriver) => {
        setSelectedDriver(driver);
        
        // Set defaults when switching drivers
        if (driver === 'local' && !root) {
            setRoot('storage/app/private');
        }
        
        // Clear S3 fields when switching away
        if (driver === 'local') {
            setBuckets([]);
            setBucket('');
        }
    };

    const fetchBuckets = async () => {
        if (!endpoint || !accessKey || !secretKey) {
            toast.error('Please enter endpoint, access key, and secret key first');
            return;
        }

        setLoadingBuckets(true);
        try {
            const response = await fetch('/settings/storage/buckets/list', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({ 
                    endpoint, 
                    region,
                    access_key: accessKey,
                    secret_key: secretKey,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setBuckets(data.buckets || []);
                if (data.buckets?.length === 0) {
                    toast.warning('No buckets found. Please create a bucket first.');
                } else {
                    toast.success(`Found ${data.buckets?.length || 0} bucket${data.buckets?.length !== 1 ? 's' : ''}`);
                }
            } else {
                toast.error(data.error || 'Failed to fetch buckets');
            }
        } catch (error) {
            toast.error('Failed to connect to storage service');
        } finally {
            setLoadingBuckets(false);
        }
    };

    const createBucket = async () => {
        if (!newBucketName) {
            toast.error('Please enter a bucket name');
            return;
        }

        setCreatingBucket(true);
        try {
            const response = await fetch('/settings/storage/buckets/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    endpoint,
                    region,
                    access_key: accessKey,
                    secret_key: secretKey,
                    bucket_name: newBucketName,
                    public: newBucketPublic,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Bucket created successfully');
                setShowCreateBucketDialog(false);
                setNewBucketName('');
                setNewBucketPublic(false);
                // Refresh the bucket list
                fetchBuckets();
            } else {
                toast.error(data.error || 'Failed to create bucket');
            }
        } catch (error) {
            toast.error('Failed to create bucket');
        } finally {
            setCreatingBucket(false);
        }
    };

    const handleSubmit = () => {
        const form = document.getElementById('storage-form') as HTMLFormElement;
        if (form) {
            form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
    };

    return (
        <>
            <Head title="Storage Settings" />

            <div className="flex h-full flex-col">
                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="mx-auto max-w-3xl">
                        <div className="rounded-lg border border-border bg-background p-6 shadow-sm">
                            <div className="mb-4">
                                <h2 className="text-sm font-semibold">Storage</h2>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    Choose where documents and uploaded files are stored.
                                </p>
                            </div>

                            <Form
                                id="storage-form"
                                action={StorageController.store.url()}
                                method="post"
                                options={{
                                    preserveScroll: true,
                                }}
                                onBefore={() => {
                                    setIsProcessing(true);
                                }}
                                onSuccess={() => {
                                    toast.success('Storage settings saved successfully.');
                                }}
                                onError={() => {
                                    setIsProcessing(false);
                                    toast.error('Failed to save storage settings.');
                                }}
                                onFinish={() => {
                                    setIsProcessing(false);
                                }}
                                className="space-y-4"
                            >
                                {({ processing, errors }) => (
                                    <>
                                        {/* Driver Selection */}
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {drivers.map((option) => (
                                                <label
                                                    key={option.value}
                                                    className="cursor-pointer"
                                                >
                                                    <input
                                                        type="radio"
                                                        name="driver"
                                                        value={option.value}
                                                        checked={selectedDriver === option.value}
                                                        onChange={() => selectDriver(option.value)}
                                                        className="sr-only"
                                                    />
                                                    <div
                                                        className={`rounded-md border px-3 py-2 text-left transition-colors ${
                                                            selectedDriver === option.value
                                                                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                                                : 'border-border hover:bg-muted/50'
                                                        }`}
                                                    >
                                                        <span className="block text-xs font-medium">{option.label}</span>
                                                        <span className="mt-0.5 block text-[11px] text-muted-foreground">
                                                            {option.description}
                                                        </span>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>

                                        {/* Configuration Fields */}
                                        <div className="space-y-3">
                                            {selectedDriver === 'local' ? (
                                                <div>
                                                    <Label htmlFor="root" className="text-xs font-medium">
                                                        Storage Root
                                                    </Label>
                                                    <Input
                                                        id="root"
                                                        name="root"
                                                        value={root}
                                                        onChange={(e) => setRoot(e.target.value)}
                                                        className="mt-1 h-9 text-sm"
                                                        placeholder="storage/app/private"
                                                    />
                                                    <InputError message={errors.root} />
                                                </div>
                                            ) : (
                                                <>
                                                    <div>
                                                        <Label htmlFor="endpoint" className="text-xs font-medium">
                                                            Endpoint URL
                                                        </Label>
                                                        <Input
                                                            id="endpoint"
                                                            name="endpoint"
                                                            value={endpoint}
                                                            onChange={(e) => setEndpoint(e.target.value)}
                                                            className="mt-1 h-9 text-sm"
                                                            placeholder="https://s3.amazonaws.com or https://xxxxx.storage.supabase.co/storage/v1/s3"
                                                            required
                                                        />
                                                        <InputError message={errors.endpoint} />
                                                        <p className="mt-1 text-xs text-muted-foreground">
                                                            For Supabase, use the direct S3 endpoint ending in /storage/v1/s3.
                                                        </p>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <Label htmlFor="access_key" className="text-xs font-medium">
                                                                S3 Access Key ID
                                                            </Label>
                                                            <Input
                                                                id="access_key"
                                                                name="access_key"
                                                                type="password"
                                                                value={accessKey}
                                                                onChange={(e) => setAccessKey(e.target.value)}
                                                                className="mt-1 h-9 text-sm"
                                                                autoComplete="off"
                                                                required
                                                            />
                                                            <InputError message={errors.access_key} />
                                                        </div>
                                                        <div>
                                                            <Label htmlFor="secret_key" className="text-xs font-medium">
                                                                Secret Key
                                                            </Label>
                                                            <Input
                                                                id="secret_key"
                                                                name="secret_key"
                                                                type="password"
                                                                value={secretKey}
                                                                onChange={(e) => setSecretKey(e.target.value)}
                                                                className="mt-1 h-9 text-sm"
                                                                autoComplete="new-password"
                                                                required
                                                            />
                                                            <InputError message={errors.secret_key} />
                                                            <p className="mt-1 text-xs text-muted-foreground">
                                                                For Supabase: use the generated S3 Secret Access Key.
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <Label htmlFor="region" className="text-xs font-medium">
                                                            Region
                                                        </Label>
                                                        <Input
                                                            id="region"
                                                            name="region"
                                                            value={region}
                                                            onChange={(e) => setRegion(e.target.value)}
                                                            className="mt-1 h-9 text-sm"
                                                            placeholder="us-east-1"
                                                        />
                                                        <InputError message={errors.region} />
                                                    </div>

                                                    {/* Bucket Selection Section */}
                                                    <div className="rounded-md border border-border bg-muted/30 p-4">
                                                        <div className="mb-3 flex items-center justify-between">
                                                            <div>
                                                                <h3 className="text-xs font-semibold">Select Bucket</h3>
                                                                <p className="mt-0.5 text-xs text-muted-foreground">
                                                                    Choose an existing bucket or create a new one
                                                                </p>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={fetchBuckets}
                                                                    disabled={loadingBuckets || !endpoint || !accessKey || !secretKey}
                                                                    className="h-7 text-xs"
                                                                >
                                                                    <RefreshCw className={`mr-1 size-3 ${loadingBuckets ? 'animate-spin' : ''}`} />
                                                                    {loadingBuckets ? 'Loading...' : 'Load Buckets'}
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    onClick={() => setShowCreateBucketDialog(true)}
                                                                    disabled={!endpoint || !accessKey || !secretKey}
                                                                    className="h-7 text-xs"
                                                                >
                                                                    <Plus className="mr-1 size-3" />
                                                                    Create Bucket
                                                                </Button>
                                                            </div>
                                                        </div>

                                                        {buckets.length > 0 ? (
                                                            <div>
                                                                <Label htmlFor="bucket" className="text-xs font-medium">
                                                                    Bucket Name
                                                                </Label>
                                                                <select
                                                                    id="bucket"
                                                                    name="bucket"
                                                                    value={bucket}
                                                                    onChange={(e) => setBucket(e.target.value)}
                                                                    className="border-input bg-background text-sm shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-ring/50 mt-1 w-full rounded-md border px-3 py-2"
                                                                    required
                                                                >
                                                                    <option value="">Select a bucket...</option>
                                                                    {buckets.map((b) => (
                                                                        <option key={b.id || b.name} value={b.id || b.name}>
                                                                            {b.name || b.id} {b.public && '(Public)'}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                                <InputError message={errors.bucket} />
                                                            </div>
                                                        ) : (
                                                            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs dark:border-amber-800 dark:bg-amber-950">
                                                                <p className="font-medium text-amber-900 dark:text-amber-100">
                                                                    No buckets found
                                                                </p>
                                                                <p className="mt-1 text-amber-700 dark:text-amber-300">
                                                                    Click "Load Buckets" to fetch available buckets, or "Create Bucket" to create a new one.
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {errors.connection && (
                                                        <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                                                            {errors.connection}
                                                        </div>
                                                    )}

                                                </>
                                            )}
                                        </div>

                                        {/* Hidden submit button */}
                                        <button type="submit" id="submit-storage-btn" className="hidden">
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
                            onClick={handleSubmit}
                            disabled={isProcessing}
                            size="sm"
                            className="h-7 px-4 text-xs"
                        >
                            {isProcessing ? 'Saving...' : 'Save Storage Settings'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Create Bucket Dialog */}
            <Dialog open={showCreateBucketDialog} onOpenChange={setShowCreateBucketDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create Storage Bucket</DialogTitle>
                        <DialogDescription>
                            Create a new storage bucket in your S3-compatible storage service.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="bucket_name" className="text-xs font-medium">
                                Bucket Name
                            </Label>
                            <Input
                                id="bucket_name"
                                value={newBucketName}
                                onChange={(e) => setNewBucketName(e.target.value)}
                                className="mt-1 h-9 text-sm"
                                placeholder="my-bucket"
                            />
                            <p className="mt-1 text-xs text-muted-foreground">
                                Lowercase letters, numbers, and hyphens only
                            </p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="bucket_public"
                                checked={newBucketPublic}
                                onChange={(e) => setNewBucketPublic(e.target.checked)}
                                className="size-4 rounded border-border"
                            />
                            <Label htmlFor="bucket_public" className="text-xs font-medium">
                                Make bucket public
                            </Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowCreateBucketDialog(false)}
                            size="sm"
                            className="h-8 text-xs"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={createBucket}
                            disabled={creatingBucket || !newBucketName}
                            size="sm"
                            className="h-8 text-xs"
                        >
                            {creatingBucket ? 'Creating...' : 'Create Bucket'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}