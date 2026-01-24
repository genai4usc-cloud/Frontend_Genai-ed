/*
  # Allow students to view educator lectures via lecture_courses junction table

  1. Changes
    - Add new RLS policy to allow students to view educator lectures
    - Policy checks enrollment through lecture_courses junction table
    - Students can view lectures if they're enrolled in any course the lecture is associated with

  2. Security
    - Students can only view educator lectures for courses they're enrolled in
    - Access is checked through both lecture_courses and course_students tables
    - Maintains read-only access for students
*/

-- Drop any conflicting policies first
DROP POLICY IF EXISTS "Students can view educator lectures via junction table" ON lectures;

-- Create new policy for students to view educator lectures through lecture_courses
CREATE POLICY "Students can view educator lectures via junction table"
  ON lectures
  FOR SELECT
  TO authenticated
  USING (
    creator_role = 'educator'
    AND EXISTS (
      SELECT 1
      FROM lecture_courses lc
      JOIN course_students cs ON cs.course_id = lc.course_id
      WHERE lc.lecture_id = lectures.id
      AND (cs.student_id = auth.uid() OR cs.email = auth.email())
    )
  );
