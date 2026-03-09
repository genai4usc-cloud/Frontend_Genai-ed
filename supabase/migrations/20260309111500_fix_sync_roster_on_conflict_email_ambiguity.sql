/*
  # Fix sync_course_student_roster ON CONFLICT ambiguity

  In PL/pgSQL functions that `RETURNS TABLE (..., email text, ...)`,
  unqualified `email` in `ON CONFLICT (course_id, email)` can be parsed
  ambiguously (variable vs table column) and fail at runtime.

  This migration switches to `ON CONFLICT ON CONSTRAINT ...`, which is
  unambiguous.
*/

CREATE OR REPLACE FUNCTION public.sync_course_student_roster(p_course_id uuid, p_students jsonb)
RETURNS TABLE(
  course_student_id uuid,
  student_id uuid,
  email text,
  first_name text,
  last_name text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  missing_emails text[];
BEGIN
  IF NOT public.is_course_educator(p_course_id) THEN
    RAISE EXCEPTION 'Not authorized to update this course roster';
  END IF;

  IF p_students IS NULL OR jsonb_typeof(p_students) <> 'array' THEN
    RAISE EXCEPTION 'Students payload must be a JSON array';
  END IF;

  WITH requested AS (
    SELECT DISTINCT ON (lower(trim(coalesce(item->>'email', ''))))
      trim(coalesce(item->>'email', '')) AS req_email,
      lower(trim(coalesce(item->>'email', ''))) AS normalized_email,
      nullif(trim(coalesce(item->>'first_name', '')), '') AS req_first_name,
      nullif(trim(coalesce(item->>'last_name', '')), '') AS req_last_name
    FROM jsonb_array_elements(p_students) AS item
    WHERE trim(coalesce(item->>'email', '')) <> ''
  ),
  resolved AS (
    SELECT
      r.req_email,
      r.normalized_email,
      r.req_first_name,
      r.req_last_name,
      p.id AS resolved_student_id
    FROM requested r
    LEFT JOIN public.profiles p
      ON lower(p.email) = r.normalized_email
     AND p.role = 'student'
  )
  SELECT array_agg(resolved.req_email ORDER BY resolved.req_email)
  INTO missing_emails
  FROM resolved
  WHERE resolved.resolved_student_id IS NULL;

  IF array_length(missing_emails, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'These students must sign up before they can be enrolled: %', array_to_string(missing_emails, ', ');
  END IF;

  WITH requested AS (
    SELECT DISTINCT ON (lower(trim(coalesce(item->>'email', ''))))
      trim(coalesce(item->>'email', '')) AS req_email,
      lower(trim(coalesce(item->>'email', ''))) AS normalized_email,
      nullif(trim(coalesce(item->>'first_name', '')), '') AS req_first_name,
      nullif(trim(coalesce(item->>'last_name', '')), '') AS req_last_name
    FROM jsonb_array_elements(p_students) AS item
    WHERE trim(coalesce(item->>'email', '')) <> ''
  ),
  resolved AS (
    SELECT
      r.req_email,
      r.normalized_email,
      r.req_first_name,
      r.req_last_name,
      p.id AS resolved_student_id
    FROM requested r
    JOIN public.profiles p
      ON lower(p.email) = r.normalized_email
     AND p.role = 'student'
  )
  UPDATE public.profiles p
  SET
    first_name = coalesce(resolved.req_first_name, p.first_name),
    last_name = coalesce(resolved.req_last_name, p.last_name),
    full_name = nullif(
      trim(concat(
        coalesce(resolved.req_first_name, p.first_name, ''),
        ' ',
        coalesce(resolved.req_last_name, p.last_name, '')
      )),
      ''
    )
  FROM resolved
  WHERE p.id = resolved.resolved_student_id
    AND (
      resolved.req_first_name IS DISTINCT FROM p.first_name
      OR resolved.req_last_name IS DISTINCT FROM p.last_name
    );

  DELETE FROM public.course_students cs
  WHERE cs.course_id = p_course_id
    AND lower(cs.email) NOT IN (
      SELECT lower(trim(coalesce(item->>'email', '')))
      FROM jsonb_array_elements(p_students) AS item
      WHERE trim(coalesce(item->>'email', '')) <> ''
    );

  WITH requested AS (
    SELECT DISTINCT ON (lower(trim(coalesce(item->>'email', ''))))
      trim(coalesce(item->>'email', '')) AS req_email,
      lower(trim(coalesce(item->>'email', ''))) AS normalized_email
    FROM jsonb_array_elements(p_students) AS item
    WHERE trim(coalesce(item->>'email', '')) <> ''
  ),
  resolved AS (
    SELECT
      r.req_email,
      p.id AS resolved_student_id
    FROM requested r
    JOIN public.profiles p
      ON lower(p.email) = r.normalized_email
     AND p.role = 'student'
  )
  INSERT INTO public.course_students (course_id, student_id, email)
  SELECT
    p_course_id,
    resolved.resolved_student_id,
    resolved.req_email
  FROM resolved
  ON CONFLICT ON CONSTRAINT course_students_course_id_email_key
  DO UPDATE SET student_id = EXCLUDED.student_id;

  RETURN QUERY
  SELECT *
  FROM public.get_course_student_roster(p_course_id);
END;
$$;

REVOKE ALL ON FUNCTION public.sync_course_student_roster(uuid, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.sync_course_student_roster(uuid, jsonb) TO authenticated;
