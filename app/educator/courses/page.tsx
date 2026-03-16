'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, Profile, Course } from '@/lib/supabase';
import EducatorLayout from '@/components/EducatorLayout';
import CourseCard from '@/components/CourseCard';
import { ArrowLeft, Plus } from 'lucide-react';

export default function AllCoursesPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/educator/login');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!profileData || profileData.role !== 'educator') {
        await supabase.auth.signOut();
        router.push('/educator/login');
        return;
      }

      setProfile(profileData);

      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .eq('educator_id', user.id)
        .order('created_at', { ascending: false });

      if (coursesError) {
        console.error('Error loading courses:', coursesError);
      } else if (coursesData) {
        setCourses(coursesData);
      }

    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <EducatorLayout profile={profile}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.push('/educator/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">My Courses</h1>
            <button
              onClick={() => router.push('/educator/course/new')}
              className="bg-brand-maroon hover:bg-brand-maroon-hover text-white font-semibold py-2.5 px-5 rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Course
            </button>
          </div>
        </div>

        {courses.length === 0 ? (
          <div className="bg-white p-12 rounded-xl border-2 border-dashed border-gray-300 text-center">
            <div className="max-w-sm mx-auto">
              <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No courses yet</h3>
              <p className="text-gray-600 mb-6">Create your first course to get started</p>
              <button
                onClick={() => router.push('/educator/course/new')}
                className="bg-brand-yellow hover:bg-brand-yellow-hover text-black font-bold py-3 px-6 rounded-lg transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Create Course
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                code={course.course_number}
                title={course.title}
                instructorName={course.instructor_name}
                semester={course.semester}
                onClick={() => router.push(`/educator/course/${course.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </EducatorLayout>
  );
}
