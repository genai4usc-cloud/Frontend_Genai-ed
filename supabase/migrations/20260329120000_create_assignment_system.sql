/*
  # Create assignment system

  1. Tables
    - assignments
    - assignment_students
    - assignment_submissions
    - assignment_submission_files

  2. Functions
    - create_course_assignment(uuid, ...)
    - get_student_course_assignments(uuid)

  3. Storage
    - assignment-files bucket
    - question file and submission file policies
*/

CREATE TABLE IF NOT EXISTS public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  educator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  assignment_number integer NOT NULL CHECK (assignment_number > 0),
  assignment_label text NOT NULL,
  assignment_title text NOT NULL,
  description text,
  question_file_name text,
  question_pdf_url text,
  question_storage_path text,
  points_possible integer NOT NULL DEFAULT 100 CHECK (points_possible >= 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed', 'archived')),
  submission_mode text NOT NULL DEFAULT 'file_upload' CHECK (submission_mode IN ('file_upload', 'text_entry', 'file_and_text')),
  allowed_mime_types jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(allowed_mime_types) = 'array'),
  max_file_size_bytes bigint,
  max_files integer NOT NULL DEFAULT 1 CHECK (max_files >= 0),
  available_at timestamptz,
  due_at timestamptz,
  late_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, assignment_number)
);

CREATE TABLE IF NOT EXISTS public.assignment_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  course_student_id uuid NOT NULL REFERENCES public.course_students(id) ON DELETE CASCADE,
  student_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, course_student_id)
);

CREATE TABLE IF NOT EXISTS public.assignment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  course_student_id uuid NOT NULL REFERENCES public.course_students(id) ON DELETE CASCADE,
  student_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submission_text text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'late', 'graded', 'returned')),
  submitted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_late boolean NOT NULL DEFAULT false,
  grade_score numeric(6,2),
  feedback_text text,
  feedback_returned_at timestamptz,
  grader_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (assignment_id, course_student_id)
);

CREATE TABLE IF NOT EXISTS public.assignment_submission_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.assignment_submissions(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  storage_path text NOT NULL,
  file_mime text,
  file_size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assignments_course_id ON public.assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_educator_id ON public.assignments(educator_id);
CREATE INDEX IF NOT EXISTS idx_assignment_students_assignment_id ON public.assignment_students(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_students_course_student_id ON public.assignment_students(course_student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_id ON public.assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_course_student_id ON public.assignment_submissions(course_student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submission_files_submission_id ON public.assignment_submission_files(submission_id);

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submission_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Educators can view own assignments" ON public.assignments;
DROP POLICY IF EXISTS "Educators can insert own assignments" ON public.assignments;
DROP POLICY IF EXISTS "Educators can update own assignments" ON public.assignments;
DROP POLICY IF EXISTS "Educators can delete own assignments" ON public.assignments;
DROP POLICY IF EXISTS "Students can view assigned published assignments" ON public.assignments;

CREATE POLICY "Educators can view own assignments"
  ON public.assignments FOR SELECT
  TO authenticated
  USING (educator_id = auth.uid());

CREATE POLICY "Educators can insert own assignments"
  ON public.assignments FOR INSERT
  TO authenticated
  WITH CHECK (educator_id = auth.uid());

CREATE POLICY "Educators can update own assignments"
  ON public.assignments FOR UPDATE
  TO authenticated
  USING (educator_id = auth.uid())
  WITH CHECK (educator_id = auth.uid());

CREATE POLICY "Educators can delete own assignments"
  ON public.assignments FOR DELETE
  TO authenticated
  USING (educator_id = auth.uid());

CREATE POLICY "Students can view assigned published assignments"
  ON public.assignments FOR SELECT
  TO authenticated
  USING (
    status IN ('published', 'closed')
    AND (available_at IS NULL OR available_at <= now())
    AND EXISTS (
      SELECT 1
      FROM public.assignment_students ast
      WHERE ast.assignment_id = assignments.id
        AND (
          ast.student_id = auth.uid()
          OR lower(ast.email) = lower(coalesce(auth.email(), ''))
        )
    )
  );

DROP POLICY IF EXISTS "Educators can view assignment targets" ON public.assignment_students;
DROP POLICY IF EXISTS "Educators can insert assignment targets" ON public.assignment_students;
DROP POLICY IF EXISTS "Educators can update assignment targets" ON public.assignment_students;
DROP POLICY IF EXISTS "Educators can delete assignment targets" ON public.assignment_students;
DROP POLICY IF EXISTS "Students can view own assignment targets" ON public.assignment_students;

CREATE POLICY "Educators can view assignment targets"
  ON public.assignment_students FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.assignments a
      WHERE a.id = assignment_students.assignment_id
        AND a.educator_id = auth.uid()
    )
  );

CREATE POLICY "Educators can insert assignment targets"
  ON public.assignment_students FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.assignments a
      WHERE a.id = assignment_students.assignment_id
        AND a.educator_id = auth.uid()
    )
  );

