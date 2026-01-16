'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase, Profile, Course, CourseTeachingAssistant, CourseStudent, CourseTextbook } from '@/lib/supabase';
import EducatorLayout from '@/components/EducatorLayout';
import { ArrowLeft, GraduationCap, FileText, Users, BookOpen, FolderOpen, Upload, Plus, X, Save, File, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { uploadCourseFile, uploadMultipleFiles, parseStudentCSV, validateFileSize, validateFileType } from '@/lib/fileUpload';

export default function ManageCourse() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [semester, setSemester] = useState('Fall 2025');
  const [courseNumber, setCourseNumber] = useState('');
  const [section, setSection] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [instructorName, setInstructorName] = useState('');

  const [teachingAssistants, setTeachingAssistants] = useState<string[]>([]);
  const [taInput, setTaInput] = useState('');

  const [students, setStudents] = useState<string[]>([]);
  const [studentInput, setStudentInput] = useState('');

  const [textbooks, setTextbooks] = useState<string[]>([]);
  const [textbookInput, setTextbookInput] = useState('');

  const [syllabusFile, setSyllabusFile] = useState<File | null>(null);
  const [existingSyllabusUrl, setExistingSyllabusUrl] = useState<string | null>(null);
  const [studentRosterFile, setStudentRosterFile] = useState<File | null>(null);
  const [courseMaterialsFiles, setCourseMaterialsFiles] = useState<File[]>([]);
  const [existingCourseMaterials, setExistingCourseMaterials] = useState<string[]>([]);
  const [backgroundMaterialsFiles, setBackgroundMaterialsFiles] = useState<File[]>([]);
  const [existingBackgroundMaterials, setExistingBackgroundMaterials] = useState<string[]>([]);

  const syllabusInputRef = useRef<HTMLInputElement>(null);
  const studentRosterInputRef = useRef<HTMLInputElement>(null);
  const courseMaterialsInputRef = useRef<HTMLInputElement>(null);
  const backgroundMaterialsInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkAuth();
  }, []);

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

      const { data: courseData } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .eq('educator_id', user.id)
        .maybeSingle();

      if (courseData) {
        setCourse(courseData);
        setSemester(courseData.semester);
        setCourseNumber(courseData.course_number);
        setSection(courseData.section);
        setCourseTitle(courseData.title);
        setInstructorName(courseData.instructor_name);
        setExistingSyllabusUrl(courseData.syllabus_url);
        setExistingCourseMaterials(courseData.course_materials_urls || []);
        setExistingBackgroundMaterials(courseData.background_materials_urls || []);

        const { data: tasData } = await supabase
          .from('course_teaching_assistants')
          .select('email')
          .eq('course_id', courseId);
        if (tasData) {
          setTeachingAssistants(tasData.map(ta => ta.email));
        }

        const { data: studentsData } = await supabase
          .from('course_students')
          .select('email')
          .eq('course_id', courseId);
        if (studentsData) {
          setStudents(studentsData.map(s => s.email));
        }

        const { data: textbooksData } = await supabase
          .from('course_textbooks')
          .select('title_isbn')
          .eq('course_id', courseId);
        if (textbooksData) {
          setTextbooks(textbooksData.map(t => t.title_isbn));
        }
      }
    } catch (error) {
      console.error('Error loading course:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTeachingAssistant = () => {
    if (taInput.trim() && taInput.includes('@')) {
      setTeachingAssistants([...teachingAssistants, taInput.trim()]);
      setTaInput('');
    } else {
      toast.error('Please enter a valid email address');
    }
  };

  const removeTeachingAssistant = (index: number) => {
    setTeachingAssistants(teachingAssistants.filter((_, i) => i !== index));
  };

  const addStudent = () => {
    if (studentInput.trim() && studentInput.includes('@')) {
      setStudents([...students, studentInput.trim()]);
      setStudentInput('');
    } else {
      toast.error('Please enter a valid email address');
    }
  };

  const removeStudent = (index: number) => {
    setStudents(students.filter((_, i) => i !== index));
  };

  const addTextbook = () => {
    if (textbookInput.trim()) {
      setTextbooks([...textbooks, textbookInput.trim()]);
      setTextbookInput('');
    }
  };

  const removeTextbook = (index: number) => {
    setTextbooks(textbooks.filter((_, i) => i !== index));
  };

  const handleSyllabusSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

    if (!validateFileType(file, allowedTypes)) {
      toast.error('Please upload a PDF, DOC, or DOCX file');
      return;
    }

    if (!validateFileSize(file, 10)) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setSyllabusFile(file);
    setExistingSyllabusUrl(null);
  };

  const handleStudentRosterSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

    if (!validateFileType(file, allowedTypes)) {
      toast.error('Please upload a CSV or Excel file');
      return;
    }

    if (!validateFileSize(file, 10)) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setStudentRosterFile(file);

    if (file.type === 'text/csv') {
      const text = await file.text();
      const emails = parseStudentCSV(text);

      if (emails.length > 0) {
        setStudents(prev => Array.from(new Set([...prev, ...emails])));
        toast.success(`Added ${emails.length} students from CSV`);
      } else {
        toast.error('No valid email addresses found in CSV');
      }
    } else {
      toast.info('Excel file uploaded. Students will be processed when course is saved.');
    }
  };

  const handleCourseMaterialsSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validFiles: File[] = [];

    Array.from(files).forEach(file => {
      if (!validateFileSize(file, 10)) {
        toast.error(`${file.name} exceeds 10MB limit`);
        return;
      }
      validFiles.push(file);
    });

    setCourseMaterialsFiles(prev => [...prev, ...validFiles]);
  };

  const handleBackgroundMaterialsSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validFiles: File[] = [];

    Array.from(files).forEach(file => {
      if (!validateFileSize(file, 10)) {
        toast.error(`${file.name} exceeds 10MB limit`);
        return;
      }
      validFiles.push(file);
    });

    setBackgroundMaterialsFiles(prev => [...prev, ...validFiles]);
  };

  const removeCourseMaterial = (index: number) => {
    setCourseMaterialsFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeBackgroundMaterial = (index: number) => {
    setBackgroundMaterialsFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingCourseMaterial = (index: number) => {
    setExistingCourseMaterials(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingBackgroundMaterial = (index: number) => {
    setExistingBackgroundMaterials(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateCourse = async () => {
    if (!profile || !course) return;

    if (!courseNumber.trim() || !courseTitle.trim()) {
      toast.error('Please fill in required fields: Course Number and Course Title');
      return;
    }

    setSaving(true);
    try {
      let syllabusUrl = existingSyllabusUrl;
      const courseMaterialsUrls = [...existingCourseMaterials];
      const backgroundMaterialsUrls = [...existingBackgroundMaterials];

      if (syllabusFile) {
        toast.info('Uploading syllabus...');
        syllabusUrl = await uploadCourseFile(courseId, 'syllabus', syllabusFile);
      }

      if (courseMaterialsFiles.length > 0) {
        toast.info(`Uploading ${courseMaterialsFiles.length} course materials...`);
        const urls = await uploadMultipleFiles(courseId, 'materials', courseMaterialsFiles);
        courseMaterialsUrls.push(...urls);
      }

      if (backgroundMaterialsFiles.length > 0) {
        toast.info(`Uploading ${backgroundMaterialsFiles.length} background materials...`);
        const urls = await uploadMultipleFiles(courseId, 'background', backgroundMaterialsFiles);
        backgroundMaterialsUrls.push(...urls);
      }

      const { error: updateError } = await supabase
        .from('courses')
        .update({
          code: courseNumber.trim(),
          title: courseTitle.trim(),
          semester: semester,
          section: section.trim(),
          instructor_name: instructorName.trim(),
          syllabus_url: syllabusUrl,
          course_materials_urls: courseMaterialsUrls,
          background_materials_urls: backgroundMaterialsUrls,
        })
        .eq('id', courseId);

      if (updateError) throw updateError;

      await supabase.from('course_teaching_assistants').delete().eq('course_id', courseId);
      if (teachingAssistants.length > 0) {
        const taRecords = teachingAssistants.map(email => ({
          course_id: courseId,
          email: email,
        }));
        await supabase.from('course_teaching_assistants').insert(taRecords);
      }

      await supabase.from('course_students').delete().eq('course_id', courseId);
      if (students.length > 0) {
        const studentRecords = students.map(email => ({
          course_id: courseId,
          email: email,
        }));
        await supabase.from('course_students').insert(studentRecords);
      }

      await supabase.from('course_textbooks').delete().eq('course_id', courseId);
      if (textbooks.length > 0) {
        const textbookRecords = textbooks.map(titleIsbn => ({
          course_id: courseId,
          title_isbn: titleIsbn,
        }));
        await supabase.from('course_textbooks').insert(textbookRecords);
      }

      toast.success('Course updated successfully!');

      await checkAuth();
    } catch (error) {
      console.error('Error updating course:', error);
      toast.error('Failed to update course. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!profile || !course) return;

    setDeleting(true);
    try {
      const { error: deleteError } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId)
        .eq('educator_id', profile.id);

      if (deleteError) throw deleteError;

      toast.success('Course deleted successfully');
      router.push('/educator/dashboard');
    } catch (error) {
      console.error('Error deleting course:', error);
      toast.error('Failed to delete course. Please try again.');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!course) {
    return (
      <EducatorLayout profile={profile}>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Course Not Found</h1>
          <button
            onClick={() => router.push('/educator/dashboard')}
            className="text-brand-maroon hover:text-brand-maroon-hover font-medium"
          >
            Return to Dashboard
          </button>
        </div>
      </EducatorLayout>
    );
  }

  return (
    <EducatorLayout profile={profile}>
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/educator/dashboard')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors px-4 py-2 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back</span>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Manage Course</h1>
              <p className="text-gray-600 mt-1">Update course information and materials</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={saving || deleting}
              className="border-2 border-red-600 text-red-600 hover:bg-red-50 font-bold py-3 px-6 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-5 h-5" />
              Delete Course
            </button>
            <button
              onClick={handleUpdateCourse}
              disabled={saving || deleting}
              className="bg-brand-maroon hover:bg-brand-maroon-hover text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Updating...' : 'Update Course'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-8">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-brand-maroon p-3 rounded-xl">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Basic Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Semester <span className="text-red-600">*</span>
                </label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-maroon focus:border-transparent"
                >
                  <option value="Fall 2025">Fall 2025</option>
                  <option value="Spring 2025">Spring 2025</option>
                  <option value="Summer 2025">Summer 2025</option>
                  <option value="Fall 2024">Fall 2024</option>
                  <option value="Spring 2024">Spring 2024</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Course Number <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={courseNumber}
                  onChange={(e) => setCourseNumber(e.target.value)}
                  placeholder="e.g., ECON 203"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-maroon focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Section
                </label>
                <input
                  type="text"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  placeholder="e.g., 001"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-maroon focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Course Title <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  placeholder="e.g., Principles of Microeconomics"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-maroon focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Instructor Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={instructorName}
                  onChange={(e) => setInstructorName(e.target.value)}
                  placeholder="e.g., Dr. John Smith"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-maroon focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-brand-yellow p-3 rounded-xl">
                <FileText className="w-6 h-6 text-black" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Syllabus</h2>
            </div>

            <input
              ref={syllabusInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleSyllabusSelect}
              className="hidden"
            />

            {existingSyllabusUrl && !syllabusFile ? (
              <div className="border-2 border-blue-300 bg-blue-50 rounded-xl p-6 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <File className="w-8 h-8 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">Current Syllabus</p>
                      <a
                        href={existingSyllabusUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        View File
                      </a>
                    </div>
                  </div>
                  <button
                    onClick={() => syllabusInputRef.current?.click()}
                    className="text-brand-maroon hover:text-brand-maroon-hover font-medium text-sm"
                  >
                    Replace
                  </button>
                </div>
              </div>
            ) : syllabusFile ? (
              <div className="border-2 border-green-300 bg-green-50 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <File className="w-8 h-8 text-green-600" />
                    <div>
                      <p className="font-medium text-gray-900">{syllabusFile.name}</p>
                      <p className="text-sm text-gray-600">{(syllabusFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSyllabusFile(null);
                      if (course.syllabus_url) setExistingSyllabusUrl(course.syllabus_url);
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => syllabusInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-gray-400 transition-colors"
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-700 font-medium mb-1">Click to upload syllabus</p>
                <p className="text-gray-500 text-sm">PDF, DOC, DOCX up to 10MB</p>
              </button>
            )}
          </div>

          <div className="pt-6 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-brand-maroon p-3 rounded-xl">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Teaching Assistants</h2>
            </div>

            <div className="flex gap-2 mb-4">
              <input
                type="email"
                value={taInput}
                onChange={(e) => setTaInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTeachingAssistant()}
                placeholder="Enter TA email"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-maroon focus:border-transparent"
              />
              <button
                onClick={addTeachingAssistant}
                className="bg-brand-yellow hover:bg-brand-yellow-hover p-3 rounded-lg transition-colors"
              >
                <Plus className="w-6 h-6 text-black" />
              </button>
            </div>

            {teachingAssistants.length > 0 && (
              <div className="space-y-2">
                {teachingAssistants.map((ta, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg">
                    <span className="text-gray-700">{ta}</span>
                    <button
                      onClick={() => removeTeachingAssistant(index)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-brand-yellow p-3 rounded-xl">
                <Users className="w-6 h-6 text-black" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Students</h2>
            </div>

            <input
              ref={studentRosterInputRef}
              type="file"
              accept=".csv,.xls,.xlsx"
              onChange={handleStudentRosterSelect}
              className="hidden"
            />

            <button
              onClick={() => studentRosterInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-gray-400 transition-colors mb-4"
            >
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-700 font-medium text-sm">Upload student list (Excel/CSV)</p>
            </button>

            <div className="flex gap-2 mb-4">
              <input
                type="email"
                value={studentInput}
                onChange={(e) => setStudentInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addStudent()}
                placeholder="Enter student email"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-maroon focus:border-transparent"
              />
              <button
                onClick={addStudent}
                className="bg-brand-yellow hover:bg-brand-yellow-hover p-3 rounded-lg transition-colors"
              >
                <Plus className="w-6 h-6 text-black" />
              </button>
            </div>

            {students.length > 0 && (
              <div className="space-y-2">
                {students.map((student, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg">
                    <span className="text-gray-700">{student}</span>
                    <button
                      onClick={() => removeStudent(index)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-brand-yellow p-3 rounded-xl">
                <BookOpen className="w-6 h-6 text-black" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Textbooks</h2>
            </div>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={textbookInput}
                onChange={(e) => setTextbookInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTextbook()}
                placeholder="Enter textbook title and ISBN"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-maroon focus:border-transparent"
              />
              <button
                onClick={addTextbook}
                className="bg-brand-yellow hover:bg-brand-yellow-hover p-3 rounded-lg transition-colors"
              >
                <Plus className="w-6 h-6 text-black" />
              </button>
            </div>

            {textbooks.length > 0 && (
              <div className="space-y-2">
                {textbooks.map((textbook, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg">
                    <span className="text-gray-700">{textbook}</span>
                    <button
                      onClick={() => removeTextbook(index)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-brand-maroon p-3 rounded-xl">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Course Materials</h2>
            </div>

            <input
              ref={courseMaterialsInputRef}
              type="file"
              multiple
              onChange={handleCourseMaterialsSelect}
              className="hidden"
            />

            <button
              onClick={() => courseMaterialsInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-gray-400 transition-colors mb-4"
            >
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-700 font-medium text-sm">Upload additional course materials</p>
            </button>

            {existingCourseMaterials.length > 0 && (
              <div className="space-y-2 mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">Current Materials:</p>
                {existingCourseMaterials.map((url, index) => (
                  <div key={index} className="flex items-center justify-between bg-blue-50 px-4 py-3 rounded-lg">
                    <div className="flex items-center gap-3">
                      <File className="w-5 h-5 text-blue-600" />
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-900 font-medium hover:text-blue-600"
                      >
                        Material {index + 1}
                      </a>
                    </div>
                    <button
                      onClick={() => removeExistingCourseMaterial(index)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {courseMaterialsFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700 mb-2">New Materials:</p>
                {courseMaterialsFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-green-50 px-4 py-3 rounded-lg">
                    <div className="flex items-center gap-3">
                      <File className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-gray-900 font-medium">{file.name}</p>
                        <p className="text-sm text-gray-600">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeCourseMaterial(index)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-brand-maroon p-3 rounded-xl">
                <FolderOpen className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Background Materials</h2>
            </div>

            <input
              ref={backgroundMaterialsInputRef}
              type="file"
              multiple
              onChange={handleBackgroundMaterialsSelect}
              className="hidden"
            />

            <button
              onClick={() => backgroundMaterialsInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-gray-400 transition-colors mb-4"
            >
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-700 font-medium text-sm">Upload additional background materials</p>
            </button>

            {existingBackgroundMaterials.length > 0 && (
              <div className="space-y-2 mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">Current Materials:</p>
                {existingBackgroundMaterials.map((url, index) => (
                  <div key={index} className="flex items-center justify-between bg-blue-50 px-4 py-3 rounded-lg">
                    <div className="flex items-center gap-3">
                      <File className="w-5 h-5 text-blue-600" />
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-900 font-medium hover:text-blue-600"
                      >
                        Material {index + 1}
                      </a>
                    </div>
                    <button
                      onClick={() => removeExistingBackgroundMaterial(index)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {backgroundMaterialsFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700 mb-2">New Materials:</p>
                {backgroundMaterialsFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-green-50 px-4 py-3 rounded-lg">
                    <div className="flex items-center gap-3">
                      <File className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-gray-900 font-medium">{file.name}</p>
                        <p className="text-sm text-gray-600">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeBackgroundMaterial(index)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-3 rounded-full">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Delete Course</h3>
              </div>

              <p className="text-gray-700">
                Are you sure you want to delete <span className="font-semibold">{course?.title}</span>?
                This action cannot be undone and will remove all associated data including students, teaching assistants, and materials.
              </p>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteCourse}
                  disabled={deleting}
                  className="flex-1 px-4 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>Deleting...</>
                  ) : (
                    <>
                      <Trash2 className="w-5 h-5" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </EducatorLayout>
  );
}
