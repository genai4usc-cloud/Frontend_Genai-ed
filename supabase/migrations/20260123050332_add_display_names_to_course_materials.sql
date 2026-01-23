/*
  # Add Display Names to Course Materials

  1. Changes
    - Convert course_materials_urls from text[] to jsonb to support display names
    - Convert background_materials_urls from text[] to jsonb to support display names
    - Each material will now be stored as: { url: string, displayName: string, fileName: string }

  2. Migration Strategy
    - Create new jsonb columns
    - Migrate existing data from text[] to jsonb format
    - Drop old columns and rename new ones
    - Maintains backward compatibility by extracting file names from URLs

  3. Notes
    - Display name can be edited by user
    - File name is extracted from URL and shown as reference
*/

-- Add new jsonb columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'course_materials_data'
  ) THEN
    ALTER TABLE courses ADD COLUMN course_materials_data jsonb DEFAULT '[]';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'background_materials_data'
  ) THEN
    ALTER TABLE courses ADD COLUMN background_materials_data jsonb DEFAULT '[]';
  END IF;
END $$;

-- Migrate existing data from text[] to jsonb
UPDATE courses
SET course_materials_data = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'url', url,
      'displayName', regexp_replace(
        regexp_replace(url, '^.*/([^/]+)$', '\1'),
        '\.[^.]+$', ''
      ),
      'fileName', regexp_replace(url, '^.*/([^/]+)$', '\1')
    )
  )
  FROM unnest(course_materials_urls) AS url
)
WHERE course_materials_urls IS NOT NULL AND array_length(course_materials_urls, 1) > 0;

UPDATE courses
SET background_materials_data = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'url', url,
      'displayName', regexp_replace(
        regexp_replace(url, '^.*/([^/]+)$', '\1'),
        '\.[^.]+$', ''
      ),
      'fileName', regexp_replace(url, '^.*/([^/]+)$', '\1')
    )
  )
  FROM unnest(background_materials_urls) AS url
)
WHERE background_materials_urls IS NOT NULL AND array_length(background_materials_urls, 1) > 0;