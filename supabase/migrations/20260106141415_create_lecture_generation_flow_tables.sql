/*
  # Create Lecture Generation Flow Tables

  1. Updates to Existing Tables
    - **lectures** table:
      - Add `selected_course_ids` (uuid[]) - courses to pull materials from
      - Add `script_mode` (text) - 'ai' or 'direct' input mode
      - Add `script_text` (text) - combined/final script text
      - Add `avatar_style` (text) - avatar visual style
      - Add `avatar_voice` (text) - avatar voice settings
      - Update status constraint to use new values (draft, generated, published)
      - Migrate existing 'completed' and 'generating' statuses
    
    - **lecture_materials** table:
      - Add `source_type` (text) - 'course_preloaded' or 'uploaded'
      - Add `file_mime` (text) - MIME type of file
      - Add `file_size_bytes` (bigint) - file size
      - Rename columns to match new spec (material_url→file_url, etc.)
      - Add indexes for performance

  2. New Tables
    - **lecture_artifacts**:
      - `id` (uuid, primary key)
      - `lecture_id` (uuid, references lectures)
      - `artifact_type` (text) - audio_mp3, pptx, video_static_mp4, video_avatar_mp4
      - `file_url` (text) - URL to generated artifact
      - `created_at` (timestamptz)
      - UNIQUE constraint on (lecture_id, artifact_type) for upsert behavior

    - **lecture_jobs**:
      - `id` (uuid, primary key)
      - `lecture_id` (uuid, references lectures)
      - `job_type` (text) - scripts, audio, pptx, video_static, video_avatar
      - `status` (text) - queued, running, succeeded, failed
      - `error_message` (text, nullable)
      - `progress` (int) - 0-100 progress indicator
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - Indexes on (lecture_id) and (lecture_id, status)

  3. Security
    - Enable RLS on all new tables
    - Add policies for educators to SELECT/INSERT/UPDATE/DELETE their own lecture data
    - Policies check educator_id ownership through lectures table

  4. Notes
    - All tables use cascading deletes to maintain referential integrity
    - Indexes added for common query patterns
    - Check constraints ensure valid enum values
    - Default values set for better DX
*/

-- =====================================================
-- 1. UPDATE LECTURES TABLE
-- =====================================================

-- Step 1: Drop the old status check constraint first
ALTER TABLE lectures DROP CONSTRAINT IF EXISTS lectures_status_check;

-- Step 2: Migrate existing status values
UPDATE lectures SET status = 'published' WHERE status = 'completed';
UPDATE lectures SET status = 'draft' WHERE status = 'generating';

-- Step 3: Add new columns to lectures table
DO $$
BEGIN
  -- selected_course_ids: array of course IDs to pull materials from
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lectures' AND column_name = 'selected_course_ids'
  ) THEN
    ALTER TABLE lectures ADD COLUMN selected_course_ids uuid[] DEFAULT '{}';
  END IF;

  -- script_mode: how the script is created (ai generated vs direct input)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lectures' AND column_name = 'script_mode'
  ) THEN
    ALTER TABLE lectures ADD COLUMN script_mode text DEFAULT 'ai';
  END IF;

  -- script_text: the final/combined script content
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lectures' AND column_name = 'script_text'
  ) THEN
    ALTER TABLE lectures ADD COLUMN script_text text NULL;
  END IF;

  -- avatar_style: visual style of the avatar
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lectures' AND column_name = 'avatar_style'
  ) THEN
    ALTER TABLE lectures ADD COLUMN avatar_style text NULL;
  END IF;

  -- avatar_voice: voice settings for the avatar
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lectures' AND column_name = 'avatar_voice'
  ) THEN
    ALTER TABLE lectures ADD COLUMN avatar_voice text NULL;
  END IF;
END $$;

-- Step 4: Set default values for existing NULL rows
UPDATE lectures SET selected_course_ids = '{}' WHERE selected_course_ids IS NULL;
UPDATE lectures SET script_mode = 'ai' WHERE script_mode IS NULL;

-- Step 5: Now add NOT NULL constraints
ALTER TABLE lectures ALTER COLUMN selected_course_ids SET NOT NULL;
ALTER TABLE lectures ALTER COLUMN script_mode SET NOT NULL;

-- Step 6: Add check constraints with new values
ALTER TABLE lectures ADD CONSTRAINT lectures_status_check 
  CHECK (status IN ('draft', 'generated', 'published'));

ALTER TABLE lectures ADD CONSTRAINT lectures_script_mode_check 
  CHECK (script_mode IN ('ai', 'direct'));

-- =====================================================
-- 2. UPDATE LECTURE_MATERIALS TABLE
-- =====================================================

-- Step 1: Rename columns to match new spec (if they haven't been renamed)
DO $$
BEGIN
  -- Rename material_url to file_url
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lecture_materials' AND column_name = 'material_url'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lecture_materials' AND column_name = 'file_url'
  ) THEN
    ALTER TABLE lecture_materials RENAME COLUMN material_url TO file_url;
  END IF;

  -- Rename material_name to file_name
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lecture_materials' AND column_name = 'material_name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lecture_materials' AND column_name = 'file_name'
  ) THEN
    ALTER TABLE lecture_materials RENAME COLUMN material_name TO file_name;
  END IF;

  -- Rename material_type to material_role
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lecture_materials' AND column_name = 'material_type'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lecture_materials' AND column_name = 'material_role'
  ) THEN
    ALTER TABLE lecture_materials RENAME COLUMN material_type TO material_role;
  END IF;
END $$;

