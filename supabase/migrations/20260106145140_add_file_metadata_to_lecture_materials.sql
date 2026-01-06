/*
  # Add file metadata fields to lecture_materials

  1. Changes
    - Add file_mime column to store MIME type of uploaded files
    - Add file_size_bytes column to store file size
    - These fields help track uploaded file metadata

  2. Notes
    - Fields are optional (nullable) since preloaded materials won't have this info
    - Only uploaded materials will populate these fields
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lecture_materials' AND column_name = 'file_mime'
  ) THEN
    ALTER TABLE lecture_materials ADD COLUMN file_mime text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lecture_materials' AND column_name = 'file_size_bytes'
  ) THEN
    ALTER TABLE lecture_materials ADD COLUMN file_size_bytes bigint;
  END IF;
END $$;
