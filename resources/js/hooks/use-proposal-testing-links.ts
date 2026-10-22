import { useCallback, useEffect, useState } from 'react';

const storageKey = 'admin-proposal-testing-links';
const changeEvent = 'proposal-testing-links-change';

export function useProposalTestingLinks(): [boolean, (enabled: boolean) => void] {
    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
        const updateFromStorage = () => {
            setEnabled(window.localStorage.getItem(storageKey) === 'true');
        };

        updateFromStorage();
        window.addEventListener('storage', updateFromStorage);
        window.addEventListener(changeEvent, updateFromStorage);

        return () => {
            window.removeEventListener('storage', updateFromStorage);
            window.removeEventListener(changeEvent, updateFromStorage);
        };
    }, []);

    const updateEnabled = useCallback((nextEnabled: boolean) => {
        window.localStorage.setItem(storageKey, String(nextEnabled));
        window.dispatchEvent(new Event(changeEvent));
        setEnabled(nextEnabled);
    }, []);

    return [enabled, updateEnabled];
}
