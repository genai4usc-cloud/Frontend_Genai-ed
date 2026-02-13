'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, Profile, Course } from '@/lib/supabase';
import EducatorLayout from '@/components/EducatorLayout';
import {
  Check, ChevronDown, ChevronUp, FileText, Upload,
  Users, Info, AlertCircle, X, Wand2, Eye, FileCheck, Download
} from 'lucide-react';
import { uploadFile } from '@/lib/fileUpload';

const base = process.env.NEXT_PUBLIC_BACKEND_BASE;

interface QuizBatch {
  id: string;
  educator_id: string;
  status: string;
  mode: string | null;
  mcq_count: number;
  short_answer_count: number;
  fixed_mcq_answer_key_enabled: boolean;
  fixed_mcq_answer_key: string[] | null;
  additional_instructions: string | null;
  quiz_name: string | null;
  saved_at: string | null;
  created_at: string;
}

interface Student {
  enrollment_id: string;
  student_id: string | null;
  email: string;
  course_id: string;
  first_name?: string;
  last_name?: string;
}

interface LectureMaterial {
  id: string;
  source_course_id: string;
  material_name: string;
  material_type: string;
  material_url: string;
  storage_path: string;
  course_number?: string;
  course_title?: string;
}

interface StudentFile {
  course_student_id: string | null;
  file_name: string;
  file_url: string;
  storage_path: string;
}

interface GeneratedQuiz {
  id: string;
  quiz_batch_id: string;
  student_id: string;
  student_file_url: string;
  student_file_name: string;
  mcq_count: number;
  short_answer_count: number;
  quiz_content_json: any;
  answers_content_json: any;
  quiz_pdf_url: string | null;
  answers_pdf_url: string | null;
  student_name?: string;
}

