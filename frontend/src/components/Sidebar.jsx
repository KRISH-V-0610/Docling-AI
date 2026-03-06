import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    FileText,
    Upload,
    PenTool,
    Code2,
    CheckCircle,
    Settings,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { cn } from './Button';

export function Sidebar({ isOpen, toggleSidebar }) {
    const navItems = [
        { name: 'Documents', path: '/', icon: FileText },
        { name: 'Upload Manuscript', path: '/upload', icon: Upload },
        { name: 'Formatting Editor', path: '/editor', icon: PenTool },
        { name: 'LaTeX Editor', path: '/latex', icon: Code2 },
        { name: 'Validation Report', path: '/reports', icon: CheckCircle },
        { name: 'Settings', path: '/settings', icon: Settings },
    ];

    return (
        <aside
            className={cn(
                "z-30 flex h-full flex-col bg-[var(--color-primary-500)] rounded-[var(--radius-xl)] shadow-[var(--shadow-card)] transition-all duration-300 ease-in-out overflow-hidden text-white",
                isOpen ? "w-64" : "w-16"
            )}
        >
            <div className="flex h-16 items-center justify-center p-4">
                <div className="flex w-10 h-10 items-center justify-center bg-white text-[var(--color-primary-600)] rounded-[var(--radius-md)]">
                    <FileText className="h-5 w-5" />
                </div>
            </div>

            <div className="flex flex-col gap-2 p-3 flex-1 overflow-y-auto w-full mt-4">
                {navItems.map((item, idx) => {
                    const isDivider = item.name === 'Settings';

                    return (
                        <React.Fragment key={item.path}>
                            {isDivider && <div className="my-2 border-t border-white/20" />}

                            <NavLink
                                to={item.path}
                                className={({ isActive }) => cn(
                                    "flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-3 text-sm font-medium transition-all group overflow-hidden whitespace-nowrap",
                                    isActive
                                        ? "bg-white/20 text-white font-bold"
                                        : "text-white/70 hover:bg-white/10 hover:text-white"
                                )}
                                title={!isOpen ? item.name : undefined}
                            >
                                <item.icon className="h-5 w-5 shrink-0 transition-colors" />
                                <span className={cn(
                                    "transition-opacity duration-200",
                                    isOpen ? "opacity-100" : "opacity-0 hidden"
                                )}>
                                    {item.name}
                                </span>
                            </NavLink>
                        </React.Fragment>
                    );
                })}
            </div>

            <div className="flex p-3 border-t border-white/20">
                <button
                    onClick={toggleSidebar}
                    className="flex w-full items-center justify-center rounded-[var(--radius-md)] p-2 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                >
                    {isOpen ? <ChevronLeft className="h-6 w-6" /> : <ChevronRight className="h-6 w-6" />}
                </button>
            </div>
        </aside>
    );
}
