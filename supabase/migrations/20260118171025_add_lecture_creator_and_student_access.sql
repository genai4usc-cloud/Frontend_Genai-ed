/*
  # Add lecture creator tracking and student access control

  1. Schema Changes
    - Add `creator_role` to lectures table (enum: 'educator' or 'student')
    - Add `creator_user_id` to lectures table
    - Update course_students unique constraint to support email-based enrollment

  2. RLS Policies
    - Update course_students policies for enrollment management
    - Update lecture policies to distinguish educator vs student lectures
    - Ensure students only see their own student-created lectures
    - Ensure educators never see student-created lectures

  3. Access Control
    - Educators can manage students in their courses
    - Students see courses they're enrolled in
    - Students see educator lectures + their own lectures only
    - Educators see only educator-created lectures in their courses
*/

-- Add creator tracking fields to lectures table
DO $$
BEGIN
  -- Add creator_role column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lectures' AND column_name = 'creator_role'
  ) THEN
    ALTER TABLE lectures ADD COLUMN creator_role text DEFAULT 'educator';
  END IF;

  -- Add creator_user_id column (stores the actual creator's ID)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lectures' AND column_name = 'creator_user_id'
  ) THEN
    ALTER TABLE lectures ADD COLUMN creator_user_id uuid;
  END IF;
END $$;

-- Update existing lectures to have creator_user_id = educator_id
UPDATE lectures SET creator_user_id = educator_id WHERE creator_user_id IS NULL;

-- Add constraint to ensure creator_role is either 'educator' or 'student'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lectures_creator_role_check'
  ) THEN
    ALTER TABLE lectures ADD CONSTRAINT lectures_creator_role_check 
      CHECK (creator_role IN ('educator', 'student'));
  END IF;
END $$;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_lectures_creator_role ON lectures(creator_role);
CREATE INDEX IF NOT EXISTS idx_lectures_creator_user_id ON lectures(creator_user_id);

-- Update unique constraint on course_students to handle email-based enrollment
DO $$
BEGIN
  -- Drop old unique constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'course_students_course_id_student_id_key'
  ) THEN
    ALTER TABLE course_students DROP CONSTRAINT course_students_course_id_student_id_key;
  END IF;

  -- Add new unique constraint on course_id and email (primary way to enroll)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'course_students_course_id_email_key'
  ) THEN
    ALTER TABLE course_students ADD CONSTRAINT course_students_course_id_email_key 
      UNIQUE(course_id, email);
  END IF;
END $$;

-- Enable RLS on course_students
ALTER TABLE course_students ENABLE ROW LEVEL SECURITY;

-- Drop existing course_students policies
DROP POLICY IF EXISTS "Educators can manage students in their courses" ON course_students;
DROP POLICY IF EXISTS "Students can view their enrollments" ON course_students;

-- Create course_students policies
CREATE POLICY "Educators can manage students in their courses"
  ON course_students
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_students.course_id
      AND courses.educator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_students.course_id
      AND courses.educator_id = auth.uid()
    )
  );

CREATE POLICY "Students can view their enrollments"
  ON course_students
  FOR SELECT
  TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR student_id = auth.uid()
  );

-- Update lecture policies to handle creator_role

-- Drop existing lecture policies
DROP POLICY IF EXISTS "Educators can view own lectures" ON lectures;
DROP POLICY IF EXISTS "Educators can insert own lectures" ON lectures;
DROP POLICY IF EXISTS "Educators can update own lectures" ON lectures;
DROP POLICY IF EXISTS "Educators can delete own lectures" ON lectures;
DROP POLICY IF EXISTS "Students can view lectures from enrolled courses" ON lectures;

-- Educators can view their own lectures (both educator and student role)
CREATE POLICY "Educators can view own educator lectures"
  ON lectures
  FOR SELECT
  TO authenticated
  USING (
    creator_user_id = auth.uid() 
    AND creator_role = 'educator'
  );

-- Educators can insert lectures with educator role
CREATE POLICY "Educators can create educator lectures"
  ON lectures
  FOR INSERT
  TO authenticated
  WITH CHECK (
    creator_user_id = auth.uid() 
    AND creator_role = 'educator'
  );

-- Educators can update their own educator lectures
CREATE POLICY "Educators can update own educator lectures"
  ON lectures
  FOR UPDATE
  TO authenticated
  USING (
    creator_user_id = auth.uid() 
    AND creator_role = 'educator'
  )
  WITH CHECK (
    creator_user_id = auth.uid() 
    AND creator_role = 'educator'
  );

