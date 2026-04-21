'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Clock3, Download, FileCheck, FileText, MessageSquareText, NotebookPen, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  buildPdfHtml,
  createDefaultStudioBlueprint,
  createInitialReviewState,
  createInitialStudioSession,
  createResourceProgressMap,
  getStageBadgeClasses,
  loadReviewState,
  loadStudioBlueprint,
  loadStudioSession,
  recomputeStageStatuses,
  saveReviewState,
  saveStudioBlueprint,
  SOCRATIC_STAGE_ORDER,
  SocraticReviewState,
  SocraticStudioBlueprint,
  SocraticStudioSession,
} from '@/lib/socraticWriting';

type ReviewSeed = {
  assignmentId: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  assignmentTitle: string;
  assignmentBrief: string;
  dueAt: string;
  studentId: string;
  studentName: string;
};

type SocraticStudioReviewProps = {
  seed: ReviewSeed;
  onBack: () => void;
};

export default function SocraticStudioReview({ seed, onBack }: SocraticStudioReviewProps) {
  const [blueprint, setBlueprint] = useState<SocraticStudioBlueprint | null>(null);
  const [session, setSession] = useState<SocraticStudioSession | null>(null);
  const [reviewState, setReviewState] = useState<SocraticReviewState>(createInitialReviewState());

  useEffect(() => {
    const existingBlueprint = loadStudioBlueprint(seed.assignmentId);
    const nextBlueprint = existingBlueprint || createDefaultStudioBlueprint({
      assignmentId: seed.assignmentId,
      courseId: seed.courseId,
      courseCode: seed.courseCode,
      courseTitle: seed.courseTitle,
      assignmentTitle: seed.assignmentTitle,
      assignmentBrief: seed.assignmentBrief,
      dueAt: seed.dueAt,
    });
    saveStudioBlueprint(seed.assignmentId, nextBlueprint);
    setBlueprint(nextBlueprint);

    const existingSession = loadStudioSession(seed.assignmentId, seed.studentId);
    const nextSession = recomputeStageStatuses(
      existingSession || {
        ...createInitialStudioSession(),
        resourceProgress: createResourceProgressMap(nextBlueprint.resources),
      },
      nextBlueprint,
    );
    setSession(nextSession);
    setReviewState(loadReviewState(seed.assignmentId) || createInitialReviewState());
  }, [seed]);

  const completedStages = useMemo(() => {
    if (!session) return 0;
    return SOCRATIC_STAGE_ORDER.filter((stage) => session.stageStatuses[stage] === 'completed').length;
  }, [session]);

  const handleSaveReview = () => {
    saveReviewState(seed.assignmentId, {
      ...reviewState,
      gradedAt: new Date().toISOString(),
    });
    setReviewState((current) => ({
      ...current,
      gradedAt: new Date().toISOString(),
    }));
    toast.success('Mock review saved locally for the Socratic Writing prototype.');
  };

  const handleExportEssay = () => {
    if (!blueprint || !session) return;
    const exportWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!exportWindow) return;
    exportWindow.document.open();
    exportWindow.document.write(buildPdfHtml(blueprint, session));
    exportWindow.document.close();
    exportWindow.focus();
    exportWindow.print();
  };

  if (!blueprint || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading studio review...</div>
      </div>
    );
  }

  return (
    <div className="max-w-[1500px] mx-auto space-y-6">
      <div className="rounded-3xl border border-gray-200 bg-white px-8 py-7 shadow-sm">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-5"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Assignment
        </button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-brand-maroon mb-2">{blueprint.courseCode} · Socratic review</p>
            <h1 className="text-4xl font-bold text-gray-950">{blueprint.assignmentTitle}</h1>
            <p className="text-gray-600 mt-3">Reviewing {seed.studentName}’s final essay, notebook, ledger, and attached resources.</p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 min-w-[240px]">
            <div className="text-sm font-medium text-blue-700">Submission status</div>
            <div className="text-lg font-semibold text-blue-900">{session.submittedAt ? 'Submitted' : 'In progress'}</div>
            <div className="text-sm text-blue-700 mt-1">{completedStages}/4 stages completed</div>
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1fr_340px] gap-6 items-start">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-5">
          <Tabs defaultValue="essay" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="essay">Essay</TabsTrigger>
              <TabsTrigger value="notes">Notebook</TabsTrigger>
              <TabsTrigger value="ledger">Ledger</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
            </TabsList>

            <TabsContent value="essay" className="mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-950">Final Essay</h2>
                    <p className="text-sm text-gray-600">Stored as editor HTML plus mock JSON in the frontend prototype.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportEssay}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Download className="w-4 h-4" />
                    Export PDF
                  </button>
                </div>
                <div
                  className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-5 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: session.essayHtml }}
                />
              </div>
            </TabsContent>

            <TabsContent value="notes" className="mt-4">
              <div className="space-y-3">
                {session.notes.map((note) => (
                  <div key={note.id} className="rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-medium ${getStageBadgeClasses(note.stage)}`}>
                        {blueprint.stages[note.stage].label}
                      </span>
                      <span className="text-xs text-gray-500">{new Date(note.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.content}</p>
                  </div>
                ))}
                {session.notes.length === 0 && (
                  <div className="rounded-xl border border-dashed border-gray-300 p-6 text-sm text-gray-500 text-center">
                    No notebook entries yet.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="ledger" className="mt-4">
              <div className="space-y-3">
                {session.ledger.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-medium ${getStageBadgeClasses(entry.stage)}`}>
                        {blueprint.stages[entry.stage].label}
                      </span>
                      <span className="text-xs text-gray-500">{new Date(entry.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">{entry.actor}</div>
                    <div className="font-medium text-gray-900">{entry.title}</div>
                    <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{entry.content}</p>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="resources" className="mt-4">
              <div className="space-y-3">
                {blueprint.resources.map((resource) => {
                  const progress = session.resourceProgress[resource.id];
                  const complete = resource.type === 'reading'
                    ? Boolean(progress?.opened && (progress?.manuallyReviewed || session.notes.some((note) => note.stage === 'research')))
                    : Boolean(progress?.completed);
                  return (
                    <div key={resource.id} className="rounded-2xl border border-gray-200 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{resource.type.replace('_', ' ')}</p>
                          <h3 className="text-lg font-semibold text-gray-900">{resource.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{resource.summary}</p>
                        </div>
                        <div className="text-right">
                          {resource.required && (
                            <div className="rounded-full bg-yellow-100 px-2 py-1 text-[11px] font-medium text-yellow-800 mb-2">
                              Required
                            </div>
                          )}
                          <div className={`text-sm font-semibold ${complete ? 'text-green-600' : 'text-gray-500'}`}>
                            {complete ? 'Completed' : 'Pending'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <aside className="rounded-2xl border border-gray-200 bg-white p-6 space-y-5 xl:sticky xl:top-8">
          <div>
            <h2 className="text-xl font-semibold text-gray-950">Review & Grade</h2>
            <p className="text-sm text-gray-600 mt-1">V1 review target: final essay, notebook, ledger, attached resources, score, and feedback.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                <FileCheck className="w-4 h-4" />
                Submission
              </div>
              <div className="text-lg font-semibold text-gray-900">{session.submittedAt ? 'Submitted' : 'Draft'}</div>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                <Clock3 className="w-4 h-4" />
                Due
              </div>
              <div className="text-sm font-semibold text-gray-900">{new Date(blueprint.dueAt).toLocaleString()}</div>
            </div>
          </div>

          <div className="space-y-3">
            {SOCRATIC_STAGE_ORDER.map((stage) => (
              <div key={stage} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                <div className="inline-flex items-center gap-2 text-sm font-medium text-gray-900">
                  {stage === 'clarify' && <MessageSquareText className="w-4 h-4 text-brand-maroon" />}
                  {stage === 'research' && <BookOpen className="w-4 h-4 text-brand-maroon" />}
                  {stage === 'build' && <FileText className="w-4 h-4 text-brand-maroon" />}
                  {stage === 'write' && <NotebookPen className="w-4 h-4 text-brand-maroon" />}
                  {blueprint.stages[stage].label}
                </div>
                <span className="text-sm font-semibold capitalize text-gray-600">
                  {session.stageStatuses[stage].replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Score</label>
            <Input
              value={reviewState.score}
              onChange={(event) => setReviewState((current) => ({ ...current, score: event.target.value }))}
              placeholder={`Out of ${blueprint.pointsPossible}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Feedback</label>
            <Textarea
              rows={7}
              value={reviewState.feedback}
              onChange={(event) => setReviewState((current) => ({ ...current, feedback: event.target.value }))}
              placeholder="Summarize the student’s thinking, note where the argument is strong, and identify the next revision target."
            />
          </div>
          <button
            type="button"
            onClick={handleSaveReview}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-brand-maroon px-4 py-3 text-sm font-semibold text-white hover:bg-brand-maroon-hover"
          >
            <Save className="w-4 h-4" />
            Save Review
          </button>
          {reviewState.gradedAt && (
            <div className="text-xs text-gray-500">
              Last saved {new Date(reviewState.gradedAt).toLocaleString()}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
