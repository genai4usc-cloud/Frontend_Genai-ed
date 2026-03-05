/*
  # Add course student roster helper functions

  1. Functions
    - resolve_student_profiles_by_emails(text[]) for educator-safe profile resolution
    - get_course_student_roster(uuid) to load enrolled students with profile names
    - sync_course_student_roster(uuid, jsonb) to update course enrollments and global profile names

  2. Security
    - All functions are SECURITY DEFINER
    - Functions authorize using is_course_educator(course_id)
*/

CREATE OR REPLACE FUNCTION public.resolve_student_profiles_by_emails(p_emails text[])
RETURNS TABLE(email text, student_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public
AS $$
  select lower(p.email) as email, p.id as student_id
  from public.profiles p
  where p.role = 'student'
    and lower(p.email) = any (
      select lower(x) from unnest(p_emails) as x
    );
$$;

REVOKE ALL ON FUNCTION public.resolve_student_profiles_by_emails(text[]) FROM public;
GRANT EXECUTE ON FUNCTION public.resolve_student_profiles_by_emails(text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_course_student_roster(p_course_id uuid)
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
BEGIN
  IF NOT public.is_course_educator(p_course_id) THEN
    RAISE EXCEPTION 'Not authorized to view this course roster';
  END IF;

  RETURN QUERY
  SELECT
    cs.id AS course_student_id,
    cs.student_id,
    coalesce(p.email, cs.email) AS email,
    p.first_name,
    p.last_name,
    cs.created_at
  FROM public.course_students cs
  LEFT JOIN public.profiles p ON p.id = cs.student_id
  WHERE cs.course_id = p_course_id
  ORDER BY lower(coalesce(p.last_name, '')), lower(coalesce(p.first_name, '')), lower(coalesce(p.email, cs.email));
END;
$$;

REVOKE ALL ON FUNCTION public.get_course_student_roster(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_course_student_roster(uuid) TO authenticated;

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
      trim(coalesce(item->>'email', '')) AS email,
      lower(trim(coalesce(item->>'email', ''))) AS normalized_email,
      nullif(trim(coalesce(item->>'first_name', '')), '') AS first_name,
      nullif(trim(coalesce(item->>'last_name', '')), '') AS last_name
    FROM jsonb_array_elements(p_students) AS item
    WHERE trim(coalesce(item->>'email', '')) <> ''
  ),
  resolved AS (
    SELECT
      r.email,
      r.normalized_email,
      r.first_name,
      r.last_name,
      p.id AS student_id
    FROM requested r
    LEFT JOIN public.profiles p
      ON lower(p.email) = r.normalized_email
     AND p.role = 'student'
  )
  SELECT array_agg(email ORDER BY email)
  INTO missing_emails
  FROM resolved
  WHERE student_id IS NULL;

  IF array_length(missing_emails, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'These students must sign up before they can be enrolled: %', array_to_string(missing_emails, ', ');
  END IF;

  WITH requested AS (
    SELECT DISTINCT ON (lower(trim(coalesce(item->>'email', ''))))
      trim(coalesce(item->>'email', '')) AS email,
      lower(trim(coalesce(item->>'email', ''))) AS normalized_email,
      nullif(trim(coalesce(item->>'first_name', '')), '') AS first_name,
      nullif(trim(coalesce(item->>'last_name', '')), '') AS last_name
    FROM jsonb_array_elements(p_students) AS item
    WHERE trim(coalesce(item->>'email', '')) <> ''
  ),
  resolved AS (
    SELECT
      r.email,
      r.normalized_email,
      r.first_name,
      r.last_name,
      p.id AS student_id
    FROM requested r
    JOIN public.profiles p
      ON lower(p.email) = r.normalized_email
     AND p.role = 'student'
  )
  UPDATE public.profiles p
  SET
    first_name = coalesce(resolved.first_name, p.first_name),
    last_name = coalesce(resolved.last_name, p.last_name),
    full_name = nullif(
      trim(concat(
        coalesce(resolved.first_name, p.first_name, ''),
        ' ',
        coalesce(resolved.last_name, p.last_name, '')
      )),
      ''
    )
  FROM resolved
  WHERE p.id = resolved.student_id
    AND (
      resolved.first_name IS DISTINCT FROM p.first_name
      OR resolved.last_name IS DISTINCT FROM p.last_name
    );

  DELETE FROM public.course_students
  WHERE course_id = p_course_id
    AND lower(email) NOT IN (
      SELECT lower(trim(coalesce(item->>'email', '')))
      FROM jsonb_array_elements(p_students) AS item
      WHERE trim(coalesce(item->>'email', '')) <> ''
    );

  WITH requested AS (
    SELECT DISTINCT ON (lower(trim(coalesce(item->>'email', ''))))
      trim(coalesce(item->>'email', '')) AS email,
      lower(trim(coalesce(item->>'email', ''))) AS normalized_email
    FROM jsonb_array_elements(p_students) AS item
    WHERE trim(coalesce(item->>'email', '')) <> ''
  ),
  resolved AS (
    SELECT
      r.email,
      p.id AS student_id
    FROM requested r
    JOIN public.profiles p
      ON lower(p.email) = r.normalized_email
     AND p.role = 'student'
  )
  INSERT INTO public.course_students (course_id, student_id, email)
  SELECT
    p_course_id,
    resolved.student_id,
    resolved.email
  FROM resolved
  ON CONFLICT (course_id, email)
  DO UPDATE SET student_id = excluded.student_id;

  RETURN QUERY
  SELECT *
  FROM public.get_course_student_roster(p_course_id);
END;
$$;

REVOKE ALL ON FUNCTION public.sync_course_student_roster(uuid, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.sync_course_student_roster(uuid, jsonb) TO authenticated;
