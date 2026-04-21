'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import StudentLayout from '@/components/StudentLayout';
import SocraticStudioWorkspace from '@/components/socratic-writing/SocraticStudioWorkspace';
import { supabase, Profile } from '@/lib/supabase';

export default function StudentSocraticStudioPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.courseId as string;
  const assignmentId = params.assignmentId as string;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void bootstrap();
  }, []);

  const bootstrap = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

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
        await supabase.auth.signOut();
        router.push('/student/login');
        return;
      }

      setProfile(profileData);
    } catch (error) {
      console.error('Error loading Socratic studio page:', error);
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
    <StudentLayout profile={profile}>
      <SocraticStudioWorkspace
        studentId={profile.id}
        seed={{
          assignmentId,
          courseId,
          courseCode: searchParams.get('courseCode') || 'COURSE',
          courseTitle: searchParams.get('courseTitle') || 'Course',
          assignmentTitle: searchParams.get('assignmentTitle') || 'Socratic Writing Assignment',
          assignmentBrief: searchParams.get('assignmentBrief') || 'Use the studio to clarify the prompt, complete research, build the argument, and write the essay.',
          dueAt: searchParams.get('dueAt') || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          pointsPossible: Number(searchParams.get('pointsPossible') || 100),
        }}
        onBack={() => router.push(`/student/course/${courseId}/assignment/${assignmentId}`)}
      />
    </StudentLayout>
  );
}
