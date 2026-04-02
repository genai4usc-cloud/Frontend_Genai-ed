'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import StudentLayout from '@/components/StudentLayout';
import { Profile, supabase } from '@/lib/supabase';
import { ArrowLeft, Clock, CheckCircle2, FileCheck, Loader2 } from 'lucide-react';

const backendBase = process.env.NEXT_PUBLIC_BACKEND_BASE;

interface OnlineQuizQuestion {
  question_index: number;
  question: string;
  options: Record<string, string>;
  selected_option?: string | null;
  final_points_awarded?: number;
  final_feedback?: string | null;
  correct_option?: string | null;
}

interface OnlineQuizDetail {
  quiz_batch_id: string;
  course_id: string;
  quiz_name: string;
  course_number: string | null;
  course_title: string | null;
  instructor_name: string | null;
  available_at: string | null;
  due_at: string | null;
  time_limit_minutes: number;
  status: 'upcoming' | 'available' | 'in_progress' | 'submitted' | 'grades_released' | 'closed';
  question_count: number;
  total_marks: number;
  grades_published_at: string | null;
  attempt: {
    id: string;
    status: string;
    started_at: string;
    submitted_at: string | null;
    expires_at: string;
    final_score?: number;
    overall_feedback?: string | null;
  } | null;
  questions: OnlineQuizQuestion[];
}

