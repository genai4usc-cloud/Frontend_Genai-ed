'use client';

import { ChangeEvent } from 'react';
import {
  BookOpen,
  Bot,
  Brain,
  FlaskConical,
  MessageSquareText,
  PencilLine,
  Plus,
  Sparkles,
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

interface SocraticStudioConfiguratorProps {
  blueprint: SocraticStudioBlueprint;
  onChange: (nextBlueprint: SocraticStudioBlueprint) => void;
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
  onChange,
}: SocraticStudioConfiguratorProps) {
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

  const updateResource = (resourceId: string, patch: Partial<SocraticResource>) => {
    onChange({
      ...blueprint,
      resources: blueprint.resources.map((resource) =>
        resource.id === resourceId ? { ...resource, ...patch } : resource,
      ),
    });
  };

  const addResource = (type: SocraticResource['type']) => {
    onChange({
      ...blueprint,
      resources: [
        ...blueprint.resources,
        {
          id: `${type}-${Math.random().toString(36).slice(2, 8)}`,
          type,
          title: `New ${resourceLabels[type]}`,
          summary: 'Created via the existing resource flow and attached to this studio assignment.',
          required: false,
          createdFrom: 'new',
        },
      ],
    });
  };

  const handleWordCountChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...blueprint,
      wordCount: Number(event.target.value) || 0,
    });
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
            This frontend prototype stores the studio setup in browser state and carries it into the
            student and educator review flows after assignment creation.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Workflow</p>
          <p className="text-sm font-medium text-gray-900">Clarify → Research → Build → Write</p>
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
            <p className="text-sm text-gray-600">Per-stage AI policy and hidden coaching prompt.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
            <Sparkles className="w-3.5 h-3.5" />
            V1: Expert coach only
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
                  AI Coach
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
                  {!stageConfig.aiAllowed && (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                      The AI coach UI for {stageConfig.label.toLowerCase()} will be disabled, but notes and
                      manual workflow tools remain available.
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Research Resources</h3>
            <p className="text-sm text-gray-600">
              Attach readings, quizzes, avatar lectures, and lectures from existing flows, or seed new ones for the prototype.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['reading', 'quiz', 'avatar_lecture', 'lecture'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => addResource(type)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Plus className="w-4 h-4" />
                Add {resourceLabels[type]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {blueprint.resources.map((resource) => (
            <div key={resource.id} className="rounded-2xl border border-gray-200 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-yellow-50 border border-yellow-200 px-3 py-1 text-xs font-medium text-yellow-700">
                    {resourceLabels[resource.type]}
                  </div>
                  <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                    {resource.createdFrom === 'existing' ? 'Existing flow' : 'New resource'}
                  </div>
                </div>
                <label className="inline-flex items-center gap-3 text-sm font-medium text-gray-700">
                  Required
                  <Switch
                    checked={resource.required}
                    onCheckedChange={(checked) => updateResource(resource.id, { required: checked })}
                  />
                </label>
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
          ))}
        </div>
      </div>
    </section>
  );
}
