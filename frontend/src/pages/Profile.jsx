import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Mail, User as UserIcon, LogOut, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/Button';
import useAuthStore from '../store/useAuthStore';
import { useToast } from '../components/Toasts';
import { useNavigate } from 'react-router-dom';

export function Profile() {
    const { user, logout, updateProfilePic, status } = useAuthStore();
    const { toast } = useToast();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const handleLogout = () => {
        logout();
        navigate('/');
        toast({ title: 'Logged out', description: 'You have been successfully logged out.' });
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast({ title: 'File too large', description: 'Please select an image under 5MB.', variant: 'error' });
            return;
        }

        const success = await updateProfilePic(file);
        if (success) {
            toast({ title: 'Profile Updated', description: 'Your profile picture has been changed successfully.', variant: 'success' });
        } else {
            toast({ title: 'Upload Failed', description: 'Failed to upload profile picture.', variant: 'error' });
        }
    };

    if (!user) {
        return (
            <div className="flex h-full items-center justify-center p-8 text-center">
                <p className="text-[var(--color-text-muted)]">Please log in to view your profile.</p>
                <Button onClick={() => navigate('/auth')} className="ml-4">Log In</Button>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto py-8 px-4 w-full h-full"
        >
            <div className="text-center mb-10">
                <h1 className="text-4xl font-anton font-normal tracking-wide text-[var(--color-text-main)] mb-2">Account Profile</h1>
                <p className="text-[var(--color-text-muted)]">Manage your personal information and preferences.</p>
            </div>

            <div className="bg-[var(--color-surface-100)] border border-[var(--color-surface-200)] rounded-3xl p-8 shadow-sm flex flex-col md:flex-row gap-12 items-start">

                {/* Left Side - Profile Picture */}
                <div className="flex flex-col items-center gap-4 min-w-[200px] w-full md:w-auto">
                    <div className="relative group w-40 h-40">
                        {user.profilePic ? (
                            <img
                                src={user.profilePic}
                                alt={`${user.username}'s profile`}
                                className="w-full h-full object-cover rounded-full border-4 border-[var(--color-surface-50)] shadow-md"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[var(--color-primary-50)] text-[var(--color-primary-500)] rounded-full border-4 border-[var(--color-surface-50)] shadow-md">
                                <span className="text-5xl font-anton uppercase">{user.username?.charAt(0)}</span>
                            </div>
                        )}

                        <label
                            htmlFor="profile-upload"
                            className="absolute inset-0 flex items-center justify-center bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-inner"
                        >
                            <div className="flex flex-col items-center gap-1">
                                {status === 'loading' ? (
                                    <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    <>
                                        <Camera className="w-6 h-6" />
                                        <span className="text-xs font-medium">Update</span>
                                    </>
                                )}
                            </div>
                        </label>
                        <input
                            id="profile-upload"
                            type="file"
                            accept="image/png, image/jpeg, image/jpg"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            disabled={status === 'loading'}
                        />
                    </div>
                    {status === 'loading' && <p className="text-xs text-[var(--color-primary-600)] font-medium animate-pulse">Uploading...</p>}
                </div>

                {/* Right Side - User Info */}
                <div className="flex-1 w-full space-y-6">
                    <div>
                        <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2 flex items-center gap-2">
                            <UserIcon className="w-4 h-4" /> Username
                        </h3>
                        <div className="bg-[var(--color-surface-50)] px-4 py-3 rounded-[var(--radius-lg)] border border-[var(--color-surface-200)] flex items-center justify-between">
                            <span className="font-medium text-[var(--color-text-main)]">{user.username}</span>
                            <CheckCircle2 className="text-[var(--color-primary-500)] w-4 h-4 hidden md:block" />
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Mail className="w-4 h-4" /> Email Address
                        </h3>
                        <div className="bg-[var(--color-surface-50)] px-4 py-3 rounded-[var(--radius-lg)] border border-[var(--color-surface-200)] flex items-center justify-between">
                            <span className="font-medium text-[var(--color-text-main)]">{user.email}</span>
                            <CheckCircle2 className="text-[var(--color-primary-500)] w-4 h-4 hidden md:block" />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-[var(--color-surface-200)] flex justify-end">
                        <Button variant="danger" onClick={handleLogout} className="w-full md:w-auto">
                            <LogOut className="w-4 h-4 mr-2" /> Log Out
                        </Button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
