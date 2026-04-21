'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock3,
  FlaskConical,
  MessageSquareText,
  NotebookPen,
  Plus,
  Send,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import SocraticRichTextEditor from '@/components/socratic-writing/SocraticRichTextEditor';
import {
  buildPdfHtml,
  createStudioLedgerEntry,
  createStudioNote,
  createDefaultStudioBlueprint,
  createInitialStudioSession,
  createResourceProgressMap,
  getMockCoachReply,
  getRecommendedStage,
  getStageBadgeClasses,
  isStageUnlocked,
  loadStudioBlueprint,
  loadStudioSession,
  recomputeStageStatuses,
  saveStudioBlueprint,
  saveStudioSession,
  SOCRATIC_STAGE_ORDER,
  SocraticResource,
  SocraticStageKey,
  SocraticStudioBlueprint,
  SocraticStudioSession,
} from '@/lib/socraticWriting';

type StudentSeed = {
  assignmentId: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  assignmentTitle: string;
  assignmentBrief: string;
  dueAt: string;
  pointsPossible: number;
};

type SocraticStudioWorkspaceProps = {
  studentId: string;
  seed: StudentSeed;
  onBack: () => void;
};

const stageIcons = {
  clarify: MessageSquareText,
  research: BookOpen,
  build: FlaskConical,
  write: NotebookPen,
} satisfies Record<SocraticStageKey, typeof MessageSquareText>;

