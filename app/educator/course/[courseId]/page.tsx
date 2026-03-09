'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase, Profile, Course } from '@/lib/supabase';
import EducatorLayout from '@/components/EducatorLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import AssignmentCard from '@/components/AssignmentCard';
import QuizCard from '@/components/QuizCard';
import CourseSummaryStats from '@/components/CourseSummaryStats';
import { ArrowLeft, Settings, Video, Mic, FileText, Play, Download, Clock, Calendar, Trash2, X, CreditCard as Edit, Plus, ChevronDown } from 'lucide-react';
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
  totalMarks: number;
  submissionCount: number;
  totalStudents: number;
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
  const [activeTab, setActiveTab] = useState('lectures');

  const dummyAssignments: Assignment[] = [
    {
      id: '1',
      title: 'Research Paper: Modern AI Applications',
      description: 'Write a 10-page research paper on modern AI applications in education',
      dueDate: '2026-03-20T23:59:00',
      status: 'active',
      totalMarks: 100,
      submissionCount: 24,
      totalStudents: 35
    },
    {
      id: '2',
      title: 'Case Study Analysis',
      description: 'Analyze the case study provided in class and submit a detailed report',
      dueDate: '2026-03-15T23:59:00',
      status: 'active',
      totalMarks: 50,
      submissionCount: 30,
      totalStudents: 35
    },
    {
      id: '3',
      title: 'Group Project Proposal',
      description: 'Submit a proposal for your final group project',
      dueDate: '2026-03-10T23:59:00',
      status: 'closed',
      totalMarks: 25,
      submissionCount: 35,
      totalStudents: 35
    }
  ];

  const dummySummaryStats = {
    totalStudents: 35,
    lectureCompletionRate: 78,
    assignmentSubmissionRate: 82,
    quizCompletionRate: 71,
    averageOverallMarks: 76,
    averageAssignmentScore: 81,
    averageQuizScore: 73,
    pendingAssignments: 2,
    pendingQuizzes: 1,
    topStudents: [
      { name: 'Emily Chen', email: 'echen@usc.edu', score: 95 },
      { name: 'Marcus Johnson', email: 'mjohnson@usc.edu', score: 92 },
      { name: 'Sarah Williams', email: 'swilliams@usc.edu', score: 89 },
      { name: 'David Park', email: 'dpark@usc.edu', score: 87 },
      { name: 'Jessica Martinez', email: 'jmartinez@usc.edu', score: 85 }
    ]
  };

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
      const { data: quizBatchCourses, error: qbcError } = await supabase
        .from('quiz_batch_courses')
        .select('quiz_batch_id')
        .eq('course_id', courseId);

      if (qbcError) throw qbcError;

      if (!quizBatchCourses || quizBatchCourses.length === 0) {
        setQuizzes([]);
        return;
      }

      const quizBatchIds = quizBatchCourses.map(qbc => qbc.quiz_batch_id);

      const { data: quizData, error: quizError } = await supabase
        .from('quiz_batches')
        .select('*')
        .in('id', quizBatchIds)
        .order('created_at', { ascending: false });

      if (quizError) throw quizError;

      setQuizzes(quizData || []);
    } catch (error) {
      console.error('Error loading quizzes:', error);
      toast.error('Failed to load quizzes');
    }
  };

  const handleDeleteArtifact = async () => {
    if (!showDeleteArtifactModal) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('lecture_artifacts')
        .delete()
        .eq('id', showDeleteArtifactModal.artifactId);

      if (error) throw error;

      toast.success('Content deleted successfully');
      setShowDeleteArtifactModal(null);
      await loadCourseLectures();
    } catch (error) {
      console.error('Error deleting artifact:', error);
      toast.error('Failed to delete content');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteLecture = async () => {
    if (!showDeleteLectureModal) return;

    setDeleting(true);
    try {
      const { error: artifactsError } = await supabase
        .from('lecture_artifacts')
        .delete()
        .eq('lecture_id', showDeleteLectureModal);

      if (artifactsError) throw artifactsError;

      const { error: coursesError } = await supabase
        .from('lecture_courses')
        .delete()
        .eq('lecture_id', showDeleteLectureModal);

      if (coursesError) throw coursesError;

      const { error: materialsError } = await supabase
        .from('lecture_materials')
        .delete()
        .eq('lecture_id', showDeleteLectureModal);

      if (materialsError) throw materialsError;

      const { error: jobsError } = await supabase
        .from('lecture_jobs')
        .delete()
        .eq('lecture_id', showDeleteLectureModal);

      if (jobsError) throw jobsError;

      const { error: lectureError } = await supabase
        .from('lectures')
        .delete()
        .eq('id', showDeleteLectureModal);

      if (lectureError) throw lectureError;

      toast.success('Lecture deleted successfully');
      setShowDeleteLectureModal(null);
      await loadCourseLectures();
    } catch (error) {
      console.error('Error deleting lecture:', error);
      toast.error('Failed to delete lecture');
    } finally {
      setDeleting(false);
    }
  };

  const getArtifactByType = (artifacts: LectureArtifact[], type: string) => {
    if (type === 'video_avatar') {
      return artifacts.find(a => a.artifact_type === 'video_avatar_mp4' || a.artifact_type === 'video_static_mp4' || a.artifact_type === 'video_avatar');
    } else if (type === 'audio') {
      return artifacts.find(a => a.artifact_type === 'audio_mp3' || a.artifact_type === 'audio');
    } else if (type === 'pptx') {
      return artifacts.find(a => a.artifact_type === 'pptx' || a.artifact_type === 'ppt');
    }
    return artifacts.find(a => a.artifact_type === type);
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
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/educator/dashboard')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>
              <p className="text-gray-600 mt-1">{course.course_number} {course.section ? `- Section ${course.section}` : ''} • {course.semester}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="bg-brand-maroon hover:bg-brand-maroon-hover text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create
                  <ChevronDown className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => router.push('/educator/lecture/new')} className="cursor-pointer">
                  <Video className="w-4 h-4 mr-2" />
                  Lecture
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/educator/assignment/new')} className="cursor-pointer">
                  <FileText className="w-4 h-4 mr-2" />
                  Assignment
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/educator/quiz/new')} className="cursor-pointer">
                  <FileText className="w-4 h-4 mr-2" />
                  Quiz
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              onClick={() => router.push(`/educator/course/${courseId}/edit`)}
              className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Edit Course
            </button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-gray-200">
            <TabsList className="bg-transparent h-auto p-0 space-x-8">
              <TabsTrigger
                value="lectures"
                className="bg-transparent border-b-2 border-transparent data-[state=active]:border-brand-maroon data-[state=active]:text-brand-maroon rounded-none px-0 pb-3 font-semibold text-gray-600 hover:text-gray-900"
              >
                Lectures ({lectures.length})
              </TabsTrigger>
              <TabsTrigger
                value="assignments"
                className="bg-transparent border-b-2 border-transparent data-[state=active]:border-brand-maroon data-[state=active]:text-brand-maroon rounded-none px-0 pb-3 font-semibold text-gray-600 hover:text-gray-900"
              >
                Assignments ({dummyAssignments.length})
              </TabsTrigger>
              <TabsTrigger
                value="quiz"
                className="bg-transparent border-b-2 border-transparent data-[state=active]:border-brand-maroon data-[state=active]:text-brand-maroon rounded-none px-0 pb-3 font-semibold text-gray-600 hover:text-gray-900"
              >
                Quiz ({quizzes.length})
              </TabsTrigger>
              <TabsTrigger
                value="summary"
                className="bg-transparent border-b-2 border-transparent data-[state=active]:border-brand-maroon data-[state=active]:text-brand-maroon rounded-none px-0 pb-3 font-semibold text-gray-600 hover:text-gray-900"
              >
                Summary
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="lectures" className="mt-6">
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
              <div className="space-y-3">
                {lectures.map((lecture) => {
                  const videoArtifact = getArtifactByType(lecture.artifacts, 'video_avatar');
                  const audioArtifact = getArtifactByType(lecture.artifacts, 'audio');
                  const pptxArtifact = getArtifactByType(lecture.artifacts, 'pptx');

                  return (
                    <div key={lecture.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-gray-300 transition-all">
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{lecture.title}</h3>
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                lecture.status === 'published' ? 'bg-green-50 text-green-700 border border-green-200' :
                                lecture.status === 'generated' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                'bg-gray-50 text-gray-700 border border-gray-200'
                              }`}>
                                {lecture.status.charAt(0).toUpperCase() + lecture.status.slice(1)}
                              </span>
                            </div>
                            {lecture.description && (
                              <p className="text-gray-600 text-sm mb-2">{lecture.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{lecture.video_length} min</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{new Date(lecture.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => router.push(`/educator/lecture/new?id=${lecture.id}&mode=edit`)}
                              className="text-gray-400 hover:text-gray-700 transition-colors p-1.5 rounded hover:bg-gray-100"
                              title="Edit lecture"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setShowDeleteLectureModal(lecture.id)}
                              className="text-gray-400 hover:text-red-600 transition-colors p-1.5 rounded hover:bg-red-50"
                              title="Delete lecture"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="border-t border-gray-100 pt-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {videoArtifact && (
                              <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="bg-brand-maroon p-1.5 rounded">
                                      <Video className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="font-medium text-sm text-gray-900">Video</span>
                                  </div>
                                  <button
                                    onClick={() => setShowDeleteArtifactModal({ lectureId: lecture.id, artifactId: videoArtifact.id, type: 'video' })}
                                    className="text-gray-400 hover:text-red-600 transition-colors"
                                    title="Delete video"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setPlayingMedia({ lectureId: lecture.id, type: 'video', url: videoArtifact.file_url })}
                                    className="flex-1 flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-medium py-1.5 px-2 rounded transition-colors text-xs"
                                  >
                                    <Play className="w-3.5 h-3.5" />
                                    Play
                                  </button>
                                  <a
                                    href={videoArtifact.file_url}
                                    download
                                    className="flex items-center justify-center bg-white hover:bg-gray-50 border border-gray-300 p-1.5 rounded transition-colors"
                                  >
                                    <Download className="w-3.5 h-3.5 text-gray-700" />
                                  </a>
                                </div>
                              </div>
                            )}

                            {audioArtifact && (
                              <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="bg-blue-600 p-1.5 rounded">
                                      <Mic className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="font-medium text-sm text-gray-900">Audio</span>
                                  </div>
                                  <button
                                    onClick={() => setShowDeleteArtifactModal({ lectureId: lecture.id, artifactId: audioArtifact.id, type: 'audio' })}
                                    className="text-gray-400 hover:text-red-600 transition-colors"
                                    title="Delete audio"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setPlayingMedia({ lectureId: lecture.id, type: 'audio', url: audioArtifact.file_url })}
                                    className="flex-1 flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-medium py-1.5 px-2 rounded transition-colors text-xs"
                                  >
                                    <Play className="w-3.5 h-3.5" />
                                    Play
                                  </button>
                                  <a
                                    href={audioArtifact.file_url}
                                    download
                                    className="flex items-center justify-center bg-white hover:bg-gray-50 border border-gray-300 p-1.5 rounded transition-colors"
                                  >
                                    <Download className="w-3.5 h-3.5 text-gray-700" />
                                  </a>
                                </div>
                              </div>
                            )}

                            {pptxArtifact && (
                              <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="bg-green-600 p-1.5 rounded">
                                      <FileText className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="font-medium text-sm text-gray-900">Slides</span>
                                  </div>
                                  <button
                                    onClick={() => setShowDeleteArtifactModal({ lectureId: lecture.id, artifactId: pptxArtifact.id, type: 'pptx' })}
                                    className="text-gray-400 hover:text-red-600 transition-colors"
                                    title="Delete slides"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <a
                                  href={pptxArtifact.file_url}
                                  download
                                  className="w-full flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-medium py-1.5 px-2 rounded transition-colors text-xs"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  Download
                                </a>
                              </div>
                            )}

                            {!videoArtifact && !audioArtifact && !pptxArtifact && (
                              <div className="col-span-3 text-center py-4 text-gray-500">
                                <p className="text-xs">No content available</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="assignments" className="mt-6">
            {dummyAssignments.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <div className="max-w-md mx-auto">
                  <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Assignments Yet</h3>
                  <p className="text-gray-600 text-sm mb-6">
                    This course doesn't have any assignments yet. Create your first assignment to get started.
                  </p>
                  <button
                    onClick={() => router.push('/educator/assignment/new')}
                    className="bg-brand-maroon hover:bg-brand-maroon-hover text-white font-semibold py-2.5 px-6 rounded-lg transition-colors"
                  >
                    Create Assignment
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {dummyAssignments.map((assignment) => (
                  <AssignmentCard
                    key={assignment.id}
                    title={assignment.title}
                    description={assignment.description}
                    dueDate={assignment.dueDate}
                    status={assignment.status}
                    totalMarks={assignment.totalMarks}
                    submissionCount={assignment.submissionCount}
                    totalStudents={assignment.totalStudents}
                    onEdit={() => toast.info('Edit assignment feature coming soon')}
                    onDelete={() => toast.info('Delete assignment feature coming soon')}
                    onClick={() => toast.info('View assignment details coming soon')}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="quiz" className="mt-6">
            {quizzes.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <div className="max-w-md mx-auto">
                  <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Quizzes Yet</h3>
                  <p className="text-gray-600 text-sm mb-6">
                    This course doesn't have any quizzes yet. Create your first quiz to get started.
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
              <div className="space-y-3">
                {quizzes.map((quiz) => {
                  const totalQuestions = quiz.mcq_count + quiz.short_answer_count;
                  const totalMarks = (quiz.mcq_count * 2) + (quiz.short_answer_count * 5);

                  return (
                    <QuizCard
                      key={quiz.id}
                      title={quiz.quiz_name || 'Untitled Quiz'}
                      createdAt={quiz.created_at}
                      status={quiz.status}
                      totalMarks={totalMarks}
                      mcqCount={quiz.mcq_count}
                      shortAnswerCount={quiz.short_answer_count}
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

          <TabsContent value="summary" className="mt-6">
            <CourseSummaryStats {...dummySummaryStats} />
          </TabsContent>
        </Tabs>
      </div>

      {showDeleteArtifactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 p-3 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Delete Content</h3>
            </div>

            <p className="text-gray-700">
              Are you sure you want to delete this {showDeleteArtifactModal.type} content? This action cannot be undone.
            </p>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowDeleteArtifactModal(null)}
                disabled={deleting}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteArtifact}
                disabled={deleting}
                className="flex-1 px-4 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>Deleting...</>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteLectureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 p-3 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Delete Lecture</h3>
            </div>

            <p className="text-gray-700">
              Are you sure you want to delete this entire lecture? This will remove all associated content including video, audio, and PowerPoint files. This action cannot be undone.
            </p>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowDeleteLectureModal(null)}
                disabled={deleting}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteLecture}
                disabled={deleting}
                className="flex-1 px-4 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>Deleting...</>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {playingMedia && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="relative w-full max-w-5xl">
            <button
              onClick={() => setPlayingMedia(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            <div className="bg-black rounded-2xl overflow-hidden">
              {playingMedia.type === 'video' ? (
                <video
                  src={playingMedia.url}
                  controls
                  autoPlay
                  className="w-full max-h-[80vh]"
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="p-8 flex items-center justify-center">
                  <audio
                    src={playingMedia.url}
                    controls
                    autoPlay
                    className="w-full"
                  >
                    Your browser does not support the audio tag.
                  </audio>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </EducatorLayout>
  );
}
