import { FileText, Upload, CheckCircle, Signature, AlertCircle } from 'lucide-react';

export function ActionIcon({ type }) {
    const iconProps = { className: "w-4 h-4" };
    switch (type) {
        case 'check_documents':
            return <FileText {...iconProps} />;
        case 'upload_documents':
            return <Upload {...iconProps} />;
        case 'make_decision':
            return <CheckCircle {...iconProps} />;
        case 'sign_documents':
            return <Signature {...iconProps} />;
        default:
            return <AlertCircle {...iconProps} />;
    }
}

export function ActionBadge({ type }) {
    const typeConfig = {
        'check_documents': { label: 'Check Documents', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
        'upload_documents': { label: 'Upload Documents', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
        'make_decision': { label: 'Make Decision', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
        'sign_documents': { label: 'Sign Documents', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
    };
    const config = typeConfig[type] || typeConfig['check_documents'];
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
            <ActionIcon type={type} />
            {config.label}
        </span>
    );
}