-- Educators can delete their own educator lectures
CREATE POLICY "Educators can delete own educator lectures"
  ON lectures
  FOR DELETE
  TO authenticated
  USING (
    creator_user_id = auth.uid() 
    AND creator_role = 'educator'
  );

-- Students can view educator lectures from enrolled courses
CREATE POLICY "Students can view educator lectures from enrolled courses"
  ON lectures
  FOR SELECT
  TO authenticated
  USING (
    creator_role = 'educator'
    AND EXISTS (
      SELECT 1 FROM course_students
      WHERE (
        course_students.student_id = auth.uid()
        OR course_students.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
      AND (
        course_students.course_id = lectures.course_id
        OR course_students.course_id = ANY(lectures.selected_course_ids)
      )
    )
  );

-- Students can create their own lectures
CREATE POLICY "Students can create student lectures"
  ON lectures
  FOR INSERT
  TO authenticated
  WITH CHECK (
    creator_user_id = auth.uid() 
    AND creator_role = 'student'
    AND EXISTS (
      SELECT 1 FROM course_students
      WHERE (
        course_students.student_id = auth.uid()
        OR course_students.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
      AND course_students.course_id = lectures.course_id
    )
  );

-- Students can view their own student lectures
CREATE POLICY "Students can view own student lectures"
  ON lectures
  FOR SELECT
  TO authenticated
  USING (
    creator_role = 'student'
    AND creator_user_id = auth.uid()
  );

-- Students can update their own student lectures
CREATE POLICY "Students can update own student lectures"
  ON lectures
  FOR UPDATE
  TO authenticated
  USING (
    creator_role = 'student'
    AND creator_user_id = auth.uid()
  )
  WITH CHECK (
    creator_role = 'student'
    AND creator_user_id = auth.uid()
  );

-- Students can delete their own student lectures
CREATE POLICY "Students can delete own student lectures"
  ON lectures
  FOR DELETE
  TO authenticated
  USING (
    creator_role = 'student'
    AND creator_user_id = auth.uid()
  );

-- Update lecture_artifacts policies to support student lectures
ALTER TABLE lecture_artifacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view artifacts for their lectures" ON lecture_artifacts;
DROP POLICY IF EXISTS "Users can insert artifacts for their lectures" ON lecture_artifacts;
DROP POLICY IF EXISTS "Users can update artifacts for their lectures" ON lecture_artifacts;
DROP POLICY IF EXISTS "Users can delete artifacts for their lectures" ON lecture_artifacts;

CREATE POLICY "Users can view artifacts for their lectures"
  ON lecture_artifacts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lectures
      WHERE lectures.id = lecture_artifacts.lecture_id
      AND lectures.creator_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM lectures
      JOIN course_students ON (
        course_students.course_id = lectures.course_id
        OR course_students.course_id = ANY(lectures.selected_course_ids)
      )
      WHERE lectures.id = lecture_artifacts.lecture_id
      AND lectures.creator_role = 'educator'
      AND (
        course_students.student_id = auth.uid()
        OR course_students.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can manage artifacts for their lectures"
  ON lecture_artifacts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lectures
      WHERE lectures.id = lecture_artifacts.lecture_id
      AND lectures.creator_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lectures
      WHERE lectures.id = lecture_artifacts.lecture_id
      AND lectures.creator_user_id = auth.uid()
    )
  );

-- Update lecture_courses policies
ALTER TABLE lecture_courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view lecture course associations" ON lecture_courses;
DROP POLICY IF EXISTS "Users can manage lecture course associations" ON lecture_courses;

CREATE POLICY "Users can view lecture course associations"
  ON lecture_courses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lectures
      WHERE lectures.id = lecture_courses.lecture_id
      AND lectures.creator_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM lectures
      JOIN course_students ON course_students.course_id = lecture_courses.course_id
      WHERE lectures.id = lecture_courses.lecture_id
      AND lectures.creator_role = 'educator'
      AND (
        course_students.student_id = auth.uid()
        OR course_students.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can manage lecture course associations"
  ON lecture_courses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lectures
      WHERE lectures.id = lecture_courses.lecture_id
      AND lectures.creator_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lectures
      WHERE lectures.id = lecture_courses.lecture_id
      AND lectures.creator_user_id = auth.uid()
    )
  );
