'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import EducatorLayout from '@/components/EducatorLayout';
import Markdown from '@/components/Markdown';
import { getBackendBase } from '@/lib/backend';
import { supabase, Profile } from '@/lib/supabase';
import { ArrowLeft, BookOpen, Brain, ClipboardList, FileCheck, FileText, Upload, Users } from 'lucide-react';

const backendBase = getBackendBase();

type StudentProfileResponse = {
  course: {
    course_id: string;
    course_number: string | null;
    course_title: string | null;
    semester: string | null;
  };
  student: {
    course_student_id: string;
    student_id: string | null;
    email: string;
    first_name: string | null;
    last_name: string | null;
    display_name: string;
  };
  overview: {
    assignments_total: number;
    assignments_submitted: number;
    assignments_avg_percent: number | null;
    online_quizzes_total: number;
    online_quizzes_completed: number;
    online_quizzes_avg_percent: number | null;
    lectures_total: number;
    lectures_completed: number;
    uploads_total: number;
  };
  ai_summary: {
    summary: string | null;
    error: string | null;
  };
  assignments: Array<{
    assignment_id: string;
    assignment_label: string;
    assignment_title: string;
    status: string;
    points_possible: number;
    due_at: string | null;
    submitted_at: string | null;
    grade_score: number | null;
    feedback_text: string | null;
  }>;
  online_quizzes: Array<{
    quiz_batch_id: string;
    quiz_name: string;
    quiz_status: string;
    attempt_status: string;
    due_at: string | null;
    final_score: number | null;
    total_marks: number;
    grade_released_at: string | null;
    overall_feedback: string | null;
    submitted_at: string | null;
  }>;
  in_class_quizzes: Array<{
    quiz_batch_id: string;
    generated_quiz_id: string;
    quiz_name: string;
    quiz_status: string;
    created_at: string | null;
    student_file_name: string | null;
    question_count: number;
  }>;
  lectures: Array<{
    lecture_id: string;
    title: string;
    status: string;
    created_at: string | null;
    video_length: number;
    completed: boolean;
    duration_watched: number;
    last_viewed_at: string | null;
  }>;
  uploads: Array<{
    upload_id: string;
    file_name: string;
    file_size: number;
    file_url: string | null;
    created_at: string | null;
  }>;
};

function formatDate(value: string | null) {
  if (!value) return 'Not set';
  return new Date(value).toLocaleString();
}

function formatPercent(value: number | null) {
  return value === null ? '--' : `${Math.round(value)}%`;
}

function formatFileSize(bytes: number) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function normalizeAiSummary(value: string) {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/^\s*-\s+/gm, '- ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case 'graded':
    case 'submitted':
    case 'published':
    case 'completed':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'timed_out':
    case 'needs_attention':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'generated':
    case 'pending':
    case 'not_started':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}

