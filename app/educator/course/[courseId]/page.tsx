'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase, Profile, Course } from '@/lib/supabase';
import { AssignmentRecord } from '@/lib/assignments';
import {
  getAssignmentSystemMissingMessage,
  isAssignmentSystemMissingError,
} from '@/lib/assignmentSystemErrors';
import EducatorLayout from '@/components/EducatorLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EducatorCourseOverview from '@/components/EducatorCourseOverview';
import EducatorLectureCard from '@/components/EducatorLectureCard';
import EducatorAssignmentCard from '@/components/EducatorAssignmentCard';
import EducatorQuizCard from '@/components/EducatorQuizCard';
import StudentManagementTable from '@/components/StudentManagementTable';
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

type AssignmentSummary = AssignmentRecord & {
  analytics: {
    totalStudents: number;
    submitted: number;
    graded: number;
    pending: number;
    avgScore: number | null;
  };
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
  const [assignments, setAssignments] = useState<AssignmentSummary[]>([]);
  const [assignmentSystemMissing, setAssignmentSystemMissing] = useState(false);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteLectureModal, setShowDeleteLectureModal] = useState<string | null>(null);
  const [showDeleteArtifactModal, setShowDeleteArtifactModal] = useState<{ lectureId: string; artifactId: string; type: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [playingMedia, setPlayingMedia] = useState<{ lectureId: string; type: 'video' | 'audio'; url: string } | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  // Mock analytics for lectures
  const generateLectureMockAnalytics = (index: number) => ({
    views: [124, 118, 132, 95, 87][index % 5] || 100,
    completionRate: [94, 87, 91, 78, 82][index % 5] || 85,
    avgWatchTime: ['11:45', '13:20', '9:15', '14:50', '8:30'][index % 5] || '10:00',
    publishDate: new Date(Date.now() - (index + 1) * 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
  });

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
          loadCourseAssignments(),
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
      const { data: quizRelations, error } = await supabase
        .from('quiz_batch_courses')
        .select(`
          quiz_batches!inner(
            id,
            quiz_name,
            created_at,
            status,
            mcq_count,
            short_answer_count
          )
        `)
        .eq('course_id', courseId)
        .order('created_at', { ascending: false, foreignTable: 'quiz_batches' });

      if (error) throw error;

      const normalizedQuizzes: Quiz[] = (quizRelations || [])
        .map((relation: any) => relation.quiz_batches)
        .filter(Boolean)
        .map((quiz: any) => ({
          id: quiz.id,
          quiz_name: quiz.quiz_name,
          created_at: quiz.created_at,
          status: quiz.status,
          mcq_count: quiz.mcq_count,
          short_answer_count: quiz.short_answer_count,
        }));

      setQuizzes(normalizedQuizzes);
    } catch (error) {
      console.error('Error loading quizzes:', error);
      toast.error('Failed to load quizzes');
    }
  };

  const loadCourseAssignments = async () => {
    try {
      const { data: assignmentRows, error: assignmentError } = await supabase
        .from('assignments')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      if (assignmentError) {
        if (isAssignmentSystemMissingError(assignmentError)) {
          setAssignmentSystemMissing(true);
          setAssignments([]);
          return;
        }
        throw assignmentError;
      }

      const normalizedAssignments = ((assignmentRows || []) as any[]).map((assignment) => ({
        ...assignment,
        allowed_mime_types: Array.isArray(assignment.allowed_mime_types)
          ? assignment.allowed_mime_types
          : [],
      })) as AssignmentRecord[];

      if (normalizedAssignments.length === 0) {
        setAssignments([]);
        return;
      }

      const assignmentIds = normalizedAssignments.map((assignment) => assignment.id);

      const [{ data: targetRows, error: targetError }, { data: submissionRows, error: submissionError }] = await Promise.all([
        supabase
          .from('assignment_students')
          .select('assignment_id')
          .in('assignment_id', assignmentIds),
        supabase
          .from('assignment_submissions')
          .select('assignment_id, submitted_at, grade_score')
          .in('assignment_id', assignmentIds),
      ]);

      if (targetError) throw targetError;
      if (submissionError) throw submissionError;

      const targetCounts = new Map<string, number>();
      (targetRows || []).forEach((row: { assignment_id: string }) => {
        targetCounts.set(row.assignment_id, (targetCounts.get(row.assignment_id) || 0) + 1);
      });

      const submittedCounts = new Map<string, number>();
      const gradedCounts = new Map<string, number>();
      const gradeTotals = new Map<string, number>();

      (submissionRows || []).forEach((row: { assignment_id: string; submitted_at: string | null; grade_score: number | null }) => {
        if (row.submitted_at) {
          submittedCounts.set(row.assignment_id, (submittedCounts.get(row.assignment_id) || 0) + 1);
        }

        if (row.grade_score !== null) {
          gradedCounts.set(row.assignment_id, (gradedCounts.get(row.assignment_id) || 0) + 1);
          gradeTotals.set(row.assignment_id, (gradeTotals.get(row.assignment_id) || 0) + Number(row.grade_score));
        }
      });

      const enrichedAssignments: AssignmentSummary[] = normalizedAssignments.map((assignment) => {
        const totalStudents = targetCounts.get(assignment.id) || 0;
        const submitted = submittedCounts.get(assignment.id) || 0;
        const graded = gradedCounts.get(assignment.id) || 0;
        const totalGrades = gradeTotals.get(assignment.id) || 0;

        return {
          ...assignment,
          analytics: {
            totalStudents,
            submitted,
            graded,
            pending: Math.max(totalStudents - submitted, 0),
            avgScore: graded > 0 ? Number((totalGrades / graded).toFixed(1)) : null,
          },
        };
      });

      setAssignments(enrichedAssignments);
    } catch (error) {
      console.error('Error loading assignments:', error);
      toast.error('Failed to load assignments');
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
            <p className="text-gray-600 mb-6">The course you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.</p>
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
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-6">
            <button
              onClick={() => router.push('/educator/dashboard')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </button>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">{course.title}</h1>
                <p className="text-gray-600">{course.course_number} • {course.semester}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <button
                    onClick={() => setShowCreateMenu(!showCreateMenu)}
                    onBlur={() => setTimeout(() => setShowCreateMenu(false), 200)}
                    className="bg-brand-maroon hover:bg-brand-maroon-hover text-white font-semibold py-2.5 px-5 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Create
                  </button>
                  {showCreateMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
                      <button
                        onClick={() => {
                          router.push('/educator/lecture/new');
                          setShowCreateMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                      >
                        <Video className="w-4 h-4" />
                        New Lecture
                      </button>
                      <button
                        onClick={() => {
                          router.push(`/educator/assignment/new?courseId=${courseId}`);
                          setShowCreateMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        New Assignment
                      </button>
                      <button
                        onClick={() => {
                          router.push('/educator/quiz/new');
                          setShowCreateMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                      >
                        <ListChecks className="w-4 h-4" />
                        New Quiz
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => router.push(`/educator/course/${courseId}/edit`)}
                  className="border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold py-2.5 px-5 rounded-lg transition-colors flex items-center gap-2"
                >
                  Edit Course
                </button>
              </div>
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
                      This course doesn&apos;t have any lectures yet. Create a new lecture by selecting this course in the lecture creation flow.
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
              {assignmentSystemMissing && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {getAssignmentSystemMissingMessage()}
                </div>
              )}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Course Assignments</h2>
                  <p className="text-gray-600 text-sm mt-1">{assignments.length} assignments created</p>
                </div>
                <button
                  onClick={() => router.push(`/educator/assignment/new?courseId=${courseId}`)}
                  disabled={assignmentSystemMissing}
                  className="bg-brand-maroon hover:bg-brand-maroon-hover text-white font-semibold py-2.5 px-5 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Create New Assignment
                </button>
              </div>

              {assignments.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <div className="max-w-md mx-auto">
                    <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Assignments Yet</h3>
                    <p className="text-gray-600 text-sm mb-6">
                      Create your first assignment for this course, upload the question PDF, and publish it to the enrolled students.
                    </p>
                    <button
                      onClick={() => router.push(`/educator/assignment/new?courseId=${courseId}`)}
                      className="bg-brand-maroon hover:bg-brand-maroon-hover text-white font-semibold py-2.5 px-6 rounded-lg transition-colors"
                    >
                      Create Assignment
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {assignments.map((assignment) => (
                    <EducatorAssignmentCard
                      key={assignment.id}
                      assignment={assignment}
                      analytics={assignment.analytics}
                      onViewDetails={() => router.push(`/educator/assignment/${assignment.id}`)}
                    />
                  ))}
                </div>
              )}
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
              <StudentManagementTable
                courseId={courseId}
                onAddStudent={() => toast.info('Add student feature coming soon')}
                onBulkImport={() => toast.info('Bulk import feature coming soon')}
              />
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
