/*
  # Eliminate All RLS Recursion with Security Definer Functions
  
  1. Changes
    - Create security definer functions for all cross-table checks
    - These functions bypass RLS and prevent any recursion
    - Update all policies to use these functions
  
  2. Security
    - Functions safely check relationships without triggering RLS
    - Maintains same security model without recursion
*/

-- Function to check if user owns a course
CREATE OR REPLACE FUNCTION user_owns_course(course_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM courses 
    WHERE id = course_uuid 
    AND educator_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user owns a lecture
CREATE OR REPLACE FUNCTION user_owns_lecture(lecture_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM lectures 
    WHERE id = lecture_uuid 
    AND educator_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update course_teaching_assistants policies
DROP POLICY IF EXISTS "Educators can view TAs for their courses" ON course_teaching_assistants;
DROP POLICY IF EXISTS "Educators can delete TAs from their courses" ON course_teaching_assistants;
DROP POLICY IF EXISTS "Educators can insert TAs for their courses" ON course_teaching_assistants;

CREATE POLICY "Educators can view TAs for their courses"
  ON course_teaching_assistants FOR SELECT
  TO authenticated
  USING (user_owns_course(course_id));

CREATE POLICY "Educators can delete TAs from their courses"
  ON course_teaching_assistants FOR DELETE
  TO authenticated
  USING (user_owns_course(course_id));

CREATE POLICY "Educators can insert TAs for their courses"
  ON course_teaching_assistants FOR INSERT
  TO authenticated
  WITH CHECK (user_owns_course(course_id));

-- Update course_textbooks policies
DROP POLICY IF EXISTS "Educators can view textbooks for their courses" ON course_textbooks;
DROP POLICY IF EXISTS "Educators can delete textbooks from their courses" ON course_textbooks;
DROP POLICY IF EXISTS "Educators can insert textbooks for their courses" ON course_textbooks;

CREATE POLICY "Educators can view textbooks for their courses"
  ON course_textbooks FOR SELECT
  TO authenticated
  USING (user_owns_course(course_id));

CREATE POLICY "Educators can delete textbooks from their courses"
  ON course_textbooks FOR DELETE
  TO authenticated
  USING (user_owns_course(course_id));

CREATE POLICY "Educators can insert textbooks for their courses"
  ON course_textbooks FOR INSERT
  TO authenticated
  WITH CHECK (user_owns_course(course_id));

-- Update lecture_courses policies
DROP POLICY IF EXISTS "Educators can view own lecture courses" ON lecture_courses;
DROP POLICY IF EXISTS "Educators can delete own lecture courses" ON lecture_courses;
DROP POLICY IF EXISTS "Educators can insert own lecture courses" ON lecture_courses;

CREATE POLICY "Educators can view own lecture courses"
  ON lecture_courses FOR SELECT
  TO authenticated
  USING (user_owns_lecture(lecture_id));

CREATE POLICY "Educators can delete own lecture courses"
  ON lecture_courses FOR DELETE
  TO authenticated
  USING (user_owns_lecture(lecture_id));

CREATE POLICY "Educators can insert own lecture courses"
  ON lecture_courses FOR INSERT
  TO authenticated
  WITH CHECK (user_owns_lecture(lecture_id));

-- Update lecture_materials policies
DROP POLICY IF EXISTS "Educators can view own lecture materials" ON lecture_materials;
DROP POLICY IF EXISTS "Educators can update own lecture materials" ON lecture_materials;
DROP POLICY IF EXISTS "Educators can delete own lecture materials" ON lecture_materials;
DROP POLICY IF EXISTS "Educators can insert own lecture materials" ON lecture_materials;

CREATE POLICY "Educators can view own lecture materials"
  ON lecture_materials FOR SELECT
  TO authenticated
  USING (user_owns_lecture(lecture_id));

CREATE POLICY "Educators can update own lecture materials"
  ON lecture_materials FOR UPDATE
  TO authenticated
  USING (user_owns_lecture(lecture_id))
  WITH CHECK (user_owns_lecture(lecture_id));

CREATE POLICY "Educators can delete own lecture materials"
  ON lecture_materials FOR DELETE
  TO authenticated
  USING (user_owns_lecture(lecture_id));

CREATE POLICY "Educators can insert own lecture materials"
  ON lecture_materials FOR INSERT
  TO authenticated
  WITH CHECK (user_owns_lecture(lecture_id));

-- Update lectures student policy
DROP POLICY IF EXISTS "Students can view lectures from enrolled courses" ON lectures;

CREATE POLICY "Students can view lectures from enrolled courses"
  ON lectures FOR SELECT
  TO authenticated
  USING (
    is_enrolled_in_course(course_id, (auth.jwt()->>'email'))
  );