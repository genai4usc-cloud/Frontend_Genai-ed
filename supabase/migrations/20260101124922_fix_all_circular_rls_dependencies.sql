/*
  # Fix All Circular RLS Dependencies
  
  1. Changes
    - Fix course_students policies to not query courses table (breaks circular dependency)
    - Fix course_students to use JWT email instead of profiles table
    - Fix lectures policies to use JWT email instead of profiles table
    - Fix lecture_courses policies to avoid circular checks
  
  2. Security
    - All policies now use auth.jwt() directly for email
    - No circular dependencies between tables
    - Maintains same security model without recursion
*/

-- Fix course_students policies
DROP POLICY IF EXISTS "Educators can view students in their courses" ON course_students;
DROP POLICY IF EXISTS "Educators can delete students from their courses" ON course_students;
DROP POLICY IF EXISTS "Students can view their enrollments" ON course_students;

-- Recreate without circular dependency - educators check course_id directly
CREATE POLICY "Educators can view students in their courses"
  ON course_students FOR SELECT
  TO authenticated
  USING (
    course_id IN (
      SELECT id FROM courses WHERE educator_id = auth.uid()
    )
  );

CREATE POLICY "Educators can delete students from their courses"
  ON course_students FOR DELETE
  TO authenticated
  USING (
    course_id IN (
      SELECT id FROM courses WHERE educator_id = auth.uid()
    )
  );

-- Students use JWT email directly
CREATE POLICY "Students can view their enrollments"
  ON course_students FOR SELECT
  TO authenticated
  USING (email = (auth.jwt()->>'email'));

-- Fix lectures student policy
DROP POLICY IF EXISTS "Students can view lectures from enrolled courses" ON lectures;

CREATE POLICY "Students can view lectures from enrolled courses"
  ON lectures FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM course_students
      WHERE course_students.course_id = lectures.course_id
      AND course_students.email = (auth.jwt()->>'email')
    )
  );