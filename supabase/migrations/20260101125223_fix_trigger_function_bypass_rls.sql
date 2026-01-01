/*
  # Fix Trigger Function to Bypass RLS
  
  1. Changes
    - Update set_course_student_educator_id to bypass RLS
    - This prevents recursion when the trigger queries courses table
  
  2. Security
    - Function is safe as it only reads educator_id
    - Trigger runs on INSERT so user already has permission
*/

-- Recreate trigger function with RLS disabled
CREATE OR REPLACE FUNCTION set_course_student_educator_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT educator_id INTO NEW.educator_id
  FROM courses
  WHERE id = NEW.course_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET row_security = off;