-- Step 2: Add new columns to lecture_materials
DO $$
BEGIN
  -- source_type: where the material came from
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lecture_materials' AND column_name = 'source_type'
  ) THEN
    ALTER TABLE lecture_materials ADD COLUMN source_type text DEFAULT 'uploaded';
  END IF;

  -- file_mime: MIME type of the file
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lecture_materials' AND column_name = 'file_mime'
  ) THEN
    ALTER TABLE lecture_materials ADD COLUMN file_mime text NULL;
  END IF;

  -- file_size_bytes: size of file in bytes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lecture_materials' AND column_name = 'file_size_bytes'
  ) THEN
    ALTER TABLE lecture_materials ADD COLUMN file_size_bytes bigint NULL;
  END IF;
END $$;

-- Step 3: Set default values for existing NULL rows
UPDATE lecture_materials SET source_type = 'uploaded' WHERE source_type IS NULL;

-- Step 4: Now add NOT NULL constraint
ALTER TABLE lecture_materials ALTER COLUMN source_type SET NOT NULL;

-- Step 5: Update check constraints
ALTER TABLE lecture_materials DROP CONSTRAINT IF EXISTS lecture_materials_material_type_check;
ALTER TABLE lecture_materials DROP CONSTRAINT IF EXISTS lecture_materials_material_role_check;
ALTER TABLE lecture_materials DROP CONSTRAINT IF EXISTS lecture_materials_source_type_check;

ALTER TABLE lecture_materials ADD CONSTRAINT lecture_materials_material_role_check 
  CHECK (material_role IN ('main', 'background'));

ALTER TABLE lecture_materials ADD CONSTRAINT lecture_materials_source_type_check 
  CHECK (source_type IN ('course_preloaded', 'uploaded'));

-- Step 6: Add indexes for lecture_materials
CREATE INDEX IF NOT EXISTS idx_lecture_materials_lecture_role 
  ON lecture_materials(lecture_id, material_role);

-- =====================================================
-- 3. CREATE LECTURE_ARTIFACTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS lecture_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id uuid NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  artifact_type text NOT NULL CHECK (artifact_type IN ('audio_mp3', 'pptx', 'video_static_mp4', 'video_avatar_mp4')),
  file_url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(lecture_id, artifact_type)
);

-- Enable RLS
ALTER TABLE lecture_artifacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lecture_artifacts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'lecture_artifacts' AND policyname = 'Educators can view own lecture artifacts'
  ) THEN
    CREATE POLICY "Educators can view own lecture artifacts"
      ON lecture_artifacts FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM lectures
          WHERE lectures.id = lecture_artifacts.lecture_id
          AND lectures.educator_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'lecture_artifacts' AND policyname = 'Educators can insert own lecture artifacts'
  ) THEN
    CREATE POLICY "Educators can insert own lecture artifacts"
      ON lecture_artifacts FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM lectures
          WHERE lectures.id = lecture_artifacts.lecture_id
          AND lectures.educator_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'lecture_artifacts' AND policyname = 'Educators can update own lecture artifacts'
  ) THEN
    CREATE POLICY "Educators can update own lecture artifacts"
      ON lecture_artifacts FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM lectures
          WHERE lectures.id = lecture_artifacts.lecture_id
          AND lectures.educator_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM lectures
          WHERE lectures.id = lecture_artifacts.lecture_id
          AND lectures.educator_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'lecture_artifacts' AND policyname = 'Educators can delete own lecture artifacts'
  ) THEN
    CREATE POLICY "Educators can delete own lecture artifacts"
      ON lecture_artifacts FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM lectures
          WHERE lectures.id = lecture_artifacts.lecture_id
          AND lectures.educator_id = auth.uid()
        )
      );
  END IF;
END $$;

-- =====================================================
-- 4. CREATE LECTURE_JOBS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS lecture_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id uuid NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  job_type text NOT NULL CHECK (job_type IN ('scripts', 'audio', 'pptx', 'video_static', 'video_avatar')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
  error_message text NULL,
  progress int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE lecture_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lecture_jobs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'lecture_jobs' AND policyname = 'Educators can view own lecture jobs'
  ) THEN
    CREATE POLICY "Educators can view own lecture jobs"
      ON lecture_jobs FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM lectures
          WHERE lectures.id = lecture_jobs.lecture_id
          AND lectures.educator_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'lecture_jobs' AND policyname = 'Educators can insert own lecture jobs'
  ) THEN
    CREATE POLICY "Educators can insert own lecture jobs"
      ON lecture_jobs FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM lectures
          WHERE lectures.id = lecture_jobs.lecture_id
          AND lectures.educator_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'lecture_jobs' AND policyname = 'Educators can update own lecture jobs'
  ) THEN
    CREATE POLICY "Educators can update own lecture jobs"
      ON lecture_jobs FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM lectures
          WHERE lectures.id = lecture_jobs.lecture_id
          AND lectures.educator_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM lectures
          WHERE lectures.id = lecture_jobs.lecture_id
          AND lectures.educator_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'lecture_jobs' AND policyname = 'Educators can delete own lecture jobs'
  ) THEN
    CREATE POLICY "Educators can delete own lecture jobs"
      ON lecture_jobs FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM lectures
          WHERE lectures.id = lecture_jobs.lecture_id
          AND lectures.educator_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Add indexes for lecture_jobs
CREATE INDEX IF NOT EXISTS idx_lecture_jobs_lecture_id 
  ON lecture_jobs(lecture_id);

CREATE INDEX IF NOT EXISTS idx_lecture_jobs_lecture_status 
  ON lecture_jobs(lecture_id, status);

-- =====================================================
-- 5. CREATE TRIGGER FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to lecture_jobs
DROP TRIGGER IF EXISTS update_lecture_jobs_updated_at ON lecture_jobs;
CREATE TRIGGER update_lecture_jobs_updated_at
  BEFORE UPDATE ON lecture_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();