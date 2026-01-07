/*
  # Fix Lecture Materials Column Names

  1. Changes
    - Rename `file_url` back to `material_url`
    - Rename `file_name` back to `material_name`
    - Rename `material_role` back to `material_type`
    - Add `storage_path` column (nullable, required for uploaded files)
    
  2. Purpose
    - Align database schema with frontend expectations
    - Use semantic names that better describe the data
    - Add storage_path for tracking uploaded file locations
    
  3. Notes
    - These renames revert the changes from migration 20260106141415
    - All existing data is preserved
    - Check constraint updated to use correct column name
*/

-- Step 1: Rename columns back to correct names
DO $$
BEGIN
  -- Rename file_url back to material_url
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lecture_materials' AND column_name = 'file_url'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lecture_materials' AND column_name = 'material_url'
  ) THEN
    ALTER TABLE lecture_materials RENAME COLUMN file_url TO material_url;
  END IF;

  -- Rename file_name back to material_name
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lecture_materials' AND column_name = 'file_name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lecture_materials' AND column_name = 'material_name'
  ) THEN
    ALTER TABLE lecture_materials RENAME COLUMN file_name TO material_name;
  END IF;

  -- Rename material_role back to material_type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lecture_materials' AND column_name = 'material_role'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lecture_materials' AND column_name = 'material_type'
  ) THEN
    ALTER TABLE lecture_materials RENAME COLUMN material_role TO material_type;
  END IF;
END $$;

-- Step 2: Add storage_path column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lecture_materials' AND column_name = 'storage_path'
  ) THEN
    ALTER TABLE lecture_materials ADD COLUMN storage_path text NULL;
  END IF;
END $$;

-- Step 3: Update check constraints with correct column names
ALTER TABLE lecture_materials DROP CONSTRAINT IF EXISTS lecture_materials_material_role_check;
ALTER TABLE lecture_materials DROP CONSTRAINT IF EXISTS lecture_materials_material_type_check;

ALTER TABLE lecture_materials ADD CONSTRAINT lecture_materials_material_type_check 
  CHECK (material_type IN ('main', 'background'));

-- Step 4: Drop old index and create new one with correct column name
DROP INDEX IF EXISTS idx_lecture_materials_lecture_role;
CREATE INDEX IF NOT EXISTS idx_lecture_materials_lecture_type 
  ON lecture_materials(lecture_id, material_type);
