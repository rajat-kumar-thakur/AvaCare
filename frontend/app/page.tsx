'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight, Heart, Shield, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/theme-toggle';

export default function LandingPage() {
  return (
    <div className="min-h-screen max-h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-300">
      {/* Navigation */}
      <nav className="px-6 py-3 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">AvaCare</span>
        </div>
        <div className="flex gap-3 items-center">
          <ModeToggle />
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">Sign In</Button>
          </Link>
          <Link href="/signup">
            <Button size="sm" className="bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 !text-white dark:!text-slate-900">Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center max-w-4xl mx-auto w-full py-4 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-3"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-medium border border-green-200 dark:border-green-800">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Available 24/7 • Multilingual
          </div>

          {/* Therapist Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex justify-center"
          >
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-slate-200 dark:border-slate-800 shadow-lg ring-2 ring-slate-100 dark:ring-slate-900">
              <Image
                src="/therapist.jpg"
                alt="Your AI Therapist"
                fill
                className="object-cover"
                priority
              />
            </div>
          </motion.div>

          <h1 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
            Your Personal Mental <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400">Health Companion</span>
          </h1>

          <p className="text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
            Compassionate, judgment-free support whenever you need it. 
            Talk, reflect, and grow in your preferred language.
          </p>

          <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-3">
            <Link href="/signup">
              <Button size="default" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 !text-white h-10 px-5 text-sm rounded-full shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all">
                Start Your Journey <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="default" variant="outline" className="border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white h-10 px-5 text-sm rounded-full">
                Sign In
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid md:grid-cols-3 gap-4 mt-8 w-full text-left"
        >
          <div className="p-4 rounded-xl bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950/30 dark:to-pink-950/30 border border-red-100 dark:border-red-900/50 hover:shadow-lg hover:scale-105 transition-all duration-300">
            <div className="w-9 h-9 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center mb-2.5 shadow-lg">
              <Heart className="w-4.5 h-4.5 text-white" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Empathetic</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">Non-judgmental support tailored to your needs.</p>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border border-blue-100 dark:border-blue-900/50 hover:shadow-lg hover:scale-105 transition-all duration-300">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mb-2.5 shadow-lg">
              <Globe className="w-4.5 h-4.5 text-white" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Multilingual</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">Understand and respond in any language.</p>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-100 dark:border-green-900/50 hover:shadow-lg hover:scale-105 transition-all duration-300">
            <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mb-2.5 shadow-lg">
              <Shield className="w-4.5 h-4.5 text-white" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Secure</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">Your privacy is our priority. Confidential.</p>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="py-3 text-center text-slate-400 dark:text-slate-600 text-xs">
        © 2024 AvaCare AI. All rights reserved.
      </footer>
    </div>
  );
}
