/*
  # Add educator_id to course_students to break circular RLS dependency
  
  1. Changes
    - Add educator_id column to course_students table
    - Update existing records to populate educator_id from courses
    - Add trigger to automatically set educator_id on insert
    - Update RLS policies to check educator_id directly (no joins to courses)
  
  2. Security
    - Breaks circular dependency between courses and course_students
    - Educators can manage students in their courses
    - Students can view their enrollments
*/

-- Add educator_id column
ALTER TABLE course_students 
ADD COLUMN IF NOT EXISTS educator_id uuid REFERENCES auth.users(id);

-- Populate existing records
UPDATE course_students cs
SET educator_id = c.educator_id
FROM courses c
WHERE cs.course_id = c.id
AND cs.educator_id IS NULL;

-- Create trigger function to auto-populate educator_id
CREATE OR REPLACE FUNCTION set_course_student_educator_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT educator_id INTO NEW.educator_id
  FROM courses
  WHERE id = NEW.course_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS set_educator_id_trigger ON course_students;
CREATE TRIGGER set_educator_id_trigger
  BEFORE INSERT ON course_students
  FOR EACH ROW
  EXECUTE FUNCTION set_course_student_educator_id();

-- Update RLS policies to use educator_id directly
DROP POLICY IF EXISTS "Educators can view students in their courses" ON course_students;
DROP POLICY IF EXISTS "Educators can delete students from their courses" ON course_students;
DROP POLICY IF EXISTS "Educators can insert students in their courses" ON course_students;

CREATE POLICY "Educators can view students in their courses"
  ON course_students FOR SELECT
  TO authenticated
  USING (educator_id = auth.uid());

CREATE POLICY "Educators can delete students from their courses"
  ON course_students FOR DELETE
  TO authenticated
  USING (educator_id = auth.uid());

CREATE POLICY "Educators can insert students in their courses"
  ON course_students FOR INSERT
  TO authenticated
  WITH CHECK (educator_id = auth.uid());