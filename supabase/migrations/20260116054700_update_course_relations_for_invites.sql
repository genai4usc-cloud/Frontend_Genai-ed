/*
  # Update course relation tables to support email invites

  1. Changes to course_teaching_assistants
    - Add email column (text) - to invite TAs who may not have accounts yet
    - Make ta_id nullable since we might only have email initially
  
  2. Changes to course_students
    - Add email column (text) - to invite students who may not have accounts yet
    - Make student_id nullable since we might only have email initially
  
  3. Changes to course_textbooks
    - Add title_isbn column (text) - to store textbook info in simple format
    - Keep existing title and author columns for backward compatibility
  
  4. Notes
    - Email-based invites allow adding students/TAs before they create accounts
    - Once they sign up, the system can link email to student_id/ta_id
*/

-- Update course_teaching_assistants table
DO $$
BEGIN
  -- Make ta_id nullable
  ALTER TABLE course_teaching_assistants ALTER COLUMN ta_id DROP NOT NULL;
  
  -- Add email column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'course_teaching_assistants' AND column_name = 'email'
  ) THEN
    ALTER TABLE course_teaching_assistants ADD COLUMN email text;
  END IF;
END $$;

-- Update course_students table
DO $$
BEGIN
  -- Make student_id nullable
  ALTER TABLE course_students ALTER COLUMN student_id DROP NOT NULL;
  
  -- Add email column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'course_students' AND column_name = 'email'
  ) THEN
    ALTER TABLE course_students ADD COLUMN email text;
  END IF;
END $$;

-- Update course_textbooks table
DO $$
BEGIN
  -- Add title_isbn column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'course_textbooks' AND column_name = 'title_isbn'
  ) THEN
    ALTER TABLE course_textbooks ADD COLUMN title_isbn text;
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_course_teaching_assistants_email ON course_teaching_assistants(email);
CREATE INDEX IF NOT EXISTS idx_course_students_email ON course_students(email);
CREATE INDEX IF NOT EXISTS idx_course_teaching_assistants_course ON course_teaching_assistants(course_id);
CREATE INDEX IF NOT EXISTS idx_course_students_course ON course_students(course_id);
