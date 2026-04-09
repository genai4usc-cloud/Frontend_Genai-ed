/*
  # Fix course quiz analytics ambiguity

  1. Resolves PL/pgSQL ambiguity around quiz_batch_id in get_course_quiz_analytics
  2. Keeps educator-only authorization logic unchanged
*/

CREATE OR REPLACE FUNCTION public.get_course_quiz_analytics(p_course_id uuid)
RETURNS TABLE(
  quiz_batch_id uuid,
  total_students integer,
  completed_count integer,
  pending_count integer,
  avg_score numeric,
  highest_score numeric,
  lowest_score numeric,
  excellent_count integer,
  good_count integer,
  fair_count integer,
  needs_improvement_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_total_students integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.courses
    WHERE id = p_course_id
      AND educator_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to view analytics for this course';
  END IF;

  SELECT count(*)
  INTO v_total_students
  FROM public.course_students
  WHERE course_id = p_course_id;

  RETURN QUERY
  WITH course_batches AS (
    SELECT
      qb.id,
      qb.mode,
      qb.mcq_count,
      qb.short_answer_count
    FROM public.quiz_batch_courses qbc
    JOIN public.quiz_batches qb
      ON qb.id = qbc.quiz_batch_id
    WHERE qbc.course_id = p_course_id
  ),
  generated_counts AS (
    SELECT
      qg.quiz_batch_id,
      count(*)::integer AS generated_count
    FROM public.quiz_generated qg
    JOIN course_batches cb
      ON cb.id = qg.quiz_batch_id
    GROUP BY qg.quiz_batch_id
  ),
  attempt_scores AS (
    SELECT
      qa.quiz_batch_id,
      CASE
        WHEN cb.mode = 'online' AND (cb.mcq_count + cb.short_answer_count) > 0
          THEN round(
            (coalesce(qa.final_score, qa.raw_score, 0)::numeric
              / (cb.mcq_count + cb.short_answer_count)::numeric) * 100,
            1
          )
        WHEN ((cb.mcq_count * 2) + (cb.short_answer_count * 5)) > 0
          THEN round(
            (coalesce(qa.final_score, qa.raw_score, 0)::numeric
              / ((cb.mcq_count * 2) + (cb.short_answer_count * 5))::numeric) * 100,
            1
          )
        ELSE NULL
      END AS score_pct,
      qa.status
    FROM public.quiz_attempts qa
    JOIN course_batches cb
      ON cb.id = qa.quiz_batch_id
  ),
  online_stats AS (
    SELECT
      attempt_scores.quiz_batch_id,
      count(*) FILTER (WHERE status IN ('submitted', 'timed_out', 'graded'))::integer AS completed_count,
      round(avg(score_pct)::numeric, 1) AS avg_score,
      round(max(score_pct)::numeric, 1) AS highest_score,
      round(min(score_pct)::numeric, 1) AS lowest_score,
      count(*) FILTER (WHERE score_pct >= 90)::integer AS excellent_count,
      count(*) FILTER (WHERE score_pct >= 80 AND score_pct < 90)::integer AS good_count,
      count(*) FILTER (WHERE score_pct >= 70 AND score_pct < 80)::integer AS fair_count,
      count(*) FILTER (WHERE score_pct < 70)::integer AS needs_improvement_count
    FROM attempt_scores
    GROUP BY attempt_scores.quiz_batch_id
  )
  SELECT
    cb.id AS quiz_batch_id,
    v_total_students AS total_students,
    CASE
      WHEN cb.mode = 'online' THEN coalesce(os.completed_count, 0)
      ELSE coalesce(gc.generated_count, 0)
    END AS completed_count,
    greatest(
      v_total_students - CASE
        WHEN cb.mode = 'online' THEN coalesce(os.completed_count, 0)
        ELSE coalesce(gc.generated_count, 0)
      END,
      0
    )::integer AS pending_count,
    os.avg_score,
    os.highest_score,
    os.lowest_score,
    coalesce(os.excellent_count, 0) AS excellent_count,
    coalesce(os.good_count, 0) AS good_count,
    coalesce(os.fair_count, 0) AS fair_count,
    coalesce(os.needs_improvement_count, 0) AS needs_improvement_count
  FROM course_batches cb
  LEFT JOIN generated_counts gc
    ON gc.quiz_batch_id = cb.id
  LEFT JOIN online_stats os
    ON os.quiz_batch_id = cb.id
  ORDER BY cb.id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_course_quiz_analytics(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_course_quiz_analytics(uuid) TO authenticated;