CREATE POLICY "Educators can update assignment targets"
  ON public.assignment_students FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.assignments a
      WHERE a.id = assignment_students.assignment_id
        AND a.educator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.assignments a
      WHERE a.id = assignment_students.assignment_id
        AND a.educator_id = auth.uid()
    )
  );

CREATE POLICY "Educators can delete assignment targets"
  ON public.assignment_students FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.assignments a
      WHERE a.id = assignment_students.assignment_id
        AND a.educator_id = auth.uid()
    )
  );

CREATE POLICY "Students can view own assignment targets"
  ON public.assignment_students FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR lower(email) = lower(coalesce(auth.email(), ''))
  );

DROP POLICY IF EXISTS "Educators can manage own assignment submissions" ON public.assignment_submissions;
DROP POLICY IF EXISTS "Students can view own assignment submissions" ON public.assignment_submissions;
DROP POLICY IF EXISTS "Students can insert own assignment submissions" ON public.assignment_submissions;
DROP POLICY IF EXISTS "Students can update own assignment submissions" ON public.assignment_submissions;

CREATE POLICY "Educators can manage own assignment submissions"
  ON public.assignment_submissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.assignments a
      WHERE a.id = assignment_submissions.assignment_id
        AND a.educator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.assignments a
      WHERE a.id = assignment_submissions.assignment_id
        AND a.educator_id = auth.uid()
    )
  );

CREATE POLICY "Students can view own assignment submissions"
  ON public.assignment_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.course_students cs
      WHERE cs.id = assignment_submissions.course_student_id
        AND (
          cs.student_id = auth.uid()
          OR lower(cs.email) = lower(coalesce(auth.email(), ''))
        )
    )
  );

CREATE POLICY "Students can insert own assignment submissions"
  ON public.assignment_submissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.assignment_students ast
      JOIN public.assignments a
        ON a.id = ast.assignment_id
      JOIN public.course_students cs
        ON cs.id = ast.course_student_id
      WHERE ast.assignment_id = assignment_submissions.assignment_id
        AND ast.course_student_id = assignment_submissions.course_student_id
        AND a.status = 'published'
        AND (a.available_at IS NULL OR a.available_at <= now())
        AND (
          a.due_at IS NULL
          OR a.due_at >= now()
          OR (a.late_until IS NOT NULL AND a.late_until >= now())
        )
        AND (
          cs.student_id = auth.uid()
          OR lower(cs.email) = lower(coalesce(auth.email(), ''))
        )
    )
  );

CREATE POLICY "Students can update own assignment submissions"
  ON public.assignment_submissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.course_students cs
      WHERE cs.id = assignment_submissions.course_student_id
        AND (
          cs.student_id = auth.uid()
          OR lower(cs.email) = lower(coalesce(auth.email(), ''))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.assignment_students ast
      JOIN public.assignments a
        ON a.id = ast.assignment_id
      JOIN public.course_students cs
        ON cs.id = ast.course_student_id
      WHERE ast.assignment_id = assignment_submissions.assignment_id
        AND ast.course_student_id = assignment_submissions.course_student_id
        AND a.status = 'published'
        AND (a.available_at IS NULL OR a.available_at <= now())
        AND (
          a.due_at IS NULL
          OR a.due_at >= now()
          OR (a.late_until IS NOT NULL AND a.late_until >= now())
        )
        AND (
          cs.student_id = auth.uid()
          OR lower(cs.email) = lower(coalesce(auth.email(), ''))
        )
    )
  );

