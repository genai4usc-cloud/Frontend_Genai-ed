/*
  # Fix RLS Recursion Using Security Definer Function
  
  1. Changes
    - Create security definer function to check course enrollment
    - This function bypasses RLS and prevents recursion
    - Update courses policy to use this function
  
  2. Security
    - Function safely checks enrollment without triggering RLS recursion
    - Maintains same security guarantees
*/

-- Create function to check if user is enrolled in a course
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update courses policy to use the function
DROP POLICY IF EXISTS "Students can view enrolled courses" ON courses;

CREATE POLICY "Students can view enrolled courses"
  ON courses FOR SELECT
  TO authenticated
  USING (
    is_enrolled_in_course(id, (auth.jwt()->>'email'))
  );