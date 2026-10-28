import { usePage } from '@inertiajs/react';
import { ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProposalTestingLinks } from '@/hooks/use-proposal-testing-links';

export default function ProposalTestingToggle() {
    const { auth } = usePage().props as {
        auth?: { user?: { role?: string } };
    };
    const [enabled, setEnabled] = useProposalTestingLinks();

    if (auth?.user?.role !== 'institution') {
        return null;
    }

    return (
        <Button
            type="button"
            variant={enabled ? 'default' : 'outline'}
            size="sm"
            aria-pressed={enabled}
            onClick={() => setEnabled(!enabled)}
        >
            <ClipboardList className="size-4" />
            Proposal testing
            <span className="text-xs">{enabled ? 'On' : 'Off'}</span>
        </Button>
    );
}
