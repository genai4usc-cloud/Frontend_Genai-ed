'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getBackendBase } from '@/lib/backend';
import { Profile, supabase } from '@/lib/supabase';
import { AlertTriangle, CheckCircle2, Clock, FileCheck, Loader2, Monitor } from 'lucide-react';

const backendBase = getBackendBase();

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
  policy_notice: string | null;
  attempt: {
    id: string;
    status: string;
    started_at: string;
    submitted_at: string | null;
    expires_at: string;
    integrity?: {
      refresh_count: number;
      integrity_warning_count: number;
      integrity_violation_count: number;
      fullscreen_exit_warning_count: number;
      policy_auto_submit_reason: string | null;
      policy_notice: string | null;
      last_policy_event_at: string | null;
    } | null;
    final_score?: number;
    overall_feedback?: string | null;
  } | null;
  questions: OnlineQuizQuestion[];
}

type EmbeddedOnlineQuizProps = {
  courseId: string;
  quizBatchId: string;
  onProgressChange?: (state: { opened: boolean; completed: boolean }) => void;
};

export default function EmbeddedOnlineQuiz({
  courseId,
  quizBatchId,
  onProgressChange,
}: EmbeddedOnlineQuizProps) {
  void courseId;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [detail, setDetail] = useState<OnlineQuizDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [savingQuestionIndex, setSavingQuestionIndex] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [policyMessage, setPolicyMessage] = useState<string | null>(null);
  const [integrityError, setIntegrityError] = useState<string | null>(null);
  const [isFullscreenReady, setIsFullscreenReady] = useState(false);
  const [needsFullscreenResume, setNeedsFullscreenResume] = useState(false);
  const [policyDismissed, setPolicyDismissed] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const pendingIntegrityEventRef = useRef<string | null>(null);
  const reloadHandledForAttemptRef = useRef<string | null>(null);
  const ignoreIntegrityUntilRef = useRef<number>(0);

  const isQuizInProgress = detail?.status === 'in_progress' && !!detail?.attempt;

  useEffect(() => {
    void loadPage();
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

  useEffect(() => {
    const syncFullscreenState = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreenReady(active);
      if (isQuizInProgress && !active) {
        setNeedsFullscreenResume(true);
      }
    };

    syncFullscreenState();
    document.addEventListener('fullscreenchange', syncFullscreenState);
    return () => document.removeEventListener('fullscreenchange', syncFullscreenState);
  }, [isQuizInProgress]);

  useEffect(() => {
    if (!detail) return;
    onProgressChange?.({
      opened: Boolean(detail.attempt),
      completed: Boolean(detail.attempt),
    });
  }, [detail?.attempt?.id, detail?.status, onProgressChange]);

  useEffect(() => {
    if (!isQuizInProgress || !profile) return;

    const shouldIgnoreIntegrityEvent = () => Date.now() < ignoreIntegrityUntilRef.current;

    const handleVisibilityChange = () => {
      if (shouldIgnoreIntegrityEvent()) return;
      if (document.visibilityState === 'hidden') {
        pendingIntegrityEventRef.current = 'tab_switch';
      }
    };

    const handleWindowBlur = () => {
      if (shouldIgnoreIntegrityEvent()) return;
      pendingIntegrityEventRef.current = 'window_blur';
    };

    const handleWindowFocus = () => {
      void handlePendingIntegrityEvent();
    };

    const handleFullscreenChange = () => {
      if (shouldIgnoreIntegrityEvent()) {
        const fullscreenActive = !!document.fullscreenElement;
        setIsFullscreenReady(fullscreenActive);
        if (fullscreenActive) {
          setNeedsFullscreenResume(false);
        }
        return;
      }

      const fullscreenActive = !!document.fullscreenElement;
      if (fullscreenActive) {
        setIsFullscreenReady(true);
        setNeedsFullscreenResume(false);
        return;
      }

      setIsFullscreenReady(false);
      if (!isQuizInProgress || submitting) return;

      if (document.visibilityState === 'visible' && document.hasFocus()) {
        pendingIntegrityEventRef.current = 'fullscreen_exit';
        setNeedsFullscreenResume(true);
        void handlePendingIntegrityEvent();
      } else {
        pendingIntegrityEventRef.current = 'tab_switch';
        setNeedsFullscreenResume(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isQuizInProgress, profile?.id, submitting]);

  useEffect(() => {
    if (!isQuizInProgress || !profile || !detail?.attempt?.id) return;

    const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    const isReload = navigationEntries.some((entry) => entry.type === 'reload');
    if (!isReload || reloadHandledForAttemptRef.current === detail.attempt.id) {
      return;
    }

    reloadHandledForAttemptRef.current = detail.attempt.id;
    setNeedsFullscreenResume(true);
    void registerRefreshAttempt();
  }, [isQuizInProgress, profile?.id, detail?.attempt?.id]);

  const formattedRemaining = useMemo(() => {
    if (remainingSeconds === null) return null;
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [remainingSeconds]);

  const enterFullscreen = async () => {
    if (typeof document === 'undefined') return false;
    if (document.fullscreenElement) return true;

    ignoreIntegrityUntilRef.current = Date.now() + 2000;

    try {
      if (containerRef.current?.requestFullscreen) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
      setIsFullscreenReady(true);
      setNeedsFullscreenResume(false);
      setIntegrityError(null);
      pendingIntegrityEventRef.current = null;
      return true;
    } catch (error) {
      console.error('Failed to enter fullscreen:', error);
      setIntegrityError('Fullscreen is required to continue this quiz.');
      return false;
    }
  };

  const loadPage = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setIntegrityError('Please sign in again to continue.');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!profileData || profileData.role !== 'student') {
        setIntegrityError('Student access is required to view this quiz.');
        return;
      }

      setProfile(profileData);
      await fetchDetail(user.id);
    } catch (error) {
      console.error('Error loading online quiz:', error);
      setIntegrityError('Unable to load the quiz right now.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (studentId: string) => {
    if (!backendBase) return;
    const response = await fetch(`${backendBase}/api/student/quiz/online/${quizBatchId}?studentId=${studentId}`);
    if (!response.ok) {
      throw new Error(await response.text());
    }

    const payload = (await response.json()) as OnlineQuizDetail;
    setDetail(payload);
    setPolicyMessage(payload.policy_notice || payload.attempt?.integrity?.policy_notice || null);
  };

  const registerRefreshAttempt = async () => {
    if (!profile || !backendBase) return;
    try {
      const response = await fetch(`${backendBase}/api/student/quiz/online/register-refresh`, {
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
      setDetail(payload.detail as OnlineQuizDetail);
      if (payload.message) {
        setPolicyMessage(payload.message);
      }
    } catch (error) {
      console.error('Error registering quiz refresh:', error);
      setIntegrityError('Unable to validate the refresh policy right now.');
    }
  };

  const handlePendingIntegrityEvent = async () => {
    const eventType = pendingIntegrityEventRef.current;
    if (!eventType || !profile || !backendBase || !isQuizInProgress) return;

    pendingIntegrityEventRef.current = null;

    try {
      const response = await fetch(`${backendBase}/api/student/quiz/online/report-integrity-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizBatchId,
          studentId: profile.id,
          eventType,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const payload = await response.json();
      setDetail(payload.detail as OnlineQuizDetail);
      setNeedsFullscreenResume(Boolean(payload.require_fullscreen) && !document.fullscreenElement);

      if (payload.message) {
        setPolicyMessage(payload.message);
        setPolicyDismissed(false);
      }
    } catch (error) {
      console.error('Error reporting integrity event:', error);
      setIntegrityError('Unable to validate quiz policy state right now.');
    }
  };

  const startQuiz = async () => {
    if (!profile || !backendBase) return;

    const fullscreenEntered = await enterFullscreen();
    if (!fullscreenEntered) {
      window.alert('You must enter fullscreen mode before starting the quiz.');
      return;
    }

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

      const payload = (await response.json()) as OnlineQuizDetail;
      ignoreIntegrityUntilRef.current = Date.now() + 2000;
      pendingIntegrityEventRef.current = null;
      setDetail(payload);
      setNeedsFullscreenResume(false);
      setPolicyMessage(payload.policy_notice || payload.attempt?.integrity?.policy_notice || null);
      setPolicyDismissed(false);
    } catch (error) {
      console.error('Error starting online quiz:', error);
      window.alert('Failed to start the quiz.');
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
      window.alert('Failed to save the answer.');
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

      const payload = (await response.json()) as OnlineQuizDetail;
      setDetail(payload);
      setNeedsFullscreenResume(false);
      setPolicyMessage(payload.policy_notice || payload.attempt?.integrity?.policy_notice || null);
      if (!silent) {
        window.alert('Quiz submitted successfully.');
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
      if (!silent) {
        window.alert('Failed to submit the quiz.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[320px] grid place-items-center rounded-2xl border border-gray-200 bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-brand-maroon" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-600">
        Unable to load the quiz in Socratic right now.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative max-h-[85vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white [&:fullscreen]:h-screen [&:fullscreen]:max-h-screen [&:fullscreen]:rounded-none"
    >
      <div className="border-b border-gray-200 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">{detail.quiz_name}</h3>
            <p className="mt-2 text-gray-600">
              {detail.course_number} - {detail.course_title}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Instructor: {detail.instructor_name}
            </p>
          </div>

          {detail.status === 'in_progress' && formattedRemaining && (
            <div className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-orange-800">
              <Clock className="h-4 w-4" />
              Time Remaining: {formattedRemaining}
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-gray-50 p-4">
            <div className="mb-1 text-sm text-gray-500">Questions</div>
            <div className="text-2xl font-semibold text-gray-900">{detail.question_count}</div>
          </div>
          <div className="rounded-xl bg-gray-50 p-4">
            <div className="mb-1 text-sm text-gray-500">Marks</div>
            <div className="text-2xl font-semibold text-gray-900">{detail.total_marks}</div>
          </div>
          <div className="rounded-xl bg-gray-50 p-4">
            <div className="mb-1 text-sm text-gray-500">Time Limit</div>
            <div className="text-2xl font-semibold text-gray-900">{detail.time_limit_minutes} min</div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-gray-200 p-5">
          <div className="space-y-2 text-sm text-gray-700">
            <p>
              Status: <span className="font-medium capitalize text-gray-900">{detail.status.replace('_', ' ')}</span>
            </p>
            {detail.available_at && <p>Available From: {new Date(detail.available_at).toLocaleString()}</p>}
            {detail.due_at && <p>Due Date: {new Date(detail.due_at).toLocaleString()}</p>}
            {detail.attempt?.integrity && (
              <>
                <p>
                  Refreshes Used: <span className="font-medium text-gray-900">{detail.attempt.integrity.refresh_count}/3</span>
                </p>
                <p>
                  Policy Warnings: <span className="font-medium text-gray-900">{detail.attempt.integrity.integrity_warning_count}</span>
                </p>
                <p>
                  Policy Violations: <span className="font-medium text-gray-900">{detail.attempt.integrity.integrity_violation_count}</span>
                </p>
                <p>
                  Esc Warnings: <span className="font-medium text-gray-900">{detail.attempt.integrity.fullscreen_exit_warning_count}</span>
                </p>
              </>
            )}
          </div>

          {policyMessage && !policyDismissed && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                  <span>{policyMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPolicyDismissed(true)}
                  className="text-sm font-medium text-red-800 hover:text-red-900"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {integrityError && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
              {integrityError}
            </div>
          )}

          {detail.status === 'upcoming' && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
              This quiz is scheduled but not available yet.
            </div>
          )}

          {detail.status === 'available' && (
            <div className="mt-4">
              <p className="mb-4 text-gray-600">
                This quiz allows one attempt only. Enter fullscreen first, then start the quiz. After the quiz starts,
                the timer will continue even if you refresh the page.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void enterFullscreen()}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-900 hover:bg-gray-50"
                >
                  <Monitor className="h-4 w-4" />
                  {isFullscreenReady ? 'Fullscreen Ready' : 'Enter Fullscreen'}
                </button>
                <button
                  type="button"
                  onClick={startQuiz}
                  disabled={starting || !isFullscreenReady}
                  className="rounded-lg bg-brand-maroon px-6 py-3 font-medium text-white hover:bg-brand-maroon-hover disabled:opacity-50"
                >
                  {starting ? 'Starting...' : 'Start Quiz'}
                </button>
              </div>
            </div>
          )}

          {detail.status === 'submitted' && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-blue-800">
              <CheckCircle2 className="h-4 w-4" />
              {detail.policy_notice || 'Submitted. Grades will appear after your educator publishes them.'}
            </div>
          )}

          {detail.status === 'closed' && (
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-gray-700">
              This quiz is closed.
            </div>
          )}
        </div>
      </div>

      {detail.status === 'in_progress' && (
        <div className="relative space-y-8 p-6">
          {needsFullscreenResume && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/95 p-6 backdrop-blur-sm">
              <div className="max-w-lg space-y-4 rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                  <Monitor className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Return to Fullscreen</h2>
                  <p className="mt-2 text-sm text-gray-700">
                    You must stay in fullscreen mode while this quiz is in progress. Re-enter fullscreen to continue.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void enterFullscreen()}
                  className="rounded-lg bg-brand-maroon px-5 py-2.5 font-medium text-white hover:bg-brand-maroon-hover"
                >
                  Re-enter Fullscreen
                </button>
              </div>
            </div>
          )}

          {detail.questions.map((question) => (
            <div key={question.question_index} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
              <div className="mb-4 font-semibold text-gray-900">
                {question.question_index + 1}. {question.question}
              </div>
              <div className="space-y-3">
                {Object.entries(question.options || {}).map(([optionKey, optionValue]) => (
                  <label
                    key={optionKey}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
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
                <div className="mt-3 text-sm text-gray-500">Saving answer...</div>
              )}
            </div>
          ))}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => submitQuiz()}
              disabled={submitting}
              className="rounded-lg bg-brand-maroon px-6 py-3 font-medium text-white hover:bg-brand-maroon-hover disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Quiz'}
            </button>
          </div>
        </div>
      )}

      {detail.status === 'grades_released' && (
        <div className="space-y-6 p-6">
          <div className="rounded-xl border border-green-200 bg-green-50 p-5">
            <div className="mb-2 flex items-center gap-2 font-medium text-green-800">
              <FileCheck className="h-5 w-5" />
              Grades Released
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {detail.attempt?.final_score ?? 0} / {detail.total_marks}
            </div>
            {detail.attempt?.overall_feedback && (
              <p className="mt-3 text-gray-700">{detail.attempt.overall_feedback}</p>
            )}
          </div>

          {detail.questions.map((question) => (
            <div key={question.question_index} className="rounded-xl border border-gray-200 p-5">
              <div className="mb-3 font-semibold text-gray-900">
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
  );
}
