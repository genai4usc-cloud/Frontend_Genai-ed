'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase, Profile, Course } from '@/lib/supabase';
import EducatorLayout from '@/components/EducatorLayout';

export default function CourseDetail() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
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

      const { data: courseData } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .eq('educator_id', user.id)
        .maybeSingle();

      if (courseData) {
        setCourse(courseData);
      }
    } catch (error) {
      console.error('Error loading course:', error);
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

  if (!course) {
    return (
      <EducatorLayout profile={profile}>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Course Not Found</h1>
          <button
            onClick={() => router.push('/educator/dashboard')}
            className="text-[#990000] hover:text-[#770000] font-medium"
          >
            Return to Dashboard
          </button>
        </div>
      </EducatorLayout>
    );
  }

  return (
    <EducatorLayout profile={profile}>
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-[#990000] to-[#770000] text-white p-8 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white/80 mb-2">{course.code} - {course.section}</div>
              <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
              <div className="text-white/90">{course.semester} • {course.instructor_name}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Course Details</h2>
          <div className="space-y-4">
            <div>
              <span className="text-sm font-semibold text-gray-600">Course Code:</span>
              <p className="text-gray-900">{course.code}</p>
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-600">Title:</span>
              <p className="text-gray-900">{course.title}</p>
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-600">Semester:</span>
              <p className="text-gray-900">{course.semester}</p>
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-600">Section:</span>
              <p className="text-gray-900">{course.section || 'N/A'}</p>
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-600">Instructor:</span>
              <p className="text-gray-900">{course.instructor_name}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <p className="text-gray-600">
            Course management interface with tabs for Lectures, Materials, Students, and Course Chat coming soon...
          </p>
        </div>
      </div>
    </EducatorLayout>
  );
}
