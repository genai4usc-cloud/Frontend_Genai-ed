'use client';

import { ChangeEvent, useState } from 'react';
import {
  BookOpen,
  Bot,
  Brain,
  FileUp,
  FlaskConical,
  MessageSquareText,
  PencilLine,
  Plus,
  Sparkles,
  Trash2,
  Video,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  SOCRATIC_STAGE_ORDER,
  SocraticResource,
  SocraticStudioBlueprint,
  SocraticStageKey,
} from '@/lib/socraticWriting';

type ExistingReadingOption = {
  id: string;
  title: string;
  summary: string;
  url?: string | null;
  storageBucket?: string | null;
  storagePath?: string | null;
};

type ExistingLinkedOption = {
  id: string;
  title: string;
  summary: string;
};

interface SocraticStudioConfiguratorProps {
  blueprint: SocraticStudioBlueprint;
  availableResources: {
    readings: ExistingReadingOption[];
    quizzes: ExistingLinkedOption[];
    avatarLectures: ExistingLinkedOption[];
  };
  onChange: (nextBlueprint: SocraticStudioBlueprint) => void;
  onUploadReading: (file: File) => Promise<void>;
  onCreateQuiz: () => void;
  onCreateAvatarLecture: () => void;
}

const stageIcons = {
  clarify: MessageSquareText,
  research: BookOpen,
  build: FlaskConical,
  write: PencilLine,
} satisfies Record<SocraticStageKey, typeof MessageSquareText>;

const resourceLabels = {
  reading: 'Reading',
  quiz: 'Quiz',
  avatar_lecture: 'Avatar Lecture',
  lecture: 'Lecture',
  source: 'Source',
} satisfies Record<SocraticResource['type'], string>;

