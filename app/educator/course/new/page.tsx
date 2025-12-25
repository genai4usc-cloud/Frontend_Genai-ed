'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, Profile } from '@/lib/supabase';
import EducatorLayout from '@/components/EducatorLayout';
import { ArrowLeft, GraduationCap, FileText, Users, BookOpen, FolderOpen, Upload, Plus, X, Save, File } from 'lucide-react';
import { toast } from 'sonner';
import { uploadCourseFile, uploadMultipleFiles, parseStudentCSV, validateFileSize, validateFileType } from '@/lib/fileUpload';

export default function CreateCourse() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
  const [studentRosterFile, setStudentRosterFile] = useState<File | null>(null);
  const [courseMaterialsFiles, setCourseMaterialsFiles] = useState<File[]>([]);
  const [backgroundMaterialsFiles, setBackgroundMaterialsFiles] = useState<File[]>([]);

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
      setInstructorName(`${profileData.first_name} ${profileData.last_name}`);
    } catch (error) {
      console.error('Error loading profile:', error);
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

  const handleSaveCourse = async () => {
    if (!profile) return;

    if (!courseNumber.trim() || !courseTitle.trim()) {
      toast.error('Please fill in required fields: Course Number and Course Title');
      return;
    }

    setSaving(true);
    try {
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .insert({
          educator_id: profile.id,
          code: courseNumber.trim(),
          title: courseTitle.trim(),
          semester: semester,
          section: section.trim(),
          instructor_name: instructorName.trim(),
          description: '',
        })
        .select()
        .single();

      if (courseError) throw courseError;

      let syllabusUrl: string | null = null;
      const courseMaterialsUrls: string[] = [];
      const backgroundMaterialsUrls: string[] = [];

      if (syllabusFile) {
        toast.info('Uploading syllabus...');
        syllabusUrl = await uploadCourseFile(courseData.id, 'syllabus', syllabusFile);
      }

      if (courseMaterialsFiles.length > 0) {
        toast.info(`Uploading ${courseMaterialsFiles.length} course materials...`);
        const urls = await uploadMultipleFiles(courseData.id, 'materials', courseMaterialsFiles);
        courseMaterialsUrls.push(...urls);
      }

      if (backgroundMaterialsFiles.length > 0) {
        toast.info(`Uploading ${backgroundMaterialsFiles.length} background materials...`);
        const urls = await uploadMultipleFiles(courseData.id, 'background', backgroundMaterialsFiles);
        backgroundMaterialsUrls.push(...urls);
      }

      const { error: updateError } = await supabase
        .from('courses')
        .update({
          syllabus_url: syllabusUrl,
          course_materials_urls: courseMaterialsUrls,
          background_materials_urls: backgroundMaterialsUrls,
        })
        .eq('id', courseData.id);

      if (updateError) throw updateError;

      if (teachingAssistants.length > 0) {
        const taRecords = teachingAssistants.map(email => ({
          course_id: courseData.id,
          email: email,
        }));
        await supabase.from('course_teaching_assistants').insert(taRecords);
      }

      if (students.length > 0) {
        const studentRecords = students.map(email => ({
          course_id: courseData.id,
          email: email,
        }));
        await supabase.from('course_students').insert(studentRecords);
      }

      if (textbooks.length > 0) {
        const textbookRecords = textbooks.map(titleIsbn => ({
          course_id: courseData.id,
          title_isbn: titleIsbn,
        }));
        await supabase.from('course_textbooks').insert(textbookRecords);
      }

      toast.success('Course created successfully!');
      router.push(`/educator/course/${courseData.id}`);
    } catch (error) {
      console.error('Error creating course:', error);
      toast.error('Failed to create course. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
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
              <h1 className="text-3xl font-bold text-gray-900">Add My Course</h1>
              <p className="text-gray-600 mt-1">Create and configure a new course</p>
            </div>
          </div>
          <button
            onClick={handleSaveCourse}
            disabled={saving}
            className="bg-[#990000] hover:bg-[#770000] text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Course'}
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-8">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-[#990000] p-3 rounded-xl">
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#990000] focus:border-transparent"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#990000] focus:border-transparent"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#990000] focus:border-transparent"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#990000] focus:border-transparent"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#990000] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-[#FFCC00] p-3 rounded-xl">
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

            {!syllabusFile ? (
              <button
                onClick={() => syllabusInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-gray-400 transition-colors"
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-700 font-medium mb-1">Click to upload syllabus</p>
                <p className="text-gray-500 text-sm">PDF, DOC, DOCX up to 10MB</p>
              </button>
            ) : (
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
                    onClick={() => setSyllabusFile(null)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-[#990000] p-3 rounded-xl">
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
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#990000] focus:border-transparent"
              />
              <button
                onClick={addTeachingAssistant}
                className="bg-[#FFCC00] hover:bg-[#EDB900] p-3 rounded-lg transition-colors"
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
              <div className="bg-[#FFCC00] p-3 rounded-xl">
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

            {!studentRosterFile ? (
              <button
                onClick={() => studentRosterInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-gray-400 transition-colors mb-4"
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-700 font-medium">Upload student list (Excel/CSV)</p>
              </button>
            ) : (
              <div className="border-2 border-green-300 bg-green-50 rounded-xl p-6 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <File className="w-8 h-8 text-green-600" />
                    <div>
                      <p className="font-medium text-gray-900">{studentRosterFile.name}</p>
                      <p className="text-sm text-gray-600">{(studentRosterFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setStudentRosterFile(null)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-2 mb-4">
              <input
                type="email"
                value={studentInput}
                onChange={(e) => setStudentInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addStudent()}
                placeholder="Enter student email"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#990000] focus:border-transparent"
              />
              <button
                onClick={addStudent}
                className="bg-[#FFCC00] hover:bg-[#EDB900] p-3 rounded-lg transition-colors"
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
              <div className="bg-[#FFCC00] p-3 rounded-xl">
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
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#990000] focus:border-transparent"
              />
              <button
                onClick={addTextbook}
                className="bg-[#FFCC00] hover:bg-[#EDB900] p-3 rounded-lg transition-colors"
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
              <div className="bg-[#990000] p-3 rounded-xl">
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
              className="w-full border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-gray-400 transition-colors mb-4"
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-700 font-medium mb-1">Upload course materials</p>
              <p className="text-gray-500 text-sm">PDFs, documents, presentations, etc.</p>
            </button>

            {courseMaterialsFiles.length > 0 && (
              <div className="space-y-2">
                {courseMaterialsFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg">
                    <div className="flex items-center gap-3">
                      <File className="w-5 h-5 text-gray-600" />
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
              <div className="bg-[#990000] p-3 rounded-xl">
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
              className="w-full border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-gray-400 transition-colors mb-4"
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-700 font-medium mb-1">Upload background materials</p>
              <p className="text-gray-500 text-sm">PDFs, documents, presentations, etc.</p>
            </button>

            {backgroundMaterialsFiles.length > 0 && (
              <div className="space-y-2">
                {backgroundMaterialsFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg">
                    <div className="flex items-center gap-3">
                      <File className="w-5 h-5 text-gray-600" />
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
      </div>
    </EducatorLayout>
  );
}
