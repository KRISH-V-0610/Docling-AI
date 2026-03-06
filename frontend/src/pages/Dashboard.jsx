import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FileText,
    BookOpen,
    Plus,
    Trash2
} from 'lucide-react';
import { Button } from '../components/Button';
import { motion } from 'framer-motion';
import useAuthStore from '../store/useAuthStore';
import useProjectStore from '../store/useProjectStore';
import { useToast } from '../components/Toasts';

export function Dashboard() {
    const navigate = useNavigate();
    const { user, token } = useAuthStore();
    const { recentProjects, fetchRecentProjects, createProject, deleteProject, status } = useProjectStore();
    const { toast, confirm } = useToast();

    useEffect(() => {
        if (token) {
            fetchRecentProjects();
        }
    }, [token, fetchRecentProjects]);

    const handleCreateProject = async () => {
        const newProject = await createProject(''); // Empty triggers auto-name "Untitled" / "Untitled (1)" in backend
        if (newProject) {
            toast({ title: 'Project Created', description: `Started working on ${newProject.title}`, variant: 'success' });
            navigate(`/project/${newProject._id}`);
        } else {
            toast({ title: 'Error', description: 'Failed to create project', variant: 'error' });
        }
    };

    const handleDeleteProject = (e, projectId) => {
        e.stopPropagation(); // Prevent navigation to project workspace

        confirm({
            title: "Delete Project",
            description: "Are you sure you want to delete this project? This action cannot be undone.",
            confirmText: "Delete",
            onConfirm: async () => {
                const success = await deleteProject(projectId);
                if (success) {
                    toast({ title: 'Project Deleted', description: 'The project has been successfully removed.', variant: 'success' });
                } else {
                    toast({ title: 'Error', description: 'Failed to delete project.', variant: 'error' });
                }
            }
        });
    };

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
                    <h1 className="text-8xl lg:text-[64px] leading-tight font-anton font-normal tracking-wide text-[var(--color-text-main)] mb-6">
                        Hi, {user?.username || 'User'}!<br />
                        What are your plans for today?
                    </h1>
                    <p className="text-base text-[var(--color-text-muted)] leading-relaxed mb-8 max-w-sm font-medium">
                        This platform is designed to revolutionize the way you organize and format your semantic academic documents.
                    </p>
                </div>

                {/* Right Top Grid Area */}
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-6">
                    {/* Create New Project Card */}
                    <div
                        onClick={handleCreateProject}
                        className={`bg-[var(--color-surface-200)]/60 rounded-[var(--radius-xl)] flex items-center justify-center border-2 border-dashed border-[var(--color-surface-300)] min-h-[160px] cursor-pointer hover:bg-[var(--color-surface-200)] transition-colors ${status === 'loading' ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-[var(--color-primary-500)]">
                            <Plus className={`w-5 h-5 ${status === 'loading' ? 'animate-spin' : ''}`} />
                        </div>
                    </div>

                    {recentProjects.map((project) => (
                        <div
                            key={project._id}
                            onClick={() => navigate(`/project/${project._id}`)} // Route directly to project workspace
                            className="relative bg-white rounded-[var(--radius-xl)] p-6 shadow-[var(--shadow-card)] flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-[var(--shadow-floating)] transition-all border border-[var(--color-surface-200)] group"
                        >
                            <button
                                onClick={(e) => handleDeleteProject(e, project._id)}
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-all"
                                title="Delete Project"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>

                            <div className="w-16 h-16 mb-4 rounded-2xl bg-[var(--color-primary-50)] flex items-center justify-center border-2 border-[var(--color-primary-100)] group-hover:scale-105 transition-transform shadow-inner">
                                <FileText className="w-8 h-8 text-[var(--color-primary-900)] stroke-[1.5]" />
                            </div>
                            <h3 className="text-[14px] font-extrabold text-[var(--color-text-main)] leading-tight line-clamp-2" title={project.title}>
                                {project.title}
                            </h3>
                            <p className="text-[10px] text-[var(--color-text-muted)] mt-2 font-medium uppercase tracking-wider">
                                {project.status || 'Draft'}
                            </p>
                        </div>
                    ))}

                    {/* Fill empty slots if less than 2 recent projects */}
                    {Array.from({ length: Math.max(0, 2 - recentProjects.length) }).map((_, i) => (
                        <div key={`empty-${i}`} className="bg-[var(--color-surface-50)] rounded-[var(--radius-xl)] p-6 flex flex-col items-center justify-center text-center border border-dashed border-[var(--color-surface-200)] opacity-50">
                            <div className="w-16 h-16 mb-4 rounded-2xl bg-[var(--color-surface-100)] flex items-center justify-center">
                                <FileText className="w-8 h-8 text-[var(--color-surface-300)] stroke-[1.5]" />
                            </div>
                            <h3 className="text-[14px] font-extrabold text-[var(--color-surface-400)] leading-tight">Empty Slot</h3>
                        </div>
                    ))}
                </div>
            </div>

            {/* Clean Earthy Welcome Area */}
            <div className="mt-4 bg-[var(--color-primary-500)] rounded-[var(--radius-xl)] p-8 md:p-12 shadow-[var(--shadow-floating)] relative overflow-hidden flex flex-col items-center text-center justify-center min-h-[360px] border border-[var(--color-primary-600)]">
                {/* Decorative Elements */}
                <div className="absolute -top-24 -left-20 w-64 h-64 bg-[var(--color-primary-600)] rounded-full blur-3xl opacity-40"></div>
                <div className="absolute -bottom-24 -right-20 w-80 h-80 bg-[var(--color-primary-100)] rounded-full blur-3xl opacity-20"></div>

                <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20 mb-6 shadow-xl">
                        <BookOpen className="w-8 h-8 text-[var(--color-surface-50)]" />
                    </div>

                    <h2 className="text-3xl md:text-5xl font-anton font-normal text-[var(--color-surface-50)] mb-4 tracking-wide leading-tight">
                        Craft beautiful academic documents
                    </h2>

                    <p className="text-base md:text-lg text-[var(--color-surface-100)] opacity-90 mb-10 max-w-lg leading-relaxed font-medium">
                        Focus on the research. Let us handle the tedious formatting, citation syncing, and LaTeX compilation.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                        <Button
                            variant="primary"
                            size="lg"
                            className="bg-[var(--color-primary-900)] hover:bg-[#a65d1d] text-white shadow-lg border-none font-bold text-base px-8 py-6 h-auto"
                            onClick={handleCreateProject}
                        >
                            <FileText className="w-5 h-5 mr-2" /> Upload Manuscript
                        </Button>
                    </div>
                </div>
            </div>

        </motion.div>
    );
}
