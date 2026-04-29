export const SOCRATIC_STAGE_ORDER = ['clarify', 'research', 'build', 'write'] as const;

export type SocraticStageKey = (typeof SOCRATIC_STAGE_ORDER)[number];
export type SocraticStageStatus = 'not_started' | 'in_progress' | 'completed';
export type SocraticResourceType = 'reading' | 'quiz' | 'avatar_lecture' | 'lecture' | 'source';
export type SocraticLedgerActor = 'student' | 'ai' | 'system';

export interface SocraticStageConfig {
  key: SocraticStageKey;
  label: string;
  summary: string;
  description: string;
  aiAllowed: boolean;
  systemPrompt: string;
  starterQuestions: string[];
}

export interface SocraticResource {
  id: string;
  type: SocraticResourceType;
  title: string;
  summary: string;
  required: boolean;
  createdFrom: 'existing' | 'new' | 'upload';
  resourceRefId?: string | null;
  url?: string | null;
  storageBucket?: string | null;
  storagePath?: string | null;
  stage?: SocraticStageKey | 'research';
}

export interface SocraticStudioBlueprint {
  assignmentId: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  assignmentTitle: string;
  assignmentBrief: string;
  dueAt: string;
  pointsPossible: number;
  wordCount: number;
  model: 'Claude';
  stages: Record<SocraticStageKey, SocraticStageConfig>;
  resources: SocraticResource[];
}

export interface SocraticNote {
  id: string;
  stage: SocraticStageKey;
  content: string;
  createdAt: string;
}

export interface SocraticLedgerEntry {
  id: string;
  stage: SocraticStageKey;
  actor: SocraticLedgerActor;
  title: string;
  content: string;
  createdAt: string;
  entryType?: string;
  metadata?: Record<string, unknown>;
}

export interface SocraticResourceProgress {
  resourceId: string;
  opened: boolean;
  completed: boolean;
  manuallyReviewed: boolean;
}

export interface SocraticBuildArtifacts {
  thesisOptions: string[];
  structurePlan: string[];
  stressTestQuestions: string[];
}

export interface SocraticStudioSession {
  activeStage: SocraticStageKey;
  stageStatuses: Record<SocraticStageKey, SocraticStageStatus>;
  notes: SocraticNote[];
  ledger: SocraticLedgerEntry[];
  resourceProgress: Record<string, SocraticResourceProgress>;
  clarifyDraft: string;
  researchCoachDraft: string;
  buildCoachDraft: string;
  writeCoachDraft: string;
  buildArtifacts: SocraticBuildArtifacts;
  essayHtml: string;
  essayJson: string;
  submittedAt: string | null;
}

export interface SocraticReviewState {
  score: string;
  feedback: string;
  gradedAt: string | null;
}

export interface SocraticAssignmentSummary {
  assignmentId: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  assignmentTitle: string;
  assignmentBrief: string;
  dueAt: string;
  requiredResources: number;
  totalResources: number;
}

export interface PendingSocraticCreatedResource {
  courseId: string;
  type: 'reading' | 'quiz' | 'avatar_lecture';
  id: string;
  title: string;
  summary: string;
  url?: string | null;
  storageBucket?: string | null;
  storagePath?: string | null;
}

type CreateBlueprintInput = {
  assignmentId: string;
  courseId: string;
  courseCode?: string;
  courseTitle?: string;
  assignmentTitle?: string;
  assignmentBrief?: string;
  dueAt?: string;
  pointsPossible?: number;
  wordCount?: number;
};

const STORAGE_PREFIX = 'socratic-writing';
const REGISTRY_KEY = `${STORAGE_PREFIX}:assignment-registry`;
const BLUEPRINT_KEY_PREFIX = `${STORAGE_PREFIX}:blueprint:`;
const CREATED_RESOURCE_KEY = `${STORAGE_PREFIX}:created-resource`;

const GLOBAL_PROMPT = `You are an essay-writing coach for students. Your job is to develop the student's thinking, not to do their thinking for them.

GLOBAL RULES
- Never produce essay-ready prose.
- Ask before you tell.
- One move at a time.
- Reflect their thinking back to them.
- Decline paste-ready writing requests warmly and briefly.
- Match the student's level.
- Keep replies short.`;