DROP POLICY IF EXISTS "Educators can view assignment submission files" ON public.assignment_submission_files;
DROP POLICY IF EXISTS "Students can view own assignment submission files" ON public.assignment_submission_files;
DROP POLICY IF EXISTS "Students can insert own assignment submission files" ON public.assignment_submission_files;
DROP POLICY IF EXISTS "Students can delete own assignment submission files" ON public.assignment_submission_files;

CREATE POLICY "Educators can view assignment submission files"
  ON public.assignment_submission_files FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.assignment_submissions s
      JOIN public.assignments a
        ON a.id = s.assignment_id
      WHERE s.id = assignment_submission_files.submission_id
        AND a.educator_id = auth.uid()
    )
  );

CREATE POLICY "Students can view own assignment submission files"
  ON public.assignment_submission_files FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.assignment_submissions s
      JOIN public.course_students cs
        ON cs.id = s.course_student_id
      WHERE s.id = assignment_submission_files.submission_id
        AND (
          cs.student_id = auth.uid()
          OR lower(cs.email) = lower(coalesce(auth.email(), ''))
        )
    )
  );

CREATE POLICY "Students can insert own assignment submission files"
  ON public.assignment_submission_files FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.assignment_submissions s
      JOIN public.assignments a
        ON a.id = s.assignment_id
      JOIN public.course_students cs
        ON cs.id = s.course_student_id
      WHERE s.id = assignment_submission_files.submission_id
        AND a.status = 'published'
        AND (
          cs.student_id = auth.uid()
          OR lower(cs.email) = lower(coalesce(auth.email(), ''))
        )
    )
  );

CREATE POLICY "Students can delete own assignment submission files"
  ON public.assignment_submission_files FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.assignment_submissions s
      JOIN public.course_students cs
        ON cs.id = s.course_student_id
      WHERE s.id = assignment_submission_files.submission_id
        AND (
          cs.student_id = auth.uid()
          OR lower(cs.email) = lower(coalesce(auth.email(), ''))
        )
    )
  );

