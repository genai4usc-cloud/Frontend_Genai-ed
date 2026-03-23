/*
  # Add student course generated quizzes RPC

  Exposes a student-safe function for reading the current user's generated
  in-class quizzes for a course without relying on chained client-side RLS joins.
*/

CREATE OR REPLACE FUNCTION public.get_student_course_generated_quizzes(p_course_id uuid)
RETURNS TABLE (
  id uuid,
  quiz_batch_id uuid,
  quiz_name text,
  status text,
  student_file_name text,
  mcq_count integer,
  short_answer_count integer,
  created_at timestamptz,
  quiz_content_json jsonb,
  answers_content_json jsonb,
  quiz_pdf_url text,
  answers_pdf_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.course_students cs
    WHERE cs.course_id = p_course_id
      AND (
        cs.student_id = auth.uid()
        OR lower(cs.email) = lower(coalesce(auth.email(), ''))
      )
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    qg.id,
    qg.quiz_batch_id,
    qb.quiz_name,
    qb.status,
    qg.student_file_name,
    qg.mcq_count,
    qg.short_answer_count,
    qg.created_at,
    qg.quiz_content_json,
    qg.answers_content_json,
    qg.quiz_pdf_url,
    qg.answers_pdf_url
  FROM public.quiz_generated qg
  JOIN public.quiz_batches qb
    ON qb.id = qg.quiz_batch_id
  JOIN public.quiz_batch_courses qbc
    ON qbc.quiz_batch_id = qb.id
  WHERE qbc.course_id = p_course_id
    AND qg.student_id = auth.uid()
    AND qb.status = 'generated'
  ORDER BY qg.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_student_course_generated_quizzes(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_student_course_generated_quizzes(uuid) TO authenticated;
