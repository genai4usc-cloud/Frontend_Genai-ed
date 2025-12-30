'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  Home,
  MessageSquare,
  Lightbulb,
  Video,
  ClipboardCheck,
  BookOpen,
  User,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  LogOut,
  Library
} from 'lucide-react';
import { supabase, Profile } from '@/lib/supabase';

interface Course {
  id: string;
  code: string;
  title: string;
  semester: string;
  newLecturesCount?: number;
}

interface StudentLayoutProps {
  children: React.ReactNode;
  profile: Profile;
}

export default function StudentLayout({ children, profile }: StudentLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [coursesExpanded, setCoursesExpanded] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    loadCourses();
  }, [profile.id]);

  const loadCourses = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: enrolledCourses } = await supabase
      .from('course_students')
      .select('course_id')
      .eq('email', user.email);

    if (enrolledCourses && enrolledCourses.length > 0) {
      const courseIds = enrolledCourses.map(ec => ec.course_id);
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, code, title, semester')
        .in('id', courseIds)
        .order('code');

      if (coursesData) {
        setCourses(coursesData);
      }
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const navItems = [
    { name: 'Dashboard', href: '/student/dashboard', icon: Home },
    { name: 'LLM Playground', href: '/student/llm-playground', icon: MessageSquare },
    { name: 'Brainstorming', href: '/student/brainstorming', icon: Lightbulb },
    { name: 'Create Mini-Lecture', href: '/student/create-lecture', icon: Video },
    { name: 'Test Knowledge', href: '/student/test-knowledge', icon: ClipboardCheck },
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
              <BookOpen className="w-4 h-4" />
              Student Portal
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
              const isActive = pathname === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-brand-maroon text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={() => setCoursesExpanded(!coursesExpanded)}
              className="w-full flex items-center justify-between px-4 py-2 text-sm font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
            >
              <span>My Courses</span>
              {coursesExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            {coursesExpanded && (
              <nav className="space-y-1 mt-3">
                {courses.map((course) => {
                  const isActive = pathname.includes(`/student/course/${course.id}`);
                  return (
                    <button
                      key={course.id}
                      onClick={() => router.push(`/student/course/${course.id}`)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-brand-maroon text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{course.code}</div>
                          <div className={`text-xs mt-0.5 truncate ${
                            isActive ? 'text-white/80' : 'text-gray-500'
                          }`}>
                            {course.semester}
                          </div>
                        </div>
                        {course.newLecturesCount && course.newLecturesCount > 0 && (
                          <span className="ml-2 px-2 py-0.5 bg-brand-yellow text-black text-xs font-bold rounded-full flex-shrink-0">
                            {course.newLecturesCount} new
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
                {courses.length === 0 && (
                  <div className="px-4 py-2 text-xs text-gray-500">
                    No courses enrolled
                  </div>
                )}
              </nav>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 mb-3">
              USC Library
            </h3>
            <button
              onClick={() => router.push('/student/usc-library')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Library className="w-5 h-5" />
              <span className="font-medium">USC Library</span>
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
