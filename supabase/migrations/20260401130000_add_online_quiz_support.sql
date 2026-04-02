/*
  # Add online quiz support

  1. quiz_batches
    - availability, timer, publish, and grade release controls

  2. quiz_attempts
    - one online attempt per generated quiz/student

  3. quiz_attempt_answers
    - saved student answers plus AI and educator review fields

  4. Security
    - educator access for owned quiz batches
    - student access for their own attempts/answers
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'quiz_batches'
      AND column_name = 'available_at'
  ) THEN
    ALTER TABLE public.quiz_batches ADD COLUMN available_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'quiz_batches'
      AND column_name = 'due_at'
  ) THEN
    ALTER TABLE public.quiz_batches ADD COLUMN due_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'quiz_batches'
      AND column_name = 'time_limit_minutes'
  ) THEN
    ALTER TABLE public.quiz_batches ADD COLUMN time_limit_minutes integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'quiz_batches'
      AND column_name = 'published_at'
  ) THEN
    ALTER TABLE public.quiz_batches ADD COLUMN published_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'quiz_batches'
      AND column_name = 'grade_release_mode'
  ) THEN
    ALTER TABLE public.quiz_batches ADD COLUMN grade_release_mode text DEFAULT 'manual';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'quiz_batches'
      AND column_name = 'grade_release_at'
  ) THEN
    ALTER TABLE public.quiz_batches ADD COLUMN grade_release_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'quiz_batches'
      AND column_name = 'grades_published_at'
  ) THEN
    ALTER TABLE public.quiz_batches ADD COLUMN grades_published_at timestamptz;
  END IF;
END $$;

ALTER TABLE public.quiz_batches
  DROP CONSTRAINT IF EXISTS quiz_batches_grade_release_mode_check;

ALTER TABLE public.quiz_batches
  ADD CONSTRAINT quiz_batches_grade_release_mode_check
  CHECK (
    grade_release_mode IS NULL
    OR grade_release_mode IN ('manual', 'scheduled')
  );

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_generated_id uuid NOT NULL REFERENCES public.quiz_generated(id) ON DELETE CASCADE,
  quiz_batch_id uuid NOT NULL REFERENCES public.quiz_batches(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in_progress',
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  expires_at timestamptz NOT NULL,
  raw_score numeric(8,2),
  final_score numeric(8,2),
  overall_feedback text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  grade_released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quiz_generated_id),
  UNIQUE (quiz_batch_id, student_id)
);

ALTER TABLE public.quiz_attempts
  DROP CONSTRAINT IF EXISTS quiz_attempts_status_check;

ALTER TABLE public.quiz_attempts
  ADD CONSTRAINT quiz_attempts_status_check
  CHECK (status IN ('in_progress', 'submitted', 'timed_out', 'graded'));

CREATE TABLE IF NOT EXISTS public.quiz_attempt_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_index integer NOT NULL,
  question_prompt text NOT NULL,
  options_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  selected_option text,
  ai_is_correct boolean,
  ai_correct_option text,
  ai_points_awarded numeric(8,2),
  ai_feedback text,
  educator_points_awarded numeric(8,2),
  educator_feedback text,
  final_points_awarded numeric(8,2),
  final_feedback text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, question_index)
);

CREATE INDEX IF NOT EXISTS idx_quiz_batches_mode_status
  ON public.quiz_batches(mode, status);

CREATE INDEX IF NOT EXISTS idx_quiz_batches_grade_release_at
  ON public.quiz_batches(grade_release_at);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_id
  ON public.quiz_attempts(student_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_batch_id
  ON public.quiz_attempts(quiz_batch_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempt_answers_attempt_id
  ON public.quiz_attempt_answers(attempt_id);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempt_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Educators can view own quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Educators can insert own quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Educators can update own quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Students can view own quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Students can insert own quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Students can update own quiz attempts" ON public.quiz_attempts;

CREATE POLICY "Educators can view own quiz attempts"
  ON public.quiz_attempts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.quiz_batches
      WHERE quiz_batches.id = quiz_attempts.quiz_batch_id
        AND quiz_batches.educator_id = auth.uid()
    )
  );

CREATE POLICY "Educators can insert own quiz attempts"
  ON public.quiz_attempts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.quiz_batches
      WHERE quiz_batches.id = quiz_attempts.quiz_batch_id
        AND quiz_batches.educator_id = auth.uid()
    )
  );

CREATE POLICY "Educators can update own quiz attempts"
  ON public.quiz_attempts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.quiz_batches
      WHERE quiz_batches.id = quiz_attempts.quiz_batch_id
        AND quiz_batches.educator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.quiz_batches
      WHERE quiz_batches.id = quiz_attempts.quiz_batch_id
        AND quiz_batches.educator_id = auth.uid()
    )
  );

CREATE POLICY "Students can view own quiz attempts"
  ON public.quiz_attempts FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Students can insert own quiz attempts"
  ON public.quiz_attempts FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update own quiz attempts"
  ON public.quiz_attempts FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Educators can view own quiz attempt answers" ON public.quiz_attempt_answers;
DROP POLICY IF EXISTS "Educators can insert own quiz attempt answers" ON public.quiz_attempt_answers;
DROP POLICY IF EXISTS "Educators can update own quiz attempt answers" ON public.quiz_attempt_answers;
DROP POLICY IF EXISTS "Students can view own quiz attempt answers" ON public.quiz_attempt_answers;
DROP POLICY IF EXISTS "Students can insert own quiz attempt answers" ON public.quiz_attempt_answers;
DROP POLICY IF EXISTS "Students can update own quiz attempt answers" ON public.quiz_attempt_answers;

CREATE POLICY "Educators can view own quiz attempt answers"
  ON public.quiz_attempt_answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.quiz_attempts qa
      JOIN public.quiz_batches qb
        ON qb.id = qa.quiz_batch_id
      WHERE qa.id = quiz_attempt_answers.attempt_id
        AND qb.educator_id = auth.uid()
    )
  );

CREATE POLICY "Educators can insert own quiz attempt answers"
  ON public.quiz_attempt_answers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.quiz_attempts qa
      JOIN public.quiz_batches qb
        ON qb.id = qa.quiz_batch_id
      WHERE qa.id = quiz_attempt_answers.attempt_id
        AND qb.educator_id = auth.uid()
    )
  );

CREATE POLICY "Educators can update own quiz attempt answers"
  ON public.quiz_attempt_answers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.quiz_attempts qa
      JOIN public.quiz_batches qb
        ON qb.id = qa.quiz_batch_id
      WHERE qa.id = quiz_attempt_answers.attempt_id
        AND qb.educator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.quiz_attempts qa
      JOIN public.quiz_batches qb
        ON qb.id = qa.quiz_batch_id
      WHERE qa.id = quiz_attempt_answers.attempt_id
        AND qb.educator_id = auth.uid()
    )
  );

CREATE POLICY "Students can view own quiz attempt answers"
  ON public.quiz_attempt_answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.quiz_attempts qa
      WHERE qa.id = quiz_attempt_answers.attempt_id
        AND qa.student_id = auth.uid()
    )
  );

CREATE POLICY "Students can insert own quiz attempt answers"
  ON public.quiz_attempt_answers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.quiz_attempts qa
      WHERE qa.id = quiz_attempt_answers.attempt_id
        AND qa.student_id = auth.uid()
    )
  );

CREATE POLICY "Students can update own quiz attempt answers"
  ON public.quiz_attempt_answers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.quiz_attempts qa
      WHERE qa.id = quiz_attempt_answers.attempt_id
        AND qa.student_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.quiz_attempts qa
      WHERE qa.id = quiz_attempt_answers.attempt_id
        AND qa.student_id = auth.uid()
    )
  );
