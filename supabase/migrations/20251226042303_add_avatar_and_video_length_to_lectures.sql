/*
  # Add Avatar and Video Length to Lectures

  1. Changes
    - Add avatar field to lectures table
    - Add video_length field to lectures table
    - Add script_file_url field for uploaded scripts

  2. New Fields
    - avatar (text) - 'professional_male', 'professional_female', 'casual_male', 'casual_female'
    - video_length (integer) - length in minutes (5, 10, 15, 20, 30, 45, 60)
    - script_file_url (text, nullable) - URL to uploaded script file
*/

-- Add new fields to lectures table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lectures' AND column_name = 'avatar'
  ) THEN
    ALTER TABLE lectures ADD COLUMN avatar text CHECK (avatar IN ('professional_male', 'professional_female', 'casual_male', 'casual_female'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lectures' AND column_name = 'video_length'
  ) THEN
    ALTER TABLE lectures ADD COLUMN video_length integer DEFAULT 5 CHECK (video_length IN (5, 10, 15, 20, 30, 45, 60));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lectures' AND column_name = 'script_file_url'
  ) THEN
    ALTER TABLE lectures ADD COLUMN script_file_url text;
  END IF;
END $$;
