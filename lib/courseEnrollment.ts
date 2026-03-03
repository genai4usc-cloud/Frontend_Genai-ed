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

  const profileIdByEmail = new Map<string, string>();
  options.existingStudentIdsByEmail?.forEach((studentId, email) => {
    if (studentId) {
      profileIdByEmail.set(email.toLowerCase(), studentId);
    }
  });

  const unresolvedEmails = normalizedEmails.filter(email => !profileIdByEmail.has(email));

  if (unresolvedEmails.length > 0) {
    throw new Error(
      `Unable to resolve student IDs for: ${unresolvedEmails.join(', ')}. ` +
      `This deployment does not allow the educator client to look up other users' profiles. ` +
      `Use an existing enrollment row, a server-side lookup, or make course_students.student_id nullable.`
    );
  }

  return emailPairs.map(({ original, normalized }) => ({
    course_id: courseId,
    email: original,
    student_id: profileIdByEmail.get(normalized)!,
  }));
}
