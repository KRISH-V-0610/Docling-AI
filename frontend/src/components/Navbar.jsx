import React from 'react';
import { NavLink } from 'react-router-dom';
import { Search, LayoutDashboard, Component, Link as LinkIcon, Bell, Settings, Sun, Moon, Download, Plus } from 'lucide-react';
import { Button } from './Button';
import { cn } from './Button';

export function Navbar() {
    return (
        <header className="flex h-20 w-full shrink-0 items-center px-6 lg:px-10 justify-between">
            {/* Left Nav Links */}
            <nav className="flex items-center gap-8">
                <NavLink to="/" className={({ isActive }) => cn("flex items-center gap-2 font-semibold text-base border-b-2 py-2", isActive ? "text-[var(--color-text-main)] border-[var(--color-primary-500)]" : "text-[var(--color-text-muted)] border-transparent hover:text-[var(--color-text-main)]")}>
                    <LayoutDashboard className="w-5 h-5" /> Dashboard
                </NavLink>
                <NavLink to="/upload" className={({ isActive }) => cn("flex items-center gap-2 font-semibold text-base border-b-2 py-2", isActive ? "text-[var(--color-text-main)] border-[var(--color-primary-500)]" : "text-[var(--color-text-muted)] border-transparent hover:text-[var(--color-text-main)]")}>
                    <Component className="w-5 h-5" /> Workflows
                </NavLink>
                <button className="flex items-center gap-2 font-semibold text-base text-[var(--color-text-muted)] border-b-2 border-transparent hover:text-[var(--color-text-main)] py-2">
                    <LinkIcon className="w-5 h-5" /> Integrations
                </button>
            </nav>

            {/* Middle Search */}
            <div className="flex-1 max-w-md px-8 hidden md:block">
                <div className="relative flex items-center w-full h-11 rounded-full bg-white border border-[var(--color-surface-200)] shadow-sm px-4">
                    <Search className="w-4 h-4 text-[var(--color-text-muted)]" />
                    <input
                        type="text"
                        placeholder="Search or type command"
                        className="flex-1 bg-transparent border-none outline-none px-3 text-sm text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)]"
                    />
                </div>
            </div>

            {/* Right Tools */}
            <div className="flex items-center gap-4">

                {/* Theme Toggle placeholder */}
                <div className="hidden lg:flex items-center bg-white border border-[var(--color-surface-200)] rounded-full p-1 shadow-sm">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-primary-500)] text-white text-xs font-bold">
                        <Sun className="w-3.5 h-3.5" /> Light
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] text-xs font-semibold">
                        <Moon className="w-3.5 h-3.5" /> Dark
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <button className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] rounded-full hover:bg-[var(--color-surface-200)] transition-colors">
                        <Bell className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] rounded-full hover:bg-[var(--color-surface-200)] transition-colors">
                        <Settings className="w-5 h-5" />
                    </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-2">
                    <button className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-[var(--color-surface-200)] text-[var(--color-text-main)] text-sm font-semibold hover:bg-[var(--color-surface-100)] shadow-sm">
                        <Download className="w-4 h-4" /> Export data
                    </button>
                    <button className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--color-primary-900)] text-white text-sm font-semibold shadow-md hover:bg-[var(--color-primary-600)] transition-colors">
                        Add new board <Plus className="w-4 h-4 ml-1" />
                    </button>
                </div>

            </div>
        </header>
    );
}
