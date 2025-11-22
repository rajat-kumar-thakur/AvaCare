'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, LogOut, Sparkles, Volume2, StopCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { api, isAuthenticated, removeToken } from '@/lib/auth';
import { toast } from 'sonner';
import { ModeToggle } from '@/components/theme-toggle';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    audioUrl?: string;
}

export default function ChatPage() {
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([]);
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (!isAuthenticated()) {
            router.push('/login');
        }
    }, [router]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks: Blob[] = [];

            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = async () => {
                const blob = new Blob(chunks, { type: 'audio/wav' });
                await processAudio(blob);
            };

            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
        } catch (error) {
            toast.error('Microphone access denied');
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            setIsRecording(false);
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
    };

    const processAudio = async (audioBlob: Blob) => {
        setIsProcessing(true);
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.wav');

        try {
            const response = await api.post('/process-audio', formData);
            const { transcript, response: aiResponse, audio_url } = response.data;

            setMessages(prev => [
                ...prev,
                { role: 'user', content: transcript },
                { role: 'assistant', content: aiResponse, audioUrl: audio_url }
            ]);

            if (audio_url) {
                const audio = new Audio(`http://localhost:8000${audio_url}`);
                audio.play();
                audioRef.current = audio;
            }
        } catch (error) {
            toast.error('Failed to process audio');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleLogout = () => {
        removeToken();
        router.push('/login');
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-300">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-900 dark:bg-white rounded-lg flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-white dark:text-slate-900" />
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-white tracking-tight">AvaCare</span>
                </div>
                <div className="flex items-center gap-2">
                    <ModeToggle />
                    <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign out
                    </Button>
                </div>
            </header>

            {/* Chat Area */}
            <main className="flex-1 max-w-3xl w-full mx-auto p-4 flex flex-col">
                <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-8 py-4">
                        <AnimatePresence>
                            {messages.length === 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-center mt-20 space-y-4"
                                >
                                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-2xl mx-auto flex items-center justify-center">
                                        <Sparkles className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-medium text-slate-900 dark:text-white">How can I help you today?</h2>
                                        <p className="text-slate-500 dark:text-slate-400 mt-1">I'm listening in any language you prefer.</p>
                                    </div>
                                </motion.div>
                            )}

                            {messages.map((msg, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                                >
                                    <Avatar className={`w-8 h-8 ${msg.role === 'assistant' ? 'bg-slate-900 dark:bg-white' : 'bg-slate-200 dark:bg-slate-800'}`}>
                                        <AvatarFallback className={msg.role === 'assistant' ? 'text-white dark:text-slate-900 bg-slate-900 dark:bg-white' : 'text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-800'}>
                                            {msg.role === 'assistant' ? 'A' : 'U'}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className={`flex flex-col gap-2 max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                        <div
                                            className={`p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                                ? 'bg-slate-900 dark:bg-white !text-white dark:!text-slate-900 rounded-tr-sm'
                                                : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-sm rounded-tl-sm'
                                                }`}
                                        >
                                            {msg.content}
                                        </div>

                                        {msg.audioUrl && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 px-2 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                                onClick={() => {
                                                    const audio = new Audio(`http://localhost:8000${msg.audioUrl}`);
                                                    audio.play();
                                                }}
                                            >
                                                <Volume2 className="w-3 h-3 mr-1" /> Replay
                                            </Button>
                                        )}
                                    </div>
                                </motion.div>
                            ))}

                            {isProcessing && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex gap-4"
                                >
                                    <Avatar className="w-8 h-8 bg-slate-900 dark:bg-white">
                                        <AvatarFallback className="text-white dark:text-slate-900 bg-slate-900 dark:bg-white">A</AvatarFallback>
                                    </Avatar>
                                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <div ref={scrollRef} />
                    </div>
                </ScrollArea>

                {/* Input Area */}
                <div className="pt-4 pb-6 flex justify-center">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`
              relative group flex items-center justify-center w-16 h-16 rounded-full shadow-lg transition-all duration-300
              ${isRecording
                                ? 'bg-red-500 shadow-red-500/30'
                                : 'bg-slate-900 dark:bg-white shadow-slate-900/20 dark:shadow-white/20 hover:bg-slate-800 dark:hover:bg-slate-200'
                            }
            `}
                        onMouseDown={startRecording}
                        onMouseUp={stopRecording}
                        onTouchStart={startRecording}
                        onTouchEnd={stopRecording}
                    >
                        {isRecording ? (
                            <>
                                <span className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-50" />
                                <StopCircle className="w-6 h-6 text-white" />
                            </>
                        ) : (
                            <Mic className="w-6 h-6 !text-white dark:!text-slate-900" />
                        )}
                    </motion.button>
                    <p className="fixed bottom-4 text-xs text-slate-400 dark:text-slate-500 font-medium">
                        {isRecording ? 'Listening...' : 'Hold to speak'}
                    </p>
                </div>
            </main>
        </div>
    );
}