CREATE OR REPLACE FUNCTION public.create_course_assignment(
  p_course_id uuid,
  p_assignment_title text,
  p_description text,
  p_points_possible integer,
  p_status text,
  p_submission_mode text,
  p_allowed_mime_types jsonb,
  p_max_file_size_bytes bigint,
  p_max_files integer,
  p_available_at timestamptz,
  p_due_at timestamptz,
  p_late_until timestamptz,
  p_target_course_student_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  assignment_number integer,
  assignment_label text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_course_title text;
  v_assignment_id uuid;
  v_assignment_number integer;
  v_assignment_label text;
BEGIN
  SELECT c.title
  INTO v_course_title
  FROM public.courses c
  WHERE c.id = p_course_id
    AND c.educator_id = auth.uid();

  IF v_course_title IS NULL THEN
    RAISE EXCEPTION 'Not authorized to create assignments for this course';
  END IF;

  IF coalesce(trim(p_assignment_title), '') = '' THEN
    RAISE EXCEPTION 'Assignment title is required';
  END IF;

  IF p_due_at IS NOT NULL AND p_available_at IS NOT NULL AND p_due_at < p_available_at THEN
    RAISE EXCEPTION 'Due date must be after availability date';
  END IF;

  IF p_late_until IS NOT NULL AND p_due_at IS NOT NULL AND p_late_until < p_due_at THEN
    RAISE EXCEPTION 'Late submission deadline must be after the due date';
  END IF;

  SELECT coalesce(max(a.assignment_number), 0) + 1
  INTO v_assignment_number
  FROM public.assignments a
  WHERE a.course_id = p_course_id;

  v_assignment_label := format('%s Assignment %s', v_course_title, v_assignment_number);

  INSERT INTO public.assignments (
    educator_id,
    course_id,
    assignment_number,
    assignment_label,
    assignment_title,
    description,
    points_possible,
    status,
    submission_mode,
    allowed_mime_types,
    max_file_size_bytes,
    max_files,
    available_at,
    due_at,
    late_until
  )
  VALUES (
    auth.uid(),
    p_course_id,
    v_assignment_number,
    v_assignment_label,
    trim(p_assignment_title),
    nullif(trim(coalesce(p_description, '')), ''),
    coalesce(p_points_possible, 100),
    coalesce(p_status, 'draft'),
    coalesce(p_submission_mode, 'file_upload'),
    coalesce(p_allowed_mime_types, '[]'::jsonb),
    p_max_file_size_bytes,
    coalesce(p_max_files, 1),
    p_available_at,
    p_due_at,
    p_late_until
  )
  RETURNING assignments.id INTO v_assignment_id;

  INSERT INTO public.assignment_students (
    assignment_id,
    course_student_id,
    student_id,
    email
  )
  SELECT
    v_assignment_id,
    cs.id,
    cs.student_id,
    cs.email
  FROM public.course_students cs
  WHERE cs.course_id = p_course_id
    AND (
      p_target_course_student_ids IS NULL
      OR cardinality(p_target_course_student_ids) = 0
      OR cs.id = ANY (p_target_course_student_ids)
    );

  RETURN QUERY
  SELECT v_assignment_id, v_assignment_number, v_assignment_label;
END;
$$;

REVOKE ALL ON FUNCTION public.create_course_assignment(
  uuid,
  text,
  text,
  integer,
  text,
  text,
  jsonb,
  bigint,
  integer,
  timestamptz,
  timestamptz,
  timestamptz,
  uuid[]
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_course_assignment(
  uuid,
  text,
  text,
  integer,
  text,
  text,
  jsonb,
  bigint,
  integer,
  timestamptz,
  timestamptz,
  timestamptz,
  uuid[]
) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_student_course_assignments(p_course_id uuid)
RETURNS TABLE (
  id uuid,
  course_id uuid,
  assignment_label text,
  assignment_title text,
  description text,
  question_file_name text,
  question_pdf_url text,
  question_storage_path text,
  points_possible integer,
  status text,
  submission_mode text,
  allowed_mime_types jsonb,
  max_file_size_bytes bigint,
  max_files integer,
  available_at timestamptz,
  due_at timestamptz,
  late_until timestamptz,
  created_at timestamptz,
  submission_id uuid,
  submission_status text,
  submitted_at timestamptz,
  submission_text text,
  is_late boolean,
  grade_score numeric,
  feedback_text text,
  feedback_returned_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
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
    a.id,
    a.course_id,
    a.assignment_label,
    a.assignment_title,
    a.description,
    a.question_file_name,
    a.question_pdf_url,
    a.question_storage_path,
    a.points_possible,
    a.status,
    a.submission_mode,
    a.allowed_mime_types,
    a.max_file_size_bytes,
    a.max_files,
    a.available_at,
    a.due_at,
    a.late_until,
    a.created_at,
    s.id AS submission_id,
    s.status AS submission_status,
    s.submitted_at,
    s.submission_text,
    s.is_late,
    s.grade_score,
    s.feedback_text,
    s.feedback_returned_at
  FROM public.assignments a
  JOIN public.assignment_students ast
    ON ast.assignment_id = a.id
  JOIN public.course_students cs
    ON cs.id = ast.course_student_id
  LEFT JOIN public.assignment_submissions s
    ON s.assignment_id = a.id
   AND s.course_student_id = ast.course_student_id
  WHERE a.course_id = p_course_id
    AND a.status IN ('published', 'closed')
    AND (a.available_at IS NULL OR a.available_at <= now())
    AND (
      cs.student_id = auth.uid()
      OR lower(cs.email) = lower(coalesce(auth.email(), ''))
    )
  ORDER BY coalesce(a.due_at, a.created_at) ASC, a.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_student_course_assignments(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_student_course_assignments(uuid) TO authenticated;

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'assignment-files',
  'assignment-files',
  true,
  52428800,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/jpeg',
    'image/png'
  ]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can view assignment files" ON storage.objects;
DROP POLICY IF EXISTS "Educators can upload assignment question files" ON storage.objects;
DROP POLICY IF EXISTS "Educators can update assignment question files" ON storage.objects;
DROP POLICY IF EXISTS "Educators can delete assignment question files" ON storage.objects;
DROP POLICY IF EXISTS "Students can upload assignment submission files" ON storage.objects;
DROP POLICY IF EXISTS "Students can update assignment submission files" ON storage.objects;
DROP POLICY IF EXISTS "Students can delete assignment submission files" ON storage.objects;

CREATE POLICY "Authenticated users can view assignment files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'assignment-files');

CREATE POLICY "Educators can upload assignment question files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'assignment-files'
    AND (storage.foldername(name))[1] = 'assignment-questions'
    AND EXISTS (
      SELECT 1
      FROM public.assignments a
      WHERE a.id::text = (storage.foldername(name))[2]
        AND a.educator_id = auth.uid()
    )
  );

CREATE POLICY "Educators can update assignment question files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'assignment-files'
    AND (storage.foldername(name))[1] = 'assignment-questions'
    AND EXISTS (
      SELECT 1
      FROM public.assignments a
      WHERE a.id::text = (storage.foldername(name))[2]
        AND a.educator_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'assignment-files'
    AND (storage.foldername(name))[1] = 'assignment-questions'
    AND EXISTS (
      SELECT 1
      FROM public.assignments a
      WHERE a.id::text = (storage.foldername(name))[2]
        AND a.educator_id = auth.uid()
    )
  );

CREATE POLICY "Educators can delete assignment question files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'assignment-files'
    AND (storage.foldername(name))[1] = 'assignment-questions'
    AND EXISTS (
      SELECT 1
      FROM public.assignments a
      WHERE a.id::text = (storage.foldername(name))[2]
        AND a.educator_id = auth.uid()
    )
  );

CREATE POLICY "Students can upload assignment submission files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'assignment-files'
    AND (storage.foldername(name))[1] = 'assignment-submissions'
    AND EXISTS (
      SELECT 1
      FROM public.assignment_students ast
      JOIN public.assignments a
        ON a.id = ast.assignment_id
      JOIN public.course_students cs
        ON cs.id = ast.course_student_id
      WHERE a.id::text = (storage.foldername(name))[2]
        AND cs.id::text = (storage.foldername(name))[3]
        AND a.status = 'published'
        AND (
          cs.student_id = auth.uid()
          OR lower(cs.email) = lower(coalesce(auth.email(), ''))
        )
    )
  );

