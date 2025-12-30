'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import StudentLayout from '@/components/StudentLayout';
import CourseCard from '@/components/CourseCard';
import LectureCard from '@/components/LectureCard';
import { supabase, Profile } from '@/lib/supabase';
import {
  Video,
  TrendingUp,
  Lightbulb,
  ClipboardCheck,
  BookOpen,
  Pencil,
  Clock,
  MessageSquare
} from 'lucide-react';

interface Course {
  id: string;
  code: string;
  title: string;
  description: string;
  instructor_name: string;
  semester: string;
  student_count: number;
  newLecturesCount?: number;
}

interface Lecture {
  id: string;
  title: string;
  course_code: string;
  instructor_name: string;
  duration: number;
  created_at: string;
  isNew?: boolean;
}

interface LibraryResource {
  id: string;
  title: string;
  source: string;
  duration: number;
  thumbnail: string;
  created_at: string;
}

export default function StudentDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userName, setUserName] = useState('');
  const [stats, setStats] = useState({
    enrolledCourses: 0,
    newLectures: 0,
    hoursWatched: 0
  });
  const [courses, setCourses] = useState<Course[]>([]);
  const [recentLectures, setRecentLectures] = useState<Lecture[]>([]);
  const [libraryResources] = useState<LibraryResource[]>([
    {
      id: '1',
      title: 'Research Methods in Social Sciences',
      source: 'USC Library • USC Academic Resources',
      duration: 13,
      thumbnail: '📚',
      created_at: '1 week ago'
    },
    {
      id: '2',
      title: 'Effective Study Strategies for College Success',
      source: 'USC Library • USC Academic Resources',
      duration: 11,
      thumbnail: '✏️',
      created_at: '2 weeks ago'
    },
    {
      id: '3',
      title: 'Time Management for Students',
      source: 'USC Library • USC Academic Resources',
      duration: 9,
      thumbnail: '⏰',
      created_at: '3 weeks ago'
    }
  ]);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/student/login');
      return;
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (!profileData || profileData.role !== 'student') {
      router.push('/');
      return;
    }

    setProfile(profileData);
    setUserName(profileData.first_name || 'Student');
    await loadDashboardData(user.email!);
    setLoading(false);
  };

  const loadDashboardData = async (email: string) => {
    const { data: enrolledCourses } = await supabase
      .from('course_students')
      .select('course_id')
      .eq('email', email);

    if (enrolledCourses && enrolledCourses.length > 0) {
      const courseIds = enrolledCourses.map(ec => ec.course_id);

      const { data: coursesData } = await supabase
        .from('courses')
        .select('*')
        .in('id', courseIds)
        .order('code');

      if (coursesData) {
        setCourses(coursesData);
      }

      const { data: lecturesData } = await supabase
        .from('lectures')
        .select(`
          id,
          title,
          duration,
          created_at,
          course_id,
          courses (
            code,
            instructor_name
          )
        `)
        .in('course_id', courseIds)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(3);

      let formattedLectures: Lecture[] = [];

      if (lecturesData) {
        formattedLectures = lecturesData.map((lecture: any) => ({
          id: lecture.id,
          title: lecture.title,
          course_code: lecture.courses?.code || '',
          instructor_name: lecture.courses?.instructor_name || '',
          duration: lecture.duration || 0,
          created_at: formatTimeAgo(lecture.created_at),
          isNew: isWithinDays(lecture.created_at, 2)
        }));
        setRecentLectures(formattedLectures);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: viewsData } = await supabase
          .from('student_lecture_views')
          .select('duration_watched')
          .eq('student_id', user.id);

        if (viewsData) {
          const totalSeconds = viewsData.reduce((sum, view) => sum + (view.duration_watched || 0), 0);
          const hours = (totalSeconds / 3600).toFixed(1);
          setStats({
            enrolledCourses: coursesData?.length || 0,
            newLectures: formattedLectures.filter(l => l.isNew).length,
            hoursWatched: parseFloat(hours)
          });
        } else {
          setStats({
            enrolledCourses: coursesData?.length || 0,
            newLectures: formattedLectures.filter(l => l.isNew).length,
            hoursWatched: 0
          });
        }
      }
    }

    setLoading(false);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 14) return '1 week ago';
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
  };

  const isWithinDays = (dateString: string, days: number) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    return diffInDays <= days;
  };

  const quickActions = [
    {
      title: 'Create Mini-Lecture',
      description: 'Make your own content',
      icon: Video,
      color: 'bg-red-50 dark:bg-red-950',
      iconColor: 'text-brand-maroon',
      href: '/student/create-lecture'
    },
    {
      title: 'LLM Playground',
      description: 'Chat with AI models',
      icon: MessageSquare,
      color: 'bg-yellow-50 dark:bg-yellow-950',
      iconColor: 'text-brand-yellow',
      href: '/student/llm-playground'
    },
    {
      title: 'Brainstorming',
      description: 'Ideate with AI',
      icon: Lightbulb,
      color: 'bg-purple-50 dark:bg-purple-950',
      iconColor: 'text-purple-600 dark:text-purple-400',
      href: '/student/brainstorming'
    },
    {
      title: 'Test Knowledge',
      description: 'Practice quizzes',
      icon: ClipboardCheck,
      color: 'bg-blue-50 dark:bg-blue-950',
      iconColor: 'text-blue-600 dark:text-blue-400',
      href: '/student/test-knowledge'
    }
  ];

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-maroon border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <StudentLayout profile={profile}>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
        <div className="bg-gradient-to-r from-brand-maroon to-brand-maroon-hover rounded-2xl p-8 text-white shadow-lg">
          <h1 className="text-3xl font-bold mb-2">Hi, {userName}!</h1>
          <p className="text-xl text-white/90 mb-6">Welcome back to your USC Student Portal</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-sm text-white/80 mb-1">Enrolled Courses</div>
              <div className="text-3xl font-bold">{stats.enrolledCourses}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-sm text-white/80 mb-1">New Lectures</div>
              <div className="text-3xl font-bold">{stats.newLectures}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-sm text-white/80 mb-1">Hours Watched</div>
              <div className="text-3xl font-bold">{stats.hoursWatched}</div>
            </div>
          </div>
        </div>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.title}
                  onClick={() => router.push(action.href)}
                  className="bg-card border border-border rounded-xl p-6 text-left hover:shadow-lg transition-all hover:scale-105 group"
                >
                  <div className={`${action.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-6 h-6 ${action.iconColor}`} />
                  </div>
                  <h3 className="font-bold text-foreground mb-1">{action.title}</h3>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </button>
              );
            })}
          </div>
        </section>

        {recentLectures.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">Recent Lectures</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentLectures.map((lecture) => (
                <LectureCard
                  key={lecture.id}
                  title={lecture.title}
                  courseCode={lecture.course_code}
                  instructorName={lecture.instructor_name}
                  duration={lecture.duration}
                  createdAt={lecture.created_at}
                  isNew={lecture.isNew}
                  onClick={() => router.push(`/student/lecture/${lecture.id}`)}
                />
              ))}
            </div>
          </section>
        )}

        {courses.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">My Courses</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <CourseCard
                  key={course.id}
                  code={course.code}
                  title={course.title}
                  instructorName={course.instructor_name}
                  semester={course.semester}
                  studentCount={course.student_count}
                  newLecturesCount={course.newLecturesCount}
                  onClick={() => router.push(`/student/course/${course.id}`)}
                />
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">USC Library Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {libraryResources.map((resource) => (
              <div
                key={resource.id}
                className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="bg-gradient-to-br from-brand-maroon to-brand-maroon-hover h-40 flex items-center justify-center text-6xl">
                  {resource.thumbnail}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-foreground mb-2">{resource.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{resource.source}</p>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 mr-1" />
                    {resource.duration} min
                    <span className="mx-2">•</span>
                    {resource.created_at}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </StudentLayout>
  );
}
