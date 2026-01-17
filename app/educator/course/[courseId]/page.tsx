'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase, Profile, Course } from '@/lib/supabase';
import EducatorLayout from '@/components/EducatorLayout';
import { ArrowLeft, Settings, Video, Mic, FileText, Play, Download, Clock, Calendar } from 'lucide-react';
import { toast } from 'sonner';

type Lecture = {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  video_length: number;
  content_style: string[];
};

type LectureWithArtifacts = Lecture & {
  video_url?: string;
  audio_url?: string;
  pptx_url?: string;
};

export default function CourseLectures() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [lectures, setLectures] = useState<LectureWithArtifacts[]>([]);
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
        await loadCourseLectures();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCourseLectures = async () => {
    try {
      const { data: lectureCourses, error: lcError } = await supabase
        .from('lecture_courses')
        .select('lecture_id')
        .eq('course_id', courseId);

      if (lcError) throw lcError;

      if (!lectureCourses || lectureCourses.length === 0) {
        setLectures([]);
        return;
      }

      const lectureIds = lectureCourses.map(lc => lc.lecture_id);

      const { data: lecturesData, error: lecturesError } = await supabase
        .from('lectures')
        .select('*')
        .in('id', lectureIds)
        .order('created_at', { ascending: false });

      if (lecturesError) throw lecturesError;

      if (!lecturesData) {
        setLectures([]);
        return;
      }

      const lecturesWithArtifacts: LectureWithArtifacts[] = await Promise.all(
        lecturesData.map(async (lecture) => {
          const { data: artifacts } = await supabase
            .from('lecture_artifacts')
            .select('artifact_type, file_url')
            .eq('lecture_id', lecture.id);

          const videoArtifact = artifacts?.find(a => a.artifact_type === 'video_avatar');
          const audioArtifact = artifacts?.find(a => a.artifact_type === 'audio');
          const pptxArtifact = artifacts?.find(a => a.artifact_type === 'pptx');

          return {
            ...lecture,
            video_url: videoArtifact?.file_url,
            audio_url: audioArtifact?.file_url,
            pptx_url: pptxArtifact?.file_url
          };
        })
      );

      setLectures(lecturesWithArtifacts);
    } catch (error) {
      console.error('Error loading lectures:', error);
      toast.error('Failed to load lectures');
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
            className="text-brand-maroon hover:text-brand-maroon-hover font-medium"
          >
            Return to Dashboard
          </button>
        </div>
      </EducatorLayout>
    );
  }

  return (
    <EducatorLayout profile={profile}>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/educator/dashboard')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors px-4 py-2 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back</span>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>
              <p className="text-gray-600 mt-1">{course.course_number} {course.section ? `- Section ${course.section}` : ''}</p>
            </div>
          </div>
          <button
            onClick={() => router.push(`/educator/course/${courseId}/edit`)}
            className="bg-brand-maroon hover:bg-brand-maroon-hover text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
          >
            <Settings className="w-5 h-5" />
            Edit Course
          </button>
        </div>

        <div className="bg-brand-maroon text-white rounded-2xl p-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Course Lectures</h2>
              <p className="text-white/90">{lectures.length} lecture{lectures.length !== 1 ? 's' : ''} available</p>
            </div>
            <div className="flex items-center gap-3 text-white/90">
              <Calendar className="w-5 h-5" />
              <span className="font-medium">{course.semester}</span>
            </div>
          </div>
        </div>

        {lectures.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Video className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Lectures Yet</h3>
              <p className="text-gray-600 mb-6">
                This course doesn't have any lectures yet. Create a new lecture by selecting this course in the lecture creation flow.
              </p>
              <button
                onClick={() => router.push('/educator/lecture/new')}
                className="bg-brand-maroon hover:bg-brand-maroon-hover text-white font-bold py-3 px-8 rounded-lg transition-colors"
              >
                Create Lecture
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {lectures.map((lecture) => (
              <div key={lecture.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{lecture.title}</h3>
                      {lecture.description && (
                        <p className="text-gray-600 text-sm mb-3">{lecture.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{lecture.video_length} minutes</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(lecture.created_at).toLocaleDateString()}</span>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          lecture.status === 'published' ? 'bg-green-100 text-green-700' :
                          lecture.status === 'generated' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {lecture.status.charAt(0).toUpperCase() + lecture.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Available Content</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {lecture.video_url && (
                        <div className="border-2 border-brand-maroon rounded-xl p-4 bg-red-50">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="bg-brand-maroon p-2 rounded-lg">
                                <Video className="w-5 h-5 text-white" />
                              </div>
                              <span className="font-bold text-gray-900">Video</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <a
                              href={lecture.video_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 flex items-center justify-center gap-2 bg-brand-maroon hover:bg-brand-maroon-hover text-white font-medium py-2 px-3 rounded-lg transition-colors text-sm"
                            >
                              <Play className="w-4 h-4" />
                              Play
                            </a>
                            <a
                              href={lecture.video_url}
                              download
                              className="flex items-center justify-center bg-white hover:bg-gray-50 border border-gray-300 p-2 rounded-lg transition-colors"
                            >
                              <Download className="w-4 h-4 text-gray-700" />
                            </a>
                          </div>
                        </div>
                      )}

                      {lecture.audio_url && (
                        <div className="border-2 border-blue-600 rounded-xl p-4 bg-blue-50">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="bg-blue-600 p-2 rounded-lg">
                                <Mic className="w-5 h-5 text-white" />
                              </div>
                              <span className="font-bold text-gray-900">Audio</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <a
                              href={lecture.audio_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3 rounded-lg transition-colors text-sm"
                            >
                              <Play className="w-4 h-4" />
                              Play
                            </a>
                            <a
                              href={lecture.audio_url}
                              download
                              className="flex items-center justify-center bg-white hover:bg-gray-50 border border-gray-300 p-2 rounded-lg transition-colors"
                            >
                              <Download className="w-4 h-4 text-gray-700" />
                            </a>
                          </div>
                        </div>
                      )}

                      {lecture.pptx_url && (
                        <div className="border-2 border-green-600 rounded-xl p-4 bg-green-50">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="bg-green-600 p-2 rounded-lg">
                                <FileText className="w-5 h-5 text-white" />
                              </div>
                              <span className="font-bold text-gray-900">PowerPoint</span>
                            </div>
                          </div>
                          <a
                            href={lecture.pptx_url}
                            download
                            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-3 rounded-lg transition-colors text-sm"
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </a>
                        </div>
                      )}

                      {!lecture.video_url && !lecture.audio_url && !lecture.pptx_url && (
                        <div className="col-span-3 text-center py-6 text-gray-500">
                          <p className="text-sm">No content artifacts available yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </EducatorLayout>
  );
}
