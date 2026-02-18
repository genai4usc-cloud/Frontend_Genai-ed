'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Home, ClipboardCheck, FileText, GraduationCap, Library, BookOpen, LogOut, User, Bot } from 'lucide-react';
import { supabase, Profile, Course } from '@/lib/supabase';
import Image from 'next/image';

interface EducatorLayoutProps {
  children: ReactNode;
  profile: Profile;
}

export default function EducatorLayout({ children, profile }: EducatorLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    loadCourses();
  }, [profile.id]);

  const loadCourses = async () => {
    const { data } = await supabase
      .from('courses')
      .select('*')
      .eq('educator_id', profile.id)
      .order('created_at', { ascending: false });

    if (data) {
      setCourses(data);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const navItems = [
    { icon: Home, label: 'Dashboard', path: '/educator/dashboard' },
    { icon: FileText, label: 'Create Lecture', path: '/educator/lecture/new' },
    { icon: ClipboardCheck, label: 'Policy Suggestor', path: '/educator/policy-suggestor' },
    { icon: GraduationCap, label: 'Create Quiz', path: '/educator/quiz/new' },
    { icon: Bot, label: 'LLM Playground', path: '/educator/llm-playground' },
  ];

  const getInitials = () => {
    return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-brand-maroon text-white px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <span className="text-brand-maroon font-bold text-sm">USC</span>
            </div>
            <div>
              <h1 className="text-xl font-bold">USC GenAI Learning Platform</h1>
              <p className="text-sm text-white/80">Empowering Education with AI</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="bg-brand-yellow text-black px-6 py-2 rounded-lg font-semibold hover:bg-brand-yellow-hover transition-colors flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Educator Portal
            </button>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm font-medium">Signed in as</div>
                <div className="text-sm text-white/90">
                  {profile.first_name} {profile.last_name}
                </div>
              </div>
              <div className="w-10 h-10 bg-brand-yellow rounded-full flex items-center justify-center">
                <span className="text-black font-bold text-sm">{getInitials()}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex max-w-screen-2xl mx-auto">
        <aside className="w-64 bg-white min-h-[calc(100vh-80px)] border-r border-gray-200 p-4">
          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-brand-maroon text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 mb-3">
              My Courses
            </h3>
            <nav className="space-y-1">
              {courses.map((course) => {
                const isActive = pathname === `/educator/course/${course.id}`;
                return (
                  <button
                    key={course.id}
                    onClick={() => router.push(`/educator/course/${course.id}`)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-brand-maroon text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="font-medium text-sm truncate">{course.title}</div>
                    <div className={`text-xs mt-0.5 truncate ${
                      isActive ? 'text-white/80' : 'text-gray-500'
                    }`}>
                      {course.course_number} - {course.semester}
                    </div>
                  </button>
                );
              })}
              <button
                onClick={() => router.push('/educator/course/new')}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors text-sm font-medium mt-2"
              >
                <span className="text-lg">+</span>
                <span>Add My Course</span>
              </button>
            </nav>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={() => router.push('/educator/library')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Library className="w-5 h-5" />
              <span className="font-medium">Library</span>
            </button>
          </div>

          <div className="mt-auto pt-8">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