const STAGE_BASE_CONFIG: Record<SocraticStageKey, Omit<SocraticStageConfig, 'aiAllowed'>> = {
  clarify: {
    key: 'clarify',
    label: 'Clarify',
    summary: 'Refine the question and define terms.',
    description: "Help me figure out what I'm actually arguing.",
    systemPrompt: `${GLOBAL_PROMPT}

STAGE: CLARIFY THE QUESTION
- Help the student restate the prompt in their own words.
- Probe ambiguous terms.
- Identify the essay genre.
- Surface hidden assumptions.
- Do not suggest angles or theses yet.`,
    starterQuestions: [
      'What does your assignment prompt specifically ask you to do or explore?',
      "What is one term in the prompt that feels vague or overloaded?",
      'What would a strong response need to accomplish, not just mention?',
    ],
  },
  research: {
    key: 'research',
    label: 'Research',
    summary: 'Explore sources and take useful notes.',
    description: 'Gather evidence, complete required resources, and capture what matters.',
    systemPrompt: `${GLOBAL_PROMPT}

STAGE: RESEARCH
- Help the student search and read critically.
- Ask what each source does for their thinking.
- Encourage structured note taking.
- Do not fabricate sources or citations.`,
    starterQuestions: [
      'Which source seems most useful right now, and why?',
      'What pattern or tension are you starting to notice across the sources?',
      'What evidence still feels missing for the claim you want to make?',
    ],
  },
  build: {
    key: 'build',
    label: 'Build',
    summary: 'Construct and stress-test the argument.',
    description: 'Turn your research into a thesis, structure, and objections.',
    systemPrompt: `${GLOBAL_PROMPT}

STAGE: ARGUMENT BUILDING
- Help the student form a claim and structure a case.
- Stress-test vague claims.
- Map evidence to argument moves.
- Do not write the thesis for them.`,
    starterQuestions: [
      'What is the most interesting thing you now believe after doing the research?',
      'What would the strongest objection to your current position be?',
      'What are the 2 to 4 moves your argument has to make to hold together?',
    ],
  },
  write: {
    key: 'write',
    label: 'Write',
    summary: 'Draft and revise the essay.',
    description: 'Use your notes and argument map to compose and refine.',
    systemPrompt: `${GLOBAL_PROMPT}

STAGE: WRITE
- React to what the student drafted.
- Point out strengths, gaps, and drift.
- Ask diagnostic revision questions.
- Do not rewrite the essay for them.`,
    starterQuestions: [
      'Which paragraph feels strongest right now, and why?',
      'Where does the draft drift from your thesis or lose clarity?',
      'What claim still needs stronger evidence or a better transition?',
    ],
  },
};

const defaultEssayHtml = `<h1>Working Draft</h1><p>Use Clarify to pin down the question, Research to gather evidence, Build to shape your argument, and Write to compose the essay in your own voice.</p>`;

const safeJsonParse = <T>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const storageKey = (kind: string, id: string) => `${STORAGE_PREFIX}:${kind}:${id}`;

const loadRegistry = () => {
  if (typeof window === 'undefined') return [] as string[];
  return safeJsonParse<string[]>(window.localStorage.getItem(REGISTRY_KEY)) || [];
};

const saveRegistry = (assignmentIds: string[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(REGISTRY_KEY, JSON.stringify(Array.from(new Set(assignmentIds))));
};

export const markAssignmentAsSocratic = (assignmentId: string) => {
  const registry = loadRegistry();
  saveRegistry([...registry, assignmentId]);
};

export const loadSocraticAssignmentIds = () => {
  if (typeof window === 'undefined') return [] as string[];

  const assignmentIds = new Set(loadRegistry());

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key || !key.startsWith(BLUEPRINT_KEY_PREFIX)) continue;
    assignmentIds.add(key.slice(BLUEPRINT_KEY_PREFIX.length));
  }

  const normalizedAssignmentIds = Array.from(assignmentIds);
  saveRegistry(normalizedAssignmentIds);
  return normalizedAssignmentIds;
};

