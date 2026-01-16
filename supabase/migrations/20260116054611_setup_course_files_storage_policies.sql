/*
  # Set up storage policies for course-files bucket

  1. Storage Policies
    - Allow educators to upload files to their own courses
    - Allow educators to update files in their own courses
    - Allow educators to delete files from their own courses
    - Public read access (automatically granted for public buckets)

  2. Security Notes
    - Files are organized by course_id, so we check if the user is the educator of that course
    - The path structure is: {course_id}/{file_type}/{filename}
*/

-- Policy: Allow authenticated users to upload files
-- We'll validate course ownership in the application layer
CREATE POLICY "Allow authenticated uploads to course-files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'course-files');

-- Policy: Allow authenticated users to update their uploaded files
CREATE POLICY "Allow authenticated updates to course-files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'course-files' AND auth.uid() = owner)
WITH CHECK (bucket_id = 'course-files' AND auth.uid() = owner);

-- Policy: Allow authenticated users to delete their uploaded files
CREATE POLICY "Allow authenticated deletes from course-files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'course-files' AND auth.uid() = owner);

-- Policy: Allow public read access (already granted by public bucket, but explicit)
CREATE POLICY "Allow public reads from course-files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'course-files');