export default function CreateQuiz() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [quizBatchId, setQuizBatchId] = useState<string | null>(null);
  const [quizBatch, setQuizBatch] = useState<QuizBatch | null>(null);

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());

  const [courseMode, setCourseMode] = useState<string | null>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [studentFiles, setStudentFiles] = useState<Map<string, StudentFile>>(new Map());
  const [lectureMaterials, setLectureMaterials] = useState<LectureMaterial[]>([]);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<Set<string>>(new Set());
  const [uploadingStudent, setUploadingStudent] = useState<string | null>(null);

  const [mcqCount, setMcqCount] = useState(5);
  const [shortAnswerCount] = useState(0);
  const [useFixedAnswerKey, setUseFixedAnswerKey] = useState(false);
  const [answerKey, setAnswerKey] = useState<string[]>([]);

  const [additionalInstructions, setAdditionalInstructions] = useState('');

  const [generatedQuizzes, setGeneratedQuizzes] = useState<GeneratedQuiz[]>([]);
  const [generating, setGenerating] = useState(false);

  const [quizName, setQuizName] = useState('');
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  const [expandedStep, setExpandedStep] = useState(1);

  const [quizSettingsSaved, setQuizSettingsSaved] = useState(false);
  const [promptSaved, setPromptSaved] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (profile) {
      loadCourses();
      loadOrCreateBatch();
    }
  }, [profile]);

  useEffect(() => {
    if (selectedCourseIds.size > 0 && quizBatchId) {
      loadStudentsForCourses();
      loadMaterialsForCourses();
    }
  }, [selectedCourseIds, quizBatchId]);

  useEffect(() => {
    if (useFixedAnswerKey) {
      setAnswerKey(Array(mcqCount).fill('A'));
    } else {
      setAnswerKey([]);
    }
  }, [useFixedAnswerKey, mcqCount]);

  useEffect(() => {
    if (quizBatchId && quizBatch?.status === 'generated') {
      loadGeneratedQuizzes();
    }
  }, [quizBatchId, quizBatch?.status]);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/educator/login');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!profileData || profileData.role !== 'educator') {
        await supabase.auth.signOut();
        router.push('/educator/login');
        return;
      }

      setProfile(profileData);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = async () => {
    const { data } = await supabase
      .from('courses')
      .select('*')
      .eq('educator_id', profile!.id)
      .order('created_at', { ascending: false });

    if (data) {
      setCourses(data);
    }
  };

  const loadOrCreateBatch = async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const { data: existingBatch } = await supabase
      .from('quiz_batches')
      .select('*')
      .eq('educator_id', profile!.id)
      .eq('status', 'draft')
      .gte('created_at', twoHoursAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingBatch) {
      setQuizBatchId(existingBatch.id);
      setQuizBatch(existingBatch);
      await loadBatchData(existingBatch.id, existingBatch);
    } else {
      const { data, error } = await supabase
        .from('quiz_batches')
        .insert({ educator_id: profile!.id, status: 'draft' })
        .select()
        .single();

      if (error) {
        console.error('Failed to create batch:', error);
        return;
      }

      setQuizBatchId(data.id);
      setQuizBatch(data);
      setCourseMode(null);
      setSelectedCourseIds(new Set());
      setSelectedMaterialIds(new Set());
      setStudentFiles(new Map());
      setStudents([]);
      setMcqCount(5);
      setUseFixedAnswerKey(false);
      setAnswerKey([]);
      setAdditionalInstructions('');
      setQuizName('');
      setQuizSettingsSaved(false);
      setPromptSaved(false);
      setExpandedStep(1);
    }
  };

  const loadBatchData = async (batchId: string, batch: QuizBatch) => {
    setCourseMode(batch.mode);
    setMcqCount(batch.mcq_count || 5);
    setUseFixedAnswerKey(batch.fixed_mcq_answer_key_enabled || false);
    setAnswerKey(batch.fixed_mcq_answer_key || []);
    setAdditionalInstructions(batch.additional_instructions || '');
    setQuizName(batch.quiz_name || '');

    const { data: batchCourses } = await supabase
      .from('quiz_batch_courses')
      .select('course_id')
      .eq('quiz_batch_id', batchId);

    if (batchCourses && batchCourses.length > 0) {
      setSelectedCourseIds(new Set(batchCourses.map(bc => bc.course_id)));
    }

    const { data: batchMaterials } = await supabase
      .from('quiz_batch_materials')
      .select('lecture_material_id')
      .eq('quiz_batch_id', batchId);

    if (batchMaterials && batchMaterials.length > 0) {
      setSelectedMaterialIds(new Set(batchMaterials.map(bm => bm.lecture_material_id)));
    }

    await loadStudentFilesForBatch(batchId);
  };

  const loadStudentFilesForBatch = async (batchId: string) => {
    const { data: files, error } = await supabase
      .from('quiz_batch_student_files')
      .select('course_student_id, student_id, file_name, file_url, storage_path')
      .eq('quiz_batch_id', batchId);

    if (error) {
      console.error('Error loading batch student files:', error);
      setStudentFiles(new Map());
      return;
    }

    const filesMap = new Map<string, StudentFile>();
    (files || []).forEach((f: any) => {
      const key = f.course_student_id ?? f.student_id; // <--- important
      if (!key) return;
    
      filesMap.set(key, {
        course_student_id: f.course_student_id,
        file_name: f.file_name,
        file_url: f.file_url,
        storage_path: f.storage_path,
      });
    });
    setStudentFiles(filesMap);


  const loadGeneratedQuizzes = async () => {
    if (!quizBatchId) return;

    const { data } = await supabase
      .from('quiz_generated')
      .select('*')
      .eq('quiz_batch_id', quizBatchId);

    if (data) {
      const enrichedQuizzes = await Promise.all(
        data.map(async (quiz) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', quiz.student_id)
            .maybeSingle();

          return {
            ...quiz,
            student_name: profileData
              ? `${profileData.first_name} ${profileData.last_name}`
              : quiz.student_id === profile?.id ? 'Educator' : 'Student',
          };
        })
      );

      setGeneratedQuizzes(enrichedQuizzes);
    }
  };

  const createBatch = async () => {
    const { data, error } = await supabase
      .from('quiz_batches')
      .insert({
        educator_id: profile!.id,
        status: 'draft',
      })
      .select()
      .single();

    if (data && !error) {
      setQuizBatchId(data.id);
      setQuizBatch(data);
      return data.id;
    }
    return null;
  };

  const handleCourseToggle = async (courseId: string) => {
    let batchId = quizBatchId;
    if (!batchId) {
      batchId = await createBatch();
      if (!batchId) return;
    }

    const newSelected = new Set(selectedCourseIds);

    if (newSelected.has(courseId)) {
      newSelected.delete(courseId);
      await supabase
        .from('quiz_batch_courses')
        .delete()
        .eq('quiz_batch_id', batchId)
        .eq('course_id', courseId);
    } else {
      newSelected.add(courseId);
      await supabase
        .from('quiz_batch_courses')
        .insert({
          quiz_batch_id: batchId,
          course_id: courseId,
        });
    }

    setSelectedCourseIds(newSelected);
  };

  const handleContinueToStep2 = () => {
    if (selectedCourseIds.size > 0) {
      setExpandedStep(2);
    }
  };

  const handleSelectCourseType = async (mode: string) => {
    if (!quizBatchId) return;

    setCourseMode(mode);
    await supabase
      .from('quiz_batches')
      .update({ mode })
      .eq('id', quizBatchId);
  };

  const handleContinueToStep3 = () => {
    if (courseMode) {
      setExpandedStep(3);
    }
  };

  const loadStudentsForCourses = async () => {
    const courseIds = Array.from(selectedCourseIds);

    console.log('loadStudentsForCourses courseIds:', courseIds);

    const { data, error } = await supabase
      .from('course_students')
      .select(`
        id,
        course_id,
        student_id,
        email,
        student_profile:profiles!course_students_student_id_fkey!left (
          first_name,
          last_name
        )
      `)
      .in('course_id', courseIds);

    
    console.log("RAW course_students:", { data, error });


    console.log('loadStudentsForCourses result:', { data, error });

    if (error) {
      console.error('Error loading students:', error);
      return;
    }

    if (!data) {
      setStudents([]);
      return;
    }

    const uniqueStudents = new Map<string, Student>();

    (data || []).forEach((row: any) => {
      const enrollmentId = row.id as string;
      if (!enrollmentId) return;

      if (!uniqueStudents.has(enrollmentId)) {
        uniqueStudents.set(enrollmentId, {
          enrollment_id: enrollmentId,
          student_id: row.student_id ?? null,
          email: row.email,
          course_id: row.course_id,
          first_name: row.student_profile?.first_name ?? undefined,
          last_name: row.student_profile?.last_name ?? undefined,
        });
      }
    });

    const studentsList = Array.from(uniqueStudents.values());
    const registered = studentsList.filter(s => !!s.student_id);
    setStudents(studentsList);

    if (quizBatchId) {
      await supabase
        .from('quiz_batch_students')
        .delete()
        .eq('quiz_batch_id', quizBatchId);
      

      if (studentsList.length > 0) {
        await supabase
          .from('quiz_batch_students')
          .insert(
              registered.map((s) => ({
                quiz_batch_id: quizBatchId,
                student_id: s.student_id,
            }))
          );
      }
    }
  };

  const loadMaterialsForCourses = async () => {
    const courseIds = Array.from(selectedCourseIds);
    const { data: materials } = await supabase
      .from('lecture_materials')
      .select('id, source_course_id, material_name, material_type, material_url, storage_path')
      .in('source_course_id', courseIds)
      .order('created_at', { ascending: false });

    if (materials) {
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, course_number, title')
        .in('id', courseIds);

      const courseMap = new Map(coursesData?.map(c => [c.id, c]) || []);

      const enrichedMaterials = materials.map(m => ({
        ...m,
        course_number: courseMap.get(m.source_course_id)?.course_number,
        course_title: courseMap.get(m.source_course_id)?.title,
      }));

      setLectureMaterials(enrichedMaterials);
    }
  };

  const handleMaterialToggle = async (materialId: string) => {
    if (!quizBatchId) return;

    const newSelected = new Set(selectedMaterialIds);

    if (newSelected.has(materialId)) {
      newSelected.delete(materialId);
      await supabase
        .from('quiz_batch_materials')
        .delete()
        .eq('quiz_batch_id', quizBatchId)
        .eq('lecture_material_id', materialId);
    } else {
      newSelected.add(materialId);
      await supabase
        .from('quiz_batch_materials')
        .insert({
          quiz_batch_id: quizBatchId,
          lecture_material_id: materialId,
        });
    }

    setSelectedMaterialIds(newSelected);
  };

  const handleFileUpload = async (
      courseStudentId: string | null,
      studentId: string,
      file: File
    ) => {
    if (!quizBatchId) return;

    const mapKey = courseStudentId ?? studentId;
    setUploadingStudent(mapKey);

    try {
      const storagePath = `quiz-student-files/${quizBatchId}/${studentId}/${file.name}`;
      const { url, error } = await uploadFile(file, storagePath, 'quiz-student-materials');

      if (error || !url) {
        console.error('Upload error:', error);
        alert('Failed to upload file');
        return;
      }

      await supabase
        .from('quiz_batch_student_files')
        .upsert(
          {
            quiz_batch_id: quizBatchId,
            student_id: studentId,              // ✅ REQUIRED for backend matching
            course_student_id: courseStudentId, // ✅ keep for traceability (nullable)
            file_name: file.name,
            file_url: url,
            storage_path: storagePath,
            file_mime: file.type,
            file_size_bytes: file.size,
          },
          { onConflict: 'quiz_batch_id,student_id' } // ✅ if you have this unique constraint
        );

      const newFiles = new Map(studentFiles);
      newFiles.set(mapKey, {
        course_student_id: courseStudentId,
        file_name: file.name,
        file_url: url,
        storage_path: storagePath,
      });
      setStudentFiles(newFiles);
    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to upload file');
    } finally {
      setUploadingStudent(null);
    }
  };

  const handleContinueToStep4 = () => {
    if (studentFiles.size > 0 || selectedMaterialIds.size > 0) {
      setExpandedStep(4);
    }
  };

  const handleSaveQuizSettings = async () => {
    if (!quizBatchId) return;

    setSaving(true);
    try {
      await supabase
        .from('quiz_batches')
        .update({
          mcq_count: mcqCount,
          short_answer_count: shortAnswerCount,
          fixed_mcq_answer_key_enabled: useFixedAnswerKey,
          fixed_mcq_answer_key: useFixedAnswerKey ? answerKey : null,
        })
        .eq('id', quizBatchId);

      setQuizSettingsSaved(true);
      setExpandedStep(5);
    } catch (error) {
      console.error('Error saving quiz settings:', error);
      alert('Failed to save quiz settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAdditionalInstructions = async () => {
    if (!quizBatchId) return;

    setSaving(true);
    try {
      await supabase
        .from('quiz_batches')
        .update({
          additional_instructions: additionalInstructions || null,
        })
        .eq('id', quizBatchId);

      setPromptSaved(true);
      setExpandedStep(6);
    } catch (error) {
      console.error('Error saving instructions:', error);
      alert('Failed to save instructions');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateQuizzes = async () => {
    // If no preloaded materials are selected, every registered student in the batch must have an upload
    if (selectedMaterialIds.size === 0) {
      const missing = students
        .filter(s => !!s.student_id)
        .filter(s => !studentFiles.has(s.enrollment_id)); // because your UI map is keyed by enrollment_id
    
      if (missing.length > 0) {
        alert(
          "Missing uploads for:\n" +
          missing.map(s => s.email).join("\n") +
          "\n\nUpload a file for them OR select at least one preloaded material."
        );
        return;
      }
    }

    if (!quizBatchId) return;

    setGenerating(true);
    try {
    const response = await fetch(`${base}/api/educator/quiz/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quizBatchId }),
    });
    
    if (!response.ok) {
      const text = await response.text(); // <-- IMPORTANT
      console.error("Generate failed:", response.status, text);
      throw new Error(text);
    }


      const data = await response.json();
      setGeneratedQuizzes(data.quizzes);

      await supabase
        .from('quiz_batches')
        .update({ status: 'generated' })
        .eq('id', quizBatchId);

      const updatedBatch = { ...quizBatch!, status: 'generated' };
      setQuizBatch(updatedBatch);
    } catch (error) {
      console.error('Error generating quizzes:', error);
      alert('Failed to generate quizzes');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveQuiz = async () => {
    if (!quizBatchId) return;

    setSaving(true);
    try {
      await supabase
        .from('quiz_batches')
        .update({
          quiz_name: quizName || null,
          status: 'saved',
          saved_at: new Date().toISOString(),
        })
        .eq('id', quizBatchId);

      alert('Quiz saved successfully!');
      router.push('/educator/dashboard');
    } catch (error) {
      console.error('Error saving quiz:', error);
      alert('Failed to save quiz');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async (type: string) => {
    if (!quizBatchId) return;

    try {
      const response = await fetch(
        `${base}/api/educator/quiz/download?quizBatchId=${quizBatchId}&type=${type}`
      );

      if (!response.ok) {
        throw new Error('Failed to download');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quiz-${type}-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading:', error);
      alert('Failed to download files');
    }
  };

  const calculateTargetCount = () => {
    let count = 0;
    studentFiles.forEach((file, courseStudentId) => {
      if (courseStudentId !== profile?.id) {
        count++;
      }
    });
    if (studentFiles.has(profile?.id || '') || selectedMaterialIds.size > 0) {
      count++;
    }
    return count;
  };

  const isStep1Complete = selectedCourseIds.size > 0;
  const isStep2Complete = courseMode !== null;
  const isStep3Complete = studentFiles.size > 0 || selectedMaterialIds.size > 0;
  const isStep4Complete = quizSettingsSaved;
  const isStep5Complete = promptSaved;
  const isStep6Complete = quizBatch?.status === 'generated' || quizBatch?.status === 'saved';
  const isStep7Complete = quizBatch?.status === 'saved';

  const educatorHasUpload = profile?.id && studentFiles.has(profile.id);

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-maroon border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <EducatorLayout profile={profile}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Quiz</h1>
          <p className="text-gray-600">Follow the steps below to create your AI-powered quiz content</p>
        </div>

        <div className="bg-gradient-to-r from-brand-maroon to-red-800 text-white p-8 rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold mb-2">Create Personalized Quiz</h2>
          <p className="text-white/90">Create customized quizzes to test student knowledge on their own materials</p>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <button
              onClick={() => setExpandedStep(expandedStep === 1 ? 0 : 1)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  isStep1Complete ? 'bg-green-500 text-white' : 'bg-brand-maroon text-white'
                }`}>
                  {isStep1Complete ? <Check className="w-5 h-5" /> : '1'}
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">Select Course or Library</h3>
                  <p className="text-sm text-gray-600">Choose where to publish this quiz</p>
                </div>
              </div>
              {expandedStep === 1 ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>

            {expandedStep === 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-3">Select Course(s)</h4>
                <div className="space-y-2">
                  {courses.map(course => (
                    <label key={course.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCourseIds.has(course.id)}
                        onChange={() => handleCourseToggle(course.id)}
                        className="w-4 h-4 text-brand-maroon focus:ring-brand-maroon"
                      />
                      <span className="text-gray-900">
                        {course.course_number} - {course.title}
                      </span>
                    </label>
                  ))}
                </div>

                {isStep1Complete && (
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={handleContinueToStep2}
                      className="bg-brand-maroon text-white px-6 py-2 rounded-lg font-medium hover:bg-red-800 transition-colors"
                    >
                      Continue to Course Type
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <button
              onClick={() => setExpandedStep(expandedStep === 2 ? 0 : 2)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              disabled={!isStep1Complete}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  isStep2Complete ? 'bg-green-500 text-white' : isStep1Complete ? 'bg-brand-maroon text-white' : 'bg-gray-300 text-gray-500'
                }`}>
                  {isStep2Complete ? <Check className="w-5 h-5" /> : '2'}
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">Select Course Type</h3>
                  <p className="text-sm text-gray-600">Choose between in-class or online quiz format</p>
                </div>
              </div>
              {expandedStep === 2 ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>

            {expandedStep === 2 && isStep1Complete && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button
                    onClick={() => handleSelectCourseType('in_class')}
                    className={`p-6 border-2 rounded-xl text-left transition-all ${
                      courseMode === 'in_class'
                        ? 'border-brand-maroon bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-full border-2 ${
                          courseMode === 'in_class' ? 'border-brand-maroon bg-brand-maroon' : 'border-gray-300'
                        } flex items-center justify-center`}>
                          {courseMode === 'in_class' && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                        <span className="font-semibold text-gray-900">In-Class</span>
                      </div>
                      <Info className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600">
                      Test students' knowledge in the classroom with printable quizzes and answer keys
                    </p>
                  </button>

                  <div className="p-6 border-2 border-gray-200 rounded-xl text-left opacity-60 cursor-not-allowed relative">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                        <span className="font-semibold text-gray-900">Online</span>
                      </div>
                      <Info className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Publish quizzes to student portals with automated grading
                    </p>
                    <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                      <AlertCircle className="w-3 h-3" />
                      Coming Soon
                    </span>
                  </div>
                </div>

                {isStep2Complete && (
                  <div className="flex justify-end">
                    <button
                      onClick={handleContinueToStep3}
                      className="bg-brand-maroon text-white px-6 py-2 rounded-lg font-medium hover:bg-red-800 transition-colors"
                    >
                      Continue to Upload Materials
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <button
              onClick={() => setExpandedStep(expandedStep === 3 ? 0 : 3)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              disabled={!isStep2Complete}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  isStep3Complete ? 'bg-green-500 text-white' : isStep2Complete ? 'bg-brand-maroon text-white' : 'bg-gray-300 text-gray-500'
                }`}>
                  {isStep3Complete ? <Check className="w-5 h-5" /> : '3'}
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">Select Materials</h3>
                  <p className="text-sm text-gray-600">Select students and upload their materials</p>
                </div>
              </div>
              {expandedStep === 3 ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>

            {expandedStep === 3 && isStep2Complete && (
              <div className="px-6 py-4 border-t border-gray-200 space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-5 h-5 text-brand-maroon" />
                    <h4 className="font-semibold text-gray-900">Students from Selected Courses</h4>
                  </div>
                  <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                    {students.length === 0 ? (
                      <div className="p-4 text-sm text-gray-600">
                        No enrolled students found for the selected course(s).
                        If you invited students by email, they must sign up so their account can be linked.
                      </div>
                    ) : (
                      students.map((student, index) => (
                        <div
                          key={student.enrollment_id}
                          className={`flex items-center justify-between p-4 ${
                            index < students.length - 1 ? 'border-b border-gray-200' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                              <Users className="w-5 h-5 text-brand-maroon" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {student.first_name && student.last_name
                                  ? `${student.first_name} ${student.last_name}`
                                  : 'Student'}
                              </div>
                              <div className="text-sm text-gray-600">
                                {student.email}
                              </div>
                            </div>
                          </div>
                          <div>
                            {!student.student_id ? (
                              <div className="text-sm text-red-600">
                                Student not registered
                              </div>
                            ) : studentFiles.has(student.enrollment_id) ? (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-green-600 font-medium">
                                  {studentFiles.get(student.enrollment_id)?.file_name}
                                </span>
                                <button
                                  onClick={() => {
                                    const newFiles = new Map(studentFiles);
                                    newFiles.delete(student.enrollment_id);
                                    setStudentFiles(newFiles);
                                    if (quizBatchId) {
                                      supabase
                                        .from('quiz_batch_student_files')
                                        .delete()
                                        .eq('quiz_batch_id', quizBatchId)
                                        .eq('student_id', student.student_id!);
                                    }
                                  }}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handleFileUpload(student.enrollment_id, student.student_id!, file);
                                    }
                                  }}
                                  disabled={uploadingStudent === student.enrollment_id}
                                />
                                <div className="flex items-center gap-2 text-brand-maroon border border-brand-maroon px-4 py-2 rounded-lg hover:bg-red-50 transition-colors">
                                  {uploadingStudent === student.enrollment_id ? (
                                    <>
                                      <div className="w-4 h-4 border-2 border-brand-maroon border-t-transparent rounded-full animate-spin" />
                                      <span className="font-medium text-sm">Uploading...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="w-4 h-4" />
                                      <span className="font-medium text-sm">Upload File</span>
                                    </>
                                  )}
                                </div>
                              </label>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                    <div className="flex items-center justify-between p-4 bg-blue-50 border-t-2 border-blue-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-blue-700" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">Educator</div>
                          <div className="text-sm text-gray-600">
                            {profile.email}
                          </div>
                        </div>
                      </div>
                      <div>
                        {educatorHasUpload ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-green-600 font-medium">
                              {studentFiles.get(profile.id)?.file_name}
                            </span>
                            <button
                              onClick={() => {
                                const newFiles = new Map(studentFiles);
                                newFiles.delete(profile.id);
                                setStudentFiles(newFiles);
                                if (quizBatchId) {
                                  supabase
                                    .from('quiz_batch_student_files')
                                    .delete()
                                    .eq('quiz_batch_id', quizBatchId)
                                    .eq('student_id', profile.id);
                                }
                              }}
                              className="text-red-600 hover:text-red-800"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleFileUpload(null, profile.id, file);
                                }
                              }}
                              disabled={uploadingStudent === profile.id}
                            />
                            <div className="flex items-center gap-2 text-brand-maroon border border-brand-maroon px-4 py-2 rounded-lg hover:bg-red-50 transition-colors">
                              {uploadingStudent === profile.id ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-brand-maroon border-t-transparent rounded-full animate-spin" />
                                  <span className="font-medium text-sm">Uploading...</span>
                                </>
                              ) : (
                                <>
                                  <Upload className="w-4 h-4" />
                                  <span className="font-medium text-sm">Upload File</span>
                                </>
                              )}
                            </div>
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-5 h-5 text-brand-maroon" />
                    <h4 className="font-semibold text-gray-900">Or Select from Preloaded Course Materials</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Choose from textbooks, readings, and lecture notes to generate quizzes
                  </p>
                  <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                    {lectureMaterials.length === 0 ? (
                      <div className="p-4 text-sm text-gray-600">
                        No preloaded materials found for the selected course(s).
                      </div>
                    ) : (
                      lectureMaterials.map((material, index) => (
                        <label
                          key={material.id}
                          className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 ${
                            index < lectureMaterials.length - 1 ? 'border-b border-gray-200' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedMaterialIds.has(material.id)}
                            onChange={() => handleMaterialToggle(material.id)}
                            className="w-4 h-4 text-brand-maroon focus:ring-brand-maroon"
                          />
                          <FileText className="w-5 h-5 text-red-500" />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{material.material_name}</div>
                            <div className="text-sm text-gray-500">{material.course_number || 'Course'}</div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                {isStep3Complete && (
                  <div className="flex justify-end">
                    <button
                      onClick={handleContinueToStep4}
                      className="bg-brand-maroon text-white px-6 py-2 rounded-lg font-medium hover:bg-red-800 transition-colors"
                    >
                      Continue to Quiz Settings
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <button
              onClick={() => setExpandedStep(expandedStep === 4 ? 0 : 4)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              disabled={!isStep3Complete}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  isStep4Complete ? 'bg-green-500 text-white' : isStep3Complete ? 'bg-brand-maroon text-white' : 'bg-gray-300 text-gray-500'
                }`}>
                  {isStep4Complete ? <Check className="w-5 h-5" /> : '4'}
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">Quiz Type Settings</h3>
                  <p className="text-sm text-gray-600">Configure question types and answer keys</p>
                </div>
              </div>
              {expandedStep === 4 ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>

            {expandedStep === 4 && isStep3Complete && (
              <div className="px-6 py-4 border-t border-gray-200 space-y-6">
                <div>
                  <label className="block font-medium text-gray-900 mb-2">
                    Number of Multiple Choice Questions (0-30)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={mcqCount}
                      onChange={(e) => setMcqCount(Math.max(0, Math.min(30, parseInt(e.target.value) || 0)))}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-maroon focus:border-brand-maroon"
                    />
                    <span className="text-sm text-gray-600">Each question will have 4 options (A, B, C, D)</span>
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-gray-900 mb-2">
                    Number of Short Answer Questions
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      value={shortAnswerCount}
                      disabled
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                    />
                    <span className="text-sm text-gray-500">Open-ended questions requiring written responses</span>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useFixedAnswerKey}
                      onChange={(e) => setUseFixedAnswerKey(e.target.checked)}
                      className="mt-1 w-4 h-4 text-brand-maroon focus:ring-brand-maroon"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Use Fixed MCQ Answer Key for All Students</div>
                      <p className="text-sm text-gray-600 mt-1">
                        All students will receive the same multiple choice questions with the same correct answers.
                        You can specify the correct answer for each question below.
                      </p>
                    </div>
                  </label>

                  {useFixedAnswerKey && mcqCount > 0 && (
                    <div className="mt-4 border border-gray-200 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-3">Answer Key Configuration</h5>
                      <div className="max-h-64 overflow-y-auto space-y-3">
                        {Array.from({ length: mcqCount }, (_, i) => (
                          <div key={i} className="flex items-center gap-4">
                            <span className="text-sm font-medium text-gray-700 w-24">Question {i + 1}:</span>
                            <div className="flex gap-2">
                              {['A', 'B', 'C', 'D'].map(option => (
                                <button
                                  key={option}
                                  onClick={() => {
                                    const newKey = [...answerKey];
                                    newKey[i] = option;
                                    setAnswerKey(newKey);
                                  }}
                                  className={`w-10 h-10 rounded-lg font-medium transition-all ${
                                    answerKey[i] === option
                                      ? 'bg-brand-maroon text-white'
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }`}
                                >
                                  {option}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveQuizSettings}
                    disabled={saving}
                    className="bg-brand-maroon text-white px-6 py-2 rounded-lg font-medium hover:bg-red-800 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Continue to Prompt'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <button
              onClick={() => setExpandedStep(expandedStep === 5 ? 0 : 5)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              disabled={!isStep4Complete}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  isStep5Complete ? 'bg-green-500 text-white' : isStep4Complete ? 'bg-brand-maroon text-white' : 'bg-gray-300 text-gray-500'
                }`}>
                  {isStep5Complete ? <Check className="w-5 h-5" /> : '5'}
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">Additional Prompt</h3>
                  <p className="text-sm text-gray-600">Add specific instructions or focus areas (optional)</p>
                </div>
              </div>
              {expandedStep === 5 ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>

            {expandedStep === 5 && isStep4Complete && (
              <div className="px-6 py-4 border-t border-gray-200 space-y-4">
                <div>
                  <label className="block font-medium text-gray-900 mb-2">
                    Additional Instructions (Optional)
                  </label>
                  <textarea
                    value={additionalInstructions}
                    onChange={(e) => setAdditionalInstructions(e.target.value)}
                    placeholder="e.g., Focus on main themes, emphasize critical analysis, include vocabulary questions..."
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-maroon focus:border-brand-maroon resize-none"
                  />
                  <p className="text-sm text-gray-600 mt-2">
                    Provide specific areas to focus on or additional requirements for the quiz questions
                  </p>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveAdditionalInstructions}
                    disabled={saving}
                    className="bg-brand-maroon text-white px-6 py-2 rounded-lg font-medium hover:bg-red-800 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Continue to Generate'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <button
              onClick={() => setExpandedStep(expandedStep === 6 ? 0 : 6)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              disabled={!isStep5Complete}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  isStep6Complete ? 'bg-green-500 text-white' : isStep5Complete ? 'bg-brand-maroon text-white' : 'bg-gray-300 text-gray-500'
                }`}>
                  {isStep6Complete ? <Check className="w-5 h-5" /> : '6'}
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">Generate & Review Content</h3>
                  <p className="text-sm text-gray-600">Generate quizzes and review/modify if needed</p>
                </div>
              </div>
              {expandedStep === 6 ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>

            {expandedStep === 6 && isStep5Complete && (
              <div className="px-6 py-4 border-t border-gray-200">
                {!isStep6Complete ? (
                  <div className="py-12 text-center">
                    <Wand2 className="w-16 h-16 text-brand-maroon mx-auto mb-4" />
                    <h4 className="text-xl font-semibold text-gray-900 mb-2">Ready to Generate Quizzes</h4>
                    <p className="text-gray-600 mb-6">
                      AI will generate {calculateTargetCount()} personalized quiz{calculateTargetCount() !== 1 ? 'zes' : ''} based on the selected materials
                    </p>
                    <button
                      onClick={handleGenerateQuizzes}
                      disabled={generating}
                      className="bg-brand-maroon text-white px-6 py-3 rounded-lg font-medium hover:bg-red-800 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                    >
                      <Wand2 className="w-5 h-5" />
                      {generating ? 'Generating...' : 'Generate Quizzes'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-600 mb-4">
                      <Check className="w-5 h-5" />
                      <span className="font-semibold">Quizzes Generated Successfully!</span>
                    </div>

                    <h4 className="font-semibold text-gray-900">Generated Quizzes ({generatedQuizzes.length})</h4>

                    <div className="space-y-3">
                      {generatedQuizzes.map((quiz) => {
                        const isEducator = quiz.student_id === profile?.id;
                        const firstMaterial = selectedMaterialIds.size > 0
                          ? lectureMaterials.find(m => selectedMaterialIds.has(m.id))
                          : null;
                        const fileUrl = quiz.student_file_url || (isEducator && firstMaterial ? firstMaterial.material_url : null);

                        return (
                          <div key={quiz.id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-gray-900">{quiz.student_name}</div>
                              <div className="text-sm text-gray-600">{quiz.student_file_name}</div>
                              <div className="text-sm text-gray-500 mt-1">
                                {quiz.mcq_count} Multiple Choice • {quiz.short_answer_count} Short Answer
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => fileUrl && window.open(fileUrl, '_blank')}
                                disabled={!fileUrl}
                                className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                                  fileUrl
                                    ? 'border-red-600 text-red-600 hover:bg-red-50'
                                    : 'border-gray-300 text-gray-400 cursor-not-allowed'
                                }`}
                              >
                                <FileText className="w-4 h-4" />
                                <span className="text-sm font-medium">File</span>
                              </button>
                              <button
                                onClick={() => quiz.quiz_pdf_url && window.open(quiz.quiz_pdf_url, '_blank')}
                                disabled={!quiz.quiz_pdf_url}
                                className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                                  quiz.quiz_pdf_url
                                    ? 'border-red-600 text-red-600 hover:bg-red-50'
                                    : 'border-gray-300 text-gray-400 cursor-not-allowed'
                                }`}
                              >
                                <Eye className="w-4 h-4" />
                                <span className="text-sm font-medium">Quiz</span>
                              </button>
                              <button
                                onClick={() => quiz.answers_pdf_url && window.open(quiz.answers_pdf_url, '_blank')}
                                disabled={!quiz.answers_pdf_url}
                                className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                                  quiz.answers_pdf_url
                                    ? 'border-red-600 text-red-600 hover:bg-red-50'
                                    : 'border-gray-300 text-gray-400 cursor-not-allowed'
                                }`}
                              >
                                <FileCheck className="w-4 h-4" />
                                <span className="text-sm font-medium">Answers</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex justify-end mt-6">
                      <button
                        onClick={() => setExpandedStep(7)}
                        className="bg-brand-maroon text-white px-6 py-3 rounded-lg font-medium hover:bg-red-800 transition-colors"
                      >
                        Continue to Save & Download
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <button
              onClick={() => setExpandedStep(expandedStep === 7 ? 0 : 7)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              disabled={!isStep6Complete}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  isStep7Complete ? 'bg-green-500 text-white' : isStep6Complete ? 'bg-brand-maroon text-white' : 'bg-gray-300 text-gray-500'
                }`}>
                  {isStep7Complete ? <Check className="w-5 h-5" /> : '7'}
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">Save & Download</h3>
                  <p className="text-sm text-gray-600">Save your quiz and download files</p>
                </div>
              </div>
              {expandedStep === 7 ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>

            {expandedStep === 7 && isStep6Complete && (
              <div className="px-6 py-4 border-t border-gray-200 space-y-6">
                <div>
                  <label className="block font-medium text-gray-900 mb-2">Quiz Name</label>
                  <input
                    type="text"
                    value={quizName}
                    onChange={(e) => setQuizName(e.target.value)}
                    placeholder="e.g., Homework #1, Midterm Essay Quiz, Chapter 3 Review..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-maroon focus:border-brand-maroon"
                  />
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-4">Quiz Summary</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Quiz Name:</span>
                      <span className="text-gray-900 font-medium">{quizName || 'Not set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Number of Quizzes:</span>
                      <span className="text-gray-900 font-medium">{generatedQuizzes.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Questions per Quiz:</span>
                      <span className="text-gray-900 font-medium">
                        {mcqCount} MCQ, {shortAnswerCount} Short Answer
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Courses:</span>
                      <span className="text-gray-900 font-medium">{selectedCourseIds.size} selected</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Download Quiz Files</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Choose how you want to download your quiz files
                  </p>
                  <button
                    onClick={() => setShowDownloadModal(true)}
                    className="flex items-center gap-2 px-4 py-2 border-2 border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium"
                  >
                    <Download className="w-4 h-4" />
                    Download Options
                  </button>
                </div>

                {courseMode === 'in_class' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-semibold text-gray-900 mb-1">In-Class Mode Selected</h5>
                        <p className="text-sm text-gray-700">
                          Clicking "Save Quiz" will save this quiz to your Personal Library for future reference.
                          You can access and reprint these quizzes anytime from your library.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    onClick={handleSaveQuiz}
                    disabled={saving}
                    className="bg-brand-maroon text-white px-8 py-3 rounded-lg font-medium hover:bg-red-800 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Quiz'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showDownloadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDownloadModal(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Download Options</h3>
            <div className="space-y-3">
              <button
                onClick={() => {
                  handleDownload('all_zip');
                  setShowDownloadModal(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download className="w-5 h-5 text-brand-maroon" />
                <span className="font-medium">Download All Files (ZIP)</span>
              </button>
              <button
                onClick={() => {
                  handleDownload('quizzes_zip');
                  setShowDownloadModal(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download className="w-5 h-5 text-brand-maroon" />
                <span className="font-medium">Download Quizzes Only (ZIP)</span>
              </button>
              <button
                onClick={() => {
                  handleDownload('answers_zip');
                  setShowDownloadModal(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download className="w-5 h-5 text-brand-maroon" />
                <span className="font-medium">Download Answer Keys (ZIP)</span>
              </button>
            </div>
            <button
              onClick={() => setShowDownloadModal(false)}
              className="w-full mt-4 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </EducatorLayout>
  );
}
