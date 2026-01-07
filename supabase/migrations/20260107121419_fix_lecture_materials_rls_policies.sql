/*
  # Fix Lecture Materials RLS Policies

  1. Changes
    - Drop all existing RLS policies on lecture_materials
    - Create new RLS policies that enforce ownership through lectures table
    - Use direct EXISTS queries instead of security definer functions
    
  2. New Policies
    - SELECT: Educators can view materials for their lectures
    - INSERT: Educators can insert materials for their lectures
    - UPDATE: Educators can update materials for their lectures
    - DELETE: Educators can delete materials for their lectures
    
  3. Security
    - All policies check ownership through lectures.educator_id = auth.uid()
    - RLS remains enabled on lecture_materials table
*/

-- Drop all existing policies on lecture_materials
DROP POLICY IF EXISTS "Educators can view own lecture materials" ON lecture_materials;
DROP POLICY IF EXISTS "Educators can insert own lecture materials" ON lecture_materials;
DROP POLICY IF EXISTS "Educators can update own lecture materials" ON lecture_materials;
DROP POLICY IF EXISTS "Educators can delete own lecture materials" ON lecture_materials;

-- Create SELECT policy
CREATE POLICY "Educators can view materials for their lectures"
  ON lecture_materials FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM lectures l
      WHERE l.id = lecture_materials.lecture_id
        AND l.educator_id = auth.uid()
    )
  );

-- Create INSERT policy
CREATE POLICY "Educators can insert materials for their lectures"
  ON lecture_materials FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM lectures l
      WHERE l.id = lecture_materials.lecture_id
        AND l.educator_id = auth.uid()
    )
  );

-- Create UPDATE policy
CREATE POLICY "Educators can update materials for their lectures"
  ON lecture_materials FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM lectures l
      WHERE l.id = lecture_materials.lecture_id
        AND l.educator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM lectures l
      WHERE l.id = lecture_materials.lecture_id
        AND l.educator_id = auth.uid()
    )
  );

-- Create DELETE policy
CREATE POLICY "Educators can delete materials for their lectures"
  ON lecture_materials FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM lectures l
      WHERE l.id = lecture_materials.lecture_id
        AND l.educator_id = auth.uid()
    )
  );

-- Ensure RLS is enabled
ALTER TABLE lecture_materials ENABLE ROW LEVEL SECURITY;
