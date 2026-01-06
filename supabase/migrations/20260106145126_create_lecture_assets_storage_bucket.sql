/*
  # Create Lecture Assets Storage Bucket

  1. Storage Bucket
    - Create `lecture-assets` bucket for storing lecture-related materials
    - Enable public access for authenticated users to download files
    - Restrict uploads to authenticated educators only

  2. Security Policies
    - Educators can upload files to their own lecture folders
    - Authenticated users can view/download files
    - File paths structured as: {educator_id}/{lecture_id}/materials/{timestamp}-{filename}

  3. Notes
    - Files are organized by educator and lecture for easy management
    - Supports immediate upload during lecture creation
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('lecture-assets', 'lecture-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Educators can upload lecture assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'lecture-assets' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Educators can update their lecture assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'lecture-assets' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Educators can delete their lecture assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'lecture-assets' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Authenticated users can view lecture assets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'lecture-assets');