export default function EducatorStudentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;
  const courseStudentId = params.courseStudentId as string;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StudentProfileResponse | null>(null);

  useEffect(() => {
    loadPage();
  }, [courseId, courseStudentId]);

  const loadPage = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
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

      if (!backendBase) {
        throw new Error('NEXT_PUBLIC_BACKEND_BASE is not configured');
      }

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 25000);
      let response: Response;
      try {
        response = await fetch(
          `${backendBase}/api/educator/course/student-profile?courseId=${courseId}&courseStudentId=${courseStudentId}&educatorId=${user.id}`,
          { signal: controller.signal },
        );
      } finally {
        window.clearTimeout(timeoutId);
      }

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const payload = await response.json();
      setData(payload as StudentProfileResponse);
    } catch (err) {
      console.error('Error loading student detail:', err);
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Student detail request timed out. Check whether the backend is responsive.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load student details');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <EducatorLayout profile={profile ?? undefined}>
        <div className="min-h-screen bg-white">
          <div className="max-w-7xl mx-auto px-6 py-8 text-gray-600">Loading student details...</div>
        </div>
      </EducatorLayout>
    );
  }

  if (!data) {
    return (
      <EducatorLayout profile={profile ?? undefined}>
        <div className="min-h-screen bg-white">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <button
              onClick={() => router.push(`/educator/course/${courseId}`)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Course
            </button>
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error || 'Unable to load student details.'}
            </div>
          </div>
        </div>
      </EducatorLayout>
    );
  }

  const { student, course, overview } = data;

  return (
    <EducatorLayout profile={profile ?? undefined}>
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          <div>
            <button
              onClick={() => router.push(`/educator/course/${courseId}?tab=students`)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Student Management
            </button>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{student.display_name}</h1>
                <p className="text-gray-600 mt-1">{student.email}</p>
                <p className="text-gray-500 text-sm mt-2">
                  {course.course_number} - {course.course_title} {course.semester ? ` | ${course.semester}` : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <Brain className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">AI Student Summary</h2>
                <p className="text-sm text-gray-600">Generated from the student&apos;s assignments, quizzes, lecture activity, and uploads.</p>
              </div>
            </div>
            {data.ai_summary.summary ? (
              <div className="rounded-xl bg-white/80 px-5 py-4 shadow-sm ring-1 ring-blue-100">
                <Markdown value={normalizeAiSummary(data.ai_summary.summary)} />
              </div>
            ) : (
              <div className="text-sm text-gray-600">
                {data.ai_summary.error || 'AI summary is unavailable right now.'}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="rounded-xl border border-gray-200 p-5 bg-white">
              <p className="text-sm text-gray-500">Assignments</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {overview.assignments_submitted}/{overview.assignments_total}
              </p>
              <p className="text-sm text-gray-600 mt-1">Avg: {formatPercent(overview.assignments_avg_percent)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-5 bg-white">
              <p className="text-sm text-gray-500">Online Quizzes</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {overview.online_quizzes_completed}/{overview.online_quizzes_total}
              </p>
              <p className="text-sm text-gray-600 mt-1">Avg: {formatPercent(overview.online_quizzes_avg_percent)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-5 bg-white">
              <p className="text-sm text-gray-500">Lectures Completed</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {overview.lectures_completed}/{overview.lectures_total}
              </p>
              <p className="text-sm text-gray-600 mt-1">Educator-published course lectures</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-5 bg-white">
              <p className="text-sm text-gray-500">Uploads</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{overview.uploads_total}</p>
              <p className="text-sm text-gray-600 mt-1">Files uploaded in this course</p>
            </div>
          </div>

          <section className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex items-center gap-3 mb-5">
              <ClipboardList className="w-5 h-5 text-brand-maroon" />
              <h2 className="text-xl font-bold text-gray-900">Assignments</h2>
            </div>
            {data.assignments.length === 0 ? (
              <p className="text-sm text-gray-600">This student has no assignments assigned in this course.</p>
            ) : (
              <div className="space-y-4">
                {data.assignments.map((assignment) => (
                  <div key={assignment.assignment_id} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">{assignment.assignment_label}</h3>
                        <p className="text-sm text-gray-600">{assignment.assignment_title}</p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusBadgeClass(assignment.status)}`}>
                        {assignment.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-600">
                      <div>Due: {formatDate(assignment.due_at)}</div>
                      <div>Submitted: {formatDate(assignment.submitted_at)}</div>
                      <div>
                        Score: {assignment.grade_score !== null ? `${assignment.grade_score}/${assignment.points_possible}` : `--/${assignment.points_possible}`}
                      </div>
                    </div>
                    {assignment.feedback_text && (
                      <p className="mt-3 text-sm text-gray-700">{assignment.feedback_text}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="flex items-center gap-3 mb-5">
                <FileCheck className="w-5 h-5 text-brand-maroon" />
                <h2 className="text-xl font-bold text-gray-900">Online Quizzes</h2>
              </div>
              {data.online_quizzes.length === 0 ? (
                <p className="text-sm text-gray-600">No online quizzes found for this student.</p>
              ) : (
                <div className="space-y-4">
                  {data.online_quizzes.map((quiz) => (
                    <div key={quiz.quiz_batch_id} className="rounded-xl border border-gray-200 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">{quiz.quiz_name}</h3>
                          <p className="text-sm text-gray-600">Batch status: {quiz.quiz_status}</p>
                        </div>
                        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusBadgeClass(quiz.attempt_status)}`}>
                          {quiz.attempt_status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                        <div>Due: {formatDate(quiz.due_at)}</div>
                        <div>Submitted: {formatDate(quiz.submitted_at)}</div>
                        <div>
                          Score: {quiz.final_score !== null ? `${quiz.final_score}/${quiz.total_marks}` : `--/${quiz.total_marks}`}
                        </div>
                        <div>Grades Released: {formatDate(quiz.grade_released_at)}</div>
                      </div>
                      {quiz.overall_feedback && (
                        <p className="mt-3 text-sm text-gray-700">{quiz.overall_feedback}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="flex items-center gap-3 mb-5">
                <FileText className="w-5 h-5 text-brand-maroon" />
                <h2 className="text-xl font-bold text-gray-900">In-Class Quizzes</h2>
              </div>
              {data.in_class_quizzes.length === 0 ? (
                <p className="text-sm text-gray-600">No in-class quizzes were generated for this student.</p>
              ) : (
                <div className="space-y-4">
                  {data.in_class_quizzes.map((quiz) => (
                    <div key={quiz.generated_quiz_id} className="rounded-xl border border-gray-200 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">{quiz.quiz_name}</h3>
                          <p className="text-sm text-gray-600">{quiz.student_file_name || 'Student material'}</p>
                        </div>
                        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusBadgeClass(quiz.quiz_status)}`}>
                          {quiz.quiz_status}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                        <div>Created: {formatDate(quiz.created_at)}</div>
                        <div>Questions: {quiz.question_count}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex items-center gap-3 mb-5">
              <BookOpen className="w-5 h-5 text-brand-maroon" />
              <h2 className="text-xl font-bold text-gray-900">Lecture Activity</h2>
            </div>
            {data.lectures.length === 0 ? (
              <p className="text-sm text-gray-600">No course lectures found.</p>
            ) : (
              <div className="space-y-4">
                {data.lectures.map((lecture) => (
                  <div key={lecture.lecture_id} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">{lecture.title}</h3>
                        <p className="text-sm text-gray-600">Published: {formatDate(lecture.created_at)}</p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusBadgeClass(lecture.completed ? 'completed' : 'pending')}`}>
                        {lecture.completed ? 'completed' : 'not completed'}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-600">
                      <div>Watched: {Math.round((lecture.duration_watched || 0) / 60)} min</div>
                      <div>Video Length: {Math.round((lecture.video_length || 0) / 60)} min</div>
                      <div>Last Viewed: {formatDate(lecture.last_viewed_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex items-center gap-3 mb-5">
              <Upload className="w-5 h-5 text-brand-maroon" />
              <h2 className="text-xl font-bold text-gray-900">Student Uploads</h2>
            </div>
            {data.uploads.length === 0 ? (
              <p className="text-sm text-gray-600">No uploads found for this course.</p>
            ) : (
              <div className="space-y-3">
                {data.uploads.map((upload) => (
                  <div key={upload.upload_id} className="rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-gray-900">{upload.file_name}</p>
                      <p className="text-sm text-gray-600">
                        {formatFileSize(upload.file_size)} | {formatDate(upload.created_at)}
                      </p>
                    </div>
                    {upload.file_url && (
                      <a
                        href={upload.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Open File
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </EducatorLayout>
  );
}
