'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { api, setToken } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ModeToggle } from '@/components/theme-toggle';

const loginSchema = z.object({
    username: z.string().min(3, 'Username must be at least 3 characters'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginFormValues) => {
        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append('username', data.username);
            formData.append('password', data.password);

            const response = await api.post('/auth/login', formData);
            setToken(response.data.access_token);
            toast.success('Logged in successfully');
            router.push('/chat');
        } catch (error) {
            toast.error('Invalid credentials');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-300 relative">
            <div className="absolute top-4 right-4">
                <ModeToggle />
            </div>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-sm bg-white dark:bg-slate-900 p-8 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800"
            >
                <div className="text-center mb-8">
                    <div className="relative w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden border-2 border-slate-200 dark:border-slate-700">
                        <Image
                            src="/therapist.jpg"
                            alt="AvaCare Therapist"
                            fill
                            className="object-cover"
                        />
                    </div>
                    <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Welcome Back</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Sign in to continue to AvaCare</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="username" className="text-slate-700 dark:text-slate-300">Username</Label>
                        <Input
                            id="username"
                            {...register('username')}
                            className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-slate-900 dark:focus:ring-slate-400 focus:border-slate-900 dark:focus:border-slate-400 transition-all dark:text-white"
                            placeholder="johndoe"
                        />
                        {errors.username && (
                            <p className="text-xs text-red-500">{errors.username.message}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            {...register('password')}
                            className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-slate-900 dark:focus:ring-slate-400 focus:border-slate-900 dark:focus:border-slate-400 transition-all dark:text-white"
                        />
                        {errors.password && (
                            <p className="text-xs text-red-500">{errors.password.message}</p>
                        )}
                    </div>
                    <Button
                        className="w-full bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 !text-white dark:!text-slate-900 transition-all duration-200"
                        type="submit"
                        disabled={isLoading}
                    >
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Sign In'}
                    </Button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        New here?{' '}
                        <Link href="/signup" className="text-slate-900 dark:text-white hover:underline font-medium">
                            Create an account
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
