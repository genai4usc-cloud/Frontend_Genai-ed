'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import StudentLayout from '@/components/StudentLayout';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft,
  MessageSquare,
  Send,
  CheckSquare,
  Clock,
  User
} from 'lucide-react';

interface Lecture {
  id: string;
  title: string;
  description: string;
  video_url: string | null;
  duration: number;
  course_id: string;
  status: string;
}

interface Course {
  code: string;
  title: string;
  instructor_name: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function StudentLectureViewer() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;
  const lectureId = params.lectureId as string;

  const [loading, setLoading] = useState(true);
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState('');
  const [sending, setSending] = useState(false);

  const [contextSources, setContextSources] = useState({
    syllabus: true,
    courseMaterials: true,
    lectureTranscript: true,
    studentUploads: false
  });

  useEffect(() => {
    loadLectureData();
  }, [lectureId]);

  const loadLectureData = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/student/login');
      return;
    }

    const { data: lectureData } = await supabase
      .from('lectures')
      .select(`
        *,
        courses (
          code,
          title,
          instructor_name
        )
      `)
      .eq('id', lectureId)
      .maybeSingle();

    if (!lectureData) {
      router.push('/student/dashboard');
      return;
    }

    setLecture(lectureData);
    setCourse(lectureData.courses as unknown as Course);

    const { data: viewData } = await supabase
      .from('student_lecture_views')
      .select('id')
      .eq('student_id', user.id)
      .eq('lecture_id', lectureId)
      .maybeSingle();

    if (!viewData) {
      await supabase
        .from('student_lecture_views')
        .insert({
          student_id: user.id,
          lecture_id: lectureId,
          duration_watched: 0,
          completed: false
        });
    }

    setLoading(false);
  };

  const handleSendMessage = async () => {
    if (!prompt.trim() || sending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt
    };

    setMessages([...messages, userMessage]);
    setPrompt('');
    setSending(true);

    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I understand you're asking about "${userMessage.content}". Based on the lecture content and course materials, here's my response...`
      };
      setMessages(prev => [...prev, assistantMessage]);
      setSending(false);
    }, 1500);
  };

  if (loading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-brand-maroon border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading lecture...</p>
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (!lecture || !course) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-muted-foreground">Lecture not found</p>
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="h-full flex flex-col">
        <div className="bg-card border-b border-border px-6 py-4">
          <button
            onClick={() => router.push(`/student/course/${courseId}`)}
            className="flex items-center gap-2 text-brand-maroon hover:text-brand-maroon-hover transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Course
          </button>
          <h1 className="text-2xl font-bold text-foreground mb-1">{lecture.title}</h1>
          <p className="text-muted-foreground">
            {course.code} • {course.instructor_name}
          </p>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-0">
            <div className="bg-background border-r border-border p-6 overflow-y-auto">
              <div className="max-w-3xl mx-auto space-y-6">
                {lecture.status === 'generating' ? (
                  <div className="aspect-video bg-card border border-border rounded-xl flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 border-4 border-brand-maroon border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Generating lecture video...</p>
                    </div>
                  </div>
                ) : lecture.video_url ? (
                  <div className="aspect-video bg-black rounded-xl overflow-hidden">
                    <video
                      controls
                      className="w-full h-full"
                      src={lecture.video_url}
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                ) : (
                  <div className="aspect-video bg-card border border-border rounded-xl flex items-center justify-center">
                    <p className="text-muted-foreground">No video available</p>
                  </div>
                )}

                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center gap-4 mb-4 pb-4 border-b border-border">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">{lecture.duration} min</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span className="text-sm">{course.instructor_name}</span>
                    </div>
                  </div>

                  <h3 className="font-bold text-foreground mb-2">About this lecture</h3>
                  <p className="text-muted-foreground">{lecture.description || 'No description available.'}</p>
                </div>
              </div>
            </div>

            <div className="bg-card flex flex-col h-full">
              <div className="p-6 border-b border-border">
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Chat with AI
                </h2>

                <div className="space-y-3 mb-4">
                  <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <CheckSquare className="w-4 h-4" />
                    Context Sources
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={contextSources.syllabus}
                        onChange={(e) => setContextSources({ ...contextSources, syllabus: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-brand-maroon focus:ring-brand-maroon"
                      />
                      <span className="text-foreground">Syllabus</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={contextSources.courseMaterials}
                        onChange={(e) => setContextSources({ ...contextSources, courseMaterials: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-brand-maroon focus:ring-brand-maroon"
                      />
                      <span className="text-foreground">Materials</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={contextSources.lectureTranscript}
                        onChange={(e) => setContextSources({ ...contextSources, lectureTranscript: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-brand-maroon focus:ring-brand-maroon"
                      />
                      <span className="text-foreground">Transcript</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={contextSources.studentUploads}
                        onChange={(e) => setContextSources({ ...contextSources, studentUploads: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-brand-maroon focus:ring-brand-maroon"
                      />
                      <span className="text-foreground">My Uploads</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Ask questions about this lecture</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-xl px-4 py-3 ${
                          message.role === 'user'
                            ? 'bg-brand-maroon text-white'
                            : 'bg-accent text-foreground'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                      </div>
                    </div>
                  ))
                )}
                {sending && (
                  <div className="flex justify-start">
                    <div className="bg-accent rounded-xl px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-border">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask a question about this lecture..."
                    className="flex-1 px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-brand-maroon focus:border-transparent bg-background text-foreground"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!prompt.trim() || sending}
                    className="bg-brand-maroon hover:bg-brand-maroon-hover text-white p-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
