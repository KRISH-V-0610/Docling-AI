import React, { useState } from 'react';
import { Maximize2, Minimize2, Settings2 } from 'lucide-react';
import { RichTextEditor } from './RichTextEditor';
import { Tabs, TabsList, TabsTrigger } from './Tabs';
import { cn } from './Button';

export function SplitEditors({ originalContent, convertedContent, onConvertedChange }) {
    const [viewMode, setViewMode] = useState('split'); // split, original, converted

    return (
        <div className="flex flex-col h-full w-full rounded-[var(--radius-lg)] border border-[var(--color-surface-300)] bg-white shadow-sm overflow-hidden">

            {/* Editor Header / Controls */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-surface-200)] bg-[var(--color-surface-50)]">
                <Tabs value={viewMode} onValueChange={setViewMode}>
                    <TabsList className="h-8">
                        <TabsTrigger value="split" className="text-xs h-6 px-2">Split View</TabsTrigger>
                        <TabsTrigger value="converted" className="text-xs h-6 px-2">Converted Only</TabsTrigger>
                        <TabsTrigger value="original" className="text-xs h-6 px-2">Original Only</TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="flex items-center gap-2">
                    <button className="p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-200)] hover:text-[var(--color-text-main)] rounded-md transition-colors">
                        <Settings2 className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-200)] hover:text-[var(--color-text-main)] rounded-md transition-colors">
                        <Maximize2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Editors Area */}
            <div className="flex flex-1 overflow-hidden relative">

                {/* Original Panel */}
                <div className={cn(
                    "h-full overflow-hidden transition-all duration-300 ease-in-out border-r border-[var(--color-surface-200)] bg-[var(--color-surface-50)]",
                    viewMode === 'split' ? "w-1/2 flex-shrink-0" :
                        viewMode === 'original' ? "w-full" : "w-0 border-none opacity-0"
                )}>
                    {viewMode !== 'converted' && (
                        <div className="flex flex-col h-full">
                            <div className="px-4 py-2 bg-white border-b border-[var(--color-surface-200)] text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider sticky top-0 z-10 w-full">
                                Original Manuscript
                            </div>
                            <div className="flex-1 overflow-hidden w-full relative">
                                <div className="absolute inset-0 overflow-y-auto">
                                    <RichTextEditor
                                        content={originalContent}
                                        readOnly={true}
                                        className="bg-transparent"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Converted Panel */}
                <div className={cn(
                    "h-full overflow-hidden transition-all duration-300 ease-in-out",
                    viewMode === 'split' ? "w-1/2 flex-shrink-0" :
                        viewMode === 'converted' ? "w-full" : "w-0 opacity-0"
                )}>
                    {viewMode !== 'original' && (
                        <div className="flex flex-col h-full">
                            <div className="px-4 py-2 bg-blue-50/50 border-b border-[var(--color-surface-200)] text-xs font-semibold text-[var(--color-primary-600)] uppercase tracking-wider sticky top-0 z-20 w-full flex justify-between items-center">
                                <span>Converted Output</span>
                                <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                </span>
                            </div>
                            <div className="flex-1 overflow-hidden w-full relative">
                                <div className="absolute inset-0 overflow-y-auto scroll-smooth">
                                    <RichTextEditor
                                        content={convertedContent}
                                        onChange={onConvertedChange}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
