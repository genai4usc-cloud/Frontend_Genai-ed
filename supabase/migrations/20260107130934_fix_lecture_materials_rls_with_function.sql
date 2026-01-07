/*
  # Fix RLS policies for lecture_materials table

  1. Changes
    - Drop all existing RLS policies on lecture_materials table
    - Recreate policies using user_owns_lecture() function for consistent ownership checks
    - Ensure RLS remains enabled on the table
  
  2. New Policies
    - SELECT: Educators can view materials if they own the parent lecture
    - INSERT: Educators can insert materials if they own the parent lecture
    - UPDATE: Educators can update materials if they own the parent lecture
    - DELETE: Educators can delete materials if they own the parent lecture
  
  3. Security
    - All policies use user_owns_lecture(lecture_id) for ownership verification
    - This matches the pattern used in lecture_courses table
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Educators can view materials for their lectures" ON lecture_materials;
DROP POLICY IF EXISTS "Educators can insert materials for their lectures" ON lecture_materials;
DROP POLICY IF EXISTS "Educators can update materials for their lectures" ON lecture_materials;
DROP POLICY IF EXISTS "Educators can delete materials for their lectures" ON lecture_materials;

-- Ensure RLS is enabled
ALTER TABLE lecture_materials ENABLE ROW LEVEL SECURITY;

-- Create SELECT policy
CREATE POLICY "Educators can view materials for their lectures"
  ON lecture_materials
  FOR SELECT
  TO authenticated
  USING (user_owns_lecture(lecture_id));

-- Create INSERT policy
CREATE POLICY "Educators can insert materials for their lectures"
  ON lecture_materials
  FOR INSERT
  TO authenticated
  WITH CHECK (user_owns_lecture(lecture_id));

-- Create UPDATE policy
CREATE POLICY "Educators can update materials for their lectures"
  ON lecture_materials
  FOR UPDATE
  TO authenticated
  USING (user_owns_lecture(lecture_id))
  WITH CHECK (user_owns_lecture(lecture_id));

-- Create DELETE policy
CREATE POLICY "Educators can delete materials for their lectures"
  ON lecture_materials
  FOR DELETE
  TO authenticated
  USING (user_owns_lecture(lecture_id));
