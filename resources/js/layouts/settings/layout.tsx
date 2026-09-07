import { Settings } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import SettingsTabs from '@/components/SettingsTabs';

export default function SettingsLayout({ children }: PropsWithChildren) {
    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex-shrink-0 border-b border-border bg-surface">
                <div className="flex items-center gap-3 px-6 py-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                        <Settings className="size-4 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold">Settings</h1>
                        <p className="text-xs text-muted-foreground">Manage your account and application preferences</p>
                    </div>
                </div>
                
                {/* Tabs */}
                <SettingsTabs />
            </div>
            
            {/* Content - scrollable middle section */}
            <div className="flex-1 overflow-y-auto">
                {children}
            </div>
        </div>
    );
}