export default function SocraticStudioWorkspace({
  studentId,
  seed,
  onBack,
}: SocraticStudioWorkspaceProps) {
  const [blueprint, setBlueprint] = useState<SocraticStudioBlueprint | null>(null);
  const [session, setSession] = useState<SocraticStudioSession | null>(null);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [newNoteDraft, setNewNoteDraft] = useState('');
  const [newSourceTitle, setNewSourceTitle] = useState('');
  const [newSourceSummary, setNewSourceSummary] = useState('');

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
      pointsPossible: seed.pointsPossible,
    });

    saveStudioBlueprint(seed.assignmentId, nextBlueprint);
    setBlueprint(nextBlueprint);

    const existingSession = loadStudioSession(seed.assignmentId, studentId);
    const nextSession = recomputeStageStatuses(
      existingSession || {
        ...createInitialStudioSession(),
        resourceProgress: createResourceProgressMap(nextBlueprint.resources),
      },
      nextBlueprint,
    );
    setSelectedResourceId(nextBlueprint.resources[0]?.id || null);
    setSession(nextSession);
  }, [seed, studentId]);

  useEffect(() => {
    if (!blueprint || !session) return;
    saveStudioBlueprint(seed.assignmentId, blueprint);
    saveStudioSession(seed.assignmentId, studentId, session);
  }, [blueprint, seed.assignmentId, session, studentId]);

  const selectedStage = session?.activeStage || 'clarify';
  const recommendedStage = session ? getRecommendedStage(session) : 'clarify';

  const setStage = (stage: SocraticStageKey) => {
    if (!session || !blueprint) return;
    if (!isStageUnlocked(stage, session, blueprint)) return;
    setSession({
      ...session,
      activeStage: stage,
    });
  };

  const stageSummary = useMemo(() => {
    if (!blueprint || !session) return null;
    return {
      stageConfig: blueprint.stages[selectedStage],
      readOnly: new Date(blueprint.dueAt).getTime() < Date.now(),
    };
  }, [blueprint, selectedStage, session]);

  const updateSession = (updater: (current: SocraticStudioSession) => SocraticStudioSession) => {
    setSession((current) => {
      if (!current || !blueprint) return current;
      return recomputeStageStatuses(updater(current), blueprint);
    });
  };

  const selectedResource = useMemo(
    () => blueprint?.resources.find((resource) => resource.id === selectedResourceId) || null,
    [blueprint, selectedResourceId],
  );

  const getCoachDraft = () => {
    if (!session) return '';
    if (selectedStage === 'clarify') return session.clarifyDraft;
    if (selectedStage === 'research') return session.researchCoachDraft;
    if (selectedStage === 'build') return session.buildCoachDraft;
    return session.writeCoachDraft;
  };

  const setCoachDraft = (value: string) => {
    updateSession((current) => {
      if (current.activeStage === 'clarify') return { ...current, clarifyDraft: value };
      if (current.activeStage === 'research') return { ...current, researchCoachDraft: value };
      if (current.activeStage === 'build') return { ...current, buildCoachDraft: value };
      return { ...current, writeCoachDraft: value };
    });
  };

  const handleAddNote = () => {
    if (!newNoteDraft.trim()) return;
    updateSession((current) => ({
      ...current,
      notes: [...current.notes, createStudioNote(current.activeStage, newNoteDraft.trim())],
      ledger: [
        ...current.ledger,
        createStudioLedgerEntry(current.activeStage, 'system', 'Note added', `Added a note in ${blueprint?.stages[current.activeStage].label}.`),
      ],
    }));
    setNewNoteDraft('');
  };

  const handleCoachMessage = () => {
    if (!blueprint || !session) return;
    const draft = getCoachDraft().trim();
    if (!draft) return;
    if (!blueprint.stages[selectedStage].aiAllowed) {
      toast.error(`AI coach is disabled for ${blueprint.stages[selectedStage].label}.`);
      return;
    }

    const reply = getMockCoachReply(selectedStage, draft, blueprint, session);
    updateSession((current) => {
      const clearDraft = current.activeStage === 'clarify'
        ? { clarifyDraft: '' }
        : current.activeStage === 'research'
        ? { researchCoachDraft: '' }
        : current.activeStage === 'build'
        ? { buildCoachDraft: '' }
        : { writeCoachDraft: '' };

      return {
        ...current,
        ...clearDraft,
        ledger: [
          ...current.ledger,
          createStudioLedgerEntry(current.activeStage, 'student', 'Student prompt', draft),
          createStudioLedgerEntry(current.activeStage, 'ai', 'AI coach', reply),
        ],
      };
    });
  };

  const handleResourceProgress = (resource: SocraticResource, action: 'open' | 'complete' | 'review') => {
    updateSession((current) => {
      const existingProgress = current.resourceProgress[resource.id] || {
        resourceId: resource.id,
        opened: false,
        completed: false,
        manuallyReviewed: false,
      };

      return {
        ...current,
        resourceProgress: {
          ...current.resourceProgress,
          [resource.id]: {
            ...existingProgress,
            opened: action === 'open' ? true : existingProgress.opened,
            completed: action === 'complete' ? true : existingProgress.completed,
            manuallyReviewed: action === 'review' ? true : existingProgress.manuallyReviewed,
          },
        },
        ledger: [
          ...current.ledger,
          createStudioLedgerEntry('research', 'system', 'Resource updated', `${resource.title}: ${action}`),
        ],
      };
    });
  };

  const runBuildTool = (tool: 'thesis' | 'structure' | 'stress') => {
    updateSession((current) => {
      const nextArtifacts = { ...current.buildArtifacts };

      if (tool === 'thesis') {
        nextArtifacts.thesisOptions = [
          'Claim one precise relationship instead of explaining the whole topic.',
          'Define the contested term before stating the thesis.',
          'Build the essay around one objection that your thesis can survive.',
        ];
      } else if (tool === 'structure') {
        nextArtifacts.structurePlan = [
          'Clarify the term and narrow the debate.',
          'State the working thesis and explain the standard of judgment.',
          'Develop two body moves with evidence.',
          'Address one objection and show why the thesis still holds.',
        ];
      } else {
        nextArtifacts.stressTestQuestions = [
          'What would a skeptical reader say your strongest evidence does not prove?',
          'Where is the thesis still broader than the evidence supports?',
          'What happens if the key objection is partly true?',
        ];
      }

      return {
        ...current,
        buildArtifacts: nextArtifacts,
        ledger: [
          ...current.ledger,
          createStudioLedgerEntry('build', 'system', 'Build tool run', tool),
        ],
      };
    });
  };

  const handleEssayChange = (nextHtml: string) => {
    updateSession((current) => ({
      ...current,
      essayHtml: nextHtml,
      essayJson: JSON.stringify({ type: 'doc', version: 1, html: nextHtml }),
    }));
  };

  const handleInsertNote = (noteContent: string) => {
    if (selectedStage !== 'write') return;
    handleEssayChange(`${session?.essayHtml || ''}<p>${noteContent}</p>`);
  };

  const addAdditionalSource = () => {
    if (!blueprint || !newSourceTitle.trim()) return;

    const nextResource: SocraticResource = {
      id: `source-${Math.random().toString(36).slice(2, 8)}`,
      type: 'source',
      title: newSourceTitle.trim(),
      summary: newSourceSummary.trim() || 'Student-added source captured during research.',
      required: false,
      createdFrom: 'new',
    };

    setBlueprint({
      ...blueprint,
      resources: [...blueprint.resources, nextResource],
    });
    updateSession((current) => ({
      ...current,
      resourceProgress: {
        ...current.resourceProgress,
        [nextResource.id]: {
          resourceId: nextResource.id,
          opened: true,
          completed: false,
          manuallyReviewed: false,
        },
      },
      ledger: [
        ...current.ledger,
        createStudioLedgerEntry('research', 'system', 'Additional source added', nextResource.title),
      ],
    }));
    setSelectedResourceId(nextResource.id);
    setNewSourceTitle('');
    setNewSourceSummary('');
  };

  const handleExportPdf = () => {
    if (!blueprint || !session) return;
    const exportWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!exportWindow) return;
    exportWindow.document.open();
    exportWindow.document.write(buildPdfHtml(blueprint, session));
    exportWindow.document.close();
    exportWindow.focus();
    exportWindow.print();
  };

  const handleSubmit = () => {
    updateSession((current) => ({
      ...current,
      submittedAt: new Date().toISOString(),
      ledger: [
        ...current.ledger,
        createStudioLedgerEntry('write', 'system', 'Assignment submitted', 'Submitted final essay, notebook, and ledger package.'),
      ],
    }));
    toast.success('Studio submission saved in the frontend prototype.');
  };

  if (!blueprint || !session || !stageSummary) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading Socratic Writing Studio...</div>
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
            <p className="text-sm font-medium text-brand-maroon mb-2">
              {blueprint.courseCode} · Coaching: Claude
            </p>
            <h1 className="text-4xl font-bold text-gray-950">{blueprint.assignmentTitle}</h1>
            <p className="text-gray-600 mt-3 max-w-3xl">{blueprint.assignmentBrief}</p>
          </div>
          <div className="rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4 min-w-[220px]">
            <div className="text-sm font-medium text-orange-700">Due</div>
            <div className="text-lg font-semibold text-orange-900">{new Date(blueprint.dueAt).toLocaleString()}</div>
            <div className="text-sm text-orange-700 mt-1">{blueprint.wordCount} words · {blueprint.pointsPossible} points</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-blue-900">
        <span className="font-semibold">Recommended:</span> {blueprint.stages[recommendedStage].label}
        {' '}— {blueprint.stages[recommendedStage].description}
      </div>

      <div className="grid xl:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex flex-wrap gap-3">
              {SOCRATIC_STAGE_ORDER.map((stage) => {
                const Icon = stageIcons[stage];
                const unlocked = isStageUnlocked(stage, session, blueprint);
                const active = selectedStage === stage;
                const status = session.stageStatuses[stage];

                return (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => setStage(stage)}
                    disabled={!unlocked}
                    className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-base font-medium transition-colors ${
                      active
                        ? 'bg-brand-maroon text-white'
                        : unlocked
                        ? 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                        : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {blueprint.stages[stage].label}
                    {status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4 opacity-60" />}
                  </button>
                );
              })}
            </div>
            <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-900">
              <span className="font-semibold">Mode:</span> {stageSummary.stageConfig.label} — {stageSummary.stageConfig.description}
            </div>
          </div>

          <WorkspaceStageContent
            blueprint={blueprint}
            getCoachDraft={getCoachDraft}
            handleCoachMessage={handleCoachMessage}
            handleEssayChange={handleEssayChange}
            handleExportPdf={handleExportPdf}
            handleInsertNote={handleInsertNote}
            handleResourceProgress={handleResourceProgress}
            handleSubmit={handleSubmit}
            readOnly={stageSummary.readOnly}
            runBuildTool={runBuildTool}
            session={session}
            setCoachDraft={setCoachDraft}
            setSelectedResourceId={setSelectedResourceId}
            selectedStage={selectedStage}
            selectedResource={selectedResource}
          />
        </div>

        <WorkspaceSidebar
          addAdditionalSource={addAdditionalSource}
          blueprint={blueprint}
          handleAddNote={handleAddNote}
          newNoteDraft={newNoteDraft}
          newSourceSummary={newSourceSummary}
          newSourceTitle={newSourceTitle}
          readOnly={stageSummary.readOnly}
          session={session}
          selectedStage={selectedStage}
          setNewNoteDraft={setNewNoteDraft}
          setNewSourceSummary={setNewSourceSummary}
          setNewSourceTitle={setNewSourceTitle}
          handleInsertNote={handleInsertNote}
        />
      </div>
    </div>
  );
}