export const savePendingSocraticCreatedResource = (resource: PendingSocraticCreatedResource) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CREATED_RESOURCE_KEY, JSON.stringify(resource));
};

export const loadPendingSocraticCreatedResource = () => {
  if (typeof window === 'undefined') return null;
  return safeJsonParse<PendingSocraticCreatedResource>(window.localStorage.getItem(CREATED_RESOURCE_KEY));
};

export const clearPendingSocraticCreatedResource = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(CREATED_RESOURCE_KEY);
};

const nowIso = () => new Date().toISOString();

const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

const getStepCompletion = (
  stage: SocraticStageKey,
  session: SocraticStudioSession,
  blueprint: SocraticStudioBlueprint,
) => {
  if (stage === 'clarify') {
    return session.notes.some((note) => note.stage === 'clarify')
      || session.ledger.some((entry) => entry.stage === 'clarify' && entry.actor === 'student');
  }

  if (stage === 'research') {
    const requiredResources = blueprint.resources.filter((resource) => resource.required);
    return requiredResources.every((resource) => {
      const progress = session.resourceProgress[resource.id];
      if (!progress) return false;
      return progress.completed;
    });
  }

  if (stage === 'build') {
    return session.buildArtifacts.thesisOptions.length > 0
      && session.buildArtifacts.structurePlan.length > 0
      && session.buildArtifacts.stressTestQuestions.length > 0;
  }

  return session.essayHtml.replace(/<[^>]+>/g, '').trim().length > 0;
};

export const getStageBadgeClasses = (stage: SocraticStageKey) => {
  if (stage === 'clarify') return 'bg-red-50 text-red-700 border-red-200';
  if (stage === 'research') return 'bg-yellow-50 text-yellow-700 border-yellow-200';
  if (stage === 'build') return 'bg-orange-50 text-orange-700 border-orange-200';
  return 'bg-purple-50 text-purple-700 border-purple-200';
};

export const createDefaultStudioBlueprint = (
  input: CreateBlueprintInput,
): SocraticStudioBlueprint => ({
  assignmentId: input.assignmentId,
  courseId: input.courseId,
  courseCode: input.courseCode || 'COURSE',
  courseTitle: input.courseTitle || 'Course Title',
  assignmentTitle: input.assignmentTitle || 'Socratic Writing Assignment',
  assignmentBrief: input.assignmentBrief || 'Write an essay that develops a clear claim, grounds it in evidence, and addresses at least one serious objection.',
  dueAt: input.dueAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  pointsPossible: input.pointsPossible || 100,
  wordCount: input.wordCount || 1500,
  model: 'Claude',
  stages: {
    clarify: { ...STAGE_BASE_CONFIG.clarify, aiAllowed: true },
    research: { ...STAGE_BASE_CONFIG.research, aiAllowed: true },
    build: { ...STAGE_BASE_CONFIG.build, aiAllowed: true },
    write: { ...STAGE_BASE_CONFIG.write, aiAllowed: true },
  },
  resources: [],
});

export const createInitialStudioSession = (): SocraticStudioSession => ({
  activeStage: 'clarify',
  stageStatuses: {
    clarify: 'not_started',
    research: 'not_started',
    build: 'not_started',
    write: 'not_started',
  },
  notes: [],
  ledger: [
    {
      id: uid('ledger'),
      stage: 'clarify',
      actor: 'system',
      title: 'Studio opened',
      content: 'The student entered Socratic Writing Studio. Start in Clarify and work forward.',
      createdAt: nowIso(),
    },
  ],
  resourceProgress: {},
  clarifyDraft: '',
  researchCoachDraft: '',
  buildCoachDraft: '',
  writeCoachDraft: '',
  buildArtifacts: {
    thesisOptions: [],
    structurePlan: [],
    stressTestQuestions: [],
  },
  essayHtml: defaultEssayHtml,
  essayJson: JSON.stringify({ type: 'doc', version: 1, html: defaultEssayHtml }),
  submittedAt: null,
});

