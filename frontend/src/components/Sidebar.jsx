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
    ChevronRight,
    UserCircle,
    LogIn,
    FolderOpen,
    LogOut
} from 'lucide-react';
import { cn } from './Button';
import useAuthStore from '../store/useAuthStore';
import useProjectStore from '../store/useProjectStore';

export function Sidebar({ isOpen, toggleSidebar }) {
    const { isAuthenticated, user, logout } = useAuthStore();
    const { projects, fetchAllProjects } = useProjectStore();

    React.useEffect(() => {
        if (isAuthenticated) {
            fetchAllProjects();
        }
    }, [isAuthenticated, fetchAllProjects]);

    const navItems = [
        { name: 'Dashboard', path: '/dashboard', icon: FileText },
        { name: 'Projects History', path: '/history', icon: Upload },
        { name: 'Validation Report', path: '/reports', icon: CheckCircle },
        { name: 'Settings', path: '/settings', icon: Settings },
    ];

    return (
        <aside
            className={cn(
                "z-30 flex h-full flex-col bg-[var(--color-primary-500)] rounded-[var(--radius-xl)] shadow-[var(--shadow-card)] transition-all duration-300 ease-in-out overflow-hidden text-white",
                isOpen ? "w-64" : "w-18"
            )}
        >
            <div className="flex h-20 items-center p-4">
                <div className="flex items-center gap-3 overflow-hidden">
                    <img
                        src="/duck-logo.png"
                        alt="Docling"
                        className="w-10 h-10 rounded-[var(--radius-md)] object-cover shadow-sm shrink-0 bg-[#fdfceb]"
                    />
                    <span className={cn(
                        "text-[#fdfceb] font-extrabold text-4xl tracking-tighter font-karla my-2 mr-4  mb-2 whitespace-nowrap transition-opacity duration-200",
                        isOpen ? "opacity-100" : "opacity-0 hidden"
                    )}>
                        Docling
                    </span>
                </div>
            </div>

            <div className="flex flex-col gap-2 p-3 flex-1 overflow-y-auto w-full mt-4">
                {navItems.map((item, idx) => {
                    const isDivider = item.name === 'Settings';

                    return (
                        <React.Fragment key={item.path}>
                            {/* {isDivider && <div className="my-2 border-t border-white/20" />} */}

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

            <div className="flex flex-col p-3 border-t border-white/20 gap-2">
                {isAuthenticated ? (
                    <div className="flex items-center gap-1">
                        <NavLink
                            to="/profile"
                            className={({ isActive }) => cn(
                                "flex-1 flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-3 text-sm font-medium transition-all group overflow-hidden whitespace-nowrap",
                                isActive ? "bg-white/20 text-white font-bold" : "text-white/70 hover:bg-white/10 hover:text-white"
                            )}
                            title={!isOpen ? "Profile" : undefined}
                        >
                            {user?.profilePic ? (
                                <img src={user.profilePic} alt="profile" className="w-6 h-6 rounded-full shrink-0 object-cover border border-white/30" />
                            ) : (
                                <UserCircle className="h-6 w-6 shrink-0 transition-colors" />
                            )}
                            <span className={cn("transition-opacity duration-200 truncate", isOpen ? "opacity-100" : "opacity-0 hidden")}>
                                {user?.username || 'Profile'}
                            </span>
                        </NavLink>

                        {isOpen && <button
                            onClick={logout}
                            className="flex items-center justify-center p-2.5 rounded-[var(--radius-md)] text-white/70 hover:bg-red-500/20 hover:text-red-300 transition-colors shrink-0"
                            title="Log Out"
                        >
                            <LogOut className="w-5 h-5 shrink-0" />
                        </button>
                        }
                    </div>
                ) : (
                    <NavLink
                        to="/auth"
                        className={({ isActive }) => cn(
                            "flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-3 text-sm font-medium transition-all group overflow-hidden whitespace-nowrap",
                            isActive ? "bg-white/20 text-white font-bold" : "text-white/70 hover:bg-white/10 hover:text-white"
                        )}
                        title={!isOpen ? "Log In" : undefined}
                    >
                        <LogIn className="h-6 w-6 shrink-0 transition-colors" />
                        <span className={cn("transition-opacity duration-200", isOpen ? "opacity-100" : "opacity-0 hidden")}>
                            Log In
                        </span>
                    </NavLink>
                )}

                <button
                    onClick={toggleSidebar}
                    className="flex w-full items-center justify-center rounded-[var(--radius-md)] p-2 text-white/70 hover:bg-white/10 hover:text-white transition-colors mt-2"
                >
                    {isOpen ? <ChevronLeft className="h-6 w-6" /> : <ChevronRight className="h-6 w-6" />}
                </button>
            </div>
        </aside>
    );
}
