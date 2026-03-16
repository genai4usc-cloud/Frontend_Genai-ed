'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase, Profile, Course } from '@/lib/supabase';
import EducatorLayout from '@/components/EducatorLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EducatorCourseOverview from '@/components/EducatorCourseOverview';
import EducatorLectureCard from '@/components/EducatorLectureCard';
import EducatorAssignmentCard from '@/components/EducatorAssignmentCard';
import EducatorQuizCard from '@/components/EducatorQuizCard';
import CourseSummaryStats from '@/components/CourseSummaryStats';
import { ArrowLeft, Video, Plus, Users, BookOpen, FileText, ListChecks, X } from 'lucide-react';
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

type LectureArtifact = {
  id: string;
  artifact_type: string;
  file_url: string;
};

type LectureWithArtifacts = Lecture & {
  artifacts: LectureArtifact[];
};

type Assignment = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'active' | 'closed' | 'draft';
};

type Quiz = {
  id: string;
  quiz_name: string;
  created_at: string;
  status: 'draft' | 'generated' | 'saved' | 'published';
  mcq_count: number;
  short_answer_count: number;
};

export default function CourseLectures() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [lectures, setLectures] = useState<LectureWithArtifacts[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteLectureModal, setShowDeleteLectureModal] = useState<string | null>(null);
  const [showDeleteArtifactModal, setShowDeleteArtifactModal] = useState<{ lectureId: string; artifactId: string; type: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [playingMedia, setPlayingMedia] = useState<{ lectureId: string; type: 'video' | 'audio'; url: string } | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data for assignments
  const dummyAssignments: Assignment[] = [
    {
      id: '1',
      title: 'Linear Regression Implementation',
      description: 'Implement linear regression from scratch using Python',
      dueDate: '2026-03-14T23:59:00',
      status: 'active'
    },
    {
      id: '2',
      title: 'Data Preprocessing Project',
      description: 'Clean and preprocess the provided dataset',
      dueDate: '2026-03-19T23:59:00',
      status: 'active'
    },
    {
      id: '3',
      title: 'Neural Network Analysis',
      description: 'Analyze different neural network architectures',
      dueDate: '2026-03-25T23:59:00',
      status: 'active'
    },
    {
      id: '4',
      title: 'Final Project Proposal',
      description: 'Submit your final project proposal',
      dueDate: '2026-02-28T23:59:00',
      status: 'closed'
    }
  ];

  // Mock analytics for lectures
  const generateLectureMockAnalytics = (index: number) => ({
    views: [124, 118, 132, 95, 87][index % 5] || 100,
    completionRate: [94, 87, 91, 78, 82][index % 5] || 85,
    avgWatchTime: ['11:45', '13:20', '9:15', '14:50', '8:30'][index % 5] || '10:00',
    publishDate: new Date(Date.now() - (index + 1) * 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
  });

  // Mock analytics for assignments
  const assignmentAnalytics = [
    {
      totalStudents: 127,
      submitted: 112,
      graded: 95,
      pending: 15,
      avgScore: 87
    },
    {
      totalStudents: 127,
      submitted: 98,
      graded: 85,
      pending: 29,
      avgScore: 82
    },
    {
      totalStudents: 127,
      submitted: 105,
      graded: 105,
      pending: 22,
      avgScore: 91
    },
    {
      totalStudents: 127,
      submitted: 127,
      graded: 127,
      pending: 0,
      avgScore: 85
    }
  ];

  // Mock analytics for quizzes
  const generateQuizMockAnalytics = (index: number) => ({
    dueDate: new Date(Date.now() + (index + 1) * 7 * 24 * 60 * 60 * 1000).toISOString(),
    totalStudents: 127,
    completed: [118, 109, 95, 88][index % 4] || 100,
    pending: [9, 18, 32, 39][index % 4] || 27,
    avgScore: [84, 78, 91, 73][index % 4] || 80,
    highestScore: [98, 95, 100, 92][index % 4] || 95,
    lowestScore: [62, 55, 71, 48][index % 4] || 60,
    scoreDistribution: {
      excellent: [42, 38, 55, 28][index % 4] || 40,
      good: [38, 35, 25, 32][index % 4] || 35,
      fair: [25, 22, 10, 18][index % 4] || 20,
      needsImprovement: [13, 14, 5, 10][index % 4] || 12
    }
  });

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
        await Promise.all([
          loadCourseLectures(),
          loadCourseQuizzes()
        ]);
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
        .eq('creator_role', 'educator')
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
            .select('id, artifact_type, file_url')
            .eq('lecture_id', lecture.id);

          return {
            ...lecture,
            artifacts: artifacts || []
          };
        })
      );

      setLectures(lecturesWithArtifacts);
    } catch (error) {
      console.error('Error loading lectures:', error);
      toast.error('Failed to load lectures');
    }
  };

  const loadCourseQuizzes = async () => {
    try {
      const { data: quizData, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuizzes(quizData || []);
    } catch (error) {
      console.error('Error loading quizzes:', error);
      toast.error('Failed to load quizzes');
    }
  };

  const handleDeleteLecture = async (lectureId: string) => {
    setDeleting(true);
    try {
      const { error: artifactsError } = await supabase
        .from('lecture_artifacts')
        .delete()
        .eq('lecture_id', lectureId);

      if (artifactsError) throw artifactsError;

      const { error: lectureError } = await supabase
        .from('lectures')
        .delete()
        .eq('id', lectureId);

      if (lectureError) throw lectureError;

      toast.success('Lecture deleted successfully');
      await loadCourseLectures();
      setShowDeleteLectureModal(null);
    } catch (error) {
      console.error('Error deleting lecture:', error);
      toast.error('Failed to delete lecture');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteArtifact = async (artifactId: string) => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('lecture_artifacts')
        .delete()
        .eq('id', artifactId);

      if (error) throw error;

      toast.success('Artifact deleted successfully');
      await loadCourseLectures();
      setShowDeleteArtifactModal(null);
    } catch (error) {
      console.error('Error deleting artifact:', error);
      toast.error('Failed to delete artifact');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <EducatorLayout profile={profile ?? undefined}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-maroon mx-auto mb-4"></div>
            <p className="text-gray-600">Loading course...</p>
          </div>
        </div>
      </EducatorLayout>
    );
  }

  if (!course) {
    return (
      <EducatorLayout profile={profile ?? undefined}>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Course Not Found</h3>
            <p className="text-gray-600 mb-6">The course you're looking for doesn't exist or you don't have access to it.</p>
            <button
              onClick={() => router.push('/educator/dashboard')}
              className="bg-brand-maroon hover:bg-brand-maroon-hover text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </EducatorLayout>
    );
  }

  return (
    <EducatorLayout profile={profile ?? undefined}>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-6">
            <button
              onClick={() => router.push('/educator/dashboard')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">{course.title}</h1>
              <p className="text-gray-600">{course.course_number} • {course.semester}</p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="bg-white border-b border-gray-200 -mx-4 px-4 mb-6">
              <TabsList className="bg-transparent h-auto p-0 space-x-0">
                <TabsTrigger
                  value="overview"
                  className="bg-transparent shadow-none border-b-2 border-transparent data-[state=active]:border-brand-maroon data-[state=active]:text-brand-maroon data-[state=active]:bg-transparent rounded-none px-4 py-3 font-semibold text-gray-600 hover:text-gray-900 hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 flex items-center gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="lectures"
                  className="bg-transparent shadow-none border-b-2 border-transparent data-[state=active]:border-brand-maroon data-[state=active]:text-brand-maroon data-[state=active]:bg-transparent rounded-none px-4 py-3 font-semibold text-gray-600 hover:text-gray-900 hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 flex items-center gap-2"
                >
                  <Video className="w-4 h-4" />
                  Lectures
                </TabsTrigger>
                <TabsTrigger
                  value="assignments"
                  className="bg-transparent shadow-none border-b-2 border-transparent data-[state=active]:border-brand-maroon data-[state=active]:text-brand-maroon data-[state=active]:bg-transparent rounded-none px-4 py-3 font-semibold text-gray-600 hover:text-gray-900 hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Assignments
                </TabsTrigger>
                <TabsTrigger
                  value="quizzes"
                  className="bg-transparent shadow-none border-b-2 border-transparent data-[state=active]:border-brand-maroon data-[state=active]:text-brand-maroon data-[state=active]:bg-transparent rounded-none px-4 py-3 font-semibold text-gray-600 hover:text-gray-900 hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 flex items-center gap-2"
                >
                  <ListChecks className="w-4 h-4" />
                  Quizzes
                </TabsTrigger>
                <TabsTrigger
                  value="students"
                  className="bg-transparent shadow-none border-b-2 border-transparent data-[state=active]:border-brand-maroon data-[state=active]:text-brand-maroon data-[state=active]:bg-transparent rounded-none px-4 py-3 font-semibold text-gray-600 hover:text-gray-900 hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  Student Management
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="mt-0">
              <EducatorCourseOverview courseId={courseId} />
            </TabsContent>

            <TabsContent value="lectures" className="mt-0">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Course Lectures</h2>
                  <p className="text-gray-600 text-sm mt-1">{lectures.length} lectures published</p>
                </div>
                <button
                  onClick={() => router.push('/educator/lecture/new')}
                  className="bg-brand-maroon hover:bg-brand-maroon-hover text-white font-semibold py-2.5 px-5 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  View Analytics
                </button>
              </div>

              {lectures.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <div className="max-w-md mx-auto">
                    <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Video className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Lectures Yet</h3>
                    <p className="text-gray-600 text-sm mb-6">
                      This course doesn't have any lectures yet. Create a new lecture by selecting this course in the lecture creation flow.
                    </p>
                    <button
                      onClick={() => router.push('/educator/lecture/new')}
                      className="bg-brand-maroon hover:bg-brand-maroon-hover text-white font-semibold py-2.5 px-6 rounded-lg transition-colors"
                    >
                      Create Lecture
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {lectures.map((lecture, index) => (
                    <EducatorLectureCard
                      key={lecture.id}
                      lecture={lecture}
                      mockAnalytics={generateLectureMockAnalytics(index)}
                      onEdit={() => router.push(`/educator/lecture/new?id=${lecture.id}&mode=edit`)}
                      onDelete={() => setShowDeleteLectureModal(lecture.id)}
                      onPlayVideo={(url) => setPlayingMedia({ lectureId: lecture.id, type: 'video', url })}
                      onPlayAudio={(url) => setPlayingMedia({ lectureId: lecture.id, type: 'audio', url })}
                      onDeleteArtifact={(artifactId, type) => setShowDeleteArtifactModal({ lectureId: lecture.id, artifactId, type })}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="assignments" className="mt-0">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Course Assignments</h2>
                  <p className="text-gray-600 text-sm mt-1">{dummyAssignments.length} assignments created</p>
                </div>
                <button
                  onClick={() => router.push('/educator/assignment/new')}
                  className="bg-brand-maroon hover:bg-brand-maroon-hover text-white font-semibold py-2.5 px-5 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Create New Assignment
                </button>
              </div>

              <div className="space-y-4">
                {dummyAssignments.map((assignment, index) => (
                  <EducatorAssignmentCard
                    key={assignment.id}
                    assignment={assignment}
                    mockAnalytics={assignmentAnalytics[index]}
                    onViewDetails={() => toast.info('Assignment details coming soon')}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="quizzes" className="mt-0">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Course Quizzes</h2>
                  <p className="text-gray-600 text-sm mt-1">{quizzes.length} quizzes created</p>
                </div>
                <button
                  onClick={() => router.push('/educator/quiz/new')}
                  className="bg-brand-maroon hover:bg-brand-maroon-hover text-white font-semibold py-2.5 px-5 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Create New Quiz
                </button>
              </div>

              {quizzes.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <div className="max-w-md mx-auto">
                    <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ListChecks className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Quizzes Yet</h3>
                    <p className="text-gray-600 text-sm mb-6">
                      Create your first quiz to assess student understanding.
                    </p>
                    <button
                      onClick={() => router.push('/educator/quiz/new')}
                      className="bg-brand-maroon hover:bg-brand-maroon-hover text-white font-semibold py-2.5 px-6 rounded-lg transition-colors"
                    >
                      Create Quiz
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {quizzes.map((quiz, index) => {
                    const totalQuestions = quiz.mcq_count + quiz.short_answer_count;
                    const totalMarks = (quiz.mcq_count * 2) + (quiz.short_answer_count * 5);

                    return (
                      <EducatorQuizCard
                        key={quiz.id}
                        quiz={quiz}
                        totalMarks={totalMarks}
                        mockAnalytics={generateQuizMockAnalytics(index)}
                        onEdit={() => router.push(`/educator/quiz/new?id=${quiz.id}`)}
                        onDelete={() => toast.info('Delete quiz feature coming soon')}
                        onView={() => toast.info('View quiz details coming soon')}
                        onClick={() => toast.info('Quiz details coming soon')}
                      />
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="students" className="mt-0">
              <div className="bg-white rounded-xl border border-gray-200 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Student Management</h2>
                <p className="text-gray-600">Student roster management features will be available here.</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {showDeleteLectureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Lecture</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this lecture? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteLectureModal(null)}
                disabled={deleting}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteLecture(showDeleteLectureModal)}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteArtifactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete {showDeleteArtifactModal.type}</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this {showDeleteArtifactModal.type}? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteArtifactModal(null)}
                disabled={deleting}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteArtifact(showDeleteArtifactModal.artifactId)}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {playingMedia && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {playingMedia.type === 'video' ? 'Video Player' : 'Audio Player'}
              </h3>
              <button
                onClick={() => setPlayingMedia(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            {playingMedia.type === 'video' ? (
              <video
                src={playingMedia.url}
                controls
                autoPlay
                className="w-full rounded-lg"
              />
            ) : (
              <audio
                src={playingMedia.url}
                controls
                autoPlay
                className="w-full"
              />
            )}
          </div>
        </div>
      )}
    </EducatorLayout>
  );
}
