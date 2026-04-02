'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import EducatorLayout from '@/components/EducatorLayout';
import { Profile, supabase } from '@/lib/supabase';
import { ArrowLeft, Loader2, Send, Save, Clock } from 'lucide-react';

const backendBase = process.env.NEXT_PUBLIC_BACKEND_BASE;

interface ReviewQuestion {
  question_index: number;
  question: string;
  options: Record<string, string>;
  selected_option: string | null;
  ai_correct_option: string | null;
  ai_points_awarded: number;
  ai_feedback: string | null;
  educator_points_awarded: number | null;
  educator_feedback: string | null;
  final_points_awarded: number;
  final_feedback: string | null;
}

interface ReviewAttempt {
  generated_quiz_id: string;
  attempt_id: string | null;
  student_id: string | null;
  student_name: string;
  student_email: string | null;
  status: string;
  started_at: string | null;
  submitted_at: string | null;
  final_score: number | null;
  raw_score: number | null;
  overall_feedback: string | null;
  questions: ReviewQuestion[];
}

interface ReviewPayload {
  quiz_batch_id: string;
  quiz_name: string;
  status: 'draft' | 'generated' | 'saved' | 'published';
  published_at: string | null;
  course_id: string | null;
  course_number: string | null;
  course_title: string | null;
  available_at: string | null;
  due_at: string | null;
  time_limit_minutes: number;
  grade_release_mode: 'manual' | 'scheduled';
  grade_release_at: string | null;
  grades_published_at: string | null;
  attempts: ReviewAttempt[];
}

