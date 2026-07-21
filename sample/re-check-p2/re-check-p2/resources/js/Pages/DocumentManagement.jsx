import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import DocumentUploadModal from '@/Components/DocumentUploadModal';
import DocumentViewerModal from '@/Components/DocumentViewerModal';
import ConfirmDeleteModal from '@/Components/ConfirmDeleteModal';
import { Head, router } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { FileX, FileText, File, Download, Eye, Search, Plus, Edit, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function DocumentManagement({ documents: paginatedDocuments = {}, filters = {} }) {
    // Extract data from Laravel pagination object
    const initialDocuments = paginatedDocuments.data || [];
    const [documents, setDocuments] = useState(initialDocuments);
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [editingDocument, setEditingDocument] = useState(null);
    const [filterType, setFilterType] = useState(filters.filter || 'all');
    const [currentPage, setCurrentPage] = useState(paginatedDocuments.current_page || 1);
    const [itemsPerPage, setItemsPerPage] = useState(filters.per_page || 20);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [documentToDelete, setDocumentToDelete] = useState(null);
    const [viewerModalOpen, setViewerModalOpen] = useState(false);
    const [documentToView, setDocumentToView] = useState(null);
    const [viewerSignedUrl, setViewerSignedUrl] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    
    // Ref to track delete operation toast
    const deleteToastId = useRef(null);
    
    // Show loading toast when delete modal closes during operation
    useEffect(() => {
        if (!deleteModalOpen && isDeleting && !deleteToastId.current) {
            deleteToastId.current = toast.loading('Deleting document...');
        }
    }, [deleteModalOpen, isDeleting]);
    
    // Use server-side pagination data
    const totalItems = paginatedDocuments.total || 0;
    const totalPages = paginatedDocuments.last_page || 1;
    const startIndex = ((paginatedDocuments.current_page || 1) - 1) * (paginatedDocuments.per_page || 20);
    const endIndex = Math.min(startIndex + (paginatedDocuments.per_page || 20), totalItems);
    const paginatedDocumentsData = documents; // Use current documents state

    const handleEditDocument = (document) => {
        setEditingDocument(document);
        setIsUploadModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsUploadModalOpen(false);
        setEditingDocument(null);
    };

    const handleViewDocument = async (document) => {
        if (!document.file_path) {
            toast.error('File path not found');
            return;
        }

        try {
            // Generate signed URL for viewing
            const { data, error } = await supabase.storage
                .from('files')
                .createSignedUrl(document.file_path, 3600); // 1 hour expiry

            if (error) {
                console.error('Error generating signed URL:', error);
                toast.error('Failed to load document');
                return;
            }

            // Open viewer modal
            setDocumentToView(document);
            setViewerSignedUrl(data.signedUrl);
            setViewerModalOpen(true);
        } catch (error) {
            console.error('Error viewing document:', error);
            toast.error('Failed to view document');
        }
    };

    const handleCloseViewer = () => {
        setViewerModalOpen(false);
        setDocumentToView(null);
        setViewerSignedUrl(null);
    };

    const handleDownloadDocument = async (document) => {
        if (!document.file_path) {
            toast.error('File path not found');
            return;
        }

        try {
            // Download directly from Supabase storage
            const { data, error } = await supabase.storage
                .from('files')
                .download(document.file_path);

            if (error) {
                console.error('Error downloading file:', error);
                toast.error('Failed to download document');
                return;
            }

            // Create blob URL and trigger download
            const url = URL.createObjectURL(data);
            const link = window.document.createElement('a');
            link.href = url;
            link.download = document.name;
            window.document.body.appendChild(link);
            link.click();
            window.document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading document:', error);
            toast.error('Failed to download document');
        }
    };

    const handleDeleteDocument = (document) => {
        setDocumentToDelete(document);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!documentToDelete) return;

        setIsDeleting(true);

        try {
            // Delete from Supabase storage first
            if (documentToDelete.file_path) {
                const { error: storageError } = await supabase.storage
                    .from('files')
                    .remove([documentToDelete.file_path]);

                if (storageError) {
                    console.warn('Could not delete file from storage:', storageError);
                    // Continue with database deletion anyway
                }
            }

            // Delete from database
            router.delete(route('documents.destroy', documentToDelete.id), {
                onSuccess: () => {
                    // Dismiss loading toast and show success
                    if (deleteToastId.current) {
                        toast.dismiss(deleteToastId.current);
                        deleteToastId.current = null;
                    }
                    toast.success('Document deleted successfully');
                    
                    setIsDeleting(false);
                    setDeleteModalOpen(false);
                    setDocumentToDelete(null);
                    window.location.reload();
                },
                onError: (errors) => {
                    console.error('Delete failed:', errors);
                    
                    // Dismiss loading toast and show error
                    if (deleteToastId.current) {
                        toast.dismiss(deleteToastId.current);
                        deleteToastId.current = null;
                    }
                    toast.error('Failed to delete document');
                    
                    setIsDeleting(false);
                }
            });
        } catch (error) {
            console.error('Error deleting document:', error);
            
            // Dismiss loading toast and show error
            if (deleteToastId.current) {
                toast.dismiss(deleteToastId.current);
                deleteToastId.current = null;
            }
            toast.error('Failed to delete document');
            
            setIsDeleting(false);
        }
    };

    const cancelDelete = () => {
        if (isDeleting) return; // Prevent closing while deleting
        setDeleteModalOpen(false);
        setDocumentToDelete(null);
    };

    // Reset to first page when filters change and navigate to server
    const handleFilterChange = (newFilter) => {
        setFilterType(newFilter);
        // Navigate to server with new filter
        router.get(route('documents'), { 
            filter: newFilter, 
            search: searchQuery,
            per_page: itemsPerPage 
        }, { preserveState: true });
    };

    const handleSearchChange = (newSearch) => {
        setSearchQuery(newSearch);
        // Navigate to server with new search
        router.get(route('documents'), { 
            search: newSearch, 
            filter: filterType,
            per_page: itemsPerPage 
        }, { preserveState: true });
    };

    const handleItemsPerPageChange = (newItemsPerPage) => {
        setItemsPerPage(newItemsPerPage);
        // Navigate to server with new per_page
        router.get(route('documents'), { 
            per_page: newItemsPerPage,
            search: searchQuery,
            filter: filterType 
        }, { preserveState: true });
    };

    // Pagination navigation - navigate to server
    const goToFirstPage = () => {
        router.get(route('documents'), { 
            page: 1,
            search: searchQuery,
            filter: filterType,
            per_page: itemsPerPage 
        }, { preserveState: true });
    };
    
    const goToLastPage = () => {
        router.get(route('documents'), { 
            page: totalPages,
            search: searchQuery,
            filter: filterType,
            per_page: itemsPerPage 
        }, { preserveState: true });
    };
    
    const goToPrevPage = () => {
        const prevPage = Math.max(1, currentPage - 1);
        router.get(route('documents'), { 
            page: prevPage,
            search: searchQuery,
            filter: filterType,
            per_page: itemsPerPage 
        }, { preserveState: true });
    };
    
    const goToNextPage = () => {
        const nextPage = Math.min(totalPages, currentPage + 1);
        router.get(route('documents'), { 
            page: nextPage,
            search: searchQuery,
            filter: filterType,
            per_page: itemsPerPage 
        }, { preserveState: true });
    };

    // Get file icon based on file extension
    const getFileIcon = (fileName) => {
        const extension = fileName.split('.').pop().toLowerCase();
        if (['pdf', 'doc', 'docx'].includes(extension)) {
            return <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400" />;
        }
        return <File className="w-5 h-5 text-gray-500 dark:text-gray-400" />;
    };

    // Get label badge color
    const getLabelColor = (label) => {
        if (label === 'forms') {
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
        }
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    };

    return (
        <AuthenticatedLayout>
            <Head title="Document Management" />

            <div className="space-y-6">
                {/* Page Header */}
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        Document Management
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Upload, label, and manage your documents. Select a document type and upload your files.
                    </p>
                </div>

                {/* Document List Section */}
                <div className="space-y-4">
                    <div className="flex flex-col gap-4">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Your Documents
                            </h2>
                            
                            {/* New Document Button - Always visible */}
                            <button
                                onClick={() => setIsUploadModalOpen(true)}
                                className="
                                    inline-flex items-center justify-center gap-2 px-4 py-2 sm:w-auto
                                    text-xs font-semibold uppercase tracking-widest
                                    text-primary-foreground bg-primary
                                    border border-transparent rounded-md
                                    hover:bg-primary/90
                                    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                                    transition duration-150 ease-in-out
                                    whitespace-nowrap
                                "
                            >
                                <Plus className="w-4 h-4" />
                                New Document
                            </button>
                        </div>

                        {/* Search and Filter Controls */}
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                            {/* Filter Dropdown */}
                            <div className="relative sm:w-auto">
                                <select
                                    value={filterType}
                                    onChange={(e) => handleFilterChange(e.target.value)}
                                    className="
                                        w-full sm:w-auto pl-10 pr-4 py-2
                                        border border-gray-300 dark:border-gray-600 
                                        rounded-md 
                                        bg-white dark:bg-gray-800 
                                        text-gray-900 dark:text-gray-100
                                        focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                                        text-sm appearance-none
                                    "
                                >
                                    <option value="all">All Types</option>
                                    <option value="forms">Forms</option>
                                    <option value="docs">Docs</option>
                                </select>
                                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>

                            {/* Search Bar */}
                            <div className="relative flex-1 sm:max-w-md lg:max-w-lg">
                                <input
                                    type="text"
                                    placeholder="Search documents..."
                                    value={searchQuery}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    className="
                                        w-full pl-10 pr-4 py-2
                                        border border-gray-300 dark:border-gray-600 
                                        rounded-md 
                                        bg-white dark:bg-gray-800 
                                        text-gray-900 dark:text-gray-100
                                        focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                                        text-sm
                                    "
                                />
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            </div>
                        </div>
                    </div>

                    {paginatedDocumentsData.length > 0 ? (
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                            {/* Desktop Table View */}
                            <div className="hidden md:block">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-900">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Document
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Type
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Size
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Uploaded
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {paginatedDocumentsData.map((document) => (
                                            <tr key={document.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        {getFileIcon(document.name)}
                                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                            {document.name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`
                                                        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                        ${getLabelColor(document.label)}
                                                    `}>
                                                        {document.label === 'forms' ? 'Forms' : 'Docs'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {document.size}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {document.uploadedAt}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEditDocument(document)}
                                                            className="
                                                                inline-flex items-center justify-center p-2
                                                                text-gray-600 dark:text-gray-400
                                                                hover:text-gray-900 dark:hover:text-gray-200
                                                                hover:bg-gray-100 dark:hover:bg-gray-700
                                                                rounded-md transition duration-150 ease-in-out
                                                            "
                                                            title="Edit document"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleViewDocument(document)}
                                                            className="
                                                                inline-flex items-center justify-center p-2
                                                                text-gray-600 dark:text-gray-400
                                                                hover:text-gray-900 dark:hover:text-gray-200
                                                                hover:bg-gray-100 dark:hover:bg-gray-700
                                                                rounded-md transition duration-150 ease-in-out
                                                            "
                                                            title="View document"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDownloadDocument(document)}
                                                            className="
                                                                inline-flex items-center justify-center p-2
                                                                text-gray-600 dark:text-gray-400
                                                                hover:text-gray-900 dark:hover:text-gray-200
                                                                hover:bg-gray-100 dark:hover:bg-gray-700
                                                                rounded-md transition duration-150 ease-in-out
                                                            "
                                                            title="Download document"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteDocument(document)}
                                                            className="
                                                                inline-flex items-center justify-center p-2
                                                                text-red-600 dark:text-red-400
                                                                hover:text-red-900 dark:hover:text-red-200
                                                                hover:bg-red-100 dark:hover:bg-red-900/20
                                                                rounded-md transition duration-150 ease-in-out
                                                            "
                                                            title="Delete document"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
                                {paginatedDocumentsData.map((document) => (
                                    <div key={document.id} className="p-4 space-y-3">
                                        {/* Document Info */}
                                        <div className="flex items-start gap-3">
                                            <div className="flex-shrink-0 mt-1">
                                                {getFileIcon(document.name)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                                    {document.name}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`
                                                        inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                                                        ${getLabelColor(document.label)}
                                                    `}>
                                                        {document.label === 'forms' ? 'Forms' : 'Docs'}
                                                    </span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        {document.size}
                                                    </span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        {document.uploadedAt}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                            <button
                                                type="button"
                                                onClick={() => handleEditDocument(document)}
                                                className="
                                                    inline-flex items-center gap-1 px-3 py-1.5 text-xs
                                                    text-gray-600 dark:text-gray-400
                                                    hover:text-gray-900 dark:hover:text-gray-200
                                                    hover:bg-gray-100 dark:hover:bg-gray-700
                                                    rounded-md transition duration-150 ease-in-out
                                                "
                                            >
                                                <Edit className="w-3 h-3" />
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleViewDocument(document)}
                                                className="
                                                    inline-flex items-center gap-1 px-3 py-1.5 text-xs
                                                    text-gray-600 dark:text-gray-400
                                                    hover:text-gray-900 dark:hover:text-gray-200
                                                    hover:bg-gray-100 dark:hover:bg-gray-700
                                                    rounded-md transition duration-150 ease-in-out
                                                "
                                            >
                                                <Eye className="w-3 h-3" />
                                                View
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDownloadDocument(document)}
                                                className="
                                                    inline-flex items-center gap-1 px-3 py-1.5 text-xs
                                                    text-gray-600 dark:text-gray-400
                                                    hover:text-gray-900 dark:hover:text-gray-200
                                                    hover:bg-gray-100 dark:hover:bg-gray-700
                                                    rounded-md transition duration-150 ease-in-out
                                                "
                                            >
                                                <Download className="w-3 h-3" />
                                                Download
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteDocument(document)}
                                                className="
                                                    inline-flex items-center gap-1 px-3 py-1.5 text-xs
                                                    text-red-600 dark:text-red-400
                                                    hover:text-red-900 dark:hover:text-red-200
                                                    hover:bg-red-100 dark:hover:bg-red-900/20
                                                    rounded-md transition duration-150 ease-in-out
                                                "
                                            >
                                                <Trash2 className="w-3 h-3" />
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination Controls - Always show */}
                            <div className="px-4 sm:px-6 lg:px-8 py-4 border-t border-gray-200 dark:border-gray-700">
                                {/* Mobile Layout (< sm) */}
                                <div className="sm:hidden space-y-4">
                                    {/* Items per page - centered */}
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">Show:</span>
                                        <select
                                            value={itemsPerPage}
                                            onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                                            className="
                                                px-3 py-1 text-sm
                                                border border-gray-300 dark:border-gray-600 
                                                rounded-md 
                                                bg-white dark:bg-gray-800 
                                                text-gray-900 dark:text-gray-100
                                                focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                                            "
                                        >
                                            <option value={10}>10</option>
                                            <option value={20}>20</option>
                                            <option value={30}>30</option>
                                            <option value={40}>40</option>
                                            <option value={50}>50</option>
                                        </select>
                                        <span className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">per page</span>
                                    </div>

                                    {/* Results info - centered */}
                                    <div className="text-sm text-gray-700 dark:text-gray-300 text-center">
                                        {totalItems > 0 
                                            ? `Showing ${startIndex + 1} to ${Math.min(endIndex, totalItems)} of ${totalItems} results`
                                            : 'No results to show'
                                        }
                                    </div>

                                    {/* Navigation buttons - centered */}
                                    <div className="flex items-center justify-center gap-1">
                                        <button
                                            onClick={goToFirstPage}
                                            disabled={currentPage === 1 || totalPages === 0}
                                            className="
                                                p-2 rounded-md
                                                text-gray-600 dark:text-gray-400
                                                hover:text-gray-900 dark:hover:text-gray-200
                                                hover:bg-gray-100 dark:hover:bg-gray-700
                                                disabled:opacity-50 disabled:cursor-not-allowed
                                                transition duration-150 ease-in-out
                                            "
                                            title="First page"
                                        >
                                            <ChevronsLeft className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={goToPrevPage}
                                            disabled={currentPage === 1 || totalPages === 0}
                                            className="
                                                p-2 rounded-md
                                                text-gray-600 dark:text-gray-400
                                                hover:text-gray-900 dark:hover:text-gray-200
                                                hover:bg-gray-100 dark:hover:bg-gray-700
                                                disabled:opacity-50 disabled:cursor-not-allowed
                                                transition duration-150 ease-in-out
                                            "
                                            title="Previous page"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        
                                        <span className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                            {totalPages > 0 ? `Page ${currentPage} of ${totalPages}` : 'Page 0 of 0'}
                                        </span>
                                        
                                        <button
                                            onClick={goToNextPage}
                                            disabled={currentPage === totalPages || totalPages === 0}
                                            className="
                                                p-2 rounded-md
                                                text-gray-600 dark:text-gray-400
                                                hover:text-gray-900 dark:hover:text-gray-200
                                                hover:bg-gray-100 dark:hover:bg-gray-700
                                                disabled:opacity-50 disabled:cursor-not-allowed
                                                transition duration-150 ease-in-out
                                            "
                                            title="Next page"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={goToLastPage}
                                            disabled={currentPage === totalPages || totalPages === 0}
                                            className="
                                                p-2 rounded-md
                                                text-gray-600 dark:text-gray-400
                                                hover:text-gray-900 dark:hover:text-gray-200
                                                hover:bg-gray-100 dark:hover:bg-gray-700
                                                disabled:opacity-50 disabled:cursor-not-allowed
                                                transition duration-150 ease-in-out
                                            "
                                            title="Last page"
                                        >
                                            <ChevronsRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Tablet Layout (sm to lg) */}
                                <div className="hidden sm:flex lg:hidden flex-col gap-3">
                                    {/* Top row: Items per page and results info */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">Show:</span>
                                            <select
                                                value={itemsPerPage}
                                                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                                                className="
                                                    px-3 py-1 text-sm
                                                    border border-gray-300 dark:border-gray-600 
                                                    rounded-md 
                                                    bg-white dark:bg-gray-800 
                                                    text-gray-900 dark:text-gray-100
                                                    focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                                                "
                                            >
                                                <option value={10}>10</option>
                                                <option value={20}>20</option>
                                                <option value={30}>30</option>
                                                <option value={40}>40</option>
                                                <option value={50}>50</option>
                                            </select>
                                            <span className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">per page</span>
                                        </div>

                                        <div className="text-sm text-gray-700 dark:text-gray-300">
                                            {totalItems > 0 
                                                ? `Showing ${startIndex + 1} to ${Math.min(endIndex, totalItems)} of ${totalItems} results`
                                                : 'No results to show'
                                            }
                                        </div>
                                    </div>

                                    {/* Bottom row: Navigation buttons centered */}
                                    <div className="flex items-center justify-center gap-1">
                                        <button
                                            onClick={goToFirstPage}
                                            disabled={currentPage === 1 || totalPages === 0}
                                            className="
                                                p-2 rounded-md
                                                text-gray-600 dark:text-gray-400
                                                hover:text-gray-900 dark:hover:text-gray-200
                                                hover:bg-gray-100 dark:hover:bg-gray-700
                                                disabled:opacity-50 disabled:cursor-not-allowed
                                                transition duration-150 ease-in-out
                                            "
                                            title="First page"
                                        >
                                            <ChevronsLeft className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={goToPrevPage}
                                            disabled={currentPage === 1 || totalPages === 0}
                                            className="
                                                p-2 rounded-md
                                                text-gray-600 dark:text-gray-400
                                                hover:text-gray-900 dark:hover:text-gray-200
                                                hover:bg-gray-100 dark:hover:bg-gray-700
                                                disabled:opacity-50 disabled:cursor-not-allowed
                                                transition duration-150 ease-in-out
                                            "
                                            title="Previous page"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        
                                        <span className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                            {totalPages > 0 ? `Page ${currentPage} of ${totalPages}` : 'Page 0 of 0'}
                                        </span>
                                        
                                        <button
                                            onClick={goToNextPage}
                                            disabled={currentPage === totalPages || totalPages === 0}
                                            className="
                                                p-2 rounded-md
                                                text-gray-600 dark:text-gray-400
                                                hover:text-gray-900 dark:hover:text-gray-200
                                                hover:bg-gray-100 dark:hover:bg-gray-700
                                                disabled:opacity-50 disabled:cursor-not-allowed
                                                transition duration-150 ease-in-out
                                            "
                                            title="Next page"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={goToLastPage}
                                            disabled={currentPage === totalPages || totalPages === 0}
                                            className="
                                                p-2 rounded-md
                                                text-gray-600 dark:text-gray-400
                                                hover:text-gray-900 dark:hover:text-gray-200
                                                hover:bg-gray-100 dark:hover:bg-gray-700
                                                disabled:opacity-50 disabled:cursor-not-allowed
                                                transition duration-150 ease-in-out
                                            "
                                            title="Last page"
                                        >
                                            <ChevronsRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Desktop Layout (lg+) */}
                                <div className="hidden lg:flex items-center justify-between">
                                    <div className="flex items-center gap-6">
                                        {/* Items per page selector */}
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">Show:</span>
                                            <select
                                                value={itemsPerPage}
                                                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                                                className="
                                                    px-3 py-1 text-sm
                                                    border border-gray-300 dark:border-gray-600 
                                                    rounded-md 
                                                    bg-white dark:bg-gray-800 
                                                    text-gray-900 dark:text-gray-100
                                                    focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                                                "
                                            >
                                                <option value={10}>10</option>
                                                <option value={20}>20</option>
                                                <option value={30}>30</option>
                                                <option value={40}>40</option>
                                                <option value={50}>50</option>
                                            </select>
                                            <span className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">per page</span>
                                        </div>

                                        {/* Results info */}
                                        <div className="text-sm text-gray-700 dark:text-gray-300">
                                            {totalItems > 0 
                                                ? `Showing ${startIndex + 1} to ${Math.min(endIndex, totalItems)} of ${totalItems} results`
                                                : 'No results to show'
                                            }
                                        </div>
                                    </div>

                                    {/* Navigation buttons */}
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={goToFirstPage}
                                            disabled={currentPage === 1 || totalPages === 0}
                                            className="
                                                p-2 rounded-md
                                                text-gray-600 dark:text-gray-400
                                                hover:text-gray-900 dark:hover:text-gray-200
                                                hover:bg-gray-100 dark:hover:bg-gray-700
                                                disabled:opacity-50 disabled:cursor-not-allowed
                                                transition duration-150 ease-in-out
                                            "
                                            title="First page"
                                        >
                                            <ChevronsLeft className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={goToPrevPage}
                                            disabled={currentPage === 1 || totalPages === 0}
                                            className="
                                                p-2 rounded-md
                                                text-gray-600 dark:text-gray-400
                                                hover:text-gray-900 dark:hover:text-gray-200
                                                hover:bg-gray-100 dark:hover:bg-gray-700
                                                disabled:opacity-50 disabled:cursor-not-allowed
                                                transition duration-150 ease-in-out
                                            "
                                            title="Previous page"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        
                                        <span className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                            {totalPages > 0 ? `Page ${currentPage} of ${totalPages}` : 'Page 0 of 0'}
                                        </span>
                                        
                                        <button
                                            onClick={goToNextPage}
                                            disabled={currentPage === totalPages || totalPages === 0}
                                            className="
                                                p-2 rounded-md
                                                text-gray-600 dark:text-gray-400
                                                hover:text-gray-900 dark:hover:text-gray-200
                                                hover:bg-gray-100 dark:hover:bg-gray-700
                                                disabled:opacity-50 disabled:cursor-not-allowed
                                                transition duration-150 ease-in-out
                                            "
                                            title="Next page"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={goToLastPage}
                                            disabled={currentPage === totalPages || totalPages === 0}
                                            className="
                                                p-2 rounded-md
                                                text-gray-600 dark:text-gray-400
                                                hover:text-gray-900 dark:hover:text-gray-200
                                                hover:bg-gray-100 dark:hover:bg-gray-700
                                                disabled:opacity-50 disabled:cursor-not-allowed
                                                transition duration-150 ease-in-out
                                            "
                                            title="Last page"
                                        >
                                            <ChevronsRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="
                            flex flex-col items-center justify-center
                            py-12 px-4
                            bg-white dark:bg-gray-800
                            rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600
                        ">
                            <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                                <FileX className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                                {searchQuery || filterType !== 'all' 
                                    ? 'No documents match your search criteria' 
                                    : 'No documents uploaded yet'
                                }
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm">
                                {searchQuery || filterType !== 'all'
                                    ? 'Try adjusting your search or filter settings'
                                    : 'Upload your first document to get started'
                                }
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Upload Modal */}
            <DocumentUploadModal
                isOpen={isUploadModalOpen}
                onClose={handleCloseModal}
                editDocument={editingDocument}
            />

            {/* Viewer Modal */}
            <DocumentViewerModal
                isOpen={viewerModalOpen}
                onClose={handleCloseViewer}
                document={documentToView}
                signedUrl={viewerSignedUrl}
            />

            {/* Delete Confirmation Modal */}
            <ConfirmDeleteModal
                isOpen={deleteModalOpen}
                onClose={cancelDelete}
                onConfirm={confirmDelete}
                title="Delete Document"
                message={`Are you sure you want to delete "${documentToDelete?.name}"? This action cannot be undone and will permanently remove the file from storage.`}
                isLoading={isDeleting}
            />
        </AuthenticatedLayout>
    );
}