export const createInitialReviewState = (): SocraticReviewState => ({
  score: '',
  feedback: '',
  gradedAt: null,
});

export const recomputeStageStatuses = (
  session: SocraticStudioSession,
  blueprint: SocraticStudioBlueprint,
): SocraticStudioSession => {
  const nextStatuses: Record<SocraticStageKey, SocraticStageStatus> = {
    clarify: session.stageStatuses.clarify,
    research: session.stageStatuses.research,
    build: session.stageStatuses.build,
    write: session.stageStatuses.write,
  };

  SOCRATIC_STAGE_ORDER.forEach((stage) => {
    if (getStepCompletion(stage, session, blueprint)) {
      nextStatuses[stage] = 'completed';
      return;
    }

    const stageActivity = session.notes.some((note) => note.stage === stage)
      || session.ledger.some((entry) => entry.stage === stage && entry.actor !== 'system');

    nextStatuses[stage] = stageActivity ? 'in_progress' : 'not_started';
  });

  return {
    ...session,
    stageStatuses: nextStatuses,
  };
};

export const isStageUnlocked = (
  stage: SocraticStageKey,
  session: SocraticStudioSession,
  blueprint: SocraticStudioBlueprint,
) => {
  if (stage === 'clarify') return true;
  if (stage === 'research') {
    return session.stageStatuses.clarify === 'completed';
  }
  if (stage === 'build') {
    return session.stageStatuses.research === 'completed';
  }
  return session.stageStatuses.build === 'completed';
};

export const getRecommendedStage = (session: SocraticStudioSession) => {
  const nextIncomplete = SOCRATIC_STAGE_ORDER.find(
    (stage) => session.stageStatuses[stage] !== 'completed',
  );
  return nextIncomplete || 'write';
};

export const summarizeStudioState = (
  session: SocraticStudioSession,
  blueprint: SocraticStudioBlueprint,
) => {
  const noteCount = session.notes.length;
  const completedRequiredResources = blueprint.resources
    .filter((resource) => resource.required)
    .filter((resource) => {
      const progress = session.resourceProgress[resource.id];
      return Boolean(progress?.completed);
    }).length;

  return `Assignment: ${blueprint.assignmentTitle}. Notes: ${noteCount}. Required resources completed: ${completedRequiredResources}/${blueprint.resources.filter((resource) => resource.required).length}. Current stage: ${session.activeStage}.`;
};

export const getMockCoachReply = (
  stage: SocraticStageKey,
  input: string,
  blueprint: SocraticStudioBlueprint,
  session: SocraticStudioSession,
) => {
  const trimmedInput = input.trim();
  const summary = summarizeStudioState(session, blueprint);

  if (stage === 'clarify') {
    return `You seem to be focusing on "${trimmedInput.slice(0, 90)}". Before choosing a direction, restate the prompt in one sentence and name the verb that matters most. ${summary}`;
  }

  if (stage === 'research') {
    return `Use that source question to decide what evidence actually moves your argument. Which source in your list supports, complicates, or challenges your current direction most directly? ${summary}`;
  }

  if (stage === 'build') {
    return `Treat that as a working claim, not a final thesis. What is the strongest objection to it, and what evidence from your research would answer that objection? ${summary}`;
  }

  return `Read your draft back as a skeptical reader. Which paragraph is doing real argumentative work, and which one mostly repeats or drifts? Choose one weak spot and revise the logic before revising the style. ${summary}`;
};