export default function SocraticStudioConfigurator({
  blueprint,
  availableResources,
  onChange,
  onUploadReading,
  onCreateQuiz,
  onCreateAvatarLecture,
}: SocraticStudioConfiguratorProps) {
  const [activePicker, setActivePicker] = useState<'reading' | 'quiz' | 'avatar_lecture' | null>(null);
  const [uploadingReading, setUploadingReading] = useState(false);

  const updateStage = (stage: SocraticStageKey, patch: Partial<SocraticStudioBlueprint['stages'][SocraticStageKey]>) => {
    onChange({
      ...blueprint,
      stages: {
        ...blueprint.stages,
        [stage]: {
          ...blueprint.stages[stage],
          ...patch,
        },
      },
    });
  };

  const updateStarterQuestion = (stage: SocraticStageKey, index: number, value: string) => {
    const nextQuestions = blueprint.stages[stage].starterQuestions.map((question, questionIndex) =>
      questionIndex === index ? value : question,
    );
    updateStage(stage, { starterQuestions: nextQuestions });
  };

  const addStarterQuestion = (stage: SocraticStageKey) => {
    updateStage(stage, {
      starterQuestions: [...blueprint.stages[stage].starterQuestions, 'New starter question'],
    });
  };

  const upsertResource = (resource: SocraticResource) => {
    const existingIndex = blueprint.resources.findIndex((entry) => entry.id === resource.id);
    if (existingIndex >= 0) {
      const nextResources = [...blueprint.resources];
      nextResources[existingIndex] = {
        ...nextResources[existingIndex],
        ...resource,
      };
      onChange({
        ...blueprint,
        resources: nextResources,
      });
      return;
    }

    onChange({
      ...blueprint,
      resources: [...blueprint.resources, resource],
    });
  };

  const updateResource = (resourceId: string, patch: Partial<SocraticResource>) => {
    onChange({
      ...blueprint,
      resources: blueprint.resources.map((resource) =>
        resource.id === resourceId ? { ...resource, ...patch } : resource,
      ),
    });
  };

  const removeResource = (resourceId: string) => {
    onChange({
      ...blueprint,
      resources: blueprint.resources.filter((resource) => resource.id !== resourceId),
    });
  };

  const attachExistingReading = (reading: ExistingReadingOption) => {
    upsertResource({
      id: reading.id,
      type: 'reading',
      title: reading.title,
      summary: reading.summary,
      required: false,
      createdFrom: 'existing',
      url: reading.url || null,
      storageBucket: reading.storageBucket || null,
      storagePath: reading.storagePath || null,
      stage: 'research',
    });
    setActivePicker(null);
  };

  const attachExistingQuiz = (quiz: ExistingLinkedOption) => {
    upsertResource({
      id: `quiz-${quiz.id}`,
      type: 'quiz',
      title: quiz.title,
      summary: quiz.summary,
      required: false,
      createdFrom: 'existing',
      resourceRefId: quiz.id,
      stage: 'research',
    });
    setActivePicker(null);
  };

  const attachExistingAvatarLecture = (lecture: ExistingLinkedOption) => {
    upsertResource({
      id: `avatar-${lecture.id}`,
      type: 'avatar_lecture',
      title: lecture.title,
      summary: lecture.summary,
      required: false,
      createdFrom: 'existing',
      resourceRefId: lecture.id,
      stage: 'research',
    });
    setActivePicker(null);
  };

  const handleWordCountChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...blueprint,
      wordCount: Number(event.target.value) || 0,
    });
  };

  const handleReadingUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingReading(true);
      await onUploadReading(file);
      setActivePicker(null);
      event.target.value = '';
    } finally {
      setUploadingReading(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
      <div className="flex items-start gap-3">
        <div className="bg-purple-50 p-3 rounded-xl">
          <Brain className="w-6 h-6 text-purple-700" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Socratic Writing Studio</h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure the four-stage Socratic writing flow, then attach only the research resources
            you actually want students to use.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Workflow</p>
          <p className="text-sm font-medium text-gray-900">Clarify - Research - Build - Write</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Model</p>
          <p className="text-sm font-medium text-gray-900 inline-flex items-center gap-2">
            <Bot className="w-4 h-4 text-brand-maroon" />
            Claude
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
            Word Count Target
          </label>
          <Input type="number" min={250} value={blueprint.wordCount} onChange={handleWordCountChange} />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Stage Policies</h3>
            <p className="text-sm text-gray-600">Per-stage AI policy and hidden stage prompt.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
            <Sparkles className="w-3.5 h-3.5" />
            V1: Claude only
          </div>
        </div>

        {SOCRATIC_STAGE_ORDER.map((stage) => {
          const Icon = stageIcons[stage];
          const stageConfig = blueprint.stages[stage];

          return (
            <div key={stage} className="rounded-2xl border border-gray-200 p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="bg-brand-maroon/10 p-3 rounded-xl">
                    <Icon className="w-5 h-5 text-brand-maroon" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">{stageConfig.label}</h4>
                    <p className="text-sm text-gray-600">{stageConfig.summary}</p>
                  </div>
                </div>
                <label className="inline-flex items-center gap-3 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700">
                  AI Chat
                  <Switch
                    checked={stageConfig.aiAllowed}
                    onCheckedChange={(checked) => updateStage(stage, { aiAllowed: checked })}
                  />
                </label>
              </div>

              <div className="grid xl:grid-cols-[1.2fr,1fr] gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Hidden System Prompt</label>
                  <Textarea
                    value={stageConfig.systemPrompt}
                    onChange={(event) => updateStage(stage, { systemPrompt: event.target.value })}
                    rows={8}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-900">Starter Questions</label>
                    <button
                      type="button"
                      onClick={() => addStarterQuestion(stage)}
                      className="inline-flex items-center gap-2 text-sm font-medium text-brand-maroon hover:text-brand-maroon-hover"
                    >
                      <Plus className="w-4 h-4" />
                      Add Question
                    </button>
                  </div>
                  {stageConfig.starterQuestions.map((question, index) => (
                    <Input
                      key={`${stage}-question-${index}`}
                      value={question}
                      onChange={(event) => updateStarterQuestion(stage, index, event.target.value)}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Research Resources</h3>
            <p className="text-sm text-gray-600">
              Start empty, then attach course readings, quizzes, and avatar lectures only where they
              belong. Students can still upload their own PDFs during Research.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActivePicker(activePicker === 'reading' ? null : 'reading')}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Plus className="w-4 h-4" />
              Add Reading
            </button>
            <button
              type="button"
              onClick={() => setActivePicker(activePicker === 'quiz' ? null : 'quiz')}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Plus className="w-4 h-4" />
              Add Quiz
            </button>
            <button
              type="button"
              onClick={() => setActivePicker(activePicker === 'avatar_lecture' ? null : 'avatar_lecture')}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Plus className="w-4 h-4" />
              Add Avatar Lecture
            </button>
          </div>
        </div>

        {activePicker === 'reading' && (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-semibold text-gray-900">Attach Reading</h4>
                <p className="text-sm text-gray-600">
                  Choose from course readings, uploaded PDFs, and lecture PDFs, or upload a new one.
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-brand-maroon px-3 py-2 text-sm font-medium text-brand-maroon hover:bg-brand-maroon hover:text-white">
                <FileUp className="w-4 h-4" />
                {uploadingReading ? 'Uploading...' : 'Upload New PDF'}
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleReadingUpload}
                  disabled={uploadingReading}
                />
              </label>
            </div>
            <div className="grid gap-3">
              {availableResources.readings.map((reading) => (
                <div key={reading.id} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{reading.title}</div>
                      <div className="mt-1 text-sm text-gray-600">{reading.summary || 'Course reading resource.'}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => attachExistingReading(reading)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Attach
                    </button>
                  </div>
                </div>
              ))}
              {availableResources.readings.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-sm text-gray-500 text-center">
                  No course reading resources found yet.
                </div>
              )}
            </div>
          </div>
        )}

        {activePicker === 'quiz' && (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-semibold text-gray-900">Attach Quiz</h4>
                <p className="text-sm text-gray-600">Attach an existing course quiz or create a new online quiz.</p>
              </div>
              <button
                type="button"
                onClick={onCreateQuiz}
                className="rounded-lg border border-brand-maroon px-3 py-2 text-sm font-medium text-brand-maroon hover:bg-brand-maroon hover:text-white"
              >
                Create New Quiz
              </button>
            </div>
            <div className="grid gap-3">
              {availableResources.quizzes.map((quiz) => (
                <div key={quiz.id} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{quiz.title}</div>
                      <div className="mt-1 text-sm text-gray-600">{quiz.summary || 'Course quiz.'}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => attachExistingQuiz(quiz)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Attach
                    </button>
                  </div>
                </div>
              ))}
              {availableResources.quizzes.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-sm text-gray-500 text-center">
                  No existing course quizzes yet.
                </div>
              )}
            </div>
          </div>
        )}

        {activePicker === 'avatar_lecture' && (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-semibold text-gray-900">Attach Avatar Lecture</h4>
                <p className="text-sm text-gray-600">
                  Attach an existing course lecture or create a new one and return here automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={onCreateAvatarLecture}
                className="rounded-lg border border-brand-maroon px-3 py-2 text-sm font-medium text-brand-maroon hover:bg-brand-maroon hover:text-white"
              >
                Create New Avatar Lecture
              </button>
            </div>
            <div className="grid gap-3">
              {availableResources.avatarLectures.map((lecture) => (
                <div key={lecture.id} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{lecture.title}</div>
                      <div className="mt-1 text-sm text-gray-600">{lecture.summary || 'Course lecture.'}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => attachExistingAvatarLecture(lecture)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Attach
                    </button>
                  </div>
                </div>
              ))}
              {availableResources.avatarLectures.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-sm text-gray-500 text-center">
                  No existing avatar lectures yet.
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {blueprint.resources.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center text-sm text-gray-500">
              No research resources attached yet. Add readings, quizzes, or avatar lectures when the assignment is ready.
            </div>
          ) : (
            blueprint.resources.map((resource) => (
              <div key={resource.id} className="rounded-2xl border border-gray-200 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-yellow-50 border border-yellow-200 px-3 py-1 text-xs font-medium text-yellow-700">
                      {resource.type === 'avatar_lecture' ? (
                        <span className="inline-flex items-center gap-1">
                          <Video className="w-3.5 h-3.5" />
                          Avatar Lecture
                        </span>
                      ) : (
                        resourceLabels[resource.type]
                      )}
                    </div>
                    <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                      {resource.createdFrom === 'existing'
                        ? 'Existing'
                        : resource.createdFrom === 'upload'
                          ? 'Uploaded'
                          : 'Newly created'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-3 text-sm font-medium text-gray-700">
                      Required
                      <Switch
                        checked={resource.required}
                        onCheckedChange={(checked) => updateResource(resource.id, { required: checked })}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => removeResource(resource.id)}
                      className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50"
                      aria-label={`Remove ${resource.title}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <Input
                  value={resource.title}
                  onChange={(event) => updateResource(resource.id, { title: event.target.value })}
                />
                <Textarea
                  rows={3}
                  value={resource.summary}
                  onChange={(event) => updateResource(resource.id, { summary: event.target.value })}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
