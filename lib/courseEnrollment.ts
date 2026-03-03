import { supabase } from './supabase';

type CourseStudentInsert = {
  course_id: string;
  email: string;
  student_id?: string | null;
};

export async function buildCourseStudentRecords(
  courseId: string,
  emails: string[]
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
  const missingEmails = normalizedEmails.filter(email => !profileIdByEmail.has(email));

  if (missingEmails.length > 0) {
    throw new Error(
      `These students must sign up before they can be enrolled: ${missingEmails.join(', ')}`
    );
  }

  return emailPairs.map(({ original, normalized }) => ({
    course_id: courseId,
    email: original,
    student_id: profileIdByEmail.get(normalized)!,
  }));
}
