import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FolderOpen, Plus, Clock, Trash2 } from 'lucide-react';
import useProjectStore from '../store/useProjectStore';
import useAuthStore from '../store/useAuthStore';
import { Button } from '../components/Button';
import { useToast } from '../components/Toasts';

export function History() {
    const navigate = useNavigate();
    const { projects, fetchAllProjects, createProject, deleteProject, status } = useProjectStore();
    const { user } = useAuthStore();
    const { toast, confirm } = useToast();

    useEffect(() => {
        if (user) {
            fetchAllProjects();
        }
    }, [user, fetchAllProjects]);

    const handleCreateProject = async () => {
        const newProject = await createProject('');
        if (newProject) {
            toast({ title: 'Workspace Created', description: `Opened a new workspace`, variant: 'success' });
            navigate(`/project/${newProject._id}`);
        } else {
            toast({ title: 'Error', description: 'Failed to create workspace', variant: 'error' });
        }
    };

    const handleDeleteProject = (e, projectId) => {
        e.stopPropagation();
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
            className="w-full max-w-7xl mx-auto pb-12 pt-8 px-4 xl:px-8"
        >
            <div className="flex justify-between items-end mb-10">
                <div>
                    <h1 className="text-4xl md:text-5xl font-anton font-normal tracking-wide text-[var(--color-text-main)] mb-2">
                        Project History
                    </h1>
                    <p className="text-[var(--color-text-muted)] font-medium text-lg">
                        Manage your workspaces and documents.
                    </p>
                </div>
                <Button
                    onClick={handleCreateProject}
                    disabled={status === 'loading'}
                    className="bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-900)] text-white shadow-md font-bold"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    New Workspace
                </Button>
            </div>

            {status === 'loading' && projects.length === 0 ? (
                <div className="flex justify-center py-20">
                    <div className="w-10 h-10 border-4 border-[var(--color-primary-500)] border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : projects.length === 0 ? (
                <div className="bg-white rounded-[var(--radius-xl)] p-16 text-center shadow-[var(--shadow-card)] border border-[var(--color-surface-200)] flex flex-col items-center">
                    <div className="w-24 h-24 mb-6 rounded-3xl bg-[var(--color-surface-100)] flex items-center justify-center">
                        <FolderOpen className="w-12 h-12 text-[var(--color-surface-400)]" />
                    </div>
                    <h2 className="text-2xl font-bold text-[var(--color-text-main)] mb-2">No Projects Yet</h2>
                    <p className="text-[var(--color-text-muted)] mb-8 max-w-sm mx-auto font-medium">
                        Create a new workspace to start uploading and editing your research manuscripts.
                    </p>
                    <Button
                        onClick={handleCreateProject}
                        size="lg"
                        className="bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-900)] text-white shadow-lg"
                    >
                        Create Your First Project
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {projects.map((project) => (
                        <div
                            key={project._id}
                            onClick={() => navigate(`/project/${project._id}`)}
                            className="bg-white rounded-[var(--radius-xl)] p-6 shadow-[var(--shadow-card)] flex flex-col cursor-pointer hover:shadow-[var(--shadow-floating)] transition-all border border-[var(--color-surface-200)] group relative overflow-hidden"
                        >
                            {/* Delete button — appears on hover */}
                            <button
                                onClick={(e) => handleDeleteProject(e, project._id)}
                                className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-all"
                                title="Delete Project"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>

                            {/* Decorative top border */}
                            <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--color-primary-500)] opacity-0 group-hover:opacity-100 transition-opacity"></div>

                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 rounded-xl bg-[var(--color-primary-50)] flex items-center justify-center border border-[var(--color-primary-100)] group-hover:bg-[var(--color-primary-600)] transition-colors duration-300">
                                    <FolderOpen className="w-6 h-6 text-[var(--color-primary-900)] group-hover:text-white transition-colors duration-300" />
                                </div>
                                <span className="bg-[var(--color-surface-100)] text-[var(--color-text-muted)] text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider">
                                    {project.files?.length || 0} Files
                                </span>
                            </div>

                            <h3 className="text-lg font-extrabold text-[var(--color-text-main)] mb-1 truncate" title={project.title}>
                                {project.title}
                            </h3>

                            <div className="flex items-center text-[12px] text-[var(--color-text-muted)] mt-auto pt-4 font-medium">
                                <Clock className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                                Updated {new Date(project.updatedAt).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </motion.div>
    );
}
