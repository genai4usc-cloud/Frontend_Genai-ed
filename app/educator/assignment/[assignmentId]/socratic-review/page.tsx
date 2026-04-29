'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import EducatorLayout from '@/components/EducatorLayout';
import SocraticStudioReview from '@/components/socratic-writing/SocraticStudioReview';
import { supabase, Profile } from '@/lib/supabase';

export default function EducatorSocraticReviewPage() {
  const router = useRouter();
  const params = useParams();
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
      console.error('Error loading Socratic review page:', error);
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
      <SocraticStudioReview
        assignmentId={assignmentId}
        onBack={() => router.push(`/educator/assignment/${assignmentId}`)}
      />
    </EducatorLayout>
  );
}
