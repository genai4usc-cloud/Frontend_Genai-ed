/*
  # Update Avatar System with Characters and Styles

  1. Changes
    - Remove old avatar field from lectures table
    - Add avatar_character field with new character options
    - Add avatar_style field for character-specific styles

  2. New Fields
    - avatar_character (text) - 'lisa', 'lori', 'meg', 'jeff', 'max', 'harry'
    - avatar_style (text) - various styles depending on character

  3. Notes
    - Each character has their own set of available styles
    - Default values will be set by the frontend based on character selection
*/

-- Remove old avatar field if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lectures' AND column_name = 'avatar'
  ) THEN
    ALTER TABLE lectures DROP COLUMN avatar;
  END IF;
END $$;

-- Add new avatar fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lectures' AND column_name = 'avatar_character'
  ) THEN
    ALTER TABLE lectures ADD COLUMN avatar_character text CHECK (avatar_character IN ('lisa', 'lori', 'meg', 'jeff', 'max', 'harry'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lectures' AND column_name = 'avatar_style'
  ) THEN
    ALTER TABLE lectures ADD COLUMN avatar_style text;
  END IF;
END $$;
