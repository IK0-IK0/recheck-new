import { FileText, File, Download, Eye } from 'lucide-react';

export default function DocumentCard({ document }) {
    // Determine icon based on file extension
    const getFileIcon = (fileName) => {
        const extension = fileName.split('.').pop().toLowerCase();
        if (['pdf', 'doc', 'docx'].includes(extension)) {
            return <FileText className="w-8 h-8 text-gray-500 dark:text-gray-400" />;
        }
        return <File className="w-8 h-8 text-gray-500 dark:text-gray-400" />;
    };

    // Get label badge color
    const getLabelColor = (label) => {
        if (label === 'forms') {
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
        }
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    };

    // Truncate long file names
    const truncateName = (name, maxLength = 30) => {
        if (name.length <= maxLength) return name;
        const extension = name.split('.').pop();
        const nameWithoutExt = name.substring(0, name.lastIndexOf('.'));
        const truncated = nameWithoutExt.substring(0, maxLength - extension.length - 4);
        return `${truncated}...${extension}`;
    };

    const handleView = () => {
        // Non-functional
    };

    const handleDownload = () => {
        // Non-functional
    };

    return (
        <div className="
            border border-gray-200 dark:border-gray-700 rounded-lg p-4
            bg-white dark:bg-gray-800
            shadow-sm hover:shadow-md
            transition-all duration-200 ease-in-out
            hover:border-gray-300 dark:hover:border-gray-600
        ">
            {/* Mobile: Stack layout */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Icon */}
                <div className="flex-shrink-0">
                    {getFileIcon(document.name)}
                </div>

                {/* Document Info */}
                <div className="flex-1 min-w-0 space-y-2">
                    {/* Document Name */}
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {truncateName(document.name)}
                    </h3>

                    {/* Label Badge */}
                    <div>
                        <span className={`
                            inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${getLabelColor(document.label)}
                        `}>
                            {document.label === 'forms' ? 'Forms' : 'Docs'}
                        </span>
                    </div>

                    {/* Upload Date and File Size */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span>{document.uploadedAt}</span>
                        <span className="hidden sm:inline">•</span>
                        <span>{document.size}</span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        type="button"
                        onClick={handleView}
                        className="
                            inline-flex items-center justify-center p-2
                            text-gray-600 dark:text-gray-400
                            hover:text-gray-900 dark:hover:text-gray-200
                            hover:bg-gray-100 dark:hover:bg-gray-700
                            rounded-md transition duration-150 ease-in-out
                            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                        "
                        title="View document"
                    >
                        <Eye className="w-5 h-5" />
                    </button>
                    <button
                        type="button"
                        onClick={handleDownload}
                        className="
                            inline-flex items-center justify-center p-2
                            text-gray-600 dark:text-gray-400
                            hover:text-gray-900 dark:hover:text-gray-200
                            hover:bg-gray-100 dark:hover:bg-gray-700
                            rounded-md transition duration-150 ease-in-out
                            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                        "
                        title="Download document"
                    >
                        <Download className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
