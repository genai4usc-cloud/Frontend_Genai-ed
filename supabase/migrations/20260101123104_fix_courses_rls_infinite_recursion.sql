/*
  # Fix Infinite Recursion in Courses RLS Policy

  1. Changes
    - Drop the problematic "Students can view enrolled courses" policy
    - Create a simpler policy that uses auth.email() instead of querying profiles table
    - This avoids circular dependency between courses and profiles RLS policies

  2. Security
    - Students can still view courses they're enrolled in
    - Policy now uses auth.email() directly without subquery to profiles table
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Students can view enrolled courses" ON courses;

-- Create a new, simpler policy that doesn't cause recursion
CREATE POLICY "Students can view enrolled courses"
  ON courses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM course_students
      WHERE course_students.course_id = courses.id
      AND course_students.email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );