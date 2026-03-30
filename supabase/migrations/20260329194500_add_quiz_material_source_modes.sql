/*
  # Add quiz material source modes

  1. quiz_batches
    - material_source_mode: general vs students
    - autofill_assignment_id: selected assignment source for autofill
    - general file metadata columns for shared quiz source

  2. quiz_batch_student_files
    - course_student_id if missing
    - source metadata for manual/autofill/general provenance
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'quiz_batches'
      AND column_name = 'material_source_mode'
  ) THEN
    ALTER TABLE public.quiz_batches
      ADD COLUMN material_source_mode text;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'quiz_batches'
      AND column_name = 'autofill_assignment_id'
  ) THEN
    ALTER TABLE public.quiz_batches
      ADD COLUMN autofill_assignment_id uuid REFERENCES public.assignments(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'quiz_batches'
      AND column_name = 'general_file_name'
  ) THEN
    ALTER TABLE public.quiz_batches
      ADD COLUMN general_file_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'quiz_batches'
      AND column_name = 'general_file_url'
  ) THEN
    ALTER TABLE public.quiz_batches
      ADD COLUMN general_file_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'quiz_batches'
      AND column_name = 'general_storage_path'
  ) THEN
    ALTER TABLE public.quiz_batches
      ADD COLUMN general_storage_path text;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'quiz_batches'
      AND column_name = 'general_file_mime'
  ) THEN
    ALTER TABLE public.quiz_batches
      ADD COLUMN general_file_mime text;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'quiz_batches'
      AND column_name = 'general_file_size_bytes'
  ) THEN
    ALTER TABLE public.quiz_batches
      ADD COLUMN general_file_size_bytes bigint;
  END IF;
END $$;

ALTER TABLE public.quiz_batches
  DROP CONSTRAINT IF EXISTS quiz_batches_material_source_mode_check;

ALTER TABLE public.quiz_batches
  ADD CONSTRAINT quiz_batches_material_source_mode_check
  CHECK (
    material_source_mode IS NULL
    OR material_source_mode IN ('general', 'students')
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'quiz_batch_student_files'
      AND column_name = 'course_student_id'
  ) THEN
    ALTER TABLE public.quiz_batch_student_files
      ADD COLUMN course_student_id uuid REFERENCES public.course_students(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'quiz_batch_student_files'
      AND column_name = 'source_type'
  ) THEN
    ALTER TABLE public.quiz_batch_student_files
      ADD COLUMN source_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'quiz_batch_student_files'
      AND column_name = 'source_assignment_id'
  ) THEN
    ALTER TABLE public.quiz_batch_student_files
      ADD COLUMN source_assignment_id uuid REFERENCES public.assignments(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'quiz_batch_student_files'
      AND column_name = 'source_label'
  ) THEN
    ALTER TABLE public.quiz_batch_student_files
      ADD COLUMN source_label text;
  END IF;
END $$;

ALTER TABLE public.quiz_batch_student_files
  DROP CONSTRAINT IF EXISTS quiz_batch_student_files_source_type_check;

ALTER TABLE public.quiz_batch_student_files
  ADD CONSTRAINT quiz_batch_student_files_source_type_check
  CHECK (
    source_type IS NULL
    OR source_type IN ('manual', 'autofill', 'general')
  );

CREATE INDEX IF NOT EXISTS idx_quiz_batches_autofill_assignment_id
  ON public.quiz_batches(autofill_assignment_id);

CREATE INDEX IF NOT EXISTS idx_quiz_batch_student_files_course_student_id
  ON public.quiz_batch_student_files(course_student_id);

CREATE INDEX IF NOT EXISTS idx_quiz_batch_student_files_source_assignment_id
  ON public.quiz_batch_student_files(source_assignment_id);
