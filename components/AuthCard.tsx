'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { X, Mail, Lock, GraduationCap, BookOpen } from 'lucide-react';

interface AuthCardProps {
  role: 'educator' | 'student';
}

export default function AuthCard({ role }: AuthCardProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    console.log('Login attempt:', { role, email, password });
  };

  const title = role === 'educator' ? 'Educator Portal' : 'Student Portal';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-brand-maroon text-white p-6 relative">
            <button
              onClick={() => router.push('/')}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              {role === 'educator' ? (
                <GraduationCap className="w-8 h-8" />
              ) : (
                <BookOpen className="w-8 h-8" />
              )}
              <div>
                <h2 className="text-2xl font-bold">{title}</h2>
                <p className="text-sm text-white/90">Sign in to continue</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8">
            <div className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-maroon focus:border-transparent outline-none transition-all bg-[#f3f3f5]"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-maroon focus:border-transparent outline-none transition-all bg-[#f3f3f5]"
                    required
                  />
                </div>
              </div>

              <div className="text-right">
                <a
                  href="#"
                  className="text-sm text-brand-maroon hover:underline focus:outline-none focus:ring-2 focus:ring-brand-maroon rounded px-1"
                >
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                className="w-full bg-brand-yellow hover:bg-brand-yellow-hover text-black font-bold py-3 rounded-lg transition-colors focus:outline-none focus:ring-4 focus:ring-[#FFCC00]/50 shadow-md hover:shadow-lg"
              >
                Sign In
              </button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don&apos;t have an account?{' '}
                <a
                  href={`/${role}/signup`}
                  className="text-brand-maroon font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-brand-maroon rounded px-1"
                >
                  Sign up
                </a>
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-xs text-center text-gray-500">
                By continuing, you agree to GenAI&apos;s{' '}
                <a href="#" className="text-brand-maroon hover:underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-brand-maroon hover:underline">
                  Privacy Policy
                </a>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
