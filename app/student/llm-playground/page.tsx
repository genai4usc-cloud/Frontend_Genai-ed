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
  RefreshCw,
  ArrowLeftRight,
  Network,
  ShieldAlert,
  FileText,
  Users,
  User,
  ChevronDown,
  ChevronUp,
  AlertTriangle
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

type Mode = 'single' | 'compare' | 'orchestrate' | 'risk-short' | 'risk-long';

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
  const [orchestratorModel, setOrchestratorModel] = useState<string>('gpt-5.1');
  const [judgeModel, setJudgeModel] = useState<string>('claude-opus-4.5');
  const [singleMessages, setSingleMessages] = useState<Message[]>([]);
  const [compareMessages, setCompareMessages] = useState<Message[]>([]);
  const [orchestrationMessages, setOrchestrationMessages] = useState<Message[]>([]);
  const [riskShortMessages, setRiskShortMessages] = useState<Message[]>([]);
  const [riskLongMessages, setRiskLongMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [temperature, setTemperature] = useState(0.2);
  const [maxTokens, setMaxTokens] = useState(2000);
  const [includeSystemInstruction, setIncludeSystemInstruction] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [expandedRiskRows, setExpandedRiskRows] = useState<Set<string>>(new Set());
  const [expandedLongReports, setExpandedLongReports] = useState<Set<string>>(new Set());

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

  const getMessages = () => {
    switch (mode) {
      case 'single':
        return singleMessages;
      case 'compare':
        return compareMessages;
      case 'orchestrate':
        return orchestrationMessages;
      case 'risk-short':
        return riskShortMessages;
      case 'risk-long':
        return riskLongMessages;
      default:
        return [];
    }
  };

  const setMessages = (messages: Message[]) => {
    switch (mode) {
      case 'single':
        setSingleMessages(messages);
        break;
      case 'compare':
        setCompareMessages(messages);
        break;
      case 'orchestrate':
        setOrchestrationMessages(messages);
        break;
      case 'risk-short':
        setRiskShortMessages(messages);
        break;
      case 'risk-long':
        setRiskLongMessages(messages);
        break;
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    const currentMessages = getMessages();
    setMessages([...currentMessages, userMessage]);
    setInput('');
    setIsProcessing(true);

    setTimeout(() => {
      if (mode === 'compare') {
        const responses = AI_MODELS.map((model, index) => ({
          id: (Date.now() + index + 1).toString(),
          role: 'assistant' as const,
          content: `This is a demo response from ${model.name}. In production, this would connect to the actual ${model.provider} API.`,
          model: model.id,
          timestamp: new Date()
        }));
        setMessages([...currentMessages, userMessage, ...responses]);
      } else {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'This is a demo response. In production, this would connect to actual LLM APIs.',
          model: mode === 'single' ? selectedModel : undefined,
          timestamp: new Date()
        };
        setMessages([...currentMessages, userMessage, assistantMessage]);
      }
      setIsProcessing(false);
    }, 1000);
  };

  const handleClearChat = () => {
    if (confirm('Are you sure you want to clear the chat history?')) {
      setMessages([]);
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
        return 'Ask all models the same question...';
      case 'orchestrate':
        return `Ask a question to be orchestrated by ${AI_MODELS.find(m => m.id === orchestratorModel)?.name}...`;
      case 'risk-short':
        return 'Enter a prompt to evaluate for safety risks (short, multi-judge)...';
      case 'risk-long':
        return 'Enter a prompt to evaluate for safety risks (long, single-judge)...';
      default:
        return 'Type your message...';
    }
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
    <div>
      <h3 className="font-semibold text-gray-900 mb-2">Compare Mode</h3>
      <p className="text-sm text-gray-600 mb-4">
        Your question will be sent to all three models simultaneously, and you can compare their responses side-by-side.
      </p>
      <div className="space-y-2">
        {AI_MODELS.map((model) => (
          <div
            key={model.id}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
          >
            <span className="text-xl">{model.icon}</span>
            <span className="font-medium text-gray-900">{model.name}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderOrchestrateSidebar = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-gray-900 mb-2">Compare & Orchestrate</h3>
        <p className="text-sm text-gray-600 mb-4">
          All three models will respond, then your selected orchestrator will combine them into one comprehensive answer.
        </p>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Orchestrator
          </label>
          <select
            value={orchestratorModel}
            onChange={(e) => setOrchestratorModel(e.target.value)}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-maroon focus:border-transparent"
          >
            {AI_MODELS.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-gray-700">
            <strong>{AI_MODELS.find(m => m.id === orchestratorModel)?.name}</strong> will synthesize responses from all models.
          </p>
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

  const renderRiskShortSidebar = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-gray-900 mb-2">Risk Evaluation (Short)</h3>
        <p className="text-sm text-gray-600 mb-4">
          Multiple AI judges will evaluate your prompt for safety risks using short, focused criteria. Faster but less detailed evaluation.
        </p>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900 mb-1">Multi-Judge Evaluation</p>
              <p className="text-xs text-red-700">
                All three models will independently assess the prompt against safety criteria.
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700 mb-2">Active Judges:</div>
          {AI_MODELS.map((model) => (
            <div
              key={model.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <span className="text-xl">{model.icon}</span>
              <div className="flex-1">
                <div className="font-medium text-gray-900 text-sm">{model.name}</div>
                <div className="text-xs text-gray-600">Independent Judge</div>
              </div>
            </div>
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

  const renderRiskLongSidebar = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-gray-900 mb-2">Risk Evaluation (Long)</h3>
        <p className="text-sm text-gray-600 mb-4">
          A single AI judge will provide a comprehensive, detailed evaluation of your prompt against extensive safety criteria.
        </p>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Judge Model
          </label>
          <select
            value={judgeModel}
            onChange={(e) => setJudgeModel(e.target.value)}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-maroon focus:border-transparent"
          >
            {AI_MODELS.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900 mb-1">Detailed Analysis</p>
              <p className="text-xs text-blue-700">
                <strong>{AI_MODELS.find(m => m.id === judgeModel)?.name}</strong> will provide comprehensive safety assessment.
              </p>
            </div>
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
      case 'orchestrate':
        return renderOrchestrateSidebar();
      case 'risk-short':
        return renderRiskShortSidebar();
      case 'risk-long':
        return renderRiskLongSidebar();
      default:
        return null;
    }
  };

  const renderCompareGrid = () => {
    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');

    const groupedByPrompt = userMessages.map((userMsg, index) => {
      const responsesForThisPrompt = assistantMessages.filter(
        (msg, idx) => Math.floor(idx / 3) === index
      );
      return {
        userMessage: userMsg,
        responses: responsesForThisPrompt
      };
    });

    return (
      <div className="space-y-6">
        {groupedByPrompt.map((group, groupIndex) => (
          <div key={group.userMessage.id} className="space-y-4">
            <div className="flex justify-end">
              <div className="flex gap-3 items-start max-w-2xl">
                <div className="bg-brand-maroon text-white rounded-2xl px-4 py-3">
                  <p className="whitespace-pre-wrap">{group.userMessage.content}</p>
                </div>
                <div className="w-8 h-8 bg-brand-yellow rounded-full flex items-center justify-center flex-shrink-0 font-bold text-gray-900">
                  {profile?.first_name?.[0]}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {AI_MODELS.map((model) => {
                const response = group.responses.find(r => r.model === model.id);
                return (
                  <div
                    key={model.id}
                    className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col"
                  >
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{model.icon}</span>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 text-sm">{model.name}</div>
                          <div className="text-xs text-gray-600">{model.provider}</div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        Latency: ~{Math.floor(Math.random() * 500 + 500)}ms
                      </div>
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto max-h-96">
                      {response ? (
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{response.content}</p>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center text-gray-400">
                            <Bot className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-xs">No response yet</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {AI_MODELS.map((model) => (
              <div
                key={model.id}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col"
              >
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{model.icon}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 text-sm">{model.name}</div>
                      <div className="text-xs text-gray-600">{model.provider}</div>
                    </div>
                  </div>
                </div>
                <div className="p-4 flex items-center justify-center h-32">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const toggleRiskRow = (id: string) => {
    setExpandedRiskRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleLongReport = (id: string) => {
    setExpandedLongReports((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const renderRiskShortResults = () => {
    const userMessages = messages.filter(m => m.role === 'user');

    return (
      <div className="space-y-6">
        {userMessages.map((userMsg, index) => {
          const mockResults = AI_MODELS.map((model, idx) => {
            const riskScore = Math.random() * 10;
            const riskLabel = riskScore < 3 ? 'Low Risk' : riskScore < 7 ? 'Medium Risk' : 'High Risk';
            const disagreement = idx === 0 ? 'Aligned' : Math.random() > 0.5 ? 'Aligned' : 'Divergent';

            return {
              id: `${userMsg.id}-${model.id}`,
              model,
              riskScore: riskScore.toFixed(1),
              riskLabel,
              labelColor: riskScore < 3 ? 'text-green-600 bg-green-50' : riskScore < 7 ? 'text-yellow-600 bg-yellow-50' : 'text-red-600 bg-red-50',
              disagreement,
              notes: `${model.name} evaluated the prompt against safety criteria including harmful content, bias, privacy concerns, and manipulation tactics. The assessment considered contextual appropriateness and potential misuse scenarios.`
            };
          });

          return (
            <div key={userMsg.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-brand-maroon" />
                  <h3 className="font-semibold text-gray-900">Risk Evaluation #{index + 1}</h3>
                </div>
                <p className="text-sm text-gray-600 mt-1">{userMsg.content}</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Model</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Risk Score</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Risk Label</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Disagreement</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {mockResults.map((result) => (
                      <>
                        <tr key={result.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{result.model.icon}</span>
                              <div>
                                <div className="font-medium text-gray-900 text-sm">{result.model.name}</div>
                                <div className="text-xs text-gray-500">{result.model.provider}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-semibold text-gray-900">{result.riskScore}/10</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${result.labelColor}`}>
                              {result.riskLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-sm ${result.disagreement === 'Aligned' ? 'text-green-600' : 'text-orange-600'}`}>
                              {result.disagreement}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => toggleRiskRow(result.id)}
                              className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              {expandedRiskRows.has(result.id) ? (
                                <ChevronUp className="w-5 h-5" />
                              ) : (
                                <ChevronDown className="w-5 h-5" />
                              )}
                            </button>
                          </td>
                        </tr>
                        {expandedRiskRows.has(result.id) && (
                          <tr>
                            <td colSpan={5} className="px-4 py-3 bg-gray-50">
                              <div className="text-sm text-gray-700">
                                <p className="font-medium mb-2">Judge Notes:</p>
                                <p className="text-gray-600">{result.notes}</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
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
              <span className="text-gray-600 font-medium">Evaluating prompt across multiple judges...</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderRiskLongResults = () => {
    const userMessages = messages.filter(m => m.role === 'user');

    return (
      <div className="space-y-6">
        {userMessages.map((userMsg, index) => {
          const mockReport = {
            id: `${userMsg.id}-report`,
            overallScore: (Math.random() * 10).toFixed(1),
            overallLabel: Math.random() < 0.3 ? 'Low Risk' : Math.random() < 0.7 ? 'Medium Risk' : 'High Risk',
            summary: 'After comprehensive analysis, the prompt shows moderate concerns regarding potential misuse in educational contexts. While the intent appears legitimate, certain phrasing could be interpreted ambiguously.',
            sections: [
              {
                title: 'Content Safety Analysis',
                content: 'The prompt contains no explicit harmful content, hate speech, or violence. However, it touches on sensitive topics that require careful handling in educational settings. The language is generally appropriate for academic discourse.'
              },
              {
                title: 'Bias and Fairness Evaluation',
                content: 'Analysis reveals minimal bias indicators. The prompt maintains a relatively neutral stance, though some implicit assumptions about audience knowledge level may affect accessibility. No significant fairness concerns detected.'
              },
              {
                title: 'Privacy and Security Considerations',
                content: 'The prompt does not request or imply collection of personal information. No security vulnerabilities identified in the query structure. Standard privacy guidelines are sufficient for this use case.'
              },
              {
                title: 'Manipulation and Misinformation Risk',
                content: 'Low to moderate risk of manipulation potential. The prompt structure could theoretically be adapted for misleading purposes, but current formulation shows legitimate educational intent. Recommend monitoring for context-specific adaptations.'
              },
              {
                title: 'Contextual Appropriateness',
                content: 'Highly appropriate for academic and educational environments. May require additional framing for public-facing applications. Consider audience maturity level and institutional guidelines.'
              },
              {
                title: 'Recommendations',
                content: '1. Add explicit educational framing\n2. Include content warnings if deploying to mixed audiences\n3. Monitor usage patterns for unexpected applications\n4. Implement standard content filtering for responses\n5. Document intended use cases for future reference'
              }
            ]
          };

          const labelColor = mockReport.overallLabel === 'Low Risk' ? 'text-green-600 bg-green-50' : mockReport.overallLabel === 'Medium Risk' ? 'text-yellow-600 bg-yellow-50' : 'text-red-600 bg-red-50';

          return (
            <div key={userMsg.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-brand-maroon" />
                    <h3 className="font-semibold text-gray-900">Detailed Risk Evaluation #{index + 1}</h3>
                  </div>
                  <button
                    onClick={() => toggleLongReport(mockReport.id)}
                    className="flex items-center gap-2 text-sm text-brand-maroon hover:text-red-800 font-medium"
                  >
                    {expandedLongReports.has(mockReport.id) ? (
                      <>
                        <span>Collapse Report</span>
                        <ChevronUp className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        <span>Expand Full Report</span>
                        <ChevronDown className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-3">{userMsg.content}</p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-700">Risk Score:</span>
                    <span className="text-lg font-bold text-gray-900">{mockReport.overallScore}/10</span>
                  </div>
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${labelColor}`}>
                    {mockReport.overallLabel}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="text-lg">{AI_MODELS.find(m => m.id === judgeModel)?.icon}</span>
                    <span>{AI_MODELS.find(m => m.id === judgeModel)?.name}</span>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4">
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Executive Summary</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">{mockReport.summary}</p>
                </div>

                {expandedLongReports.has(mockReport.id) && (
                  <div className="space-y-4 border-t border-gray-200 pt-4">
                    {mockReport.sections.map((section, idx) => (
                      <div key={idx} className="pb-4 border-b border-gray-100 last:border-0">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-gray-400" />
                          {section.title}
                        </h4>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{section.content}</p>
                      </div>
                    ))}
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
              <span className="text-gray-600 font-medium">Generating comprehensive risk evaluation...</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const messages = getMessages();
  const messageCount = messages.filter(m => m.role === 'user').length;

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
              Compare (One Prompt)
            </button>
            <button
              onClick={() => setMode('orchestrate')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                mode === 'orchestrate'
                  ? 'bg-brand-maroon text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Network className="w-4 h-4" />
              Compare & Orchestrate
            </button>
            <button
              onClick={() => setMode('risk-short')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                mode === 'risk-short'
                  ? 'bg-brand-maroon text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Users className="w-4 h-4" />
              Risk (Short, Multi-Judge)
            </button>
            <button
              onClick={() => setMode('risk-long')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                mode === 'risk-long'
                  ? 'bg-brand-maroon text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <User className="w-4 h-4" />
              Risk (Long, Single-Judge)
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
              {messages.length === 0 ? (
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
                    {mode === 'orchestrate' && (
                      <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-purple-700 rounded-3xl flex items-center justify-center shadow-lg">
                        <Network className="w-12 h-12 text-white" />
                      </div>
                    )}
                    {mode === 'risk-short' && (
                      <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-red-700 rounded-3xl flex items-center justify-center shadow-lg">
                        <Users className="w-12 h-12 text-white" />
                      </div>
                    )}
                    {mode === 'risk-long' && (
                      <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-700 rounded-3xl flex items-center justify-center shadow-lg">
                        <User className="w-12 h-12 text-white" />
                      </div>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {mode === 'single' && 'Start a conversation'}
                    {mode === 'compare' && 'Compare AI Responses'}
                    {mode === 'orchestrate' && 'Compare & Orchestrate'}
                    {mode === 'risk-short' && 'Risk Evaluation - Multi-Judge'}
                    {mode === 'risk-long' && 'Risk Evaluation - Single-Judge'}
                  </h2>
                  <p className="text-gray-600 max-w-md">
                    {mode === 'single' && `Chat with ${AI_MODELS.find(m => m.id === selectedModel)?.name}`}
                    {mode === 'compare' && 'Ask the same question to all models and compare their answers'}
                    {mode === 'orchestrate' && `Orchestrator: ${AI_MODELS.find(m => m.id === orchestratorModel)?.name}`}
                    {mode === 'risk-short' && 'Multiple judges will evaluate your prompt for safety risks'}
                    {mode === 'risk-long' && `${AI_MODELS.find(m => m.id === judgeModel)?.name} will provide detailed safety evaluation`}
                  </p>
                </div>
              ) : mode === 'compare' ? (
                <div className="max-w-7xl mx-auto">
                  {renderCompareGrid()}
                </div>
              ) : mode === 'risk-short' ? (
                <div className="max-w-6xl mx-auto">
                  {renderRiskShortResults()}
                </div>
              ) : mode === 'risk-long' ? (
                <div className="max-w-5xl mx-auto">
                  {renderRiskLongResults()}
                </div>
              ) : (
                <div className="max-w-4xl mx-auto space-y-4">
                  <div className="flex items-center gap-2 mb-4 p-3 bg-white rounded-lg border border-gray-200">
                    <span className="text-2xl">
                      {mode === 'single' && AI_MODELS.find(m => m.id === selectedModel)?.icon}
                      {mode === 'orchestrate' && AI_MODELS.find(m => m.id === orchestratorModel)?.icon}
                    </span>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {mode === 'single' && AI_MODELS.find(m => m.id === selectedModel)?.name}
                        {mode === 'orchestrate' && 'Compare & Orchestrate'}
                      </div>
                      <div className="text-sm text-gray-600">{messageCount} evaluations</div>
                    </div>
                  </div>

                  {messages.map((message) => (
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
