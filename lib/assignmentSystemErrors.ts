type SupabaseLikeError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

export const isAssignmentSystemMissingError = (error: unknown) => {
  const candidate = error as SupabaseLikeError | null;
  const message = `${candidate?.message || ''} ${candidate?.details || ''} ${candidate?.hint || ''}`.toLowerCase();
  const code = candidate?.code || '';

  if (code === 'PGRST202' || code === 'PGRST205') {
    return true;
  }

  return (
    message.includes('relation "public.assignments" does not exist')
    || message.includes('relation "assignments" does not exist')
    || message.includes('relation "public.assignment_students" does not exist')
    || message.includes('relation "assignment_students" does not exist')
    || message.includes('relation "public.assignment_submissions" does not exist')
    || message.includes('relation "assignment_submissions" does not exist')
    || message.includes('relation "public.assignment_submission_files" does not exist')
    || message.includes('relation "assignment_submission_files" does not exist')
    || message.includes('function public.create_course_assignment')
    || message.includes('function create_course_assignment')
    || message.includes('function public.get_student_course_assignments')
    || message.includes('function get_student_course_assignments')
  );
};

export const getAssignmentSystemMissingMessage = () =>
  'Assignment system database objects are missing. Apply the new Supabase assignment migration first.';
