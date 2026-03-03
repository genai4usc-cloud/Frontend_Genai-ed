import { supabase } from './supabase';

type CourseStudentInsert = {
  course_id: string;
  email: string;
  student_id?: string | null;
};

type BuildCourseStudentRecordsOptions = {
  existingStudentIdsByEmail?: Map<string, string>;
};

export async function buildCourseStudentRecords(
  courseId: string,
  emails: string[],
  options: BuildCourseStudentRecordsOptions = {}
): Promise<CourseStudentInsert[]> {
  const emailPairs = Array.from(
    new Set(
      emails
        .map(email => email.trim())
        .filter(Boolean)
    )
  ).map(email => ({
    original: email,
    normalized: email.toLowerCase(),
  }));

  const normalizedEmails = emailPairs.map(({ normalized }) => normalized);

  if (normalizedEmails.length === 0) {
    return [];
  }

  const emailFilter = emailPairs
    .map(({ original }) => `email.ilike.${original.replace(/,/g, '\\,')}`)
    .join(',');

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email')
    .or(emailFilter);

  if (error) {
    throw error;
  }

  const profileIdByEmail = new Map(
    (profiles ?? []).map(profile => [profile.email.toLowerCase(), profile.id])
  );
  for (const [email, studentId] of options.existingStudentIdsByEmail ?? new Map()) {
    if (studentId) {
      profileIdByEmail.set(email.toLowerCase(), studentId);
    }
  }

  const unresolvedEmails = normalizedEmails.filter(email => !profileIdByEmail.has(email));

  if (unresolvedEmails.length > 0) {
    throw new Error(
      `These students must sign up before they can be enrolled: ${unresolvedEmails.join(', ')}`
    );
  }

  return emailPairs.map(({ original, normalized }) => ({
    course_id: courseId,
    email: original,
    student_id: profileIdByEmail.get(normalized)!,
  }));
}
