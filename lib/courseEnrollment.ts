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
  const normalizedEmails = Array.from(
    new Set(
      emails
        .map(email => email.trim().toLowerCase())
        .filter(Boolean)
    )
  );

  if (normalizedEmails.length === 0) {
    return [];
  }

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email')
    .in('email', normalizedEmails);

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

  return normalizedEmails.map(email => ({
    course_id: courseId,
    email,
    student_id: profileIdByEmail.get(email)!,
  }));
}
