'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, Profile } from '@/lib/supabase';
import StudentLayout from '@/components/StudentLayout';
import {
  Bot,
  Send,
  Trash2,
  Settings as SettingsIcon,
  MessageSquare,
  RefreshCw,
  ArrowLeftRight,
  Network
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

type Mode = 'single' | 'compare' | 'orchestration';

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
  const [singleMessages, setSingleMessages] = useState<Message[]>([]);
  const [compareMessages, setCompareMessages] = useState<Message[]>([]);
  const [orchestrationMessages, setOrchestrationMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

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
      case 'orchestration':
        return orchestrationMessages;
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
      case 'orchestration':
        setOrchestrationMessages(messages);
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
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'This is a demo response. In production, this would connect to actual LLM APIs.',
        model: mode === 'single' ? selectedModel : undefined,
        timestamp: new Date()
      };
      setMessages([...currentMessages, userMessage, assistantMessage]);
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
      case 'orchestration':
        return `Ask a question to be orchestrated by ${AI_MODELS.find(m => m.id === orchestratorModel)?.name}...`;
      default:
        return 'Type your message...';
    }
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

        <div className="flex gap-4 px-6 py-3 bg-gray-50 border-b">
          <button
            onClick={() => setMode('single')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-medium transition-all ${
              mode === 'single'
                ? 'bg-brand-maroon text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Single Model
          </button>
          <button
            onClick={() => setMode('compare')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-medium transition-all ${
              mode === 'compare'
                ? 'bg-brand-maroon text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            Compare Models
          </button>
          <button
            onClick={() => setMode('orchestration')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-medium transition-all ${
              mode === 'orchestration'
                ? 'bg-brand-maroon text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            <Network className="w-4 h-4" />
            Orchestration
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
            <div className="p-4 space-y-4">
              {mode === 'single' && (
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
              )}

              {mode === 'compare' && (
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
              )}

              {mode === 'orchestration' && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Orchestration Mode</h3>
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
              )}

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
                        <RefreshCw className="w-12 h-12 text-white" />
                      </div>
                    )}
                    {mode === 'orchestration' && (
                      <div className="relative">
                        <div className="flex gap-2">
                          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl shadow-lg">
                            😊
                          </div>
                          <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white text-xl shadow-lg">
                            😎
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {mode === 'single' && 'Start a conversation'}
                    {mode === 'compare' && 'Compare AI Responses'}
                    {mode === 'orchestration' && 'Orchestrated AI Response'}
                  </h2>
                  <p className="text-gray-600 max-w-md">
                    {mode === 'single' && `Chat with ${AI_MODELS.find(m => m.id === selectedModel)?.name}`}
                    {mode === 'compare' && 'Ask the same question to all models and compare their answers'}
                    {mode === 'orchestration' && `Orchestrator: ${AI_MODELS.find(m => m.id === orchestratorModel)?.name}`}
                  </p>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto space-y-4">
                  <div className="flex items-center gap-2 mb-4 p-3 bg-white rounded-lg border border-gray-200">
                    <span className="text-2xl">
                      {AI_MODELS.find(m => m.id === (mode === 'single' ? selectedModel : orchestratorModel))?.icon}
                    </span>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {mode === 'single' && AI_MODELS.find(m => m.id === selectedModel)?.name}
                        {mode === 'compare' && 'Compare All Models'}
                        {mode === 'orchestration' && 'Orchestration Mode'}
                      </div>
                      <div className="text-sm text-gray-600">{messageCount} messages</div>
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
                          {profile.first_name[0]}
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
