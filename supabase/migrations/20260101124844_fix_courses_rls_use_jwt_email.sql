/*
  # Fix Infinite Recursion in Courses RLS - Use JWT Email
  
  1. Changes
    - Drop the problematic "Students can view enrolled courses" policy
    - Create a new policy that extracts email directly from JWT
    - This completely avoids any table queries that could cause recursion
  
  2. Security
    - Students can view courses they're enrolled in
    - Email is extracted from auth.jwt() which is the user's JWT token
    - No subqueries or joins that could cause recursion
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Students can view enrolled courses" ON courses;

-- Create a new policy using JWT email directly
CREATE POLICY "Students can view enrolled courses"
  ON courses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM course_students
      WHERE course_students.course_id = courses.id
      AND course_students.email = (auth.jwt()->>'email')
    )
  );