type WorkspaceStageContentProps = {
  blueprint: SocraticStudioBlueprint;
  session: SocraticStudioSession;
  selectedStage: SocraticStageKey;
  readOnly: boolean;
  selectedResource: SocraticResource | null;
  setSelectedResourceId: (id: string) => void;
  getCoachDraft: () => string;
  setCoachDraft: (value: string) => void;
  handleCoachMessage: () => void;
  handleResourceProgress: (resource: SocraticResource, action: 'open' | 'complete' | 'review') => void;
  runBuildTool: (tool: 'thesis' | 'structure' | 'stress') => void;
  handleEssayChange: (nextHtml: string) => void;
  handleExportPdf: () => void;
  handleSubmit: () => void;
  handleInsertNote: (noteContent: string) => void;
};

type WorkspaceSidebarProps = {
  blueprint: SocraticStudioBlueprint;
  session: SocraticStudioSession;
  readOnly: boolean;
  selectedStage: SocraticStageKey;
  newNoteDraft: string;
  setNewNoteDraft: (value: string) => void;
  handleAddNote: () => void;
  newSourceTitle: string;
  setNewSourceTitle: (value: string) => void;
  newSourceSummary: string;
  setNewSourceSummary: (value: string) => void;
  addAdditionalSource: () => void;
  handleInsertNote: (noteContent: string) => void;
};

