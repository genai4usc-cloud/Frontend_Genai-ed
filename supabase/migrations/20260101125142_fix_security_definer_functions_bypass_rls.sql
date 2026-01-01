/*
  # Fix Security Definer Functions to Properly Bypass RLS
  
  1. Changes
    - Recreate security definer functions with SET row_security = off
    - This explicitly disables RLS within the function execution
    - Prevents any recursion by bypassing RLS entirely in helper functions
  
  2. Security
    - Functions are secure as they only check ownership
    - RLS bypass is safe because functions are read-only checks
    - Main table RLS policies still enforce security
*/

-- Recreate function to check course enrollment with RLS disabled
CREATE OR REPLACE FUNCTION is_enrolled_in_course(course_uuid uuid, user_email text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM course_students
    WHERE course_id = course_uuid
    AND email = user_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET row_security = off;

-- Recreate function to check course ownership with RLS disabled
CREATE OR REPLACE FUNCTION user_owns_course(course_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM courses 
    WHERE id = course_uuid 
    AND educator_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET row_security = off;

-- Recreate function to check lecture ownership with RLS disabled
CREATE OR REPLACE FUNCTION user_owns_lecture(lecture_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM lectures 
    WHERE id = lecture_uuid 
    AND educator_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET row_security = off;