export const buildPdfHtml = (blueprint: SocraticStudioBlueprint, session: SocraticStudioSession) => `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${blueprint.assignmentTitle}</title>
    <style>
      body { font-family: Arial, sans-serif; max-width: 900px; margin: 32px auto; padding: 0 24px; color: #111827; }
      h1 { font-size: 30px; margin-bottom: 8px; }
      .meta { color: #4b5563; margin-bottom: 24px; }
      .notes { margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 24px; }
      .note { margin-bottom: 12px; padding: 12px; background: #f9fafb; border-radius: 12px; }
      .badge { display: inline-block; font-size: 12px; color: #7c2d12; background: #ffedd5; border-radius: 9999px; padding: 2px 8px; margin-bottom: 8px; }
    </style>
  </head>
  <body>
    <h1>${blueprint.assignmentTitle}</h1>
    <div class="meta">${blueprint.courseCode} - ${blueprint.courseTitle} | Due ${new Date(blueprint.dueAt).toLocaleString()}</div>
    ${session.essayHtml}
    <section class="notes">
      <h2>Notebook</h2>
      ${session.notes.map((note) => `
        <div class="note">
          <div class="badge">${blueprint.stages[note.stage].label}</div>
          <div>${note.content}</div>
        </div>
      `).join('')}
    </section>
  </body>
</html>`;

export const saveStudioBlueprint = (assignmentId: string, blueprint: SocraticStudioBlueprint) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey('blueprint', assignmentId), JSON.stringify(blueprint));
  markAssignmentAsSocratic(assignmentId);
};

export const loadStudioBlueprint = (assignmentId: string) => {
  if (typeof window === 'undefined') return null;
  return safeJsonParse<SocraticStudioBlueprint>(
    window.localStorage.getItem(storageKey('blueprint', assignmentId)),
  );
};

export const hasStudioBlueprint = (assignmentId: string) => {
  return loadSocraticAssignmentIds().includes(assignmentId) || Boolean(loadStudioBlueprint(assignmentId));
};

export const saveStudioDraft = (courseId: string, blueprint: SocraticStudioBlueprint) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey('draft', courseId), JSON.stringify(blueprint));
};

export const loadStudioDraft = (courseId: string) => {
  if (typeof window === 'undefined') return null;
  return safeJsonParse<SocraticStudioBlueprint>(
    window.localStorage.getItem(storageKey('draft', courseId)),
  );
};

export const saveStudioSession = (
  assignmentId: string,
  studentId: string,
  session: SocraticStudioSession,
) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    storageKey('session', `${assignmentId}:${studentId}`),
    JSON.stringify(session),
  );
};

export const loadStudioSession = (assignmentId: string, studentId: string) => {
  if (typeof window === 'undefined') return null;
  return safeJsonParse<SocraticStudioSession>(
    window.localStorage.getItem(storageKey('session', `${assignmentId}:${studentId}`)),
  );
};

export const saveReviewState = (
  assignmentId: string,
  reviewState: SocraticReviewState,
) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey('review', assignmentId), JSON.stringify(reviewState));
};

export const loadReviewState = (assignmentId: string) => {
  if (typeof window === 'undefined') return null;
  return safeJsonParse<SocraticReviewState>(
    window.localStorage.getItem(storageKey('review', assignmentId)),
  );
};

export const toAssignmentSummary = (blueprint: SocraticStudioBlueprint): SocraticAssignmentSummary => ({
  assignmentId: blueprint.assignmentId,
  courseId: blueprint.courseId,
  courseCode: blueprint.courseCode,
  courseTitle: blueprint.courseTitle,
  assignmentTitle: blueprint.assignmentTitle,
  assignmentBrief: blueprint.assignmentBrief,
  dueAt: blueprint.dueAt,
  requiredResources: blueprint.resources.filter((resource) => resource.required).length,
  totalResources: blueprint.resources.length,
});

export const createStudioLedgerEntry = (
  stage: SocraticStageKey,
  actor: SocraticLedgerActor,
  title: string,
  content: string,
): SocraticLedgerEntry => ({
  id: uid('ledger'),
  stage,
  actor,
  title,
  content,
  createdAt: nowIso(),
});

export const createStudioNote = (
  stage: SocraticStageKey,
  content: string,
): SocraticNote => ({
  id: uid('note'),
  stage,
  content,
  createdAt: nowIso(),
});

export const createResourceProgressMap = (resources: SocraticResource[]) => Object.fromEntries(
  resources.map((resource) => [
    resource.id,
    {
      resourceId: resource.id,
      opened: false,
      completed: false,
      manuallyReviewed: false,
    } satisfies SocraticResourceProgress,
  ]),
);
