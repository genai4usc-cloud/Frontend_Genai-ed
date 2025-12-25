/*
  # Create Course Files Storage Bucket

  1. Storage Bucket
    - Create `course-files` bucket for storing course-related files
    - Enable public access for authenticated users to download files
    - Restrict uploads to authenticated educators only

  2. Security Policies
    - Educators can upload files to their own course folders
    - Authenticated users can view/download files
    - File paths will be structured as: {course_id}/{file_type}/{filename}
      - file_type can be: syllabus, materials, background, students

  3. Notes
    - Files are organized by course_id for easy management
    - Each course gets its own folder structure
*/

-- Create the storage bucket for course files
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-files', 'course-files', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow authenticated educators to upload files to their course folders
CREATE POLICY "Educators can upload course files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'course-files' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM courses WHERE educator_id = auth.uid()
    )
  );

-- Policy: Allow authenticated educators to update their course files
CREATE POLICY "Educators can update their course files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'course-files' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM courses WHERE educator_id = auth.uid()
    )
  );

-- Policy: Allow authenticated educators to delete their course files
CREATE POLICY "Educators can delete their course files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'course-files' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM courses WHERE educator_id = auth.uid()
    )
  );

-- Policy: Allow authenticated users to view course files
CREATE POLICY "Authenticated users can view course files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'course-files');