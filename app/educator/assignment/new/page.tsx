'use client';

import { ChangeEvent, MouseEvent, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, BookOpen, Brain, Calendar, FileText, Save, Send, Upload, Users } from 'lucide-react';
import { toast } from 'sonner';
import EducatorLayout from '@/components/EducatorLayout';
import SocraticStudioConfigurator from '@/components/socratic-writing/SocraticStudioConfigurator';
import { supabase, Course, Profile } from '@/lib/supabase';
import { uploadFile } from '@/lib/fileUpload';
import {
  getAssignmentSystemMissingMessage,
  isAssignmentSystemMissingError,
} from '@/lib/assignmentSystemErrors';
import {
  ASSIGNMENT_ALLOWED_FILE_TYPES,
  AssignmentSubmissionMode,
  DEFAULT_ASSIGNMENT_ALLOWED_MIME_TYPES,
  formatFileSizeLabel,
  sanitizeFileName,
} from '@/lib/assignments';
import {
  createDefaultStudioBlueprint,
  loadStudioDraft,
  saveStudioBlueprint,
  saveStudioDraft,
  SocraticStudioBlueprint,
} from '@/lib/socraticWriting';

type CourseRosterEntry = {
  course_student_id: string;
  student_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
};

const toDateTimeLocalValue = (value: string | null) => {
  if (!value) return '';

  const date = new Date(value);
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
};

const fromDateTimeLocalValue = (value: string) => {
  if (!value) return null;
  return new Date(value).toISOString();
};

