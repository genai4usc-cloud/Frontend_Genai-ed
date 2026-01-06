/*
  # Add source_type to lecture_materials

  1. Changes
    - Add source_type field to lecture_materials table to track origin of materials
    - Possible values: 'course_preloaded', 'uploaded', 'external'

  2. Security
    - No RLS changes needed (existing policies cover this field)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lecture_materials' AND column_name = 'source_type'
  ) THEN
    ALTER TABLE lecture_materials ADD COLUMN source_type text DEFAULT 'uploaded' CHECK (source_type IN ('course_preloaded', 'uploaded', 'external'));
  END IF;
END $$;
