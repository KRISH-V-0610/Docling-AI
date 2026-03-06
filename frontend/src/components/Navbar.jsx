import React from 'react';
import { NavLink } from 'react-router-dom';
import { Search, LayoutDashboard, Component, Link as LinkIcon, Bell, Settings } from 'lucide-react';
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


            {/* Right Tools - Blank for now */}
            <div className="flex items-center gap-4">
            </div>
        </header>
    );
}
