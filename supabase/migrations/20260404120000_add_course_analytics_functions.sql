/*
  # Add educator course analytics helper functions

  1. Functions
    - get_course_lecture_analytics(uuid)
    - get_course_quiz_analytics(uuid)
    - get_course_student_performance(uuid)

  2. Security
    - All functions are SECURITY DEFINER
    - Access is restricted to the educator who owns the course
*/

CREATE OR REPLACE FUNCTION public.get_course_lecture_analytics(p_course_id uuid)
RETURNS TABLE(
  lecture_id uuid,
  total_views bigint,
  completion_count bigint,
  completion_rate numeric,
  avg_watch_seconds numeric
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
  SELECT
    l.id AS lecture_id,
    count(slv.id) AS total_views,
    count(*) FILTER (WHERE slv.completed) AS completion_count,
    CASE
      WHEN v_total_students > 0
        THEN round((count(*) FILTER (WHERE slv.completed)::numeric / v_total_students::numeric) * 100, 1)
      ELSE 0
    END AS completion_rate,
    round(coalesce(avg(slv.duration_watched), 0)::numeric, 1) AS avg_watch_seconds
  FROM public.lecture_courses lc
  JOIN public.lectures l
    ON l.id = lc.lecture_id
  LEFT JOIN public.student_lecture_views slv
    ON slv.lecture_id = l.id
  WHERE lc.course_id = p_course_id
    AND l.creator_role = 'educator'
  GROUP BY l.id
  ORDER BY l.id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_course_lecture_analytics(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_course_lecture_analytics(uuid) TO authenticated;

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
        WHEN (
          CASE
            WHEN cb.mode = 'online' THEN (cb.mcq_count + cb.short_answer_count)
            ELSE ((cb.mcq_count * 2) + (cb.short_answer_count * 5))
          END
        ) > 0
          THEN round(
            (coalesce(qa.final_score, qa.raw_score, 0)::numeric
              / (
                CASE
                  WHEN cb.mode = 'online' THEN (cb.mcq_count + cb.short_answer_count)
                  ELSE ((cb.mcq_count * 2) + (cb.short_answer_count * 5))
                END
              )::numeric) * 100,
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
      quiz_batch_id,
      count(*) FILTER (WHERE status IN ('submitted', 'timed_out', 'graded'))::integer AS completed_count,
      round(avg(score_pct)::numeric, 1) AS avg_score,
      round(max(score_pct)::numeric, 1) AS highest_score,
      round(min(score_pct)::numeric, 1) AS lowest_score,
      count(*) FILTER (WHERE score_pct >= 90)::integer AS excellent_count,
      count(*) FILTER (WHERE score_pct >= 80 AND score_pct < 90)::integer AS good_count,
      count(*) FILTER (WHERE score_pct >= 70 AND score_pct < 80)::integer AS fair_count,
      count(*) FILTER (WHERE score_pct < 70)::integer AS needs_improvement_count
    FROM attempt_scores
    GROUP BY quiz_batch_id
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

CREATE OR REPLACE FUNCTION public.get_course_student_performance(p_course_id uuid)
RETURNS TABLE(
  course_student_id uuid,
  student_id uuid,
  email text,
  first_name text,
  last_name text,
  assignments_submitted integer,
  assignments_total integer,
  assignments_avg numeric,
  quizzes_completed integer,
  quizzes_total integer,
  quizzes_avg numeric,
  lectures_completed integer,
  lectures_total integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.courses
    WHERE id = p_course_id
      AND educator_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to view analytics for this course';
  END IF;

  RETURN QUERY
  WITH roster AS (
    SELECT
      cs.id AS course_student_id,
      cs.student_id,
      coalesce(p.email, cs.email) AS email,
      p.first_name,
      p.last_name
    FROM public.course_students cs
    LEFT JOIN public.profiles p
      ON p.id = cs.student_id
    WHERE cs.course_id = p_course_id
  ),
  lecture_totals AS (
    SELECT count(*)::integer AS total
    FROM public.lecture_courses lc
    JOIN public.lectures l
      ON l.id = lc.lecture_id
    WHERE lc.course_id = p_course_id
      AND l.creator_role = 'educator'
  ),
  assignment_targets AS (
    SELECT
      ast.course_student_id,
      count(*)::integer AS total_assignments
    FROM public.assignment_students ast
    JOIN public.assignments a
      ON a.id = ast.assignment_id
    WHERE a.course_id = p_course_id
    GROUP BY ast.course_student_id
  ),
  assignment_scores AS (
    SELECT
      s.course_student_id,
      count(*) FILTER (WHERE s.submitted_at IS NOT NULL)::integer AS submitted_count,
      round(avg(
        CASE
          WHEN a.points_possible > 0 AND s.grade_score IS NOT NULL
            THEN (s.grade_score::numeric / a.points_possible::numeric) * 100
          ELSE NULL
        END
      )::numeric, 1) AS assignment_avg
    FROM public.assignment_submissions s
    JOIN public.assignments a
      ON a.id = s.assignment_id
    WHERE a.course_id = p_course_id
    GROUP BY s.course_student_id
  ),
  online_quiz_totals AS (
    SELECT count(*)::integer AS total
    FROM public.quiz_batch_courses qbc
    JOIN public.quiz_batches qb
      ON qb.id = qbc.quiz_batch_id
    WHERE qbc.course_id = p_course_id
      AND qb.mode = 'online'
      AND qb.status IN ('generated', 'saved', 'published')
  ),
  online_quiz_scores AS (
    SELECT
      qa.student_id,
      count(*) FILTER (WHERE qa.status IN ('submitted', 'timed_out', 'graded'))::integer AS completed_count,
      round(avg(
        CASE
          WHEN (
            CASE
              WHEN qb.mode = 'online' THEN (qb.mcq_count + qb.short_answer_count)
              ELSE ((qb.mcq_count * 2) + (qb.short_answer_count * 5))
            END
          ) > 0
            THEN (coalesce(qa.final_score, qa.raw_score, 0)::numeric
              / (
                CASE
                  WHEN qb.mode = 'online' THEN (qb.mcq_count + qb.short_answer_count)
                  ELSE ((qb.mcq_count * 2) + (qb.short_answer_count * 5))
                END
              )::numeric) * 100
          ELSE NULL
        END
      )::numeric, 1) AS quiz_avg
    FROM public.quiz_attempts qa
    JOIN public.quiz_batches qb
      ON qb.id = qa.quiz_batch_id
    JOIN public.quiz_batch_courses qbc
      ON qbc.quiz_batch_id = qb.id
    WHERE qbc.course_id = p_course_id
      AND qb.mode = 'online'
    GROUP BY qa.student_id
  ),
  lecture_completion AS (
    SELECT
      slv.student_id,
      count(DISTINCT slv.lecture_id) FILTER (WHERE slv.completed)::integer AS completed_count
    FROM public.student_lecture_views slv
    JOIN public.lecture_courses lc
      ON lc.lecture_id = slv.lecture_id
    JOIN public.lectures l
      ON l.id = lc.lecture_id
    WHERE lc.course_id = p_course_id
      AND l.creator_role = 'educator'
    GROUP BY slv.student_id
  )
  SELECT
    r.course_student_id,
    r.student_id,
    r.email,
    r.first_name,
    r.last_name,
    coalesce(ascore.submitted_count, 0) AS assignments_submitted,
    coalesce(atarget.total_assignments, 0) AS assignments_total,
    ascore.assignment_avg AS assignments_avg,
    coalesce(qscore.completed_count, 0) AS quizzes_completed,
    coalesce(qtotal.total, 0) AS quizzes_total,
    qscore.quiz_avg AS quizzes_avg,
    coalesce(lc.completed_count, 0) AS lectures_completed,
    coalesce(lt.total, 0) AS lectures_total
  FROM roster r
  LEFT JOIN assignment_targets atarget
    ON atarget.course_student_id = r.course_student_id
  LEFT JOIN assignment_scores ascore
    ON ascore.course_student_id = r.course_student_id
  LEFT JOIN online_quiz_scores qscore
    ON qscore.student_id = r.student_id
  CROSS JOIN online_quiz_totals qtotal
  CROSS JOIN lecture_totals lt
  LEFT JOIN lecture_completion lc
    ON lc.student_id = r.student_id
  ORDER BY lower(coalesce(r.last_name, '')), lower(coalesce(r.first_name, '')), lower(r.email);
END;
$$;

REVOKE ALL ON FUNCTION public.get_course_student_performance(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_course_student_performance(uuid) TO authenticated;
