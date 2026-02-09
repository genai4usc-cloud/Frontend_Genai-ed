'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, Profile, Course } from '@/lib/supabase';
import EducatorLayout from '@/components/EducatorLayout';
import {
  Check, ChevronDown, ChevronUp, FileText, GraduationCap, Upload,
  Users, Settings, Info, AlertCircle, X
} from 'lucide-react';
import { uploadFile } from '@/lib/fileUpload';

interface QuizBatch {
  id: string;
  educator_id: string;
  status: string;
  mode: string | null;
  mcq_count: number;
  short_answer_count: number;
  fixed_mcq_answer_key_enabled: boolean;
  fixed_mcq_answer_key: string[] | null;
}

interface Student {
  student_id: string;
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
  student_id: string;
  file_name: string;
  file_url: string;
  storage_path: string;
}

export default function CreateQuiz() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Quiz batch state
  const [quizBatchId, setQuizBatchId] = useState<string | null>(null);
  const [quizBatch, setQuizBatch] = useState<QuizBatch | null>(null);

  // Step 1: Course selection
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());

  // Step 2: Course type
  const [courseMode, setCourseMode] = useState<string | null>(null);

  // Step 3: Materials
  const [students, setStudents] = useState<Student[]>([]);
  const [studentFiles, setStudentFiles] = useState<Map<string, StudentFile>>(new Map());
  const [lectureMaterials, setLectureMaterials] = useState<LectureMaterial[]>([]);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<Set<string>>(new Set());
  const [uploadingStudent, setUploadingStudent] = useState<string | null>(null);

  // Step 4: Quiz settings
  const [mcqCount, setMcqCount] = useState(5);
  const [shortAnswerCount] = useState(0);
  const [useFixedAnswerKey, setUseFixedAnswerKey] = useState(false);
  const [answerKey, setAnswerKey] = useState<string[]>([]);

  // UI state
  const [expandedStep, setExpandedStep] = useState(1);

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
    const { data: existingBatches } = await supabase
      .from('quiz_batches')
      .select('*')
      .eq('educator_id', profile!.id)
      .eq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(1);

    if (existingBatches && existingBatches.length > 0) {
      const batch = existingBatches[0];
      setQuizBatchId(batch.id);
      setQuizBatch(batch);
      setCourseMode(batch.mode);
      setMcqCount(batch.mcq_count || 5);
      setUseFixedAnswerKey(batch.fixed_mcq_answer_key_enabled || false);
      if (batch.fixed_mcq_answer_key) {
        setAnswerKey(batch.fixed_mcq_answer_key);
      }

      await loadBatchCourses(batch.id);
      await loadBatchMaterials(batch.id);
      await loadBatchStudentFiles(batch.id);
    }
  };

  const loadBatchCourses = async (batchId: string) => {
    const { data } = await supabase
      .from('quiz_batch_courses')
      .select('course_id')
      .eq('quiz_batch_id', batchId);

    if (data) {
      setSelectedCourseIds(new Set(data.map(c => c.course_id)));
    }
  };

  const loadBatchMaterials = async (batchId: string) => {
    const { data } = await supabase
      .from('quiz_batch_materials')
      .select('lecture_material_id')
      .eq('quiz_batch_id', batchId);

    if (data) {
      setSelectedMaterialIds(new Set(data.map(m => m.lecture_material_id)));
    }
  };

  const loadBatchStudentFiles = async (batchId: string) => {
    const { data } = await supabase
      .from('quiz_batch_student_files')
      .select('*')
      .eq('quiz_batch_id', batchId);

    if (data) {
      const filesMap = new Map<string, StudentFile>();
      data.forEach(file => {
        filesMap.set(file.student_id, {
          student_id: file.student_id,
          file_name: file.file_name,
          file_url: file.file_url,
          storage_path: file.storage_path,
        });
      });
      setStudentFiles(filesMap);
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
    const { data } = await supabase
      .from('course_students')
      .select('course_id, student_id, email')
      .in('course_id', courseIds);

    if (data) {
      const uniqueStudents = new Map<string, Student>();
      data.forEach(s => {
        if (!uniqueStudents.has(s.student_id)) {
          uniqueStudents.set(s.student_id, s);
        }
      });

      const studentsList = Array.from(uniqueStudents.values());
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
              studentsList.map(s => ({
                quiz_batch_id: quizBatchId,
                student_id: s.student_id,
              }))
            );
        }
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

  const handleFileUpload = async (studentId: string, file: File) => {
    if (!quizBatchId) return;

    setUploadingStudent(studentId);

    try {
      const storagePath = `quiz-student-files/${quizBatchId}/${studentId}/${file.name}`;
      const { url, error } = await uploadFile(file, storagePath, 'quiz-student-materials');

      if (error) {
        console.error('Upload error:', error);
        alert('Failed to upload file');
        return;
      }

      if (url) {
        await supabase
          .from('quiz_batch_student_files')
          .upsert({
            quiz_batch_id: quizBatchId,
            student_id: studentId,
            file_name: file.name,
            file_url: url,
            storage_path: storagePath,
            file_mime: file.type,
            file_size_bytes: file.size,
          }, {
            onConflict: 'quiz_batch_id,student_id',
          });

        const newFiles = new Map(studentFiles);
        newFiles.set(studentId, {
          student_id: studentId,
          file_name: file.name,
          file_url: url,
          storage_path: storagePath,
        });
        setStudentFiles(newFiles);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file');
    } finally {
      setUploadingStudent(null);
    }
  };

  const handleContinueToStep4 = () => {
    if (students.length > 0 && (studentFiles.size > 0 || selectedMaterialIds.size > 0)) {
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

      alert('Quiz settings saved successfully!');
    } catch (error) {
      console.error('Error saving quiz settings:', error);
      alert('Failed to save quiz settings');
    } finally {
      setSaving(false);
    }
  };

  const isStep1Complete = selectedCourseIds.size > 0;
  const isStep2Complete = courseMode !== null;
  const isStep3Complete = students.length > 0 && (studentFiles.size > 0 || selectedMaterialIds.size > 0);
  const isStep4Complete = mcqCount > 0;

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
          {/* Step 1: Select Course */}
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

          {/* Step 2: Select Course Type */}
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

          {/* Step 3: Select Materials */}
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
                {/* Students Section */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-5 h-5 text-brand-maroon" />
                    <h4 className="font-semibold text-gray-900">Students from Selected Courses</h4>
                  </div>
                  <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                    {students.map((student, index) => (
                      <div
                        key={student.student_id}
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
                            <div className="text-sm text-gray-600 flex items-center gap-2">
                              <span>{student.email}</span>
                              <span>• 1234567890</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          {studentFiles.has(student.student_id) ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-green-600 font-medium">
                                {studentFiles.get(student.student_id)?.file_name}
                              </span>
                              <button
                                onClick={() => {
                                  const newFiles = new Map(studentFiles);
                                  newFiles.delete(student.student_id);
                                  setStudentFiles(newFiles);
                                  if (quizBatchId) {
                                    supabase
                                      .from('quiz_batch_student_files')
                                      .delete()
                                      .eq('quiz_batch_id', quizBatchId)
                                      .eq('student_id', student.student_id);
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
                                    handleFileUpload(student.student_id, file);
                                  }
                                }}
                                disabled={uploadingStudent === student.student_id}
                              />
                              <div className="flex items-center gap-2 text-brand-maroon border border-brand-maroon px-4 py-2 rounded-lg hover:bg-red-50 transition-colors">
                                {uploadingStudent === student.student_id ? (
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
                    ))}
                  </div>
                </div>

                {/* Preloaded Materials Section */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-5 h-5 text-brand-maroon" />
                    <h4 className="font-semibold text-gray-900">Or Select from Preloaded Course Materials</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Choose from textbooks, readings, and lecture notes to generate quizzes
                  </p>
                  <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                    {lectureMaterials.map((material, index) => (
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
                    ))}
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

          {/* Step 4: Quiz Type Settings */}
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
                {/* MCQ Count */}
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

                {/* Short Answer (Disabled) */}
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

                {/* Fixed Answer Key */}
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

          {/* Step 5-7: Placeholder */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden opacity-60">
            <div className="px-6 py-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-300 text-gray-500 flex items-center justify-center font-bold">5</div>
              <div>
                <h3 className="font-semibold text-gray-900">Additional Prompt</h3>
                <p className="text-sm text-gray-600">Add specific instructions or focus areas (optional)</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden opacity-60">
            <div className="px-6 py-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-300 text-gray-500 flex items-center justify-center font-bold">6</div>
              <div>
                <h3 className="font-semibold text-gray-900">Generate & Review Content</h3>
                <p className="text-sm text-gray-600">Generate quizzes and review/modify if needed</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden opacity-60">
            <div className="px-6 py-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-300 text-gray-500 flex items-center justify-center font-bold">7</div>
              <div>
                <h3 className="font-semibold text-gray-900">Download & Distribute</h3>
                <p className="text-sm text-gray-600">Download quizzes and answer keys for distribution</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </EducatorLayout>
  );
}
