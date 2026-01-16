/*
  # Add missing columns to courses table

  1. Changes
    - Add course_number column (text) - course code like "ECON 203"
    - Add semester column (text) - semester information like "Fall 2025"
    - Add section column (text, nullable) - section like "001"
    - Add instructor_name column (text) - instructor's display name
    - Add syllabus_url column (text, nullable) - URL to syllabus file
    - Add course_materials_urls column (text[], default empty array) - URLs to course materials
    - Add background_materials_urls column (text[], default empty array) - URLs to background materials
    - Add student_count column (integer, default 0) - count of students
    - Add updated_at column (timestamptz, default now()) - last update timestamp

  2. Notes
    - All columns are nullable initially to allow for existing data
    - Arrays default to empty array for new records
*/

-- Add missing columns to courses table
DO $$
BEGIN
  -- Add course_number column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'course_number'
  ) THEN
    ALTER TABLE courses ADD COLUMN course_number text;
  END IF;

  -- Add semester column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'semester'
  ) THEN
    ALTER TABLE courses ADD COLUMN semester text;
  END IF;

  -- Add section column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'section'
  ) THEN
    ALTER TABLE courses ADD COLUMN section text;
  END IF;

  -- Add instructor_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'instructor_name'
  ) THEN
    ALTER TABLE courses ADD COLUMN instructor_name text;
  END IF;

  -- Add syllabus_url column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'syllabus_url'
  ) THEN
    ALTER TABLE courses ADD COLUMN syllabus_url text;
  END IF;

  -- Add course_materials_urls column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'course_materials_urls'
  ) THEN
    ALTER TABLE courses ADD COLUMN course_materials_urls text[] DEFAULT '{}';
  END IF;

  -- Add background_materials_urls column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'background_materials_urls'
  ) THEN
    ALTER TABLE courses ADD COLUMN background_materials_urls text[] DEFAULT '{}';
  END IF;

  -- Add student_count column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'student_count'
  ) THEN
    ALTER TABLE courses ADD COLUMN student_count integer DEFAULT 0;
  END IF;

  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE courses ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_courses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_courses_updated_at ON courses;

CREATE TRIGGER set_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION update_courses_updated_at();