CREATE POLICY "Students can update assignment submission files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'assignment-files'
    AND (storage.foldername(name))[1] = 'assignment-submissions'
    AND EXISTS (
      SELECT 1
      FROM public.assignment_students ast
      JOIN public.assignments a
        ON a.id = ast.assignment_id
      JOIN public.course_students cs
        ON cs.id = ast.course_student_id
      WHERE a.id::text = (storage.foldername(name))[2]
        AND cs.id::text = (storage.foldername(name))[3]
        AND (
          cs.student_id = auth.uid()
          OR lower(cs.email) = lower(coalesce(auth.email(), ''))
        )
    )
  )
  WITH CHECK (
    bucket_id = 'assignment-files'
    AND (storage.foldername(name))[1] = 'assignment-submissions'
    AND EXISTS (
      SELECT 1
      FROM public.assignment_students ast
      JOIN public.assignments a
        ON a.id = ast.assignment_id
      JOIN public.course_students cs
        ON cs.id = ast.course_student_id
      WHERE a.id::text = (storage.foldername(name))[2]
        AND cs.id::text = (storage.foldername(name))[3]
        AND (
          cs.student_id = auth.uid()
          OR lower(cs.email) = lower(coalesce(auth.email(), ''))
        )
    )
  );

CREATE POLICY "Students can delete assignment submission files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'assignment-files'
    AND (storage.foldername(name))[1] = 'assignment-submissions'
    AND EXISTS (
      SELECT 1
      FROM public.assignment_students ast
      JOIN public.assignments a
        ON a.id = ast.assignment_id
      JOIN public.course_students cs
        ON cs.id = ast.course_student_id
      WHERE a.id::text = (storage.foldername(name))[2]
        AND cs.id::text = (storage.foldername(name))[3]
        AND (
          cs.student_id = auth.uid()
          OR lower(cs.email) = lower(coalesce(auth.email(), ''))
        )
    )
  );
