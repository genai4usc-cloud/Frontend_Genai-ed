/*
  # Add first_name and last_name to profiles table

  1. Changes
    - Add first_name column to profiles table
    - Add last_name column to profiles table
    - Migrate existing full_name data (split into first/last)
    - Enable RLS on profiles table
    - Add policies for authenticated users to manage their own profiles

  2. Security
    - Enable RLS on profiles table
    - Users can read their own profile
    - Users can update their own profile
    - System can insert profiles during signup
*/

-- Add first_name and last_name columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'first_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN first_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_name text;
  END IF;
END $$;

-- Migrate existing full_name data to first_name and last_name
UPDATE profiles
SET 
  first_name = COALESCE(split_part(full_name, ' ', 1), ''),
  last_name = COALESCE(split_part(full_name, ' ', 2), '')
WHERE full_name IS NOT NULL AND (first_name IS NULL OR last_name IS NULL);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing profile policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create profile policies
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());
