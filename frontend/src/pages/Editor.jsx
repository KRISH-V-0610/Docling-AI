import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, ChevronRight } from 'lucide-react';
import { Button } from '../components/Button';
import { SplitEditors } from '../components/SplitEditors';
import { SuggestionPanel } from '../components/SuggestionPanel';
import { ValidationReport } from '../components/ValidationReport';
import { useToast } from '../components/Toasts';
import useAppStore from '../store/useAppStore';

export function Editor() {
    const { originalContent, convertedContent, setConvertedContent, uploadedFile } = useAppStore();
    const { toast } = useToast();

    const handleSave = () => {
        toast({
            title: 'Changes saved',
            description: 'Your document changes have been synced.',
            variant: 'success'
        });
    };

    const handleDownload = () => {
        if (!convertedContent) {
            toast({
                title: "Error",
                description: "There is no content to download.",
                variant: "error"
            });
            return;
        }

        const blob = new Blob([convertedContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        let rootName = 'Document';
        if (uploadedFile && uploadedFile.name) {
            // Strip extension if present
            const dotIndex = uploadedFile.name.lastIndexOf('.');
            rootName = dotIndex !== -1 ? uploadedFile.name.substring(0, dotIndex) : uploadedFile.name;
        }

        a.download = `${rootName}_formatted.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
            title: "Download Started",
            description: `Downloading ${a.download}`,
            variant: 'success'
        });
    };

    // Setup Ctrl+S shortcut
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col h-full max-w-7xl mx-auto pt-2 pb-6 px-4 md:px-0"
        >

            {/* Top Bar / Breadcrumb */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                    <span className="hover:text-[var(--color-text-main)] cursor-pointer transition-colors">Documents</span>
                    <ChevronRight className="w-4 h-4" />
                    <span className="font-semibold text-[var(--color-text-main)] max-w-[200px] sm:max-w-xs truncate">
                        {uploadedFile ? uploadedFile.name : 'Untitled Document'}
                    </span>
                </div>

               
            </div>

            {/* Main Workspace Area */}
            <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-14rem)] min-h-[500px]">

                {/* Editors Container (Left 70%) */}
                <div className="flex-1 h-full min-w-0">
                    <SplitEditors
                        originalContent={originalContent}
                        convertedContent={convertedContent}
                        onConvertedChange={setConvertedContent}
                    />
                </div>

                {/* Suggestion Panel (Right 30%) */}
                <div className="w-full lg:w-80 flex-shrink-0 h-[400px] lg:h-full">
                    <SuggestionPanel />
                </div>

            </div>

            {/* Validation Report Area */}
            <ValidationReport />

        </motion.div>
    );
}
