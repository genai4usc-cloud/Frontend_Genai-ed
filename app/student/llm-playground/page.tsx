'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, Profile } from '@/lib/supabase';
import StudentLayout from '@/components/StudentLayout';
import GenerationSettings from '@/components/GenerationSettings';
import {
  Bot,
  Send,
  Trash2,
  Settings as SettingsIcon,
  MessageSquare,
  ArrowLeftRight,
  Users,
  User,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ShieldAlert,
  FileText
} from 'lucide-react';

type AIModel = {
  id: string;
  name: string;
  provider: string;
  icon: string;
  color: string;
};

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  timestamp: Date;
};

type Mode = 'single' | 'compare' | 'multi-judge' | 'single-judge';

type LlmOutput = {
  modelId: string;
  text: string;
  latencyMs: number;
  error?: string;
};

type CompareRun = {
  id: string;
  prompt: string;
  modelIds: string[];
  outputs: LlmOutput[];
  orchestratorModelId?: string;
  orchestrationPrompt?: string;
  finalAnswer?: string;
  rationale?: string;
  orchestratedThread?: Message[];
};

type MultiJudgeRun = {
  id: string;
  prompt: string;
  primaryModelIds: string[];
  judgeModelIds: string[];
  primaryOutputs: LlmOutput[];
  assessments: any[];
  aggregated: any;
};

type SingleJudgeRun = {
  id: string;
  prompt: string;
  primaryModelIds: string[];
  evaluatorModelId: string;
  primaryOutputs: LlmOutput[];
  report: string;
  latencyMs: number;
};

const AI_MODELS: AIModel[] = [
  {
    id: 'gpt-5.1',
    name: 'OpenAI GPT 5.1',
    provider: 'OpenAI',
    icon: '🤖',
    color: 'bg-green-500'
  },
  {
    id: 'gemini-3',
    name: 'Google Gemini 3',
    provider: 'Google',
    icon: '✨',
    color: 'bg-blue-500'
  },
  {
    id: 'claude-opus-4.5',
    name: 'Claude Opus 4.5',
    provider: 'Anthropic',
    icon: '🧠',
    color: 'bg-purple-500'
  }
];

