/*
  # Add online quiz integrity tracking

  1. quiz_attempts
    - refresh and violation counters
    - auto-submit reason metadata

  2. quiz_attempt_events
    - per-attempt integrity and refresh event log

  3. Security
    - educator access for owned quiz batches
    - student access for their own attempt events
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'quiz_attempts'
      AND column_name = 'refresh_count'
  ) THEN
    ALTER TABLE public.quiz_attempts ADD COLUMN refresh_count integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'quiz_attempts'
      AND column_name = 'integrity_warning_count'
  ) THEN
    ALTER TABLE public.quiz_attempts ADD COLUMN integrity_warning_count integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'quiz_attempts'
      AND column_name = 'integrity_violation_count'
  ) THEN
    ALTER TABLE public.quiz_attempts ADD COLUMN integrity_violation_count integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'quiz_attempts'
      AND column_name = 'fullscreen_exit_warning_count'
  ) THEN
    ALTER TABLE public.quiz_attempts ADD COLUMN fullscreen_exit_warning_count integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'quiz_attempts'
      AND column_name = 'policy_auto_submit_reason'
  ) THEN
    ALTER TABLE public.quiz_attempts ADD COLUMN policy_auto_submit_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'quiz_attempts'
      AND column_name = 'last_policy_event_at'
  ) THEN
    ALTER TABLE public.quiz_attempts ADD COLUMN last_policy_event_at timestamptz;
  END IF;
END $$;

ALTER TABLE public.quiz_attempts
  DROP CONSTRAINT IF EXISTS quiz_attempts_policy_auto_submit_reason_check;

ALTER TABLE public.quiz_attempts
  ADD CONSTRAINT quiz_attempts_policy_auto_submit_reason_check
  CHECK (
    policy_auto_submit_reason IS NULL
    OR policy_auto_submit_reason IN ('refresh_limit', 'policy_violation', 'time_expired')
  );

CREATE TABLE IF NOT EXISTS public.quiz_attempt_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempt_events_attempt_id
  ON public.quiz_attempt_events(attempt_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempt_events_created_at
  ON public.quiz_attempt_events(created_at DESC);

ALTER TABLE public.quiz_attempt_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Educators can view own quiz attempt events" ON public.quiz_attempt_events;
DROP POLICY IF EXISTS "Educators can insert own quiz attempt events" ON public.quiz_attempt_events;
DROP POLICY IF EXISTS "Educators can update own quiz attempt events" ON public.quiz_attempt_events;
DROP POLICY IF EXISTS "Students can view own quiz attempt events" ON public.quiz_attempt_events;
DROP POLICY IF EXISTS "Students can insert own quiz attempt events" ON public.quiz_attempt_events;

CREATE POLICY "Educators can view own quiz attempt events"
  ON public.quiz_attempt_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.quiz_attempts qa
      JOIN public.quiz_batches qb
        ON qb.id = qa.quiz_batch_id
      WHERE qa.id = quiz_attempt_events.attempt_id
        AND qb.educator_id = auth.uid()
    )
  );

CREATE POLICY "Educators can insert own quiz attempt events"
  ON public.quiz_attempt_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.quiz_attempts qa
      JOIN public.quiz_batches qb
        ON qb.id = qa.quiz_batch_id
      WHERE qa.id = quiz_attempt_events.attempt_id
        AND qb.educator_id = auth.uid()
    )
  );

CREATE POLICY "Educators can update own quiz attempt events"
  ON public.quiz_attempt_events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.quiz_attempts qa
      JOIN public.quiz_batches qb
        ON qb.id = qa.quiz_batch_id
      WHERE qa.id = quiz_attempt_events.attempt_id
        AND qb.educator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.quiz_attempts qa
      JOIN public.quiz_batches qb
        ON qb.id = qa.quiz_batch_id
      WHERE qa.id = quiz_attempt_events.attempt_id
        AND qb.educator_id = auth.uid()
    )
  );

CREATE POLICY "Students can view own quiz attempt events"
  ON public.quiz_attempt_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.quiz_attempts qa
      WHERE qa.id = quiz_attempt_events.attempt_id
        AND qa.student_id = auth.uid()
    )
  );

CREATE POLICY "Students can insert own quiz attempt events"
  ON public.quiz_attempt_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.quiz_attempts qa
      WHERE qa.id = quiz_attempt_events.attempt_id
        AND qa.student_id = auth.uid()
    )
  );

