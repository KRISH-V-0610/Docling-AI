import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { User, Mail, Lock, LogIn, UserPlus, FileText } from 'lucide-react';
import { Button } from '../components/Button';
import { FormField } from '../components/ui/FormField';
import useAuthStore from '../store/useAuthStore';
import { useToast } from '../components/Toasts';
import { useNavigate } from 'react-router-dom';
import { loginFormSchema, signupFormSchema } from '../schemas';

export function Auth() {
    const [isLogin, setIsLogin] = useState(true);
    const { login, signup, status, clearError } = useAuthStore();
    const { toast } = useToast();
    const navigate = useNavigate();

    // react-hook-form + Zod (B1). The resolver enforces email format, password
    // length, and (signup) confirm-match — inline per field, no validation toasts.
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(isLogin ? loginFormSchema : signupFormSchema),
        mode: 'onTouched',
    });

    const onSubmit = async (data) => {
        const success = isLogin
            ? await login(data.email, data.password)
            : await signup(data.username, data.email, data.password);

        if (success) {
            toast({
                title: 'Success!',
                description: isLogin ? 'Welcome back!' : 'Account created successfully!',
                variant: 'success',
            });
            navigate('/');
        } else {
            // Server-side failure (bad creds, duplicate email, etc.) — still a toast.
            toast({
                title: 'Authentication Failed',
                description: useAuthStore.getState().errorMessage || 'Something went wrong.',
                variant: 'error',
            });
        }
    };

    const switchMode = () => {
        setIsLogin((v) => !v);
        clearError();
        reset(); // clear fields + validation state when toggling login/signup
    };

    return (
        <div className="flex w-full min-h-screen">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full flex"
            >
                {/* Visual Side (Left Half) */}
                <div className="hidden md:flex flex-col w-1/2 bg-[var(--color-primary-600)] justify-center items-center p-12 text-white relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--color-primary-500)_0%,_transparent_100%)]"></div>
                    <div className="relative z-10 text-center flex flex-col items-center">
                        <FileText className="w-16 h-16 text-[var(--color-primary-100)] mb-6" />
                        <h2 className="text-4xl font-anton font-normal tracking-wide text-[var(--color-primary-50)] mb-4">
                            {isLogin ? "Welcome Back to Docling!" : "Join Docling Today!"}
                        </h2>
                        <p className="text-[var(--color-primary-100)] text-center text-lg max-w-sm font-sans mx-auto">
                            {isLogin
                                ? "Sign in to pick up where you left off and continue crafting beautiful academic documents."
                                : "Create an account to unlock advanced formatting agents and professional LaTeX tools."}
                        </p>
                    </div>
                </div>

                {/* Form Side (Right Half) */}
                <div className="w-full md:w-1/2 p-8 md:p-12 lg:p-24 bg-[var(--color-surface-50)] flex items-center justify-center">
                    <div className="w-full max-w-md mx-auto">
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-anton text-[var(--color-text-main)] mb-2">
                                {isLogin ? 'Sign In' : 'Create Account'}
                            </h2>
                            <p className="text-[var(--color-text-muted)]">
                                {isLogin ? 'Enter your credentials to access your account' : 'Fill in the details to get started'}
                            </p>
                        </div>

                        {/* key={isLogin} re-mounts the form so the resolver swaps cleanly on toggle */}
                        <form key={isLogin ? 'login' : 'signup'} onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                            {!isLogin && (
                                <FormField
                                    label="Username"
                                    icon={User}
                                    type="text"
                                    placeholder="johndoe"
                                    error={errors.username?.message}
                                    {...register('username')}
                                />
                            )}

                            <FormField
                                label="Email Address"
                                icon={Mail}
                                type="email"
                                placeholder="you@example.com"
                                error={errors.email?.message}
                                {...register('email')}
                            />

                            <FormField
                                label="Password"
                                icon={Lock}
                                type="password"
                                placeholder="••••••••"
                                error={errors.password?.message}
                                {...register('password')}
                            />

                            {!isLogin && (
                                <FormField
                                    label="Confirm Password"
                                    icon={Lock}
                                    type="password"
                                    placeholder="••••••••"
                                    error={errors.confirmPassword?.message}
                                    {...register('confirmPassword')}
                                />
                            )}

                            <Button type="submit" className="w-full mt-6 py-6" disabled={status === 'loading'}>
                                {status === 'loading' ? (
                                    <span className="flex items-center gap-2">
                                        {/* spinner */}
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Processing...
                                    </span>
                                ) : isLogin ? (
                                    <span className="flex items-center gap-2">Sign In <LogIn className="w-4 h-4" /></span>
                                ) : (
                                    <span className="flex items-center gap-2">Create Account <UserPlus className="w-4 h-4" /></span>
                                )}
                            </Button>
                        </form>

                        <div className="mt-8 text-center">
                            <p className="text-sm text-[var(--color-text-muted)]">
                                {isLogin ? "Don't have an account?" : "Already have an account?"}
                                <button
                                    onClick={switchMode}
                                    className="ml-2 font-medium text-[var(--color-primary-600)] hover:text-[var(--color-primary-900)] transition-colors"
                                >
                                    {isLogin ? 'Sign up' : 'Sign in'}
                                </button>
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

export default Auth;