export default function StudentOnlineQuizPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;
  const quizBatchId = params.quizBatchId as string;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [detail, setDetail] = useState<OnlineQuizDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [savingQuestionIndex, setSavingQuestionIndex] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  useEffect(() => {
    loadPage();
  }, [quizBatchId]);

  useEffect(() => {
    if (!detail?.attempt?.expires_at || detail.status !== 'in_progress') {
      setRemainingSeconds(null);
      return;
    }

    const updateRemaining = () => {
      const expiresAt = new Date(detail.attempt!.expires_at).getTime();
      const nextSeconds = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setRemainingSeconds(nextSeconds);
      if (nextSeconds === 0) {
        void submitQuiz(true);
      }
    };

    updateRemaining();
    const intervalId = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(intervalId);
  }, [detail?.attempt?.expires_at, detail?.status]);

  const formattedRemaining = useMemo(() => {
    if (remainingSeconds === null) return null;
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [remainingSeconds]);

  const loadPage = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
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
        router.push('/student/login');
        return;
      }

      setProfile(profileData);
      await fetchDetail(user.id);
    } catch (error) {
      console.error('Error loading online quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (studentId: string) => {
    if (!backendBase) return;

    const response = await fetch(
      `${backendBase}/api/student/quiz/online/${quizBatchId}?studentId=${studentId}`,
    );

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const payload = await response.json();
    setDetail(payload as OnlineQuizDetail);
  };

  const startQuiz = async () => {
    if (!profile || !backendBase) return;
    setStarting(true);
    try {
      const response = await fetch(`${backendBase}/api/student/quiz/online/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizBatchId,
          studentId: profile.id,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const payload = await response.json();
      setDetail(payload as OnlineQuizDetail);
    } catch (error) {
      console.error('Error starting online quiz:', error);
      alert('Failed to start the quiz.');
    } finally {
      setStarting(false);
    }
  };

  const saveAnswer = async (questionIndex: number, selectedOption: string) => {
    if (!detail || !profile || !backendBase) return;

    setDetail((current) => {
      if (!current) return current;
      return {
        ...current,
        questions: current.questions.map((question) =>
          question.question_index === questionIndex
            ? { ...question, selected_option: selectedOption }
            : question,
        ),
      };
    });

    setSavingQuestionIndex(questionIndex);
    try {
      const response = await fetch(`${backendBase}/api/student/quiz/online/save-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizBatchId,
          studentId: profile.id,
          questionIndex,
          selectedOption,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
    } catch (error) {
      console.error('Error saving answer:', error);
      alert('Failed to save the answer.');
    } finally {
      setSavingQuestionIndex(null);
    }
  };

  const submitQuiz = async (silent = false) => {
    if (!profile || !backendBase || submitting) return;

    setSubmitting(true);
    try {
      const response = await fetch(`${backendBase}/api/student/quiz/online/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizBatchId,
          studentId: profile.id,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const payload = await response.json();
      setDetail(payload as OnlineQuizDetail);
      if (!silent) {
        alert('Quiz submitted successfully.');
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
      if (!silent) {
        alert('Failed to submit the quiz.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fc]">
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-maroon" />
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <StudentLayout profile={profile}>
        <div className="max-w-5xl mx-auto px-6 py-8">
          <button
            onClick={() => router.push(`/student/course/${courseId}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Course
          </button>
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            Unable to load the quiz.
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout profile={profile}>
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <button
          onClick={() => router.push(`/student/course/${courseId}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Course
        </button>

        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{detail.quiz_name}</h1>
              <p className="text-gray-600 mt-2">
                {detail.course_number} - {detail.course_title}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Instructor: {detail.instructor_name}
              </p>
            </div>

            {detail.status === 'in_progress' && formattedRemaining && (
              <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-orange-800 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Time Remaining: {formattedRemaining}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="text-sm text-gray-500 mb-1">Questions</div>
              <div className="text-2xl font-semibold text-gray-900">{detail.question_count}</div>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="text-sm text-gray-500 mb-1">Marks</div>
              <div className="text-2xl font-semibold text-gray-900">{detail.total_marks}</div>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="text-sm text-gray-500 mb-1">Time Limit</div>
              <div className="text-2xl font-semibold text-gray-900">{detail.time_limit_minutes} min</div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-gray-200 p-5">
            <div className="space-y-2 text-sm text-gray-700">
              <p>Status: <span className="font-medium text-gray-900">{detail.status.replace('_', ' ')}</span></p>
              {detail.available_at && <p>Available From: {new Date(detail.available_at).toLocaleString()}</p>}
              {detail.due_at && <p>Due Date: {new Date(detail.due_at).toLocaleString()}</p>}
            </div>

            {detail.status === 'upcoming' && (
              <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-amber-800">
                This quiz is scheduled but not available yet.
              </div>
            )}

            {detail.status === 'available' && (
              <div className="mt-4">
                <p className="text-gray-600 mb-4">
                  This quiz allows one attempt only. Once you start, the timer will continue even if you refresh the page.
                </p>
                <button
                  onClick={startQuiz}
                  disabled={starting}
                  className="bg-brand-maroon hover:bg-brand-maroon-hover text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50"
                >
                  {starting ? 'Starting...' : 'Start Quiz'}
                </button>
              </div>
            )}

            {detail.status === 'submitted' && (
              <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-blue-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Submitted. Grades will appear after your educator publishes them.
              </div>
            )}

            {detail.status === 'closed' && (
              <div className="mt-4 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-gray-700">
                This quiz is closed.
              </div>
            )}
          </div>
        </div>

        {detail.status === 'in_progress' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 space-y-8">
            {detail.questions.map((question) => (
              <div key={question.question_index} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                <div className="font-semibold text-gray-900 mb-4">
                  {question.question_index + 1}. {question.question}
                </div>
                <div className="space-y-3">
                  {Object.entries(question.options || {}).map(([optionKey, optionValue]) => (
                    <label
                      key={optionKey}
                      className={`flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                        question.selected_option === optionKey
                          ? 'border-brand-maroon bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${question.question_index}`}
                        checked={question.selected_option === optionKey}
                        onChange={() => saveAnswer(question.question_index, optionKey)}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{optionKey}</div>
                        <div className="text-gray-700">{optionValue}</div>
                      </div>
                    </label>
                  ))}
                </div>
                {savingQuestionIndex === question.question_index && (
                  <div className="text-sm text-gray-500 mt-3">Saving answer...</div>
                )}
              </div>
            ))}

            <div className="flex justify-end">
              <button
                onClick={() => submitQuiz()}
                disabled={submitting}
                className="bg-brand-maroon hover:bg-brand-maroon-hover text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Quiz'}
              </button>
            </div>
          </div>
        )}

        {detail.status === 'grades_released' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 space-y-6">
            <div className="rounded-xl bg-green-50 border border-green-200 p-5">
              <div className="flex items-center gap-2 text-green-800 font-medium mb-2">
                <FileCheck className="w-5 h-5" />
                Grades Released
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {detail.attempt?.final_score ?? 0} / {detail.total_marks}
              </div>
              {detail.attempt?.overall_feedback && (
                <p className="text-gray-700 mt-3">{detail.attempt.overall_feedback}</p>
              )}
            </div>

            {detail.questions.map((question) => (
              <div key={question.question_index} className="rounded-xl border border-gray-200 p-5">
                <div className="font-semibold text-gray-900 mb-3">
                  {question.question_index + 1}. {question.question}
                </div>
                <div className="space-y-2 text-sm text-gray-700">
                  <p>Your answer: <span className="font-medium text-gray-900">{question.selected_option || 'No answer'}</span></p>
                  <p>AI graded answer: <span className="font-medium text-gray-900">{question.correct_option || 'N/A'}</span></p>
                  <p>Score: <span className="font-medium text-gray-900">{question.final_points_awarded ?? 0}</span></p>
                  {question.final_feedback && <p>Feedback: {question.final_feedback}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
