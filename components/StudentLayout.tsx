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
  LogOut
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Course {
  id: string;
  code: string;
  title: string;
  newLecturesCount?: number;
}

interface StudentLayoutProps {
  children: React.ReactNode;
}

export default function StudentLayout({ children }: StudentLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [coursesExpanded, setCoursesExpanded] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [userName, setUserName] = useState('Student');

  useEffect(() => {
    loadUserAndCourses();
  }, []);

  const loadUserAndCourses = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .maybeSingle();

    if (profile) {
      setUserName(profile.first_name || 'Student');
    }

    const { data: enrolledCourses } = await supabase
      .from('course_students')
      .select('course_id')
      .eq('email', user.email);

    if (enrolledCourses && enrolledCourses.length > 0) {
      const courseIds = enrolledCourses.map(ec => ec.course_id);
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, code, title')
        .in('id', courseIds)
        .order('code');

      if (coursesData) {
        setCourses(coursesData);
      }
    }
  };

  const handleLogout = async () => {
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

  const libraryItems = [
    { name: 'USC Library', href: '/student/usc-library', icon: BookOpen },
    { name: 'Personal Library', href: '/student/personal-library', icon: User },
  ];

  return (
    <div className="flex h-screen bg-background">
      <aside className={`${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transition-transform duration-300 ease-in-out flex flex-col`}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-brand-yellow flex items-center justify-center text-brand-maroon font-bold text-lg">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">{userName}</div>
              <div className="text-xs text-muted-foreground">Student</div>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1 rounded hover:bg-accent"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-maroon text-white'
                    : 'text-foreground hover:bg-accent'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}

          <div className="pt-4">
            <button
              onClick={() => setCoursesExpanded(!coursesExpanded)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5" />
                My Courses
              </div>
              {coursesExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            {coursesExpanded && courses.length > 0 && (
              <div className="ml-4 mt-1 space-y-1">
                {courses.map((course) => {
                  const isActive = pathname.includes(`/student/course/${course.id}`);
                  return (
                    <Link
                      key={course.id}
                      href={`/student/course/${course.id}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-brand-yellow text-brand-maroon font-medium'
                          : 'text-foreground hover:bg-accent'
                      }`}
                    >
                      <span className="truncate">{course.code}</span>
                      {course.newLecturesCount && course.newLecturesCount > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-brand-yellow text-brand-maroon text-xs font-bold rounded-full">
                          {course.newLecturesCount} new
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}

            {coursesExpanded && courses.length === 0 && (
              <div className="ml-4 mt-1 px-3 py-2 text-xs text-muted-foreground">
                No courses enrolled
              </div>
            )}
          </div>

          <div className="pt-4 space-y-1">
            {libraryItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-maroon text-white'
                      : 'text-foreground hover:bg-accent'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="p-4 border-t border-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-card border-b border-border px-4 lg:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-accent"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-4">
            <Link href="/" className="text-brand-maroon hover:text-brand-maroon-hover transition-colors font-medium text-sm">
              Back to Home
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