function WorkspaceStageContent({
  blueprint,
  session,
  selectedStage,
  readOnly,
  selectedResource,
  setSelectedResourceId,
  getCoachDraft,
  setCoachDraft,
  handleCoachMessage,
  handleResourceProgress,
  runBuildTool,
  handleEssayChange,
  handleExportPdf,
  handleSubmit,
}: WorkspaceStageContentProps) {
  const stageConfig = blueprint.stages[selectedStage];
  const stageConversation = session.ledger.filter((entry) => entry.stage === selectedStage);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-950">{stageConfig.label}</h2>
          <p className="text-sm text-gray-600 mt-1">{stageConfig.summary}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock3 className="w-4 h-4" />
          Status: <span className="font-semibold capitalize text-gray-900">{session.stageStatuses[selectedStage].replace('_', ' ')}</span>
        </div>
      </div>

      {selectedStage === 'clarify' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h3 className="text-lg font-semibold text-amber-900 mb-3">Your Move</h3>
          <div className="space-y-3">
            {stageConfig.starterQuestions.map((question, index) => (
              <button
                key={`${selectedStage}-starter-${index}`}
                type="button"
                onClick={() => setCoachDraft(question)}
                className="w-full text-left rounded-xl border border-amber-200 bg-white px-4 py-3 text-amber-950 hover:border-amber-300 transition-colors"
              >
                {index + 1}. {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedStage === 'research' && (
        <div className="grid lg:grid-cols-[320px_1fr] gap-5">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">Sources & Materials</h3>
            {blueprint.resources.map((resource) => {
              const progress = session.resourceProgress[resource.id];
              const completed = resource.type === 'reading'
                ? Boolean(progress?.opened && (progress?.manuallyReviewed || session.notes.some((note) => note.stage === 'research')))
                : Boolean(progress?.completed);

              return (
                <button
                  key={resource.id}
                  type="button"
                  onClick={() => setSelectedResourceId(resource.id)}
                  className={`w-full rounded-2xl border px-4 py-4 text-left transition-colors ${
                    selectedResource?.id === resource.id
                      ? 'border-brand-maroon bg-brand-maroon/5'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{resource.type.replace('_', ' ')}</span>
                    {resource.required && (
                      <span className="rounded-full bg-yellow-100 px-2 py-1 text-[11px] font-medium text-yellow-800">
                        Required
                      </span>
                    )}
                  </div>
                  <div className="font-semibold text-gray-900">{resource.title}</div>
                  <p className="text-sm text-gray-600 mt-1">{resource.summary}</p>
                  <div className="mt-3 text-xs font-medium text-gray-500">
                    {completed ? 'Completed' : progress?.opened ? 'In progress' : 'Not started'}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-gray-200 p-5 space-y-4">
            {selectedResource ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{selectedResource.type.replace('_', ' ')}</p>
                    <h3 className="text-xl font-semibold text-gray-900">{selectedResource.title}</h3>
                  </div>
                  {selectedResource.required && (
                    <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">
                      Required to unlock Build
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{selectedResource.summary}</p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleResourceProgress(selectedResource, 'open')}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Open Resource
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResourceProgress(selectedResource, 'complete')}
                    className="rounded-lg border border-brand-maroon px-4 py-2 text-sm font-medium text-brand-maroon hover:bg-brand-maroon hover:text-white"
                  >
                    Mark Completed
                  </button>
                  {selectedResource.type === 'reading' && (
                    <button
                      type="button"
                      onClick={() => handleResourceProgress(selectedResource, 'review')}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Mark Reviewed
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="min-h-[220px] grid place-items-center text-gray-500">
                Select a source to review.
              </div>
            )}
          </div>
        </div>
      )}

      {selectedStage === 'build' && (
        <div className="space-y-5">
          <div className="grid md:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => runBuildTool('thesis')}
              className="rounded-2xl border border-orange-200 bg-orange-50 p-5 text-left hover:border-orange-300 transition-colors"
            >
              <h3 className="text-lg font-semibold text-orange-900 mb-2">Generate Thesis</h3>
              <p className="text-sm text-orange-900/80">Create several thesis directions without writing the essay.</p>
            </button>
            <button
              type="button"
              onClick={() => runBuildTool('structure')}
              className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5 text-left hover:border-yellow-300 transition-colors"
            >
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">Structure Argument</h3>
              <p className="text-sm text-yellow-900/80">Map the 2–4 moves the essay needs and align evidence to each move.</p>
            </button>
            <button
              type="button"
              onClick={() => runBuildTool('stress')}
              className="rounded-2xl border border-red-200 bg-red-50 p-5 text-left hover:border-red-300 transition-colors"
            >
              <h3 className="text-lg font-semibold text-red-900 mb-2">Stress-Test</h3>
              <p className="text-sm text-red-900/80">Surface the strongest objections before the student starts drafting.</p>
            </button>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-gray-200 p-5">
              <h4 className="font-semibold text-gray-900 mb-3">Thesis Options</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                {session.buildArtifacts.thesisOptions.length > 0
                  ? session.buildArtifacts.thesisOptions.map((item, index) => (
                    <li key={`thesis-${index}`} className="rounded-lg bg-gray-50 px-3 py-2">{item}</li>
                  ))
                  : <li className="text-gray-500">Run “Generate Thesis” to seed options.</li>}
              </ul>
            </div>
            <div className="rounded-2xl border border-gray-200 p-5">
              <h4 className="font-semibold text-gray-900 mb-3">Argument Structure</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                {session.buildArtifacts.structurePlan.length > 0
                  ? session.buildArtifacts.structurePlan.map((item, index) => (
                    <li key={`structure-${index}`} className="rounded-lg bg-gray-50 px-3 py-2">{item}</li>
                  ))
                  : <li className="text-gray-500">Run “Structure Argument” to map the essay.</li>}
              </ul>
            </div>
            <div className="rounded-2xl border border-gray-200 p-5">
              <h4 className="font-semibold text-gray-900 mb-3">Stress-Test</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                {session.buildArtifacts.stressTestQuestions.length > 0
                  ? session.buildArtifacts.stressTestQuestions.map((item, index) => (
                    <li key={`stress-${index}`} className="rounded-lg bg-gray-50 px-3 py-2">{item}</li>
                  ))
                  : <li className="text-gray-500">Run “Stress-Test” to pressure the argument.</li>}
              </ul>
            </div>
          </div>
        </div>
      )}

      {selectedStage === 'write' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-gray-900">Compose the Essay</h3>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleExportPdf}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Export PDF
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={readOnly}
                className="rounded-lg bg-brand-maroon px-4 py-2 text-sm font-semibold text-white hover:bg-brand-maroon-hover disabled:opacity-50"
              >
                {session.submittedAt ? 'Save Resubmission' : 'Submit Assignment'}
              </button>
            </div>
          </div>
          <SocraticRichTextEditor value={session.essayHtml} onChange={handleEssayChange} readOnly={readOnly} />
        </div>
      )}

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-4">
        <div className="flex items-center gap-2 text-amber-900 font-semibold">
          <Sparkles className="w-4 h-4" />
          AI Coach
        </div>
        {!stageConfig.aiAllowed ? (
          <div className="text-sm text-amber-900">
            AI coaching is disabled for {stageConfig.label}. Continue with notes and the stage tools instead.
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {stageConversation.length === 0 ? (
                <div className="rounded-xl bg-white px-4 py-3 text-sm text-gray-600">
                  Start the conversation for {stageConfig.label.toLowerCase()}.
                </div>
              ) : (
                stageConversation.map((entry) => (
                  <div
                    key={entry.id}
                    className={`rounded-xl px-4 py-3 text-sm ${
                      entry.actor === 'student'
                        ? 'bg-white border border-gray-200 text-gray-900'
                        : entry.actor === 'ai'
                        ? 'bg-brand-maroon/5 border border-brand-maroon/10 text-gray-900'
                        : 'bg-gray-50 border border-gray-200 text-gray-700'
                    }`}
                  >
                    <div className="text-xs font-semibold uppercase tracking-wide mb-1">{entry.title}</div>
                    <div>{entry.content}</div>
                  </div>
                ))
              )}
            </div>
            <div className="space-y-3">
              {selectedStage === 'write' && (
                <button
                  type="button"
                  onClick={() => setCoachDraft('Review the current draft and ask me one revision question at a time.')}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Let the coach read the current draft
                </button>
              )}
              <Textarea
                rows={4}
                value={getCoachDraft()}
                onChange={(event) => setCoachDraft(event.target.value)}
                placeholder={`Message the ${stageConfig.label.toLowerCase()} coach...`}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleCoachMessage}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-maroon px-4 py-2 text-sm font-semibold text-white hover:bg-brand-maroon-hover"
                >
                  <Send className="w-4 h-4" />
                  Send
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function WorkspaceSidebar({
  blueprint,
  session,
  readOnly,
  selectedStage,
  newNoteDraft,
  setNewNoteDraft,
  handleAddNote,
  newSourceTitle,
  setNewSourceTitle,
  newSourceSummary,
  setNewSourceSummary,
  addAdditionalSource,
  handleInsertNote,
}: WorkspaceSidebarProps) {
  return (
    <aside className="space-y-6 xl:sticky xl:top-8">
      <Tabs defaultValue="notebook" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="notebook">Notebook</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="notebook" className="mt-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Shared Notebook</h3>
              <p className="text-sm text-gray-600 mt-1">One notebook across all stages. Each note keeps its origin badge.</p>
            </div>
            <Textarea
              rows={4}
              value={newNoteDraft}
              onChange={(event) => setNewNoteDraft(event.target.value)}
              placeholder={`Add a ${blueprint.stages[selectedStage].label.toLowerCase()} note...`}
              disabled={readOnly}
            />
            <button
              type="button"
              onClick={handleAddNote}
              disabled={readOnly}
              className="w-full rounded-lg border border-brand-maroon px-4 py-2 text-sm font-semibold text-brand-maroon hover:bg-brand-maroon hover:text-white disabled:opacity-50"
            >
              Add Note
            </button>
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {session.notes.map((note) => (
                <div key={note.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-medium ${getStageBadgeClasses(note.stage)}`}>
                      {blueprint.stages[note.stage].label}
                    </span>
                    <span className="text-xs text-gray-500">{new Date(note.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.content}</p>
                  {selectedStage === 'write' && (
                    <button
                      type="button"
                      onClick={() => handleInsertNote(note.content)}
                      className="mt-3 text-xs font-medium text-brand-maroon hover:text-brand-maroon-hover"
                    >
                      Insert into draft
                    </button>
                  )}
                </div>
              ))}
              {session.notes.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-300 p-6 text-sm text-gray-500 text-center">
                  No notes yet. Capture questions, evidence, and argument moves as you work.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ledger" className="mt-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Ledger</h3>
              <p className="text-sm text-gray-600 mt-1">Append-only log of prompts, AI replies, and workflow events.</p>
            </div>
            <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
              {session.ledger.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-gray-200 p-4">
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
          </div>
        </TabsContent>
      </Tabs>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Research Gate</h3>
          <p className="text-sm text-gray-600 mt-1">
            Build unlocks after Clarify completes. Write unlocks after required research and Build are done.
          </p>
        </div>
        <div className="space-y-3 text-sm">
          {blueprint.resources.filter((resource) => resource.required).map((resource) => {
            const progress = session.resourceProgress[resource.id];
            const done = resource.type === 'reading'
              ? Boolean(progress?.opened && (progress?.manuallyReviewed || session.notes.some((note) => note.stage === 'research')))
              : Boolean(progress?.completed);
            return (
              <div key={resource.id} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3">
                <div className="font-medium text-gray-900">{resource.title}</div>
                <div className={`text-xs font-semibold ${done ? 'text-green-600' : 'text-gray-500'}`}>
                  {done ? 'Complete' : 'Pending'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedStage === 'research' && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Add Additional Source</h3>
            <p className="text-sm text-gray-600 mt-1">Student-added sources are tracked in the ledger and notebook flow.</p>
          </div>
          <Input
            value={newSourceTitle}
            onChange={(event) => setNewSourceTitle(event.target.value)}
            placeholder="Source title"
          />
          <Textarea
            rows={3}
            value={newSourceSummary}
            onChange={(event) => setNewSourceSummary(event.target.value)}
            placeholder="What does this source add?"
          />
          <button
            type="button"
            onClick={addAdditionalSource}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Plus className="w-4 h-4" />
            Add Source
          </button>
        </div>
      )}
    </aside>
  );
}
