'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import StudentLayout from '@/components/StudentLayout';
import LectureCard from '@/components/LectureCard';
import { supabase, Profile } from '@/lib/supabase';
import {
  BookOpen,
  MessageSquare,
  Upload,
  FileText,
  Trash2,
  Send,
  Video,
  CheckSquare
} from 'lucide-react';

interface Course {
  id: string;
  course_number: string;
  title: string;
  instructor_name: string;
  semester: string;
  syllabus_url: string | null;
}

interface Lecture {
  id: string;
  title: string;
  duration: number;
  created_at: string;
  status: string;
}

interface StudentLecture {
  id: string;
  title: string;
  duration: number;
  created_at: string;
  status: string;
}

interface Upload {
  id: string;
  file_name: string;
  file_size: number;
  created_at: string;
}

export default function StudentCourse() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<'lectures' | 'chat' | 'uploads'>('lectures');
  const [course, setCourse] = useState<Course | null>(null);
  const [courseLectures, setCourseLectures] = useState<Lecture[]>([]);
  const [myLectures, setMyLectures] = useState<StudentLecture[]>([]);
  const [uploads, setUploads] = useState<Upload[]>([]);

  const [contextSources, setContextSources] = useState({
    syllabus: true,
    courseMaterials: true,
    studentUploads: true
  });
  const [prompt, setPrompt] = useState('');
  const [videoLength, setVideoLength] = useState(5);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    checkAuthAndLoadData();
  }, [courseId]);

  const checkAuthAndLoadData = async () => {
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
      router.push('/');
      return;
    }

    setProfile(profileData);
    await loadCourseData(user.email!, user.id);
  };

  const loadCourseData = async (email: string, userId: string) => {
    const { data: enrollment } = await supabase
      .from('course_students')
      .select('course_id')
      .eq('email', email)
      .eq('course_id', courseId)
      .maybeSingle();

    if (!enrollment) {
      router.push('/student/dashboard');
      return;
    }

    const { data: courseData } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .maybeSingle();

    if (courseData) {
      setCourse(courseData);
    }

    const { data: lectureCourses } = await supabase
      .from('lecture_courses')
      .select(`
        lecture_id,
        lectures!inner(id, title, video_length, created_at, status, creator_role, creator_user_id)
      `)
      .eq('course_id', courseId);

    if (lectureCourses) {
      const educatorLectures: Lecture[] = [];
      const studentLectures: StudentLecture[] = [];

      lectureCourses.forEach((lc: any) => {
        const lecture = lc.lectures;
        if (!lecture) return;

        const formattedLecture = {
          id: lecture.id,
          title: lecture.title,
          duration: lecture.video_length || 0,
          created_at: lecture.created_at,
          status: lecture.status
        };

        if (lecture.creator_role === 'educator') {
          educatorLectures.push(formattedLecture);
        } else if (lecture.creator_role === 'student' && lecture.creator_user_id === userId) {
          studentLectures.push(formattedLecture);
        }
      });

      educatorLectures.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      studentLectures.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setCourseLectures(educatorLectures);
      setMyLectures(studentLectures);
    }

    const { data: uploadsData } = await supabase
      .from('student_uploads')
      .select('*')
      .eq('student_id', userId)
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });

    if (uploadsData) {
      setUploads(uploadsData);
    }

    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: uploadData, error } = await supabase
      .from('student_uploads')
      .insert({
        student_id: user.id,
        course_id: courseId,
        file_name: file.name,
        file_url: 'placeholder_url',
        file_size: file.size
      })
      .select()
      .single();

    if (!error && uploadData) {
      setUploads([uploadData, ...uploads]);
    }
  };

  const handleDeleteUpload = async (uploadId: string) => {
    await supabase
      .from('student_uploads')
      .delete()
      .eq('id', uploadId);

    setUploads(uploads.filter(u => u.id !== uploadId));
  };

  const handleGenerateLecture = async () => {
    if (!prompt.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setGenerating(true);

    const { data: newLecture, error } = await supabase
      .from('lectures')
      .insert({
        creator_role: 'student',
        creator_user_id: user.id,
        educator_id: user.id,
        course_id: courseId,
        title: prompt.slice(0, 100),
        script_prompt: prompt,
        video_length: videoLength,
        status: 'generating'
      })
      .select()
      .single();

    setGenerating(false);

    if (!error && newLecture) {
      router.push(`/student/course/${courseId}/my/lecture/${newLecture.id}`);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return `${Math.floor(diffInDays / 7)} weeks ago`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-maroon border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading course...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <StudentLayout profile={profile}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-gray-600">Course not found</p>
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout profile={profile}>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {course.course_number}: {course.title}
              </h1>
              <p className="text-muted-foreground">
                {course.instructor_name} • {course.semester}
              </p>
            </div>
          </div>
        </div>

        <div className="border-b border-border">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('lectures')}
              className={`pb-3 px-2 font-medium transition-colors relative ${
                activeTab === 'lectures'
                  ? 'text-brand-maroon after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-brand-maroon'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <BookOpen className="w-5 h-5 inline mr-2" />
              Lectures
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`pb-3 px-2 font-medium transition-colors relative ${
                activeTab === 'chat'
                  ? 'text-brand-maroon after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-brand-maroon'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <MessageSquare className="w-5 h-5 inline mr-2" />
              Course Chat
            </button>
            <button
              onClick={() => setActiveTab('uploads')}
              className={`pb-3 px-2 font-medium transition-colors relative ${
                activeTab === 'uploads'
                  ? 'text-brand-maroon after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-brand-maroon'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Upload className="w-5 h-5 inline mr-2" />
              My Uploads
            </button>
          </div>
        </div>

        {activeTab === 'lectures' && (
          <div className="space-y-8">
            <section>
              <h2 className="text-xl font-bold text-foreground mb-4">Course Lectures</h2>
              {courseLectures.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {courseLectures.map((lecture) => (
                    <LectureCard
                      key={lecture.id}
                      title={lecture.title}
                      courseCode={course.course_number}
                      instructorName={course.instructor_name}
                      duration={lecture.duration}
                      createdAt={formatTimeAgo(lecture.created_at)}
                      isEducatorLecture={true}
                      onClick={() => router.push(`/student/course/${courseId}/lecture/${lecture.id}`)}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-card border border-border rounded-xl p-12 text-center">
                  <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No lectures available yet</p>
                </div>
              )}
            </section>

            <section>
              <h2 className="text-xl font-bold text-foreground mb-4">My Generated Lectures</h2>
              {myLectures.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myLectures.map((lecture) => (
                    <LectureCard
                      key={lecture.id}
                      title={lecture.title}
                      courseCode={course.course_number}
                      instructorName="You"
                      duration={lecture.duration}
                      createdAt={formatTimeAgo(lecture.created_at)}
                      status={lecture.status}
                      onClick={() => router.push(`/student/course/${courseId}/my/lecture/${lecture.id}`)}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-card border border-border rounded-xl p-12 text-center">
                  <Video className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">You haven't generated any lectures yet</p>
                  <button
                    onClick={() => setActiveTab('chat')}
                    className="bg-brand-maroon hover:bg-brand-maroon-hover text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    Generate Your First Lecture
                  </button>
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <CheckSquare className="w-5 h-5" />
                Context Sources
              </h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={contextSources.syllabus}
                    onChange={(e) => setContextSources({ ...contextSources, syllabus: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-brand-maroon focus:ring-brand-maroon"
                  />
                  <span className="text-foreground">Course Syllabus</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={contextSources.courseMaterials}
                    onChange={(e) => setContextSources({ ...contextSources, courseMaterials: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-brand-maroon focus:ring-brand-maroon"
                  />
                  <span className="text-foreground">Course Materials</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={contextSources.studentUploads}
                    onChange={(e) => setContextSources({ ...contextSources, studentUploads: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-brand-maroon focus:ring-brand-maroon"
                  />
                  <span className="text-foreground">My Uploaded Documents ({uploads.length})</span>
                </label>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Document
              </h3>
              <label className="block">
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-yellow file:text-brand-maroon hover:file:bg-brand-yellow-hover cursor-pointer"
                  accept=".pdf,.doc,.docx,.txt"
                />
              </label>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <h3 className="font-bold text-foreground mb-4">Generate Content</h3>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Prompt
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="What would you like to learn about?"
                  className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-brand-maroon focus:border-transparent bg-background text-foreground min-h-[120px]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Video Length (minutes)
                </label>
                <select
                  value={videoLength}
                  onChange={(e) => setVideoLength(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-brand-maroon focus:border-transparent bg-background text-foreground"
                >
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={20}>20 minutes</option>
                  <option value={30}>30 minutes</option>
                </select>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleGenerateLecture}
                  disabled={!prompt.trim() || generating}
                  className="flex-1 bg-brand-maroon hover:bg-brand-maroon-hover text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Video className="w-5 h-5" />
                  {generating ? 'Generating...' : 'Generate Video Lecture'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'uploads' && (
          <div>
            {uploads.length > 0 ? (
              <div className="space-y-3">
                {uploads.map((upload) => (
                  <div
                    key={upload.id}
                    className="bg-card border border-border rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-brand-yellow/10 p-3 rounded-lg">
                        <FileText className="w-6 h-6 text-brand-maroon" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">{upload.file_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(upload.file_size)} • {formatTimeAgo(upload.created_at)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteUpload(upload.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl p-12 text-center">
                <Upload className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No uploaded documents yet</p>
                <button
                  onClick={() => setActiveTab('chat')}
                  className="bg-brand-maroon hover:bg-brand-maroon-hover text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Upload Your First Document
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
