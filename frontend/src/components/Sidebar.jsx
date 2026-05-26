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
    ChevronDown,
    UserCircle,
    LogIn,
    FolderOpen,
    LogOut,
    Bot,
    PlusCircle,
    Microscope
} from 'lucide-react';
import { cn } from './Button';
import useAuthStore from '../store/useAuthStore';
import useProjectStore from '../store/useProjectStore';
import useAppStore from '../store/useAppStore';
import useDeepScanStore from '../store/useDeepScanStore';

export function Sidebar({ isOpen, toggleSidebar }) {
    const { isAuthenticated, user, logout } = useAuthStore();
    const { projects, fetchAllProjects, recentProjects } = useProjectStore();
    const { isProcessing } = useAppStore();
    const dsStep = useDeepScanStore(s => s.currentStep);
    const dsDone = useDeepScanStore(s => s.isProcessingDone);
    const isAppProcessing = isProcessing || (dsStep === 3 && !dsDone);

    const [expandedMenus, setExpandedMenus] = React.useState({ 'Advance Workshop': true });

    const toggleMenu = (menuName, e) => {
        e.preventDefault();
        setExpandedMenus(prev => ({ ...prev, [menuName]: !prev[menuName] }));
        if (!isOpen) {
            toggleSidebar();
        }
    };

    React.useEffect(() => {
        if (isAuthenticated) {
            fetchAllProjects();
        }
    }, [isAuthenticated, fetchAllProjects]);

    const navItems = [
        { name: 'Dashboard', path: '/dashboard', icon: FileText },
        { name: 'Projects History', path: '/history', icon: Upload },
        { name: 'Validation Report', path: '/reports', icon: CheckCircle },
        {
            name: 'Advance Workshop',
            icon: Code2,
            children: [
                { name: 'DocBot', path: '/advance-workshop', icon: Bot },
                { name: 'Deep Scan', path: '/deep-scan', icon: Microscope },
            ]
        },

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
                    const hasChildren = !!item.children;
                    const isExpanded = expandedMenus[item.name];

                    if (hasChildren) {
                        return (
                            <React.Fragment key={item.name}>
                                <button
                                    onClick={(e) => toggleMenu(item.name, e)}
                                    className={cn(
                                        "w-full flex items-center justify-between rounded-[var(--radius-md)] px-3 py-3 text-sm font-medium transition-all group overflow-hidden whitespace-nowrap",
                                        "text-white/70 hover:bg-white/10 hover:text-white",
                                        isAppProcessing && "pointer-events-none opacity-50 grayscale"
                                    )}
                                    title={!isOpen ? item.name : undefined}
                                >
                                    <div className="flex items-center gap-3">
                                        <item.icon className="h-5 w-5 shrink-0 transition-colors" />
                                        <span className={cn(
                                            "transition-opacity duration-200",
                                            isOpen ? "opacity-100" : "opacity-0 hidden"
                                        )}>
                                            {item.name}
                                        </span>
                                    </div>
                                    <div className={cn("transition-opacity duration-200", isOpen ? "opacity-100" : "opacity-0 hidden")}>
                                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    </div>
                                </button>
                                {isExpanded && isOpen && (
                                    <div className="flex flex-col gap-1 ml-4 mt-1 pl-3 border-l-2 border-white/10">
                                        {item.children.map(child => (
                                            <NavLink
                                                key={child.path}
                                                to={child.path}
                                                end={child.path === '/advance-workshop'}
                                                className={({ isActive }) => cn(
                                                    "flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-all group overflow-hidden whitespace-nowrap",
                                                    isActive
                                                        ? "bg-white/20 text-white font-bold"
                                                        : "text-white/70 hover:bg-white/10 hover:text-white",
                                                    isAppProcessing && "pointer-events-none opacity-50 grayscale"
                                                )}
                                                title={!isOpen ? child.name : undefined}
                                            >
                                                {child.icon && <child.icon className="h-4 w-4 shrink-0 transition-colors" />}
                                                <span className="truncate">{child.name}</span>
                                            </NavLink>
                                        ))}
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    }

                    return (
                        <React.Fragment key={item.path}>
                            {/* {isDivider && <div className="my-2 border-t border-white/20" />} */}

                            <NavLink
                                to={item.path}
                                className={({ isActive }) => cn(
                                    "flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-3 text-sm font-medium transition-all group overflow-hidden whitespace-nowrap",
                                    isActive
                                        ? "bg-white/20 text-white font-bold"
                                        : "text-white/70 hover:bg-white/10 hover:text-white",
                                    isAppProcessing && "pointer-events-none opacity-50 grayscale"
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

            {/* ── Recent Projects ──────────────────── */}
            {isOpen && (
                <div className="px-3 pb-3 font-light">
                    <div className="pt-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-1 mb-2">
                            Recent Projects
                        </p>
                        <div className="flex flex-col gap-1">
                            {[0, 1].map(i => {
                                const p = recentProjects[i];
                                if (!p) {
                                    return (
                                        <div
                                            key={i}
                                            className="flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 border border-dashed border-white/15 opacity-40"
                                        >
                                            <FolderOpen className="h-4 w-4 shrink-0 text-white/50" />
                                            <span className="text-xs text-white/40 truncate italic">No recent project</span>
                                        </div>
                                    );
                                }
                                return (
                                    <NavLink
                                        key={p._id}
                                        to={`/project/${p._id}`}
                                        className={({ isActive }) => cn(
                                            "flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-xs font-medium transition-all overflow-hidden whitespace-nowrap",
                                            isActive
                                                ? "bg-white/20 text-white font-bold"
                                                : "text-white/70 hover:bg-white/10 hover:text-white",
                                            isAppProcessing && "pointer-events-none opacity-50"
                                        )}
                                    >
                                        <FolderOpen className="h-4 w-4 shrink-0" />
                                        <span className="truncate">{p.title || 'Untitled'}</span>
                                    </NavLink>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col p-3 border-t border-white/20 gap-2">
                {isAuthenticated ? (
                    <div className="flex items-center gap-1">
                        <NavLink
                            to="/profile"
                            className={({ isActive }) => cn(
                                "flex-1 flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-3 text-sm font-medium transition-all group overflow-hidden whitespace-nowrap",
                                isActive ? "bg-white/20 text-white font-bold" : "text-white/70 hover:bg-white/10 hover:text-white",
                                isAppProcessing && "pointer-events-none opacity-50 grayscale"
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
                            disabled={isAppProcessing}
                            className={cn(
                                "flex items-center justify-center p-2.5 rounded-[var(--radius-md)] text-white/70 hover:bg-red-500/20 hover:text-red-300 transition-colors shrink-0",
                                isAppProcessing && "opacity-50 cursor-not-allowed pointer-events-none grayscale"
                            )}
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
