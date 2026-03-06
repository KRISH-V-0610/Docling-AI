import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FileText,
    CheckCircle,
    BookOpen,
    ArrowRight,
    MoreHorizontal,
    Edit3,
    Trash2,
    Calendar,
    Users,
    Clock,
    Plus,
    Gift,
    Briefcase
} from 'lucide-react';
import { Button } from '../components/Button';
import { motion } from 'framer-motion';

export function Dashboard() {
    const navigate = useNavigate();

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-7xl mx-auto pb-12 pt-4 px-4 xl:px-0"
        >
            {/* Header Area */}
            <div className="flex flex-col xl:flex-row gap-8 mb-8">

                {/* Greeting */}
                <div className="flex-1 xl:max-w-md pt-4">
                    <h1 className="text-4xl lg:text-[44px] leading-tight font-extrabold tracking-tight text-[var(--color-text-main)] mb-6">
                        Hi, User! 👋<br />
                        What are your plans for today?
                    </h1>
                    <p className="text-base text-[var(--color-text-muted)] leading-relaxed mb-8 max-w-sm font-medium">
                        This platform is designed to revolutionize the way you organize and format your semantic academic documents.
                    </p>
                </div>

                {/* Right Top Grid Area */}
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-6">
                    {/* Empty placeholder card (like image) */}
                    <div className="bg-[var(--color-surface-200)]/60 rounded-[var(--radius-xl)] flex items-center justify-center border-2 border-dashed border-[var(--color-surface-300)] min-h-[160px] cursor-pointer hover:bg-[var(--color-surface-200)] transition-colors">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-[var(--color-primary-500)]">
                            <Plus className="w-5 h-5" />
                        </div>
                    </div>

                    {/* App Feature 1: Formatter */}
                    <div
                        onClick={() => navigate('/upload')}
                        className="bg-white rounded-[var(--radius-xl)] p-6 shadow-[var(--shadow-card)] flex flex-col items-center text-center cursor-pointer hover:shadow-[var(--shadow-floating)] transition-all border border-[var(--color-surface-200)] group"
                    >
                        <div className="w-20 h-20 mb-4 rounded-2xl bg-blue-50/50 flex items-center justify-center border-2 border-blue-100 group-hover:scale-105 transition-transform">
                            <FileText className="w-10 h-10 text-blue-500 stroke-[1.5]" />
                        </div>
                        <h3 className="text-[15px] font-extrabold text-[var(--color-text-main)] leading-tight">Format<br />Manuscripts</h3>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-2 font-medium">Apply semantic templates</p>
                    </div>

                    {/* App Feature 2: Citation Checker */}
                    <div className="bg-white rounded-[var(--radius-xl)] p-6 shadow-[var(--shadow-card)] flex flex-col items-center text-center border border-[var(--color-surface-200)] group">
                        <div className="w-20 h-20 mb-4 rounded-2xl bg-green-50/50 flex items-center justify-center border-2 border-green-100 group-hover:scale-105 transition-transform">
                            <CheckCircle className="w-10 h-10 text-green-500 stroke-[1.5]" />
                        </div>
                        <h3 className="text-[15px] font-extrabold text-[var(--color-text-main)] leading-tight">Verify<br />Citations</h3>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-2 font-medium">Ensure sync consistency</p>
                    </div>
                </div>
            </div>

            {/* Bottom Large Grid Area */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

                {/* Left Column: Notifications & Tasks */}
                <div className="space-y-6">
                    {/* Notifications */}
                    <div className="bg-white rounded-[var(--radius-xl)] p-6 shadow-[var(--shadow-card)] border border-[var(--color-surface-200)]">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-[var(--color-text-main)]">Document queue</h2>
                            <button className="text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] flex items-center gap-1">
                                <Trash2 className="w-3 h-3" /> Clear
                            </button>
                        </div>

                        {/* Queue Item 1 */}
                        <div className="relative bg-white rounded-[var(--radius-xl)] p-5 shadow-[var(--shadow-floating)] border border-[var(--color-surface-200)] mb-4 ml-2">
                            <div className="absolute top-5 left-0 w-1 h-8 bg-green-500 rounded-r-md -ml-[1px]"></div>
                            <div className="flex items-start justify-between">
                                <div>
                                    <h4 className="text-[15px] font-extrabold text-[var(--color-text-main)] flex items-center gap-2 mb-1">
                                        IEEE Paper Revision <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    </h4>
                                    <p className="text-xs font-medium text-[var(--color-text-muted)] mb-3">Robotics submission | 12 pages</p>
                                    <div className="flex items-center gap-3 text-xs font-semibold text-[var(--color-text-main)]">
                                        <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-[var(--color-text-muted)]" /> Oct 24</div>
                                        <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-[var(--color-text-muted)]" /> 10:00 AM</div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <button className="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] bg-[var(--color-surface-100)] p-1.5 rounded-md"><MoreHorizontal className="w-4 h-4" /></button>
                                </div>
                            </div>
                        </div>

                        {/* Queue Item 2 (muted) */}
                        <div className="relative bg-[var(--color-surface-50)] rounded-[var(--radius-xl)] p-5 border border-[var(--color-surface-200)] ml-2 opacity-70">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h4 className="text-[15px] font-extrabold text-[var(--color-text-main)] mb-1">
                                        Nature Method Draft
                                    </h4>
                                    <p className="text-xs font-medium text-[var(--color-text-muted)] mb-3">Draft from Dr. Smith</p>
                                    <div className="bg-[var(--color-surface-200)] h-2 rounded-full w-32 mt-2"></div>
                                </div>
                                <button className="text-[var(--color-text-muted)]"><MoreHorizontal className="w-4 h-4" /></button>
                            </div>
                        </div>
                    </div>

                    {/* Today tasks */}
                    <div className="bg-white rounded-[var(--radius-xl)] p-6 shadow-[var(--shadow-card)] border border-[var(--color-surface-200)]">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-[var(--color-text-main)] flex items-center gap-3">
                                Recent actions
                                <div className="flex -space-x-2">
                                    <div className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[10px] font-bold">TJ</div>
                                    <div className="w-6 h-6 rounded-full bg-orange-100 border-2 border-white flex items-center justify-center text-[10px] font-bold">MK</div>
                                </div>
                            </h2>
                        </div>

                        <div className="space-y-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-[13px] font-extrabold text-[var(--color-text-main)]">Format IEEE Template</h4>
                                    <p className="text-[10px] text-[var(--color-text-muted)] font-medium mt-0.5">Today, 09:20 AM</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-24 h-1.5 bg-[var(--color-surface-200)] rounded-full overflow-hidden">
                                        <div className="h-full bg-[var(--color-primary-500)] w-[90%] rounded-full"></div>
                                    </div>
                                    <span className="text-xs font-bold w-6 text-right">90%</span>
                                </div>
                            </div>
                            <div className="w-full h-px bg-[var(--color-surface-200)]"></div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-[13px] font-extrabold text-[var(--color-text-main)]">Check Vancouver Citations</h4>
                                    <p className="text-[10px] text-[var(--color-text-muted)] font-medium mt-0.5">Yesterday, 10:55 AM</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-24 h-1.5 bg-[var(--color-surface-200)] rounded-full overflow-hidden">
                                        <div className="h-full bg-[var(--color-primary-500)] w-[50%] rounded-full"></div>
                                    </div>
                                    <span className="text-xs font-bold w-6 text-right">50%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Middle Column: Assignments & Pro Card */}
                <div className="space-y-6">
                    {/* Assignments */}
                    <div className="bg-white rounded-[var(--radius-xl)] p-6 shadow-[var(--shadow-card)] border border-[var(--color-surface-200)]">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-[var(--color-text-main)]">Uploads</h2>
                            <button className="text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] flex items-center gap-1">
                                <Edit3 className="w-3 h-3" /> Edit
                            </button>
                        </div>

                        <div className="bg-white border rounded-[var(--radius-lg)] p-5 border-[var(--color-surface-200)] mb-4 relative overflow-hidden group">
                            <div className="flex items-center gap-3 text-xs font-bold mb-4">
                                <span className="text-[var(--color-primary-600)]">Nature</span>
                                <span className="text-[var(--color-text-main)]">Springer</span>
                                <button className="ml-auto text-[var(--color-text-muted)]"><MoreHorizontal className="w-4 h-4" /></button>
                            </div>

                            <h3 className="text-xl font-extrabold text-[var(--color-text-main)] mb-4 pr-12 leading-tight">
                                Process methodology thesis paper
                            </h3>

                            <div className="flex items-center justify-between">
                                <span className="px-3 py-1 bg-red-100 text-red-600 text-[10px] font-bold rounded-full">High priority</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-[var(--color-text-muted)]">Rachel L.</span>
                                    <div className="w-6 h-6 rounded-full bg-purple-100 border border-white flex items-center justify-center text-[10px] font-bold">RL</div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => navigate('/upload')}
                            className="w-full py-4 rounded-[var(--radius-lg)] bg-[var(--color-primary-50)] text-[var(--color-primary-600)] font-bold text-sm flex items-center justify-center gap-2 hover:bg-[var(--color-primary-100)] transition-colors border border-[var(--color-primary-100)]"
                        >
                            <Plus className="w-4 h-4" /> Upload new manuscript
                        </button>
                    </div>

                    {/* Premium Call to action */}
                    <div className="bg-[var(--color-primary-500)] rounded-[var(--radius-xl)] p-8 shadow-[var(--shadow-card)] text-white relative overflow-hidden h-[300px] flex flex-col justify-between">
                        {/* Decorative background circle */}
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>

                        <div className="relative z-10 flex justify-center mb-6 mt-4">
                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/30">
                                <Gift className="w-8 h-8 text-white" />
                            </div>
                        </div>

                        <div className="text-center relative z-10">
                            <h3 className="text-2xl font-extrabold mb-2">Go premium!</h3>
                            <p className="text-[13px] font-medium text-white/80 leading-snug mb-6 max-w-[200px] mx-auto">
                                Gain access to API endpoints to format documents in bulk directly via CLI.
                            </p>
                            <button className="bg-[var(--color-text-main)] text-white px-6 py-2.5 rounded-full text-xs font-bold hover:bg-black transition-colors shadow-lg">
                                Find out more
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Calendar & Stats */}
                <div className="space-y-6 md:col-span-2 xl:col-span-1">

                    {/* Calendar placeholder area */}
                    <div className="bg-white rounded-[var(--radius-xl)] p-6 shadow-[var(--shadow-card)] border border-[var(--color-surface-200)]">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-[15px] font-extrabold text-[var(--color-text-main)]">May 2026</h2>
                            <div className="flex gap-1">
                                <button className="w-6 h-6 rounded-full bg-[var(--color-surface-100)] flex items-center justify-center text-[var(--color-text-muted)]">&lt;</button>
                                <button className="w-6 h-6 rounded-full bg-[var(--color-surface-100)] flex items-center justify-center text-[var(--color-text-muted)]">&gt;</button>
                            </div>
                        </div>

                        {/* Mini dates row */}
                        <div className="flex justify-between items-center mb-6">
                            {['Mon', 'Tue', 'Wed', 'Thr', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                                <div key={day} className="flex flex-col items-center gap-2">
                                    <span className="text-[10px] font-bold text-[var(--color-text-muted)]">{day}</span>
                                    {i === 4 ? (
                                        <div className="w-8 h-8 rounded-full bg-[var(--color-primary-500)] text-white flex items-center justify-center text-xs font-bold shadow-md">18</div>
                                    ) : (
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-[var(--color-text-main)]">{14 + i}</div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Schedule events */}
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-[11px] font-bold text-[var(--color-text-main)] mb-3">04:30 - 05:00 PM</h4>
                                <div className="flex items-start justify-between group">
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-[var(--color-surface-100)] flex items-center justify-center text-[var(--color-text-muted)] group-hover:bg-[var(--color-primary-50)] group-hover:text-[var(--color-primary-500)] transition-colors"><Users className="w-4 h-4" /></div>
                                        <div>
                                            <h5 className="text-[13px] font-bold text-[var(--color-text-main)]">Lab meeting</h5>
                                            <p className="text-[10px] font-medium text-[var(--color-text-muted)] mt-0.5">12:00 - 12:30 • Physics dept</p>
                                        </div>
                                    </div>
                                    <button className="text-[var(--color-text-muted)]"><MoreHorizontal className="w-3 h-3" /></button>
                                </div>
                            </div>

                            <div className="w-full border-t border-dashed border-[var(--color-surface-200)]"></div>

                            <div>
                                <h4 className="text-[11px] font-bold text-[var(--color-text-main)] mb-3">11:30 - 12:30 PM</h4>
                                <div className="flex items-start justify-between group">
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-[var(--color-surface-100)] flex items-center justify-center text-[var(--color-text-muted)] group-hover:bg-[var(--color-primary-50)] group-hover:text-[var(--color-primary-500)] transition-colors"><Briefcase className="w-4 h-4" /></div>
                                        <div>
                                            <h5 className="text-[13px] font-bold text-[var(--color-text-main)]">Review IEEE Draft</h5>
                                            <p className="text-[10px] font-medium text-[var(--color-text-muted)] mt-0.5">12:30 - 01:30 PM • Final checks</p>
                                        </div>
                                    </div>
                                    <button className="text-[var(--color-text-muted)]"><MoreHorizontal className="w-3 h-3" /></button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mini Stats Cards */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white rounded-[var(--radius-xl)] p-5 shadow-[var(--shadow-card)] border border-[var(--color-surface-200)] flex flex-col justify-between">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full border-[3px] border-[var(--color-primary-500)] flex items-center justify-center text-xs font-bold text-[var(--color-text-main)]">90%</div>
                                <div className="text-[10px] font-bold text-[var(--color-primary-500)] uppercase tracking-wider">Formatting<br /><span className="text-[var(--color-text-main)]">Success</span></div>
                            </div>
                            <p className="text-[10px] font-medium text-[var(--color-text-muted)]">You marked 9/10 algorithms accurately parsed</p>
                        </div>
                        <div className="bg-white rounded-[var(--radius-xl)] p-5 shadow-[var(--shadow-card)] border border-[var(--color-surface-200)] flex flex-col justify-between">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full border-[3px] border-red-500 flex items-center justify-center text-xs font-bold text-[var(--color-text-main)]">65%</div>
                                <div className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Citation<br /><span className="text-[var(--color-text-main)]">Sync</span></div>
                            </div>
                            <p className="text-[10px] font-medium text-[var(--color-text-muted)]">You caught 2/3 phantom references</p>
                            <div className="mt-2 text-right">
                                <span className="inline-block bg-[var(--color-primary-500)] text-white text-[10px] font-bold px-3 py-1 rounded-md cursor-pointer hover:bg-[var(--color-primary-600)]">Check</span>
                            </div>
                        </div>
                    </div>

                </div>

            </div>

        </motion.div>
    );
}
