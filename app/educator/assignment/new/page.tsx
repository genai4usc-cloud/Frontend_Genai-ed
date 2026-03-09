'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, Profile } from '@/lib/supabase';
import EducatorLayout from '@/components/EducatorLayout';
import { ArrowLeft, FileText } from 'lucide-react';

export default function NewAssignment() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
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
    } catch (error) {
      console.error('Error loading profile:', error);
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
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors px-4 py-2 rounded-lg hover:bg-gray-100 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create New Assignment</h1>
          <p className="text-gray-600 mt-2">Assignment creation feature coming soon</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="bg-brand-maroon/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-brand-maroon" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Assignment Feature In Development</h2>
            <p className="text-gray-600 mb-6">
              The assignment creation feature is currently under development. This will allow you to:
            </p>
            <ul className="text-left text-gray-600 space-y-2 mb-8">
              <li className="flex items-start gap-2">
                <span className="text-brand-maroon mt-1">•</span>
                <span>Create and manage assignments for your courses</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-maroon mt-1">•</span>
                <span>Set due dates and grading criteria</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-maroon mt-1">•</span>
                <span>Track student submissions and progress</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-maroon mt-1">•</span>
                <span>Provide feedback and grades to students</span>
              </li>
            </ul>
            <button
              onClick={() => router.push('/educator/dashboard')}
              className="bg-brand-maroon hover:bg-brand-maroon-hover text-white font-bold py-3 px-8 rounded-lg transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    </EducatorLayout>
  );
}
