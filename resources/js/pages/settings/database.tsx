import { Head, router, useForm } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, PlayCircle, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

type Props = {
    currentConfig?: {
        driver: string;
        host?: string;
        port?: string;
        database: string;
        username?: string;
    } | null;
    migrationStatus: {
        status: string;
        count?: number;
        message?: string;
    };
};

export default function Database({ currentConfig, migrationStatus }: Props) {
    // Determine initial driver
    const getInitialDriver = () => {
        try {
            const saved = localStorage.getItem('database_setup_form');
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed.driver || currentConfig?.driver || 'sqlite';
            }
        } catch (e) {
            console.error('Error loading saved driver:', e);
        }
        return currentConfig?.driver || 'sqlite';
    };

    const initialDriver = getInitialDriver();

    // Load saved form data from localStorage or use currentConfig
    const getSavedFormData = () => {
        try {
            // First, check per-driver storage
            const savedDriversData = localStorage.getItem('database_setup_form_drivers');
            if (savedDriversData) {
                const driversData = JSON.parse(savedDriversData);
                const driverData = driversData[`${initialDriver}_data`];
                if (driverData) {
                    return driverData;
                }
            }

            // Fallback to general saved form
            const saved = localStorage.getItem('database_setup_form');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error('Error loading saved form data:', e);
        }

        // Final fallback to currentConfig or defaults
        return {
            driver: currentConfig?.driver || 'sqlite',
            host: currentConfig?.host || '',
            port: currentConfig?.port || '',
            database: currentConfig?.database || '',
            username: currentConfig?.username || '',
            password: '',
            skip_test: false,
        };
    };

    const [driver, setDriver] = useState(initialDriver);
    const [isMigrating, setIsMigrating] = useState(false);
    const [showWarningDialog, setShowWarningDialog] = useState(false);
    const [pendingSubmit, setPendingSubmit] = useState(null);

    const { data, setData, post, processing, errors } = useForm(getSavedFormData());

    // Save form data to localStorage whenever it changes (but don't save password)
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            try {
                const dataToSave = { ...data, password: '' }; // Never save password
                localStorage.setItem('database_setup_form', JSON.stringify(dataToSave));
            } catch (e) {
                console.error('Error saving form data:', e);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(timeoutId);
    }, [data]);

    const handleDriverChange = (value) => {
        const currentDriver = driver;
        const savedData = JSON.parse(localStorage.getItem('database_setup_form') || '{}');
        
        // Save current form state before switching
        const stateToSave = {
            [`${currentDriver}_data`]: { ...data, password: '' },
            ...savedData,
        };
        localStorage.setItem('database_setup_form_drivers', JSON.stringify(stateToSave));
        
        setDriver(value);

        // Load saved data for the new driver, or use defaults
        const savedDriversData = JSON.parse(localStorage.getItem('database_setup_form_drivers') || '{}');
        const savedForDriver = savedDriversData[`${value}_data`];

        if (savedForDriver) {
            // Restore saved data for this driver
            setData(savedForDriver);
        } else {
            // Use defaults for this driver
            if (value === 'sqlite') {
                setData({
                    driver: value,
                    host: '',
                    port: '',
                    database: '',
                    username: '',
                    password: '',
                    skip_test: false,
                });
            } else if (value === 'pgsql') {
                setData({
                    driver: value,
                    host: '',
                    port: '5432',
                    database: '',
                    username: '',
                    password: '',
                    skip_test: false,
                });
            }
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Check if there's an existing configuration that will be replaced
        if (currentConfig && migrationStatus.status === 'migrated') {
            setPendingSubmit(e);
            setShowWarningDialog(true);
            return;
        }
        
        submitConfiguration();
    };

    const submitConfiguration = () => {
        post('/settings/database', {
            onSuccess: () => {
                toast.success('Database configuration saved successfully.');
                setData('password', '');
                // Clear localStorage drafts after successful save
                localStorage.removeItem('database_setup_form');
                localStorage.removeItem('database_setup_form_drivers');
                setShowWarningDialog(false);
                setPendingSubmit(null);
            },
            onError: (errors) => {
                if (errors.connection) {
                    toast.error(errors.connection);
                } else {
                    toast.error('Failed to save database configuration.');
                }
                setShowWarningDialog(false);
                setPendingSubmit(null);
            },
        });
    };

    const handleConfirmSubmit = () => {
        submitConfiguration();
    };

    const handleCancelSubmit = () => {
        setShowWarningDialog(false);
        setPendingSubmit(null);
    };

    const handleMigrate = () => {
        if (!currentConfig) {
            toast.error('Please save database configuration first.');
            return;
        }

        setIsMigrating(true);
        router.post('/settings/database/migrate', {}, {
            onSuccess: () => {
                toast.success('Migrations completed successfully!');
                setIsMigrating(false);
            },
            onError: (errors) => {
                if (errors.migration) {
                    toast.error(errors.migration);
                } else {
                    toast.error('Migration failed.');
                }
                setIsMigrating(false);
            },
        });
    };

    const getMigrationStatusText = () => {
        switch (migrationStatus.status) {
            case 'no_config':
                return { text: 'No configuration', color: 'text-muted-foreground' };
            case 'not_migrated':
                return { text: 'Not migrated', color: 'text-amber-600 dark:text-amber-400' };
            case 'migrated':
                return { text: `Migrated (${migrationStatus.count})`, color: 'text-green-600 dark:text-green-400' };
            case 'error':
                return { text: 'Connection error', color: 'text-destructive' };
            default:
                return { text: 'Unknown', color: 'text-muted-foreground' };
        }
    };

    const migrationStatusInfo = getMigrationStatusText();

    return (
        <>
            <Head title="Database Settings" />
            
            {/* Warning Dialog */}
            <Dialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/30">
                                <AlertTriangle className="size-5 text-amber-600 dark:text-amber-500" />
                            </div>
                            <DialogTitle>Confirm Configuration Change</DialogTitle>
                        </div>
                        <DialogDescription className="pt-3">
                            Changing the database configuration will <span className="font-semibold text-foreground">reset all data</span> in the current dataset. 
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/20">
                        <div className="flex gap-2">
                            <Info className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                            <div className="space-y-1 text-xs text-amber-900 dark:text-amber-100">
                                <p className="font-medium">What will be affected:</p>
                                <ul className="ml-4 list-disc space-y-0.5 text-amber-800 dark:text-amber-200">
                                    <li>All users in the tenant database</li>
                                    <li>Custom tables and configurations</li>
                                    <li>Migration history</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancelSubmit}
                            disabled={processing}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleConfirmSubmit}
                            disabled={processing}
                        >
                            {processing ? 'Saving...' : 'Continue & Reset Data'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="flex h-full flex-col">
                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="mx-auto max-w-3xl space-y-4">
                        {/* Current Status Card */}
                        {currentConfig && (
                            <div className="rounded-lg border border-border bg-background p-3 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xs font-semibold">Current Configuration</h3>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            {currentConfig.driver === 'sqlite' ? 'SQLite' : 'PostgreSQL'} • {currentConfig.database}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">Status:</span>
                                        <span className={cn('text-xs font-medium', migrationStatusInfo.color)}>
                                            {migrationStatusInfo.text}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                    {/* Configuration Form */}
                    <form id="database-form" onSubmit={handleSubmit} className="space-y-4">
                        <div className="rounded-lg border border-border bg-background shadow-sm">
                            {/* Tabs */}
                            <div className="flex border-b border-border">
                                <button
                                    type="button"
                                    onClick={() => handleDriverChange('sqlite')}
                                    className={cn(
                                        'flex-1 px-4 py-2.5 text-sm font-medium transition-colors',
                                        driver === 'sqlite'
                                            ? 'border-b-2 border-primary bg-primary/5 text-primary'
                                            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                    )}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        {driver === 'sqlite' && <div className="size-1.5 rounded-full bg-primary" />}
                                        SQLite
                                    </div>
                                </button>
                                <div className="w-px bg-border" />
                                <button
                                    type="button"
                                    onClick={() => handleDriverChange('pgsql')}
                                    className={cn(
                                        'flex-1 px-4 py-2.5 text-sm font-medium transition-colors',
                                        driver === 'pgsql'
                                            ? 'border-b-2 border-primary bg-primary/5 text-primary'
                                            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                    )}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        {driver === 'pgsql' && <div className="size-1.5 rounded-full bg-primary" />}
                                        PostgreSQL
                                    </div>
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-4">
                                {driver === 'sqlite' && (
                                    <div>
                                        <Label htmlFor="database" className="text-xs font-medium">Database Path</Label>
                                        <p className="mb-1.5 mt-0.5 text-xs text-muted-foreground">Relative to project root</p>
                                        <Input
                                            id="database"
                                            value={data.database}
                                            onChange={(e) => setData('database', e.target.value)}
                                            placeholder="database/tenant.sqlite"
                                            required
                                            className="h-9"
                                        />
                                        {errors.database && <p className="mt-1 text-xs text-destructive">{errors.database}</p>}
                                    </div>
                                )}

                                {driver === 'pgsql' && (
                                    <div className="space-y-3">
                                        <div className="flex gap-2 rounded-md border border-blue-200 bg-blue-50 p-2.5 dark:border-blue-800 dark:bg-blue-950/20">
                                            <Info className="size-3.5 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                                            <p className="text-xs text-blue-700 dark:text-blue-300">
                                                Find in Supabase: Dashboard → Project Settings → Database → Connection String
                                            </p>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="grid gap-3 md:grid-cols-2">
                                                <div className="md:col-span-2">
                                                    <Label htmlFor="host" className="text-xs">Host</Label>
                                                    <Input
                                                        id="host"
                                                        value={data.host}
                                                        onChange={(e) => setData('host', e.target.value)}
                                                        placeholder="db.xxxxxxxxxxxxx.supabase.co"
                                                        className="mt-1 h-9"
                                                        required
                                                    />
                                                    {errors.host && <p className="mt-1 text-xs text-destructive">{errors.host}</p>}
                                                </div>

                                                <div>
                                                    <Label htmlFor="port" className="text-xs">Port</Label>
                                                    <Input
                                                        id="port"
                                                        value={data.port}
                                                        onChange={(e) => setData('port', e.target.value)}
                                                        placeholder="5432"
                                                        className="mt-1 h-9"
                                                    />
                                                    {errors.port && <p className="mt-1 text-xs text-destructive">{errors.port}</p>}
                                                </div>

                                                <div>
                                                    <Label htmlFor="database_name" className="text-xs">Database</Label>
                                                    <Input
                                                        id="database_name"
                                                        value={data.database}
                                                        onChange={(e) => setData('database', e.target.value)}
                                                        placeholder="postgres"
                                                        className="mt-1 h-9"
                                                        required
                                                    />
                                                    {errors.database && <p className="mt-1 text-xs text-destructive">{errors.database}</p>}
                                                </div>
                                            </div>

                                            <div className="relative py-1.5">
                                                <div className="absolute inset-0 flex items-center">
                                                    <div className="w-full border-t border-border" />
                                                </div>
                                                <div className="relative flex justify-center">
                                                    <span className="bg-background px-2 text-xs text-muted-foreground">Credentials</span>
                                                </div>
                                            </div>

                                            <div className="grid gap-3 md:grid-cols-2">
                                                <div>
                                                    <Label htmlFor="username" className="text-xs">Username</Label>
                                                    <Input
                                                        id="username"
                                                        value={data.username}
                                                        onChange={(e) => setData('username', e.target.value)}
                                                        placeholder="postgres"
                                                        className="mt-1 h-9"
                                                        required
                                                    />
                                                    {errors.username && <p className="mt-1 text-xs text-destructive">{errors.username}</p>}
                                                </div>

                                                <div>
                                                    <Label htmlFor="password" className="text-xs">Password</Label>
                                                    <Input
                                                        id="password"
                                                        type="password"
                                                        value={data.password}
                                                        onChange={(e) => setData('password', e.target.value)}
                                                        placeholder="••••••••"
                                                        className="mt-1 h-9"
                                                        autoComplete="new-password"
                                                    />
                                                    {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password}</p>}
                                                </div>
                                            </div>

                                            <p className="text-xs text-muted-foreground">Password will be encrypted</p>
                                        </div>

                                        {errors.connection && errors.connection.includes('could not translate host name') && (
                                            <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/20">
                                                <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                                                <div>
                                                    <p className="text-xs font-medium text-amber-900 dark:text-amber-100">DNS Issue</p>
                                                    <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">
                                                        Check "Skip test" below if your local network blocks Supabase.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {errors.connection && (
                            <div className="flex gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-2.5">
                                <AlertCircle className="size-3.5 shrink-0 text-destructive mt-0.5" />
                                <div>
                                    <p className="text-xs font-medium text-destructive">Connection Failed</p>
                                    <p className="mt-0.5 text-xs text-destructive/70">{errors.connection}</p>
                                </div>
                            </div>
                        )}

                        {/* Migration Runner Box */}
                        <div className="rounded-lg border border-border bg-background shadow-sm">
                            <div className="flex items-center justify-between p-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-xs font-medium">Database Migrations</h3>
                                        {currentConfig && driver === currentConfig.driver && migrationStatus.status === 'migrated' && (
                                            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                                <CheckCircle2 className="size-3" />
                                                Complete
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        {!currentConfig 
                                            ? 'Save configuration first'
                                            : driver !== currentConfig.driver
                                            ? 'Save this configuration first'
                                            : migrationStatus.status === 'migrated'
                                            ? 'All migrations complete'
                                            : 'Run to create database tables'}
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    onClick={handleMigrate}
                                    disabled={!currentConfig || driver !== currentConfig.driver || isMigrating || migrationStatus.status === 'migrated'}
                                    size="sm"
                                    className="h-8"
                                >
                                    {isMigrating ? (
                                        <>
                                            <Loader2 className="size-3.5 animate-spin" />
                                            Running...
                                        </>
                                    ) : (
                                        <>
                                            <PlayCircle className="size-3.5" />
                                            Run
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            {/* Sticky Footer */}
            <div className="flex-shrink-0 border-t border-border bg-surface px-6 py-2">
                <div className="mx-auto flex max-w-3xl items-center justify-between">
                    <div className="flex items-center gap-2">
                        <p className="text-[11px] text-muted-foreground">Connection tested before saving</p>
                        {driver === 'pgsql' && (
                            <label className="flex cursor-pointer items-center gap-1 text-[11px] text-muted-foreground">
                                <input
                                    type="checkbox"
                                    checked={data.skip_test || false}
                                    onChange={(e) => setData('skip_test', e.target.checked)}
                                    className="size-3 rounded border-input"
                                />
                                Skip test
                            </label>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {currentConfig && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    const resetData = {
                                        driver: currentConfig.driver,
                                        host: currentConfig.host || '',
                                        port: currentConfig.port || '',
                                        database: currentConfig.database || '',
                                        username: currentConfig.username || '',
                                        password: '',
                                        skip_test: false,
                                    };
                                    setDriver(currentConfig.driver);
                                    setData(resetData);
                                    localStorage.removeItem('database_setup_form');
                                    localStorage.removeItem('database_setup_form_drivers');
                                }}
                                disabled={processing}
                                className="h-7 text-xs"
                            >
                                Reset
                            </Button>
                        )}
                        <Button 
                            type="submit"
                            form="database-form"
                            disabled={processing}
                            size="sm"
                            className="h-7 px-4 text-xs"
                        >
                            {processing ? 'Saving...' : 'Save Configuration'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
        </>
    );
}
