/*
  # Allow students to view lecture artifacts via lecture_courses junction table

  1. Changes
    - Add new RLS policy to allow students to view lecture artifacts
    - Policy checks enrollment through lecture_courses junction table
    - Students can view artifacts if they're enrolled in any course the lecture is associated with

  2. Security
    - Students can only view artifacts for lectures in courses they're enrolled in
    - Access is checked through both lecture_courses and course_students tables
    - Maintains read-only access for students
*/

-- Drop any conflicting policies first
DROP POLICY IF EXISTS "Students can view lecture artifacts via junction table" ON lecture_artifacts;

-- Create new policy for students to view lecture artifacts through lecture_courses
CREATE POLICY "Students can view lecture artifacts via junction table"
  ON lecture_artifacts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM lectures l
      JOIN lecture_courses lc ON lc.lecture_id = l.id
      JOIN course_students cs ON cs.course_id = lc.course_id
      WHERE l.id = lecture_artifacts.lecture_id
      AND l.creator_role = 'educator'
      AND (cs.student_id = auth.uid() OR cs.email = auth.email())
    )
  );