export default function NewAssignmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetCourseId = searchParams.get('courseId');

  const [profile, setProfile] = useState<Profile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [roster, setRoster] = useState<CourseRosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState<'draft' | 'published' | null>(null);
  const [questionFile, setQuestionFile] = useState<File | null>(null);
  const [previewNumber, setPreviewNumber] = useState(1);
  const [assignmentSystemMissing, setAssignmentSystemMissing] = useState(false);
  const [assignmentExperience, setAssignmentExperience] = useState<'standard' | 'socratic'>(
    searchParams.get('mode') === 'socratic' ? 'socratic' : 'standard',
  );
  const [studioBlueprint, setStudioBlueprint] = useState<SocraticStudioBlueprint | null>(null);

  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pointsPossible, setPointsPossible] = useState('100');
  const [submissionMode, setSubmissionMode] = useState<AssignmentSubmissionMode>('file_upload');
  const [maxFiles, setMaxFiles] = useState('1');
  const [maxFileSizeMb, setMaxFileSizeMb] = useState('25');
  const [allowedMimeTypes, setAllowedMimeTypes] = useState<string[]>(DEFAULT_ASSIGNMENT_ALLOWED_MIME_TYPES);
  const [availableAt, setAvailableAt] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [lateUntil, setLateUntil] = useState('');

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? null,
    [courses, selectedCourseId],
  );

  const assignmentLabelPreview = selectedCourse
    ? `${selectedCourse.title} Assignment ${previewNumber}`
    : 'Select a course to generate the assignment label';

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    if (!selectedCourseId) {
      setRoster([]);
      setPreviewNumber(1);
      return;
    }

    void Promise.all([loadRoster(selectedCourseId), loadAssignmentPreview(selectedCourseId)]);
  }, [selectedCourseId]);

  useEffect(() => {
    const seed = createDefaultStudioBlueprint({
      assignmentId: `draft-${selectedCourseId || 'course'}`,
      courseId: selectedCourseId || 'course',
      courseCode: selectedCourse?.course_number || 'COURSE',
      courseTitle: selectedCourse?.title || 'Course',
      assignmentTitle: assignmentTitle.trim() || 'Socratic Writing Assignment',
      assignmentBrief: description.trim() || 'Use Clarify, Research, Build, and Write to produce the final essay.',
      dueAt: fromDateTimeLocalValue(dueAt) || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      pointsPossible: Number(pointsPossible) || 100,
    });

    const savedDraft = selectedCourseId ? loadStudioDraft(selectedCourseId) : null;
    const nextBlueprint = savedDraft
      ? {
          ...savedDraft,
          assignmentId: seed.assignmentId,
          courseId: seed.courseId,
          courseCode: seed.courseCode,
          courseTitle: seed.courseTitle,
          assignmentTitle: seed.assignmentTitle,
          assignmentBrief: seed.assignmentBrief,
          dueAt: seed.dueAt,
          pointsPossible: seed.pointsPossible,
        }
      : seed;

    setStudioBlueprint(nextBlueprint);
  }, [assignmentTitle, description, dueAt, pointsPossible, selectedCourse, selectedCourseId]);

  useEffect(() => {
    if (assignmentExperience !== 'socratic' || !selectedCourseId || !studioBlueprint) return;
    saveStudioDraft(selectedCourseId, studioBlueprint);
  }, [assignmentExperience, selectedCourseId, studioBlueprint]);

  const bootstrap = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

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

      const { data: courseRows, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('educator_id', user.id)
        .order('title', { ascending: true });

      if (courseError) {
        throw courseError;
      }

      const ownedCourses = courseRows || [];
      setCourses(ownedCourses);

      if (presetCourseId && ownedCourses.some((course) => course.id === presetCourseId)) {
        setSelectedCourseId(presetCourseId);
      } else if (ownedCourses.length === 1) {
        setSelectedCourseId(ownedCourses[0].id);
      }
    } catch (error) {
      console.error('Error loading assignment creation context:', error);
      toast.error('Failed to load assignment setup.');
    } finally {
      setLoading(false);
    }
  };

  const loadRoster = async (courseId: string) => {
    const { data, error } = await supabase.rpc('get_course_student_roster', {
      p_course_id: courseId,
    });

    if (error) {
      console.error('Error loading roster:', error);
      toast.error('Failed to load enrolled students for the selected course.');
      setRoster([]);
      return;
    }

    setRoster((data || []) as CourseRosterEntry[]);
  };

  const loadAssignmentPreview = async (courseId: string) => {
    const { data, error } = await supabase
      .from('assignments')
      .select('assignment_number')
      .eq('course_id', courseId)
      .order('assignment_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error loading assignment number preview:', error);
      if (isAssignmentSystemMissingError(error)) {
        setAssignmentSystemMissing(true);
        toast.error(getAssignmentSystemMissingMessage());
      }
      setPreviewNumber(1);
      return;
    }

    setPreviewNumber((data?.assignment_number || 0) + 1);
  };

  const toggleAllowedMimeType = (mime: string) => {
    setAllowedMimeTypes((current) =>
      current.includes(mime)
        ? current.filter((value) => value !== mime)
        : [...current, mime],
    );
  };

  const handleQuestionFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setQuestionFile(null);
      return;
    }

    if (file.type !== 'application/pdf') {
      toast.error('Assignment questions must be uploaded as a PDF.');
      event.target.value = '';
      return;
    }

    setQuestionFile(file);
  };

  const handleCreateAssignment = async (
    event: MouseEvent<HTMLButtonElement>,
    status: 'draft' | 'published',
  ) => {
    event.preventDefault();

    if (!selectedCourseId) {
      toast.error('Select a course first.');
      return;
    }

    if (!assignmentTitle.trim()) {
      toast.error('Add an assignment title.');
      return;
    }

    if (!dueAt) {
      toast.error('Set a due date before creating the assignment.');
      return;
    }

    if (assignmentSystemMissing) {
      toast.error(getAssignmentSystemMissingMessage());
      return;
    }

    if (
      (submissionMode === 'file_upload' || submissionMode === 'file_and_text')
      && allowedMimeTypes.length === 0
    ) {
      toast.error('Pick at least one allowed submission file type.');
      return;
    }

    setSavingStatus(status);

    let assignmentId: string | null = null;

    try {
      const { data: assignmentRows, error: createError } = await supabase.rpc(
        'create_course_assignment',
        {
          p_course_id: selectedCourseId,
          p_assignment_title: assignmentTitle.trim(),
          p_description: description,
          p_points_possible: Number(pointsPossible) || 0,
          p_status: status,
          p_submission_mode: submissionMode,
          p_allowed_mime_types:
            submissionMode === 'text_entry' ? [] : allowedMimeTypes,
          p_max_file_size_bytes:
            submissionMode === 'text_entry'
              ? null
              : (Number(maxFileSizeMb) || 0) * 1024 * 1024,
          p_max_files: submissionMode === 'text_entry' ? 0 : Number(maxFiles) || 1,
          p_available_at: fromDateTimeLocalValue(availableAt),
          p_due_at: fromDateTimeLocalValue(dueAt),
          p_late_until: fromDateTimeLocalValue(lateUntil),
          p_target_course_student_ids: null,
        },
      );

      if (createError) {
        if (isAssignmentSystemMissingError(createError)) {
          setAssignmentSystemMissing(true);
          throw new Error(getAssignmentSystemMissingMessage());
        }
        throw createError;
      }

      assignmentId = assignmentRows?.[0]?.id ?? null;

      if (!assignmentId) {
        throw new Error('Assignment creation did not return an ID.');
      }

      if (questionFile) {
        const storagePath = `assignment-questions/${assignmentId}/${Date.now()}-${sanitizeFileName(questionFile.name)}`;
        const uploadResult = await uploadFile(questionFile, storagePath, 'assignment-files');

        if (uploadResult.error || !uploadResult.url) {
          throw new Error(uploadResult.error || 'Failed to upload assignment question PDF.');
        }

        const { error: updateError } = await supabase
          .from('assignments')
          .update({
            question_file_name: questionFile.name,
            question_pdf_url: uploadResult.url,
            question_storage_path: storagePath,
            updated_at: new Date().toISOString(),
          })
          .eq('id', assignmentId);

        if (updateError) {
          throw updateError;
        }
      }

      if (assignmentExperience === 'socratic' && studioBlueprint) {
        saveStudioBlueprint(assignmentId, {
          ...studioBlueprint,
          assignmentId,
          courseId: selectedCourseId,
          courseCode: selectedCourse?.course_number || studioBlueprint.courseCode,
          courseTitle: selectedCourse?.title || studioBlueprint.courseTitle,
          assignmentTitle: assignmentTitle.trim(),
          assignmentBrief: description.trim() || studioBlueprint.assignmentBrief,
          dueAt: fromDateTimeLocalValue(dueAt) || studioBlueprint.dueAt,
          pointsPossible: Number(pointsPossible) || studioBlueprint.pointsPossible,
        });
      }

      toast.success(
        status === 'published'
          ? 'Assignment published successfully.'
          : 'Assignment saved as draft.',
      );

      router.push(`/educator/assignment/${assignmentId}`);
    } catch (error) {
      console.error('Error creating assignment:', error);

      if (assignmentId) {
        await supabase.from('assignments').delete().eq('id', assignmentId);
      }

      const message = error instanceof Error ? error.message : 'Failed to create assignment.';
      toast.error(message);
    } finally {
      setSavingStatus(null);
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
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create Assignment</h1>
          <p className="text-gray-600 mt-2">
            Build a Brightspace-style assignment with a question PDF, schedule, submission settings,
            and student targeting based on the selected course roster.
          </p>
        </div>

        <form className="space-y-6">
          {assignmentSystemMissing && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {getAssignmentSystemMissingMessage()}
            </div>
          )}

          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="bg-brand-maroon/10 p-3 rounded-xl">
                <FileText className="w-6 h-6 text-brand-maroon" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Assignment Basics</h2>
                <p className="text-sm text-gray-600">Select the course, set the student-facing label, and upload the assignment PDF.</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Course</label>
                <select
                  value={selectedCourseId}
                  onChange={(event) => setSelectedCourseId(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-maroon focus:border-brand-maroon"
                >
                  <option value="">Select a course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.course_number ? `${course.course_number} - ${course.title}` : course.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Assignment Label Preview</label>
                <div className="w-full px-3 py-2 rounded-lg border border-dashed border-brand-maroon/30 bg-brand-maroon/5 text-brand-maroon font-semibold">
                  {assignmentLabelPreview}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Assignment Title</label>
                <input
                  type="text"
                  value={assignmentTitle}
                  onChange={(event) => setAssignmentTitle(event.target.value)}
                  placeholder="Linear Regression Implementation"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-maroon focus:border-brand-maroon"
                />
                <p className="text-xs text-gray-500 mt-2">
                  This appears under the auto-generated label, for example: <span className="font-medium">DSML Assignment 1</span> then <span className="font-medium">Linear Regression Implementation</span>.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Question PDF <span className="text-gray-400">(Optional)</span></label>
                <label className="flex items-center justify-between gap-3 border border-gray-300 rounded-lg px-4 py-3 cursor-pointer hover:border-brand-maroon transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <Upload className="w-5 h-5 text-brand-maroon flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {questionFile ? questionFile.name : 'Upload assignment question PDF if you have one'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {questionFile ? formatFileSizeLabel(questionFile.size) : 'PDF only'}
                      </p>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handleQuestionFileChange}
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Description / Instructions</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={6}
                placeholder="Add assignment instructions, submission expectations, grading notes, or any other context students should see."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-maroon focus:border-brand-maroon resize-none"
              />
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="bg-purple-50 p-3 rounded-xl">
                <Brain className="w-6 h-6 text-purple-700" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Assignment Experience</h2>
                <p className="text-sm text-gray-600">
                  Keep the standard submission flow, or prototype the new Socratic Writing Studio experience.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setAssignmentExperience('standard')}
                className={`rounded-2xl border p-5 text-left transition-colors ${
                  assignmentExperience === 'standard'
                    ? 'border-brand-maroon bg-brand-maroon/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="inline-flex items-center gap-2 text-base font-semibold text-gray-900">
                  <FileText className="w-5 h-5 text-brand-maroon" />
                  Standard Assignment
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Students upload files or submit text through the existing assignment workflow.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setAssignmentExperience('socratic')}
                className={`rounded-2xl border p-5 text-left transition-colors ${
                  assignmentExperience === 'socratic'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="inline-flex items-center gap-2 text-base font-semibold text-gray-900">
                  <BookOpen className="w-5 h-5 text-purple-700" />
                  Socratic Writing Studio
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Four-stage guided writing flow with per-stage AI policy, attached resources, a notebook, and ledger.
                </p>
              </button>
            </div>

            {assignmentExperience === 'socratic' && studioBlueprint && (
              <SocraticStudioConfigurator
                blueprint={studioBlueprint}
                onChange={setStudioBlueprint}
              />
            )}
          </section>

          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-3 rounded-xl">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Assigned Students</h2>
                <p className="text-sm text-gray-600">This assignment will automatically be assigned to every student currently enrolled in the selected course.</p>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <span className="font-medium text-gray-900">Course roster</span>
                <span className="text-sm text-gray-600">{roster.length} students</span>
              </div>
              {roster.length > 0 ? (
                <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                  {roster.map((student) => (
                    <div key={student.course_student_id} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {[student.first_name, student.last_name].filter(Boolean).join(' ') || student.email}
                        </p>
                        <p className="text-sm text-gray-600">{student.email}</p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {student.student_id ? 'Signed up' : 'Invite pending'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-8 text-sm text-gray-600 text-center">
                  {selectedCourseId
                    ? 'No students are enrolled in this course yet.'
                    : 'Select a course to preview the roster.'}
                </div>
              )}
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="bg-green-50 p-3 rounded-xl">
                <Upload className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Submission Settings</h2>
                <p className="text-sm text-gray-600">Choose how students can respond and what file formats you will accept.</p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Submission Mode</label>
                <select
                  value={submissionMode}
                  onChange={(event) => setSubmissionMode(event.target.value as AssignmentSubmissionMode)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-maroon focus:border-brand-maroon"
                >
                  <option value="file_upload">File upload only</option>
                  <option value="text_entry">Text entry only</option>
                  <option value="file_and_text">File upload + text entry</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Max Files</label>
                <input
                  type="number"
                  min={submissionMode === 'text_entry' ? 0 : 1}
                  value={maxFiles}
                  onChange={(event) => setMaxFiles(event.target.value)}
                  disabled={submissionMode === 'text_entry'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 focus:ring-2 focus:ring-brand-maroon focus:border-brand-maroon"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Max File Size (MB)</label>
                <input
                  type="number"
                  min={1}
                  value={maxFileSizeMb}
                  onChange={(event) => setMaxFileSizeMb(event.target.value)}
                  disabled={submissionMode === 'text_entry'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 focus:ring-2 focus:ring-brand-maroon focus:border-brand-maroon"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Allowed File Types</label>
              <div className="grid md:grid-cols-3 gap-3">
                {ASSIGNMENT_ALLOWED_FILE_TYPES.map((type) => (
                  <label
                    key={type.mime}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg border ${
                      allowedMimeTypes.includes(type.mime)
                        ? 'border-brand-maroon bg-brand-maroon/5'
                        : 'border-gray-200'
                    } ${submissionMode === 'text_entry' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <input
                      type="checkbox"
                      checked={allowedMimeTypes.includes(type.mime)}
                      onChange={() => toggleAllowedMimeType(type.mime)}
                      disabled={submissionMode === 'text_entry'}
                      className="rounded border-gray-300 text-brand-maroon focus:ring-brand-maroon"
                    />
                    <span className="text-sm text-gray-900">{type.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-50 p-3 rounded-xl">
                <Calendar className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Dates & Grading</h2>
                <p className="text-sm text-gray-600">Control the assignment window, late work, and total points.</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Available From</label>
                <input
                  type="datetime-local"
                  value={toDateTimeLocalValue(availableAt)}
                  onChange={(event) => setAvailableAt(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-maroon focus:border-brand-maroon"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Due Date</label>
                <input
                  type="datetime-local"
                  value={toDateTimeLocalValue(dueAt)}
                  onChange={(event) => setDueAt(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-maroon focus:border-brand-maroon"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Late Submissions Until</label>
                <input
                  type="datetime-local"
                  value={toDateTimeLocalValue(lateUntil)}
                  onChange={(event) => setLateUntil(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-maroon focus:border-brand-maroon"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Points Possible</label>
                <input
                  type="number"
                  min={0}
                  value={pointsPossible}
                  onChange={(event) => setPointsPossible(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-maroon focus:border-brand-maroon"
                />
              </div>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              disabled={savingStatus !== null}
              onClick={(event) => void handleCreateAssignment(event, 'draft')}
              className="border border-gray-300 text-gray-700 font-semibold py-3 px-5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {savingStatus === 'draft' ? 'Saving Draft...' : 'Save Draft'}
            </button>
            <button
              type="button"
              disabled={savingStatus !== null}
              onClick={(event) => void handleCreateAssignment(event, 'published')}
              className="bg-brand-maroon hover:bg-brand-maroon-hover text-white font-semibold py-3 px-5 rounded-lg transition-colors disabled:opacity-50 inline-flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {savingStatus === 'published' ? 'Publishing...' : 'Publish Assignment'}
            </button>
          </div>
        </form>
      </div>
    </EducatorLayout>
  );
}