export default function EducatorOnlineQuizPage() {
  const router = useRouter();
  const params = useParams();
  const quizBatchId = params.quizBatchId as string;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [payload, setPayload] = useState<ReviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingAttemptId, setSavingAttemptId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [gradeReleaseMode, setGradeReleaseMode] = useState<'manual' | 'scheduled'>('manual');
  const [gradeReleaseAt, setGradeReleaseAt] = useState('');

  useEffect(() => {
    loadPage();
  }, [quizBatchId]);

  const loadPage = async () => {
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
        router.push('/educator/login');
        return;
      }

      setProfile(profileData);

      if (!backendBase) return;
      const response = await fetch(
        `${backendBase}/api/educator/quiz/online/${quizBatchId}?educatorId=${profileData.id}`,
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const reviewPayload = await response.json();
      setPayload(reviewPayload as ReviewPayload);
      setGradeReleaseMode((reviewPayload.grade_release_mode || 'manual') as 'manual' | 'scheduled');
      setGradeReleaseAt(reviewPayload.grade_release_at ? reviewPayload.grade_release_at.slice(0, 16) : '');
    } catch (error) {
      console.error('Error loading online quiz review:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAttemptField = (attemptId: string, field: 'overall_feedback', value: string) => {
    setPayload((current) => {
      if (!current) return current;
      return {
        ...current,
        attempts: current.attempts.map((attempt) =>
          attempt.attempt_id === attemptId ? { ...attempt, [field]: value } : attempt,
        ),
      };
    });
  };

  const updateQuestionField = (
    attemptId: string,
    questionIndex: number,
    field: 'educator_points_awarded' | 'educator_feedback',
    value: string,
  ) => {
    setPayload((current) => {
      if (!current) return current;
      return {
        ...current,
        attempts: current.attempts.map((attempt) => {
          if (attempt.attempt_id !== attemptId) return attempt;
          return {
            ...attempt,
            questions: attempt.questions.map((question) =>
              question.question_index === questionIndex
                ? {
                    ...question,
                    [field]: field === 'educator_points_awarded'
                      ? (value === '' ? null : Number(value))
                      : value,
                  }
                : question,
            ),
          };
        }),
      };
    });
  };

  const saveReview = async (attempt: ReviewAttempt) => {
    if (!backendBase || !profile || !attempt.attempt_id) return;

    setSavingAttemptId(attempt.attempt_id);
    try {
      const response = await fetch(`${backendBase}/api/educator/quiz/online/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId: attempt.attempt_id,
          educatorId: profile.id,
          overallFeedback: attempt.overall_feedback,
          answers: attempt.questions.map((question) => ({
            question_index: question.question_index,
            points_awarded: question.educator_points_awarded,
            feedback: question.educator_feedback,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      await loadPage();
    } catch (error) {
      console.error('Error saving review:', error);
      alert('Failed to save review changes.');
    } finally {
      setSavingAttemptId(null);
    }
  };

  const publishGrades = async () => {
    if (!backendBase || !profile) return;
    if (gradeReleaseMode === 'scheduled' && !gradeReleaseAt) {
      alert('Choose when grades should be released.');
      return;
    }

    setPublishing(true);
    try {
      const response = await fetch(`${backendBase}/api/educator/quiz/online/publish-grades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizBatchId,
          educatorId: profile.id,
          releaseMode: gradeReleaseMode,
          releaseAt: gradeReleaseMode === 'scheduled' ? new Date(gradeReleaseAt).toISOString() : null,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      await loadPage();
      alert(gradeReleaseMode === 'manual' ? 'Grades published.' : 'Grade release schedule saved.');
    } catch (error) {
      console.error('Error publishing grades:', error);
      alert('Failed to update grade release settings.');
    } finally {
      setPublishing(false);
    }
  };

  if (loading || !profile) {
    return (
      <EducatorLayout profile={profile ?? undefined}>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-maroon" />
        </div>
      </EducatorLayout>
    );
  }

  if (!payload) {
    return (
      <EducatorLayout profile={profile}>
        <div className="max-w-6xl mx-auto px-6 py-8">
          <button
            onClick={() => router.push('/educator/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            Unable to load the quiz review page.
          </div>
        </div>
      </EducatorLayout>
    );
  }

  return (
    <EducatorLayout profile={profile}>
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <button
          onClick={() => router.push(`/educator/course/${payload.course_id}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Course
        </button>

        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{payload.quiz_name}</h1>
              <p className="text-gray-600 mt-2">
                {payload.course_number} - {payload.course_title}
              </p>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <button
                onClick={() => router.push(`/educator/quiz/new?id=${quizBatchId}`)}
                className="border border-gray-300 hover:bg-gray-50 text-gray-900 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Edit Quiz
              </button>
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                {payload.status !== 'published'
                  ? 'This quiz is generated but not published yet. Students cannot see it until you publish it from the quiz editor.'
                  : payload.grades_published_at
                  ? `Grades published ${new Date(payload.grades_published_at).toLocaleString()}`
                  : 'Grades are still hidden from students.'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="text-sm text-gray-500 mb-1">Attempts</div>
              <div className="text-2xl font-semibold text-gray-900">{payload.attempts.length}</div>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="text-sm text-gray-500 mb-1">Time Limit</div>
              <div className="text-2xl font-semibold text-gray-900">{payload.time_limit_minutes} min</div>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="text-sm text-gray-500 mb-1">Available</div>
              <div className="text-sm font-medium text-gray-900">{payload.available_at ? new Date(payload.available_at).toLocaleString() : 'Immediately'}</div>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="text-sm text-gray-500 mb-1">Due</div>
              <div className="text-sm font-medium text-gray-900">{payload.due_at ? new Date(payload.due_at).toLocaleString() : 'No due date'}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-8 space-y-4">
          <div className="flex items-center gap-2 text-gray-900 font-semibold">
            <Clock className="w-4 h-4" />
            Grade Release
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              value={gradeReleaseMode}
              onChange={(e) => setGradeReleaseMode(e.target.value as 'manual' | 'scheduled')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="manual">Manual publish now</option>
              <option value="scheduled">Schedule release</option>
            </select>

            {gradeReleaseMode === 'scheduled' && (
              <input
                type="datetime-local"
                value={gradeReleaseAt}
                onChange={(e) => setGradeReleaseAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            )}
          </div>

          <div className="flex justify-end">
            <button
              onClick={publishGrades}
              disabled={publishing}
              className="bg-brand-maroon hover:bg-brand-maroon-hover text-white px-5 py-2.5 rounded-lg font-medium disabled:opacity-50 inline-flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {publishing ? 'Updating...' : gradeReleaseMode === 'manual' ? 'Publish Grades' : 'Save Release Schedule'}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {payload.attempts.map((attempt) => (
            <div key={attempt.generated_quiz_id} className="bg-white rounded-2xl border border-gray-200 p-8 space-y-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{attempt.student_name}</h2>
                  <p className="text-sm text-gray-600">{attempt.student_email || 'No email on file'}</p>
                </div>
                <div className="text-sm text-gray-600">
                  <div>Status: <span className="font-medium text-gray-900">{attempt.status}</span></div>
                  <div>Score: <span className="font-medium text-gray-900">{attempt.final_score ?? attempt.raw_score ?? 0}</span></div>
                </div>
              </div>

              {!attempt.attempt_id ? (
                <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3 text-yellow-800">
                  This student has not started the quiz yet.
                </div>
              ) : (
                <>
                  {attempt.questions.map((question) => (
                    <div key={question.question_index} className="rounded-xl border border-gray-200 p-5 space-y-4">
                      <div className="font-medium text-gray-900">
                        {question.question_index + 1}. {question.question}
                      </div>
                      <div className="space-y-1 text-sm text-gray-700">
                        {Object.entries(question.options || {}).map(([optionKey, optionValue]) => (
                          <div key={optionKey}>
                            <span className="font-medium">{optionKey}.</span> {optionValue}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                        <div>Student answer: <span className="font-medium text-gray-900">{question.selected_option || 'No answer'}</span></div>
                        <div>AI graded answer: <span className="font-medium text-gray-900">{question.ai_correct_option || 'N/A'}</span></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">Override Score</label>
                          <input
                            type="number"
                            min="0"
                            max="1"
                            step="0.5"
                            value={question.educator_points_awarded ?? ''}
                            onChange={(e) => updateQuestionField(attempt.attempt_id!, question.question_index, 'educator_points_awarded', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">Override Feedback</label>
                          <textarea
                            value={question.educator_feedback ?? ''}
                            onChange={(e) => updateQuestionField(attempt.attempt_id!, question.question_index, 'educator_feedback', e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                      </div>
                      <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
                        <div className="font-medium text-gray-900 mb-1">AI Feedback</div>
                        {question.ai_feedback || 'No AI feedback generated.'}
                      </div>
                    </div>
                  ))}

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Overall Feedback</label>
                    <textarea
                      value={attempt.overall_feedback ?? ''}
                      onChange={(e) => updateAttemptField(attempt.attempt_id!, 'overall_feedback', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => saveReview(attempt)}
                      disabled={savingAttemptId === attempt.attempt_id}
                      className="bg-brand-maroon hover:bg-brand-maroon-hover text-white px-5 py-2.5 rounded-lg font-medium disabled:opacity-50 inline-flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {savingAttemptId === attempt.attempt_id ? 'Saving...' : 'Save Review'}
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </EducatorLayout>
  );
}
