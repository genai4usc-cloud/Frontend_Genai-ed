/*
  # Allow students to read their own generated quizzes

  1. `quiz_batch_courses`
     - Add SELECT policy for enrolled students on the course

  2. `quiz_batches`
     - Add SELECT policy for students who have a generated quiz in the batch

  3. `quiz_generated`
     - Add SELECT policy for the assigned student, constrained to enrolled courses
*/

CREATE POLICY "Students can view enrolled quiz batch courses"
  ON quiz_batch_courses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM course_students
      WHERE course_students.course_id = quiz_batch_courses.course_id
        AND (
          course_students.student_id = auth.uid()
          OR lower(course_students.email) = lower(coalesce(auth.email(), ''))
        )
    )
  );

CREATE POLICY "Students can view assigned quiz batches"
  ON quiz_batches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM quiz_generated
      WHERE quiz_generated.quiz_batch_id = quiz_batches.id
        AND quiz_generated.student_id = auth.uid()
    )
  );

CREATE POLICY "Students can view own generated quizzes"
  ON quiz_generated FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM quiz_batch_courses
      JOIN course_students
        ON course_students.course_id = quiz_batch_courses.course_id
      WHERE quiz_batch_courses.quiz_batch_id = quiz_generated.quiz_batch_id
        AND (
          course_students.student_id = auth.uid()
          OR lower(course_students.email) = lower(coalesce(auth.email(), ''))
        )
    )
  );
