import { useForm, router } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, Info, Loader2, PlayCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type DatabaseConfigModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
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

export default function DatabaseConfigModal({
    open,
    onOpenChange,
    currentConfig = null,
    migrationStatus = { status: 'no_config' },
}: DatabaseConfigModalProps) {
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

    const getSavedFormData = () => {
        try {
            const savedDriversData = localStorage.getItem('database_setup_form_drivers');
            if (savedDriversData) {
                const driversData = JSON.parse(savedDriversData);
                const driverData = driversData[`${initialDriver}_data`];
                if (driverData) {
                    return driverData;
                }
            }

            const saved = localStorage.getItem('database_setup_form');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error('Error loading saved form data:', e);
        }

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

    const { data, setData, post, processing, errors } = useForm(getSavedFormData());

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            try {
                const dataToSave = { ...data, password: '' };
                localStorage.setItem('database_setup_form', JSON.stringify(dataToSave));
            } catch (e) {
                console.error('Error saving form data:', e);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [data]);

    const handleDriverChange = (value: string) => {
        const currentDriver = driver;
        const savedData = JSON.parse(localStorage.getItem('database_setup_form') || '{}');

        const stateToSave = {
            [`${currentDriver}_data`]: { ...data, password: '' },
            ...savedData,
        };
        localStorage.setItem('database_setup_form_drivers', JSON.stringify(stateToSave));

        setDriver(value);

        const savedDriversData = JSON.parse(localStorage.getItem('database_setup_form_drivers') || '{}');
        const savedForDriver = savedDriversData[`${value}_data`];

        if (savedForDriver) {
            setData(savedForDriver);
        } else {
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/settings/database', {
            onSuccess: () => {
                toast.success('Database configuration saved successfully.');
                setData('password', '');
                localStorage.removeItem('database_setup_form');
                localStorage.removeItem('database_setup_form_drivers');
            },
            onError: (errors) => {
                if (errors.connection) {
                    toast.error(errors.connection);
                } else {
                    toast.error('Failed to save database configuration.');
                }
            },
        });
    };

    const handleMigrate = () => {
        if (!currentConfig) {
            toast.error('Please save database configuration first.');
            return;
        }

        setIsMigrating(true);
        router.post(
            '/settings/database/migrate',
            {},
            {
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
            }
        );
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
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Database Configuration</DialogTitle>
                    <DialogDescription>
                        Configure your tenant database connection settings
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="rounded-lg border border-border bg-background">
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
                                    SQLite (Local)
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
                                    Supabase (PostgreSQL)
                                </div>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4">
                            {driver === 'sqlite' && (
                                <div>
                                    <Label htmlFor="database" className="text-sm font-medium">
                                        Database Path
                                    </Label>
                                    <p className="mb-2 mt-0.5 text-xs text-muted-foreground">Relative to project root</p>
                                    <Input
                                        id="database"
                                        value={data.database}
                                        onChange={(e) => setData('database', e.target.value)}
                                        placeholder="database/tenant.sqlite"
                                        required
                                    />
                                    {errors.database && <p className="mt-1 text-[11px] text-destructive">{errors.database}</p>}
                                </div>
                            )}

                            {driver === 'pgsql' && (
                                <div className="space-y-4">
                                    <div className="flex gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/20">
                                        <Info className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
                                        <p className="text-xs text-blue-700 dark:text-blue-300">
                                            Dashboard → Project Settings → Database → Connection String
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="grid gap-3 md:grid-cols-2">
                                            <div className="md:col-span-2">
                                                <Label htmlFor="host" className="text-sm">
                                                    Host
                                                </Label>
                                                <Input
                                                    id="host"
                                                    value={data.host}
                                                    onChange={(e) => setData('host', e.target.value)}
                                                    placeholder="db.xxxxxxxxxxxxx.supabase.co"
                                                    className="mt-1.5"
                                                    required
                                                />
                                                {errors.host && <p className="mt-1 text-[11px] text-destructive">{errors.host}</p>}
                                            </div>

                                            <div>
                                                <Label htmlFor="port" className="text-sm">
                                                    Port
                                                </Label>
                                                <Input
                                                    id="port"
                                                    value={data.port}
                                                    onChange={(e) => setData('port', e.target.value)}
                                                    placeholder="5432"
                                                    className="mt-1.5"
                                                />
                                                {errors.port && <p className="mt-1 text-[11px] text-destructive">{errors.port}</p>}
                                            </div>

                                            <div>
                                                <Label htmlFor="database_name" className="text-sm">
                                                    Database
                                                </Label>
                                                <Input
                                                    id="database_name"
                                                    value={data.database}
                                                    onChange={(e) => setData('database', e.target.value)}
                                                    placeholder="postgres"
                                                    className="mt-1.5"
                                                    required
                                                />
                                                {errors.database ? (
                                                    <p className="mt-1 text-[11px] text-destructive">{errors.database}</p>
                                                ) : (
                                                    <p className="mt-1 text-[11px] text-muted-foreground">Usually "postgres"</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="relative py-2">
                                            <div className="absolute inset-0 flex items-center">
                                                <div className="w-full border-t border-border" />
                                            </div>
                                            <div className="relative flex justify-center">
                                                <span className="bg-background px-2 text-[11px] text-muted-foreground">Credentials</span>
                                            </div>
                                        </div>

                                        <div className="grid gap-3 md:grid-cols-2">
                                            <div>
                                                <Label htmlFor="username" className="text-sm">
                                                    Username
                                                </Label>
                                                <Input
                                                    id="username"
                                                    value={data.username}
                                                    onChange={(e) => setData('username', e.target.value)}
                                                    placeholder="postgres"
                                                    className="mt-1.5"
                                                    required
                                                />
                                                {errors.username ? (
                                                    <p className="mt-1 text-[11px] text-destructive">{errors.username}</p>
                                                ) : (
                                                    <p className="mt-1 text-[11px] text-muted-foreground">Usually "postgres"</p>
                                                )}
                                            </div>

                                            <div>
                                                <Label htmlFor="password" className="text-sm">
                                                    Password
                                                </Label>
                                                <Input
                                                    id="password"
                                                    type="password"
                                                    value={data.password}
                                                    onChange={(e) => setData('password', e.target.value)}
                                                    placeholder="••••••••"
                                                    className="mt-1.5"
                                                    autoComplete="new-password"
                                                />
                                                {errors.password && <p className="mt-1 text-[11px] text-destructive">{errors.password}</p>}
                                            </div>
                                        </div>

                                        <p className="text-[11px] text-muted-foreground">Password will be encrypted</p>
                                    </div>

                                    {errors.connection && errors.connection.includes('could not translate host name') && (
                                        <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/20">
                                            <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                                            <div>
                                                <p className="text-xs font-medium text-amber-900 dark:text-amber-100">DNS Issue</p>
                                                <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-300">
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
                        <div className="flex gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-3">
                            <AlertCircle className="size-4 shrink-0 text-destructive" />
                            <div>
                                <p className="text-xs font-medium text-destructive">Connection Failed</p>
                                <p className="mt-0.5 text-[11px] text-destructive/70">{errors.connection}</p>
                            </div>
                        </div>
                    )}

                    {errors.migration && (
                        <div className="flex gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-3">
                            <AlertCircle className="size-4 shrink-0 text-destructive" />
                            <div>
                                <p className="text-xs font-medium text-destructive">Migration Failed</p>
                                <p className="mt-0.5 text-[11px] text-destructive/70">{errors.migration}</p>
                            </div>
                        </div>
                    )}

                    {/* Migration Runner */}
                    <div className="rounded-lg border border-border bg-background">
                        <div className="flex items-center justify-between p-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-medium">Database Migrations</h3>
                                    {currentConfig && driver === currentConfig.driver && migrationStatus.status === 'migrated' && (
                                        <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                            <CheckCircle2 className="size-3.5" />
                                            Complete
                                        </span>
                                    )}
                                </div>
                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                    {!currentConfig
                                        ? 'Save configuration first to enable migrations'
                                        : driver !== currentConfig.driver
                                          ? 'Save this configuration first, then run migrations'
                                          : migrationStatus.status === 'migrated'
                                            ? 'All migrations have been run successfully'
                                            : 'Run migrations to create database tables'}
                                </p>
                            </div>
                            <Button
                                type="button"
                                onClick={handleMigrate}
                                disabled={!currentConfig || driver !== currentConfig.driver || isMigrating || migrationStatus.status === 'migrated'}
                                size="sm"
                                className="h-8 gap-1.5 text-xs"
                            >
                                {isMigrating ? (
                                    <>
                                        <Loader2 className="size-3.5 animate-spin" />
                                        Running...
                                    </>
                                ) : (
                                    <>
                                        <PlayCircle className="size-3.5" />
                                        Run Migrations
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </form>

                <DialogFooter className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <p className="text-xs text-muted-foreground">Connection tested before saving</p>
                        {driver === 'pgsql' && (
                            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                                <input
                                    type="checkbox"
                                    checked={data.skip_test || false}
                                    onChange={(e) => setData('skip_test', e.target.checked)}
                                    className="size-3.5 rounded border-input"
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
                            >
                                Reset
                            </Button>
                        )}
                        <Button type="submit" onClick={handleSubmit} disabled={processing} size="sm">
                            {processing ? 'Saving...' : 'Save Configuration'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