export default function LLMPlayground() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('single');

  const [selectedModel, setSelectedModel] = useState<string>('gpt-5.1');
  const [singleMessages, setSingleMessages] = useState<Message[]>([]);

  const [compareModelIds, setCompareModelIds] = useState<string[]>(AI_MODELS.map(m => m.id));
  const [orchestratorModelId, setOrchestratorModelId] = useState<string | null>(null);
  const [orchestrationPrompt, setOrchestrationPrompt] = useState<string>('');
  const [compareRuns, setCompareRuns] = useState<CompareRun[]>([]);
  const [activeCompareRunId, setActiveCompareRunId] = useState<string | null>(null);

  const [multiJudgePrimaryIds, setMultiJudgePrimaryIds] = useState<string[]>(AI_MODELS.map(m => m.id));
  const [multiJudgeJudgeIds, setMultiJudgeJudgeIds] = useState<string[]>(AI_MODELS.map(m => m.id));
  const [multiJudgeRuns, setMultiJudgeRuns] = useState<MultiJudgeRun[]>([]);

  const [singleJudgePrimaryIds, setSingleJudgePrimaryIds] = useState<string[]>(AI_MODELS.map(m => m.id));
  const [singleJudgeEvaluatorId, setSingleJudgeEvaluatorId] = useState<string>('claude-opus-4.5');
  const [singleJudgeRuns, setSingleJudgeRuns] = useState<SingleJudgeRun[]>([]);

  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [temperature, setTemperature] = useState(0.2);
  const [maxTokens, setMaxTokens] = useState(2000);
  const [includeSystemInstruction, setIncludeSystemInstruction] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');

  const [expandedOutputs, setExpandedOutputs] = useState<Set<string>>(new Set());
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
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
        await supabase.auth.signOut();
        router.push('/student/login');
        return;
      }

      setProfile(profileData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    setIsProcessing(true);
    const userPrompt = input;
    setInput('');

    setTimeout(() => {
      if (mode === 'single') {
        const userMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: userPrompt,
          timestamp: new Date()
        };
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Backend not wired yet.',
          model: selectedModel,
          timestamp: new Date()
        };
        setSingleMessages([...singleMessages, userMessage, assistantMessage]);
      } else if (mode === 'compare') {
        const newRun: CompareRun = {
          id: Date.now().toString(),
          prompt: userPrompt,
          modelIds: compareModelIds,
          outputs: compareModelIds.map(modelId => ({
            modelId,
            text: 'Awaiting backend...',
            latencyMs: 0
          })),
          orchestratorModelId: orchestratorModelId || undefined,
          orchestrationPrompt: orchestrationPrompt || undefined
        };
        setCompareRuns([...compareRuns, newRun]);
        setActiveCompareRunId(newRun.id);
      } else if (mode === 'multi-judge') {
        const newRun: MultiJudgeRun = {
          id: Date.now().toString(),
          prompt: userPrompt,
          primaryModelIds: multiJudgePrimaryIds,
          judgeModelIds: multiJudgeJudgeIds,
          primaryOutputs: [],
          assessments: [],
          aggregated: null
        };
        setMultiJudgeRuns([...multiJudgeRuns, newRun]);
      } else if (mode === 'single-judge') {
        const newRun: SingleJudgeRun = {
          id: Date.now().toString(),
          prompt: userPrompt,
          primaryModelIds: singleJudgePrimaryIds,
          evaluatorModelId: singleJudgeEvaluatorId,
          primaryOutputs: [],
          report: 'Awaiting backend...',
          latencyMs: 0
        };
        setSingleJudgeRuns([...singleJudgeRuns, newRun]);
      }
      setIsProcessing(false);
    }, 500);
  };

  const handleClearChat = () => {
    if (!confirm('Are you sure you want to clear the chat history?')) return;

    if (mode === 'single') {
      setSingleMessages([]);
    } else if (mode === 'compare') {
      setCompareRuns([]);
      setActiveCompareRunId(null);
    } else if (mode === 'multi-judge') {
      setMultiJudgeRuns([]);
    } else if (mode === 'single-judge') {
      setSingleJudgeRuns([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getPlaceholder = () => {
    switch (mode) {
      case 'single':
        return `Ask ${AI_MODELS.find(m => m.id === selectedModel)?.name} anything...`;
      case 'compare':
        return 'Ask selected models the same question...';
      case 'multi-judge':
        return 'Enter a prompt to evaluate for safety risks (multi-judge)...';
      case 'single-judge':
        return 'Enter a prompt to evaluate for safety risks (single-judge)...';
      default:
        return 'Type your message...';
    }
  };

  const toggleExpanded = (id: string, type: 'outputs' | 'reports') => {
    const setter = type === 'outputs' ? setExpandedOutputs : setExpandedReports;
    setter((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const renderSingleSidebar = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Select AI Model</h3>
        <div className="space-y-2">
          {AI_MODELS.map((model) => (
            <button
              key={model.id}
              onClick={() => setSelectedModel(model.id)}
              className={`w-full p-4 rounded-xl text-left transition-all ${
                selectedModel === model.id
                  ? 'bg-red-50 border-2 border-brand-maroon'
                  : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{model.icon}</span>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{model.name}</div>
                  <div className="text-sm text-gray-600">{model.provider}</div>
                </div>
              </div>
              {selectedModel === model.id && (
                <div className="w-full h-1 bg-green-500 rounded-full"></div>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="pt-4 border-t border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-3">Generation Settings</h3>
        <GenerationSettings
          temperature={temperature}
          maxTokens={maxTokens}
          includeSystemInstruction={includeSystemInstruction}
          systemPrompt={systemPrompt}
          onTemperatureChange={setTemperature}
          onMaxTokensChange={setMaxTokens}
          onIncludeSystemInstructionChange={setIncludeSystemInstruction}
          onSystemPromptChange={setSystemPrompt}
        />
      </div>
    </div>
  );

  const renderCompareSidebar = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-gray-900 mb-2">Compare Models</h3>
        <p className="text-sm text-gray-600 mb-4">
          Select which models to compare. Optionally enable orchestration.
        </p>
        <div className="space-y-2 mb-4">
          <div className="text-sm font-medium text-gray-700 mb-2">Models to Compare:</div>
          {AI_MODELS.map((model) => (
            <label
              key={model.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={compareModelIds.includes(model.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setCompareModelIds([...compareModelIds, model.id]);
                  } else {
                    setCompareModelIds(compareModelIds.filter(id => id !== model.id));
                  }
                }}
                className="w-4 h-4 text-brand-maroon focus:ring-brand-maroon border-gray-300 rounded"
              />
              <span className="text-xl">{model.icon}</span>
              <span className="font-medium text-gray-900 text-sm">{model.name}</span>
            </label>
          ))}
        </div>
        <div className="border-t border-gray-200 pt-4">
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Orchestrator (optional)
            </label>
            <select
              value={orchestratorModelId || ''}
              onChange={(e) => setOrchestratorModelId(e.target.value || null)}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-maroon focus:border-transparent text-sm"
            >
              <option value="">None</option>
              {AI_MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>
          {orchestratorModelId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Orchestration Prompt (optional)
              </label>
              <textarea
                value={orchestrationPrompt}
                onChange={(e) => setOrchestrationPrompt(e.target.value)}
                placeholder="e.g., Synthesize all responses into a comprehensive answer..."
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-maroon focus:border-transparent text-sm resize-none"
                rows={3}
              />
            </div>
          )}
        </div>
      </div>
      <div className="pt-4 border-t border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-3">Generation Settings</h3>
        <GenerationSettings
          temperature={temperature}
          maxTokens={maxTokens}
          includeSystemInstruction={includeSystemInstruction}
          systemPrompt={systemPrompt}
          onTemperatureChange={setTemperature}
          onMaxTokensChange={setMaxTokens}
          onIncludeSystemInstructionChange={setIncludeSystemInstruction}
          onSystemPromptChange={setSystemPrompt}
        />
      </div>
    </div>
  );

  const renderMultiJudgeSidebar = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-gray-900 mb-2">Multi-Judge Evaluation</h3>
        <p className="text-sm text-gray-600 mb-4">
          Multiple judges will evaluate prompts generated by primary models.
        </p>
        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Primary Models:</div>
            {AI_MODELS.map((model) => (
              <label
                key={model.id}
                className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer mb-2"
              >
                <input
                  type="checkbox"
                  checked={multiJudgePrimaryIds.includes(model.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setMultiJudgePrimaryIds([...multiJudgePrimaryIds, model.id]);
                    } else {
                      setMultiJudgePrimaryIds(multiJudgePrimaryIds.filter(id => id !== model.id));
                    }
                  }}
                  className="w-4 h-4 text-brand-maroon focus:ring-brand-maroon border-gray-300 rounded"
                />
                <span className="text-lg">{model.icon}</span>
                <span className="font-medium text-gray-900 text-sm">{model.name}</span>
              </label>
            ))}
          </div>
          <div className="border-t border-gray-200 pt-3">
            <div className="text-sm font-medium text-gray-700 mb-2">Judge Models:</div>
            {AI_MODELS.map((model) => (
              <label
                key={model.id}
                className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer mb-2"
              >
                <input
                  type="checkbox"
                  checked={multiJudgeJudgeIds.includes(model.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setMultiJudgeJudgeIds([...multiJudgeJudgeIds, model.id]);
                    } else {
                      setMultiJudgeJudgeIds(multiJudgeJudgeIds.filter(id => id !== model.id));
                    }
                  }}
                  className="w-4 h-4 text-brand-maroon focus:ring-brand-maroon border-gray-300 rounded"
                />
                <span className="text-lg">{model.icon}</span>
                <span className="font-medium text-gray-900 text-sm">{model.name}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="pt-4 border-t border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-3">Generation Settings</h3>
        <GenerationSettings
          temperature={temperature}
          maxTokens={maxTokens}
          includeSystemInstruction={includeSystemInstruction}
          systemPrompt={systemPrompt}
          onTemperatureChange={setTemperature}
          onMaxTokensChange={setMaxTokens}
          onIncludeSystemInstructionChange={setIncludeSystemInstruction}
          onSystemPromptChange={setSystemPrompt}
        />
      </div>
    </div>
  );

  const renderSingleJudgeSidebar = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-gray-900 mb-2">Single-Judge Evaluation</h3>
        <p className="text-sm text-gray-600 mb-4">
          One evaluator will provide detailed assessment of prompts from primary models.
        </p>
        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Primary Models:</div>
            {AI_MODELS.map((model) => (
              <label
                key={model.id}
                className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer mb-2"
              >
                <input
                  type="checkbox"
                  checked={singleJudgePrimaryIds.includes(model.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSingleJudgePrimaryIds([...singleJudgePrimaryIds, model.id]);
                    } else {
                      setSingleJudgePrimaryIds(singleJudgePrimaryIds.filter(id => id !== model.id));
                    }
                  }}
                  className="w-4 h-4 text-brand-maroon focus:ring-brand-maroon border-gray-300 rounded"
                />
                <span className="text-lg">{model.icon}</span>
                <span className="font-medium text-gray-900 text-sm">{model.name}</span>
              </label>
            ))}
          </div>
          <div className="border-t border-gray-200 pt-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Evaluator Model
            </label>
            <select
              value={singleJudgeEvaluatorId}
              onChange={(e) => setSingleJudgeEvaluatorId(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-maroon focus:border-transparent text-sm"
            >
              {AI_MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className="pt-4 border-t border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-3">Generation Settings</h3>
        <GenerationSettings
          temperature={temperature}
          maxTokens={maxTokens}
          includeSystemInstruction={includeSystemInstruction}
          systemPrompt={systemPrompt}
          onTemperatureChange={setTemperature}
          onMaxTokensChange={setMaxTokens}
          onIncludeSystemInstructionChange={setIncludeSystemInstruction}
          onSystemPromptChange={setSystemPrompt}
        />
      </div>
    </div>
  );

  const renderSidebarForMode = (currentMode: Mode) => {
    switch (currentMode) {
      case 'single':
        return renderSingleSidebar();
      case 'compare':
        return renderCompareSidebar();
      case 'multi-judge':
        return renderMultiJudgeSidebar();
      case 'single-judge':
        return renderSingleJudgeSidebar();
      default:
        return null;
    }
  };

  const renderCompareRuns = () => {
    return (
      <div className="space-y-6">
        {compareRuns.map((run) => (
          <div key={run.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-brand-maroon" />
                <h3 className="font-semibold text-gray-900">Compare Run</h3>
              </div>
              <p className="text-sm text-gray-600 mt-1">{run.prompt}</p>
            </div>

            {run.finalAnswer && run.rationale ? (
              <div className="p-4 space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2 text-sm">Final Answer</h4>
                  <p className="text-sm text-gray-700">{run.finalAnswer}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2 text-sm">Rationale</h4>
                  <p className="text-sm text-gray-700">{run.rationale}</p>
                </div>
                <button
                  onClick={() => toggleExpanded(run.id, 'outputs')}
                  className="flex items-center gap-2 text-sm text-brand-maroon hover:text-red-800 font-medium"
                >
                  {expandedOutputs.has(run.id) ? (
                    <>
                      <span>Hide Individual Outputs</span>
                      <ChevronUp className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>View Individual Model Outputs</span>
                      <ChevronDown className="w-4 h-4" />
                    </>
                  )}
                </button>
                {expandedOutputs.has(run.id) && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-3">
                    {run.outputs.map((output) => {
                      const model = AI_MODELS.find(m => m.id === output.modelId);
                      return (
                        <div key={output.modelId} className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                          <div className="bg-gray-100 px-3 py-2 border-b border-gray-200">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{model?.icon}</span>
                              <div>
                                <div className="font-medium text-gray-900 text-xs">{model?.name}</div>
                                <div className="text-xs text-gray-500">{output.latencyMs}ms</div>
                              </div>
                            </div>
                          </div>
                          <div className="p-3">
                            <p className="text-xs text-gray-700">{output.text}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
                {run.outputs.map((output) => {
                  const model = AI_MODELS.find(m => m.id === output.modelId);
                  return (
                    <div key={output.modelId} className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-100 px-3 py-2 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{model?.icon}</span>
                          <div>
                            <div className="font-medium text-gray-900 text-sm">{model?.name}</div>
                            <div className="text-xs text-gray-500">{output.latencyMs > 0 ? `${output.latencyMs}ms` : 'Pending'}</div>
                          </div>
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="text-sm text-gray-700">{output.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {isProcessing && (
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="flex items-center justify-center gap-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-brand-maroon rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-brand-maroon rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-brand-maroon rounded-full animate-bounce delay-200"></div>
              </div>
              <span className="text-gray-600 font-medium">Generating responses...</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMultiJudgeRuns = () => {
    return (
      <div className="space-y-6">
        {multiJudgeRuns.map((run) => (
          <div key={run.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-brand-maroon" />
                <h3 className="font-semibold text-gray-900">Multi-Judge Evaluation</h3>
              </div>
              <p className="text-sm text-gray-600 mt-1">{run.prompt}</p>
            </div>
            <div className="p-6 text-center">
              <p className="text-sm text-gray-500 italic">Awaiting backend implementation</p>
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="flex items-center justify-center gap-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-brand-maroon rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-brand-maroon rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-brand-maroon rounded-full animate-bounce delay-200"></div>
              </div>
              <span className="text-gray-600 font-medium">Evaluating prompt...</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSingleJudgeRuns = () => {
    return (
      <div className="space-y-6">
        {singleJudgeRuns.map((run) => {
          const evaluator = AI_MODELS.find(m => m.id === run.evaluatorModelId);
          return (
            <div key={run.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-brand-maroon" />
                    <h3 className="font-semibold text-gray-900">Single-Judge Evaluation</h3>
                  </div>
                  {run.primaryOutputs.length > 0 && (
                    <button
                      onClick={() => toggleExpanded(run.id, 'reports')}
                      className="flex items-center gap-2 text-sm text-brand-maroon hover:text-red-800 font-medium"
                    >
                      {expandedReports.has(run.id) ? (
                        <>
                          <span>Collapse</span>
                          <ChevronUp className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          <span>Expand Details</span>
                          <ChevronDown className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-3">{run.prompt}</p>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="text-lg">{evaluator?.icon}</span>
                  <span>{evaluator?.name}</span>
                  {run.latencyMs > 0 && <span>• {run.latencyMs}ms</span>}
                </div>
              </div>

              <div className="px-6 py-4">
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Evaluation Report</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">{run.report}</p>
                </div>

                {expandedReports.has(run.id) && run.primaryOutputs.length > 0 && (
                  <div className="space-y-3 border-t border-gray-200 pt-4">
                    <h4 className="text-sm font-semibold text-gray-900">Primary Model Outputs:</h4>
                    {run.primaryOutputs.map((output) => {
                      const model = AI_MODELS.find(m => m.id === output.modelId);
                      return (
                        <div key={output.modelId} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">{model?.icon}</span>
                            <span className="font-medium text-gray-900 text-sm">{model?.name}</span>
                            <span className="text-xs text-gray-500">• {output.latencyMs}ms</span>
                          </div>
                          <p className="text-xs text-gray-700">{output.text}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isProcessing && (
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="flex items-center justify-center gap-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-brand-maroon rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-brand-maroon rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-brand-maroon rounded-full animate-bounce delay-200"></div>
              </div>
              <span className="text-gray-600 font-medium">Generating evaluation...</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const messageCount = mode === 'single' ? singleMessages.filter(m => m.role === 'user').length :
    mode === 'compare' ? compareRuns.length :
    mode === 'multi-judge' ? multiJudgeRuns.length :
    singleJudgeRuns.length;

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-maroon border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <StudentLayout profile={profile}>
      <div className="h-[calc(100vh-80px)] flex flex-col">
        <div className="bg-brand-maroon text-white px-6 py-4 rounded-t-2xl">
          <h1 className="text-2xl font-bold">LLM Playground</h1>
          <p className="text-sm text-white/90 mt-1">
            Chat with AI models - GPT 5.1, Gemini 3, and Claude Opus 4.5
          </p>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="flex gap-2 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm max-w-fit">
            <button
              onClick={() => setMode('single')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                mode === 'single'
                  ? 'bg-brand-maroon text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Single Chat
            </button>
            <button
              onClick={() => setMode('compare')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                mode === 'compare'
                  ? 'bg-brand-maroon text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <ArrowLeftRight className="w-4 h-4" />
              Compare Models
            </button>
            <button
              onClick={() => setMode('multi-judge')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                mode === 'multi-judge'
                  ? 'bg-brand-maroon text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Users className="w-4 h-4" />
              Multi Judge
            </button>
            <button
              onClick={() => setMode('single-judge')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                mode === 'single-judge'
                  ? 'bg-brand-maroon text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <User className="w-4 h-4" />
              Single Judge
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
            <div className="p-4 space-y-4">
              {renderSidebarForMode(mode)}

              <div className="pt-4 border-t border-gray-200">
                <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group">
                  <span className="font-medium text-gray-700 group-hover:text-gray-900">Settings</span>
                  <SettingsIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                </button>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Quick Actions</h3>
                <button
                  onClick={handleClearChat}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear Chat
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col bg-gray-50">
            <div className="flex-1 overflow-y-auto p-6">
              {messageCount === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="mb-6">
                    {mode === 'single' && (
                      <div className="relative">
                        <div className="w-24 h-24 bg-gradient-to-br from-brand-maroon to-red-700 rounded-3xl flex items-center justify-center shadow-lg">
                          <Bot className="w-12 h-12 text-white" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-brand-yellow rounded-full flex items-center justify-center">
                          <span className="text-sm">
                            {AI_MODELS.find(m => m.id === selectedModel)?.icon}
                          </span>
                        </div>
                      </div>
                    )}
                    {mode === 'compare' && (
                      <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-700 rounded-3xl flex items-center justify-center shadow-lg">
                        <ArrowLeftRight className="w-12 h-12 text-white" />
                      </div>
                    )}
                    {mode === 'multi-judge' && (
                      <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-red-700 rounded-3xl flex items-center justify-center shadow-lg">
                        <Users className="w-12 h-12 text-white" />
                      </div>
                    )}
                    {mode === 'single-judge' && (
                      <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-700 rounded-3xl flex items-center justify-center shadow-lg">
                        <User className="w-12 h-12 text-white" />
                      </div>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {mode === 'single' && 'Start a conversation'}
                    {mode === 'compare' && 'Compare AI Responses'}
                    {mode === 'multi-judge' && 'Multi-Judge Evaluation'}
                    {mode === 'single-judge' && 'Single-Judge Evaluation'}
                  </h2>
                  <p className="text-gray-600 max-w-md">
                    {mode === 'single' && `Chat with ${AI_MODELS.find(m => m.id === selectedModel)?.name}`}
                    {mode === 'compare' && 'Ask the same question to selected models and compare'}
                    {mode === 'multi-judge' && 'Multiple judges will evaluate your prompt for safety'}
                    {mode === 'single-judge' && 'Detailed evaluation from a single judge model'}
                  </p>
                </div>
              ) : mode === 'compare' ? (
                <div className="max-w-7xl mx-auto">
                  {renderCompareRuns()}
                </div>
              ) : mode === 'multi-judge' ? (
                <div className="max-w-6xl mx-auto">
                  {renderMultiJudgeRuns()}
                </div>
              ) : mode === 'single-judge' ? (
                <div className="max-w-5xl mx-auto">
                  {renderSingleJudgeRuns()}
                </div>
              ) : (
                <div className="max-w-4xl mx-auto space-y-4">
                  <div className="flex items-center gap-2 mb-4 p-3 bg-white rounded-lg border border-gray-200">
                    <span className="text-2xl">
                      {AI_MODELS.find(m => m.id === selectedModel)?.icon}
                    </span>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {AI_MODELS.find(m => m.id === selectedModel)?.name}
                      </div>
                      <div className="text-sm text-gray-600">{messageCount} messages</div>
                    </div>
                  </div>

                  {singleMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <div className="w-8 h-8 bg-brand-maroon rounded-full flex items-center justify-center flex-shrink-0">
                          <Bot className="w-5 h-5 text-white" />
                        </div>
                      )}
                      <div
                        className={`max-w-2xl rounded-2xl px-4 py-3 ${
                          message.role === 'user'
                            ? 'bg-brand-maroon text-white'
                            : 'bg-white text-gray-900 border border-gray-200'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                      {message.role === 'user' && (
                        <div className="w-8 h-8 bg-brand-yellow rounded-full flex items-center justify-center flex-shrink-0 font-bold text-gray-900">
                          {profile?.first_name?.[0]}
                        </div>
                      )}
                    </div>
                  ))}

                  {isProcessing && (
                    <div className="flex gap-3 justify-start">
                      <div className="w-8 h-8 bg-brand-maroon rounded-full flex items-center justify-center flex-shrink-0">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                      <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-gray-200">
              <div className="max-w-4xl mx-auto">
                <div className="flex gap-3 items-end">
                  <div className="flex-1 relative">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={getPlaceholder()}
                      rows={1}
                      className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-maroon focus:border-transparent resize-none"
                      style={{ minHeight: '50px', maxHeight: '150px' }}
                    />
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isProcessing}
                    className="w-12 h-12 bg-brand-maroon text-white rounded-xl hover:bg-brand-maroon-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Press Enter to send, Shift+Enter for new line
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
